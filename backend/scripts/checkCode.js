const hre = require("hardhat");
const addresses = require("../../frontend/src/contracts/addresses.json");

async function main() {
    const address = addresses.RewardDistributionVulnerable;
    console.log("Checking VULNERABLE Contract at:", address);

    const code = await hre.ethers.provider.getCode(address);
    console.log("Code length:", code.length);

    if (code === "0x") {
        console.error("❌ ERROR: No code found at this address!");
    } else {
        console.log("✓ Contract code exists.");

        // Try to read owner
        const Contract = await hre.ethers.getContractFactory("RewardDistributionVulnerable");
        const contract = Contract.attach(address);
        try {
            const owner = await contract.owner();
            console.log("Owner:", owner);
            const [deployer] = await hre.ethers.getSigners();
            console.log("Deployer:", deployer.address);
        } catch (e) {
            console.log("Could not read owner:", e.message);
        }
    }
}

main().catch(console.error);
