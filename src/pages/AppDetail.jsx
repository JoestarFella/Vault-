import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { Icon, initials, formatCount } from '../components/AppCard';
import AuthModal from '../components/AuthModal';

export default function AppDetail({ onNeedAuth }) {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, profile } = useAuth();
  const [app, setApp] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [avgRating, setAvgRating] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAuth, setShowAuth] = useState(false);
  const [myReviewRating, setMyReviewRating] = useState(0);
  const [myReviewText, setMyReviewText] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);
  const [toast, setToast] = useState('');

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    setLoading(true);
    const { data: appData } = await supabase.from('apps').select('*').eq('id', id).single();
    const { data: reviewData } = await supabase
      .from('reviews')
      .select('*, profiles(name)')
      .eq('app_id', id)
      .order('created_at', { ascending: false });
    setApp(appData);
    setReviews(reviewData || []);
    if (reviewData?.length) {
      const avg = reviewData.reduce((s, r) => s + r.rating, 0) / reviewData.length;
      setAvgRating(Math.round(avg * 10) / 10);
    }
    setLoading(false);
  }

  function showToast(msg) {
    setToast(msg);
    setTimeout(() => setToast(''), 2600);
  }

  async function handleDownload() {
    if (!user) {
      setShowAuth(true);
      return;
    }
    showToast(`Baixando ${app.name}...`);

    if (app.file_path) {
      const { data, error } = await supabase.storage.from('app-files').download(app.file_path);
      if (error) {
        showToast('Não foi possível baixar o arquivo agora.');
        return;
      }
      const blobUrl = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = blobUrl;
      a.download = `${app.name}.apk`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(blobUrl);
    } else if (app.download_url) {
      window.open(app.download_url, '_blank');
    }

    await supabase.from('downloads').insert({ app_id: app.id, user_id: user.id });
    await supabase.rpc('increment_download_count', { app_id_input: app.id });
    setApp(prev => ({ ...prev, download_count: prev.download_count + 1 }));
  }

  async function submitReview() {
    if (myReviewRating === 0) {
      showToast('Escolha uma nota antes de enviar.');
      return;
    }
    setSubmittingReview(true);
    const { error } = await supabase.from('reviews').upsert({
      app_id: app.id,
      user_id: user.id,
      rating: myReviewRating,
      comment: myReviewText.trim() || null,
    }, { onConflict: 'app_id,user_id' });
    setSubmittingReview(false);
    if (error) {
      showToast('Não foi possível enviar a avaliação.');
      return;
    }
    setMyReviewRating(0);
    setMyReviewText('');
    showToast('Avaliação enviada.');
    load();
  }

  if (loading) return <div className="empty-state"><div className="spinner" style={{ margin: '0 auto' }} /></div>;
  if (!app) return <div className="empty-state">App não encontrado.</div>;

  return (
    <>
      <button className="btn btn-ghost" style={{ margin: '24px 0 0 32px' }} onClick={() => navigate(-1)}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        Voltar
      </button>

      <div className="detail-hero">
        <Icon app={app} size={120} />
        <div className="detail-info">
          <h1>{app.name}</h1>
          <div className="detail-dev">{app.developer || 'Desenvolvedor independente'}{app.version ? ` · v${app.version}` : ''}</div>
          <div className="detail-stats">
            <div className="stat">
              <span className="stat-value">★ {avgRating ?? '—'}</span>
              <span className="stat-label">{reviews.length} avaliações</span>
            </div>
            <div className="stat">
              <span className="stat-value">{formatCount(app.download_count)}</span>
              <span className="stat-label">downloads</span>
            </div>
            {app.size_mb && (
              <div className="stat">
                <span className="stat-value">{app.size_mb} MB</span>
                <span className="stat-label">tamanho</span>
              </div>
            )}
          </div>
          <div style={{ marginBottom: 18 }}>
            {app.genres?.map(g => <span key={g} className="genre-pill">{g}</span>)}
          </div>
          <button className="btn btn-primary" onClick={handleDownload} style={{ padding: '12px 28px', fontSize: 15 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v13m0 0-4-4m4 4 4-4M4 21h16" /></svg>
            Baixar grátis
          </button>
        </div>
      </div>

      {app.screenshots?.length > 0 && (
        <div className="screenshots">
          {app.screenshots.map((src, i) => (
            <img key={i} src={src} alt={`Captura de tela ${i + 1}`} className="screenshot" />
          ))}
        </div>
      )}

      <div className="section" style={{ maxWidth: 720 }}>
        <div className="section-title" style={{ marginBottom: 12 }}>Sobre</div>
        <p style={{ color: 'var(--text-1)', lineHeight: 1.6, fontSize: 14.5 }}>{app.description}</p>
      </div>

      <div className="section" style={{ maxWidth: 720 }}>
        <div className="section-title" style={{ marginBottom: 16 }}>Avaliações</div>

        {user && (
          <div className="admin-step" style={{ marginBottom: 20 }}>
            <label style={{ fontSize: 12, color: 'var(--text-1)', fontWeight: 600, display: 'block', marginBottom: 10 }}>Sua avaliação</label>
            <div className="star-picker">
              {[1, 2, 3, 4, 5].map(n => (
                <button key={n} className={n <= myReviewRating ? 'active' : ''} onClick={() => setMyReviewRating(n)}>★</button>
              ))}
            </div>
            <textarea
              placeholder="Conte como foi sua experiência (opcional)"
              value={myReviewText}
              onChange={(e) => setMyReviewText(e.target.value)}
              style={{ width: '100%', background: 'var(--bg-2)', border: '1px solid var(--line)', borderRadius: 10, padding: '11px 14px', color: 'var(--text-0)', fontSize: 14, minHeight: 70, marginBottom: 12, outline: 'none' }}
            />
            <button className="modal-submit" style={{ width: 'auto', padding: '10px 22px' }} onClick={submitReview} disabled={submittingReview}>
              {submittingReview ? 'Enviando...' : 'Enviar avaliação'}
            </button>
          </div>
        )}

        {reviews.length === 0 ? (
          <p style={{ color: 'var(--text-2)', fontSize: 14 }}>Ainda não há avaliações. Seja o primeiro a avaliar.</p>
        ) : (
          reviews.map(r => (
            <div key={r.id} className="review-card">
              <div className="review-head">
                <div className="review-user">
                  <div className="avatar">{initials(r.profiles?.name)}</div>
                  <strong style={{ fontSize: 13.5 }}>{r.profiles?.name || 'Usuário'}</strong>
                  <span className="review-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                </div>
                <span className="review-date">{new Date(r.created_at).toLocaleDateString('pt-BR')}</span>
              </div>
              {r.comment && <p className="review-text">{r.comment}</p>}
            </div>
          ))
        )}
      </div>

      {showAuth && (
        <AuthModal
          pendingApp={app}
          onClose={() => setShowAuth(false)}
          onSuccess={() => { setShowAuth(false); handleDownload(); }}
        />
      )}

      <div className={`toast ${toast ? 'show' : ''}`}>
        <div className="toast-icon">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6 9 17l-5-5" /></svg>
        </div>
        <span>{toast}</span>
      </div>
    </>
  );
}