'use client';
import { useState } from 'react';
import Icon from '@/components/Icon';
import { useT } from '@/lib/i18n';
import { SoffyAPI } from '@/lib/api';
import { track, identify, EVENTS } from '@/lib/analytics';

const ZONES = [
  { id: 'cl-scl',  label: { es: 'Santiago',      en: 'Santiago' },      flag: '🇨🇱' },
  { id: 'mx-cdmx', label: { es: 'CDMX',          en: 'Mexico City' },   flag: '🇲🇽' },
  { id: 'mx-gdl',  label: { es: 'Guadalajara',   en: 'Guadalajara' },   flag: '🇲🇽' },
  { id: 'mx-mty',  label: { es: 'Monterrey',     en: 'Monterrey' },     flag: '🇲🇽' },
  { id: 'ar-bue',  label: { es: 'Buenos Aires',  en: 'Buenos Aires' },  flag: '🇦🇷' },
];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function AuthScreen({ lang, initialMode = 'signup', onSuccess, onBack }) {
  const t = useT(lang);
  const [mode, setMode] = useState(initialMode);
  const [email, setEmail] = useState('');
  const [zone, setZone] = useState('cl-scl');
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(null);
    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmed)) { setErr('email'); return; }
    setLoading(true);
    try {
      if (mode === 'signup') {
        track(EVENTS.SIGNUP_START, { zone });
        const { profile } = await SoffyAPI.signup({ email: trimmed, zone });
        identify(trimmed, { zone });
        track(EVENTS.SIGNUP_COMPLETE, { zone });
        onSuccess(profile, 'signup');
      } else {
        const { profile } = await SoffyAPI.getProfile();
        if (profile?.email && profile.email.toLowerCase() === trimmed) {
          identify(trimmed, { zone: profile.zone, plan: profile.plan });
          track(EVENTS.LOGIN);
          onSuccess(profile, 'login');
        } else {
          setErr('notfound');
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const isSignup = mode === 'signup';
  const title = isSignup ? t('auth_signup_title') : t('auth_login_title');
  const sub   = isSignup ? t('auth_signup_sub')   : t('auth_login_sub');
  const cta   = isSignup ? t('auth_submit_signup') : t('auth_submit_login');

  return (
    <div className="auth">
      <div className="auth-topbar">
        <button className="onb-back" onClick={onBack} aria-label={t('back')}>
          <Icon name="chevronLeft" size={18} />
        </button>
        <img src="/assets/soffy-logo.png" alt="Soffy" className="auth-logo" />
      </div>

      <div className="auth-tabs">
        <button
          className={`auth-tab ${isSignup ? 'active' : ''}`}
          onClick={() => { setMode('signup'); setErr(null); }}>
          {t('auth_tab_signup')}
        </button>
        <button
          className={`auth-tab ${!isSignup ? 'active' : ''}`}
          onClick={() => { setMode('login'); setErr(null); }}>
          {t('auth_tab_login')}
        </button>
      </div>

      <div className="auth-header">
        <h2 className="auth-title">{title}</h2>
        <p className="auth-sub">{sub}</p>
      </div>

      <form className="auth-form" onSubmit={submit} noValidate>
        <label className="auth-field">
          <span className="pref-label" style={{ margin: 0 }}>{t('auth_email')}</span>
          <input
            type="email"
            autoComplete="email"
            inputMode="email"
            autoCapitalize="none"
            spellCheck={false}
            placeholder={t('auth_email_ph')}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={`auth-input ${err === 'email' ? 'has-error' : ''}`}
          />
        </label>

        {isSignup && (
          <div className="auth-field">
            <span className="pref-label" style={{ margin: 0 }}>{t('auth_zone')}</span>
            <div className="auth-zones">
              {ZONES.map(z => (
                <button
                  type="button"
                  key={z.id}
                  className={`auth-zone-chip ${zone === z.id ? 'selected' : ''}`}
                  onClick={() => setZone(z.id)}>
                  <span className="auth-zone-flag">{z.flag}</span>
                  {z.label[lang]}
                </button>
              ))}
            </div>
          </div>
        )}

        {err && (
          <div className="auth-error">
            {err === 'email' ? t('auth_err_email') : t('auth_err_notfound')}
          </div>
        )}

        <button type="submit" className="btn btn-primary btn-lg btn-block" disabled={loading}>
          {loading ? '…' : cta}
          {!loading && <Icon name="arrowRight" size={16} />}
        </button>

        <p className="auth-terms">{t('auth_terms')}</p>
      </form>
    </div>
  );
}
