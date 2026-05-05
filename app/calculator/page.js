'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DatePicker from '../components/DatePicker.js';

const toN = v => { const n=Number(String(v||'').replace(/[^0-9.-]/g,'')); return isNaN(n)?0:n; };
const fmt = n => Number(n||0).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
const fmtN = n => Number(n||0).toLocaleString('en-US');
const todayISO = () => new Date().toISOString().slice(0,10);
const daysDiff = iso => iso ? Math.round((Date.now()-new Date(iso).getTime())/86400000) : null;

const INPUT={minHeight:48,padding:'12px 16px',borderRadius:10,background:'var(--surface3)',border:'1px solid var(--border)',color:'var(--text)',fontSize:15,outline:'none',fontFamily:'Outfit,sans-serif',width:'100%',transition:'border-color 0.15s'};
const LBL={fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.11em',color:'var(--text3)',marginBottom:8,display:'block'};
const CARD={background:'var(--surface)',border:'1px solid var(--border)',borderLeft:'3px solid var(--gold)',borderRadius:14,padding:'24px',marginBottom:16};
const CARD_C={background:'var(--surface)',border:'1px solid var(--border)',borderLeft:'3px solid var(--cyan)',borderRadius:14,padding:'24px',marginBottom:16};
const SEC={fontSize:13,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.12em',color:'var(--text3)',marginBottom:16};

const TIERS=[
  {max:139999,pct:70,label:'Below $140K',color:'var(--cyan)'},
  {max:189999,pct:73,label:'$140K–$189K',color:'var(--gold)'},
  {max:239999,pct:75,label:'$190K–$239K',color:'var(--gold)'},
  {max:289999,pct:78,label:'$240K–$289K',color:'var(--purple)'},
  {max:Infinity,pct:80,label:'$290K+',color:'var(--green)'},
];
const getTier=arv=>TIERS.find(t=>arv<=t.max)||TIERS[TIERS.length-1];

// New rehab system
const REHAB_TIERS=['Cosmetic','Light','Medium','Major Rehab','Full Gut'];
const SEVERITIES=['Low','Mid','High'];
const RATE_TABLE={'Cosmetic':{Low:8,Mid:10,High:15},'Light':{Low:15,Mid:20,High:25},'Medium':{Low:25,Mid:35,High:50},'Major Rehab':{Low:50,Mid:60,High:70},'Full Gut':{Low:75,Mid:85,High:100}};
const MAJOR_ITEMS=[
  {id:'roof',label:'Roof',dynamic:true},
  {id:'hvac',label:'HVAC',dynamic:true},
  {id:'foundation',label:'Foundation',editable:true,warn:true,defaultAmt:20000},
  {id:'plumbing',label:'Plumbing',editable:true,defaultAmt:10000},
  {id:'electrical',label:'Electrical',editable:true,defaultAmt:10000},
];
const EMPTY_COMP={price:'',sqft:'',date:''};

function CompSlot({num,comp,subjectSqft,onChange,accentColor}){
  const price=toN(comp.price), cSqft=toN(comp.sqft);
  const days=daysDiff(comp.date);
  const stale=days!==null&&days>365;
  const pps=price>0&&cSqft>0?Math.round(price/cSqft):0;
  const sizeVar=subjectSqft>0&&cSqft>0&&Math.abs(cSqft-subjectSqft)>250;
  return (
    <div style={{background:'var(--surface3)',border:'1px solid var(--border)',borderRadius:10,padding:16,marginBottom:12,opacity:stale?0.55:1}}>
      <div style={{fontSize:11,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',marginBottom:12}}>Comp {num}</div>
      <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:12,marginBottom:10}}>
        <div><label style={LBL}>Sale Price</label>
          <div style={{position:'relative'}}><span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text3)',pointerEvents:'none'}}>$</span>
          <input style={{...INPUT,paddingLeft:24}} type="text" inputMode="numeric" pattern="[0-9]*" value={comp.price||''} onChange={e=>onChange({...comp,price:e.target.value.replace(/[^0-9.]/g,'')})} onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'} placeholder=""/></div>
        </div>
        <div><label style={LBL}>Sqft</label>
          <input style={INPUT} type="text" inputMode="numeric" pattern="[0-9]*" value={comp.sqft||''} onChange={e=>onChange({...comp,sqft:e.target.value.replace(/[^0-9]/g,'')})} onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'} placeholder=""/>
        </div>
        <div><DatePicker label="Date Sold" value={comp.date||''} onChange={v=>onChange({...comp,date:v})}/></div>
      </div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
        {pps>0&&<span style={{fontFamily:'JetBrains Mono,monospace',color:accentColor||'var(--gold)',fontSize:15,fontWeight:700}}>${fmtN(pps)}/sqft</span>}
        {days!==null&&<span style={{color:'var(--text3)',fontSize:12}}>({days} days ago)</span>}
        {stale&&<span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:'var(--red-faint)',color:'var(--red)',border:'1px solid var(--red-border)',fontWeight:700}}>STALE — EXCLUDED</span>}
        {!stale&&sizeVar&&<span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:'var(--gold-faint)',color:'var(--gold)',border:'1px solid var(--gold-border)',fontWeight:700}}>SIZE VARIANCE</span>}
      </div>
    </div>
  );
}

