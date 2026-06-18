import type { Metadata } from 'next';
import './globals.css';

import SplashAnimation from '@/components/SplashAnimation';

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
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                if (!sessionStorage.getItem('splash_played')) {
                  const path = window.location.pathname;
                  if (path === '/' || path === '/login' || path === '/dashboard') {
                    document.documentElement.classList.add('show-splash');
                  }
                  sessionStorage.setItem('splash_played', 'true');
                }
              } catch (e) {}
            `,
          }}
        />
      </head>
      <body>
        <SplashAnimation />
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
