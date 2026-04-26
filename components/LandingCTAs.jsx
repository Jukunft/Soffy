'use client';
import { useEffect, useState } from 'react';
import { SoffyAPI } from '@/lib/api';

/**
 * Renderiza el botón correcto según si el user ya tiene sesión local:
 *  - sí → "Entrar" → /app?go=feed (skip welcome)
 *  - no → "Registrarte" → /app?mode=signup (auth screen)
 */
export default function LandingCTAs() {
  const [state, setState] = useState({ ready: false, hasSession: false });

  useEffect(() => {
    setState({ ready: true, hasSession: SoffyAPI.hasSession() });
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

  if (state.hasSession) {
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
