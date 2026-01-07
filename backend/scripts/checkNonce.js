const hre = require("hardhat");

async function main() {
    const [signer] = await hre.ethers.getSigners();
    console.log("Account:", signer.address);

    // Get transaction count (nonce)
    const nonce = await hre.ethers.provider.getTransactionCount(signer.address);
    console.log("Current On-Chain Nonce:", nonce);
    console.log("---------------------------------------------------");
    console.log("DEBUGGING TIP:");
    console.log("If MetaMask shows a 'Nonce' higher than", nonce, ", you MUST reset it.");
    console.log("If MetaMask shows a 'Nonce' lower than", nonce, ", your transaction is stuck.");
    console.log("---------------------------------------------------");
}

main().catch(console.error);
