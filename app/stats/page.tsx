'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { getUserStats } from '@/lib/api';
import type { UserStatsResponse } from '@/lib/api';
import { isLoggedIn, isAdmin } from '@/lib/auth';

const BADGE_ICONS: Record<string, string> = {
  'First Touch':      '👋',
  'Sharp Eye':        '👁️',
  'Sniper':           '🎯',
  'Oracle':           '🔮',
  'On The Ball':      '⚽',
  'Match Reader':     '📖',
  'Tactician':        '🧠',
  'Hat-trick Hero':   '🎩',
  'On Fire':          '🔥',
  'World Class':      '🌍',
  'Rising Star':      '⭐',
  'Century Club':     '💯',
  'Elite Predictor':  '🏆',
};

function StatCard({ label, value, sub, accent }: {
  label: string; value: string | number; sub?: string; accent?: boolean
}) {
  return (
    <div className="stat-card" style={{ flex: '1 1 140px', minWidth: 120 }}>
      <span className="stat-label">{label}</span>
      <span className={`stat-value${accent ? ' accent' : ''}`}>{value}</span>
      {sub && <span style={{ fontSize: '.72rem', color: 'var(--text-faint)', marginTop: 2 }}>{sub}</span>}
    </div>
  );
}

function WinRateBar({ rate }: { rate: number }) {
  return (
    <div style={{ marginBottom: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: '.75rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '.06em' }}>
          Win Rate
        </span>
        <span style={{ fontSize: '.85rem', fontWeight: 800, color: 'var(--accent)' }}>{rate.toFixed(1)}%</span>
      </div>
      <div style={{
        height: 8, borderRadius: 99, background: 'var(--surface-3)', overflow: 'hidden'
      }}>
        <div style={{
          height: '100%',
          width: `${Math.min(rate, 100)}%`,
          borderRadius: 99,
          background: rate >= 60
            ? 'linear-gradient(90deg, var(--accent), var(--accent-bright))'
            : rate >= 40
            ? 'linear-gradient(90deg, var(--amber), #fcd34d)'
            : 'linear-gradient(90deg, var(--red), #f87171)',
          transition: 'width 1s ease',
        }} />
      </div>
    </div>
  );
}

function StreakCard({ current, best }: { current: number; best: number }) {
  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ fontSize: '.7rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 16 }}>
        Prediction Streak
      </div>
      <div style={{ display: 'flex', gap: 16 }}>
        <div style={{
          flex: 1, textAlign: 'center', padding: '20px 16px',
          borderRadius: 'var(--radius-lg)',
          background: current >= 3
            ? 'linear-gradient(135deg, rgba(245,158,11,.12), rgba(245,158,11,.04))'
            : 'var(--surface-2)',
          border: current >= 3 ? '1px solid rgba(245,158,11,.3)' : '1px solid var(--border)',
        }}>
          <div style={{ fontSize: '2.8rem', lineHeight: 1, marginBottom: 6 }}>
            {current >= 5 ? '🔥' : current >= 3 ? '⚡' : current >= 1 ? '✦' : '—'}
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: current >= 3 ? 'var(--amber)' : 'var(--text)', lineHeight: 1 }}>
            {current}
          </div>
          <div style={{ fontSize: '.72rem', color: 'var(--text-faint)', marginTop: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Current Streak
          </div>
        </div>
        <div style={{
          flex: 1, textAlign: 'center', padding: '20px 16px',
          borderRadius: 'var(--radius-lg)',
          background: 'var(--surface-2)',
          border: '1px solid var(--border)',
        }}>
          <div style={{ fontSize: '2.8rem', lineHeight: 1, marginBottom: 6 }}>🏅</div>
          <div style={{ fontSize: '2rem', fontWeight: 900, color: 'var(--text)', lineHeight: 1 }}>
            {best}
          </div>
          <div style={{ fontSize: '.72rem', color: 'var(--text-faint)', marginTop: 6, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em' }}>
            Best Ever
          </div>
        </div>
      </div>
      {current >= 3 && (
        <div style={{ textAlign: 'center', marginTop: 12, fontSize: '.8rem', color: 'var(--amber)', fontWeight: 600 }}>
          🔥 You're on fire! Keep predicting correctly!
        </div>
      )}
    </div>
  );
}

function RankMovement({ movement }: { movement: number | null }) {
  if (movement === null) return null;
  const up   = movement > 0;
  const down = movement < 0;
  const color = up ? 'var(--accent)' : down ? 'var(--red)' : 'var(--text-faint)';
  const bg    = up ? 'rgba(16,185,129,.1)' : down ? 'rgba(239,68,68,.1)' : 'var(--surface-3)';
  const icon  = up ? '▲' : down ? '▼' : '—';
  const label = up
    ? `Up ${movement} spot${movement > 1 ? 's' : ''} this week`
    : down
    ? `Down ${Math.abs(movement)} spot${Math.abs(movement) > 1 ? 's' : ''} this week`
    : 'Same rank as last week';

  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '5px 12px', borderRadius: 99,
      background: bg, color, fontSize: '.8rem', fontWeight: 700,
      marginTop: 4,
    }}>
      {icon} {label}
    </div>
  );
}

