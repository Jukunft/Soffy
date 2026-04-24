'use client';
import { useEffect, useState } from 'react';
import Icon from '@/components/Icon';
import { useT } from '@/lib/i18n';
import { CATEGORIES } from '@/lib/data';
import { SoffyAPI } from '@/lib/api';
import { track, EVENTS } from '@/lib/analytics';

export default function MatchesScreen({ lang, onBack }) {
  const t = useT(lang);
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [, setTick] = useState(0);

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
    SoffyAPI.markMatchUsed(m.id).then(() => {
      track(EVENTS.COUPON_USED, { dealId: m.dealId });
      load();
    });
    // TODO: abrir WebView/deep link al sitio del partner (SKILL §4)
  };
  const removeMatch = (m) => {
    track(EVENTS.MATCH_DELETED, { dealId: m.dealId });
    SoffyAPI.deleteMatch(m.id).then(load);
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

      <div className="matches-body">
        {loading ? (
          <div className="matches-empty">
            <p className="matches-empty-sub">{lang === 'es' ? 'Cargando…' : 'Loading…'}</p>
          </div>
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
