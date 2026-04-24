'use client';
import { useEffect, useMemo, useState } from 'react';
import Icon from '@/components/Icon';
import { useT } from '@/lib/i18n';
import { SoffyAPI } from '@/lib/api';
import { track, EVENTS } from '@/lib/analytics';

const PLANS = {
  month: { price: '$3.99', period: 'pw_period_month', raw: 3.99 },
  year:  { price: '$29.99', period: 'pw_period_year', raw: 29.99 },
};
const CAP = 20;

export default function PaywallScreen({ lang, onClose, onActivated, reason = null }) {
  const t = useT(lang);
  const [billing, setBilling] = useState('year');
  const [activating, setActivating] = useState(false);
  const [success, setSuccess] = useState(false);

  useEffect(() => { track(EVENTS.PAYWALL_VIEW, { reason }); }, [reason]);

  const plan = PLANS[billing];
  const monthlyEquiv = billing === 'year'
    ? `$${(PLANS.year.raw / 12).toFixed(2)}/${t('pw_period_month')}`
    : null;

  const activate = () => {
    setActivating(true);
    track(EVENTS.PAYWALL_ACTIVATE, { billing, reason });
    SoffyAPI.updateProfile({ plan: 'premium', planBilling: billing })
      .then(() => {
        setActivating(false);
        setSuccess(true);
      });
  };

  const handleClose = () => {
    track(EVENTS.PAYWALL_DISMISS, { reason });
    onClose && onClose();
  };

  const confetti = useMemo(() => {
    if (!success) return [];
    const colors = ['#ff6b1f', '#1d4ed8', '#22c55e', '#fbbf24', '#fff'];
    return Array.from({ length: 40 }, () => ({
      left: Math.random() * 100,
      delay: Math.random() * 0.8,
      color: colors[Math.floor(Math.random() * colors.length)],
      rot: Math.random() * 360,
    }));
  }, [success]);

  if (success) {
    return (
      <div className="paywall paywall-success">
        <div className="match-confetti">
          {confetti.map((c, i) => (
            <div key={i} className="confetti-piece" style={{
              left: `${c.left}%`, top: -20, background: c.color,
              animationDelay: `${c.delay}s`, transform: `rotate(${c.rot}deg)`,
            }} />
          ))}
        </div>
        <div className="pw-success-badge"><Icon name="sparkles" size={36} stroke={2} /></div>
        <h1 className="match-title" style={{ fontSize: 40 }}>{t('pw_success_title')}</h1>
        <p className="match-sub">{t('pw_success_sub')}</p>
        <button
          className="btn btn-primary btn-lg btn-block"
          style={{ maxWidth: 280, marginTop: 12 }}
          onClick={() => onActivated && onActivated()}>
          {t('pw_success_cta')} <Icon name="arrowRight" size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="paywall">
      <div className="paywall-bg-glow" />

      <button className="paywall-close" onClick={handleClose} aria-label={t('back')}>
        <Icon name="x" size={20} stroke={2.4} />
      </button>

      <div className="paywall-header">
        <p className="eyebrow">{t('pw_eyebrow')}</p>
        <h1 className="paywall-title">
          {t('pw_title')} <span className="accent">{t('pw_title_accent')}</span>
        </h1>
        <p className="paywall-sub">
          {reason === 'daily_cap'
            ? t('cap_sub', { n: CAP })
            : t('pw_sub')}
        </p>
      </div>

      <div className="paywall-features">
        <FeatureRow icon="refresh" title={t('pw_feat_unlimited')} sub={t('pw_feat_unlimited_sub', { n: CAP })} />
        <FeatureRow icon="mapPin"  title={t('pw_feat_passport')}  sub={t('pw_feat_passport_sub')} />
        <FeatureRow icon="bolt"    title={t('pw_feat_priority')}  sub={t('pw_feat_priority_sub')} />
        <FeatureRow icon="check"   title={t('pw_feat_noads')}     sub={t('pw_feat_noads_sub')} />
      </div>

      <div className="paywall-billing">
        <button
          className={`paywall-billing-opt ${billing === 'year' ? 'selected' : ''}`}
          onClick={() => setBilling('year')}>
          <div className="paywall-billing-label">
            {t('pw_billed_year')}
            <span className="paywall-save-pill">{t('pw_save_year')}</span>
          </div>
          <div className="paywall-billing-price">
            {PLANS.year.price}<span className="paywall-billing-period">/{t(PLANS.year.period)}</span>
          </div>
          <div className="paywall-billing-hint">{monthlyEquiv && billing === 'year' ? monthlyEquiv : ' '}</div>
        </button>
        <button
          className={`paywall-billing-opt ${billing === 'month' ? 'selected' : ''}`}
          onClick={() => setBilling('month')}>
          <div className="paywall-billing-label">{t('pw_billed_month')}</div>
          <div className="paywall-billing-price">
            {PLANS.month.price}<span className="paywall-billing-period">/{t(PLANS.month.period)}</span>
          </div>
          <div className="paywall-billing-hint">{' '}</div>
        </button>
      </div>

      <div className="paywall-footer">
        <button
          className="btn btn-primary btn-lg btn-block"
          onClick={activate}
          disabled={activating}>
          {activating ? '…' : (
            <>{t('pw_cta_activate')} · {plan.price}/{t(plan.period)}</>
          )}
        </button>
        <button className="paywall-ghost-btn" onClick={handleClose}>
          {t('pw_cta_continue')}
        </button>
        <p className="paywall-legal">{t('pw_legal')}</p>
      </div>
    </div>
  );
}

function FeatureRow({ icon, title, sub }) {
  return (
    <div className="paywall-feat">
      <div className="paywall-feat-icon">
        <Icon name={icon} size={16} stroke={2} />
      </div>
      <div className="paywall-feat-body">
        <div className="paywall-feat-title">{title}</div>
        <div className="paywall-feat-sub">{sub}</div>
      </div>
    </div>
  );
}
