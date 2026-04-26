'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminPanel from './AdminPanel.js';

function fmt(n) { return Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }); }
function pct(a, b) { return b > 0 ? Math.round((a / b) * 100) : 0; }

export default function Dashboard({ session }) {
  const [clock, setClock] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);
  const [goalData, setGoalData] = useState(null);
  const [deals, setDeals] = useState([]);
  const [users, setUsers] = useState([]);
  const [wclEntries, setWclEntries] = useState([]);
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (session.access?.revenue) {
      fetch('/api/revenue/deals').then(r => r.json()).then(d => { if (Array.isArray(d)) setDeals(d); }).catch(() => {});
      fetch('/api/revenue/goal').then(r => r.json()).then(d => { if (d.amount) setGoalData(d); }).catch(() => {});
    }
    fetch('/api/users').then(r => r.json()).then(d => { if (Array.isArray(d)) setUsers(d.filter(u => u.active)); }).catch(() => {});
    fetch('/api/kpi/wcl').then(r => r.json()).then(d => { if (Array.isArray(d)) setWclEntries(d); }).catch(() => {});
  }, []);

  useEffect(() => {
    const check = async () => {
      const res = await fetch('/api/auth/session').catch(() => null);
      if (!res?.ok) { router.push('/'); return; }
      const data = await res.json();
      if (data.expiresAt) setShowSessionWarning((new Date(data.expiresAt).getTime() - Date.now()) / 1000 / 60 <= 15);
    };
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, []);

  const signOut = async () => { await fetch('/api/auth/logout', { method: 'POST' }); router.refresh(); };
  const extendSession = async () => { await fetch('/api/auth/session'); setShowSessionWarning(false); };

  const totalRevenue = deals.reduce((s, d) => s + Number(d.fee || 0), 0);
  const goal = goalData?.amount || 50000;
  const goalPct = pct(totalRevenue, goal);
  const remaining = Math.max(0, goal - totalRevenue);
  const dealsNeeded = Math.ceil(remaining / 9000);

  const now = new Date();
  const endDate = goalData?.endDate ? new Date(goalData.endDate) : new Date('2026-07-25');
  const daysLeft = Math.max(0, Math.ceil((endDate - now) / 86400000));
  const daysColor = daysLeft >= 30 ? 'var(--green)' : daysLeft >= 14 ? 'var(--gold)' : 'var(--red)';

  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const todayStr = now.toISOString().slice(0, 10);
  const todayKpi = wclEntries.filter(e => e.date === todayStr).length;

  const tools = [
    { href: '/calculator', label: 'Deal Calculator', icon: '⟨⟩', color: '#F0A500', desc: 'MAO · tiers · negotiation' },
    { href: '/kpi', label: 'KPI Tracker', icon: '◎', color: '#00B8D4', desc: 'WCL · SMS · diagnostics' },
    { href: '/revenue', label: 'Revenue Tracker', icon: '$', color: '#16C47E', desc: 'Deals · goal · splits', locked: !session.access?.revenue },
    { href: '/scorecard', label: 'Lead Scorecard', icon: '★', color: '#9B7EF8', desc: 'Smart recommendation engine' },
    { href: '/expenses', label: 'Expense Tracker', icon: '⊕', color: '#F04455', desc: 'Budget · vendors · history', locked: !session.access?.expenses },
  ];

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Nav */}
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 60, background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gold-faint)', border: '2px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, color: 'var(--gold)', fontSize: 15 }}>N</div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 15, lineHeight: 1.2 }}>Novora Capital</div>
            <div style={{ color: 'var(--text3)', fontSize: 11, letterSpacing: '0.05em' }}>DEAL OS</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 12, color: 'var(--text3)' }}>{clock}</span>
          {session.access?.manageTeam && (
            <button onClick={() => setShowAdmin(true)} style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--gold-border)', background: 'var(--gold-faint)', color: 'var(--gold)', fontSize: 12, fontWeight: 700 }}>Admin</button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 12px', borderRadius: 20, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
            <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#F0A50022', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 800, color: 'var(--gold)' }}>{session.userName?.[0]?.toUpperCase()}</div>
            <span style={{ fontSize: 13, color: 'var(--text)' }}>{session.userName}</span>
          </div>
          <button onClick={signOut} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text3)', fontSize: 12 }}>Sign Out</button>
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 20px' }}>

        {/* Goal Banner */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: '24px 28px', marginBottom: 20 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18, flexWrap: 'wrap', gap: 12 }}>
            <div>
              <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)', marginBottom: 4 }}>{greeting}, {session.userName}</div>
              {session.access?.revenue ? (
                <div style={{ color: 'var(--text2)', fontSize: 14 }}>
                  <span className="num" style={{ color: 'var(--gold)', fontWeight: 700 }}>{fmt(totalRevenue)}</span>
                  <span style={{ margin: '0 6px', color: 'var(--text3)' }}>·</span>
                  {goalPct}% of {fmt(goal)} goal
                </div>
              ) : (
                <div style={{ color: 'var(--text3)', fontSize: 14 }}>Revenue data restricted</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 24 }}>
              <div style={{ textAlign: 'right' }}>
                <div className="num" style={{ fontSize: 32, fontWeight: 800, color: daysColor, lineHeight: 1 }}>{daysLeft}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>days left</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="num" style={{ fontSize: 32, fontWeight: 800, color: 'var(--cyan)', lineHeight: 1 }}>{todayKpi}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 3 }}>KPI today</div>
              </div>
            </div>
          </div>
          {session.access?.revenue && (
            <>
              <div style={{ height: 8, borderRadius: 4, background: 'var(--surface3)', overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ height: '100%', borderRadius: 4, width: `${Math.min(100, goalPct)}%`, background: 'linear-gradient(90deg, var(--gold), var(--green))', transition: 'width 0.6s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
                <span style={{ color: 'var(--text3)' }}>{goalPct}% complete</span>
                <span style={{ color: 'var(--text3)' }}>
                  {remaining > 0
                    ? <><span className="num" style={{ color: 'var(--text2)' }}>{dealsNeeded}</span> deal{dealsNeeded !== 1 ? 's' : ''} needed at $9K avg</>
                    : <span style={{ color: 'var(--green)' }}>Goal reached ✓</span>
                  }
                </span>
              </div>
            </>
          )}
        </div>

        {/* Tool Grid — 2×2 + 1 half */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          {tools.map(tool => (
            <a key={tool.href} href={tool.locked ? '#' : tool.href}
              onClick={tool.locked ? e => { e.preventDefault(); } : undefined}
              style={{ textDecoration: 'none' }}>
              <div style={{
                background: 'var(--surface)',
                border: '1px solid var(--border)',
                borderLeft: `4px solid ${tool.locked ? 'var(--border2)' : tool.color}`,
                borderRadius: 12,
                padding: '18px 20px',
                display: 'flex',
                alignItems: 'center',
                gap: 16,
                cursor: tool.locked ? 'default' : 'pointer',
                opacity: tool.locked ? 0.5 : 1,
                transition: 'background 0.15s',
              }}
                onMouseEnter={e => { if (!tool.locked) e.currentTarget.style.background = 'var(--surface2)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface)'; }}>
                <div style={{ width: 44, height: 44, borderRadius: 10, background: tool.locked ? 'var(--surface3)' : tool.color + '14', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: tool.locked ? 'var(--text3)' : tool.color, flexShrink: 0, fontWeight: 700 }}>
                  {tool.locked ? '🔒' : tool.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: tool.locked ? 'var(--text3)' : 'var(--text)', fontSize: 14, marginBottom: 3 }}>{tool.label}</div>
                  <div style={{ color: 'var(--text3)', fontSize: 12 }}>{tool.locked ? 'Contact Ahmadou for access' : tool.desc}</div>
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Team Strip */}
        {users.length > 0 && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ color: 'var(--text3)', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600 }}>Team</span>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
              {users.map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 28, height: 28, borderRadius: '50%', background: u.color + '18', border: `2px solid ${u.color}44`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 800, color: u.color }}>{u.name[0].toUpperCase()}</div>
                  <span style={{ fontSize: 13, color: u.id === session.userId ? 'var(--text)' : 'var(--text2)', fontWeight: u.id === session.userId ? 700 : 400 }}>
                    {u.name}{u.id === session.userId && <span style={{ marginLeft: 6, fontSize: 10, background: 'var(--cyan-faint)', color: 'var(--cyan)', border: '1px solid var(--cyan-border)', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>YOU</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {showSessionWarning && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--surface)', borderTop: '1px solid var(--gold-border)', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 200 }}>
          <span style={{ color: 'var(--gold)', fontSize: 14 }}>⚠ Session expiring soon</span>
          <button onClick={extendSession} style={{ padding: '7px 18px', borderRadius: 8, border: 'none', background: 'var(--gold)', color: '#000', fontWeight: 700, fontSize: 13 }}>Extend Session</button>
        </div>
      )}

      {showAdmin && <AdminPanel session={session} onClose={() => setShowAdmin(false)} />}
    </div>
  );
}
