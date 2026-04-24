'use client';
import { useEffect, useRef, useState } from 'react';
import Icon from '@/components/Icon';
import { useT } from '@/lib/i18n';
import { CATEGORIES } from '@/lib/data';
import { SoffyAPI } from '@/lib/api';
import { track, EVENTS } from '@/lib/analytics';
import { shareDeal, copyToClipboard, couponCode } from '@/lib/share';

export default function MatchesScreen({ lang, onBack }) {
  const t = useT(lang);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [, setTick] = useState(0);
  const [toast, setToast] = useState(null);
  const [pull, setPull] = useState(0);
  const pullStartY = useRef(null);
  const bodyRef = useRef(null);
  const PULL_THRESHOLD = 64;
  const PULL_MAX = 120;

  const flashToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2000);
  };

  const load = () => SoffyAPI.getMatches().then(r => {
    setMatches(r.matches);
    setLoading(false);
  });

  useEffect(() => { load(); track(EVENTS.MATCHES_VIEW); }, []);
  useEffect(() => {
    const id = setInterval(() => setTick(x => x + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const useCoupon = (m) => {
    track(EVENTS.COUPON_VIEW, { dealId: m.dealId, msLeft: m.msLeft });
    const code = couponCode(m.deal);
    copyToClipboard(code).then(ok => {
      if (ok) flashToast(`${t('code_copied')}: ${code}`);
      SoffyAPI.markMatchUsed(m.id).then(() => {
        track(EVENTS.COUPON_USED, { dealId: m.dealId, code });
        load();
      });
    });
    // TODO: abrir deep link al partner cuando BE devuelva URL real
  };
  const removeMatch = (m) => {
    track(EVENTS.MATCH_DELETED, { dealId: m.dealId });
    SoffyAPI.deleteMatch(m.id).then(load);
  };
  const shareMatch = (m) => {
    shareDeal({ deal: m.deal, lang }).then(r => {
      if (r?.method === 'clipboard') flashToast(t('share_toast_copied'));
    });
  };

  // Pull-to-refresh — solo si scrollTop es 0
  const onTouchStart = (e) => {
    if (!bodyRef.current || bodyRef.current.scrollTop > 0) return;
    pullStartY.current = e.touches[0].clientY;
  };
  const onTouchMove = (e) => {
    if (pullStartY.current === null) return;
    if (bodyRef.current.scrollTop > 0) { pullStartY.current = null; setPull(0); return; }
    const dy = e.touches[0].clientY - pullStartY.current;
    if (dy > 0) {
      setPull(Math.min(PULL_MAX, dy * 0.55));
    }
  };
  const onTouchEnd = () => {
    if (pullStartY.current === null) { setPull(0); return; }
    if (pull >= PULL_THRESHOLD) {
      setRefreshing(true);
      setPull(PULL_THRESHOLD); // hold indicator anchored mientras refresca
      if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(12);
      load().then(() => {
        setRefreshing(false);
        setPull(0);
      });
    } else {
      setPull(0);
    }
    pullStartY.current = null;
  };

  return (
    <div className="matches">
      <div className="matches-topbar">
        <button className="onb-back" onClick={onBack} aria-label={t('back')}>
          <Icon name="chevronLeft" size={18} />
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

      <div
        className="matches-body"
        ref={bodyRef}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
        style={{
          transform: pull > 0 ? `translateY(${pull}px)` : undefined,
          transition: pullStartY.current === null && !refreshing ? 'transform 280ms cubic-bezier(0.22,1,0.36,1)' : 'none',
        }}
      >
        <PullIndicator pull={pull} threshold={PULL_THRESHOLD} refreshing={refreshing} />
        {loading ? (
          <MatchesSkeleton />
        ) : matches.length === 0 ? (
          <div className="matches-empty">
            <div className="empty-deck-icon">
              <Icon name="bookmark" size={30} stroke={1.8} />
            </div>
            <h3 className="matches-empty-title">
              {lang === 'es' ? 'Aún sin matches' : 'No matches yet'}
            </h3>
            <p className="matches-empty-sub">
              {lang === 'es'
                ? 'Swipea a la derecha los descuentos que te gusten y aparecerán acá.'
                : "Swipe right on deals you like and they'll show up here."}
            </p>
            <button className="btn btn-primary" onClick={onBack}>
              {lang === 'es' ? 'Ir a swipear' : 'Go swipe'}
              <Icon name="arrowRight" size={16} />
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
                onShare={() => shareMatch(m)}
                onDelete={() => removeMatch(m)}
              />
            ))}
          </div>
        )}
      </div>
      <div className="matches-toast-region" role="status" aria-live="polite" aria-atomic="true">
        {toast && <div className="matches-toast">{toast}</div>}
      </div>
    </div>
  );
}

function MatchCard({ match, lang, onUse, onShare, onDelete }) {
  const { deal, msLeft, used } = match;
  const cat = CATEGORIES.find(c => c.id === deal.cat);
  const urgent = msLeft < 3 * 60 * 60 * 1000;
  const critical = msLeft < 30 * 60 * 1000;

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
            <Icon name="clock" size={12} stroke={2.2} />
            <Countdown msLeft={msLeft} lang={lang} />
          </span>
          <span className="match-item-price">
            <span className="match-item-old">{deal.oldPrice}</span>
            <span className="match-item-new">{deal.newPrice}</span>
          </span>
        </div>
        <div className="match-item-actions">
          <button className="btn btn-ghost match-btn-sm" onClick={onDelete} aria-label="Remove">
            <Icon name="x" size={16} />
          </button>
          <button className="btn btn-ghost match-btn-sm" onClick={onShare} aria-label="Share">
            <Icon name="arrowRight" size={16} stroke={2} />
          </button>
          <button className="btn btn-primary match-btn-use" onClick={onUse} disabled={used}>
            {used
              ? (lang === 'es' ? 'Usado ✓' : 'Used ✓')
              : (lang === 'es' ? 'Ver cupón' : 'View coupon')}
            {!used && <Icon name="arrowRight" size={14} />}
          </button>
        </div>
      </div>
    </div>
  );
}

function PullIndicator({ pull, threshold, refreshing }) {
  const progress = Math.min(1, pull / threshold);
  const opacity = Math.min(1, pull / 20);
  const rotate = refreshing ? 'spin' : `${progress * 360}deg`;
  return (
    <div
      className={`ptr-indicator ${refreshing ? 'is-refreshing' : ''}`}
      style={{
        opacity,
        transform: `translateY(${-48 + pull * 0.55}px) rotate(${refreshing ? 0 : progress * 360}deg)`,
      }}
      aria-hidden="true">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="23 4 23 10 17 10"/>
        <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"/>
      </svg>
    </div>
  );
}

function MatchesSkeleton() {
  return (
    <div className="matches-list">
      {[0, 1, 2].map(i => (
        <div key={i} className="match-item match-skeleton">
          <div className="match-item-thumb match-skel-block" />
          <div className="match-item-body">
            <div className="match-skel-line match-skel-line-sm" />
            <div className="match-skel-line match-skel-line-lg" />
            <div className="match-skel-line match-skel-line-md" />
          </div>
        </div>
      ))}
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
