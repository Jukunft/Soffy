'use client';
import { useState } from 'react';
import Icon from '@/components/Icon';
import { useT } from '@/lib/i18n';
import { SoffyAPI } from '@/lib/api';
import { track, identify, EVENTS } from '@/lib/analytics';
import GoogleAccountPicker from '@/components/GoogleAccountPicker';
import { COUNTRIES, DEFAULT_COUNTRY } from '@/lib/countries';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[+]?[0-9\s-]{8,}$/;
const MIN_PASS = 6;

export default function AuthScreen({ lang, initialMode = 'signup', onSuccess, onBack }) {
  const t = useT(lang);
  const [mode, setMode] = useState(initialMode);
  const [method, setMethod] = useState('email'); // 'email' | 'phone'
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [zone, setZone] = useState(DEFAULT_COUNTRY);
  const [err, setErr] = useState(null);
  const [loading, setLoading] = useState(false);
  const [googleOpen, setGoogleOpen] = useState(false);

  const isSignup = mode === 'signup';

  const finishAuth = (profile, signupOrLogin, identifier) => {
    identify(identifier, { zone: profile.zone, plan: profile.plan });
    track(signupOrLogin === 'signup' ? EVENTS.SIGNUP_COMPLETE : EVENTS.LOGIN, { method, zone });
    onSuccess(profile, signupOrLogin);
  };

  const openGooglePicker = () => {
    setErr(null);
    setGoogleOpen(true);
  };

  const submitGoogleWith = async (gmail) => {
    setGoogleOpen(false);
    setLoading(true);
    track(EVENTS.SIGNUP_START, { method: 'google', zone });
    try {
      const { profile } = await SoffyAPI.signup({ email: gmail, zone, method: 'google' });
      finishAuth(profile, isSignup ? 'signup' : 'login', gmail);
    } finally { setLoading(false); }
  };

  const submitForm = async (e) => {
    e.preventDefault();
    setErr(null);

    if (method === 'email') {
      const trimmed = email.trim().toLowerCase();
      if (!EMAIL_RE.test(trimmed)) { setErr('email'); return; }
      if (password.length < MIN_PASS)  { setErr('password'); return; }
      setLoading(true);
      try {
        if (isSignup) {
          track(EVENTS.SIGNUP_START, { method: 'email', zone });
          const { profile } = await SoffyAPI.signup({ email: trimmed, password, zone, method: 'email' });
          finishAuth(profile, 'signup', trimmed);
        } else {
          const { profile } = await SoffyAPI.getProfile();
          if (profile?.email && profile.email.toLowerCase() === trimmed) {
            finishAuth(profile, 'login', trimmed);
          } else { setErr('notfound'); }
        }
      } finally { setLoading(false); }
      return;
    }

    if (method === 'phone') {
      const cleanPhone = phone.replace(/\s/g, '');
      if (!PHONE_RE.test(cleanPhone)) { setErr('phone'); return; }
      if (password.length < MIN_PASS) { setErr('password'); return; }
      setLoading(true);
      try {
        if (isSignup) {
          track(EVENTS.SIGNUP_START, { method: 'phone', zone });
          const { profile } = await SoffyAPI.signup({ phone: cleanPhone, password, zone, method: 'phone' });
          finishAuth(profile, 'signup', cleanPhone);
        } else {
          const { profile } = await SoffyAPI.getProfile();
          if (profile?.phone && profile.phone === cleanPhone) {
            finishAuth(profile, 'login', cleanPhone);
          } else { setErr('notfound'); }
        }
      } finally { setLoading(false); }
    }
  };

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

      <div className="auth-tabs" role="tablist" aria-label={t('auth_tab_signup') + ' / ' + t('auth_tab_login')}>
        <button
          role="tab"
          aria-selected={isSignup}
          className={`auth-tab ${isSignup ? 'active' : ''}`}
          onClick={() => { setMode('signup'); setErr(null); }}>
          {t('auth_tab_signup')}
        </button>
        <button
          role="tab"
          aria-selected={!isSignup}
          className={`auth-tab ${!isSignup ? 'active' : ''}`}
          onClick={() => { setMode('login'); setErr(null); }}>
          {t('auth_tab_login')}
        </button>
      </div>

      <div className="auth-header">
        <h2 className="auth-title">{title}</h2>
        <p className="auth-sub">{sub}</p>
      </div>

      {/* Botón Google primero — UX estándar */}
      <button
        type="button"
        className="btn auth-google-btn btn-block"
        onClick={openGooglePicker}
        disabled={loading}>
        <GoogleIcon />
        {t('auth_method_google')}
      </button>

      <GoogleAccountPicker
        open={googleOpen}
        onPick={submitGoogleWith}
        onClose={() => setGoogleOpen(false)}
      />

      <div className="auth-divider"><span>{t('auth_or')}</span></div>

      <div className="auth-method-toggle" role="group" aria-label="Método">
        <button
          type="button"
          aria-pressed={method === 'email'}
          className={`auth-method-tab ${method === 'email' ? 'active' : ''}`}
          onClick={() => { setMethod('email'); setErr(null); }}>
          {t('auth_email')}
        </button>
        <button
          type="button"
          aria-pressed={method === 'phone'}
          className={`auth-method-tab ${method === 'phone' ? 'active' : ''}`}
          onClick={() => { setMethod('phone'); setErr(null); }}>
          {t('auth_phone')}
        </button>
      </div>

      <form className="auth-form" onSubmit={submitForm} noValidate>
        {method === 'email' ? (
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
        ) : (
          <label className="auth-field">
            <span className="pref-label" style={{ margin: 0 }}>{t('auth_phone')}</span>
            <input
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              placeholder={t('auth_phone_ph')}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={`auth-input ${err === 'phone' ? 'has-error' : ''}`}
            />
          </label>
        )}

        <label className="auth-field">
          <span className="pref-label" style={{ margin: 0 }}>{t('auth_password')}</span>
          <input
            type="password"
            autoComplete={isSignup ? 'new-password' : 'current-password'}
            placeholder={t('auth_password_ph')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={`auth-input ${err === 'password' ? 'has-error' : ''}`}
          />
        </label>

        {isSignup && (
          <label className="auth-field">
            <span className="pref-label" style={{ margin: 0 }}>{lang === 'es' ? 'País' : 'Country'}</span>
            <select
              value={zone}
              onChange={(e) => setZone(e.target.value)}
              className="auth-input auth-select">
              {COUNTRIES.map(c => (
                <option key={c.id} value={c.id}>
                  {c.flag}  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}

        {err && (
          <div className="auth-error" role="alert" aria-live="polite">
            {err === 'email'    && t('auth_err_email')}
            {err === 'phone'    && t('auth_err_phone')}
            {err === 'password' && t('auth_err_password')}
            {err === 'notfound' && t('auth_err_notfound')}
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

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.79 2.71v2.26h2.91c1.7-1.57 2.68-3.88 2.68-6.61z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.97 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.16.29-1.71V4.96H.96A8.99 8.99 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3.01-2.33z"/>
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.34l2.58-2.58A8.97 8.97 0 0 0 9 0 9 9 0 0 0 .96 4.96L3.97 7.29C4.68 5.16 6.66 3.58 9 3.58z"/>
    </svg>
  );
}
