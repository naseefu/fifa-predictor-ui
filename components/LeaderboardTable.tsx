'use client';
import type { LeaderboardEntry } from '@/lib/api';
import { getUser } from '@/lib/auth';

interface Props {
  entries: LeaderboardEntry[];
}

function MovementBadge({ movement }: { movement: number | null }) {
  if (movement === null) {
    return <span className="movement-badge new">NEW</span>;
  }
  if (movement > 0) {
    return <span className="movement-badge up">▲ {movement}</span>;
  }
  if (movement < 0) {
    return <span className="movement-badge down">▼ {Math.abs(movement)}</span>;
  }
  return <span className="movement-badge same">—</span>;
}

function StreakBadge({ streak }: { streak: number }) {
  if (streak <= 0) return null;
  if (streak >= 5) return <span className="streak-pill fire">🔥 {streak}</span>;
  if (streak >= 3) return <span className="streak-pill warm">⚡ {streak}</span>;
  return <span className="streak-pill cool">✦ {streak}</span>;
}

export default function LeaderboardTable({ entries }: Props) {
  const me = getUser();

  const rankClass = (rank: number) => {
    if (rank === 1) return 'rank-1';
    if (rank === 2) return 'rank-2';
    if (rank === 3) return 'rank-3';
    return 'rank-default';
  };

  if (entries.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">🏆</div>
        <div>No players on the leaderboard yet.</div>
        <div style={{ marginTop:6, fontSize:'.8rem', color:'var(--text-faint)' }}>
          Predictions resolve once match results are submitted.
        </div>
      </div>
    );
  }

  return (
    <div className="card" style={{ padding:0, overflow:'hidden' }}>
      <div style={{ overflowX: 'auto' }}>
        <table className="leaderboard-table">
          <thead>
            <tr>
              <th style={{ width:48 }}>#</th>
              <th style={{ width:40 }}></th>
              <th>Player</th>
              <th className="right">Points</th>
              <th className="right">Exact ⭐</th>
              <th className="right">Correct ✓</th>
              <th className="right">Played</th>
              <th className="right">Streak</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(entry => {
              const isMe = me?.username === entry.username;
              return (
                <tr key={entry.username}
                  style={isMe ? { background:'rgba(16,185,129,.06)' } : {}}>
                  <td>
                    <span className={`rank-badge ${rankClass(entry.rank)}`}>
                      {entry.rank <= 3
                        ? entry.rank === 1 ? '🥇' : entry.rank === 2 ? '🥈' : '🥉'
                        : entry.rank}
                    </span>
                  </td>
                  <td>
                    <MovementBadge movement={entry.rankMovement ?? null} />
                  </td>
                  <td>
                    <span className="username-cell">
                      {entry.username}
                      {isMe && (
                        <span style={{ marginLeft:6, fontSize:'.7rem', color:'var(--accent)',
                          fontWeight:700, letterSpacing:'.04em' }}>YOU</span>
                      )}
                    </span>
                  </td>
                  <td className="right points-cell">{entry.totalPoints.toFixed(1)}</td>
                  <td className="right stat-cell">{entry.exactMatches}</td>
                  <td className="right stat-cell">{entry.correctOutcomes}</td>
                  <td className="right stat-cell">{entry.totalPredictions}</td>
                  <td className="right stat-cell">
                    <StreakBadge streak={entry.currentStreak} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
