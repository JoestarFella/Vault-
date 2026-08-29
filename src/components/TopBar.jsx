import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { initials } from './AppCard';

export default function TopBar({ onLoginClick, onSignupClick }) {
  const { user, profile, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="topbar">
      <Link to="/" className="logo">
        <div className="logo-mark">V</div>
        Vault
      </Link>
      <div className="top-actions">
        {isAdmin && (
          <button className="btn btn-admin" onClick={() => navigate('/admin')}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2 3 7v6c0 5 3.8 8.4 9 10 5.2-1.6 9-5 9-10V7l-9-5Z" /></svg>
            Admin
          </button>
        )}
        {user ? (
          <div className="user-pill" onClick={signOut} title="Clique para sair" style={{ cursor: 'pointer' }}>
            <div className="avatar">{initials(profile?.name)}</div>
            {profile?.name || 'Você'}
          </div>
        ) : (
          <>
            <button className="btn btn-ghost" onClick={onLoginClick}>Entrar</button>
            <button className="btn btn-primary" onClick={onSignupClick}>Criar conta</button>
          </>
        )}
      </div>
    </div>
  );
}