function BadgeShelf({ badges }: { badges: string[] }) {
  if (badges.length === 0) {
    return (
      <div className="card" style={{ marginBottom: 20 }}>
        <div style={{ fontSize: '.7rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 12 }}>Badges</div>
        <div style={{ color: 'var(--text-faint)', fontSize: '.85rem' }}>
          Submit your first correct prediction to earn badges! 🎯
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ marginBottom: 20 }}>
      <div style={{ fontSize: '.7rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 14 }}>
        Badges Earned ({badges.length})
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {badges.map(badge => (
          <div key={badge} style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 14px',
            borderRadius: 'var(--radius)',
            background: 'linear-gradient(135deg, rgba(16,185,129,.1), rgba(16,185,129,.04))',
            border: '1px solid rgba(16,185,129,.2)',
            fontSize: '.82rem', fontWeight: 700, color: 'var(--text)',
            transition: 'transform 180ms ease, box-shadow 180ms ease',
          }}
          onMouseEnter={e => {
            (e.currentTarget as HTMLElement).style.transform = 'translateY(-2px)';
            (e.currentTarget as HTMLElement).style.boxShadow = '0 6px 20px rgba(16,185,129,.15)';
          }}
          onMouseLeave={e => {
            (e.currentTarget as HTMLElement).style.transform = '';
            (e.currentTarget as HTMLElement).style.boxShadow = '';
          }}>
            <span style={{ fontSize: '1.1rem' }}>{BADGE_ICONS[badge] ?? '🎖️'}</span>
            {badge}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function StatsPage() {
  const router = useRouter();
  const [stats, setStats] = useState<UserStatsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!isLoggedIn()) { router.push('/login'); return; }
    if (isAdmin())     { router.push('/admin/dashboard'); return; }
    load();
  }, []);

  async function load() {
    setLoading(true); setError('');
    try {
      setStats(await getUserStats());
    } catch (e: any) {
      setError(e.message || 'Failed to load stats.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <Navbar />
      <main className="page">
        <div className="page-header">
          <h1 className="page-title">
            My Stats
            <span className="page-title-badge">Personal Dashboard</span>
          </h1>
          <p className="page-subtitle">Your prediction performance, badges, and ranking history.</p>
        </div>

        {loading && <div className="spinner-wrap"><div className="spinner" /></div>}
        {error && <div className="error-msg">{error}</div>}

        {stats && (
          <>
            {/* Hero card — rank & points */}
            <div className="card" style={{
              marginBottom: 20,
              background: 'linear-gradient(135deg, rgba(16,185,129,.08), rgba(16,185,129,.02))',
              borderColor: 'rgba(16,185,129,.25)',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
                <div>
                  <div style={{ fontSize: '.7rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: 4 }}>
                    Your Ranking
                  </div>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                    <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--text)', lineHeight: 1 }}>
                      #{stats.rank > 0 ? stats.rank : '—'}
                    </div>
                    <div style={{ fontSize: '1rem', color: 'var(--text-muted)', fontWeight: 600 }}>overall</div>
                  </div>
                  <RankMovement movement={stats.rankMovement} />
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '.7rem', fontWeight: 700, letterSpacing: '.08em', textTransform: 'uppercase', color: 'var(--text-faint)', marginBottom: 4 }}>
                    Total Points
                  </div>
                  <div style={{ fontSize: '3rem', fontWeight: 900, color: 'var(--accent)', lineHeight: 1 }}>
                    {stats.totalPoints.toFixed(1)}
                  </div>
                  <div style={{ fontSize: '.75rem', color: 'var(--text-faint)', marginTop: 4 }}>
                    avg {stats.avgPointsPerMatch.toFixed(1)} / match
                  </div>
                </div>
              </div>
            </div>

            {/* Win rate bar */}
            <div className="card" style={{ marginBottom: 20 }}>
              <WinRateBar rate={stats.winRate} />
              {/* Prediction breakdown */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                <div style={{ textAlign: 'center', padding: '12px 8px', borderRadius: 'var(--radius)', background: 'rgba(16,185,129,.06)', border: '1px solid rgba(16,185,129,.15)' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--accent)' }}>{stats.exactMatches}</div>
                  <div style={{ fontSize: '.68rem', color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 4 }}>⭐ Exact</div>
                </div>
                <div style={{ textAlign: 'center', padding: '12px 8px', borderRadius: 'var(--radius)', background: 'rgba(245,158,11,.06)', border: '1px solid rgba(245,158,11,.15)' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--amber)' }}>{stats.correctOutcomes}</div>
                  <div style={{ fontSize: '.68rem', color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 4 }}>✓ Correct</div>
                </div>
                <div style={{ textAlign: 'center', padding: '12px 8px', borderRadius: 'var(--radius)', background: 'rgba(239,68,68,.06)', border: '1px solid rgba(239,68,68,.15)' }}>
                  <div style={{ fontSize: '1.5rem', fontWeight: 900, color: 'var(--red)' }}>{stats.wrongPredictions}</div>
                  <div style={{ fontSize: '.68rem', color: 'var(--text-faint)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', marginTop: 4 }}>✗ Wrong</div>
                </div>
              </div>
            </div>

            {/* Streak card */}
            <StreakCard current={stats.currentStreak} best={stats.bestStreak} />

            {/* Summary stats row */}
            <div className="stats-row" style={{ marginBottom: 20 }}>
              <StatCard label="Predictions" value={stats.totalPredictions} />
              <StatCard label="Win Rate" value={`${stats.winRate.toFixed(1)}%`} accent />
              <StatCard label="Avg pts/match" value={stats.avgPointsPerMatch.toFixed(1)} accent />
              <StatCard label="Best Streak" value={stats.bestStreak} sub="all time" />
            </div>

            {/* Badges */}
            <BadgeShelf badges={stats.badges} />
          </>
        )}
      </main>
    </>
  );
}
