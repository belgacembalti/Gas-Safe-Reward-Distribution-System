import { useState, useEffect } from 'react';
import { Contract, formatEther, parseEther } from 'ethers';
import { Download, Shield, CheckCircle } from 'lucide-react';

export const SecureControls = ({ signer, contractAddress, abi, account, onRefresh }) => {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [pendingReward, setPendingReward] = useState('0');
    const [totalWithdrawn, setTotalWithdrawn] = useState('0');
    const [beneficiaryCount, setBeneficiaryCount] = useState(0);

    useEffect(() => {
        if (account) {
            refreshData();
        }
    }, [account]);

    const refreshData = async () => {
        try {
            const contract = new Contract(contractAddress, abi, signer);
            const pending = await contract.getBalance(account);
            const withdrawn = await contract.getTotalWithdrawn(account);
            const count = await contract.getBeneficiaryCount();

            setPendingReward(formatEther(pending));
            setTotalWithdrawn(formatEther(withdrawn));
            setBeneficiaryCount(Number(count));
        } catch (error) {
            console.error('Error refreshing data:', error);
        }
    };

    const withdraw = async () => {
        setLoading(true);
        setMessage(null);

        try {
            const contract = new Contract(contractAddress, abi, signer);
            const tx = await contract.withdraw();
            await tx.wait();

            setMessage({ type: 'success', text: `Successfully withdrew ${pendingReward} ETH!` });

            // Show popup as requested
            window.alert(`🎉 Success! \n\nYou have successfully withdrawn ${pendingReward} ETH.\n\nNotice how your transaction went through while the attacker failed? That's the power of Pull Payments!`);

            if (onRefresh) onRefresh();
            await refreshData();
        } catch (error) {
            console.error('Withdrawal error:', error);

            let errorMessage = 'Withdrawal failed!';

            // Enhanced Error Handling
            const errStr = JSON.stringify(error).toLowerCase();
            const errMsg = (error.message || '').toLowerCase();

            if (errMsg.includes('no pending rewards') || errStr.includes('no pending rewards')) {
                errorMessage = '⚠️ No pending rewards to withdraw.';
            } else if (
                errMsg.includes('insufficient contract balance') ||
                errStr.includes('insufficient contract balance') ||
                (error.reason && error.reason.includes('Insufficient contract balance')) ||
                (error.data && error.data.message && error.data.message.includes('Insufficient contract balance'))
            ) {
                errorMessage = '⚠️ CONTRACT EMPTY: The secure contract needs funds. Please use "Deposit Funds" first.';
            }

            setMessage({ type: 'error', text: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    const depositFunds = async () => {
        setLoading(true);
        setMessage(null);

        try {
            const contract = new Contract(contractAddress, abi, signer);
            const amount = parseEther('100'); // Deposit 100 ETH for testing

            const tx = await contract.deposit({ value: amount });
            await tx.wait();

            setMessage({ type: 'success', text: 'Funds deposited successfully!' });

            if (onRefresh) onRefresh();
            await refreshData();
        } catch (error) {
            console.error('Deposit error:', error);
            setMessage({ type: 'error', text: error.message || 'Deposit failed' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title">
                    <Shield size={24} />
                    Secure Contract (Pull Payments)
                </h3>
                <p className="card-subtitle">DoS-resistant individual withdrawals</p>
            </div>

            {message && (
                <div className={`alert alert-${message.type}`}>
                    {message.text}
                </div>
            )}

            <div className="grid grid-cols-2 gap-md" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <div>
                    <p className="text-sm text-muted">Your Pending Reward</p>
                    <p className="font-bold" style={{ fontSize: '1.5rem', color: 'var(--color-success)' }}>
                        {parseFloat(pendingReward).toFixed(4)} ETH
                    </p>
                </div>
                <div>
                    <p className="text-sm text-muted">Total Withdrawn</p>
                    <p className="font-bold" style={{ fontSize: '1.5rem' }}>
                        {parseFloat(totalWithdrawn).toFixed(4)} ETH
                    </p>
                </div>
            </div>

            <div style={{ marginBottom: 'var(--spacing-md)' }}>
                <p className="text-sm text-muted">Total Beneficiaries:</p>
                <p className="font-semibold">{beneficiaryCount}</p>
            </div>

            <button
                className="btn btn-primary"
                onClick={refreshData}
                style={{ width: '100%', marginBottom: 'var(--spacing-md)' }}
            >
                Refresh Data
            </button>

            <button
                className="btn btn-success"
                onClick={withdraw}
                disabled={loading || pendingReward === '0' || parseFloat(pendingReward) === 0}
                style={{ width: '100%', marginBottom: 'var(--spacing-md)' }}
            >
                {loading ? (
                    <>
                        <span className="spinner"></span>
                        Withdrawing...
                    </>
                ) : (
                    <>
                        <Download size={18} />
                        Withdraw My Reward
                    </>
                )}
            </button>

            <button
                className="btn btn-outline"
                onClick={depositFunds}
                disabled={loading}
                style={{ width: '100%' }}
            >
                Deposit Funds (Admin)
            </button>

            <div className="alert alert-success" style={{ marginTop: 'var(--spacing-lg)' }}>
                <CheckCircle size={18} />
                <div>
                    <strong>Secure Design:</strong>
                    <br />
                    Each beneficiary withdraws independently. No DoS possible!
                </div>
            </div>
        </div>
    );
};
