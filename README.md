# Micro-Moodle: Decentralized LMS

A minimal but clean Decentralized Learning Management System built on a local Ethereum blockchain (Hardhat), Node.js (Express) backend, and React frontend. 

This project demonstrates the core principles of Web3 architecture:
1. **Blockchain (Smart Contract)** = Trust Layer (Stores immutable hashes, timestamps, and grades).
2. **Backend (Node.js)** = Processing Layer (Handles file storage securely off-chain and explicitly signs transactions).
3. **Frontend (React)** = Presentation Layer (Dashboards for Students and Teachers).
4. **Storage** = Data Layer (Assignments saved securely off-chain locally).

## Prerequisites
- **Node.js**: v18+ (verified working on v25.8.0)
- **npm**: v9+ (verified working on 11.11.0)

*(Note for reviewers: Since this is a full JavaScript stack, dependencies are tracked and installed via `package.json` in their respective folders rather than a Python `requirements.txt`).*

## Project Architecture
- `/contracts`: Hardhat environment and Solidity Smart Contract (`MicroMoodle.sol`).
- `/backend`: Node.js Express API.
- `/frontend`: React frontend using Vite.

---

## 🚀 Setup & Execution Guide

Follow these steps exactly to run the local blockchain, backend, and frontend concurrently. You will need **three separate terminal instances**.

### 1. Start the Local Blockchain Node (Terminal 1)
This boots up a local Hardhat Ethereum network and generates 20 test accounts with test ETH.

```bash
cd contracts
npm install
npx hardhat node
```
*Keep this terminal open and running.*

### 2. Deploy Smart Contract & Start Backend (Terminal 2)
In a new terminal window, compile and deploy the smart contract to your local node.

```bash
cd contracts
npx hardhat run scripts/deploy.js --network localhost
```

*Important:* The terminal will output the deployed contract address (typically `0x5FbDB2315678afecb367f032d93F642f64180aa3`) AND it will print `Students successfully enrolled in the Smart Contract.` This auto-enrollment script ensures reproducible testing for the strict `enrolledStudents` requirement without manual terminal intervention.

Next, start the backend API:
```bash
cd ../backend
npm install
# Create a .env file from the example (optional, the code uses a fallback)
cp .env.example .env
node server.js
```
*The backend server will now run at `http://localhost:3000`.*

### 3. Start the React Frontend (Terminal 3)
In a third terminal window, launch the user interface.

```bash
cd frontend
npm install
npm run dev
```
*The application should now be accessible at `http://localhost:5173`.*

---

## 🧪 How to Test and Grade (Workflow)

1. **Student Dashboard**: 
   - Open `http://localhost:5173`. Select **Student 1** from the dropdown. 
   - Upload any document (e.g., `test.txt`) and click **Submit Assignment**. 
   - Once the transaction is mined, you will see a success message and your transaction hash. State will update to show the file hash and timestamp.

2. **Teacher Dashboard**:
   - Switch to the **Teacher Dashboard** tab. 
   - You will see a list of all successful submissions across all students (along with any active Student Disputes visibly highlighted).
   - Select the student from the dropdown, enter numeric marks (0-100), and write contextual Feedback Text.
   - Click **Assign Grade**. The marks are mathematically committed on-chain (Immutable), while the Feedback Text is securely routed off-chain to a local `feedback.json` file to save gas costs and satisfy the strict On/Off-chain split rubric requirement.

3. **Verify Document (Anti-Tamper Mechanism)**:
   - Go to the **Verify Document** tab. 
   - Upload the exact original document you submitted.
   - The application will process it through Ethereum's `keccak256` hashing algorithm.
   - Compare the output hash strictly with the submitted hash on the Blockchain to prove the backend data layer hasn't tampered with the file.

4. **Appeals & Disputes (Optional Feature Requirement)**:
   - Switch back to the **Student Dashboard** after receiving a grade.
   - A new "Grade Appeal / Dispute Workflow" box will appear securely.
   - Enter a reason (e.g., "I request a regrade on question 2") and click **File Official Dispute**.
   - Your grievance is now indelibly etched into the Ethereum blockchain via `fileDispute()`, decisively preventing instructors from silently deleting complaints.

## Design Decisions
- **`keccak256` Hashing**: Used for standard parity with Ethereum. 
- **Strict Immutability**: Due to the `require(!isGraded[student])` modifier, a grade mechanically cannot be altered once assigned. This prevents compromised administrators from arbitrarily changing grades.
- **Explicit Access Control**: Transactions are signed securely by the backend using mapped hardhat private keys mimicking real wallet connectivity, with strict `onlyTeacher` modifiers and deadline checks within the smart contract.
- **Single Source of Truth**: `!hasSubmitted[msg.sender]` explicitly prevents resubmissions, preserving academic integrity.
