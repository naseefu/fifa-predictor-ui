'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { getHistory } from '@/lib/api';
import type { MatchResponse, Winner } from '@/lib/api';
import { isLoggedIn } from '@/lib/auth';
import { getFlag } from '@/lib/teams';

function winnerLabel(w: Winner | null | undefined, a: string, b: string): string {
  if (!w) return '—';
  if (w === 'TEAM_A') return a;
  if (w === 'TEAM_B') return b;
  return 'Draw';
}

function ptsBadge(pts: number | null | undefined, processed: boolean | undefined) {
  if (!processed || pts === null || pts === undefined) {
    return <span className="points-badge pending">Pending</span>;
  }
  if (pts === 10) return <span className="points-badge perfect">⭐ 10 pts</span>;
  if (pts > 0)    return <span className="points-badge partial">+{pts} pts</span>;
  return              <span className="points-badge zero">0 pts</span>;
}

export default function HistoryPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<MatchResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState('');

  useEffect(() => {
    if (!isLoggedIn()) { router.push('/login'); return; }
    load();
  }, []);

  async function load() {
    setLoading(true); setError('');
    try {
      setMatches(await getHistory());
    } catch (e: any) {
      setError(e.message || 'Failed to load history.');
    } finally {
      setLoading(false);
    }
  }

  const totalPts = matches.reduce((s, m) => s + (m.userPrediction?.pointsEarned ?? 0), 0);
  const perfect  = matches.filter(m => m.userPrediction?.pointsEarned === 10).length;
  const correct  = matches.filter(m => (m.userPrediction?.pointsEarned ?? 0) > 0).length;
  const predicted = matches.filter(m => m.userPrediction).length;

  return (
    <>
      <Navbar />
      <main className="page">
        <div className="page-header">
          <h1 className="page-title">Match History</h1>
          <p className="page-subtitle">All completed matches and your prediction results.</p>
        </div>

        {/* Stats row */}
        <div className="stats-row">
          <div className="stat-card">
            <span className="stat-label">Total Points</span>
            <span className="stat-value accent">{totalPts.toFixed(1)}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Perfect (10pt)</span>
            <span className="stat-value accent">{perfect}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Correct Winner</span>
            <span className="stat-value">{correct}</span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Predicted</span>
            <span className="stat-value">{predicted} / {matches.length}</span>
          </div>
        </div>

        {loading && <div className="spinner-wrap"><div className="spinner" /></div>}
        {error && <div className="error-msg">{error}</div>}

        {!loading && matches.length === 0 && (
          <div className="empty-state">
            <div className="empty-icon">📜</div>
            <div>No completed matches yet.</div>
          </div>
        )}

        <div>
          {matches.map(m => {
            const pred = m.userPrediction;
            const date = new Date(m.startTime);
            return (
              <div key={m.id} className="history-card fade-up">
                <div className="history-header">
                  <div>
                    <div className="history-teams">
                      {getFlag(m.teamA)} {m.teamA} <span style={{color:'var(--text-faint)', fontSize:'.85em', fontWeight:500, margin:'0 4px'}}>vs</span> {getFlag(m.teamB)} {m.teamB}
                    </div>
                    <div style={{ fontSize:'.75rem', color:'var(--text-faint)', marginTop:2 }}>
                      {date.toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short', year:'numeric' })}
                    </div>
                  </div>
                  <div className="history-score">
                    {m.teamAScore} — {m.teamBScore}
                    <div style={{ fontSize:'.72rem', color:'var(--text-faint)', fontWeight:500,
                      textAlign:'right', marginTop:2 }}>
                      {winnerLabel(m.actualWinner, m.teamA, m.teamB)}{m.actualWinner !== 'DRAW' ? ' wins' : ''}
                    </div>
                  </div>
                </div>
                <div className="history-body">
                  {pred ? (
                    <div className="history-prediction">
                      You predicted: <strong>{winnerLabel(pred.predictedWinner, m.teamA, m.teamB)}</strong>
                      {' '}· Goal diff: <strong>{pred.predictedGoalDiff}</strong>
                    </div>
                  ) : (
                    <div className="history-prediction" style={{ color:'var(--text-faint)' }}>
                      No prediction submitted
                    </div>
                  )}
                  {pred ? ptsBadge(pred.pointsEarned, pred.isProcessed) : null}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </>
  );
}
