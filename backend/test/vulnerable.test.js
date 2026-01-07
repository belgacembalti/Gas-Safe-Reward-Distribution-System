const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("RewardDistributionVulnerable Tests", function () {
    let vulnerableContract;
    let owner;
    let beneficiary1, beneficiary2, beneficiary3;
    let maliciousContract;

    beforeEach(async function () {
        [owner, beneficiary1, beneficiary2, beneficiary3] = await ethers.getSigners();

        const VulnerableContract = await ethers.getContractFactory("RewardDistributionVulnerable");
        vulnerableContract = await VulnerableContract.deploy();
        await vulnerableContract.waitForDeployment();
    });

    describe("Basic Functionality", function () {
        it("Should add beneficiaries correctly", async function () {
            const reward = ethers.parseEther("1.0");

            await vulnerableContract.addBeneficiary(beneficiary1.address, reward);

            const beneficiaryData = await vulnerableContract.getBeneficiary(beneficiary1.address);
            expect(beneficiaryData.reward).to.equal(reward);
            expect(beneficiaryData.paid).to.equal(false);
        });

        it("Should get correct beneficiary count", async function () {
            await vulnerableContract.addBeneficiary(beneficiary1.address, ethers.parseEther("1.0"));
            await vulnerableContract.addBeneficiary(beneficiary2.address, ethers.parseEther("2.0"));

            const count = await vulnerableContract.getBeneficiaryCount();
            expect(count).to.equal(2);
        });

        it("Should reject zero address", async function () {
            await expect(
                vulnerableContract.addBeneficiary(ethers.ZeroAddress, ethers.parseEther("1.0"))
            ).to.be.revertedWith("Invalid address");
        });

        it("Should reject zero reward", async function () {
            await expect(
                vulnerableContract.addBeneficiary(beneficiary1.address, 0)
            ).to.be.revertedWith("Reward must be greater than 0");
        });
    });

    describe("Distribution - Normal Cases", function () {
        it("Should distribute to single beneficiary", async function () {
            const reward = ethers.parseEther("1.0");

            await vulnerableContract.addBeneficiary(beneficiary1.address, reward);

            const balanceBefore = await ethers.provider.getBalance(beneficiary1.address);

            await vulnerableContract.distributeRewards({ value: reward });

            const balanceAfter = await ethers.provider.getBalance(beneficiary1.address);
            expect(balanceAfter - balanceBefore).to.equal(reward);

            const beneficiaryData = await vulnerableContract.getBeneficiary(beneficiary1.address);
            expect(beneficiaryData.paid).to.equal(true);
        });

        it("Should distribute to multiple beneficiaries (small list)", async function () {
            const reward = ethers.parseEther("1.0");

            await vulnerableContract.addBeneficiary(beneficiary1.address, reward);
            await vulnerableContract.addBeneficiary(beneficiary2.address, reward);
            await vulnerableContract.addBeneficiary(beneficiary3.address, reward);

            const totalReward = reward * 3n;

            await vulnerableContract.distributeRewards({ value: totalReward });

            const ben1Data = await vulnerableContract.getBeneficiary(beneficiary1.address);
            const ben2Data = await vulnerableContract.getBeneficiary(beneficiary2.address);
            const ben3Data = await vulnerableContract.getBeneficiary(beneficiary3.address);

            expect(ben1Data.paid).to.equal(true);
            expect(ben2Data.paid).to.equal(true);
            expect(ben3Data.paid).to.equal(true);
        });

        it("Should revert if insufficient funds sent", async function () {
            const reward = ethers.parseEther("1.0");

            await vulnerableContract.addBeneficiary(beneficiary1.address, reward);
            await vulnerableContract.addBeneficiary(beneficiary2.address, reward);

            await expect(
                vulnerableContract.distributeRewards({ value: reward })
            ).to.be.revertedWith("Insufficient funds sent");
        });
    });

    describe("Gas Consumption Analysis", function () {
        it("Should measure gas for 10 beneficiaries", async function () {
            const reward = ethers.parseEther("0.1");
            const beneficiaries = [];

            // Create 10 new accounts
            for (let i = 0; i < 10; i++) {
                const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
                beneficiaries.push(wallet.address);
                await vulnerableContract.addBeneficiary(wallet.address, reward);
            }

            const totalReward = reward * 10n;
            const tx = await vulnerableContract.distributeRewards({ value: totalReward });
            const receipt = await tx.wait();

            console.log(`Gas used for 10 beneficiaries: ${receipt.gasUsed.toString()}`);
            expect(receipt.gasUsed).to.be.lessThan(1000000); // Should complete
        });

        it("Should measure gas for 50 beneficiaries", async function () {
            const reward = ethers.parseEther("0.1");

            for (let i = 0; i < 50; i++) {
                const wallet = ethers.Wallet.createRandom().connect(ethers.provider);
                await vulnerableContract.addBeneficiary(wallet.address, reward);
            }

            const totalReward = reward * 50n;
            const tx = await vulnerableContract.distributeRewards({ value: totalReward });
            const receipt = await tx.wait();

            console.log(`Gas used for 50 beneficiaries: ${receipt.gasUsed.toString()}`);
        });
    });

    describe("DoS Attack - Malicious Fallback", function () {
        beforeEach(async function () {
            const MaliciousContract = await ethers.getContractFactory("MaliciousReceiver");
            maliciousContract = await MaliciousContract.deploy();
            await maliciousContract.waitForDeployment();
        });

        it("Should demonstrate DoS attack with malicious receiver", async function () {
            const reward = ethers.parseEther("1.0");

            // Add normal beneficiaries
            await vulnerableContract.addBeneficiary(beneficiary1.address, reward);

            // Add malicious contract as beneficiary
            await vulnerableContract.addBeneficiary(await maliciousContract.getAddress(), reward);

            await vulnerableContract.addBeneficiary(beneficiary2.address, reward);

            // Set attack mode to REVERT
            await maliciousContract.setAttackMode(1); // REVERT mode

            const totalReward = reward * 3n;

            // Distribution should fail due to malicious contract
            await expect(
                vulnerableContract.distributeRewards({ value: totalReward })
            ).to.be.revertedWith("Distribution failed for a beneficiary");

            // Verify no one got paid (all or nothing)
            const ben1Data = await vulnerableContract.getBeneficiary(beneficiary1.address);
            const ben2Data = await vulnerableContract.getBeneficiary(beneficiary2.address);

            expect(ben1Data.paid).to.equal(false);
            expect(ben2Data.paid).to.equal(false);
        });

        it("Should demonstrate gas burning attack", async function () {
            const reward = ethers.parseEther("1.0");

            await vulnerableContract.addBeneficiary(await maliciousContract.getAddress(), reward);

            // Set attack mode to GAS_BURN
            await maliciousContract.setAttackMode(2); // GAS_BURN mode

            await expect(
                vulnerableContract.distributeRewards({ value: reward })
            ).to.be.revertedWith("Distribution failed for a beneficiary");
        });
    });

    describe("Owner Controls", function () {
        it("Should allow only owner to add beneficiaries", async function () {
            await expect(
                vulnerableContract.connect(beneficiary1).addBeneficiary(
                    beneficiary2.address,
                    ethers.parseEther("1.0")
                )
            ).to.be.revertedWith("Only owner can call this");
        });

        it("Should allow only owner to distribute", async function () {
            await expect(
                vulnerableContract.connect(beneficiary1).distributeRewards({ value: ethers.parseEther("1.0") })
            ).to.be.revertedWith("Only owner can call this");
        });

        it("Should allow emergency withdrawal", async function () {
            // Send some funds to contract
            await owner.sendTransaction({
                to: await vulnerableContract.getAddress(),
                value: ethers.parseEther("5.0")
            });

            const balanceBefore = await ethers.provider.getBalance(owner.address);
            await vulnerableContract.emergencyWithdraw();
            const balanceAfter = await ethers.provider.getBalance(owner.address);

            expect(balanceAfter).to.be.greaterThan(balanceBefore);
        });
    });
});
