export default function manifest() {
  return {
    name: 'Soffy — Swipe to save',
    short_name: 'Soffy',
    description: 'Descuentos curados por IA en formato swipe. Matches con timer 24h en toda LATAM.',
    start_url: '/app',
    scope: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#16294a',
    theme_color: '#16294a',
    lang: 'es',
    categories: ['shopping', 'lifestyle', 'finance'],
    icons: [
      {
        src: '/icons/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
    shortcuts: [
      {
        name: 'Mis matches',
        short_name: 'Matches',
        description: 'Cupones activos con countdown 24h',
        url: '/app',
      },
    ],
  };
}
