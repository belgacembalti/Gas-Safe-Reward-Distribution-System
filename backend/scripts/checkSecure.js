const hre = require("hardhat");
const addresses = require("../../frontend/src/contracts/addresses.json");

async function main() {
    const secureAddress = addresses.RewardDistributionSecure;
    console.log("Checking Secure Contract at:", secureAddress);

    const code = await hre.ethers.provider.getCode(secureAddress);
    if (code === "0x") {
        console.error("❌ ERROR: No code found at this address! The contract is NOT deployed on the current running node.");
        console.error("Solution: You need to run 'npx hardhat run scripts/deploy.js --network localhost' again.");
        return;
    }
    console.log("✓ Contract code exists.");

    const SecureContract = await hre.ethers.getContractFactory("RewardDistributionSecure");
    const contract = SecureContract.attach(secureAddress);

    try {
        const owner = await contract.owner();
        console.log("Contract Owner:", owner);

        const [deployer] = await hre.ethers.getSigners();
        console.log("Your Wallet (Signer):", deployer.address);

        if (owner.toLowerCase() === deployer.address.toLowerCase()) {
            console.log("✓ You are the owner.");
        } else {
            console.error("❌ MISMATCH: You are NOT the owner.");
        }

    } catch (e) {
        console.error("Error calling contract:", e.message);
    }
}

main().catch(console.error);
