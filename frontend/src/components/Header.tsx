import React from 'react';

interface HeaderProps {
  backendConnected: boolean | null;
  isAdminAuthenticated: boolean;
  activePortal: 'citizen' | 'admin';
  onOpenLoginModal: () => void;
  onSelectPortal: (portal: 'citizen' | 'admin') => void;
  onAdminLogout: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  backendConnected,
  isAdminAuthenticated,
  activePortal,
  onOpenLoginModal,
  onSelectPortal,
  onAdminLogout,
}) => {
  return (
    <header className="masthead">
      <div className="page-container">
        <div className="masthead-inner">
          <div>
            <div className="mono-label" style={{ marginBottom: '0.4rem' }}>
              MUNICIPAL CIVIC INTELLIGENCE PLATFORM
            </div>
            <h1 className="masthead-brand">CIVICSYNC</h1>
          </div>

          {/* Top Right Corner Controls */}
          <div className="masthead-meta" style={{ alignItems: 'flex-end', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
            <div>
              <div className="mono-label">SYSTEM API</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.25rem' }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor:
                      backendConnected === true
                        ? 'var(--status-resolved)'
                        : backendConnected === false
                        ? '#DC2626'
                        : '#D97706',
                  }}
                />
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8125rem', fontWeight: 600 }}>
                  {backendConnected === true
                    ? 'CONNECTED'
                    : backendConnected === false
                    ? 'OFFLINE'
                    : 'CONNECTING...'}
                </span>
              </div>
            </div>

            {/* Compact Admin Action Button in Top Right Corner */}
            <div>
              {!isAdminAuthenticated ? (
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  onClick={onOpenLoginModal}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--text-primary)' }} />
                  ADMIN LOGIN
                </button>
              ) : (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  {activePortal === 'citizen' ? (
                    <button
                      type="button"
                      className="btn btn-accent btn-sm"
                      onClick={() => onSelectPortal('admin')}
                    >
                      SPATIAL ADMIN CONSOLE →
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => onSelectPortal('citizen')}
                    >
                      ← CITIZEN VIEW
                    </button>
                  )}
                  <button
                    type="button"
                    className="btn btn-secondary btn-sm"
                    onClick={onAdminLogout}
                    style={{ padding: '0.35rem 0.6rem' }}
                    title="Sign Out Admin"
                  >
                    LOGOUT
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
