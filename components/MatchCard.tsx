'use client';
import { useState, useEffect, useCallback } from 'react';
import type { MatchResponse, Winner } from '@/lib/api';
import { submitPrediction, getMatchInsight } from '@/lib/api';
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
  const isKnockout  = match.isKnockout;

  const [now, setNow]         = useState(() => Date.now());
  const [predWinner, setPredWinner] = useState<Winner | ''>('');
  const [predGD, setPredGD]   = useState<number>(1);
  const [saving, setSaving]   = useState(false);
  const [msg, setMsg]         = useState('');
  const [isError, setIsError] = useState(false);
  const [localPred, setLocalPred] = useState(match.userPrediction);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  const [insight, setInsight] = useState('');
  const [insightLoading, setInsightLoading] = useState(false);

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
      // For knockout: if DRAW somehow selected, treat as 0 GD (should never happen)
      const gd = predWinner === 'DRAW' ? 0 : predGD;
      const resp = await submitPrediction(match.id, predWinner, gd);
      setLocalPred(resp);
      setMsg('Prediction saved ✓');
      setIsError(false);
      setIsEditing(false);
      if (onUpdated) onUpdated({ ...match, userPrediction: resp });
    } catch (e: any) {
      setIsError(true);
      setMsg(e.message || 'Failed to save prediction.');
    } finally {
      setSaving(false);
    }
  }, [match, predWinner, predGD, onUpdated]);

  const handleInsight = useCallback(async () => {
    setInsightLoading(true);
    try {
      const result = await getMatchInsight(match.teamA, match.teamB);
      setInsight(result);
    } catch (e) {
      setInsight('AI Insight unavailable right now.');
    } finally {
      setInsightLoading(false);
    }
  }, [match]);

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
        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {isKnockout && (
            <span style={{
              fontSize: '.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: '99px',
              background: 'rgba(245,158,11,.12)', color: 'var(--amber)',
              border: '1px solid rgba(245,158,11,.3)', letterSpacing: '.06em', textTransform: 'uppercase'
            }}>🏆 Knockout</span>
          )}
          {match.penaltyWon && match.status === 'COMPLETED' && (
            <span style={{
              fontSize: '.65rem', fontWeight: 700, padding: '2px 7px', borderRadius: '99px',
              background: 'rgba(139,92,246,.12)', color: '#a78bfa',
              border: '1px solid rgba(139,92,246,.3)', letterSpacing: '.06em', textTransform: 'uppercase'
            }}>🎯 Penalties</span>
          )}
          {renderBadge()}
        </div>
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
        {!effectiveLocked && (!localPred || isEditing) && (
          <div className="prediction-form">
            <div className="prediction-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <span>Your Prediction</span>
              <button 
                className={`btn-insight ${insightLoading ? 'loading' : ''}`} 
                onClick={handleInsight} 
                disabled={insightLoading || !!insight}
              >
                {insightLoading ? 'Analyzing...' : '✨ AI Insight'}
              </button>
            </div>

            {isKnockout && (
              <div style={{
                fontSize: '.76rem', color: 'var(--amber)', background: 'rgba(245,158,11,.08)',
                border: '1px solid rgba(245,158,11,.25)', borderRadius: '8px',
                padding: '7px 12px', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '6px'
              }}>
                🏆 Knockout match — no draws. If it goes to penalties, predict who wins.
              </div>
            )}

            {insight && (
              <div className="insight-box fade-up">
                <span style={{ fontSize: '1.2rem', marginRight: 8 }}>🤖</span>
                <span className="insight-text">{insight}</span>
              </div>
            )}
            
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 16 }}>
              <select className="form-input-dark" style={{ width: '150px' }}
                value={predWinner ? (isKnockout && predGD === 0 ? predWinner + '_PEN' : predWinner) : ''}
                onChange={e => {
                  const val = e.target.value;
                  if (val.endsWith('_PEN')) {
                    setPredWinner(val.replace('_PEN', '') as Winner);
                    setPredGD(0);
                  } else {
                    setPredWinner(val as Winner);
                    if (isKnockout && predGD === 0) setPredGD(1);
                  }
                }}>
                <option value="" disabled>Select Result</option>
                <option value="TEAM_A">{match.teamA} Win</option>
                {isKnockout && <option value="TEAM_A_PEN">{match.teamA} Win (Pen)</option>}
                {!isKnockout && <option value="DRAW">Draw</option>}
                <option value="TEAM_B">{match.teamB} Win</option>
                {isKnockout && <option value="TEAM_B_PEN">{match.teamB} Win (Pen)</option>}
              </select>

              {predWinner && predWinner !== 'DRAW' && !(isKnockout && predGD === 0) && (
                <select className="form-input-dark" style={{ width: '130px' }}
                  value={predGD} onChange={e => setPredGD(parseInt(e.target.value))}>
                  <option value={1}>Goal Diff: 1</option>
                  <option value={2}>Goal Diff: 2</option>
                  <option value={3}>Goal Diff: 3</option>
                  <option value={4}>Goal Diff: 3+</option>
                </select>
              )}
              {(predWinner === 'DRAW' || (isKnockout && predGD === 0 && predWinner !== '')) && (
                <div style={{ display:'flex', alignItems:'center', color:'var(--text-faint)', fontSize:'.85rem' }}>
                  Goal Diff: 0
                </div>
              )}
            </div>

            <button className={`btn-save${saving ? ' saving' : ''}`}
              onClick={() => {
                if (!predWinner) { setIsError(true); setMsg('Select a result.'); return; }
                setShowConfirm(true);
              }} disabled={saving || !predWinner || effectiveLocked}>
              {saving ? 'Saving…' : 'Submit Prediction'}
            </button>
            {msg && (
              <div style={{ marginTop:8, textAlign:'center', fontSize:'.8rem',
                color: isError ? 'var(--red)' : 'var(--accent)' }}>
                {msg}
              </div>
            )}

            {showConfirm && (
              <div className="modal-overlay" onClick={() => setShowConfirm(false)}>
                <div className="modal-content" onClick={e => e.stopPropagation()}>
                  <h3 className="modal-title">Confirm Prediction</h3>
                  <div className="modal-body">
                    Are you sure you want to submit this prediction?<br /><br />
                    <strong style={{ color: 'var(--text)' }}>
                      {winnerLabel(predWinner as Winner, match.teamA, match.teamB)}
                      {isKnockout && predGD === 0 ? ' (Pen)' : ''}
                    </strong>
                    {' '}· GD <strong style={{ color: 'var(--text)' }}>{predWinner === 'DRAW' || (isKnockout && predGD === 0) ? 0 : (predGD === 4 ? '3+' : predGD)}</strong>
                  </div>
                  <div className="modal-actions">
                    <button className="btn-cancel" onClick={() => setShowConfirm(false)}>
                      Cancel
                    </button>
                    <button className="btn-confirm" onClick={() => {
                      setShowConfirm(false);
                      handleSave();
                    }}>
                      Yes, Submit
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Prediction already submitted (but match not yet started) */}
        {!effectiveLocked && localPred && !isEditing && (
          <div className="prediction-result editable" style={{ background: 'rgba(52, 211, 153, 0.05)', borderColor: 'rgba(52, 211, 153, 0.2)' }}>
            <div style={{ color: 'var(--accent)', fontWeight: 600, fontSize: '.85rem', marginBottom: 4, textAlign: 'center' }}>
              ✓ Prediction Submitted
            </div>
            <div className="prediction-info">
              <strong style={{ color:'var(--text-2)' }}>
                {winnerLabel(localPred.predictedWinner, match.teamA, match.teamB)}
                {isKnockout && localPred.predictedGoalDiff === 0 && localPred.predictedWinner !== 'DRAW' ? ' (Pen)' : ''}
              </strong>{' '}
              · GD <strong style={{ color:'var(--text-2)' }}>
                {localPred.predictedGoalDiff === 4 ? '3+' : localPred.predictedGoalDiff}
              </strong>
            </div>
            <button
              onClick={() => setIsEditing(true)}
              className="btn-edit"
            >
              Edit Prediction
            </button>
          </div>
        )}

        {/* Completed: show user prediction + points */}
        {match.status === 'COMPLETED' && localPred && (
          <div className="prediction-result">
            <div className="prediction-info">
              Your prediction:{' '}
              <strong style={{ color:'var(--text-2)' }}>
                {winnerLabel(localPred.predictedWinner, match.teamA, match.teamB)}
                {isKnockout && localPred.predictedGoalDiff === 0 && localPred.predictedWinner !== 'DRAW' ? ' (Pen)' : ''}
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
                {isKnockout && localPred.predictedGoalDiff === 0 && localPred.predictedWinner !== 'DRAW' ? ' (Pen)' : ''}
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
