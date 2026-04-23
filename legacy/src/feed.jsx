/* global React */
const { useState: useStateF, useEffect: useEffectF, useRef: useRefF, useMemo: useMemoF } = React;

function FeedScreen({ prefs, lang, onRestart, onOpenMenu, onOpenMatches }) {
  const t = window.useT(lang);
  const [activeCat, setActiveCat] = useStateF('all');
  const [matched, setMatched] = useStateF(null); // deal that just got matched
  const [swiped, setSwiped] = useStateF([]); // ids of swiped cards
  const [matchedDeals, setMatchedDeals] = useStateF([]); // ids of liked deals

  // Sync badge con matches activos (persisten en API layer)
  useEffectF(() => {
    window.SoffyAPI.getMatches().then(r =>
      setMatchedDeals(r.matches.map(m => m.dealId))
    );
  }, []);

  // Build feed: only deals where cat is selected AND at least one taste matches
  const feed = useMemoF(() => {
    return window.DEALS.filter(d =>
      prefs.cats.includes(d.cat) &&
      d.tastes.some(tid => prefs.tastes.includes(tid)) &&
      !swiped.includes(d.id)
    ).filter(d => activeCat === 'all' || d.cat === activeCat);
  }, [prefs, swiped, activeCat]);

  // Cat chips to show (only those the user selected + All)
  const catChips = useMemoF(() => {
    return [
      { id: 'all', label: t('all_filter'), emoji: '✨' },
      ...window.CATEGORIES.filter(c => prefs.cats.includes(c.id)).map(c => ({
        id: c.id, label: c.name[lang], emoji: c.emoji
      }))
    ];
  }, [prefs, lang]);

  const handleSwipe = (deal, dir) => {
    setSwiped(prev => [...prev, deal.id]);
    window.SoffyAPI.postSwipe({ dealId: deal.id, dir }).then(({ match }) => {
      if (match) {
        setMatchedDeals(prev => [...prev, deal.id]);
        if (deal.match >= 85) setMatched(deal);
      }
    });
  };

  const restart = () => {
    setSwiped([]);
    setMatchedDeals([]);
    setMatched(null);
  };

  return (
    <div className="feed">
      <div className="feed-topbar">
        <div className="feed-topbar-logo">
          <img src="assets/soffy-logo.png" alt="Soffy" style={{ height: 28 }} />
        </div>
        <div className="feed-topbar-right">
          <button className="icon-btn" aria-label="Filters">
            <window.Icon name="sliders" size={18} />
          </button>
          <button className="icon-btn" onClick={onOpenMatches} aria-label="Matches">
            <window.Icon name="bookmark" size={18} />
            {matchedDeals.length > 0 && <span className="badge">{matchedDeals.length}</span>}
          </button>
          <button className="icon-btn" onClick={onOpenMenu} aria-label="Menu">
            <window.Icon name="user" size={18} />
          </button>
        </div>
      </div>

      <div className="filter-strip">
        {catChips.map(c => (
          <span
            key={c.id}
            className={`chip ${activeCat === c.id ? 'selected' : ''}`}
            onClick={() => setActiveCat(c.id)}>
            <span style={{ fontSize: 12 }}>{c.emoji}</span>
            {c.label}
          </span>
        ))}
      </div>

      <div className="deck-wrap">
        {feed.length === 0 ? (
          <EmptyDeck onRestart={restart} lang={lang} />
        ) : (
          <div className="deck">
            {feed.slice(0, 3).reverse().map((deal, idxReversed) => {
              const idx = feed.slice(0, 3).length - 1 - idxReversed;
              return (
                <SwipeCard
                  key={deal.id}
                  deal={deal}
                  stackIndex={idx}
                  isTop={idx === 0}
                  onSwipe={handleSwipe}
                  lang={lang}
                />
              );
            })}
          </div>
        )}
      </div>

      {feed.length > 0 && (
        <div className="action-bar">
          <button className="action-btn small" aria-label="Rewind" onClick={() => {
            if (swiped.length) {
              window.SoffyAPI.undoLastSwipe().then(() => {
                setSwiped(s => s.slice(0, -1));
                setMatchedDeals(m => m.slice(0, -1));
              });
            }
          }}>
            <window.Icon name="refresh" size={18} />
          </button>
          <button className="action-btn nope" aria-label="Nope" onClick={() => {
            if (feed[0]) handleSwipe(feed[0], 'left');
          }}>
            <window.Icon name="x" size={28} stroke={2.5} />
          </button>
          <button className="action-btn boost" aria-label="Boost">
            <window.Icon name="bolt" size={20} stroke={2} />
          </button>
          <button className="action-btn like" aria-label="Like" onClick={() => {
            if (feed[0]) handleSwipe(feed[0], 'right');
          }}>
            <window.Icon name="heart" size={28} stroke={2.5} />
          </button>
          <button className="action-btn small" aria-label="Save" onClick={() => {
            if (feed[0]) handleSwipe(feed[0], 'right');
          }}>
            <window.Icon name="bookmark" size={18} />
          </button>
        </div>
      )}

      {matched && (
        <MatchOverlay
          deal={matched}
          onClose={() => setMatched(null)}
          onViewMatches={() => { setMatched(null); onOpenMatches && onOpenMatches(); }}
          lang={lang} />
      )}
    </div>
  );
}

