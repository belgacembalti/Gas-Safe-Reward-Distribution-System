import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { TrendingUp } from 'lucide-react';

export const GasChart = () => {
    // Simulated gas comparison data
    const gasData = [
        {
            beneficiaries: 10,
            vulnerable: 415933,
            secureSetup: 553033,
            securePerWithdraw: 74452,
        },
        {
            beneficiaries: 50,
            vulnerable: 2079665,
            secureSetup: 2765165,
            securePerWithdraw: 74452,
        },
        {
            beneficiaries: 100,
            vulnerable: null, // Failed - gas limit
            secureSetup: 5530330,
            securePerWithdraw: 74452,
        },
        {
            beneficiaries: 300,
            vulnerable: null, // Failed - gas limit
            secureSetup: 16590990,
            securePerWithdraw: 74452,
        },
    ];

    // Transform data for total gas comparison
    const totalGasData = gasData.map(item => ({
        beneficiaries: item.beneficiaries,
        vulnerable: item.vulnerable,
        secure: item.secureSetup + (item.securePerWithdraw * item.beneficiaries),
    }));

    // Per-beneficiary gas data
    const perBeneficiaryData = gasData.map(item => ({
        beneficiaries: item.beneficiaries,
        vulnerable: item.vulnerable ? item.vulnerable / item.beneficiaries : null,
        secure: item.securePerWithdraw,
    }));

    const CustomTooltip = ({ active, payload, label }) => {
        if (active && payload && payload.length) {
            return (
                <div className="card" style={{ padding: 'var(--spacing-md)', minWidth: '200px' }}>
                    <p className="font-semibold" style={{ marginBottom: 'var(--spacing-sm)' }}>
                        {label} Beneficiaries
                    </p>
                    {payload.map((entry, index) => (
                        <p key={index} style={{ color: entry.color, fontSize: '0.875rem', marginBottom: '0.25rem' }}>
                            {entry.name}: {entry.value ? entry.value.toLocaleString() : 'FAILED'} gas
                        </p>
                    ))}
                </div>
            );
        }
        return null;
    };

    return (
        <div className="card">
            <div className="card-header">
                <h3 className="card-title">
                    <TrendingUp size={24} />
                    Gas Usage Comparison
                </h3>
                <p className="card-subtitle">Demonstrating scalability differences</p>
            </div>

            <div style={{ marginBottom: 'var(--spacing-2xl)' }}>
                <h4 style={{ fontSize: '1.125rem', marginBottom: 'var(--spacing-md)' }}>
                    Total Gas Cost
                </h4>
                <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={totalGasData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis
                            dataKey="beneficiaries"
                            stroke="var(--color-text-secondary)"
                            label={{ value: 'Number of Beneficiaries', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis
                            stroke="var(--color-text-secondary)"
                            label={{ value: 'Gas Used', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Line
                            type="monotone"
                            dataKey="vulnerable"
                            stroke="#ef4444"
                            strokeWidth={3}
                            name="Vulnerable (Push)"
                            dot={{ fill: '#ef4444', r: 6 }}
                            connectNulls={false}
                        />
                        <Line
                            type="monotone"
                            dataKey="secure"
                            stroke="#10b981"
                            strokeWidth={3}
                            name="Secure (Pull)"
                            dot={{ fill: '#10b981', r: 6 }}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>

            <div>
                <h4 style={{ fontSize: '1.125rem', marginBottom: 'var(--spacing-md)' }}>
                    Per-Beneficiary Gas Cost
                </h4>
                <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={perBeneficiaryData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                        <XAxis
                            dataKey="beneficiaries"
                            stroke="var(--color-text-secondary)"
                            label={{ value: 'Number of Beneficiaries', position: 'insideBottom', offset: -5 }}
                        />
                        <YAxis
                            stroke="var(--color-text-secondary)"
                            label={{ value: 'Gas per Beneficiary', angle: -90, position: 'insideLeft' }}
                        />
                        <Tooltip content={<CustomTooltip />} />
                        <Legend />
                        <Bar
                            dataKey="vulnerable"
                            fill="#ef4444"
                            name="Vulnerable (increases)"
                            radius={[8, 8, 0, 0]}
                        />
                        <Bar
                            dataKey="secure"
                            fill="#10b981"
                            name="Secure (constant)"
                            radius={[8, 8, 0, 0]}
                        />
                    </BarChart>
                </ResponsiveContainer>
            </div>

            <div className="alert alert-info" style={{ marginTop: 'var(--spacing-xl)' }}>
                <div>
                    <strong>Key Insight:</strong>
                    <br />
                    The <strong style={{ color: 'var(--color-danger)' }}>vulnerable contract</strong> shows linear gas growth
                    and <strong>fails completely</strong> with 100+ beneficiaries due to block gas limits.
                    <br /><br />
                    The <strong style={{ color: 'var(--color-success)' }}>secure contract</strong> maintains
                    <strong> constant gas per withdrawal</strong> (≈74,452 gas) regardless of total beneficiary count!
                </div>
            </div>
        </div>
    );
};
