'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import { adminGetAllMatches, adminCreateMatch, adminSubmitResult, adminDeleteMatch, adminGetAllUsers, adminApproveUser, adminRemoveUser, adminResetScore, adminSendNotification } from '@/lib/api';
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
  const [creating,  setCreating]  = useState(false);
  const [createErr, setCreateErr] = useState('');
  const [createOk,  setCreateOk]  = useState('');

  // Result submission per match
  const [resultA, setResultA]   = useState<Record<number,string>>({});
  const [resultB, setResultB]   = useState<Record<number,string>>({});
  const [submitMsg, setSubmitMsg] = useState<Record<number,string>>({});
  const [submitting, setSubmitting] = useState<Record<number,boolean>>({});

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
      await adminCreateMatch(teamA.trim().toUpperCase(), teamB.trim().toUpperCase(), isoTime);
      setCreateOk(`Match "${teamA.toUpperCase()} vs ${teamB.toUpperCase()}" created!`);
      setTeamA(''); setTeamB(''); setStartTime('');
      await loadMatches();
    } catch (e: any) {
      setCreateErr(e.message || 'Failed to create match.');
    } finally {
      setCreating(false);
    }
  }

  async function handleSubmitResult(matchId: number) {
    const a = parseInt(resultA[matchId] ?? '');
    const b = parseInt(resultB[matchId] ?? '');
    if (isNaN(a) || isNaN(b)) {
      setSubmitMsg(p => ({ ...p, [matchId]: 'Enter valid scores.' }));
      return;
    }
    setSubmitting(p => ({ ...p, [matchId]: true }));
    setSubmitMsg(p => ({ ...p, [matchId]: '' }));
    try {
      await adminSubmitResult(matchId, a, b);
      setSubmitMsg(p => ({ ...p, [matchId]: '✓ Result saved & scores processed' }));
      await loadMatches();
    } catch (e: any) {
      setSubmitMsg(p => ({ ...p, [matchId]: e.message || 'Failed to submit result.' }));
    } finally {
      setSubmitting(p => ({ ...p, [matchId]: false }));
    }
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
                          onClick={() => handleSubmitResult(m.id)}>
                          {submitting[m.id] ? '…' : 'Submit'}
                        </button>
                        <button className="btn-ghost-sm" 
                          onClick={() => handleDeleteMatch(m.id)}
                          style={{ padding: '0 8px', color: 'var(--red)', fontSize: '1rem' }}
                          title="Delete Match">
                          🗑️
                        </button>
                      </div>
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
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{ fontWeight:900, fontSize:'1.1rem', color:'var(--text)' }}>
                          {m.teamAScore} — {m.teamBScore}
                        </div>
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
           <div className="card admin-form-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
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
         )}
      </main>
    </>
  );
}
