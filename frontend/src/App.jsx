import { useState, useEffect } from 'react';
import { useMetaMask } from './hooks/useMetaMask';
import { ConnectWalletButton } from './components/ConnectWalletButton';
import { AdminPanel } from './components/AdminPanel';
import { VulnerableControls } from './components/VulnerableControls';
import { SecureControls } from './components/SecureControls';
import { BeneficiaryTable } from './components/BeneficiaryTable';

import { WelcomeGuide } from './components/WelcomeGuide';
import { Shield, AlertTriangle, BarChart3, HelpCircle } from 'lucide-react';
import './index.css';

// Import contract ABIs and addresses (these will be populated after deployment)
import VulnerableABI from './contracts/RewardDistributionVulnerable.json';
import SecureABI from './contracts/RewardDistributionSecure.json';
import MaliciousABI from './contracts/MaliciousReceiver.json';
import addresses from './contracts/addresses.json';

function App() {
  const { account, signer, isConnecting, isConnected, connectWallet, disconnect, truncateAddress } = useMetaMask();
  const [refreshKey, setRefreshKey] = useState(0);
  const [showWelcome, setShowWelcome] = useState(false);

  useEffect(() => {
    // Check if user has seen the welcome guide before
    const hasSeenWelcome = localStorage.getItem('hasSeenWelcome');
    if (!hasSeenWelcome) {
      setShowWelcome(true);
      localStorage.setItem('hasSeenWelcome', 'true');
    }
  }, []);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
  };

  return (
    <div className="container">
      {showWelcome && <WelcomeGuide onClose={() => setShowWelcome(false)} />}

      {/* Header */}
      <header style={{ padding: 'var(--spacing-xl) 0', borderBottom: '1px solid var(--border-color)', marginBottom: 'var(--spacing-2xl)' }}>
        <div className="flex items-center justify-between">
          <div>
            <h1 style={{ marginBottom: 'var(--spacing-sm)' }}>
              Gas-Safe Reward Distribution System
            </h1>
            <p className="text-secondary">
              Demonstrating DoS vulnerabilities in blockchain reward distribution
            </p>
          </div>
          <div className="flex items-center gap-md">
            <button
              className="btn btn-outline"
              onClick={() => setShowWelcome(true)}
              title="Show Tutorial"
            >
              <HelpCircle size={18} />
              Help
            </button>
            <ConnectWalletButton
              isConnected={isConnected}
              account={account}
              isConnecting={isConnecting}
              onConnect={connectWallet}
              onDisconnect={disconnect}
              truncateAddress={truncateAddress}
            />
          </div>
        </div>
      </header>

      {!isConnected ? (
        <div className="card text-center" style={{ maxWidth: '500px', margin: '0 auto' }}>
          <Shield size={64} style={{ margin: '0 auto var(--spacing-lg)', color: 'var(--color-primary)' }} />
          <h2>Connect Your Wallet</h2>
          <p>Connect your MetaMask wallet to interact with the smart contracts</p>
          <button className="btn btn-primary" onClick={connectWallet} style={{ marginTop: 'var(--spacing-lg)' }}>
            Connect Wallet
          </button>
        </div>
      ) : (
        <>
          {/* Info Banner */}
          <div className="alert alert-info" style={{ marginBottom: 'var(--spacing-2xl)' }}>
            <Shield size={20} />
            <div>
              <strong>About This Demo:</strong>
              <br />
              This application demonstrates three critical DoS attack vectors in blockchain reward distribution:
              <ul style={{ marginTop: 'var(--spacing-sm)', marginLeft: 'var(--spacing-lg)' }}>
                <li>Gas Limit DoS (large beneficiary lists)</li>
                <li>Malicious Fallback DoS (reverting receivers)</li>
                <li>Gas Griefing (excessive gas consumption)</li>
              </ul>
            </div>
          </div>

          {/* Admin Controls */}
          <div style={{ marginBottom: 'var(--spacing-2xl)' }}>
            <AdminPanel
              signer={signer}
              vulnerableAddress={addresses?.RewardDistributionVulnerable || ''}
              secureAddress={addresses?.RewardDistributionSecure || ''}
              maliciousAddress={addresses?.MaliciousReceiver || ''}
              vulnerableABI={VulnerableABI?.abi || []}
              secureABI={SecureABI?.abi || []}
              maliciousABI={MaliciousABI?.abi || []}
              onRefresh={handleRefresh}
            />
          </div>

          {/* Contract Controls - Side by Side */}
          <div className="grid grid-cols-2 gap-lg">
            <VulnerableControls
              key={`vulnerable-${refreshKey}`}
              signer={signer}
              contractAddress={addresses?.RewardDistributionVulnerable || ''}
              abi={VulnerableABI?.abi || []}
              onRefresh={handleRefresh}
            />

            <SecureControls
              key={`secure-${refreshKey}`}
              signer={signer}
              contractAddress={addresses?.RewardDistributionSecure || ''}
              abi={SecureABI?.abi || []}
              account={account}
              onRefresh={handleRefresh}
            />
          </div>

          {/* Beneficiary Tables */}
          <div className="grid grid-cols-2 gap-lg" style={{ marginTop: 'var(--spacing-lg)' }}>
            <BeneficiaryTable
              signer={signer}
              contractAddress={addresses?.RewardDistributionVulnerable || ''}
              abi={VulnerableABI?.abi || []}
              contractType="vulnerable"
              refreshTrigger={refreshKey}
            />

            <BeneficiaryTable
              signer={signer}
              contractAddress={addresses?.RewardDistributionSecure || ''}
              abi={SecureABI?.abi || []}
              contractType="secure"
              refreshTrigger={refreshKey}
            />
          </div>



          {/* Comparison Table */}
          <div className="card" style={{ marginTop: 'var(--spacing-2xl)' }}>
            <h3 className="card-title">Security Comparison</h3>
            <div className="table-container">
              <table>
                <thead>
                  <tr>
                    <th>Feature</th>
                    <th>Vulnerable (Push)</th>
                    <th>Secure (Pull)</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Pattern</td>
                    <td><span className="badge badge-danger">Push Payments</span></td>
                    <td><span className="badge badge-success">Pull Payments</span></td>
                  </tr>
                  <tr>
                    <td>Gas Limit DoS</td>
                    <td><AlertTriangle size={16} style={{ color: 'var(--color-danger)' }} /> Vulnerable</td>
                    <td><Shield size={16} style={{ color: 'var(--color-success)' }} /> Immune</td>
                  </tr>
                  <tr>
                    <td>Malicious Fallback</td>
                    <td><AlertTriangle size={16} style={{ color: 'var(--color-danger)' }} /> Blocks All</td>
                    <td><Shield size={16} style={{ color: 'var(--color-success)' }} /> Isolated</td>
                  </tr>
                  <tr>
                    <td>Gas Griefing</td>
                    <td><AlertTriangle size={16} style={{ color: 'var(--color-danger)' }} /> Vulnerable</td>
                    <td><Shield size={16} style={{ color: 'var(--color-success)' }} /> Immune</td>
                  </tr>
                  <tr>
                    <td>Scalability</td>
                    <td><AlertTriangle size={16} style={{ color: 'var(--color-danger)' }} /> Limited</td>
                    <td><Shield size={16} style={{ color: 'var(--color-success)' }} /> Unlimited</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Footer */}
      <footer style={{ textAlign: 'center', padding: 'var(--spacing-2xl) 0', borderTop: '1px solid var(--border-color)', marginTop: 'var(--spacing-2xl)' }}>
        <p className="text-muted text-sm">
          Gas-Safe Reward Distribution System • Educational Demo • 2025
        </p>
      </footer>
    </div>
  );
}

export default App;
