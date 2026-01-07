const { execSync } = require('child_process');
const path = require('path');

const scripts = {
    '1': { name: 'Check Owner', script: 'checkOwner.js' },
    '2': { name: 'Add 10 Beneficiaries', script: 'simulateAddBeneficiaries.js', args: ['10'] },
    '3': { name: 'Add Single Beneficiary (Debug)', script: 'debugAddBeneficiary.js' },
    '4': { name: 'Distribute Rewards', script: 'simulateDistribution.js' },
    '5': { name: 'Run Attack Simulation', script: 'attackSimulation.js' },
    '6': { name: 'Redeploy Contracts (Reset)', script: 'deploy.js' },
    '7': { name: 'Check Wallet Nonce', script: 'checkNonce.js' },
    '8': { name: 'Check Contract Code', script: 'checkCode.js' },
    '9': { name: 'List Accounts & Balances', script: 'showAccounts.js' },
};

function clearScreen() {
    process.stdout.write('\x1Bc');
}

function printMenu() {
    console.log('\n========================================');
    console.log('      BLOCKCHAIN BACKEND TEST MENU      ');
    console.log('========================================');
    console.log('1. Check Owner & Contract Status');
    console.log('2. Add 10 Random Beneficiaries');
    console.log('3. Add Single Beneficiary (Debug)');
    console.log('4. Distribute Rewards');
    console.log('5. Run Attack Simulation');
    console.log('6. Redeploy Contracts (Reset State)');
    console.log('7. Check Wallet Nonce');
    console.log('8. Check Contract Code');
    console.log('9. List Accounts & Balances');
    console.log('0. Exit');
    console.log('========================================');
    console.log('Press number key to select option...');
}

function runScript(scriptName, args = []) {
    // Hardhat requires ' -- ' to pass arguments to the script itself
    const argsString = args.length > 0 ? ` -- ${args.join(' ')}` : '';
    const cmd = `npx hardhat run scripts/${scriptName} --network localhost${argsString}`;

    console.log(`\n> Running ${scriptName}...\n`);
    try {
        execSync(cmd, {
            stdio: 'inherit',
            cwd: path.join(__dirname, '..')
        });
    } catch (err) {
        // Error already printed by inherit
    }
}

function startMenu() {
    clearScreen();
    printMenu();

    // Raw mode for single keypress without enter
    process.stdin.setRawMode(true);
    process.stdin.resume();
    process.stdin.setEncoding('utf8');

    const onData = (key) => {
        // Ctrl+C to exit
        if (key === '\u0003') {
            process.exit(0);
        }

        const choice = key.toString().trim();

        if (['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'].includes(choice)) {
            // DETACH STDIN COMPLETELY
            process.stdin.setRawMode(false);
            process.stdin.pause();
            process.stdin.removeListener('data', onData);

            if (choice === '0') {
                console.log('Exiting...');
                process.exit(0);
            }

            if (scripts[choice]) {
                const { script, args } = scripts[choice];
                runScript(script, args);

                console.log('\nPress any key to return to menu...');

                // Re-attach for "Press any key"
                process.stdin.setRawMode(true);
                process.stdin.resume();
                process.stdin.once('data', () => {
                    process.stdin.setRawMode(false);
                    process.stdin.pause();
                    startMenu();
                });
            }
        }
    };

    process.stdin.on('data', onData);
}

startMenu();