export default function OfferGenerator(){
  const router=useRouter();
  const [isMobile,setIsMobile]=useState(false);
  const [mode,setMode]=useState(null);
  const [switchConfirm,setSwitchConfirm]=useState(null);
  const [history,setHistory]=useState([]);
  const [showHistory,setShowHistory]=useState(false);
  const [savedMsg,setSavedMsg]=useState('');
  const [copied,setCopied]=useState(false);
  const [deletingHistId,setDeletingHistId]=useState(null);

  // Assignment
  const [address,setAddress]=useState('');
  const [sqft,setSqft]=useState('');
  const [asking,setAsking]=useState('');
  const [comps,setComps]=useState([EMPTY_COMP,EMPTY_COMP,EMPTY_COMP,EMPTY_COMP]);
  const [arvOverride,setArvOverride]=useState('');
  const [selectedTier,setSelectedTier]=useState(null);
  const [selectedSeverity,setSelectedSeverity]=useState(null);
  const [majors,setMajors]=useState({});
  const [foundationAmt,setFoundationAmt]=useState('20000');
  const [plumbingAmt,setPlumbingAmt]=useState('10000');
  const [electricalAmt,setElectricalAmt]=useState('10000');
  const [aFee,setAFee]=useState('12000');
  const [cushion,setCushion]=useState('5000');

  // Novation
  const [novComps,setNovComps]=useState([EMPTY_COMP,EMPTY_COMP,EMPTY_COMP,EMPTY_COMP]);
  const [novSubjectSqft,setNovSubjectSqft]=useState('');
  const [novFee,setNovFee]=useState('20000');
  const [novCushion,setNovCushion]=useState('7500');
  const [novBuffer,setNovBuffer]=useState('3');
  const [novAsking,setNovAsking]=useState('');
  const [alpOverride,setAlpOverride]=useState('');

  useEffect(()=>{const c=()=>setIsMobile(window.innerWidth<768);c();window.addEventListener('resize',c);return()=>window.removeEventListener('resize',c);},[]);
  useEffect(()=>{fetch('/api/calculator/history').then(r=>r.json()).then(d=>{if(Array.isArray(d))setHistory(d);}).catch(()=>{});},[]);

  const sqftN=toN(sqft);

  // helper to get major item amount
  function getMajorAmt(m){
    if(m.id==='roof') return sqftN>0?Math.round((sqftN*7)/500)*500:7000;
    if(m.id==='hvac') return sqftN>0&&sqftN<1400?8000:12000;
    if(m.id==='foundation') return toN(foundationAmt)||20000;
    if(m.id==='plumbing') return toN(plumbingAmt)||10000;
    if(m.id==='electrical') return toN(electricalAmt)||10000;
    return 0;
  }

  // Assignment ARV
  const validComps=comps.filter(c=>{const d=daysDiff(c.date);return toN(c.price)>0&&(d===null||d<=365);});
  const validWithSqft=validComps.filter(c=>toN(c.sqft)>0);
  const allPPS=validWithSqft.map(c=>toN(c.price)/toN(c.sqft));
  const avgPPS=allPPS.length>0?allPPS.reduce((a,b)=>a+b,0)/allPPS.length:0;
  const outliers=validWithSqft.filter(c=>avgPPS>0&&Math.abs(toN(c.price)/toN(c.sqft)-avgPPS)/avgPPS>0.20);
  const hasOutlier=outliers.length>0;
  const suggestedArv=sqftN>0&&avgPPS>0?Math.round(avgPPS*sqftN):0;
  const finalArv=toN(arvOverride)>0?toN(arvOverride):suggestedArv;
  const usingOverride=toN(arvOverride)>0;
  let conf=validComps.length>=4?'HIGH':validComps.length>=3?'MEDIUM':'LOW';
  if(hasOutlier&&conf==='HIGH')conf='MEDIUM'; else if(hasOutlier&&conf==='MEDIUM')conf='LOW';
  const confColor=conf==='HIGH'?'var(--green)':conf==='MEDIUM'?'var(--gold)':'var(--red)';
  const tier=finalArv>0?getTier(finalArv):null;
  const rehabRate=(selectedTier&&selectedSeverity&&RATE_TABLE[selectedTier])?RATE_TABLE[selectedTier][selectedSeverity]||0:0;
  const rehabBase=rehabRate*sqftN;
  const majorTotal=MAJOR_ITEMS.reduce((s,m)=>s+(majors[m.id]?getMajorAmt(m):0),0);
  const totalRehab=rehabBase+majorTotal;
  const feeN=toN(aFee);
  const cushN=toN(cushion);
  const mao=finalArv>0&&tier?Math.round(finalArv*(tier.pct/100)-totalRehab-feeN-cushN):0;
  const laoRaw=Math.round(mao*0.70);
  const lao=Math.max(35000,laoRaw);
  const laoFloored=laoRaw<35000;
  const askN=toN(asking);
  const gap=askN>0?askN-mao:null;
  const canShow=validComps.length>=2&&selectedTier&&selectedSeverity&&sqftN>0&&finalArv>0;
  const sqftWarning=sqftN>0&&(sqftN<750||sqftN>2500);
  let vWord='',vBg='',vBdr='',vCol='',vSub='';
  if(canShow){
    if(mao>=12000){vWord='STRONG';vBg='var(--green-faint)';vBdr='var(--green-border)';vCol='var(--green)';}
    else if(mao>=6000){vWord='VIABLE';vBg='var(--gold-faint)';vBdr='var(--gold-border)';vCol='var(--gold)';}
    else if(mao>=1){vWord='TIGHT';vBg='var(--orange-faint)';vBdr='var(--orange-border)';vCol='var(--orange)';vSub='Seller must move significantly or deal is not viable.';}
    else{vWord='DEAD';vBg='var(--red-faint)';vBdr='var(--red-border)';vCol='var(--red)';vSub='Numbers do not work at any negotiation point.';}
  }

  // Novation
  const novSqftN=toN(novSubjectSqft);
  const novValid=novComps.filter(c=>{const d=daysDiff(c.date);return toN(c.price)>0&&toN(c.sqft)>0&&(d===null||d<=365);});
  const avgNovPPSF=novValid.length>0?novValid.reduce((s,c)=>s+toN(c.price)/toN(c.sqft),0)/novValid.length:0;
  const suggestedALP=novSqftN>0&&avgNovPPSF>0?Math.round(avgNovPPSF*novSqftN):0;
  const isALPOverridden=toN(alpOverride)>0;
  const activeALP=isALPOverridden?toN(alpOverride):suggestedALP;
  const alp=activeALP;
  const elp=Math.round(activeALP*0.90);
  const bufPct=toN(novBuffer)/100;
  const adjElp=Math.round(elp*(1-bufPct));
  const netProc=Math.round(adjElp*0.90);
  const novFeeN=toN(novFee);
  const novCushN=toN(novCushion);
  const offerToSeller=netProc-novFeeN-novCushN;
  const spread=activeALP-offerToSeller;
  const novAskN=toN(novAsking);
  const feePctElp=elp>0?(novFeeN/elp*100).toFixed(1):0;
  let novV='',novVC='';
  if(activeALP>0){if(spread>=20000){novV='STRONG';novVC='var(--green)';}else if(spread>=12000){novV='VIABLE';novVC='var(--gold)';}else if(spread>=6000){novV='TIGHT';novVC='var(--orange)';}else{novV='DEAD';novVC='var(--red)';}}

  function buildBrief(){
    const condLabel=selectedTier&&selectedSeverity?`${selectedTier} / ${selectedSeverity} ($${rehabRate}/sqft)`:'Not selected';
    const majorList=MAJOR_ITEMS.filter(m=>majors[m.id]).map(m=>`${m.label} (+${fmt(getMajorAmt(m))})`).join(', ')||'None';
    const compLines=comps.map((c,i)=>{
      if(!toN(c.price))return `  Comp ${i+1}: —`;
      const d=daysDiff(c.date);const pps=toN(c.sqft)>0?Math.round(toN(c.price)/toN(c.sqft)):0;
      return `  Comp ${i+1}: ${fmt(toN(c.price))} | ${toN(c.sqft)||'?'} sqft | $${pps}/sqft | ${d!==null?d+' days ago':'no date'}`;
    }).join('\n');
    return `OFFER GENERATOR — NOVORA CAPITAL\nDate: ${todayISO()} | Exit: Assignment\nPROPERTY: ${address||'—'} | Sqft: ${sqftN||'?'} | Condition: ${condLabel} | Major Items: ${majorList} | Total Rehab: ${fmt(totalRehab)}\nCOMPS (${validComps.length} valid of 4 entered):\n${compLines}\nARV: ${fmt(finalArv)} (${usingOverride?'Manual Override':'Auto'}) | Tier: ${tier?.pct}% (${tier?.label}) | Confidence: ${conf}\nMAO: ${fmt(mao)} | LAO: ${fmt(lao)} | Negotiation Room: ${fmt(mao-lao)}\n${askN?`SELLER ASKING: ${fmt(askN)} | GAP: ${gap<=0?`+${fmt(-gap)} below your ceiling`:`-${fmt(gap)} above your ceiling`}`:''}${hasOutlier?'\n⚠ High comp variance — one or more comps deviated significantly.':''}${majors.foundation?'\n⚠ Foundation work in scope — verify with contractor.':''}${laoFloored?'\nℹ LAO floor applied — floored at $35,000.':''}\nVERDICT: ${vWord}`.trim();
  }

  function buildNovBrief(){
    const compLines=novComps.map((c,i)=>{if(!toN(c.price))return `  Comp ${i+1}: —`;const d=daysDiff(c.date);return `  Comp ${i+1}: ${fmt(toN(c.price))} | ${d!==null?d+' days ago':'no date'}`;}).join('\n');
    return `OFFER GENERATOR — NOVORA CAPITAL\nDate: ${todayISO()} | Exit: Novation${isALPOverridden?' | ALP OVERRIDDEN':''}\nAS-IS COMPS (${novValid.length} valid of 4):\n${compLines}\nALP: ${fmt(activeALP)}${isALPOverridden?` (suggested: ${fmt(suggestedALP)})`:''}| ELP: ${fmt(elp)} | Adj ELP: ${fmt(adjElp)} | Net Proceeds: ${fmt(netProc)}\nNovation Fee: ${fmt(novFeeN)} | Safety Cushion: ${fmt(novCushN)}\nOFFER TO SELLER: ${fmt(offerToSeller)} | YOUR SPREAD: ${fmt(spread)}${novAskN?`\nSELLER ASKING: ${fmt(novAskN)} | GAP: ${novAskN<=offerToSeller?`+${fmt(offerToSeller-novAskN)} room`:`-${fmt(novAskN-offerToSeller)} above offer`}`:''}\nVERDICT: ${novV}`.trim();
  }

  async function copyBrief(){
    await navigator.clipboard.writeText(mode==='novation'?buildNovBrief():buildBrief());
    const shouldSave = mode==='novation'?(novV==='STRONG'||novV==='VIABLE'):(vWord==='STRONG'||vWord==='VIABLE');
    if(shouldSave){
      await fetch('/api/calculator/history',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({address,arv:finalArv,mao,verdict:mode==='novation'?novV:vWord,confidence:conf,mode,date:todayISO()})});
      fetch('/api/calculator/history').then(r=>r.json()).then(d=>{if(Array.isArray(d))setHistory(d);});
      setCopied('saved');
    } else {
      setCopied(true);
    }
    setTimeout(()=>setCopied(false),2500);
  }

  async function saveHist(){
    await fetch('/api/calculator/history',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({address,arv:finalArv,mao,verdict:vWord,confidence:conf,mode,date:todayISO()})});
    setSavedMsg('Saved!');setTimeout(()=>setSavedMsg(''),2000);
    fetch('/api/calculator/history').then(r=>r.json()).then(d=>{if(Array.isArray(d))setHistory(d);});
  }

  function loadFromHist(h){
    setMode(h.mode||'assignment');
    setAddress(h.address||'');
    setArvOverride(h.arv?String(h.arv):'');
    if(h.sqft) setSqft(String(h.sqft));
    if(h.selectedTier) setSelectedTier(h.selectedTier);
    if(h.selectedSeverity) setSelectedSeverity(h.selectedSeverity);
    if(h.majors) setMajors(h.majors);
    if(h.aFee) setAFee(String(h.aFee));
    if(h.cushion) setCushion(String(h.cushion));
    if(h.alpOverride) setAlpOverride(String(h.alpOverride));
    if(Array.isArray(h.comps)) setComps(h.comps.length===4?h.comps:[...h.comps,...Array(4-h.comps.length).fill(EMPTY_COMP)]);
    if(Array.isArray(h.novComps)) setNovComps(h.novComps.length===4?h.novComps:[...h.novComps,...Array(4-h.novComps.length).fill(EMPTY_COMP)]);
    setShowHistory(false);
  }

  async function deleteFromHist(id){
    setDeletingHistId(id);
    await fetch(`/api/calculator/history/${id}`,{method:'DELETE'});
    setHistory(hs=>hs.filter(h=>h.id!==id));
    setDeletingHistId(null);
  }

  const p=isMobile?16:24;

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)',paddingBottom:isMobile?80:40}}>
      <nav style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:`0 ${p}px`,height:58,background:'var(--surface)',borderBottom:'1px solid var(--border)',position:'sticky',top:0,zIndex:100}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <button onClick={()=>router.push('/')} style={{background:'none',border:'none',color:'var(--text3)',fontSize:20,cursor:'pointer',padding:'4px 8px',borderRadius:6}}>←</button>
          <span style={{fontWeight:700,fontSize:16,color:'var(--text)'}}>Offer Generator</span>
        </div>
        <button onClick={()=>setShowHistory(h=>!h)} style={{position:'relative',padding:'6px 14px',borderRadius:8,border:'1px solid var(--border)',background:'var(--surface2)',color:'var(--text2)',fontSize:13,fontWeight:600,cursor:'pointer'}}>
          History{history.length>0&&<span style={{position:'absolute',top:-6,right:-6,background:'var(--gold)',color:'#000',fontSize:10,fontWeight:800,borderRadius:'50%',width:18,height:18,display:'flex',alignItems:'center',justifyContent:'center'}}>{history.length}</span>}
        </button>
      </nav>

      <div style={{maxWidth:820,margin:'0 auto',padding:`${isMobile?16:28}px ${p}px`}}>
        {showHistory&&(
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:20,marginBottom:16}}>
            <div style={SEC}>Offer History</div>
            {history.length===0&&<p style={{color:'var(--text3)',fontSize:14}}>No saved offers yet.</p>}
            {history.map(h=>(
              <div key={h.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:8,background:'var(--surface2)',marginBottom:8,flexWrap:'wrap'}}>
                <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,color:'var(--text3)'}}>{h.date}</span>
                <span style={{flex:1,fontSize:14,color:'var(--text)',fontWeight:600}}>{h.address||'No address'}</span>
                <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:13,color:'var(--gold)'}}>{fmt(h.mao)}</span>
                <span style={{fontSize:11,padding:'2px 8px',borderRadius:4,fontWeight:700,color:h.verdict==='STRONG'?'var(--green)':h.verdict==='VIABLE'?'var(--gold)':h.verdict==='TIGHT'?'var(--orange)':'var(--red)',background:h.verdict==='STRONG'?'var(--green-faint)':h.verdict==='VIABLE'?'var(--gold-faint)':h.verdict==='TIGHT'?'var(--orange-faint)':'var(--red-faint)',border:`1px solid ${h.verdict==='STRONG'?'var(--green-border)':h.verdict==='VIABLE'?'var(--gold-border)':h.verdict==='TIGHT'?'var(--orange-border)':'var(--red-border)'}`}}>{h.verdict}</span>
                <button onClick={()=>loadFromHist(h)} style={{padding:'4px 10px',borderRadius:6,border:'1px solid var(--gold-border)',background:'var(--gold-faint)',color:'var(--gold)',fontSize:12,cursor:'pointer',fontWeight:600}}>Load</button>
                <button onClick={()=>deleteFromHist(h.id)} disabled={deletingHistId===h.id} style={{padding:'4px 8px',borderRadius:6,border:'none',background:'none',color:'var(--text3)',fontSize:14,cursor:'pointer'}}>✕</button>
              </div>
            ))}
          </div>
        )}

        {/* Mode Selection */}
        <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:14,marginBottom:20}}>
          {[{m:'assignment',icon:'◈',t:'Assignment',d:'Investor buyer · Rehab required · Standard wholesale',c:'var(--gold)'},{m:'novation',icon:'◉',t:'Novation',d:'Retail buyer · Light condition · Seller needs full price',c:'var(--cyan)'}].map(({m,icon,t,d,c})=>(
            <div key={m} onClick={()=>{if(mode&&mode!==m){setSwitchConfirm(m);}else setMode(m);}}
              style={{height:isMobile?110:160,borderRadius:14,border:`2px solid ${mode===m?c:'var(--border)'}`,background:mode===m?(m==='assignment'?'var(--gold-faint)':'var(--cyan-faint)'):'var(--surface)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',cursor:'pointer',transition:'all 0.18s',padding:16,textAlign:'center'}}>
              <div style={{fontSize:24,color:c,marginBottom:8}}>{icon}</div>
              <div style={{fontSize:16,fontWeight:800,color:'var(--text)',marginBottom:6}}>{t}</div>
              <div style={{fontSize:13,color:'var(--text2)',lineHeight:1.4}}>{d}</div>
            </div>
          ))}
        </div>

        {switchConfirm&&(
          <div style={{background:'var(--surface)',border:'1px solid var(--gold-border)',borderRadius:12,padding:'16px 20px',marginBottom:16,display:'flex',alignItems:'center',justifyContent:'space-between',gap:12,flexWrap:'wrap'}}>
            <span style={{color:'var(--text)',fontSize:14}}>Switch to {switchConfirm}? Current inputs will be cleared.</span>
            <div style={{display:'flex',gap:8}}>
              <button onClick={()=>setSwitchConfirm(null)} style={{padding:'8px 16px',borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--text3)',cursor:'pointer',fontSize:13}}>Cancel</button>
              <button onClick={()=>{setMode(switchConfirm);setSwitchConfirm(null);setComps([EMPTY_COMP,EMPTY_COMP,EMPTY_COMP,EMPTY_COMP]);setNovComps([EMPTY_COMP,EMPTY_COMP,EMPTY_COMP,EMPTY_COMP]);setAsking('');setArvOverride('');setSelectedTier(null);setSelectedSeverity(null);setMajors({});setFoundationAmt('20000');setPlumbingAmt('10000');setElectricalAmt('10000');}} style={{padding:'8px 16px',borderRadius:8,border:'none',background:'var(--gold)',color:'#000',fontWeight:700,cursor:'pointer',fontSize:13}}>Switch</button>
            </div>
          </div>
        )}

        {!mode&&<div style={{textAlign:'center',padding:'48px 0',color:'var(--text3)',fontSize:15}}>Select an exit strategy above to begin.</div>}

        {/* ASSIGNMENT */}
        {mode==='assignment'&&(
          <>
            <div style={CARD}>
              <div style={SEC}>Subject Property</div>
              <div style={{marginBottom:14}}>
                <label style={LBL}>Property Address (optional)</label>
                <input style={INPUT} value={address} onChange={e=>setAddress(e.target.value)} placeholder="123 Main St, Cleveland OH" onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/>
              </div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div>
                  <label style={{...LBL,display:'flex',alignItems:'center',gap:4}}>Square Footage <span style={{color:'var(--red)'}}>*</span></label>
                  <input style={{...INPUT,fontFamily:'JetBrains Mono,monospace',fontSize:18}} type="text" inputMode="numeric" value={sqft} onChange={e=>setSqft(e.target.value.replace(/[^0-9]/g,''))} placeholder="Enter sqft" onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/>
                  {sqftN>0&&<div style={{marginTop:6,fontSize:12,color:'var(--text3)'}}>Rehab brackets calculated for {fmtN(sqftN)} sqft</div>}
                </div>
                <div>
                  <label style={LBL}>Seller Asking Price (optional)</label>
                  <div style={{position:'relative'}}><span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text3)',pointerEvents:'none',zIndex:1}}>$</span>
                  <input style={{...INPUT,paddingLeft:24}} type="text" inputMode="numeric" value={asking} onChange={e=>setAsking(e.target.value.replace(/[^0-9]/g,''))} placeholder="" onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/></div>
                </div>
              </div>
            </div>

            <div style={CARD}>
              <div style={SEC}>Comparable Sales</div>
              <div style={{fontSize:13,color:'var(--text3)',marginBottom:14}}>Minimum 2 valid comps required. Uses sold investor comps.</div>
              {comps.map((c,i)=><CompSlot key={i} num={i+1} comp={c} subjectSqft={sqftN} onChange={v=>setComps(cs=>cs.map((x,j)=>j===i?v:x))} accentColor="var(--gold)"/>)}
              <div style={{background:'var(--surface3)',borderRadius:12,padding:16}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
                  <span style={{fontSize:13,color:'var(--text2)'}}>{validComps.length} of 4 comps valid</span>
                  <span style={{fontSize:11,padding:'2px 10px',borderRadius:20,background:confColor+'18',color:confColor,border:`1px solid ${confColor}40`,fontWeight:700}}>{conf} CONFIDENCE</span>
                </div>
                {suggestedArv>0&&<div style={{marginBottom:14}}>
                  <div style={{fontSize:12,color:'var(--text3)',marginBottom:4}}>Suggested ARV (avg $/sqft × subject sqft)</div>
                  <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:28,fontWeight:700,color:'var(--gold)'}}>{fmt(suggestedArv)}</div>
                </div>}
                <div>
                  <label style={LBL}>Override ARV (optional)</label>
                  <div style={{position:'relative'}}><span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text3)',pointerEvents:'none',zIndex:1}}>$</span>
                  <input style={{...INPUT,paddingLeft:24}} type="text" inputMode="numeric" value={arvOverride} onChange={e=>setArvOverride(e.target.value.replace(/[^0-9]/g,''))} placeholder="" onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/></div>
                  {usingOverride&&<div style={{marginTop:6,display:'flex',gap:8,alignItems:'center'}}>
                    <span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:'var(--orange-faint)',color:'var(--orange)',border:'1px solid var(--orange-border)',fontWeight:700}}>MANUAL OVERRIDE</span>
                    <span style={{fontSize:12,color:'var(--text3)'}}>Suggested was {fmt(suggestedArv)}</span>
                  </div>}
                  {finalArv>0&&<div style={{marginTop:8,fontSize:13,color:'var(--text2)'}}>ARV used: <span style={{fontFamily:'JetBrains Mono,monospace',color:'var(--text)',fontWeight:700}}>{fmt(finalArv)}</span>
                    {tier&&<span style={{marginLeft:10,fontSize:12,padding:'2px 8px',borderRadius:4,background:tier.color+'18',color:tier.color,border:`1px solid ${tier.color}40`,fontWeight:700}}>{tier.pct}% · {tier.label}</span>}
                  </div>}
                </div>
              </div>
            </div>

            <div style={CARD}>
              <div style={SEC}>Property Condition</div>
              {sqftWarning&&<div style={{padding:'10px 14px',borderRadius:8,background:'var(--gold-faint)',border:'1px solid var(--gold-border)',color:'var(--gold)',fontSize:13,marginBottom:14}}>⚠ Sqft is {sqftN<750?'below 750':'above 2,500'} — verify before finalizing</div>}

              {/* Tier buttons */}
              <div style={{fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--text3)',marginBottom:10}}>Rehab Tier</div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:20}}>
                {REHAB_TIERS.map(t=>(
                  <div key={t} onClick={()=>{setSelectedTier(t);setSelectedSeverity(null);}} style={{padding:'10px 16px',borderRadius:8,border:`2px solid ${selectedTier===t?'var(--gold)':'var(--border)'}`,background:selectedTier===t?'var(--gold-faint)':'var(--surface3)',color:selectedTier===t?'var(--gold)':'var(--text2)',cursor:'pointer',fontSize:14,fontWeight:600,transition:'all 0.15s'}}>
                    {t}
                  </div>
                ))}
              </div>

              {/* Severity buttons */}
              {selectedTier&&(
                <>
                  <div style={{fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--text3)',marginBottom:10}}>Severity</div>
                  <div style={{display:'flex',gap:8,marginBottom:12}}>
                    {SEVERITIES.map(sv=>{
                      const rate=RATE_TABLE[selectedTier]?.[sv];
                      const isSelected=selectedSeverity===sv;
                      return(
                        <div key={sv} onClick={()=>setSelectedSeverity(sv)} style={{flex:1,padding:'12px 8px',borderRadius:8,border:`2px solid ${isSelected?'var(--gold)':'var(--border)'}`,background:isSelected?'var(--gold-faint)':'var(--surface3)',cursor:'pointer',textAlign:'center',transition:'all 0.15s'}}>
                          <div style={{fontWeight:700,color:isSelected?'var(--gold)':'var(--text)',fontSize:15,marginBottom:4}}>{sv}</div>
                          <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:13,color:isSelected?'var(--gold)':'var(--text3)'}}>${rate}/sqft</div>
                        </div>
                      );
                    })}
                  </div>
                  {/* Always-High warning */}
                  <div style={{padding:'12px 16px',borderRadius:8,background:'var(--gold-faint)',border:'1px solid var(--gold-border)',color:'var(--gold)',fontSize:13,marginBottom:20,fontWeight:600}}>
                    ⚠ Always select <strong>High</strong> — underestimating rehab is the #1 deal killer.
                  </div>
                  {selectedSeverity&&sqftN>0&&(
                    <div style={{marginBottom:16,fontSize:13,color:'var(--text2)'}}>
                      Base Rehab: <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:18,fontWeight:700,color:'var(--gold)'}}>{fmt(rehabBase)}</span>
                      <span style={{fontSize:12,color:'var(--text3)',marginLeft:8}}>(${rehabRate}/sqft × {fmtN(sqftN)} sqft)</span>
                    </div>
                  )}
                </>
              )}

              {/* Major items */}
              <div style={{fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--text3)',marginBottom:10}}>Major Items — tap to add</div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
                {MAJOR_ITEMS.map(m=>{
                  const on=majors[m.id];
                  const amt=getMajorAmt(m);
                  return(
                    <div key={m.id} onClick={()=>setMajors(x=>({...x,[m.id]:!x[m.id]}))} style={{padding:'10px 16px',borderRadius:8,border:`1px solid ${on?'var(--gold-border)':'var(--border)'}`,background:on?'var(--gold-faint)':'var(--surface3)',color:on?'var(--gold)':'var(--text2)',cursor:'pointer',fontSize:14,fontWeight:600,transition:'all 0.15s'}}>
                      {m.label}{on?` (+${fmt(amt)})`:''}</div>
                  );
                })}
              </div>
              {/* Editable amounts for toggled editable items */}
              {(majors.foundation||majors.plumbing||majors.electrical)&&(
                <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:12}}>
                  {majors.foundation&&(
                    <div style={{display:'flex',alignItems:'center',gap:6,padding:'8px 12px',borderRadius:8,background:'var(--surface3)',border:'1px solid var(--border)'}}>
                      <span style={{fontSize:12,color:'var(--text2)'}}>Foundation $</span>
                      <input type="text" inputMode="numeric" value={foundationAmt} onChange={e=>setFoundationAmt(e.target.value.replace(/[^0-9]/g,''))} style={{width:80,fontFamily:'JetBrains Mono,monospace',fontSize:14,fontWeight:700,background:'transparent',border:'none',color:'var(--gold)',outline:'none'}}/>
                    </div>
                  )}
                  {majors.plumbing&&(
                    <div style={{display:'flex',alignItems:'center',gap:6,padding:'8px 12px',borderRadius:8,background:'var(--surface3)',border:'1px solid var(--border)'}}>
                      <span style={{fontSize:12,color:'var(--text2)'}}>Plumbing $</span>
                      <input type="text" inputMode="numeric" value={plumbingAmt} onChange={e=>setPlumbingAmt(e.target.value.replace(/[^0-9]/g,''))} style={{width:80,fontFamily:'JetBrains Mono,monospace',fontSize:14,fontWeight:700,background:'transparent',border:'none',color:'var(--gold)',outline:'none'}}/>
                    </div>
                  )}
                  {majors.electrical&&(
                    <div style={{display:'flex',alignItems:'center',gap:6,padding:'8px 12px',borderRadius:8,background:'var(--surface3)',border:'1px solid var(--border)'}}>
                      <span style={{fontSize:12,color:'var(--text2)'}}>Electrical $</span>
                      <input type="text" inputMode="numeric" value={electricalAmt} onChange={e=>setElectricalAmt(e.target.value.replace(/[^0-9]/g,''))} style={{width:80,fontFamily:'JetBrains Mono,monospace',fontSize:14,fontWeight:700,background:'transparent',border:'none',color:'var(--gold)',outline:'none'}}/>
                    </div>
                  )}
                </div>
              )}
              {majors.foundation&&<div style={{padding:'10px 14px',borderRadius:8,background:'var(--orange-faint)',border:'1px solid var(--orange-border)',color:'var(--orange)',fontSize:13,marginBottom:12}}>⚠ Foundation work detected — verify scope with contractor before finalizing offer</div>}

              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10}}>
                <div style={{fontSize:13,color:'var(--text2)'}}>Total Rehab: <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:22,fontWeight:800,color:'var(--gold)'}}>{fmt(totalRehab)}</span></div>
                {(selectedTier||Object.values(majors).some(Boolean))&&(
                  <button onClick={()=>{setSelectedTier(null);setSelectedSeverity(null);setMajors({});setFoundationAmt('20000');setPlumbingAmt('10000');setElectricalAmt('10000');}} style={{padding:'7px 14px',borderRadius:7,border:'1px solid var(--border)',background:'var(--surface3)',color:'var(--text3)',fontSize:12,cursor:'pointer',fontWeight:600}}>↺ Reset</button>
                )}
              </div>
            </div>

            <div style={CARD}>
              <div style={SEC}>Deal Numbers</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div><label style={LBL}>Assignment Fee</label>
                  <div style={{position:'relative'}}><span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text3)',pointerEvents:'none',zIndex:1}}>$</span>
                  <input style={{...INPUT,paddingLeft:24}} type="text" inputMode="numeric" value={aFee} onChange={e=>setAFee(e.target.value.replace(/[^0-9]/g,''))} onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/></div>
                </div>
                <div><label style={LBL}>Safety Cushion</label>
                  <div style={{position:'relative'}}><span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text3)',pointerEvents:'none',zIndex:1}}>$</span>
                  <input style={{...INPUT,paddingLeft:24}} type="text" inputMode="numeric" value={cushion} onChange={e=>setCushion(e.target.value.replace(/[^0-9]/g,''))} onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/></div>
                </div>
              </div>
            </div>

            {!canShow&&<div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'32px',textAlign:'center',color:'var(--text2)',fontSize:15}}>Enter sqft, add 2+ comps, and select a condition to generate your offer.</div>}

            {canShow&&(
              <>
                <div style={{background:vBg,border:`1px solid ${vBdr}`,borderRadius:14,padding:isMobile?'20px 18px':'24px 28px',marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
                  <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:isMobile?36:48,fontWeight:900,color:vCol}}>{vWord}</div>
                  <div style={{display:'flex',gap:8}}><span style={{fontSize:12,padding:'4px 12px',borderRadius:20,background:confColor+'18',color:confColor,border:`1px solid ${confColor}40`,fontWeight:700}}>{conf}</span>{tier&&<span style={{fontSize:12,padding:'4px 12px',borderRadius:20,background:tier.color+'18',color:tier.color,border:`1px solid ${tier.color}40`,fontWeight:700}}>{tier.pct}%</span>}</div>
                  {vSub&&<div style={{width:'100%',color:vCol,fontSize:14,opacity:0.85}}>{vSub}</div>}
                </div>

                <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'20px 24px',marginBottom:16}}>
                  <div style={SEC}>MAO Breakdown</div>
                  {[{l:`ARV × ${tier?.pct}%`,v:Math.round(finalArv*(tier?.pct/100)),c:'var(--text)'},{l:'Minus Rehab',v:-totalRehab,c:'var(--red)'},{l:'Minus Assignment Fee',v:-feeN,c:'var(--red)'},{l:'Minus Safety Cushion',v:-cushN,c:'var(--red)'}].map((row,i)=>(
                    <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
                      <span style={{color:'var(--text2)',fontSize:15}}>{row.l}</span>
                      <span style={{fontFamily:'JetBrains Mono,monospace',color:row.c,fontSize:15,fontWeight:600}}>{row.v<0?`-${fmt(-row.v)}`:fmt(row.v)}</span>
                    </div>
                  ))}
                  <div style={{display:'flex',justifyContent:'space-between',padding:'14px 0 4px'}}>
                    <span style={{fontWeight:800,color:'var(--text)',fontSize:16}}>MAX SELLER OFFER (MAO)</span>
                    <span style={{fontFamily:'JetBrains Mono,monospace',color:'var(--gold)',fontSize:22,fontWeight:900}}>{fmt(mao)}</span>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0'}}>
                    <span style={{color:'var(--text2)',fontSize:15}}>LAO — Open Here (MAO × 70%)</span>
                    <span style={{fontFamily:'JetBrains Mono,monospace',color:'var(--cyan)',fontSize:15,fontWeight:700}}>{fmt(lao)}</span>
                  </div>
                </div>

                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:12,marginBottom:8}}>
                  {[{l:'MAO',s:'Never exceed this ceiling',v:mao,c:'var(--gold)'},{l:'LAO — Open Here',s:'Start negotiations here',v:lao,c:'var(--cyan)'},{l:'Negotiation Room',s:'Room to negotiate',v:mao-lao,c:'var(--text2)'}].map(card=>(
                    <div key={card.l} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:16,textAlign:'center'}}>
                      <div style={{fontSize:12,fontWeight:700,textTransform:'uppercase',color:card.c,marginBottom:6}}>{card.l}</div>
                      <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:22,fontWeight:800,color:card.c,marginBottom:4}}>{fmt(card.v)}</div>
                      <div style={{fontSize:12,color:'var(--text3)'}}>{card.s}</div>
                    </div>
                  ))}
                </div>
                <div style={{textAlign:'center',fontSize:13,color:'var(--text3)',marginBottom:16}}>Never exceed MAO. Open at LAO. You have {fmt(mao-lao)} of negotiation room.</div>

                {(hasOutlier||majors.foundation||laoFloored)&&(
                  <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
                    {hasOutlier&&<div style={{padding:'12px 16px',borderRadius:10,background:'var(--orange-faint)',border:'1px solid var(--orange-border)',color:'var(--orange)',fontSize:13}}>⚠ High comp variance — one or more comps deviated significantly from the group. ARV confidence reduced.</div>}
                    {majors.foundation&&<div style={{padding:'12px 16px',borderRadius:10,background:'var(--orange-faint)',border:'1px solid var(--orange-border)',color:'var(--orange)',fontSize:13}}>⚠ Foundation work in scope — verify with contractor before delivering this offer</div>}
                    {laoFloored&&<div style={{padding:'12px 16px',borderRadius:10,background:'var(--gold-faint)',border:'1px solid var(--gold-border)',color:'var(--gold)',fontSize:13}}>ℹ LAO floor applied — calculated LAO was below $35,000, floored at $35,000</div>}
                  </div>
                )}

                {gap!==null&&(
                  <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'16px 20px',marginBottom:16}}>
                    <div style={SEC}>Gap Analysis</div>
                    {[{l:'Seller Asking',v:askN,c:'var(--text)'},{l:'Your MAO',v:mao,c:'var(--gold)'},{l:'Gap',v:gap,c:gap<=0?'var(--green)':'var(--red)',special:true}].map((r,i)=>(
                      <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:i<2?'1px solid var(--border)':'none'}}>
                        <span style={{color:'var(--text2)'}}>{r.l}</span>
                        <span style={{fontFamily:'JetBrains Mono,monospace',fontWeight:700,color:r.c}}>{r.special?(gap<=0?`+${fmt(-gap)} below your ceiling`:`-${fmt(gap)} above your ceiling — needs ${fmt(gap)} reduction`):fmt(r.v)}</span>
                      </div>
                    ))}
                  </div>
                )}

                <button onClick={copyBrief} style={{width:'100%',minHeight:52,borderRadius:10,border:'none',background:vCol,color:'#000',fontWeight:800,fontSize:15,cursor:'pointer',marginBottom:10,transition:'all 0.15s'}}>
                  {copied==='saved'?'✓ Copied & Saved':copied?'✓ Copied to Clipboard':'Copy Deal Brief'}
                </button>
                {(vWord==='STRONG'||vWord==='VIABLE')&&(
                  <button onClick={saveHist} style={{width:'100%',minHeight:46,borderRadius:10,border:'1px solid var(--border)',background:'var(--surface3)',color:'var(--text2)',fontWeight:700,fontSize:14,cursor:'pointer'}}>
                    {savedMsg||'Save to History'}
                  </button>
                )}
              </>
            )}
          </>
        )}

        {/* NOVATION */}
        {mode==='novation'&&(
          <>
            <div style={CARD_C}>
              <div style={SEC}>As-Is Comparable Sales</div>
              <div style={{fontSize:13,color:'var(--text3)',marginBottom:14}}>What similar as-is condition homes are selling for. NOT repaired retail comps.</div>
              <div style={{marginBottom:14}}>
                <label style={LBL}>Subject Property Sqft</label>
                <input style={{...INPUT,maxWidth:180,fontFamily:'JetBrains Mono,monospace',fontSize:18}} type="text" inputMode="numeric" value={novSubjectSqft} onChange={e=>setNovSubjectSqft(e.target.value.replace(/[^0-9]/g,''))} placeholder="Enter sqft" onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/>
                {novSqftN>0&&<div style={{marginTop:6,fontSize:12,color:'var(--text3)'}}>ALP calculated via PPSF × {novSqftN.toLocaleString()} sqft</div>}
              </div>
              {novComps.map((c,i)=><CompSlot key={i} num={i+1} comp={c} subjectSqft={novSqftN} onChange={v=>setNovComps(cs=>cs.map((x,j)=>j===i?v:x))} accentColor="var(--cyan)"/>)}
              {suggestedALP>0&&(
                <div style={{marginTop:14,padding:'14px 16px',borderRadius:10,background:'var(--surface3)',border:'1px solid var(--border)'}}>
                  <div style={{fontSize:12,color:'var(--text3)',marginBottom:4}}>Suggested ALP (avg PPSF ${Math.round(avgNovPPSF).toLocaleString()}/sqft × {novSqftN.toLocaleString()} sqft)</div>
                  <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:28,fontWeight:700,color:isALPOverridden?'var(--text3)':'var(--cyan)',textDecoration:isALPOverridden?'line-through':'none'}}>{fmt(suggestedALP)}</div>
                  {isALPOverridden&&<div style={{fontSize:12,color:'var(--text3)',marginTop:4}}>Overridden by manual input below</div>}
                </div>
              )}
              <div style={{marginTop:14}}>
                <label style={LBL}>Override ALP (optional)</label>
                <div style={{fontSize:12,color:'var(--text3)',marginBottom:8}}>Enter a specific average listing price if you have better market data than your comps</div>
                <div style={{position:'relative',maxWidth:220}}>
                  <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text3)',pointerEvents:'none',zIndex:1}}>$</span>
                  <input style={{...INPUT,paddingLeft:24,fontFamily:'JetBrains Mono,monospace'}} type="text" inputMode="numeric" value={alpOverride} onChange={e=>setAlpOverride(e.target.value.replace(/[^0-9]/g,''))} placeholder="" onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/>
                </div>
                {isALPOverridden&&<div style={{marginTop:6,fontSize:12,color:'var(--text3)'}}>Using {fmt(activeALP)} — suggested was {fmt(suggestedALP)}</div>}
              </div>
            </div>

            {activeALP>0&&(
              <div style={CARD_C}>
                <div style={SEC}>Formula Chain</div>
                {/* ALP */}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid var(--border)',flexWrap:'wrap',gap:8}}>
                  <div>
                    <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:2}}>
                      <span style={{fontSize:14,fontWeight:700,color:'var(--text)'}}>ALP (Average Listing Price)</span>
                      {isALPOverridden&&<span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:'var(--orange-faint)',color:'var(--orange)',border:'1px solid var(--orange-border)',fontWeight:700}}>MANUAL OVERRIDE</span>}
                    </div>
                    <div style={{fontSize:12,color:'var(--text3)'}}>Average of valid as-is comps{isALPOverridden?` (suggested: ${fmt(suggestedALP)})`:''}</div>
                  </div>
                  <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:22,fontWeight:800,color:'var(--cyan)'}}>{fmt(activeALP)}</div>
                </div>
                {/* ELP */}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid var(--border)',flexWrap:'wrap',gap:8}}>
                  <div><div style={{fontSize:14,fontWeight:700,color:'var(--text)'}}>ELP (Estimated Listing Price)</div><div style={{fontSize:12,color:'var(--text3)'}}>ALP × 90% — listed below market for fast sale</div></div>
                  <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:22,fontWeight:800,color:'var(--cyan)'}}>{fmt(elp)}</div>
                </div>
                {/* Net Proceeds */}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',flexWrap:'wrap',gap:8}}>
                  <div><div style={{fontSize:14,fontWeight:700,color:'var(--text)'}}>Net Proceeds</div><div style={{fontSize:12,color:'var(--text3)'}}>Adj ELP × 90% — after agent commission and closing costs</div></div>
                  <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:22,fontWeight:800,color:'var(--cyan)'}}>{fmt(netProc)}</div>
                </div>
              </div>
            )}

            <div style={CARD_C}>
              <div style={SEC}>Deal Numbers</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:12,marginBottom:14}}>
                <div><label style={LBL}>Novation Fee</label>
                  <div style={{position:'relative'}}><span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text3)',pointerEvents:'none',zIndex:1}}>$</span>
                  <input style={{...INPUT,paddingLeft:24}} type="text" inputMode="numeric" value={novFee} onChange={e=>setNovFee(e.target.value.replace(/[^0-9]/g,''))} onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/></div>
                  {elp>0&&<div style={{marginTop:6,fontSize:12,color:Number(feePctElp)>15?'var(--orange)':'var(--text3)'}}>Fee is {feePctElp}% of ELP{Number(feePctElp)>15?' — verify margin':''}</div>}
                </div>
                <div><label style={LBL}>Safety Cushion</label>
                  <div style={{position:'relative'}}><span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text3)',pointerEvents:'none',zIndex:1}}>$</span>
                  <input style={{...INPUT,paddingLeft:24}} type="text" inputMode="numeric" value={novCushion} onChange={e=>setNovCushion(e.target.value.replace(/[^0-9]/g,''))} onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/></div>
                </div>
                <div><label style={LBL}>Variance Buffer %</label>
                  <input style={{...INPUT,fontFamily:'JetBrains Mono,monospace'}} type="text" inputMode="numeric" value={novBuffer} onChange={e=>setNovBuffer(e.target.value.replace(/[^0-9.]/g,''))} onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/>
                </div>
              </div>
              <div><label style={LBL}>Seller Asking Price (optional)</label>
                <div style={{position:'relative'}}><span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text3)',pointerEvents:'none',zIndex:1}}>$</span>
                <input style={{...INPUT,paddingLeft:24}} type="text" inputMode="numeric" value={novAsking} onChange={e=>setNovAsking(e.target.value.replace(/[^0-9]/g,''))} placeholder="" onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/></div>
              </div>
            </div>

            {activeALP>0&&(
              <>
                <div style={{background:novVC+'10',border:`1px solid ${novVC}40`,borderRadius:14,padding:isMobile?'20px 18px':'24px 28px',marginBottom:16,display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12}}>
                  <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:isMobile?36:48,fontWeight:900,color:novVC}}>{novV}</div>
                  <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                    <span style={{fontSize:13,padding:'4px 12px',borderRadius:20,background:'var(--surface3)',border:'1px solid var(--border)',color:'var(--gold)',fontFamily:'JetBrains Mono,monospace',fontWeight:700}}>Offer: {fmt(offerToSeller)}</span>
                    <span style={{fontSize:13,padding:'4px 12px',borderRadius:20,background:'var(--surface3)',border:'1px solid var(--border)',color:'var(--green)',fontFamily:'JetBrains Mono,monospace',fontWeight:700}}>Spread: {fmt(spread)}</span>
                  </div>
                </div>
                <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'20px 24px',marginBottom:16}}>
                  <div style={SEC}>Novation Breakdown</div>
                  {[{l:isALPOverridden?'ALP (OVERRIDE)':'ALP',v:activeALP},{l:'ELP (×90%)',v:elp},{l:`Adj ELP (−${novBuffer}% buffer)`,v:adjElp},{l:'Net Proceeds (×90%)',v:netProc},{l:'Minus Novation Fee',v:-novFeeN},{l:'Minus Safety Cushion',v:-novCushN}].map((row,i)=>(
                    <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
                      <span style={{color:'var(--text2)',fontSize:15}}>{row.l}</span>
                      <span style={{fontFamily:'JetBrains Mono,monospace',color:row.v<0?'var(--red)':'var(--text)',fontSize:15,fontWeight:600}}>{row.v<0?`-${fmt(-row.v)}`:fmt(row.v)}</span>
                    </div>
                  ))}
                  <div style={{display:'flex',justifyContent:'space-between',padding:'14px 0 4px'}}><span style={{fontWeight:800,color:'var(--text)',fontSize:16}}>OFFER TO SELLER</span><span style={{fontFamily:'JetBrains Mono,monospace',color:'var(--gold)',fontSize:22,fontWeight:900}}>{fmt(offerToSeller)}</span></div>
                  <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0'}}><span style={{color:'var(--text2)',fontSize:15}}>YOUR SPREAD</span><span style={{fontFamily:'JetBrains Mono,monospace',color:'var(--green)',fontSize:18,fontWeight:800}}>{fmt(spread)}</span></div>
                </div>
                {novAskN>0&&(
                  <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'16px 20px',marginBottom:16}}>
                    <div style={SEC}>Gap Analysis</div>
                    {[{l:'Seller Asking',v:fmt(novAskN),c:'var(--text)'},{l:'Offer to Seller',v:fmt(offerToSeller),c:'var(--gold)'},{l:'Gap',v:novAskN<=offerToSeller?`+${fmt(offerToSeller-novAskN)} room`:`-${fmt(novAskN-offerToSeller)} above offer`,c:novAskN<=offerToSeller?'var(--green)':'var(--red)'}].map((r,i)=>(
                      <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:i<2?'1px solid var(--border)':'none'}}><span style={{color:'var(--text2)'}}>{r.l}</span><span style={{fontFamily:'JetBrains Mono,monospace',fontWeight:700,color:r.c}}>{r.v}</span></div>
                    ))}
                  </div>
                )}
                <button onClick={copyBrief} style={{width:'100%',minHeight:52,borderRadius:10,border:'none',background:novVC||'var(--cyan)',color:'#000',fontWeight:800,fontSize:15,cursor:'pointer',transition:'all 0.15s'}}>
                  {copied==='saved'?'✓ Copied & Saved':copied?'✓ Copied to Clipboard':'Copy Deal Brief'}
                </button>
              </>
            )}
          </>
        )}
      </div>

      {isMobile&&(
        <nav style={{position:'fixed',bottom:0,left:0,right:0,height:64,background:'var(--surface)',borderTop:'1px solid var(--border)',display:'flex',alignItems:'center',zIndex:100}}>
          {[{href:'/',icon:'⌂',label:'Home'},{href:'/calculator',icon:'◈',label:'Offers'},{href:'/kpi',icon:'◉',label:'KPI'},{href:'/revenue',icon:'◆',label:'Revenue'},{href:'/scorecard',icon:'◐',label:'Score'}].map(item=>(
            <div key={item.href} onClick={()=>router.push(item.href)} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:2,cursor:'pointer',color:item.href==='/calculator'?'var(--gold)':'var(--text3)'}}>
              <span style={{fontSize:18}}>{item.icon}</span><span style={{fontSize:10,fontWeight:600}}>{item.label}</span>
            </div>
          ))}
        </nav>
      )}
    </div>
  );
}
