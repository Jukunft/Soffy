/* global React */
const { useState: useStateM, useEffect: useEffectM, useMemo: useMemoM } = React;

function MatchesScreen({ lang, onBack }) {
  const t = window.useT(lang);
  const [matches, setMatches] = useStateM([]);
  const [loading, setLoading] = useStateM(true);
  const [, setTick] = useStateM(0); // forza re-render cada 1s para ticking

  const load = () => window.SoffyAPI.getMatches().then(r => {
    setMatches(r.matches);
    setLoading(false);
  });

  useEffectM(() => { load(); }, []);
  useEffectM(() => {
    const id = setInterval(() => setTick(t => t + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const useCoupon = (match) => {
    window.SoffyAPI.markMatchUsed(match.id).then(load);
    // TODO: abrir WebView/deep link al sitio del partner (SKILL §4: intermediario directo)
  };
  const removeMatch = (match) => {
    window.SoffyAPI.deleteMatch(match.id).then(load);
  };

  return (
    <div className="matches">
      <div className="matches-topbar">
        <button className="onb-back" onClick={onBack} aria-label={t('back')}>
          <window.Icon name="chevronLeft" size={18} />
        </button>
        <div className="matches-title-wrap">
          <p className="eyebrow">{lang === 'es' ? 'TUS MATCHES' : 'YOUR MATCHES'}</p>
          <h2 className="matches-title">
            {matches.length} {lang === 'es'
              ? (matches.length === 1 ? 'descuento activo' : 'descuentos activos')
              : (matches.length === 1 ? 'active deal' : 'active deals')}
          </h2>
        </div>
      </div>

      <div className="matches-body">
        {loading ? (
          <div className="matches-empty">
            <p className="matches-empty-sub">{lang === 'es' ? 'Cargando…' : 'Loading…'}</p>
          </div>
        ) : matches.length === 0 ? (
          <div className="matches-empty">
            <div className="empty-deck-icon">
              <window.Icon name="bookmark" size={30} stroke={1.8} />
            </div>
            <h3 className="matches-empty-title">
              {lang === 'es' ? 'Aún sin matches' : 'No matches yet'}
            </h3>
            <p className="matches-empty-sub">
              {lang === 'es'
                ? 'Swipea a la derecha los descuentos que te gusten y aparecerán acá.'
                : 'Swipe right on deals you like and they\'ll show up here.'}
            </p>
            <button className="btn btn-primary" onClick={onBack}>
              {lang === 'es' ? 'Ir a swipear' : 'Go swipe'}
              <window.Icon name="arrowRight" size={16} />
            </button>
          </div>
        ) : (
          <div className="matches-list">
            {matches.map(m => (
              <MatchCard
                key={m.id}
                match={m}
                lang={lang}
                onUse={() => useCoupon(m)}
                onDelete={() => removeMatch(m)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function MatchCard({ match, lang, onUse, onDelete }) {
  const { deal, msLeft, used } = match;
  const cat = window.CATEGORIES.find(c => c.id === deal.cat);
  const urgent = msLeft < 3 * 60 * 60 * 1000; // < 3h
  const critical = msLeft < 30 * 60 * 1000;   // < 30m

  return (
    <div className={`match-item ${used ? 'is-used' : ''} ${critical ? 'is-critical' : urgent ? 'is-urgent' : ''}`}>
      <div
        className="match-item-thumb"
        style={{ background: `linear-gradient(135deg, ${deal.grad[0]}, ${deal.grad[1]})` }}>
        <div className="match-item-emoji">{cat ? cat.emoji : ''}</div>
        <div className="match-item-discount">-{deal.discount}</div>
      </div>
      <div className="match-item-body">
        <div className="match-item-brand">{deal.brand.toUpperCase()}</div>
        <div className="match-item-title">{deal.title[lang]}</div>
        <div className="match-item-meta">
          <span className={`match-countdown ${critical ? 'critical' : urgent ? 'urgent' : ''}`}>
            <window.Icon name="clock" size={12} stroke={2.2} />
            <Countdown msLeft={msLeft} lang={lang} />
          </span>
          <span className="match-item-price">
            <span className="match-item-old">{deal.oldPrice}</span>
            <span className="match-item-new">{deal.newPrice}</span>
          </span>
        </div>
        <div className="match-item-actions">
          <button className="btn btn-ghost match-btn-sm" onClick={onDelete} aria-label="Remove">
            <window.Icon name="x" size={16} />
          </button>
          <button className="btn btn-primary match-btn-use" onClick={onUse} disabled={used}>
            {used
              ? (lang === 'es' ? 'Usado ✓' : 'Used ✓')
              : (lang === 'es' ? 'Ver cupón' : 'View coupon')}
            {!used && <window.Icon name="arrowRight" size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}

function Countdown({ msLeft, lang }) {
  if (msLeft <= 0) return <span>{lang === 'es' ? 'Expiró' : 'Expired'}</span>;
  const totalSec = Math.floor(msLeft / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (h > 0) return <span>{h}h {String(m).padStart(2, '0')}m</span>;
  if (m > 0) return <span>{m}m {String(s).padStart(2, '0')}s</span>;
  return <span>{s}s</span>;
}

window.MatchesScreen = MatchesScreen;
