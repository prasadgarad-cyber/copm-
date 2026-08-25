import { useState, useEffect } from 'react';
import { checkBackendHealth } from './api/client';
import { Header } from './components/Header';
import { CitizenPortal } from './components/CitizenPortal';
import { AdminPortal } from './components/AdminPortal';
import { AdminLoginModal } from './components/AdminLoginModal';
import { Footer } from './components/Footer';

export function App() {
  const [backendConnected, setBackendConnected] = useState<boolean | null>(null);
  const [isAdminAuthenticated, setIsAdminAuthenticated] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const [activePortal, setActivePortal] = useState<'citizen' | 'admin'>('citizen');

  useEffect(() => {
    const pingBackend = async () => {
      try {
        await checkBackendHealth();
        setBackendConnected(true);
      } catch {
        setBackendConnected(false);
      }
    };

    pingBackend();
    const interval = setInterval(pingBackend, 8000);
    return () => clearInterval(interval);
  }, []);

  const handleAdminLoginSuccess = () => {
    setIsAdminAuthenticated(true);
    setActivePortal('admin');
  };

  const handleAdminLogout = () => {
    setIsAdminAuthenticated(false);
    setActivePortal('citizen');
  };

  return (
    <div className="app-layout">
      <Header
        backendConnected={backendConnected}
        isAdminAuthenticated={isAdminAuthenticated}
        activePortal={activePortal}
        onOpenLoginModal={() => setIsLoginModalOpen(true)}
        onSelectPortal={setActivePortal}
        onAdminLogout={handleAdminLogout}
      />

      <main>
        {activePortal === 'citizen' ? (
          <CitizenPortal />
        ) : (
          <AdminPortal onReturnToCitizen={() => setActivePortal('citizen')} />
        )}
      </main>

      <Footer />

      <AdminLoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        onSuccess={handleAdminLoginSuccess}
      />
    </div>
  );
}

export default App;
