// Helpers de compartir — share API nativa con fallback a clipboard.

const isClient = () => typeof window !== 'undefined';

export function dealUrl(dealId, base) {
  if (!isClient()) return `/deal/${dealId}`;
  const origin = base || window.location.origin;
  return `${origin}/deal/${dealId}`;
}

export async function shareDeal({ deal, lang = 'es' }) {
  if (!isClient()) return { ok: false };
  const url = dealUrl(deal.id);
  const title = `-${deal.discount} en ${deal.brand}`;
  const text = lang === 'es'
    ? `${deal.title.es} — ${deal.discount} off en ${deal.brand}. Matché en Soffy.`
    : `${deal.title.en} — ${deal.discount} off at ${deal.brand}. Matched on Soffy.`;

  if (navigator.share) {
    try {
      await navigator.share({ title, text, url });
      return { ok: true, method: 'native' };
    } catch (e) {
      if (e?.name === 'AbortError') return { ok: false, method: 'native', aborted: true };
      // fallthrough a clipboard
    }
  }
  return copyToClipboard(url).then(() => ({ ok: true, method: 'clipboard' }));
}

export async function copyToClipboard(text) {
  if (!isClient()) return false;
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
    // fallback execCommand
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** Genera código placeholder mientras el backend no devuelve uno real. */
export function couponCode(deal) {
  const brand = (deal?.brand || 'SOFFY').replace(/[^A-Z0-9]/gi, '').toUpperCase().slice(0, 6);
  const disc = (deal?.discount || '10').replace(/\D/g, '');
  return `${brand}${disc}`;
}
