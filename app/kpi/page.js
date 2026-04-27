'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Legend } from 'recharts';
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

function RateIndicator({rate,low,high,label}){
  const n=toN(rate);
  const color=n>=high?'var(--gold)':n>=low?'var(--green)':'var(--red)';
  const status=n>=high?'ABOVE':n>=low?'IN RANGE':'BELOW';
  return <div style={{display:'flex',alignItems:'center',gap:8,marginTop:6}}>
    <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:14,fontWeight:700,color}}>{n}%</span>
    <span style={{fontSize:11,padding:'1px 6px',borderRadius:4,background:color+'18',color,border:`1px solid ${color}40`,fontWeight:700}}>{status}</span>
    <span style={{fontSize:11,color:'var(--text3)'}}>target {low}–{high}%</span>
  </div>;
}

const CHART_TOOLTIP={contentStyle:{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:10,padding:'12px 16px',fontFamily:'JetBrains Mono,monospace',fontSize:13},labelStyle:{color:'var(--text2)',marginBottom:6}};

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
  const [showLogDay,setShowLogDay]=useState(null);

  // SMS Log Day
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

  useEffect(()=>{const c=()=>setIsMobile(window.innerWidth<768);c();window.addEventListener('resize',c);return()=>window.removeEventListener('resize',c);},[]);
  useEffect(()=>{
    fetch('/api/kpi/wcl').then(r=>r.json()).then(d=>{if(Array.isArray(d))setWclEntries(d.filter(e=>!e.deleted));}).catch(()=>{});
    fetch('/api/kpi/campaigns').then(r=>r.json()).then(d=>{if(Array.isArray(d))setCampaigns(d.filter(c=>!c.deleted));}).catch(()=>{});
    fetch('/api/kpi/sms').then(r=>r.json()).then(d=>{if(Array.isArray(d))setSmsEntries(d.filter(e=>!e.deleted));}).catch(()=>{});
  },[]);

  // WCL aggregate stats
  const totalRec=wclEntries.reduce((s,e)=>s+toN(e.received),0);
  const totalAcc=wclEntries.reduce((s,e)=>s+toN(e.accepted),0);
  const totalConvos=wclEntries.reduce((s,e)=>s+toN(e.conversations),0);
  const totalQual=wclEntries.reduce((s,e)=>s+toN(e.qualified),0);
  const totalOffers=wclEntries.reduce((s,e)=>s+toN(e.offersMade),0);
  const totalResp=wclEntries.reduce((s,e)=>s+toN(e.offerResponses),0);
  const totalContracts=wclEntries.reduce((s,e)=>s+toN(e.contracts),0);

  const accRate=pct(totalAcc,totalRec);
  const contRate=pct(totalConvos,totalAcc);
  const qualRate=pct(totalQual,totalConvos);
  const offerRate=pct(totalOffers,totalQual);
  const respRate=pct(totalResp,totalOffers);
  const contractRate=pct(totalContracts,totalResp);

  // Form live rates
  const fRec=toN(received),fAcc=toN(accepted),fConvos=toN(convos),fQual=toN(qualified),fOffers=toN(offersMade),fResp=toN(offerResponses),fContracts=toN(contracts);
  const fAccRate=pct(fAcc,fRec),fContRate=pct(fConvos,fAcc),fQualRate=pct(fQual,fConvos),fOfferRate=pct(fOffers,fQual),fRespRate=pct(fResp,fOffers),fContractRate=pct(fContracts,fResp);

  // WCL chart data
  const chartData=wclEntries.slice().reverse().map(e=>({date:e.date?.slice(5),received:toN(e.received),accepted:toN(e.accepted),offers:toN(e.offersMade),contracts:toN(e.contracts)}));

  // Rejection analysis
  const rejMap={};
  wclEntries.forEach(e=>{(e.rejectionReasons||[]).forEach(r=>{rejMap[r]=(rejMap[r]||0)+1;});});
  const rejData=Object.entries(rejMap).sort((a,b)=>b[1]-a[1]).map(([reason,count])=>({reason,count,pct:totalAcc>0?Math.round(count/totalAcc*100):0}));

  // WCL Diagnostics
  function wclDiagnostic(){
    if(totalRec===0)return null;
    if(accRate<55)return{color:'var(--gold)',bg:'var(--gold-faint)',border:'var(--gold-border)',title:'WCL QUALITY ISSUE',msg:`Acceptance rate is ${accRate}%. Check targeting filters. Are you receiving lots or luxury properties?`};
    if(contRate<40)return{color:'var(--orange)',bg:'var(--orange-faint)',border:'var(--orange-border)',title:'CONTACT SPEED ISSUE',msg:`Reaching ${contRate}% of accepted leads. Are you contacting within 5 minutes of lead coming in?`};
    if(qualRate<25)return{color:'var(--orange)',bg:'var(--orange-faint)',border:'var(--orange-border)',title:'CONVERSATION DEPTH ISSUE',msg:`${qualRate}% qualification rate. Conversations are not going deep enough into MCTP.`};
    if(offerRate<90)return{color:'var(--red)',bg:'var(--red-faint)',border:'var(--red-border)',title:'OFFER DISCIPLINE ISSUE',msg:`${offerRate}% offer rate. Every qualified lead gets an offer. No exceptions. What stopped the offer?`};
    if(respRate<20)return{color:'var(--red)',bg:'var(--red-faint)',border:'var(--red-border)',title:'OFFER DELIVERY ISSUE',msg:`${respRate}% response rate. Are you presenting terms before price? Delivering same day?`};
    if(contractRate<15)return{color:'var(--gold)',bg:'var(--gold-faint)',border:'var(--gold-border)',title:'NEGOTIATION ISSUE',msg:'Sellers engaging but not signing. Review objection handling.'};
    return{color:'var(--green)',bg:'var(--green-faint)',border:'var(--green-border)',title:'✓ WCL PIPELINE HEALTHY',msg:'Maintain volume and monitor daily.'};
  }
  const diag=wclDiagnostic();

  async function saveWCL(){
    setSaving(true);
    const body={date:wclDate,received,accepted,rejectionReasons:rejReasons,conversations:convos,qualified,offersMade,offerResponses,contracts};
    if(editId){
      await fetch(`/api/kpi/wcl/${editId}`,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    } else {
      await fetch('/api/kpi/wcl',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    }
    fetch('/api/kpi/wcl').then(r=>r.json()).then(d=>{if(Array.isArray(d))setWclEntries(d.filter(e=>!e.deleted));});
    setShowLogForm(false);setEditId(null);setReceived('');setAccepted('');setRejReasons([]);setConvos('');setQualified('');setOffersMade('');setOfferResponses('');setContracts('');setWclDate(todayISO());
    setSaving(false);
  }

  function editEntry(e){
    setEditId(e.id);setWclDate(e.date||todayISO());setReceived(String(e.received||''));setAccepted(String(e.accepted||''));setRejReasons(e.rejectionReasons||[]);setConvos(String(e.conversations||''));setQualified(String(e.qualified||''));setOffersMade(String(e.offersMade||''));setOfferResponses(String(e.offerResponses||''));setContracts(String(e.contracts||''));
    setShowLogForm(true);
  }

  async function deleteWCL(id){
    if(!confirm('Delete this entry?'))return;
    await fetch(`/api/kpi/wcl/${id}`,{method:'DELETE'});
    setWclEntries(e=>e.filter(x=>x.id!==id));
  }

  async function createCampaign(){
    const body={name:campName,county:campCounty,filterStack:campFilter,listSize:campList,dailySend:campDaily,duration:campDuration,cost:campCost,startDate:campStart,color:campColor,status:'active'};
    const res=await fetch('/api/kpi/campaigns',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    if(res.ok){const d=await res.json();setCampaigns(c=>[...c,d]);setShowCampForm(false);setCampName('');setCampCounty('');setCampList('');setCampDuration('');setCampCost('150');}
  }

  async function saveLogDay(campId){
    const body={campaignId:campId,date:ldDate,sent:ldSent,landlines:ldLandlines,optOuts:ldOptOuts,replies:ldReplies,conversations:ldConvos,qualified:ldQualified,offersMade:ldOffers,offerResponses:ldResponses,contracts:ldContracts};
    await fetch('/api/kpi/sms',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    fetch('/api/kpi/sms').then(r=>r.json()).then(d=>{if(Array.isArray(d))setSmsEntries(d.filter(e=>!e.deleted));});
    setShowLogDay(null);setLdSent('');setLdLandlines('');setLdOptOuts('');setLdReplies('');setLdConvos('');setLdQualified('');setLdOffers('');setLdResponses('');setLdContracts('');
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
    const costPerReply=replies>0?(costN/replies).toFixed(2):null;
    const costPerContract=cContracts>0?(costN/cContracts).toFixed(0):null;
    return{totalSent,deliv,replies,cConvos,cQual,cOffers,cResp,cContracts,planned,costPerReply,costPerContract,
      delivRate:pct(deliv,totalSent),replyRate:pct(replies,deliv),convoRate:pct(cConvos,replies),qualRate:pct(cQual,cConvos),offerRate:pct(cOffers,cQual),respRate:pct(cResp,cOffers),contractRate:pct(cContracts,cResp)};
  }

  // Combined stats
  const totalWCLContracts=totalContracts;
  const totalSMSContracts=smsEntries.reduce((s,e)=>s+toN(e.contracts),0);
  const nowDate=new Date();
  const endDate=new Date('2026-07-25');
  const daysLeft=Math.max(0,Math.ceil((endDate-nowDate)/86400000));
  const totalDays=Math.ceil((endDate-new Date('2026-01-01'))/86400000);
  const daysElapsed=totalDays-daysLeft;
  const combinedContracts=totalWCLContracts+totalSMSContracts;
  const goalContracts=6;
  const onPace=daysElapsed>0?(combinedContracts/daysElapsed*totalDays)>=goalContracts:false;
  const paceStatus=combinedContracts>=goalContracts?'DONE':onPace?'ON TRACK':'BEHIND';
  const paceColor=paceStatus==='DONE'?'var(--green)':paceStatus==='ON TRACK'?'var(--gold)':'var(--red)';

  const p=isMobile?16:24;
  const CAMP_COLORS=['var(--gold)','var(--cyan)','var(--purple)','var(--red)','var(--orange)','var(--green)'];

  const funnelRates=[
    {l:'Acceptance Rate',r:accRate,low:60,high:75,desc:'Accepted / Received'},
    {l:'Contact Rate',r:contRate,low:40,high:55,desc:'Conversations / Accepted'},
    {l:'Qualification Rate',r:qualRate,low:30,high:40,desc:'Qualified / Conversations'},
    {l:'Offer Rate',r:offerRate,low:90,high:100,desc:'Offers / Qualified'},
    {l:'Response Rate',r:respRate,low:25,high:35,desc:'Responses / Offers'},
    {l:'Contract Rate',r:contractRate,low:15,high:25,desc:'Contracts / Responses'},
  ];

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)',paddingBottom:isMobile?80:40}}>
      <nav style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:`0 ${p}px`,height:58,background:'var(--surface)',borderBottom:'1px solid var(--border)',position:'sticky',top:0,zIndex:100}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button onClick={()=>router.push('/')} style={{background:'none',border:'none',color:'var(--text3)',fontSize:20,cursor:'pointer',padding:'4px 8px',borderRadius:6}}>←</button>
          <span style={{fontWeight:700,fontSize:16,color:'var(--text)'}}>KPI Tracker</span>
        </div>
        <div style={{display:'flex',gap:6}}>
          {['Daily','Weekly','Monthly'].map(p=>(
            <button key={p} onClick={()=>setPeriod(p)} style={{padding:'6px 14px',borderRadius:20,border:`1px solid ${period===p?'var(--gold-border)':'var(--border)'}`,background:period===p?'var(--gold-faint)':'transparent',color:period===p?'var(--gold)':'var(--text3)',fontSize:13,fontWeight:period===p?700:500,cursor:'pointer'}}>{p}</button>
          ))}
        </div>
      </nav>

      {/* Main tabs */}
      <div style={{background:'var(--surface)',borderBottom:'1px solid var(--border)',display:'flex',overflowX:'auto'}}>
        {['WCL','SMS Campaigns','Combined'].map(t=>(
          <button key={t} onClick={()=>setMainTab(t)} style={{padding:'14px 24px',background:'none',border:'none',borderBottom:mainTab===t?'2px solid var(--gold)':'2px solid transparent',color:mainTab===t?'var(--gold)':'var(--text3)',fontSize:14,fontWeight:mainTab===t?700:500,cursor:'pointer',whiteSpace:'nowrap',transition:'color 0.15s'}}>{t}</button>
        ))}
      </div>

      <div style={{maxWidth:900,margin:'0 auto',padding:`${isMobile?16:24}px ${p}px`}}>

        {/* WCL TAB */}
        {mainTab==='WCL'&&(
          <>
            <div style={{display:'flex',justifyContent:'flex-end',marginBottom:14}}>
              <button onClick={()=>{setShowLogForm(f=>!f);setEditId(null);}} style={{padding:'10px 20px',borderRadius:10,border:'none',background:'var(--gold)',color:'#000',fontWeight:800,fontSize:14,cursor:'pointer',minHeight:46}}>
                {showLogForm?'Close Form':'Log Today'}
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
                  {l:'Leads Accepted',v:accepted,set:setAccepted,rateEl:fRec>0?<RateIndicator rate={fAccRate} low={60} high={75} label="Acceptance"/>:null},
                  {l:'Conversations',v:convos,set:setConvos,rateEl:fAcc>0?<RateIndicator rate={fContRate} low={40} high={55} label="Contact"/>:null},
                  {l:'Qualified',v:qualified,set:setQualified,rateEl:fConvos>0?<RateIndicator rate={fQualRate} low={30} high={40} label="Qualification"/>:null},
                  {l:'Offers Made',v:offersMade,set:setOffersMade,rateEl:fQual>0?<RateIndicator rate={fOfferRate} low={90} high={100} label="Offer rate"/>:null},
                  {l:'Offer Responses',v:offerResponses,set:setOfferResponses,rateEl:fOffers>0?<RateIndicator rate={fRespRate} low={25} high={35} label="Response"/>:null},
                  {l:'Contracts',v:contracts,set:setContracts,rateEl:fResp>0?<RateIndicator rate={fContractRate} low={15} high={25} label="Contract"/>:null},
                ].map(({l,v,set,rateEl})=>(
                  <div key={l} style={{marginBottom:14}}>
                    <label style={LBL}>{l}</label>
                    <div style={{display:'flex',gap:12,alignItems:'flex-start',flexWrap:'wrap'}}>
                      <input style={{...INPUT,maxWidth:200,fontFamily:'JetBrains Mono,monospace',fontSize:18}} type="number" value={v} onChange={e=>set(e.target.value)} placeholder="" onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/>
                      {rateEl&&<div style={{paddingTop:12}}>{rateEl}</div>}
                    </div>
                    {l==='Leads Accepted'&&fAcc>0&&(
                      <div style={{marginTop:10}}>
                        <div style={{fontSize:12,color:'var(--text3)',marginBottom:8}}>Rejection reasons (select all that apply):</div>
                        <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                          {REJ_REASONS.map(r=>{const on=rejReasons.includes(r);return(
                            <div key={r} onClick={()=>setRejReasons(x=>on?x.filter(i=>i!==r):[...x,r])} style={{padding:'6px 12px',borderRadius:6,border:`1px solid ${on?'var(--red-border)':'var(--border)'}`,background:on?'var(--red-faint)':'var(--surface3)',color:on?'var(--red)':'var(--text3)',cursor:'pointer',fontSize:13,fontWeight:on?700:400}}>{r}</div>
                          );})}
                        </div>
                      </div>
                    )}
                    {l==='Leads Accepted'&&fAcc>0&&(
                      <div style={{marginTop:10,padding:'12px 14px',borderRadius:8,background:'var(--surface3)',border:'1px solid var(--border)'}}>
                        <div style={{fontSize:12,fontWeight:700,color:'var(--text2)',marginBottom:6}}>Based on {fAcc} accepted leads today:</div>
                        <div style={{fontSize:13,color:'var(--text3)'}}>Contact target: <span style={{color:'var(--cyan)',fontWeight:700}}>{Math.ceil(fAcc*0.40)}</span> conversations minimum</div>
                        <div style={{fontSize:13,color:'var(--text3)'}}>Offer target: <span style={{color:'var(--gold)',fontWeight:700}}>ALL</span> qualified leads must receive an offer</div>
                      </div>
                    )}
                    {l==='Offers Made'&&fQual>0&&fOfferRate<90&&(
                      <div style={{marginTop:6,fontSize:13,color:'var(--orange)'}}>Every qualified lead must receive an offer — what stopped the offer?</div>
                    )}
                  </div>
                ))}

                <div style={{padding:'14px 16px',borderRadius:10,background:'var(--surface3)',border:'1px solid var(--border)',marginBottom:16}}>
                  <div style={{fontSize:12,fontWeight:700,color:'var(--text3)',marginBottom:10}}>Three Non-Negotiables</div>
                  {[
                    {label:'Contact Rate ≥40% of accepted',met:fContRate>=40},
                    {label:'Offer Rate ≥90% of qualified',met:fOfferRate>=90||fQual===0},
                    {label:'Entry logged for today',met:false},
                  ].map((n,i)=>(
                    <div key={i} style={{display:'flex',alignItems:'center',gap:8,padding:'6px 0',borderBottom:i<2?'1px solid var(--border)':'none'}}>
                      <span style={{color:n.met?'var(--green)':'var(--red)',fontSize:16}}>{n.met?'✓':'☐'}</span>
                      <span style={{fontSize:13,color:'var(--text2)'}}>{n.label}</span>
                    </div>
                  ))}
                </div>

                <button onClick={saveWCL} disabled={saving} style={{width:'100%',minHeight:52,borderRadius:10,border:'none',background:'var(--gold)',color:'#000',fontWeight:800,fontSize:15,cursor:'pointer'}}>
                  {saving?'Saving...':'Save Entry'}
                </button>
              </div>
            )}

            {/* Stats */}
            <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(4,1fr)',gap:12,marginBottom:14}}>
              {[
                {l:'Total Received',v:totalRec,c:'var(--text)'},
                {l:'Total Accepted',v:totalAcc,c:'var(--green)'},
                {l:'Acceptance Rate',v:accRate+'%',c:accRate>=60?'var(--green)':accRate>=40?'var(--gold)':'var(--red)'},
                {l:'Total Contracts',v:totalContracts,c:'var(--green)'},
              ].map(s=>(
                <div key={s.l} style={{...CARD,textAlign:'center',padding:'16px'}}>
                  <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:28,fontWeight:800,color:s.c,marginBottom:4}}>{s.v}</div>
                  <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--text3)'}}>{s.l}</div>
                </div>
              ))}
            </div>

            {/* Funnel Rates */}
            <div style={CARD}>
              <div style={SEC}>WCL Funnel Rates</div>
              {funnelRates.map(({l,r,low,high,desc})=>{
                const color=r>=high?'var(--gold)':r>=low?'var(--green)':'var(--red)';
                const status=r>=high?'ABOVE':r>=low?'IN RANGE':'BELOW';
                return(
                  <div key={l} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid var(--border)',flexWrap:'wrap',gap:8}}>
                    <div><div style={{fontSize:14,color:'var(--text2)',fontWeight:600}}>{l}</div><div style={{fontSize:12,color:'var(--text3)'}}>{desc}</div></div>
                    <div style={{display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:20,fontWeight:800,color}}>{r}%</span>
                      <span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:color+'18',color,border:`1px solid ${color}40`,fontWeight:700}}>{status}</span>
                      <span style={{fontSize:11,color:'var(--text3)'}}>target {low}–{high}%</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Chart */}
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

            {/* Rejection Analysis */}
            {rejData.length>0&&(
              <div style={CARD}>
                <div style={SEC}>Rejection Analysis</div>
                {rejData.map(({reason,count,pct},i)=>(
                  <div key={reason} style={{display:'flex',alignItems:'center',gap:12,marginBottom:10}}>
                    <span style={{width:120,fontSize:13,color:'var(--text2)',flexShrink:0}}>{reason}</span>
                    <div style={{flex:1,height:8,borderRadius:4,background:'var(--surface3)',overflow:'hidden'}}>
                      <div style={{height:'100%',borderRadius:4,width:`${pct}%`,background:REJ_COLORS[i%REJ_COLORS.length]}}/>
                    </div>
                    <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:13,color:'var(--text2)',minWidth:60,textAlign:'right'}}>{count} ({pct}%)</span>
                  </div>
                ))}
              </div>
            )}

            {/* Diagnostics */}
            {diag&&(
              <div style={{padding:'14px 18px',borderRadius:12,background:diag.bg,border:`1px solid ${diag.border}`,marginBottom:14}}>
                <div style={{fontWeight:800,color:diag.color,fontSize:14,marginBottom:4}}>{diag.title}</div>
                <div style={{color:diag.color,fontSize:13,opacity:0.85}}>{diag.msg}</div>
              </div>
            )}

            {/* Entry Log */}
            {period==='Daily'&&wclEntries.length>0&&(
              <div style={CARD}>
                <div style={SEC}>Entry Log</div>
                {wclEntries.slice().reverse().map(e=>(
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

        {/* SMS CAMPAIGNS TAB */}
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
                  <div><label style={LBL}>Campaign Name</label><input style={INPUT} value={campName} onChange={e=>setCampName(e.target.value)} onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/></div>
                  <div><label style={LBL}>Target County</label><input style={INPUT} value={campCounty} onChange={e=>setCampCounty(e.target.value)} placeholder="e.g. Cuyahoga" onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/></div>
                  <div><label style={LBL}>Filter Stack</label>
                    <select style={{...INPUT,height:48}} value={campFilter} onChange={e=>setCampFilter(e.target.value)}>
                      {['Absentee+Tax Delinquent+Equity','Absentee+Equity','Tax Delinquent+Equity','Absentee Only','Pre-Foreclosure','Probate','High Equity','Custom'].map(f=><option key={f} value={f}>{f}</option>)}
                    </select>
                  </div>
                  <div><label style={LBL}>List Size</label><input style={{...INPUT,fontFamily:'JetBrains Mono,monospace',fontSize:18}} type="number" value={campList} onChange={e=>setCampList(e.target.value)} placeholder="" onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/></div>
                  <div><label style={LBL}>Daily Send Volume</label><input style={INPUT} type="number" value={campDaily} onChange={e=>setCampDaily(e.target.value)} onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/></div>
                  <div><label style={LBL}>Duration (days)</label><input style={INPUT} type="number" value={campDuration} onChange={e=>setCampDuration(e.target.value)} placeholder="" onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/></div>
                  <div><label style={LBL}>List Cost ($)</label>
                    <div style={{position:'relative'}}><span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text3)',pointerEvents:'none',zIndex:1}}>$</span>
                    <input style={{...INPUT,paddingLeft:24}} type="number" value={campCost} onChange={e=>setCampCost(e.target.value)} onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/></div>
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

            {campaigns.filter(c=>c.status==='active').map(camp=>{
              const stats=campStats(camp);
              const campRates=[
                {l:'Deliverability',r:stats.delivRate,low:65,high:75},{l:'Reply Rate',r:stats.replyRate,low:2,high:5},
                {l:'Conversation Rate',r:stats.convoRate,low:40,high:60},{l:'Qualification Rate',r:stats.qualRate,low:30,high:40},
                {l:'Offer Rate',r:stats.offerRate,low:90,high:100},{l:'Response Rate',r:stats.respRate,low:25,high:35},{l:'Contract Rate',r:stats.contractRate,low:15,high:25},
              ];
              const cc=camp.color&&camp.color.startsWith('var')?camp.color:'var(--gold)';
              return(
                <div key={camp.id} style={{background:'var(--surface)',border:'1px solid var(--border)',borderLeft:`4px solid ${cc}`,borderRadius:14,padding:'20px 24px',marginBottom:14}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:10,marginBottom:14}}>
                    <div>
                      <div style={{fontSize:16,fontWeight:800,color:'var(--text)',marginBottom:6}}>{camp.name}</div>
                      <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
                        {camp.county&&<span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:'var(--surface3)',color:'var(--text2)',border:'1px solid var(--border)'}}>{camp.county}</span>}
                        {camp.filterStack&&<span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:'var(--surface3)',color:'var(--text2)',border:'1px solid var(--border)'}}>{camp.filterStack}</span>}
                        <span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:'var(--green-faint)',color:'var(--green)',border:'1px solid var(--green-border)',fontWeight:700}}>ACTIVE</span>
                      </div>
                    </div>
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
                    {stats.costPerReply&&<div style={{textAlign:'center',padding:'8px 12px',borderRadius:8,background:'var(--surface3)'}}><div style={{fontFamily:'JetBrains Mono,monospace',fontSize:18,fontWeight:700,color:'var(--text)'}}>{'$'+stats.costPerReply}</div><div style={{fontSize:11,color:'var(--text3)'}}>Cost/Reply</div></div>}
                    {stats.costPerContract&&<div style={{textAlign:'center',padding:'8px 12px',borderRadius:8,background:'var(--surface3)'}}><div style={{fontFamily:'JetBrains Mono,monospace',fontSize:18,fontWeight:700,color:'var(--green)'}}>{'$'+Number(stats.costPerContract).toLocaleString()}</div><div style={{fontSize:11,color:'var(--text3)'}}>Cost/Contract</div></div>}
                  </div>
                  <div style={{display:'flex',gap:8,marginTop:10}}>
                    <button onClick={()=>setShowLogDay(showLogDay===camp.id?null:camp.id)} style={{padding:'8px 16px',borderRadius:8,border:'none',background:cc,color:'#000',fontWeight:700,fontSize:13,cursor:'pointer'}}>Log Day</button>
                    <button style={{padding:'8px 16px',borderRadius:8,border:'1px solid var(--border)',background:'var(--surface3)',color:'var(--text2)',fontSize:13,cursor:'pointer'}}>Pause</button>
                  </div>

                  {showLogDay===camp.id&&(
                    <div style={{marginTop:14,padding:'16px',borderRadius:10,background:'var(--surface3)',border:'1px solid var(--border)'}}>
                      <div style={{fontSize:13,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',marginBottom:12}}>Log Day — {camp.name}</div>
                      <div style={{marginBottom:12}}><DatePicker label="Date" value={ldDate} onChange={setLdDate}/></div>
                      <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr 1fr':'repeat(3,1fr)',gap:10}}>
                        {[{l:'Sent',v:ldSent,set:setLdSent},{l:'Landlines',v:ldLandlines,set:setLdLandlines},{l:'Opt-Outs',v:ldOptOuts,set:setLdOptOuts}].map(({l,v,set})=>(
                          <div key={l}><label style={LBL}>{l}</label><input style={INPUT} type="number" value={v} onChange={e=>set(e.target.value)} placeholder="" onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/></div>
                        ))}
                        <div><label style={LBL}>Deliverable (auto)</label><div style={{minHeight:48,padding:'12px 16px',borderRadius:10,background:'var(--surface2)',border:'1px solid var(--border)',fontFamily:'JetBrains Mono,monospace',color:'var(--cyan)',fontSize:15,display:'flex',alignItems:'center'}}>{Math.max(0,toN(ldSent)-toN(ldLandlines)-toN(ldOptOuts)).toLocaleString()}</div></div>
                        {[{l:'Replies',v:ldReplies,set:setLdReplies},{l:'Conversations',v:ldConvos,set:setLdConvos},{l:'Qualified',v:ldQualified,set:setLdQualified},{l:'Offers Made',v:ldOffers,set:setLdOffers},{l:'Offer Responses',v:ldResponses,set:setLdResponses},{l:'Contracts',v:ldContracts,set:setLdContracts}].map(({l,v,set})=>(
                          <div key={l}><label style={LBL}>{l}</label><input style={INPUT} type="number" value={v} onChange={e=>set(e.target.value)} placeholder="" onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/></div>
                        ))}
                      </div>
                      <button onClick={()=>saveLogDay(camp.id)} style={{marginTop:12,width:'100%',minHeight:46,borderRadius:10,border:'none',background:cc,color:'#000',fontWeight:800,fontSize:14,cursor:'pointer'}}>Save Day Log</button>
                    </div>
                  )}
                </div>
              );
            })}
          </>
        )}

        {/* COMBINED TAB */}
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
              {[
                {l:'WCL Contracts',v:totalWCLContracts,c:'var(--gold)'},
                {l:'SMS Contracts',v:totalSMSContracts,c:'var(--cyan)'},
                {l:'Total Contracts',v:combinedContracts,c:paceColor},
                {l:'Goal',v:goalContracts,c:'var(--text3)'},
              ].map(s=>(
                <div key={s.l} style={{...CARD,textAlign:'center',padding:'16px'}}>
                  <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:28,fontWeight:800,color:s.c,marginBottom:4}}>{s.v}</div>
                  <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--text3)'}}>{s.l}</div>
                </div>
              ))}
            </div>

            <div style={CARD}>
              <div style={SEC}>Channel Comparison</div>
              <div style={{display:'grid',gridTemplateColumns:'auto 1fr 1fr',gap:'0',borderRadius:10,overflow:'hidden',border:'1px solid var(--border)'}}>
                {[{},{},...funnelRates].map((row,i)=>{
                  if(i===0) return <div key="h0" style={{padding:'10px 14px',background:'var(--surface3)',borderBottom:'1px solid var(--border)',fontWeight:700,color:'var(--text3)',fontSize:12}}>Metric</div>;
                  if(i===1) return <><div key="h1" style={{padding:'10px 14px',background:'var(--surface3)',borderBottom:'1px solid var(--border)',fontWeight:700,color:'var(--gold)',fontSize:12}}>WCL</div><div key="h2" style={{padding:'10px 14px',background:'var(--surface3)',borderBottom:'1px solid var(--border)',fontWeight:700,color:'var(--cyan)',fontSize:12}}>SMS Avg</div></>;
                  const fr=funnelRates[i-2];if(!fr)return null;
                  const smsCampRates=campaigns.filter(c=>c.status==='active').map(camp=>campStats(camp));
                  const smsAvg=smsCampRates.length>0?Math.round(smsCampRates.reduce((s,st)=>{const key=['delivRate','replyRate','convoRate','qualRate','offerRate','respRate','contractRate'][i-2];return s+(st[key]||0);},0)/smsCampRates.length):0;
                  const wclWins=fr.r>smsAvg;
                  return [
                    <div key={`l${i}`} style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',color:'var(--text2)',fontSize:13}}>{fr.l}</div>,
                    <div key={`w${i}`} style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',fontFamily:'JetBrains Mono,monospace',fontSize:15,fontWeight:700,color:wclWins?'var(--gold)':'var(--text3)',background:wclWins?'var(--gold-faint)':'transparent'}}>{fr.r}%</div>,
                    <div key={`s${i}`} style={{padding:'10px 14px',borderBottom:'1px solid var(--border)',fontFamily:'JetBrains Mono,monospace',fontSize:15,fontWeight:700,color:!wclWins?'var(--cyan)':'var(--text3)',background:!wclWins?'var(--cyan-faint)':'transparent'}}>{smsAvg}%</div>,
                  ];
                })}
              </div>
            </div>
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

function fmtNum(n){return Number(n||0).toLocaleString('en-US');}
