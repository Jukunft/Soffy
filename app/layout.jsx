import './globals.css';

export const metadata = {
  title: 'Soffy — Swipe to save',
  description: 'Soffy — Swipe to save. Descubre descuentos que te importan.',
  icons: { icon: '/assets/soffy-logo.png', apple: '/assets/soffy-logo.png' },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Soffy',
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
