'use client';
import { useState, useEffect, useMemo, useCallback } from 'react';

// ─── Design tokens ────────────────────────────────────────────────────────────
const C = {
  bg:     'var(--background)',
  sf:     'var(--surface)',
  s2:     'var(--surface-2)',
  s3:     'var(--surface-3)',
  bd:     'var(--border)',
  bd2:    'var(--border-2)',
  tx:     'var(--text)',
  t2:     'var(--text-2)',
  t3:     'var(--text-3)',
  gold:   'var(--gold)',
  green:  'var(--green)',
  red:    'var(--red)',
  cyan:   'var(--cyan)',
  purple: 'var(--purple)',
  orange: 'var(--orange)',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────
function safeDiv(a, b) { return b && b !== 0 ? a / b : 0; }
function safePct(a, b) { const v = safeDiv(a, b) * 100; return isFinite(v) ? v : 0; }
function fmtPct(a, b)  { return safePct(a, b).toFixed(1) + '%'; }
function fmtCost(n)    { return '$' + (Number(n) || 0).toFixed(2); }
function safeNum(v)    { const n = Number(v); return isFinite(n) ? n : 0; }
function today()       { return new Date().toISOString().slice(0, 10); }
function fmtDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${months[parseInt(m,10)-1]} ${parseInt(day,10)}, ${y}`;
}
function getWeekStart(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  const dow = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - dow);
  return d.toISOString().slice(0, 10);
}

const PACE_START = '2026-04-25';
const PACE_END   = '2026-07-25';
const PACE_GOAL  = 6;

function paceInfo(contracts) {
  const now   = new Date();
  const start = new Date(PACE_START);
  const end   = new Date(PACE_END);
  const totalDays   = Math.round((end - start) / 86400000);
  const daysElapsed = Math.max(0, Math.round((now - start) / 86400000));
  const daysLeft    = Math.max(0, Math.round((end - now) / 86400000));
  const expectedNow = safeDiv(daysElapsed, totalDays) * PACE_GOAL;
  const pace        = contracts >= expectedNow ? 'on' : 'behind';
  const pct         = Math.min(100, safePct(daysElapsed, totalDays));
  return { totalDays, daysElapsed, daysLeft, expectedNow, pace, pct };
}

// ─── StatCard ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, color }) {
  return (
    <div style={{
      background: C.sf, border: `1px solid ${C.bd}`,
      borderLeft: `3px solid ${color || C.bd}`,
      borderRadius: 10, padding: '14px 18px', minWidth: 0,
    }}>
      <div style={{ fontSize: 11, color: C.t3, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 4 }}>{label}</div>
      <div style={{ fontSize: 26, fontFamily: 'JetBrains Mono, monospace', fontWeight: 700, color: color || C.tx }}>{value}</div>
    </div>
  );
}

// ─── WipeGate ─────────────────────────────────────────────────────────────────
function WipeGate({ onDone }) {
  const [loading, setLoading] = useState(false);
  const [err, setErr]         = useState('');

  async function doWipe() {
    setLoading(true); setErr('');
    try {
      const r = await fetch('/api/kpi/wipe', { method: 'POST' });
      if (!r.ok) throw new Error('Wipe failed');
      onDone();
    } catch (e) { setErr(e.message); }
    finally { setLoading(false); }
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: C.sf, border: `1px solid ${C.bd}`, borderRadius: 14, padding: 36, maxWidth: 440, width: '90%', textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: C.tx, marginBottom: 10 }}>Initialize KPI Tracker</div>
        <div style={{ fontSize: 14, color: C.t2, marginBottom: 24, lineHeight: 1.6 }}>
          This will clear all existing KPI data and set up the new data model. This action cannot be undone.
        </div>
        {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 12 }}>{err}</div>}
        <button onClick={doWipe} disabled={loading} style={{
          background: C.red, color: '#fff', border: 'none', borderRadius: 8,
          padding: '14px 32px', fontSize: 15, fontWeight: 600, cursor: 'pointer', minHeight: 48,
        }}>
          {loading ? 'Wiping…' : 'Clear & Initialize'}
        </button>
      </div>
    </div>
  );
}

// ─── TabBar ───────────────────────────────────────────────────────────────────
function TabBar({ tabs, active, onChange }) {
  return (
    <div style={{ display: 'flex', gap: 4, borderBottom: `1px solid ${C.bd}`, marginBottom: 24, overflowX: 'auto', flexShrink: 0 }}>
      {tabs.map(t => (
        <button key={t.id} onClick={() => onChange(t.id)} style={{
          background: 'none', border: 'none',
          borderBottom: active === t.id ? `2px solid ${C.gold}` : '2px solid transparent',
          color: active === t.id ? C.gold : C.t2,
          fontSize: 14, fontWeight: 600, padding: '10px 16px',
          cursor: 'pointer', whiteSpace: 'nowrap', minHeight: 42,
        }}>{t.label}</button>
      ))}
    </div>
  );
}

// ─── Today Strip ──────────────────────────────────────────────────────────────
function TodayStrip({ wcl, sms, outreach }) {
  const todayStr = today();
  const wToday = wcl.filter(e => e.date === todayStr);
  const sToday = sms.filter(e => e.date === todayStr);
  const oToday = outreach.filter(e => e.date === todayStr);

  const wclReceived      = wToday.reduce((s, e) => s + safeNum(e.received), 0);
  const wclConversations = wToday.reduce((s, e) => s + safeNum(e.conversations), 0);
  const smsConversations = sToday.reduce((s, e) => s + safeNum(e.conversations), 0);
  const outContacts      = oToday.reduce((s, e) => s + safeNum(e.contacts), 0);

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10,
      background: C.s2, border: `1px solid ${C.bd}`, borderRadius: 10,
      padding: '12px 16px', marginBottom: 20,
    }}>
      {[
        { label: 'WCL Leads Today',     value: wclReceived,      color: C.gold   },
        { label: 'WCL Convos Today',    value: wclConversations, color: C.gold   },
        { label: 'SMS Convos Today',    value: smsConversations, color: C.purple },
        { label: 'Outreach Sent Today', value: outContacts,      color: C.cyan   },
      ].map(item => (
        <div key={item.label} style={{ textAlign: 'center' }}>
          <div style={{ fontSize: 22, fontFamily: 'JetBrains Mono,monospace', fontWeight: 700, color: item.color }}>{item.value}</div>
          <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>{item.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── CAMPAIGNS TAB ────────────────────────────────────────────────────────────
function CampaignsTab({ campaigns, outreach, sms, onRefresh }) {
  const [showForm, setShowForm]       = useState(false);
  const [form, setForm]               = useState({ name: '', counties: '', startDate: today(), status: 'active' });
  const [saving, setSaving]           = useState(false);
  const [err, setErr]                 = useState('');
  const [deleteModal, setDeleteModal] = useState(null);
  const [deleteInput, setDeleteInput] = useState('');
  const [deleting, setDeleting]       = useState(false);

  function fv(k, v) { setForm(f => ({ ...f, [k]: v })); }

  async function submit(e) {
    e.preventDefault(); setSaving(true); setErr('');
    const counties = form.counties.split(',').map(s => s.trim()).filter(Boolean);
    try {
      const r = await fetch('/api/kpi/campaigns', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: form.name.trim(), counties, startDate: form.startDate, status: form.status }),
      });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Failed'); }
      setForm({ name: '', counties: '', startDate: today(), status: 'active' });
      setShowForm(false); onRefresh();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  }

  async function doDelete() {
    if (!deleteModal) return;
    setDeleting(true);
    try {
      const r = await fetch(`/api/kpi/campaigns/${deleteModal.id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error('Delete failed');
      setDeleteModal(null); setDeleteInput(''); onRefresh();
    } catch (e) { alert(e.message); }
    finally { setDeleting(false); }
  }

  async function toggleStatus(c) {
    const newStatus = c.status === 'active' ? 'closed' : 'active';
    await fetch(`/api/kpi/campaigns/${c.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    });
    onRefresh();
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.tx }}>Campaigns ({campaigns.length})</div>
        <button onClick={() => setShowForm(!showForm)} style={{
          background: C.gold, color: '#000', border: 'none', borderRadius: 8,
          padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 46,
        }}>+ New Campaign</button>
      </div>

      {showForm && (
        <form onSubmit={submit} style={{
          background: C.s2, border: `1px solid ${C.bd}`, borderRadius: 10, padding: 20, marginBottom: 20,
        }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: C.t2, display: 'block', marginBottom: 4 }}>Campaign Name *</label>
              <input value={form.name} onChange={e => fv('name', e.target.value)} required placeholder="e.g. Spring 2026"
                style={{ width: '100%', background: C.s3, border: `1px solid ${C.bd}`, borderRadius: 6, padding: '10px 12px', color: C.tx, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.t2, display: 'block', marginBottom: 4 }}>Start Date</label>
              <input type="text" inputMode="numeric" value={form.startDate} onChange={e => fv('startDate', e.target.value)} placeholder="YYYY-MM-DD"
                style={{ width: '100%', background: C.s3, border: `1px solid ${C.bd}`, borderRadius: 6, padding: '10px 12px', color: C.tx, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: 12, color: C.t2, display: 'block', marginBottom: 4 }}>Counties (comma-separated)</label>
              <input value={form.counties} onChange={e => fv('counties', e.target.value)} placeholder="e.g. Orange, Los Angeles, San Bernardino"
                style={{ width: '100%', background: C.s3, border: `1px solid ${C.bd}`, borderRadius: 6, padding: '10px 12px', color: C.tx, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
          </div>
          {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 10 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={saving} style={{
              background: C.green, color: '#000', border: 'none', borderRadius: 8,
              padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 46,
            }}>{saving ? 'Saving…' : 'Create Campaign'}</button>
            <button type="button" onClick={() => { setShowForm(false); setErr(''); }} style={{
              background: C.s3, color: C.t2, border: `1px solid ${C.bd}`, borderRadius: 8,
              padding: '10px 20px', fontSize: 14, cursor: 'pointer', minHeight: 46,
            }}>Cancel</button>
          </div>
        </form>
      )}

      {campaigns.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: C.t3 }}>No campaigns yet. Create your first one above.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {campaigns.map(c => {
          const cOut = outreach.filter(o => o.campaignId === c.id);
          const cSms = sms.filter(s => s.campaignId === c.id);
          const totalContacts        = cOut.reduce((s, o) => s + safeNum(o.contacts), 0);
          const totalPositiveReplies = cOut.reduce((s, o) => s + safeNum(o.positiveReplies), 0);
          const totalConversations   = cSms.reduce((s, e) => s + safeNum(e.conversations), 0);
          const totalContracts       = cSms.reduce((s, e) => s + safeNum(e.contracts), 0);
          const totalCost            = cOut.reduce((s, o) => s + safeNum(o.cost), 0);

          return (
            <div key={c.id} style={{
              background: C.sf, border: `1px solid ${C.bd}`,
              borderLeft: `3px solid ${c.status === 'active' ? C.green : C.t3}`,
              borderRadius: 10, padding: 18,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: C.tx }}>{c.name}</div>
                  <div style={{ fontSize: 12, color: C.t3, marginTop: 2, fontFamily: 'JetBrains Mono,monospace' }}>
                    Started {fmtDate(c.startDate)} · {c.counties?.join(', ') || 'No counties'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
                  <span style={{
                    background: c.status === 'active' ? 'rgba(0,200,100,0.15)' : 'rgba(150,150,150,0.15)',
                    color: c.status === 'active' ? C.green : C.t3,
                    borderRadius: 6, padding: '4px 10px', fontSize: 12, fontWeight: 600,
                  }}>{c.status}</span>
                  <button onClick={() => toggleStatus(c)} style={{
                    background: C.s2, color: C.t2, border: `1px solid ${C.bd}`, borderRadius: 6,
                    padding: '6px 12px', fontSize: 12, cursor: 'pointer', minHeight: 34,
                  }}>{c.status === 'active' ? 'Close' : 'Reopen'}</button>
                  <button onClick={() => { setDeleteModal(c); setDeleteInput(''); }} style={{
                    background: 'none', color: C.red, border: `1px solid ${C.red}`, borderRadius: 6,
                    padding: '6px 12px', fontSize: 12, cursor: 'pointer', minHeight: 34,
                  }}>Delete</button>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: 10, marginTop: 14 }}>
                {[
                  { label: 'Contacts',   value: totalContacts.toLocaleString(),        color: C.cyan   },
                  { label: '+Replies',   value: totalPositiveReplies.toLocaleString(),  color: C.green  },
                  { label: 'Convos',     value: totalConversations.toLocaleString(),    color: C.purple },
                  { label: 'Contracts',  value: totalContracts.toLocaleString(),        color: C.gold   },
                  { label: 'Cost',       value: fmtCost(totalCost),                    color: C.orange },
                ].map(st => (
                  <div key={st.label} style={{ background: C.s2, borderRadius: 8, padding: '10px 12px', textAlign: 'center' }}>
                    <div style={{ fontSize: 18, fontFamily: 'JetBrains Mono,monospace', fontWeight: 700, color: st.color }}>{st.value}</div>
                    <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>{st.label}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {deleteModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div style={{ background: C.sf, border: `1px solid ${C.bd}`, borderRadius: 14, padding: 32, maxWidth: 420, width: '90%' }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: C.tx, marginBottom: 10 }}>Delete Campaign</div>
            <div style={{ fontSize: 14, color: C.t2, marginBottom: 16, lineHeight: 1.6 }}>
              Permanently delete <strong style={{ color: C.tx }}>{deleteModal.name}</strong> and remove all linked outreach. Pipeline entries will be unlinked.
            </div>
            <div style={{ fontSize: 13, color: C.t2, marginBottom: 8 }}>Type the campaign name to confirm:</div>
            <input value={deleteInput} onChange={e => setDeleteInput(e.target.value)} placeholder={deleteModal.name}
              style={{ width: '100%', background: C.s3, border: `1px solid ${C.bd}`, borderRadius: 6, padding: '10px 12px', color: C.tx, fontSize: 14, boxSizing: 'border-box', marginBottom: 16 }} />
            <div style={{ display: 'flex', gap: 10 }}>
              <button onClick={doDelete} disabled={deleteInput !== deleteModal.name || deleting} style={{
                background: deleteInput === deleteModal.name ? C.red : C.s3,
                color: deleteInput === deleteModal.name ? '#fff' : C.t3,
                border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 14, fontWeight: 600,
                cursor: deleteInput === deleteModal.name ? 'pointer' : 'not-allowed', minHeight: 46,
              }}>{deleting ? 'Deleting…' : 'Delete'}</button>
              <button onClick={() => { setDeleteModal(null); setDeleteInput(''); }} style={{
                background: C.s2, color: C.t2, border: `1px solid ${C.bd}`, borderRadius: 8,
                padding: '10px 20px', fontSize: 14, cursor: 'pointer', minHeight: 46,
              }}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── OUTREACH TAB ─────────────────────────────────────────────────────────────
function OutreachTab({ outreach, campaigns, settings, onRefresh }) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ listName: '', county: '', campaignId: '', contacts: '', totalReplies: '', positiveReplies: '', date: today(), status: 'active' });
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState('');
  const [editId, setEditId]     = useState(null);

  const floor      = safeNum(settings.positiveReplyFloor) || 1.0;
  const minForDiag = safeNum(settings.minPositiveRepliesForDiag) || 10;

  function fv(k, v) { setForm(f => ({ ...f, [k]: v })); }

  function startEdit(o) {
    setEditId(o.id);
    setForm({
      listName: o.listName || '', county: o.county || '', campaignId: o.campaignId || '',
      contacts: String(o.contacts || 0), totalReplies: String(o.totalReplies || 0),
      positiveReplies: String(o.positiveReplies || 0), date: o.date || today(), status: o.status || 'active',
    });
    setShowForm(true);
  }

  async function submit(e) {
    e.preventDefault(); setSaving(true); setErr('');
    const payload = {
      listName: form.listName.trim(), county: form.county.trim(),
      campaignId: form.campaignId || null,
      contacts: safeNum(form.contacts), totalReplies: safeNum(form.totalReplies),
      positiveReplies: safeNum(form.positiveReplies), date: form.date.trim(), status: form.status,
    };
    try {
      const url    = editId ? `/api/kpi/outreach/${editId}` : '/api/kpi/outreach';
      const method = editId ? 'PUT' : 'POST';
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Failed'); }
      setForm({ listName: '', county: '', campaignId: '', contacts: '', totalReplies: '', positiveReplies: '', date: today(), status: 'active' });
      setShowForm(false); setEditId(null); onRefresh();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  }

  async function doDelete(id) {
    if (!confirm('Delete this outreach entry?')) return;
    await fetch(`/api/kpi/outreach/${id}`, { method: 'DELETE' });
    onRefresh();
  }

  function diagBadge(o) {
    const pct = safePct(safeNum(o.positiveReplies), safeNum(o.contacts));
    const hasEnough = safeNum(o.positiveReplies) >= minForDiag;
    if (!hasEnough) return (
      <span style={{ fontSize: 11, color: C.t3, background: C.s2, borderRadius: 4, padding: '2px 6px' }}>needs data</span>
    );
    const ok = pct >= floor;
    return (
      <span style={{
        fontSize: 11, fontWeight: 600,
        background: ok ? 'rgba(0,200,100,0.15)' : 'rgba(220,50,50,0.15)',
        color: ok ? C.green : C.red, borderRadius: 4, padding: '2px 6px',
      }}>{pct.toFixed(1)}% {ok ? '✓' : '↓'}</span>
    );
  }

  const totalContacts = outreach.reduce((s, o) => s + safeNum(o.contacts), 0);
  const totalCost     = outreach.reduce((s, o) => s + safeNum(o.cost), 0);
  const totalPos      = outreach.reduce((s, o) => s + safeNum(o.positiveReplies), 0);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: C.tx }}>Outreach Lists ({outreach.length})</div>
        <button onClick={() => {
          setShowForm(!showForm); setEditId(null); setErr('');
          setForm({ listName: '', county: '', campaignId: '', contacts: '', totalReplies: '', positiveReplies: '', date: today(), status: 'active' });
        }} style={{
          background: C.cyan, color: '#000', border: 'none', borderRadius: 8,
          padding: '10px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 46,
        }}>+ Log Outreach</button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
        <StatCard label="Total Contacts" value={totalContacts.toLocaleString()} color={C.cyan} />
        <StatCard label="Positive Replies" value={totalPos.toLocaleString()} color={C.green} />
        <StatCard label="Total Cost" value={fmtCost(totalCost)} color={C.orange} />
      </div>

      {showForm && (
        <form onSubmit={submit} style={{ background: C.s2, border: `1px solid ${C.bd}`, borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.tx, marginBottom: 14 }}>{editId ? 'Edit Outreach Entry' : 'Log New Outreach'}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: C.t2, display: 'block', marginBottom: 4 }}>List Name *</label>
              <input value={form.listName} onChange={e => fv('listName', e.target.value)} required placeholder="e.g. Pre-Foreclosure Q2"
                style={{ width: '100%', background: C.s3, border: `1px solid ${C.bd}`, borderRadius: 6, padding: '10px 12px', color: C.tx, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.t2, display: 'block', marginBottom: 4 }}>County</label>
              <input value={form.county} onChange={e => fv('county', e.target.value)} placeholder="e.g. Orange"
                style={{ width: '100%', background: C.s3, border: `1px solid ${C.bd}`, borderRadius: 6, padding: '10px 12px', color: C.tx, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.t2, display: 'block', marginBottom: 4 }}>Campaign</label>
              <select value={form.campaignId} onChange={e => fv('campaignId', e.target.value)}
                style={{ width: '100%', background: C.s3, border: `1px solid ${C.bd}`, borderRadius: 6, padding: '10px 12px', color: C.tx, fontSize: 14, boxSizing: 'border-box' }}>
                <option value="">None</option>
                {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 12, color: C.t2, display: 'block', marginBottom: 4 }}>Date</label>
              <input type="text" inputMode="numeric" value={form.date} onChange={e => fv('date', e.target.value)} placeholder="YYYY-MM-DD"
                style={{ width: '100%', background: C.s3, border: `1px solid ${C.bd}`, borderRadius: 6, padding: '10px 12px', color: C.tx, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            {[
              { label: 'Contacts Sent', key: 'contacts' },
              { label: 'Total Replies', key: 'totalReplies' },
              { label: 'Positive Replies', key: 'positiveReplies' },
            ].map(f => (
              <div key={f.key}>
                <label style={{ fontSize: 12, color: C.t2, display: 'block', marginBottom: 4 }}>{f.label}</label>
                <input type="text" inputMode="numeric" value={form[f.key]} onChange={e => fv(f.key, e.target.value)} placeholder="0"
                  style={{ width: '100%', background: C.s3, border: `1px solid ${C.bd}`, borderRadius: 6, padding: '10px 12px', color: C.tx, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
            ))}
            <div>
              <label style={{ fontSize: 12, color: C.t2, display: 'block', marginBottom: 4 }}>Auto Cost</label>
              <div style={{ padding: '10px 12px', background: C.s3, border: `1px solid ${C.bd}`, borderRadius: 6, color: C.t2, fontSize: 14, fontFamily: 'JetBrains Mono,monospace' }}>
                {fmtCost((safeNum(form.contacts) || 0) * (safeNum(settings.smsCostPerText) || 0.04))}
              </div>
            </div>
          </div>
          {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 10 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={saving} style={{
              background: C.cyan, color: '#000', border: 'none', borderRadius: 8,
              padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 46,
            }}>{saving ? 'Saving…' : (editId ? 'Update' : 'Save')}</button>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); setErr(''); }} style={{
              background: C.s3, color: C.t2, border: `1px solid ${C.bd}`, borderRadius: 8,
              padding: '10px 20px', fontSize: 14, cursor: 'pointer', minHeight: 46,
            }}>Cancel</button>
          </div>
        </form>
      )}

      {outreach.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: C.t3 }}>No outreach entries yet.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {outreach.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(o => {
          const camp = campaigns.find(c => c.id === o.campaignId);
          return (
            <div key={o.id} style={{
              background: C.sf, border: `1px solid ${C.bd}`, borderLeft: `3px solid ${C.cyan}`,
              borderRadius: 10, padding: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 8 }}>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 600, color: C.tx }}>{o.listName || '—'}</div>
                  <div style={{ fontSize: 12, color: C.t3, marginTop: 2, fontFamily: 'JetBrains Mono,monospace' }}>
                    {o.county && `${o.county} · `}{fmtDate(o.date)}{camp ? ` · ${camp.name}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  {diagBadge(o)}
                  <button onClick={() => startEdit(o)} style={{
                    background: C.s2, color: C.t2, border: `1px solid ${C.bd}`, borderRadius: 6,
                    padding: '5px 12px', fontSize: 12, cursor: 'pointer', minHeight: 32,
                  }}>Edit</button>
                  <button onClick={() => doDelete(o.id)} style={{
                    background: 'none', color: C.red, border: `1px solid ${C.red}`, borderRadius: 6,
                    padding: '5px 12px', fontSize: 12, cursor: 'pointer', minHeight: 32,
                  }}>Delete</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 16, marginTop: 12, flexWrap: 'wrap' }}>
                {[
                  { label: 'Contacts',     value: safeNum(o.contacts).toLocaleString(),        color: C.cyan   },
                  { label: 'Total Replies',value: safeNum(o.totalReplies).toLocaleString(),     color: C.t2     },
                  { label: 'Positive',     value: safeNum(o.positiveReplies).toLocaleString(), color: C.green  },
                  { label: 'Reply %',      value: fmtPct(o.positiveReplies, o.contacts),       color: C.green  },
                  { label: 'Cost',         value: fmtCost(o.cost),                             color: C.orange },
                ].map(st => (
                  <div key={st.label} style={{ textAlign: 'center', minWidth: 60 }}>
                    <div style={{ fontSize: 16, fontFamily: 'JetBrains Mono,monospace', fontWeight: 700, color: st.color }}>{st.value}</div>
                    <div style={{ fontSize: 11, color: C.t3 }}>{st.label}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── 14-day calendar strip ────────────────────────────────────────────────────
function CalendarStrip({ entries, accentColor }) {
  const days = useMemo(() => {
    const arr = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const ds = d.toISOString().slice(0, 10);
      const has = entries.some(e => e.date === ds);
      arr.push({ ds, has, label: d.getDate(), isToday: i === 0 });
    }
    return arr;
  }, [entries]);

  return (
    <div style={{ display: 'flex', gap: 4, overflowX: 'auto', paddingBottom: 4, marginBottom: 16 }}>
      {days.map(d => (
        <div key={d.ds} style={{
          minWidth: 34, height: 42, borderRadius: 6, border: `1px solid ${d.isToday ? accentColor : C.bd}`,
          background: d.has ? accentColor + '22' : C.s2,
          color: d.isToday ? accentColor : (d.has ? accentColor : C.t3),
          fontSize: 12, fontWeight: d.isToday ? 700 : 400,
          flexShrink: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 2,
        }}>
          <span>{d.label}</span>
          {d.has && <span style={{ width: 4, height: 4, borderRadius: '50%', background: accentColor, display: 'block' }} />}
        </div>
      ))}
    </div>
  );
}

// ─── PIPELINE TAB ─────────────────────────────────────────────────────────────
function PipelineTab({ wcl, sms, campaigns, settings, onRefresh }) {
  const [subTab, setSubTab]     = useState('wcl');
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState(null);
  const [form, setForm]         = useState({});
  const [saving, setSaving]     = useState(false);
  const [err, setErr]           = useState('');

  function fv(k, v) { setForm(f => ({ ...f, [k]: v })); }

  const wclFields = ['received', 'optouts', 'conversations', 'qualified', 'offers', 'responses', 'contracts', 'closed'];
  const smsFields = ['conversations', 'optouts', 'wrongNumbers', 'qualified', 'offers', 'responses', 'contracts', 'closed'];
  const FIELD_LABELS = { optouts: 'Opt-Outs', wrongNumbers: 'Wrong Numbers' };
  function fieldLabel(f) { return FIELD_LABELS[f] || f; }

  function blankForm(type) {
    const fields = type === 'wcl' ? wclFields : smsFields;
    const base = { date: today(), campaignId: '' };
    fields.forEach(f => { base[f] = '0'; });
    return base;
  }

  function startEdit(entry, type) {
    setSubTab(type); setEditId(entry.id);
    const fields = type === 'wcl' ? wclFields : smsFields;
    const f = { date: entry.date || today(), campaignId: entry.campaignId || '' };
    fields.forEach(fk => { f[fk] = String(entry[fk] || 0); });
    setForm(f); setShowForm(true);
  }

  async function submit(e) {
    e.preventDefault(); setSaving(true); setErr('');
    const fields  = subTab === 'wcl' ? wclFields : smsFields;
    const payload = { date: (form.date || '').trim(), campaignId: form.campaignId || null };
    fields.forEach(fk => { payload[fk] = safeNum(form[fk]); });
    try {
      const base   = subTab === 'wcl' ? '/api/kpi/wcl' : '/api/kpi/sms';
      const url    = editId ? `${base}/${editId}` : base;
      const method = editId ? 'PUT' : 'POST';
      const r = await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (!r.ok) { const d = await r.json(); throw new Error(d.error || 'Failed'); }
      setForm(blankForm(subTab)); setShowForm(false); setEditId(null); onRefresh();
    } catch (e) { setErr(e.message); }
    finally { setSaving(false); }
  }

  async function doDelete(id, type) {
    if (!confirm('Delete this entry?')) return;
    await fetch(`/api/kpi/${type}/${id}`, { method: 'DELETE' });
    onRefresh();
  }

  const activeEntries = subTab === 'wcl' ? wcl : sms;
  const accentColor   = subTab === 'wcl' ? C.gold : C.purple;
  const fields        = subTab === 'wcl' ? wclFields : smsFields;

  const totals = useMemo(() => {
    const t = {};
    fields.forEach(f => { t[f] = activeEntries.reduce((s, e) => s + safeNum(e[f]), 0); });
    return t;
  }, [activeEntries, fields]);

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        {[{ id: 'wcl', label: 'WCL Pipeline' }, { id: 'sms', label: 'SMS Pipeline' }].map(t => (
          <button key={t.id} onClick={() => { setSubTab(t.id); setShowForm(false); setEditId(null); setForm(blankForm(t.id)); }} style={{
            background: subTab === t.id ? (t.id === 'wcl' ? C.gold : C.purple) + '22' : 'none',
            color: subTab === t.id ? (t.id === 'wcl' ? C.gold : C.purple) : C.t2,
            border: `1px solid ${subTab === t.id ? (t.id === 'wcl' ? C.gold : C.purple) : C.bd}`,
            borderRadius: 8, padding: '8px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 40,
          }}>{t.label}</button>
        ))}
        <button onClick={() => { setShowForm(!showForm); setEditId(null); setForm(blankForm(subTab)); setErr(''); }} style={{
          background: accentColor, color: '#000', border: 'none', borderRadius: 8,
          padding: '8px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 40, marginLeft: 'auto',
        }}>+ Log Entry</button>
      </div>

      <CalendarStrip entries={activeEntries} accentColor={accentColor} />

      <div style={{ display: 'grid', gridTemplateColumns: `repeat(${fields.length},1fr)`, gap: 8, marginBottom: 20 }}>
        {fields.map(f => (
          <div key={f} style={{ background: C.s2, border: `1px solid ${C.bd}`, borderRadius: 8, padding: '10px 8px', textAlign: 'center' }}>
            <div style={{ fontSize: 18, fontFamily: 'JetBrains Mono,monospace', fontWeight: 700, color: accentColor }}>{(totals[f] || 0).toLocaleString()}</div>
            <div style={{ fontSize: 10, color: C.t3, textTransform: 'capitalize', marginTop: 2 }}>{fieldLabel(f)}</div>
          </div>
        ))}
      </div>

      {showForm && (
        <form onSubmit={submit} style={{ background: C.s2, border: `1px solid ${C.bd}`, borderRadius: 10, padding: 20, marginBottom: 20 }}>
          <div style={{ fontSize: 14, fontWeight: 600, color: C.tx, marginBottom: 14 }}>{editId ? 'Edit Entry' : `Log ${subTab.toUpperCase()} Entry`}</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div>
              <label style={{ fontSize: 12, color: C.t2, display: 'block', marginBottom: 4 }}>Date</label>
              <input type="text" inputMode="numeric" value={form.date || ''} onChange={e => fv('date', e.target.value)} placeholder="YYYY-MM-DD"
                style={{ width: '100%', background: C.s3, border: `1px solid ${C.bd}`, borderRadius: 6, padding: '10px 12px', color: C.tx, fontSize: 14, boxSizing: 'border-box' }} />
            </div>
            {subTab === 'sms' && (
              <div>
                <label style={{ fontSize: 12, color: C.t2, display: 'block', marginBottom: 4 }}>Campaign</label>
                <select value={form.campaignId || ''} onChange={e => fv('campaignId', e.target.value)}
                  style={{ width: '100%', background: C.s3, border: `1px solid ${C.bd}`, borderRadius: 6, padding: '10px 12px', color: C.tx, fontSize: 14, boxSizing: 'border-box' }}>
                  <option value="">None</option>
                  {campaigns.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
            )}
            {fields.map(f => (
              <div key={f}>
                <label style={{ fontSize: 12, color: C.t2, display: 'block', marginBottom: 4, textTransform: 'capitalize' }}>{fieldLabel(f)}</label>
                <input type="text" inputMode="numeric" pattern="[0-9]*" value={form[f] || '0'} onChange={e => fv(f, e.target.value)}
                  style={{ width: '100%', background: C.s3, border: `1px solid ${C.bd}`, borderRadius: 6, padding: '10px 12px', color: C.tx, fontSize: 14, boxSizing: 'border-box' }} />
              </div>
            ))}
          </div>
          {err && <div style={{ color: C.red, fontSize: 13, marginBottom: 10 }}>{err}</div>}
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="submit" disabled={saving} style={{
              background: accentColor, color: '#000', border: 'none', borderRadius: 8,
              padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer', minHeight: 46,
            }}>{saving ? 'Saving…' : (editId ? 'Update' : 'Save')}</button>
            <button type="button" onClick={() => { setShowForm(false); setEditId(null); setErr(''); }} style={{
              background: C.s3, color: C.t2, border: `1px solid ${C.bd}`, borderRadius: 8,
              padding: '10px 20px', fontSize: 14, cursor: 'pointer', minHeight: 46,
            }}>Cancel</button>
          </div>
        </form>
      )}

      {activeEntries.length === 0 && (
        <div style={{ textAlign: 'center', padding: '48px 0', color: C.t3 }}>No {subTab.toUpperCase()} entries yet.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {activeEntries.slice().sort((a, b) => (b.date || '').localeCompare(a.date || '')).map(e => {
          const camp = campaigns.find(c => c.id === e.campaignId);
          return (
            <div key={e.id} style={{
              background: C.sf, border: `1px solid ${C.bd}`, borderLeft: `3px solid ${accentColor}`,
              borderRadius: 10, padding: 16,
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 14, color: accentColor, fontWeight: 600 }}>{fmtDate(e.date)}</span>
                  {camp && <span style={{ fontSize: 12, color: C.t3, marginLeft: 8 }}>· {camp.name}</span>}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button onClick={() => startEdit(e, subTab)} style={{
                    background: C.s2, color: C.t2, border: `1px solid ${C.bd}`, borderRadius: 6,
                    padding: '5px 12px', fontSize: 12, cursor: 'pointer', minHeight: 32,
                  }}>Edit</button>
                  <button onClick={() => doDelete(e.id, subTab)} style={{
                    background: 'none', color: C.red, border: `1px solid ${C.red}`, borderRadius: 6,
                    padding: '5px 12px', fontSize: 12, cursor: 'pointer', minHeight: 32,
                  }}>Delete</button>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                {fields.map(f => (
                  <div key={f} style={{ textAlign: 'center', minWidth: 54 }}>
                    <div style={{ fontSize: 16, fontFamily: 'JetBrains Mono,monospace', fontWeight: 700, color: safeNum(e[f]) > 0 ? accentColor : C.t3 }}>{safeNum(e[f])}</div>
                    <div style={{ fontSize: 10, color: C.t3, textTransform: 'capitalize' }}>{fieldLabel(f)}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── COMBINED TAB ─────────────────────────────────────────────────────────────
function CombinedTab({ wcl, sms, outreach, settings }) {
  const wclContracts   = wcl.reduce((s, e) => s + safeNum(e.contracts), 0);
  const smsContracts   = sms.reduce((s, e) => s + safeNum(e.contracts), 0);
  const totalContracts = wclContracts + smsContracts;
  const wclClosed      = wcl.reduce((s, e) => s + safeNum(e.closed), 0);
  const smsClosed      = sms.reduce((s, e) => s + safeNum(e.closed), 0);
  const wclOffers      = wcl.reduce((s, e) => s + safeNum(e.offers), 0);
  const smsOffers      = sms.reduce((s, e) => s + safeNum(e.offers), 0);
  const totalOffers    = wclOffers + smsOffers;
  const totalClosed    = wclClosed + smsClosed;
  const totalCost      = outreach.reduce((s, o) => s + safeNum(o.cost), 0) +
                         wcl.length * safeNum(settings.wclCost);

  const pace = paceInfo(totalContracts);

  const weeks = useMemo(() => {
    const map = {};
    [...wcl, ...sms].forEach(e => {
      if (!e.date) return;
      const ws = getWeekStart(e.date);
      if (!map[ws]) map[ws] = { contracts: 0, offers: 0, closed: 0 };
      map[ws].contracts += safeNum(e.contracts);
      map[ws].offers    += safeNum(e.offers);
      map[ws].closed    += safeNum(e.closed);
    });
    return Object.entries(map).sort((a, b) => a[0].localeCompare(b[0])).slice(-8);
  }, [wcl, sms]);

  const maxContracts = Math.max(1, ...weeks.map(([, v]) => v.contracts));

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
        <StatCard label="Total Contracts" value={totalContracts} color={C.gold} />
        <StatCard label="Total Closed"    value={totalClosed}    color={C.green} />
        <StatCard label="Total Offers"    value={totalOffers}    color={C.cyan} />
        <StatCard label="Total Cost"      value={fmtCost(totalCost)} color={C.orange} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 24 }}>
        {/* WCL */}
        <div style={{ background: C.sf, border: `1px solid ${C.bd}`, borderLeft: `3px solid ${C.gold}`, borderRadius: 10, padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.gold, marginBottom: 12 }}>WCL Pipeline</div>
          {[
            { label: 'Received',      value: wcl.reduce((s, e) => s + safeNum(e.received), 0) },
            { label: 'Conversations', value: wcl.reduce((s, e) => s + safeNum(e.conversations), 0) },
            { label: 'Qualified',     value: wcl.reduce((s, e) => s + safeNum(e.qualified), 0) },
            { label: 'Offers',        value: wclOffers },
            { label: 'Responses',     value: wcl.reduce((s, e) => s + safeNum(e.responses), 0) },
            { label: 'Contracts',     value: wclContracts },
            { label: 'Closed',        value: wclClosed },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid ${C.bd}` }}>
              <span style={{ fontSize: 13, color: C.t2 }}>{row.label}</span>
              <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 13, fontWeight: 600, color: C.tx }}>{row.value.toLocaleString()}</span>
            </div>
          ))}
          <div style={{ marginTop: 10, fontSize: 12, color: C.t3 }}>
            Offer Rate: <span style={{ color: C.gold, fontWeight: 600 }}>{fmtPct(wclOffers, wcl.reduce((s, e) => s + safeNum(e.received), 0))}</span>
          </div>
        </div>
        {/* SMS */}
        <div style={{ background: C.sf, border: `1px solid ${C.bd}`, borderLeft: `3px solid ${C.purple}`, borderRadius: 10, padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.purple, marginBottom: 12 }}>SMS Pipeline</div>
          {[
            { label: 'Conversations', value: sms.reduce((s, e) => s + safeNum(e.conversations), 0) },
            { label: 'Qualified',     value: sms.reduce((s, e) => s + safeNum(e.qualified), 0) },
            { label: 'Offers',        value: smsOffers },
            { label: 'Responses',     value: sms.reduce((s, e) => s + safeNum(e.responses), 0) },
            { label: 'Contracts',     value: smsContracts },
            { label: 'Closed',        value: smsClosed },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', borderBottom: `1px solid ${C.bd}` }}>
              <span style={{ fontSize: 13, color: C.t2 }}>{row.label}</span>
              <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 13, fontWeight: 600, color: C.tx }}>{row.value.toLocaleString()}</span>
            </div>
          ))}
          <div style={{ marginTop: 10, fontSize: 12, color: C.t3 }}>
            Offer Rate: <span style={{ color: C.purple, fontWeight: 600 }}>{fmtPct(smsOffers, sms.reduce((s, e) => s + safeNum(e.conversations), 0))}</span>
          </div>
        </div>
      </div>

      {/* 90-day pace */}
      <div style={{ background: C.sf, border: `1px solid ${C.bd}`, borderLeft: `3px solid ${pace.pace === 'on' ? C.green : C.red}`, borderRadius: 10, padding: 18, marginBottom: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.tx }}>90-Day Pace</div>
          <span style={{
            fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 6,
            background: pace.pace === 'on' ? 'rgba(0,200,100,0.15)' : 'rgba(220,50,50,0.15)',
            color: pace.pace === 'on' ? C.green : C.red,
          }}>{pace.pace === 'on' ? '✓ On Pace' : '⚠ Behind Pace'}</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
          <div style={{ flex: 1, height: 8, background: C.s2, borderRadius: 4, overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${pace.pct}%`, background: pace.pace === 'on' ? C.green : C.red, borderRadius: 4 }} />
          </div>
          <span style={{ fontSize: 12, color: C.t3, whiteSpace: 'nowrap' }}>{pace.pct.toFixed(0)}% elapsed</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10 }}>
          {[
            { label: 'Goal',         value: PACE_GOAL,                     color: C.gold },
            { label: 'Actual',       value: totalContracts,                 color: pace.pace === 'on' ? C.green : C.red },
            { label: 'Expected Now', value: pace.expectedNow.toFixed(1),    color: C.t2 },
            { label: 'Days Left',    value: pace.daysLeft,                  color: C.cyan },
          ].map(item => (
            <div key={item.label} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontFamily: 'JetBrains Mono,monospace', fontWeight: 700, color: item.color }}>{item.value}</div>
              <div style={{ fontSize: 11, color: C.t3, marginTop: 2 }}>{item.label}</div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 11, color: C.t3, marginTop: 10 }}>{PACE_START} → {PACE_END} · Goal: {PACE_GOAL} contracts</div>
      </div>

      {/* Weekly bar chart */}
      {weeks.length > 0 && (
        <div style={{ background: C.sf, border: `1px solid ${C.bd}`, borderRadius: 10, padding: 18 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: C.tx, marginBottom: 16 }}>Weekly Contracts (last 8 weeks)</div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end', height: 80 }}>
            {weeks.map(([ws, v]) => (
              <div key={ws} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                <div style={{ fontSize: 11, color: C.gold, fontWeight: 600 }}>{v.contracts || ''}</div>
                <div style={{
                  width: '100%', borderRadius: '4px 4px 0 0', background: C.gold,
                  height: `${Math.max(2, safeDiv(v.contracts, maxContracts) * 60)}px`, opacity: 0.85,
                }} />
                <div style={{ fontSize: 9, color: C.t3, textAlign: 'center', whiteSpace: 'nowrap' }}>{ws.slice(5)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── ROOT PAGE ─────────────────────────────────────────────────────────────────
export default function KPIPage() {
  const [initialized, setInitialized] = useState(null);
  const [tab, setTab]                 = useState('campaigns');
  const [campaigns, setCampaigns]     = useState([]);
  const [outreach, setOutreach]       = useState([]);
  const [wcl, setWcl]                 = useState([]);
  const [sms, setSms]                 = useState([]);
  const [settings, setSettings]       = useState({ wclCost: 4.99, smsCostPerText: 0.04, positiveReplyFloor: 1.0, offerRateFloor: 90, minPositiveRepliesForDiag: 10 });
  const [loading, setLoading]         = useState(true);

  const load = useCallback(async () => {
    try {
      const [wipeRes, campRes, outRes, wclRes, smsRes, setRes] = await Promise.all([
        fetch('/api/kpi/wipe'),
        fetch('/api/kpi/campaigns'),
        fetch('/api/kpi/outreach'),
        fetch('/api/kpi/wcl'),
        fetch('/api/kpi/sms'),
        fetch('/api/kpi/settings'),
      ]);
      const wipeData = await wipeRes.json();
      setInitialized(wipeData.initialized_v3 === true);
      if (campRes.ok) setCampaigns(await campRes.json());
      if (outRes.ok)  setOutreach(await outRes.json());
      if (wclRes.ok)  setWcl(await wclRes.json());
      if (smsRes.ok)  setSms(await smsRes.json());
      if (setRes.ok)  setSettings(await setRes.json());
    } catch (e) { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    load();
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      const t = sp.get('tab');
      if (t) setTab(t);
    }
  }, [load]);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', color: C.t3, fontFamily: 'Outfit,sans-serif' }}>
      Loading KPI data…
    </div>
  );

  if (initialized === false) {
    return <WipeGate onDone={() => { setInitialized(true); load(); }} />;
  }

  const TABS = [
    { id: 'campaigns', label: 'Campaigns' },
    { id: 'outreach',  label: 'Outreach'  },
    { id: 'pipeline',  label: 'Pipeline'  },
    { id: 'combined',  label: 'Combined'  },
  ];

  return (
    <div style={{ padding: '24px 20px', maxWidth: 1100, margin: '0 auto', fontFamily: 'Outfit,sans-serif', color: C.tx }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 24, fontWeight: 700, color: C.tx }}>KPI Tracker</div>
          <div style={{ fontSize: 13, color: C.t3, marginTop: 2, fontFamily: 'JetBrains Mono,monospace' }}>{today()}</div>
        </div>
        <a href="/kpi/calendar" style={{
          background: C.s2, border: `1px solid ${C.bd}`, borderRadius: 8,
          padding: '9px 18px', fontSize: 13, color: C.t2, textDecoration: 'none',
          display: 'inline-flex', alignItems: 'center', gap: 6, minHeight: 40,
        }}>📅 Calendar</a>
      </div>

      <TodayStrip wcl={wcl} sms={sms} outreach={outreach} />
      <TabBar tabs={TABS} active={tab} onChange={setTab} />

      {tab === 'campaigns' && <CampaignsTab campaigns={campaigns} outreach={outreach} sms={sms} onRefresh={load} />}
      {tab === 'outreach'  && <OutreachTab  outreach={outreach} campaigns={campaigns} settings={settings} onRefresh={load} />}
      {tab === 'pipeline'  && <PipelineTab  wcl={wcl} sms={sms} campaigns={campaigns} settings={settings} onRefresh={load} />}
      {tab === 'combined'  && <CombinedTab  wcl={wcl} sms={sms} outreach={outreach} settings={settings} />}
    </div>
  );
}
