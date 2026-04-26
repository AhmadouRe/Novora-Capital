'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

function toN(v) { const n = parseFloat(String(v||0).replace(/[^0-9.]/g,'')); return isNaN(n)?0:n; }
function pct(a,b){return b>0?((a/b)*100).toFixed(1)+'%':'0%';}
const TODAY = new Date().toISOString().slice(0,10);
const navS = { display:'flex', alignItems:'center', justifyContent:'space-between', padding:'0 24px', height:56, background:'var(--surface)', borderBottom:'1px solid var(--border)', position:'sticky', top:0, zIndex:50 };
const cardS = (border) => ({ background:'var(--surface)', border:`1px solid ${border||'var(--border)'}`, borderRadius:14, padding:20, marginBottom:16 });
const inputS = { width:'100%', padding:'9px 12px', background:'var(--surface2)', border:'1px solid var(--border)', borderRadius:8, color:'var(--text)', fontSize:14 };
const btnS = (c,light) => ({ padding:'8px 16px', borderRadius:8, border:'none', background: light?c+'18':c, color: light?c:'#000', fontWeight:600, fontSize:13, cursor:'pointer' });
const FILTER_STACKS = ['Absentee+Tax Delinquent+Equity','Absentee+Equity','Tax Delinquent+Equity','Absentee Only','Pre-Foreclosure','Probate','High Equity','Custom'];
const REJECTION_REASONS = ['Bad comps','No equity','Luxury price','Lot/land','Bad area','Wrong market','Already listed','Other'];
const PALETTE = ['#E8A020','#06B6D4','#22C55E','#EF4444','#A78BFA','#F472B6'];

function Badge({label, color}){return <span style={{fontSize:11,padding:'2px 8px',borderRadius:10,background:color+'18',color,border:`1px solid ${color}44`,fontWeight:600}}>{label}</span>;}
function StatCard({label,value,color,sub}){return(
  <div style={{background:'var(--surface2)',borderRadius:10,padding:'14px 16px',flex:1}}>
    <div style={{fontSize:12,color:'var(--text2)',marginBottom:4}}>{label}</div>
    <div className="num" style={{fontSize:22,fontWeight:700,color:color||'var(--text)'}}>{value}</div>
    {sub&&<div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>{sub}</div>}
  </div>
);}

function DiagRow({label,value,target,unit,reverse}){
  const v=toN(value); const t=toN(target);
  const ok = reverse ? v<=t : v>=t;
  const p2 = t>0?Math.min(100,(v/t)*100):0;
  return(
    <div style={{marginBottom:12}}>
      <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
        <span style={{fontSize:13,color:'var(--text)'}}>{label}</span>
        <div style={{display:'flex',alignItems:'center',gap:8}}>
          <span className="num" style={{fontSize:13,color:'var(--text)',fontWeight:600}}>{value}{unit}</span>
          <span style={{fontSize:11,padding:'1px 8px',borderRadius:4,background:ok?'var(--green-faint)':'var(--red-faint)',color:ok?'var(--green)':'var(--red)',border:`1px solid ${ok?'var(--green-border)':'var(--red-border)'}`}}>{ok?'ON':'LOW'}</span>
        </div>
      </div>
      <div style={{height:4,borderRadius:2,background:'var(--surface3)'}}>
        <div style={{height:'100%',borderRadius:2,width:p2+'%',background:ok?'var(--green)':'var(--gold)',transition:'width 0.3s'}}/>
      </div>
      <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>Target: {target}{unit}</div>
    </div>
  );
}

