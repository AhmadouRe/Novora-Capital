'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const toN=v=>{const n=Number(String(v||'').replace(/[^0-9.-]/g,''));return isNaN(n)?0:n;};
const safeDiv=(a,b)=>b===0?0:a/b;
const safePct=(a,b)=>b===0?0:(a/b)*100;
const fmtPct=n=>Math.round(n)+'%';
const todayISO=()=>new Date().toISOString().slice(0,10);
const fmt$=n=>Number(n||0).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});

function getWeekStart(dateStr){
  const d=new Date((dateStr||todayISO())+'T00:00:00');
  const day=d.getDay();const diff=day===0?6:day-1;
  d.setDate(d.getDate()-diff);return d.toISOString().slice(0,10);
}

const PACE_START=new Date('2026-04-25T00:00:00');
const PACE_END=new Date('2026-07-25T00:00:00');
const PACE_TOTAL_DAYS=91;
const GOAL_CONTRACTS=6;

const LIST_TYPES=['Absentee+Tax Delinquent','Absentee+Equity','Tax Delinquent','Probate','Pre-Foreclosure','Tired Landlord','Other'];
const CAMP_COLORS=['#E8A020','#06B6D4','#A78BFA','#22C55E','#EF4444','#F97316'];
const REJ_REASONS=['Bad comps','No equity','Luxury price','Lot/land','Bad area','Wrong market','Already listed','Other'];

