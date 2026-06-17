import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'The Final Third',
  description: 'Predict match scores, earn points, and compete on the global leaderboard.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
