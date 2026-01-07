import { useState } from 'react';
import { X, Shield, AlertTriangle, Wallet, Users, Send, Download, BarChart3, CheckCircle } from 'lucide-react';

export const WelcomeGuide = ({ onClose }) => {
    const [currentStep, setCurrentStep] = useState(0);

    const steps = [
        {
            icon: <Shield size={48} />,
            title: "Welcome to Gas-Safe Reward Distribution",
            description: "This app demonstrates blockchain security vulnerabilities in reward distribution systems.",
            content: (
                <div>
                    <p style={{ marginBottom: 'var(--spacing-md)' }}>
                        You'll learn about <strong>DoS (Denial of Service) attacks</strong> on smart contracts and see why secure design patterns matter.
                    </p>
                    <div className="alert alert-info">
                        <strong>What you'll see:</strong>
                        <ul style={{ marginLeft: 'var(--spacing-lg)', marginTop: 'var(--spacing-sm)' }}>
                            <li>Vulnerable contract (can be attacked)</li>
                            <li>Secure contract (attack-resistant)</li>
                            <li>Real attack demonstrations</li>
                            <li>Gas usage comparisons</li>
                        </ul>
                    </div>
                </div>
            )
        },
        {
            icon: <Wallet size={48} />,
            title: "Step 1: Connect MetaMask",
            description: "First, you need to connect your MetaMask wallet to interact with the blockchain.",
            content: (
                <div>
                    <h4 style={{ fontSize: '1rem', marginBottom: 'var(--spacing-md)' }}>Setup Instructions:</h4>
                    <ol style={{ marginLeft: 'var(--spacing-lg)' }}>
                        <li style={{ marginBottom: 'var(--spacing-sm)' }}>
                            <strong>Install MetaMask</strong> browser extension if you haven't already
                        </li>
                        <li style={{ marginBottom: 'var(--spacing-sm)' }}>
                            <strong>Add Hardhat Network</strong> to MetaMask:
                            <ul style={{ marginLeft: 'var(--spacing-lg)', marginTop: 'var(--spacing-xs)' }}>
                                <li>Network Name: <code>Hardhat Local</code></li>
                                <li>RPC URL: <code>http://127.0.0.1:8545</code></li>
                                <li>Chain ID: <code>1337</code> or <code>31337</code> (both work)</li>
                                <li>Currency: <code>ETH</code></li>
                            </ul>
                        </li>
                        <li style={{ marginBottom: 'var(--spacing-sm)' }}>
                            <strong>Import a test account</strong> using one of the private keys from your Hardhat node terminal
                        </li>
                        <li>
                            <strong>Click "Connect Wallet"</strong> button in the top right
                        </li>
                    </ol>
                </div>
            )
        },
        {
            icon: <Users size={48} />,
            title: "Step 2: Add Beneficiaries",
            description: "Use the Admin Panel to add people who will receive rewards.",
            content: (
                <div>
                    <h4 style={{ fontSize: '1rem', marginBottom: 'var(--spacing-md)' }}>Options to Add Beneficiaries:</h4>
                    <div style={{ marginBottom: 'var(--spacing-md)' }}>
                        <strong>1. Add Single Beneficiary:</strong>
                        <ul style={{ marginLeft: 'var(--spacing-lg)', marginTop: 'var(--spacing-xs)' }}>
                            <li>Enter an Ethereum address</li>
                            <li>Set reward amount (in ETH)</li>
                            <li>Click "Add Beneficiary"</li>
                        </ul>
                    </div>
                    <div style={{ marginBottom: 'var(--spacing-md)' }}>
                        <strong>2. Quick Test Scenarios:</strong>
                        <ul style={{ marginLeft: 'var(--spacing-lg)', marginTop: 'var(--spacing-xs)' }}>
                            <li><strong>"Add 10"</strong> - Adds 10 random test beneficiaries (works on both)</li>
                            <li><strong>"Add 50"</strong> - Adds 50 beneficiaries (vulnerable gets slow)</li>
                            <li><strong>"Add 100"</strong> - Adds 100 beneficiaries (vulnerable may fail)</li>
                            <li><strong>"Add Attacker"</strong> - Adds malicious contract (blocks vulnerable)</li>
                        </ul>
                    </div>
                    <div className="alert alert-warning">
                        <strong>Tip:</strong> Choose "Vulnerable" or "Secure" contract before adding beneficiaries!
                    </div>
                </div>
            )
        },
        {
            icon: <AlertTriangle size={48} />,
            title: "Step 3: Test Vulnerable Contract",
            description: "See how the vulnerable contract fails under certain conditions.",
            content: (
                <div>
                    <h4 style={{ fontSize: '1rem', marginBottom: 'var(--spacing-md)' }}>Try These Attack Scenarios:</h4>

                    <div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)', marginBottom: 'var(--spacing-md)' }}>
                        <h5 style={{ fontSize: '0.9rem', color: 'var(--color-danger)' }}>Attack 1: Gas Limit DoS</h5>
                        <ol style={{ marginLeft: 'var(--spacing-lg)', fontSize: '0.875rem' }}>
                            <li>Select "Vulnerable" contract</li>
                            <li>Click "Add 100" or "Add 50"</li>
                            <li>Click "Distribute Rewards"</li>
                            <li>❌ Transaction fails - too much gas needed!</li>
                        </ol>
                    </div>

                    <div className="card" style={{ background: 'rgba(239, 68, 68, 0.1)' }}>
                        <h5 style={{ fontSize: '0.9rem', color: 'var(--color-danger)' }}>Attack 2: Malicious Receiver</h5>
                        <ol style={{ marginLeft: 'var(--spacing-lg)', fontSize: '0.875rem' }}>
                            <li>Select "Vulnerable" contract</li>
                            <li>Click "Add Attacker"</li>
                            <li>Click "Distribute Rewards"</li>
                            <li>❌ Malicious contract blocks EVERYONE!</li>
                        </ol>
                    </div>
                </div>
            )
        },
        {
            icon: <Shield size={48} />,
            title: "Step 4: Compare with Secure Contract",
            description: "See how the secure contract handles the same attacks flawlessly.",
            content: (
                <div>
                    <h4 style={{ fontSize: '1rem', marginBottom: 'var(--spacing-md)' }}>Test the Secure Version:</h4>

                    <div className="card" style={{ background: 'rgba(16, 185, 129, 0.1)', marginBottom: 'var(--spacing-md)' }}>
                        <h5 style={{ fontSize: '0.9rem', color: 'var(--color-success)' }}>Works with Large Lists</h5>
                        <ol style={{ marginLeft: 'var(--spacing-lg)', fontSize: '0.875rem' }}>
                            <li>Select "Secure" contract</li>
                            <li>Click "Add 100"</li>
                            <li>Click "Deposit Funds" to add ETH</li>
                            <li>Each beneficiary withdraws individually</li>
                            <li>✅ Works perfectly, no gas limit issues!</li>
                        </ol>
                    </div>

                    <div className="card" style={{ background: 'rgba(16, 185, 129, 0.1)' }}>
                        <h5 style={{ fontSize: '0.9rem', color: 'var(--color-success)' }}>Attack Cannot Block Others</h5>
                        <ol style={{ marginLeft: 'var(--spacing-lg)', fontSize: '0.875rem' }}>
                            <li>Add beneficiaries + attacker to secure contract</li>
                            <li>Click "Deposit Funds"</li>
                            <li>Normal beneficiaries can still "Withdraw"</li>
                            <li>✅ Only attacker fails, others unaffected!</li>
                        </ol>
                    </div>
                </div>
            )
        },
        {
            icon: <BarChart3 size={48} />,
            title: "Step 5: View Gas Comparisons",
            description: "Scroll down to see interactive charts showing the difference.",
            content: (
                <div>
                    <h4 style={{ fontSize: '1rem', marginBottom: 'var(--spacing-md)' }}>What to Look For:</h4>
                    <ul style={{ marginLeft: 'var(--spacing-lg)' }}>
                        <li style={{ marginBottom: 'var(--spacing-sm)' }}>
                            <strong>Line Chart:</strong> Shows total gas consumption
                            <ul style={{ marginLeft: 'var(--spacing-lg)', marginTop: 'var(--spacing-xs)' }}>
                                <li>Red line (vulnerable) goes up steeply</li>
                                <li>Green line (secure) grows linearly but manageable</li>
                            </ul>
                        </li>
                        <li style={{ marginBottom: 'var(--spacing-sm)' }}>
                            <strong>Bar Chart:</strong> Gas per beneficiary
                            <ul style={{ marginLeft: 'var(--spacing-lg)', marginTop: 'var(--spacing-xs)' }}>
                                <li>Red bars (vulnerable) increase with list size</li>
                                <li>Green bars (secure) stay constant (~74K gas)</li>
                            </ul>
                        </li>
                        <li>
                            <strong>Beneficiary Tables:</strong> See who's been paid and who's pending
                        </li>
                    </ul>
                </div>
            )
        },
        {
            icon: <CheckCircle size={48} />,
            title: "You're Ready!",
            description: "Start exploring the application and testing different scenarios.",
            content: (
                <div>
                    <h4 style={{ fontSize: '1rem', marginBottom: 'var(--spacing-md)' }}>Quick Reference:</h4>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 'var(--spacing-md)' }}>
                        <div className="card" style={{ padding: 'var(--spacing-md)' }}>
                            <h5 style={{ fontSize: '0.9rem', color: 'var(--color-danger)', marginBottom: 'var(--spacing-sm)' }}>
                                <AlertTriangle size={16} /> Vulnerable Contract
                            </h5>
                            <ul style={{ fontSize: '0.8rem', marginLeft: 'var(--spacing-md)' }}>
                                <li>Push payments (sends to all)</li>
                                <li>Fails with 100+ beneficiaries</li>
                                <li>One attacker blocks everyone</li>
                            </ul>
                        </div>

                        <div className="card" style={{ padding: 'var(--spacing-md)' }}>
                            <h5 style={{ fontSize: '0.9rem', color: 'var(--color-success)', marginBottom: 'var(--spacing-sm)' }}>
                                <Shield size={16} /> Secure Contract
                            </h5>
                            <ul style={{ fontSize: '0.8rem', marginLeft: 'var(--spacing-md)' }}>
                                <li>Pull payments (individual withdrawal)</li>
                                <li>Scales to unlimited beneficiaries</li>
                                <li>Attacks can't affect others</li>
                            </ul>
                        </div>
                    </div>

                    <div className="alert alert-success" style={{ marginTop: 'var(--spacing-lg)' }}>
                        <strong>Remember:</strong> This is a learning platform. Experiment with different scenarios to understand blockchain security!
                    </div>
                </div>
            )
        }
    ];

    const currentStepData = steps[currentStep];

    return (
        <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(0, 0, 0, 0.8)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 10000,
            padding: 'var(--spacing-md)',
        }}>
            <div className="card" style={{
                maxWidth: '700px',
                width: '100%',
                maxHeight: '90vh',
                overflow: 'auto',
                position: 'relative',
            }}>
                <button
                    onClick={onClose}
                    style={{
                        position: 'absolute',
                        top: 'var(--spacing-md)',
                        right: 'var(--spacing-md)',
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--color-text-muted)',
                        cursor: 'pointer',
                        padding: 'var(--spacing-xs)',
                    }}
                >
                    <X size={24} />
                </button>

                <div style={{ textAlign: 'center', marginBottom: 'var(--spacing-xl)' }}>
                    <div style={{ color: 'var(--color-primary)', marginBottom: 'var(--spacing-md)' }}>
                        {currentStepData.icon}
                    </div>
                    <h2 style={{ marginBottom: 'var(--spacing-sm)' }}>{currentStepData.title}</h2>
                    <p className="text-muted">{currentStepData.description}</p>
                </div>

                <div style={{ marginBottom: 'var(--spacing-xl)' }}>
                    {currentStepData.content}
                </div>

                {/* Progress Dots */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    gap: 'var(--spacing-sm)',
                    marginBottom: 'var(--spacing-lg)',
                }}>
                    {steps.map((_, index) => (
                        <div
                            key={index}
                            style={{
                                width: '10px',
                                height: '10px',
                                borderRadius: '50%',
                                background: index === currentStep ? 'var(--color-primary)' : 'var(--border-color)',
                                cursor: 'pointer',
                                transition: 'all var(--transition-base)',
                            }}
                            onClick={() => setCurrentStep(index)}
                        />
                    ))}
                </div>

                {/* Navigation Buttons */}
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--spacing-md)' }}>
                    <button
                        className="btn btn-outline"
                        onClick={() => setCurrentStep(Math.max(0, currentStep - 1))}
                        disabled={currentStep === 0}
                    >
                        Previous
                    </button>

                    {currentStep < steps.length - 1 ? (
                        <button
                            className="btn btn-primary"
                            onClick={() => setCurrentStep(currentStep + 1)}
                        >
                            Next
                        </button>
                    ) : (
                        <button
                            className="btn btn-success"
                            onClick={onClose}
                        >
                            Get Started!
                        </button>
                    )}
                </div>

                <div style={{ textAlign: 'center', marginTop: 'var(--spacing-md)' }}>
                    <button
                        onClick={onClose}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: 'var(--color-text-muted)',
                            cursor: 'pointer',
                            fontSize: '0.875rem',
                        }}
                    >
                        Skip Tutorial
                    </button>
                </div>
            </div>
        </div>
    );
};
