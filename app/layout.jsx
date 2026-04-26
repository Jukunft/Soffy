import './globals.css';

export const metadata = {
  title: 'Soffy — Swipe to save',
  description: 'Soffy — Swipe to save. Descubre descuentos que te importan. Matches con timer 24h en LATAM.',
  manifest: '/manifest.webmanifest',
  icons: {
    icon: [
      { url: '/favicon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: { url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' },
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Soffy',
    startupImage: ['/apple-touch-icon.png'],
  },
  other: {
    'mobile-web-app-capable': 'yes',
    'format-detection': 'telephone=no',
  },
};

export const viewport = {
  themeColor: '#16294a',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <div id="root">{children}</div>
      </body>
    </html>
  );
}
