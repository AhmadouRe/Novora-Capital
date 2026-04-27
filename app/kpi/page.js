'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import DatePicker from '../components/DatePicker.js';

const toN=v=>{const n=Number(String(v||'').replace(/[^0-9.-]/g,''));return isNaN(n)?0:n;};
const pct=(a,b)=>b>0?Math.round(a/b*100):0;
const fmt=n=>Number(n||0).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
const todayISO=()=>new Date().toISOString().slice(0,10);

function getWeekStart(dateStr){
  const d=new Date((dateStr||todayISO())+'T00:00:00');
  const day=d.getDay();
  const diff=day===0?6:day-1;
  d.setDate(d.getDate()-diff);
  return d.toISOString().slice(0,10);
}

const INPUT={minHeight:48,padding:'12px 16px',borderRadius:10,background:'var(--surface3)',border:'1px solid var(--border)',color:'var(--text)',fontSize:15,outline:'none',fontFamily:'Outfit,sans-serif',width:'100%',transition:'border-color 0.15s',boxSizing:'border-box'};
const LBL={fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.11em',color:'var(--text3)',marginBottom:8,display:'block'};
const CARD={background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'20px 24px',marginBottom:14};
const SEC={fontSize:13,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.12em',color:'var(--text3)',marginBottom:14};

const REJ_REASONS=['Bad comps','No equity','Luxury price','Lot/land','Bad area','Wrong market','Already listed','Other'];
const REJ_COLORS=['var(--gold)','var(--cyan)','var(--purple)','var(--red)','var(--orange)','var(--green)','var(--text2)','var(--border2)'];
const CAMP_COLORS=['var(--gold)','var(--cyan)','var(--purple)','var(--red)','var(--orange)','var(--green)'];
const CHART_TOOLTIP={contentStyle:{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'12px 16px',fontFamily:'JetBrains Mono,monospace',fontSize:13},labelStyle:{color:'var(--text2)',marginBottom:6}};

// 90-Day Pace constants
const PACE_START=new Date('2026-04-25T00:00:00');
const PACE_END=new Date('2026-07-25T00:00:00');
const PACE_TOTAL_DAYS=91;
const GOAL_CONTRACTS=6;

function fmtNum(n){return Number(n||0).toLocaleString('en-US');}

function NInput({id,value,onChange,autoFocus}){
  return <input
    id={id}
    style={{...INPUT,maxWidth:200,fontFamily:'JetBrains Mono,monospace',fontSize:18}}
    type="text" inputMode="numeric" pattern="[0-9]*"
    value={value}
    onChange={e=>onChange(e.target.value.replace(/[^0-9]/g,''))}
    autoFocus={autoFocus}
    onFocus={e=>e.target.style.borderColor='var(--border2)'}
    onBlur={e=>e.target.style.borderColor='var(--border)'}
  />;
}

function RateIndicator({rate,low,high}){
  const n=toN(rate);
  const color=n>=high?'var(--gold)':n>=low?'var(--green)':'var(--red)';
  const status=n>=high?'ABOVE':n>=low?'IN RANGE':'BELOW';
  return <div style={{display:'flex',alignItems:'center',gap:8,marginTop:6}}>
    <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:14,fontWeight:700,color}}>{n}%</span>
    <span style={{fontSize:11,padding:'1px 6px',borderRadius:4,background:color+'18',color,border:`1px solid ${color}40`,fontWeight:700}}>{status}</span>
    <span style={{fontSize:11,color:'var(--text3)'}}>target {low}–{high}%</span>
  </div>;
}