const INPUT={minHeight:48,padding:'12px 16px',borderRadius:10,background:'var(--surface3)',border:'1px solid var(--border)',color:'var(--text)',fontSize:15,outline:'none',fontFamily:'Outfit,sans-serif',width:'100%',transition:'border-color 0.15s',boxSizing:'border-box'};
const LBL={fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.11em',color:'var(--text3)',marginBottom:8,display:'block'};
const BTN={minHeight:44,padding:'0 20px',borderRadius:10,border:'none',background:'var(--gold)',color:'#000',fontWeight:800,fontSize:14,cursor:'pointer'};
const BTN2={minHeight:44,padding:'0 16px',borderRadius:10,border:'1px solid var(--border)',background:'var(--surface3)',color:'var(--text2)',fontWeight:700,fontSize:14,cursor:'pointer'};
const CARD={background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'20px 24px',marginBottom:14};

function NInput({id,value,onChange,placeholder,autoFocus,style={}}){
  return <input id={id} style={{...INPUT,fontFamily:'JetBrains Mono,monospace',fontSize:16,...style}} type="text" inputMode="numeric" pattern="[0-9]*" value={value} placeholder={placeholder||'0'} onChange={e=>onChange(e.target.value.replace(/[^0-9]/g,''))} autoFocus={autoFocus} onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/>;
}

function Stat({label,value,sub,color}){
  return(
    <div style={{textAlign:'center',padding:'12px 8px',borderRadius:10,background:'var(--surface2)',border:'1px solid var(--border)'}}>
      <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:22,fontWeight:900,color:color||'var(--text)'}}>{value}</div>
      <div style={{fontSize:10,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.07em',marginTop:3}}>{label}</div>
      {sub&&<div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>{sub}</div>}
    </div>
  );
}

function WipeGate({onInitialized}){
  const [checking,setChecking]=useState(true);
  const [needsWipe,setNeedsWipe]=useState(false);
  const [wiping,setWiping]=useState(false);

  useEffect(()=>{
    fetch('/api/kpi/wipe').then(r=>r.json()).then(d=>{
      if(d.initialized){onInitialized();}
      else{setNeedsWipe(true);}
      setChecking(false);
    }).catch(()=>{setChecking(false);onInitialized();});
  },[]);// eslint-disable-line

  async function doWipe(){
    setWiping(true);
    await fetch('/api/kpi/wipe',{method:'POST'});
    setWiping(false);
    onInitialized();
  }

  if(checking)return<div style={{padding:40,textAlign:'center',color:'var(--text3)'}}>Loading…</div>;
  if(!needsWipe)return null;

  return(
    <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:500,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
      <div style={{background:'var(--surface)',border:'1px solid var(--border2)',borderRadius:20,width:480,maxWidth:'95vw',padding:32}}>
        <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.12em',color:'var(--gold)',marginBottom:8}}>KPI Upgrade Required</div>
        <div style={{fontSize:20,fontWeight:900,color:'var(--text)',marginBottom:12}}>Initialize KPI v2</div>
        <p style={{color:'var(--text2)',fontSize:14,lineHeight:1.6,marginBottom:24}}>
          The KPI system has been upgraded with a new data schema. All previous test data will be cleared so you can enter real data with clean fields. This cannot be undone.
        </p>
        <div style={{display:'flex',gap:12}}>
          <button onClick={doWipe} disabled={wiping} style={{...BTN,flex:1,opacity:wiping?0.7:1}}>{wiping?'Clearing…':'Clear & Initialize'}</button>
        </div>
      </div>
    </div>
  );
}

function EntryLog({wclEntries,onEdit,onDelete}){
  const [expandedId,setExpandedId]=useState(null);
  const sorted=[...wclEntries].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  if(sorted.length===0)return<div style={{...CARD,color:'var(--text3)',fontSize:14,textAlign:'center',padding:'28px 24px'}}>No WCL entries yet.</div>;
  return(
    <div style={CARD}>
      <div style={{fontSize:13,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.12em',color:'var(--text3)',marginBottom:14}}>Entry Log ({sorted.length})</div>
      {sorted.map(e=>(
        <div key={e.id} style={{borderBottom:'1px solid var(--border)'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'11px 0',flexWrap:'wrap'}}>
            <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,color:'var(--text3)',minWidth:76}}>{e.date}</span>
            {e.loggedBy&&<span style={{fontSize:11,padding:'1px 8px',borderRadius:4,background:'var(--gold-faint)',color:'var(--gold)',border:'1px solid var(--gold-border)',fontWeight:700}}>{e.loggedBy}</span>}
            <div style={{display:'flex',gap:10,flex:1,flexWrap:'wrap'}}>
              {[['rcvd',e.received],['acc',e.accepted],['conv',e.conversations],['qual',e.qualified],['off',e.offers],['con',e.contracts],['cls',e.closed]].map(([l,v])=>toN(v)>0&&(
                <span key={l} style={{fontSize:12,color:'var(--text2)'}}><span style={{color:'var(--text3)'}}>{l}:</span> <span style={{fontFamily:'JetBrains Mono,monospace',fontWeight:700}}>{v}</span></span>
              ))}
            </div>
            <div style={{display:'flex',gap:6}}>
              <button onClick={()=>setExpandedId(x=>x===e.id?null:e.id)} style={{padding:'3px 9px',borderRadius:6,border:'1px solid var(--border)',background:expandedId===e.id?'var(--surface3)':'transparent',color:'var(--text3)',cursor:'pointer',fontSize:12}}>{expandedId===e.id?'▲':'▼'}</button>
              <button onClick={()=>onEdit(e)} style={{padding:'3px 9px',borderRadius:6,border:'1px solid var(--border)',background:'transparent',color:'var(--text3)',cursor:'pointer',fontSize:12}}>✎</button>
              <button onClick={()=>onDelete(e.id)} style={{padding:'3px 9px',borderRadius:6,border:'1px solid var(--red-border)',background:'var(--red-faint)',color:'var(--red)',cursor:'pointer',fontSize:12}}>×</button>
            </div>
          </div>
          {expandedId===e.id&&(
            <div style={{padding:'10px 12px 14px',background:'var(--surface3)',borderRadius:8,marginBottom:10}}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(100px,1fr))',gap:8,marginBottom:8}}>
                {[['Received',e.received],['Accepted',e.accepted],['Convos',e.conversations],['Qualified',e.qualified],['Offers',e.offers],['Contracts',e.contracts],['Closed',e.closed]].map(([l,v])=>(
                  <div key={l} style={{textAlign:'center',padding:'8px 4px',borderRadius:6,background:'var(--surface2)'}}>
                    <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:18,fontWeight:900,color:'var(--text)'}}>{toN(v)}</div>
                    <div style={{fontSize:10,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.05em'}}>{l}</div>
                  </div>
                ))}
              </div>
              {e.rejectionReasons&&e.rejectionReasons.length>0&&<div style={{fontSize:12,color:'var(--text3)'}}>Rejections: {Array.isArray(e.rejectionReasons)?e.rejectionReasons.join(', '):e.rejectionReasons}</div>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function SMSEntryLog({entries,campaigns,onEdit,onDelete}){
  const [expandedId,setExpandedId]=useState(null);
  const sorted=[...entries].sort((a,b)=>(b.date||'').localeCompare(a.date||''));
  const campName=id=>{const c=campaigns.find(x=>x.id===id);return c?c.name:id;};
  if(sorted.length===0)return<div style={{...CARD,color:'var(--text3)',fontSize:14,textAlign:'center',padding:'28px 24px'}}>No SMS entries yet.</div>;
  return(
    <div style={CARD}>
      <div style={{fontSize:13,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.12em',color:'var(--text3)',marginBottom:14}}>SMS Entry Log ({sorted.length})</div>
      {sorted.map(e=>(
        <div key={e.id} style={{borderBottom:'1px solid var(--border)'}}>
          <div style={{display:'flex',alignItems:'center',gap:10,padding:'11px 0',flexWrap:'wrap'}}>
            <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,color:'var(--text3)',minWidth:76}}>{e.date}</span>
            <span style={{fontSize:11,padding:'1px 8px',borderRadius:4,background:'var(--purple-faint,rgba(167,139,250,0.1))',color:'var(--purple,#A78BFA)',border:'1px solid var(--purple-border,rgba(167,139,250,0.3))',fontWeight:700,maxWidth:120,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{campName(e.campaignId)}</span>
            <div style={{display:'flex',gap:10,flex:1,flexWrap:'wrap'}}>
              {[['sent',e.sent],['replies',e.totalReplies],['int',e.interestedReplies],['conv',e.conversations],['qual',e.qualified],['off',e.offers],['con',e.contracts]].map(([l,v])=>toN(v)>0&&(
                <span key={l} style={{fontSize:12,color:'var(--text2)'}}><span style={{color:'var(--text3)'}}>{l}:</span> <span style={{fontFamily:'JetBrains Mono,monospace',fontWeight:700}}>{v}</span></span>
              ))}
            </div>
            <div style={{display:'flex',gap:6}}>
              <button onClick={()=>setExpandedId(x=>x===e.id?null:e.id)} style={{padding:'3px 9px',borderRadius:6,border:'1px solid var(--border)',background:expandedId===e.id?'var(--surface3)':'transparent',color:'var(--text3)',cursor:'pointer',fontSize:12}}>{expandedId===e.id?'▲':'▼'}</button>
              <button onClick={()=>onEdit(e)} style={{padding:'3px 9px',borderRadius:6,border:'1px solid var(--border)',background:'transparent',color:'var(--text3)',cursor:'pointer',fontSize:12}}>✎</button>
              <button onClick={()=>onDelete(e.id)} style={{padding:'3px 9px',borderRadius:6,border:'1px solid var(--red-border)',background:'var(--red-faint)',color:'var(--red)',cursor:'pointer',fontSize:12}}>×</button>
            </div>
          </div>
          {expandedId===e.id&&(
            <div style={{padding:'10px 12px 14px',background:'var(--surface3)',borderRadius:8,marginBottom:10}}>
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(100px,1fr))',gap:8}}>
                {[['Sent',e.sent],['Total Replies',e.totalReplies],['Interested',e.interestedReplies],['Optouts',e.optouts],['Convos',e.conversations],['Qualified',e.qualified],['Offers',e.offers],['Contracts',e.contracts],['Closed',e.closed]].map(([l,v])=>(
                  <div key={l} style={{textAlign:'center',padding:'8px 4px',borderRadius:6,background:'var(--surface2)'}}>
                    <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:16,fontWeight:900,color:'var(--text)'}}>{toN(v)}</div>
                    <div style={{fontSize:10,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.05em'}}>{l}</div>
                  </div>
                ))}
              </div>
              {toN(e.cost)>0&&<div style={{marginTop:8,fontSize:12,color:'var(--text3)'}}>Cost: {fmt$(e.cost)}</div>}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function KPITracker(){
  const router=useRouter();
  const [initialized,setInitialized]=useState(false);
  const [isMobile,setIsMobile]=useState(false);
  const [mainTab,setMainTab]=useState('WCL');
  const [period,setPeriod]=useState('Weekly');
  const [wclEntries,setWclEntries]=useState([]);
  const [campaigns,setCampaigns]=useState([]);
  const [smsEntries,setSmsEntries]=useState([]);
  const [settings,setSettings]=useState({wclCost:4.99,smsCostPerText:0.04,diagnosticMinDays:5,interestedReplyFloor:2.0,offerRateFloor:90});
  const [toast,setToast]=useState('');

  // WCL form state
  const [showLogForm,setShowLogForm]=useState(false);
  const [wclDate,setWclDate]=useState(todayISO());
  const [received,setReceived]=useState('');
  const [accepted,setAccepted]=useState('');
  const [conversations,setConversations]=useState('');
  const [qualified,setQualified]=useState('');
  const [offers,setOffers]=useState('');
  const [contracts,setContracts]=useState('');
  const [closedW,setClosedW]=useState('');
  const [rejReasons,setRejReasons]=useState([]);
  const [editWclId,setEditWclId]=useState(null);
  const [savingWcl,setSavingWcl]=useState(false);

  // Campaign form state
  const [showCampForm,setShowCampForm]=useState(false);
  const [campName,setCampName]=useState('');
  const [campListType,setCampListType]=useState(LIST_TYPES[0]);
  const [campCounty,setCampCounty]=useState('');
  const [campStart,setCampStart]=useState(todayISO());
  const [campContacts,setCampContacts]=useState('');
  const [savingCamp,setSavingCamp]=useState(false);

  // SMS log form state
  const [showSmsForm,setShowSmsForm]=useState(false);
  const [smsCampaignId,setSmsCampaignId]=useState('');
  const [smsDate,setSmsDate]=useState(todayISO());
  const [smsSent,setSmsSent]=useState('');
  const [smsTotalReplies,setSmsTotalReplies]=useState('');
  const [smsIntReplies,setSmsIntReplies]=useState('');
  const [smsOptouts,setSmsOptouts]=useState('');
  const [smsConvos,setSmsConvos]=useState('');
  const [smsQual,setSmsQual]=useState('');
  const [smsOffers,setSmsOffers]=useState('');
  const [smsContracts,setSmsContracts]=useState('');
  const [smsClosed,setSmsClosed]=useState('');
  const [smsCost,setSmsCost]=useState('');
  const [editSmsId,setEditSmsId]=useState(null);
  const [savingSms,setSavingSms]=useState(false);

  useEffect(()=>{const c=()=>setIsMobile(window.innerWidth<768);c();window.addEventListener('resize',c);return()=>window.removeEventListener('resize',c);},[]);

  useEffect(()=>{
    if(typeof window!=='undefined'){
      const params=new URLSearchParams(window.location.search);
      if(params.get('openForm')==='true'){
        setMainTab('WCL');
        setTimeout(()=>openWclForm(),300);
      }
    }
  },[]);// eslint-disable-line

  function loadData(){
    fetch('/api/kpi/wcl').then(r=>r.json()).then(d=>{if(Array.isArray(d))setWclEntries(d.filter(e=>!e.deleted));}).catch(()=>{});
    fetch('/api/kpi/campaigns').then(r=>r.json()).then(d=>{if(Array.isArray(d))setCampaigns(d.filter(c=>!c.deleted));}).catch(()=>{});
    fetch('/api/kpi/sms').then(r=>r.json()).then(d=>{if(Array.isArray(d))setSmsEntries(d.filter(e=>!e.deleted));}).catch(()=>{});
    fetch('/api/kpi/settings').then(r=>r.json()).then(d=>{if(d&&!d.error)setSettings(s=>({...s,...d}));}).catch(()=>{});
  }

  function flash(m){setToast(m);setTimeout(()=>setToast(''),2500);}

  // ── WCL helpers ──────────────────────────────────────────────
  function openWclForm(existing){
    if(existing){
      setEditWclId(existing.id);
      setWclDate(existing.date||todayISO());
      setReceived(String(existing.received||''));
      setAccepted(String(existing.accepted||''));
      setConversations(String(existing.conversations||''));
      setQualified(String(existing.qualified||''));
      setOffers(String(existing.offers||''));
      setContracts(String(existing.contracts||''));
      setClosedW(String(existing.closed||''));
      setRejReasons(Array.isArray(existing.rejectionReasons)?existing.rejectionReasons:[]);
    } else {
      setEditWclId(null);setWclDate(todayISO());
      setReceived('');setAccepted('');setConversations('');setQualified('');
      setOffers('');setContracts('');setClosedW('');setRejReasons([]);
    }
    setShowLogForm(true);
    setTimeout(()=>{const el=document.getElementById('wcl-first');if(el)el.focus();},80);
  }

  async function saveWcl(){
    if(!wclDate)return flash('Date required.');
    setSavingWcl(true);
    const body={date:wclDate,received:toN(received),accepted:toN(accepted),conversations:toN(conversations),qualified:toN(qualified),offers:toN(offers),contracts:toN(contracts),closed:toN(closedW),rejectionReasons:rejReasons};
    if(editWclId){
      const res=await fetch(`/api/kpi/wcl/${editWclId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      if(res.ok){const d=await res.json();setWclEntries(e=>e.map(x=>x.id===editWclId?d:x));flash('✓ Entry updated!');}
      else flash('Failed to update.');
    } else {
      const res=await fetch('/api/kpi/wcl',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      if(res.status===409){
        const d=await res.json();
        // find duplicate and edit it instead
        const dup=wclEntries.find(e=>e.date===wclDate);
        if(dup){setEditWclId(dup.id);flash('Entry for this date exists — updating it.');setSavingWcl(false);return;}
        flash(d.error||'Duplicate.');setSavingWcl(false);return;
      }
      if(res.ok){const d=await res.json();setWclEntries(e=>[d,...e]);setEditWclId(d.id);flash('✓ Saved!');}
      else flash('Failed to save.');
    }
    // keep form open, clear number fields for re-entry
    setReceived('');setAccepted('');setConversations('');setQualified('');
    setOffers('');setContracts('');setClosedW('');setRejReasons([]);
    setTimeout(()=>{const el=document.getElementById('wcl-first');if(el)el.focus();},80);
    setSavingWcl(false);
  }

  async function deleteWcl(id){
    if(!confirm('Delete this WCL entry?'))return;
    await fetch(`/api/kpi/wcl/${id}`,{method:'DELETE'});
    setWclEntries(e=>e.filter(x=>x.id!==id));
    flash('Entry deleted.');
  }

  // ── Campaign helpers ─────────────────────────────────────────
  async function createCampaign(){
    if(!campName.trim())return flash('Campaign name required.');
    setSavingCamp(true);
    const body={name:campName,listType:campListType,county:campCounty,startDate:campStart,totalContacts:toN(campContacts),status:'active'};
    const res=await fetch('/api/kpi/campaigns',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(res.status===409){flash('Campaign with this name and date already exists.');setSavingCamp(false);return;}
    if(res.ok){const d=await res.json();setCampaigns(c=>[...c,d]);setShowCampForm(false);setCampName('');setCampCounty('');setCampContacts('');flash('✓ Campaign created!');}
    else flash('Failed to create campaign.');
    setSavingCamp(false);
  }

  async function setCampStatus(id,status){
    const res=await fetch(`/api/kpi/campaigns/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});
    if(res.ok){const d=await res.json();setCampaigns(cs=>cs.map(c=>c.id===id?d:c));}
  }

  async function deleteCampaign(id){
    if(!confirm('Delete this campaign and all its SMS entries? This cannot be undone.'))return;
    const res=await fetch(`/api/kpi/campaigns/${id}`,{method:'DELETE'});
    if(res.ok){
      setCampaigns(c=>c.filter(x=>x.id!==id));
      setSmsEntries(s=>s.filter(e=>e.campaignId!==id));
      flash('Campaign deleted.');
    }
  }

  // ── SMS helpers ───────────────────────────────────────────────
  function openSmsForm(existing,presetCampaignId){
    if(existing){
      setEditSmsId(existing.id);
      setSmsCampaignId(existing.campaignId||'');
      setSmsDate(existing.date||todayISO());
      setSmsSent(String(existing.sent||''));
      setSmsTotalReplies(String(existing.totalReplies||''));
      setSmsIntReplies(String(existing.interestedReplies||''));
      setSmsOptouts(String(existing.optouts||''));
      setSmsConvos(String(existing.conversations||''));
      setSmsQual(String(existing.qualified||''));
      setSmsOffers(String(existing.offers||''));
      setSmsContracts(String(existing.contracts||''));
      setSmsClosed(String(existing.closed||''));
      setSmsCost(String(existing.cost||''));
    } else {
      setEditSmsId(null);
      setSmsCampaignId(presetCampaignId||'');
      setSmsDate(todayISO());
      setSmsSent('');setSmsTotalReplies('');setSmsIntReplies('');setSmsOptouts('');
      setSmsConvos('');setSmsQual('');setSmsOffers('');setSmsContracts('');setSmsClosed('');setSmsCost('');
    }
    setShowSmsForm(true);
  }

  async function saveSms(){
    if(!smsCampaignId)return flash('Select a campaign.');
    if(!smsDate)return flash('Date required.');
    setSavingSms(true);
    const body={campaignId:smsCampaignId,date:smsDate,sent:toN(smsSent),totalReplies:toN(smsTotalReplies),interestedReplies:toN(smsIntReplies),optouts:toN(smsOptouts),conversations:toN(smsConvos),qualified:toN(smsQual),offers:toN(smsOffers),contracts:toN(smsContracts),closed:toN(smsClosed),cost:toN(smsCost)};
    if(editSmsId){
      const res=await fetch(`/api/kpi/sms/${editSmsId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      if(res.ok){const d=await res.json();setSmsEntries(e=>e.map(x=>x.id===editSmsId?d:x));flash('✓ SMS entry updated!');}
      else flash('Failed to update.');
    } else {
      const res=await fetch('/api/kpi/sms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      if(res.status===409){flash('Entry for this campaign+date already exists. Edit it instead.');setSavingSms(false);return;}
      if(res.ok){const d=await res.json();setSmsEntries(e=>[d,...e]);flash('✓ SMS entry saved!');}
      else flash('Failed to save.');
    }
    setShowSmsForm(false);
    setSavingSms(false);
  }

  async function deleteSms(id){
    if(!confirm('Delete this SMS entry?'))return;
    await fetch(`/api/kpi/sms/${id}`,{method:'DELETE'});
    setSmsEntries(e=>e.filter(x=>x.id!==id));
    flash('SMS entry deleted.');
  }

  // ── Computed values ───────────────────────────────────────────
  const today=todayISO();

  function getPeriodEntries(p,entries){
    if(p==='Daily')return entries.filter(e=>e.date===today);
    if(p==='Weekly'){const ws=getWeekStart(today);return entries.filter(e=>e.date>=ws&&e.date<=today);}
    return entries.filter(e=>e.date.startsWith(today.slice(0,7)));
  }

  const periodWcl=getPeriodEntries(period,wclEntries);
  const pRec=periodWcl.reduce((s,e)=>s+toN(e.received),0);
  const pAcc=periodWcl.reduce((s,e)=>s+toN(e.accepted),0);
  const pConv=periodWcl.reduce((s,e)=>s+toN(e.conversations),0);
  const pQual=periodWcl.reduce((s,e)=>s+toN(e.qualified),0);
  const pOff=periodWcl.reduce((s,e)=>s+toN(e.offers),0);
  const pCon=periodWcl.reduce((s,e)=>s+toN(e.contracts),0);
  const pCls=periodWcl.reduce((s,e)=>s+toN(e.closed),0);

  const accRate=safePct(pAcc,pRec);
  const qualRate=safePct(pQual,pAcc);
  const offerRate=safePct(pOff,pQual);
  const contractRate=safePct(pCon,pOff);

  // Form live calcs
  const fRec=toN(received),fAcc=toN(accepted),fQual=toN(qualified),fOff=toN(offers);
  const fRejected=Math.max(0,fRec-fAcc);
  const fRejPct=fRec>0?Math.round(safeDiv(fRejected,fRec)*100):0;

  // Weekly best/worst by qualified
  function weekGroups(entries){
    const map={};
    entries.forEach(e=>{const ws=getWeekStart(e.date);if(!map[ws])map[ws]={week:ws,qual:0,off:0,con:0};map[ws].qual+=toN(e.qualified);map[ws].off+=toN(e.offers);map[ws].con+=toN(e.contracts);});
    return Object.values(map).sort((a,b)=>b.week.localeCompare(a.week));
  }
  const weeks=weekGroups(wclEntries);
  const bestWeek=weeks.length>0?weeks.reduce((a,b)=>b.qual>a.qual?b:a,weeks[0]):null;
  const worstWeek=weeks.length>1?weeks.reduce((a,b)=>b.qual<a.qual?b:a,weeks[0]):null;

  // 90-day pace
  const nowDate=new Date();
  const daysElapsed=Math.max(0,Math.floor((nowDate-PACE_START)/86400000));
  const daysLeft=Math.max(0,Math.ceil((PACE_END-nowDate)/86400000));
  const totalWclContracts=wclEntries.reduce((s,e)=>s+toN(e.contracts),0);
  const totalSmsContracts=smsEntries.reduce((s,e)=>s+toN(e.contracts),0);
  const combinedContracts=totalWclContracts+totalSmsContracts;
  const projectedContracts=daysElapsed>0?Math.round(safeDiv(combinedContracts,daysElapsed)*PACE_TOTAL_DAYS):0;
  const paceStatus=combinedContracts>=GOAL_CONTRACTS?'DONE':projectedContracts>=GOAL_CONTRACTS?'ON TRACK':'BEHIND';
  const paceColor=paceStatus==='DONE'?'var(--green)':paceStatus==='ON TRACK'?'var(--gold)':'var(--red)';
  const paceProgress=Math.min(100,safeDiv(combinedContracts,GOAL_CONTRACTS)*100);

  // WCL diagnostic
  function wclDiagnostic(){
    if(pRec===0)return null;
    if(offerRate<settings.offerRateFloor&&pQual>0)return{color:'var(--red)',bg:'var(--red-faint)',border:'var(--red-border)',title:'OFFER DISCIPLINE',msg:`${Math.round(offerRate)}% offer rate — target is ${settings.offerRateFloor}%. Every qualified lead needs an offer.`};
    if(accRate<40&&pRec>=10)return{color:'var(--gold)',bg:'var(--gold-faint)',border:'var(--gold-border)',title:'LIST QUALITY',msg:`Acceptance rate ${Math.round(accRate)}% — check targeting filters and list criteria.`};
    if(qualRate<20&&pAcc>=5)return{color:'var(--gold)',bg:'var(--gold-faint)',border:'var(--gold-border)',title:'QUALIFICATION RATE',msg:`Only ${Math.round(qualRate)}% of accepted leads qualify. Review pre-qualification criteria.`};
    return{color:'var(--green)',bg:'var(--green-faint)',border:'var(--green-border)',title:'✓ PIPELINE HEALTHY',msg:'WCL metrics are in range. Maintain volume.'};
  }
  const wclDiag=wclDiagnostic();

  // SMS per-campaign stats
  function campStats(camp){
    const entries=smsEntries.filter(e=>e.campaignId===camp.id);
    const daysActive=entries.filter(e=>toN(e.sent)>0).length;
    const totSent=entries.reduce((s,e)=>s+toN(e.sent),0);
    const totTotalReplies=entries.reduce((s,e)=>s+toN(e.totalReplies),0);
    const totIntReplies=entries.reduce((s,e)=>s+toN(e.interestedReplies),0);
    const totOptouts=entries.reduce((s,e)=>s+toN(e.optouts),0);
    const totConvos=entries.reduce((s,e)=>s+toN(e.conversations),0);
    const totQual=entries.reduce((s,e)=>s+toN(e.qualified),0);
    const totOffers=entries.reduce((s,e)=>s+toN(e.offers),0);
    const totContracts=entries.reduce((s,e)=>s+toN(e.contracts),0);
    const totClosed=entries.reduce((s,e)=>s+toN(e.closed),0);
    const totCost=entries.reduce((s,e)=>s+toN(e.cost),0);
    const intRate=safePct(totIntReplies,totTotalReplies);
    const convoRate=safePct(totConvos,totIntReplies);
    const sQualRate=safePct(totQual,totConvos);
    const sOfferRate=safePct(totOffers,totQual);
    const costPerContract=totContracts>0?safeDiv(totCost,totContracts):null;

    // Diagnostic
    let diag=null;
    if(daysActive>=settings.diagnosticMinDays&&totSent>0){
      if(intRate<settings.interestedReplyFloor)diag={color:'var(--red)',title:'LOW INTEREST RATE',msg:`${Math.round(intRate*10)/10}% interested replies — floor is ${settings.interestedReplyFloor}%. Improve message copy or targeting.`};
      else if(sOfferRate<settings.offerRateFloor&&totQual>0)diag={color:'var(--gold)',title:'OFFER DISCIPLINE',msg:`${Math.round(sOfferRate)}% offer rate — send offers to all qualified leads.`};
      else diag={color:'var(--green)',title:'✓ SMS CAMPAIGN HEALTHY',msg:'Metrics in range.'};
    }
    return{daysActive,totSent,totTotalReplies,totIntReplies,totOptouts,totConvos,totQual,totOffers,totContracts,totClosed,totCost,intRate,convoRate,sQualRate,sOfferRate,costPerContract,diag};
  }

  // Combined tab totals
  const combWcl={rec:wclEntries.reduce((s,e)=>s+toN(e.received),0),acc:wclEntries.reduce((s,e)=>s+toN(e.accepted),0),qual:wclEntries.reduce((s,e)=>s+toN(e.qualified),0),off:wclEntries.reduce((s,e)=>s+toN(e.offers),0),con:wclEntries.reduce((s,e)=>s+toN(e.contracts),0),cls:wclEntries.reduce((s,e)=>s+toN(e.closed),0)};
  const combSms={sent:smsEntries.reduce((s,e)=>s+toN(e.sent),0),int:smsEntries.reduce((s,e)=>s+toN(e.interestedReplies),0),conv:smsEntries.reduce((s,e)=>s+toN(e.conversations),0),qual:smsEntries.reduce((s,e)=>s+toN(e.qualified),0),off:smsEntries.reduce((s,e)=>s+toN(e.offers),0),con:smsEntries.reduce((s,e)=>s+toN(e.contracts),0),cls:smsEntries.reduce((s,e)=>s+toN(e.closed),0)};
  const totalReach=combWcl.rec+combSms.sent;
  const totalConv=combWcl.acc+combSms.int;
  const totalContracts=combWcl.con+combSms.con;
  const totalClosed=combWcl.cls+combSms.cls;

  const p=isMobile?16:24;

  if(!initialized){
    return <WipeGate onInitialized={()=>{setInitialized(true);loadData();}}/>;
  }

  return(
    <div style={{maxWidth:900,margin:'0 auto',padding:`${p}px ${p}px 80px`}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:10}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.12em',color:'var(--gold)',marginBottom:4}}>KPI Tracker</div>
          <div style={{fontSize:isMobile?20:26,fontWeight:900,color:'var(--text)'}}>Performance Dashboard</div>
        </div>
        <button onClick={()=>router.push('/kpi/calendar')} style={{...BTN2,display:'flex',alignItems:'center',gap:6,fontSize:13,minHeight:38}}>
          📅 Calendar
        </button>
      </div>

      {/* Toast */}
      {toast&&<div style={{padding:'10px 16px',borderRadius:10,background:'var(--surface2)',border:'1px solid var(--border)',color:'var(--text2)',fontSize:14,marginBottom:14,fontWeight:600}}>{toast}</div>}

      {/* Tab Bar */}
      <div style={{display:'flex',borderBottom:'1px solid var(--border)',marginBottom:20,overflowX:'auto'}}>
        {['WCL','SMS Campaigns','Combined'].map(t=>(
          <button key={t} onClick={()=>setMainTab(t)} style={{padding:'10px 18px',background:'none',border:'none',borderBottom:mainTab===t?'2px solid var(--gold)':'2px solid transparent',color:mainTab===t?'var(--gold)':'var(--text3)',fontSize:14,fontWeight:mainTab===t?700:500,cursor:'pointer',whiteSpace:'nowrap',transition:'color 0.15s'}}>{t}</button>
        ))}
      </div>

      {/* ═══ WCL TAB ═══ */}
      {mainTab==='WCL'&&(
        <div>
          {/* Period selector + Log button */}
          <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16,flexWrap:'wrap'}}>
            <div style={{display:'flex',gap:4,background:'var(--surface2)',borderRadius:10,padding:4,border:'1px solid var(--border)'}}>
              {['Daily','Weekly','Monthly'].map(p2=>(
                <button key={p2} onClick={()=>setPeriod(p2)} style={{padding:'6px 14px',borderRadius:8,border:'none',background:period===p2?'var(--surface)':'transparent',color:period===p2?'var(--gold)':'var(--text3)',fontWeight:period===p2?700:500,fontSize:13,cursor:'pointer',transition:'all 0.15s'}}>{p2}</button>
              ))}
            </div>
            <div style={{flex:1}}/>
            <button onClick={()=>openWclForm()} style={{...BTN,minHeight:38,fontSize:13}}>+ Log Day</button>
          </div>

          {/* Log Form */}
          {showLogForm&&(
            <div style={{...CARD,border:'1px solid var(--gold-border)',background:'var(--surface2)',marginBottom:16}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                <div style={{fontSize:15,fontWeight:800,color:'var(--text)'}}>{editWclId?'Edit':'Log'} WCL Entry</div>
                <button onClick={()=>setShowLogForm(false)} style={{background:'none',border:'none',color:'var(--text3)',fontSize:22,cursor:'pointer',lineHeight:1}}>×</button>
              </div>

              <div style={{marginBottom:14}}>
                <label style={LBL}>Date</label>
                <input style={{...INPUT,maxWidth:180}} type="date" value={wclDate} onChange={e=>setWclDate(e.target.value)}/>
              </div>

              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(4,1fr)',gap:12,marginBottom:14}}>
                <div>
                  <label style={LBL}>Received</label>
                  <NInput id="wcl-first" value={received} onChange={setReceived} autoFocus/>
                </div>
                <div>
                  <label style={LBL}>Accepted</label>
                  <NInput value={accepted} onChange={setAccepted}/>
                  {fRec>0&&fAcc>=0&&<div style={{fontSize:12,color:'var(--text3)',marginTop:4}}>Rejected: {fRejected} ({fRejPct}%)</div>}
                </div>
                <div>
                  <label style={LBL}>Conversations</label>
                  <NInput value={conversations} onChange={setConversations}/>
                </div>
                <div>
                  <label style={LBL}>Qualified</label>
                  <NInput value={qualified} onChange={setQualified}/>
                  {fQual>0&&<div style={{fontSize:12,color:'var(--gold)',fontWeight:700,marginTop:4}}>Target: {fQual} offer(s) must go out</div>}
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(3,1fr)',gap:12,marginBottom:14}}>
                <div>
                  <label style={LBL}>Offers Made</label>
                  <NInput value={offers} onChange={setOffers}/>
                </div>
                <div>
                  <label style={LBL}>Contracts</label>
                  <NInput value={contracts} onChange={setContracts}/>
                </div>
                <div>
                  <label style={LBL}>Closed</label>
                  <NInput value={closedW} onChange={setClosedW}/>
                </div>
              </div>

              {/* Rejection reasons */}
              {toN(received)>0&&toN(accepted)<toN(received)&&(
                <div style={{marginBottom:14}}>
                  <label style={LBL}>Rejection Reasons</label>
                  <div style={{display:'flex',flexWrap:'wrap',gap:8}}>
                    {REJ_REASONS.map(r=>(
                      <button key={r} onClick={()=>setRejReasons(x=>x.includes(r)?x.filter(y=>y!==r):[...x,r])} style={{padding:'5px 12px',borderRadius:20,border:`1px solid ${rejReasons.includes(r)?'var(--gold)':'var(--border)'}`,background:rejReasons.includes(r)?'var(--gold-faint)':'var(--surface3)',color:rejReasons.includes(r)?'var(--gold)':'var(--text3)',fontSize:12,cursor:'pointer',fontWeight:rejReasons.includes(r)?700:400}}>{r}</button>
                    ))}
                  </div>
                </div>
              )}

              <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
                <button onClick={saveWcl} disabled={savingWcl} style={{...BTN,flex:1,opacity:savingWcl?0.7:1}}>{savingWcl?'Saving…':editWclId?'Update Entry':'Save Entry'}</button>
                <button onClick={()=>setShowLogForm(false)} style={{...BTN2}}>Done</button>
              </div>
            </div>
          )}

          {/* Funnel stats */}
          <div style={CARD}>
            <div style={{fontSize:13,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.12em',color:'var(--text3)',marginBottom:14}}>{period} Funnel</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(100px,1fr))',gap:10,marginBottom:14}}>
              <Stat label="Received" value={pRec}/>
              <Stat label="Accepted" value={pAcc} sub={pRec>0?fmtPct(accRate):null} color={accRate>=60?'var(--green)':accRate>=40?'var(--gold)':'var(--red)'}/>
              <Stat label="Convos" value={pConv}/>
              <Stat label="Qualified" value={pQual} sub={pAcc>0?fmtPct(qualRate):null}/>
              <Stat label="Offers" value={pOff} sub={pQual>0?fmtPct(offerRate):null} color={offerRate>=90?'var(--green)':offerRate>=70?'var(--gold)':'var(--red)'}/>
              <Stat label="Contracts" value={pCon} sub={pOff>0?fmtPct(contractRate):null}/>
              <Stat label="Closed" value={pCls}/>
            </div>
            {wclDiag&&(
              <div style={{padding:'12px 14px',borderRadius:10,background:wclDiag.bg,border:`1px solid ${wclDiag.border}`,color:wclDiag.color}}>
                <div style={{fontWeight:800,fontSize:12,textTransform:'uppercase',letterSpacing:'0.1em',marginBottom:4}}>{wclDiag.title}</div>
                <div style={{fontSize:13}}>{wclDiag.msg}</div>
              </div>
            )}
          </div>

          {/* Weekly summary */}
          {weeks.length>0&&(
            <div style={CARD}>
              <div style={{fontSize:13,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.12em',color:'var(--text3)',marginBottom:14}}>Weekly Summary</div>
              <div style={{display:'flex',gap:12,flexWrap:'wrap',marginBottom:10}}>
                {bestWeek&&<div style={{padding:'10px 14px',borderRadius:10,background:'var(--gold-faint)',border:'1px solid var(--gold-border)',flex:1,minWidth:140}}>
                  <div style={{fontSize:11,color:'var(--gold)',fontWeight:700,textTransform:'uppercase',marginBottom:4}}>Best Week</div>
                  <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:14,color:'var(--text)',fontWeight:700}}>{bestWeek.week}</div>
                  <div style={{fontSize:12,color:'var(--text2)',marginTop:2}}>{bestWeek.qual} qualified · {bestWeek.off} offers · {bestWeek.con} contracts</div>
                </div>}
                {worstWeek&&worstWeek.week!==bestWeek?.week&&<div style={{padding:'10px 14px',borderRadius:10,background:'var(--surface2)',border:'1px solid var(--border)',flex:1,minWidth:140}}>
                  <div style={{fontSize:11,color:'var(--text3)',fontWeight:700,textTransform:'uppercase',marginBottom:4}}>Needs Improvement</div>
                  <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:14,color:'var(--text)',fontWeight:700}}>{worstWeek.week}</div>
                  <div style={{fontSize:12,color:'var(--text2)',marginTop:2}}>{worstWeek.qual} qualified · {worstWeek.off} offers · {worstWeek.con} contracts</div>
                </div>}
              </div>
            </div>
          )}

          <EntryLog wclEntries={wclEntries} onEdit={openWclForm} onDelete={deleteWcl}/>
        </div>
      )}

      {/* ═══ SMS CAMPAIGNS TAB ═══ */}
      {mainTab==='SMS Campaigns'&&(
        <div>
          <div style={{display:'flex',gap:10,marginBottom:16,flexWrap:'wrap'}}>
            <button onClick={()=>setShowCampForm(f=>!f)} style={{...BTN2,fontSize:13,minHeight:38}}>{showCampForm?'✕ Cancel':'+ New Campaign'}</button>
            <button onClick={()=>openSmsForm(null,'')} style={{...BTN,fontSize:13,minHeight:38}}>+ Log SMS Day</button>
          </div>

          {/* New Campaign Form */}
          {showCampForm&&(
            <div style={{...CARD,border:'1px solid var(--gold-border)',marginBottom:16}}>
              <div style={{fontSize:15,fontWeight:800,color:'var(--text)',marginBottom:14}}>New Campaign</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:12,marginBottom:12}}>
                <div>
                  <label style={LBL}>Campaign Name</label>
                  <input style={INPUT} value={campName} onChange={e=>setCampName(e.target.value)} placeholder="e.g. Broward Absentee May"/>
                </div>
                <div>
                  <label style={LBL}>County</label>
                  <input style={INPUT} value={campCounty} onChange={e=>setCampCounty(e.target.value)} placeholder="e.g. Broward"/>
                </div>
                <div>
                  <label style={LBL}>List Type</label>
                  <select style={{...INPUT,height:48}} value={campListType} onChange={e=>setCampListType(e.target.value)}>
                    {LIST_TYPES.map(t=><option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={LBL}>Total Contacts</label>
                  <NInput value={campContacts} onChange={setCampContacts} placeholder="0"/>
                </div>
                <div>
                  <label style={LBL}>Start Date</label>
                  <input style={{...INPUT,maxWidth:'100%'}} type="date" value={campStart} onChange={e=>setCampStart(e.target.value)}/>
                </div>
              </div>
              <button onClick={createCampaign} disabled={savingCamp} style={{...BTN,opacity:savingCamp?0.7:1}}>{savingCamp?'Creating…':'Create Campaign'}</button>
            </div>
          )}

          {/* SMS Log Form */}
          {showSmsForm&&(
            <div style={{...CARD,border:'1px solid var(--purple-border,rgba(167,139,250,0.4))',background:'var(--surface2)',marginBottom:16}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
                <div style={{fontSize:15,fontWeight:800,color:'var(--text)'}}>{editSmsId?'Edit':'Log'} SMS Day</div>
                <button onClick={()=>setShowSmsForm(false)} style={{background:'none',border:'none',color:'var(--text3)',fontSize:22,cursor:'pointer',lineHeight:1}}>×</button>
              </div>

              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:12,marginBottom:12}}>
                <div>
                  <label style={LBL}>Campaign</label>
                  <select style={{...INPUT,height:48}} value={smsCampaignId} onChange={e=>setSmsCampaignId(e.target.value)}>
                    <option value="">Select campaign…</option>
                    {campaigns.filter(c=>c.status!=='archived').map(c=><option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label style={LBL}>Date</label>
                  <input style={INPUT} type="date" value={smsDate} onChange={e=>setSmsDate(e.target.value)}/>
                </div>
              </div>

              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(3,1fr)',gap:12,marginBottom:12}}>
                <div><label style={LBL}>Sent</label><NInput value={smsSent} onChange={setSmsSent}/></div>
                <div><label style={LBL}>Total Replies</label><NInput value={smsTotalReplies} onChange={setSmsTotalReplies}/></div>
                <div><label style={LBL}>Interested Replies</label><NInput value={smsIntReplies} onChange={setSmsIntReplies}/></div>
                <div><label style={LBL}>Optouts</label><NInput value={smsOptouts} onChange={setSmsOptouts}/></div>
                <div><label style={LBL}>Conversations</label><NInput value={smsConvos} onChange={setSmsConvos}/></div>
                <div><label style={LBL}>Qualified</label><NInput value={smsQual} onChange={setSmsQual}/></div>
                <div><label style={LBL}>Offers Made</label><NInput value={smsOffers} onChange={setSmsOffers}/></div>
                <div><label style={LBL}>Contracts</label><NInput value={smsContracts} onChange={setSmsContracts}/></div>
                <div><label style={LBL}>Closed</label><NInput value={smsClosed} onChange={setSmsClosed}/></div>
              </div>

              <div style={{marginBottom:14}}>
                <label style={LBL}>Cost ($)</label>
                <NInput value={smsCost} onChange={setSmsCost} style={{maxWidth:160}}/>
              </div>

              <div style={{display:'flex',gap:10}}>
                <button onClick={saveSms} disabled={savingSms} style={{...BTN,flex:1,opacity:savingSms?0.7:1}}>{savingSms?'Saving…':editSmsId?'Update':'Save SMS Entry'}</button>
                <button onClick={()=>setShowSmsForm(false)} style={BTN2}>Cancel</button>
              </div>
            </div>
          )}

          {/* Campaign Cards */}
          {campaigns.length===0&&!showCampForm&&(
            <div style={{...CARD,textAlign:'center',color:'var(--text3)',fontSize:14,padding:40}}>No campaigns yet. Create one to start tracking SMS performance.</div>
          )}

          {['active','paused','archived'].map(statusGroup=>{
            const groupCamps=campaigns.filter(c=>c.status===statusGroup);
            if(groupCamps.length===0)return null;
            return(
              <div key={statusGroup}>
                <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.12em',color:'var(--text3)',marginBottom:10,marginTop:statusGroup==='active'?0:16}}>{statusGroup} Campaigns</div>
                {groupCamps.map(camp=>{
                  const stats=campStats(camp);
                  const cc=CAMP_COLORS[campaigns.indexOf(camp)%CAMP_COLORS.length];
                  return(
                    <div key={camp.id} style={{...CARD,border:`1px solid ${cc}40`,marginBottom:12}}>
                      <div style={{display:'flex',alignItems:'flex-start',gap:12,marginBottom:14,flexWrap:'wrap'}}>
                        <div style={{width:12,height:12,borderRadius:'50%',background:cc,marginTop:4,flexShrink:0}}/>
                        <div style={{flex:1}}>
                          <div style={{fontSize:16,fontWeight:800,color:'var(--text)'}}>{camp.name}</div>
                          <div style={{fontSize:12,color:'var(--text3)',marginTop:3,display:'flex',gap:8,flexWrap:'wrap'}}>
                            {camp.county&&<span>{camp.county}</span>}
                            {camp.listType&&<span>· {camp.listType}</span>}
                            {camp.startDate&&<span>· Started {camp.startDate}</span>}
                            {camp.totalContacts>0&&<span>· {camp.totalContacts.toLocaleString()} contacts</span>}
                          </div>
                        </div>
                        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                          {camp.status==='active'&&<button onClick={()=>setCampStatus(camp.id,'paused')} style={{...BTN2,minHeight:32,fontSize:12,padding:'0 10px'}}>Pause</button>}
                          {camp.status==='paused'&&<button onClick={()=>setCampStatus(camp.id,'active')} style={{...BTN,minHeight:32,fontSize:12,padding:'0 10px'}}>Resume</button>}
                          {camp.status!=='archived'&&<button onClick={()=>setCampStatus(camp.id,'archived')} style={{...BTN2,minHeight:32,fontSize:12,padding:'0 10px'}}>Archive</button>}
                          <button onClick={()=>openSmsForm(null,camp.id)} style={{...BTN,minHeight:32,fontSize:12,padding:'0 10px',background:cc}}>+ Log Day</button>
                          <button onClick={()=>deleteCampaign(camp.id)} style={{minHeight:32,padding:'0 10px',borderRadius:8,border:'1px solid var(--red-border)',background:'var(--red-faint)',color:'var(--red)',fontSize:12,cursor:'pointer',fontWeight:700}}>Delete</button>
                        </div>
                      </div>

                      {/* Stats grid */}
                      {stats.totSent>0&&(
                        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(90px,1fr))',gap:8,marginBottom:12}}>
                          <Stat label="Sent" value={stats.totSent.toLocaleString()}/>
                          <Stat label="Total Replies" value={stats.totTotalReplies}/>
                          <Stat label="Interested" value={stats.totIntReplies} sub={fmtPct(Math.round(stats.intRate))} color={stats.intRate>=settings.interestedReplyFloor?'var(--green)':'var(--red)'}/>
                          <Stat label="Optouts" value={stats.totOptouts}/>
                          <Stat label="Convos" value={stats.totConvos} sub={stats.totIntReplies>0?fmtPct(Math.round(stats.convoRate)):null}/>
                          <Stat label="Qualified" value={stats.totQual}/>
                          <Stat label="Offers" value={stats.totOffers}/>
                          <Stat label="Contracts" value={stats.totContracts}/>
                          {stats.totCost>0&&<Stat label="Cost" value={fmt$(stats.totCost)}/>}
                          {stats.costPerContract&&<Stat label="$/Contract" value={fmt$(stats.costPerContract)}/>}
                        </div>
                      )}

                      {/* Diagnostic */}
                      {stats.diag&&(
                        <div style={{padding:'10px 12px',borderRadius:8,background:stats.diag.color==='var(--green)'?'var(--green-faint)':stats.diag.color==='var(--gold)'?'var(--gold-faint)':'var(--red-faint)',border:`1px solid ${stats.diag.color==='var(--green)'?'var(--green-border)':stats.diag.color==='var(--gold)'?'var(--gold-border)':'var(--red-border)'}`,color:stats.diag.color,fontSize:13,marginBottom:6}}>
                          <span style={{fontWeight:800,marginRight:8,textTransform:'uppercase',fontSize:11}}>{stats.diag.title}</span>{stats.diag.msg}
                        </div>
                      )}

                      {/* Days active */}
                      <div style={{fontSize:12,color:'var(--text3)',marginTop:4}}>{stats.daysActive} day(s) with sends</div>
                    </div>
                  );
                })}
              </div>
            );
          })}

          {/* SMS Entry Log */}
          <SMSEntryLog entries={smsEntries} campaigns={campaigns} onEdit={e=>openSmsForm(e)} onDelete={deleteSms}/>
        </div>
      )}

      {/* ═══ COMBINED TAB ═══ */}
      {mainTab==='Combined'&&(
        <div>
          {/* 90-Day Pace */}
          <div style={{...CARD,border:`1px solid ${paceColor}40`}}>
            <div style={{display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:8}}>
              <div>
                <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.12em',color:'var(--text3)',marginBottom:4}}>90-Day Sprint</div>
                <div style={{fontSize:isMobile?18:22,fontWeight:900,color:'var(--text)'}}>April 25 → July 25, 2026</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:28,fontWeight:900,color:paceColor,fontFamily:'JetBrains Mono,monospace'}}>{combinedContracts}/{GOAL_CONTRACTS}</div>
                <div style={{fontSize:11,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.1em'}}>Contracts</div>
              </div>
            </div>

            {/* Progress bar */}
            <div style={{height:10,background:'var(--surface3)',borderRadius:5,overflow:'hidden',marginBottom:12}}>
              <div style={{height:'100%',width:`${paceProgress}%`,background:paceColor,borderRadius:5,transition:'width 0.5s'}}/>
            </div>

            <div style={{display:'flex',gap:16,flexWrap:'wrap',marginBottom:10}}>
              <div><span style={{fontSize:12,color:'var(--text3)'}}>Status: </span><span style={{fontSize:13,fontWeight:800,color:paceColor}}>{paceStatus}</span></div>
              <div><span style={{fontSize:12,color:'var(--text3)'}}>Days elapsed: </span><span style={{fontSize:13,fontWeight:700,color:'var(--text)'}}>{daysElapsed}</span></div>
              <div><span style={{fontSize:12,color:'var(--text3)'}}>Days left: </span><span style={{fontSize:13,fontWeight:700,color:'var(--text)'}}>{daysLeft}</span></div>
              <div><span style={{fontSize:12,color:'var(--text3)'}}>Projected: </span><span style={{fontSize:13,fontWeight:700,color:paceColor}}>{projectedContracts} contracts</span></div>
            </div>

            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
              <div style={{padding:'10px 12px',borderRadius:8,background:'var(--gold-faint)',border:'1px solid var(--gold-border)'}}>
                <div style={{fontSize:11,color:'var(--gold)',fontWeight:700,textTransform:'uppercase',marginBottom:2}}>WCL Contracts</div>
                <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:22,fontWeight:900,color:'var(--gold)'}}>{totalWclContracts}</div>
              </div>
              <div style={{padding:'10px 12px',borderRadius:8,background:'var(--purple-faint,rgba(167,139,250,0.1))',border:'1px solid var(--purple-border,rgba(167,139,250,0.3))'}}>
                <div style={{fontSize:11,color:'var(--purple,#A78BFA)',fontWeight:700,textTransform:'uppercase',marginBottom:2}}>SMS Contracts</div>
                <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:22,fontWeight:900,color:'var(--purple,#A78BFA)'}}>{totalSmsContracts}</div>
              </div>
            </div>
          </div>

          {/* Combined Reach */}
          <div style={CARD}>
            <div style={{fontSize:13,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.12em',color:'var(--text3)',marginBottom:14}}>All-Time Combined Reach</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))',gap:10,marginBottom:14}}>
              <Stat label="Total Reach" value={totalReach.toLocaleString()} color="var(--gold)"/>
              <Stat label="Engaged" value={totalConv.toLocaleString()}/>
              <Stat label="Contracts" value={totalContracts} color={totalContracts>0?'var(--green)':'var(--text)'}/>
              <Stat label="Closed" value={totalClosed} color={totalClosed>0?'var(--green)':'var(--text)'}/>
            </div>

            {/* WCL vs SMS breakdown */}
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
              <div style={{padding:'12px 14px',borderRadius:10,background:'var(--gold-faint)',border:'1px solid var(--gold-border)'}}>
                <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',color:'var(--gold)',marginBottom:8,letterSpacing:'0.08em'}}>WCL (Wholesale)</div>
                <div style={{display:'flex',flexDirection:'column',gap:5}}>
                  {[['Received',combWcl.rec],['Accepted',combWcl.acc],['Qualified',combWcl.qual],['Offers',combWcl.off],['Contracts',combWcl.con],['Closed',combWcl.cls]].map(([l,v])=>(
                    <div key={l} style={{display:'flex',justifyContent:'space-between',fontSize:13}}>
                      <span style={{color:'var(--text3)'}}>{l}</span>
                      <span style={{fontFamily:'JetBrains Mono,monospace',fontWeight:700,color:'var(--text)'}}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{padding:'12px 14px',borderRadius:10,background:'var(--purple-faint,rgba(167,139,250,0.1))',border:'1px solid var(--purple-border,rgba(167,139,250,0.3))'}}>
                <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',color:'var(--purple,#A78BFA)',marginBottom:8,letterSpacing:'0.08em'}}>SMS ({campaigns.filter(c=>!c.deleted).length} campaigns)</div>
                <div style={{display:'flex',flexDirection:'column',gap:5}}>
                  {[['Sent',combSms.sent],['Interested',combSms.int],['Convos',combSms.conv],['Qualified',combSms.qual],['Offers',combSms.off],['Contracts',combSms.con],['Closed',combSms.cls]].map(([l,v])=>(
                    <div key={l} style={{display:'flex',justifyContent:'space-between',fontSize:13}}>
                      <span style={{color:'var(--text3)'}}>{l}</span>
                      <span style={{fontFamily:'JetBrains Mono,monospace',fontWeight:700,color:'var(--text)'}}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Combined conversion rates */}
          {(totalReach>0)&&(
            <div style={CARD}>
              <div style={{fontSize:13,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.12em',color:'var(--text3)',marginBottom:14}}>Combined Conversion</div>
              <div style={{display:'flex',flexDirection:'column',gap:8}}>
                {[
                  {l:'Reach → Engaged',a:totalConv,b:totalReach},
                  {l:'Engaged → Contracts',a:totalContracts,b:totalConv},
                  {l:'Reach → Contracts',a:totalContracts,b:totalReach},
                  {l:'Contracts → Closed',a:totalClosed,b:totalContracts},
                ].filter(x=>x.b>0).map(({l,a,b})=>{
                  const r=Math.round(safePct(a,b));
                  return(
                    <div key={l} style={{display:'flex',alignItems:'center',gap:12}}>
                      <div style={{fontSize:13,color:'var(--text2)',minWidth:160}}>{l}</div>
                      <div style={{flex:1,height:6,background:'var(--surface3)',borderRadius:3,overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${Math.min(100,r)}%`,background:'var(--gold)',borderRadius:3}}/>
                      </div>
                      <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:13,fontWeight:700,color:'var(--text)',minWidth:42,textAlign:'right'}}>{r}%</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
