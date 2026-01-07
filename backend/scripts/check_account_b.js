const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const userAddress = "0x70997970C51812dc3A010C7d01b50e0d17dc79C8";

    console.log(`Checking Account B: ${userAddress}`);

    const deploymentFile = path.join(__dirname, `../deployments/${hre.network.name}.json`);
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));

    const secureContract = await hre.ethers.getContractAt(
        "RewardDistributionSecure",
        deployment.contracts.RewardDistributionSecure
    );

    const currentBalance = await secureContract.getBalance(userAddress);
    console.log(`Pending Reward: ${hre.ethers.formatEther(currentBalance)} ETH`);
}

main().catch(console.error);
