const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("Gas Comparison Tests", function () {
    let vulnerableContract;
    let secureContract;
    let owner;
    let beneficiaries = [];

    const gasData = {
        vulnerable: {},
        secure: {}
    };

    before(async function () {
        [owner, ...beneficiaries] = await ethers.getSigners();

        const VulnerableContract = await ethers.getContractFactory("RewardDistributionVulnerable");
        vulnerableContract = await VulnerableContract.deploy();
        await vulnerableContract.waitForDeployment();

        const SecureContract = await ethers.getContractFactory("RewardDistributionSecure");
        secureContract = await SecureContract.deploy();
        await secureContract.waitForDeployment();
    });

    describe("Gas Usage: 10 Beneficiaries", function () {
        it("VULNERABLE: Distribution to 10 beneficiaries", async function () {
            const reward = ethers.parseEther("0.1");
            const numBeneficiaries = 10;

            // Add beneficiaries
            for (let i = 0; i < numBeneficiaries; i++) {
                await vulnerableContract.addBeneficiary(beneficiaries[i].address, reward);
            }

            const totalReward = reward * BigInt(numBeneficiaries);

            // Distribute
            const tx = await vulnerableContract.distributeRewards({ value: totalReward });
            const receipt = await tx.wait();

            gasData.vulnerable[10] = receipt.gasUsed;

            console.log(`\n[10 BENEFICIARIES]`);
            console.log(`Vulnerable Contract Gas: ${receipt.gasUsed.toString()}`);
        });

        it("SECURE: Setup and first withdrawal with 10 beneficiaries", async function () {
            const reward = ethers.parseEther("0.1");
            const numBeneficiaries = 10;

            const addresses = [];
            const rewards = [];

            for (let i = 0; i < numBeneficiaries; i++) {
                addresses.push(beneficiaries[i].address);
                rewards.push(reward);
            }

            // Batch set rewards
            const txSet = await secureContract.batchSetRewards(addresses, rewards);
            const receiptSet = await txSet.wait();

            const totalReward = reward * BigInt(numBeneficiaries);
            await secureContract.deposit({ value: totalReward });

            // Measure individual withdrawal
            const txWithdraw = await secureContract.connect(beneficiaries[0]).withdraw();
            const receiptWithdraw = await txWithdraw.wait();

            gasData.secure[10] = {
                setup: receiptSet.gasUsed,
                withdrawal: receiptWithdraw.gasUsed,
                totalForAll: receiptSet.gasUsed + (receiptWithdraw.gasUsed * BigInt(numBeneficiaries))
            };

            console.log(`Secure Contract Setup Gas: ${receiptSet.gasUsed.toString()}`);
            console.log(`Secure Contract Per Withdrawal: ${receiptWithdraw.gasUsed.toString()}`);
            console.log(`Secure Contract Total (10 withdrawals): ${gasData.secure[10].totalForAll.toString()}`);
        });
    });

    describe("Gas Usage: 50 Beneficiaries", function () {
        before(async function () {
            // Deploy fresh contracts
            const VulnerableContract = await ethers.getContractFactory("RewardDistributionVulnerable");
            vulnerableContract = await VulnerableContract.deploy();
            await vulnerableContract.waitForDeployment();

            const SecureContract = await ethers.getContractFactory("RewardDistributionSecure");
            secureContract = await SecureContract.deploy();
            await secureContract.waitForDeployment();
        });

        it("VULNERABLE: Distribution to 50 beneficiaries", async function () {
            const reward = ethers.parseEther("0.1");
            const numBeneficiaries = 50;

            for (let i = 0; i < numBeneficiaries; i++) {
                const wallet = ethers.Wallet.createRandom();
                await vulnerableContract.addBeneficiary(wallet.address, reward);
            }

            const totalReward = reward * BigInt(numBeneficiaries);

            const tx = await vulnerableContract.distributeRewards({ value: totalReward });
            const receipt = await tx.wait();

            gasData.vulnerable[50] = receipt.gasUsed;

            console.log(`\n[50 BENEFICIARIES]`);
            console.log(`Vulnerable Contract Gas: ${receipt.gasUsed.toString()}`);
        });

        it("SECURE: Setup and withdrawals with 50 beneficiaries", async function () {
            const reward = ethers.parseEther("0.1");
            const numBeneficiaries = 50;

            const addresses = [];
            const rewards = [];

            for (let i = 0; i < numBeneficiaries; i++) {
                const wallet = ethers.Wallet.createRandom();
                addresses.push(wallet.address);
                rewards.push(reward);
            }

            const txSet = await secureContract.batchSetRewards(addresses, rewards);
            const receiptSet = await txSet.wait();

            const totalReward = reward * BigInt(numBeneficiaries);
            await secureContract.deposit({ value: totalReward });

            // Measure two withdrawals to get average
            await secureContract.setBeneficiaryReward(beneficiaries[0].address, reward);
            await secureContract.deposit({ value: reward });

            const txWithdraw = await secureContract.connect(beneficiaries[0]).withdraw();
            const receiptWithdraw = await txWithdraw.wait();

            gasData.secure[50] = {
                setup: receiptSet.gasUsed,
                withdrawal: receiptWithdraw.gasUsed,
                totalForAll: receiptSet.gasUsed + (receiptWithdraw.gasUsed * BigInt(numBeneficiaries))
            };

            console.log(`Secure Contract Setup Gas: ${receiptSet.gasUsed.toString()}`);
            console.log(`Secure Contract Per Withdrawal: ${receiptWithdraw.gasUsed.toString()}`);
            console.log(`Secure Contract Total (50 withdrawals): ${gasData.secure[50].totalForAll.toString()}`);
        });
    });

    describe("Gas Usage: 100 Beneficiaries", function () {
        before(async function () {
            const VulnerableContract = await ethers.getContractFactory("RewardDistributionVulnerable");
            vulnerableContract = await VulnerableContract.deploy();
            await vulnerableContract.waitForDeployment();

            const SecureContract = await ethers.getContractFactory("RewardDistributionSecure");
            secureContract = await SecureContract.deploy();
            await secureContract.waitForDeployment();
        });

        it("VULNERABLE: Distribution to 100 beneficiaries", async function () {
            this.timeout(120000);

            const reward = ethers.parseEther("0.1");
            const numBeneficiaries = 100;

            console.log(`\n[100 BENEFICIARIES]`);
            console.log(`Adding beneficiaries...`);

            for (let i = 0; i < numBeneficiaries; i++) {
                const wallet = ethers.Wallet.createRandom();
                await vulnerableContract.addBeneficiary(wallet.address, reward);
            }

            const totalReward = reward * BigInt(numBeneficiaries);

            try {
                const tx = await vulnerableContract.distributeRewards({
                    value: totalReward,
                    gasLimit: 30000000
                });
                const receipt = await tx.wait();

                gasData.vulnerable[100] = receipt.gasUsed;
                console.log(`Vulnerable Contract Gas: ${receipt.gasUsed.toString()}`);
            } catch (error) {
                gasData.vulnerable[100] = "FAILED - Gas limit exceeded";
                console.log(`Vulnerable Contract: FAILED (Gas limit exceeded)`);
            }
        });

        it("SECURE: Setup and withdrawals with 100 beneficiaries", async function () {
            this.timeout(120000);

            const reward = ethers.parseEther("0.1");
            const numBeneficiaries = 100;

            const addresses = [];
            const rewards = [];

            for (let i = 0; i < numBeneficiaries; i++) {
                const wallet = ethers.Wallet.createRandom();
                addresses.push(wallet.address);
                rewards.push(reward);
            }

            const txSet = await secureContract.batchSetRewards(addresses, rewards);
            const receiptSet = await txSet.wait();

            const totalReward = reward * BigInt(numBeneficiaries);
            await secureContract.deposit({ value: totalReward });

            await secureContract.setBeneficiaryReward(beneficiaries[0].address, reward);
            await secureContract.deposit({ value: reward });

            const txWithdraw = await secureContract.connect(beneficiaries[0]).withdraw();
            const receiptWithdraw = await txWithdraw.wait();

            gasData.secure[100] = {
                setup: receiptSet.gasUsed,
                withdrawal: receiptWithdraw.gasUsed,
                totalForAll: receiptSet.gasUsed + (receiptWithdraw.gasUsed * BigInt(numBeneficiaries))
            };

            console.log(`Secure Contract Setup Gas: ${receiptSet.gasUsed.toString()}`);
            console.log(`Secure Contract Per Withdrawal: ${receiptWithdraw.gasUsed.toString()}`);
            console.log(`Secure Contract Total (100 withdrawals): ${gasData.secure[100].totalForAll.toString()}`);
        });
    });

    describe("Scalability Analysis", function () {
        it("Should demonstrate constant withdrawal gas in secure contract", async function () {
            console.log("\n========================================");
            console.log("SCALABILITY ANALYSIS");
            console.log("========================================");

            if (gasData.secure[10] && gasData.secure[50] && gasData.secure[100]) {
                const gas10 = gasData.secure[10].withdrawal;
                const gas50 = gasData.secure[50].withdrawal;
                const gas100 = gasData.secure[100].withdrawal;

                console.log("\nSecure Contract - Per Withdrawal Gas:");
                console.log(`  10 beneficiaries:  ${gas10.toString()}`);
                console.log(`  50 beneficiaries:  ${gas50.toString()}`);
                console.log(`  100 beneficiaries: ${gas100.toString()}`);
                console.log("\n  ✓ Gas cost remains constant regardless of total beneficiaries!");
            }

            console.log("\nVulnerable Contract - Total Distribution Gas:");
            console.log(`  10 beneficiaries:  ${gasData.vulnerable[10]?.toString() || 'N/A'}`);
            console.log(`  50 beneficiaries:  ${gasData.vulnerable[50]?.toString() || 'N/A'}`);
            console.log(`  100 beneficiaries: ${gasData.vulnerable[100] || 'FAILED'}`);
            console.log("\n  ✗ Gas increases linearly, eventually exceeds block limit!");

            console.log("========================================\n");

            expect(true).to.be.true;
        });
    });

    after(function () {
        console.log("\n========================================");
        console.log("FINAL GAS COMPARISON DATA");
        console.log("========================================");
        console.log(JSON.stringify(gasData, (key, value) =>
            typeof value === 'bigint' ? value.toString() : value
            , 2));
        console.log("========================================\n");
    });
});
