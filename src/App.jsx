import { useState } from 'react';
import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './lib/AuthContext';
import TopBar from './components/TopBar';
import AuthModal from './components/AuthModal';
import Home from './pages/Home';
import AppDetail from './pages/AppDetail';
import Admin from './pages/Admin';

function AppShell() {
  const [authMode, setAuthMode] = useState(null); // null | 'login' | 'signup'

  return (
    <>
      <TopBar
        onLoginClick={() => setAuthMode('login')}
        onSignupClick={() => setAuthMode('signup')}
      />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/app/:id" element={<AppDetail />} />
        <Route path="/admin" element={<Admin />} />
      </Routes>
      <footer>Vault — apps grátis, sempre.</footer>

      {authMode && (
        <AuthModal
          onClose={() => setAuthMode(null)}
          onSuccess={() => setAuthMode(null)}
        />
      )}
    </>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppShell />
    </AuthProvider>
  );
}