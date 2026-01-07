import { useState, useEffect } from 'react';
import { Contract, parseEther, formatEther, Wallet } from 'ethers';
import { Users, Plus, Send, AlertTriangle, BarChart3, Wallet as WalletIcon, Network, RefreshCw, TrendingUp, Shield, AlertCircle } from 'lucide-react';

export const AdminPanel = ({ signer, vulnerableAddress, secureAddress, maliciousAddress, vulnerableABI, secureABI, maliciousABI, onRefresh }) => {
    const [beneficiaryAddress, setBeneficiaryAddress] = useState('');
    const [rewardAmount, setRewardAmount] = useState('1.0');
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [activeContract, setActiveContract] = useState('vulnerable');
    const [stats, setStats] = useState({
        vulnerable: { beneficiaryCount: 0, contractBalance: '0', loading: true },
        secure: { beneficiaryCount: 0, contractBalance: '0', totalPending: '0', totalDistributed: '0', loading: true },
        network: { blockNumber: 0, chainId: 0, loading: true },
        account: { balance: '0', nonce: 0, loading: true }
    });
    const [refreshingStats, setRefreshingStats] = useState(false);

    // Fetch stats from contracts
    const fetchStats = async () => {
        if (!signer) return;

        setRefreshingStats(true);
        try {
            const provider = signer.provider;
            const address = await signer.getAddress();

            // Network stats
            const blockNumber = await provider.getBlockNumber();
            const network = await provider.getNetwork();
            const chainId = Number(network.chainId);

            // Account stats
            const accountBalance = await provider.getBalance(address);
            const accountNonce = await provider.getTransactionCount(address, 'latest');

            // Vulnerable contract stats
            let vulnerableStats = { beneficiaryCount: 0, contractBalance: '0', loading: false };
            try {
                if (vulnerableAddress) {
                    const vulnerableContract = new Contract(vulnerableAddress, vulnerableABI, provider);
                    const vulnCount = await vulnerableContract.getBeneficiaryCount();
                    const vulnBalance = await vulnerableContract.getBalance();
                    vulnerableStats = {
                        beneficiaryCount: Number(vulnCount),
                        contractBalance: formatEther(vulnBalance),
                        loading: false
                    };
                }
            } catch (e) {
                console.error('Error fetching vulnerable stats:', e);
                vulnerableStats.loading = false;
            }

            // Secure contract stats
            let secureStats = { beneficiaryCount: 0, contractBalance: '0', totalPending: '0', totalDistributed: '0', loading: false };
            try {
                if (secureAddress) {
                    const secureContract = new Contract(secureAddress, secureABI, provider);
                    const secureCount = await secureContract.getBeneficiaryCount();
                    const secureBalance = await secureContract.getContractBalance();
                    const totalPending = await secureContract.getTotalPending();
                    const totalDistributed = await secureContract.totalDistributed();
                    secureStats = {
                        beneficiaryCount: Number(secureCount),
                        contractBalance: formatEther(secureBalance),
                        totalPending: formatEther(totalPending),
                        totalDistributed: formatEther(totalDistributed),
                        loading: false
                    };
                }
            } catch (e) {
                console.error('Error fetching secure stats:', e);
                secureStats.loading = false;
            }

            setStats({
                vulnerable: vulnerableStats,
                secure: secureStats,
                network: { blockNumber, chainId, loading: false },
                account: { balance: formatEther(accountBalance), nonce: accountNonce, loading: false }
            });
        } catch (error) {
            console.error('Error fetching stats:', error);
        } finally {
            setRefreshingStats(false);
        }
    };

    // Initial fetch on mount
    useEffect(() => {
        if (signer && vulnerableAddress && secureAddress) {
            fetchStats();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [signer, vulnerableAddress, secureAddress]);

    // Check connection before sending transaction
    const checkConnection = async () => {
        if (!signer) {
            throw new Error('Wallet not connected');
        }
        try {
            const provider = signer.provider;
            const network = await provider.getNetwork();
            const chainId = Number(network.chainId);
            // Accept both 1337 and 31337 (Hardhat's default chain IDs)
            if (chainId !== 1337 && chainId !== 31337) {
                throw new Error(`Wrong network! Expected Chain ID 1337 or 31337 (Hardhat Local), but connected to ${chainId}. Please switch to Hardhat Local network.`);
            }
            // Try to get block number to verify node is running
            await provider.getBlockNumber();

            // Check nonce to help diagnose issues
            try {
                const address = await signer.getAddress();
                const onChainNonce = await provider.getTransactionCount(address, 'latest');
                console.log(`Current on-chain nonce: ${onChainNonce}`);
            } catch (e) {
                // Nonce check failed, but continue anyway
                console.warn('Could not check nonce:', e);
            }
        } catch (error) {
            if (error.message.includes('Wrong network')) {
                throw error;
            }
            throw new Error('Cannot connect to Hardhat node. Make sure "npx hardhat node" is running.');
        }
    };

    const addBeneficiary = async () => {
        if (!beneficiaryAddress || !rewardAmount) {
            setMessage({ type: 'error', text: 'Please fill in all fields' });
            return;
        }

        setLoading(true);
        setMessage(null);

        try {
            // Check connection first
            await checkConnection();

            const reward = parseEther(rewardAmount);

            // Get current nonce to ensure MetaMask uses the correct one
            const address = await signer.getAddress();
            const provider = signer.provider;

            // Check both confirmed and pending transactions
            const confirmedNonce = await provider.getTransactionCount(address, 'latest');
            const pendingNonce = await provider.getTransactionCount(address, 'pending');
            const balance = await provider.getBalance(address);

            console.log('=== TRANSACTION DEBUG INFO ===');
            console.log('From address:', address);
            console.log('To contract:', activeContract === 'vulnerable' ? vulnerableAddress : secureAddress);
            console.log('Beneficiary:', beneficiaryAddress);
            console.log('Reward amount:', rewardAmount, 'ETH');
            console.log('Confirmed nonce:', confirmedNonce);
            console.log('Pending nonce:', pendingNonce);
            console.log('Account balance:', balance.toString(), 'wei');
            console.log('Network chainId:', (await provider.getNetwork()).chainId);

            if (pendingNonce > confirmedNonce) {
                console.warn(`⚠️ WARNING: There are ${pendingNonce - confirmedNonce} pending transactions!`);
                console.warn('This can cause nonce mismatch. Consider resetting MetaMask account.');
            }

            // Verify contract exists
            const contractAddress = activeContract === 'vulnerable' ? vulnerableAddress : secureAddress;
            const contractCode = await provider.getCode(contractAddress);
            console.log('Contract code exists:', contractCode !== '0x' ? 'YES' : 'NO');

            if (contractCode === '0x') {
                throw new Error(`Contract not found at address ${contractAddress}. Please redeploy contracts.`);
            }

            console.log('Attempting transaction (letting MetaMask handle nonce)...');

            // Try without explicit nonce - let MetaMask handle it
            // MetaMask manages its own nonce counter, so forcing a nonce can cause conflicts
            let tx;
            const txOptions = {
                gasLimit: 500000
                // Don't set nonce - let MetaMask handle it to avoid conflicts
            };

            if (activeContract === 'vulnerable') {
                const contract = new Contract(vulnerableAddress, vulnerableABI, signer);
                console.log('Calling addBeneficiary on vulnerable contract...');
                tx = await contract.addBeneficiary(beneficiaryAddress, reward, txOptions);
                console.log('Transaction sent, hash:', tx.hash);
            } else {
                const contract = new Contract(secureAddress, secureABI, signer);
                console.log('Calling setBeneficiaryReward on secure contract...');
                tx = await contract.setBeneficiaryReward(beneficiaryAddress, reward, txOptions);
                console.log('Transaction sent, hash:', tx.hash);
            }

            console.log('Waiting for transaction confirmation...');
            const receipt = await tx.wait();
            console.log('Transaction confirmed in block:', receipt.blockNumber);
            console.log('Gas used:', receipt.gasUsed.toString());
            console.log('=== TRANSACTION SUCCESS ===');

            setMessage({ type: 'success', text: 'Beneficiary added successfully!' });
            setBeneficiaryAddress('');
            setRewardAmount('1.0');

            // Refresh stats after successful transaction
            await fetchStats();
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error('=== ERROR DETAILS ===');
            console.error('Error type:', error.constructor.name);
            console.error('Error message:', error.message);
            console.error('Error code:', error.code);
            console.error('Error info:', error.info);
            console.error('Error stack:', error.stack);

            // Log detailed error information
            if (error.info) {
                console.error('Error info details:', JSON.stringify(error.info, null, 2));
            }
            if (error.reason) {
                console.error('Error reason:', error.reason);
            }
            if (error.data) {
                console.error('Error data:', error.data);
            }

            // Check if it's a nonce-related error
            if (error.message && error.message.includes('nonce')) {
                console.error('NONCE ERROR DETECTED');
            }

            // Check if it's a gas-related error
            if (error.message && (error.message.includes('gas') || error.message.includes('out of gas'))) {
                console.error('GAS ERROR DETECTED');
            }

            // Check if contract call failed
            if (error.message && error.message.includes('revert')) {
                console.error('CONTRACT REVERT DETECTED');
            }

            console.error('=== END ERROR DETAILS ===');

            let msg = error.message || 'Transaction failed';

            // Handle Internal JSON-RPC errors (usually nonce mismatch or connection issues)
            if (msg.includes('Internal JSON-RPC error') || error.code === -32603 || error.code === 'UNKNOWN_ERROR' ||
                (error.info && error.info.error && error.info.error.code === -32603)) {

                // Try to get more details from the error
                let detailedMsg = '⚠️ NONCE MISMATCH - MetaMask transaction history doesn\'t match Hardhat node.\n\n';
                detailedMsg += 'FIX STEPS:\n';
                detailedMsg += '1. Open MetaMask\n';
                detailedMsg += '2. Click ⋮ (three dots) → Settings\n';
                detailedMsg += '3. Go to Advanced\n';
                detailedMsg += '4. Scroll down → Click "Reset Account"\n';
                detailedMsg += '5. Confirm the reset\n';
                detailedMsg += '6. Try the transaction again\n\n';
                detailedMsg += 'This clears MetaMask\'s transaction history and fixes the nonce mismatch.';

                // Check Hardhat node connection
                try {
                    const provider = signer.provider;
                    const blockNumber = await provider.getBlockNumber();
                    console.log('Hardhat node is reachable, latest block:', blockNumber);
                } catch (e) {
                    console.error('Cannot reach Hardhat node:', e);
                    detailedMsg += '\n\n⚠️ WARNING: Cannot connect to Hardhat node. Make sure "npx hardhat node" is running.';
                }

                msg = detailedMsg;
            }
            setMessage({ type: 'error', text: msg });
        } finally {
            setLoading(false);
        }
    };

    const addMultipleBeneficiaries = async (count) => {
        setLoading(true);
        setMessage(null);

        try {
            // Check connection first
            await checkConnection();

            // Warn user about MetaMask confirmations for vulnerable contract
            if (activeContract === 'vulnerable' && count > 20) {
                const confirmProceed = window.confirm(
                    `⚠️ WARNING: Adding ${count} beneficiaries to the vulnerable contract will require ${count} MetaMask confirmations (one per transaction).\n\n` +
                    `This will take a long time!\n\n` +
                    `For ${count} beneficiaries, we recommend using the backend script instead:\n` +
                    `"npx hardhat run scripts/simulateAddBeneficiaries.js ${count} --network localhost"\n\n` +
                    `Do you want to continue?`
                );
                if (!confirmProceed) {
                    setLoading(false);
                    return;
                }
            }

            const reward = parseEther('0.1');
            const addresses = [];
            const rewards = [];

            // Generate random addresses for testing
            for (let i = 0; i < count; i++) {
                const randomWallet = Wallet.createRandom();
                addresses.push(randomWallet.address);
                rewards.push(reward);
            }

            // Get current nonce
            const address = await signer.getAddress();
            const provider = signer.provider;

            if (activeContract === 'vulnerable') {
                // Vulnerable contract doesn't have batch function, so add one by one
                const contract = new Contract(vulnerableAddress, vulnerableABI, signer);
                setMessage({ type: 'info', text: `Adding ${count} beneficiaries... You'll need to confirm ${count} transactions in MetaMask.` });

                for (let i = 0; i < addresses.length; i++) {
                    const tx = await contract.addBeneficiary(addresses[i], rewards[i], {
                        gasLimit: 500000
                    });
                    await tx.wait();

                    // Update progress message
                    if ((i + 1) % 10 === 0) {
                        setMessage({ type: 'info', text: `Progress: ${i + 1}/${count} beneficiaries added...` });
                    }
                }
            } else {
                // Secure contract - use batch function to reduce MetaMask confirmations
                const contract = new Contract(secureAddress, secureABI, signer);

                // Batch size: 50 beneficiaries per transaction to avoid gas limit issues
                const batchSize = 50;
                const numBatches = Math.ceil(count / batchSize);

                setMessage({ type: 'info', text: `Adding ${count} beneficiaries in ${numBatches} batches (${batchSize} per batch). You'll need to confirm ${numBatches} transactions in MetaMask.` });

                for (let i = 0; i < addresses.length; i += batchSize) {
                    const batchAddresses = addresses.slice(i, i + batchSize);
                    const batchRewards = rewards.slice(i, i + batchSize);

                    const tx = await contract.batchSetRewards(batchAddresses, batchRewards, {
                        gasLimit: 5000000 // Higher gas limit for batch operations
                    });
                    await tx.wait();

                    // Update progress message
                    const batchNum = Math.floor(i / batchSize) + 1;
                    setMessage({ type: 'info', text: `Progress: Batch ${batchNum}/${numBatches} completed (${Math.min(i + batchSize, addresses.length)}/${count} beneficiaries)...` });
                }
            }

            setMessage({ type: 'success', text: `Added ${count} beneficiaries successfully!` });

            // Refresh stats after successful transaction
            await fetchStats();
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error('Error adding multiple beneficiaries:', error);
            let msg = error.message || 'Transaction failed';

            // Handle Internal JSON-RPC errors (usually nonce mismatch or connection issues)
            if (msg.includes('Internal JSON-RPC error') || error.code === -32603 || error.code === 'UNKNOWN_ERROR' ||
                (error.info && error.info.error && error.info.error.code === -32603)) {
                msg = '⚠️ NONCE MISMATCH - MetaMask transaction history doesn\'t match Hardhat node. FIX: Open MetaMask → Settings (⋮) → Advanced → Reset Account → Confirm. Then try again. This clears MetaMask\'s transaction history and fixes the nonce.';
            }
            setMessage({ type: 'error', text: msg });
        } finally {
            setLoading(false);
        }
    };

    const deployMaliciousAttacker = async () => {
        setLoading(true);
        setMessage(null);

        try {
            // Check connection first
            await checkConnection();

            const maliciousContract = new Contract(maliciousAddress, maliciousABI, signer);

            // Set attack mode to REVERT (1)
            const tx1 = await maliciousContract.setAttackMode(1, {
                gasLimit: 500000
            });
            await tx1.wait();

            const reward = parseEther('1.0');

            if (activeContract === 'vulnerable') {
                const contract = new Contract(vulnerableAddress, vulnerableABI, signer);
                const tx2 = await contract.addBeneficiary(maliciousAddress, reward, {
                    gasLimit: 500000
                });
                await tx2.wait();
            } else {
                const contract = new Contract(secureAddress, secureABI, signer);
                const tx2 = await contract.setBeneficiaryReward(maliciousAddress, reward, {
                    gasLimit: 500000
                });
                await tx2.wait();
            }

            setMessage({ type: 'warning', text: 'Malicious contract added! Try distributing now.' });

            // Refresh stats after successful transaction
            await fetchStats();
            if (onRefresh) onRefresh();
        } catch (error) {
            console.error('Error deploying attack:', error);
            let msg = error.message || 'Transaction failed';

            // Handle Internal JSON-RPC errors (usually nonce mismatch or connection issues)
            if (msg.includes('Internal JSON-RPC error') || error.code === -32603 || error.code === 'UNKNOWN_ERROR' ||
                (error.info && error.info.error && error.info.error.code === -32603)) {
                msg = '⚠️ NONCE MISMATCH - MetaMask transaction history doesn\'t match Hardhat node. FIX: Open MetaMask → Settings (⋮) → Advanced → Reset Account → Confirm. Then try again. This clears MetaMask\'s transaction history and fixes the nonce.';
            }
            setMessage({ type: 'error', text: msg });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div>
            {/* Stats Dashboard */}
            <div className="card" style={{ marginBottom: 'var(--spacing-xl)' }}>
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                        <h3 className="card-title">
                            <BarChart3 size={24} />
                            Dashboard Statistics
                        </h3>
                        <p className="card-subtitle">Real-time contract and network metrics</p>
                    </div>
                    <button
                        className="btn btn-outline"
                        onClick={fetchStats}
                        disabled={refreshingStats}
                        style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-xs)' }}
                    >
                        <RefreshCw
                            size={16}
                            style={{
                                animation: refreshingStats ? 'spin 1s linear infinite' : 'none',
                                transition: 'transform 0.2s'
                            }}
                        />
                        Refresh
                    </button>
                </div>

                {/* Comparison Explanation Section */}
                <div className="card" style={{
                    background: 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
                    border: '1px solid rgba(102, 126, 234, 0.3)',
                    marginBottom: 'var(--spacing-lg)'
                }}>
                    <div style={{ marginBottom: 'var(--spacing-md)' }}>
                        <h4 style={{ fontSize: '1rem', marginBottom: 'var(--spacing-sm)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                            <BarChart3 size={20} />
                            Key Differences: Push vs Pull Payments
                        </h4>
                        <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-md)' }}>
                            Understanding why one contract is vulnerable and the other is secure
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-md">
                        {/* Vulnerable Explanation */}
                        <div style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            padding: 'var(--spacing-md)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid rgba(239, 68, 68, 0.3)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                                <AlertCircle size={18} style={{ color: 'var(--color-danger)' }} />
                                <h5 style={{ fontSize: '0.9rem', color: 'var(--color-danger)', margin: 0 }}>Push Payments (Vulnerable)</h5>
                            </div>
                            <div style={{ fontSize: '0.8rem', lineHeight: '1.6' }}>
                                <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                                    <strong style={{ color: 'var(--color-danger)' }}>How it works:</strong>
                                    <p style={{ margin: '0.25rem 0', color: 'var(--color-text-secondary)' }}>
                                        Contract sends funds to ALL beneficiaries in ONE transaction
                                    </p>
                                </div>
                                <div style={{
                                    background: 'rgba(0, 0, 0, 0.3)',
                                    padding: 'var(--spacing-sm)',
                                    borderRadius: 'var(--radius-sm)',
                                    marginBottom: 'var(--spacing-sm)',
                                    fontFamily: 'monospace',
                                    fontSize: '0.75rem'
                                }}>
                                    <div style={{ color: 'var(--color-danger)' }}>❌ for (beneficiary in list) {'{'}</div>
                                    <div style={{ marginLeft: '1rem', color: 'var(--color-text-secondary)' }}>send(amount);</div>
                                    <div style={{ color: 'var(--color-danger)' }}>{'}'}</div>
                                </div>
                                <div>
                                    <strong style={{ color: 'var(--color-danger)' }}>Vulnerabilities:</strong>
                                    <ul style={{ margin: '0.5rem 0', paddingLeft: '1.25rem', color: 'var(--color-text-secondary)' }}>
                                        <li>Gas limit DoS with 100+ beneficiaries</li>
                                        <li>One malicious receiver blocks everyone</li>
                                        <li>Gas cost grows with list size</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        {/* Secure Explanation */}
                        <div style={{
                            background: 'rgba(16, 185, 129, 0.1)',
                            padding: 'var(--spacing-md)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid rgba(16, 185, 129, 0.3)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                                <Shield size={18} style={{ color: 'var(--color-success)' }} />
                                <h5 style={{ fontSize: '0.9rem', color: 'var(--color-success)', margin: 0 }}>Pull Payments (Secure)</h5>
                            </div>
                            <div style={{ fontSize: '0.8rem', lineHeight: '1.6' }}>
                                <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                                    <strong style={{ color: 'var(--color-success)' }}>How it works:</strong>
                                    <p style={{ margin: '0.25rem 0', color: 'var(--color-text-secondary)' }}>
                                        Each beneficiary withdraws their reward INDEPENDENTLY
                                    </p>
                                </div>
                                <div style={{
                                    background: 'rgba(0, 0, 0, 0.3)',
                                    padding: 'var(--spacing-sm)',
                                    borderRadius: 'var(--radius-sm)',
                                    marginBottom: 'var(--spacing-sm)',
                                    fontFamily: 'monospace',
                                    fontSize: '0.75rem'
                                }}>
                                    <div style={{ color: 'var(--color-success)' }}>✅ function withdraw() {'{'}</div>
                                    <div style={{ marginLeft: '1rem', color: 'var(--color-text-secondary)' }}>amount = pending[msg.sender];</div>
                                    <div style={{ marginLeft: '1rem', color: 'var(--color-text-secondary)' }}>send(amount);</div>
                                    <div style={{ color: 'var(--color-success)' }}>{'}'}</div>
                                </div>
                                <div>
                                    <strong style={{ color: 'var(--color-success)' }}>Benefits:</strong>
                                    <ul style={{ margin: '0.5rem 0', paddingLeft: '1.25rem', color: 'var(--color-text-secondary)' }}>
                                        <li>Constant gas cost (~50K per withdrawal)</li>
                                        <li>Isolated failures (one can't block others)</li>
                                        <li>Unlimited scalability</li>
                                    </ul>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Grid */}
                <div className="grid grid-cols-2 gap-md" style={{ marginBottom: 'var(--spacing-lg)' }}>
                    {/* Vulnerable Contract Stats */}
                    <div className="card" style={{ background: 'rgba(239, 68, 68, 0.05)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                            <AlertCircle size={20} style={{ color: 'var(--color-danger)' }} />
                            <h4 style={{ fontSize: '0.9rem', color: 'var(--color-danger)', margin: 0 }}>Vulnerable Contract</h4>
                        </div>
                        {stats.vulnerable.loading ? (
                            <div style={{ textAlign: 'center', padding: 'var(--spacing-md)' }}>
                                <span className="spinner"></span>
                            </div>
                        ) : (
                            <div>
                                <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Beneficiaries</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.vulnerable.beneficiaryCount}</div>
                                    {stats.vulnerable.beneficiaryCount > 100 && (
                                        <div style={{ fontSize: '0.7rem', color: 'var(--color-danger)', marginTop: '0.25rem' }}>
                                            ⚠️ May exceed gas limit!
                                        </div>
                                    )}
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Contract Balance</div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: '600' }}>{parseFloat(stats.vulnerable.contractBalance).toFixed(4)} ETH</div>
                                </div>
                                <div style={{
                                    marginTop: 'var(--spacing-md)',
                                    padding: 'var(--spacing-sm)',
                                    background: 'rgba(239, 68, 68, 0.1)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '0.75rem'
                                }}>
                                    <strong style={{ color: 'var(--color-danger)' }}>⚠️ Vulnerable to:</strong>
                                    <ul style={{ margin: '0.5rem 0 0 1rem', padding: 0, color: 'var(--color-text-secondary)' }}>
                                        <li>Gas Limit DoS</li>
                                        <li>Malicious Fallback</li>
                                        <li>Gas Griefing</li>
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Secure Contract Stats */}
                    <div className="card" style={{ background: 'rgba(16, 185, 129, 0.05)', border: '1px solid rgba(16, 185, 129, 0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                            <Shield size={20} style={{ color: 'var(--color-success)' }} />
                            <h4 style={{ fontSize: '0.9rem', color: 'var(--color-success)', margin: 0 }}>Secure Contract</h4>
                        </div>
                        {stats.secure.loading ? (
                            <div style={{ textAlign: 'center', padding: 'var(--spacing-md)' }}>
                                <span className="spinner"></span>
                            </div>
                        ) : (
                            <div>
                                <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Beneficiaries</div>
                                    <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.secure.beneficiaryCount}</div>
                                    {stats.secure.beneficiaryCount > 100 && (
                                        <div style={{ fontSize: '0.7rem', color: 'var(--color-success)', marginTop: '0.25rem' }}>
                                            ✅ No gas limit issues!
                                        </div>
                                    )}
                                </div>
                                <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Total Pending</div>
                                    <div style={{ fontSize: '1rem', fontWeight: '600' }}>{parseFloat(stats.secure.totalPending).toFixed(4)} ETH</div>
                                </div>
                                <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Total Distributed</div>
                                    <div style={{ fontSize: '1rem', fontWeight: '600', color: 'var(--color-success)' }}>
                                        <TrendingUp size={14} style={{ display: 'inline', marginRight: '4px' }} />
                                        {parseFloat(stats.secure.totalDistributed).toFixed(4)} ETH
                                    </div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Contract Balance</div>
                                    <div style={{ fontSize: '1rem', fontWeight: '600' }}>{parseFloat(stats.secure.contractBalance).toFixed(4)} ETH</div>
                                </div>
                                <div style={{
                                    marginTop: 'var(--spacing-md)',
                                    padding: 'var(--spacing-sm)',
                                    background: 'rgba(16, 185, 129, 0.1)',
                                    borderRadius: 'var(--radius-sm)',
                                    fontSize: '0.75rem'
                                }}>
                                    <strong style={{ color: 'var(--color-success)' }}>✅ Protected from:</strong>
                                    <ul style={{ margin: '0.5rem 0 0 1rem', padding: 0, color: 'var(--color-text-secondary)' }}>
                                        <li>Gas Limit DoS</li>
                                        <li>Malicious Fallback</li>
                                        <li>Gas Griefing</li>
                                    </ul>
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* Detailed Comparison Table */}
                <div style={{
                    marginTop: 'var(--spacing-lg)',
                    padding: 'var(--spacing-md)',
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: 'var(--radius-md)'
                }}>
                    <h5 style={{ fontSize: '0.9rem', marginBottom: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                        <BarChart3 size={18} />
                        Side-by-Side Comparison
                    </h5>
                    <div className="table-container">
                        <table style={{ width: '100%', fontSize: '0.875rem' }}>
                            <thead>
                                <tr>
                                    <th style={{ textAlign: 'left', padding: 'var(--spacing-sm)' }}>Feature</th>
                                    <th style={{ textAlign: 'center', padding: 'var(--spacing-sm)' }}>
                                        <span style={{ color: 'var(--color-danger)' }}>Vulnerable (Push)</span>
                                    </th>
                                    <th style={{ textAlign: 'center', padding: 'var(--spacing-sm)' }}>
                                        <span style={{ color: 'var(--color-success)' }}>Secure (Pull)</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td style={{ padding: 'var(--spacing-sm)' }}><strong>Payment Pattern</strong></td>
                                    <td style={{ textAlign: 'center', padding: 'var(--spacing-sm)' }}>
                                        <span className="badge badge-danger">Contract → All Beneficiaries</span>
                                    </td>
                                    <td style={{ textAlign: 'center', padding: 'var(--spacing-sm)' }}>
                                        <span className="badge badge-success">Each Beneficiary → Contract</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ padding: 'var(--spacing-sm)' }}><strong>Gas Cost</strong></td>
                                    <td style={{ textAlign: 'center', padding: 'var(--spacing-sm)', color: 'var(--color-danger)' }}>
                                        Grows with beneficiaries<br />
                                        <span style={{ fontSize: '0.75rem' }}>~500K for 10, fails at 100+</span>
                                    </td>
                                    <td style={{ textAlign: 'center', padding: 'var(--spacing-sm)', color: 'var(--color-success)' }}>
                                        Constant per withdrawal<br />
                                        <span style={{ fontSize: '0.75rem' }}>~50K per withdrawal</span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ padding: 'var(--spacing-sm)' }}><strong>Scalability</strong></td>
                                    <td style={{ textAlign: 'center', padding: 'var(--spacing-sm)' }}>
                                        <AlertCircle size={16} style={{ color: 'var(--color-danger)', display: 'inline' }} /> Limited (~100 max)
                                    </td>
                                    <td style={{ textAlign: 'center', padding: 'var(--spacing-sm)' }}>
                                        <Shield size={16} style={{ color: 'var(--color-success)', display: 'inline' }} /> Unlimited
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ padding: 'var(--spacing-sm)' }}><strong>Malicious Receiver</strong></td>
                                    <td style={{ textAlign: 'center', padding: 'var(--spacing-sm)', color: 'var(--color-danger)' }}>
                                        <AlertCircle size={16} style={{ display: 'inline' }} /> Blocks EVERYONE
                                    </td>
                                    <td style={{ textAlign: 'center', padding: 'var(--spacing-sm)', color: 'var(--color-success)' }}>
                                        <Shield size={16} style={{ display: 'inline' }} /> Only attacker fails
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ padding: 'var(--spacing-sm)' }}><strong>Transaction Type</strong></td>
                                    <td style={{ textAlign: 'center', padding: 'var(--spacing-sm)' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                            Single batch transaction
                                        </span>
                                    </td>
                                    <td style={{ textAlign: 'center', padding: 'var(--spacing-sm)' }}>
                                        <span style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                            Individual withdrawals
                                        </span>
                                    </td>
                                </tr>
                                <tr>
                                    <td style={{ padding: 'var(--spacing-sm)' }}><strong>Failure Isolation</strong></td>
                                    <td style={{ textAlign: 'center', padding: 'var(--spacing-sm)', color: 'var(--color-danger)' }}>
                                        ❌ One failure = All fail
                                    </td>
                                    <td style={{ textAlign: 'center', padding: 'var(--spacing-sm)', color: 'var(--color-success)' }}>
                                        ✅ Failures are isolated
                                    </td>
                                </tr>
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Network & Account Stats */}
                <div className="grid grid-cols-2 gap-md" style={{ marginTop: 'var(--spacing-lg)' }}>
                    {/* Network Stats */}
                    <div className="card" style={{ background: 'rgba(59, 130, 246, 0.05)', border: '1px solid rgba(59, 130, 246, 0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                            <Network size={20} style={{ color: 'var(--color-primary)' }} />
                            <h4 style={{ fontSize: '0.9rem', color: 'var(--color-primary)', margin: 0 }}>Network</h4>
                        </div>
                        {stats.network.loading ? (
                            <div style={{ textAlign: 'center', padding: 'var(--spacing-md)' }}>
                                <span className="spinner"></span>
                            </div>
                        ) : (
                            <div>
                                <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Block Number</div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{stats.network.blockNumber.toLocaleString()}</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Chain ID</div>
                                    <div style={{ fontSize: '1rem', fontWeight: '600' }}>{stats.network.chainId}</div>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Account Stats */}
                    <div className="card" style={{ background: 'rgba(168, 85, 247, 0.05)', border: '1px solid rgba(168, 85, 247, 0.2)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-md)' }}>
                            <WalletIcon size={20} style={{ color: 'var(--color-primary)' }} />
                            <h4 style={{ fontSize: '0.9rem', color: 'var(--color-primary)', margin: 0 }}>Your Account</h4>
                        </div>
                        {stats.account.loading ? (
                            <div style={{ textAlign: 'center', padding: 'var(--spacing-md)' }}>
                                <span className="spinner"></span>
                            </div>
                        ) : (
                            <div>
                                <div style={{ marginBottom: 'var(--spacing-sm)' }}>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Balance</div>
                                    <div style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{parseFloat(stats.account.balance).toFixed(4)} ETH</div>
                                </div>
                                <div>
                                    <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>Transaction Count</div>
                                    <div style={{ fontSize: '1rem', fontWeight: '600' }}>{stats.account.nonce}</div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Admin Controls Card */}
            <div className="card">
                <div className="card-header">
                    <h3 className="card-title">
                        <Users size={24} />
                        Admin Controls
                    </h3>
                    <p className="card-subtitle">Manage beneficiaries and test scenarios</p>
                </div>

                {message && (
                    <div className={`alert alert-${message.type}`}>
                        {message.text}
                    </div>
                )}

                <div className="input-group">
                    <label className="input-label">Target Contract</label>
                    <div className="flex gap-md">
                        <button
                            className={`btn ${activeContract === 'vulnerable' ? 'btn-danger' : 'btn-outline'}`}
                            onClick={() => setActiveContract('vulnerable')}
                        >
                            Vulnerable
                        </button>
                        <button
                            className={`btn ${activeContract === 'secure' ? 'btn-success' : 'btn-outline'}`}
                            onClick={() => setActiveContract('secure')}
                        >
                            Secure
                        </button>
                    </div>
                </div>

                <div className="input-group">
                    <label className="input-label">Beneficiary Address</label>
                    <input
                        type="text"
                        className="input"
                        placeholder="0x..."
                        value={beneficiaryAddress}
                        onChange={(e) => setBeneficiaryAddress(e.target.value)}
                    />
                </div>

                <div className="input-group">
                    <label className="input-label">Reward Amount (ETH)</label>
                    <input
                        type="number"
                        className="input"
                        placeholder="1.0"
                        value={rewardAmount}
                        onChange={(e) => setRewardAmount(e.target.value)}
                        step="0.1"
                        min="0"
                    />
                </div>

                <button
                    className="btn btn-primary"
                    onClick={addBeneficiary}
                    disabled={loading}
                    style={{ width: '100%', marginBottom: 'var(--spacing-md)' }}
                >
                    {loading ? (
                        <>
                            <span className="spinner"></span>
                            Processing...
                        </>
                    ) : (
                        <>
                            <Plus size={18} />
                            Add Beneficiary
                        </>
                    )}
                </button>

                <div className="card-header" style={{ marginTop: 'var(--spacing-xl)' }}>
                    <h4 style={{ fontSize: '1.125rem', marginBottom: '0' }}>Quick Test Scenarios</h4>
                </div>

                <div className="grid grid-cols-2 gap-md">
                    <button className="btn btn-outline" onClick={() => addMultipleBeneficiaries(10)} disabled={loading}>
                        <Users size={16} />
                        Add 10
                    </button>
                    <button className="btn btn-outline" onClick={() => addMultipleBeneficiaries(50)} disabled={loading}>
                        <Users size={16} />
                        Add 50
                    </button>
                    <button className="btn btn-outline" onClick={() => addMultipleBeneficiaries(100)} disabled={loading}>
                        <Users size={16} />
                        Add 100
                    </button>
                    <button className="btn btn-danger" onClick={deployMaliciousAttacker} disabled={loading}>
                        <AlertTriangle size={16} />
                        Add Attacker
                    </button>
                </div>
            </div>
        </div>
    );
};
