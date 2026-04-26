'use client';
import { useEffect, useState } from 'react';
import { SoffyAPI } from '@/lib/api';

/**
 * 3 estados según localStorage:
 *  - registrado + onboarding hecho → "Entrar" → directo al feed
 *  - registrado a medio onboarding   → "Continuar registro" → onboarding
 *  - sin sesión                       → "Registrarte" → auth signup
 */
export default function LandingCTAs() {
  const [state, setState] = useState({ ready: false, status: 'new' });

  useEffect(() => {
    let status = 'new';
    if (SoffyAPI.hasSession()) {
      try {
        const prefs = JSON.parse(localStorage.getItem('soffy_prefs') || '{}');
        status = (prefs.cats?.length || 0) >= 3 ? 'returning' : 'midway';
      } catch { status = 'midway'; }
    }
    setState({ ready: true, status });
  }, []);

  // Render pre-hidratación: muestra "Registrarte" (caso por defecto first-time visitor)
  if (!state.ready) {
    return (
      <>
        <div className="landing-cta-row">
          <a className="btn btn-primary btn-lg btn-block" href="/app?mode=signup">
            Registrarte →
          </a>
        </div>
        <p className="landing-microcopy">Gratis. Sin tarjeta. 2 minutos.</p>
      </>
    );
  }

  if (state.status === 'returning') {
    return (
      <>
        <div className="landing-cta-row">
          <a className="btn btn-primary btn-lg btn-block" href="/app?go=feed">
            Entrar →
          </a>
          <a className="btn btn-ghost btn-block" href="/app?mode=login">
            No soy yo, cambiar cuenta
          </a>
        </div>
        <p className="landing-microcopy">Tu cuenta está lista. Volvé a swipear.</p>
      </>
    );
  }

  if (state.status === 'midway') {
    return (
      <>
        <div className="landing-cta-row">
          <a className="btn btn-primary btn-lg btn-block" href="/app">
            Continuar registro →
          </a>
          <a className="btn btn-ghost btn-block" href="/app?mode=signup">
            Empezar de cero
          </a>
        </div>
        <p className="landing-microcopy">Te falta elegir tus gustos para arrancar.</p>
      </>
    );
  }

  return (
    <>
      <div className="landing-cta-row">
        <a className="btn btn-primary btn-lg btn-block" href="/app?mode=signup">
          Registrarte →
        </a>
      </div>
      <p className="landing-microcopy">Gratis. Sin tarjeta. 2 minutos.</p>
    </>
  );
}
