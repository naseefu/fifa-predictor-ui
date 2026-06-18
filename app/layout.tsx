import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'The Final Third',
  description: 'Predict match scores, earn points, and compete on the global leaderboard.',
  manifest: '/manifest.json',
  themeColor: '#121212',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'TFT Predictor',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/favicon.ico" />
      </head>
      <body>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/sw.js').then(
                    function(registration) {
                      console.log('ServiceWorker registration successful with scope: ', registration.scope);
                    },
                    function(err) {
                      console.log('ServiceWorker registration failed: ', err);
                    }
                  );
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
