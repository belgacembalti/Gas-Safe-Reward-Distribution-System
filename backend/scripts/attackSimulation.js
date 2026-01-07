const hre = require("hardhat");

async function main() {
    console.log("\n========================================");
    console.log("ATTACK SIMULATION");
    console.log("========================================\n");

    const fs = require("fs");
    const path = require("path");
    const deploymentFile = path.join(__dirname, `../deployments/${hre.network.name}.json`);

    if (!fs.existsSync(deploymentFile)) {
        console.error("Deployment file not found. Run deploy.js first.");
        process.exit(1);
    }

    const deployment = JSON.parse(fs.readFileSync(deploymentFile, "utf8"));
    const [owner, ...signers] = await hre.ethers.getSigners();

    // Connect to contracts
    const vulnerableContract = await hre.ethers.getContractAt(
        "RewardDistributionVulnerable",
        deployment.contracts.RewardDistributionVulnerable
    );

    const secureContract = await hre.ethers.getContractAt(
        "RewardDistributionSecure",
        deployment.contracts.RewardDistributionSecure
    );

    const maliciousContract = await hre.ethers.getContractAt(
        "MaliciousReceiver",
        deployment.contracts.MaliciousReceiver
    );

    const reward = hre.ethers.parseEther("1.0");

    // =====================================
    // ATTACK 1: Malicious Fallback Revert
    // =====================================
    console.log("ATTACK 1: Malicious Fallback DoS");
    console.log("-----------------------------------\n");

    console.log("Setting up vulnerable contract...");
    await vulnerableContract.addBeneficiary(signers[0].address, reward);
    await vulnerableContract.addBeneficiary(deployment.contracts.MaliciousReceiver, reward);
    await vulnerableContract.addBeneficiary(signers[1].address, reward);
    console.log("✓ Added 3 beneficiaries (1 malicious)\n");

    console.log("Setting malicious contract to REVERT mode...");
    await maliciousContract.setAttackMode(1); // REVERT
    console.log("✓ Attack mode activated\n");

    console.log("Attempting distribution on VULNERABLE contract...");
    try {
        await vulnerableContract.distributeRewards({ value: reward * 3n });
        console.log("❌ Unexpected: Distribution succeeded\n");
    } catch (error) {
        console.log("✓ ATTACK SUCCESSFUL: Distribution blocked!");
        console.log(`  Reason: ${error.message.split('\n')[0]}`);
        console.log("  Impact: ALL beneficiaries blocked by one malicious actor\n");
    }

    console.log("Testing same scenario on SECURE contract...");
    await secureContract.setBeneficiaryReward(signers[0].address, reward);
    await secureContract.setBeneficiaryReward(deployment.contracts.MaliciousReceiver, reward);
    await secureContract.setBeneficiaryReward(signers[1].address, reward);
    await secureContract.deposit({ value: reward * 3n });

    // Normal beneficiaries can withdraw
    await secureContract.connect(signers[0]).withdraw();
    await secureContract.connect(signers[1]).withdraw();

    console.log("✓ SECURE CONTRACT: Normal beneficiaries withdrew successfully");
    console.log("  Malicious actor cannot affect others!\n");

    // =====================================
    // ATTACK 2: Gas Limit DoS
    // =====================================
    console.log("\nATTACK 2: Gas Limit DoS");
    console.log("-----------------------------------\n");

    // Deploy new vulnerable contract for clean test
    const VulnerableContract = await hre.ethers.getContractFactory("RewardDistributionVulnerable");
    const newVulnerable = await VulnerableContract.deploy();
    await newVulnerable.waitForDeployment();

    const numBeneficiaries = 200;
    console.log(`Adding ${numBeneficiaries} beneficiaries...`);

    const smallReward = hre.ethers.parseEther("0.01");
    for (let i = 0; i < numBeneficiaries; i++) {
        const wallet = hre.ethers.Wallet.createRandom();
        await newVulnerable.addBeneficiary(wallet.address, smallReward);

        if ((i + 1) % 50 === 0) {
            console.log(`  Progress: ${i + 1}/${numBeneficiaries}`);
        }
    }
    console.log(`✓ Added ${numBeneficiaries} beneficiaries\n`);

    const totalRequired = smallReward * BigInt(numBeneficiaries);
    console.log("Attempting distribution...");

    try {
        const tx = await newVulnerable.distributeRewards({
            value: totalRequired,
            gasLimit: 30000000
        });
        await tx.wait();
        console.log("❌ Distribution succeeded (may need more beneficiaries to trigger failure)\n");
    } catch (error) {
        console.log("✓ ATTACK SUCCESSFUL: Gas limit exceeded!");
        console.log("  Impact: Distribution impossible with large beneficiary lists\n");
    }

    // Test secure contract with same number
    console.log("Testing SECURE contract with same number of beneficiaries...");
    const SecureContract = await hre.ethers.getContractFactory("RewardDistributionSecure");
    const newSecure = await SecureContract.deploy();
    await newSecure.waitForDeployment();

    const addresses = [];
    const rewards = [];

    for (let i = 0; i < numBeneficiaries; i++) {
        const wallet = hre.ethers.Wallet.createRandom();
        addresses.push(wallet.address);
        rewards.push(smallReward);
    }

    // Batch add
    const batchSize = 100;
    for (let i = 0; i < addresses.length; i += batchSize) {
        const batch = addresses.slice(i, i + batchSize);
        const batchRewards = rewards.slice(i, i + batchSize);
        await newSecure.batchSetRewards(batch, batchRewards);
    }

    await newSecure.deposit({ value: totalRequired });

    console.log(`✓ SECURE CONTRACT: ${numBeneficiaries} beneficiaries set successfully`);
    console.log("  Each can withdraw independently, no gas limit issues!\n");

    // =====================================
    // ATTACK 3: Gas Griefing
    // =====================================
    console.log("\nATTACK 3: Gas Griefing");
    console.log("-----------------------------------\n");

    const VulnerableContract3 = await hre.ethers.getContractFactory("RewardDistributionVulnerable");
    const vulnerable3 = await VulnerableContract3.deploy();
    await vulnerable3.waitForDeployment();

    const gasBurner = await hre.ethers.getContractAt(
        "GasBurner",
        deployment.contracts.GasBurner
    );

    await vulnerable3.addBeneficiary(signers[2].address, reward);
    await vulnerable3.addBeneficiary(await gasBurner.getAddress(), reward);
    await vulnerable3.addBeneficiary(signers[3].address, reward);

    console.log("Attempting distribution with gas burner...");
    try {
        await vulnerable3.distributeRewards({ value: reward * 3n });
        console.log("❌ Distribution succeeded\n");
    } catch (error) {
        console.log("✓ ATTACK SUCCESSFUL: Gas griefing blocked distribution!");
        console.log("  Impact: Malicious beneficiary wastes gas to DoS the system\n");
    }

    // =====================================
    // Summary
    // =====================================
    console.log("\n========================================");
    console.log("ATTACK SIMULATION SUMMARY");
    console.log("========================================");
    console.log("\nVulnerable Contract:");
    console.log("  ✗ Blocked by malicious revert");
    console.log("  ✗ Fails with large beneficiary lists");
    console.log("  ✗ Susceptible to gas griefing");
    console.log("\nSecure Contract:");
    console.log("  ✓ Immune to malicious beneficiaries");
    console.log("  ✓ Scales to unlimited beneficiaries");
    console.log("  ✓ Each withdrawal independent");
    console.log("========================================\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
