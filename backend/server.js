const express = require("express");
const multer = require("multer");
const { ethers } = require("ethers");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
require("dotenv").config();

const app = express();
app.use(cors());
app.use(express.json());

// Setup multer for file uploads
const upload = multer({ dest: "uploads/" });

// Hardhat Local Node URL
const provider = new ethers.JsonRpcProvider("http://127.0.0.1:8545");

// Load Feedback Off-Chain Storage
const feedbackFile = path.join(__dirname, "feedback.json");
let feedbackData = {};
if (fs.existsSync(feedbackFile)) {
    feedbackData = JSON.parse(fs.readFileSync(feedbackFile));
}

// Contract Info (Must match deployed contract!)
const contractAddress = process.env.CONTRACT_ADDRESS || "0x5FbDB2315678afecb367f032d93F642f64180aa3";
const contractABI = require("../contracts/artifacts/contracts/MicroMoodle.sol/MicroMoodle.json").abi;

// Mapping user addresses to Hardhat default private keys for seamless backend signing
// These are standard hardhat test accounts
const accounts = {
    // Account 0 (Teacher)
    "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266": "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80",
    // Account 1 (Student 1)
    "0x70997970C51812dc3A010C7d01b50e0d17dc79C8": "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d",
    // Account 2 (Student 2)
    "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC": "0x5de4111afa1a4b94908f83103eb1f1706367c2e68ca870fc3fb9a804cdab365a"
};

// Helper: Get Wallet from Address
function getWallet(address) {
    const pk = accounts[address];
    if (!pk) throw new Error("Private key not found. Please use Hardhat account 0 (Teacher), 1 (Student), or 2 (Student).");
    return new ethers.Wallet(pk, provider);
}

// 1. Upload & Submit Assignment
app.post("/upload", upload.single("assignment"), async (req, res) => {
    try {
        const { studentAddress } = req.body;
        if (!req.file || !studentAddress) {
            return res.status(400).json({ error: "File and studentAddress are required" });
        }

        // Read file & hash using keccak256
        const fileBuffer = fs.readFileSync(req.file.path);
        const fileHash = ethers.keccak256(fileBuffer);

        // Interact with smart contract
        const wallet = getWallet(studentAddress);
        const contract = new ethers.Contract(contractAddress, contractABI, wallet);

        const tx = await contract.submitAssignment(fileHash);
        await tx.wait(); // Wait for confirmation

        res.json({ success: true, fileHash, txHash: tx.hash });
    } catch (error) {
        console.error("Upload error:", error);
        res.status(500).json({ error: error.reason || error.message });
    }
});

// 2. Assign Grade (Teacher only)
app.post("/grade", async (req, res) => {
    try {
        const { teacherAddress, studentAddress, marks, feedback } = req.body;
        if (!teacherAddress || !studentAddress || marks === undefined) {
             return res.status(400).json({ error: "teacherAddress, studentAddress, and marks are required" });
        }

        const wallet = getWallet(teacherAddress);
        const contract = new ethers.Contract(contractAddress, contractABI, wallet);

        const tx = await contract.assignGrade(studentAddress, marks);
        await tx.wait();

        // Off-chain Feedback Storage
        if (feedback) {
            feedbackData[studentAddress] = feedback;
            fs.writeFileSync(feedbackFile, JSON.stringify(feedbackData));
        }

        res.json({ success: true, txHash: tx.hash });
    } catch (error) {
        console.error("Grade error:", error);
        res.status(500).json({ error: error.reason || error.message });
    }
});

// 3. Get Specific Submission
app.get("/submission/:address", async (req, res) => {
    try {
        const contract = new ethers.Contract(contractAddress, contractABI, provider);
        const [fileHash, timestamp] = await contract.getSubmission(req.params.address);
        res.json({ fileHash, timestamp: timestamp.toString() });
    } catch (error) {
        res.status(404).json({ error: "Submission not found" });
    }
});

// 4. Get Specific Grade
app.get("/grade/:address", async (req, res) => {
    try {
         const contract = new ethers.Contract(contractAddress, contractABI, provider);
         const isGraded = await contract.isGraded(req.params.address);
         if (!isGraded) {
             return res.json({ graded: false });
         }
         const grade = await contract.getGrade(req.params.address);
         const feedback = feedbackData[req.params.address] || "";
         res.json({ graded: true, grade: grade.toString(), feedback });
    } catch (error) {
         res.status(404).json({ error: "Grade not found" });
    }
});

// 5. Get All Submissions (Teacher View)
app.get("/submissions", async (req, res) => {
    try {
        const contract = new ethers.Contract(contractAddress, contractABI, provider);
        const studentAddresses = await contract.getAllSubmissions();
        const results = [];
        
        for (let addr of studentAddresses) {
            try {
                const [fileHash, timestamp] = await contract.getSubmission(addr);
                const disputeReason = await contract.disputes(addr);
                results.push({ 
                    address: addr, 
                    fileHash, 
                    timestamp: timestamp.toString(),
                    dispute: disputeReason 
                });
            } catch (e) {
                // Ignore if fetch fails for a single user
            }
        }
        res.json(results);
    } catch (error) {
        console.error("Submissions fetch error:", error);
        res.status(500).json({ error: error.message });
    }
});

// 6. File Dispute (Student)
app.post("/dispute", async (req, res) => {
    try {
        const { studentAddress, reason } = req.body;
        if (!studentAddress || !reason) {
            return res.status(400).json({ error: "studentAddress and reason required" });
        }
        const wallet = getWallet(studentAddress);
        const contract = new ethers.Contract(contractAddress, contractABI, wallet);
        const tx = await contract.fileDispute(reason);
        await tx.wait();
        res.json({ success: true, txHash: tx.hash });
    } catch (error) {
        console.error("Dispute error:", error);
        res.status(500).json({ error: error.reason || error.message });
    }
});

// 7. Get Dispute
app.get("/dispute/:address", async (req, res) => {
    try {
         const contract = new ethers.Contract(contractAddress, contractABI, provider);
         const reason = await contract.disputes(req.params.address);
         res.json({ reason });
    } catch (error) {
         res.status(404).json({ error: "Dispute not found" });
    }
});

// Verify File Hash
app.post("/verify", upload.single("assignment"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: "File required" });
        }

        const fileBuffer = fs.readFileSync(req.file.path);
        const fileHash = ethers.keccak256(fileBuffer);
        
        // delete the temporary file used for verification to save space
        fs.unlinkSync(req.file.path);

        res.json({ fileHash });
    } catch (error) {
        console.error("Verify error:", error);
        res.status(500).json({ error: error.message });
    }
});

// Create uploads dir if it doesn't exist
if (!fs.existsSync("uploads")) {
    fs.mkdirSync("uploads");
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Backend server running on http://localhost:${PORT}`);
});
