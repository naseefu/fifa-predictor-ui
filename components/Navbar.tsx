'use client';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getUser, logout, isAdmin } from '@/lib/auth';

const userLinks = [
  { href: '/dashboard', label: 'Matches', icon: '⚽' },
  { href: '/history', label: 'History', icon: '⏱' },
  { href: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
  { href: '/stats', label: 'My Stats', icon: '📊' },
  { href: '/fan-fight', label: 'Fan Fight', icon: '⚔️' },
];

const adminLinks = [
  { href: '/admin/dashboard', label: 'Admin', icon: '⚙️' },
  { href: '/leaderboard', label: 'Leaderboard', icon: '🏆' },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const user = mounted ? getUser() : null;
  const links = user && isAdmin() ? adminLinks : userLinks;

  return (
    <>
      <nav className="navbar">
        <div className="navbar-inner">
          {/* Logo */}
          <div className="navbar-logo" style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
            onClick={() => router.push(user ? (isAdmin() ? '/admin/dashboard' : '/dashboard') : '/login')}>
            ⚽
            <div><span>THE FINAL</span>&nbsp;THIRD</div>
          </div>

          {/* Nav links */}
          {user && (
            <div className="navbar-links">
              {links.map(l => (
                <a key={l.href} href={l.href}
                  className={`navbar-link ${pathname === l.href ? 'active' : ''}`}>
                  {l.label}
                </a>
              ))}
            </div>
          )}

          {/* Right side */}
          <div className="navbar-right">
            {user ? (
              <>
                <span className="navbar-user">
                  {isAdmin() && <span style={{ color: 'var(--amber)', marginRight: 4 }}>🔐</span>}
                  {user.username}
                </span>
                <button className="btn-logout" onClick={logout}>Logout</button>
              </>
            ) : (
              <button className="btn-logout" onClick={() => router.push('/login')}>Sign In</button>
            )}
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation */}
      {user && (
        <div className="mobile-nav">
          <div className="mobile-nav-inner">
            {links.map(l => (
              <div key={l.href}
                className={`mobile-nav-link ${pathname === l.href ? 'active' : ''}`}
                onClick={() => router.push(l.href)}>
                <span className="mobile-nav-icon">{l.icon}</span>
                <span>{l.label}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
