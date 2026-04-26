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
  const [sessionExpiry, setSessionExpiry] = useState(null);
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }));
    };
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
      if (data.expiresAt) {
        const remaining = (new Date(data.expiresAt).getTime() - Date.now()) / 1000 / 60;
        setSessionExpiry(data.expiresAt);
        setShowSessionWarning(remaining <= 15);
      }
    };
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, []);

  const signOut = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.refresh();
  };

  const extendSession = async () => {
    await fetch('/api/auth/session');
    setShowSessionWarning(false);
  };

  const totalRevenue = deals.reduce((s, d) => s + Number(d.fee || 0), 0);
  const goal = goalData?.amount || 50000;
  const goalPct = pct(totalRevenue, goal);

  const now = new Date();
  const startDate = goalData?.startDate ? new Date(goalData.startDate) : new Date('2026-04-25');
  const endDate = goalData?.endDate ? new Date(goalData.endDate) : new Date('2026-07-25');
  const totalDays = Math.ceil((endDate - startDate) / 86400000);
  const elapsedDays = Math.max(1, Math.ceil((now - startDate) / 86400000));
  const daysLeft = Math.max(0, Math.ceil((endDate - now) / 86400000));
  const daysColor = daysLeft >= 30 ? 'var(--green)' : daysLeft >= 14 ? 'var(--gold)' : 'var(--red)';

  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const todayStr = now.toISOString().slice(0, 10);
  const todayKpi = wclEntries.filter(e => e.date === todayStr).length;

  const tools = [
    { href: '/calculator', label: 'Deal Calculator', icon: '⟨⟩', color: 'var(--gold)', desc: 'MAO, tiers, negotiation range', free: true },
    { href: '/kpi', label: 'KPI Tracker', icon: '◎', color: 'var(--cyan)', desc: 'WCL, SMS, diagnostics', free: true },
    { href: '/revenue', label: 'Revenue Tracker', icon: '$', color: 'var(--green)', desc: 'Deals, goal, splits', locked: !session.access?.revenue },
    { href: '/scorecard', label: 'Lead Scorecard', icon: '★', color: 'var(--purple)', desc: 'Smart recommendation engine', free: true },
    { href: '/expenses', label: 'Expense Tracker', icon: '⊕', color: 'var(--red)', desc: 'Budget, vendors, history', locked: !session.access?.expenses, full: true },
  ];

  const navStyle = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 60, background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 100 };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Nav */}
      <nav style={navStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--gold-faint)', border: '2px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, color: 'var(--gold)', fontSize: 16 }}>N</div>
          <div>
            <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 15, lineHeight: 1.2 }}>Novora Capital</div>
            <div style={{ color: 'var(--text2)', fontSize: 11 }}>Deal OS</div>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 13, color: 'var(--text2)' }}>{clock}</span>
          {session.access?.manageTeam && (
            <button onClick={() => setShowAdmin(true)} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--gold-border)', background: 'var(--gold-faint)', color: 'var(--gold)', fontSize: 13, fontWeight: 600 }}>Admin</button>
          )}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 12px', borderRadius: 20, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
            <div style={{ width: 24, height: 24, borderRadius: '50%', background: '#E8A02022', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--gold)' }}>{session.userName?.[0]?.toUpperCase()}</div>
            <span style={{ fontSize: 13, color: 'var(--text)' }}>{session.userName}</span>
          </div>
          <button onClick={signOut} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontSize: 13 }}>Sign Out</button>
        </div>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '28px 20px' }}>
        {/* Goal Banner */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 24, marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{greeting}, {session.userName} 👋</div>
              {session.access?.revenue ? (
                <div style={{ color: 'var(--text2)', fontSize: 14, marginTop: 2 }}>
                  <span className="num" style={{ color: 'var(--gold)' }}>{fmt(totalRevenue)}</span> collected · {goalPct}% of {fmt(goal)} goal
                </div>
              ) : (
                <div style={{ color: 'var(--text2)', fontSize: 14, marginTop: 2 }}>Revenue data is restricted</div>
              )}
            </div>
            <div style={{ display: 'flex', gap: 20 }}>
              <div style={{ textAlign: 'center' }}>
                <div className="num" style={{ fontSize: 28, fontWeight: 700, color: daysColor }}>{daysLeft}</div>
                <div style={{ color: 'var(--text2)', fontSize: 12 }}>days left</div>
              </div>
              <div style={{ textAlign: 'center' }}>
                <div className="num" style={{ fontSize: 28, fontWeight: 700, color: 'var(--cyan)' }}>{todayKpi}</div>
                <div style={{ color: 'var(--text2)', fontSize: 12 }}>KPI today</div>
              </div>
            </div>
          </div>
          {session.access?.revenue && (
            <>
              <div style={{ height: 10, borderRadius: 5, background: 'var(--surface2)', overflow: 'hidden', marginBottom: 8 }}>
                <div style={{ height: '100%', borderRadius: 5, width: `${Math.min(100, goalPct)}%`, background: 'linear-gradient(90deg, var(--gold), var(--green))', transition: 'width 0.5s' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: 'var(--text3)' }}>
                <span>{goalPct}% complete</span>
                <span>{Math.ceil((goal - totalRevenue) / 9000)} deals needed at $9K avg</span>
              </div>
            </>
          )}
        </div>

        {/* Tool Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          {tools.map(tool => (
            <a key={tool.href} href={tool.locked ? '#' : tool.href}
              onClick={tool.locked ? (e) => { e.preventDefault(); alert('Contact Ahmadou for access'); } : undefined}
              style={{ textDecoration: 'none', gridColumn: tool.full ? '1 / -1' : undefined }}>
              <div style={{ background: 'var(--surface)', border: `1px solid ${tool.locked ? 'var(--border)' : tool.color + '44'}`, borderRadius: 14, padding: 20, display: 'flex', alignItems: 'center', gap: 16, cursor: tool.locked ? 'default' : 'pointer', opacity: tool.locked ? 0.6 : 1, transition: 'border-color 0.15s' }}>
                <div style={{ width: 48, height: 48, borderRadius: 12, background: tool.color + '15', border: `1px solid ${tool.color}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, color: tool.color, flexShrink: 0 }}>
                  {tool.locked ? '🔒' : tool.icon}
                </div>
                <div>
                  <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 15 }}>{tool.label}</div>
                  <div style={{ color: 'var(--text2)', fontSize: 13, marginTop: 2 }}>{tool.locked ? 'Contact Ahmadou for access' : tool.desc}</div>
                </div>
              </div>
            </a>
          ))}
        </div>

        {/* Team Strip */}
        {users.length > 0 && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <span style={{ color: 'var(--text2)', fontSize: 13 }}>Team</span>
            <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
              {users.map(u => (
                <div key={u.id} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <div style={{ width: 30, height: 30, borderRadius: '50%', background: u.color + '22', border: `2px solid ${u.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: u.color }}>{u.name[0].toUpperCase()}</div>
                  <span style={{ fontSize: 13, color: u.id === session.userId ? 'var(--text)' : 'var(--text2)', fontWeight: u.id === session.userId ? 600 : 400 }}>{u.name}{u.id === session.userId ? ' (you)' : ''}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Session Warning Banner */}
      {showSessionWarning && (
        <div style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--surface)', borderTop: '1px solid var(--gold-border)', padding: '12px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', zIndex: 200 }}>
          <span style={{ color: 'var(--gold)', fontSize: 14 }}>⚠ Session expiring soon — click to extend</span>
          <button onClick={extendSession} style={{ padding: '6px 16px', borderRadius: 8, border: 'none', background: 'var(--gold)', color: '#000', fontWeight: 600, fontSize: 13 }}>Extend Session</button>
        </div>
      )}

      {showAdmin && <AdminPanel session={session} onClose={() => setShowAdmin(false)} />}
    </div>
  );
}
