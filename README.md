# MicroMoodle: Decentralized Learning Management System

A blockchain-based LMS prototype demonstrating immutable assignment submission, grading, and dispute workflows using Ethereum smart contracts.

## Prerequisites

- Node.js v18+
- npm

## Quick Start

### 1. Install Dependencies

```bash
# Install contract dependencies
cd contracts
npm install

# Install backend dependencies
cd ../backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Start Local Blockchain

```bash
cd contracts
npx hardhat node
```

Keep this terminal running. You'll see 20 test accounts with ETH.

### 3. Deploy Smart Contract

In a new terminal:

```bash
cd contracts
npx hardhat run scripts/deploy.js --network localhost
```

**Expected Output:**
```
MicroMoodle deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
Course Name: CS101 Web3 Security, Duration: 7 days
Students successfully enrolled in the Smart Contract.
```

### 4. Run Security Tests

```bash
cd contracts
npx hardhat test
```

**Expected Output:** All tests pass, including security checks showing unauthorized actions are rejected.

### 5. Start Backend Server

```bash
cd backend
node server.js
```

### 6. Start Frontend

```bash
cd frontend
npm run dev
```

Open http://localhost:5173

## Demo Workflow

1. **Student View**: Select Student 1, upload a file → Transaction submitted to blockchain
2. **Teacher View**: See submissions, assign grade with feedback
3. **Verify Tab**: Upload same file → Hash matches blockchain record
4. **Dispute**: After grading, student can file on-chain dispute

## Test Accounts (Hardhat Defaults)

| Role | Address |
|------|---------|
| Teacher | 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 |
| Student 1 | 0x70997970C51812dc3A010C7d01b50e0d17dc79C8 |
| Student 2 | 0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC |

## Project Structure

```
├── contracts/          # Hardhat + Solidity smart contract
│   ├── contracts/MicroMoodle.sol
│   ├── scripts/deploy.js
│   └── test/MicroMoodle.test.js
├── backend/            # Express.js API server
│   └── server.js
└── frontend/           # React + Vite UI
    └── src/App.jsx
```

## Security Features Demonstrated

- **Access Control**: Only teacher can assign grades (`onlyTeacher` modifier)
- **Integrity**: File hashes stored on-chain, tampering detectable
- **Immutability**: Grades cannot be changed once assigned
- **Replay Prevention**: One submission per student enforced
- **Audit Trail**: All actions emit events for verifiable history
