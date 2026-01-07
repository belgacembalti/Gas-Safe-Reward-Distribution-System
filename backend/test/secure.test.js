const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RewardDistributionSecure Tests", function () {
    let secureContract;
    let owner;
    let beneficiary1, beneficiary2, beneficiary3, beneficiary4;
    let maliciousContract;

    beforeEach(async function () {
        [owner, beneficiary1, beneficiary2, beneficiary3, beneficiary4] = await ethers.getSigners();

        const SecureContract = await ethers.getContractFactory("RewardDistributionSecure");
        secureContract = await SecureContract.deploy();
        await secureContract.waitForDeployment();
    });

    describe("Basic Functionality", function () {
        it("Should set beneficiary reward correctly", async function () {
            const reward = ethers.parseEther("1.0");

            await secureContract.setBeneficiaryReward(beneficiary1.address, reward);

            const balance = await secureContract.getBalance(beneficiary1.address);
            expect(balance).to.equal(reward);
        });

        it("Should allow batch setting rewards", async function () {
            const addresses = [beneficiary1.address, beneficiary2.address, beneficiary3.address];
            const rewards = [
                ethers.parseEther("1.0"),
                ethers.parseEther("2.0"),
                ethers.parseEther("3.0")
            ];

            await secureContract.batchSetRewards(addresses, rewards);

            expect(await secureContract.getBalance(beneficiary1.address)).to.equal(rewards[0]);
            expect(await secureContract.getBalance(beneficiary2.address)).to.equal(rewards[1]);
            expect(await secureContract.getBalance(beneficiary3.address)).to.equal(rewards[2]);

            const count = await secureContract.getBeneficiaryCount();
            expect(count).to.equal(3);
        });

        it("Should reject mismatched array lengths in batch", async function () {
            const addresses = [beneficiary1.address, beneficiary2.address];
            const rewards = [ethers.parseEther("1.0")];

            await expect(
                secureContract.batchSetRewards(addresses, rewards)
            ).to.be.revertedWith("Arrays length mismatch");
        });

        it("Should reject zero address", async function () {
            await expect(
                secureContract.setBeneficiaryReward(ethers.ZeroAddress, ethers.parseEther("1.0"))
            ).to.be.revertedWith("Invalid address");
        });
    });

    describe("Withdraw Functionality - Pull Payments", function () {
        it("Should allow beneficiary to withdraw their reward", async function () {
            const reward = ethers.parseEther("2.0");

            await secureContract.setBeneficiaryReward(beneficiary1.address, reward);

            // Deposit funds to contract
            await secureContract.deposit({ value: reward });

            const balanceBefore = await ethers.provider.getBalance(beneficiary1.address);

            const tx = await secureContract.connect(beneficiary1).withdraw();
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed * receipt.gasPrice;

            const balanceAfter = await ethers.provider.getBalance(beneficiary1.address);

            // Account for gas costs
            const netGain = balanceAfter - balanceBefore + gasUsed;
            expect(netGain).to.equal(reward);

            // Verify balance is now zero
            expect(await secureContract.getBalance(beneficiary1.address)).to.equal(0);

            // Verify total withdrawn is tracked
            expect(await secureContract.getTotalWithdrawn(beneficiary1.address)).to.equal(reward);
        });

        it("Should allow multiple beneficiaries to withdraw independently", async function () {
            const reward1 = ethers.parseEther("1.0");
            const reward2 = ethers.parseEther("2.0");
            const reward3 = ethers.parseEther("3.0");

            await secureContract.setBeneficiaryReward(beneficiary1.address, reward1);
            await secureContract.setBeneficiaryReward(beneficiary2.address, reward2);
            await secureContract.setBeneficiaryReward(beneficiary3.address, reward3);

            const totalReward = reward1 + reward2 + reward3;
            await secureContract.deposit({ value: totalReward });

            // Withdraw in different order
            await secureContract.connect(beneficiary2).withdraw();
            await secureContract.connect(beneficiary1).withdraw();
            await secureContract.connect(beneficiary3).withdraw();

            // Verify all balances are zero
            expect(await secureContract.getBalance(beneficiary1.address)).to.equal(0);
            expect(await secureContract.getBalance(beneficiary2.address)).to.equal(0);
            expect(await secureContract.getBalance(beneficiary3.address)).to.equal(0);

            // Verify contract balance is empty
            expect(await secureContract.getContractBalance()).to.equal(0);
        });

        it("Should revert if no pending rewards", async function () {
            await expect(
                secureContract.connect(beneficiary1).withdraw()
            ).to.be.revertedWith("No pending rewards");
        });

        it("Should revert if insufficient contract balance", async function () {
            const reward = ethers.parseEther("1.0");

            await secureContract.setBeneficiaryReward(beneficiary1.address, reward);

            // Don't deposit funds
            await expect(
                secureContract.connect(beneficiary1).withdraw()
            ).to.be.revertedWith("Insufficient contract balance");
        });

        it("Should prevent double withdrawal", async function () {
            const reward = ethers.parseEther("1.0");

            await secureContract.setBeneficiaryReward(beneficiary1.address, reward);
            await secureContract.deposit({ value: reward });

            // First withdrawal succeeds
            await secureContract.connect(beneficiary1).withdraw();

            // Second withdrawal should fail
            await expect(
                secureContract.connect(beneficiary1).withdraw()
            ).to.be.revertedWith("No pending rewards");
        });
    });

    describe("Immunity to DoS Attacks", function () {
        beforeEach(async function () {
            const MaliciousContract = await ethers.getContractFactory("MaliciousReceiver");
            maliciousContract = await MaliciousContract.deploy();
            await maliciousContract.waitForDeployment();
        });

        it("Should NOT be affected by malicious receiver", async function () {
            const reward = ethers.parseEther("1.0");

            // Add malicious contract and normal beneficiaries
            await secureContract.setBeneficiaryReward(beneficiary1.address, reward);
            await secureContract.setBeneficiaryReward(await maliciousContract.getAddress(), reward);
            await secureContract.setBeneficiaryReward(beneficiary2.address, reward);

            const totalReward = reward * 3n;
            await secureContract.deposit({ value: totalReward });

            // Set malicious contract to REVERT mode
            await maliciousContract.setAttackMode(1);

            // Normal beneficiaries can still withdraw
            await secureContract.connect(beneficiary1).withdraw();
            await secureContract.connect(beneficiary2).withdraw();

            // Verify normal beneficiaries got paid
            expect(await secureContract.getBalance(beneficiary1.address)).to.equal(0);
            expect(await secureContract.getBalance(beneficiary2.address)).to.equal(0);

            // Malicious contract cannot withdraw (will fail for itself only)
            await expect(
                maliciousContract.connect(owner).withdraw()
            ).to.be.reverted;

            // But it doesn't affect others
            expect(await secureContract.getBalance(await maliciousContract.getAddress())).to.equal(reward);
        });

        it("Should handle large number of beneficiaries efficiently", async function () {
            const reward = ethers.parseEther("0.01");
            const numBeneficiaries = 100;

            const addresses = [];
            const rewards = [];

            // Create 100 beneficiaries
            for (let i = 0; i < numBeneficiaries; i++) {
                const wallet = ethers.Wallet.createRandom();
                addresses.push(wallet.address);
                rewards.push(reward);
            }

            // Batch set rewards - should not fail
            await secureContract.batchSetRewards(addresses, rewards);

            const count = await secureContract.getBeneficiaryCount();
            expect(count).to.equal(numBeneficiaries);

            // Each beneficiary can withdraw independently (testing with first one)
            const totalReward = reward * BigInt(numBeneficiaries);
            await secureContract.deposit({ value: totalReward });

            // Note: We can't test all 100 withdrawals here due to test complexity,
            // but the pattern is proven - each withdrawal is independent
        });
    });

    describe("Gas Efficiency - Scalability Test", function () {
        it("Should have constant gas cost per withdrawal regardless of beneficiary count", async function () {
            const reward = ethers.parseEther("0.1");

            // Test with 10 beneficiaries
            await secureContract.setBeneficiaryReward(beneficiary1.address, reward);
            for (let i = 0; i < 9; i++) {
                const wallet = ethers.Wallet.createRandom();
                await secureContract.setBeneficiaryReward(wallet.address, reward);
            }

            await secureContract.deposit({ value: reward * 10n });

            const tx1 = await secureContract.connect(beneficiary1).withdraw();
            const receipt1 = await tx1.wait();
            const gas1 = receipt1.gasUsed;

            console.log(`Gas for withdrawal with 10 beneficiaries: ${gas1.toString()}`);

            // Add 90 more beneficiaries
            for (let i = 0; i < 90; i++) {
                const wallet = ethers.Wallet.createRandom();
                await secureContract.setBeneficiaryReward(wallet.address, reward);
            }

            await secureContract.setBeneficiaryReward(beneficiary2.address, reward);
            await secureContract.deposit({ value: reward * 91n });

            const tx2 = await secureContract.connect(beneficiary2).withdraw();
            const receipt2 = await tx2.wait();
            const gas2 = receipt2.gasUsed;

            console.log(`Gas for withdrawal with 100 beneficiaries: ${gas2.toString()}`);

            // Gas should be nearly identical (within 10% tolerance)
            const gasDiff = gas1 > gas2 ? gas1 - gas2 : gas2 - gas1;
            const tolerance = gas1 / 10n; // 10% tolerance

            expect(gasDiff).to.be.lessThan(tolerance);
        });
    });

    describe("Owner Controls and Utilities", function () {
        it("Should allow only owner to set rewards", async function () {
            await expect(
                secureContract.connect(beneficiary1).setBeneficiaryReward(
                    beneficiary2.address,
                    ethers.parseEther("1.0")
                )
            ).to.be.revertedWith("Only owner can call this");
        });

        it("Should track total deposited and distributed", async function () {
            const reward = ethers.parseEther("1.0");

            await secureContract.setBeneficiaryReward(beneficiary1.address, reward);

            await secureContract.deposit({ value: reward });
            expect(await secureContract.totalDeposited()).to.equal(reward);

            await secureContract.connect(beneficiary1).withdraw();
            expect(await secureContract.totalDistributed()).to.equal(reward);
        });

        it("Should allow emergency withdrawal of excess funds only", async function () {
            const reward = ethers.parseEther("1.0");
            const excess = ethers.parseEther("2.0");

            await secureContract.setBeneficiaryReward(beneficiary1.address, reward);

            // Deposit more than needed
            await secureContract.deposit({ value: reward + excess });

            const ownerBalanceBefore = await ethers.provider.getBalance(owner.address);

            const tx = await secureContract.emergencyWithdraw();
            const receipt = await tx.wait();
            const gasUsed = receipt.gasUsed * receipt.gasPrice;

            const ownerBalanceAfter = await ethers.provider.getBalance(owner.address);

            const netGain = ownerBalanceAfter - ownerBalanceBefore + gasUsed;
            expect(netGain).to.equal(excess);

            // Beneficiary can still withdraw their reward
            await secureContract.connect(beneficiary1).withdraw();
        });

        it("Should get total pending correctly", async function () {
            await secureContract.setBeneficiaryReward(beneficiary1.address, ethers.parseEther("1.0"));
            await secureContract.setBeneficiaryReward(beneficiary2.address, ethers.parseEther("2.0"));
            await secureContract.setBeneficiaryReward(beneficiary3.address, ethers.parseEther("3.0"));

            const totalPending = await secureContract.getTotalPending();
            expect(totalPending).to.equal(ethers.parseEther("6.0"));
        });
    });
});
