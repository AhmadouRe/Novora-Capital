'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts';

function toN(v){const n=parseFloat(String(v||0).replace(/[^0-9.]/g,''));return isNaN(n)?0:n;}
function fmt(n){return Number(n||0).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});}

const SOURCES=['WCL/Propwire','SMS Outreach','JV Partner','FSBO','Cold Call','Direct Mail','Other'];
const EXITS=['Assignment','Novation'];
const DEFAULT_SPLITS=[{label:'Taxes',pct:30,color:'#EF4444'},{label:'Owner',pct:30,color:'#22C55E'},{label:'Marketing',pct:20,color:'#E8A020'},{label:'Reserve',pct:12,color:'#A78BFA'},{label:'Operating',pct:8,color:'#06B6D4'}];
const TODAY=new Date().toISOString().slice(0,10);
const navS={display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 24px',height:56,background:'var(--surface)',borderBottom:'1px solid var(--border)',position:'sticky',top:0,zIndex:50};
const inputS={width:'100%',padding:'9px 12px',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,color:'var(--text)',fontSize:14};
const cardS={background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:20,marginBottom:16};
const btnS=(c,light)=>({padding:'9px 18px',borderRadius:8,border:'none',background:light?c+'15':c,color:light?c:'#000',fontWeight:600,fontSize:13,cursor:'pointer'});

function CurrIn({value,onChange,placeholder}){
  const[f,setF]=useState(false);
  return(
    <div style={{display:'flex',alignItems:'center',background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,overflow:'hidden'}}>
      <span style={{padding:'0 10px',color:'var(--text2)',background:'var(--surface3)',borderRight:'1px solid var(--border)',height:40,display:'flex',alignItems:'center',fontSize:14}}>$</span>
      <input style={{flex:1,padding:'9px 12px',background:'transparent',border:'none',color:'var(--text)',fontSize:14,outline:'none',fontFamily:'JetBrains Mono,monospace'}}
        type="text" inputMode="decimal"
        value={f?value:(toN(value)?Number(toN(value)).toLocaleString():'')}
        onChange={e=>onChange(e.target.value.replace(/[^0-9.]/g,''))}
        onFocus={()=>setF(true)} onBlur={()=>setF(false)} placeholder={placeholder}/>
    </div>
  );
}

export default function RevenuePage(){
  const router=useRouter();
  const[session,setSession]=useState(null);
  const[loading,setLoading]=useState(true);
  const[deals,setDeals]=useState([]);
  const[goal,setGoal]=useState({amount:50000,startDate:'2026-04-25',endDate:'2026-07-25'});
  const[splits,setSplits]=useState(DEFAULT_SPLITS);
  const[showSettings,setShowSettings]=useState(false);
  const[showSplits,setShowSplits]=useState(false);
  const[goalEdit,setGoalEdit]=useState({});
  const[splitsEdit,setSplitsEdit]=useState([]);
  const[form,setForm]=useState({address:'',fee:'',source:SOURCES[0],exit:EXITS[0],county:'',closeDate:TODAY});
  const[saving,setSaving]=useState(false);
  const[msg,setMsg]=useState('');

  useEffect(()=>{
    fetch('/api/auth/session').then(r=>{if(!r.ok){router.push('/');return;}return r.json();}).then(d=>{
      if(d?.userId){setSession(d);setLoading(false);}
    }).catch(()=>router.push('/'));
  },[]);

  useEffect(()=>{
    if(!session?.access?.revenue)return;
    fetch('/api/revenue/deals').then(r=>r.json()).then(d=>{if(Array.isArray(d))setDeals(d);}).catch(()=>{});
    fetch('/api/revenue/goal').then(r=>r.json()).then(d=>{if(d?.amount)setGoal(d);}).catch(()=>{});
    fetch('/api/revenue/splits').then(r=>r.json()).then(d=>{if(Array.isArray(d))setSplits(d);}).catch(()=>{});
  },[session]);

  const total=deals.reduce((s,d)=>s+toN(d.fee),0);
  const now=new Date();
  const startD=new Date(goal.startDate);
  const endD=new Date(goal.endDate);
  const totalDays=Math.max(1,Math.ceil((endD-startD)/86400000));
  const elapsed=Math.max(1,Math.ceil((now-startD)/86400000));
  const daysLeft=Math.max(0,Math.ceil((endD-now)/86400000));
  const goalAmt=toN(goal.amount)||50000;
  const goalPct=Math.min(100,(total/goalAmt)*100);
  const pace=total/elapsed;
  const projected=pace*totalDays;
  const neededPerDay=daysLeft>0?(goalAmt-total)/daysLeft:0;
  const daysColor=daysLeft>=30?'var(--green)':daysLeft>=14?'var(--gold)':'var(--red)';

  const chartData=[];
  let cum=0;
  [...deals].sort((a,b)=>new Date(a.closeDate)-new Date(b.closeDate)).forEach(d=>{cum+=toN(d.fee);chartData.push({date:d.closeDate?.slice(5),total:cum,address:d.address});});

  const bySource={};deals.forEach(d=>{bySource[d.source]=(bySource[d.source]||0)+toN(d.fee);});
  const byExit={};deals.forEach(d=>{byExit[d.exit]=(byExit[d.exit]||0)+toN(d.fee);});
  const byCounty={};deals.forEach(d=>{if(d.county)byCounty[d.county]=(byCounty[d.county]||0)+toN(d.fee);});

  const saveGoal=async()=>{
    const updated={...goal,...goalEdit};
    await fetch('/api/revenue/goal',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(updated)});
    setGoal(updated);setShowSettings(false);
  };
  const saveSplits=async()=>{
    const total2=splitsEdit.reduce((s,sp)=>s+toN(sp.pct),0);
    if(Math.abs(total2-100)>0.01){setMsg('Splits must total 100%');return;}
    await fetch('/api/revenue/splits',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(splitsEdit)});
    setSplits(splitsEdit);setShowSplits(false);setMsg('');
  };
  const logDeal=async()=>{
    if(!form.address||!form.fee){setMsg('Address and fee required');return;}
    setSaving(true);
    const res=await fetch('/api/revenue/deals',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(form)});
    const d=await res.json();
    if(res.ok){setDeals(prev=>[...prev,d]);setForm({address:'',fee:'',source:SOURCES[0],exit:EXITS[0],county:'',closeDate:TODAY});setMsg('');}
    else setMsg(d.error||'Error');
    setSaving(false);
  };
  const deleteDeal=async(id)=>{if(!confirm('Delete this deal?'))return;await fetch(`/api/revenue/deals/${id}`,{method:'DELETE'});setDeals(prev=>prev.filter(d=>d.id!==id));};

  if(loading)return<div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text2)'}}>Loading…</div>;
  if(!session?.access?.revenue)return(
    <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16}}>
      <div style={{fontSize:48}}>🔒</div>
      <div style={{fontSize:20,fontWeight:700,color:'var(--text)'}}>Access Denied</div>
      <div style={{color:'var(--text2)'}}>You don't have access to Revenue. Contact Ahmadou.</div>
      <button style={btnS('var(--gold)',false)} onClick={()=>router.push('/')}>← Go Back</button>
    </div>
  );

  const feeN=toN(form.fee);
  const feeColor=feeN>=12000?'var(--green)':feeN>=9000?'var(--cyan)':'var(--gold)';

  return(
    <div style={{minHeight:'100vh',background:'var(--bg)',color:'var(--text)'}}>
      <nav style={navS}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <a href="/" style={{color:'var(--text2)',textDecoration:'none',fontSize:20}}>←</a>
          <span style={{fontWeight:700,fontSize:16}}>Revenue Tracker</span>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button style={{...btnS('var(--surface2)',false),color:'var(--text2)',fontSize:12}} onClick={()=>{setGoalEdit({...goal});setShowSettings(!showSettings);}}>⚙ Settings</button>
          {session?.access?.manageTeam&&<button style={{...btnS('var(--surface2)',false),color:'var(--text2)',fontSize:12}} onClick={()=>{setSplitsEdit(splits.map(s=>({...s})));setShowSplits(!showSplits);}}>Split</button>}
        </div>
      </nav>

      {showSettings&&(
        <div style={{background:'var(--surface)',borderBottom:'1px solid var(--border)',padding:'20px 24px'}} className="slide-down">
          <div style={{maxWidth:600,margin:'0 auto',display:'flex',gap:16,flexWrap:'wrap',alignItems:'flex-end'}}>
            <div style={{flex:1}}><label style={{fontSize:12,color:'var(--text2)',display:'block',marginBottom:4}}>Goal Amount</label><CurrIn value={goalEdit.amount||''} onChange={v=>setGoalEdit(p=>({...p,amount:v}))}/></div>
            <div style={{flex:1}}><label style={{fontSize:12,color:'var(--text2)',display:'block',marginBottom:4}}>Start Date</label><input type="date" style={inputS} value={goalEdit.startDate||''} onChange={e=>setGoalEdit(p=>({...p,startDate:e.target.value}))}/></div>
            <div style={{flex:1}}><label style={{fontSize:12,color:'var(--text2)',display:'block',marginBottom:4}}>End Date</label><input type="date" style={inputS} value={goalEdit.endDate||''} onChange={e=>setGoalEdit(p=>({...p,endDate:e.target.value}))}/></div>
            <button style={btnS('var(--gold)',false)} onClick={saveGoal}>Save</button>
          </div>
        </div>
      )}

      {showSplits&&(
        <div style={{background:'var(--surface)',borderBottom:'1px solid var(--border)',padding:'20px 24px'}} className="slide-down">
          <div style={{maxWidth:700,margin:'0 auto'}}>
            <div style={{display:'flex',gap:12,marginBottom:12,flexWrap:'wrap'}}>
              {splitsEdit.map((sp,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:8,border:'1px solid var(--border)',borderRadius:8,padding:'8px 12px',background:'var(--surface2)'}}>
                  <div style={{width:10,height:10,borderRadius:'50%',background:sp.color,flexShrink:0}}/>
                  <span style={{fontSize:13,color:'var(--text)',minWidth:70}}>{sp.label}</span>
                  <input type="number" min="0" max="100" step="1" style={{...inputS,width:60,padding:'4px 8px',fontSize:13,textAlign:'right'}} value={sp.pct} onChange={e=>{const n=[...splitsEdit];n[i]={...n[i],pct:Number(e.target.value)};setSplitsEdit(n);}}/>
                  <span style={{color:'var(--text2)',fontSize:13}}>%</span>
                </div>
              ))}
            </div>
            <div style={{fontSize:12,color:Math.abs(splitsEdit.reduce((s,sp)=>s+toN(sp.pct),0)-100)>0.01?'var(--red)':'var(--green)',marginBottom:10}}>
              Total: {splitsEdit.reduce((s,sp)=>s+toN(sp.pct),0)}% {Math.abs(splitsEdit.reduce((s,sp)=>s+toN(sp.pct),0)-100)>0.01?'(must be 100%)':'✓'}
            </div>
            <div style={{display:'flex',gap:8}}>
              <button style={btnS('var(--gold)',false)} onClick={saveSplits}>Save Splits</button>
              <button style={{...btnS('var(--surface2)',false),color:'var(--text2)'}} onClick={()=>setSplitsEdit(DEFAULT_SPLITS.map(s=>({...s})))}>Reset</button>
            </div>
          </div>
        </div>
      )}

      <div style={{maxWidth:900,margin:'0 auto',padding:'24px 20px'}}>
        {/* Hero */}
        <div style={{...cardS,display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:20,marginBottom:20}}>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:12,color:'var(--text2)',marginBottom:4}}>Total Collected</div>
            <div className="num" style={{fontSize:36,fontWeight:800,color:'var(--gold)'}}>{fmt(total)}</div>
          </div>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:12,color:'var(--text2)',marginBottom:4}}>Goal Progress</div>
            <div className="num" style={{fontSize:36,fontWeight:800,color:goalPct>=100?'var(--green)':goalPct>=50?'var(--gold)':'var(--text)'}}>{goalPct.toFixed(0)}%</div>
            <div style={{height:8,background:'var(--surface3)',borderRadius:4,marginTop:8,overflow:'hidden'}}>
              <div style={{height:'100%',width:goalPct+'%',background:'linear-gradient(90deg,var(--gold),var(--green))',borderRadius:4,transition:'width 0.5s'}}/>
            </div>
          </div>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:12,color:'var(--text2)',marginBottom:4}}>Days Remaining</div>
            <div className="num" style={{fontSize:36,fontWeight:800,color:daysColor}}>{daysLeft}</div>
            <div style={{fontSize:12,color:'var(--text3)',marginTop:4}}>{goal.endDate}</div>
          </div>
        </div>

        {/* Stat cards */}
        <div style={{display:'flex',gap:12,marginBottom:20,flexWrap:'wrap'}}>
          {[['Daily Pace',fmt(pace)+'/day','var(--cyan)'],['Projected',fmt(projected),projected>=goalAmt?'var(--green)':'var(--red)'],['Needed/Day',fmt(neededPerDay)+'/day',neededPerDay<=pace?'var(--green)':'var(--gold)']].map(([l,v,c])=>(
            <div key={l} style={{flex:1,minWidth:140,background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:'14px 16px'}}>
              <div style={{fontSize:12,color:'var(--text2)',marginBottom:4}}>{l}</div>
              <div className="num" style={{fontSize:18,fontWeight:700,color:c}}>{v}</div>
            </div>
          ))}
        </div>

        {/* Scenario projections */}
        <div style={{display:'flex',gap:12,marginBottom:20,flexWrap:'wrap'}}>
          {[['1 deal/wk',total+(9000/7)*daysLeft],['2 deals/wk',total+(9000/7)*2*daysLeft],['3 deals/wk',total+(9000/7)*3*daysLeft]].map(([l,proj])=>(
            <div key={l} style={{flex:1,minWidth:140,background:'var(--surface)',border:`1px solid ${proj>=goalAmt?'var(--green-border)':'var(--border)'}`,borderRadius:12,padding:'14px 16px'}}>
              <div style={{fontSize:12,color:'var(--text2)',marginBottom:4}}>{l}</div>
              <div className="num" style={{fontSize:16,fontWeight:700,color:proj>=goalAmt?'var(--green)':'var(--text)'}}>{fmt(proj)}</div>
              <div style={{fontSize:11,color:proj>=goalAmt?'var(--green)':'var(--red)',marginTop:2}}>{proj>=goalAmt?'✓ Hits Goal':`Short by ${fmt(goalAmt-proj)}`}</div>
            </div>
          ))}
        </div>

        {/* Log Closing */}
        <div style={cardS}>
          <div style={{fontWeight:600,marginBottom:14,fontSize:15}}>Log Closing</div>
          {msg&&<div style={{color:'var(--red)',fontSize:13,marginBottom:10}}>{msg}</div>}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
            <div><label style={{fontSize:12,color:'var(--text2)',display:'block',marginBottom:4}}>Property Address</label><input style={inputS} value={form.address} onChange={e=>setForm(p=>({...p,address:e.target.value}))}/></div>
            <div>
              <label style={{fontSize:12,color:'var(--text2)',display:'block',marginBottom:4}}>Assignment Fee</label>
              <CurrIn value={form.fee} onChange={v=>setForm(p=>({...p,fee:v}))}/>
              {feeN>0&&<div style={{fontSize:11,color:feeColor,marginTop:3}}>{feeN>=12000?'Strong ✓':feeN>=9000?'Good':'Below average'}</div>}
            </div>
            <div><label style={{fontSize:12,color:'var(--text2)',display:'block',marginBottom:4}}>Source</label>
              <select style={inputS} value={form.source} onChange={e=>setForm(p=>({...p,source:e.target.value}))}>{SOURCES.map(s=><option key={s}>{s}</option>)}</select>
            </div>
            <div><label style={{fontSize:12,color:'var(--text2)',display:'block',marginBottom:4}}>Exit Strategy</label>
              <select style={inputS} value={form.exit} onChange={e=>setForm(p=>({...p,exit:e.target.value}))}>{EXITS.map(s=><option key={s}>{s}</option>)}</select>
            </div>
            <div><label style={{fontSize:12,color:'var(--text2)',display:'block',marginBottom:4}}>County</label><input style={inputS} value={form.county} onChange={e=>setForm(p=>({...p,county:e.target.value}))}/></div>
            <div><label style={{fontSize:12,color:'var(--text2)',display:'block',marginBottom:4}}>Close Date</label><input type="date" style={inputS} value={form.closeDate} onChange={e=>setForm(p=>({...p,closeDate:e.target.value}))}/></div>
          </div>
          <button style={btnS('var(--green)',false)} onClick={logDeal} disabled={saving}>{saving?'Saving…':'Log Closing'}</button>
        </div>

        {/* Chart */}
        {chartData.length>0&&(
          <div style={cardS}>
            <div style={{fontWeight:600,marginBottom:14,fontSize:14}}>Revenue Over Time</div>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E8A020" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#E8A020" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                <XAxis dataKey="date" stroke="var(--text3)" tick={{fontSize:11}}/>
                <YAxis stroke="var(--text3)" tick={{fontSize:11}} tickFormatter={v=>'$'+Math.round(v/1000)+'K'}/>
                <Tooltip contentStyle={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8}} formatter={v=>[fmt(v),'Revenue']}/>
                <ReferenceLine y={goalAmt} stroke="var(--green)" strokeDasharray="6 3" label={{value:'Goal',fill:'var(--green)',fontSize:11}}/>
                <Area type="monotone" dataKey="total" stroke="var(--gold)" fill="url(#revGrad)" dot={false} strokeWidth={2}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Breakdowns */}
        {deals.length>0&&(
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16,marginBottom:16}}>
            {[['By Source',bySource],['By Exit',byExit],['By County',byCounty]].map(([title,data])=>(
              <div key={title} style={cardS}>
                <div style={{fontWeight:600,marginBottom:12,fontSize:14}}>{title}</div>
                {Object.entries(data).sort(([,a],[,b])=>b-a).map(([k,v])=>(
                  <div key={k} style={{marginBottom:8}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:3}}>
                      <span style={{fontSize:13,color:'var(--text)'}}>{k}</span>
                      <span className="num" style={{fontSize:12,color:'var(--text2)'}}>{fmt(v)}</span>
                    </div>
                    <div style={{height:3,background:'var(--surface3)',borderRadius:2}}><div style={{height:'100%',width:(v/Math.max(...Object.values(data))*100)+'%',background:'var(--gold)',borderRadius:2}}/></div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Deal log */}
        {deals.length>0&&(
          <div style={cardS}>
            <div style={{fontWeight:600,marginBottom:12,fontSize:15}}>Deal Log</div>
            {[...deals].sort((a,b)=>new Date(b.closeDate)-new Date(a.closeDate)).map(d=>{
              const fee=toN(d.fee);
              const feeCol=fee>=12000?'var(--green)':fee>=9000?'var(--cyan)':'var(--gold)';
              return(
                <div key={d.id} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--border)',flexWrap:'wrap',gap:8}}>
                  <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                    <span className="num" style={{fontSize:12,color:'var(--text3)'}}>{d.closeDate}</span>
                    <span style={{fontSize:14,fontWeight:600,color:'var(--text)'}}>{d.address}</span>
                    <span style={{fontSize:11,padding:'2px 8px',borderRadius:10,background:'var(--cyan-faint)',color:'var(--cyan)',border:'1px solid var(--cyan-border)'}}>{d.source}</span>
                    <span style={{fontSize:11,padding:'2px 8px',borderRadius:10,background:'var(--purple-faint)',color:'var(--purple)',border:'1px solid var(--purple-border)'}}>{d.exit}</span>
                    {d.county&&<span style={{fontSize:12,color:'var(--text2)'}}>{d.county}</span>}
                    <span style={{fontSize:11,padding:'2px 6px',borderRadius:4,background:'var(--surface2)',color:'var(--text3)'}}>{d.loggedBy}</span>
                  </div>
                  <div style={{display:'flex',alignItems:'center',gap:10}}>
                    <span className="num" style={{fontSize:16,fontWeight:700,color:feeCol}}>{fmt(fee)}</span>
                    <button onClick={()=>deleteDeal(d.id)} style={{background:'none',border:'none',color:'var(--text3)',cursor:'pointer',fontSize:16}}>✕</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Split allocation */}
        {total>0&&splits.length>0&&(
          <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:16}}>
            {splits.map(sp=>(
              <div key={sp.label} style={{flex:1,minWidth:120,border:`1px solid ${sp.color}44`,borderRadius:12,padding:'14px 16px',background:sp.color+'0a'}}>
                <div style={{fontSize:12,color:'var(--text2)',marginBottom:4}}>{sp.label}</div>
                <div className="num" style={{fontSize:18,fontWeight:700,color:sp.color}}>{fmt(total*sp.pct/100)}</div>
                <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>{sp.pct}%</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
