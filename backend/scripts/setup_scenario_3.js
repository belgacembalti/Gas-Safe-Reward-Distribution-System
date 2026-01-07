const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("\n=== Setting up Scenario 3: The Hostage Situation ===\n");

    const deploymentFile = path.join(__dirname, `../deployments/${hre.network.name}.json`);
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));

    const vulnerableContract = await hre.ethers.getContractAt(
        "RewardDistributionVulnerable",
        deployment.contracts.RewardDistributionVulnerable
    );

    console.log(`Vulnerable Contract: ${await vulnerableContract.getAddress()}`);

    // 1. Add 5 Normal Beneficiaries
    console.log("1. Adding 5 Normal Employees...");
    const rewardAmount = hre.ethers.parseEther("0.1");

    for (let i = 0; i < 5; i++) {
        const wallet = hre.ethers.Wallet.createRandom();
        try {
            const tx = await vulnerableContract.addBeneficiary(wallet.address, rewardAmount);
            await tx.wait();
            process.stdout.write(".");
        } catch (e) {
            console.log("x");
        }
    }
    console.log("\n   ✓ Added 5 normal employees");

    const count = await vulnerableContract.getBeneficiaryCount();
    console.log(`\nTotal Beneficiaries: ${count}`);
    console.log("Setup complete. Now add the ATTACKER in the UI and watch it crash!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
