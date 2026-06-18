'use client';
import { useState, useEffect, useCallback } from 'react';
import type { MatchResponse, Winner } from '@/lib/api';
import { submitPrediction } from '@/lib/api';
import { getFlag } from '@/lib/teams';
import MatchComments from './MatchComments';

interface Props {
  match: MatchResponse;
  onUpdated?: (updated: MatchResponse) => void;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return '0:00:00';
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  return `${h}:${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}

function computeWinner(a: number, b: number): Winner {
  if (a > b) return 'TEAM_A';
  if (b > a) return 'TEAM_B';
  return 'DRAW';
}

function winnerLabel(w: Winner | null | undefined, teamA: string, teamB: string): string {
  if (!w) return '—';
  if (w === 'TEAM_A') return teamA;
  if (w === 'TEAM_B') return teamB;
  return 'Draw';
}

export default function MatchCard({ match, onUpdated }: Props) {
  const startTime   = new Date(match.startTime);
  const lockTime    = new Date(startTime.getTime() - 60 * 60 * 1000);

  const [now, setNow]         = useState(() => Date.now());
  const [predWinner, setPredWinner] = useState<Winner | ''>('');
  const [predGD, setPredGD]   = useState<number>(1);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState('');
  const [isError, setIsError] = useState(false);
  const [localPred, setLocalPred] = useState(match.userPrediction);

  // Live countdown tick
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const msToLock      = lockTime.getTime() - now;
  const isClientLocked = msToLock <= 0;
  const isUrgent      = msToLock > 0 && msToLock < 20 * 60 * 1000; // < 20 min
  const effectiveLocked = match.status === 'LOCKED' || match.status === 'COMPLETED' || isClientLocked;
  const hasMatchStarted = now >= startTime.getTime();

  // Pre-fill with existing prediction
  useEffect(() => {
    if (localPred) {
      setPredWinner(localPred.predictedWinner);
      setPredGD(localPred.predictedGoalDiff ?? 0);
    }
  }, [localPred]);

  const handleSave = useCallback(async () => {
    if (!predWinner) { setIsError(true); setMsg('Select a result.'); return; }
    setSaving(true); setMsg(''); setIsError(false);
    try {
      const gd = predWinner === 'DRAW' ? 0 : predGD;
      const resp = await submitPrediction(match.id, predWinner, gd);
      setLocalPred(resp);
      setMsg('Prediction saved ✓');
      setIsError(false);
      if (onUpdated) onUpdated({ ...match, userPrediction: resp });
    } catch (e: any) {
      setIsError(true);
      setMsg(e.message || 'Failed to save prediction.');
    } finally {
      setSaving(false);
    }
  }, [match, predWinner, predGD, onUpdated]);

  // ── Status badge ──────────────────────────────────────────────────────────
  const renderBadge = () => {
    if (match.status === 'COMPLETED') {
      return <span className="status-badge completed">✓ Completed</span>;
    }
    if (effectiveLocked) {
      return <span className="status-badge locked">🔒 Locked</span>;
    }
    return (
      <span className="status-badge open">
        <span className="status-dot pulsing" />
        Open
      </span>
    );
  };

  // ── Points badge ──────────────────────────────────────────────────────────
  const renderPoints = () => {
    const pred = localPred;
    if (!pred) return null;
    if (!pred.isProcessed) {
      return <span className="points-badge pending">Pending</span>;
    }
    const pts = pred.pointsEarned ?? 0;
    if (pts === 10) return <span className="points-badge perfect">⭐ 10 pts</span>;
    if (pts > 0)   return <span className="points-badge partial">+{pts} pts</span>;
    return             <span className="points-badge zero">0 pts</span>;
  };

  // ── Score display for completed ──────────────────────────────────────────
  const scoreDisplay = (score: number | null) => score !== null ? score : '—';

  const aWon = match.actualWinner === 'TEAM_A';
  const bWon = match.actualWinner === 'TEAM_B';

  return (
    <div className={`match-card fade-up status-${effectiveLocked ? (match.status === 'COMPLETED' ? 'completed' : 'locked') : 'open'}`}>
      {/* Header */}
      <div className="match-card-header">
        <span className="match-time">
          {startTime.toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' })}
          {' · '}
          {startTime.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' })}
        </span>
        {renderBadge()}
      </div>

      <div className="match-card-body">
        {/* Teams + Scores */}
        <div className="match-teams">
          <div className="team-side">
            <span className="team-name" style={{ display:'flex', flexDirection:'column', gap:4, alignItems:'center' }}>
              <span style={{ fontSize:'1.5rem' }}>{getFlag(match.teamA)}</span>
              {match.teamA}
            </span>
            {match.status === 'COMPLETED' && (
              <span className={`team-score-display${aWon ? ' winner' : ''}`}>
                {scoreDisplay(match.teamAScore)}
              </span>
            )}
          </div>
          <span className="match-vs">VS</span>
          <div className="team-side">
            <span className="team-name" style={{ display:'flex', flexDirection:'column', gap:4, alignItems:'center' }}>
              <span style={{ fontSize:'1.5rem' }}>{getFlag(match.teamB)}</span>
              {match.teamB}
            </span>
            {match.status === 'COMPLETED' && (
              <span className={`team-score-display${bWon ? ' winner' : ''}`}>
                {scoreDisplay(match.teamBScore)}
              </span>
            )}
          </div>
        </div>

        {/* Countdown or lock message */}
        {!effectiveLocked && (
          <div className={`countdown-block${isUrgent ? ' urgent' : ''}`}>
            <span>⏱</span>
            <span>{formatCountdown(msToLock)}</span>
            <span className="countdown-label">until prediction locks</span>
          </div>
        )}
        {effectiveLocked && match.status !== 'COMPLETED' && (
          <div className="lock-message">
            {hasMatchStarted 
              ? '⚽ Match in progress'
              : '🔒 Predictions locked — match starting soon'}
          </div>
        )}

        {/* Prediction form (open only) */}
        {!effectiveLocked && !localPred && (
          <div className="prediction-form">
            <div className="prediction-label">Your Prediction</div>
            
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 16 }}>
              <select className="form-input-dark" style={{ width: '150px' }}
                value={predWinner} onChange={e => setPredWinner(e.target.value as Winner)}>
                <option value="" disabled>Select Result</option>
                <option value="TEAM_A">{match.teamA} Win</option>
                <option value="DRAW">Draw</option>
                <option value="TEAM_B">{match.teamB} Win</option>
              </select>

              {predWinner && predWinner !== 'DRAW' && (
                <select className="form-input-dark" style={{ width: '130px' }}
                  value={predGD} onChange={e => setPredGD(parseInt(e.target.value))}>
                  <option value={1}>Goal Diff: 1</option>
                  <option value={2}>Goal Diff: 2</option>
                  <option value={3}>Goal Diff: 3</option>
                  <option value={4}>Goal Diff: 3+</option>
                </select>
              )}
              {predWinner === 'DRAW' && (
                <div style={{ display:'flex', alignItems:'center', color:'var(--text-faint)', fontSize:'.85rem' }}>
                  Goal Diff: 0
                </div>
              )}
            </div>

            <button className={`btn-save${saving ? ' saving' : ''}`}
              onClick={handleSave} disabled={saving || !predWinner || effectiveLocked}>
              {saving ? 'Saving…' : 'Submit Prediction'}
            </button>
            {msg && (
              <div style={{ marginTop:8, textAlign:'center', fontSize:'.8rem',
                color: isError ? 'var(--red)' : 'var(--accent)' }}>
                {msg}
              </div>
            )}
          </div>
        )}

        {/* Prediction already submitted (but match not yet started) */}
        {!effectiveLocked && localPred && (
          <div className="prediction-result" style={{ background: 'rgba(52, 211, 153, 0.05)', borderColor: 'rgba(52, 211, 153, 0.2)' }}>
            <div style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '.85rem', marginBottom: 4, textAlign: 'center' }}>
              ✓ Prediction Submitted
            </div>
            <div className="prediction-info">
              <strong style={{ color:'var(--text-2)' }}>
                {winnerLabel(localPred.predictedWinner, match.teamA, match.teamB)}
              </strong>{' '}
              · GD <strong style={{ color:'var(--text-2)' }}>
                {localPred.predictedGoalDiff === 4 ? '3+' : localPred.predictedGoalDiff}
              </strong>
            </div>
          </div>
        )}

        {/* Completed: show user prediction + points */}
        {match.status === 'COMPLETED' && localPred && (
          <div className="prediction-result">
            <div className="prediction-info">
              Your prediction:{' '}
              <strong style={{ color:'var(--text-2)' }}>
                {winnerLabel(localPred.predictedWinner, match.teamA, match.teamB)}
              </strong>{' '}
              · GD: <strong style={{ color:'var(--text-2)' }}>
                {localPred.predictedGoalDiff === 4 ? '3+' : localPred.predictedGoalDiff}
              </strong>
            </div>
            {renderPoints()}
          </div>
        )}

        {/* Locked with existing prediction */}
        {effectiveLocked && match.status !== 'COMPLETED' && localPred && (
          <div className="prediction-result">
            <div className="prediction-info">
              Locked prediction:{' '}
              <strong style={{ color:'var(--text-2)' }}>
                {winnerLabel(localPred.predictedWinner, match.teamA, match.teamB)}
                {' '}· GD {localPred.predictedGoalDiff === 4 ? '3+' : localPred.predictedGoalDiff}
              </strong>
            </div>
          </div>
        )}
      </div>

      <div style={{ borderTop: '1px solid var(--border)' }}>
        <MatchComments matchId={match.id} />
      </div>
    </div>
  );
}
