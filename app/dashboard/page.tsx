'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import MatchCard from '@/components/MatchCard';
import { getTodayMatches } from '@/lib/api';
import type { MatchResponse } from '@/lib/api';
import { isLoggedIn, isAdmin, getUser } from '@/lib/auth';

export default function DashboardPage() {
  const router  = useRouter();
  const [matches, setMatches] = useState<MatchResponse[]>([]);
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
      const data = await getTodayMatches();
      setMatches(data);
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

        {!loading && matches.length === 0 && (
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
          <div>
            <div className="section-label">Completed Today ({completed.length})</div>
            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              {completed.map(m => (
                <MatchCard key={m.id} match={m} />
              ))}
            </div>
          </div>
        )}
      </main>
    </>
  );
}
