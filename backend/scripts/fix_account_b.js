const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    // Hardhat Account #1 (Account B)
    const userAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

    console.log(`\n=== Fixing Account B: ${userAddress} ===\n`);

    const deploymentFile = path.join(__dirname, `../deployments/${hre.network.name}.json`);
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));

    const secureContract = await hre.ethers.getContractAt(
        "RewardDistributionSecure",
        deployment.contracts.RewardDistributionSecure
    );

    const reward = hre.ethers.parseEther("1.0");

    // check if already added
    const currentBalance = await secureContract.getBalance(userAddress);

    if (currentBalance > 0n) {
        console.log(`✓ Address already has a pending reward of ${hre.ethers.formatEther(currentBalance)} ETH`);
    } else {
        console.log("Adding beneficiary...");
        const tx = await secureContract.setBeneficiaryReward(userAddress, reward);
        await tx.wait();
        console.log("✓ Success! Reward set to 1.0 ETH");
    }

    const count = await secureContract.getBeneficiaryCount();
    console.log(`Total Beneficiaries: ${count}`);
    console.log("\nFIX COMPLETE. Please refresh browser.");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
