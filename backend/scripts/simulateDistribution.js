const hre = require("hardhat");

async function main() {
    console.log("\n=== Simulating Distribution ===\n");

    const fs = require("fs");
    const path = require("path");
    const deploymentFile = path.join(__dirname, `../deployments/${hre.network.name}.json`);

    if (!fs.existsSync(deploymentFile)) {
        console.error("Deployment file not found. Run deploy.js first.");
        process.exit(1);
    }

    const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    const [owner] = await hre.ethers.getSigners();

    // Connect to vulnerable contract
    const vulnerableContract = await hre.ethers.getContractAt(
        "RewardDistributionVulnerable",
        deployment.contracts.RewardDistributionVulnerable
    );

    const beneficiaryCount = await vulnerableContract.getBeneficiaryCount();
    console.log(`Beneficiaries in vulnerable contract: ${beneficiaryCount}`);

    if (beneficiaryCount === 0n) {
        console.log("No beneficiaries found. Run simulateAddBeneficiaries.js first.");
        process.exit(0);
    }

    // Calculate total required
    const beneficiaries = await vulnerableContract.getAllBeneficiaries();
    let totalRequired = 0n;

    for (const beneficiary of beneficiaries) {
        const data = await vulnerableContract.getBeneficiary(beneficiary);
        if (!data.paid) {
            totalRequired += data.reward;
        }
    }

    console.log(`Total required: ${hre.ethers.formatEther(totalRequired)} ETH\n`);

    console.log("Attempting distribution...");

    try {
        const tx = await vulnerableContract.distributeRewards({
            value: totalRequired,
            gasLimit: 30000000
        });

        console.log(`Transaction hash: ${tx.hash}`);

        const receipt = await tx.wait();

        console.log(`✓ Distribution successful!`);
        console.log(`Gas used: ${receipt.gasUsed.toString()}`);
        console.log(`Block number: ${receipt.blockNumber}\n`);

    } catch (error) {
        console.log(`✗ Distribution failed!`);

        if (error.message.includes("gas")) {
            console.log(`Reason: Gas limit exceeded`);
            console.log(`This demonstrates the Gas Limit DoS vulnerability!\n`);
        } else {
            console.log(`Reason: ${error.message}\n`);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
