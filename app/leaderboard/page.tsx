'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import LeaderboardTable from '@/components/LeaderboardTable';
import { getLeaderboard } from '@/lib/api';
import type { LeaderboardEntry } from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';

export default function LeaderboardPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!isLoggedIn()) { router.push('/login'); return; }
    load();
  }, []);

  async function load() {
    setLoading(true); setError('');
    try {
      setEntries(await getLeaderboard());
    } catch (e: any) {
      setError(e.message || 'Failed to load leaderboard.');
    } finally {
      setLoading(false);
    }
  }

  const top = entries[0];

  return (
    <>
      <Navbar />
      <main className="page">
        <div className="page-header">
          <h1 className="page-title">
            Leaderboard
            <span className="page-title-badge">Live Rankings</span>
          </h1>
          <p className="page-subtitle">
            Ranked by points · Ties broken by exact matches → correct outcomes → join date
          </p>
        </div>

        {/* Top player highlight */}
        {top && !loading && (
          <div className="card" style={{ marginBottom:24, display:'flex',
            alignItems:'center', gap:16,
            background:'linear-gradient(135deg, rgba(16,185,129,.08), rgba(16,185,129,.03))',
            borderColor:'rgba(16,185,129,.25)' }}>
            <div style={{ fontSize:'2rem' }}>👑</div>
            <div>
              <div style={{ fontSize:'.7rem', fontWeight:700, letterSpacing:'.08em',
                textTransform:'uppercase', color:'var(--accent)', marginBottom:2 }}>
                Current Leader
              </div>
              <div style={{ fontWeight:800, fontSize:'1.05rem', color:'var(--text)' }}>
                {top.username}
              </div>
              <div style={{ fontSize:'.8rem', color:'var(--text-muted)', marginTop:2 }}>
                {top.totalPoints.toFixed(1)} points · {top.exactMatches} exact ·{' '}
                {top.correctOutcomes} correct outcomes
              </div>
            </div>
            <div style={{ marginLeft:'auto', textAlign:'right' }}>
              <div style={{ fontSize:'2rem', fontWeight:900, color:'var(--accent)', lineHeight:1 }}>
                {top.totalPoints.toFixed(1)}
              </div>
              <div style={{ fontSize:'.7rem', color:'var(--text-faint)', fontWeight:600 }}>pts</div>
            </div>
          </div>
        )}

        {loading && <div className="spinner-wrap"><div className="spinner" /></div>}
        {error   && <div className="error-msg">{error}</div>}
        {!loading && <LeaderboardTable entries={entries} />}
      </main>
    </>
  );
}
