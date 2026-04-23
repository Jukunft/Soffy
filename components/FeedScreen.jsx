'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '@/components/Icon';
import { useT } from '@/lib/i18n';
import { CATEGORIES, DEALS, TASTES } from '@/lib/data';
import { SoffyAPI } from '@/lib/api';

export default function FeedScreen({ prefs, lang, onRestart, onOpenMenu, onOpenMatches }) {
  const t = useT(lang);
  const [activeCat, setActiveCat] = useState('all');
  const [matched, setMatched] = useState(null);
  const [swiped, setSwiped] = useState([]);
  const [matchedDeals, setMatchedDeals] = useState([]);

  useEffect(() => {
    SoffyAPI.getMatches().then(r =>
      setMatchedDeals(r.matches.map(m => m.dealId))
    );
  }, []);

  const feed = useMemo(() => {
    return DEALS.filter(d =>
      prefs.cats.includes(d.cat) &&
      d.tastes.some(tid => prefs.tastes.includes(tid)) &&
      !swiped.includes(d.id)
    ).filter(d => activeCat === 'all' || d.cat === activeCat);
  }, [prefs, swiped, activeCat]);

  const catChips = useMemo(() => {
    return [
      { id: 'all', label: t('all_filter'), emoji: '✨' },
      ...CATEGORIES.filter(c => prefs.cats.includes(c.id)).map(c => ({
        id: c.id, label: c.name[lang], emoji: c.emoji
      }))
    ];
  }, [prefs, lang, t]);

  const handleSwipe = (deal, dir) => {
    setSwiped(prev => [...prev, deal.id]);
    SoffyAPI.postSwipe({ dealId: deal.id, dir }).then(({ match }) => {
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
          <img src="/assets/soffy-logo.png" alt="Soffy" style={{ height: 28 }} />
        </div>
        <div className="feed-topbar-right">
          <button className="icon-btn" aria-label="Filters">
            <Icon name="sliders" size={18} />
          </button>
          <button className="icon-btn" onClick={onOpenMatches} aria-label="Matches">
            <Icon name="bookmark" size={18} />
            {matchedDeals.length > 0 && <span className="badge">{matchedDeals.length}</span>}
          </button>
          <button className="icon-btn" onClick={onOpenMenu} aria-label="Menu">
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
              SoffyAPI.undoLastSwipe().then(() => {
                setSwiped(s => s.slice(0, -1));
                setMatchedDeals(m => m.slice(0, -1));
              });
            }
          }}>
            <Icon name="refresh" size={18} />
          </button>
          <button className="action-btn nope" aria-label="Nope" onClick={() => {
            if (feed[0]) handleSwipe(feed[0], 'left');
          }}>
            <Icon name="x" size={28} stroke={2.5} />
          </button>
          <button className="action-btn boost" aria-label="Boost">
            <Icon name="bolt" size={20} stroke={2} />
          </button>
          <button className="action-btn like" aria-label="Like" onClick={() => {
            if (feed[0]) handleSwipe(feed[0], 'right');
          }}>
            <Icon name="heart" size={28} stroke={2.5} />
          </button>
          <button className="action-btn small" aria-label="Save" onClick={() => {
            if (feed[0]) handleSwipe(feed[0], 'right');
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

function MatchOverlay({ deal, onClose, onViewMatches, lang }) {
  const t = useT(lang);
  const cat = CATEGORIES.find(c => c.id === deal.cat);
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
    </div>
  );
}
