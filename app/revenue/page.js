'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';

function toN(v) { const n = parseFloat(String(v || 0).replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; }
function fmt(n) { return Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }); }

const SOURCES = ['WCL/Propwire', 'SMS Outreach', 'JV Partner', 'FSBO', 'Cold Call', 'Direct Mail', 'Other'];
const EXITS = ['Assignment', 'Novation'];
const DEFAULT_SPLITS = [{ label: 'Taxes', pct: 30, color: '#F04455' }, { label: 'Owner', pct: 30, color: '#16C47E' }, { label: 'Marketing', pct: 20, color: '#F0A500' }, { label: 'Reserve', pct: 12, color: '#9B7EF8' }, { label: 'Operating', pct: 8, color: '#00B8D4' }];
const TODAY = new Date().toISOString().slice(0, 10);

const navS = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 56, background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50 };
const cardS = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 22, marginBottom: 16 };
const inputS = { width: '100%', padding: '9px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 };
const btnS = (c, ghost) => ({ padding: '9px 18px', borderRadius: 8, border: ghost ? `1px solid ${c}44` : 'none', background: ghost ? c + '14' : c, color: ghost ? c : '#000', fontWeight: 700, fontSize: 13, cursor: 'pointer' });
const lbl = { fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, display: 'block', marginBottom: 5 };

function CurrIn({ value, onChange, placeholder }) {
  const [f, setF] = useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface2)', border: `1px solid ${f ? 'var(--border2)' : 'var(--border)'}`, borderRadius: 8, overflow: 'hidden', transition: 'border-color 0.15s' }}>
      <span style={{ padding: '0 10px', color: 'var(--text3)', background: 'var(--surface3)', borderRight: '1px solid var(--border)', height: 40, display: 'flex', alignItems: 'center', fontSize: 13 }}>$</span>
      <input style={{ flex: 1, padding: '9px 12px', background: 'transparent', border: 'none', color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'JetBrains Mono,monospace' }}
        type="text" inputMode="decimal"
        value={f ? value : (toN(value) ? Number(toN(value)).toLocaleString() : '')}
        onChange={e => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
        onFocus={() => setF(true)} onBlur={() => setF(false)} placeholder={placeholder || ''} />
    </div>
  );
}

