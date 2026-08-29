import { useState } from 'react';
import { useAuth } from '../lib/AuthContext';

function initials(name) {
  return (name || '?').slice(0, 2).toUpperCase();
}

export default function AuthModal({ pendingApp, onClose, onSuccess }) {
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signIn, signUp } = useAuth();

  function validateEmail(v) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!validateEmail(email)) {
      setError('Digite um e-mail válido.');
      return;
    }
    if (mode === 'signup' && name.trim().length < 1) {
      setError('Digite seu nome.');
      return;
    }
    if (password.length < 6) {
      setError('A senha precisa ter 6 ou mais caracteres.');
      return;
    }

    setLoading(true);
    const result = mode === 'login'
      ? await signIn(email, password)
      : await signUp(name.trim(), email, password);
    setLoading(false);

    if (result.error) {
      setError(traduzErro(result.error.message));
      return;
    }

    if (mode === 'signup' && !result.data.session) {
      setError('Conta criada. Verifique seu e-mail para confirmar antes de entrar.');
      return;
    }

    onSuccess();
  }

  function traduzErro(msg) {
    if (msg.includes('Invalid login credentials')) return 'E-mail ou senha incorretos.';
    if (msg.includes('already registered')) return 'Esse e-mail já tem conta. Tente entrar.';
    if (msg.includes('Password should be')) return 'A senha precisa ter 6 ou mais caracteres.';
    return msg;
  }

  return (
    <div className="overlay" onClick={(e) => e.target.className === 'overlay' && onClose()}>
      <div className="modal">
        <button className="modal-close" onClick={onClose} aria-label="Fechar">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>

        <div className="modal-icon" style={mode === 'signup' ? { background: 'var(--mint-dim)', color: 'var(--mint)' } : {}}>
          {mode === 'login' ? (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>
          ) : (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M19 8v6M22 11h-6" /></svg>
          )}
        </div>

        <h2>{mode === 'login' ? 'Entre para baixar' : 'Criar conta'}</h2>
        <p className="sub">
          {pendingApp
            ? `${mode === 'login' ? 'Entre' : 'Crie sua conta grátis'} para baixar ${pendingApp.name}.`
            : mode === 'login' ? 'Acesse sua conta para continuar.' : 'Grátis, sem cartão de crédito.'}
        </p>

        {pendingApp && (
          <div className="app-preview">
            {pendingApp.icon_url
              ? <img src={pendingApp.icon_url} alt="" style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover' }} />
              : <div className="app-icon" style={{ width: 40, height: 40, borderRadius: 10, fontSize: 15, marginBottom: 0, background: 'var(--accent)' }}>{initials(pendingApp.name)}</div>}
            <div>
              <div style={{ fontWeight: 600, fontSize: 14 }}>{pendingApp.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)' }}>Pronto para baixar</div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {mode === 'signup' && (
            <div className="field">
              <label>Nome</label>
              <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="Seu nome" />
            </div>
          )}
          <div className="field">
            <label>E-mail</label>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
          </div>
          <div className="field">
            <label>Senha</label>
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === 'signup' ? 'Mínimo 6 caracteres' : '••••••••'} />
          </div>
          {error && <div className="field-error">{error}</div>}
          <button type="submit" className="modal-submit" disabled={loading}>
            {loading ? 'Enviando...' : mode === 'login' ? 'Entrar e continuar' : 'Criar conta e continuar'}
          </button>
        </form>

        <div className="modal-switch">
          {mode === 'login' ? (
            <>Não tem conta? <a onClick={() => { setMode('signup'); setError(''); }}>Criar conta</a></>
          ) : (
            <>Já tem conta? <a onClick={() => { setMode('login'); setError(''); }}>Entrar</a></>
          )}
        </div>
      </div>
    </div>
  );
}