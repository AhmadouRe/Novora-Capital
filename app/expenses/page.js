'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

function toN(v) { const n = parseFloat(String(v || 0).replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; }
function fmt(n) { return Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }); }
const TODAY = new Date().toISOString().slice(0, 10);
const navS = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 56, background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50 };
const cardS = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, marginBottom: 16 };
const inputS = { width: '100%', padding: '9px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 };
const btnS = (c, light) => ({ padding: '8px 16px', borderRadius: 8, border: 'none', background: light ? c + '18' : c, color: light ? c : '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' });
const ACCOUNTS = ['Marketing', 'Operating', 'Reserve', 'Owner Pay', 'Taxes'];
const TYPES = ['Recurring', 'One-Time'];

function CurrIn({ value, onChange, placeholder }) {
  const [f, setF] = useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      <span style={{ padding: '0 10px', color: 'var(--text2)', background: 'var(--surface3)', borderRight: '1px solid var(--border)', height: 40, display: 'flex', alignItems: 'center', fontSize: 14 }}>$</span>
      <input style={{ flex: 1, padding: '9px 12px', background: 'transparent', border: 'none', color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'JetBrains Mono,monospace' }}
        type="text" inputMode="decimal"
        value={f ? value : (toN(value) ? Number(toN(value)).toLocaleString() : '')}
        onChange={e => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
        onFocus={() => setF(true)} onBlur={() => setF(false)}
        placeholder={placeholder} />
    </div>
  );
}

export default function ExpensesPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [expenses, setExpenses] = useState([]);
  const [budgets, setBudgets] = useState({ marketing: 0, operating: 0, reserve: 0, owner: 0, taxes: 0 });
  const [window2, setWindow2] = useState({ days: 90, startDate: '2026-04-25' });
  const [windowEdit, setWindowEdit] = useState({});
  const [budgetEdit, setBudgetEdit] = useState({});
  const [editBudget, setEditBudget] = useState(null);
  const [presets, setPresets] = useState([]);
  const [showPresetModal, setShowPresetModal] = useState(false);
  const [newPreset, setNewPreset] = useState({ name: '', account: ACCOUNTS[0], type: TYPES[0] });
  const [campaigns, setCampaigns] = useState([]);
  const [form, setForm] = useState({ vendor: '', amount: '', account: ACCOUNTS[0], type: TYPES[0], campaignId: '', notes: '', date: TODAY });
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetch('/api/auth/session').then(r => { if (!r.ok) { router.push('/'); return; } return r.json(); })
      .then(d => { if (d?.userId) { setSession(d); setLoading(false); } }).catch(() => router.push('/'));
  }, []);

  useEffect(() => {
    if (!session?.access?.expenses) return;
    fetch('/api/expenses').then(r => r.json()).then(d => { if (Array.isArray(d)) setExpenses(d); }).catch(() => {});
    fetch('/api/expenses/budgets').then(r => r.json()).then(d => { if (d) setBudgets(d); }).catch(() => {});
    fetch('/api/expenses/window').then(r => r.json()).then(d => { if (d) setWindow2(d); }).catch(() => {});
    fetch('/api/expenses/presets').then(r => r.json()).then(d => { if (Array.isArray(d)) setPresets(d); }).catch(() => {});
    fetch('/api/kpi/campaigns').then(r => r.json()).then(d => { if (Array.isArray(d)) setCampaigns(d.filter(c => c.status === 'active')); }).catch(() => {});
  }, [session]);

  const saveWindow = async () => {
    const updated = { ...window2, ...windowEdit };
    await fetch('/api/expenses/window', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
    setWindow2(updated); setWindowEdit({});
  };

  const saveBudget = async (key, value) => {
    const updated = { ...budgets, [key]: toN(value) };
    await fetch('/api/expenses/budgets', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
    setBudgets(updated); setEditBudget(null);
  };

  const logExpense = async () => {
    if (!form.vendor || !form.amount) { setMsg('Vendor and amount required'); return; }
    setSaving(true);
    const res = await fetch('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
    const d = await res.json();
    if (res.ok) { setExpenses(prev => [...prev, d]); setForm({ vendor: '', amount: '', account: ACCOUNTS[0], type: TYPES[0], campaignId: '', notes: '', date: TODAY }); setMsg(''); }
    else setMsg(d.error || 'Error');
    setSaving(false);
  };

  const deleteExpense = async (id) => {
    if (!confirm('Delete?')) return;
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const addPreset = async () => {
    const res = await fetch('/api/expenses/presets', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newPreset) });
    const d = await res.json();
    setPresets(prev => [...prev, d]); setNewPreset({ name: '', account: ACCOUNTS[0], type: TYPES[0] });
  };

  const deletePreset = async (id) => {
    await fetch(`/api/expenses/presets/${id}`, { method: 'DELETE' });
    setPresets(prev => prev.filter(p => p.id !== id));
  };

  const applyPreset = (p) => setForm(f => ({ ...f, vendor: p.name, account: p.account, type: p.type }));

  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>Loading…</div>;

  if (!session?.access?.expenses) return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
      <div style={{ fontSize: 48 }}>🔒</div>
      <div style={{ fontSize: 20, fontWeight: 700 }}>Access Denied</div>
      <div style={{ color: 'var(--text2)' }}>You don't have access to Expenses. Contact Ahmadou.</div>
      <button style={btnS('var(--gold)', false)} onClick={() => router.push('/')}>← Go Back</button>
    </div>
  );

  // Summary calculations
  const windowStart = new Date(window2.startDate);
  const windowEnd = new Date(windowStart.getTime() + toN(window2.days) * 86400000);
  const windowExpenses = expenses.filter(e => { const d = new Date(e.date); return d >= windowStart && d <= windowEnd; });

  const byAccount = {};
  windowExpenses.forEach(e => { byAccount[e.account] = (byAccount[e.account] || 0) + toN(e.amount); });
  const byVendor = {};
  windowExpenses.forEach(e => { byVendor[e.vendor] = (byVendor[e.vendor] || 0) + toN(e.amount); });
  const recurring = windowExpenses.filter(e => e.type === 'Recurring').reduce((s, e) => s + toN(e.amount), 0);
  const oneTime = windowExpenses.filter(e => e.type === 'One-Time').reduce((s, e) => s + toN(e.amount), 0);

  const budgetKeys = [
    { label: 'Marketing', key: 'marketing', bKey: 'Marketing' },
    { label: 'Operating', key: 'operating', bKey: 'Operating' },
    { label: 'Reserve', key: 'reserve', bKey: 'Reserve' },
    { label: 'Owner Pay', key: 'owner', bKey: 'Owner Pay' },
    { label: 'Taxes', key: 'taxes', bKey: 'Taxes' },
  ];

  const acctColor = { Marketing: 'var(--gold)', Operating: 'var(--cyan)', Reserve: 'var(--purple)', 'Owner Pay': 'var(--green)', Taxes: 'var(--red)' };
  const typeColor = { Recurring: 'var(--cyan)', 'One-Time': 'var(--purple)' };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <nav style={navS}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/" style={{ color: 'var(--text2)', textDecoration: 'none', fontSize: 20 }}>←</a>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Expense Tracker</span>
        </div>
        <span style={{ fontSize: 12, color: 'var(--text3)' }}>{session.userName}</span>
      </nav>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 20px' }}>

        {/* Tracking Window */}
        <div style={cardS}>
          <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 14 }}>Tracking Window</div>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
            <div><label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Days</label>
              <input type="number" style={{ ...inputS, width: 100 }} value={windowEdit.days !== undefined ? windowEdit.days : window2.days} onChange={e => setWindowEdit(p => ({ ...p, days: e.target.value }))} /></div>
            <div><label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Start Date</label>
              <input type="date" style={inputS} value={windowEdit.startDate !== undefined ? windowEdit.startDate : window2.startDate} onChange={e => setWindowEdit(p => ({ ...p, startDate: e.target.value }))} /></div>
            <button style={btnS('var(--gold)', false)} onClick={saveWindow}>Save</button>
          </div>
        </div>

        {/* Budget Panel */}
        <div style={cardS}>
          <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 14 }}>Budgets</div>
          {budgetKeys.map(({ label, key, bKey }) => {
            const spent = byAccount[bKey] || 0;
            const budget = budgets[key] || 0;
            const over = spent > budget && budget > 0;
            const pctUsed = budget > 0 ? Math.min(100, (spent / budget) * 100) : 0;
            return (
              <div key={key} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 14, color: 'var(--text)' }}>{label}</span>
                  <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <span className="num" style={{ fontSize: 13, color: over ? 'var(--red)' : 'var(--text2)' }}>{fmt(spent)} / {fmt(budget)}</span>
                    {editBudget === key ? (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <input type="number" style={{ ...inputS, width: 100, padding: '4px 8px', fontSize: 13 }} value={budgetEdit[key] || ''} onChange={e => setBudgetEdit(p => ({ ...p, [key]: e.target.value }))} />
                        <button style={{ ...btnS('var(--gold)', false), padding: '4px 10px', fontSize: 12 }} onClick={() => saveBudget(key, budgetEdit[key])}>Save</button>
                      </div>
                    ) : (
                      <button style={{ ...btnS('var(--surface2)', false), color: 'var(--text2)', padding: '3px 10px', fontSize: 12 }} onClick={() => { setEditBudget(key); setBudgetEdit({ [key]: budgets[key] }); }}>Edit</button>
                    )}
                  </div>
                </div>
                <div style={{ height: 6, background: 'var(--surface3)', borderRadius: 3, overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: pctUsed + '%', background: over ? 'var(--red)' : acctColor[bKey] || 'var(--gold)', borderRadius: 3, transition: 'width 0.3s' }} />
                </div>
                {over && <div style={{ fontSize: 11, color: 'var(--red)', marginTop: 2 }}>Over budget by {fmt(spent - budget)}</div>}
              </div>
            );
          })}
        </div>

        {/* Presets */}
        <div style={cardS}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <span style={{ fontWeight: 600, fontSize: 14 }}>Quick-Add Presets</span>
            <button style={{ ...btnS('var(--surface2)', false), color: 'var(--text2)', fontSize: 12 }} onClick={() => setShowPresetModal(!showPresetModal)}>Manage</button>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {presets.map(p => (
              <button key={p.id} style={{ padding: '6px 14px', borderRadius: 20, border: `1px solid ${acctColor[p.account] || 'var(--border)'}44`, background: (acctColor[p.account] || 'var(--gold)') + '12', color: acctColor[p.account] || 'var(--gold)', fontSize: 13, cursor: 'pointer' }} onClick={() => applyPreset(p)}>{p.name}</button>
            ))}
            {presets.length === 0 && <span style={{ fontSize: 13, color: 'var(--text3)' }}>No presets — add some below</span>}
          </div>
          {showPresetModal && (
            <div style={{ marginTop: 16, padding: 14, background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)' }}>
              <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
                <input style={inputS} placeholder="Name (e.g. DealMachine)" value={newPreset.name} onChange={e => setNewPreset(p => ({ ...p, name: e.target.value }))} />
                <select style={inputS} value={newPreset.account} onChange={e => setNewPreset(p => ({ ...p, account: e.target.value }))}>{ACCOUNTS.map(a => <option key={a}>{a}</option>)}</select>
                <select style={inputS} value={newPreset.type} onChange={e => setNewPreset(p => ({ ...p, type: e.target.value }))}>{TYPES.map(t => <option key={t}>{t}</option>)}</select>
                <button style={btnS('var(--gold)', false)} onClick={addPreset}>Add</button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {presets.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: 13, color: 'var(--text2)' }}>
                    <span>{p.name} · {p.account} · {p.type}</span>
                    <button onClick={() => deletePreset(p.id)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer' }}>✕</button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Log Expense Form */}
        <div style={cardS}>
          <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 15 }}>Log Expense</div>
          {msg && <div style={{ color: 'var(--red)', fontSize: 13, marginBottom: 10 }}>{msg}</div>}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div><label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Vendor</label><input style={inputS} value={form.vendor} onChange={e => setForm(p => ({ ...p, vendor: e.target.value }))} /></div>
            <div><label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Amount</label><CurrIn value={form.amount} onChange={v => setForm(p => ({ ...p, amount: v }))} /></div>
            <div><label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Account</label>
              <select style={inputS} value={form.account} onChange={e => setForm(p => ({ ...p, account: e.target.value }))}>{ACCOUNTS.map(a => <option key={a}>{a}</option>)}</select>
            </div>
            <div><label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Type</label>
              <select style={inputS} value={form.type} onChange={e => setForm(p => ({ ...p, type: e.target.value }))}>{TYPES.map(t => <option key={t}>{t}</option>)}</select>
            </div>
            <div><label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Campaign (optional)</label>
              <select style={inputS} value={form.campaignId} onChange={e => setForm(p => ({ ...p, campaignId: e.target.value }))}>
                <option value="">None</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div><label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Date</label><input type="date" style={inputS} value={form.date} onChange={e => setForm(p => ({ ...p, date: e.target.value }))} /></div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label style={{ fontSize: 12, color: 'var(--text2)', display: 'block', marginBottom: 4 }}>Notes</label>
            <input style={inputS} value={form.notes} onChange={e => setForm(p => ({ ...p, notes: e.target.value }))} placeholder="Optional notes" />
          </div>
          <button style={btnS('var(--red)', false)} onClick={logExpense} disabled={saving}>{saving ? 'Saving…' : 'Log Expense'}</button>
        </div>

        {/* Expense List */}
        {expenses.length > 0 && (
          <div style={cardS}>
            <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 15 }}>Expense Log</div>
            {[...expenses].sort((a, b) => new Date(b.date) - new Date(a.date)).map(e => {
              const camp = e.campaignId ? campaigns.find(c => c.id === e.campaignId) : null;
              return (
                <div key={e.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span className="num" style={{ fontSize: 12, color: 'var(--text3)' }}>{e.date}</span>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{e.vendor}</span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: (acctColor[e.account] || 'var(--gold)') + '18', color: acctColor[e.account] || 'var(--gold)', border: `1px solid ${acctColor[e.account] || 'var(--gold)'}44` }}>{e.account}</span>
                    <span style={{ fontSize: 11, padding: '2px 8px', borderRadius: 10, background: (typeColor[e.type] || 'var(--cyan)') + '18', color: typeColor[e.type] || 'var(--cyan)', border: `1px solid ${typeColor[e.type] || 'var(--cyan)'}44` }}>{e.type}</span>
                    {camp && <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: 'var(--purple-faint)', color: 'var(--purple)' }}>{camp.name}</span>}
                    {e.loggedBy && <span style={{ fontSize: 11, color: 'var(--text3)', padding: '1px 6px', background: 'var(--surface2)', borderRadius: 4 }}>{e.loggedBy}</span>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="num" style={{ fontSize: 15, fontWeight: 700, color: 'var(--red)' }}>{fmt(e.amount)}</span>
                    <button onClick={() => deleteExpense(e.id)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 16 }}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Summary */}
        {windowExpenses.length > 0 && (
          <>
            <div style={cardS}>
              <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 15 }}>Budget vs Actual ({window2.days}-day window)</div>
              {budgetKeys.map(({ label, key, bKey }) => {
                const spent = byAccount[bKey] || 0;
                const budget = budgets[key] || 0;
                const over = spent > budget && budget > 0;
                return (
                  <div key={key} style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 13 }}>{label}</span>
                      <span className="num" style={{ fontSize: 12, color: over ? 'var(--red)' : 'var(--text2)' }}>{fmt(spent)} / {fmt(budget)}</span>
                    </div>
                    <div style={{ height: 5, background: 'var(--surface3)', borderRadius: 3 }}>
                      <div style={{ height: '100%', width: budget > 0 ? Math.min(100, (spent / budget) * 100) + '%' : '0%', background: over ? 'var(--red)' : acctColor[bKey] || 'var(--gold)', borderRadius: 3 }} />
                    </div>
                  </div>
                );
              })}
              <div style={{ display: 'flex', gap: 20, marginTop: 14, padding: '10px 0', borderTop: '1px solid var(--border)' }}>
                <div><div style={{ fontSize: 12, color: 'var(--text2)' }}>Recurring</div><div className="num" style={{ fontSize: 16, fontWeight: 700, color: 'var(--cyan)' }}>{fmt(recurring)}</div></div>
                <div><div style={{ fontSize: 12, color: 'var(--text2)' }}>One-Time</div><div className="num" style={{ fontSize: 16, fontWeight: 700, color: 'var(--purple)' }}>{fmt(oneTime)}</div></div>
              </div>
            </div>

            <div style={cardS}>
              <div style={{ fontWeight: 600, marginBottom: 12, fontSize: 15 }}>Top Vendors</div>
              {Object.entries(byVendor).sort(([, a], [, b]) => b - a).slice(0, 10).map(([vendor, amount]) => (
                <div key={vendor} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid var(--border)' }}>
                  <span style={{ fontSize: 14 }}>{vendor}</span>
                  <span className="num" style={{ fontSize: 13, color: 'var(--text2)', fontWeight: 600 }}>{fmt(amount)}</span>
                </div>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
