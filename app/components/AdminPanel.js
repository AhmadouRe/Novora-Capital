'use client';
import { useState, useEffect } from 'react';
import DatePicker from './DatePicker.js';

const COLORS = ['#06B6D4','#A78BFA','#22C55E','#EF4444','#F97316','#3B82F6'];
const TABS = ['Members','Add Member','Change PINs','Access Control','Goal Settings','Split Settings','Deleted Items','Audit Log','Backup'];

const INPUT = { minHeight:48, padding:'12px 16px', borderRadius:10, background:'var(--surface3)', border:'1px solid var(--border)', color:'var(--text)', fontSize:15, width:'100%', outline:'none', fontFamily:'Outfit,sans-serif' };
const LBL = { fontSize:12, fontWeight:700, textTransform:'uppercase', letterSpacing:'0.11em', color:'var(--text3)', marginBottom:8, display:'block' };
const BTN_PRIMARY = { minHeight:46, padding:'0 20px', borderRadius:10, border:'none', background:'var(--gold)', color:'#000', fontWeight:800, fontSize:14, cursor:'pointer', transition:'all 0.15s' };
const BTN_SECONDARY = { minHeight:46, padding:'0 16px', borderRadius:10, border:'1px solid var(--border)', background:'var(--surface3)', color:'var(--text2)', fontWeight:700, fontSize:14, cursor:'pointer', transition:'all 0.15s' };
const BTN_DANGER = { minHeight:40, padding:'0 14px', borderRadius:8, border:'1px solid var(--red-border)', background:'var(--red-faint)', color:'var(--red)', fontWeight:700, fontSize:13, cursor:'pointer' };

const DEFAULT_SPLITS = [
  { label:'Taxes', pct:30, color:'#EF4444' },
  { label:'Marketing', pct:30, color:'#E8A020' },
  { label:'Reserve', pct:20, color:'#A78BFA' },
  { label:'Owner Pay', pct:10, color:'#22C55E' },
  { label:'Operating', pct:10, color:'#06B6D4' },
];

