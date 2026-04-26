'use client';
import { useEffect, useState } from 'react';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const SUGGESTED = [
  // accounts cacheados — placeholder hasta que Supabase OAuth real esté
];

/**
 * Mock del Google account picker. Hasta que Gonzo conecte Supabase Auth con
 * provider Google, este modal simula el "Elegí una cuenta" que veríamos en producción.
 */
export default function GoogleAccountPicker({ open, onPick, onClose }) {
  const [email, setEmail] = useState('');
  const [err, setErr] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = '';
      document.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  if (!open) return null;

  const submit = (e) => {
    e.preventDefault();
    const trimmed = email.trim().toLowerCase();
    if (!EMAIL_RE.test(trimmed)) { setErr(true); return; }
    onPick(trimmed);
  };

  return (
    <div className="drawer-backdrop" onClick={onClose}>
      <div className="goog-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true">
        <div className="goog-header">
          <GoogleLogo />
          <p className="goog-host">Iniciar sesión en Soffy</p>
        </div>

        <h3 className="goog-title">Elegí una cuenta</h3>
        <p className="goog-sub">para continuar a soffy.app</p>

        <form className="goog-form" onSubmit={submit}>
          {SUGGESTED.length > 0 && (
            <ul className="goog-account-list">
              {SUGGESTED.map(acc => (
                <li key={acc.email}>
                  <button type="button" className="goog-account" onClick={() => onPick(acc.email)}>
                    <span className="goog-avatar">{acc.email[0].toUpperCase()}</span>
                    <span className="goog-account-meta">
                      <span className="goog-account-name">{acc.name || acc.email.split('@')[0]}</span>
                      <span className="goog-account-email">{acc.email}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <label className="goog-field">
            <span className="goog-label">Correo electrónico</span>
            <input
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="tu@gmail.com"
              value={email}
              onChange={(e) => { setEmail(e.target.value); setErr(false); }}
              className={`goog-input ${err ? 'has-error' : ''}`}
            />
            {err && <span className="goog-err">Ingresá un correo válido</span>}
          </label>

          <div className="goog-actions">
            <button type="button" className="goog-btn-secondary" onClick={onClose}>
              Cancelar
            </button>
            <button type="submit" className="goog-btn-primary">
              Siguiente
            </button>
          </div>
        </form>

        <p className="goog-disclaimer">
          Demo · en producción verás la pantalla real de Google con tus cuentas guardadas.
        </p>
      </div>
    </div>
  );
}

function GoogleLogo() {
  return (
    <svg width="22" height="22" viewBox="0 0 18 18" aria-hidden="true">
      <path fill="#4285F4" d="M17.64 9.2c0-.64-.06-1.25-.16-1.84H9v3.48h4.84a4.14 4.14 0 0 1-1.79 2.71v2.26h2.91c1.7-1.57 2.68-3.88 2.68-6.61z"/>
      <path fill="#34A853" d="M9 18c2.43 0 4.47-.81 5.96-2.18l-2.91-2.26c-.81.54-1.84.86-3.05.86-2.34 0-4.32-1.58-5.03-3.71H.96v2.33A9 9 0 0 0 9 18z"/>
      <path fill="#FBBC05" d="M3.97 10.71A5.41 5.41 0 0 1 3.68 9c0-.59.1-1.16.29-1.71V4.96H.96A8.99 8.99 0 0 0 0 9c0 1.45.35 2.83.96 4.04l3.01-2.33z"/>
      <path fill="#EA4335" d="M9 3.58c1.32 0 2.5.45 3.44 1.34l2.58-2.58A8.97 8.97 0 0 0 9 0 9 9 0 0 0 .96 4.96L3.97 7.29C4.68 5.16 6.66 3.58 9 3.58z"/>
    </svg>
  );
}
