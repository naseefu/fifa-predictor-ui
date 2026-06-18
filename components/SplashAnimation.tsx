'use client';
import { useEffect, useState } from 'react';

export default function SplashAnimation() {
  const [show, setShow] = useState(true);

  useEffect(() => {
    // If the inline script didn't add the class, we shouldn't show at all
    if (!document.documentElement.classList.contains('show-splash')) {
      setShow(false);
      return;
    }

    // Ensure cleanup of the class after animation completes (2.5s)
    const timer = setTimeout(() => {
      setShow(false);
      document.documentElement.classList.remove('show-splash');
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  if (!show) return null;

  // We render the HTML always so the server includes it in the initial payload.
  // The inline <style> tag guarantees it's hidden immediately even before globals.css loads (fixes dev-mode flashing).
  return (
    <>
      <style suppressHydrationWarning>{`
        .splash-screen { display: none; }
        .show-splash .splash-screen { display: flex !important; }
      `}</style>
      <div className="splash-screen">
        <div className="splash-ball">⚽</div>
        <div className="splash-text">
          THE FINAL <span>THIRD</span>
        </div>
      </div>
    </>
  );
}
