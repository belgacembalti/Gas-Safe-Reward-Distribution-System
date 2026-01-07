const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("\n=== Setting up Scenario 2: The Secure Solution ===\n");

    // Load deployment addresses
    const deploymentFile = path.join(__dirname, `../deployments/${hre.network.name}.json`);
    if (!fs.existsSync(deploymentFile)) {
        console.error("Deployment file not found. Run deploy.js first.");
        process.exit(1);
    }
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));

    // Connect to contracts
    const secureContract = await hre.ethers.getContractAt(
        "RewardDistributionSecure",
        deployment.contracts.RewardDistributionSecure
    );

    const maliciousAddress = deployment.contracts.MaliciousReceiver;

    console.log(`Secure Contract: ${await secureContract.getAddress()}`);
    console.log(`Malicious Contract: ${maliciousAddress}\n`);

    // 1. Add 10 Normal Beneficiaries
    console.log("1. Adding 10 Normal Beneficiaries...");
    const addresses = [];
    const rewards = [];
    const rewardAmount = hre.ethers.parseEther("1.0");

    for (let i = 0; i < 10; i++) {
        const wallet = hre.ethers.Wallet.createRandom();
        addresses.push(wallet.address);
        rewards.push(rewardAmount);
    }

    // Add Malicious Receiver to the list so we do it in one batch (or separate, prompt implies separate actions but batch is fine implementation detail)
    // Actually, let's do it separately to match the prompt's logical flow "Add 10" then "Add Attacker"

    // Batch add 10
    const tx1 = await secureContract.batchSetRewards(addresses, rewards);
    await tx1.wait();
    console.log("   ✓ Added 10 normal employees");

    // 2. Add Attacker
    console.log("2. Adding Malicious Attacker...");
    const tx2 = await secureContract.setBeneficiaryReward(maliciousAddress, rewardAmount);
    await tx2.wait();
    console.log("   ✓ Added Malicious Receiver");

    // 3. Fund the Contract
    console.log("3. Funding the Secure Contract...");
    const depositAmount = hre.ethers.parseEther("50");
    const tx3 = await secureContract.deposit({ value: depositAmount });
    await tx3.wait();
    console.log(`   ✓ Deposited 50 ETH`);

    // Verification
    const count = await secureContract.getBeneficiaryCount();
    const balance = await hre.ethers.provider.getBalance(await secureContract.getAddress());

    console.log("\n=== Setup Complete ===");
    console.log(`Total Beneficiaries: ${count}`);
    console.log(`Contract Balance: ${hre.ethers.formatEther(balance)} ETH`);
    console.log("\nReady for manual test steps!");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