function SwipeCard({ deal, stackIndex, isTop, onSwipe, lang }) {
  const ref = useRefF(null);
  const [drag, setDrag] = useStateF({ x: 0, y: 0, active: false });
  const startRef = useRefF({ x: 0, y: 0 });
  const [exiting, setExiting] = useStateF(null); // 'left' | 'right' | null

  const rotation = drag.x / 20; // deg
  const likeOpacity = Math.max(0, Math.min(1, drag.x / 80));
  const nopeOpacity = Math.max(0, Math.min(1, -drag.x / 80));

  const onPointerDown = (e) => {
    if (!isTop || exiting) return;
    const pt = e.touches ? e.touches[0] : e;
    startRef.current = { x: pt.clientX, y: pt.clientY };
    setDrag({ x: 0, y: 0, active: true });
    // attach listeners to window so we catch fast moves
  };
  const onPointerMove = (e) => {
    if (!drag.active) return;
    const pt = e.touches ? e.touches[0] : e;
    setDrag({
      x: pt.clientX - startRef.current.x,
      y: pt.clientY - startRef.current.y,
      active: true,
    });
  };
  const onPointerUp = () => {
    if (!drag.active) return;
    const threshold = 100;
    if (drag.x > threshold) {
      setExiting('right');
      setTimeout(() => onSwipe(deal, 'right'), 260);
    } else if (drag.x < -threshold) {
      setExiting('left');
      setTimeout(() => onSwipe(deal, 'left'), 260);
    } else {
      setDrag({ x: 0, y: 0, active: false });
    }
  };

  useEffectF(() => {
    if (!drag.active) return;
    const move = e => onPointerMove(e);
    const up = () => onPointerUp();
    window.addEventListener('mousemove', move);
    window.addEventListener('mouseup', up);
    window.addEventListener('touchmove', move, { passive: false });
    window.addEventListener('touchend', up);
    return () => {
      window.removeEventListener('mousemove', move);
      window.removeEventListener('mouseup', up);
      window.removeEventListener('touchmove', move);
      window.removeEventListener('touchend', up);
    };
  }, [drag.active, drag.x, drag.y]);

  let transform;
  if (exiting === 'right') {
    transform = `translate(600px, ${drag.y}px) rotate(30deg)`;
  } else if (exiting === 'left') {
    transform = `translate(-600px, ${drag.y}px) rotate(-30deg)`;
  } else if (drag.active) {
    transform = `translate(${drag.x}px, ${drag.y}px) rotate(${rotation}deg)`;
  } else {
    // stack offset
    const scale = 1 - stackIndex * 0.04;
    const y = stackIndex * 12;
    transform = `translate(0, ${y}px) scale(${scale})`;
  }

  const cat = window.CATEGORIES.find(c => c.id === deal.cat);
  const tasteLabels = deal.tastes
    .map(tid => Object.values(window.TASTES).flat().find(tt => tt.id === tid))
    .filter(Boolean)
    .map(tst => tst.name[lang]);

  return (
    <div
      ref={ref}
      className="card"
      onMouseDown={onPointerDown}
      onTouchStart={onPointerDown}
      style={{
        transform,
        transition: drag.active ? 'none' : 'transform 260ms cubic-bezier(0.22, 1, 0.36, 1)',
        zIndex: 10 - stackIndex,
        opacity: stackIndex > 2 ? 0 : 1,
        pointerEvents: isTop ? 'auto' : 'none',
      }}>
      <div className="card-img">
        <div className="ph-bg" style={{
          background: `linear-gradient(135deg, ${deal.grad[0]}, ${deal.grad[1]})`,
        }} />
        {/* Decorative pattern */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.08) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.06) 0%, transparent 40%)',
          mixBlendMode: 'overlay',
        }} />
        {/* Big category glyph watermark */}
        <div style={{
          position: 'absolute',
          right: -20, bottom: -30,
          fontSize: 200,
          opacity: 0.15,
          lineHeight: 1,
          transform: 'rotate(-8deg)',
          pointerEvents: 'none',
        }}>{cat ? cat.emoji : ''}</div>

        <div className="card-brand-pill">
          <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)', display: 'inline-block' }} />
          {deal.brand}
        </div>
        <div className="card-cat-pill">{cat ? cat.name[lang] : ''}</div>
        <div className="card-discount">-{deal.discount}</div>

        <div className="stamp stamp-like" style={{ opacity: likeOpacity }}>{t_like(lang)}</div>
        <div className="stamp stamp-nope" style={{ opacity: nopeOpacity }}>{t_nope(lang)}</div>

        <div className="card-info">
          <h3 className="card-title">{deal.title[lang]}</h3>
          <div className="card-merchant">
            {tasteLabels.slice(0, 3).join(' · ')}
          </div>
          <div className="card-meta">
            <span className="card-meta-item match">
              <window.Icon name="sparkles" size={12} stroke={2.2} />
              {deal.match}% match
            </span>
            {deal.distance > 0 && (
              <span className="card-meta-item">
                <window.Icon name="mapPin" size={12} stroke={2} />
                {deal.distance} km
              </span>
            )}
            <span className="card-meta-item">
              <window.Icon name="clock" size={12} stroke={2} />
              {deal.endsIn}
            </span>
          </div>
          <div className="card-price-strip">
            <span className="card-price-old">{deal.oldPrice}</span>
            <span className="card-price-new">{deal.newPrice}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

