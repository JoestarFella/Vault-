import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { Icon, formatCount } from '../components/AppCard';

export default function Admin() {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [found, setFound] = useState(null);
  const [apkFile, setApkFile] = useState(null);
  const [uploadPct, setUploadPct] = useState(0);
  const [saving, setSaving] = useState(false);
  const [apps, setApps] = useState([]);
  const [toast, setToast] = useState('');

  useEffect(() => {
    if (isAdmin) loadApps();
  }, [isAdmin]);

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  }

  async function loadApps() {
    const { data } = await supabase.from('apps').select('*').order('created_at', { ascending: false });
    setApps(data || []);
  }

  async function handleSearch(e) {
    e.preventDefault();
    if (!searchTerm.trim()) return;
    setSearching(true);
    setSearchError('');
    setFound(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`/.netlify/functions/search-playstore?q=${encodeURIComponent(searchTerm)}`, {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      const json = await res.json();
      if (!res.ok) {
        setSearchError(json.error || 'Não foi possível buscar esse app agora.');
      } else {
        setFound(json);
      }
    } catch (err) {
      setSearchError('Falha ao conectar com a busca. Tente de novo em instantes.');
    }
    setSearching(false);
  }

  async function handleSave() {
    if (!apkFile) {
      showToast('Escolha o arquivo .apk antes de publicar.');
      return;
    }
    setSaving(true);
    setUploadPct(0);

    const safeName = found.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const filePath = `${safeName}-${Date.now()}.apk`;

    const { error: uploadError } = await supabase.storage
      .from('app-files')
      .upload(filePath, apkFile, {
        contentType: 'application/vnd.android.package-archive',
        upsert: false,
      });

    if (uploadError) {
      setSaving(false);
      showToast('Erro ao enviar o arquivo: ' + uploadError.message);
      return;
    }

    const { error } = await supabase.from('apps').insert({
      name: found.name,
      developer: found.developer,
      description: found.description,
      genres: found.genres,
      icon_url: found.icon_url,
      screenshots: found.screenshots,
      version: found.version,
      size_mb: found.size_mb ?? Math.round((apkFile.size / (1024 * 1024)) * 10) / 10,
      file_path: filePath,
      created_by: user.id,
    });
    setSaving(false);
    if (error) {
      showToast('Erro ao salvar: ' + error.message);
      return;
    }
    showToast(`${found.name} adicionado.`);
    setFound(null);
    setSearchTerm('');
    setApkFile(null);
    loadApps();
  }

  async function handleDelete(appId, name) {
    if (!confirm(`Remover "${name}" do catálogo?`)) return;
    await supabase.from('apps').delete().eq('id', appId);
    showToast(`${name} removido.`);
    loadApps();
  }

  if (authLoading) return <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /></div>;
  if (!isAdmin) return <Navigate to="/" replace />;

  return (
    <div className="admin-panel">
      <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, marginBottom: 6 }}>Painel admin</h1>
      <p style={{ color: 'var(--text-1)', fontSize: 14, marginBottom: 28 }}>Digite o nome de um app real. A busca preenche nome, ícone, descrição, gêneros e capturas de tela automaticamente a partir da Play Store — revise antes de publicar.</p>

      <form onSubmit={handleSearch} className="admin-step">
        <label style={{ fontSize: 12, color: 'var(--text-1)', fontWeight: 600, display: 'block', marginBottom: 8 }}>Nome do app</label>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Ex: WhatsApp, Notion, Duolingo..."
            style={{ flex: 1, background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 14px', color: 'var(--text-0)', fontSize: 14, outline: 'none' }}
          />
          <button type="submit" className="btn btn-primary" disabled={searching}>
            {searching ? 'Buscando...' : 'Buscar'}
          </button>
        </div>
        {searchError && <div className="field-error" style={{ marginTop: 10 }}>{searchError}</div>}
      </form>

      {found && (
        <div className="admin-step">
          <div style={{ display: 'flex', gap: 14, marginBottom: 16 }}>
            <Icon app={found} size={64} />
            <div>
              <div style={{ fontWeight: 600, fontSize: 16 }}>{found.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-1)' }}>{found.developer}</div>
              <div style={{ marginTop: 6 }}>
                {found.genres?.map(g => <span key={g} className="genre-pill">{g}</span>)}
              </div>
            </div>
          </div>
          <p style={{ fontSize: 13.5, color: 'var(--text-1)', lineHeight: 1.5, marginBottom: 14 }}>{found.description}</p>
          {found.screenshots?.length > 0 && (
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', marginBottom: 16 }}>
              {found.screenshots.slice(0, 4).map((s, i) => (
                <img key={i} src={s} alt="" style={{ height: 140, borderRadius: 10, border: '1px solid var(--line)' }} />
              ))}
            </div>
          )}
          <div className="field">
            <label>Arquivo do app (.apk)</label>
            <input
              type="file"
              accept=".apk"
              onChange={(e) => setApkFile(e.target.files?.[0] || null)}
            />
            {apkFile && (
              <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 6 }}>
                {apkFile.name} · {(apkFile.size / (1024 * 1024)).toFixed(1)} MB
              </div>
            )}
            <div style={{ fontSize: 12, color: 'var(--text-2)', marginTop: 6 }}>
              O arquivo fica hospedado no seu próprio projeto. Quem clicar em "Baixar"
              recebe o .apk direto, sem abrir link nem aba de outro site.
            </div>
          </div>
          <button className="modal-submit" onClick={handleSave} disabled={saving}>
            {saving ? 'Enviando arquivo...' : 'Publicar app'}
          </button>
        </div>
      )}

      <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, margin: '32px 0 14px' }}>Apps publicados ({apps.length})</h2>
      {apps.map(app => (
        <div key={app.id} className="admin-list-item">
          <Icon app={app} size={44} />
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{app.name}</div>
            <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{formatCount(app.download_count)} downloads</div>
          </div>
          <button className="icon-btn" onClick={() => handleDelete(app.id, app.name)} aria-label="Remover">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0-1 14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2L4 6" /></svg>
          </button>
        </div>
      ))}

      <div className={`toast ${toast ? 'show' : ''}`}>
        <div className="toast-icon">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>
        </div>
        <span>{toast}</span>
      </div>
    </div>
  );
}