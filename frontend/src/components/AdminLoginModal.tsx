import React, { useState } from 'react';

interface AdminLoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdminLoginModal: React.FC<AdminLoginModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin123');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (username.trim() === 'admin' && password === 'admin123') {
      setError(null);
      onSuccess();
      onClose();
    } else {
      setError('Invalid officer credentials (use admin / admin123).');
    }
  };

  const handleQuickDemo = () => {
    setUsername('admin');
    setPassword('admin123');
    setError(null);
    onSuccess();
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(18, 19, 22, 0.75)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '1rem',
      }}
      onClick={onClose}
    >
      <div
        className="solid-card"
        style={{
          width: '100%',
          maxWidth: '420px',
          padding: '2rem',
          borderTop: '4px solid var(--text-primary)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
          <div>
            <div className="mono-label" style={{ color: 'var(--accent-rust)', marginBottom: '0.25rem' }}>
              MUNICIPAL AUTHORITY
            </div>
            <h3 style={{ fontSize: '1.4rem' }}>Admin Access</h3>
          </div>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={onClose}
            style={{ padding: '0.25rem 0.5rem' }}
          >
            ✕
          </button>
        </div>

        <p style={{ fontSize: '0.8125rem', color: 'var(--text-secondary)', marginBottom: '1.25rem' }}>
          Sign in to access spatial clustering, inspect AI-merged duplicate reports, and resolve civic complaints.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="modal-admin-user">Username</label>
            <input
              id="modal-admin-user"
              type="text"
              className="form-input"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="modal-admin-pass">Password</label>
            <input
              id="modal-admin-pass"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {error && (
            <div style={{ padding: '0.625rem', background: '#FEE2E2', border: '1px solid #FCA5A5', color: '#991B1B', marginBottom: '1rem', fontSize: '0.8125rem' }}>
              {error}
            </div>
          )}

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', marginBottom: '0.625rem' }}
          >
            SIGN IN AS ADMIN
          </button>

          <button
            type="button"
            className="btn btn-secondary btn-sm"
            style={{ width: '100%' }}
            onClick={handleQuickDemo}
          >
            ONE-CLICK DEMO LOGIN
          </button>
        </form>
      </div>
    </div>
  );
};
