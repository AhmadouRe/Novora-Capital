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

function rehabBracket(sqftN){
  if(!sqftN||sqftN<=0) return {moveIn:null,light:null,medium:null,full:null,ranges:true};
  if(sqftN<1500) return {moveIn:8000,light:15000,medium:35000,full:60000};
  if(sqftN<=2000) return {moveIn:12000,light:25000,medium:45000,full:75000};
  return {moveIn:15000,light:35000,medium:60000,full:90000};
}
const roofAmt=sqft=>!sqft||sqft<1500?10000:sqft<=2000?12000:15000;
const MAJOR_ITEMS=[
  {id:'roof',label:'Roof',dynamic:true},
  {id:'hvac',label:'HVAC',amount:10000},
  {id:'foundation',label:'Foundation',amount:20000,warn:true},
  {id:'plumbing',label:'Plumbing',amount:10000},
  {id:'electrical',label:'Electrical',amount:10000},
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
          <input style={{...INPUT,paddingLeft:24}} type="number" value={comp.price||''} onChange={e=>onChange({...comp,price:e.target.value})} onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'} placeholder=""/></div>
        </div>
        <div><label style={LBL}>Sqft</label>
          <input style={INPUT} type="number" value={comp.sqft||''} onChange={e=>onChange({...comp,sqft:e.target.value})} onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'} placeholder=""/>
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

  // Assignment
  const [address,setAddress]=useState('');
  const [sqft,setSqft]=useState('');
  const [asking,setAsking]=useState('');
  const [comps,setComps]=useState([EMPTY_COMP,EMPTY_COMP,EMPTY_COMP,EMPTY_COMP]);
  const [arvOverride,setArvOverride]=useState('');
  const [condition,setCondition]=useState(null);
  const [majors,setMajors]=useState({});
  const [aFee,setAFee]=useState('12000');
  const [cushion,setCushion]=useState('5000');

  // Novation
  const [novComps,setNovComps]=useState([EMPTY_COMP,EMPTY_COMP,EMPTY_COMP,EMPTY_COMP]);
  const [novFee,setNovFee]=useState('20000');
  const [novCushion,setNovCushion]=useState('7500');
  const [novBuffer,setNovBuffer]=useState('3');
  const [novAsking,setNovAsking]=useState('');

  useEffect(()=>{const c=()=>setIsMobile(window.innerWidth<768);c();window.addEventListener('resize',c);return()=>window.removeEventListener('resize',c);},[]);
  useEffect(()=>{fetch('/api/calculator/history').then(r=>r.json()).then(d=>{if(Array.isArray(d))setHistory(d);}).catch(()=>{});},[]);

  const sqftN=toN(sqft);
  const rb=rehabBracket(sqftN);

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
  const rehabBase=condition&&!rb.ranges?rb[condition]||0:0;
  const majorTotal=MAJOR_ITEMS.reduce((s,m)=>s+(majors[m.id]?(m.dynamic?roofAmt(sqftN):m.amount||0):0),0);
  const totalRehab=rehabBase+majorTotal;
  const feeN=toN(aFee);
  const cushN=toN(cushion);
  const mao=finalArv>0&&tier?Math.round(finalArv*(tier.pct/100)-totalRehab-feeN-cushN):0;
  const laoRaw=Math.round(mao*0.70);
  const lao=Math.max(35000,laoRaw);
  const laoFloored=laoRaw<35000;
  const askN=toN(asking);
  const gap=askN>0?askN-mao:null;
  const canShow=validComps.length>=2&&condition&&sqftN>0&&finalArv>0;
  let vWord='',vBg='',vBdr='',vCol='',vSub='';
  if(canShow){
    if(mao>=12000){vWord='STRONG';vBg='var(--green-faint)';vBdr='var(--green-border)';vCol='var(--green)';}
    else if(mao>=6000){vWord='VIABLE';vBg='var(--gold-faint)';vBdr='var(--gold-border)';vCol='var(--gold)';}
    else if(mao>=1){vWord='TIGHT';vBg='var(--orange-faint)';vBdr='var(--orange-border)';vCol='var(--orange)';vSub='Seller must move significantly or deal is not viable.';}
    else{vWord='DEAD';vBg='var(--red-faint)';vBdr='var(--red-border)';vCol='var(--red)';vSub='Numbers do not work at any negotiation point.';}
  }

  // Novation
  const novValid=novComps.filter(c=>{const d=daysDiff(c.date);return toN(c.price)>0&&(d===null||d<=365);});
  const alp=novValid.length>0?Math.round(novValid.reduce((s,c)=>s+toN(c.price),0)/novValid.length):0;
  const elp=Math.round(alp*0.90);
  const bufPct=toN(novBuffer)/100;
  const adjElp=Math.round(elp*(1-bufPct));
  const netProc=Math.round(adjElp*0.90);
  const novFeeN=toN(novFee);
  const novCushN=toN(novCushion);
  const offerToSeller=netProc-novFeeN-novCushN;
  const spread=elp-offerToSeller;
  const novAskN=toN(novAsking);
  const feePctElp=elp>0?(novFeeN/elp*100).toFixed(1):0;
  let novV='',novVC='';
  if(alp>0){if(spread>=20000){novV='STRONG';novVC='var(--green)';}else if(spread>=12000){novV='VIABLE';novVC='var(--gold)';}else if(spread>=6000){novV='TIGHT';novVC='var(--orange)';}else{novV='DEAD';novVC='var(--red)';}}

  function buildBrief(){
    const condLabel={'moveIn':'Move-In Ready','light':'Light Rehab','medium':'Medium Rehab','full':'Full Gut'}[condition]||'';
    const majorList=MAJOR_ITEMS.filter(m=>majors[m.id]).map(m=>m.label).join(', ')||'None';
    const compLines=comps.map((c,i)=>{
      if(!toN(c.price))return `  Comp ${i+1}: —`;
      const d=daysDiff(c.date);const pps=toN(c.sqft)>0?Math.round(toN(c.price)/toN(c.sqft)):0;
      return `  Comp ${i+1}: ${fmt(toN(c.price))} | ${toN(c.sqft)||'?'} sqft | $${pps}/sqft | ${d!==null?d+' days ago':'no date'}`;
    }).join('\n');
    return `OFFER GENERATOR — NOVORA CAPITAL\nDate: ${todayISO()} | Exit: Assignment\nPROPERTY: ${address||'—'} | Sqft: ${sqftN||'?'} | Condition: ${condLabel} | Major Items: ${majorList} | Total Rehab: ${fmt(totalRehab)}\nCOMPS (${validComps.length} valid of 4 entered):\n${compLines}\nARV: ${fmt(finalArv)} (${usingOverride?'Manual Override':'Auto'}) | Tier: ${tier?.pct}% (${tier?.label}) | Confidence: ${conf}\nMAO: ${fmt(mao)} | LAO: ${fmt(lao)} | Negotiation Room: ${fmt(mao-lao)}\n${askN?`SELLER ASKING: ${fmt(askN)} | GAP: ${gap<=0?`+${fmt(-gap)} below your ceiling`:`-${fmt(gap)} above your ceiling`}`:''}${hasOutlier?'\n⚠ High comp variance — one or more comps deviated significantly.':''}${majors.foundation?'\n⚠ Foundation work in scope — verify with contractor.':''}${laoFloored?'\nℹ LAO floor applied — floored at $35,000.':''}\nVERDICT: ${vWord}`.trim();
  }

  function buildNovBrief(){
    const compLines=novComps.map((c,i)=>{if(!toN(c.price))return `  Comp ${i+1}: —`;const d=daysDiff(c.date);return `  Comp ${i+1}: ${fmt(toN(c.price))} | ${d!==null?d+' days ago':'no date'}`;}).join('\n');
    return `OFFER GENERATOR — NOVORA CAPITAL\nDate: ${todayISO()} | Exit: Novation\nAS-IS COMPS (${novValid.length} valid of 4):\n${compLines}\nALP: ${fmt(alp)} | ELP: ${fmt(elp)} | Adj ELP: ${fmt(adjElp)} | Net Proceeds: ${fmt(netProc)}\nNovation Fee: ${fmt(novFeeN)} | Safety Cushion: ${fmt(novCushN)}\nOFFER TO SELLER: ${fmt(offerToSeller)} | YOUR SPREAD: ${fmt(spread)}${novAskN?`\nSELLER ASKING: ${fmt(novAskN)} | GAP: ${novAskN<=offerToSeller?`+${fmt(offerToSeller-novAskN)} room`:`-${fmt(novAskN-offerToSeller)} above offer`}`:''}\nVERDICT: ${novV}`.trim();
  }

  async function copyBrief(){
    await navigator.clipboard.writeText(mode==='novation'?buildNovBrief():buildBrief());
    setCopied(true);setTimeout(()=>setCopied(false),2500);
  }

  async function saveHist(){
    await fetch('/api/calculator/history',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({address,arv:finalArv,mao,verdict:vWord,confidence:conf,mode,date:todayISO()})});
    setSavedMsg('Saved!');setTimeout(()=>setSavedMsg(''),2000);
    fetch('/api/calculator/history').then(r=>r.json()).then(d=>{if(Array.isArray(d))setHistory(d);});
  }

  const condBtns=[{k:'moveIn',l:'Move-In Ready',d:'Cosmetic updates only'},{k:'light',l:'Light Rehab',d:'Flooring, paint, fixtures'},{k:'medium',l:'Medium Rehab',d:'Kitchen, bath, systems'},{k:'full',l:'Full Gut',d:'Complete renovation'}];

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
                <span style={{fontSize:11,padding:'2px 8px',borderRadius:4,fontWeight:700,color:h.verdict==='STRONG'?'var(--green)':h.verdict==='VIABLE'?'var(--gold)':h.verdict==='TIGHT'?'var(--orange)':'var(--red)',background:h.verdict==='STRONG'?'var(--green-faint)':'var(--red-faint)',border:'1px solid transparent'}}>{h.verdict}</span>
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
              <button onClick={()=>{setMode(switchConfirm);setSwitchConfirm(null);setComps([EMPTY_COMP,EMPTY_COMP,EMPTY_COMP,EMPTY_COMP]);setAddress('');setSqft('');setAsking('');setArvOverride('');setCondition(null);setMajors({});}} style={{padding:'8px 16px',borderRadius:8,border:'none',background:'var(--gold)',color:'#000',fontWeight:700,cursor:'pointer',fontSize:13}}>Switch</button>
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
                  <input style={{...INPUT,fontFamily:'JetBrains Mono,monospace',fontSize:18}} type="number" value={sqft} onChange={e=>setSqft(e.target.value)} placeholder="Enter sqft" onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/>
                  {sqftN>0&&<div style={{marginTop:6,fontSize:12,color:'var(--text3)'}}>Rehab brackets calculated for {fmtN(sqftN)} sqft</div>}
                </div>
                <div>
                  <label style={LBL}>Seller Asking Price (optional)</label>
                  <div style={{position:'relative'}}><span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text3)',pointerEvents:'none',zIndex:1}}>$</span>
                  <input style={{...INPUT,paddingLeft:24}} type="number" value={asking} onChange={e=>setAsking(e.target.value)} placeholder="" onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/></div>
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
                  <input style={{...INPUT,paddingLeft:24}} type="number" value={arvOverride} onChange={e=>setArvOverride(e.target.value)} placeholder="" onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/></div>
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
              <div style={{fontSize:13,color:'var(--text3)',marginBottom:14}}>Rehab brackets auto-sized to your subject property sqft.</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:16}}>
                {condBtns.map(({k,l,d})=>{
                  const amt=rb.ranges?null:rb[k];
                  const disp=rb.ranges?({moveIn:'$8K–$15K',light:'$15K–$35K',medium:'$35K–$60K',full:'$60K–$90K'}[k]):fmt(amt);
                  return <div key={k} onClick={()=>setCondition(k)} style={{background:condition===k?'var(--gold-faint)':'var(--surface3)',border:`2px solid ${condition===k?'var(--gold)':'var(--border)'}`,borderRadius:12,padding:16,cursor:'pointer',transition:'all 0.15s'}}>
                    <div style={{fontWeight:700,color:'var(--text)',fontSize:15,marginBottom:6}}>{l}</div>
                    <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:18,color:'var(--gold)',fontWeight:700,marginBottom:6}}>{disp}</div>
                    <div style={{fontSize:12,color:'var(--text3)'}}>{d}</div>
                  </div>;
                })}
              </div>
              {rb.ranges&&<div style={{fontSize:12,color:'var(--text3)',marginBottom:12}}>Enter sqft above for exact amounts.</div>}
              <div style={{fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--text3)',marginBottom:10}}>Major Items — tap to add</div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:16}}>
                {MAJOR_ITEMS.map(m=>{const on=majors[m.id];const amt=m.dynamic?roofAmt(sqftN):m.amount||0;return(
                  <div key={m.id} onClick={()=>setMajors(x=>({...x,[m.id]:!x[m.id]}))} style={{padding:'10px 16px',borderRadius:8,border:`1px solid ${on?'var(--gold-border)':'var(--border)'}`,background:on?'var(--gold-faint)':'var(--surface3)',color:on?'var(--gold)':'var(--text2)',cursor:'pointer',fontSize:14,fontWeight:600,transition:'all 0.15s'}}>
                    {m.label}{on?` (+${fmt(amt)})`:''}</div>
                );})}
              </div>
              {majors.foundation&&<div style={{padding:'10px 14px',borderRadius:8,background:'var(--orange-faint)',border:'1px solid var(--orange-border)',color:'var(--orange)',fontSize:13,marginBottom:12}}>⚠ Foundation work detected — verify scope with contractor before finalizing offer</div>}
              <div style={{fontSize:13,color:'var(--text2)'}}>Total Rehab: <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:22,fontWeight:800,color:'var(--gold)'}}>{fmt(totalRehab)}</span></div>
            </div>

            <div style={CARD}>
              <div style={SEC}>Deal Numbers</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div><label style={LBL}>Assignment Fee</label>
                  <div style={{position:'relative'}}><span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text3)',pointerEvents:'none',zIndex:1}}>$</span>
                  <input style={{...INPUT,paddingLeft:24}} type="number" value={aFee} onChange={e=>setAFee(e.target.value)} onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/></div>
                </div>
                <div><label style={LBL}>Safety Cushion</label>
                  <div style={{position:'relative'}}><span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text3)',pointerEvents:'none',zIndex:1}}>$</span>
                  <input style={{...INPUT,paddingLeft:24}} type="number" value={cushion} onChange={e=>setCushion(e.target.value)} onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/></div>
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
                  {copied?'✓ Copied to Clipboard':'Copy Deal Brief'}
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
              {novComps.map((c,i)=><CompSlot key={i} num={i+1} comp={c} subjectSqft={0} onChange={v=>setNovComps(cs=>cs.map((x,j)=>j===i?v:x))} accentColor="var(--cyan)"/>)}
            </div>

            {alp>0&&(
              <div style={CARD_C}>
                <div style={SEC}>Formula Chain</div>
                {[{l:'ALP (Average Listing Price)',f:'Average of valid as-is comps',v:alp},{l:'ELP (Estimated Listing Price)',f:'ALP × 90% — listed below market for fast sale',v:elp},{l:'Net Proceeds',f:'Adj ELP × 90% — after agent commission and closing costs',v:netProc}].map((row,i)=>(
                  <div key={i} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:i<2?'1px solid var(--border)':'none',flexWrap:'wrap',gap:8}}>
                    <div><div style={{fontSize:14,fontWeight:700,color:'var(--text)'}}>{row.l}</div><div style={{fontSize:12,color:'var(--text3)'}}>{row.f}</div></div>
                    <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:22,fontWeight:800,color:'var(--cyan)'}}>{fmt(row.v)}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={CARD_C}>
              <div style={SEC}>Deal Numbers</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:12,marginBottom:14}}>
                <div><label style={LBL}>Novation Fee</label>
                  <div style={{position:'relative'}}><span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text3)',pointerEvents:'none',zIndex:1}}>$</span>
                  <input style={{...INPUT,paddingLeft:24}} type="number" value={novFee} onChange={e=>setNovFee(e.target.value)} onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/></div>
                  {elp>0&&<div style={{marginTop:6,fontSize:12,color:Number(feePctElp)>15?'var(--orange)':'var(--text3)'}}>Fee is {feePctElp}% of ELP{Number(feePctElp)>15?' — verify margin':''}</div>}
                </div>
                <div><label style={LBL}>Safety Cushion</label>
                  <div style={{position:'relative'}}><span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text3)',pointerEvents:'none',zIndex:1}}>$</span>
                  <input style={{...INPUT,paddingLeft:24}} type="number" value={novCushion} onChange={e=>setNovCushion(e.target.value)} onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/></div>
                </div>
                <div><label style={LBL}>Variance Buffer %</label>
                  <input style={{...INPUT,fontFamily:'JetBrains Mono,monospace'}} type="number" value={novBuffer} onChange={e=>setNovBuffer(e.target.value)} onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/>
                </div>
              </div>
              <div><label style={LBL}>Seller Asking Price (optional)</label>
                <div style={{position:'relative'}}><span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text3)',pointerEvents:'none',zIndex:1}}>$</span>
                <input style={{...INPUT,paddingLeft:24}} type="number" value={novAsking} onChange={e=>setNovAsking(e.target.value)} placeholder="" onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/></div>
              </div>
            </div>

            {alp>0&&(
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
                  {[{l:'ALP',v:alp},{l:'ELP (×90%)',v:elp},{l:`Adj ELP (−${novBuffer}% buffer)`,v:adjElp},{l:'Net Proceeds (×90%)',v:netProc},{l:'Minus Novation Fee',v:-novFeeN},{l:'Minus Safety Cushion',v:-novCushN}].map((row,i)=>(
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
                  {copied?'✓ Copied to Clipboard':'Copy Deal Brief'}
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
