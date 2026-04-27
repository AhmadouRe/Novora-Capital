'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DatePicker from '../components/DatePicker';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

/* ─── helpers ─────────────────────────────────────────────── */
function toN(v) { const n = parseFloat(String(v || 0).replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; }
function fmt(n) { return Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }); }
function fmtDate(iso) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][+m - 1]} ${+d}, ${y}`;
}
const TODAY = new Date().toISOString().slice(0, 10);

/* ─── account config ──────────────────────────────────────── */
const ACCTS = [
  { key: 'marketing', label: 'Marketing',  color: 'var(--gold)',   icon: '◆' },
  { key: 'operating', label: 'Operating',  color: 'var(--cyan)',   icon: '◉' },
  { key: 'reserve',   label: 'Reserve',    color: 'var(--purple)', icon: '◈' },
  { key: 'taxes',     label: 'Taxes',      color: 'var(--red)',    icon: '◍' },
  { key: 'owner',     label: 'Owner Pay',  color: 'var(--green)',  icon: '◐' },
];
const ACCT_KEYS = ACCTS.map(a => a.key);
const acctByKey = Object.fromEntries(ACCTS.map(a => [a.key, a]));

const CATEGORIES = ['Advertising','Software/Tools','Professional Services','Office Supplies','Travel','Meals','Insurance','Utilities','Equipment','Contractor Pay','Legal','Other'];
const FREQ_OPTS = ['Weekly','Monthly','Quarterly','Yearly'];

/* ─── micro components ───────────────────────────────────── */
function CurrIn({ value, onChange, placeholder = '0' }) {
  const [focused, setFocused] = useState(false);
  const display = focused ? value : (toN(value) > 0 ? toN(value).toLocaleString() : '');
  return (
    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' }}>
      <span style={{ padding: '0 10px', color: 'var(--text2)', background: 'var(--surface3)', borderRight: '1px solid var(--border)', height: 40, display: 'flex', alignItems: 'center', fontSize: 14 }}>$</span>
      <input
        value={focused ? value : display}
        onChange={e => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        style={{ flex: 1, padding: '9px 12px', background: 'transparent', border: 'none', color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'JetBrains Mono,monospace' }}
      />
    </div>
  );
}

function Badge({ label, color }) {
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: color + '22', color, letterSpacing: '0.05em' }}>
      {label}
    </span>
  );
}

function Prog({ pct, color }) {
  const clamped = Math.min(100, Math.max(0, pct));
  return (
    <div style={{ height: 6, borderRadius: 3, background: 'var(--surface3)', overflow: 'hidden' }}>
      <div style={{ height: '100%', width: clamped + '%', background: color, borderRadius: 3, transition: 'width 0.3s' }} />
    </div>
  );
}

function Modal({ title, onClose, children }) {
  const ref = useRef();
  useEffect(() => {
    function h(e) { if (ref.current && !ref.current.contains(e.target)) onClose(); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [onClose]);
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#00000088', zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 16px' }}>
      <div ref={ref} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <span style={{ fontWeight: 700, fontSize: 16 }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: 20, cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>
        {children}
      </div>
    </div>
  );
}

function Lbl({ children }) {
  return <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{children}</div>;
}

function Row({ label, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <Lbl>{label}</Lbl>
      {children}
    </div>
  );
}

/* ─── custom tooltip for bar chart ───────────────────────── */
function ChartTip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 13 }}>
      <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || 'var(--text)', marginBottom: 2 }}>{p.name}: {fmt(p.value)}</div>
      ))}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════ */
export default function ExpensesPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  /* data */
  const [budgets, setBudgets] = useState({ marketing: 0, operating: 0, reserve: 0, owner: 0, taxes: 0 });
  const [entries, setEntries] = useState([]);
  const [transfers, setTransfers] = useState([]);
  const [recurring, setRecurring] = useState([]);

  /* ui */
  const [filterAcct, setFilterAcct] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [editRecurring, setEditRecurring] = useState(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('expenses'); /* expenses | chart | recurring | transfers */

  /* add expense form */
  const [fAcct, setFAcct] = useState('marketing');
  const [fVendor, setFVendor] = useState('');
  const [fAmount, setFAmount] = useState('');
  const [fCat, setFCat] = useState('');
  const [fDate, setFDate] = useState(TODAY);
  const [fNotes, setFNotes] = useState('');
  const [fIsRec, setFIsRec] = useState(false);
  const [fFreq, setFFreq] = useState('Monthly');
  const [fEndDate, setFEndDate] = useState('');

  /* transfer form */
  const [tAmt, setTAmt] = useState('');
  const [tTo, setTTo] = useState('marketing');
  const [tNote, setTNote] = useState('');

  /* recurring form */
  const [rVendor, setRVendor] = useState('');
  const [rAmt, setRAmt] = useState('');
  const [rAcct, setRAcct] = useState('marketing');
  const [rCat, setRCat] = useState('');
  const [rFreq, setRFreq] = useState('Monthly');
  const [rStartDate, setRStartDate] = useState(TODAY);
  const [rEndDate, setREndDate] = useState('');

  /* ── fetch session ── */
  useEffect(() => {
    fetch('/api/auth/session').then(r => r.json()).then(s => {
      setSession(s);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  /* ── fetch data ── */
  const reload = useCallback(async () => {
    const [b, e, t, r] = await Promise.all([
      fetch('/api/expenses/budgets').then(r => r.ok ? r.json() : {}),
      fetch('/api/expenses').then(r => r.ok ? r.json() : []),
      fetch('/api/expenses/transfer').then(r => r.ok ? r.json() : []),
      fetch('/api/expenses/recurring').then(r => r.ok ? r.json() : []),
    ]);
    setBudgets(b || {});
    setEntries(Array.isArray(e) ? e : []);
    setTransfers(Array.isArray(t) ? t : []);
    setRecurring(Array.isArray(r) ? r : []);
  }, []);

  useEffect(() => {
    if (session?.access?.expenses) reload();
  }, [session, reload]);

  /* ── computed ── */
  const spent = useCallback((key) => {
    return entries.filter(e => e.account === key).reduce((s, e) => s + toN(e.amount), 0);
  }, [entries]);

  const transferredTo = useCallback((key) => {
    return transfers.filter(t => t.to === key).reduce((s, t) => s + toN(t.amount), 0);
  }, [transfers]);

  const transferredFrom = useCallback((key) => {
    return transfers.filter(t => t.from === key).reduce((s, t) => s + toN(t.amount), 0);
  }, [transfers]);

  function allocated(key) {
    const base = toN(budgets[key]);
    if (key === 'reserve') return base - transferredFrom('reserve');
    return base + transferredTo(key);
  }

  function remaining(key) {
    return allocated(key) - spent(key);
  }

  /* ── filtered entries ── */
  const visibleEntries = entries.filter(e => {
    if (filterAcct !== 'all' && e.account !== filterAcct) return false;
    if (filterType === 'recurring' && !e.recurring) return false;
    if (filterType === 'one-time' && (e.recurring || e.autoAllocated)) return false;
    if (filterType === 'auto' && !e.autoAllocated) return false;
    return true;
  }).sort((a, b) => (b.date || b.loggedAt || '').localeCompare(a.date || a.loggedAt || ''));

  /* ── add expense ── */
  async function submitExpense() {
    if (!fVendor.trim() || !fAmount || !fDate) return;
    setSaving(true);
    const body = {
      account: fAcct,
      vendor: fVendor.trim(),
      amount: toN(fAmount),
      category: fCat,
      date: fDate,
      notes: fNotes,
      recurring: fIsRec,
      frequency: fIsRec ? fFreq : null,
      endDate: fIsRec && fEndDate ? fEndDate : null,
    };
    const r = await fetch('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (r.ok) {
      setFVendor(''); setFAmount(''); setFCat(''); setFDate(TODAY); setFNotes(''); setFIsRec(false); setFEndDate('');
      setShowAddModal(false);
      await reload();
    }
    setSaving(false);
  }

  /* ── transfer ── */
  async function submitTransfer() {
    if (!tAmt || toN(tAmt) <= 0) return;
    const avail = remaining('reserve');
    if (toN(tAmt) > avail) return;
    setSaving(true);
    const body = { from: 'reserve', to: tTo, amount: toN(tAmt), note: tNote, date: TODAY };
    const r = await fetch('/api/expenses/transfer', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (r.ok) {
      setTAmt(''); setTTo('marketing'); setTNote('');
      setShowTransferModal(false);
      await reload();
    }
    setSaving(false);
  }

  /* ── save recurring ── */
  async function submitRecurring() {
    if (!rVendor.trim() || !rAmt || !rStartDate) return;
    setSaving(true);
    const body = { vendor: rVendor.trim(), amount: toN(rAmt), account: rAcct, category: rCat, frequency: rFreq, startDate: rStartDate, endDate: rEndDate || null, active: true };
    let r;
    if (editRecurring) {
      r = await fetch(`/api/expenses/recurring/${editRecurring.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    } else {
      r = await fetch('/api/expenses/recurring', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    }
    if (r.ok) {
      setRVendor(''); setRAmt(''); setRCat(''); setRStartDate(TODAY); setREndDate(''); setEditRecurring(null);
      setShowRecurringModal(false);
      await reload();
    }
    setSaving(false);
  }

  async function deleteRecurring(id) {
    await fetch(`/api/expenses/recurring/${id}`, { method: 'DELETE' });
    await reload();
  }

  async function deleteEntry(id) {
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
    await reload();
  }

  function openEditRecurring(rec) {
    setEditRecurring(rec);
    setRVendor(rec.vendor);
    setRAmt(String(rec.amount));
    setRAcct(rec.account);
    setRCat(rec.category || '');
    setRFreq(rec.frequency || 'Monthly');
    setRStartDate(rec.startDate || TODAY);
    setREndDate(rec.endDate || '');
    setShowRecurringModal(true);
  }

  /* ── chart data ── */
  const chartData = ACCTS.map(a => ({
    name: a.label,
    allocated: allocated(a.key),
    spent: spent(a.key),
    remaining: Math.max(0, remaining(a.key)),
  }));

  /* ── guards ── */
  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>Loading…</div>;
  if (!session) { router.push('/'); return null; }
  if (!session.access?.expenses) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <div style={{ fontSize: 32 }}>🔒</div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>Access Denied</div>
        <div style={{ color: 'var(--text2)', fontSize: 14 }}>You don't have access to Expense Tracker.</div>
        <div style={{ color: 'var(--text2)', fontSize: 13 }}>Contact Ahmadou to request access.</div>
        <button onClick={() => router.push('/')} style={{ marginTop: 16, padding: '10px 24px', borderRadius: 8, border: 'none', background: 'var(--surface2)', color: 'var(--text)', fontWeight: 600, cursor: 'pointer' }}>Back to Home</button>
      </div>
    );
  }

  /* ── styles ── */
  const inp = { width: '100%', padding: '9px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14, boxSizing: 'border-box' };
  const sel = { ...inp, cursor: 'pointer' };
  const btn = (c, light) => ({ padding: '9px 18px', borderRadius: 8, border: 'none', background: light ? c + '22' : c, color: light ? c : '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' });
  const pill = (active) => ({ padding: '6px 14px', borderRadius: 20, border: `1px solid ${active ? 'var(--gold)' : 'var(--border)'}`, background: active ? 'var(--gold-faint)' : 'transparent', color: active ? 'var(--gold)' : 'var(--text2)', fontWeight: 600, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap' });
  const tabBtn = (active) => ({ padding: '8px 16px', border: 'none', background: 'none', color: active ? 'var(--text)' : 'var(--text2)', fontWeight: active ? 700 : 400, fontSize: 14, cursor: 'pointer', borderBottom: `2px solid ${active ? 'var(--orange)' : 'transparent'}`, transition: 'all 0.15s' });

  const totalAllocated = ACCT_KEYS.reduce((s, k) => s + toN(budgets[k]), 0);
  const totalSpent = ACCT_KEYS.reduce((s, k) => s + spent(k), 0);

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', paddingBottom: 40 }}>

      {/* Nav */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', height: 56, background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: 20, cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}>←</button>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Expense Tracker</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 12, color: 'var(--text2)', background: 'var(--surface2)', padding: '4px 10px', borderRadius: 6 }}>{session.userName}</span>
          <button onClick={() => setShowAddModal(true)} style={{ padding: '7px 16px', borderRadius: 8, border: 'none', background: 'var(--orange)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>+ Add Expense</button>
        </div>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>

        {/* Summary row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total Allocated', val: totalAllocated, color: 'var(--text)' },
            { label: 'Total Spent', val: totalSpent, color: 'var(--red)' },
            { label: 'Total Remaining', val: totalAllocated - totalSpent, color: 'var(--green)' },
          ].map(x => (
            <div key={x.label} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 18px' }}>
              <div style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600, marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{x.label}</div>
              <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 22, fontWeight: 700, color: x.color }}>{fmt(x.val)}</div>
            </div>
          ))}
        </div>

        {/* Account Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14, marginBottom: 28 }}>
          {ACCTS.map(a => {
            const alloc = allocated(a.key);
            const sp = spent(a.key);
            const rem = alloc - sp;
            const pct = alloc > 0 ? (sp / alloc) * 100 : 0;
            const over = rem < 0;
            return (
              <div key={a.key} style={{ background: 'var(--surface)', border: `1px solid ${a.color}44`, borderRadius: 14, padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ color: a.color, fontSize: 16 }}>{a.icon}</span>
                    <span style={{ fontWeight: 700, fontSize: 14 }}>{a.label}</span>
                  </div>
                  {a.key === 'reserve' && (
                    <button onClick={() => setShowTransferModal(true)} style={{ padding: '4px 10px', borderRadius: 6, border: `1px solid ${a.color}`, background: 'transparent', color: a.color, fontWeight: 600, fontSize: 11, cursor: 'pointer' }}>Transfer</button>
                  )}
                </div>
                <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 24, fontWeight: 700, color: a.color, marginBottom: 4 }}>{fmt(alloc)}</div>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>allocated</div>
                <Prog pct={pct} color={over ? 'var(--red)' : a.color} />
                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 8, fontSize: 12 }}>
                  <span style={{ color: 'var(--text2)' }}>Spent: <span style={{ color: 'var(--text)', fontFamily: 'JetBrains Mono,monospace' }}>{fmt(sp)}</span></span>
                  <span style={{ color: over ? 'var(--red)' : 'var(--text2)' }}>Rem: <span style={{ color: over ? 'var(--red)' : 'var(--green)', fontFamily: 'JetBrains Mono,monospace' }}>{fmt(rem)}</span></span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
          {[['expenses','Expenses'],['chart','Budget Chart'],['recurring','Recurring'],['transfers','Transfer Log']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={tabBtn(tab === k)}>{l}</button>
          ))}
        </div>

        {/* ── Tab: Expenses ── */}
        {tab === 'expenses' && (
          <>
            {/* Filters */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
              <span style={{ fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>Account:</span>
              {[['all','All'],...ACCTS.map(a => [a.key, a.label])].map(([k, l]) => (
                <button key={k} onClick={() => setFilterAcct(k)} style={pill(filterAcct === k)}>{l}</button>
              ))}
              <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text2)', fontWeight: 600 }}>Type:</span>
              {[['all','All'],['one-time','One-Time'],['recurring','Recurring'],['auto','Auto']].map(([k, l]) => (
                <button key={k} onClick={() => setFilterType(k)} style={pill(filterType === k)}>{l}</button>
              ))}
            </div>

            {/* Expense list */}
            {visibleEntries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text2)' }}>No expenses found.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {visibleEntries.map(e => {
                  const a = acctByKey[e.account] || ACCTS[0];
                  return (
                    <div key={e.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: a.color + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: a.color, fontSize: 16, flexShrink: 0 }}>{a.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{e.vendor}</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          <Badge label={a.label} color={a.color} />
                          {e.category && <Badge label={e.category} color="var(--text2)" />}
                          {e.autoAllocated && <Badge label="AUTO" color="var(--cyan)" />}
                          {e.recurring && <Badge label={e.frequency || 'Recurring'} color="var(--purple)" />}
                          <span style={{ fontSize: 11, color: 'var(--text2)' }}>{fmtDate(e.date)}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontWeight: 700, fontSize: 15, color: 'var(--text)' }}>{fmt(e.amount)}</div>
                        <div style={{ fontSize: 11, color: 'var(--text2)' }}>{e.loggedBy}</div>
                      </div>
                      {!e.autoAllocated && (
                        <button onClick={() => deleteEntry(e.id)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 16, cursor: 'pointer', padding: '4px 6px', borderRadius: 4 }} title="Delete">✕</button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── Tab: Budget Chart ── */}
        {tab === 'chart' && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 24 }}>
            <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 20 }}>Budget vs. Spending by Account</div>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData} barCategoryGap="30%" barGap={4}>
                <XAxis dataKey="name" tick={{ fill: 'var(--text2)', fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text2)', fontSize: 11 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                <Tooltip content={<ChartTip />} cursor={{ fill: 'var(--surface2)' }} />
                <Bar dataKey="allocated" name="Allocated" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill={ACCTS[i].color + '55'} />)}
                </Bar>
                <Bar dataKey="spent" name="Spent" radius={[4, 4, 0, 0]}>
                  {chartData.map((_, i) => <Cell key={i} fill={ACCTS[i].color} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text2)' }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: 'var(--text2)', opacity: 0.4 }} /> Allocated
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--text2)' }}>
                <div style={{ width: 12, height: 12, borderRadius: 2, background: 'var(--text)' }} /> Spent
              </div>
            </div>
          </div>
        )}

        {/* ── Tab: Recurring ── */}
        {tab === 'recurring' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button onClick={() => { setEditRecurring(null); setRVendor(''); setRAmt(''); setRAcct('marketing'); setRCat(''); setRFreq('Monthly'); setRStartDate(TODAY); setREndDate(''); setShowRecurringModal(true); }} style={btn('var(--purple)', true)}>+ Add Recurring</button>
            </div>
            {recurring.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text2)' }}>No recurring expenses set up.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recurring.map(r => {
                  const a = acctByKey[r.account] || ACCTS[0];
                  return (
                    <div key={r.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--purple)22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--purple)', fontSize: 16, flexShrink: 0 }}>↺</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{r.vendor}</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          <Badge label={a.label} color={a.color} />
                          <Badge label={r.frequency || 'Monthly'} color="var(--purple)" />
                          {r.category && <Badge label={r.category} color="var(--text2)" />}
                          <span style={{ fontSize: 11, color: 'var(--text2)' }}>Since {fmtDate(r.startDate)}{r.endDate ? ` → ${fmtDate(r.endDate)}` : ''}</span>
                        </div>
                      </div>
                      <div style={{ fontFamily: 'JetBrains Mono,monospace', fontWeight: 700, fontSize: 15, color: 'var(--purple)' }}>{fmt(r.amount)}</div>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button onClick={() => openEditRecurring(r)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 11, padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}>Edit</button>
                        <button onClick={() => deleteRecurring(r.id)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 16, cursor: 'pointer', padding: '4px 6px', borderRadius: 4 }}>✕</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ── Tab: Transfer Log ── */}
        {tab === 'transfers' && (
          <>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 16 }}>
              <button onClick={() => setShowTransferModal(true)} style={btn('var(--purple)', true)}>Transfer from Reserve</button>
            </div>
            {transfers.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text2)' }}>No transfers recorded.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[...transfers].reverse().map(t => {
                  const toAcct = acctByKey[t.to] || ACCTS[0];
                  return (
                    <div key={t.id} style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--purple)22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--purple)', fontSize: 16, flexShrink: 0 }}>⇄</div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>Reserve → {toAcct.label}</div>
                        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                          {t.note && <span style={{ fontSize: 12, color: 'var(--text2)' }}>{t.note}</span>}
                          <span style={{ fontSize: 11, color: 'var(--text3)' }}>{fmtDate(t.date)}</span>
                          <span style={{ fontSize: 11, color: 'var(--text3)' }}>{t.loggedBy}</span>
                        </div>
                      </div>
                      <div style={{ fontFamily: 'JetBrains Mono,monospace', fontWeight: 700, fontSize: 15, color: 'var(--purple)' }}>{fmt(t.amount)}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Add Expense Modal ── */}
      {showAddModal && (
        <Modal title="Log Expense" onClose={() => setShowAddModal(false)}>
          <Row label="Account">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ACCTS.map(a => (
                <button key={a.key} onClick={() => setFAcct(a.key)} style={{ padding: '7px 14px', borderRadius: 8, border: `2px solid ${fAcct === a.key ? a.color : 'var(--border)'}`, background: fAcct === a.key ? a.color + '18' : 'transparent', color: fAcct === a.key ? a.color : 'var(--text2)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>{a.label}</button>
              ))}
            </div>
          </Row>
          <Row label="Vendor / Description">
            <input value={fVendor} onChange={e => setFVendor(e.target.value)} placeholder="e.g. Facebook Ads" style={inp} />
          </Row>
          <Row label="Amount">
            <CurrIn value={fAmount} onChange={setFAmount} />
          </Row>
          <Row label="Category">
            <select value={fCat} onChange={e => setFCat(e.target.value)} style={sel}>
              <option value="">Select category…</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Row>
          <Row label="Date">
            <DatePicker value={fDate} onChange={setFDate} placeholder="Select date" />
          </Row>
          <Row label="Notes (optional)">
            <textarea value={fNotes} onChange={e => setFNotes(e.target.value)} placeholder="Any additional notes…" rows={2} style={{ ...inp, resize: 'vertical' }} />
          </Row>
          <Row label="">
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <div onClick={() => setFIsRec(v => !v)} style={{ width: 40, height: 22, borderRadius: 11, background: fIsRec ? 'var(--purple)' : 'var(--surface3)', border: '1px solid var(--border)', position: 'relative', cursor: 'pointer', transition: 'background 0.2s' }}>
                <div style={{ position: 'absolute', top: 2, left: fIsRec ? 20 : 2, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
              </div>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>Recurring expense</span>
            </label>
          </Row>
          {fIsRec && (
            <>
              <Row label="Frequency">
                <div style={{ display: 'flex', gap: 8 }}>
                  {FREQ_OPTS.map(f => (
                    <button key={f} onClick={() => setFFreq(f)} style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: `2px solid ${fFreq === f ? 'var(--purple)' : 'var(--border)'}`, background: fFreq === f ? 'var(--purple)18' : 'transparent', color: fFreq === f ? 'var(--purple)' : 'var(--text2)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>{f}</button>
                  ))}
                </div>
              </Row>
              <Row label="End Date (optional)">
                <DatePicker value={fEndDate} onChange={setFEndDate} placeholder="No end date" />
              </Row>
            </>
          )}
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button onClick={() => setShowAddModal(false)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button onClick={submitExpense} disabled={saving || !fVendor || !fAmount} style={{ flex: 2, padding: '10px 0', borderRadius: 8, border: 'none', background: 'var(--orange)', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: (!fVendor || !fAmount) ? 0.5 : 1 }}>{saving ? 'Saving…' : 'Log Expense'}</button>
          </div>
        </Modal>
      )}

      {/* ── Transfer Modal ── */}
      {showTransferModal && (
        <Modal title="Transfer from Reserve" onClose={() => setShowTransferModal(false)}>
          <div style={{ background: 'var(--purple)11', border: '1px solid var(--purple)44', borderRadius: 8, padding: '10px 14px', marginBottom: 20, fontSize: 13 }}>
            Reserve available: <span style={{ fontFamily: 'JetBrains Mono,monospace', fontWeight: 700, color: 'var(--purple)' }}>{fmt(remaining('reserve'))}</span>
          </div>
          <Row label="Transfer To">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ACCTS.filter(a => a.key !== 'reserve').map(a => (
                <button key={a.key} onClick={() => setTTo(a.key)} style={{ padding: '7px 14px', borderRadius: 8, border: `2px solid ${tTo === a.key ? a.color : 'var(--border)'}`, background: tTo === a.key ? a.color + '18' : 'transparent', color: tTo === a.key ? a.color : 'var(--text2)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>{a.label}</button>
              ))}
            </div>
          </Row>
          <Row label="Amount">
            <CurrIn value={tAmt} onChange={setTAmt} />
            {toN(tAmt) > remaining('reserve') && <div style={{ color: 'var(--red)', fontSize: 12, marginTop: 6 }}>Exceeds available reserve balance.</div>}
          </Row>
          <Row label="Note (optional)">
            <input value={tNote} onChange={e => setTNote(e.target.value)} placeholder="Reason for transfer…" style={inp} />
          </Row>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button onClick={() => setShowTransferModal(false)} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button onClick={submitTransfer} disabled={saving || !tAmt || toN(tAmt) <= 0 || toN(tAmt) > remaining('reserve')} style={{ flex: 2, padding: '10px 0', borderRadius: 8, border: 'none', background: 'var(--purple)', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: (!tAmt || toN(tAmt) > remaining('reserve')) ? 0.5 : 1 }}>{saving ? 'Processing…' : 'Confirm Transfer'}</button>
          </div>
        </Modal>
      )}

      {/* ── Recurring Modal ── */}
      {showRecurringModal && (
        <Modal title={editRecurring ? 'Edit Recurring Expense' : 'Add Recurring Expense'} onClose={() => { setShowRecurringModal(false); setEditRecurring(null); }}>
          <Row label="Vendor / Description">
            <input value={rVendor} onChange={e => setRVendor(e.target.value)} placeholder="e.g. Slack subscription" style={inp} />
          </Row>
          <Row label="Amount">
            <CurrIn value={rAmt} onChange={setRAmt} />
          </Row>
          <Row label="Account">
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ACCTS.map(a => (
                <button key={a.key} onClick={() => setRAcct(a.key)} style={{ padding: '7px 14px', borderRadius: 8, border: `2px solid ${rAcct === a.key ? a.color : 'var(--border)'}`, background: rAcct === a.key ? a.color + '18' : 'transparent', color: rAcct === a.key ? a.color : 'var(--text2)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>{a.label}</button>
              ))}
            </div>
          </Row>
          <Row label="Category">
            <select value={rCat} onChange={e => setRCat(e.target.value)} style={sel}>
              <option value="">Select category…</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </Row>
          <Row label="Frequency">
            <div style={{ display: 'flex', gap: 8 }}>
              {FREQ_OPTS.map(f => (
                <button key={f} onClick={() => setRFreq(f)} style={{ flex: 1, padding: '7px 0', borderRadius: 8, border: `2px solid ${rFreq === f ? 'var(--purple)' : 'var(--border)'}`, background: rFreq === f ? 'var(--purple)18' : 'transparent', color: rFreq === f ? 'var(--purple)' : 'var(--text2)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>{f}</button>
              ))}
            </div>
          </Row>
          <Row label="Start Date">
            <DatePicker value={rStartDate} onChange={setRStartDate} placeholder="Select start date" />
          </Row>
          <Row label="End Date (optional)">
            <DatePicker value={rEndDate} onChange={setREndDate} placeholder="No end date" />
          </Row>
          <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
            <button onClick={() => { setShowRecurringModal(false); setEditRecurring(null); }} style={{ flex: 1, padding: '10px 0', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontWeight: 600, cursor: 'pointer' }}>Cancel</button>
            <button onClick={submitRecurring} disabled={saving || !rVendor || !rAmt} style={{ flex: 2, padding: '10px 0', borderRadius: 8, border: 'none', background: 'var(--purple)', color: '#fff', fontWeight: 700, cursor: 'pointer', opacity: (!rVendor || !rAmt) ? 0.5 : 1 }}>{saving ? 'Saving…' : editRecurring ? 'Save Changes' : 'Add Recurring'}</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
