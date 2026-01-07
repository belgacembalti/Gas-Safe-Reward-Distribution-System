import { useState, useEffect } from 'react';
import { BrowserProvider } from 'ethers';

export const useMetaMask = () => {
    const [account, setAccount] = useState(null);
    const [provider, setProvider] = useState(null);
    const [signer, setSigner] = useState(null);
    const [chainId, setChainId] = useState(null);
    const [isConnecting, setIsConnecting] = useState(false);
    const [error, setError] = useState(null);

    useEffect(() => {
        // Check if wallet is already connected
        checkConnection();

        // Listen for account changes
        if (window.ethereum) {
            window.ethereum.on('accountsChanged', handleAccountsChanged);
            window.ethereum.on('chainChanged', handleChainChanged);
        }

        return () => {
            if (window.ethereum) {
                window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
                window.ethereum.removeListener('chainChanged', handleChainChanged);
            }
        };
    }, []);

    const checkConnection = async () => {
        if (typeof window.ethereum !== 'undefined') {
            try {
                const provider = new BrowserProvider(window.ethereum);
                const accounts = await provider.listAccounts();

                if (accounts.length > 0) {
                    const signer = await provider.getSigner();
                    const address = await signer.getAddress();
                    const network = await provider.getNetwork();

                    setProvider(provider);
                    setSigner(signer);
                    setAccount(address);
                    setChainId(Number(network.chainId));
                }
            } catch (err) {
                console.error('Error checking connection:', err);
            }
        }
    };

    const connectWallet = async () => {
        if (typeof window.ethereum === 'undefined') {
            setError('MetaMask is not installed. Please install MetaMask to continue.');
            return false;
        }

        setIsConnecting(true);
        setError(null);

        try {
            // Request permissions to show account selector dialog
            // This allows users to choose which account to connect
            await window.ethereum.request({
                method: 'wallet_requestPermissions',
                params: [{ eth_accounts: {} }],
            });

            // Now request the selected account
            await window.ethereum.request({ method: 'eth_requestAccounts' });

            const provider = new BrowserProvider(window.ethereum);
            const signer = await provider.getSigner();
            const address = await signer.getAddress();
            const network = await provider.getNetwork();

            setProvider(provider);
            setSigner(signer);
            setAccount(address);
            setChainId(Number(network.chainId));

            return true;
        } catch (err) {
            console.error('Error connecting wallet:', err);

            // Handle user rejection gracefully
            if (err.code === 4001 || err.code === 'ACTION_REJECTED') {
                setError('Connection request was rejected.');
            } else {
                setError(err.message || 'Failed to connect wallet');
            }

            return false;
        } finally {
            setIsConnecting(false);
        }
    };

    const disconnect = () => {
        setAccount(null);
        setProvider(null);
        setSigner(null);
        setChainId(null);
        setError(null);

        console.log('Wallet disconnected. Click "Connect Wallet" to choose an account.');
    };

    const handleAccountsChanged = async (accounts) => {
        if (accounts.length === 0) {
            disconnect();
        } else {
            // Update state directly for better UX
            try {
                const provider = new BrowserProvider(window.ethereum);
                const signer = await provider.getSigner();
                const address = await signer.getAddress();
                const network = await provider.getNetwork();

                setProvider(provider);
                setSigner(signer);
                setAccount(address);
                setChainId(Number(network.chainId));
            } catch (err) {
                console.error('Error updating account:', err);
                // Fallback to reload if state update fails
                window.location.reload();
            }
        }
    };

    const handleChainChanged = () => {
        // Reload the page on chain change
        window.location.reload();
    };

    const truncateAddress = (address) => {
        if (!address) return '';
        return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
    };

    return {
        account,
        provider,
        signer,
        chainId,
        isConnecting,
        error,
        isConnected: !!account,
        connectWallet,
        disconnect,
        truncateAddress,
    };
};
