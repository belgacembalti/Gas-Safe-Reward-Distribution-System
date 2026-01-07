const hre = require("hardhat");

async function main() {
    const num = process.argv[2] || "10";
    const numBeneficiaries = parseInt(num);

    console.log(`\n=== Adding ${numBeneficiaries} Beneficiaries ===\n`);

    // Load deployment addresses
    const fs = require("fs");
    const path = require("path");
    const deploymentFile = path.join(__dirname, `../deployments/${hre.network.name}.json`);

    if (!fs.existsSync(deploymentFile)) {
        console.error("Deployment file not found. Run deploy.js first.");
        process.exit(1);
    }

    const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));

    const [owner] = await hre.ethers.getSigners();

    // Connect to contracts
    const vulnerableContract = await hre.ethers.getContractAt(
        "RewardDistributionVulnerable",
        deployment.contracts.RewardDistributionVulnerable
    );

    const secureContract = await hre.ethers.getContractAt(
        "RewardDistributionSecure",
        deployment.contracts.RewardDistributionSecure
    );

    const reward = hre.ethers.parseEther("0.1");

    console.log("Adding to Vulnerable Contract...");
    for (let i = 0; i < numBeneficiaries; i++) {
        const wallet = hre.ethers.Wallet.createRandom();
        await vulnerableContract.addBeneficiary(wallet.address, reward);

        if ((i + 1) % 10 === 0) {
            console.log(`  Added ${i + 1}/${numBeneficiaries}`);
        }
    }
    console.log(`✓ Added ${numBeneficiaries} beneficiaries to vulnerable contract\n`);

    console.log("Adding to Secure Contract...");
    const addresses = [];
    const rewards = [];

    for (let i = 0; i < numBeneficiaries; i++) {
        const wallet = hre.ethers.Wallet.createRandom();
        addresses.push(wallet.address);
        rewards.push(reward);
    }

    // Batch add for efficiency
    const batchSize = 50;
    for (let i = 0; i < addresses.length; i += batchSize) {
        const batchAddresses = addresses.slice(i, i + batchSize);
        const batchRewards = rewards.slice(i, i + batchSize);

        await secureContract.batchSetRewards(batchAddresses, batchRewards);
        console.log(`  Added ${Math.min(i + batchSize, addresses.length)}/${numBeneficiaries}`);
    }

    console.log(`✓ Added ${numBeneficiaries} beneficiaries to secure contract\n`);

    const vulnCount = await vulnerableContract.getBeneficiaryCount();
    const secureCount = await secureContract.getBeneficiaryCount();

    console.log(`Vulnerable contract beneficiaries: ${vulnCount}`);
    console.log(`Secure contract beneficiaries: ${secureCount}\n`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
