const hre = require("hardhat");

async function main() {
  const courseName = "CS101 Web3 Security";
  const deadlineDays = 7; // 7 days from now

  const micordMoodle = await hre.ethers.deployContract("MicroMoodle", [courseName, deadlineDays]);

  await micordMoodle.waitForDeployment();

  console.log(`MicroMoodle deployed to: ${micordMoodle.target}`);
  console.log(`Course Name: ${courseName}, Duration: ${deadlineDays} days`);

  // Auto-enroll the demo students so the prototype continues working effortlessly
  const student1 = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";
  const student2 = "0x3C44CdDdB6a900fa2b585dd299e03d12FA4293BC";
  
  await micordMoodle.enrollStudent(student1);
  await micordMoodle.enrollStudent(student2);
  console.log("Students successfully enrolled in the Smart Contract.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
