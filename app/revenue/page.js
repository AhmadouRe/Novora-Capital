'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AreaChart, Area, ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer, Legend } from 'recharts';
import DatePicker from '../components/DatePicker.js';

const toN=v=>{const n=Number(String(v||'').replace(/[^0-9.-]/g,''));return isNaN(n)?0:n;};
const fmt=n=>Number(n||0).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
const pct=(a,b)=>b>0?Math.round(a/b*100):0;
const todayISO=()=>new Date().toISOString().slice(0,10);

const INPUT={minHeight:48,padding:'12px 16px',borderRadius:10,background:'var(--surface3)',border:'1px solid var(--border)',color:'var(--text)',fontSize:15,outline:'none',fontFamily:'Outfit,sans-serif',width:'100%',transition:'border-color 0.15s'};
const LBL={fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.11em',color:'var(--text3)',marginBottom:8,display:'block'};
const CARD={background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'20px 24px',marginBottom:14};
const SEC={fontSize:13,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.12em',color:'var(--text3)',marginBottom:14};

const DEFAULT_SPLITS=[
  {label:'Taxes',pct:30,color:'#EF4444'},
  {label:'Marketing',pct:30,color:'#E8A020'},
  {label:'Reserve',pct:20,color:'#A78BFA'},
  {label:'Owner Pay',pct:10,color:'#22C55E'},
  {label:'Operating',pct:10,color:'#06B6D4'},
];

const CHART_TOOLTIP={contentStyle:{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'12px 16px'},labelStyle:{color:'var(--text2)',marginBottom:4,fontSize:12}};
const SOURCES=['WCL/Propwire','SMS Outreach','JV Partner','FSBO','Cold Call','Direct Mail','Other'];
const EXIT_STRATS=['Assignment','Novation'];

export default function RevenueDashboard({searchParams}){
  const router=useRouter();
  const [isMobile,setIsMobile]=useState(false);
  const [deals,setDeals]=useState([]);
  const [goalData,setGoalData]=useState(null);
  const [splits,setSplits]=useState(DEFAULT_SPLITS);
  const [loading,setLoading]=useState(true);
  const [showGoalModal,setShowGoalModal]=useState(false);
  const [showSplitsModal,setShowSplitsModal]=useState(false);
  const [expandedDeal,setExpandedDeal]=useState(null);
  const [session,setSession]=useState(null);

  // Log form
  const [address,setAddress]=useState('');
  const [fee,setFee]=useState('');
  const [source,setSource]=useState('WCL/Propwire');
  const [exitStrat,setExitStrat]=useState('Assignment');
  const [county,setCounty]=useState('');
  const [closeDate,setCloseDate]=useState(todayISO());
  const [saving,setSaving]=useState(false);
  const [savedMsg,setSavedMsg]=useState('');

  // Goal modal
  const [gAmt,setGAmt]=useState('');
  const [gStart,setGStart]=useState('');
  const [gEnd,setGEnd]=useState('');
  const [gAvg,setGAvg]=useState('');

  // Splits modal
  const [editSplits,setEditSplits]=useState(DEFAULT_SPLITS);

  useEffect(()=>{const c=()=>setIsMobile(window.innerWidth<768);c();window.addEventListener('resize',c);return()=>window.removeEventListener('resize',c);},[]);

  useEffect(()=>{
    Promise.all([
      fetch('/api/auth/session').then(r=>r.json()).catch(()=>null),
      fetch('/api/revenue/deals').then(r=>r.json()).catch(()=>[]),
      fetch('/api/revenue/goal').then(r=>r.json()).catch(()=>null),
      fetch('/api/revenue/splits').then(r=>r.json()).catch(()=>DEFAULT_SPLITS),
    ]).then(([sess,dealsData,goalD,splitsD])=>{
      setSession(sess);
      if(!sess?.access?.revenue){setLoading(false);return;}
      if(Array.isArray(dealsData))setDeals(dealsData);
      if(goalD?.amount)setGoalData(goalD);
      if(Array.isArray(splitsD))setSplits(splitsD);
      setLoading(false);
    });
  },[]);

  if(loading) return <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text3)',fontSize:15}}>Loading...</div>;
  if(!session?.access?.revenue) return (
    <div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:16}}>
      <div style={{fontSize:48}}>🔒</div>
      <div style={{fontSize:20,fontWeight:800,color:'var(--text)'}}>Access Restricted</div>
      <div style={{fontSize:15,color:'var(--text3)'}}>You don't have access to Revenue. Contact Ahmadou.</div>
      <button onClick={()=>router.push('/')} style={{marginTop:8,padding:'12px 28px',borderRadius:10,border:'none',background:'var(--gold)',color:'#000',fontWeight:800,fontSize:14,cursor:'pointer'}}>← Back to Home</button>
    </div>
  );

  const goalAmt=goalData?.amount||50000;
  const startDate=goalData?.startDate?new Date(goalData.startDate):new Date('2026-01-01');
  const endDate=goalData?.endDate?new Date(goalData.endDate):new Date('2026-07-25');
  const totalDays=Math.max(1,Math.ceil((endDate-startDate)/86400000));
  const now=new Date();
  const daysElapsed=Math.max(1,Math.ceil((now-startDate)/86400000));
  const daysLeft=Math.max(0,Math.ceil((endDate-now)/86400000));

  const totalRevenue=deals.reduce((s,d)=>s+toN(d.fee),0);
  const dealCount=deals.length;
  const avgFee=dealCount>0?Math.round(totalRevenue/dealCount):9000;
  const goalPct=pct(totalRevenue,goalAmt);
  const remaining=Math.max(0,goalAmt-totalRevenue);
  const dealsNeeded=Math.ceil(remaining/avgFee);
  const dailyPace=daysElapsed>0?Math.round(totalRevenue/daysElapsed):0;
  const projected=Math.round(dailyPace*totalDays);
  const neededPerDay=daysLeft>0?Math.round(remaining/daysLeft):0;

  const paceStatus=projected>=goalAmt*1.10?'AHEAD':projected>=goalAmt*0.90?'ON TRACK':'BEHIND';
  const paceColor=paceStatus==='AHEAD'?'var(--green)':paceStatus==='ON TRACK'?'var(--gold)':'var(--red)';

  const goalPctColor=goalPct>=90?'var(--green)':goalPct>=60?'var(--gold)':'var(--red)';
  const avgColor=avgFee>=9000?'var(--green)':avgFee>=6000?'var(--gold)':'var(--red)';

  // Monthly performance
  const months=[];
  let cur=new Date(startDate.getFullYear(),startDate.getMonth(),1);
  while(cur<=endDate){
    const y=cur.getFullYear(),m=cur.getMonth();
    const monthDeals=deals.filter(d=>{const dd=new Date(d.date||d.loggedAt);return dd.getFullYear()===y&&dd.getMonth()===m;});
    const monthRev=monthDeals.reduce((s,d)=>s+toN(d.fee),0);
    months.push({name:cur.toLocaleDateString('en-US',{month:'short'}),deals:monthDeals.length,revenue:monthRev,avg:monthDeals.length>0?Math.round(monthRev/monthDeals.length):0});
    cur=new Date(y,m+1,1);
  }

  // Cumulative chart
  const sortedDeals=[...deals].sort((a,b)=>new Date(a.date||a.loggedAt)-new Date(b.date||b.loggedAt));
  let running=0;
  const cumData=sortedDeals.map(d=>{running+=toN(d.fee);return{date:(d.date||d.loggedAt?.slice(0,10)),cumulative:running,fee:toN(d.fee),address:d.address};});
  const yMax=Math.round(goalAmt*1.1);

  // Deal log source/county/exit breakdowns
  function groupBy(key){
    const map={};
    deals.forEach(d=>{const k=d[key]||'Unknown';if(!map[k])map[k]={rev:0,count:0};map[k].rev+=toN(d.fee);map[k].count++;});
    return Object.entries(map).map(([k,v])=>({key:k,...v,avg:v.count>0?Math.round(v.rev/v.count):0})).sort((a,b)=>b.rev-a.rev);
  }
  const bySource=groupBy('source');
  const byCounty=groupBy('county');
  const byExit=groupBy('exitStrategy');

  // Total splits
  const totalSplitAmts=splits.map(s=>({...s,amount:Math.round(totalRevenue*s.pct/100)}));

  // Scenarios
  const scenarioAvg=avgFee||9000;
  const scenarios=[
    {label:'1 deal per 2 weeks',daysPerDeal:14},
    {label:'1 deal per week',daysPerDeal:7},
    {label:'2 deals per week',daysPerDeal:3.5},
  ].map(s=>{const proj=Math.round((totalDays/s.daysPerDeal)*scenarioAvg)+totalRevenue;return{...s,proj,hits:proj>=goalAmt,short:Math.max(0,goalAmt-proj)};});

  async function logDeal(){
    if(!address.trim()||!fee)return;
    setSaving(true);
    const body={address:address.trim(),fee:toN(fee),source,exitStrategy:exitStrat,county:county.trim(),date:closeDate};
    const res=await fetch('/api/revenue/deals',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(res.ok){
      const d=await res.json();
      setDeals(prev=>[d,...prev]);
      setAddress('');setFee('');setCounty('');setCloseDate(todayISO());
      setSavedMsg('Deal logged!');setTimeout(()=>setSavedMsg(''),2500);
    }
    setSaving(false);
  }

  async function deleteDeal(id){
    if(!confirm('Delete this deal?'))return;
    await fetch(`/api/revenue/deals/${id}`,{method:'DELETE'});
    setDeals(ds=>ds.filter(d=>d.id!==id));
  }

  async function saveGoal(){
    await fetch('/api/revenue/goal',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({amount:toN(gAmt),startDate:gStart,endDate:gEnd,avgDeal:gAvg?toN(gAvg):undefined})});
    fetch('/api/revenue/goal').then(r=>r.json()).then(d=>{if(d?.amount)setGoalData(d);});
    setShowGoalModal(false);
  }

  async function saveEditSplits(){
    const total=editSplits.reduce((s,x)=>s+Number(x.pct),0);
    if(Math.abs(total-100)>0.01){alert(`Total is ${total}% — must equal exactly 100%.`);return;}
    await fetch('/api/revenue/splits',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(editSplits)});
    setSplits(editSplits);
    setShowSplitsModal(false);
  }

  const feeN=toN(fee);
  const liveSplits=feeN>0?splits.map(s=>({...s,amount:Math.round(feeN*s.pct/100)})):null;
  const dealRating=feeN>=12000?{l:'STRONG',c:'var(--green)'}:feeN>=9000?{l:'GOOD',c:'var(--cyan)'}:feeN>=6000?{l:'VIABLE',c:'var(--gold)'}:feeN>0?{l:'BELOW MIN',c:'var(--red)'}:null;

  const p=isMobile?16:24;

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)',paddingBottom:isMobile?80:40}}>
      <nav style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:`0 ${p}px`,height:58,background:'var(--surface)',borderBottom:'1px solid var(--border)',position:'sticky',top:0,zIndex:100}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button onClick={()=>router.push('/')} style={{background:'none',border:'none',color:'var(--text3)',fontSize:20,cursor:'pointer',padding:'4px 8px',borderRadius:6}}>←</button>
          <span style={{fontWeight:700,fontSize:16,color:'var(--text)'}}>Revenue Dashboard</span>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button onClick={()=>{setGAmt(String(goalAmt));setGStart(goalData?.startDate||'');setGEnd(goalData?.endDate||'');setGAvg(String(goalData?.avgDeal||''));setShowGoalModal(true);}} style={{padding:'6px 14px',borderRadius:8,border:'1px solid var(--border)',background:'var(--surface2)',color:'var(--text2)',fontSize:13,fontWeight:600,cursor:'pointer',minHeight:36}}>⚙ Goal</button>
          {session?.access?.manageTeam&&<button onClick={()=>{setEditSplits(splits);setShowSplitsModal(true);}} style={{padding:'6px 14px',borderRadius:8,border:'1px solid var(--border)',background:'var(--surface2)',color:'var(--text2)',fontSize:13,fontWeight:600,cursor:'pointer',minHeight:36}}>Splits</button>}
        </div>
      </nav>

      <div style={{maxWidth:960,margin:'0 auto',padding:`${isMobile?16:28}px ${p}px`}}>

        {/* Section 1 — Hero */}
        <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(4,1fr)',gap:12,marginBottom:14}}>
          {[
            {l:'Total Collected',v:fmt(totalRevenue),sub:`${dealCount} deals closed`,c:'var(--gold)'},
            {l:'Goal Progress',v:goalPct+'%',sub:`${fmt(remaining)} remaining`,c:goalPctColor},
            {l:'Deals Closed',v:String(dealCount),sub:`avg ${fmt(avgFee)} per deal`,c:'var(--text)'},
            {l:'Avg Deal Size',v:fmt(avgFee),sub:'target $9,000+',c:'var(--cyan)',subC:avgColor},
          ].map(s=>(
            <div key={s.l} style={{...CARD,textAlign:'center',padding:'20px 14px',marginBottom:0}}>
              <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:isMobile?28:32,fontWeight:900,color:s.c,lineHeight:1,marginBottom:8}}>{s.v}</div>
              <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--text3)',marginBottom:6}}>{s.l}</div>
              <div style={{fontSize:12,color:s.subC||'var(--text3)'}}>{s.sub}</div>
            </div>
          ))}
        </div>

        {/* Status banner */}
        <div style={{padding:'14px 20px',borderRadius:12,background:paceColor+'10',border:`1px solid ${paceColor}40`,marginBottom:14,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:10}}>
          <span style={{fontWeight:800,color:paceColor,fontSize:16}}>{paceStatus}</span>
          <span style={{fontSize:13,color:'var(--text2)'}}>Daily pace: <span style={{fontFamily:'JetBrains Mono,monospace',color:'var(--text)'}}>{fmt(dailyPace)}/day</span> · Projected: <span style={{fontFamily:'JetBrains Mono,monospace',color:'var(--text)'}}>{fmt(projected)}</span> · Needed/day: <span style={{fontFamily:'JetBrains Mono,monospace',color:'var(--text)'}}>{fmt(neededPerDay)}</span></span>
        </div>
        <div style={{height:10,borderRadius:5,background:'var(--surface3)',overflow:'hidden',marginBottom:6}}>
          <div style={{height:'100%',borderRadius:5,width:`${Math.min(100,goalPct)}%`,background:'linear-gradient(90deg,var(--gold),var(--green))',transition:'width 0.5s ease'}}/>
        </div>
        <div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:'var(--text3)',marginBottom:16}}>
          <span>{goalPct}% complete</span><span>Ends {endDate.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span>
        </div>

        {/* Section 2 — Pace */}
        <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(4,1fr)',gap:12,marginBottom:14}}>
          {[
            {l:'Daily Pace',v:fmt(dailyPace),c:'var(--text)'},
            {l:'Projected Total',v:fmt(projected),c:paceColor},
            {l:'Needed Per Day',v:fmt(neededPerDay),c:remaining>0?'var(--red)':'var(--green)'},
            {l:'Deals Needed',v:String(dealsNeeded),c:dealsNeeded>0?'var(--gold)':'var(--green)'},
          ].map(s=>(
            <div key={s.l} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:'14px',textAlign:'center'}}>
              <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:22,fontWeight:800,color:s.c,marginBottom:4}}>{s.v}</div>
              <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.07em',color:'var(--text3)'}}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Section 3 — Log a Deal */}
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderLeft:'3px solid var(--green)',borderRadius:14,padding:'20px 24px',marginBottom:14}}>
          <div style={SEC}>Log a Closing</div>
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:12,marginBottom:14}}>
            <div style={{gridColumn:isMobile?'1':'1/-1'}}>
              <label style={LBL}>Property Address <span style={{color:'var(--red)'}}>*</span></label>
              <input style={INPUT} value={address} onChange={e=>setAddress(e.target.value)} placeholder="123 Main St, Cleveland OH" onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/>
            </div>
            <div>
              <label style={LBL}>Assignment Fee <span style={{color:'var(--red)'}}>*</span></label>
              <div style={{position:'relative'}}><span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text3)',pointerEvents:'none',zIndex:1}}>$</span>
              <input style={{...INPUT,paddingLeft:24,fontFamily:'JetBrains Mono,monospace',fontSize:18}} type="number" value={fee} onChange={e=>setFee(e.target.value)} placeholder="" onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/></div>
              {dealRating&&<div style={{marginTop:6,display:'inline-flex',alignItems:'center',gap:6}}><span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:dealRating.c+'18',color:dealRating.c,border:`1px solid ${dealRating.c}40`,fontWeight:700}}>{dealRating.l}</span></div>}
            </div>
            <div>
              <label style={LBL}>Source</label>
              <select style={{...INPUT,height:48}} value={source} onChange={e=>setSource(e.target.value)}>
                {SOURCES.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={LBL}>Exit Strategy</label>
              <select style={{...INPUT,height:48}} value={exitStrat} onChange={e=>setExitStrat(e.target.value)}>
                {EXIT_STRATS.map(s=><option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={LBL}>County</label>
              <input style={INPUT} value={county} onChange={e=>setCounty(e.target.value)} placeholder="e.g. Cuyahoga" onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/>
            </div>
            <div><DatePicker label="Close Date" value={closeDate} onChange={setCloseDate}/></div>
          </div>

          {liveSplits&&(
            <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:14}}>
              {liveSplits.map(s=>(
                <div key={s.label} style={{padding:'8px 14px',borderRadius:8,background:'var(--surface3)',border:'1px solid var(--border)',textAlign:'center',flex:1,minWidth:80}}>
                  <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:14,fontWeight:700,color:s.color||'var(--text)'}}>{fmt(s.amount)}</div>
                  <div style={{fontSize:10,color:'var(--text3)',marginTop:2}}>{s.label}</div>
                  <div style={{fontSize:10,color:'var(--text3)'}}>{s.pct}%</div>
                </div>
              ))}
            </div>
          )}

          <button onClick={logDeal} disabled={saving} style={{width:'100%',minHeight:52,borderRadius:10,border:'none',background:'var(--green)',color:'#000',fontWeight:800,fontSize:15,cursor:'pointer',transition:'all 0.15s'}}>
            {saving?'Logging...':savedMsg||'Log Closing'}
          </button>
        </div>

        {/* Section 4 — Monthly Performance */}
        {months.length>0&&(
          <div style={CARD}>
            <div style={SEC}>Monthly Performance</div>
            <ResponsiveContainer width="100%" height={isMobile?180:240}>
              <ComposedChart data={months} margin={{top:0,right:10,bottom:0,left:-20}}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="name" tick={{fontSize:12,fill:'var(--text3)'}} axisLine={false} tickLine={false}/>
                <YAxis yAxisId="rev" tick={{fontSize:12,fill:'var(--text3)'}} axisLine={false} tickLine={false} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`}/>
                <YAxis yAxisId="cnt" orientation="right" tick={{fontSize:12,fill:'var(--text3)'}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'12px 16px'}} labelStyle={{color:'var(--text2)',fontSize:12}} formatter={(v,n)=>n==='Deals'?v:fmt(v)}/>
                <Bar yAxisId="rev" dataKey="revenue" name="Revenue" fill="rgba(232,160,32,0.40)" radius={[4,4,0,0]}/>
                <Line yAxisId="cnt" type="monotone" dataKey="deals" name="Deals" stroke="var(--cyan)" strokeWidth={2} dot={false}/>
                <Legend wrapperStyle={{fontSize:13,color:'var(--text2)'}}/>
              </ComposedChart>
            </ResponsiveContainer>
            <div style={{overflowX:'auto',marginTop:14}}>
              <table style={{width:'100%',borderCollapse:'collapse',fontSize:13}}>
                <thead><tr>{['Month','Deals','Total Fee','Avg Fee','% of Goal'].map(h=><th key={h} style={{textAlign:h==='Month'?'left':'right',padding:'8px 10px',color:'var(--text3)',fontWeight:600,fontSize:11,textTransform:'uppercase',borderBottom:'1px solid var(--border)'}}>{h}</th>)}</tr></thead>
                <tbody>
                  {months.map((m,i)=><tr key={i}>{[m.name,m.deals,fmt(m.revenue),m.avg>0?fmt(m.avg):'—',pct(m.revenue,goalAmt)+'%'].map((v,j)=><td key={j} style={{textAlign:j===0?'left':'right',padding:'8px 10px',fontFamily:j>0?'JetBrains Mono,monospace':'Outfit,sans-serif',color:'var(--text2)',borderBottom:'1px solid var(--border)'}}>{v}</td>)}</tr>)}
                  <tr>{['Total',dealCount,fmt(totalRevenue),avgFee>0?fmt(avgFee):'—',pct(totalRevenue,goalAmt)+'%'].map((v,j)=><td key={j} style={{textAlign:j===0?'left':'right',padding:'10px 10px',fontFamily:'JetBrains Mono,monospace',color:'var(--text)',fontWeight:700,borderTop:'2px solid var(--border)'}}>{v}</td>)}</tr>
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Section 5 — Cumulative Chart */}
        {cumData.length>0&&(
          <div style={CARD}>
            <div style={SEC}>Cumulative Revenue</div>
            <ResponsiveContainer width="100%" height={isMobile?180:280}>
              <AreaChart data={cumData} margin={{top:0,right:10,bottom:0,left:-10}}>
                <defs>
                  <linearGradient id="goldGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="var(--gold)" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="var(--gold)" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                <XAxis dataKey="date" tick={{fontSize:11,fill:'var(--text3)'}} axisLine={false} tickLine={false}/>
                <YAxis domain={[0,yMax]} tickFormatter={v=>`$${(v/1000).toFixed(0)}k`} tick={{fontSize:11,fill:'var(--text3)'}} axisLine={false} tickLine={false}/>
                <Tooltip contentStyle={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'12px 16px'}} formatter={(v,n)=>[fmt(v),n]} labelFormatter={l=>l}/>
                <ReferenceLine y={goalAmt} stroke="var(--green)" strokeDasharray="6 3" label={{value:'Goal',fill:'var(--green)',fontSize:12}}/>
                <Area type="stepAfter" dataKey="cumulative" name="Revenue" stroke="var(--gold)" strokeWidth={2} fill="url(#goldGrad)" dot={false}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Section 6 — Deal Log */}
        {deals.length>0&&(
          <div style={CARD}>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <span style={SEC}>Deal Log</span>
              <span style={{fontSize:12,padding:'2px 10px',borderRadius:20,background:'var(--surface3)',color:'var(--text3)',border:'1px solid var(--border)'}}>{deals.length} deals</span>
            </div>
            {[...deals].sort((a,b)=>new Date(b.date||b.loggedAt)-new Date(a.date||a.loggedAt)).map(deal=>{
              const feeAmt=toN(deal.fee);
              const feeCol=feeAmt>=12000?'var(--green)':feeAmt>=9000?'var(--cyan)':'var(--gold)';
              const isExp=expandedDeal===deal.id;
              return(
                <div key={deal.id} style={{marginBottom:8}}>
                  <div onClick={()=>setExpandedDeal(isExp?null:deal.id)} style={{display:'flex',alignItems:'center',gap:10,padding:'14px 16px',borderRadius:isExp?'10px 10px 0 0':10,background:'var(--surface3)',border:'1px solid var(--border)',cursor:'pointer',flexWrap:'wrap'}}>
                    <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,color:'var(--text3)',minWidth:72}}>{deal.date||deal.loggedAt?.slice(0,10)}</span>
                    <span style={{flex:1,fontSize:15,fontWeight:700,color:'var(--text)'}}>{deal.address||'No address'}</span>
                    <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                      {deal.source&&<span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:'var(--surface2)',color:'var(--text3)',border:'1px solid var(--border)'}}>{deal.source}</span>}
                      {deal.exitStrategy&&<span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:'var(--surface2)',color:'var(--cyan)',border:'1px solid var(--cyan-border)'}}>{deal.exitStrategy}</span>}
                      {deal.county&&<span style={{fontSize:11,color:'var(--text3)'}}>{deal.county}</span>}
                      {deal.loggedBy&&<span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:'var(--gold-faint)',color:'var(--gold)',border:'1px solid var(--gold-border)',fontWeight:700}}>{deal.loggedBy}</span>}
                    </div>
                    <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:18,fontWeight:900,color:feeCol}}>{fmt(feeAmt)}</span>
                    <div style={{display:'flex',gap:6}}>
                      <button onClick={e=>{e.stopPropagation();deleteDeal(deal.id);}} style={{padding:'4px 10px',borderRadius:6,border:'1px solid var(--red-border)',background:'var(--red-faint)',color:'var(--red)',cursor:'pointer',fontSize:12}}>×</button>
                    </div>
                  </div>
                  {isExp&&(
                    <div style={{padding:'14px 16px',background:'var(--surface2)',border:'1px solid var(--border)',borderTop:'none',borderRadius:'0 0 10px 10px',display:'flex',gap:8,flexWrap:'wrap'}}>
                      {splits.map(s=><div key={s.label} style={{flex:1,minWidth:80,padding:'10px',borderRadius:8,background:'var(--surface3)',textAlign:'center'}}>
                        <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:14,fontWeight:700,color:s.color||'var(--text)'}}>{fmt(Math.round(feeAmt*s.pct/100))}</div>
                        <div style={{fontSize:10,color:'var(--text3)',marginTop:2}}>{s.label} ({s.pct}%)</div>
                      </div>)}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Section 7 — Cash Split Totals */}
        {deals.length>0&&(
          <div style={CARD}>
            <div style={SEC}>Total Cash Allocation</div>
            <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
              {totalSplitAmts.map(s=>(
                <div key={s.label} style={{flex:1,minWidth:120,padding:'14px',borderRadius:10,background:'var(--surface3)',border:'1px solid var(--border)',textAlign:'center'}}>
                  <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:20,fontWeight:800,color:s.color||'var(--text)',marginBottom:6}}>{fmt(s.amount)}</div>
                  <div style={{fontSize:12,fontWeight:700,color:'var(--text2)',marginBottom:4}}>{s.label}</div>
                  <div style={{fontSize:12,color:'var(--text3)'}}>{s.pct}%</div>
                  <div style={{height:4,borderRadius:2,background:'var(--surface2)',overflow:'hidden',marginTop:8}}>
                    <div style={{height:'100%',background:s.color||'var(--gold)',borderRadius:2,width:`${s.pct}%`}}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 8 — Breakdowns */}
        {deals.length>0&&(
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:12,marginBottom:14}}>
            {[{title:'By Source',data:bySource,key:'key'},{title:'By County',data:byCounty,key:'key'},{title:'By Exit Strategy',data:byExit,key:'key'}].map(({title,data})=>(
              <div key={title} style={CARD}>
                <div style={SEC}>{title}</div>
                {data.map((row,i)=>(
                  <div key={i} style={{marginBottom:10}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                      <span style={{fontSize:13,color:'var(--text2)',fontWeight:600}}>{row.key}</span>
                      <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:13,color:'var(--gold)',fontWeight:700}}>{fmt(row.rev)}</span>
                    </div>
                    <div style={{fontSize:11,color:'var(--text3)',marginBottom:4}}>{row.count} deal{row.count!==1?'s':''} · avg {fmt(row.avg)}</div>
                    <div style={{height:4,borderRadius:2,background:'var(--surface3)',overflow:'hidden'}}>
                      <div style={{height:'100%',borderRadius:2,background:'var(--gold)',width:`${pct(row.rev,totalRevenue)}%`}}/>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        {/* Section 9 — Scenarios */}
        <div style={CARD}>
          <div style={SEC}>Scenario Projections — based on actual {fmt(scenarioAvg)} avg deal</div>
          <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:12,marginBottom:14}}>
            {scenarios.map(s=>(
              <div key={s.label} style={{padding:'16px',borderRadius:10,background:'var(--surface3)',border:`1px solid ${s.hits?'var(--green-border)':'var(--border)'}`,textAlign:'center'}}>
                <div style={{fontSize:13,color:'var(--text2)',marginBottom:8}}>{s.label}</div>
                <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:20,fontWeight:800,color:'var(--text)',marginBottom:6}}>{fmt(s.proj)}</div>
                {s.hits?<span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:'var(--green-faint)',color:'var(--green)',border:'1px solid var(--green-border)',fontWeight:700}}>Hits Goal ✓</span>:
                <span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:'var(--red-faint)',color:'var(--red)',border:'1px solid var(--red-border)',fontWeight:700}}>Short by {fmt(s.short)}</span>}
              </div>
            ))}
          </div>
          {daysLeft>0&&dealsNeeded>0&&avgFee>0&&<div style={{fontSize:13,color:'var(--text3)',textAlign:'center'}}>Minimum pace — close 1 deal every <span style={{color:'var(--text2)',fontWeight:700}}>{Math.ceil(daysLeft/dealsNeeded)} days</span> at <span style={{color:'var(--text2)',fontWeight:700}}>{fmt(avgFee)} avg</span> to hit goal.</div>}
        </div>
      </div>

      {/* Goal Modal */}
      {showGoalModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowGoalModal(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:20,width:480,maxWidth:'95vw',padding:'28px'}}>
            <div style={{fontWeight:900,fontSize:20,color:'var(--text)',marginBottom:20}}>Goal Settings</div>
            <div style={{display:'flex',flexDirection:'column',gap:14}}>
              <div><label style={LBL}>Goal Amount</label>
                <div style={{position:'relative'}}><span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text3)',pointerEvents:'none',zIndex:1}}>$</span>
                <input style={{...INPUT,paddingLeft:24}} type="number" value={gAmt} onChange={e=>setGAmt(e.target.value)}/></div>
              </div>
              <DatePicker label="Start Date" value={gStart} onChange={setGStart}/>
              <DatePicker label="End Date" value={gEnd} onChange={setGEnd}/>
              <div><label style={LBL}>Avg Deal Size Override (optional)</label>
                <div style={{position:'relative'}}><span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text3)',pointerEvents:'none',zIndex:1}}>$</span>
                <input style={{...INPUT,paddingLeft:24}} type="number" value={gAvg} onChange={e=>setGAvg(e.target.value)}/></div>
              </div>
              <button onClick={saveGoal} style={{minHeight:46,borderRadius:10,border:'none',background:'var(--gold)',color:'#000',fontWeight:800,fontSize:14,cursor:'pointer'}}>Save Goal</button>
            </div>
          </div>
        </div>
      )}

      {/* Splits Modal */}
      {showSplitsModal&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:1000,display:'flex',alignItems:'center',justifyContent:'center',padding:16}} onClick={()=>setShowSplitsModal(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:20,width:480,maxWidth:'95vw',padding:'28px'}}>
            <div style={{fontWeight:900,fontSize:20,color:'var(--text)',marginBottom:20}}>Split Settings</div>
            <div style={{display:'flex',flexDirection:'column',gap:10,marginBottom:14}}>
              {editSplits.map((s,i)=>(
                <div key={s.label} style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px',borderRadius:10,background:'var(--surface2)',border:'1px solid var(--border)'}}>
                  <div style={{width:12,height:12,borderRadius:'50%',background:s.color,flexShrink:0}}/>
                  <span style={{flex:1,fontSize:14,fontWeight:600,color:'var(--text)'}}>{s.label}</span>
                  <input type="number" value={s.pct} onChange={e=>setEditSplits(sp=>sp.map((x,j)=>j===i?{...x,pct:Number(e.target.value)}:x))} style={{width:60,minHeight:38,padding:'6px 10px',borderRadius:8,background:'var(--surface3)',border:'1px solid var(--border)',color:'var(--text)',fontSize:14,textAlign:'right',outline:'none'}}/>
                  <span style={{color:'var(--text3)',fontSize:13}}>%</span>
                </div>
              ))}
              {(()=>{const tot=editSplits.reduce((s,x)=>s+Number(x.pct),0);return <div style={{padding:'8px 12px',borderRadius:8,background:Math.abs(tot-100)>0.01?'var(--red-faint)':'var(--green-faint)',color:Math.abs(tot-100)>0.01?'var(--red)':'var(--green)',fontSize:13,fontWeight:700}}>Total: {tot}% {Math.abs(tot-100)>0.01?'— must be 100%':'✓'}</div>;})()}
            </div>
            <div style={{display:'flex',gap:10}}>
              <button onClick={()=>setEditSplits(DEFAULT_SPLITS)} style={{flex:1,minHeight:46,borderRadius:10,border:'1px solid var(--border)',background:'var(--surface3)',color:'var(--text2)',fontWeight:700,cursor:'pointer'}}>Reset</button>
              <button onClick={saveEditSplits} style={{flex:1,minHeight:46,borderRadius:10,border:'none',background:'var(--gold)',color:'#000',fontWeight:800,cursor:'pointer'}}>Save Splits</button>
            </div>
          </div>
        </div>
      )}

      {isMobile&&(
        <nav style={{position:'fixed',bottom:0,left:0,right:0,height:64,background:'var(--surface)',borderTop:'1px solid var(--border)',display:'flex',alignItems:'center',zIndex:100}}>
          {[{href:'/',icon:'⌂',label:'Home'},{href:'/calculator',icon:'◈',label:'Offers'},{href:'/kpi',icon:'◉',label:'KPI'},{href:'/revenue',icon:'◆',label:'Revenue'},{href:'/scorecard',icon:'◐',label:'Score'}].map(item=>(
            <div key={item.href} onClick={()=>router.push(item.href)} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:2,cursor:'pointer',color:item.href==='/revenue'?'var(--gold)':'var(--text3)'}}>
              <span style={{fontSize:18}}>{item.icon}</span><span style={{fontSize:10,fontWeight:600}}>{item.label}</span>
            </div>
          ))}
        </nav>
      )}
    </div>
  );
}
