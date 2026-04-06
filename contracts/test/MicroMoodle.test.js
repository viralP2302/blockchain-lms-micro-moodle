const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MicroMoodle Security Tests", function () {
    let microMoodle;
    let teacher, student1, student2, attacker;

    beforeEach(async function () {
        [teacher, student1, student2, attacker] = await ethers.getSigners();

        const MicroMoodle = await ethers.getContractFactory("MicroMoodle");
        microMoodle = await MicroMoodle.deploy("CS101 Security", 7);
        await microMoodle.waitForDeployment();

        // Enroll students
        await microMoodle.connect(teacher).enrollStudent(student1.address);
        await microMoodle.connect(teacher).enrollStudent(student2.address);
    });

    describe("Access Control Tests", function () {
        it("should reject grade assignment from non-teacher (SECURITY CHECK)", async function () {
            // Student submits assignment first
            const fileHash = ethers.keccak256(ethers.toUtf8Bytes("homework content"));
            await microMoodle.connect(student1).submitAssignment(fileHash);

            // Student tries to assign grade to themselves - MUST FAIL
            await expect(
                microMoodle.connect(student1).assignGrade(student1.address, 100)
            ).to.be.revertedWith("Only teacher can perform this action");
        });

        it("should reject enrollment from non-teacher", async function () {
            await expect(
                microMoodle.connect(student1).enrollStudent(attacker.address)
            ).to.be.revertedWith("Only teacher can perform this action");
        });

        it("should reject submission from non-enrolled student", async function () {
            const fileHash = ethers.keccak256(ethers.toUtf8Bytes("malicious submission"));
            await expect(
                microMoodle.connect(attacker).submitAssignment(fileHash)
            ).to.be.revertedWith("Not enrolled in course");
        });
    });

    describe("Integrity Tests", function () {
        it("should prevent double submission (replay attack)", async function () {
            const fileHash = ethers.keccak256(ethers.toUtf8Bytes("homework"));
            await microMoodle.connect(student1).submitAssignment(fileHash);

            await expect(
                microMoodle.connect(student1).submitAssignment(fileHash)
            ).to.be.revertedWith("Already submitted");
        });

        it("should prevent double grading (grade manipulation)", async function () {
            const fileHash = ethers.keccak256(ethers.toUtf8Bytes("homework"));
            await microMoodle.connect(student1).submitAssignment(fileHash);
            await microMoodle.connect(teacher).assignGrade(student1.address, 85);

            // Teacher tries to change grade - MUST FAIL
            await expect(
                microMoodle.connect(teacher).assignGrade(student1.address, 100)
            ).to.be.revertedWith("Already graded");
        });

        it("should reject grading non-submitted student", async function () {
            await expect(
                microMoodle.connect(teacher).assignGrade(student1.address, 100)
            ).to.be.revertedWith("Student has not submitted yet");
        });
    });

    describe("Dispute Workflow Tests", function () {
        it("should allow graded student to file dispute", async function () {
            const fileHash = ethers.keccak256(ethers.toUtf8Bytes("homework"));
            await microMoodle.connect(student1).submitAssignment(fileHash);
            await microMoodle.connect(teacher).assignGrade(student1.address, 60);

            await expect(
                microMoodle.connect(student1).fileDispute("Grade too low, request review")
            ).to.emit(microMoodle, "DisputeRaised");
        });

        it("should reject dispute from non-graded student", async function () {
            const fileHash = ethers.keccak256(ethers.toUtf8Bytes("homework"));
            await microMoodle.connect(student1).submitAssignment(fileHash);

            await expect(
                microMoodle.connect(student1).fileDispute("I want dispute")
            ).to.be.revertedWith("Must be graded to dispute");
        });
    });

    describe("Functional Tests", function () {
        it("should complete full workflow: enroll -> submit -> grade -> verify", async function () {
            const fileContent = "Assignment submission content";
            const fileHash = ethers.keccak256(ethers.toUtf8Bytes(fileContent));

            // Submit
            await microMoodle.connect(student1).submitAssignment(fileHash);

            // Verify submission recorded
            const [storedHash, timestamp] = await microMoodle.getSubmission(student1.address);
            expect(storedHash).to.equal(fileHash);
            expect(timestamp).to.be.gt(0);

            // Grade
            await microMoodle.connect(teacher).assignGrade(student1.address, 95);

            // Verify grade
            const grade = await microMoodle.getGrade(student1.address);
            expect(grade).to.equal(95);
        });
    });
});
