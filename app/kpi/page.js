'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import DatePicker from '../components/DatePicker.js';

const toN=v=>{const n=Number(String(v||'').replace(/[^0-9.-]/g,''));return isNaN(n)?0:n;};
const pct=(a,b)=>b>0?Math.round(a/b*100):0;
const fmt=n=>Number(n||0).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
const todayISO=()=>new Date().toISOString().slice(0,10);

const INPUT={minHeight:48,padding:'12px 16px',borderRadius:10,background:'var(--surface3)',border:'1px solid var(--border)',color:'var(--text)',fontSize:15,outline:'none',fontFamily:'Outfit,sans-serif',width:'100%',transition:'border-color 0.15s'};
const LBL={fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.11em',color:'var(--text3)',marginBottom:8,display:'block'};
const CARD={background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'20px 24px',marginBottom:14};
const SEC={fontSize:13,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.12em',color:'var(--text3)',marginBottom:14};

const REJ_REASONS=['Bad comps','No equity','Luxury price','Lot/land','Bad area','Wrong market','Already listed','Other'];
const REJ_COLORS=['var(--gold)','var(--cyan)','var(--purple)','var(--red)','var(--orange)','var(--green)','var(--text2)','var(--border2)'];
const CAMP_COLORS=['var(--gold)','var(--cyan)','var(--purple)','var(--red)','var(--orange)','var(--green)'];
const CHART_TOOLTIP={contentStyle:{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'12px 16px',fontFamily:'JetBrains Mono,monospace',fontSize:13},labelStyle:{color:'var(--text2)',marginBottom:6}};

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

function fmtNum(n){return Number(n||0).toLocaleString('en-US');}

function getPeriodEntries(period,entries){
  const today=todayISO();
  if(period==='Daily') return entries.filter(e=>e.date===today);
  if(period==='Weekly'){
    const weekAgo=new Date(Date.now()-6*86400000).toISOString().slice(0,10);
    return entries.filter(e=>e.date>=weekAgo&&e.date<=today);
  }
  const monthStart=today.slice(0,7)+'-01';
  return entries.filter(e=>e.date>=monthStart&&e.date<=today);
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

  // WCL form
  const [wclDate,setWclDate]=useState(todayISO());
  const [received,setReceived]=useState('');
  const [accepted,setAccepted]=useState('');
  const [rejReasons,setRejReasons]=useState([]);
  const [convos,setConvos]=useState('');
  const [qualified,setQualified]=useState('');
  const [offersMade,setOffersMade]=useState('');
  const [offerResponses,setOfferResponses]=useState('');
  const [contracts,setContracts]=useState('');
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

  // Delete campaign PIN modal
  const [deletePinTarget,setDeletePinTarget]=useState(null);
  const [deletePinInput,setDeletePinInput]=useState('');
  const [deletePinError,setDeletePinError]=useState('');
  const pinRef=useRef(null);

  useEffect(()=>{const c=()=>setIsMobile(window.innerWidth<768);c();window.addEventListener('resize',c);return()=>window.removeEventListener('resize',c);},[]);

  useEffect(()=>{
    fetch('/api/kpi/wcl').then(r=>r.json()).then(d=>{if(Array.isArray(d))setWclEntries(d.filter(e=>!e.deleted));}).catch(()=>{});
    fetch('/api/kpi/campaigns').then(r=>r.json()).then(d=>{if(Array.isArray(d))setCampaigns(d.filter(c=>!c.deleted));}).catch(()=>{});
    fetch('/api/kpi/sms').then(r=>r.json()).then(d=>{if(Array.isArray(d))setSmsEntries(d.filter(e=>!e.deleted));}).catch(()=>{});
  },[]);

  useEffect(()=>{if(deletePinTarget&&pinRef.current)pinRef.current.focus();},[deletePinTarget]);

  // Period-filtered data for funnel
  const periodEntries=getPeriodEntries(period,wclEntries);
  const todayEntry=wclEntries.find(e=>e.date===todayISO())||null;

  const pRec=periodEntries.reduce((s,e)=>s+toN(e.received),0);
  const pAcc=periodEntries.reduce((s,e)=>s+toN(e.accepted),0);
  const pConvos=periodEntries.reduce((s,e)=>s+toN(e.conversations),0);
  const pQual=periodEntries.reduce((s,e)=>s+toN(e.qualified),0);
  const pOffers=periodEntries.reduce((s,e)=>s+toN(e.offersMade),0);
  const pResp=periodEntries.reduce((s,e)=>s+toN(e.offerResponses),0);
  const pContracts=periodEntries.reduce((s,e)=>s+toN(e.contracts),0);

  const accRate=pct(pAcc,pRec);
  const contRate=pct(pConvos,pAcc);
  const qualRate=pct(pQual,pConvos);
  const offerRate=pct(pOffers,pQual);
  const respRate=pct(pResp,pOffers);
  const contractRate=pct(pContracts,pResp);

  // All-time totals for combined tab
  const totalRec=wclEntries.reduce((s,e)=>s+toN(e.received),0);
  const totalAcc=wclEntries.reduce((s,e)=>s+toN(e.accepted),0);
  const totalContracts=wclEntries.reduce((s,e)=>s+toN(e.contracts),0);

  // Form live rates
  const fRec=toN(received),fAcc=toN(accepted),fConvos=toN(convos),fQual=toN(qualified),fOffers=toN(offersMade),fResp=toN(offerResponses),fContracts=toN(contracts);
  const fAccRate=pct(fAcc,fRec),fContRate=pct(fConvos,fAcc),fQualRate=pct(fQual,fConvos),fOfferRate=pct(fOffers,fQual),fRespRate=pct(fResp,fOffers),fContractRate=pct(fContracts,fResp);

  const chartData=wclEntries.slice().reverse().map(e=>({date:e.date?.slice(5),received:toN(e.received),accepted:toN(e.accepted),offers:toN(e.offersMade),contracts:toN(e.contracts)}));

  const rejMap={};
  wclEntries.forEach(e=>{(e.rejectionReasons||[]).forEach(r=>{rejMap[r]=(rejMap[r]||0)+1;});});
  const rejData=Object.entries(rejMap).sort((a,b)=>b[1]-a[1]).map(([reason,count])=>({reason,count,pct:totalAcc>0?Math.round(count/totalAcc*100):0}));

  function wclDiagnostic(){
    if(pRec===0)return null;
    if(accRate<55)return{color:'var(--gold)',bg:'var(--gold-faint)',border:'var(--gold-border)',title:'WCL QUALITY ISSUE',msg:`Acceptance rate is ${accRate}%. Check targeting filters.`};
    if(contRate<40)return{color:'var(--orange)',bg:'var(--orange-faint)',border:'var(--orange-border)',title:'CONTACT SPEED ISSUE',msg:`Reaching ${contRate}% of accepted leads. Contact within 5 minutes.`};
    if(qualRate<25)return{color:'var(--orange)',bg:'var(--orange-faint)',border:'var(--orange-border)',title:'CONVERSATION DEPTH ISSUE',msg:`${qualRate}% qualification rate. Conversations not going deep enough into MCTP.`};
    if(offerRate<90)return{color:'var(--red)',bg:'var(--red-faint)',border:'var(--red-border)',title:'OFFER DISCIPLINE ISSUE',msg:`${offerRate}% offer rate. Every qualified lead gets an offer. No exceptions.`};
    if(respRate<20)return{color:'var(--red)',bg:'var(--red-faint)',border:'var(--red-border)',title:'OFFER DELIVERY ISSUE',msg:`${respRate}% response rate. Presenting terms before price? Delivering same day?`};
    if(contractRate<15)return{color:'var(--gold)',bg:'var(--gold-faint)',border:'var(--gold-border)',title:'NEGOTIATION ISSUE',msg:'Sellers engaging but not signing. Review objection handling.'};
    return{color:'var(--green)',bg:'var(--green-faint)',border:'var(--green-border)',title:'✓ WCL PIPELINE HEALTHY',msg:'Maintain volume and monitor daily.'};
  }
  const diag=wclDiagnostic();

  async function saveWCL(){
    setSaving(true);
    const body={date:wclDate,received,accepted,rejectionReasons:rejReasons,conversations:convos,qualified,offersMade,offerResponses,contracts};
    if(editId){
      const res=await fetch(`/api/kpi/wcl/${editId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      if(res.ok){const d=await res.json();setWclEntries(e=>e.map(x=>x.id===editId?d:x));}
    } else {
      const res=await fetch('/api/kpi/wcl',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
      if(res.ok){const d=await res.json();setWclEntries(e=>[d,...e]);}
    }
    setShowLogForm(false);setEditId(null);setReceived('');setAccepted('');setRejReasons([]);setConvos('');setQualified('');setOffersMade('');setOfferResponses('');setContracts('');setWclDate(todayISO());
    setSaving(false);
  }

  function editEntry(e){
    setEditId(e.id);setWclDate(e.date||todayISO());setReceived(String(e.received||''));setAccepted(String(e.accepted||''));setRejReasons(e.rejectionReasons||[]);setConvos(String(e.conversations||''));setQualified(String(e.qualified||''));setOffersMade(String(e.offersMade||''));setOfferResponses(String(e.offerResponses||''));setContracts(String(e.contracts||''));
    setShowLogForm(true);window.scrollTo({top:0,behavior:'smooth'});
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

  function openDeleteModal(camp){setDeletePinTarget(camp);setDeletePinInput('');setDeletePinError('');}

  async function confirmDeleteCampaign(){
    if(deletePinInput!=='2608'){setDeletePinError('Incorrect PIN');setDeletePinInput('');if(pinRef.current)pinRef.current.focus();return;}
    const res=await fetch(`/api/kpi/campaigns/${deletePinTarget.id}`,{method:'DELETE'});
    if(res.ok){setCampaigns(cs=>cs.filter(c=>c.id!==deletePinTarget.id));setSmsEntries(es=>es.filter(e=>e.campaignId!==deletePinTarget.id));}
    else{setDeletePinError('Delete failed. Try again.');}
    setDeletePinTarget(null);
  }

  async function saveLogDay(campId){
    const body={campaignId:campId,date:ldDate,sent:ldSent,landlines:ldLandlines,optOuts:ldOptOuts,replies:ldReplies,conversations:ldConvos,qualified:ldQualified,offersMade:ldOffers,offerResponses:ldResponses,contracts:ldContracts};
    const res=await fetch('/api/kpi/sms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(res.ok){const d=await res.json();setSmsEntries(es=>[...es,d]);}
    setShowLogDay(null);setLdSent('');setLdLandlines('');setLdOptOuts('');setLdReplies('');setLdConvos('');setLdQualified('');setLdOffers('');setLdResponses('');setLdContracts('');setLdDate(todayISO());
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

  const totalSMSContracts=smsEntries.reduce((s,e)=>s+toN(e.contracts),0);
  const nowDate=new Date();
  const endDateGoal=new Date('2026-07-25');
  const daysLeft=Math.max(0,Math.ceil((endDateGoal-nowDate)/86400000));
  const totalDays=Math.ceil((endDateGoal-new Date('2026-01-01'))/86400000);
  const daysElapsed=totalDays-daysLeft;
  const combinedContracts=totalContracts+totalSMSContracts;
  const goalContracts=6;
  const onPace=daysElapsed>0?(combinedContracts/daysElapsed*totalDays)>=goalContracts:false;
  const paceStatus=combinedContracts>=goalContracts?'DONE':onPace?'ON TRACK':'BEHIND';
  const paceColor=paceStatus==='DONE'?'var(--green)':paceStatus==='ON TRACK'?'var(--gold)':'var(--red)';

  const p=isMobile?16:24;

  const funnelRows=[
    {l:'Leads Received', num:pRec, rate:null},
    {l:'Leads Accepted', num:pAcc, rate:accRate, low:60, high:75},
    {l:'Conversations',  num:pConvos, rate:contRate, low:40, high:55},
    {l:'Qualified',      num:pQual, rate:qualRate, low:30, high:40},
    {l:'Offers Made',    num:pOffers, rate:offerRate, low:90, high:100},
    {l:'Offer Responses',num:pResp, rate:respRate, low:25, high:35},
    {l:'Contracts',      num:pContracts, rate:contractRate, low:15, high:25},
  ];

  const activeCamps=campaigns.filter(c=>c.status==='active');
  const pausedCamps=campaigns.filter(c=>c.status==='paused');
  const archivedCamps=campaigns.filter(c=>c.status==='archived');

  function CampaignCard({camp}){
    const stats=campStats(camp);
    const cc=camp.color&&camp.color.startsWith('var')?camp.color:'var(--gold)';
    const isActive=camp.status==='active';
    const isPaused=camp.status==='paused';
    const campEntries=smsEntries.filter(e=>e.campaignId===camp.id).sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    const campRates=[
      {l:'Deliverability',r:stats.delivRate,low:65,high:75},{l:'Reply Rate',r:stats.replyRate,low:2,high:5},
      {l:'Conversation Rate',r:stats.convoRate,low:40,high:60},{l:'Qualification Rate',r:stats.qualRate,low:30,high:40},
      {l:'Offer Rate',r:stats.offerRate,low:90,high:100},{l:'Response Rate',r:stats.respRate,low:25,high:35},{l:'Contract Rate',r:stats.contractRate,low:15,high:25},
    ];
    return(
      <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderLeft:`4px solid ${cc}`,borderRadius:14,padding:'20px 24px',marginBottom:14}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:10,marginBottom:14}}>
          <div>
            <div style={{fontSize:16,fontWeight:800,color:'var(--text)',marginBottom:6}}>{camp.name}</div>
            <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
              {camp.county&&<span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:'var(--surface3)',color:'var(--text2)',border:'1px solid var(--border)'}}>{camp.county}</span>}
              {camp.filterStack&&<span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:'var(--surface3)',color:'var(--text2)',border:'1px solid var(--border)'}}>{camp.filterStack}</span>}
              {isActive&&<span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:'var(--green-faint)',color:'var(--green)',border:'1px solid var(--green-border)',fontWeight:700}}>ACTIVE</span>}
              {isPaused&&<span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:'var(--surface3)',color:'var(--text2)',border:'1px solid var(--border)',fontWeight:700}}>PAUSED</span>}
              {camp.status==='archived'&&<span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:'var(--surface3)',color:'var(--text3)',border:'1px solid var(--border)',fontWeight:700}}>ARCHIVED</span>}
            </div>
          </div>
          <button onClick={()=>openDeleteModal(camp)} style={{padding:'5px 12px',borderRadius:7,border:'1px solid var(--red-border)',background:'var(--red-faint)',color:'var(--red)',fontSize:12,fontWeight:600,cursor:'pointer'}}>Delete</button>
        </div>

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

        {campRates.map(({l,r,low,high})=>{
          const color=r>=high?'var(--gold)':r>=low?'var(--green)':'var(--red)';
          const status=r>=high?'ABOVE':r>=low?'IN RANGE':'BELOW';
          return(
            <div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid var(--border)',flexWrap:'wrap',gap:6}}>
              <span style={{fontSize:13,color:'var(--text2)'}}>{l}</span>
              <div style={{display:'flex',alignItems:'center',gap:8}}>
                <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:16,fontWeight:800,color}}>{r}%</span>
                <span style={{fontSize:10,padding:'1px 6px',borderRadius:4,background:color+'18',color,border:`1px solid ${color}40`,fontWeight:700}}>{status}</span>
                <span style={{fontSize:10,color:'var(--text3)'}}>target {low}–{high}%</span>
              </div>
            </div>
          );
        })}

        <div style={{display:'flex',gap:10,flexWrap:'wrap',padding:'10px 0 6px'}}>
          {[{l:'Sent',v:stats.totalSent},{l:'Replies',v:stats.replies},{l:'Qualified',v:stats.cQual},{l:'Contracts',v:stats.cContracts}].map(({l,v})=>(
            <div key={l} style={{textAlign:'center',padding:'8px 12px',borderRadius:8,background:'var(--surface3)'}}>
              <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:18,fontWeight:700,color:'var(--text)'}}>{v}</div>
              <div style={{fontSize:11,color:'var(--text3)'}}>{l}</div>
            </div>
          ))}
          {stats.costPerReply&&<div style={{textAlign:'center',padding:'8px 12px',borderRadius:8,background:'var(--surface3)'}}><div style={{fontFamily:'JetBrains Mono,monospace',fontSize:18,fontWeight:700,color:'var(--text)'}}>{'$'+stats.costPerReply}</div><div style={{fontSize:11,color:'var(--text3)'}}>$/Reply</div></div>}
          {stats.costPerContract&&<div style={{textAlign:'center',padding:'8px 12px',borderRadius:8,background:'var(--surface3)'}}><div style={{fontFamily:'JetBrains Mono,monospace',fontSize:18,fontWeight:700,color:'var(--green)'}}>{'$'+Number(stats.costPerContract).toLocaleString()}</div><div style={{fontSize:11,color:'var(--text3)'}}>$/Contract</div></div>}
        </div>

        {/* Action buttons */}
        <div style={{display:'flex',gap:8,marginTop:10,flexWrap:'wrap'}}>
          {isActive&&<button onClick={()=>setShowLogDay(showLogDay===camp.id?null:camp.id)} style={{padding:'8px 16px',borderRadius:8,border:'none',background:cc,color:'#000',fontWeight:700,fontSize:13,cursor:'pointer'}}>Log Day</button>}
          {isActive&&<button onClick={()=>pauseCampaign(camp.id)} style={{padding:'8px 16px',borderRadius:8,border:'1px solid var(--border)',background:'var(--surface3)',color:'var(--text2)',fontSize:13,cursor:'pointer'}}>Pause</button>}
          {isActive&&<button onClick={()=>archiveCampaign(camp.id)} style={{padding:'8px 16px',borderRadius:8,border:'1px solid var(--border)',background:'var(--surface3)',color:'var(--text3)',fontSize:12,cursor:'pointer'}}>Archive</button>}
          {isPaused&&<button onClick={()=>resumeCampaign(camp.id)} style={{padding:'8px 16px',borderRadius:8,border:'none',background:cc,color:'#000',fontWeight:700,fontSize:13,cursor:'pointer'}}>Resume</button>}
          {isPaused&&<button onClick={()=>archiveCampaign(camp.id)} style={{padding:'8px 16px',borderRadius:8,border:'1px solid var(--border)',background:'var(--surface3)',color:'var(--text3)',fontSize:12,cursor:'pointer'}}>Archive</button>}
        </div>

        {/* Log Day form — active only */}
        {isActive&&showLogDay===camp.id&&(
          <div style={{marginTop:14,padding:'16px',borderRadius:10,background:'var(--surface3)',border:'1px solid var(--border)'}}>
            <div style={{fontSize:13,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',marginBottom:12}}>Log Day — {camp.name}</div>
            <div style={{marginBottom:12}}><DatePicker label="Date" value={ldDate} onChange={setLdDate}/></div>
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(3,1fr)',gap:10}}>
              {[{l:'Sent',v:ldSent,set:setLdSent},{l:'Landlines',v:ldLandlines,set:setLdLandlines},{l:'Opt-Outs',v:ldOptOuts,set:setLdOptOuts}].map(({l,v,set})=>(
                <div key={l}><label style={LBL}>{l}</label><input style={INPUT} type="number" value={v} onChange={e=>set(e.target.value)} placeholder="" onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)' }/></div>
              ))}
              <div><label style={LBL}>Deliverable (auto)</label><div style={{minHeight:48,padding:'12px 16px',borderRadius:10,background:'var(--surface2)',border:'1px solid var(--border)',fontFamily:'JetBrains Mono,monospace',color:'var(--cyan)',fontSize:15,display:'flex',alignItems:'center'}}>{Math.max(0,toN(ldSent)-toN(ldLandlines)-toN(ldOptOuts)).toLocaleString()}</div></div>
              {[{l:'Replies',v:ldReplies,set:setLdReplies},{l:'Conversations',v:ldConvos,set:setLdConvos},{l:'Qualified',v:ldQualified,set:setLdQualified},{l:'Offers Made',v:ldOffers,set:setLdOffers},{l:'Offer Responses',v:ldResponses,set:setLdResponses},{l:'Contracts',v:ldContracts,set:setLdContracts}].map(({l,v,set})=>(
                <div key={l}><label style={LBL}>{l}</label><input style={INPUT} type="number" value={v} onChange={e=>set(e.target.value)} placeholder="" onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/></div>
              ))}
            </div>
            <button onClick={()=>saveLogDay(camp.id)} style={{marginTop:12,width:'100%',minHeight:46,borderRadius:10,border:'none',background:cc,color:'#000',fontWeight:800,fontSize:14,cursor:'pointer'}}>Save Day Log</button>
          </div>
        )}

        {/* Logged days with edit/delete */}
        {campEntries.length>0&&(
          <div style={{marginTop:14}}>
            <button onClick={()=>setExpandedDaysFor(expandedDaysFor===camp.id?null:camp.id)} style={{background:'none',border:'none',color:'var(--text3)',fontSize:13,cursor:'pointer',padding:0}}>
              {expandedDaysFor===camp.id?'▲':'▶'} {campEntries.length} day{campEntries.length!==1?'s':''} logged
            </button>
            {expandedDaysFor===camp.id&&(
              <div style={{marginTop:10,display:'flex',flexDirection:'column',gap:6}}>
                {campEntries.map(entry=>(
                  <div key={entry.id} style={{background:'var(--surface2)',border:'1px solid var(--border)',borderRadius:8,padding:'10px 12px'}}>
                    {editSmsId===entry.id?(
                      <div>
                        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:8,marginBottom:10}}>
                          {['sent','landlines','optOuts','replies','conversations','qualified','offersMade','offerResponses','contracts'].map(field=>(
                            <div key={field}><label style={{...LBL,marginBottom:4}}>{field}</label>
                              <input style={{...INPUT,minHeight:36,padding:'6px 10px',fontSize:13}} type="number" value={editSmsData[field]||''} onChange={e=>setEditSmsData(d=>({...d,[field]:e.target.value}))}/>
                            </div>
                          ))}
                        </div>
                        <div style={{display:'flex',gap:8}}>
                          <button onClick={saveEditSmsDay} style={{padding:'6px 14px',borderRadius:6,border:'none',background:'var(--green)',color:'#000',fontWeight:700,fontSize:13,cursor:'pointer'}}>Save</button>
                          <button onClick={()=>{setEditSmsId(null);setEditSmsData({});}} style={{padding:'6px 14px',borderRadius:6,border:'1px solid var(--border)',background:'transparent',color:'var(--text2)',fontSize:13,cursor:'pointer'}}>Cancel</button>
                        </div>
                      </div>
                    ):(
                      <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap'}}>
                        <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,color:'var(--text3)',minWidth:72}}>{entry.date}</span>
                        <div style={{display:'flex',gap:8,flex:1,flexWrap:'wrap'}}>
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

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)',paddingBottom:isMobile?80:40}}>
      <nav style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:`0 ${p}px`,height:58,background:'var(--surface)',borderBottom:'1px solid var(--border)',position:'sticky',top:0,zIndex:100}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button onClick={()=>router.push('/')} style={{background:'none',border:'none',color:'var(--text3)',fontSize:20,cursor:'pointer',padding:'4px 8px',borderRadius:6}}>←</button>
          <span style={{fontWeight:700,fontSize:16,color:'var(--text)'}}>KPI Tracker</span>
        </div>
        <div style={{display:'flex',gap:6}}>
          {['Daily','Weekly','Monthly'].map(per=>(
            <button key={per} onClick={()=>setPeriod(per)} style={{padding:'6px 14px',borderRadius:20,border:`1px solid ${period===per?'var(--gold-border)':'var(--border)'}`,background:period===per?'var(--gold-faint)':'transparent',color:period===per?'var(--gold)':'var(--text3)',fontSize:13,fontWeight:period===per?700:500,cursor:'pointer'}}>{per}</button>
          ))}
        </div>
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
            <div style={{display:'flex',justifyContent:'flex-end',marginBottom:14}}>
              <button onClick={()=>{setShowLogForm(f=>!f);setEditId(null);}} style={{padding:'10px 20px',borderRadius:10,border:'none',background:'var(--gold)',color:'#000',fontWeight:800,fontSize:14,cursor:'pointer',minHeight:46}}>
                {showLogForm&&!editId?'Close Form':'Log Today'}
              </button>
            </div>

            {showLogForm&&(
              <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderLeft:'3px solid var(--gold)',borderRadius:14,padding:'20px 24px',marginBottom:16}}>
                <div style={SEC}>Log WCL Entry — {editId?'Editing':'Today'}</div>
                <div style={{marginBottom:14}}>
                  <DatePicker label="Date" value={wclDate} onChange={setWclDate}/>
                </div>
                {[
                  {l:'Leads Received',v:received,set:setReceived,rateEl:null},
                  {l:'Leads Accepted',v:accepted,set:setAccepted,rateEl:fRec>0?<RateIndicator rate={fAccRate} low={60} high={75}/>:null},
                  {l:'Conversations',v:convos,set:setConvos,rateEl:fAcc>0?<RateIndicator rate={fContRate} low={40} high={55}/>:null},
                  {l:'Qualified',v:qualified,set:setQualified,rateEl:fConvos>0?<RateIndicator rate={fQualRate} low={30} high={40}/>:null},
                  {l:'Offers Made',v:offersMade,set:setOffersMade,rateEl:fQual>0?<RateIndicator rate={fOfferRate} low={90} high={100}/>:null},
                  {l:'Offer Responses',v:offerResponses,set:setOfferResponses,rateEl:fOffers>0?<RateIndicator rate={fRespRate} low={25} high={35}/>:null},
                  {l:'Contracts',v:contracts,set:setContracts,rateEl:fResp>0?<RateIndicator rate={fContractRate} low={15} high={25}/>:null},
                ].map(({l,v,set,rateEl})=>(
                  <div key={l} style={{marginBottom:14}}>
                    <label style={LBL}>{l}</label>
                    <div style={{display:'flex',gap:12,alignItems:'flex-start',flexWrap:'wrap'}}>
                      <input style={{...INPUT,maxWidth:200,fontFamily:'JetBrains Mono,monospace',fontSize:18}} type="number" value={v} onChange={e=>set(e.target.value)} placeholder="" onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/>
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
                  {saving?'Saving...':'Save Entry'}
                </button>
              </div>
            )}

            {/* Today's Totals */}
            <div style={{...CARD,marginBottom:14}}>
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                <span style={SEC}>Today's Totals</span>
                {!todayEntry&&<span style={{fontSize:12,color:'var(--text3)'}}>No entry logged today</span>}
              </div>
              <div style={{display:'grid',gridTemplateColumns:'repeat(4,1fr)',gap:10}}>
                {[
                  {l:'Received',v:toN(todayEntry?.received)},
                  {l:'Accepted',v:toN(todayEntry?.accepted)},
                  {l:'Offers',v:toN(todayEntry?.offersMade)},
                  {l:'Contracts',v:toN(todayEntry?.contracts)},
                ].map(({l,v})=>(
                  <div key={l} style={{textAlign:'center',padding:'12px 8px',borderRadius:10,background:'var(--surface3)'}}>
                    <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:isMobile?24:32,fontWeight:800,color:v>0?'var(--text)':'var(--text3)',lineHeight:1,marginBottom:4}}>{v}</div>
                    <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--text3)'}}>{l}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Funnel — number + rate */}
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
                        noData?(
                          <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:16,fontWeight:800,color:'var(--text3)'}}>—%</span>
                        ):(
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
              {offerRate<90&&pOffers<pQual&&pQual>0&&!periodEntries.length===0&&(
                <div style={{marginTop:8,fontSize:13,color:'var(--red)',padding:'8px 12px',borderRadius:8,background:'var(--red-faint)',border:'1px solid var(--red-border)'}}>
                  Every qualified lead must receive an offer.
                </div>
              )}
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

            {/* Entry log */}
            {wclEntries.length>0&&(
              <div style={CARD}>
                <div style={SEC}>Entry Log</div>
                {[...wclEntries].sort((a,b)=>(b.date||'').localeCompare(a.date||'')).map(e=>(
                  <div key={e.id} style={{display:'flex',alignItems:'center',gap:10,padding:'12px 0',borderBottom:'1px solid var(--border)',flexWrap:'wrap'}}>
                    <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,color:'var(--text3)',minWidth:72}}>{e.date}</span>
                    <span style={{fontSize:11,padding:'1px 8px',borderRadius:4,background:'var(--gold-faint)',color:'var(--gold)',border:'1px solid var(--gold-border)',fontWeight:700}}>{e.loggedBy}</span>
                    <div style={{display:'flex',gap:10,flex:1,flexWrap:'wrap'}}>
                      {[{l:'rcvd',v:e.received},{l:'acc',v:e.accepted},{l:'cnv',v:e.conversations},{l:'off',v:e.offersMade},{l:'con',v:e.contracts}].map(({l,v})=>toN(v)>0&&(
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
                  <div><label style={LBL}>List Size</label><input style={{...INPUT,fontFamily:'JetBrains Mono,monospace',fontSize:18}} type="number" value={campList} onChange={e=>setCampList(e.target.value)} onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)' }/></div>
                  <div><label style={LBL}>Daily Send Volume</label><input style={INPUT} type="number" value={campDaily} onChange={e=>setCampDaily(e.target.value)} onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)' }/></div>
                  <div><label style={LBL}>Duration (days)</label><input style={INPUT} type="number" value={campDuration} onChange={e=>setCampDuration(e.target.value)} onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)' }/></div>
                  <div><label style={LBL}>List Cost ($)</label>
                    <div style={{position:'relative'}}><span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text3)',pointerEvents:'none',zIndex:1}}>$</span>
                    <input style={{...INPUT,paddingLeft:24}} type="number" value={campCost} onChange={e=>setCampCost(e.target.value)} onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)' }/></div>
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
            {campaigns.length===0&&<div style={{textAlign:'center',padding:'48px 0',color:'var(--text3)'}}>No campaigns yet. Create your first campaign above.</div>}
          </>
        )}

        {/* ── COMBINED TAB ── */}
        {mainTab==='Combined'&&(
          <>
            <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderLeft:`3px solid ${paceColor}`,borderRadius:14,padding:'20px 24px',marginBottom:14}}>
              <div style={SEC}>90-Day Goal Progress</div>
              <div style={{height:8,borderRadius:4,background:'var(--surface3)',overflow:'hidden',marginBottom:12}}>
                <div style={{height:'100%',borderRadius:4,width:`${Math.min(100,pct(combinedContracts,goalContracts))}%`,background:paceColor,transition:'width 0.5s ease'}}/>
              </div>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:14,flexWrap:'wrap',gap:8}}>
                <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:48,fontWeight:900,color:paceColor,lineHeight:1}}>{combinedContracts}</div>
                <div style={{textAlign:'right'}}>
                  <div style={{fontSize:22,fontWeight:800,color:paceColor}}>{paceStatus}</div>
                  <div style={{fontSize:13,color:'var(--text3)'}}>{goalContracts} contracts by July 25, 2026</div>
                  <div style={{fontSize:13,color:'var(--text3)'}}>{daysLeft} days remaining</div>
                </div>
              </div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(4,1fr)',gap:12,marginBottom:14}}>
              {[{l:'WCL Contracts',v:totalContracts,c:'var(--gold)'},{l:'SMS Contracts',v:totalSMSContracts,c:'var(--cyan)'},{l:'Total Contracts',v:combinedContracts,c:paceColor},{l:'Goal',v:goalContracts,c:'var(--text3)'}].map(s=>(
                <div key={s.l} style={{...CARD,textAlign:'center',padding:'16px'}}>
                  <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:28,fontWeight:800,color:s.c,marginBottom:4}}>{s.v}</div>
                  <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--text3)'}}>{s.l}</div>
                </div>
              ))}
            </div>
            <div style={CARD}>
              <div style={SEC}>Channel Comparison</div>
              <div style={{display:'grid',gridTemplateColumns:'auto 1fr 1fr',gap:'0',borderRadius:10,overflow:'hidden',border:'1px solid var(--border)'}}>
                {[{},{},...funnelRows.filter(r=>r.rate!==null)].map((row,i)=>{
                  if(i===0)return <div key="h0" style={{padding:'10px 14px',background:'var(--surface3)',borderBottom:'1px solid var(--border)',fontWeight:700,color:'var(--text3)',fontSize:12}}>Metric</div>;
                  if(i===1)return [<div key="wcl-h" style={{padding:'10px 14px',background:'var(--surface3)',borderBottom:'1px solid var(--border)',fontWeight:700,color:'var(--gold)',fontSize:12}}>WCL</div>,<div key="sms-h" style={{padding:'10px 14px',background:'var(--surface3)',borderBottom:'1px solid var(--border)',fontWeight:700,color:'var(--cyan)',fontSize:12}}>SMS Avg</div>];
                  const fr=funnelRows.filter(r=>r.rate!==null)[i-2];if(!fr)return null;
                  const smsCampStats=activeCamps.map(c=>campStats(c));
                  const smsKey=['delivRate','replyRate','convoRate','qualRate','offerRate','respRate','contractRate'][i-2];
                  const smsAvg=smsCampStats.length>0?Math.round(smsCampStats.reduce((s,st)=>s+(st[smsKey]||0),0)/smsCampStats.length):0;
                  const wclWins=fr.rate>smsAvg;
                  return [
                    <div key={`l${i}`} style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',color:'var(--text2)',fontSize:13}}>{fr.l}</div>,
                    <div key={`w${i}`} style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',fontFamily:'JetBrains Mono,monospace',fontSize:15,fontWeight:700,color:wclWins?'var(--gold)':'var(--text3)',background:wclWins?'var(--gold-faint)':'transparent'}}>{fr.rate}%</div>,
                    <div key={`s${i}`} style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',fontFamily:'JetBrains Mono,monospace',fontSize:15,fontWeight:700,color:!wclWins?'var(--cyan)':'var(--text3)',background:!wclWins?'var(--cyan-faint)':'transparent'}}>{smsAvg}%</div>,
                  ];
                })}
              </div>
            </div>
          </>
        )}
      </div>

      {/* Delete campaign PIN modal */}
      {deletePinTarget&&(
        <div style={{position:'fixed',inset:0,background:'rgba(0,0,0,0.85)',zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',padding:16}}>
          <div style={{background:'var(--surface)',border:'1px solid var(--red-border)',borderRadius:16,padding:28,width:'100%',maxWidth:400}}>
            <div style={{fontWeight:800,fontSize:17,marginBottom:8,color:'var(--text)'}}>Confirm Delete</div>
            <div style={{fontSize:13,color:'var(--text2)',marginBottom:20}}>Enter admin PIN to permanently delete <strong>"{deletePinTarget.name}"</strong> and all its data.</div>
            <input
              ref={pinRef}
              type="password"
              inputMode="numeric"
              maxLength={4}
              value={deletePinInput}
              onChange={e=>setDeletePinInput(e.target.value.replace(/\D/g,'').slice(0,4))}
              onKeyDown={e=>{if(e.key==='Enter')confirmDeleteCampaign();}}
              placeholder="PIN"
              style={{width:'100%',textAlign:'center',letterSpacing:'0.4em',fontFamily:'JetBrains Mono,monospace',fontSize:24,fontWeight:700,padding:'12px',borderRadius:10,background:'var(--surface3)',border:`1px solid ${deletePinError?'var(--red)':'var(--border)'}`,color:'var(--text)',outline:'none',boxSizing:'border-box',marginBottom:8}}
            />
            {deletePinError&&<div style={{color:'var(--red)',fontSize:13,textAlign:'center',marginBottom:12}}>{deletePinError}</div>}
            <div style={{display:'flex',gap:10,marginTop:4}}>
              <button onClick={()=>setDeletePinTarget(null)} style={{flex:1,padding:'11px 0',borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--text2)',fontWeight:600,cursor:'pointer'}}>Cancel</button>
              <button onClick={confirmDeleteCampaign} style={{flex:1,padding:'11px 0',borderRadius:8,border:'none',background:'var(--red)',color:'#fff',fontWeight:700,cursor:'pointer'}}>Confirm Delete</button>
            </div>
          </div>
        </div>
      )}

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
