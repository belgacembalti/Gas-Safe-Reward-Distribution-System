import { useState } from 'react';
import { Contract, formatEther, parseEther } from 'ethers';
import { Send, AlertCircle } from 'lucide-react';

export const VulnerableControls = ({ signer, contractAddress, abi, onRefresh }) => {
    const [loading, setLoading] = useState(false);
    const [message, setMessage] = useState(null);
    const [beneficiaryCount, setBeneficiaryCount] = useState(0);
    const [totalRequired, setTotalRequired] = useState('0');

    const refreshData = async () => {
        try {
            const contract = new Contract(contractAddress, abi, signer);
            const count = await contract.getBeneficiaryCount();
            setBeneficiaryCount(Number(count));

            // Calculate total required
            const beneficiaries = await contract.getAllBeneficiaries();
            let total = 0n;

            for (const beneficiary of beneficiaries) {
                const data = await contract.getBeneficiary(beneficiary);
                if (!data.paid) {
                    total += data.reward;
                }
            }

            setTotalRequired(formatEther(total));
        } catch (error) {
            console.error('Error refreshing data:', error);
        }
    };

    const distributeRewards = async () => {
        setLoading(true);
        setMessage(null);

        try {
            const contract = new Contract(contractAddress, abi, signer);
            const value = parseEther(totalRequired);

            const tx = await contract.distributeRewards({
                value,
                gasLimit: 30000000
            });

            await tx.wait();

            setMessage({ type: 'success', text: `Successfully distributed to ${beneficiaryCount} beneficiaries!` });

            if (onRefresh) onRefresh();
            await refreshData();
        } catch (error) {
            console.error('Distribution error:', error);

            let errorMessage = 'Distribution failed!';

            if (error.message.includes('gas')) {
                errorMessage = '⚠️ GAS LIMIT DOS: Too many beneficiaries! Transaction exceeds block gas limit.';
            } else if (error.message.includes('revert') || error.message.includes('blocked')) {
                errorMessage = '⚠️ MALICIOUS FALLBACK DOS: A beneficiary is blocking the distribution!';
            } else if (
                (error.message && (error.message.includes('Internal JSON-RPC error') || error.message.includes('could not coalesce error'))) ||
                error.code === -32603 ||
                error.code === 'UNKNOWN_ERROR' // Ethers often throws UNKNOWN_ERROR for this specific revert
            ) {
                // This is the expected behavior for Scenario 1
                errorMessage = '⚠️ ATTACK SUCCESSFUL: The transaction was reverted! A malicious beneficiary blocked the distribution.';
            } else if (error.info && error.info.error && error.info.error.code === -32603) {
                errorMessage = '⚠️ ATTACK SUCCESSFUL: The transaction was reverted! A malicious beneficiary blocked the distribution.';
            }

            setMessage({ type: 'error', text: errorMessage });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title">Vulnerable Contract (Push Payments)</h3>
                <p className="card-subtitle">Testing DoS vulnerabilities</p>
            </div>

            {message && (
                <div className={`alert alert-${message.type}`}>
                    <AlertCircle size={20} />
                    {message.text}
                </div>
            )}

            <div className="flex justify-between" style={{ marginBottom: 'var(--spacing-lg)' }}>
                <div>
                    <p className="text-sm text-muted">Beneficiaries</p>
                    <p className="font-bold" style={{ fontSize: '1.5rem' }}>{beneficiaryCount}</p>
                </div>
                <div>
                    <p className="text-sm text-muted">Total Required</p>
                    <p className="font-bold" style={{ fontSize: '1.5rem' }}>{parseFloat(totalRequired).toFixed(2)} ETH</p>
                </div>
            </div>

            <button
                className="btn btn-primary"
                onClick={refreshData}
                style={{ width: '100%', marginBottom: 'var(--spacing-md)' }}
            >
                Refresh Data
            </button>

            <button
                className="btn btn-danger"
                onClick={distributeRewards}
                disabled={loading || beneficiaryCount === 0}
                style={{ width: '100%' }}
            >
                {loading ? (
                    <>
                        <span className="spinner"></span>
                        Distributing...
                    </>
                ) : (
                    <>
                        <Send size={18} />
                        Distribute Rewards
                    </>
                )}
            </button>

            <div className="alert alert-warning" style={{ marginTop: 'var(--spacing-lg)' }}>
                <AlertCircle size={18} />
                <div>
                    <strong>Vulnerability Warning:</strong>
                    <br />
                    This contract is vulnerable to DOS attacks!
                </div>
            </div>
        </div>
    );
};
