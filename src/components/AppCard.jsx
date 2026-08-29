const COLORS = ['#7C5CFF', '#3DDC97', '#FF7AB8', '#FFB454', '#4EA1FF', '#FF6B6B', '#22D3EE', '#A78BFA'];

function initials(name) {
  return (name || '?').slice(0, 2).toUpperCase();
}
function colorFor(name) {
  return COLORS[(name || '?').charCodeAt(0) % COLORS.length];
}
function formatCount(n) {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1).replace('.0', '') + 'K';
  return String(n);
}

export function Icon({ app, size = 56 }) {
  return app.icon_url ? (
    <img src={app.icon_url} alt="" className="app-icon" style={{ width: size, height: size }} />
  ) : (
    <div className="app-icon" style={{ width: size, height: size, background: colorFor(app.name) }}>
      {initials(app.name)}
    </div>
  );
}

export function RankCard({ app, rank, onOpen }) {
  return (
    <div className="rank-card" onClick={() => onOpen(app)}>
      <div className="rank-num">{rank}</div>
      <Icon app={app} />
      <div className="app-name">{app.name}</div>
      <div className="app-cat">{app.genres?.[0] || 'App'}</div>
      <div className="app-meta">
        <span className="stars">★ {app.avg_rating ?? '—'}</span>
        <span className="dl-count">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v13m0 0-4-4m4 4 4-4M4 21h16" /></svg>
          {formatCount(app.download_count)}
        </span>
      </div>
    </div>
  );
}

export function GridCard({ app, onOpen }) {
  const isNew = (Date.now() - new Date(app.created_at).getTime()) < 1000 * 60 * 60 * 48;
  return (
    <div className="grid-card" onClick={() => onOpen(app)}>
      <Icon app={app} size={52} />
      <div className="grid-body">
        {isNew && (
          <div className="new-badge"><span className="new-dot" />novo</div>
        )}
        <div className="app-name">{app.name}</div>
        <div className="app-cat">{app.genres?.[0] || 'App'}{app.size_mb ? ` · ${app.size_mb} MB` : ''}</div>
        <p style={{ fontSize: 13, color: 'var(--text-1)', marginTop: 6, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          {app.description}
        </p>
      </div>
    </div>
  );
}

export { formatCount, colorFor, initials };