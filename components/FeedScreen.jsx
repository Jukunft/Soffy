'use client';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Icon from '@/components/Icon';
import { useT } from '@/lib/i18n';
import { CATEGORIES, TASTES } from '@/lib/data';
import { SoffyAPI } from '@/lib/api';
import { track, EVENTS } from '@/lib/analytics';
import { shareDeal } from '@/lib/share';
import FilterDrawer, { DEFAULT_FILTERS } from '@/components/FilterDrawer';

export default function FeedScreen({ prefs, lang, onRestart, onOpenProfile, onOpenMatches, onOpenPaywall }) {
  const t = useT(lang);
  const [activeCat, setActiveCat] = useState('all');
  const [matched, setMatched] = useState(null);
  const [matchedDeals, setMatchedDeals] = useState([]);
  const [deck, setDeck] = useState([]);
  const [capped, setCapped] = useState(false);
  const [swipesToday, setSwipesToday] = useState(0);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState(DEFAULT_FILTERS);
  const [filterOpen, setFilterOpen] = useState(false);
  const [boostToast, setBoostToast] = useState(false);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (filters.minDiscount > 0) n++;
    if (filters.distance !== null) n++;
    if (filters.sort !== 'affinity') n++;
    return n;
  }, [filters]);

  const loadDeck = useCallback(() => {
    setLoading(true);
    return SoffyAPI.getDeck({ prefs, cat: activeCat, filters }).then(r => {
      setDeck(r.deck);
      setCapped(!!r.capped);
      setSwipesToday(r.swipesToday || r.cap || 0);
      setLoading(false);
      if (r.capped) track(EVENTS.CAP_HIT, { swipesToday: r.swipesToday });
    });
  }, [prefs, activeCat, filters]);

  useEffect(() => { track(EVENTS.FEED_VIEW, { cat: activeCat }); }, [activeCat]);

  useEffect(() => { loadDeck(); }, [loadDeck]);

  useEffect(() => {
    SoffyAPI.getMatches().then(r =>
      setMatchedDeals(r.matches.map(m => m.dealId))
    );
  }, []);

  const catChips = useMemo(() => {
    return [
      { id: 'all', label: t('all_filter'), emoji: '✨' },
      ...CATEGORIES.filter(c => prefs.cats.includes(c.id)).map(c => ({
        id: c.id, label: c.name[lang], emoji: c.emoji
      }))
    ];
  }, [prefs, lang, t]);

  const handleSwipe = (deal, dir) => {
    track(EVENTS.SWIPE, { dealId: deal.id, dir, affinity: deal.affinity || deal.match, cat: deal.cat });
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      navigator.vibrate(dir === 'right' ? [12, 30, 12] : 10);
    }
    setDeck(d => d.filter(x => x.id !== deal.id));
    SoffyAPI.postSwipe({ dealId: deal.id, dir }).then(({ match }) => {
      if (match) {
        setMatchedDeals(prev => [...prev, deal.id]);
        track(EVENTS.MATCH, { dealId: deal.id, affinity: deal.affinity || deal.match });
        if (deal.match >= 85) {
          track(EVENTS.MATCH_HIGH, { dealId: deal.id, affinity: deal.match });
          if (navigator.vibrate) navigator.vibrate([30, 50, 30, 50, 30]);
          setMatched(deal);
        }
      }
    });
  };

  const handleRewind = () => {
    SoffyAPI.undoLastSwipe().then(({ undone }) => {
      if (!undone) return;
      track(EVENTS.UNDO_SWIPE, { dealId: undone.dealId, dir: undone.dir });
      loadDeck();
      if (undone.dir === 'right') {
        setMatchedDeals(m => m.filter(id => id !== undone.dealId));
      }
    });
  };

  const restart = () => {
    SoffyAPI.resetSwipes().then(() => loadDeck());
    setMatched(null);
  };

  // keyboard shortcuts — QA en desktop
  useEffect(() => {
    const onKey = (e) => {
      if (filterOpen || matched || capped) return;
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (!deck[0]) return;
      if (e.key === 'ArrowLeft')      { e.preventDefault(); handleSwipe(deck[0], 'left'); }
      else if (e.key === 'ArrowRight'){ e.preventDefault(); handleSwipe(deck[0], 'right'); }
      else if (e.code === 'Space')    { e.preventDefault(); handleBoost(); }
      else if (e.key === 'Backspace') { e.preventDefault(); handleRewind(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck, filterOpen, matched, capped]);

  const handleBoost = () => {
    SoffyAPI.getBoost({ prefs }).then(({ deal }) => {
      if (!deal) return;
      track(EVENTS.BOOST_USED, { dealId: deal.id, affinity: deal.affinity });
      setDeck(d => [deal, ...d.filter(x => x.id !== deal.id)]);
      setBoostToast(true);
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(25);
      setTimeout(() => setBoostToast(false), 2200);
    });
  };

  return (
    <div className="feed">
      <div className="feed-topbar">
        <div className="feed-topbar-logo">
          <img src="/assets/soffy-logo.png" alt="Soffy" style={{ height: 28 }} />
        </div>
        <div className="feed-topbar-right">
          <button className="icon-btn" onClick={() => setFilterOpen(true)} aria-label="Filters">
            <Icon name="sliders" size={18} />
            {activeFilterCount > 0 && <span className="badge">{activeFilterCount}</span>}
          </button>
          <button className="icon-btn" onClick={onOpenMatches} aria-label="Matches">
            <Icon name="bookmark" size={18} />
            {matchedDeals.length > 0 && <span className="badge">{matchedDeals.length}</span>}
          </button>
          <button className="icon-btn" onClick={onOpenProfile} aria-label="Profile">
            <Icon name="user" size={18} />
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
        {loading ? (
          <DeckSkeleton />
        ) : capped ? (
          <CapHit
            lang={lang}
            swipes={swipesToday}
            onUpgrade={() => onOpenPaywall && onOpenPaywall('daily_cap')}
          />
        ) : deck.length === 0 ? (
          <EmptyDeck onRestart={restart} lang={lang} />
        ) : (
          <div className="deck">
            {deck.slice(0, 3).reverse().map((deal, idxReversed) => {
              const idx = Math.min(deck.length, 3) - 1 - idxReversed;
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

      {!loading && !capped && deck.length > 0 && (
        <div className="action-bar">
          <button className="action-btn small" aria-label="Rewind" onClick={handleRewind}>
            <Icon name="refresh" size={18} />
          </button>
          <button className="action-btn nope" aria-label="Nope" onClick={() => {
            if (deck[0]) handleSwipe(deck[0], 'left');
          }}>
            <Icon name="x" size={28} stroke={2.5} />
          </button>
          <button className="action-btn boost" onClick={handleBoost} aria-label="Boost">
            <Icon name="bolt" size={20} stroke={2} />
          </button>
          <button className="action-btn like" aria-label="Like" onClick={() => {
            if (deck[0]) handleSwipe(deck[0], 'right');
          }}>
            <Icon name="heart" size={28} stroke={2.5} />
          </button>
          <button className="action-btn small" aria-label="Save" onClick={() => {
            if (deck[0]) handleSwipe(deck[0], 'right');
          }}>
            <Icon name="bookmark" size={18} />
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

      {boostToast && <div className="boost-toast">{t('boost_toast')}</div>}

      <FilterDrawer
        open={filterOpen}
        onClose={() => setFilterOpen(false)}
        onApply={(f) => { setFilters(f); track(EVENTS.FILTER_APPLY, f); }}
        lang={lang}
        initial={filters}
      />
    </div>
  );
}

function SwipeCard({ deal, stackIndex, isTop, onSwipe, lang }) {
  const ref = useRef(null);
  const [drag, setDrag] = useState({ x: 0, y: 0, active: false });
  const startRef = useRef({ x: 0, y: 0 });
  const [exiting, setExiting] = useState(null);

  const rotation = drag.x / 20;
  const likeOpacity = Math.max(0, Math.min(1, drag.x / 80));
  const nopeOpacity = Math.max(0, Math.min(1, -drag.x / 80));

  const onPointerDown = (e) => {
    if (!isTop || exiting) return;
    const pt = e.touches ? e.touches[0] : e;
    startRef.current = { x: pt.clientX, y: pt.clientY };
    setDrag({ x: 0, y: 0, active: true });
  };

  useEffect(() => {
    if (!drag.active) return;
    const move = (e) => {
      const pt = e.touches ? e.touches[0] : e;
      setDrag({
        x: pt.clientX - startRef.current.x,
        y: pt.clientY - startRef.current.y,
        active: true,
      });
    };
    const up = () => {
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
  }, [drag.active, drag.x, drag.y, deal, onSwipe]);

  let transform;
  if (exiting === 'right') {
    transform = `translate(600px, ${drag.y}px) rotate(30deg)`;
  } else if (exiting === 'left') {
    transform = `translate(-600px, ${drag.y}px) rotate(-30deg)`;
  } else if (drag.active) {
    transform = `translate(${drag.x}px, ${drag.y}px) rotate(${rotation}deg)`;
  } else {
    const scale = 1 - stackIndex * 0.04;
    const y = stackIndex * 12;
    transform = `translate(0, ${y}px) scale(${scale})`;
  }

  const cat = CATEGORIES.find(c => c.id === deal.cat);
  const tasteLabels = deal.tastes
    .map(tid => Object.values(TASTES).flat().find(tt => tt.id === tid))
    .filter(Boolean)
    .map(tst => tst.name[lang]);

  return (
    <div
      ref={ref}
      className={`card ${deal.boosted ? 'is-boosted' : ''}`}
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
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: 'radial-gradient(circle at 20% 30%, rgba(255,255,255,0.08) 0%, transparent 40%), radial-gradient(circle at 80% 70%, rgba(255,255,255,0.06) 0%, transparent 40%)',
          mixBlendMode: 'overlay',
        }} />
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

        <div className="stamp stamp-like" style={{ opacity: likeOpacity }}>{lang === 'es' ? 'ME GUSTA' : 'LIKE'}</div>
        <div className="stamp stamp-nope" style={{ opacity: nopeOpacity }}>{lang === 'es' ? 'PASO' : 'NOPE'}</div>

        <div className="card-info">
          <h3 className="card-title">{deal.title[lang]}</h3>
          <div className="card-merchant">
            {tasteLabels.slice(0, 3).join(' · ')}
          </div>
          <div className="card-meta">
            <span className="card-meta-item match">
              <Icon name="sparkles" size={12} stroke={2.2} />
              {deal.match}% match
            </span>
            {deal.distance > 0 && (
              <span className="card-meta-item">
                <Icon name="mapPin" size={12} stroke={2} />
                {deal.distance} km
              </span>
            )}
            <span className="card-meta-item">
              <Icon name="clock" size={12} stroke={2} />
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

function DeckSkeleton() {
  return (
    <div className="deck">
      {[2, 1, 0].map(i => (
        <div
          key={i}
          className="card deck-skeleton"
          style={{
            transform: `translate(0, ${i * 12}px) scale(${1 - i * 0.04})`,
            zIndex: 10 - i,
            pointerEvents: 'none',
          }}>
          <div className="card-img">
            <div className="deck-skel-shimmer" />
          </div>
        </div>
      ))}
    </div>
  );
}

function EmptyDeck({ onRestart, lang }) {
  const t = useT(lang);
  return (
    <div className="empty-deck">
      <div className="empty-deck-icon">
        <Icon name="sparkles" size={32} stroke={1.8} />
      </div>
      <h3>{t('out_of_cards_title')}</h3>
      <p>{t('out_of_cards_sub')}</p>
      <button className="btn btn-primary" onClick={onRestart}>
        <Icon name="refresh" size={16} /> {t('restart')}
      </button>
    </div>
  );
}

function CapHit({ lang, swipes, onUpgrade }) {
  const t = useT(lang);
  return (
    <div className="cap-hit">
      <div className="cap-hit-icon">
        <Icon name="bolt" size={32} stroke={2} />
      </div>
      <h3>{t('cap_title')}</h3>
      <p>{t('cap_sub', { n: swipes })}</p>
      <div className="cap-hit-actions">
        <button className="btn btn-primary btn-block" onClick={onUpgrade}>
          <Icon name="sparkles" size={14} stroke={2} /> {t('cap_cta_upgrade')}
        </button>
        <button className="btn btn-ghost btn-block" disabled>
          {t('cap_cta_wait')}
        </button>
      </div>
    </div>
  );
}

function MatchOverlay({ deal, onClose, onViewMatches, lang }) {
  const t = useT(lang);
  const cat = CATEGORIES.find(c => c.id === deal.cat);
  const handleShare = () => shareDeal({ deal, lang });
  const confetti = useMemo(() => {
    const colors = ['#ff6b1f', '#1d4ed8', '#22c55e', '#fbbf24', '#fff'];
    return Array.from({ length: 40 }, () => ({
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
      <button className="match-share-btn" onClick={handleShare} aria-label={t('share')}>
        <Icon name="arrowRight" size={14} stroke={2.2} /> {t('share')}
      </button>
    </div>
  );
}
