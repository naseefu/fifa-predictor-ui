'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { adminGetAllMatches, adminCreateMatch, adminSubmitResult, adminDeleteMatch, adminGetAllUsers, adminApproveUser, adminRemoveUser, adminResetScore, adminSendNotification, adminSendMatchDigest } from '@/lib/api';
import type { MatchResponse, UserResponse } from '@/lib/api';
import { isLoggedIn, isAdmin } from '@/lib/auth';
import { TEAM_LIST, getFlag } from '@/lib/teams';

function formatDT(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { weekday:'short', day:'numeric', month:'short' }) +
    ' · ' + d.toLocaleTimeString('en-GB', { hour:'2-digit', minute:'2-digit' });
}

export default function AdminDashboardPage() {
  const router = useRouter();

  const [activeTab, setActiveTab] = useState<'matches'|'users'|'communications'>('matches');

  // Match list
  const [matches,  setMatches]  = useState<MatchResponse[]>([]);
  const [loadingM, setLoadingM] = useState(true);
  const [listErr,  setListErr]  = useState('');

  // User list
  const [users, setUsers] = useState<UserResponse[]>([]);
  const [loadingU, setLoadingU] = useState(true);
  const [userErr, setUserErr] = useState('');

  // Create form
  const [teamA,     setTeamA]     = useState('');
  const [teamB,     setTeamB]     = useState('');
  const [startTime, setStartTime] = useState('');
  const [isKnockout, setIsKnockout] = useState(false);
  const [creating,  setCreating]  = useState(false);
  const [createErr, setCreateErr] = useState('');
  const [createOk,  setCreateOk]  = useState('');

  // Result submission per match
  const [resultA, setResultA]   = useState<Record<number,string>>({});
  const [resultB, setResultB]   = useState<Record<number,string>>({});
  const [penaltyWinner, setPenaltyWinner] = useState<Record<number, 'TEAM_A' | 'TEAM_B' | ''>>({});
  const [submitMsg, setSubmitMsg] = useState<Record<number,string>>({});
  const [submitting, setSubmitting] = useState<Record<number,boolean>>({});
  const [editingScore, setEditingScore] = useState<Record<number,boolean>>({});

  // Communications
  const [notifTarget, setNotifTarget] = useState<'all' | 'specific'>('all');
  const [notifUserIds, setNotifUserIds] = useState<number[]>([]);
  const [notifTitle, setNotifTitle] = useState('');
  const [notifMessage, setNotifMessage] = useState('');
  const [notifEmail, setNotifEmail] = useState(true);
  const [notifPush, setNotifPush] = useState(false);
  const [notifSending, setNotifSending] = useState(false);
  const [notifOk, setNotifOk] = useState('');
  const [notifErr, setNotifErr] = useState('');

  // Match Digest Push
  const [digestEmails, setDigestEmails] = useState<string[]>([]);
  const [digestSending, setDigestSending] = useState(false);
  const [digestOk, setDigestOk] = useState('');
  const [digestErr, setDigestErr] = useState('');

  useEffect(() => {
    if (!isLoggedIn() || !isAdmin()) { router.push('/login'); return; }
    loadMatches();
    loadUsers();
  }, []);

  async function loadMatches() {
    setLoadingM(true); setListErr('');
    try {
      const data = await adminGetAllMatches();
      setMatches(data);
    } catch (e: any) {
      setListErr(e.message || 'Failed to load matches.');
    } finally {
      setLoadingM(false);
    }
  }

  async function loadUsers() {
    setLoadingU(true); setUserErr('');
    try {
      const data = await adminGetAllUsers();
      setUsers(data);
    } catch (e: any) {
      setUserErr(e.message || 'Failed to load users.');
    } finally {
      setLoadingU(false);
    }
  }

  async function handleApproveUser(userId: number) {
    if (!confirm('Approve this user?')) return;
    try {
      await adminApproveUser(userId);
      await loadUsers();
    } catch (e: any) {
      alert(e.message || 'Failed to approve user');
    }
  }

  async function handleRemoveUser(userId: number) {
    if (!confirm('Are you sure you want to permanently delete this user and all their predictions?')) return;
    try {
      await adminRemoveUser(userId);
      await loadUsers();
    } catch (e: any) {
      alert(e.message || 'Failed to remove user');
    }
  }

  async function handleResetScore(userId: number) {
    if (!confirm('Are you ABSOLUTELY sure you want to reset this user\'s score to 0? This cannot be undone.')) return;
    try {
      await adminResetScore(userId);
      await loadUsers();
    } catch (e: any) {
      alert(e.message || 'Failed to reset score');
    }
  }

  async function handleDeleteMatch(matchId: number) {
    if (!confirm('Are you sure you want to permanently delete this match and all predictions associated with it?')) return;
    try {
      await adminDeleteMatch(matchId);
      await loadMatches();
    } catch (e: any) {
      alert(e.message || 'Failed to delete match');
    }
  }

  async function handleCreateMatch(e: React.FormEvent) {
    e.preventDefault();
    setCreateErr(''); setCreateOk('');
    if (!teamA.trim() || !teamB.trim() || !startTime) {
      setCreateErr('All fields are required.');
      return;
    }
    setCreating(true);
    try {
      // Send the literal local time entered by the user without shifting to UTC
      const isoTime = startTime.length === 16 ? startTime + ':00' : startTime;
      await adminCreateMatch(teamA.trim().toUpperCase(), teamB.trim().toUpperCase(), isoTime, isKnockout);
      setCreateOk(`Match "${teamA.toUpperCase()} vs ${teamB.toUpperCase()}" created${isKnockout ? ' [KNOCKOUT]' : ''}!`);
      setTeamA(''); setTeamB(''); setStartTime(''); setIsKnockout(false);
      await loadMatches();
    } catch (e: any) {
      setCreateErr(e.message || 'Failed to create match.');
    } finally {
      setCreating(false);
    }
  }

  async function handleSubmitResult(matchId: number, match: MatchResponse) {
    const a = parseInt(resultA[matchId] ?? '');
    const b = parseInt(resultB[matchId] ?? '');
    if (isNaN(a) || isNaN(b)) {
      setSubmitMsg(p => ({ ...p, [matchId]: 'Enter valid scores.' }));
      return;
    }
    // For knockout matches with tied scores, require a penalty winner
    const isMatchKnockout = match.isKnockout || (match as any).knockout;
    if (isMatchKnockout && a === b && !penaltyWinner[matchId]) {
      setSubmitMsg(p => ({ ...p, [matchId]: 'Knockout match tied — select penalty winner.' }));
      return;
    }
    setSubmitting(p => ({ ...p, [matchId]: true }));
    setSubmitMsg(p => ({ ...p, [matchId]: '' }));
    try {
      const pen = isMatchKnockout && a === b ? (penaltyWinner[matchId] as 'TEAM_A' | 'TEAM_B') : undefined;
      await adminSubmitResult(matchId, a, b, pen);
      setSubmitMsg(p => ({ ...p, [matchId]: '✓ Result saved & scores processed' }));
      setEditingScore(p => ({ ...p, [matchId]: false }));
      setPenaltyWinner(p => ({ ...p, [matchId]: '' }));
      await loadMatches();
    } catch (e: any) {
      setSubmitMsg(p => ({ ...p, [matchId]: e.message || 'Failed to submit result.' }));
    } finally {
      setSubmitting(p => ({ ...p, [matchId]: false }));
    }
  }

  function isWithin24Hours(isoTime: string) {
    const d = new Date(isoTime);
    const now = new Date();
    const diffHours = Math.abs(now.getTime() - d.getTime()) / (1000 * 60 * 60);
    return diffHours <= 24;
  }

  async function handleSendNotification(e: React.FormEvent) {
    e.preventDefault();
    setNotifErr(''); setNotifOk('');
    if (!notifTitle.trim() || !notifMessage.trim()) {
      setNotifErr('Title and Message are required.');
      return;
    }
    if (!notifEmail && !notifPush) {
      setNotifErr('Select at least one delivery method (Email or Push).');
      return;
    }
    if (notifTarget === 'specific' && notifUserIds.length === 0) {
      setNotifErr('Select at least one user.');
      return;
    }
    
    setNotifSending(true);
    try {
      await adminSendNotification({
        userIds: notifTarget === 'all' ? [] : notifUserIds,
        title: notifTitle,
        message: notifMessage,
        sendEmail: notifEmail,
        sendPush: notifPush
      });
      setNotifOk('Notification sent successfully!');
      setNotifTitle('');
      setNotifMessage('');
      setNotifUserIds([]);
    } catch (e: any) {
      setNotifErr(e.message || 'Failed to send notification.');
    } finally {
      setNotifSending(false);
    }
  }

  async function handleSendMatchDigest(e: React.FormEvent) {
    e.preventDefault();
    setDigestErr(''); setDigestOk('');
    if (digestEmails.length === 0) {
      setDigestErr('Select at least one user to push the digest to.');
      return;
    }
    setDigestSending(true);
    try {
      await adminSendMatchDigest(digestEmails);
      setDigestOk(`✓ Match digest pushed to ${digestEmails.length} user(s) for all upcoming matches (Jun 29 10:30 → Jul 4).`);
      setDigestEmails([]);
    } catch (e: any) {
      setDigestErr(e.message || 'Failed to send match digest.');
    } finally {
      setDigestSending(false);
    }
  }

  const pending   = matches.filter(m => m.status !== 'COMPLETED');
  const completed = matches.filter(m => m.status === 'COMPLETED');

  return (
    <>
      <Navbar />
      <main className="page">
        <div className="page-header">
          <h1 className="page-title">
            Admin Panel
            <span className="page-title-badge" style={{ borderColor:'rgba(245,158,11,.4)',
              color:'var(--amber)', background:'rgba(245,158,11,.08)' }}>🔐 Admin</span>
          </h1>
          <p className="page-subtitle">Create matches and submit final scores to trigger scoring.</p>
        </div>

        <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid var(--border)' }}>
          <button 
            onClick={() => setActiveTab('matches')}
            style={{ 
              background: 'none', border: 'none', color: activeTab === 'matches' ? 'var(--text)' : 'var(--text-faint)', 
              fontWeight: 700, padding: '10px 4px', fontSize: '1rem', cursor: 'pointer',
              borderBottom: activeTab === 'matches' ? '2px solid var(--accent)' : '2px solid transparent'
            }}>
            Matches
          </button>
          <button 
            onClick={() => setActiveTab('users')}
            style={{ 
              background: 'none', border: 'none', color: activeTab === 'users' ? 'var(--text)' : 'var(--text-faint)', 
              fontWeight: 700, padding: '10px 4px', fontSize: '1rem', cursor: 'pointer',
              borderBottom: activeTab === 'users' ? '2px solid var(--accent)' : '2px solid transparent'
            }}>
            Users ({users.filter(u => !u.isApprovedByAdmin).length > 0 ? '!' : ''})
          </button>
          <button 
            onClick={() => setActiveTab('communications')}
            style={{ 
              background: 'none', border: 'none', color: activeTab === 'communications' ? 'var(--text)' : 'var(--text-faint)', 
              fontWeight: 700, padding: '10px 4px', fontSize: '1rem', cursor: 'pointer',
              borderBottom: activeTab === 'communications' ? '2px solid var(--accent)' : '2px solid transparent'
            }}>
            Communications
          </button>
        </div>

        {activeTab === 'matches' && (
          <div className="admin-grid">
          {/* ── Create Match Form ── */}
          <div className="card admin-form-card">
            <div className="admin-heading">Create New Match</div>

            {createErr && <div className="error-msg">{createErr}</div>}
            {createOk  && <div className="success-msg">{createOk}</div>}

            <form onSubmit={handleCreateMatch}>
              <div style={{ marginBottom:6 }}>
                <div style={{ fontSize:'.72rem', color:'var(--text-faint)', marginBottom:4,
                  textTransform:'uppercase', letterSpacing:'.06em', fontWeight:600 }}>Team A</div>
                <select className="form-input-dark" value={teamA} onChange={e => setTeamA(e.target.value)} required>
                  <option value="" disabled>Select Team A</option>
                  {TEAM_LIST.map(t => (
                    <option key={t.name} value={t.name}>{t.flag} {t.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom:6 }}>
                <div style={{ fontSize:'.72rem', color:'var(--text-faint)', marginBottom:4,
                  textTransform:'uppercase', letterSpacing:'.06em', fontWeight:600 }}>Team B</div>
                <select className="form-input-dark" value={teamB} onChange={e => setTeamB(e.target.value)} required>
                  <option value="" disabled>Select Team B</option>
                  {TEAM_LIST.map(t => (
                   <option key={t.name} value={t.name}>{t.flag} {t.name}</option>
                  ))}
                </select>
              </div>
              <div style={{ marginBottom:14 }}>
                <div style={{ fontSize:'.72rem', color:'var(--text-faint)', marginBottom:4,
                  textTransform:'uppercase', letterSpacing:'.06em', fontWeight:600 }}>Match Start Time</div>
                <input className="form-input-dark" type="datetime-local"
                  value={startTime} onChange={e => setStartTime(e.target.value)}
                  style={{ colorScheme:'dark' }} required />
              </div>
              {/* Knockout toggle */}
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px',
                cursor: 'pointer', padding: '10px 12px', borderRadius: '8px',
                background: isKnockout ? 'rgba(245,158,11,.08)' : 'var(--surface-2)',
                border: isKnockout ? '1px solid rgba(245,158,11,.3)' : '1px solid var(--border)',
                transition: 'all .15s' }}>
                <input type="checkbox" checked={isKnockout} onChange={e => setIsKnockout(e.target.checked)}
                  style={{ accentColor: 'var(--amber)', width: '16px', height: '16px', flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: '.85rem', fontWeight: 700, color: isKnockout ? 'var(--amber)' : 'var(--text)' }}>
                    🏆 Knockout Stage Match
                  </div>
                  <div style={{ fontSize: '.72rem', color: 'var(--text-faint)', marginTop: '2px' }}>
                    No draws — enables penalty winner selection on result submission
                  </div>
                </div>
              </label>
              <button className="btn-accent-sm w-full" type="submit" disabled={creating}
                style={{ width:'100%' }}>
                {creating ? 'Creating…' : '＋ Create Match'}
              </button>
            </form>
          </div>

          {/* ── Match List ── */}
          <div>
            {/* Pending results */}
            {pending.length > 0 && (
              <div className="card" style={{ padding:0, marginBottom:20, overflow:'hidden' }}>
                <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)',
                  background:'var(--surface-2)' }}>
                  <div className="admin-heading" style={{ marginBottom:0 }}>
                    Awaiting Results ({pending.length})
                  </div>
                </div>
                {pending.map(m => (
                  <div key={m.id} className="admin-match-row">
                    <div style={{ flex:1 }}>
                      <div className="admin-match-teams">
                        {getFlag(m.teamA)} {m.teamA} <span style={{color:'var(--text-faint)', fontSize:'.8em', margin:'0 6px'}}>vs</span> {getFlag(m.teamB)} {m.teamB}
                      </div>
                      <div className="admin-match-meta">
                        {formatDT(m.startTime)} ·{' '}
                        <span style={{ color: m.status === 'LOCKED' ? 'var(--amber)' : 'var(--accent)',
                          fontWeight:600 }}>
                          {m.status}
                        </span>
                      </div>
                    </div>
                    <div>
                      <div className="result-inputs" style={{ marginBottom:6 }}>
                        <input className="result-score-input" type="number" min={0} max={20}
                          placeholder="0"
                          value={resultA[m.id] ?? ''}
                          onChange={e => setResultA(p => ({ ...p, [m.id]: e.target.value }))} />
                        <span style={{ color:'var(--text-faint)', fontWeight:700 }}>—</span>
                        <input className="result-score-input" type="number" min={0} max={20}
                          placeholder="0"
                          value={resultB[m.id] ?? ''}
                          onChange={e => setResultB(p => ({ ...p, [m.id]: e.target.value }))} />
                        <button className="btn-accent-sm"
                          disabled={submitting[m.id]}
                          onClick={() => handleSubmitResult(m.id, m)}>
                          {submitting[m.id] ? '…' : 'Submit'}
                        </button>
                        <button className="btn-ghost-sm" 
                          onClick={() => handleDeleteMatch(m.id)}
                          style={{ padding: '0 8px', color: 'var(--red)', fontSize: '1rem' }}
                          title="Delete Match">
                          🗑️
                        </button>
                      </div>
                      {/* Penalty winner selector — shown for knockout matches when scores are tied */}
                      {(m.isKnockout || (m as any).knockout) && (
                        (() => {
                          const a = parseInt(resultA[m.id] ?? 'x');
                          const b = parseInt(resultB[m.id] ?? 'x');
                          return !isNaN(a) && !isNaN(b) && a === b ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                              <span style={{ fontSize: '.72rem', color: 'var(--amber)', fontWeight: 600 }}>🏆 Pen winner:</span>
                              <select className="form-input-dark" style={{ flex: 1, fontSize: '.78rem', padding: '4px 8px' }}
                                value={penaltyWinner[m.id] ?? ''}
                                onChange={e => setPenaltyWinner(p => ({ ...p, [m.id]: e.target.value as 'TEAM_A' | 'TEAM_B' }))}>
                                <option value="" disabled>Select…</option>
                                <option value="TEAM_A">{m.teamA}</option>
                                <option value="TEAM_B">{m.teamB}</option>
                              </select>
                            </div>
                          ) : null;
                        })()
                      )}
                      {submitMsg[m.id] && (
                        <div style={{ fontSize:'.75rem', textAlign:'right',
                          color: submitMsg[m.id].startsWith('✓') ? 'var(--accent)' : 'var(--red)' }}>
                          {submitMsg[m.id]}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Completed */}
            {completed.length > 0 && (
              <div className="card" style={{ padding:0, overflow:'hidden' }}>
                <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)',
                  background:'var(--surface-2)' }}>
                  <div className="admin-heading" style={{ marginBottom:0 }}>
                    Completed ({completed.length})
                  </div>
                </div>
                {completed.map(m => (
                  <div key={m.id} className="admin-match-row">
                    <div style={{ flex:1 }}>
                      <div className="admin-match-teams">
                        {getFlag(m.teamA)} {m.teamA} <span style={{color:'var(--text-faint)', fontSize:'.8em', margin:'0 6px'}}>vs</span> {getFlag(m.teamB)} {m.teamB}
                      </div>
                      <div className="admin-match-meta">{formatDT(m.startTime)}</div>
                    </div>
                    <div style={{ textAlign:'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                      {!editingScore[m.id] ? (
                        <>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ fontWeight:900, fontSize:'1.1rem', color:'var(--text)' }}>
                              {m.teamAScore} — {m.teamBScore}
                            </div>
                            {isWithin24Hours(m.startTime) && (
                              <button className="btn-ghost-sm"
                                onClick={() => {
                                  setResultA(p => ({ ...p, [m.id]: (m.teamAScore ?? 0).toString() }));
                                  setResultB(p => ({ ...p, [m.id]: (m.teamBScore ?? 0).toString() }));
                                  const isMKnockout = m.isKnockout || (m as any).knockout;
                                  if (isMKnockout && m.actualGoalDiff === 0 && m.actualWinner && m.actualWinner !== 'DRAW') {
                                    setPenaltyWinner(p => ({ ...p, [m.id]: m.actualWinner as 'TEAM_A' | 'TEAM_B' }));
                                  }
                                  setEditingScore(p => ({ ...p, [m.id]: true }));
                                }}
                                style={{ padding: '0 4px', color: 'var(--accent)', fontSize: '.8rem' }}
                                title="Edit Score">
                                ✏️ Edit
                              </button>
                            )}
                            <button className="btn-ghost-sm" 
                              onClick={() => handleDeleteMatch(m.id)}
                              style={{ padding: '0 4px', color: 'var(--red)', fontSize: '1rem' }}
                              title="Delete Match">
                              🗑️
                            </button>
                          </div>
                          <div style={{ fontSize:'.72rem', color:'var(--blue)', fontWeight:600 }}>
                            ✓ Settled
                          </div>
                        </>
                      ) : (
                        <div>
                          <div className="result-inputs" style={{ marginBottom:6 }}>
                            <input className="result-score-input" type="number" min={0} max={20}
                              placeholder="0"
                              value={resultA[m.id] ?? ''}
                              onChange={e => setResultA(p => ({ ...p, [m.id]: e.target.value }))} />
                            <span style={{ color:'var(--text-faint)', fontWeight:700 }}>—</span>
                            <input className="result-score-input" type="number" min={0} max={20}
                              placeholder="0"
                              value={resultB[m.id] ?? ''}
                              onChange={e => setResultB(p => ({ ...p, [m.id]: e.target.value }))} />
                            <button className="btn-accent-sm"
                              disabled={submitting[m.id]}
                              onClick={() => handleSubmitResult(m.id, m)}>
                              {submitting[m.id] ? '…' : 'Save'}
                            </button>
                            <button className="btn-ghost-sm"
                              onClick={() => setEditingScore(p => ({ ...p, [m.id]: false }))}
                              style={{ padding: '0 8px', color: 'var(--text-muted)' }}>
                              Cancel
                            </button>
                          </div>
                          {/* Penalty winner selector for knockout edit */}
                          {(m.isKnockout || (m as any).knockout) && (
                            (() => {
                              const a = parseInt(resultA[m.id] ?? 'x');
                              const b = parseInt(resultB[m.id] ?? 'x');
                              return !isNaN(a) && !isNaN(b) && a === b ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                  <span style={{ fontSize: '.72rem', color: 'var(--amber)', fontWeight: 600 }}>🏆 Pen winner:</span>
                                  <select className="form-input-dark" style={{ flex: 1, fontSize: '.78rem', padding: '4px 8px' }}
                                    value={penaltyWinner[m.id] ?? ''}
                                    onChange={e => setPenaltyWinner(p => ({ ...p, [m.id]: e.target.value as 'TEAM_A' | 'TEAM_B' }))}>
                                    <option value="" disabled>Select…</option>
                                    <option value="TEAM_A">{m.teamA}</option>
                                    <option value="TEAM_B">{m.teamB}</option>
                                  </select>
                                </div>
                              ) : null;
                            })()
                          )}
                          {submitMsg[m.id] && (
                            <div style={{ fontSize:'.75rem', textAlign:'right',
                              color: submitMsg[m.id].startsWith('✓') ? 'var(--accent)' : 'var(--red)' }}>
                              {submitMsg[m.id]}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {!loadingM && matches.length === 0 && (
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <div>No matches created yet. Use the form to add one.</div>
              </div>
            )}
            {loadingM && <div className="spinner-wrap"><div className="spinner" /></div>}
            {listErr && <div className="error-msg">{listErr}</div>}
          </div>
        </div>
        )}

        {activeTab === 'users' && (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
             <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', background:'var(--surface-2)' }}>
                <div className="admin-heading" style={{ marginBottom:0 }}>User Management</div>
             </div>
             
             {loadingU && <div className="spinner-wrap"><div className="spinner" /></div>}
             {userErr && <div style={{ padding: '20px' }}><div className="error-msg">{userErr}</div></div>}
             
             {!loadingU && users.length === 0 && (
               <div className="empty-state">
                 <div className="empty-icon">👥</div>
                 <div>No users found.</div>
               </div>
             )}

             {!loadingU && users.length > 0 && (
               <div style={{ overflowX: 'auto' }}>
                 <table className="leaderboard-table">
                   <thead>
                     <tr>
                       <th>User</th>
                       <th>Email</th>
                       <th>Status</th>
                       <th className="right">Points</th>
                       <th className="right">Actions</th>
                     </tr>
                   </thead>
                   <tbody>
                     {users.map(u => (
                       <tr key={u.id}>
                         <td>
                           <div className="username-cell">{u.username}</div>
                         </td>
                         <td>{u.email}</td>
                         <td>
                           {!u.isEmailVerified ? (
                             <span style={{ fontSize: '.75rem', padding: '3px 8px', borderRadius: '99px', background: 'var(--surface-3)', color: 'var(--text-faint)' }}>Unverified</span>
                           ) : u.isApprovedByAdmin ? (
                             <span style={{ fontSize: '.75rem', padding: '3px 8px', borderRadius: '99px', background: 'var(--accent-glow2)', color: 'var(--accent)' }}>Approved</span>
                           ) : (
                             <span style={{ fontSize: '.75rem', padding: '3px 8px', borderRadius: '99px', background: 'rgba(245,158,11,.15)', color: 'var(--amber)' }}>Pending Approval</span>
                           )}
                         </td>
                         <td className="right points-cell">{u.totalPoints}</td>
                         <td className="right">
                           <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                             {u.isEmailVerified && !u.isApprovedByAdmin && (
                               <button className="btn-accent-sm" onClick={() => handleApproveUser(u.id)} style={{ padding: '5px 10px', fontSize: '.7rem' }}>
                                 Approve
                               </button>
                             )}
                             <button className="btn-ghost-sm" onClick={() => handleResetScore(u.id)} style={{ padding: '5px 10px', fontSize: '.7rem', color: 'var(--amber)' }}>
                               Reset Score
                             </button>
                             <button className="btn-ghost-sm" onClick={() => handleRemoveUser(u.id)} style={{ padding: '5px 10px', fontSize: '.7rem', color: 'var(--red)' }}>
                               Remove
                             </button>
                           </div>
                         </td>
                       </tr>
                     ))}
                   </tbody>
                 </table>
               </div>
             )}
          </div>
         )}

         {activeTab === 'communications' && (
           <div style={{ maxWidth: '600px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '24px' }}>

             {/* ── Match Digest Push ── */}
             <div className="card admin-form-card">
               <div className="admin-heading" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                 📲 Match Digest Push
                 <span style={{ fontSize: '.7rem', fontWeight: 600, padding: '2px 8px', borderRadius: '99px',
                   background: 'rgba(16,185,129,.12)', color: 'var(--accent)', border: '1px solid rgba(16,185,129,.25)' }}>
                   Jun 29 → Jul 4
                 </span>
               </div>
               <p style={{ fontSize: '.82rem', color: 'var(--text-faint)', marginBottom: '16px', lineHeight: 1.5 }}>
                 Push all upcoming matches (from tomorrow 10:30 AM through July 4, 2026) to selected users.
                 Skips today's active window. Safe to re-run — each push is a new notification, no database changes.
               </p>

               {digestErr && <div className="error-msg">{digestErr}</div>}
               {digestOk  && <div className="success-msg">{digestOk}</div>}

               <form onSubmit={handleSendMatchDigest}>
                 <div style={{ marginBottom: 14 }}>
                   <div style={{ fontSize:'.72rem', color:'var(--text-faint)', marginBottom: 8,
                     textTransform:'uppercase', letterSpacing:'.06em', fontWeight:600 }}>Select Users</div>
                   <div style={{ display: 'flex', flexDirection: 'column', gap: '8px',
                     background: 'var(--surface-2)', borderRadius: '8px', padding: '12px',
                     border: '1px solid var(--border)', maxHeight: '200px', overflowY: 'auto' }}>
                     {users.filter(u => u.isApprovedByAdmin).map(u => (
                       <label key={u.id} style={{ display: 'flex', alignItems: 'center', gap: '10px',
                         cursor: 'pointer', padding: '6px 8px', borderRadius: '6px',
                         background: digestEmails.includes(u.email) ? 'rgba(16,185,129,.08)' : 'transparent',
                         border: digestEmails.includes(u.email) ? '1px solid rgba(16,185,129,.25)' : '1px solid transparent',
                         transition: 'all .15s' }}>
                         <input
                           type="checkbox"
                           checked={digestEmails.includes(u.email)}
                           onChange={e => {
                             if (e.target.checked) {
                               setDigestEmails(prev => [...prev, u.email]);
                             } else {
                               setDigestEmails(prev => prev.filter(em => em !== u.email));
                             }
                           }}
                           style={{ accentColor: 'var(--accent)', width: '15px', height: '15px', flexShrink: 0 }}
                         />
                         <div>
                           <div style={{ fontSize: '.85rem', fontWeight: 600, color: 'var(--text)' }}>{u.username}</div>
                           <div style={{ fontSize: '.72rem', color: 'var(--text-faint)' }}>{u.email}</div>
                         </div>
                       </label>
                     ))}
                     {users.filter(u => u.isApprovedByAdmin).length === 0 && (
                       <div style={{ fontSize: '.8rem', color: 'var(--text-faint)', padding: '8px' }}>No approved users found.</div>
                     )}
                   </div>
                   <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                     <button type="button" className="btn-ghost-sm"
                       onClick={() => setDigestEmails(users.filter(u => u.isApprovedByAdmin).map(u => u.email))}
                       style={{ fontSize: '.72rem', padding: '4px 10px' }}>
                       Select All
                     </button>
                     <button type="button" className="btn-ghost-sm"
                       onClick={() => setDigestEmails([])}
                       style={{ fontSize: '.72rem', padding: '4px 10px' }}>
                       Clear
                     </button>
                     {digestEmails.length > 0 && (
                       <span style={{ fontSize: '.72rem', color: 'var(--accent)', alignSelf: 'center', marginLeft: 'auto' }}>
                         {digestEmails.length} selected
                       </span>
                     )}
                   </div>
                 </div>

                 <button className="btn-accent-sm" type="submit" disabled={digestSending || digestEmails.length === 0}
                   style={{ width: '100%' }}>
                   {digestSending ? 'Pushing…' : `📲 Push Match Digest${digestEmails.length > 0 ? ` (${digestEmails.length} user${digestEmails.length > 1 ? 's' : ''})` : ''}`}
                 </button>
               </form>
             </div>

             {/* ── Custom Notification ── */}
             <div className="card admin-form-card">
               <div className="admin-heading">Send Custom Notification</div>
               {notifErr && <div className="error-msg">{notifErr}</div>}
               {notifOk  && <div className="success-msg">{notifOk}</div>}

               <form onSubmit={handleSendNotification}>
                 <div style={{ marginBottom: 14 }}>
                   <div style={{ fontSize:'.72rem', color:'var(--text-faint)', marginBottom:4, textTransform:'uppercase', letterSpacing:'.06em', fontWeight:600 }}>Target Audience</div>
                   <select className="form-input-dark" value={notifTarget} onChange={e => setNotifTarget(e.target.value as 'all'|'specific')}>
                     <option value="all">All Users</option>
                     <option value="specific">Specific Users</option>
                   </select>
                 </div>
                 
                 {notifTarget === 'specific' && (
                   <div style={{ marginBottom: 14 }}>
                     <div style={{ fontSize:'.72rem', color:'var(--text-faint)', marginBottom:4, textTransform:'uppercase', letterSpacing:'.06em', fontWeight:600 }}>Select Users</div>
                     <select className="form-input-dark" multiple value={notifUserIds.map(String)} onChange={e => {
                       const selected = Array.from(e.target.selectedOptions, option => parseInt(option.value));
                       setNotifUserIds(selected);
                     }} style={{ height: '120px' }}>
                       {users.map(u => (
                         <option key={u.id} value={u.id}>{u.username} ({u.email})</option>
                       ))}
                     </select>
                     <div style={{ fontSize:'.7rem', color:'var(--text-faint)', marginTop: 4 }}>Hold Cmd/Ctrl to select multiple.</div>
                   </div>
                 )}

                 <div style={{ marginBottom: 14 }}>
                   <div style={{ fontSize:'.72rem', color:'var(--text-faint)', marginBottom:4, textTransform:'uppercase', letterSpacing:'.06em', fontWeight:600 }}>Title</div>
                   <input className="form-input-dark" type="text" value={notifTitle} onChange={e => setNotifTitle(e.target.value)} required placeholder="E.g. Tournament Update!" />
                 </div>

                 <div style={{ marginBottom: 14 }}>
                   <div style={{ fontSize:'.72rem', color:'var(--text-faint)', marginBottom:4, textTransform:'uppercase', letterSpacing:'.06em', fontWeight:600 }}>Message</div>
                   <textarea className="form-input-dark" rows={5} value={notifMessage} onChange={e => setNotifMessage(e.target.value)} required placeholder="Write your message here..."></textarea>
                 </div>

                 <div style={{ marginBottom: 20 }}>
                   <div style={{ fontSize:'.72rem', color:'var(--text-faint)', marginBottom:8, textTransform:'uppercase', letterSpacing:'.06em', fontWeight:600 }}>Delivery Method</div>
                   <div style={{ display: 'flex', gap: '16px' }}>
                     <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                       <input type="checkbox" checked={notifEmail} onChange={e => setNotifEmail(e.target.checked)} />
                       <span>Email</span>
                     </label>
                     <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                       <input type="checkbox" checked={notifPush} onChange={e => setNotifPush(e.target.checked)} />
                       <span>Push Notification</span>
                     </label>
                   </div>
                 </div>

                 <button className="btn-accent-sm w-full" type="submit" disabled={notifSending} style={{ width:'100%' }}>
                   {notifSending ? 'Sending…' : '📨 Send Notification'}
                 </button>
               </form>
             </div>

           </div>
         )}
      </main>
    </>
  );
}
