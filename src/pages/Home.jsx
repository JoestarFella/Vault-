import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { RankCard, GridCard, Icon } from '../components/AppCard';

export default function Home() {
  const [apps, setApps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [recs, setRecs] = useState([]);
  const [recsLoading, setRecsLoading] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    loadApps();
  }, []);

  useEffect(() => {
    if (user) loadRecommendations();
  }, [user]);

  async function loadApps() {
    setLoading(true);
    const { data: appsData } = await supabase.from('apps').select('*').order('created_at', { ascending: false });
    const { data: ratings } = await supabase.from('app_ratings').select('*');
    const ratingsMap = Object.fromEntries((ratings || []).map(r => [r.app_id, r]));
    const merged = (appsData || []).map(a => ({
      ...a,
      avg_rating: ratingsMap[a.id]?.avg_rating ?? null,
      review_count: ratingsMap[a.id]?.review_count ?? 0,
    }));
    setApps(merged);
    setLoading(false);
  }

  async function loadRecommendations() {
    setRecsLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch('/.netlify/functions/recommend', {
        headers: { Authorization: `Bearer ${session?.access_token}` },
      });
      if (res.ok) {
        const json = await res.json();
        setRecs(json.recommendations || []);
      }
    } catch (e) {
      console.error(e);
    }
    setRecsLoading(false);
  }

  const topApps = useMemo(
    () => [...apps].sort((a, b) => b.download_count - a.download_count).slice(0, 10),
    [apps]
  );
  const newApps = useMemo(
    () => [...apps].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 8),
    [apps]
  );
  const searchMatches = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase();
    return apps.filter(a =>
      a.name.toLowerCase().includes(q) ||
      a.genres?.some(g => g.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [query, apps]);

  function openApp(app) {
    navigate(`/app/${app.id}`);
  }

  return (
    <>
      <div className="hero">
        <h1>Baixe o que há de <span>novo</span>.</h1>
        <p>Apps grátis, sempre. Estatísticas reais de downloads e avaliações de quem já usou.</p>
        <div className="search-wrap">
          <div className="search-box">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
            <input
              type="text"
              placeholder="Pesquisar apps, jogos, categorias..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          {query.trim() && (
            <div className="search-results">
              {searchMatches.length ? searchMatches.map(app => (
                <div key={app.id} className="search-result-item" onClick={() => { setQuery(''); openApp(app); }}>
                  <Icon app={app} size={36} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{app.name}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-2)' }}>{app.genres?.[0]}</div>
                  </div>
                </div>
              )) : (
                <div className="search-empty">Nenhum app encontrado para "{query}"</div>
              )}
            </div>
          )}
        </div>
      </div>

      {loading ? (
        <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /></div>
      ) : apps.length === 0 ? (
        <div className="empty-state">
          <p style={{ fontSize: 16, marginBottom: 8 }}>Nenhum app cadastrado ainda</p>
          <p style={{ fontSize: 13 }}>Assim que apps forem adicionados, eles aparecem aqui.</p>
        </div>
      ) : (
        <>
          {user && recs.length > 0 && (
            <div className="section">
              <div className="section-head">
                <div>
                  <div className="section-title">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M12 3v18M3 12h18" opacity="0" /><path d="M12 2 9.5 8.5 3 9.3l5 4.6L6.5 21 12 17.3 17.5 21 16 13.9l5-4.6-6.5-.8L12 2Z" /></svg>
                    Recomendados para você
                  </div>
                  <div className="section-sub">Baseado nos apps que você já baixou</div>
                </div>
              </div>
              <div className="rank-row">
                {recs.map((app) => (
                  <div key={app.id} className="rank-card" onClick={() => openApp(app)} style={{ cursor: 'pointer' }}>
                    <Icon app={app} />
                    <div className="app-name">{app.name}</div>
                    <div className="app-cat">{app.genres?.[0] || 'App'}</div>
                    {app.reason && (
                      <p style={{ fontSize: 12, color: 'var(--text-1)', lineHeight: 1.4 }}>{app.reason}</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="section">
            <div className="section-head">
              <div>
                <div className="section-title">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--accent)" strokeWidth="2"><path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" /></svg>
                  Mais baixados
                </div>
                <div className="section-sub">Ranking por número real de downloads</div>
              </div>
            </div>
            <div className="rank-row">
              {topApps.map((app, i) => (
                <RankCard key={app.id} app={app} rank={i + 1} onOpen={openApp} />
              ))}
            </div>
          </div>

          <div className="section">
            <div className="section-head">
              <div>
                <div className="section-title">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--mint)" strokeWidth="2"><path d="M12 2v20M2 12h20" /></svg>
                  Chegou agora
                </div>
                <div className="section-sub">Últimos apps adicionados</div>
              </div>
            </div>
            <div className="grid">
              {newApps.map((app) => (
                <GridCard key={app.id} app={app} onOpen={openApp} />
              ))}
            </div>
          </div>
        </>
      )}
    </>
  );
}