export default function RevenuePage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [deals, setDeals] = useState([]);
  const [goal, setGoal] = useState({ amount: 50000, startDate: '2026-04-25', endDate: '2026-07-25' });
  const [splits, setSplits] = useState(DEFAULT_SPLITS);
  const [showSettings, setShowSettings] = useState(false);
  const [showSplits, setShowSplits] = useState(false);
  const [goalEdit, setGoalEdit] = useState({});
  const [splitsEdit, setSplitsEdit] = useState([]);
  const [form, setForm] = useState({ address: '', fee: '', source: SOURCES[0], exit: EXITS[0], county: '', closeDate: TODAY });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/auth/session').then(r => { if (!r.ok) { router.push('/'); return; } return r.json(); })
      .then(d => { if (d?.userId) { setSession(d); setLoading(false); } }).catch(() => router.push('/'));
  }, []);

  useEffect(() => {
    if (!session?.access?.revenue) return;
    fetch('/api/revenue/deals').then(r => r.json()).then(d => { if (Array.isArray(d)) setDeals(d); }).catch(() => {});
    fetch('/api/revenue/goal').then(r => r.json()).then(d => { if (d?.amount) setGoal(d); }).catch(() => {});
    fetch('/api/revenue/splits').then(r => r.json()).then(d => { if (Array.isArray(d)) setSplits(d); }).catch(() => {});
  }, [session]);

  const total = deals.reduce((s, d) => s + toN(d.fee), 0);
  const now = new Date();
  const endD = new Date(goal.endDate);
  const startD = new Date(goal.startDate);
  const totalDays = Math.max(1, Math.ceil((endD - startD) / 86400000));
  const elapsed = Math.max(1, Math.ceil((now - startD) / 86400000));
  const daysLeft = Math.max(0, Math.ceil((endD - now) / 86400000));
  const goalAmt = toN(goal.amount) || 50000;
  const goalPct = Math.min(100, (total / goalAmt) * 100);
  const pace = total / elapsed;
  const projected = pace * totalDays;
  const neededPerDay = daysLeft > 0 ? (goalAmt - total) / daysLeft : 0;
  const daysColor = daysLeft >= 30 ? 'var(--green)' : daysLeft >= 14 ? 'var(--gold)' : 'var(--red)';

  const chartData = [];
  let cum = 0;
  [...deals].sort((a, b) => new Date(a.closeDate) - new Date(b.closeDate)).forEach(d => {
    cum += toN(d.fee);
    chartData.push({ date: d.closeDate?.slice(5), total: cum, address: d.address });
  });
  const yMax = Math.round(goalAmt * 1.1);

  const bySource = {}, byExit = {}, byCounty = {};
  deals.forEach(d => {
    bySource[d.source] = (bySource[d.source] || 0) + toN(d.fee);
    byExit[d.exit] = (byExit[d.exit] || 0) + toN(d.fee);
    if (d.county) byCounty[d.county] = (byCounty[d.county] || 0) + toN(d.fee);
  });

  const saveGoal = async () => {
    const updated = { ...goal, ...goalEdit };
    await fetch('/api/revenue/goal', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
    setGoal(updated); setShowSettings(false);
  };
  const saveSplits = async () => {
    const t = splitsEdit.reduce((s, sp) => s + toN(sp.pct), 0);
    if (Math.abs(t - 100) > 0.01) { setMsg('Splits must total 100%'); return; }
    await fetch('/api/revenue/splits', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(splitsEdit) });
    setSplits(splitsEdit); setShowSplits(false); setMsg('');
  };
  const logDeal = async () => {
    if (!form.address || !form.fee) { setMsg('Address and fee required'); return; }
    setSaving(true);
    const res = await fetch('/api/revenue/deals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const d = await res.json();
    if (res.ok) { setDeals(prev => [...prev, d]); setForm({ address: '', fee: '', source: SOURCES[0], exit: EXITS[0], county: '', closeDate: TODAY }); setMsg(''); }
    else setMsg(d.error || 'Error');
    setSaving(false);
  };
  const deleteDeal = async (id) => { if (!confirm('Delete this deal?')) return; await fetch(`/api/revenue/deals/${id}`, { method: 'DELETE' }); setDeals(prev => prev.filter(d => d.id !== id)); };

  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}>Loading…</div>;
  if (!session?.access?.revenue) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ fontSize: 44 }}>🔒</div>
      <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text)' }}>Access Denied</div>
      <div style={{ color: 'var(--text3)' }}>Contact Ahmadou for revenue access.</div>
      <button style={btnS('var(--gold)', false)} onClick={() => router.push('/')}>← Go Back</button>
    </div>
  );

  const feeN = toN(form.fee);
  const feeColor = feeN >= 12000 ? 'var(--green)' : feeN >= 9000 ? 'var(--cyan)' : 'var(--gold)';

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <nav style={navS}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/" style={{ color: 'var(--text3)', textDecoration: 'none', fontSize: 20 }}>←</a>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Revenue Tracker</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button style={{ ...btnS('var(--surface2)', false), color: 'var(--text2)', fontSize: 12, border: '1px solid var(--border)' }} onClick={() => { setGoalEdit({ ...goal }); setShowSettings(!showSettings); }}>⚙ Goal Settings</button>
          {session?.access?.manageTeam && <button style={{ ...btnS('var(--surface2)', false), color: 'var(--text2)', fontSize: 12, border: '1px solid var(--border)' }} onClick={() => { setSplitsEdit(splits.map(s => ({ ...s }))); setShowSplits(!showSplits); }}>Split %</button>}
        </div>
      </nav>

      {showSettings && (
        <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '20px 24px' }} className="slide-down">
          <div style={{ maxWidth: 600, margin: '0 auto', display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div style={{ flex: 1 }}><label style={lbl}>Goal Amount</label><CurrIn value={goalEdit.amount || ''} onChange={v => setGoalEdit(p => ({ ...p, amount: v }))} /></div>
            <div style={{ flex: 1 }}><label style={lbl}>Start Date</label><input type="date" style={inputS} value={goalEdit.startDate || ''} onChange={e => setGoalEdit(p => ({ ...p, startDate: e.target.value }))} /></div>
            <div style={{ flex: 1 }}><label style={lbl}>End Date</label><input type="date" style={inputS} value={goalEdit.endDate || ''} onChange={e => setGoalEdit(p => ({ ...p, endDate: e.target.value }))} /></div>
            <button style={btnS('var(--gold)', false)} onClick={saveGoal}>Save</button>
          </div>
        </div>
      )}

      {showSplits && (
        <div style={{ background: 'var(--surface)', borderBottom: '1px solid var(--border)', padding: '20px 24px' }} className="slide-down">
          <div style={{ maxWidth: 700, margin: '0 auto' }}>
            <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
              {splitsEdit.map((sp, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, border: '1px solid var(--border)', borderRadius: 8, padding: '8px 12px', background: 'var(--surface2)' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: sp.color }} />
                  <span style={{ fontSize: 13, minWidth: 70 }}>{sp.label}</span>
                  <input type="number" min="0" max="100" step="1" style={{ ...inputS, width: 58, padding: '4px 8px', fontSize: 13, textAlign: 'right' }} value={sp.pct} onChange={e => { const n = [...splitsEdit]; n[i] = { ...n[i], pct: Number(e.target.value) }; setSplitsEdit(n); }} />
                  <span style={{ color: 'var(--text3)', fontSize: 13 }}>%</span>
                </div>
              ))}
            </div>
            <div style={{ fontSize: 12, color: Math.abs(splitsEdit.reduce((s, sp) => s + toN(sp.pct), 0) - 100) > 0.01 ? 'var(--red)' : 'var(--green)', marginBottom: 10 }}>
              Total: {splitsEdit.reduce((s, sp) => s + toN(sp.pct), 0)}% {Math.abs(splitsEdit.reduce((s, sp) => s + toN(sp.pct), 0) - 100) > 0.01 ? '(must be 100%)' : '✓'}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button style={btnS('var(--gold)', false)} onClick={saveSplits}>Save Splits</button>
              <button style={{ ...btnS('var(--surface2)', false), color: 'var(--text2)', border: '1px solid var(--border)' }} onClick={() => setSplitsEdit(DEFAULT_SPLITS.map(s => ({ ...s })))}>Reset</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>

        {/* 1. HERO STATS — first thing visible */}
        <div style={{ ...cardS, borderLeft: '4px solid var(--gold)' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0 }}>
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Total Collected</div>
              <div className="num" style={{ fontSize: 40, fontWeight: 900, color: 'var(--gold)', lineHeight: 1 }}>{fmt(total)}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>{deals.length} deal{deals.length !== 1 ? 's' : ''} logged</div>
            </div>
            <div style={{ textAlign: 'center', padding: '8px 20px', borderLeft: '1px solid var(--border)', borderRight: '1px solid var(--border)' }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Goal Progress</div>
              <div className="num" style={{ fontSize: 40, fontWeight: 900, color: goalPct >= 100 ? 'var(--green)' : goalPct >= 50 ? 'var(--gold)' : 'var(--text)', lineHeight: 1 }}>{goalPct.toFixed(0)}%</div>
              <div style={{ height: 6, background: 'var(--surface3)', borderRadius: 3, marginTop: 10, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: goalPct + '%', background: 'linear-gradient(90deg, var(--gold), var(--green))', borderRadius: 3, transition: 'width 0.6s ease' }} />
              </div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 4 }}>of {fmt(goalAmt)}</div>
            </div>
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 8 }}>Days Remaining</div>
              <div className="num" style={{ fontSize: 40, fontWeight: 900, color: daysColor, lineHeight: 1 }}>{daysLeft}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 6 }}>{goal.endDate}</div>
            </div>
          </div>
        </div>

        {/* Pace stats */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
          {[['Daily Pace', fmt(pace) + '/day', 'var(--cyan)'], ['Projected', fmt(projected), projected >= goalAmt ? 'var(--green)' : 'var(--red)'], ['Needed/Day', fmt(neededPerDay) + '/day', neededPerDay <= pace ? 'var(--green)' : 'var(--gold)']].map(([l, v, c]) => (
            <div key={l} style={{ flex: 1, minWidth: 140, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '14px 18px' }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 5 }}>{l}</div>
              <div className="num" style={{ fontSize: 18, fontWeight: 800, color: c }}>{v}</div>
            </div>
          ))}
        </div>

        {/* 2. LOG CLOSING — second */}
        <div style={cardS}>
          <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Log Closing</div>
          {msg && <div style={{ color: msg.includes('required') || msg.includes('Error') ? 'var(--red)' : 'var(--green)', fontSize: 13, marginBottom: 10 }}>{msg}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
            <div><label style={lbl}>Property Address</label><input style={inputS} value={form.address} onChange={e => setForm(p => ({ ...p, address: e.target.value }))} placeholder="123 Main St, City" /></div>
            <div>
              <label style={lbl}>Assignment Fee</label>
              <CurrIn value={form.fee} onChange={v => setForm(p => ({ ...p, fee: v }))} />
              {feeN > 0 && <div style={{ fontSize: 11, color: feeColor, marginTop: 3, fontWeight: 600 }}>{feeN >= 12000 ? 'Strong deal ✓' : feeN >= 9000 ? 'Good deal' : 'Below avg'}</div>}
            </div>
            <div>
              <label style={lbl}>Source</label>
              <select style={inputS} value={form.source} onChange={e => setForm(p => ({ ...p, source: e.target.value }))}>{SOURCES.map(s => <option key={s}>{s}</option>)}</select>
            </div>
            <div>
              <label style={lbl}>Exit Strategy</label>
              <select style={inputS} value={form.exit} onChange={e => setForm(p => ({ ...p, exit: e.target.value }))}>{EXITS.map(s => <option key={s}>{s}</option>)}</select>
            </div>
            <div><label style={lbl}>County</label><input style={inputS} value={form.county} onChange={e => setForm(p => ({ ...p, county: e.target.value }))} placeholder="County" /></div>
            <div><label style={lbl}>Close Date</label><input type="date" style={inputS} value={form.closeDate} onChange={e => setForm(p => ({ ...p, closeDate: e.target.value }))} /></div>
          </div>
          <button style={{ ...btnS('var(--green)', false), padding: '11px 28px', fontSize: 14 }} onClick={logDeal} disabled={saving}>{saving ? 'Saving…' : '+ Log Closing'}</button>
        </div>

        {/* 3. CHART */}
        {chartData.length > 0 && (
          <div style={cardS}>
            <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 14 }}>Revenue Over Time</div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#F0A500" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#F0A500" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="date" stroke="var(--text3)" tick={{ fontSize: 11 }} />
                <YAxis stroke="var(--text3)" tick={{ fontSize: 11 }} domain={[0, yMax]} tickFormatter={v => '$' + Math.round(v / 1000) + 'K'} />
                <Tooltip contentStyle={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} formatter={v => [fmt(v), 'Revenue']} />
                <ReferenceLine y={goalAmt} stroke="var(--green)" strokeDasharray="6 3" label={{ value: 'Goal', fill: 'var(--green)', fontSize: 11, position: 'insideTopRight' }} />
                <Area type="monotone" dataKey="total" stroke="var(--gold)" fill="url(#revGrad)" dot={false} strokeWidth={2} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* 4. BREAKDOWNS */}
        {deals.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14, marginBottom: 16 }}>
            {[['By Source', bySource], ['By Exit', byExit], ['By County', byCounty]].map(([title, data]) => (
              <div key={title} style={cardS}>
                <div style={{ fontWeight: 700, marginBottom: 12, fontSize: 13, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text3)' }}>{title}</div>
                {Object.entries(data).sort(([, a], [, b]) => b - a).map(([k, v]) => (
                  <div key={k} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13, color: 'var(--text)' }}>{k}</span>
                      <span className="num" style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 700 }}>{fmt(v)}</span>
                    </div>
                    <div style={{ height: 3, background: 'var(--surface3)', borderRadius: 2 }}>
                      <div style={{ height: '100%', width: (v / Math.max(...Object.values(data)) * 100) + '%', background: 'var(--gold)', borderRadius: 2 }} />
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* 5. DEAL LOG */}
        {deals.length > 0 && (
          <div style={cardS}>
            <div style={{ fontWeight: 700, marginBottom: 14, fontSize: 15 }}>Deal Log</div>
            {[...deals].sort((a, b) => new Date(b.closeDate) - new Date(a.closeDate)).map(d => {
              const fee = toN(d.fee);
              const feeCol = fee >= 12000 ? 'var(--green)' : fee >= 9000 ? 'var(--cyan)' : 'var(--gold)';
              return (
                <div key={d.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid var(--border)', gap: 12 }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{d.address}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                      <span className="num" style={{ fontSize: 11, color: 'var(--text3)' }}>{d.closeDate}</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'var(--cyan-faint)', color: 'var(--cyan)', border: '1px solid var(--cyan-border)' }}>{d.source}</span>
                      <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: 'var(--purple-faint)', color: 'var(--purple)', border: '1px solid var(--purple-border)' }}>{d.exit}</span>
                      {d.county && <span style={{ fontSize: 11, color: 'var(--text3)' }}>{d.county}</span>}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span className="num" style={{ fontSize: 22, fontWeight: 900, color: feeCol }}>{fmt(fee)}</span>
                    <button onClick={() => deleteDeal(d.id)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 16 }}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* 6. SPLIT ALLOCATION */}
        {total > 0 && splits.length > 0 && (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            {splits.map(sp => (
              <div key={sp.label} style={{ flex: 1, minWidth: 120, border: '1px solid var(--border)', borderLeft: `4px solid ${sp.color}`, borderRadius: 12, padding: '14px 16px', background: 'var(--surface)' }}>
                <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{sp.label}</div>
                <div className="num" style={{ fontSize: 20, fontWeight: 800, color: sp.color }}>{fmt(total * sp.pct / 100)}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 3 }}>{sp.pct}%</div>
              </div>
            ))}
          </div>
        )}

        {/* Scenario projections */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {[['1 deal/wk', total + (9000 / 7) * daysLeft], ['2 deals/wk', total + (9000 / 7) * 2 * daysLeft], ['3 deals/wk', total + (9000 / 7) * 3 * daysLeft]].map(([l, proj]) => (
            <div key={l} style={{ flex: 1, minWidth: 140, background: 'var(--surface)', border: `1px solid ${proj >= goalAmt ? 'var(--green-border)' : 'var(--border)'}`, borderRadius: 12, padding: '14px 16px' }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>{l}</div>
              <div className="num" style={{ fontSize: 16, fontWeight: 800, color: proj >= goalAmt ? 'var(--green)' : 'var(--text)' }}>{fmt(proj)}</div>
              <div style={{ fontSize: 11, color: proj >= goalAmt ? 'var(--green)' : 'var(--red)', marginTop: 2 }}>{proj >= goalAmt ? '✓ Hits Goal' : `Short by ${fmt(goalAmt - proj)}`}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
