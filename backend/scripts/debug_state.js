const hre = require("hardhat");
const addresses = require("../../frontend/src/contracts/addresses.json");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("\n--- DEBUGGING STATE ---");
    console.log("Time:", new Date().toISOString());
    console.log("Deployer Address:", deployer.address);

    // 1. Check Nonce
    const nonce = await hre.ethers.provider.getTransactionCount(deployer.address);
    console.log("Current On-Chain Nonce:", nonce);

    // 2. Check Vulnerable Contract
    const vulnAddress = addresses.RewardDistributionVulnerable;
    console.log("\nVulnerable Contract Address (from JSON):", vulnAddress);

    const code = await hre.ethers.provider.getCode(vulnAddress);
    if (code === "0x") {
        console.log("❌ ERROR: No contract code found at this address!");
        console.log("   Resolution: You need to redeploy contracts.");
    } else {
        console.log("✅ Contract code exists.");

        // 3. Check Owner
        try {
            const Vulnerable = await hre.ethers.getContractFactory("RewardDistributionVulnerable");
            const contract = Vulnerable.attach(vulnAddress);
            const owner = await contract.owner();
            console.log("Contract Owner:", owner);

            if (owner === deployer.address) {
                console.log("✅ Owner matches deployer.");
            } else {
                console.log("❌ Owner MISMATCH!");
                console.log("   Expected:", deployer.address);
                console.log("   Actual:  ", owner);
            }
        } catch (e) {
            console.log("❌ Error calling owner():", e.message);
        }
    }
    console.log("-----------------------\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
