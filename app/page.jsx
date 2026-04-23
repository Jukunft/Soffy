import Link from 'next/link';

export const metadata = {
  title: 'Soffy — Swipe to save · Descuentos que te importan',
  description: 'Descubre descuentos que realmente te importan. Desliza los que amas, ignora el resto. Matches con timer 24h. LATAM.',
  openGraph: {
    title: 'Soffy — Swipe to save',
    description: 'Descuentos curados por IA en formato swipe. Desliza. Ahorra. Repite.',
    images: [{ url: '/assets/soffy-brand.png', width: 1058, height: 299, alt: 'Soffy' }],
    type: 'website',
    locale: 'es_CL',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Soffy — Swipe to save',
    description: 'Descuentos curados por IA en formato swipe.',
    images: ['/assets/soffy-brand.png'],
  },
};

const FEATURES = [
  { emoji: '🎯', title: 'Personalizado', body: 'IA que aprende qué te importa. Cuanto más swipeás, mejor se pone.' },
  { emoji: '⏱️', title: '24h para usarlo', body: 'Cada match dura un día. Sin urgencia, sin oferta.' },
  { emoji: '🌎', title: 'LATAM entero', body: 'Chile, México, Argentina y sumando. Passport con LATAM Pass.' },
  { emoji: '🚫', title: 'Sin spam', body: 'Solo cupones verificados y link directo al partner. Nada de ads invasivos.' },
];

const STEPS = [
  { n: '01', title: 'Elegí tus gustos', body: 'En menos de un minuto. Categorías + subcategorías que se adaptan.' },
  { n: '02', title: 'Swipea tu mazo', body: 'Derecha te gusta, izquierda paso. El algoritmo se afina con cada swipe.' },
  { n: '03', title: 'Usá antes de las 24h', body: 'Código o link directo. Sin intermediarios ni redirects raros.' },
];

export default function Landing() {
  return (
    <main className="landing">
      {/* HERO */}
      <section className="landing-hero">
        <div className="landing-hero-blobs">
          <div className="blob blob-1" />
          <div className="blob blob-2" />
        </div>

        <div className="landing-hero-content">
          <img src="/assets/soffy-brand.png" alt="Soffy" className="landing-brand" />
          <p className="welcome-tagline"><span>SWIPE TO SAVE</span></p>

          <h1 className="display display-xl landing-h1">
            Desliza. <span className="accent">Ahorra.</span> Repite.
          </h1>
          <p className="landing-sub">
            Descubre descuentos que realmente te importan. Elige tus gustos,
            desliza a la derecha los que amas, ignora el resto.
          </p>

          <div className="landing-cta-row">
            <Link href="/app" className="btn btn-primary btn-lg btn-block">
              Empezar gratis →
            </Link>
            <Link href="/app" className="btn btn-ghost btn-block">
              Ya tengo cuenta
            </Link>
          </div>

          <p className="landing-microcopy">
            Gratis. Sin tarjeta. 2 minutos.
          </p>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="landing-section">
        <p className="eyebrow">CÓMO FUNCIONA</p>
        <h2 className="landing-h2">Tres pasos, sin vueltas.</h2>
        <ol className="landing-steps">
          {STEPS.map(s => (
            <li key={s.n} className="landing-step">
              <span className="landing-step-n">{s.n}</span>
              <div>
                <div className="landing-step-title">{s.title}</div>
                <div className="landing-step-body">{s.body}</div>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* FEATURES */}
      <section className="landing-section">
        <p className="eyebrow">POR QUÉ SOFFY</p>
        <h2 className="landing-h2">No es otra app de cupones.</h2>
        <div className="landing-features">
          {FEATURES.map(f => (
            <div key={f.title} className="landing-feature">
              <div className="landing-feature-emoji">{f.emoji}</div>
              <div className="landing-feature-title">{f.title}</div>
              <div className="landing-feature-body">{f.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* PLANS TEASER */}
      <section className="landing-section">
        <p className="eyebrow">PLANES</p>
        <h2 className="landing-h2">Gratis para siempre. Pro si querés más.</h2>

        <div className="landing-plans">
          <div className="landing-plan">
            <div className="landing-plan-name">Free</div>
            <div className="landing-plan-price">$0</div>
            <ul className="landing-plan-features">
              <li>20 swipes/día</li>
              <li>Descuentos en tu ciudad</li>
              <li>Matches con timer 24h</li>
            </ul>
          </div>
          <div className="landing-plan is-featured">
            <div className="landing-plan-badge">LATAM PASS</div>
            <div className="landing-plan-name">Pro</div>
            <div className="landing-plan-price">$2.50<span>/mes*</span></div>
            <ul className="landing-plan-features">
              <li>Swipes ilimitados</li>
              <li>Passport: toda LATAM</li>
              <li>Priority matches</li>
              <li>Cero ads</li>
            </ul>
            <div className="landing-plan-hint">* Anual — $29.99/año</div>
          </div>
        </div>

        <Link href="/app" className="btn btn-primary btn-lg landing-bottom-cta">
          Empezar ahora →
        </Link>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <img src="/assets/soffy-logo.png" alt="Soffy" className="landing-footer-logo" />
        <p className="landing-footer-copy">
          Soffy · Swipe to save · LATAM <br />
          <span>© 2026 — Hecho para la región.</span>
        </p>
        <div className="landing-footer-links">
          <Link href="/app">App</Link>
          <a href="mailto:hola@soffy.app">Contacto</a>
        </div>
      </footer>
    </main>
  );
}
