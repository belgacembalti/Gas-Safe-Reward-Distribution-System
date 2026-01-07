const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("\n=== Debugging Secure Contract State ===\n");

    const deploymentFile = path.join(__dirname, `../deployments/${hre.network.name}.json`);
    if (!fs.existsSync(deploymentFile)) {
        console.error("Deployment file not found.");
        process.exit(1);
    }
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));

    const secureContract = await hre.ethers.getContractAt(
        "RewardDistributionSecure",
        deployment.contracts.RewardDistributionSecure
    );

    const count = await secureContract.getBeneficiaryCount();
    console.log(`Total Beneficiaries: ${count}`);

    const beneficiaries = await secureContract.getAllBeneficiaries();

    console.log("\nList of Beneficiaries & Rewards:");
    console.log("----------------------------------------");
    for (let i = 0; i < beneficiaries.length; i++) {
        const addr = beneficiaries[i];
        const pending = await secureContract.getBalance(addr);
        const withdrawn = await secureContract.getTotalWithdrawn(addr);

        console.log(`[${i}] ${addr}`);
        console.log(`    Pending: ${hre.ethers.formatEther(pending)} ETH`);
        console.log(`    Withdrawn: ${hre.ethers.formatEther(withdrawn)} ETH`);
    }
    console.log("----------------------------------------");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
