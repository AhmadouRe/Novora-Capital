'use client';
import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import DatePicker from '../components/DatePicker';

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
  { key: 'marketing', label: 'Marketing',  color: 'var(--gold)',   icon: '◆', full: true  },
  { key: 'operating', label: 'Operating',  color: 'var(--cyan)',   icon: '◉', full: true  },
  { key: 'reserve',   label: 'Reserve',    color: 'var(--purple)', icon: '◈', full: false },
  { key: 'taxes',     label: 'Taxes',      color: 'var(--red)',    icon: '⬡', full: false },
  { key: 'owner',     label: 'Owner Pay',  color: 'var(--green)',  icon: '◎', full: false },
];
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

/* ═══════════════════════════════════════════════════════════ */
export default function ExpensesPage() {
  const router = useRouter();
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  /* data */
  const [budgets, setBudgets] = useState({ marketing: 0, operating: 0, reserve: 0, owner: 0, taxes: 0 });
  const [entries, setEntries] = useState([]);
  const [recurring, setRecurring] = useState([]);

  /* ui */
  const [filterAcct, setFilterAcct] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRecurringModal, setShowRecurringModal] = useState(false);
  const [editRecurring, setEditRecurring] = useState(null);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('expenses');

  /* manual account balances */
  const [manualBalances, setManualBalances] = useState({});
  const [editingAccount, setEditingAccount] = useState(null);
  const [accountBalanceInput, setAccountBalanceInput] = useState('');
  const [accountSaveError, setAccountSaveError] = useState('');
  const [accountSaveSuccess, setAccountSaveSuccess] = useState('');

  /* split allocation */
  const [splits, setSplits] = useState([]);
  const [showAllocationEdit, setShowAllocationEdit] = useState(false);
  const [allocationPinInput, setAllocationPinInput] = useState('');
  const [allocationPinError, setAllocationPinError] = useState('');
  const [allocationUnlocked, setAllocationUnlocked] = useState(false);
  const [editSplits, setEditSplits] = useState({});
  const [splitSaveError, setSplitSaveError] = useState('');
  const [splitSaveSuccess, setSplitSaveSuccess] = useState(false);
  const allocationPinRef = useRef(null);

  /* edit expense inline */
  const [editEntryId, setEditEntryId] = useState(null);
  const [editEntryVendor, setEditEntryVendor] = useState('');
  const [editEntryAmount, setEditEntryAmount] = useState('');
  const [editEntryDate, setEditEntryDate] = useState('');

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

  /* ── auto-log tracking ── */
  const didAutoLogRef = useRef(false);

  /* ── fetch data ── */
  const reload = useCallback(async (skipAutoLog = false) => {
    const [b, e, r] = await Promise.all([
      fetch('/api/expenses/budgets').then(r => r.ok ? r.json() : {}),
      fetch('/api/expenses').then(r => r.ok ? r.json() : []),
      fetch('/api/expenses/recurring').then(r => r.ok ? r.json() : []),
    ]);
    setBudgets(b || {});
    const entryList = Array.isArray(e) ? e : [];
    const recList = Array.isArray(r) ? r : [];
    setEntries(entryList);
    setRecurring(recList);

    /* auto-log monthly recurring (once per page load) */
    if (!skipAutoLog && !didAutoLogRef.current) {
      didAutoLogRef.current = true;
      const monthStart = TODAY.slice(0, 7) + '-01';
      let autoLogged = false;
      for (const rec of recList.filter(r => r.active !== false && r.frequency === 'Monthly')) {
        const exists = entryList.some(e =>
          (e.recurringId === rec.id || (e.vendor === rec.vendor && e.account === rec.account && e.recurring)) &&
          (e.date || '') >= monthStart
        );
        if (!exists) {
          await fetch('/api/expenses', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ vendor: rec.vendor, amount: rec.amount, account: rec.account, category: rec.category, date: TODAY, recurring: true, recurringId: rec.id, frequency: rec.frequency }),
          });
          autoLogged = true;
        }
      }
      if (autoLogged) {
        const fresh = await fetch('/api/expenses').then(r => r.ok ? r.json() : []);
        setEntries(Array.isArray(fresh) ? fresh : []);
      }
    }
  }, []);

  useEffect(() => {
    if (session?.access?.expenses) reload();
  }, [session, reload]);

  useEffect(() => {
    if (session?.access?.revenue) {
      fetch('/api/revenue/splits').then(r => r.ok ? r.json() : []).then(d => {
        if (Array.isArray(d)) setSplits(d);
      }).catch(() => {});
    }
    if (session) {
      fetch('/api/expenses/manual-balance').then(r => r.ok ? r.json() : {}).then(d => {
        if (d?.balances) setManualBalances(d.balances);
      }).catch(() => {});
    }
  }, [session]);

  /* ── computed ── */
  const spentFromEntries = useCallback((key) => {
    return entries.filter(e => e.account === key && !e.autoAllocated).reduce((s, e) => s + toN(e.amount), 0);
  }, [entries]);

  function allocated(key) { return toN(budgets[key]); }

  /* ── filtered entries ── */
  const visibleEntries = entries.filter(e => {
    if (e.autoAllocated) return false;
    if (filterAcct !== 'all' && e.account !== filterAcct) return false;
    if (filterType === 'auto' && !e.autoGenerated) return false;
    if (filterType === 'recurring' && !e.recurring) return false;
    if (filterType === 'one-time' && (e.recurring || e.autoGenerated)) return false;
    return true;
  }).sort((a, b) => (b.date || b.loggedAt || '').localeCompare(a.date || a.loggedAt || ''));

  /* ── add expense ── */
  async function submitExpense() {
    if (!fVendor.trim() || !fAmount || !fDate) return;
    setSaving(true);
    const body = { account: fAcct, vendor: fVendor.trim(), amount: toN(fAmount), category: fCat, date: fDate, notes: fNotes, recurring: fIsRec, frequency: fIsRec ? fFreq : null, endDate: fIsRec && fEndDate ? fEndDate : null };
    const r = await fetch('/api/expenses', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    if (r.ok) {
      setFVendor(''); setFAmount(''); setFCat(''); setFDate(TODAY); setFNotes(''); setFIsRec(false); setFEndDate('');
      setShowAddModal(false);
      await reload(true);
    }
    setSaving(false);
  }

  /* ── edit expense ── */
  function openEditEntry(e) {
    setEditEntryId(e.id);
    setEditEntryVendor(e.vendor);
    setEditEntryAmount(String(e.amount));
    setEditEntryDate(e.date || '');
  }

  async function saveEditEntry() {
    await fetch(`/api/expenses/${editEntryId}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ vendor: editEntryVendor, amount: toN(editEntryAmount), date: editEntryDate }),
    });
    setEditEntryId(null);
    await reload(true);
  }

  async function deleteEntry(id) {
    if (!confirm('Delete this expense?')) return;
    await fetch(`/api/expenses/${id}`, { method: 'DELETE' });
    await reload(true);
  }

  /* ── recurring management ── */
  async function stopRecurring(rec) {
    await fetch(`/api/expenses/recurring/${rec.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: false }) });
    await reload(true);
  }

  async function resumeRecurring(rec) {
    await fetch(`/api/expenses/recurring/${rec.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ active: true }) });
    await reload(true);
  }

  async function deleteRecurring(rec) {
    if (!confirm(`Delete "${rec.vendor}" schedule and all its logged history?`)) return;
    const matching = entries.filter(e => e.recurringId === rec.id || (e.vendor === rec.vendor && e.account === rec.account && e.recurring));
    await Promise.all(matching.map(e => fetch(`/api/expenses/${e.id}`, { method: 'DELETE' })));
    await fetch(`/api/expenses/recurring/${rec.id}`, { method: 'DELETE' });
    await reload(true);
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
      await reload(true);
    }
    setSaving(false);
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

  /* ── account balance edit (no PIN required) ── */
  function openBalanceEdit(key) {
    setEditingAccount(key);
    const current = manualBalances[key] != null ? manualBalances[key] : 0;
    setAccountBalanceInput(current > 0 ? String(current) : '');
    setAccountSaveError('');
    setAccountSaveSuccess('');
  }

  function cancelAccountEdit() {
    setEditingAccount(null);
    setAccountBalanceInput('');
    setAccountSaveError('');
    setAccountSaveSuccess('');
  }

  async function saveAccountBalance() {
    const newBalance = parseFloat(accountBalanceInput) || 0;
    const res = await fetch('/api/expenses/manual-balance', {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ account: editingAccount, balance: newBalance }),
    });
    if (res.ok) {
      setManualBalances(prev => ({ ...prev, [editingAccount]: newBalance }));
      setAccountSaveSuccess('✓ Balance updated');
      setTimeout(() => { cancelAccountEdit(); }, 1800);
    } else {
      setAccountSaveError('Failed to save. Try again.');
    }
  }

  /* ── split allocation helpers ── */
  function openAllocationEdit() {
    setShowAllocationEdit(true);
    setAllocationPinInput('');
    setAllocationPinError('');
    setAllocationUnlocked(false);
    setEditSplits({});
    setSplitSaveError('');
    setSplitSaveSuccess(false);
    setTimeout(() => allocationPinRef.current?.focus(), 50);
  }

  function cancelAllocationEdit() {
    setShowAllocationEdit(false);
    setAllocationPinInput('');
    setAllocationPinError('');
    setAllocationUnlocked(false);
    setEditSplits({});
    setSplitSaveError('');
    setSplitSaveSuccess(false);
  }

  function unlockAllocation() {
    if (allocationPinInput === '2608') {
      setAllocationUnlocked(true);
      setAllocationPinError('');
      const es = {};
      ['Marketing','Reserve','Operating'].forEach(label => {
        const found = splits.find(s => s.label === label);
        es[label] = found ? String(found.pct) : '';
      });
      setEditSplits(es);
    } else {
      setAllocationPinError('Incorrect PIN');
      setAllocationPinInput('');
      setTimeout(() => allocationPinRef.current?.focus(), 50);
    }
  }

  async function saveSplitAllocation() {
    const editableLabels = ['Marketing','Reserve','Operating'];
    const editableSum = editableLabels.reduce((s, l) => s + toN(editSplits[l]), 0);
    const lockedSum = splits.filter(s => !editableLabels.includes(s.label)).reduce((s, sp) => s + toN(sp.pct), 0);
    const total = editableSum + lockedSum;
    if (Math.round(total) !== 100) { setSplitSaveError(`Total is ${total.toFixed(1)}% — must equal 100%`); return; }
    const updated = splits.map(sp => editableLabels.includes(sp.label) ? { ...sp, pct: toN(editSplits[sp.label]) } : sp);
    const res = await fetch('/api/revenue/splits', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updated) });
    if (res.ok) {
      setSplits(updated);
      setSplitSaveSuccess(true);
      setSplitSaveError('');
      setTimeout(() => { setSplitSaveSuccess(false); cancelAllocationEdit(); }, 2000);
    } else {
      const err = await res.json().catch(() => ({}));
      setSplitSaveError(err.error || 'Save failed');
    }
  }

  /* ── guards ── */
  if (loading) return <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>Loading…</div>;
  if (!session) { router.push('/'); return null; }
  if (!session.access?.expenses) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
        <div style={{ fontSize: 32 }}>🔒</div>
        <div style={{ fontSize: 20, fontWeight: 700 }}>Access Denied</div>
        <div style={{ color: 'var(--text2)', fontSize: 14 }}>You don't have access to Expense Tracker.</div>
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

  const totalAllocated = ACCTS.filter(a => a.full).reduce((s, a) => s + toN(budgets[a.key]), 0);
  const totalSpent = ACCTS.filter(a => a.full).reduce((s, a) => s + spentFromEntries(a.key), 0);

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
            const alloc = toN(budgets[a.key]);
            const isEditing = editingAccount === a.key;

            if (!a.full) {
              // Info-only card (Reserve, Taxes, Owner Pay)
              return (
                <div key={a.key} style={{ background: 'var(--surface)', border: `1px solid ${a.color}33`, borderRadius: 14, padding: 18 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                    <span style={{ color: a.color, fontSize: 16 }}>{a.icon}</span>
                    <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{a.label}</span>
                    <span style={{ fontSize: 11, color: 'var(--text3)' }}>🔒</span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 4 }}>Total Allocated</div>
                  <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 22, fontWeight: 700, color: a.color }}>{fmt(alloc)}</div>
                </div>
              );
            }

            // Full card (Marketing, Operating)
            const balance = manualBalances[a.key] != null ? manualBalances[a.key] : alloc;
            const spent = alloc - balance;
            const pct = alloc > 0 ? Math.min(100, (spent / alloc) * 100) : 0;
            const over = spent > alloc;

            return (
              <div key={a.key} style={{ background: 'var(--surface)', border: `1px solid ${isEditing ? a.color + '88' : a.color + '44'}`, borderRadius: 14, padding: 18 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                  <span style={{ color: a.color, fontSize: 16 }}>{a.icon}</span>
                  <span style={{ fontWeight: 700, fontSize: 14, flex: 1 }}>{a.label}</span>
                  {manualBalances[a.key] != null && !isEditing && (
                    <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--purple)22', color: 'var(--purple)', padding: '2px 6px', borderRadius: 4 }}>MANUAL</span>
                  )}
                  {isEditing && (
                    <button onClick={cancelAccountEdit} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>×</button>
                  )}
                </div>

                {/* Total Allocated */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>Total Allocated 🔒</span>
                  <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{fmt(alloc)}</span>
                </div>

                {/* Current Balance */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>Current Balance</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 15, fontWeight: 700, color: balance < 0 ? 'var(--red)' : a.color }}>{fmt(balance)}</span>
                    {!isEditing && (
                      <button onClick={() => openBalanceEdit(a.key)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 11, padding: '2px 7px', borderRadius: 4, cursor: 'pointer', fontWeight: 600 }}>Edit</button>
                    )}
                  </div>
                </div>

                {/* Total Spent */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>Total Spent</span>
                  <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 15, fontWeight: 700, color: over ? 'var(--red)' : 'var(--text)' }}>{fmt(Math.max(0, spent))}</span>
                </div>

                <Prog pct={pct} color={over ? 'var(--red)' : a.color} />

                {/* Balance edit panel */}
                {isEditing && (
                  <div style={{ marginTop: 14, padding: 14, background: 'var(--surface2)', borderRadius: 10, border: `1px solid ${a.color}44` }}>
                    <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>Set current balance</div>
                    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', marginBottom: 10 }}>
                      <span style={{ padding: '0 10px', color: 'var(--text2)', background: 'var(--surface)', borderRight: '1px solid var(--border)', height: 40, display: 'flex', alignItems: 'center', fontSize: 14 }}>$</span>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={accountBalanceInput}
                        onChange={e => setAccountBalanceInput(e.target.value.replace(/[^0-9.]/g, ''))}
                        onKeyDown={e => { if (e.key === 'Enter') saveAccountBalance(); }}
                        placeholder="0"
                        autoFocus
                        style={{ flex: 1, padding: '9px 12px', background: 'transparent', border: 'none', color: 'var(--text)', fontSize: 15, outline: 'none', fontFamily: 'JetBrains Mono,monospace', fontWeight: 700 }}
                      />
                    </div>
                    {accountSaveError && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 8 }}>{accountSaveError}</div>}
                    {accountSaveSuccess && <div style={{ color: 'var(--green)', fontSize: 12, fontWeight: 700, marginBottom: 8 }}>{accountSaveSuccess}</div>}
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button onClick={saveAccountBalance} style={{ flex: 2, padding: '8px 0', borderRadius: 7, border: 'none', background: 'var(--orange)', color: '#fff', fontWeight: 700, fontSize: 12, cursor: 'pointer' }}>Save Balance</button>
                      <button onClick={cancelAccountEdit} style={{ flex: 1, padding: '8px 0', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>Cancel</button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Split Allocation */}
        {splits.length > 0 && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 18, marginBottom: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--text3)' }}>Split Allocation</div>
              {!showAllocationEdit && session?.access?.manageTeam && (
                <button onClick={openAllocationEdit} style={{ padding: '6px 14px', borderRadius: 7, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text2)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>Edit</button>
              )}
            </div>

            {!allocationUnlocked && (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginBottom: showAllocationEdit ? 14 : 0 }}>
                {splits.map(sp => (
                  <div key={sp.label} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 14px', borderRadius: 8, background: 'var(--surface2)', border: '1px solid var(--border)' }}>
                    <div style={{ width: 10, height: 10, borderRadius: '50%', background: sp.color || 'var(--text3)', flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: 'var(--text2)' }}>{sp.label}</span>
                    <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{sp.pct}%</span>
                  </div>
                ))}
              </div>
            )}

            {showAllocationEdit && !allocationUnlocked && (
              <div style={{ marginTop: 14, padding: 16, background: 'var(--surface2)', borderRadius: 10, border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>Enter admin PIN to edit split allocation</div>
                <input
                  ref={allocationPinRef}
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  value={allocationPinInput}
                  onChange={e => setAllocationPinInput(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  onKeyDown={e => { if (e.key === 'Enter') unlockAllocation(); }}
                  placeholder="PIN"
                  style={{ width: 120, height: 48, textAlign: 'center', letterSpacing: '0.3em', fontFamily: 'JetBrains Mono,monospace', fontSize: 20, fontWeight: 700, padding: '0 12px', borderRadius: 8, background: 'var(--surface3)', border: `1px solid ${allocationPinError ? 'var(--red)' : 'var(--border)'}`, color: 'var(--text)', outline: 'none', boxSizing: 'border-box', display: 'block', marginBottom: 8 }}
                />
                {allocationPinError && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 10 }}>{allocationPinError}</div>}
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={unlockAllocation} style={{ padding: '8px 18px', borderRadius: 7, border: 'none', background: 'var(--orange)', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Unlock</button>
                  <button onClick={cancelAllocationEdit} style={{ padding: '8px 18px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                </div>
              </div>
            )}

            {allocationUnlocked && (
              <div style={{ marginTop: 14 }}>
                {(() => {
                  const editableLabels = ['Marketing','Reserve','Operating'];
                  const editableSum = editableLabels.reduce((s, l) => s + toN(editSplits[l] || '0'), 0);
                  const lockedSum = splits.filter(sp => !editableLabels.includes(sp.label)).reduce((s, sp) => s + toN(sp.pct), 0);
                  const total = editableSum + lockedSum;
                  const totalOk = Math.round(total) === 100;
                  return (
                    <>
                      {splits.map(sp => {
                        const isEditable = editableLabels.includes(sp.label);
                        return (
                          <div key={sp.label} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: sp.color || 'var(--text3)', flexShrink: 0 }} />
                            <span style={{ flex: 1, fontSize: 14, color: 'var(--text)' }}>{sp.label}</span>
                            {isEditable ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <input
                                  type="text" inputMode="numeric"
                                  value={editSplits[sp.label] || ''}
                                  onChange={e => setEditSplits(prev => ({ ...prev, [sp.label]: e.target.value.replace(/[^0-9.]/g, '') }))}
                                  style={{ width: 70, height: 36, textAlign: 'center', fontFamily: 'JetBrains Mono,monospace', fontSize: 15, fontWeight: 700, padding: '0 8px', borderRadius: 6, background: 'var(--surface3)', border: '1px solid var(--border)', color: 'var(--text)', outline: 'none', boxSizing: 'border-box' }}
                                />
                                <span style={{ fontSize: 14, color: 'var(--text2)' }}>%</span>
                              </div>
                            ) : (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 15, fontWeight: 700, color: 'var(--text2)' }}>{sp.pct}%</span>
                                <span style={{ fontSize: 12, color: 'var(--text3)' }}>🔒</span>
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 0' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text2)' }}>Total</span>
                        <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 16, fontWeight: 800, color: totalOk ? 'var(--green)' : 'var(--red)' }}>{total.toFixed(1)}%</span>
                      </div>
                      {splitSaveError && <div style={{ color: 'var(--red)', fontSize: 12, marginBottom: 10 }}>{splitSaveError}</div>}
                      {splitSaveSuccess && <div style={{ color: 'var(--green)', fontSize: 13, fontWeight: 700, marginBottom: 10 }}>✓ Saved!</div>}
                      <div style={{ display: 'flex', gap: 8 }}>
                        <button onClick={saveSplitAllocation} style={{ padding: '9px 20px', borderRadius: 7, border: 'none', background: totalOk ? 'var(--orange)' : 'var(--surface3)', color: totalOk ? '#fff' : 'var(--text3)', fontWeight: 700, fontSize: 13, cursor: totalOk ? 'pointer' : 'default' }}>Save Allocation</button>
                        <button onClick={cancelAllocationEdit} style={{ padding: '9px 20px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
                      </div>
                    </>
                  );
                })()}
              </div>
            )}
          </div>
        )}

        {/* Tab bar */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
          {[['expenses','Expenses'],['recurring','Recurring']].map(([k, l]) => (
            <button key={k} onClick={() => setTab(k)} style={tabBtn(tab === k)}>{l}</button>
          ))}
        </div>

        {/* ── Tab: Expenses ── */}
        {tab === 'expenses' && (
          <>
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

            {visibleEntries.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text2)' }}>No expenses found.</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {visibleEntries.map(e => {
                  const a = acctByKey[e.account] || ACCTS[0];
                  const isEditing = editEntryId === e.id;
                  const isAutoSMS = !!(e.autoGenerated && (e.type === 'auto-sms' || e.vendor === 'AUTO — SMS'));

                  if (isEditing && !isAutoSMS) {
                    return (
                      <div key={e.id} style={{ background: 'var(--surface)', border: '1px solid var(--gold-border)', borderRadius: 10, padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 10 }}>
                          <div style={{ flex: 2, minWidth: 140 }}>
                            <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Vendor</div>
                            <input value={editEntryVendor} onChange={e => setEditEntryVendor(e.target.value)} style={{ ...inp, padding: '7px 10px' }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 100 }}>
                            <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>Amount</div>
                            <CurrIn value={editEntryAmount} onChange={setEditEntryAmount} />
                          </div>
                          <div style={{ flex: 1, minWidth: 130 }}>
                            <DatePicker value={editEntryDate} onChange={setEditEntryDate} placeholder="Date" />
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button onClick={() => setEditEntryId(null)} style={{ flex: 1, padding: '8px', borderRadius: 7, border: '1px solid var(--border)', background: 'transparent', color: 'var(--text2)', fontWeight: 600, cursor: 'pointer', fontSize: 13 }}>Cancel</button>
                          <button onClick={saveEditEntry} style={{ flex: 2, padding: '8px', borderRadius: 7, border: 'none', background: 'var(--orange)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>Save</button>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div key={e.id} style={{ background: 'var(--surface)', border: `1px solid ${isAutoSMS ? 'var(--cyan)33' : 'var(--border)'}`, borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: (isAutoSMS ? 'var(--cyan)' : a.color) + '22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: isAutoSMS ? 'var(--cyan)' : a.color, fontSize: 16, flexShrink: 0 }}>
                        {isAutoSMS ? '📨' : a.icon}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{e.vendor}</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          {isAutoSMS
                            ? <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 4, fontSize: 11, fontWeight: 700, background: 'var(--cyan)22', color: 'var(--cyan)', letterSpacing: '0.05em' }}>AUTO — SMS</span>
                            : <Badge label={a.label} color={a.color} />
                          }
                          {e.category && !isAutoSMS && <Badge label={e.category} color="var(--text2)" />}
                          {e.recurring && <Badge label={e.frequency || 'Recurring'} color="var(--purple)" />}
                          <span style={{ fontSize: 11, color: 'var(--text2)' }}>{fmtDate(e.date)}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontFamily: 'JetBrains Mono,monospace', fontWeight: 700, fontSize: 15, color: 'var(--red)' }}>-{fmt(e.amount)}</div>
                        <div style={{ fontSize: 11, color: 'var(--text2)' }}>{e.loggedBy}</div>
                      </div>
                      {!isAutoSMS && (
                        <>
                          <button onClick={() => openEditEntry(e)} style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: 15, cursor: 'pointer', padding: '4px 6px', borderRadius: 4 }} title="Edit">✎</button>
                          <button onClick={() => deleteEntry(e.id)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 16, cursor: 'pointer', padding: '4px 6px', borderRadius: 4 }} title="Delete">✕</button>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
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
                  const isActive = r.active !== false;
                  return (
                    <div key={r.id} style={{ background: 'var(--surface)', border: `1px solid ${isActive ? 'var(--border)' : 'var(--border2)'}`, borderRadius: 10, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 14, opacity: isActive ? 1 : 0.65 }}>
                      <div style={{ width: 36, height: 36, borderRadius: 8, background: 'var(--purple)22', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--purple)', fontSize: 16, flexShrink: 0 }}>↺</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 3 }}>{r.vendor}</div>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                          <Badge label={a.label} color={a.color} />
                          <Badge label={r.frequency || 'Monthly'} color="var(--purple)" />
                          {r.category && <Badge label={r.category} color="var(--text2)" />}
                          {!isActive && <Badge label="STOPPED" color="var(--red)" />}
                          <span style={{ fontSize: 11, color: 'var(--text2)' }}>Since {fmtDate(r.startDate)}</span>
                        </div>
                      </div>
                      <div style={{ fontFamily: 'JetBrains Mono,monospace', fontWeight: 700, fontSize: 15, color: 'var(--purple)' }}>{fmt(r.amount)}</div>
                      <div style={{ display: 'flex', gap: 6, flexShrink: 0, flexWrap: 'wrap' }}>
                        <button onClick={() => openEditRecurring(r)} style={{ background: 'none', border: '1px solid var(--border)', color: 'var(--text2)', fontSize: 11, padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}>Edit</button>
                        {isActive
                          ? <button onClick={() => stopRecurring(r)} style={{ background: 'none', border: '1px solid var(--orange-border)', color: 'var(--orange)', fontSize: 11, padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}>Stop</button>
                          : <button onClick={() => resumeRecurring(r)} style={{ background: 'none', border: '1px solid var(--green-border)', color: 'var(--green)', fontSize: 11, padding: '4px 8px', borderRadius: 4, cursor: 'pointer' }}>Resume</button>
                        }
                        <button onClick={() => deleteRecurring(r)} style={{ background: 'none', border: 'none', color: 'var(--red)', fontSize: 14, cursor: 'pointer', padding: '4px 6px', borderRadius: 4 }}>✕</button>
                      </div>
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
