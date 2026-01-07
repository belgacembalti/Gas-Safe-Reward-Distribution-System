const hre = require("hardhat");
const addresses = require("../../frontend/src/contracts/addresses.json");

async function main() {
    const activeAddress = addresses.RewardDistributionVulnerable;
    console.log("Target Contract:", activeAddress);

    const [deployer] = await hre.ethers.getSigners();
    console.log("Signer:", deployer.address);

    const contract = await hre.ethers.getContractAt("RewardDistributionVulnerable", activeAddress);

    // Check owner
    const owner = await contract.owner();
    console.log("Contract Owner:", owner);

    if (owner !== deployer.address) {
        console.log("MISMATCH! Signer is not owner.");
        return;
    }

    // Attempt Transaction
    try {
        console.log("Sending addBeneficiary...");
        const tx = await contract.addBeneficiary("0x70997970C51812dc3A010C7d01b50e0d17dc79C8", hre.ethers.parseEther("0.1"));
        console.log("Tx hash:", tx.hash);
        await tx.wait();
        console.log("Success!");
    } catch (e) {
        console.log("FAILED:", e.message);
    }
}

main().catch(console.error);