export default function KpiPage(){
  const router=useRouter();
  const [sessionOk,setSessionOk]=useState(false);
  const [userName,setUserName]=useState('');
  const [tab,setTab]=useState('WCL');
  const [period,setPeriod]=useState('Daily');
  const [wclEntries,setWclEntries]=useState([]);
  const [showWclForm,setShowWclForm]=useState(false);
  const [editWcl,setEditWcl]=useState(null);
  const [wclForm,setWclForm]=useState({date:TODAY,received:'',accepted:'',conversations:'',qualified:'',offersMade:'',offerResponses:'',contracts:'',rejReasons:[]});
  const [campaigns,setCampaigns]=useState([]);
  const [showCampForm,setShowCampForm]=useState(false);
  const [campForm,setCampForm]=useState({name:'',county:'',zips:'',filterStack:FILTER_STACKS[0],listSize:'',dailySend:'450',duration:'',cost:'150',startDate:TODAY,color:PALETTE[0]});
  const [logDay,setLogDay]=useState(null);
  const [dayForm,setDayForm]=useState({date:TODAY,sent:'',landlines:'',optOuts:'',replies:'',qualified:'',offers:'',responses:'',contracts:''});
  const [strategies,setStrategies]=useState([]);
  const [showStratForm,setShowStratForm]=useState(false);
  const [stratForm,setStratForm]=useState({name:'',color:PALETTE[0],notes:''});

  useEffect(()=>{
    fetch('/api/auth/session').then(r=>{if(!r.ok){router.push('/');return;}return r.json();}).then(d=>{if(d?.userName){setSessionOk(true);setUserName(d.userName);}}).catch(()=>router.push('/'));
    fetch('/api/kpi/wcl').then(r=>r.json()).then(d=>{if(Array.isArray(d))setWclEntries(d);}).catch(()=>{});
    fetch('/api/kpi/campaigns').then(r=>r.json()).then(d=>{if(Array.isArray(d))setCampaigns(d);}).catch(()=>{});
    fetch('/api/kpi/strategies').then(r=>r.json()).then(d=>{if(Array.isArray(d))setStrategies(d);}).catch(()=>{});
  },[]);

  const saveWcl=async()=>{
    const url=editWcl?`/api/kpi/wcl/${editWcl}`:'/api/kpi/wcl';
    const method=editWcl?'PUT':'POST';
    const res=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(wclForm)});
    const d=await res.json();
    if(editWcl){setWclEntries(prev=>prev.map(e=>e.id===editWcl?d:e));}else{setWclEntries(prev=>[...prev,d]);}
    setShowWclForm(false);setEditWcl(null);setWclForm({date:TODAY,received:'',accepted:'',conversations:'',qualified:'',offersMade:'',offerResponses:'',contracts:'',rejReasons:[]});
  };
  const deleteWcl=async(id)=>{if(!confirm('Delete this entry?'))return;await fetch(`/api/kpi/wcl/${id}`,{method:'DELETE'});setWclEntries(prev=>prev.filter(e=>e.id!==id));};
  const editWclEntry=(e)=>{setWclForm({date:e.date,received:e.received||'',accepted:e.accepted||'',conversations:e.conversations||'',qualified:e.qualified||'',offersMade:e.offersMade||'',offerResponses:e.offerResponses||'',contracts:e.contracts||'',rejReasons:e.rejReasons||[]});setEditWcl(e.id);setShowWclForm(true);};

  const saveCampaign=async()=>{
    const res=await fetch('/api/kpi/campaigns',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(campForm)});
    const d=await res.json();setCampaigns(prev=>[...prev,d]);setShowCampForm(false);setCampForm({name:'',county:'',zips:'',filterStack:FILTER_STACKS[0],listSize:'',dailySend:'450',duration:'',cost:'150',startDate:TODAY,color:PALETTE[0]});
  };
  const archiveCampaign=async(id)=>{const res=await fetch(`/api/kpi/campaigns/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'archived'})});const d=await res.json();setCampaigns(prev=>prev.map(c=>c.id===id?d:c));};
  const deleteCampaign=async(id)=>{if(!confirm('Delete archived campaign?'))return;await fetch(`/api/kpi/campaigns/${id}`,{method:'DELETE'});setCampaigns(prev=>prev.filter(c=>c.id!==id));};
  const saveDay=async()=>{
    const res=await fetch(`/api/kpi/campaigns/${logDay}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({dailyEntry:{...dayForm,loggedBy:userName,loggedAt:new Date().toISOString()}})});
    const d=await res.json();setCampaigns(prev=>prev.map(c=>c.id===logDay?d:c));setLogDay(null);setDayForm({date:TODAY,sent:'',landlines:'',optOuts:'',replies:'',qualified:'',offers:'',responses:'',contracts:''});
  };

  const saveStrategy=async()=>{
    const res=await fetch('/api/kpi/strategies',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(stratForm)});
    const d=await res.json();setStrategies(prev=>[...prev,d]);setShowStratForm(false);setStratForm({name:'',color:PALETTE[0],notes:''});
  };
  const toggleStrategy=async(id,active)=>{await fetch(`/api/kpi/strategies/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({active})});setStrategies(prev=>prev.map(s=>s.id===id?{...s,active}:s));};
  const deleteStrategy=async(id)=>{if(!confirm('Delete strategy?'))return;await fetch(`/api/kpi/strategies/${id}`,{method:'DELETE'});setStrategies(prev=>prev.filter(s=>s.id!==id));};

  const wf=wclForm;
  const rej=toN(wf.received)-toN(wf.accepted);
  const liveAccRate=wf.received?pct(toN(wf.accepted),toN(wf.received)):'—';
  const liveConvRate=wf.accepted?pct(toN(wf.conversations),toN(wf.accepted)):'—';
  const liveOfferRate=wf.qualified?pct(toN(wf.offersMade),toN(wf.qualified)):'—';
  const liveContractRate=wf.offersMade?pct(toN(wf.contracts),toN(wf.offersMade)):'—';

  const activeCampaigns=campaigns.filter(c=>c.status==='active');
  const archivedCampaigns=campaigns.filter(c=>c.status==='archived');

  const wclChartData=wclEntries.slice(-30).map(e=>({date:e.date?.slice(5),received:toN(e.received),accepted:toN(e.accepted),offers:toN(e.offersMade),contracts:toN(e.contracts)}));
  const totalReceived=wclEntries.reduce((s,e)=>s+toN(e.received),0);
  const totalAccepted=wclEntries.reduce((s,e)=>s+toN(e.accepted),0);
  const totalContracts=wclEntries.reduce((s,e)=>s+toN(e.contracts),0);
  const totalOffers=wclEntries.reduce((s,e)=>s+toN(e.offersMade),0);
  const avgReceived=wclEntries.length?totalReceived/wclEntries.length:0;
  const avgAccepted=wclEntries.length?totalAccepted/wclEntries.length:0;
  const avgConvos=wclEntries.reduce((s,e)=>s+toN(e.conversations),0)/Math.max(1,wclEntries.length);
  const avgQual=wclEntries.reduce((s,e)=>s+toN(e.qualified),0)/Math.max(1,wclEntries.length);
  const avgOffers=wclEntries.reduce((s,e)=>s+toN(e.offersMade),0)/Math.max(1,wclEntries.length);
  const offerRespRate=totalOffers>0?(wclEntries.reduce((s,e)=>s+toN(e.offerResponses),0)/totalOffers*100):0;
  const allRejReasons={};
  wclEntries.forEach(e=>(e.rejReasons||[]).forEach(r=>{allRejReasons[r]=(allRejReasons[r]||0)+1;}));
  const totalRej=Object.values(allRejReasons).reduce((s,v)=>s+v,0);

  const allCampSent=activeCampaigns.reduce((s,c)=>(c.dailyEntries||[]).reduce((a,d)=>a+toN(d.sent),0)+s,0);
  const allCampReplies=activeCampaigns.reduce((s,c)=>(c.dailyEntries||[]).reduce((a,d)=>a+toN(d.replies),0)+s,0);
  const allCampQual=activeCampaigns.reduce((s,c)=>(c.dailyEntries||[]).reduce((a,d)=>a+toN(d.qualified),0)+s,0);
  const allCampContracts=activeCampaigns.reduce((s,c)=>(c.dailyEntries||[]).reduce((a,d)=>a+toN(d.contracts),0)+s,0);

  const df=dayForm;
  const deliverable=toN(df.sent)-toN(df.landlines);
  const dReplyRate=deliverable>0?pct(toN(df.replies),deliverable):'—';
  const dQualRate=toN(df.replies)>0?pct(toN(df.qualified),toN(df.replies)):'—';
  const dOptOutRate=deliverable>0?pct(toN(df.optOuts),deliverable):'—';

  if(!sessionOk)return<div style={{minHeight:'100vh',background:'var(--bg)',display:'flex',alignItems:'center',justifyContent:'center',color:'var(--text2)'}}>Loading…</div>;

  return(
    <div style={{minHeight:'100vh',background:'var(--bg)',color:'var(--text)'}}>
      <nav style={navS}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <a href="/" style={{color:'var(--text2)',textDecoration:'none',fontSize:20}}>←</a>
          <span style={{fontWeight:700,fontSize:16}}>KPI Tracker</span>
        </div>
        <div style={{display:'flex',alignItems:'center',gap:10}}>
          <div style={{display:'flex',gap:6}}>
            {['Daily','Weekly','Monthly'].map(p=>(
              <button key={p} style={{...btnS(period===p?'var(--cyan)':'var(--surface2)',false),padding:'5px 12px',fontSize:12,color:period===p?'#000':'var(--text2)'}} onClick={()=>setPeriod(p)}>{p}</button>
            ))}
          </div>
          <span style={{fontSize:13,color:'var(--text2)'}}>{userName}</span>
        </div>
      </nav>

      <div style={{borderBottom:'1px solid var(--border)',display:'flex',overflowX:'auto'}}>
        {['WCL','SMS Campaigns','Lead Gen','Diagnostics'].map(t=>(
          <button key={t} style={{padding:'12px 20px',background:'none',border:'none',borderBottom:tab===t?'2px solid var(--gold)':'2px solid transparent',color:tab===t?'var(--gold)':'var(--text2)',fontWeight:tab===t?600:400,cursor:'pointer',whiteSpace:'nowrap',fontSize:14}} onClick={()=>setTab(t)}>{t}</button>
        ))}
      </div>

      <div style={{maxWidth:900,margin:'0 auto',padding:'24px 20px'}}>

        {tab==='WCL'&&(
          <>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <span style={{fontWeight:600,fontSize:15}}>WCL / Propwire Leads</span>
              <button style={btnS('var(--gold)',false)} onClick={()=>{setShowWclForm(!showWclForm);setEditWcl(null);setWclForm({date:TODAY,received:'',accepted:'',conversations:'',qualified:'',offersMade:'',offerResponses:'',contracts:'',rejReasons:[]});}}>
                {showWclForm?'✕ Cancel':'+ Log Today'}
              </button>
            </div>

            {showWclForm&&(
              <div style={{...cardS('var(--gold-border)'),marginBottom:20}} className="slide-down">
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:12}}>
                  <div><label style={{fontSize:12,color:'var(--text2)',display:'block',marginBottom:4}}>Date</label><input type="date" style={inputS} value={wf.date} onChange={e=>setWclForm(p=>({...p,date:e.target.value}))}/></div>
                  <div><label style={{fontSize:12,color:'var(--text2)',display:'block',marginBottom:4}}>Leads Received</label><input type="number" style={inputS} value={wf.received} onChange={e=>setWclForm(p=>({...p,received:e.target.value}))}/></div>
                  <div><label style={{fontSize:12,color:'var(--text2)',display:'block',marginBottom:4}}>Leads Accepted</label><input type="number" style={inputS} value={wf.accepted} onChange={e=>setWclForm(p=>({...p,accepted:e.target.value}))}/>
                    {rej>0&&<div style={{fontSize:11,color:'var(--text3)',marginTop:3}}>Rejected: {rej}</div>}
                  </div>
                </div>
                {rej>0&&(
                  <div style={{marginBottom:12}}>
                    <label style={{fontSize:12,color:'var(--text2)',display:'block',marginBottom:6}}>Rejection Reasons</label>
                    <div style={{display:'flex',flexWrap:'wrap',gap:6}}>
                      {REJECTION_REASONS.map(r=>{
                        const sel=wf.rejReasons.includes(r);
                        return<span key={r} onClick={()=>setWclForm(p=>({...p,rejReasons:sel?p.rejReasons.filter(x=>x!==r):[...p.rejReasons,r]}))} style={{fontSize:12,padding:'4px 10px',borderRadius:20,border:`1px solid ${sel?'var(--gold-border)':'var(--border)'}`,background:sel?'var(--gold-faint)':'var(--surface2)',color:sel?'var(--gold)':'var(--text2)',cursor:'pointer'}}>{r}</span>;
                      })}
                    </div>
                  </div>
                )}
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12,marginBottom:12}}>
                  {[['Conversations','conversations'],['Qualified','qualified'],['Offers Made','offersMade'],['Offer Responses','offerResponses'],['Contracts','contracts']].map(([l,k])=>(
                    <div key={k}><label style={{fontSize:12,color:'var(--text2)',display:'block',marginBottom:4}}>{l}</label><input type="number" style={inputS} value={wf[k]||''} onChange={e=>setWclForm(p=>({...p,[k]:e.target.value}))}/></div>
                  ))}
                </div>
                <div style={{display:'flex',gap:12,fontSize:12,color:'var(--text2)',marginBottom:14,flexWrap:'wrap'}}>
                  <span>Accept Rate: <b style={{color:'var(--text)'}}>{liveAccRate}</b></span>
                  <span>Conv Rate: <b style={{color:'var(--text)'}}>{liveConvRate}</b></span>
                  <span>Offer Rate: <b style={{color:'var(--text)'}}>{liveOfferRate}</b></span>
                  <span>Contract%: <b style={{color:'var(--text)'}}>{liveContractRate}</b></span>
                </div>
                <button style={btnS('var(--gold)',false)} onClick={saveWcl}>Save Entry</button>
              </div>
            )}

            <div style={{display:'flex',gap:12,marginBottom:20}}>
              <StatCard label="Total Received" value={totalReceived} color="var(--gold)"/>
              <StatCard label="Total Accepted" value={totalAccepted} color="var(--green)"/>
              <StatCard label="Accept Rate" value={pct(totalAccepted,totalReceived)} color="var(--cyan)"/>
              <StatCard label="Total Contracts" value={totalContracts} color="var(--purple)"/>
            </div>

            {wclChartData.length>0&&(
              <div style={cardS()}>
                <div style={{fontWeight:600,marginBottom:14,fontSize:14}}>WCL Activity</div>
                <ResponsiveContainer width="100%" height={220}>
                  <ComposedChart data={wclChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)"/>
                    <XAxis dataKey="date" stroke="var(--text3)" tick={{fontSize:11}}/>
                    <YAxis stroke="var(--text3)" tick={{fontSize:11}}/>
                    <Tooltip contentStyle={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8}}/>
                    <Legend wrapperStyle={{fontSize:12}}/>
                    <Bar dataKey="received" name="Received" fill="var(--gold-faint)" stroke="var(--gold)"/>
                    <Bar dataKey="accepted" name="Accepted" fill="var(--green-faint)" stroke="var(--green)"/>
                    <Line type="monotone" dataKey="offers" name="Offers" stroke="var(--cyan)" dot={false} strokeWidth={2}/>
                    <Line type="monotone" dataKey="contracts" name="Contracts" stroke="var(--green)" dot={false} strokeWidth={2}/>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}

            {totalRej>0&&(
              <div style={cardS()}>
                <div style={{fontWeight:600,marginBottom:12,fontSize:14}}>Rejection Analysis</div>
                {Object.entries(allRejReasons).sort(([,a],[,b])=>b-a).map(([r,c])=>(
                  <div key={r} style={{marginBottom:8}}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:4}}>
                      <span style={{fontSize:13,color:'var(--text)'}}>{r}</span>
                      <span className="num" style={{fontSize:12,color:'var(--text2)'}}>{c} ({pct(c,totalRej)})</span>
                    </div>
                    <div style={{height:4,background:'var(--surface3)',borderRadius:2}}><div style={{height:'100%',width:pct(c,totalRej),background:'var(--red)',borderRadius:2}}/></div>
                  </div>
                ))}
              </div>
            )}

            {period==='Daily'&&wclEntries.length>0&&(
              <div style={cardS()}>
                <div style={{fontWeight:600,marginBottom:12,fontSize:14}}>Entry Log</div>
                {[...wclEntries].reverse().map(e=>(
                  <div key={e.id} style={{border:'1px solid var(--border)',borderRadius:8,padding:'10px 14px',marginBottom:8,display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:8}}>
                    <div>
                      <span className="num" style={{fontSize:13,color:'var(--text2)',marginRight:10}}>{e.date}</span>
                      <Badge label={e.loggedBy||''} color="var(--cyan)"/>
                      <span style={{marginLeft:10,fontSize:13,color:'var(--text2)'}}>
                        {toN(e.received)}→{toN(e.accepted)}→{toN(e.conversations)}→{toN(e.contracts)}
                      </span>
                    </div>
                    <div style={{display:'flex',gap:6}}>
                      <button style={{...btnS('var(--surface2)',false),padding:'4px 10px',fontSize:12,color:'var(--text2)'}} onClick={()=>editWclEntry(e)}>Edit</button>
                      <button style={{background:'none',border:'none',color:'var(--text3)',cursor:'pointer',fontSize:14}} onClick={()=>deleteWcl(e.id)}>✕</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {tab==='SMS Campaigns'&&(
          <>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <span style={{fontWeight:600,fontSize:15}}>SMS Campaigns</span>
              <button style={btnS('var(--purple)',false)} onClick={()=>setShowCampForm(!showCampForm)}>{showCampForm?'✕ Cancel':'+ New Campaign'}</button>
            </div>

            {showCampForm&&(
              <div style={{...cardS('var(--purple-border)'),marginBottom:20}} className="slide-down">
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                  {[['Campaign Name','name','text'],['County','county','text'],['Zip Codes (comma sep)','zips','text']].map(([l,k,t])=>(
                    <div key={k}><label style={{fontSize:12,color:'var(--text2)',display:'block',marginBottom:4}}>{l}</label><input type={t} style={inputS} value={campForm[k]} onChange={e=>setCampForm(p=>({...p,[k]:e.target.value}))}/></div>
                  ))}
                  <div><label style={{fontSize:12,color:'var(--text2)',display:'block',marginBottom:4}}>Filter Stack</label>
                    <select style={inputS} value={campForm.filterStack} onChange={e=>setCampForm(p=>({...p,filterStack:e.target.value}))}>
                      {FILTER_STACKS.map(f=><option key={f}>{f}</option>)}
                    </select>
                  </div>
                  {[['List Size','listSize','number'],['Daily Send','dailySend','number'],['Duration (days)','duration','number'],['List Cost $','cost','number'],['Start Date','startDate','date']].map(([l,k,t])=>(
                    <div key={k}><label style={{fontSize:12,color:'var(--text2)',display:'block',marginBottom:4}}>{l}</label><input type={t} style={inputS} value={campForm[k]} onChange={e=>setCampForm(p=>({...p,[k]:e.target.value}))}/></div>
                  ))}
                </div>
                <div style={{display:'flex',gap:8,marginBottom:12}}>
                  {PALETTE.map(c=><div key={c} onClick={()=>setCampForm(p=>({...p,color:c}))} style={{width:28,height:28,borderRadius:'50%',background:c,cursor:'pointer',outline:campForm.color===c?`3px solid ${c}55`:'none',outlineOffset:2}}/>)}
                </div>
                {campForm.dailySend&&campForm.duration&&(
                  <div style={{fontSize:12,color:'var(--text2)',marginBottom:12,display:'flex',gap:16}}>
                    <span>Total sends: <b style={{color:'var(--text)'}}>{(toN(campForm.dailySend)*toN(campForm.duration)).toLocaleString()}</b></span>
                    <span>Est replies (3%): <b style={{color:'var(--text)'}}>{Math.round(toN(campForm.dailySend)*toN(campForm.duration)*0.03)}</b></span>
                    <span>Cost/day: <b style={{color:'var(--text)'}}>$${(toN(campForm.cost)/Math.max(1,toN(campForm.duration))).toFixed(2)}</b></span>
                  </div>
                )}
                <button style={btnS('var(--purple)',false)} onClick={saveCampaign}>Create Campaign</button>
              </div>
            )}

            {activeCampaigns.map(c=>{
              const entries=c.dailyEntries||[];
              const totalSent=entries.reduce((s,d)=>s+toN(d.sent),0);
              const totalReplies=entries.reduce((s,d)=>s+toN(d.replies),0);
              const totalQual=entries.reduce((s,d)=>s+toN(d.qualified),0);
              const totalConts=entries.reduce((s,d)=>s+toN(d.contracts),0);
              const totalOptOut=entries.reduce((s,d)=>s+toN(d.optOuts),0);
              const planned=toN(c.dailySend)*toN(c.duration);
              const prog=planned>0?Math.min(100,(totalSent/planned)*100):0;
              const costPerReply=totalReplies>0?(toN(c.cost)/totalReplies).toFixed(2):'—';
              return(
                <div key={c.id} style={{...cardS(),borderLeft:`4px solid ${c.color||'var(--gold)'}`,marginBottom:16}}>
                  <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:10}}>
                    <div>
                      <div style={{fontWeight:700,fontSize:15,color:'var(--text)'}}>{c.name}</div>
                      <div style={{fontSize:12,color:'var(--text2)',marginTop:2}}>{c.county} · {c.zips}</div>
                      <div style={{marginTop:6,display:'flex',gap:6,flexWrap:'wrap'}}>
                        <Badge label={c.filterStack} color="var(--purple)"/>
                        <Badge label={`${c.listSize||0} leads`} color="var(--cyan)"/>
                        <Badge label={`$${c.cost}`} color="var(--gold)"/>
                      </div>
                    </div>
                    <div style={{display:'flex',gap:6}}>
                      <button style={{...btnS('var(--surface2)',false),fontSize:12,color:'var(--text2)',padding:'5px 10px'}} onClick={()=>setLogDay(logDay===c.id?null:c.id)}>Log Day</button>
                      <button style={{...btnS('var(--surface2)',false),fontSize:12,color:'var(--text3)',padding:'5px 10px'}} onClick={()=>archiveCampaign(c.id)}>Archive</button>
                    </div>
                  </div>
                  <div style={{height:6,background:'var(--surface3)',borderRadius:3,marginBottom:8}}><div style={{height:'100%',borderRadius:3,width:prog+'%',background:c.color||'var(--gold)',transition:'width 0.3s'}}/></div>
                  <div style={{fontSize:12,color:'var(--text2)',marginBottom:10}}>{prog.toFixed(0)}% sent · {totalSent.toLocaleString()} of {planned.toLocaleString()}</div>
                  <div style={{display:'flex',gap:12,flexWrap:'wrap',fontSize:12}}>
                    {[['Sent',totalSent,'var(--text)'],['Replies',totalReplies,'var(--cyan)'],['Reply Rate',pct(totalReplies,totalSent),'var(--gold)'],['Qualified',totalQual,'var(--green)'],['Contracts',totalConts,'var(--purple)'],['Cost/Reply','$'+costPerReply,'var(--text2)']].map(([l,v,cl])=>(
                      <div key={l}><div style={{color:'var(--text3)',fontSize:11}}>{l}</div><div className="num" style={{color:cl,fontWeight:600}}>{v}</div></div>
                    ))}
                  </div>
                  {logDay===c.id&&(
                    <div style={{marginTop:14,padding:14,background:'var(--surface2)',borderRadius:8,border:'1px solid var(--border)'}} className="slide-down">
                      <div style={{fontWeight:600,marginBottom:10,fontSize:13}}>Log Day</div>
                      <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10,marginBottom:10}}>
                        {[['Date','date','date'],['Sent','sent','number'],['Landlines','landlines','number'],['Opt-Outs','optOuts','number'],['Replies','replies','number'],['Qualified','qualified','number'],['Offers','offers','number'],['Responses','responses','number'],['Contracts','contracts','number']].map(([l,k,t])=>(
                          <div key={k}><label style={{fontSize:11,color:'var(--text2)',display:'block',marginBottom:3}}>{l}</label><input type={t} style={{...inputS,padding:'7px 10px',fontSize:13}} value={dayForm[k]} onChange={e=>setDayForm(p=>({...p,[k]:e.target.value}))}/></div>
                        ))}
                      </div>
                      <div style={{fontSize:12,color:'var(--text2)',marginBottom:10,display:'flex',gap:14,flexWrap:'wrap'}}>
                        <span>Deliverable: <b style={{color:'var(--text)'}}>{deliverable}</b></span>
                        <span>Reply Rate: <b style={{color:'var(--text)'}}>{dReplyRate}</b></span>
                        <span>Qualify Rate: <b style={{color:'var(--text)'}}>{dQualRate}</b></span>
                        <span>Opt-Out Rate: <b style={{color:'var(--text)'}}>{dOptOutRate}</b></span>
                      </div>
                      <button style={btnS('var(--purple)',false)} onClick={saveDay}>Save Day</button>
                    </div>
                  )}
                </div>
              );
            })}

            {activeCampaigns.length>0&&(
              <div style={{...cardS('var(--green-border)'),marginBottom:16}}>
                <div style={{fontWeight:600,marginBottom:10,fontSize:14}}>All Campaigns Combined</div>
                <div style={{display:'flex',gap:16,flexWrap:'wrap'}}>
                  {[['Total Sent',allCampSent.toLocaleString(),'var(--text)'],['Replies',allCampReplies,'var(--cyan)'],['Qualified',allCampQual,'var(--green)'],['Contracts',allCampContracts,'var(--purple)'],['Reply Rate',pct(allCampReplies,allCampSent),'var(--gold)']].map(([l,v,c])=>(
                    <div key={l}><div style={{color:'var(--text3)',fontSize:12}}>{l}</div><div className="num" style={{color:c,fontSize:20,fontWeight:700}}>{v}</div></div>
                  ))}
                </div>
              </div>
            )}

            {archivedCampaigns.length>0&&(
              <details style={{marginTop:16}}>
                <summary style={{cursor:'pointer',color:'var(--text2)',fontSize:14,marginBottom:10}}>Archived Campaigns ({archivedCampaigns.length})</summary>
                {archivedCampaigns.map(c=>(
                  <div key={c.id} style={{...cardS(),opacity:0.7,display:'flex',alignItems:'center',justifyContent:'space-between'}}>
                    <div>
                      <span style={{fontWeight:600,color:'var(--text)'}}>{c.name}</span>
                      <span style={{marginLeft:10,fontSize:12,color:'var(--text2)'}}>{c.county}</span>
                    </div>
                    <button style={{...btnS('var(--red-faint)',false),color:'var(--red)',border:'1px solid var(--red-border)',fontSize:12,padding:'4px 10px'}} onClick={()=>deleteCampaign(c.id)}>Delete</button>
                  </div>
                ))}
              </details>
            )}
          </>
        )}

        {tab==='Lead Gen'&&(
          <>
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:16}}>
              <span style={{fontWeight:600,fontSize:15}}>Lead Generation Channels</span>
              <button style={btnS('var(--cyan)',false)} onClick={()=>setShowStratForm(!showStratForm)}>{showStratForm?'✕ Cancel':'+ Add Channel'}</button>
            </div>
            {showStratForm&&(
              <div style={{...cardS('var(--cyan-border)'),marginBottom:16}} className="slide-down">
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:12}}>
                  <div><label style={{fontSize:12,color:'var(--text2)',display:'block',marginBottom:4}}>Channel Name</label><input style={inputS} value={stratForm.name} onChange={e=>setStratForm(p=>({...p,name:e.target.value}))}/></div>
                  <div><label style={{fontSize:12,color:'var(--text2)',display:'block',marginBottom:4}}>Notes</label><input style={inputS} value={stratForm.notes} onChange={e=>setStratForm(p=>({...p,notes:e.target.value}))}/></div>
                </div>
                <div style={{display:'flex',gap:8,marginBottom:12}}>
                  {PALETTE.map(c=><div key={c} onClick={()=>setStratForm(p=>({...p,color:c}))} style={{width:28,height:28,borderRadius:'50%',background:c,cursor:'pointer',outline:stratForm.color===c?`3px solid ${c}55`:'none',outlineOffset:2}}/>)}
                </div>
                <button style={btnS('var(--cyan)',false)} onClick={saveStrategy}>Add Channel</button>
              </div>
            )}
            {strategies.map(s=>(
              <div key={s.id} style={{...cardS(),borderLeft:`4px solid ${s.color||'var(--gold)'}`,display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10}}>
                <div>
                  <span style={{fontWeight:600,color:'var(--text)'}}>{s.name}</span>
                  {s.notes&&<span style={{marginLeft:10,fontSize:13,color:'var(--text2)'}}>{s.notes}</span>}
                  {s.builtin&&<span style={{marginLeft:8,fontSize:11,padding:'1px 6px',borderRadius:4,background:'var(--surface3)',color:'var(--text3)'}}>built-in</span>}
                </div>
                <div style={{display:'flex',alignItems:'center',gap:10}}>
                  <div onClick={()=>toggleStrategy(s.id,!s.active)} style={{width:40,height:20,borderRadius:10,background:s.active?'var(--green)':'var(--border)',cursor:'pointer',position:'relative',transition:'background 0.2s'}}>
                    <div style={{position:'absolute',top:2,left:s.active?22:2,width:16,height:16,borderRadius:'50%',background:'#fff',transition:'left 0.2s'}}/>
                  </div>
                  <span style={{fontSize:12,color:s.active?'var(--green)':'var(--text3)'}}>{s.active?'Active':'Paused'}</span>
                  {!s.builtin&&<button onClick={()=>deleteStrategy(s.id)} style={{background:'none',border:'none',color:'var(--text3)',cursor:'pointer',fontSize:14}}>✕</button>}
                </div>
              </div>
            ))}
          </>
        )}

        {tab==='Diagnostics'&&(
          <>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              <div style={cardS('var(--gold-border)')}>
                <div style={{fontWeight:700,color:'var(--gold)',marginBottom:14,fontSize:14}}>WCL Diagnostics</div>
                <DiagRow label="Avg Leads/day" value={avgReceived.toFixed(1)} target="10"/>
                <DiagRow label="Avg Accepted/day" value={avgAccepted.toFixed(1)} target="8"/>
                <DiagRow label="Avg Convos/day" value={avgConvos.toFixed(1)} target="6"/>
                <DiagRow label="Avg Qualified/day" value={avgQual.toFixed(1)} target="2"/>
                <DiagRow label="Avg Offers/day" value={avgOffers.toFixed(1)} target="5"/>
                <DiagRow label="Offer Response Rate" value={offerRespRate.toFixed(1)} target="30" unit="%"/>
                <DiagRow label="Total Contracts" value={String(totalContracts)} target="1"/>
                <div style={{marginTop:14,padding:12,background:'var(--gold-faint)',border:'1px solid var(--gold-border)',borderRadius:8,fontSize:13,color:'var(--text2)'}}>
                  {avgReceived<10&&<div>📉 Lead volume below 10/day — check Propwire list quality or filters.</div>}
                  {avgAccepted/Math.max(avgReceived,1)<0.5&&<div>⚠ Low accept rate — review rejection reasons above.</div>}
                  {avgOffers<5&&<div>⚠ Offer volume low — target at least 5 offers daily.</div>}
                  {totalContracts===0&&<div>🔴 No contracts yet — increase offer volume and follow-up cadence.</div>}
                  {totalContracts>0&&<div>✅ Contracts closed: {totalContracts}. Keep pushing!</div>}
                </div>
              </div>

              <div style={cardS('var(--purple-border)')}>
                <div style={{fontWeight:700,color:'var(--purple)',marginBottom:14,fontSize:14}}>SMS Diagnostics</div>
                <DiagRow label="Reply Rate" value={pct(allCampReplies,allCampSent).replace('%','')} target="3" unit="%"/>
                <DiagRow label="Conversation Rate" value={pct(allCampQual,allCampReplies).replace('%','')} target="20" unit="%"/>
                <DiagRow label="Opt-Out Rate" value={activeCampaigns.reduce((s,c)=>(c.dailyEntries||[]).reduce((a,d)=>a+toN(d.optOuts),0)+s,0)} target={Math.round(allCampSent*0.05)} reverse/>
                <DiagRow label="Contracts" value={String(allCampContracts)} target="1"/>
                <div style={{marginTop:14,padding:12,background:'var(--purple-faint)',border:'1px solid var(--purple-border)',borderRadius:8,fontSize:13,color:'var(--text2)'}}>
                  {allCampReplies/Math.max(allCampSent,1)<0.03&&<div>📉 Reply rate under 3% — check filter stack and message copy.</div>}
                  {allCampQual/Math.max(allCampReplies,1)<0.2&&<div>⚠ Low qualify rate — improve follow-up script after replies.</div>}
                  {allCampContracts===0&&<div>🔴 No SMS contracts yet.</div>}
                </div>
              </div>
            </div>

            <div style={{...cardS('var(--green-border)'),marginTop:4}}>
              <div style={{fontWeight:700,color:'var(--green)',marginBottom:12,fontSize:14}}>Combined — All Channels</div>
              <div style={{display:'flex',gap:24,flexWrap:'wrap'}}>
                {[['Total Offers',totalOffers+activeCampaigns.reduce((s,c)=>(c.dailyEntries||[]).reduce((a,d)=>a+toN(d.offers),0)+s,0),'var(--cyan)'],
                  ['Total Contracts',totalContracts+allCampContracts,'var(--green)'],
                  ['WCL Contracts',totalContracts,'var(--gold)'],
                  ['SMS Contracts',allCampContracts,'var(--purple)']].map(([l,v,c])=>(
                  <div key={l}><div style={{fontSize:12,color:'var(--text3)'}}>{l}</div><div className="num" style={{fontSize:24,fontWeight:700,color:c}}>{v}</div></div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
