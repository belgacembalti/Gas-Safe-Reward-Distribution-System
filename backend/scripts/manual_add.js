const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const userAddress = process.argv[2];

    if (!userAddress || !hre.ethers.isAddress(userAddress)) {
        console.error("Please provide a valid address.");
        console.error("Usage: npx hardhat run scripts/manual_add.js <YOUR_ADDRESS> --network localhost");
        process.exit(1);
    }

    console.log(`\n=== Manually Adding Beneficiary: ${userAddress} ===\n`);

    const deploymentFile = path.join(__dirname, `../deployments/${hre.network.name}.json`);
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));

    const secureContract = await hre.ethers.getContractAt(
        "RewardDistributionSecure",
        deployment.contracts.RewardDistributionSecure
    );

    const reward = hre.ethers.parseEther("1.0");

    // check if already added
    const currentBalance = await secureContract.getBalance(userAddress);
    if (currentBalance > 0) {
        console.log(`Address already has a pending reward of ${hre.ethers.formatEther(currentBalance)} ETH`);
    } else {
        console.log("Adding beneficiary...");
        const tx = await secureContract.setBeneficiaryReward(userAddress, reward);
        await tx.wait();
        console.log("✓ Success! Reward set to 1.0 ETH");
    }

    const count = await secureContract.getBeneficiaryCount();
    console.log(`Total Beneficiaries: ${count}`);
    console.log("\nNow refresh your frontend!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
