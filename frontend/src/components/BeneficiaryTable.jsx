import { useState, useEffect } from 'react';
import { Contract, formatEther } from 'ethers';
import { Users, CheckCircle, XCircle, Loader } from 'lucide-react';

export const BeneficiaryTable = ({ signer, contractAddress, abi, contractType, refreshTrigger }) => {
    const [beneficiaries, setBeneficiaries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (signer && contractAddress) {
            loadBeneficiaries();
        }
    }, [signer, contractAddress, refreshTrigger]);

    const loadBeneficiaries = async () => {
        setLoading(true);
        setError(null);

        try {
            const contract = new Contract(contractAddress, abi, signer);
            const count = await contract.getBeneficiaryCount();
            const beneficiaryList = await contract.getAllBeneficiaries();

            const beneficiaryData = [];

            for (let i = 0; i < Math.min(Number(count), 20); i++) {
                const address = beneficiaryList[i];

                if (contractType === 'vulnerable') {
                    const data = await contract.getBeneficiary(address);
                    beneficiaryData.push({
                        address,
                        reward: formatEther(data.reward),
                        paid: data.paid,
                    });
                } else {
                    const balance = await contract.getBalance(address);
                    const withdrawn = await contract.getTotalWithdrawn(address);
                    beneficiaryData.push({
                        address,
                        reward: formatEther(balance),
                        withdrawn: formatEther(withdrawn),
                        pending: balance > 0n,
                    });
                }
            }

            setBeneficiaries(beneficiaryData);
        } catch (err) {
            console.error('Error loading beneficiaries:', err);
            setError('Failed to load beneficiaries');
        } finally {
            setLoading(false);
        }
    };

    const truncateAddress = (address) => {
        return `${address.substring(0, 8)}...${address.substring(address.length - 6)}`;
    };

    if (loading && beneficiaries.length === 0) {
        return (
            <div className="card text-center">
                <Loader className="spinner" size={32} style={{ margin: '0 auto' }} />
                <p style={{ marginTop: 'var(--spacing-md)' }}>Loading beneficiaries...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="card">
                <div className="alert alert-danger">
                    {error}
                </div>
            </div>
        );
    }

    return (
        <div className="card">
            <div className="card-header">
                <h4 className="card-title">
                    <Users size={20} />
                    Beneficiaries ({beneficiaries.length})
                </h4>
                <button className="btn btn-outline btn-sm" onClick={loadBeneficiaries} disabled={loading}>
                    {loading ? 'Refreshing...' : 'Refresh'}
                </button>
            </div>

            {beneficiaries.length === 0 ? (
                <div className="text-center" style={{ padding: 'var(--spacing-xl)' }}>
                    <Users size={48} style={{ margin: '0 auto var(--spacing-md)', opacity: 0.3 }} />
                    <p className="text-muted">No beneficiaries yet</p>
                </div>
            ) : (
                <div className="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Address</th>
                                <th>Reward (ETH)</th>
                                {contractType === 'vulnerable' ? (
                                    <th>Status</th>
                                ) : (
                                    <>
                                        <th>Withdrawn (ETH)</th>
                                        <th>Status</th>
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {beneficiaries.map((beneficiary, index) => (
                                <tr key={beneficiary.address}>
                                    <td>{index + 1}</td>
                                    <td>
                                        <code style={{ fontSize: '0.875rem' }}>
                                            {truncateAddress(beneficiary.address)}
                                        </code>
                                    </td>
                                    <td>{parseFloat(beneficiary.reward).toFixed(4)}</td>
                                    {contractType === 'vulnerable' ? (
                                        <td>
                                            {beneficiary.paid ? (
                                                <span className="badge badge-success">
                                                    <CheckCircle size={12} /> Paid
                                                </span>
                                            ) : (
                                                <span className="badge badge-warning">
                                                    <XCircle size={12} /> Pending
                                                </span>
                                            )}
                                        </td>
                                    ) : (
                                        <>
                                            <td>{parseFloat(beneficiary.withdrawn).toFixed(4)}</td>
                                            <td>
                                                {beneficiary.pending ? (
                                                    <span className="badge badge-warning">
                                                        <XCircle size={12} /> Pending
                                                    </span>
                                                ) : (
                                                    <span className="badge badge-success">
                                                        <CheckCircle size={12} /> Claimed
                                                    </span>
                                                )}
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};
