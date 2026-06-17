'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn, isAdmin } from '@/lib/auth';

import type { MatchResponse } from '@/lib/api';
import { getLatestMatch } from '@/lib/api';
import { getFlag, getCode } from '@/lib/teams';

export default function LandingPage() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [latestMatch, setLatestMatch] = useState<MatchResponse | null>(null);

  useEffect(() => {
    setMounted(true);
    // Redirect authenticated users straight to their dashboard
    if (isLoggedIn()) {
      router.push(isAdmin() ? '/admin/dashboard' : '/dashboard');
    } else {
      getLatestMatch().then(match => {
        if (match) setLatestMatch(match);
      });
    }
  }, []);

  if (!mounted) return null;

  return (
    <>
      {/* ── Navbar ─────────────────────────────────────────────────── */}
      <header className="landing-nav">
        <div className="landing-nav-inner">
          <div className="landing-logo">⚽ <span>THE FINAL</span> THIRD</div>
          <div className="landing-nav-actions">
            <button className="lnd-btn-ghost" onClick={() => router.push('/login')}>Sign In</button>
            <button className="lnd-btn-accent" onClick={() => router.push('/register')}>Get Started</button>
          </div>
        </div>
      </header>

      <main>
        {/* ── Hero ───────────────────────────────────────────────────── */}
        <section className="hero">
          {/* Field lines decoration */}
          <div className="field-lines" aria-hidden="true">
            <div className="field-circle" />
            <div className="field-center-line" />
            <div className="field-arc" />
          </div>

          <div className="hero-content">
            <div className="hero-badge">🏆 The Final Third Predictions</div>

            <h1 className="hero-title">
              Predict. Score.<br />
              <span className="hero-title-accent">Dominate.</span>
            </h1>

            <p className="hero-subtitle">
              Predict match scores, earn points based on accuracy, and climb the
              global leaderboard. Every goal difference matters.
            </p>

            <div className="hero-ctas">
              <button className="lnd-btn-hero" onClick={() => router.push('/register')}>
                Start Predicting →
              </button>
              <button className="lnd-btn-outline" onClick={() => router.push('/login')}>
                Sign In
              </button>
            </div>

            {/* Mini stats strip */}
            <div className="hero-stats">
              <div className="hero-stat">
                <span className="hero-stat-num">10</span>
                <span className="hero-stat-label">Max Points Per Match</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat">
                <span className="hero-stat-num">60<span style={{fontSize:'1rem'}}>min</span></span>
                <span className="hero-stat-label">Prediction Lockout</span>
              </div>
              <div className="hero-stat-divider" />
              <div className="hero-stat">
                <span className="hero-stat-num">∞</span>
                <span className="hero-stat-label">Players on Leaderboard</span>
              </div>
            </div>
          </div>

          {/* Floating badge */}
          <div className="hero-float-card">
            <div className="hfc-label">
              {latestMatch 
                ? (latestMatch.status === 'COMPLETED' ? 'Latest Match' : 'Live Match') 
                : 'Live Match'}
            </div>
            <div className="hfc-teams">
              <div className="hfc-team">
                <div className="hfc-flag">{latestMatch ? getFlag(latestMatch.teamA) : '🇫🇷'}</div>
                <div className="hfc-name">
                  {latestMatch ? getCode(latestMatch.teamA) : 'FRA'}
                </div>
              </div>
              <div className="hfc-score">
                {latestMatch && latestMatch.status === 'COMPLETED' 
                  ? `${latestMatch.teamAScore} — ${latestMatch.teamBScore}` 
                  : (latestMatch ? 'vs' : '3 — 1')}
              </div>
              <div className="hfc-team">
                <div className="hfc-flag">{latestMatch ? getFlag(latestMatch.teamB) : '🇩🇪'}</div>
                <div className="hfc-name">
                  {latestMatch ? getCode(latestMatch.teamB) : 'GER'}
                </div>
              </div>
            </div>
            <div className="hfc-pred">
              {latestMatch && latestMatch.status === 'COMPLETED' 
                ? `Actual Winner: ${latestMatch.actualWinner === 'DRAW' ? 'Draw' : (latestMatch.actualWinner === 'TEAM_A' ? latestMatch.teamA : latestMatch.teamB)}`
                : (latestMatch ? 'Predictions locking soon!' : <>Your prediction: France · GD 2 → <span style={{color:'var(--accent)'}}>+7.5 pts</span></>)}
            </div>
          </div>
        </section>

        {/* ── How It Works ────────────────────────────────────────────── */}
        <section className="section">
          <div className="section-inner">
            <div className="section-eyebrow">How It Works</div>
            <h2 className="section-title">Three steps to the top</h2>

            <div className="steps-grid">
              <div className="step-card">
                <div className="step-number">01</div>
                <div className="step-icon">🔮</div>
                <h3 className="step-title">Predict the Score</h3>
                <p className="step-desc">
                  Enter your predicted score for each match — Team A goals vs Team B goals.
                  Predictions lock 60 minutes before kick-off.
                </p>
              </div>
              <div className="step-connector" />
              <div className="step-card">
                <div className="step-number">02</div>
                <div className="step-icon">⚡</div>
                <h3 className="step-title">Earn Points</h3>
                <p className="step-desc">
                  Points are awarded based on accuracy. Correct winner + exact goal difference
                  = 10 points. Every goal matters.
                </p>
              </div>
              <div className="step-connector" />
              <div className="step-card">
                <div className="step-number">03</div>
                <div className="step-icon">🏆</div>
                <h3 className="step-title">Climb the Board</h3>
                <p className="step-desc">
                  Compete on the global leaderboard. Ties broken by exact predictions,
                  correct outcomes, and account age.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── Scoring Formula ─────────────────────────────────────────── */}
        <section className="section section-dark">
          <div className="section-inner">
            <div className="section-eyebrow">The Formula</div>
            <h2 className="section-title">Skill-based scoring</h2>
            <p className="section-sub">
              Not just who wins — how close your goal difference prediction is determines
              your points. The closer you are, the more you earn.
            </p>

            <div className="formula-box">
              <div className="formula-text">
                Points = max(0, <span className="formula-accent">10</span> − 2.5 × |GD<sub>pred</sub> − GD<sub>actual</sub>|)
              </div>
            </div>

            <div className="scoring-table">
              <div className="scoring-row header">
                <span>Predicted GD</span>
                <span>Actual GD</span>
                <span>Deviation</span>
                <span>Points</span>
              </div>
              {[
                ['3', '3', '0', '10.0 ⭐'],
                ['2', '3', '1', '7.5'],
                ['1', '3', '2', '5.0'],
                ['0', '3', '3', '2.5'],
                ['Wrong winner', '—', '—', '0'],
              ].map(([a,b,c,d], i) => (
                <div key={i} className={`scoring-row${i === 0 ? ' perfect' : i === 4 ? ' zero' : ''}`}>
                  <span>{a}</span><span>{b}</span><span>{c}</span>
                  <span className="scoring-pts">{d}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ────────────────────────────────────────────────── */}
        <section className="section">
          <div className="section-inner">
            <div className="section-eyebrow">Features</div>
            <h2 className="section-title">Everything you need</h2>

            <div className="features-grid">
              {[
                { icon:'⏱', title:'Live Countdown', desc:'Real-time lockout timers — cards auto-transition from editable to locked without page refreshes.' },
                { icon:'📅', title:'10:30 AM Window', desc:"Today's matches span a custom 24-hour window: 10:30 AM today to 10:30 AM tomorrow." },
                { icon:'🔒', title:'Enforced Lockout', desc:'Predictions blocked server-side 60 minutes before kick-off. No backdating allowed.' },
                { icon:'⚡', title:'Instant Settlement', desc:'Admin submits final score → scoring engine processes all predictions in a single transaction.' },
                { icon:'📊', title:'Rich History', desc:'Full record of past predictions, points earned, and match results in a clean timeline.' },
                { icon:'🥇', title:'Smart Tie-Breaker', desc:'Equal points? Ranked by exact goal diff predictions, then correct outcomes, then account age.' },
              ].map((f, i) => (
                <div key={i} className="feature-card">
                  <div className="feature-icon">{f.icon}</div>
                  <h3 className="feature-title">{f.title}</h3>
                  <p className="feature-desc">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── CTA Strip ───────────────────────────────────────────────── */}
        <section className="cta-strip">
          <div className="cta-inner">
            <div className="cta-glow" aria-hidden="true" />
            <div className="cta-ball" aria-hidden="true">⚽</div>
            <h2 className="cta-title">Ready to play?</h2>
            <p className="cta-sub">
              Join the predictor league. Prove your football knowledge match by match.
            </p>
            <button className="lnd-btn-hero" onClick={() => router.push('/register')}
              style={{ fontSize:'1rem', padding:'14px 36px' }}>
              Create Free Account →
            </button>
            <div style={{ marginTop:16, fontSize:'.83rem', color:'var(--text-faint)' }}>
              Already have an account?{' '}
              <span style={{ color:'var(--accent)', cursor:'pointer', fontWeight:600 }}
                onClick={() => router.push('/login')}>Sign in here</span>
            </div>
          </div>
        </section>

        {/* ── Footer ──────────────────────────────────────────────────── */}
        <footer className="landing-footer">
          <div className="landing-footer-inner">
            <div className="landing-logo" style={{ fontSize:'.9rem' }}>⚽ <span>THE FINAL</span> THIRD</div>
            <div style={{ fontSize:'.78rem', color:'var(--text-faint)' }}>
              Predict · Score · Dominate — Built with Spring Boot & Next.js
            </div>
          </div>
        </footer>
      </main>

      <style>{`
        /* ── Landing Nav ─────────────────────────────────────────── */
        .landing-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 100;
          background: rgba(9,9,11,.88); backdrop-filter: blur(16px);
          border-bottom: 1px solid var(--border); height: 64px;
          display: flex; align-items: center;
        }
        .landing-nav-inner {
          max-width: 1100px; margin: 0 auto; padding: 0 24px;
          width: 100%; display: flex; align-items: center; justify-content: space-between;
        }
        .landing-logo {
          font-size: 1rem; font-weight: 900; letter-spacing: .08em;
          text-transform: uppercase; color: var(--accent);
        }
        .landing-logo span { color: var(--text); }
        .landing-nav-actions { display: flex; gap: 10px; align-items: center; }

        /* ── Buttons ─────────────────────────────────────────────── */
        .lnd-btn-ghost {
          padding: 7px 18px; border-radius: var(--radius-sm);
          background: transparent; border: 1px solid var(--border-light);
          color: var(--text-muted); font-size: .85rem; font-weight: 500;
          cursor: pointer; transition: all var(--transition);
        }
        .lnd-btn-ghost:hover { border-color: var(--accent); color: var(--accent); }
        .lnd-btn-accent {
          padding: 8px 20px; border-radius: var(--radius-sm);
          background: var(--accent); color: #000; font-size: .85rem; font-weight: 700;
          border: none; cursor: pointer; transition: all var(--transition);
        }
        .lnd-btn-accent:hover { background: var(--accent-bright); box-shadow: var(--glow); }
        .lnd-btn-hero {
          padding: 13px 32px; border-radius: var(--radius);
          background: var(--accent); color: #000; font-size: .95rem; font-weight: 800;
          border: none; cursor: pointer; letter-spacing: .02em;
          transition: all var(--transition);
          box-shadow: 0 4px 24px var(--accent-glow);
        }
        .lnd-btn-hero:hover {
          background: var(--accent-bright); transform: translateY(-2px);
          box-shadow: 0 8px 32px rgba(16,185,129,.35);
        }
        .lnd-btn-outline {
          padding: 13px 32px; border-radius: var(--radius);
          background: transparent; border: 1.5px solid var(--border-light);
          color: var(--text-muted); font-size: .95rem; font-weight: 700;
          cursor: pointer; transition: all var(--transition);
        }
        .lnd-btn-outline:hover { border-color: var(--text-muted); color: var(--text); }

        /* ── Hero ────────────────────────────────────────────────── */
        .hero {
          min-height: 100vh; display: flex; align-items: center;
          padding: 120px 24px 80px; position: relative; overflow: hidden;
          background: var(--bg);
          background-image:
            radial-gradient(ellipse 70% 50% at 60% 30%, rgba(16,185,129,.12), transparent),
            radial-gradient(ellipse 50% 40% at 80% 70%, rgba(16,185,129,.06), transparent);
        }

        /* Field line decorations */
        .field-lines {
          position: absolute; inset: 0; pointer-events: none; overflow: hidden;
        }
        .field-circle {
          position: absolute; width: 400px; height: 400px; border-radius: 50%;
          border: 1px solid rgba(16,185,129,.07);
          top: 50%; left: 60%; transform: translate(-50%, -50%);
        }
        .field-center-line {
          position: absolute; top: 0; bottom: 0; left: 58%;
          width: 1px; background: linear-gradient(to bottom, transparent, rgba(16,185,129,.08), transparent);
        }
        .field-arc {
          position: absolute; width: 200px; height: 200px;
          border: 1px solid rgba(16,185,129,.06); border-radius: 50%;
          top: -50px; right: 10%;
        }

        .hero-content { max-width: 600px; position: relative; z-index: 1; }
        .hero-badge {
          display: inline-flex; align-items: center; gap: 6px;
          padding: 5px 14px; border-radius: 99px;
          background: rgba(16,185,129,.1); border: 1px solid rgba(16,185,129,.3);
          color: var(--accent); font-size: .78rem; font-weight: 700;
          letter-spacing: .07em; text-transform: uppercase; margin-bottom: 28px;
          animation: fadeUp .5s ease .1s both;
        }
        .hero-title {
          font-size: clamp(2.8rem, 6vw, 4.5rem); font-weight: 900;
          line-height: 1.05; letter-spacing: -.035em; margin-bottom: 22px;
          animation: fadeUp .5s ease .2s both; color: var(--text);
        }
        .hero-title-accent {
          background: linear-gradient(135deg, var(--accent) 0%, var(--accent-bright) 50%, var(--gold) 100%);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .hero-subtitle {
          font-size: 1.05rem; color: var(--text-muted); line-height: 1.65;
          margin-bottom: 36px; max-width: 480px;
          animation: fadeUp .5s ease .3s both;
        }
        .hero-ctas {
          display: flex; gap: 12px; flex-wrap: wrap; margin-bottom: 52px;
          animation: fadeUp .5s ease .4s both;
        }
        .hero-stats {
          display: flex; align-items: center; gap: 0;
          animation: fadeUp .5s ease .5s both;
        }
        .hero-stat { text-align: center; padding: 0 28px; }
        .hero-stat:first-child { padding-left: 0; }
        .hero-stat-num {
          display: block; font-size: 1.8rem; font-weight: 900; color: var(--text);
          line-height: 1; font-variant-numeric: tabular-nums;
        }
        .hero-stat-label {
          display: block; font-size: .72rem; color: var(--text-faint); font-weight: 500;
          text-transform: uppercase; letter-spacing: .06em; margin-top: 4px;
        }
        .hero-stat-divider {
          width: 1px; height: 44px; background: var(--border); flex-shrink: 0;
        }

        /* Floating match card */
        .hero-float-card {
          position: absolute; right: 8%; top: 50%; transform: translateY(-50%);
          width: 280px; background: var(--surface);
          border: 1px solid rgba(16,185,129,.3); border-radius: var(--radius-lg);
          padding: 20px; box-shadow: 0 24px 60px rgba(0,0,0,.5), var(--glow);
          animation: floatCard .6s ease .6s both;
          z-index: 1;
        }
        @keyframes floatCard {
          from { opacity:0; transform: translateY(calc(-50% + 20px)); }
          to   { opacity:1; transform: translateY(-50%); }
        }
        .hfc-label {
          font-size: .68rem; font-weight: 700; letter-spacing: .1em;
          text-transform: uppercase; color: var(--accent); margin-bottom: 14px;
          display: flex; align-items: center; gap: 6px;
        }
        .hfc-label::before {
          content:''; width:6px; height:6px; border-radius:50%;
          background: var(--accent); display:inline-block;
          animation: pulse-dot 1.5s ease-in-out infinite;
        }
        .hfc-teams {
          display: grid; grid-template-columns: 1fr auto 1fr;
          align-items: center; gap: 8px; margin-bottom: 14px;
        }
        .hfc-team { display: flex; flex-direction:column; align-items:center; gap:3px; }
        .hfc-flag { font-size: 1.5rem; }
        .hfc-name { font-size: .75rem; font-weight: 700; color: var(--text-muted);
          letter-spacing: .05em; }
        .hfc-score {
          font-size: 1.6rem; font-weight: 900; color: var(--text);
          text-align: center; letter-spacing: -.02em;
        }
        .hfc-pred {
          font-size: .75rem; color: var(--text-faint); text-align: center;
          padding: 8px; border-top: 1px solid var(--border);
          background: var(--surface-2); border-radius: var(--radius-sm);
          margin-top: 4px;
        }

        /* ── Sections ────────────────────────────────────────────── */
        .section { padding: 90px 24px; }
        .section-dark {
          background: var(--surface);
          border-top: 1px solid var(--border); border-bottom: 1px solid var(--border);
        }
        .section-inner { max-width: 1000px; margin: 0 auto; }
        .section-eyebrow {
          font-size: .72rem; font-weight: 700; letter-spacing: .12em;
          text-transform: uppercase; color: var(--accent); margin-bottom: 12px;
        }
        .section-title {
          font-size: clamp(1.8rem, 3.5vw, 2.4rem); font-weight: 800;
          letter-spacing: -.025em; margin-bottom: 14px; color: var(--text);
        }
        .section-sub {
          color: var(--text-muted); font-size: .95rem; line-height: 1.65;
          max-width: 540px; margin-bottom: 44px;
        }

        /* ── Steps ───────────────────────────────────────────────── */
        .steps-grid {
          display: grid;
          grid-template-columns: 1fr 40px 1fr 40px 1fr;
          align-items: center; gap: 0; margin-top: 52px;
        }
        .step-card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--radius-lg); padding: 28px 24px; position: relative;
          transition: border-color var(--transition), box-shadow var(--transition);
        }
        .step-card:hover {
          border-color: rgba(16,185,129,.4); box-shadow: 0 0 30px var(--accent-glow2);
        }
        .step-number {
          font-size: .72rem; font-weight: 800; color: var(--accent);
          letter-spacing: .1em; margin-bottom: 12px;
        }
        .step-icon { font-size: 2rem; margin-bottom: 12px; }
        .step-title {
          font-size: 1rem; font-weight: 700; margin-bottom: 8px; color: var(--text);
        }
        .step-desc { font-size: .84rem; color: var(--text-muted); line-height: 1.6; }
        .step-connector {
          display: flex; align-items: center; justify-content: center;
          color: var(--accent); font-size: 1.2rem; opacity: .5;
        }
        .step-connector::after { content: '→'; }

        /* ── Formula ─────────────────────────────────────────────── */
        .formula-box {
          background: var(--bg); border: 1px solid rgba(16,185,129,.25);
          border-radius: var(--radius-lg); padding: 22px 28px;
          font-size: 1.05rem; font-weight: 600; font-family: monospace;
          color: var(--text-2); margin-bottom: 32px;
          box-shadow: inset 0 0 40px rgba(16,185,129,.04);
          text-align: center;
        }
        .formula-accent { color: var(--accent); font-weight: 900; font-size: 1.2rem; }
        .scoring-table {
          border: 1px solid var(--border); border-radius: var(--radius-lg); overflow: hidden;
        }
        .scoring-row {
          display: grid; grid-template-columns: 1fr 1fr 1fr 1fr;
          padding: 12px 20px; border-bottom: 1px solid var(--border);
          font-size: .85rem; color: var(--text-muted);
          transition: background var(--transition);
        }
        .scoring-row:last-child { border-bottom: none; }
        .scoring-row.header {
          background: var(--bg); font-size: .7rem; font-weight: 700;
          letter-spacing: .08em; text-transform: uppercase; color: var(--text-faint);
        }
        .scoring-row:not(.header):hover { background: rgba(255,255,255,.02); }
        .scoring-row.perfect { background: rgba(16,185,129,.06); }
        .scoring-row.zero { opacity: .6; }
        .scoring-pts { font-weight: 800; color: var(--text); }
        .scoring-row.perfect .scoring-pts { color: var(--accent); }

        /* ── Features ────────────────────────────────────────────── */
        .features-grid {
          display: grid; grid-template-columns: repeat(3, 1fr);
          gap: 16px; margin-top: 48px;
        }
        .feature-card {
          background: var(--surface); border: 1px solid var(--border);
          border-radius: var(--radius-lg); padding: 24px 20px;
          transition: all var(--transition); cursor: default;
        }
        .feature-card:hover {
          border-color: rgba(16,185,129,.35); background: var(--surface-2);
          transform: translateY(-3px);
          box-shadow: 0 8px 30px rgba(0,0,0,.3);
        }
        .feature-icon { font-size: 1.6rem; margin-bottom: 12px; }
        .feature-title {
          font-size: .92rem; font-weight: 700; margin-bottom: 8px; color: var(--text);
        }
        .feature-desc { font-size: .82rem; color: var(--text-muted); line-height: 1.62; }

        /* ── CTA Strip ───────────────────────────────────────────── */
        .cta-strip {
          padding: 90px 24px; text-align: center; position: relative; overflow: hidden;
          background: var(--bg);
          background-image: radial-gradient(ellipse 60% 60% at 50% 50%, rgba(16,185,129,.1), transparent);
        }
        .cta-glow {
          position: absolute; width: 400px; height: 400px; border-radius: 50%;
          background: radial-gradient(circle, rgba(16,185,129,.12), transparent 70%);
          top: 50%; left: 50%; transform: translate(-50%,-50%);
          pointer-events: none;
        }
        .cta-inner { position: relative; z-index: 1; max-width: 540px; margin: 0 auto; }
        .cta-ball {
          font-size: 3rem; margin-bottom: 20px; display: block;
          animation: spin-slow 8s linear infinite;
        }
        @keyframes spin-slow {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        .cta-title {
          font-size: clamp(2rem, 4vw, 3rem); font-weight: 900;
          letter-spacing: -.03em; margin-bottom: 16px;
          background: linear-gradient(135deg, var(--text), var(--accent-bright));
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .cta-sub {
          color: var(--text-muted); font-size: .95rem; line-height: 1.65;
          margin-bottom: 32px;
        }

        /* ── Footer ──────────────────────────────────────────────── */
        .landing-footer {
          border-top: 1px solid var(--border); padding: 28px 24px;
          background: var(--surface);
        }
        .landing-footer-inner {
          max-width: 1100px; margin: 0 auto;
          display: flex; align-items: center; justify-content: space-between;
          flex-wrap: wrap; gap: 12px;
        }

        /* ── Responsive ─────────────────────────────────────────── */
        @media (max-width: 900px) {
          .hero-float-card { display: none; }
          .steps-grid { grid-template-columns: 1fr; }
          .step-connector { display: none; }
          .features-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 600px) {
          .hero { padding: 100px 20px 60px; }
          .hero-title { font-size: 2.5rem; }
          .features-grid { grid-template-columns: 1fr; }
          .scoring-row { font-size: .77rem; padding: 10px 14px; }
          .landing-footer-inner { flex-direction: column; text-align: center; }
        }
      `}</style>
    </>
  );
}
