'use client';
import { useState, useEffect } from 'react';

const COLORS = ['#E8A020', '#06B6D4', '#22C55E', '#EF4444', '#A78BFA', '#F472B6'];

function Modal({ title, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, width: 680, maxWidth: '100%', maxHeight: '90vh', display: 'flex', flexDirection: 'column' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '20px 24px', borderBottom: '1px solid var(--border)' }}>
          <span style={{ fontWeight: 700, fontSize: 17, color: 'var(--text)' }}>{title}</span>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: 20, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

const TABS = ['Members', 'Add Member', 'Change PINs', 'Backup', 'Deleted Items', 'Audit Log'];

export default function AdminPanel({ session, onClose }) {
  const [tab, setTab] = useState('Members');
  const [users, setUsers] = useState([]);
  const [expanded, setExpanded] = useState(null);
  const [newName, setNewName] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newPinConfirm, setNewPinConfirm] = useState('');
  const [newColor, setNewColor] = useState(COLORS[0]);
  const [addError, setAddError] = useState('');
  const [pinUser, setPinUser] = useState('');
  const [pinNew, setPinNew] = useState('');
  const [pinConfirm, setPinConfirm] = useState('');
  const [pinError, setPinError] = useState('');
  const [auditLog, setAuditLog] = useState([]);
  const [deletedItems, setDeletedItems] = useState([]);
  const [msg, setMsg] = useState('');

  const loadUsers = () => fetch('/api/users').then(r => r.json()).then(d => { if (Array.isArray(d)) setUsers(d); }).catch(() => {});
  const loadAudit = () => fetch('/api/audit').then(r => r.json()).then(d => { if (Array.isArray(d)) setAuditLog(d); }).catch(() => {});

  useEffect(() => { loadUsers(); }, []);
  useEffect(() => { if (tab === 'Audit Log') loadAudit(); }, [tab]);
  useEffect(() => {
    if (tab === 'Deleted Items') {
      Promise.all([
        fetch('/api/kpi/wcl').then(r => r.json()),
        fetch('/api/revenue/deals').then(r => r.json()).catch(() => []),
        fetch('/api/expenses').then(r => r.json()).catch(() => []),
      ]).then(([wcl, deals, expenses]) => {
        const items = [];
        if (Array.isArray(wcl)) wcl.filter(e => e.deleted).forEach(e => items.push({ ...e, _type: 'kpi', _label: `WCL ${e.date}` }));
        if (Array.isArray(deals)) deals.filter(e => e.deleted).forEach(e => items.push({ ...e, _type: 'revenue', _label: `${e.address} — $${e.fee}` }));
        if (Array.isArray(expenses)) expenses.filter(e => e.deleted).forEach(e => items.push({ ...e, _type: 'expenses', _label: `${e.vendor} — $${e.amount}` }));
        setDeletedItems(items);
      });
    }
  }, [tab]);

  const toggleAccess = async (userId, field, val) => {
    await fetch(`/api/users/${userId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ access: { [field]: val } }) });
    loadUsers();
  };

  const removeUser = async (userId) => {
    if (!confirm('Deactivate this user?')) return;
    await fetch(`/api/users/${userId}`, { method: 'DELETE' });
    loadUsers();
  };

  const addMember = async () => {
    if (!newName || !newPin) { setAddError('Name and PIN required'); return; }
    if (newPin !== newPinConfirm) { setAddError('PINs do not match'); return; }
    if (newPin.length !== 4 || !/^\d{4}$/.test(newPin)) { setAddError('PIN must be 4 digits'); return; }
    const res = await fetch('/api/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: newName, pin: newPin, color: newColor }) });
    if (res.ok) { setNewName(''); setNewPin(''); setNewPinConfirm(''); setAddError(''); loadUsers(); setTab('Members'); }
    else { const d = await res.json(); setAddError(d.error || 'Error'); }
  };

  const changePin = async () => {
    if (!pinUser) { setPinError('Select a user'); return; }
    if (pinNew !== pinConfirm) { setPinError('PINs do not match'); return; }
    if (!/^\d{4}$/.test(pinNew)) { setPinError('PIN must be 4 digits'); return; }
    const res = await fetch(`/api/users/${pinUser}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ pin: pinNew }) });
    if (res.ok) { setPinNew(''); setPinConfirm(''); setPinError(''); setMsg('PIN updated successfully'); setTimeout(() => setMsg(''), 3000); }
    else { const d = await res.json(); setPinError(d.error || 'Error'); }
  };

  const restore = async (id, type) => {
    await fetch(`/api/restore?id=${id}&type=${type}`);
    setDeletedItems(prev => prev.filter(i => i.id !== id));
  };

  const download = async () => {
    const res = await fetch('/api/backup');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = `novora-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  const p = { padding: '20px 24px' };
  const inputS = { width: '100%', padding: '10px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14 };
  const btnS = (c) => ({ padding: '10px 16px', borderRadius: 8, border: 'none', background: c, color: c === 'var(--border)' ? 'var(--text2)' : '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' });

  return (
    <Modal title="Admin Panel" onClose={onClose}>
      <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', overflowX: 'auto' }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{ padding: '12px 16px', background: 'none', border: 'none', color: tab === t ? 'var(--gold)' : 'var(--text2)', borderBottom: tab === t ? '2px solid var(--gold)' : '2px solid transparent', fontSize: 13, fontWeight: tab === t ? 600 : 400, cursor: 'pointer', whiteSpace: 'nowrap' }}>{t}</button>
        ))}
      </div>

      {tab === 'Members' && (
        <div style={p}>
          {users.filter(u => u.active !== false).map(u => (
            <div key={u.id} style={{ border: '1px solid var(--border)', borderRadius: 10, marginBottom: 10, overflow: 'hidden' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', cursor: 'pointer' }} onClick={() => setExpanded(expanded === u.id ? null : u.id)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: u.color + '22', border: `2px solid ${u.color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 700, color: u.color }}>{u.name[0]}</div>
                  <span style={{ fontWeight: 600, color: 'var(--text)' }}>{u.name}</span>
                  {['revenue','expenses','manageTeam'].map(k => u.access?.[k] && (
                    <span key={k} style={{ fontSize: 10, padding: '2px 6px', borderRadius: 4, background: 'var(--surface2)', color: 'var(--text2)', border: '1px solid var(--border)' }}>{k === 'manageTeam' ? 'Team' : k[0].toUpperCase()+k.slice(1)}</span>
                  ))}
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {u.id !== 'ahmadou' && <button onClick={(e) => { e.stopPropagation(); removeUser(u.id); }} style={{ ...btnS('var(--red-faint)'), color: 'var(--red)', border: '1px solid var(--red-border)', padding: '4px 10px', fontSize: 12 }}>Remove</button>}
                  <span style={{ color: 'var(--text2)', fontSize: 12 }}>{expanded === u.id ? '▲' : '▼'}</span>
                </div>
              </div>
              {expanded === u.id && u.id !== 'ahmadou' && (
                <div style={{ padding: '12px 16px', borderTop: '1px solid var(--border)', background: 'var(--surface2)', display: 'flex', gap: 20 }}>
                  {[['revenue','Revenue'],['expenses','Expenses'],['manageTeam','Team Mgmt']].map(([k,l]) => (
                    <label key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
                      <input type="checkbox" checked={!!u.access?.[k]} onChange={e => toggleAccess(u.id, k, e.target.checked)} />
                      <span style={{ fontSize: 13, color: 'var(--text2)' }}>{l}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'Add Member' && (
        <div style={{ ...p, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <input style={inputS} placeholder="Name" value={newName} onChange={e => setNewName(e.target.value)} />
          <input style={inputS} type="password" placeholder="PIN (4 digits)" value={newPin} onChange={e => setNewPin(e.target.value)} maxLength={4} />
          <input style={inputS} type="password" placeholder="Confirm PIN" value={newPinConfirm} onChange={e => setNewPinConfirm(e.target.value)} maxLength={4} />
          <div style={{ display: 'flex', gap: 8 }}>
            {COLORS.map(c => <div key={c} onClick={() => setNewColor(c)} style={{ width: 32, height: 32, borderRadius: '50%', background: c, cursor: 'pointer', outline: newColor === c ? `3px solid ${c}` : 'none', outlineOffset: 2 }} />)}
          </div>
          {addError && <div style={{ color: 'var(--red)', fontSize: 13 }}>{addError}</div>}
          <button style={btnS('var(--gold)')} onClick={addMember}>Add Member</button>
        </div>
      )}

      {tab === 'Change PINs' && (
        <div style={{ ...p, display: 'flex', flexDirection: 'column', gap: 14 }}>
          <select style={inputS} value={pinUser} onChange={e => setPinUser(e.target.value)}>
            <option value="">Select user</option>
            {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <input style={inputS} type="password" placeholder="New PIN" value={pinNew} onChange={e => setPinNew(e.target.value)} maxLength={4} />
          <input style={inputS} type="password" placeholder="Confirm PIN" value={pinConfirm} onChange={e => setPinConfirm(e.target.value)} maxLength={4} />
          {pinError && <div style={{ color: 'var(--red)', fontSize: 13 }}>{pinError}</div>}
          {msg && <div style={{ color: 'var(--green)', fontSize: 13 }}>{msg}</div>}
          <button style={btnS('var(--gold)')} onClick={changePin}>Update PIN</button>
        </div>
      )}

      {tab === 'Backup' && (
        <div style={{ ...p, display: 'flex', flexDirection: 'column', gap: 16 }}>
          <p style={{ color: 'var(--text2)', fontSize: 14 }}>Download a full JSON backup of all KV data.</p>
          <button style={btnS('var(--green)')} onClick={download}>⬇ Download All Data</button>
        </div>
      )}

      {tab === 'Deleted Items' && (
        <div style={p}>
          {deletedItems.length === 0 ? <p style={{ color: 'var(--text2)' }}>No deleted items within 30 days.</p> : deletedItems.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 12px', border: '1px solid var(--border)', borderRadius: 8, marginBottom: 8 }}>
              <div>
                <span style={{ fontSize: 11, padding: '2px 6px', borderRadius: 4, background: 'var(--surface2)', color: 'var(--text2)', marginRight: 8 }}>{item._type}</span>
                <span style={{ color: 'var(--text)', fontSize: 14 }}>{item._label}</span>
                <span style={{ color: 'var(--text3)', fontSize: 12, marginLeft: 8 }}>{item.deletedAt?.slice(0,10)}</span>
              </div>
              <button style={{ ...btnS('var(--green-faint)'), color: 'var(--green)', border: '1px solid var(--green-border)', padding: '4px 10px', fontSize: 12 }} onClick={() => restore(item.id, item._type)}>Restore</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'Audit Log' && (
        <div style={p}>
          <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 12 }}>Last 100 entries</div>
          <div style={{ maxHeight: 400, overflowY: 'auto' }}>
            {auditLog.map(e => (
              <div key={e.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11, color: 'var(--text3)', flexShrink: 0, marginTop: 1 }}>{e.timestamp?.slice(0,16).replace('T',' ')}</span>
                <span style={{ fontSize: 12, color: 'var(--gold)', flexShrink: 0 }}>{e.userName}</span>
                <span style={{ fontSize: 12, color: 'var(--cyan)', flexShrink: 0 }}>{e.action}</span>
                <span style={{ fontSize: 12, color: 'var(--text2)' }}>{e.detail}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Modal>
  );
}