function t_like(lang) { return lang === 'es' ? 'ME GUSTA' : 'LIKE'; }
function t_nope(lang) { return lang === 'es' ? 'PASO' : 'NOPE'; }

function EmptyDeck({ onRestart, lang }) {
  const t = window.useT(lang);
  return (
    <div className="empty-deck">
      <div className="empty-deck-icon">
        <window.Icon name="sparkles" size={32} stroke={1.8} />
      </div>
      <h3>{t('out_of_cards_title')}</h3>
      <p>{t('out_of_cards_sub')}</p>
      <button className="btn btn-primary" onClick={onRestart}>
        <window.Icon name="refresh" size={16} /> {t('restart')}
      </button>
    </div>
  );
}

function MatchOverlay({ deal, onClose, onViewMatches, lang }) {
  const t = window.useT(lang);
  const cat = window.CATEGORIES.find(c => c.id === deal.cat);
  const confetti = useMemoF(() => {
    const colors = ['#ff6b1f', '#1d4ed8', '#22c55e', '#fbbf24', '#fff'];
    return Array.from({ length: 40 }, (_, i) => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.8,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * 360,
    }));
  }, []);
  return (
    <div className="match-overlay">
      <div className="match-confetti">
        {confetti.map((c, i) => (
          <div key={i} className="confetti-piece" style={{
            left: `${c.left}%`,
            top: -20,
            background: c.color,
            animationDelay: `${c.delay}s`,
            transform: `rotate(${c.rot}deg)`,
          }} />
        ))}
      </div>
      <h1 className="match-title">{lang === 'es' ? '¡MATCH!' : "IT'S A MATCH!"}</h1>
      <p className="match-sub">{t('match_sub')}</p>
      <div className="match-card">
        <div style={{
          height: 120,
          borderRadius: 'var(--r-md)',
          background: `linear-gradient(135deg, ${deal.grad[0]}, ${deal.grad[1]})`,
          position: 'relative', overflow: 'hidden',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 12,
        }}>
          <div style={{ fontSize: 72, opacity: 0.3 }}>{cat ? cat.emoji : ''}</div>
          <div style={{
            position: 'absolute', top: 10, right: 10,
            background: 'var(--accent)', color: '#1a0a00',
            padding: '6px 10px', borderRadius: 10,
            fontFamily: 'var(--font-display)', fontSize: 18,
          }}>-{deal.discount}</div>
        </div>
        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--fg-muted)', letterSpacing: '0.08em' }}>
          {deal.brand.toUpperCase()}
        </div>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, marginTop: 4, color: 'var(--fg)' }}>
          {deal.title[lang]}
        </div>
      </div>
      <div style={{ display: 'flex', gap: 10, width: '100%', maxWidth: 280 }}>
        <button className="btn btn-ghost btn-block" onClick={onClose}>
          {t('keep_swiping')}
        </button>
        <button className="btn btn-primary btn-block" onClick={onViewMatches || onClose}>
          {t('view_coupon')}
        </button>
      </div>
    </div>
  );
}

window.FeedScreen = FeedScreen;