export default function AdminPanel({ session, onClose }) {
  const [tab, setTab] = useState('Members');
  const [users, setUsers] = useState([]);
  const [audit, setAudit] = useState([]);
  const [deleted, setDeleted] = useState([]);
  const [splits, setSplits] = useState(DEFAULT_SPLITS);
  const [goalForm, setGoalForm] = useState({ amount:'', startDate:'', endDate:'', avgDeal:'' });
  const [msg, setMsg] = useState('');

  const [newName, setNewName] = useState('');
  const [newPin, setNewPin] = useState('');
  const [newPin2, setNewPin2] = useState('');
  const [newColor, setNewColor] = useState(COLORS[0]);

  const [pinUser, setPinUser] = useState('');
  const [pin1, setPin1] = useState('');
  const [pin2, setPin2] = useState('');

  useEffect(() => {
    fetch('/api/users').then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setUsers(d); }).catch(()=>{});
    fetch('/api/audit').then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setAudit(d); }).catch(()=>{});
    fetch('/api/revenue/goal').then(r=>r.json()).then(d=>{ if(d&&d.amount) setGoalForm({ amount:d.amount||'', startDate:d.startDate||'', endDate:d.endDate||'', avgDeal:d.avgDeal||'' }); }).catch(()=>{});
    fetch('/api/revenue/splits').then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setSplits(d); }).catch(()=>{});
    fetch('/api/restore?list=true').then(r=>r.json()).then(d=>{ if(Array.isArray(d)) setDeleted(d); }).catch(()=>{});
  }, []);

  function flash(m) { setMsg(m); setTimeout(()=>setMsg(''),3000); }

  async function removeUser(id) {
    if (!confirm('Remove this user?')) return;
    await fetch(`/api/users/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({active:false}) });
    setUsers(u=>u.map(x=>x.id===id?{...x,active:false}:x));
    flash('User removed.');
  }

  async function addMember() {
    if (!newName.trim()) return flash('Name required.');
    if (newPin.length!==4||!/^\d+$/.test(newPin)) return flash('PIN must be 4 digits.');
    if (newPin!==newPin2) return flash('PINs do not match.');
    const res = await fetch('/api/users', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ name:newName.trim(), pin:newPin, color:newColor }) });
    if (res.ok) { flash('Member added!'); setNewName(''); setNewPin(''); setNewPin2(''); fetch('/api/users').then(r=>r.json()).then(d=>{if(Array.isArray(d))setUsers(d);}); }
    else flash('Failed to add member.');
  }

  async function changePin() {
    if (!pinUser) return flash('Select a user.');
    if (pin1.length!==4||!/^\d+$/.test(pin1)) return flash('PIN must be 4 digits.');
    if (pin1!==pin2) return flash('PINs do not match.');
    const res = await fetch(`/api/users/${pinUser}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ pin:pin1 }) });
    if (res.ok) { flash('PIN updated!'); setPin1(''); setPin2(''); }
    else flash('Failed to update PIN.');
  }

  async function saveAccess(userId, key, val) {
    const u = users.find(x=>x.id===userId);
    if (!u) return;
    const access = {...(u.access||{}), [key]:val};
    const res = await fetch(`/api/users/${userId}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ access }) });
    if (res.ok) { setUsers(us=>us.map(x=>x.id===userId?{...x,access}:x)); flash('Access updated.'); }
  }

  async function saveGoal() {
    const res = await fetch('/api/revenue/goal', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify({ amount:Number(goalForm.amount), startDate:goalForm.startDate, endDate:goalForm.endDate, avgDeal:goalForm.avgDeal?Number(goalForm.avgDeal):undefined }) });
    if (res.ok) flash('Goal saved!'); else flash('Failed.');
  }

  async function saveSplits() {
    const total = splits.reduce((s,x)=>s+Number(x.pct),0);
    if (Math.abs(total-100)>0.01) return flash(`Total is ${total}% — must be exactly 100%.`);
    const res = await fetch('/api/revenue/splits', { method:'PUT', headers:{'Content-Type':'application/json'}, body:JSON.stringify(splits) });
    if (res.ok) flash('Splits saved!'); else flash('Failed to save splits.');
  }

  async function restore(id, type) {
    await fetch('/api/restore', { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({id,type}) });
    setDeleted(d=>d.filter(x=>x.id!==id));
    flash('Restored!');
  }

  async function downloadBackup() {
    const res = await fetch('/api/backup');
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `novora-backup-${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const splitsTotal = splits.reduce((s,x)=>s+Number(x.pct),0);

  return (
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:20,width:620,maxWidth:'95vw',maxHeight:'90vh',overflow:'hidden',display:'flex',flexDirection:'column'}}>
        <div style={{padding:'24px 28px 0',flexShrink:0}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:20}}>
            <div>
              <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.12em',color:'var(--gold)',marginBottom:6}}>Admin Panel</div>
              <div style={{fontSize:22,fontWeight:900,color:'var(--text)'}}>Team & Platform Management</div>
            </div>
            <button onClick={onClose} style={{background:'none',border:'none',color:'var(--text3)',fontSize:24,cursor:'pointer',lineHeight:1}}>×</button>
          </div>
          <div style={{display:'flex',gap:0,borderBottom:'1px solid var(--border)',overflowX:'auto'}}>
            {TABS.map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{padding:'10px 14px',background:'none',border:'none',borderBottom:tab===t?'2px solid var(--gold)':'2px solid transparent',color:tab===t?'var(--gold)':'var(--text3)',fontSize:13,fontWeight:tab===t?700:500,cursor:'pointer',whiteSpace:'nowrap',transition:'color 0.15s'}}>{t}</button>
            ))}
          </div>
        </div>

        <div style={{overflowY:'auto',padding:'20px 28px 28px',flex:1}}>
          {msg && <div style={{padding:'10px 16px',borderRadius:10,background:'var(--surface2)',border:'1px solid var(--border)',color:'var(--text2)',fontSize:14,marginBottom:16}}>{msg}</div>}

          {tab==='Members' && (
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {users.map(u=>(
                <div key={u.id} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',borderRadius:12,background:'var(--surface2)',border:'1px solid var(--border)',opacity:u.active===false?0.5:1}}>
                  <div style={{width:36,height:36,borderRadius:'50%',background:u.color+'20',border:`2px solid ${u.color}50`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:14,fontWeight:700,color:u.color,flexShrink:0}}>{u.name[0].toUpperCase()}</div>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:700,color:'var(--text)',fontSize:15}}>{u.name}</div>
                    <div style={{display:'flex',gap:6,marginTop:4,flexWrap:'wrap'}}>
                      {u.active===false && <span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:'var(--red-faint)',color:'var(--red)',border:'1px solid var(--red-border)'}}>REMOVED</span>}
                      {u.access?.revenue && <span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:'var(--green-faint)',color:'var(--green)',border:'1px solid var(--green-border)'}}>Revenue</span>}
                      {u.access?.expenses && <span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:'var(--orange-faint)',color:'var(--orange)',border:'1px solid var(--orange-border)'}}>Expenses</span>}
                      {u.access?.manageTeam && <span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:'var(--gold-faint)',color:'var(--gold)',border:'1px solid var(--gold-border)'}}>Team Mgmt</span>}
                    </div>
                  </div>
                  {u.name!=='Ahmadou'&&u.active!==false && <button onClick={()=>removeUser(u.id)} style={BTN_DANGER}>Remove</button>}
                </div>
              ))}
            </div>
          )}

          {tab==='Add Member' && (
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              <div><label style={LBL}>Name</label><input style={INPUT} value={newName} onChange={e=>setNewName(e.target.value)} placeholder="Full name"/></div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div><label style={LBL}>PIN (4 digits)</label><input style={INPUT} type="password" maxLength={4} value={newPin} onChange={e=>setNewPin(e.target.value)} placeholder="••••"/></div>
                <div><label style={LBL}>Confirm PIN</label><input style={INPUT} type="password" maxLength={4} value={newPin2} onChange={e=>setNewPin2(e.target.value)} placeholder="••••"/></div>
              </div>
              <div>
                <label style={LBL}>Color</label>
                <div style={{display:'flex',gap:10}}>{COLORS.map(c=><div key={c} onClick={()=>setNewColor(c)} style={{width:32,height:32,borderRadius:'50%',background:c,cursor:'pointer',outline:newColor===c?`3px solid ${c}`:'3px solid transparent',outlineOffset:2,transition:'outline 0.15s'}}/>)}</div>
              </div>
              <button onClick={addMember} style={{...BTN_PRIMARY,alignSelf:'flex-start',padding:'0 28px'}}>Add Member</button>
            </div>
          )}

          {tab==='Change PINs' && (
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              <div><label style={LBL}>Select User</label>
                <select style={{...INPUT,height:48}} value={pinUser} onChange={e=>setPinUser(e.target.value)}>
                  <option value="">Choose user...</option>
                  {users.filter(u=>u.active!==false).map(u=><option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div><label style={LBL}>New PIN</label><input style={INPUT} type="password" maxLength={4} value={pin1} onChange={e=>setPin1(e.target.value)} placeholder="••••"/></div>
                <div><label style={LBL}>Confirm PIN</label><input style={INPUT} type="password" maxLength={4} value={pin2} onChange={e=>setPin2(e.target.value)} placeholder="••••"/></div>
              </div>
              <button onClick={changePin} style={{...BTN_PRIMARY,alignSelf:'flex-start',padding:'0 28px'}}>Update PIN</button>
            </div>
          )}

          {tab==='Access Control' && (
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {users.filter(u=>u.name!=='Ahmadou'&&u.active!==false).map(u=>(
                <div key={u.id} style={{padding:'16px',borderRadius:12,background:'var(--surface2)',border:'1px solid var(--border)'}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:14}}>
                    <div style={{width:32,height:32,borderRadius:'50%',background:u.color+'20',display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:u.color}}>{u.name[0].toUpperCase()}</div>
                    <span style={{fontWeight:700,color:'var(--text)'}}>{u.name}</span>
                  </div>
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    {[{key:'revenue',label:'Can view Revenue'},{key:'expenses',label:'Can view Expenses'},{key:'manageTeam',label:'Can manage team'}].map(({key,label})=>(
                      <div key={key} style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                        <span style={{fontSize:14,color:'var(--text2)'}}>{label}</span>
                        <div onClick={()=>saveAccess(u.id,key,!u.access?.[key])} style={{width:44,height:24,borderRadius:12,background:u.access?.[key]?'var(--green)':'var(--surface3)',border:`1px solid ${u.access?.[key]?'var(--green-border)':'var(--border)'}`,position:'relative',cursor:'pointer',transition:'all 0.2s'}}>
                          <div style={{position:'absolute',top:2,left:u.access?.[key]?20:2,width:18,height:18,borderRadius:'50%',background:'#fff',transition:'left 0.2s'}}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <p style={{color:'var(--text3)',fontSize:13}}>Changes take effect on next login.</p>
            </div>
          )}

          {tab==='Goal Settings' && (
            <div style={{display:'flex',flexDirection:'column',gap:16}}>
              <div><label style={LBL}>Goal Amount</label>
                <div style={{position:'relative'}}><span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',color:'var(--text3)',zIndex:1}}>$</span>
                <input style={{...INPUT,paddingLeft:28}} type="number" value={goalForm.amount} onChange={e=>setGoalForm(f=>({...f,amount:e.target.value}))}/></div>
              </div>
              <DatePicker label="Start Date" value={goalForm.startDate} onChange={v=>setGoalForm(f=>({...f,startDate:v}))}/>
              <DatePicker label="End Date" value={goalForm.endDate} onChange={v=>setGoalForm(f=>({...f,endDate:v}))}/>
              <div><label style={LBL}>Avg Deal Size Override (optional)</label>
                <div style={{position:'relative'}}><span style={{position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',color:'var(--text3)',zIndex:1}}>$</span>
                <input style={{...INPUT,paddingLeft:28}} type="number" value={goalForm.avgDeal} onChange={e=>setGoalForm(f=>({...f,avgDeal:e.target.value}))}/></div>
              </div>
              <button onClick={saveGoal} style={{...BTN_PRIMARY,alignSelf:'flex-start',padding:'0 28px'}}>Save Goal</button>
            </div>
          )}

          {tab==='Split Settings' && (
            <div style={{display:'flex',flexDirection:'column',gap:12}}>
              {splits.map((s,i)=>(
                <div key={s.label} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderRadius:10,background:'var(--surface2)',border:'1px solid var(--border)'}}>
                  <div style={{width:14,height:14,borderRadius:'50%',background:s.color,flexShrink:0}}/>
                  <span style={{flex:1,fontWeight:600,color:'var(--text)',fontSize:15}}>{s.label}</span>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <input type="number" value={s.pct} onChange={e=>setSplits(sp=>sp.map((x,j)=>j===i?{...x,pct:Number(e.target.value)}:x))} style={{width:70,minHeight:40,padding:'8px 10px',borderRadius:8,background:'var(--surface3)',border:'1px solid var(--border)',color:'var(--text)',fontSize:15,textAlign:'right',outline:'none'}}/>
                    <span style={{color:'var(--text3)',fontSize:14}}>%</span>
                  </div>
                </div>
              ))}
              <div style={{padding:'10px 14px',borderRadius:10,background:Math.abs(splitsTotal-100)>0.01?'var(--red-faint)':'var(--green-faint)',border:`1px solid ${Math.abs(splitsTotal-100)>0.01?'var(--red-border)':'var(--green-border)'}`,color:Math.abs(splitsTotal-100)>0.01?'var(--red)':'var(--green)',fontSize:14,fontWeight:700}}>
                Total: {splitsTotal}% {Math.abs(splitsTotal-100)>0.01?'— must equal 100%':'✓'}
              </div>
              <div style={{display:'flex',gap:10}}>
                <button onClick={()=>setSplits(DEFAULT_SPLITS)} style={{...BTN_SECONDARY,flex:1}}>Reset to Defaults</button>
                <button onClick={saveSplits} style={{...BTN_PRIMARY,flex:1}}>Save Splits</button>
              </div>
            </div>
          )}

          {tab==='Deleted Items' && (
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {deleted.length===0&&<p style={{color:'var(--text3)',fontSize:14}}>No deleted items in the past 30 days.</p>}
              {deleted.map(item=>(
                <div key={item.id} style={{display:'flex',alignItems:'center',gap:12,padding:'12px 14px',borderRadius:10,background:'var(--surface2)',border:'1px solid var(--border)'}}>
                  <span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:'var(--surface3)',color:'var(--text3)',border:'1px solid var(--border)',whiteSpace:'nowrap'}}>{item.type||'ENTRY'}</span>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:14,color:'var(--text)',fontWeight:600,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{item.address||item.vendor||item.name||item.id}</div>
                    <div style={{fontSize:12,color:'var(--text3)',fontFamily:'JetBrains Mono,monospace'}}>{item.deletedAt?.slice(0,10)}</div>
                  </div>
                  <button onClick={()=>restore(item.id,item.type)} style={{...BTN_SECONDARY,minHeight:36,fontSize:12,padding:'0 12px'}}>Restore</button>
                </div>
              ))}
            </div>
          )}

          {tab==='Audit Log' && (
            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {audit.slice(0,100).map((a,i)=>(
                <div key={i} style={{display:'flex',alignItems:'flex-start',gap:10,padding:'10px 12px',borderRadius:8,background:'var(--surface2)'}}>
                  <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:11,color:'var(--text3)',flexShrink:0,marginTop:2}}>{a.timestamp?.slice(0,16).replace('T',' ')}</span>
                  <div style={{width:24,height:24,borderRadius:'50%',background:'var(--gold-faint)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:700,color:'var(--gold)',flexShrink:0}}>{a.userName?.[0]?.toUpperCase()}</div>
                  <div style={{flex:1}}><span style={{fontSize:11,padding:'1px 6px',borderRadius:4,background:'var(--surface3)',color:'var(--text2)',border:'1px solid var(--border)',marginRight:6}}>{a.action}</span><span style={{fontSize:13,color:'var(--text2)'}}>{a.detail}</span></div>
                </div>
              ))}
            </div>
          )}

          {tab==='Backup' && (
            <div style={{display:'flex',flexDirection:'column',gap:16,alignItems:'flex-start'}}>
              <p style={{color:'var(--text2)',fontSize:15}}>Download a complete JSON backup of all KV data — deals, KPI entries, expenses, splits, users, and audit log.</p>
              <button onClick={downloadBackup} style={{...BTN_PRIMARY,padding:'0 32px'}}>Download Complete Backup</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
