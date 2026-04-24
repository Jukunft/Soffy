import Link from 'next/link';
import { notFound } from 'next/navigation';
import { SoffyAPI } from '@/lib/api';
import { CATEGORIES, TASTES } from '@/lib/data';

export async function generateMetadata({ params }) {
  const { deal } = await SoffyAPI.getDeal({ id: params.id });
  if (!deal) return { title: 'Oferta no encontrada · Soffy' };

  const title = `-${deal.discount} en ${deal.brand} · Soffy`;
  const description = `${deal.title.es} · Termina en ${deal.endsIn}. Match solo por 24h.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'es_CL',
      url: `/deal/${deal.id}`,
      images: [{ url: '/assets/soffy-brand.png', width: 1058, height: 299, alt: 'Soffy' }],
    },
    twitter: { card: 'summary_large_image', title, description },
  };
}

export default async function DealPage({ params }) {
  const { deal } = await SoffyAPI.getDeal({ id: params.id });
  if (!deal) notFound();

  const cat = CATEGORIES.find(c => c.id === deal.cat);
  const tastes = deal.tastes
    .map(tid => Object.values(TASTES).flat().find(t => t.id === tid))
    .filter(Boolean);

  return (
    <main className="deal-page">
      <div className="deal-page-hero" style={{
        background: `linear-gradient(135deg, ${deal.grad[0]}, ${deal.grad[1]})`,
      }}>
        <Link href="/" className="deal-page-back" aria-label="Volver">←</Link>
        <div className="deal-page-emoji">{cat?.emoji || '🎁'}</div>
        <div className="deal-page-discount">-{deal.discount}</div>
      </div>

      <section className="deal-page-body">
        <div className="deal-page-brand-row">
          <span className="deal-page-brand">{deal.brand.toUpperCase()}</span>
          {cat && <span className="deal-page-cat">{cat.name.es}</span>}
        </div>

        <h1 className="deal-page-title">{deal.title.es}</h1>

        <div className="deal-page-price">
          <span className="deal-page-old">{deal.oldPrice}</span>
          <span className="deal-page-new">{deal.newPrice}</span>
        </div>

        <div className="deal-page-meta">
          <span className="deal-page-meta-item">⏱ Termina en {deal.endsIn}</span>
          {deal.distance > 0 && <span className="deal-page-meta-item">📍 {deal.distance} km</span>}
          {deal.distance === 0 && <span className="deal-page-meta-item">🌐 Online</span>}
        </div>

        {tastes.length > 0 && (
          <div className="deal-page-tags">
            {tastes.map(t => <span key={t.id} className="chip">{t.name.es}</span>)}
          </div>
        )}

        <div className="deal-page-cta-row">
          <Link href={`/app?deal=${deal.id}`} className="btn btn-primary btn-lg btn-block">
            Abrir en Soffy →
          </Link>
          <Link href="/" className="btn btn-ghost btn-block">
            Ver más ofertas
          </Link>
        </div>

        <p className="deal-page-fine">
          Los matches duran 24h. Descubrí más descuentos swipeando en Soffy.
        </p>
      </section>
    </main>
  );
}
