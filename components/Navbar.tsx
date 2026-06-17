'use client';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { getUser, logout, isAdmin } from '@/lib/auth';

const userLinks = [
  { href: '/dashboard',   label: 'Matches'     },
  { href: '/history',     label: 'History'     },
  { href: '/leaderboard', label: 'Leaderboard' },
];

const adminLinks = [
  { href: '/admin/dashboard', label: 'Admin Panel'  },
  { href: '/leaderboard',     label: 'Leaderboard'  },
];

export default function Navbar() {
  const pathname = usePathname();
  const router   = useRouter();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const user     = mounted ? getUser() : null;
  const links    = user && isAdmin() ? adminLinks : userLinks;

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        {/* Logo */}
        <div className="navbar-logo" style={{ cursor:'pointer' }}
          onClick={() => router.push(user ? (isAdmin() ? '/admin/dashboard' : '/dashboard') : '/login')}>
          ⚽ <span>FIFA</span>&nbsp;PREDICTOR
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
                {isAdmin() && <span style={{ color:'var(--amber)', marginRight:4 }}>🔐</span>}
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
  );
}