export default function KPITracker(){
  const router=useRouter();
  const [isMobile,setIsMobile]=useState(false);
  const [mainTab,setMainTab]=useState('WCL');
  const [period,setPeriod]=useState('Daily');
  const [wclEntries,setWclEntries]=useState([]);
  const [campaigns,setCampaigns]=useState([]);
  const [smsEntries,setSmsEntries]=useState([]);
  const [showLogForm,setShowLogForm]=useState(false);
  const [wclToast,setWclToast]=useState('');
  const [selectedDate,setSelectedDate]=useState(todayISO());

  // WCL form
  const [wclDate,setWclDate]=useState(todayISO());
  const [received,setReceived]=useState('');
  const [accepted,setAccepted]=useState('');
  const [rejReasons,setRejReasons]=useState([]);
  const [qualified,setQualified]=useState('');
  const [offersMade,setOffersMade]=useState('');
  const [offerResponses,setOfferResponses]=useState('');
  const [contracts,setContracts]=useState('');
  const [closed,setClosed]=useState('');
  const [editId,setEditId]=useState(null);
  const [saving,setSaving]=useState(false);

  // Campaign form
  const [showCampForm,setShowCampForm]=useState(false);
  const [campName,setCampName]=useState('');
  const [campCounty,setCampCounty]=useState('');
  const [campFilter,setCampFilter]=useState('Absentee+Tax Delinquent+Equity');
  const [campList,setCampList]=useState('');
  const [campDaily,setCampDaily]=useState('450');
  const [campDuration,setCampDuration]=useState('');
  const [campCost,setCampCost]=useState('150');
  const [campStart,setCampStart]=useState(todayISO());
  const [campColor,setCampColor]=useState('var(--gold)');

  // Log Day form
  const [showLogDay,setShowLogDay]=useState(null);
  const [ldDate,setLdDate]=useState(todayISO());
  const [ldSent,setLdSent]=useState('');
  const [ldLandlines,setLdLandlines]=useState('');
  const [ldOptOuts,setLdOptOuts]=useState('');
  const [ldReplies,setLdReplies]=useState('');
  const [ldConvos,setLdConvos]=useState('');
  const [ldQualified,setLdQualified]=useState('');
  const [ldOffers,setLdOffers]=useState('');
  const [ldResponses,setLdResponses]=useState('');
  const [ldContracts,setLdContracts]=useState('');

  // SMS entry edit
  const [editSmsId,setEditSmsId]=useState(null);
  const [editSmsData,setEditSmsData]=useState({});
  const [expandedDaysFor,setExpandedDaysFor]=useState(null);

  useEffect(()=>{const c=()=>setIsMobile(window.innerWidth<768);c();window.addEventListener('resize',c);return()=>window.removeEventListener('resize',c);},[]);

  useEffect(()=>{
    fetch('/api/kpi/wcl').then(r=>r.json()).then(d=>{if(Array.isArray(d))setWclEntries(d.filter(e=>!e.deleted));}).catch(()=>{});
    fetch('/api/kpi/campaigns').then(r=>r.json()).then(d=>{if(Array.isArray(d))setCampaigns(d.filter(c=>!c.deleted));}).catch(()=>{});
    fetch('/api/kpi/sms').then(r=>r.json()).then(d=>{if(Array.isArray(d))setSmsEntries(d.filter(e=>!e.deleted));}).catch(()=>{});
  },[]);

  // When selectedDate changes → pre-fill form if entry exists
  useEffect(()=>{
    if(!showLogForm)return;
    const existing=wclEntries.find(e=>e.date===selectedDate);
    if(existing){
      setEditId(existing.id);
      setWclDate(existing.date||selectedDate);
      setReceived(String(existing.received||''));
      setAccepted(String(existing.accepted||''));
      setRejReasons(existing.rejectionReasons||[]);
      setQualified(String(existing.qualified??existing.conversations??''));
      setOffersMade(String(existing.offersMade||''));
      setOfferResponses(String(existing.offerResponses||''));
      setContracts(String(existing.contracts||''));
      setClosed(String(existing.closed||''));
    } else {
      setEditId(null);
      setWclDate(selectedDate);
      setReceived('');setAccepted('');setRejReasons([]);setQualified('');
      setOffersMade('');setOfferResponses('');setContracts('');setClosed('');
    }
  },[selectedDate,showLogForm]);// eslint-disable-line

  function openLogForm(){
    setShowLogForm(true);
    const existing=wclEntries.find(e=>e.date===selectedDate);
    if(existing){
      setEditId(existing.id);
      setWclDate(existing.date||selectedDate);
      setReceived(String(existing.received||''));
      setAccepted(String(existing.accepted||''));
      setRejReasons(existing.rejectionReasons||[]);
      setQualified(String(existing.qualified??existing.conversations??''));
      setOffersMade(String(existing.offersMade||''));
      setOfferResponses(String(existing.offerResponses||''));
      setContracts(String(existing.contracts||''));
      setClosed(String(existing.closed||''));
    } else {
      setEditId(null);setWclDate(selectedDate);
      setReceived('');setAccepted('');setRejReasons([]);setQualified('');
      setOffersMade('');setOfferResponses('');setContracts('');setClosed('');
    }
    setTimeout(()=>{const el=document.getElementById('wcl-first-input');if(el)el.focus();},80);
  }

  // Period-filtered data for funnel
  function getPeriodEntries(period,entries){
    const today=todayISO();
    if(period==='Daily') return entries.filter(e=>e.date===today);
    if(period==='Weekly'){
      const weekStart=getWeekStart(today);
      return entries.filter(e=>e.date>=weekStart&&e.date<=today);
    }
    const monthStr=today.slice(0,7);
    return entries.filter(e=>e.date.startsWith(monthStr));
  }

  const periodEntries=getPeriodEntries(period,wclEntries);
  const todayEntry=wclEntries.find(e=>e.date===todayISO())||null;
  const selectedEntry=wclEntries.find(e=>e.date===selectedDate)||null;

  // Funnel totals (period-based)
  const pRec=periodEntries.reduce((s,e)=>s+toN(e.received),0);
  const pAcc=periodEntries.reduce((s,e)=>s+toN(e.accepted),0);
  const pQual=periodEntries.reduce((s,e)=>s+toN(e.qualified??e.conversations??0),0);
  const pOffers=periodEntries.reduce((s,e)=>s+toN(e.offersMade),0);
  const pResp=periodEntries.reduce((s,e)=>s+toN(e.offerResponses),0);
  const pContracts=periodEntries.reduce((s,e)=>s+toN(e.contracts),0);
  const pClosed=periodEntries.reduce((s,e)=>s+toN(e.closed??0),0);

  const accRate=pct(pAcc,pRec);
  const qualRate=pct(pQual,pAcc);
  const offerRate=pct(pOffers,pQual);
  const respRate=pct(pResp,pOffers);
  const contractRate=pct(pContracts,pResp);
  const closedRate=pct(pClosed,pContracts);

  // All-time totals
  const totalRec=wclEntries.reduce((s,e)=>s+toN(e.received),0);
  const totalAcc=wclEntries.reduce((s,e)=>s+toN(e.accepted),0);
  const totalContracts=wclEntries.reduce((s,e)=>s+toN(e.contracts),0);
  const totalClosed=wclEntries.reduce((s,e)=>s+toN(e.closed??0),0);

  // Form live calcs
  const fRec=toN(received),fAcc=toN(accepted),fQual=toN(qualified),fOffers=toN(offersMade),fResp=toN(offerResponses),fContracts=toN(contracts),fClosed=toN(closed);
  const fAccRate=pct(fAcc,fRec),fQualRate=pct(fQual,fAcc),fOfferRate=pct(fOffers,fQual),fRespRate=pct(fResp,fOffers),fContractRate=pct(fContracts,fResp),fClosedRate=pct(fClosed,fContracts);

  const chartData=wclEntries.slice().reverse().map(e=>({
    date:e.date?.slice(5),
    received:toN(e.received),
    accepted:toN(e.accepted),
    offers:toN(e.offersMade),
    contracts:toN(e.contracts)
  }));

  const rejMap={};
  wclEntries.forEach(e=>{(e.rejectionReasons||[]).forEach(r=>{rejMap[r]=(rejMap[r]||0)+1;});});
  const rejData=Object.entries(rejMap).sort((a,b)=>b[1]-a[1]).map(([reason,count])=>({reason,count,pct:totalAcc>0?Math.round(count/totalAcc*100):0}));

  // Sequential diagnostics — only first failure fires
  function wclDiagnostic(){
    if(pRec===0)return null;
    if(pOffers<pQual&&pQual>0)return{color:'var(--red)',bg:'var(--red-faint)',border:'var(--red-border)',title:'OFFER DISCIPLINE ISSUE',msg:`${pOffers} offers made vs ${pQual} qualified leads. Every qualified lead gets an offer. No exceptions.`};
    if(pOffers>0&&pResp===0)return{color:'var(--red)',bg:'var(--red-faint)',border:'var(--red-border)',title:'OFFER DELIVERY ISSUE',msg:'Offers delivered but zero responses. Are you presenting terms before price? Delivering same day?'};
    if(pResp>0&&pContracts===0)return{color:'var(--gold)',bg:'var(--gold-faint)',border:'var(--gold-border)',title:'NEGOTIATION ISSUE',msg:'Sellers engaging but not signing. Review objection handling and contract close techniques.'};
    if(accRate<55)return{color:'var(--gold)',bg:'var(--gold-faint)',border:'var(--gold-border)',title:'WCL QUALITY ISSUE',msg:`Acceptance rate is ${accRate}%. Check targeting filters and list quality.`};
    return{color:'var(--green)',bg:'var(--green-faint)',border:'var(--green-border)',title:'✓ WCL PIPELINE HEALTHY',msg:'Maintain volume and monitor daily.'};
  }
  const diag=wclDiagnostic();

  async function saveWCL(){
    setSaving(true);
    const body={date:wclDate,received,accepted,rejectionReasons:rejReasons,qualified,offersMade,offerResponses,contracts,closed};
    if(editId){
      const res=await fetch(`/api/kpi/wcl/${editId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      if(res.ok){const d=await res.json();setWclEntries(e=>e.map(x=>x.id===editId?d:x));}
    } else {
      const res=await fetch('/api/kpi/wcl',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      if(res.ok){const d=await res.json();setWclEntries(e=>[d,...e]);setEditId(d.id);}
    }
    // save-without-close: clear numeric fields, keep date, show toast
    setReceived('');setAccepted('');setRejReasons([]);setQualified('');
    setOffersMade('');setOfferResponses('');setContracts('');setClosed('');
    setWclToast('✓ Saved!');
    setTimeout(()=>setWclToast(''),2200);
    setTimeout(()=>{const el=document.getElementById('wcl-first-input');if(el)el.focus();},100);
    setSaving(false);
  }

  function editEntry(e){
    setEditId(e.id);
    setWclDate(e.date||todayISO());
    setReceived(String(e.received||''));
    setAccepted(String(e.accepted||''));
    setRejReasons(e.rejectionReasons||[]);
    setQualified(String(e.qualified??e.conversations??''));
    setOffersMade(String(e.offersMade||''));
    setOfferResponses(String(e.offerResponses||''));
    setContracts(String(e.contracts||''));
    setClosed(String(e.closed||''));
    setShowLogForm(true);
    window.scrollTo({top:0,behavior:'smooth'});
  }

  async function deleteWCL(id){
    if(!confirm('Delete this entry?'))return;
    const res=await fetch(`/api/kpi/wcl/${id}`,{method:'DELETE'});
    if(res.ok)setWclEntries(e=>e.filter(x=>x.id!==id));
  }

  async function createCampaign(){
    const body={name:campName,county:campCounty,filterStack:campFilter,listSize:campList,dailySend:campDaily,duration:campDuration,cost:campCost,startDate:campStart,color:campColor,status:'active'};
    const res=await fetch('/api/kpi/campaigns',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(res.ok){const d=await res.json();setCampaigns(c=>[...c,d]);setShowCampForm(false);setCampName('');setCampCounty('');setCampList('');setCampDuration('');setCampCost('150');}
  }

  async function pauseCampaign(id){
    const res=await fetch(`/api/kpi/campaigns/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'paused'})});
    if(res.ok){const d=await res.json();setCampaigns(cs=>cs.map(c=>c.id===id?d:c));}
  }

  async function resumeCampaign(id){
    const res=await fetch(`/api/kpi/campaigns/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'active'})});
    if(res.ok){const d=await res.json();setCampaigns(cs=>cs.map(c=>c.id===id?d:c));}
  }

  async function archiveCampaign(id){
    const res=await fetch(`/api/kpi/campaigns/${id}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'archived'})});
    if(res.ok){const d=await res.json();setCampaigns(cs=>cs.map(c=>c.id===id?d:c));}
  }

  async function saveLogDay(campId){
    const body={campaignId:campId,date:ldDate,sent:ldSent,landlines:ldLandlines,optOuts:ldOptOuts,replies:ldReplies,conversations:ldConvos,qualified:ldQualified,offersMade:ldOffers,offerResponses:ldResponses,contracts:ldContracts};
    const res=await fetch('/api/kpi/sms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(res.ok){const d=await res.json();setSmsEntries(es=>[...es,d]);}
    // keep log panel open after save — only reset fields, not panel
    setLdSent('');setLdLandlines('');setLdOptOuts('');setLdReplies('');setLdConvos('');setLdQualified('');setLdOffers('');setLdResponses('');setLdContracts('');setLdDate(todayISO());
  }

  async function saveEditSmsDay(){
    const res=await fetch(`/api/kpi/sms/${editSmsId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(editSmsData)});
    if(res.ok){const d=await res.json();setSmsEntries(es=>es.map(e=>e.id===editSmsId?d:e));}
    setEditSmsId(null);setEditSmsData({});
  }

  async function deleteSmsDay(id){
    if(!confirm('Delete this day log?'))return;
    const res=await fetch(`/api/kpi/sms/${id}`,{method:'DELETE'});
    if(res.ok)setSmsEntries(es=>es.filter(e=>e.id!==id));
  }

  function campStats(camp){
    const entries=smsEntries.filter(e=>e.campaignId===camp.id);
    const totalSent=entries.reduce((s,e)=>s+toN(e.sent),0);
    const totalLand=entries.reduce((s,e)=>s+toN(e.landlines),0);
    const totalOpt=entries.reduce((s,e)=>s+toN(e.optOuts),0);
    const deliv=totalSent-totalLand-totalOpt;
    const replies=entries.reduce((s,e)=>s+toN(e.replies),0);
    const cConvos=entries.reduce((s,e)=>s+toN(e.conversations),0);
    const cQual=entries.reduce((s,e)=>s+toN(e.qualified),0);
    const cOffers=entries.reduce((s,e)=>s+toN(e.offersMade),0);
    const cResp=entries.reduce((s,e)=>s+toN(e.offerResponses),0);
    const cContracts=entries.reduce((s,e)=>s+toN(e.contracts),0);
    const planned=toN(camp.dailySend)*toN(camp.duration);
    const costN=toN(camp.cost);
    return{totalSent,deliv,replies,cConvos,cQual,cOffers,cResp,cContracts,planned,
      costPerReply:replies>0?(costN/replies).toFixed(2):null,
      costPerContract:cContracts>0?(costN/cContracts).toFixed(0):null,
      delivRate:pct(deliv,totalSent),replyRate:pct(replies,deliv),convoRate:pct(cConvos,replies),
      qualRate:pct(cQual,cConvos),offerRate:pct(cOffers,cQual),respRate:pct(cResp,cOffers),contractRate:pct(cContracts,cResp)};
  }

  // 90-Day Pace
  const totalSMSContracts=smsEntries.reduce((s,e)=>s+toN(e.contracts),0);
  const nowDate=new Date();
  const daysLeft=Math.max(0,Math.ceil((PACE_END-nowDate)/86400000));
  const daysElapsed=Math.max(0,Math.floor((nowDate-PACE_START)/86400000));
  const combinedContracts=totalContracts+totalSMSContracts;
  const onPace=daysElapsed>0?(combinedContracts/daysElapsed*PACE_TOTAL_DAYS)>=GOAL_CONTRACTS:false;
  const paceStatus=combinedContracts>=GOAL_CONTRACTS?'DONE':onPace?'ON TRACK':'BEHIND';
  const paceColor=paceStatus==='DONE'?'var(--green)':paceStatus==='ON TRACK'?'var(--gold)':'var(--red)';

  const p=isMobile?16:24;

  const funnelRows=[
    {l:'Leads Received',  num:pRec, rate:null},
    {l:'Leads Accepted',  num:pAcc, rate:accRate, low:60, high:75},
    {l:'Qualified',       num:pQual, rate:qualRate, low:30, high:40},
    {l:'Offers Made',     num:pOffers, rate:offerRate, low:90, high:100},
    {l:'Offer Responses', num:pResp, rate:respRate, low:25, high:35},
    {l:'Contracts',       num:pContracts, rate:contractRate, low:15, high:25},
    {l:'Closed',          num:pClosed, rate:closedRate, low:80, high:100},
  ];

  const activeCamps=campaigns.filter(c=>c.status==='active');
  const pausedCamps=campaigns.filter(c=>c.status==='paused');
  const archivedCamps=campaigns.filter(c=>c.status==='archived');

  // 14-day calendar strip dates
  const calDates=[];
  for(let i=13;i>=0;i--){
    const d=new Date();
    d.setDate(d.getDate()-i);
    calDates.push(d.toISOString().slice(0,10));
  }
  const DAY_ABBR=['Su','Mo','Tu','We','Th','Fr','Sa'];

  function CampaignCard({camp}){
    const stats=campStats(camp);
    const cc=camp.color&&camp.color.startsWith('var')?camp.color:'var(--gold)';
    const isActive=camp.status==='active';
    const isPaused=camp.status==='paused';
    const isArchived=camp.status==='archived';
    const campEntries=smsEntries.filter(e=>e.campaignId===camp.id).sort((a,b)=>(b.date||'').localeCompare(a.date||''));

    // Inline PIN delete state
    const [showDeletePin,setShowDeletePin]=useState(false);
    const [deletePinVal,setDeletePinVal]=useState('');
    const [deletePinErr,setDeletePinErr]=useState('');
    const pinRef=useRef(null);
    useEffect(()=>{if(showDeletePin&&pinRef.current)pinRef.current.focus();},[showDeletePin]);

    async function confirmDel(){
      if(deletePinVal!=='2608'){setDeletePinErr('Incorrect PIN');setDeletePinVal('');if(pinRef.current)pinRef.current.focus();return;}
      const res=await fetch(`/api/kpi/campaigns/${camp.id}`,{method:'DELETE'});
      if(res.ok){setCampaigns(cs=>cs.filter(c=>c.id!==camp.id));setSmsEntries(es=>es.filter(e=>e.campaignId!==camp.id));}
      else setDeletePinErr('Delete failed.');
    }

    const campRates=[
      {l:'Deliverability',r:stats.delivRate,low:65,high:75},
      {l:'Reply Rate',r:stats.replyRate,low:2,high:5},
      {l:'Conversation Rate',r:stats.convoRate,low:40,high:60},
      {l:'Qualification Rate',r:stats.qualRate,low:30,high:40},
      {l:'Offer Rate',r:stats.offerRate,low:90,high:100},
      {l:'Response Rate',r:stats.respRate,low:25,high:35},
      {l:'Contract Rate',r:stats.contractRate,low:15,high:25},
    ];

    return(
      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderLeft:`4px solid ${cc}`,borderRadius:14,padding:'20px 24px',marginBottom:14}}>
        {/* Header */}
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:10,marginBottom:14}}>
          <div>
            <div style={{fontSize:16,fontWeight:800,color:'var(--text)',marginBottom:6}}>{camp.name}</div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {camp.county&&<span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:'var(--surface3)',color:'var(--text2)',border:'1px solid var(--border)'}}>{camp.county}</span>}
              {camp.filterStack&&<span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:'var(--surface3)',color:'var(--text2)',border:'1px solid var(--border)'}}>{camp.filterStack}</span>}
              {isActive&&<span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:'var(--green-faint)',color:'var(--green)',border:'1px solid var(--green-border)',fontWeight:700}}>ACTIVE</span>}
              {isPaused&&<span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:'var(--surface3)',color:'var(--text2)',border:'1px solid var(--border)',fontWeight:700}}>PAUSED</span>}
              {isArchived&&<span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:'var(--surface3)',color:'var(--text3)',border:'1px solid var(--border)',fontWeight:700}}>ARCHIVED</span>}
            </div>
          </div>
          {/* Inline delete PIN */}
          {!showDeletePin?(
            <button onClick={()=>{if(isArchived){if(confirm(`Delete "${camp.name}"?`)){fetch(`/api/kpi/campaigns/${camp.id}`,{method:'DELETE'}).then(r=>{if(r.ok){setCampaigns(cs=>cs.filter(c=>c.id!==camp.id));setSmsEntries(es=>es.filter(e=>e.campaignId!==camp.id));}});}}else setShowDeletePin(true);}} style={{padding:'5px 12px',borderRadius:7,border:'1px solid var(--red-border)',background:'var(--red-faint)',color:'var(--red)',fontSize:12,fontWeight:600,cursor:'pointer'}}>Delete</button>
          ):(
            <div style={{display:'flex',flexDirection:'column',alignItems:'flex-end',gap:6}}>
              <input
                ref={pinRef}
                type="password" inputMode="numeric" maxLength={4}
                value={deletePinVal}
                onChange={e=>setDeletePinVal(e.target.value.replace(/\D/g,'').slice(0,4))}
                onKeyDown={e=>{if(e.key==='Enter')confirmDel();if(e.key==='Escape'){setShowDeletePin(false);setDeletePinVal('');setDeletePinErr('');}}}
                placeholder="PIN"
                style={{width:100,height:40,textAlign:'center',letterSpacing:'0.3em',fontFamily:'JetBrains Mono,monospace',fontSize:18,fontWeight:700,borderRadius:8,background:'var(--surface3)',border:`1px solid ${deletePinErr?'var(--red)':'var(--border)'}`,color:'var(--text)',outline:'none',boxSizing:'border-box'}}
              />
              {deletePinErr&&<span style={{fontSize:11,color:'var(--red)'}}>{deletePinErr}</span>}
              <div style={{display:'flex',gap:6}}>
                <button onClick={()=>{setShowDeletePin(false);setDeletePinVal('');setDeletePinErr('');}} style={{padding:'5px 10px',borderRadius:6,border:'1px solid var(--border)',background:'transparent',color:'var(--text2)',fontSize:12,cursor:'pointer'}}>Cancel</button>
                <button onClick={confirmDel} style={{padding:'5px 10px',borderRadius:6,border:'none',background:'var(--red)',color:'#fff',fontSize:12,fontWeight:700,cursor:'pointer'}}>Confirm</button>
              </div>
            </div>
          )}
        </div>

        {/* Progress bar */}
        {stats.planned>0&&(
          <div style={{marginBottom:14}}>
            <div style={{display:'flex',justifyContent:'space-between',fontSize:13,color:'var(--text3)',marginBottom:6}}>
              <span>Texts sent: {stats.totalSent.toLocaleString()} of {stats.planned.toLocaleString()}</span>
              <span>{pct(stats.totalSent,stats.planned)}%</span>
            </div>
            <div style={{height:8,borderRadius:4,background:'var(--surface3)',overflow:'hidden'}}>
              <div style={{height:'100%',borderRadius:4,width:`${Math.min(100,pct(stats.totalSent,stats.planned))}%`,background:cc}}/>
            </div>
          </div>
        )}

        {/* Numbers-first stat cards */}
        <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:14}}>
          {[{l:'Sent',v:stats.totalSent,c:'var(--text)'},{l:'Replies',v:stats.replies,c:'var(--cyan)'},{l:'Qualified',v:stats.cQual,c:'var(--gold)'},{l:'Contracts',v:stats.cContracts,c:'var(--green)'}].map(({l,v,c})=>(
            <div key={l} style={{textAlign:'center',padding:'10px 14px',borderRadius:8,background:'var(--surface3)',minWidth:70}}>
              <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:22,fontWeight:800,color:c}}>{v}</div>
              <div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>{l}</div>
            </div>
          ))}
          {stats.costPerReply&&<div style={{textAlign:'center',padding:'10px 14px',borderRadius:8,background:'var(--surface3)',minWidth:70}}><div style={{fontFamily:'JetBrains Mono,monospace',fontSize:22,fontWeight:800,color:'var(--text)'}}>{'$'+stats.costPerReply}</div><div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>$/Reply</div></div>}
          {stats.costPerContract&&<div style={{textAlign:'center',padding:'10px 14px',borderRadius:8,background:'var(--surface3)',minWidth:70}}><div style={{fontFamily:'JetBrains Mono,monospace',fontSize:22,fontWeight:800,color:'var(--green)'}}>{'$'+Number(stats.costPerContract).toLocaleString()}</div><div style={{fontSize:11,color:'var(--text3)',marginTop:2}}>$/Contract</div></div>}
        </div>

        {/* Rates */}
        {campRates.map(({l,r,low,high})=>{
          const color=r>=high?'var(--gold)':r>=low?'var(--green)':'var(--red)';
          const status=r>=high?'ABOVE':r>=low?'IN RANGE':'BELOW';
          return(
            <div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid var(--border)',flexWrap:'wrap',gap:6}}>
              <span style={{fontSize:13,color:'var(--text2)'}}>{l}</span>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:15,fontWeight:800,color}}>{r}%</span>
                <span style={{fontSize:10,padding:'1px 6px',borderRadius:4,background:color+'18',color,border:`1px solid ${color}40`,fontWeight:700}}>{status}</span>
                <span style={{fontSize:10,color:'var(--text3)'}}>target {low}–{high}%</span>
              </div>
            </div>
          );
        })}

        {/* Action buttons */}
        <div style={{display:'flex',gap:8,marginTop:12,flexWrap:'wrap'}}>
          {isActive&&<button onClick={()=>setShowLogDay(showLogDay===camp.id?null:camp.id)} style={{padding:'8px 16px',borderRadius:8,border:'none',background:cc,color:'#000',fontWeight:700,fontSize:13,cursor:'pointer'}}>Log Day</button>}
          {isActive&&<button onClick={()=>pauseCampaign(camp.id)} style={{padding:'8px 16px',borderRadius:8,border:'1px solid var(--border)',background:'var(--surface3)',color:'var(--text2)',fontSize:13,cursor:'pointer',fontWeight:600}}>Pause</button>}
          {isActive&&<button onClick={()=>archiveCampaign(camp.id)} style={{padding:'8px 16px',borderRadius:8,border:'1px solid var(--border)',background:'var(--surface3)',color:'var(--text3)',fontSize:12,cursor:'pointer'}}>Archive</button>}
          {isPaused&&<button onClick={()=>resumeCampaign(camp.id)} style={{padding:'8px 16px',borderRadius:8,border:'none',background:cc,color:'#000',fontWeight:700,fontSize:13,cursor:'pointer'}}>Resume</button>}
          {isPaused&&<button onClick={()=>archiveCampaign(camp.id)} style={{padding:'8px 16px',borderRadius:8,border:'1px solid var(--border)',background:'var(--surface3)',color:'var(--text3)',fontSize:12,cursor:'pointer'}}>Archive</button>}
        </div>

        {/* Log Day form */}
        {isActive&&showLogDay===camp.id&&(
          <div style={{marginTop:14,padding:'16px',borderRadius:10,background:'var(--surface3)',border:'1px solid var(--border)'}}>
            <div style={{fontSize:13,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',marginBottom:12}}>Log Day — {camp.name}</div>
            <div style={{marginBottom:12}}><DatePicker label="Date" value={ldDate} onChange={setLdDate}/></div>
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(3,1fr)',gap:10}}>
              {[{l:'Sent',v:ldSent,set:setLdSent},{l:'Landlines',v:ldLandlines,set:setLdLandlines},{l:'Opt-Outs',v:ldOptOuts,set:setLdOptOuts}].map(({l,v,set})=>(
                <div key={l}><label style={LBL}>{l}</label><input style={INPUT} type="text" inputMode="numeric" value={v} onChange={e=>set(e.target.value.replace(/[^0-9]/g,''))} onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)' }/></div>
              ))}
              <div><label style={LBL}>Deliverable (auto)</label><div style={{minHeight:48,padding:'12px 16px',borderRadius:10,background:'var(--surface2)',border:'1px solid var(--border)',fontFamily:'JetBrains Mono,monospace',color:'var(--cyan)',fontSize:15,display:'flex',alignItems:'center'}}>{Math.max(0,toN(ldSent)-toN(ldLandlines)-toN(ldOptOuts)).toLocaleString()}</div></div>
              {[{l:'Replies',v:ldReplies,set:setLdReplies},{l:'Conversations',v:ldConvos,set:setLdConvos},{l:'Qualified',v:ldQualified,set:setLdQualified},{l:'Offers Made',v:ldOffers,set:setLdOffers},{l:'Offer Responses',v:ldResponses,set:setLdResponses},{l:'Contracts',v:ldContracts,set:setLdContracts}].map(({l,v,set})=>(
                <div key={l}><label style={LBL}>{l}</label><input style={INPUT} type="text" inputMode="numeric" value={v} onChange={e=>set(e.target.value.replace(/[^0-9]/g,''))} onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)' }/></div>
              ))}
            </div>
            <button onClick={()=>saveLogDay(camp.id)} style={{marginTop:12,width:'100%',minHeight:46,borderRadius:10,border:'none',background:cc,color:'#000',fontWeight:800,fontSize:14,cursor:'pointer'}}>Save Day Log</button>
          </div>
        )}

        {/* VIEW HISTORY inline */}
        {campEntries.length>0&&(
          <div style={{marginTop:14}}>
            <button onClick={()=>setExpandedDaysFor(expandedDaysFor===camp.id?null:camp.id)} style={{background:'none',border:'none',color:'var(--cyan)',fontSize:13,cursor:'pointer',padding:0,fontWeight:600}}>
              {expandedDaysFor===camp.id?'▲ Hide History':'▼ View History'} ({campEntries.length} day{campEntries.length!==1?'s':''})
            </button>
            {expandedDaysFor===camp.id&&(
              <div style={{marginTop:10,borderRadius:8,overflow:'hidden',border:'1px solid var(--border)'}}>
                <div style={{display:'grid',gridTemplateColumns:'100px 1fr auto',background:'var(--surface3)',padding:'8px 12px',gap:8}}>
                  <span style={{fontSize:11,fontWeight:700,color:'var(--text3)',textTransform:'uppercase'}}>Date</span>
                  <span style={{fontSize:11,fontWeight:700,color:'var(--text3)',textTransform:'uppercase'}}>Stats</span>
                  <span style={{fontSize:11,fontWeight:700,color:'var(--text3)',textTransform:'uppercase'}}>Actions</span>
                </div>
                {campEntries.map(entry=>(
                  <div key={entry.id}>
                    {editSmsId===entry.id?(
                      <div style={{padding:'12px',borderBottom:'1px solid var(--border)',background:'var(--surface2)'}}>
                        <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8,marginBottom:10}}>
                          {['sent','landlines','optOuts','replies','conversations','qualified','offersMade','offerResponses','contracts'].map(field=>(
                            <div key={field}><label style={{...LBL,marginBottom:4,fontSize:10}}>{field}</label>
                              <input style={{...INPUT,minHeight:36,padding:'6px 10px',fontSize:13}} type="text" inputMode="numeric" value={editSmsData[field]||''} onChange={e=>setEditSmsData(d=>({...d,[field]:e.target.value.replace(/[^0-9]/g,'')}))}/>
                            </div>
                          ))}
                        </div>
                        <div style={{display:'flex',gap:8}}>
                          <button onClick={saveEditSmsDay} style={{padding:'6px 14px',borderRadius:6,border:'none',background:'var(--green)',color:'#000',fontWeight:700,fontSize:13,cursor:'pointer'}}>Save</button>
                          <button onClick={()=>{setEditSmsId(null);setEditSmsData({});}} style={{padding:'6px 14px',borderRadius:6,border:'1px solid var(--border)',background:'transparent',color:'var(--text2)',fontSize:13,cursor:'pointer'}}>Cancel</button>
                        </div>
                      </div>
                    ):(
                      <div style={{display:'grid',gridTemplateColumns:'100px 1fr auto',alignItems:'center',padding:'10px 12px',borderBottom:'1px solid var(--border)',gap:8}}>
                        <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,color:'var(--text3)'}}>{entry.date}</span>
                        <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                          {[{l:'sent',v:entry.sent},{l:'replies',v:entry.replies},{l:'qual',v:entry.qualified},{l:'con',v:entry.contracts}].map(({l,v})=>toN(v)>0&&(
                            <span key={l} style={{fontSize:12,color:'var(--text2)'}}><span style={{color:'var(--text3)'}}>{l}:</span> <span style={{fontFamily:'JetBrains Mono,monospace',fontWeight:700}}>{v}</span></span>
                          ))}
                        </div>
                        <div style={{display:'flex',gap:6}}>
                          <button onClick={()=>{setEditSmsId(entry.id);setEditSmsData({sent:entry.sent||'',landlines:entry.landlines||'',optOuts:entry.optOuts||'',replies:entry.replies||'',conversations:entry.conversations||'',qualified:entry.qualified||'',offersMade:entry.offersMade||'',offerResponses:entry.offerResponses||'',contracts:entry.contracts||''});}} style={{padding:'4px 10px',borderRadius:6,border:'1px solid var(--border)',background:'transparent',color:'var(--text3)',cursor:'pointer',fontSize:12}}>✎</button>
                          <button onClick={()=>deleteSmsDay(entry.id)} style={{padding:'4px 10px',borderRadius:6,border:'1px solid var(--red-border)',background:'var(--red-faint)',color:'var(--red)',cursor:'pointer',fontSize:12}}>×</button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // Weekly best/worst day
  const weekStart=getWeekStart(todayISO());
  const weekEntries=wclEntries.filter(e=>e.date>=weekStart&&e.date<=todayISO());
  const weekBest=weekEntries.length>1?weekEntries.reduce((b,e)=>toN(e.received)>toN(b.received)?e:b,weekEntries[0]):null;
  const weekWorst=weekEntries.length>1?weekEntries.reduce((b,e)=>toN(e.received)<toN(b.received)?e:b,weekEntries[0]):null;

  // Monthly side-by-side
  const thisMonthStr=todayISO().slice(0,7);
  const lastMonthDate=new Date();lastMonthDate.setMonth(lastMonthDate.getMonth()-1);
  const lastMonthStr=lastMonthDate.toISOString().slice(0,7);
  const thisMonthEntries=wclEntries.filter(e=>e.date.startsWith(thisMonthStr));
  const lastMonthEntries=wclEntries.filter(e=>e.date.startsWith(lastMonthStr));
  const mSum=(es,key)=>es.reduce((s,e)=>s+toN(key==='qualified'?e.qualified??e.conversations??0:e[key]),0);

  // Today all channels (for Combined tab)
  const todayISOS=todayISO();
  const todaySMSEntries=smsEntries.filter(e=>e.date===todayISOS);
  const todayWCLEntry=wclEntries.find(e=>e.date===todayISOS);
  const todayAllRec=toN(todayWCLEntry?.received)+(todaySMSEntries.reduce((s,e)=>s+toN(e.sent),0));
  const todayAllCon=toN(todayWCLEntry?.contracts)+(todaySMSEntries.reduce((s,e)=>s+toN(e.contracts),0));

  // This week all channels
  const weekWCLContracts=weekEntries.reduce((s,e)=>s+toN(e.contracts),0);
  const weekSMSEntries=smsEntries.filter(e=>e.date>=weekStart&&e.date<=todayISOS);
  const weekSMSContracts=weekSMSEntries.reduce((s,e)=>s+toN(e.contracts),0);
  const weekAllContracts=weekWCLContracts+weekSMSContracts;

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)',paddingBottom:isMobile?80:40}}>
      <nav style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:`0 ${p}px`,height:58,background:'var(--surface)',borderBottom:'1px solid var(--border)',position:'sticky',top:0,zIndex:100}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button onClick={()=>router.push('/')} style={{background:'none',border:'none',color:'var(--text3)',fontSize:20,cursor:'pointer',padding:'4px 8px',borderRadius:6}}>←</button>
          <span style={{fontWeight:700,fontSize:16,color:'var(--text)'}}>KPI Tracker</span>
        </div>
        {mainTab==='WCL'&&(
          <div style={{display:'flex',gap:6}}>
            {['Daily','Weekly','Monthly'].map(per=>(
              <button key={per} onClick={()=>setPeriod(per)} style={{padding:'6px 14px',borderRadius:20,border:`1px solid ${period===per?'var(--gold-border)':'var(--border)'}`,background:period===per?'var(--gold-faint)':'transparent',color:period===per?'var(--gold)':'var(--text3)',fontSize:13,fontWeight:period===per?700:500,cursor:'pointer'}}>{per}</button>
            ))}
          </div>
        )}
      </nav>

      <div style={{background:'var(--surface)',borderBottom:'1px solid var(--border)',display:'flex',overflowX:'auto'}}>
        {['WCL','SMS Campaigns','Combined'].map(t=>(
          <button key={t} onClick={()=>setMainTab(t)} style={{padding:'14px 24px',background:'none',border:'none',borderBottom:mainTab===t?'2px solid var(--gold)':'2px solid transparent',color:mainTab===t?'var(--gold)':'var(--text3)',fontSize:14,fontWeight:mainTab===t?700:500,cursor:'pointer',whiteSpace:'nowrap',transition:'color 0.15s'}}>{t}</button>
        ))}
      </div>

      <div style={{maxWidth:900,margin:'0 auto',padding:`${isMobile?16:24}px ${p}px`}}>

        {/* ── WCL TAB ── */}
        {mainTab==='WCL'&&(
          <>
            {/* 14-day Calendar Strip */}
            <div style={{...CARD,padding:'14px 16px',marginBottom:14,overflowX:'auto'}}>
              <div style={{display:'flex',gap:6,minWidth:'max-content'}}>
                {calDates.map(date=>{
                  const hasEntry=wclEntries.some(e=>e.date===date);
                  const isSelected=date===selectedDate;
                  const isToday=date===todayISO();
                  const dayObj=new Date(date+'T00:00:00');
                  return(
                    <button key={date} onClick={()=>setSelectedDate(date)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:3,padding:'8px 10px',borderRadius:8,border:`2px solid ${isSelected?'var(--gold)':'var(--border)'}`,background:isSelected?'var(--gold-faint)':'var(--surface2)',cursor:'pointer',minWidth:44}}>
                      <span style={{fontSize:10,color:isSelected?'var(--gold)':isToday?'var(--cyan)':'var(--text3)',fontWeight:700}}>{DAY_ABBR[dayObj.getDay()]}</span>
                      <span style={{fontSize:14,fontWeight:800,color:isSelected?'var(--gold)':'var(--text)',lineHeight:1}}>{dayObj.getDate()}</span>
                      {hasEntry?<div style={{width:6,height:6,borderRadius:'50%',background:isSelected?'var(--gold)':'var(--green)'}}/>:<div style={{width:6,height:6}}/>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Log button + toast */}
            <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
              <button onClick={()=>{if(showLogForm){setShowLogForm(false);setEditId(null);}else openLogForm();}} style={{padding:'10px 20px',borderRadius:10,border:'none',background:'var(--gold)',color:'#000',fontWeight:800,fontSize:14,cursor:'pointer',minHeight:46}}>
                {showLogForm?'Close Form':'Log Entry'}
              </button>
              {wclToast&&<span style={{fontSize:14,fontWeight:700,color:'var(--green)',padding:'6px 14px',borderRadius:8,background:'var(--green-faint)',border:'1px solid var(--green-border)'}}>{wclToast}</span>}
            </div>

            {showLogForm&&(
              <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderLeft:'3px solid var(--gold)',borderRadius:14,padding:'20px 24px',marginBottom:16}}>
                <div style={SEC}>{editId?'Editing Entry':'Log WCL Entry'} — {wclDate}</div>
                <div style={{marginBottom:14}}>
                  <DatePicker label="Date" value={wclDate} onChange={v=>{setWclDate(v);setSelectedDate(v);}}/>
                </div>
                {[
                  {id:'wcl-first-input',l:'Leads Received',v:received,set:setReceived,rateEl:null},
                  {l:'Leads Accepted',v:accepted,set:setAccepted,rateEl:fRec>0?<RateIndicator rate={fAccRate} low={60} high={75}/>:null},
                  {l:'Qualified',v:qualified,set:setQualified,rateEl:fAcc>0?<RateIndicator rate={fQualRate} low={30} high={40}/>:null},
                  {l:'Offers Made',v:offersMade,set:setOffersMade,rateEl:fQual>0?<RateIndicator rate={fOfferRate} low={90} high={100}/>:null},
                  {l:'Offer Responses',v:offerResponses,set:setOfferResponses,rateEl:fOffers>0?<RateIndicator rate={fRespRate} low={25} high={35}/>:null},
                  {l:'Contracts',v:contracts,set:setContracts,rateEl:fResp>0?<RateIndicator rate={fContractRate} low={15} high={25}/>:null},
                  {l:'Deals Closed',v:closed,set:setClosed,rateEl:fContracts>0?<RateIndicator rate={fClosedRate} low={80} high={100}/>:null},
                ].map(({id,l,v,set,rateEl})=>(
                  <div key={l} style={{marginBottom:14}}>
                    <label style={LBL}>{l}</label>
                    <div style={{display:'flex',gap:12,alignItems:'flex-start',flexWrap:'wrap'}}>
                      <NInput id={id} value={v} onChange={set}/>
                      {rateEl&&<div style={{paddingTop:12}}>{rateEl}</div>}
                    </div>
                    {l==='Leads Accepted'&&fAcc>0&&(
                      <div style={{marginTop:10}}>
                        <div style={{fontSize:12,color:'var(--text3)',marginBottom:8}}>Rejection reasons:</div>
                        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                          {REJ_REASONS.map(r=>{const on=rejReasons.includes(r);return(
                            <div key={r} onClick={()=>setRejReasons(x=>on?x.filter(i=>i!==r):[...x,r])} style={{padding:'6px 12px',borderRadius:6,border:`1px solid ${on?'var(--red-border)':'var(--border)'}`,background:on?'var(--red-faint)':'var(--surface3)',color:on?'var(--red)':'var(--text3)',cursor:'pointer',fontSize:13,fontWeight:on?700:400}}>{r}</div>
                          );})}
                        </div>
                      </div>
                    )}
                    {l==='Offers Made'&&fQual>0&&fOfferRate<90&&(
                      <div style={{marginTop:6,fontSize:13,color:'var(--orange)'}}>Every qualified lead must receive an offer — what stopped the offer?</div>
                    )}
                  </div>
                ))}
                <button onClick={saveWCL} disabled={saving} style={{width:'100%',minHeight:52,borderRadius:10,border:'none',background:'var(--gold)',color:'#000',fontWeight:800,fontSize:15,cursor:'pointer'}}>
                  {saving?'Saving…':'Save Entry'}
                </button>
              </div>
            )}

            {/* Stat cards for selected date */}
            <div style={{...CARD,marginBottom:14}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                <span style={SEC}>{selectedDate===todayISO()?'Today':'Selected Day'} — {selectedDate}</span>
                {!selectedEntry&&<span style={{fontSize:12,color:'var(--text3)'}}>No entry logged</span>}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
                {[
                  {l:'Qualified',v:toN(selectedEntry?.qualified??selectedEntry?.conversations??0)},
                  {l:'Offers',v:toN(selectedEntry?.offersMade)},
                  {l:'Contracts',v:toN(selectedEntry?.contracts)},
                  {l:'Closed',v:toN(selectedEntry?.closed??0)},
                ].map(({l,v})=>(
                  <div key={l} style={{textAlign:'center',padding:'12px 8px',borderRadius:10,background:'var(--surface3)'}}>
                    <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:isMobile?24:32,fontWeight:800,color:v>0?'var(--text)':'var(--text3)',lineHeight:1,marginBottom:4}}>{v}</div>
                    <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--text3)'}}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Funnel */}
            <div style={CARD}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:14}}>
                <span style={SEC}>WCL Funnel — {period}</span>
                {periodEntries.length===0&&period!=='Daily'&&<span style={{fontSize:12,color:'var(--text3)'}}>No entries this period</span>}
              </div>
              {funnelRows.map(({l,num,rate,low,high})=>{
                const hasRate=rate!==null&&rate!==undefined;
                const color=hasRate?(rate>=(high||100)?'var(--gold)':rate>=(low||0)?'var(--green)':'var(--red)'):'var(--text)';
                const status=hasRate?(rate>=(high||100)?'ABOVE':rate>=(low||0)?'IN RANGE':'BELOW'):null;
                const noData=periodEntries.length===0;
                return(
                  <div key={l} style={{display:'flex',alignItems:'center',padding:'12px 0',borderBottom:'1px solid var(--border)',gap:12}}>
                    <div style={{flex:1,fontSize:14,color:'var(--text2)',fontWeight:600}}>{l}</div>
                    <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:24,fontWeight:800,color:noData?'var(--text3)':'var(--text)',minWidth:50,textAlign:'center'}}>
                      {noData?'—':num}
                    </div>
                    <div style={{minWidth:140,display:'flex',alignItems:'center',justifyContent:'flex-end',gap:8}}>
                      {hasRate?(
                        noData?<span style={{fontFamily:'JetBrains Mono,monospace',fontSize:16,fontWeight:800,color:'var(--text3)'}}>—%</span>:(
                          <>
                            <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:16,fontWeight:800,color}}>{rate}%</span>
                            <span style={{fontSize:10,padding:'1px 6px',borderRadius:4,background:color+'18',color,border:`1px solid ${color}40`,fontWeight:700}}>{status}</span>
                          </>
                        )
                      ):<span style={{fontSize:12,color:'var(--text3)'}}>first step</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Activity chart */}
            {chartData.length>0&&(
              <div style={CARD}>
                <div style={SEC}>WCL Activity</div>
                <ResponsiveContainer width="100%" height={isMobile?180:240}>
                  <ComposedChart data={chartData} margin={{top:0,right:10,bottom:0,left:-20}}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
                    <XAxis dataKey="date" tick={{fontSize:12,fill:'var(--text3)'}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fontSize:12,fill:'var(--text3)'}} axisLine={false} tickLine={false}/>
                    <Tooltip {...CHART_TOOLTIP}/>
                    <Bar dataKey="received" name="Received" fill="rgba(232,160,32,0.40)" radius={[4,4,0,0]}/>
                    <Bar dataKey="accepted" name="Accepted" fill="rgba(34,197,94,0.40)" radius={[4,4,0,0]}/>
                    <Line type="monotone" dataKey="offers" name="Offers" stroke="var(--cyan)" strokeWidth={2} dot={false}/>
                    <Line type="monotone" dataKey="contracts" name="Contracts" stroke="var(--green)" strokeWidth={2} dot={false}/>
                    <Legend wrapperStyle={{fontSize:13,color:'var(--text2)'}}/>
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Rejection analysis */}
            {rejData.length>0&&(
              <div style={CARD}>
                <div style={SEC}>Rejection Analysis</div>
                {rejData.map(({reason,count,pct:p},i)=>(
                  <div key={reason} style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
                    <span style={{width:120,fontSize:13,color:'var(--text2)',flexShrink:0}}>{reason}</span>
                    <div style={{flex:1,height:8,borderRadius:4,background:'var(--surface3)',overflow:'hidden'}}>
                      <div style={{height:'100%',borderRadius:4,width:`${p}%`,background:REJ_COLORS[i%REJ_COLORS.length]}}/>
                    </div>
                    <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:13,color:'var(--text2)',minWidth:60,textAlign:'right'}}>{count} ({p}%)</span>
                  </div>
                ))}
              </div>
            )}

            {diag&&(
              <div style={{padding:'14px 18px',borderRadius:12,background:diag.bg,border:`1px solid ${diag.border}`,marginBottom:14}}>
                <div style={{fontWeight:800,color:diag.color,fontSize:14,marginBottom:4}}>{diag.title}</div>
                <div style={{color:diag.color,fontSize:13,opacity:0.85}}>{diag.msg}</div>
              </div>
            )}

            {/* Weekly best/worst */}
            {weekEntries.length>1&&(
              <div style={CARD}>
                <div style={SEC}>This Week</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                  {weekBest&&<div style={{padding:'12px',borderRadius:8,background:'var(--green-faint)',border:'1px solid var(--green-border)'}}>
                    <div style={{fontSize:11,color:'var(--green)',fontWeight:700,marginBottom:4}}>BEST DAY</div>
                    <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:22,fontWeight:800,color:'var(--green)'}}>{toN(weekBest.received)}</div>
                    <div style={{fontSize:12,color:'var(--text3)'}}>{weekBest.date} leads received</div>
                  </div>}
                  {weekWorst&&<div style={{padding:'12px',borderRadius:8,background:'var(--red-faint)',border:'1px solid var(--red-border)'}}>
                    <div style={{fontSize:11,color:'var(--red)',fontWeight:700,marginBottom:4}}>WORST DAY</div>
                    <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:22,fontWeight:800,color:'var(--red)'}}>{toN(weekWorst.received)}</div>
                    <div style={{fontSize:12,color:'var(--text3)'}}>{weekWorst.date} leads received</div>
                  </div>}
                </div>
              </div>
            )}

            {/* Monthly side-by-side */}
            {(thisMonthEntries.length>0||lastMonthEntries.length>0)&&(
              <div style={CARD}>
                <div style={SEC}>Monthly Comparison</div>
                <div style={{display:'grid',gridTemplateColumns:'auto 1fr 1fr',gap:'0',borderRadius:10,overflow:'hidden',border:'1px solid var(--border)'}}>
                  {[['Metric','var(--text3)'],['This Month','var(--gold)'],['Last Month','var(--text3)']].map(([h,c],i)=>(
                    <div key={i} style={{padding:'10px 14px',background:'var(--surface3)',borderBottom:'1px solid var(--border)',fontWeight:700,color:c,fontSize:12}}>{h}</div>
                  ))}
                  {[
                    {l:'Leads Received',k:'received'},
                    {l:'Accepted',k:'accepted'},
                    {l:'Qualified',k:'qualified'},
                    {l:'Offers Made',k:'offersMade'},
                    {l:'Contracts',k:'contracts'},
                    {l:'Closed',k:'closed'},
                  ].map(({l,k})=>[
                    <div key={`l${k}`} style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',color:'var(--text2)',fontSize:13}}>{l}</div>,
                    <div key={`t${k}`} style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',fontFamily:'JetBrains Mono,monospace',fontSize:15,fontWeight:700,color:'var(--gold)'}}>{mSum(thisMonthEntries,k)}</div>,
                    <div key={`p${k}`} style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',fontFamily:'JetBrains Mono,monospace',fontSize:15,fontWeight:600,color:'var(--text3)'}}>{mSum(lastMonthEntries,k)}</div>,
                  ])}
                </div>
              </div>
            )}

            {/* Entry log */}
            {wclEntries.length>0&&(
              <div style={CARD}>
                <div style={SEC}>Entry Log</div>
                {[...wclEntries].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map(e=>(
                  <div key={e.id} style={{display:'flex',alignItems:'center',gap:10,padding:'12px 0',borderBottom:'1px solid var(--border)',flexWrap:'wrap'}}>
                    <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,color:'var(--text3)',minWidth:72}}>{e.date}</span>
                    {e.loggedBy&&<span style={{fontSize:11,padding:'1px 8px',borderRadius:4,background:'var(--gold-faint)',color:'var(--gold)',border:'1px solid var(--gold-border)',fontWeight:700}}>{e.loggedBy}</span>}
                    <div style={{display:'flex',gap:10,flex:1,flexWrap:'wrap'}}>
                      {[{l:'rcvd',v:e.received},{l:'acc',v:e.accepted},{l:'qual',v:e.qualified??e.conversations},{l:'off',v:e.offersMade},{l:'con',v:e.contracts},{l:'cls',v:e.closed}].map(({l,v})=>toN(v)>0&&(
                        <span key={l} style={{fontSize:12,color:'var(--text2)'}}><span style={{color:'var(--text3)'}}>{l}:</span> <span style={{fontFamily:'JetBrains Mono,monospace',fontWeight:700}}>{v}</span></span>
                      ))}
                    </div>
                    <div style={{display:'flex',gap:6}}>
                      <button onClick={()=>editEntry(e)} style={{padding:'4px 10px',borderRadius:6,border:'1px solid var(--border)',background:'transparent',color:'var(--text3)',cursor:'pointer',fontSize:12}}>✎</button>
                      <button onClick={()=>deleteWCL(e.id)} style={{padding:'4px 10px',borderRadius:6,border:'1px solid var(--red-border)',background:'var(--red-faint)',color:'var(--red)',cursor:'pointer',fontSize:12}}>×</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {/* ── SMS CAMPAIGNS TAB ── */}
        {mainTab==='SMS Campaigns'&&(
          <>
            <div style={{display:'flex',justifyContent:'flex-end',marginBottom:14}}>
              <button onClick={()=>setShowCampForm(f=>!f)} style={{padding:'10px 20px',borderRadius:10,border:'none',background:'var(--purple)',color:'#fff',fontWeight:800,fontSize:14,cursor:'pointer',minHeight:46}}>
                {showCampForm?'Close':'New Campaign'}
              </button>
            </div>

            {showCampForm&&(
              <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderLeft:'3px solid var(--purple)',borderRadius:14,padding:'20px 24px',marginBottom:16}}>
                <div style={SEC}>Create SMS Campaign</div>
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:12,marginBottom:14}}>
                  <div><label style={LBL}>Campaign Name</label><input style={INPUT} value={campName} onChange={e=>setCampName(e.target.value)} onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)' }/></div>
                  <div><label style={LBL}>Target County</label><input style={INPUT} value={campCounty} onChange={e=>setCampCounty(e.target.value)} placeholder="e.g. Cuyahoga" onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)' }/></div>
                  <div><label style={LBL}>Filter Stack</label>
                    <select style={{...INPUT,height:48}} value={campFilter} onChange={e=>setCampFilter(e.target.value)}>
                      {['Absentee+Tax Delinquent+Equity','Absentee+Equity','Tax Delinquent+Equity','Absentee Only','Pre-Foreclosure','Probate','High Equity','Custom'].map(f=><option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div><label style={LBL}>List Size</label><input style={{...INPUT,fontFamily:'JetBrains Mono,monospace',fontSize:18}} type="text" inputMode="numeric" value={campList} onChange={e=>setCampList(e.target.value.replace(/[^0-9]/g,''))} onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)' }/></div>
                  <div><label style={LBL}>Daily Send Volume</label><input style={INPUT} type="text" inputMode="numeric" value={campDaily} onChange={e=>setCampDaily(e.target.value.replace(/[^0-9]/g,''))} onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)' }/></div>
                  <div><label style={LBL}>Duration (days)</label><input style={INPUT} type="text" inputMode="numeric" value={campDuration} onChange={e=>setCampDuration(e.target.value.replace(/[^0-9]/g,''))} onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)' }/></div>
                  <div><label style={LBL}>List Cost ($)</label>
                    <div style={{position:'relative'}}><span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text3)',pointerEvents:'none',zIndex:1}}>$</span>
                    <input style={{...INPUT,paddingLeft:24}} type="text" inputMode="numeric" value={campCost} onChange={e=>setCampCost(e.target.value.replace(/[^0-9]/g,''))} onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)' }/></div>
                  </div>
                  <div><DatePicker label="Start Date" value={campStart} onChange={setCampStart}/></div>
                </div>
                <div style={{marginBottom:14}}>
                  <label style={LBL}>Color</label>
                  <div style={{display:'flex',gap:8}}>{CAMP_COLORS.map(c=><div key={c} onClick={()=>setCampColor(c)} style={{width:28,height:28,borderRadius:'50%',background:c,cursor:'pointer',outline:campColor===c?`3px solid ${c}`:'3px solid transparent',outlineOffset:2}}/>)}</div>
                </div>
                {(toN(campDaily)*toN(campDuration))>0&&(
                  <div style={{padding:'12px 14px',borderRadius:10,background:'var(--surface3)',border:'1px solid var(--border)',marginBottom:14}}>
                    <div style={{fontSize:12,fontWeight:700,color:'var(--text3)',marginBottom:8}}>Preview</div>
                    {(()=>{const total=toN(campDaily)*toN(campDuration);const cost=toN(campCost);return(<>
                      {[{l:'Total Planned Sends',v:fmtNum(total)},{l:'Est. Replies at 2%',v:fmtNum(Math.round(total*0.02))},{l:'Est. Replies at 5%',v:fmtNum(Math.round(total*0.05))},{l:'Cost Per Send',v:`$${(cost/total).toFixed(4)}`},{l:'Cost/Reply at 2%',v:`$${(cost/(total*0.02)).toFixed(2)}`},{l:'Cost/Reply at 5%',v:`$${(cost/(total*0.05)).toFixed(2)}`}].map(({l,v})=>(
                        <div key={l} style={{display:'flex',justifyContent:'space-between',padding:'4px 0',fontSize:13}}><span style={{color:'var(--text3)'}}>{l}</span><span style={{fontFamily:'JetBrains Mono,monospace',color:'var(--text2)',fontWeight:600}}>{v}</span></div>
                      ))}</>);})()}
                  </div>
                )}
                <button onClick={createCampaign} style={{width:'100%',minHeight:46,borderRadius:10,border:'none',background:'var(--purple)',color:'#fff',fontWeight:800,fontSize:14,cursor:'pointer'}}>Create Campaign</button>
              </div>
            )}

            {campaigns.length===0&&<div style={{textAlign:'center',padding:'48px 0',color:'var(--text3)'}}>No campaigns yet. Create your first campaign above.</div>}

            {activeCamps.length>0&&(
              <div style={{marginBottom:8}}>
                <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:'var(--green)',marginBottom:10,padding:'0 4px'}}>Active ({activeCamps.length})</div>
                {activeCamps.map(camp=><CampaignCard key={camp.id} camp={camp}/>)}
              </div>
            )}
            {pausedCamps.length>0&&(
              <div style={{marginBottom:8}}>
                <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:'var(--text3)',marginBottom:10,padding:'0 4px'}}>Paused ({pausedCamps.length})</div>
                {pausedCamps.map(camp=><CampaignCard key={camp.id} camp={camp}/>)}
              </div>
            )}
            {archivedCamps.length>0&&(
              <div style={{marginBottom:8}}>
                <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:'var(--text3)',marginBottom:10,padding:'0 4px'}}>Archived ({archivedCamps.length})</div>
                {archivedCamps.map(camp=><CampaignCard key={camp.id} camp={camp}/>)}
              </div>
            )}
          </>
        )}

        {/* ── COMBINED TAB ── */}
        {mainTab==='Combined'&&(
          <>
            {/* Empty state */}
            {wclEntries.length===0&&smsEntries.length===0&&(
              <div style={{textAlign:'center',padding:'64px 0',color:'var(--text3)'}}>
                <div style={{fontSize:32,marginBottom:12}}>📊</div>
                <div style={{fontSize:16,fontWeight:700,marginBottom:8}}>No data yet</div>
                <div style={{fontSize:14}}>Log WCL entries or SMS campaign days to see combined stats.</div>
              </div>
            )}

            {/* 90-Day Pace */}
            <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderLeft:`3px solid ${paceColor}`,borderRadius:14,padding:'20px 24px',marginBottom:14}}>
              <div style={SEC}>90-Day Goal Progress</div>
              <div style={{height:8,borderRadius:4,background:'var(--surface3)',overflow:'hidden',marginBottom:12}}>
                <div style={{height:'100%',borderRadius:4,width:`${Math.min(100,pct(combinedContracts,GOAL_CONTRACTS))}%`,background:paceColor,transition:'width 0.5s ease'}}/>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:8}}>
                <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:48,fontWeight:900,color:paceColor,lineHeight:1}}>{combinedContracts}</div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:22,fontWeight:800,color:paceColor}}>{paceStatus}</div>
                  <div style={{fontSize:13,color:'var(--text3)'}}>{GOAL_CONTRACTS} contracts by Jul 25, 2026</div>
                  <div style={{fontSize:13,color:'var(--text3)'}}>{daysLeft} days remaining · Day {daysElapsed} of {PACE_TOTAL_DAYS}</div>
                </div>
              </div>
            </div>

            {/* Today All Channels */}
            <div style={CARD}>
              <div style={SEC}>Today — All Channels</div>
              {(wclEntries.length>0||smsEntries.length>0)?(
                <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:12}}>
                  {[
                    {l:'Total Reach',v:todayAllRec,c:'var(--gold)'},
                    {l:'WCL Contracts',v:toN(todayWCLEntry?.contracts),c:'var(--gold)'},
                    {l:'SMS Contracts',v:todaySMSEntries.reduce((s,e)=>s+toN(e.contracts),0),c:'var(--cyan)'},
                  ].map(s=>(
                    <div key={s.l} style={{textAlign:'center',padding:'14px 8px',borderRadius:10,background:'var(--surface3)'}}>
                      <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:28,fontWeight:800,color:s.c,marginBottom:4}}>{s.v}</div>
                      <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--text3)'}}>{s.l}</div>
                    </div>
                  ))}
                </div>
              ):<div style={{color:'var(--text3)',fontSize:14}}>No activity logged today.</div>}
            </div>

            {/* This Week */}
            <div style={CARD}>
              <div style={SEC}>This Week — All Channels</div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:12}}>
                {[
                  {l:'WCL Contracts',v:weekWCLContracts,c:'var(--gold)'},
                  {l:'SMS Contracts',v:weekSMSContracts,c:'var(--cyan)'},
                  {l:'Combined',v:weekAllContracts,c:paceColor},
                  {l:'WCL Leads',v:weekEntries.reduce((s,e)=>s+toN(e.received),0),c:'var(--text2)'},
                ].map(s=>(
                  <div key={s.l} style={{textAlign:'center',padding:'12px 8px',borderRadius:10,background:'var(--surface3)'}}>
                    <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:24,fontWeight:800,color:s.c,marginBottom:4}}>{s.v}</div>
                    <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--text3)'}}>{s.l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Contract totals */}
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(4,1fr)',gap:12,marginBottom:14}}>
              {[{l:'WCL Contracts',v:totalContracts,c:'var(--gold)'},{l:'SMS Contracts',v:totalSMSContracts,c:'var(--cyan)'},{l:'Total Contracts',v:combinedContracts,c:paceColor},{l:'Goal',v:GOAL_CONTRACTS,c:'var(--text3)'}].map(s=>(
                <div key={s.l} style={{...CARD,textAlign:'center',padding:'16px',marginBottom:0}}>
                  <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:28,fontWeight:800,color:s.c,marginBottom:4}}>{s.v}</div>
                  <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--text3)'}}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* Channel Comparison */}
            {(wclEntries.length>0||activeCamps.length>0)&&(
              <div style={CARD}>
                <div style={SEC}>Channel Comparison</div>
                <div style={{display:'grid',gridTemplateColumns:'auto 1fr 1fr',gap:'0',borderRadius:10,overflow:'hidden',border:'1px solid var(--border)'}}>
                  {['Metric','WCL','SMS Avg'].map((h,i)=>(
                    <div key={h} style={{padding:'10px 14px',background:'var(--surface3)',borderBottom:'1px solid var(--border)',fontWeight:700,color:i===1?'var(--gold)':i===2?'var(--cyan)':'var(--text3)',fontSize:12}}>{h}</div>
                  ))}
                  {[
                    {l:'Acceptance Rate',wcl:accRate,smsKey:'delivRate',low:60,high:75},
                    {l:'Offer Rate',wcl:offerRate,smsKey:'offerRate',low:90,high:100},
                    {l:'Response Rate',wcl:respRate,smsKey:'respRate',low:25,high:35},
                    {l:'Contract Rate',wcl:contractRate,smsKey:'contractRate',low:15,high:25},
                  ].map(({l,wcl,smsKey})=>{
                    const campStatsArr=activeCamps.map(c=>campStats(c));
                    const smsAvg=campStatsArr.length>0?Math.round(campStatsArr.reduce((s,st)=>s+(st[smsKey]||0),0)/campStatsArr.length):0;
                    const wclWins=wcl>smsAvg;
                    return [
                      <div key={`l${l}`} style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',color:'var(--text2)',fontSize:13}}>{l}</div>,
                      <div key={`w${l}`} style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',fontFamily:'JetBrains Mono,monospace',fontSize:15,fontWeight:700,color:wclWins?'var(--gold)':'var(--text3)',background:wclWins?'var(--gold-faint)':'transparent'}}>{wcl}%</div>,
                      <div key={`s${l}`} style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',fontFamily:'JetBrains Mono,monospace',fontSize:15,fontWeight:700,color:!wclWins?'var(--cyan)':'var(--text3)',background:!wclWins?'var(--cyan-faint)':'transparent'}}>{smsAvg}%</div>,
                    ];
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {isMobile&&(
        <nav style={{position:'fixed',bottom:0,left:0,right:0,height:64,background:'var(--surface)',borderTop:'1px solid var(--border)',display:'flex',alignItems:'center',zIndex:100}}>
          {[{href:'/',icon:'⌂',label:'Home'},{href:'/calculator',icon:'◈',label:'Offers'},{href:'/kpi',icon:'◉',label:'KPI'},{href:'/revenue',icon:'◆',label:'Revenue'},{href:'/scorecard',icon:'◐',label:'Score'}].map(item=>(
            <div key={item.href} onClick={()=>router.push(item.href)} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:2,cursor:'pointer',color:item.href==='/kpi'?'var(--gold)':'var(--text3)'}}>
              <span style={{fontSize:18}}>{item.icon}</span><span style={{fontSize:10,fontWeight:600}}>{item.label}</span>
            </div>
          ))}
        </nav>
      )}
    </div>
  );
}
