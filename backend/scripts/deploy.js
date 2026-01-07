const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("========================================");
    console.log("Deploying Reward Distribution Contracts");
    console.log("========================================\n");

    const [deployer] = await hre.ethers.getSigners();
    console.log(`Deploying contracts with account: ${deployer.address}`);
    console.log(`Account balance: ${hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address))} ETH\n`);

    // Deploy Vulnerable Contract
    console.log("Deploying RewardDistributionVulnerable...");
    const VulnerableContract = await hre.ethers.getContractFactory("RewardDistributionVulnerable");
    const vulnerableContract = await VulnerableContract.deploy();
    await vulnerableContract.waitForDeployment();
    const vulnerableAddress = await vulnerableContract.getAddress();
    console.log(`✓ RewardDistributionVulnerable deployed to: ${vulnerableAddress}\n`);

    // Deploy Secure Contract
    console.log("Deploying RewardDistributionSecure...");
    const SecureContract = await hre.ethers.getContractFactory("RewardDistributionSecure");
    const secureContract = await SecureContract.deploy();
    await secureContract.waitForDeployment();
    const secureAddress = await secureContract.getAddress();
    console.log(`✓ RewardDistributionSecure deployed to: ${secureAddress}\n`);

    // Deploy MaliciousReceiver
    console.log("Deploying MaliciousReceiver...");
    const MaliciousContract = await hre.ethers.getContractFactory("MaliciousReceiver");
    const maliciousContract = await MaliciousContract.deploy();
    await maliciousContract.waitForDeployment();
    const maliciousAddress = await maliciousContract.getAddress();
    console.log(`✓ MaliciousReceiver deployed to: ${maliciousAddress}\n`);

    // Deploy GasBurner
    console.log("Deploying GasBurner...");
    const GasBurnerContract = await hre.ethers.getContractFactory("GasBurner");
    const gasBurnerContract = await GasBurnerContract.deploy();
    await gasBurnerContract.waitForDeployment();
    const gasBurnerAddress = await gasBurnerContract.getAddress();
    console.log(`✓ GasBurner deployed to: ${gasBurnerAddress}\n`);

    // Save deployment addresses
    const deploymentData = {
        network: hre.network.name,
        deployer: deployer.address,
        timestamp: new Date().toISOString(),
        contracts: {
            RewardDistributionVulnerable: vulnerableAddress,
            RewardDistributionSecure: secureAddress,
            MaliciousReceiver: maliciousAddress,
            GasBurner: gasBurnerAddress
        }
    };

    const deploymentsDir = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir);
    }

    const deploymentFile = path.join(deploymentsDir, `${hre.network.name}.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentData, null, 2));
    console.log(`Deployment info saved to: ${deploymentFile}\n`);

    // Copy ABIs to frontend (if frontend directory exists)
    const frontendContractsDir = path.join(__dirname, "../../frontend/src/contracts");
    if (fs.existsSync(path.join(__dirname, "../../frontend"))) {
        if (!fs.existsSync(frontendContractsDir)) {
            fs.mkdirSync(frontendContractsDir, { recursive: true });
        }

        console.log("Copying ABIs to frontend...");

        const artifacts = [
            "RewardDistributionVulnerable",
            "RewardDistributionSecure",
            "MaliciousReceiver",
            "GasBurner"
        ];

        for (const contractName of artifacts) {
            const artifactPath = path.join(
                __dirname,
                `../artifacts/contracts/${contractName}.sol/${contractName}.json`
            );

            if (fs.existsSync(artifactPath)) {
                const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
                const abiData = {
                    address: deploymentData.contracts[contractName],
                    abi: artifact.abi
                };

                const targetPath = path.join(frontendContractsDir, `${contractName}.json`);
                fs.writeFileSync(targetPath, JSON.stringify(abiData, null, 2));
                console.log(`  ✓ ${contractName}.json`);
            }
        }

        // Also save deployment addresses for frontend
        const addressesFile = path.join(frontendContractsDir, "addresses.json");
        fs.writeFileSync(addressesFile, JSON.stringify(deploymentData.contracts, null, 2));
        console.log(`  ✓ addresses.json\n`);
    }

    console.log("========================================");
    console.log("Deployment Summary");
    console.log("========================================");
    console.log(`Network: ${hre.network.name}`);
    console.log(`Vulnerable: ${vulnerableAddress}`);
    console.log(`Secure: ${secureAddress}`);
    console.log(`Malicious: ${maliciousAddress}`);
    console.log(`GasBurner: ${gasBurnerAddress}`);
    console.log("========================================\n");
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
