import { useState, useRef, useEffect } from 'react';
import { Wallet, LogOut, ChevronDown } from 'lucide-react';

export const ConnectWalletButton = ({ isConnected, account, isConnecting, onConnect, onDisconnect, truncateAddress }) => {
    const [showMenu, setShowMenu] = useState(false);
    const menuRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setShowMenu(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    if (isConnected) {
        return (
            <div style={{ position: 'relative' }} ref={menuRef}>
                <button
                    className="btn btn-outline"
                    onClick={() => setShowMenu(!showMenu)}
                    style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}
                >
                    <Wallet size={18} />
                    {truncateAddress(account)}
                    <ChevronDown size={16} />
                </button>

                {showMenu && (
                    <div style={{
                        position: 'absolute',
                        right: 0,
                        top: 'calc(100% + 8px)',
                        background: 'var(--color-bg-card)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--spacing-sm)',
                        minWidth: '200px',
                        boxShadow: 'var(--shadow-xl)',
                        zIndex: 1000,
                    }}>
                        <div style={{
                            padding: 'var(--spacing-sm) var(--spacing-md)',
                            borderBottom: '1px solid var(--border-color)',
                            marginBottom: 'var(--spacing-sm)',
                        }}>
                            <p style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)', marginBottom: '0.25rem' }}>
                                Connected Account
                            </p>
                            <p style={{ fontSize: '0.875rem', fontWeight: '600', marginBottom: 0 }}>
                                {truncateAddress(account)}
                            </p>
                        </div>

                        <button
                            onClick={() => {
                                onDisconnect();
                                setShowMenu(false);
                            }}
                            style={{
                                width: '100%',
                                padding: 'var(--spacing-sm) var(--spacing-md)',
                                background: 'transparent',
                                border: 'none',
                                borderRadius: 'var(--radius-sm)',
                                color: 'var(--color-danger)',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--spacing-sm)',
                                fontSize: '0.875rem',
                                transition: 'all var(--transition-base)',
                            }}
                            onMouseEnter={(e) => e.target.style.background = 'rgba(239, 68, 68, 0.1)'}
                            onMouseLeave={(e) => e.target.style.background = 'transparent'}
                        >
                            <LogOut size={16} />
                            Disconnect Wallet
                        </button>
                    </div>
                )}
            </div>
        );
    }

    return (
        <button
            className="btn btn-primary"
            onClick={onConnect}
            disabled={isConnecting}
        >
            {isConnecting ? (
                <>
                    <span className="spinner"></span>
                    Connecting...
                </>
            ) : (
                <>
                    <Wallet size={18} />
                    Connect Wallet
                </>
            )}
        </button>
    );
};
