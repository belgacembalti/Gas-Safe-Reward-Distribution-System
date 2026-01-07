const hre = require("hardhat");
const addresses = require("../../frontend/src/contracts/addresses.json");

async function main() {
    const contractAddress = addresses.RewardDistributionVulnerable;
    const [deployer] = await hre.ethers.getSigners();

    console.log("Debugging contract at:", contractAddress);
    console.log("Attempting to interact with account:", deployer.address);

    try {
        const VulnerableContract = await hre.ethers.getContractFactory("RewardDistributionVulnerable");
        const contract = VulnerableContract.attach(contractAddress);

        // Check if code exists at address
        const code = await hre.ethers.provider.getCode(contractAddress);
        if (code === "0x") {
            console.error("ERROR: No contract code found at this address!");
            return;
        }
        console.log("Contract code exists.");

        // Check Owner
        const owner = await contract.owner();
        console.log("Contract Owner:", owner);

        if (owner.toLowerCase() !== deployer.address.toLowerCase()) {
            console.error("CRITICAL: Deployer is NOT the owner!");
        } else {
            console.log("✓ Deployer is the owner.");
        }

        // Try adding beneficiary
        console.log("Attempting to add beneficiary...");
        const tx = await contract.addBeneficiary("0x70997970C51812dc3A010C7d01b50e0d17dc79C8", hre.ethers.parseEther("1.0"));
        console.log("Transaction sent:", tx.hash);

        const receipt = await tx.wait();
        console.log("✓ Transaction successful! Block:", receipt.blockNumber);

    } catch (error) {
        console.error("\n❌ TRANSACTION FAILED");
        console.error("Reason:", error.message);
        if (error.data) {
            console.error("Error Data:", error.data);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
