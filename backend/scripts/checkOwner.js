const hre = require("hardhat");
const addresses = require("../../frontend/src/contracts/addresses.json");

async function main() {
    const [deployer] = await hre.ethers.getSigners();
    console.log("Checking owner with account:", deployer.address);

    const contractAddress = addresses.RewardDistributionVulnerable;
    console.log("Vulnerable Contract:", contractAddress);

    const Vulnerable = await hre.ethers.getContractFactory("RewardDistributionVulnerable");
    const contract = Vulnerable.attach(contractAddress);

    try {
        const owner = await contract.owner();
        console.log("Contract Owner:   ", owner);

        if (owner === deployer.address) {
            console.log("✅ Match! Deployer is the owner.");
        } else {
            console.log("❌ Mismatch! Deployer is NOT the owner.");
        }
    } catch (error) {
        console.error("Error checking owner:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
