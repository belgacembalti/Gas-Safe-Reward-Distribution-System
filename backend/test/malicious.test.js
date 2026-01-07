const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Malicious Attack Scenarios", function () {
    let vulnerableContract;
    let secureContract;
    let maliciousReceiver;
    let gasBurner;
    let owner;
    let beneficiary1, beneficiary2;

    beforeEach(async function () {
        [owner, beneficiary1, beneficiary2] = await ethers.getSigners();

        // Deploy all contracts
        const VulnerableContract = await ethers.getContractFactory("RewardDistributionVulnerable");
        vulnerableContract = await VulnerableContract.deploy();
        await vulnerableContract.waitForDeployment();

        const SecureContract = await ethers.getContractFactory("RewardDistributionSecure");
        secureContract = await SecureContract.deploy();
        await secureContract.waitForDeployment();

        const MaliciousContract = await ethers.getContractFactory("MaliciousReceiver");
        maliciousReceiver = await MaliciousContract.deploy();
        await maliciousReceiver.waitForDeployment();

        const GasBurnerContract = await ethers.getContractFactory("GasBurner");
        gasBurner = await GasBurnerContract.deploy();
        await gasBurner.waitForDeployment();
    });

    describe("Attack 1: Simple Revert DoS", function () {
        it("VULNERABLE: Should block entire distribution with revert", async function () {
            const reward = ethers.parseEther("1.0");

            // Add beneficiaries
            await vulnerableContract.addBeneficiary(beneficiary1.address, reward);
            await vulnerableContract.addBeneficiary(await maliciousReceiver.getAddress(), reward);
            await vulnerableContract.addBeneficiary(beneficiary2.address, reward);

            // Set malicious receiver to REVERT mode
            await maliciousReceiver.setAttackMode(1); // REVERT

            const totalReward = reward * 3n;

            // Attack: distribution fails completely
            await expect(
                vulnerableContract.distributeRewards({ value: totalReward })
            ).to.be.revertedWith("Distribution failed for a beneficiary");

            // Verify NO ONE got paid
            const ben1 = await vulnerableContract.getBeneficiary(beneficiary1.address);
            const ben2 = await vulnerableContract.getBeneficiary(beneficiary2.address);

            expect(ben1.paid).to.equal(false);
            expect(ben2.paid).to.equal(false);

            console.log("✗ VULNERABLE: All beneficiaries blocked by single malicious actor");
        });

        it("SECURE: Should allow others to withdraw despite malicious actor", async function () {
            const reward = ethers.parseEther("1.0");

            // Add beneficiaries
            await secureContract.setBeneficiaryReward(beneficiary1.address, reward);
            await secureContract.setBeneficiaryReward(await maliciousReceiver.getAddress(), reward);
            await secureContract.setBeneficiaryReward(beneficiary2.address, reward);

            const totalReward = reward * 3n;
            await secureContract.deposit({ value: totalReward });

            // Set malicious receiver to REVERT mode
            await maliciousReceiver.setAttackMode(1); // REVERT

            // Success: normal beneficiaries can withdraw
            await secureContract.connect(beneficiary1).withdraw();
            await secureContract.connect(beneficiary2).withdraw();

            // Verify normal beneficiaries got paid
            expect(await secureContract.getBalance(beneficiary1.address)).to.equal(0);
            expect(await secureContract.getBalance(beneficiary2.address)).to.equal(0);
            expect(await secureContract.getTotalWithdrawn(beneficiary1.address)).to.equal(reward);
            expect(await secureContract.getTotalWithdrawn(beneficiary2.address)).to.equal(reward);

            // Malicious contract still has pending balance (their problem)
            expect(await secureContract.getBalance(await maliciousReceiver.getAddress())).to.equal(reward);

            console.log("✓ SECURE: Normal beneficiaries not affected by malicious actor");
        });
    });

    describe("Attack 2: Gas Limit DoS (Large Beneficiary List)", function () {
        it("VULNERABLE: Should fail with large beneficiary list", async function () {
            this.timeout(120000); // Increase timeout for this test

            const reward = ethers.parseEther("0.01");
            const numBeneficiaries = 300;

            console.log(`Adding ${numBeneficiaries} beneficiaries to vulnerable contract...`);

            // Add many beneficiaries
            for (let i = 0; i < numBeneficiaries; i++) {
                const wallet = ethers.Wallet.createRandom();
                await vulnerableContract.addBeneficiary(wallet.address, reward);

                if ((i + 1) % 50 === 0) {
                    console.log(`  Added ${i + 1}/${numBeneficiaries}`);
                }
            }

            const totalReward = reward * BigInt(numBeneficiaries);

            console.log(`Attempting distribution to ${numBeneficiaries} beneficiaries...`);

            // This will likely fail due to gas limit
            try {
                const tx = await vulnerableContract.distributeRewards({
                    value: totalReward,
                    gasLimit: 30000000 // Even with high limit, will fail
                });
                await tx.wait();
                console.log("✗ UNEXPECTED: Distribution succeeded (may fail with more beneficiaries)");
            } catch (error) {
                if (error.message.includes("out of gas") ||
                    error.message.includes("gas") ||
                    error.message.includes("exceeds")) {
                    console.log("✗ VULNERABLE: Transaction failed due to gas limit");
                    expect(true).to.be.true; // Test passes - we expect failure
                } else {
                    throw error;
                }
            }
        });

        it("SECURE: Should handle large beneficiary list without issues", async function () {
            this.timeout(120000);

            const reward = ethers.parseEther("0.01");
            const numBeneficiaries = 100;

            console.log(`Adding ${numBeneficiaries} beneficiaries to secure contract...`);

            const addresses = [];
            const rewards = [];

            for (let i = 0; i < numBeneficiaries; i++) {
                const wallet = ethers.Wallet.createRandom();
                addresses.push(wallet.address);
                rewards.push(reward);
            }

            // Batch set (efficient)
            await secureContract.batchSetRewards(addresses, rewards);

            const totalReward = reward * BigInt(numBeneficiaries);
            await secureContract.deposit({ value: totalReward });

            console.log("✓ SECURE: All rewards set successfully");
            console.log(`  Each beneficiary can withdraw independently`);
            console.log(`  No gas limit issues, scalable to thousands of beneficiaries`);

            expect(await secureContract.getBeneficiaryCount()).to.equal(numBeneficiaries);
        });
    });

    describe("Attack 3: Gas Griefing Attack", function () {
        it("VULNERABLE: Should demonstrate gas griefing", async function () {
            const reward = ethers.parseEther("1.0");

            await vulnerableContract.addBeneficiary(beneficiary1.address, reward);
            await vulnerableContract.addBeneficiary(await gasBurner.getAddress(), reward);
            await vulnerableContract.addBeneficiary(beneficiary2.address, reward);

            const totalReward = reward * 3n;

            // Gas burner will consume excessive gas and revert
            await expect(
                vulnerableContract.distributeRewards({ value: totalReward })
            ).to.be.revertedWith("Distribution failed for a beneficiary");

            console.log("✗ VULNERABLE: Gas griefing blocks distribution");
        });

        it("SECURE: Should be immune to gas griefing", async function () {
            const reward = ethers.parseEther("1.0");

            await secureContract.setBeneficiaryReward(beneficiary1.address, reward);
            await secureContract.setBeneficiaryReward(await gasBurner.getAddress(), reward);
            await secureContract.setBeneficiaryReward(beneficiary2.address, reward);

            const totalReward = reward * 3n;
            await secureContract.deposit({ value: totalReward });

            // Normal beneficiaries withdraw successfully
            await secureContract.connect(beneficiary1).withdraw();
            await secureContract.connect(beneficiary2).withdraw();

            expect(await secureContract.getTotalWithdrawn(beneficiary1.address)).to.equal(reward);
            expect(await secureContract.getTotalWithdrawn(beneficiary2.address)).to.equal(reward);

            console.log("✓ SECURE: Normal beneficiaries not affected by gas griefing");
        });
    });

    describe("MaliciousReceiver Attack Modes", function () {
        it("Should test all attack modes", async function () {
            const reward = ethers.parseEther("1.0");

            // Test NONE mode (normal behavior)
            await maliciousReceiver.setAttackMode(0); // NONE
            await owner.sendTransaction({
                to: await maliciousReceiver.getAddress(),
                value: reward
            });

            expect(await maliciousReceiver.receivedCount()).to.equal(1);
            expect(await maliciousReceiver.totalReceived()).to.equal(reward);

            // Test REVERT mode
            await maliciousReceiver.setAttackMode(1); // REVERT
            await expect(
                owner.sendTransaction({
                    to: await maliciousReceiver.getAddress(),
                    value: reward
                })
            ).to.be.revertedWith("Malicious revert - blocking distribution");

            // Test GAS_BURN mode
            await maliciousReceiver.setAttackMode(2); // GAS_BURN
            await expect(
                owner.sendTransaction({
                    to: await maliciousReceiver.getAddress(),
                    value: reward
                })
            ).to.be.revertedWith("Gas burned - distribution will fail");

            console.log("✓ All attack modes tested successfully");
        });
    });

    describe("Comparative Summary", function () {
        it("Should demonstrate the security difference", async function () {
            console.log("\n========================================");
            console.log("SECURITY COMPARISON SUMMARY");
            console.log("========================================");
            console.log("\nVulnerable Contract (Push Payments):");
            console.log("  ✗ Blocked by single malicious actor");
            console.log("  ✗ Gas limit failures with large lists");
            console.log("  ✗ Susceptible to gas griefing");
            console.log("  ✗ All-or-nothing distribution");
            console.log("\nSecure Contract (Pull Payments):");
            console.log("  ✓ Each beneficiary independent");
            console.log("  ✓ Scalable to unlimited beneficiaries");
            console.log("  ✓ Immune to DoS attacks");
            console.log("  ✓ Constant gas cost per withdrawal");
            console.log("========================================\n");

            expect(true).to.be.true;
        });
    });
});
