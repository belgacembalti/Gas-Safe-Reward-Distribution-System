const hre = require("hardhat");

async function main() {
    console.log("\n========================================");
    console.log("HARDHAT TEST ACCOUNTS");
    console.log("========================================\n");

    const accounts = await hre.ethers.getSigners();

    for (let i = 0; i < Math.min(accounts.length, 10); i++) {
        const account = accounts[i];
        const address = await account.getAddress();
        const balance = await hre.ethers.provider.getBalance(address);

        console.log(`Account #${i}:`);
        console.log(`  Address:     ${address}`);
        console.log(`  Balance:     ${hre.ethers.formatEther(balance)} ETH`);

        // Display the private key (only available for test accounts)
        if (account.privateKey) {
            console.log(`  Private Key: ${account.privateKey}`);
        }
        console.log("");
    }

    console.log("========================================");
    console.log("HOW TO USE:");
    console.log("========================================");
    console.log("1. Open MetaMask");
    console.log("2. Click 'Import Account'");
    console.log("3. Paste any Private Key from above");
    console.log("4. Connect to Hardhat network (http://127.0.0.1:8545, Chain ID: 1337)");
    console.log("========================================\n");

    console.log("⚠️  WARNING: These are TEST accounts only!");
    console.log("   Never use these private keys on mainnet or with real funds!\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
