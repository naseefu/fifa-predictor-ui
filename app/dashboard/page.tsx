'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import MatchCard from '@/components/MatchCard';
import PushSetupComponent from '@/components/PushSetupComponent';
import { getTodayMatches, getUpcomingMatches } from '@/lib/api';
import type { MatchResponse } from '@/lib/api';
import { isLoggedIn, isAdmin, getUser } from '@/lib/auth';

export default function DashboardPage() {
  const router  = useRouter();
  const [matches, setMatches] = useState<MatchResponse[]>([]);
  const [upcoming, setUpcoming] = useState<MatchResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');
  const user = getUser();

  useEffect(() => {
    if (!isLoggedIn()) { router.push('/login'); return; }
    if (isAdmin())     { router.push('/admin/dashboard'); return; }
    load();
  }, []);

  async function load() {
    setLoading(true); setError('');
    try {
      const [todayData, upcomingData] = await Promise.all([
        getTodayMatches(),
        getUpcomingMatches(),
      ]);
      setMatches(todayData);
      setUpcoming(upcomingData);
    } catch (e: any) {
      setError(e.message || 'Failed to load matches.');
    } finally {
      setLoading(false);
    }
  }

  const open      = matches.filter(m => m.status === 'UPCOMING');
  const locked    = matches.filter(m => m.status === 'LOCKED');
  const completed = matches.filter(m => m.status === 'COMPLETED');

  const totalPts  = matches.reduce((sum, m) =>
    sum + (m.userPrediction?.pointsEarned ?? 0), 0);
  const predicted = matches.filter(m => m.userPrediction).length;

  return (
    <>
      <Navbar />
      <main className="page">
        <div className="page-header">
          <h1 className="page-title">
            Today's Matches
            <span className="page-title-badge">10:30 AM – 10:30 AM</span>
          </h1>
          <p className="page-subtitle">
            Predict scores before the 60-minute lockout. Results update live.
          </p>
        </div>

        {/* Stats row */}
        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-label">Today's Matches</span>
            <span className="stat-value accent">{matches.length}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Predicted</span>
            <span className="stat-value">{predicted}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Points Today</span>
            <span className="stat-value accent">{totalPts.toFixed(1)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Open</span>
            <span className="stat-value">{open.length}</span>
          </div>
        </div>

        {loading && <div className="spinner-wrap"><div className="spinner" /></div>}
        {error && <div className="error-msg">{error}</div>}

        <PushSetupComponent />

        {!loading && matches.length === 0 && upcoming.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <div>No matches scheduled for today's window.</div>
            <div style={{ marginTop:6, fontSize:'.8rem', color:'var(--text-faint)' }}>
              Check back later or view Match History.
            </div>
          </div>
        )}

        {/* Open matches */}
        {open.length > 0 && (
          <div style={{ marginBottom:28 }}>
            <div className="section-label">Open for Predictions ({open.length})</div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {open.map(m => (
                <MatchCard key={m.id} match={m} />
              ))}
            </div>
          </div>
        )}

        {/* Locked matches */}
        {locked.length > 0 && (
          <div style={{ marginBottom:28 }}>
            <div className="section-label">Locked 🔒 ({locked.length})</div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {locked.map(m => (
                <MatchCard key={m.id} match={m} />
              ))}
            </div>
          </div>
        )}

        {/* Completed today */}
        {completed.length > 0 && (
          <div style={{ marginBottom:28 }}>
            <div className="section-label">Completed Today ({completed.length})</div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {completed.map(m => (
                <MatchCard key={m.id} match={m} />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming future matches — beyond today's window */}
        {!loading && upcoming.length > 0 && (
          <div style={{ marginTop: matches.length > 0 ? 12 : 0 }}>
            <div className="section-label" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              Upcoming Fixtures
              <span style={{
                fontSize: '.68rem', fontWeight: 700, padding: '2px 8px', borderRadius: '99px',
                background: 'rgba(16,185,129,.1)', color: 'var(--accent)',
                border: '1px solid rgba(16,185,129,.2)', letterSpacing: '.05em'
              }}>
                {upcoming.length} match{upcoming.length !== 1 ? 'es' : ''} · Pre-predict now
              </span>
            </div>
            <p style={{ fontSize: '.8rem', color: 'var(--text-faint)', marginBottom: '12px', marginTop: '-4px' }}>
              These matches start after tomorrow 10:30 AM. Lock in your predictions early!
            </p>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {upcoming.map(m => (
                <MatchCard key={m.id} match={m} />
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
