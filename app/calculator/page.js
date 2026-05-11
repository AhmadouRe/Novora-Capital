'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DatePicker from '../components/DatePicker.js';

const toN = v => { const n=Number(String(v||'').replace(/[^0-9.-]/g,'')); return isNaN(n)?0:n; };
const fmt = n => Number(n||0).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});
const fmtN = n => Number(n||0).toLocaleString('en-US');
const todayISO = () => new Date().toISOString().slice(0,10);
const daysDiff = iso => iso ? Math.round((Date.now()-new Date(iso).getTime())/86400000) : null;

const INPUT={minHeight:48,padding:'12px 16px',borderRadius:10,background:'var(--surface3)',border:'1px solid var(--border)',color:'var(--text)',fontSize:15,outline:'none',fontFamily:'Outfit,sans-serif',width:'100%',transition:'border-color 0.15s',boxSizing:'border-box'};
const LBL={fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.11em',color:'var(--text3)',marginBottom:8,display:'block'};
const CARD={background:'var(--surface)',border:'1px solid var(--border)',borderLeft:'3px solid var(--gold)',borderRadius:14,padding:'24px',marginBottom:16};
const CARD_C={background:'var(--surface)',border:'1px solid var(--border)',borderLeft:'3px solid var(--cyan)',borderRadius:14,padding:'24px',marginBottom:16};
const SEC={fontSize:13,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.12em',color:'var(--text3)',marginBottom:16};

const TIERS=[
  {max:139999,pct:70,label:'Below $140K',color:'var(--cyan)'},
  {max:179999,pct:73,label:'$140K–$179K',color:'var(--gold)'},
  {max:229999,pct:75,label:'$180K–$229K',color:'var(--gold)'},
  {max:279999,pct:78,label:'$230K–$279K',color:'var(--purple)'},
  {max:Infinity,pct:80,label:'$280K+',color:'var(--green)'},
];
const getTier=arv=>TIERS.find(t=>arv<=t.max)||TIERS[TIERS.length-1];
function getTierPct(arv){if(arv<140000)return 0.70;if(arv<180000)return 0.73;if(arv<230000)return 0.75;if(arv<280000)return 0.78;return 0.80;}

const BUMP_MAP={Cosmetic:'Light',Light:'Moderate',Moderate:'Heavy'};
const REHAB_TIERS=['Cosmetic','Light','Moderate','Heavy','Full Gut'];
const ohioRehabRanges={
  Cosmetic:[{maxSqft:1000,low:8000,high:15000},{maxSqft:1500,low:12000,high:20000},{maxSqft:2000,low:18000,high:28000},{maxSqft:2500,low:24000,high:35000},{maxSqft:Infinity,low:30000,high:45000}],
  Light:[{maxSqft:1000,low:15000,high:22000},{maxSqft:1500,low:22000,high:32000},{maxSqft:2000,low:30000,high:42000},{maxSqft:2500,low:38000,high:52000},{maxSqft:Infinity,low:48000,high:65000}],
  Moderate:[{maxSqft:1000,low:28000,high:40000},{maxSqft:1500,low:40000,high:58000},{maxSqft:2000,low:55000,high:75000},{maxSqft:2500,low:68000,high:90000},{maxSqft:Infinity,low:85000,high:110000}],
  Heavy:[{maxSqft:1000,low:45000,high:65000},{maxSqft:1500,low:60000,high:85000},{maxSqft:2000,low:80000,high:110000},{maxSqft:2500,low:95000,high:130000},{maxSqft:Infinity,low:115000,high:155000}],
  'Full Gut':[{maxSqft:1000,low:65000,high:90000},{maxSqft:1500,low:85000,high:115000},{maxSqft:2000,low:105000,high:140000},{maxSqft:2500,low:125000,high:165000},{maxSqft:Infinity,low:150000,high:195000}],
};
function getRehabRange(tier,sqft){const b=ohioRehabRanges[tier];if(!b||!sqft)return{low:0,high:0};return b.find(x=>sqft<=x.maxSqft)||b[b.length-1];}

const MAJOR_ITEMS=[
  {id:'roof',label:'Roof',dynamic:true},
  {id:'hvac',label:'HVAC',dynamic:true},
  {id:'foundation',label:'Foundation',editable:true,warn:true,defaultAmt:20000},
  {id:'plumbing',label:'Plumbing',editable:true,defaultAmt:10000},
  {id:'electrical',label:'Electrical',editable:true,defaultAmt:6000},
];
const EMPTY_COMP={price:'',sqft:'',date:''};

// ── DollarInput ──────────────────────────────────────────────────
function DollarInput({value,onChange,style,placeholder}){
  const [focused,setFocused]=useState(false);
  const num=toN(value);
  const display=focused?String(value).replace(/,/g,''):(num>0?num.toLocaleString():'');
  return(
    <input type="text" inputMode="numeric" style={style||INPUT} placeholder={placeholder||''}
      value={display}
      onChange={e=>onChange(e.target.value.replace(/[^0-9]/g,''))}
      onFocus={e=>{setFocused(true);e.target.style.borderColor='var(--border2)';}}
      onBlur={e=>{setFocused(false);e.target.style.borderColor='var(--border)';}}
    />
  );
}

// ── FeeField ─────────────────────────────────────────────────────
function FeeField({label,pct,setPct,elp}){
  const dollarVal=elp>0?Math.round(elp*(parseFloat(pct)||0)/100):0;
  return(
    <div style={{display:'flex',alignItems:'center',gap:8,padding:'9px 0',borderBottom:'1px solid var(--border)'}}>
      <span style={{flex:1,fontSize:13,color:'var(--text2)'}}>{label}</span>
      <input type="text" inputMode="decimal" value={pct}
        onChange={e=>setPct(e.target.value.replace(/[^0-9.]/g,''))}
        style={{background:'var(--surface3)',border:'1px solid var(--border)',borderRadius:8,padding:'6px 10px',color:'var(--text)',fontSize:13,width:60,outline:'none',fontFamily:'Outfit,sans-serif'}}
        onFocus={e=>e.target.style.borderColor='var(--border2)'}
        onBlur={e=>e.target.style.borderColor='var(--border)'}
      />
      <span style={{color:'var(--text3)',fontSize:12}}>%</span>
      <input type="text" inputMode="numeric"
        value={dollarVal>0?dollarVal.toLocaleString():''}
        onChange={e=>{const d=Number(e.target.value.replace(/[^0-9]/g,''));if(elp>0)setPct(((d/elp)*100).toFixed(2));}}
        style={{background:'var(--surface3)',border:'1px solid var(--border)',borderRadius:8,padding:'6px 10px',color:'var(--text)',fontSize:13,width:95,outline:'none',fontFamily:'Outfit,sans-serif'}}
        onFocus={e=>e.target.style.borderColor='var(--border2)'}
        onBlur={e=>e.target.style.borderColor='var(--border)'}
      />
    </div>
  );
}

// ── CompSlot ─────────────────────────────────────────────────────
function CompSlot({num,comp,subjectSqft,isMobile,onChange,accentColor}){
  const price=toN(comp.price),cSqft=toN(comp.sqft);
  const days=daysDiff(comp.date);
  const stale=days!==null&&days>365;
  const sizeGap=subjectSqft>0&&cSqft>0&&Math.abs(cSqft-subjectSqft)>300;
  const excluded=stale||sizeGap;
  const pps=price>0&&cSqft>0?Math.round(price/cSqft):0;
  return(
    <div style={{background:'var(--surface3)',border:'1px solid var(--border)',borderRadius:10,padding:16,marginBottom:12,opacity:excluded?0.55:1}}>
      <div style={{fontSize:11,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',marginBottom:12}}>Comp {num}</div>
      <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:12,marginBottom:10}}>
        <div>
          <label style={LBL}>Sale Price</label>
          <div style={{position:'relative'}}>
            <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text3)',pointerEvents:'none'}}>$</span>
            <input style={{...INPUT,paddingLeft:24}} type="text" inputMode="numeric" value={comp.price||''} onChange={e=>onChange({...comp,price:e.target.value.replace(/[^0-9.]/g,'')})} onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'} placeholder=""/>
          </div>
        </div>
        <div>
          <label style={LBL}>Sqft</label>
          <input style={INPUT} type="text" inputMode="numeric" value={comp.sqft||''} onChange={e=>onChange({...comp,sqft:e.target.value.replace(/[^0-9]/g,'')})} onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'} placeholder=""/>
        </div>
        <div><DatePicker label="Date Sold" value={comp.date||''} onChange={v=>onChange({...comp,date:v})}/></div>
      </div>
      <div style={{display:'flex',gap:8,flexWrap:'wrap',alignItems:'center'}}>
        {pps>0&&<span style={{fontFamily:'JetBrains Mono,monospace',color:excluded?'var(--text3)':accentColor||'var(--gold)',fontSize:15,fontWeight:700,textDecoration:excluded?'line-through':'none'}}>${fmtN(pps)}/sqft</span>}
        {days!==null&&<span style={{color:'var(--text3)',fontSize:12}}>({days} days ago)</span>}
        {stale&&sizeGap&&<span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:'var(--red-faint)',color:'var(--red)',border:'1px solid var(--red-border)',fontWeight:700}}>STALE + SIZE GAP — EXCLUDED</span>}
        {stale&&!sizeGap&&<span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:'var(--red-faint)',color:'var(--red)',border:'1px solid var(--red-border)',fontWeight:700}}>STALE — EXCLUDED</span>}
        {!stale&&sizeGap&&<span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:'var(--red-faint)',color:'var(--red)',border:'1px solid var(--red-border)',fontWeight:700}}>SIZE GAP — EXCLUDED</span>}
      </div>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────
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
  const [selectedLevel,setSelectedLevel]=useState('High');
  const [conditionUnknown,setConditionUnknown]=useState(false);
  const [yearBuilt,setYearBuilt]=useState('');
  const [basement,setBasement]=useState('None');
  const [basementDmgAmt,setBasementDmgAmt]=useState('10000');
  const [windows,setWindows]=useState('Good Condition');
  const [flooring,setFlooring]=useState('Full Replacement');
  const [garage,setGarage]=useState('None');
  const [garageRepairAmt,setGarageRepairAmt]=useState('4500');
  const [roofAge,setRoofAge]=useState('');
  const [majors,setMajors]=useState({});
  const [foundationAmt,setFoundationAmt]=useState('20000');
  const [plumbingAmt,setPlumbingAmt]=useState('10000');
  const [electricalAmt,setElectricalAmt]=useState('6000');
  const [aFee,setAFee]=useState('12000');
  const [cushion,setCushion]=useState('5000');

  // Novation
  const [novComps,setNovComps]=useState([EMPTY_COMP,EMPTY_COMP,EMPTY_COMP,EMPTY_COMP]);
  const [novSubjectSqft,setNovSubjectSqft]=useState('');
  const [novFee,setNovFee]=useState('20000');
  const [novCushion,setNovCushion]=useState(5000);
  const [novAsking,setNovAsking]=useState('');
  const [alpOverride,setAlpOverride]=useState('');
  const [buyerAgentPct,setBuyerAgentPct]=useState('3');
  const [listingAgentPct,setListingAgentPct]=useState('3');
  const [closingCostsPct,setClosingCostsPct]=useState('2');
  const [transferMiscPct,setTransferMiscPct]=useState('1');
  const [buyerConcessionsPct,setBuyerConcessionsPct]=useState('1');
  const [showFees,setShowFees]=useState(false);

  useEffect(()=>{const c=()=>setIsMobile(window.innerWidth<768);c();window.addEventListener('resize',c);return()=>window.removeEventListener('resize',c);},[]);
  useEffect(()=>{fetch('/api/calculator/history').then(r=>r.json()).then(d=>{if(Array.isArray(d))setHistory(d);}).catch(()=>{});},[]);

  const sqftN=toN(sqft);

  function getMajorAmt(m){
    if(m.id==='roof')return sqftN>0?Math.round((sqftN*7)/500)*500:7000;
    if(m.id==='hvac')return sqftN>0&&sqftN<1400?8000:12000;
    if(m.id==='foundation')return toN(foundationAmt)||20000;
    if(m.id==='plumbing')return toN(plumbingAmt)||10000;
    if(m.id==='electrical')return toN(electricalAmt)||6000;
    return 0;
  }

  // ── Assignment ARV ──
  const validComps=comps.filter(c=>{
    const d=daysDiff(c.date);const cSqft=toN(c.sqft);
    const stale=d!==null&&d>365;const sizeGap=sqftN>0&&cSqft>0&&Math.abs(cSqft-sqftN)>300;
    return toN(c.price)>0&&!stale&&!sizeGap;
  });
  const validWithSqft=validComps.filter(c=>toN(c.sqft)>0);
  const allPPS=validWithSqft.map(c=>toN(c.price)/toN(c.sqft));
  const avgPPS=allPPS.length>0?allPPS.reduce((a,b)=>a+b,0)/allPPS.length:0;
  const outliers=validWithSqft.filter(c=>avgPPS>0&&Math.abs(toN(c.price)/toN(c.sqft)-avgPPS)/avgPPS>0.20);
  const hasOutlier=outliers.length>0;
  const suggestedArv=sqftN>0&&avgPPS>0?Math.round(avgPPS*sqftN):0;
  const finalArv=toN(arvOverride)>0?toN(arvOverride):suggestedArv;
  const usingOverride=toN(arvOverride)>0;

  // Confidence (spec F)
  let conf;
  if(validComps.length===0){conf=usingOverride?'LOW':'INSUFFICIENT';}
  else if(validComps.length===1){conf='LOW';}
  else if(validComps.length>=3&&!hasOutlier){conf='HIGH';}
  else{conf='MEDIUM';}

  const confColor=conf==='HIGH'?'var(--green)':conf==='MEDIUM'?'var(--gold)':conf==='LOW'?'var(--orange)':'var(--red)';
  const confReason=conf==='INSUFFICIENT'?'No valid comps — add comps or use ARV override':
    conf==='LOW'?(validComps.length===0?'Override active — manual ARV in use':hasOutlier?'Outlier detected, only 1 comp — add more':'1 valid comp — add more for higher confidence'):
    conf==='MEDIUM'?(hasOutlier?'Outlier detected — confidence capped at MEDIUM':'2 valid comps — add a 3rd for HIGH confidence'):
    '3+ valid comps, no outliers — strong basis';

  // ── Rehab calculations ──
  const effectiveTier=(conditionUnknown&&selectedTier&&BUMP_MAP[selectedTier])?BUMP_MAP[selectedTier]:selectedTier;
  const rehabRange=(effectiveTier&&sqftN>0)?getRehabRange(effectiveTier,sqftN):{low:0,high:0};
  const isHeavyOrFull=effectiveTier==='Heavy'||effectiveTier==='Full Gut';
  const baseRehab=!effectiveTier?0:isHeavyOrFull?rehabRange.high:selectedLevel==='Low'?rehabRange.low:selectedLevel==='Mid'?Math.round((rehabRange.low+rehabRange.high)/2):rehabRange.high;

  const windowsCost=(windows==='Needs Replacement'||windows==='Unknown')?(sqftN<1200?6000:sqftN<=1800?9000:13000):0;
  const flooringCredit=flooring==='Hardwood Refinish'?-3000:0;
  const garageRepairCost=garage==='Needs Repair'?(toN(garageRepairAmt)||4500):0;
  const basementDmgCost=basement==='Water Damage'?(toN(basementDmgAmt)||10000):0;
  const additionalCosts=windowsCost+flooringCredit+garageRepairCost+basementDmgCost;

  const big5Total=MAJOR_ITEMS.reduce((s,m)=>s+(majors[m.id]?getMajorAmt(m):0),0);
  const totalRehab=baseRehab+big5Total+additionalCosts;

  const tier=finalArv>0?getTier(finalArv):null;
  const feeN=toN(aFee)||12000;
  const cushN=toN(cushion)||5000;
  const safeARV=isNaN(finalArv)||!isFinite(finalArv)?0:finalArv;
  const safeRehab=isNaN(totalRehab)||!isFinite(totalRehab)?0:totalRehab;
  const tierPctCalc=getTierPct(safeARV);
  const mao=safeARV>0?Math.round(safeARV*tierPctCalc-safeRehab-feeN-cushN):0;
  const lao=Math.round(mao*0.70);
  const walkAway=mao-15000;
  const askN=toN(asking);
  const gap=askN>0?askN-mao:null;

  // canShow — no confidence gate (spec D)
  const canShow=finalArv>0&&sqftN>0&&!!selectedTier;
  const sqftWarning=sqftN>0&&(sqftN<750||sqftN>2500);

  // Rehab/ARV ratio
  const rehabArvRatio=safeARV>0&&totalRehab>0?((totalRehab/safeARV)*100).toFixed(1):null;

  // Verdict (spec: STRONG≥12K, VIABLE≥6K, TIGHT≥1, DEAD≤0)
  let vGrade='',vWord='',vBg='',vBdr='',vCol='',vSub='';
  if(canShow){
    if(mao>=12000){vGrade='STRONG';vWord='STRONG DEAL ✓';vBg='var(--green-faint)';vBdr='var(--green-border)';vCol='var(--green)';}
    else if(mao>=6000){vGrade='VIABLE';vWord='VIABLE DEAL ✓';vBg='var(--gold-faint)';vBdr='var(--gold-border)';vCol='var(--gold)';}
    else if(mao>=1){vGrade='TIGHT';vWord='TIGHT — Review';vBg='var(--orange-faint)';vBdr='var(--orange-border)';vCol='var(--orange)';vSub='Seller must move significantly or deal is not viable.';}
    else{vGrade='DEAD';vWord='DEAD — Does Not Work';vBg='var(--red-faint)';vBdr='var(--red-border)';vCol='var(--red)';vSub='Numbers do not work at any negotiation point.';}
  }

  // ── Novation ──
  const novSqftN=toN(novSubjectSqft);
  const novValid=novComps.filter(c=>{
    const d=daysDiff(c.date);const cSqft=toN(c.sqft);
    const stale=d!==null&&d>365;const sizeGap=novSqftN>0&&cSqft>0&&Math.abs(cSqft-novSqftN)>300;
    return toN(c.price)>0&&toN(c.sqft)>0&&!stale&&!sizeGap;
  });
  const novAllPPS=novValid.map(c=>toN(c.price)/toN(c.sqft));
  const novHasOutlier=novAllPPS.length>1&&novAllPPS.some((p,_,a)=>{const avg=a.reduce((s,x)=>s+x,0)/a.length;return Math.abs(p-avg)/avg>0.20;});
  const avgNovPPSF=novValid.length>0?novValid.reduce((s,c)=>s+toN(c.price)/toN(c.sqft),0)/novValid.length:0;
  const suggestedALP=novSqftN>0&&avgNovPPSF>0?Math.round(avgNovPPSF*novSqftN):0;
  const isALPOverridden=toN(alpOverride)>0;
  const activeALP=isALPOverridden?toN(alpOverride):suggestedALP;

  let novConf;
  if(novValid.length===0){novConf=isALPOverridden?'LOW':'INSUFFICIENT';}
  else if(novValid.length===1){novConf='LOW';}
  else if(novValid.length>=3&&!novHasOutlier){novConf='HIGH';}
  else{novConf='MEDIUM';}
  const novConfColor=novConf==='HIGH'?'var(--green)':novConf==='MEDIUM'?'var(--gold)':novConf==='LOW'?'var(--orange)':'var(--red)';

  const totalFeesPct=[buyerAgentPct,listingAgentPct,closingCostsPct,transferMiscPct,buyerConcessionsPct].reduce((s,v)=>s+(parseFloat(v)||0),0);
  const elp=Math.round(activeALP*0.97);
  const sellingCosts=Math.round(elp*totalFeesPct/100);
  const netProc=elp-sellingCosts;
  const novFeeN=toN(novFee);
  const offerToSeller=netProc-novFeeN-novCushion;
  const spread=activeALP-offerToSeller;
  const novAskN=toN(novAsking);

  // Novation verdict (STRONG≥15K, VIABLE≥10K, TIGHT≥6K, DEAD<6K)
  let novV='',novVC='',novVSub='';
  if(activeALP>0){
    if(spread>=15000){novV='STRONG';novVC='var(--green)';}
    else if(spread>=10000){novV='VIABLE';novVC='var(--gold)';}
    else if(spread>=6000){novV='TIGHT';novVC='var(--orange)';novVSub='Tight spread — seller motivation is critical to close.';}
    else{novV='DEAD';novVC='var(--red)';novVSub='Spread does not support a viable deal at this ALP.';}
  }

  // ── Deal Briefs ──
  function buildBrief(){
    const majorList=MAJOR_ITEMS.filter(m=>majors[m.id]).map(m=>`${m.label} (+${fmt(getMajorAmt(m))})`).join(', ')||'None';
    const addlLines=[];
    if(windowsCost!==0)addlLines.push(`Windows: +${fmt(windowsCost)}`);
    if(flooringCredit!==0)addlLines.push(`Flooring credit: ${fmt(flooringCredit)}`);
    if(garageRepairCost>0)addlLines.push(`Garage repair: +${fmt(garageRepairCost)}`);
    if(basementDmgCost>0)addlLines.push(`Basement damage: +${fmt(basementDmgCost)}`);
    const compLines=comps.map((c,i)=>{
      if(!toN(c.price))return `  Comp ${i+1}: —`;
      const d=daysDiff(c.date);const pps=toN(c.sqft)>0?Math.round(toN(c.price)/toN(c.sqft)):0;
      const cSqft=toN(c.sqft);const stale=d!==null&&d>365;const sg=sqftN>0&&cSqft>0&&Math.abs(cSqft-sqftN)>300;
      return `  Comp ${i+1}: ${fmt(toN(c.price))} | ${cSqft||'?'} sqft | $${pps}/sqft | ${d!==null?d+' days ago':'no date'}${stale?' [STALE]':''}${sg?' [SIZE GAP]':''}`;
    }).join('\n');
    const bumped=conditionUnknown&&effectiveTier!==selectedTier?` → bumped to ${effectiveTier} (condition unknown)`:'';
    return `OFFER GENERATOR — NOVORA CAPITAL
Date: ${todayISO()} | Exit: Assignment
PROPERTY: ${address||'—'} | Sqft: ${sqftN||'?'} | Condition: ${selectedTier||'Not selected'}${bumped}
Level: ${isHeavyOrFull?'High (locked)':selectedLevel} | Rehab Range: ${fmt(rehabRange.low)}–${fmt(rehabRange.high)}
Base Rehab: ${fmt(baseRehab)} | Big 5: ${fmt(big5Total)}${additionalCosts!==0?` | Additional: ${fmt(additionalCosts)}`:''}
Total Rehab: ${fmt(totalRehab)}${rehabArvRatio?` (${rehabArvRatio}% of ARV)`:''}
Big 5 Items: ${majorList}${addlLines.length?`\nAdditional: ${addlLines.join(', ')}`:''}
COMPS (${validComps.length} valid of 4 entered — excluded if >365 days or >300 sqft variance):
${compLines}
ARV: ${fmt(finalArv)} (${usingOverride?'Manual Override':'Auto'}) | Tier: ${Math.round(tierPctCalc*100)}% | Confidence: ${conf}
MAO: ${fmt(mao)} | Opening Offer: ${fmt(lao)} | Walk Away Line: ${fmt(walkAway)}${askN?`\nSELLER ASKING: ${fmt(askN)} | GAP: ${gap<=0?`+${fmt(-gap)} below your ceiling`:`-${fmt(gap)} above your ceiling`}`:''}${hasOutlier?'\n⚠ High comp variance — one or more comps deviated significantly.':''}${majors.foundation?'\n⚠ Foundation work in scope — verify with contractor.':''}
VERDICT: ${vGrade}`.trim();
  }

  function buildNovBrief(){
    const feeBreakdown=`Buyer Agent ${buyerAgentPct}% · Listing ${listingAgentPct}% · Closing ${closingCostsPct}% · Transfer/Misc ${transferMiscPct}% · Concessions ${buyerConcessionsPct}%`;
    const compLines=novComps.map((c,i)=>{
      if(!toN(c.price))return `  Comp ${i+1}: —`;
      const d=daysDiff(c.date);const pps=toN(c.sqft)>0?Math.round(toN(c.price)/toN(c.sqft)):0;
      const cSqft=toN(c.sqft);const stale=d!==null&&d>365;const sg=novSqftN>0&&cSqft>0&&Math.abs(cSqft-novSqftN)>300;
      return `  Comp ${i+1}: ${fmt(toN(c.price))} | ${cSqft||'?'} sqft | $${pps}/sqft | ${d!==null?d+' days ago':'no date'}${stale?' [STALE]':''}${sg?' [SIZE GAP]':''}`;
    }).join('\n');
    return `OFFER GENERATOR — NOVORA CAPITAL
Date: ${todayISO()} | Exit: Novation${isALPOverridden?' | ALP OVERRIDDEN':''}
AS-IS COMPS (${novValid.length} valid of 4 — excluded if >365 days or >300 sqft variance):
${compLines}
ALP: ${fmt(activeALP)}${isALPOverridden?` (suggested: ${fmt(suggestedALP)})`:''}
ELP (ALP × 97%): ${fmt(elp)}
Transaction Costs (${totalFeesPct.toFixed(1)}%): ${feeBreakdown}
Selling Costs: ${fmt(sellingCosts)} | Net Proceeds: ${fmt(netProc)}
Novation Fee: ${fmt(novFeeN)} | Safety Cushion: ${fmt(novCushion)}
OFFER TO SELLER: ${fmt(offerToSeller)} | YOUR SPREAD: ${fmt(spread)}${novAskN?`\nSELLER ASKING: ${fmt(novAskN)} | GAP: ${novAskN<=offerToSeller?`+${fmt(offerToSeller-novAskN)} room`:`-${fmt(novAskN-offerToSeller)} above offer`}`:''}
VERDICT: ${novV}`.trim();
  }

  async function copyBrief(){
    await navigator.clipboard.writeText(mode==='novation'?buildNovBrief():buildBrief());
    const shouldSave=mode==='novation'?(novV==='STRONG'||novV==='VIABLE'):(vGrade==='STRONG'||vGrade==='VIABLE');
    if(shouldSave){
      await fetch('/api/calculator/history',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({address,arv:finalArv,mao:mode==='novation'?offerToSeller:mao,verdict:mode==='novation'?novV:vGrade,confidence:mode==='novation'?novConf:conf,mode,date:todayISO(),dealStatus:'Pending'})});
      fetch('/api/calculator/history').then(r=>r.json()).then(d=>{if(Array.isArray(d))setHistory(d);});
      setCopied('saved');
    }else{setCopied(true);}
    setTimeout(()=>setCopied(false),2500);
  }

  async function saveHist(){
    await fetch('/api/calculator/history',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({address,arv:finalArv,mao,verdict:vGrade,confidence:conf,mode,date:todayISO(),dealStatus:'Pending'})});
    setSavedMsg('Saved!');setTimeout(()=>setSavedMsg(''),2000);
    fetch('/api/calculator/history').then(r=>r.json()).then(d=>{if(Array.isArray(d))setHistory(d);});
  }

  function loadFromHist(h){
    setMode(h.mode||'assignment');
    setAddress(h.address||'');
    setArvOverride(h.arv?String(h.arv):'');
    if(h.sqft)setSqft(String(h.sqft));
    if(h.selectedTier)setSelectedTier(h.selectedTier);
    if(h.majors)setMajors(h.majors);
    if(h.aFee)setAFee(String(h.aFee));
    if(h.cushion)setCushion(String(h.cushion));
    if(h.alpOverride)setAlpOverride(String(h.alpOverride));
    if(Array.isArray(h.comps))setComps(h.comps.length===4?h.comps:[...h.comps,...Array(4-h.comps.length).fill(EMPTY_COMP)]);
    if(Array.isArray(h.novComps))setNovComps(h.novComps.length===4?h.novComps:[...h.novComps,...Array(4-h.novComps.length).fill(EMPTY_COMP)]);
    setShowHistory(false);
  }

  async function deleteFromHist(id){
    setDeletingHistId(id);
    await fetch(`/api/calculator/history/${id}`,{method:'DELETE'});
    setHistory(hs=>hs.filter(h=>h.id!==id));
    setDeletingHistId(null);
  }

  function resetAssignment(){
    setSelectedTier(null);setMajors({});setFoundationAmt('20000');setPlumbingAmt('10000');setElectricalAmt('6000');
    setConditionUnknown(false);setSelectedLevel('High');setYearBuilt('');setBasement('None');
    setWindows('Good Condition');setFlooring('Full Replacement');setGarage('None');setRoofAge('');
  }

  const p=isMobile?16:24;

  return(
    <div style={{minHeight:'100vh',background:'var(--bg)',paddingBottom:isMobile?80:40}}>
      {/* Nav */}
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

        {/* History Panel */}
        {showHistory&&(
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:20,marginBottom:16}}>
            <div style={SEC}>Offer History</div>
            {history.length===0&&<p style={{color:'var(--text3)',fontSize:14}}>No saved offers yet.</p>}
            {history.map(h=>(
              <div key={h.id} style={{display:'flex',alignItems:'center',gap:10,padding:'10px 12px',borderRadius:8,background:'var(--surface2)',marginBottom:8,flexWrap:'wrap'}}>
                <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:12,color:'var(--text3)'}}>{h.date}</span>
                <span style={{flex:1,fontSize:14,color:'var(--text)',fontWeight:600}}>{h.address||'No address'}</span>
                <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:13,color:'var(--gold)'}}>{fmt(h.mao)}</span>
                <span style={{fontSize:11,padding:'2px 8px',borderRadius:4,fontWeight:700,
                  color:h.verdict==='STRONG'?'var(--green)':h.verdict==='VIABLE'?'var(--gold)':h.verdict==='TIGHT'?'var(--orange)':'var(--red)',
                  background:h.verdict==='STRONG'?'var(--green-faint)':h.verdict==='VIABLE'?'var(--gold-faint)':h.verdict==='TIGHT'?'var(--orange-faint)':'var(--red-faint)',
                  border:`1px solid ${h.verdict==='STRONG'?'var(--green-border)':h.verdict==='VIABLE'?'var(--gold-border)':h.verdict==='TIGHT'?'var(--orange-border)':'var(--red-border)'}`
                }}>{h.verdict}</span>
                {h.dealStatus&&<span style={{fontSize:11,padding:'2px 8px',borderRadius:4,
                  background:h.dealStatus==='Active'?'var(--green-faint)':h.dealStatus==='Dead'?'var(--red-faint)':h.dealStatus==='Closed'?'var(--cyan-faint)':'var(--surface3)',
                  color:h.dealStatus==='Active'?'var(--green)':h.dealStatus==='Dead'?'var(--red)':h.dealStatus==='Closed'?'var(--cyan)':'var(--text3)',
                  border:`1px solid ${h.dealStatus==='Active'?'var(--green-border)':h.dealStatus==='Dead'?'var(--red-border)':h.dealStatus==='Closed'?'var(--cyan-border)':'var(--border)'}`,
                  fontWeight:600}}>{h.dealStatus}</span>}
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
              <button onClick={()=>{setMode(switchConfirm);setSwitchConfirm(null);setComps([EMPTY_COMP,EMPTY_COMP,EMPTY_COMP,EMPTY_COMP]);setNovComps([EMPTY_COMP,EMPTY_COMP,EMPTY_COMP,EMPTY_COMP]);setAsking('');setArvOverride('');setSelectedTier(null);setMajors({});resetAssignment();}} style={{padding:'8px 16px',borderRadius:8,border:'none',background:'var(--gold)',color:'#000',fontWeight:700,cursor:'pointer',fontSize:13}}>Switch</button>
            </div>
          </div>
        )}

        {!mode&&<div style={{textAlign:'center',padding:'48px 0',color:'var(--text3)',fontSize:15}}>Select an exit strategy above to begin.</div>}

        {/* ─── ASSIGNMENT ─── */}
        {mode==='assignment'&&(
          <>
            {/* Subject Property */}
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
                  <div style={{position:'relative'}}>
                    <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text3)',pointerEvents:'none',zIndex:1}}>$</span>
                    <DollarInput value={asking} onChange={setAsking} style={{...INPUT,paddingLeft:24}}/>
                  </div>
                </div>
              </div>
            </div>

            {/* Comparable Sales */}
            <div style={CARD}>
              <div style={SEC}>Comparable Sales</div>
              <div style={{fontSize:13,color:'var(--text3)',marginBottom:14}}>Comps older than 365 days or with sqft variance &gt;300 from subject are strictly excluded.</div>

              {/* Excluded comp amber banner */}
              {comps.some(c=>{
                const d=daysDiff(c.date);const cSqft=toN(c.sqft);
                return toN(c.price)>0&&(d!==null&&d>365||sqftN>0&&cSqft>0&&Math.abs(cSqft-sqftN)>300);
              })&&(
                <div style={{padding:'10px 14px',borderRadius:8,background:'var(--gold-faint)',border:'1px solid var(--gold-border)',color:'var(--gold)',fontSize:13,marginBottom:14}}>
                  ⚠ One or more comps excluded — check date and sqft variance above.
                </div>
              )}

              {comps.map((c,i)=><CompSlot key={i} num={i+1} comp={c} subjectSqft={sqftN} isMobile={isMobile} onChange={v=>setComps(cs=>cs.map((x,j)=>j===i?v:x))} accentColor="var(--gold)"/>)}
              <div style={{background:'var(--surface3)',borderRadius:12,padding:16}}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:6}}>
                  <span style={{fontSize:13,color:'var(--text2)'}}>{validComps.length} of 4 comps valid</span>
                  <span style={{fontSize:11,padding:'2px 10px',borderRadius:20,background:confColor+'18',color:confColor,border:`1px solid ${confColor}40`,fontWeight:700}}>{conf} CONFIDENCE</span>
                </div>
                <div style={{fontSize:12,color:'var(--text3)',marginBottom:12}}>{confReason}</div>
                {suggestedArv>0&&(
                  <div style={{marginBottom:14}}>
                    <div style={{fontSize:12,color:'var(--text3)',marginBottom:4}}>Suggested ARV (avg $/sqft × subject sqft)</div>
                    <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:28,fontWeight:700,color:'var(--gold)'}}>{fmt(suggestedArv)}</div>
                  </div>
                )}
                <div>
                  <label style={LBL}>Override ARV (optional)</label>
                  <div style={{position:'relative'}}>
                    <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text3)',pointerEvents:'none',zIndex:1}}>$</span>
                    <DollarInput value={arvOverride} onChange={setArvOverride} style={{...INPUT,paddingLeft:24}}/>
                  </div>
                  {usingOverride&&(
                    <div style={{marginTop:6,display:'flex',gap:8,alignItems:'center'}}>
                      <span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:'var(--orange-faint)',color:'var(--orange)',border:'1px solid var(--orange-border)',fontWeight:700}}>MANUAL OVERRIDE</span>
                      <span style={{fontSize:12,color:'var(--text3)'}}>Suggested was {fmt(suggestedArv)}</span>
                    </div>
                  )}
                  {finalArv>0&&(
                    <div style={{marginTop:8,fontSize:13,color:'var(--text2)'}}>ARV used: <span style={{fontFamily:'JetBrains Mono,monospace',color:'var(--text)',fontWeight:700}}>{fmt(finalArv)}</span>
                      {tier&&<span style={{marginLeft:10,fontSize:12,padding:'2px 8px',borderRadius:4,background:tier.color+'18',color:tier.color,border:`1px solid ${tier.color}40`,fontWeight:700}}>{tier.pct}% · {tier.label}</span>}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Property Condition */}
            <div style={CARD}>
              <div style={SEC}>Property Condition</div>
              {sqftWarning&&<div style={{padding:'10px 14px',borderRadius:8,background:'var(--gold-faint)',border:'1px solid var(--gold-border)',color:'var(--gold)',fontSize:13,marginBottom:14}}>⚠ Sqft is {sqftN<750?'below 750':'above 2,500'} — verify before finalizing</div>}

              {/* Condition unknown toggle */}
              <div style={{display:'flex',alignItems:'center',gap:10,marginBottom:16,padding:'10px 14px',borderRadius:8,background:'var(--surface3)',border:'1px solid var(--border)'}}>
                <input type="checkbox" id="condUnknown" checked={conditionUnknown} onChange={e=>setConditionUnknown(e.target.checked)} style={{width:16,height:16,cursor:'pointer'}}/>
                <label htmlFor="condUnknown" style={{fontSize:13,color:'var(--text2)',cursor:'pointer',flex:1}}>Condition unknown — bump tier up for conservative estimate</label>
                {conditionUnknown&&selectedTier&&BUMP_MAP[selectedTier]&&(
                  <span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:'var(--orange-faint)',color:'var(--orange)',border:'1px solid var(--orange-border)',fontWeight:700}}>
                    {selectedTier} → {BUMP_MAP[selectedTier]}
                  </span>
                )}
              </div>

              <div style={{fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--text3)',marginBottom:10}}>Rehab Tier</div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
                {REHAB_TIERS.map(t=>(
                  <div key={t} onClick={()=>setSelectedTier(t===selectedTier?null:t)}
                    style={{padding:'10px 16px',borderRadius:8,border:`2px solid ${selectedTier===t?'var(--gold)':'var(--border)'}`,background:selectedTier===t?'var(--gold-faint)':'var(--surface3)',color:selectedTier===t?'var(--gold)':'var(--text2)',cursor:'pointer',fontSize:14,fontWeight:600,transition:'all 0.15s'}}>
                    {t}
                  </div>
                ))}
              </div>

              {/* Level selector (Low/Mid/High) — hidden for Heavy/Full Gut */}
              {selectedTier&&!isHeavyOrFull&&(
                <div style={{marginBottom:16}}>
                  <div style={{fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--text3)',marginBottom:8}}>Rehab Level</div>
                  <div style={{display:'flex',gap:8}}>
                    {['Low','Mid','High'].map(lv=>(
                      <div key={lv} onClick={()=>setSelectedLevel(lv)}
                        style={{padding:'8px 18px',borderRadius:8,border:`2px solid ${selectedLevel===lv?'var(--gold)':'var(--border)'}`,background:selectedLevel===lv?'var(--gold-faint)':'var(--surface3)',color:selectedLevel===lv?'var(--gold)':'var(--text2)',cursor:'pointer',fontSize:13,fontWeight:600,transition:'all 0.15s'}}>
                        {lv}
                      </div>
                    ))}
                  </div>
                  <div style={{marginTop:6,fontSize:12,color:'var(--text3)'}}>
                    {selectedLevel==='Low'?'Low end of range — light scope':''}
                    {selectedLevel==='Mid'?'Mid-point of range — balanced estimate':''}
                    {selectedLevel==='High'?'High end of range — conservative (recommended)':''}
                  </div>
                </div>
              )}
              {selectedTier&&isHeavyOrFull&&<div style={{fontSize:12,color:'var(--text3)',marginBottom:12}}>Heavy / Full Gut — always uses high-end range (no level selector)</div>}

              {/* Rehab range display */}
              {effectiveTier&&sqftN>0&&(
                <div style={{marginBottom:16,padding:'14px 16px',borderRadius:10,background:'var(--surface3)',border:'1px solid var(--border)'}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',flexWrap:'wrap',gap:12}}>
                    <div>
                      <div style={{fontSize:12,color:'var(--text3)',marginBottom:4}}>
                        {effectiveTier} range for {fmtN(sqftN)} sqft
                        {conditionUnknown&&effectiveTier!==selectedTier&&<span style={{marginLeft:6,color:'var(--orange)'}}>(bumped from {selectedTier})</span>}
                      </div>
                      <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:18,fontWeight:700,color:'var(--gold)'}}>{fmt(rehabRange.low)} – {fmt(rehabRange.high)}</div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <div style={{fontSize:12,color:'var(--text3)',marginBottom:4}}>Base Rehab ({isHeavyOrFull?'High':selectedLevel})</div>
                      <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:18,fontWeight:700,color:'var(--gold)'}}>{fmt(baseRehab)}</div>
                    </div>
                  </div>
                  {(effectiveTier==='Heavy'||effectiveTier==='Full Gut')&&(
                    <div style={{marginTop:10,padding:'8px 12px',borderRadius:8,background:'var(--orange-faint)',border:'1px solid var(--orange-border)',color:'var(--orange)',fontSize:12}}>
                      ⚠ Heavy rehab — always verify Roof and HVAC condition. Add them below if needed.
                    </div>
                  )}
                </div>
              )}

              {/* Additional property details */}
              <div style={{fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--text3)',marginBottom:10,marginTop:4}}>Property Details</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:12,marginBottom:12}}>
                <div>
                  <label style={LBL}>Year Built (optional)</label>
                  <input style={INPUT} type="text" inputMode="numeric" value={yearBuilt} onChange={e=>setYearBuilt(e.target.value.replace(/[^0-9]/g,''))} placeholder="e.g. 1968" onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/>
                </div>
                <div>
                  <label style={LBL}>Roof Age (optional)</label>
                  <input style={INPUT} type="text" value={roofAge} onChange={e=>setRoofAge(e.target.value)} placeholder="e.g. 8 years / Unknown" onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/>
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:12,marginBottom:12}}>
                <div>
                  <label style={LBL}>Basement</label>
                  <select value={basement} onChange={e=>setBasement(e.target.value)} style={{...INPUT,cursor:'pointer'}}>
                    {['None','Dry','Water Damage'].map(o=><option key={o} value={o}>{o}</option>)}
                  </select>
                  {basement==='Water Damage'&&(
                    <div style={{marginTop:8,display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontSize:12,color:'var(--text3)'}}>Est. cost $</span>
                      <DollarInput value={basementDmgAmt} onChange={setBasementDmgAmt} style={{...INPUT,width:120,fontFamily:'JetBrains Mono,monospace',fontSize:14}}/>
                    </div>
                  )}
                </div>
                <div>
                  <label style={LBL}>Garage</label>
                  <select value={garage} onChange={e=>setGarage(e.target.value)} style={{...INPUT,cursor:'pointer'}}>
                    {['None','Good Condition','Needs Repair'].map(o=><option key={o} value={o}>{o}</option>)}
                  </select>
                  {garage==='Needs Repair'&&(
                    <div style={{marginTop:8,display:'flex',alignItems:'center',gap:8}}>
                      <span style={{fontSize:12,color:'var(--text3)'}}>Est. cost $</span>
                      <DollarInput value={garageRepairAmt} onChange={setGarageRepairAmt} style={{...INPUT,width:120,fontFamily:'JetBrains Mono,monospace',fontSize:14}}/>
                    </div>
                  )}
                </div>
              </div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:12,marginBottom:16}}>
                <div>
                  <label style={LBL}>Windows</label>
                  <select value={windows} onChange={e=>setWindows(e.target.value)} style={{...INPUT,cursor:'pointer'}}>
                    {['Good Condition','Needs Replacement','Unknown'].map(o=><option key={o} value={o}>{o}</option>)}
                  </select>
                  {windowsCost>0&&<div style={{marginTop:4,fontSize:12,color:'var(--orange)'}}>+{fmt(windowsCost)} added</div>}
                </div>
                <div>
                  <label style={LBL}>Flooring</label>
                  <select value={flooring} onChange={e=>setFlooring(e.target.value)} style={{...INPUT,cursor:'pointer'}}>
                    {['Full Replacement','Hardwood Refinish','Good Condition'].map(o=><option key={o} value={o}>{o}</option>)}
                  </select>
                  {flooringCredit!==0&&<div style={{marginTop:4,fontSize:12,color:'var(--green)'}}>{fmt(flooringCredit)} credit applied</div>}
                </div>
              </div>

              {/* Big 5 */}
              <div style={{fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.08em',color:'var(--text3)',marginBottom:10}}>Big 5 Items — tap to add</div>
              <div style={{display:'flex',gap:8,flexWrap:'wrap',marginBottom:12}}>
                {MAJOR_ITEMS.map(m=>{
                  const on=majors[m.id];const amt=getMajorAmt(m);
                  return(
                    <div key={m.id} onClick={()=>setMajors(x=>({...x,[m.id]:!x[m.id]}))} style={{padding:'10px 16px',borderRadius:8,border:`1px solid ${on?'var(--gold-border)':'var(--border)'}`,background:on?'var(--gold-faint)':'var(--surface3)',color:on?'var(--gold)':'var(--text2)',cursor:'pointer',fontSize:14,fontWeight:600,transition:'all 0.15s'}}>
                      {m.label}{on?` (+${fmt(amt)})`:''}</div>
                  );
                })}
              </div>
              {(majors.foundation||majors.plumbing||majors.electrical)&&(
                <div style={{display:'flex',gap:10,flexWrap:'wrap',marginBottom:12}}>
                  {majors.foundation&&(
                    <div style={{display:'flex',alignItems:'center',gap:6,padding:'8px 12px',borderRadius:8,background:'var(--surface3)',border:'1px solid var(--border)'}}>
                      <span style={{fontSize:12,color:'var(--text2)'}}>Foundation $</span>
                      <DollarInput value={foundationAmt} onChange={setFoundationAmt} style={{width:80,fontFamily:'JetBrains Mono,monospace',fontSize:14,fontWeight:700,background:'transparent',border:'none',color:'var(--gold)',outline:'none'}}/>
                    </div>
                  )}
                  {majors.plumbing&&(
                    <div style={{display:'flex',alignItems:'center',gap:6,padding:'8px 12px',borderRadius:8,background:'var(--surface3)',border:'1px solid var(--border)'}}>
                      <span style={{fontSize:12,color:'var(--text2)'}}>Plumbing $</span>
                      <DollarInput value={plumbingAmt} onChange={setPlumbingAmt} style={{width:80,fontFamily:'JetBrains Mono,monospace',fontSize:14,fontWeight:700,background:'transparent',border:'none',color:'var(--gold)',outline:'none'}}/>
                    </div>
                  )}
                  {majors.electrical&&(
                    <div style={{display:'flex',alignItems:'center',gap:6,padding:'8px 12px',borderRadius:8,background:'var(--surface3)',border:'1px solid var(--border)'}}>
                      <span style={{fontSize:12,color:'var(--text2)'}}>Electrical $</span>
                      <DollarInput value={electricalAmt} onChange={setElectricalAmt} style={{width:80,fontFamily:'JetBrains Mono,monospace',fontSize:14,fontWeight:700,background:'transparent',border:'none',color:'var(--gold)',outline:'none'}}/>
                    </div>
                  )}
                </div>
              )}
              {majors.foundation&&<div style={{padding:'10px 14px',borderRadius:8,background:'var(--orange-faint)',border:'1px solid var(--orange-border)',color:'var(--orange)',fontSize:13,marginBottom:12}}>⚠ Foundation work detected — verify scope with contractor before finalizing offer</div>}

              {/* Rehab/ARV ratio */}
              {rehabArvRatio&&<div style={{fontSize:13,color:'var(--text3)',marginBottom:8}}>Rehab/ARV ratio: <span style={{color:parseFloat(rehabArvRatio)>35?'var(--red)':parseFloat(rehabArvRatio)>25?'var(--orange)':'var(--green)',fontWeight:700}}>{rehabArvRatio}%</span></div>}

              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:10,marginTop:8}}>
                <div style={{fontSize:13,color:'var(--text2)'}}>Total Rehab: <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:22,fontWeight:800,color:'var(--gold)'}}>{fmt(totalRehab)}</span></div>
                {(selectedTier||Object.values(majors).some(Boolean))&&(
                  <button onClick={resetAssignment} style={{padding:'7px 14px',borderRadius:7,border:'1px solid var(--border)',background:'var(--surface3)',color:'var(--text3)',fontSize:12,cursor:'pointer',fontWeight:600}}>↺ Reset</button>
                )}
              </div>
            </div>

            {/* Deal Numbers */}
            <div style={CARD}>
              <div style={SEC}>Deal Numbers</div>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
                <div>
                  <label style={LBL}>Assignment Fee</label>
                  <div style={{position:'relative'}}>
                    <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text3)',pointerEvents:'none',zIndex:1}}>$</span>
                    <DollarInput value={aFee} onChange={setAFee} style={{...INPUT,paddingLeft:24}}/>
                  </div>
                </div>
                <div>
                  <label style={LBL}>Safety Cushion</label>
                  <div style={{position:'relative'}}>
                    <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text3)',pointerEvents:'none',zIndex:1}}>$</span>
                    <DollarInput value={cushion} onChange={setCushion} style={{...INPUT,paddingLeft:24}}/>
                  </div>
                </div>
              </div>
            </div>

            {/* Insufficient comps gate */}
            {!canShow&&(
              <div style={{background:'var(--surface)',border:`1px solid ${sqftN>0&&selectedTier&&conf==='INSUFFICIENT'?'var(--red-border)':'var(--border)'}`,borderRadius:14,padding:'28px',marginBottom:16,textAlign:'center'}}>
                {sqftN>0&&selectedTier&&conf==='INSUFFICIENT'?(
                  <>
                    <div style={{color:'var(--red)',fontSize:15,fontWeight:700,marginBottom:6}}>INSUFFICIENT COMPS</div>
                    <div style={{color:'var(--text3)',fontSize:13}}>Add at least 1 valid comp or enter an ARV override to generate your offer.</div>
                  </>
                ):(
                  <div style={{color:'var(--text2)',fontSize:15}}>Enter sqft and select a rehab tier to generate your offer. Add comps or enter an ARV override above.</div>
                )}
              </div>
            )}

            {canShow&&(
              <>
                {/* MAO Breakdown */}
                <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'20px 24px',marginBottom:16}}>
                  <div style={SEC}>MAO Breakdown</div>
                  {[
                    {l:`ARV × ${Math.round(tierPctCalc*100)}%`,v:Math.round(safeARV*tierPctCalc),c:'var(--text)'},
                    {l:`Minus Base Rehab (${effectiveTier}${conditionUnknown&&effectiveTier!==selectedTier?` bumped from ${selectedTier}`:''} — ${isHeavyOrFull?'high end':selectedLevel})`,v:-baseRehab,c:'var(--red)'},
                    ...(big5Total>0?[{l:'Minus Big 5 Items',v:-big5Total,c:'var(--red)'}]:[]),
                    ...(additionalCosts!==0?[{l:`${additionalCosts>0?'Minus':'Plus'} Additional Costs`,v:-additionalCosts,c:additionalCosts>0?'var(--red)':'var(--green)'}]:[]),
                    {l:'Minus Assignment Fee',v:-feeN,c:'var(--red)'},
                    {l:'Minus Safety Cushion',v:-cushN,c:'var(--red)'},
                  ].map((row,i)=>(
                    <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
                      <span style={{color:'var(--text2)',fontSize:15}}>{row.l}</span>
                      <span style={{fontFamily:'JetBrains Mono,monospace',color:row.c,fontSize:15,fontWeight:600}}>{row.v<0?`-${fmt(-row.v)}`:fmt(row.v)}</span>
                    </div>
                  ))}
                  <div style={{display:'flex',justifyContent:'space-between',padding:'14px 0 6px'}}>
                    <span style={{fontWeight:800,color:'var(--text)',fontSize:16}}>MAX SELLER OFFER (MAO)</span>
                    <span style={{fontFamily:'JetBrains Mono,monospace',color:'var(--gold)',fontSize:22,fontWeight:900}}>{fmt(mao)}</span>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0'}}>
                    <span style={{color:'var(--text2)',fontSize:14}}>Opening Offer (Start Here) — MAO × 70%</span>
                    <span style={{fontFamily:'JetBrains Mono,monospace',color:'var(--cyan)',fontSize:15,fontWeight:700}}>{fmt(lao)}</span>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0'}}>
                    <span style={{color:'var(--text2)',fontSize:14}}>Walk Away Line — MAO − $15,000</span>
                    <span style={{fontFamily:'JetBrains Mono,monospace',color:'var(--text3)',fontSize:15,fontWeight:700}}>{fmt(walkAway)}</span>
                  </div>
                </div>

                {/* Offer cards */}
                <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr 1fr',gap:12,marginBottom:8}}>
                  {[
                    {l:'MAO — Ceiling',s:'Never exceed this',v:mao,c:'var(--gold)',t:'Open negotiations here → never go higher'},
                    {l:'Opening Offer (Start Here)',s:'Open negotiations here',v:lao,c:'var(--cyan)',t:'Start here · work up toward MAO'},
                    {l:'Walk Away Line',s:'MAO − $15,000',v:walkAway,c:'var(--text2)',t:'Walk away if seller won\'t meet this'},
                  ].map(card=>(
                    <div key={card.l} style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:16,textAlign:'center'}}>
                      <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',color:card.c,marginBottom:6}}>{card.l}</div>
                      <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:22,fontWeight:800,color:card.c,marginBottom:4}}>{fmt(card.v)}</div>
                      <div style={{fontSize:12,color:'var(--text3)'}}>{card.t}</div>
                    </div>
                  ))}
                </div>
                <div style={{textAlign:'center',fontSize:13,color:'var(--text3)',marginBottom:16}}>Never exceed MAO. Open at {fmt(lao)}. Walk away if seller won&apos;t meet {fmt(walkAway)}.</div>

                {(hasOutlier||majors.foundation)&&(
                  <div style={{display:'flex',flexDirection:'column',gap:8,marginBottom:16}}>
                    {hasOutlier&&<div style={{padding:'12px 16px',borderRadius:10,background:'var(--orange-faint)',border:'1px solid var(--orange-border)',color:'var(--orange)',fontSize:13}}>⚠ High comp variance — one or more comps deviated significantly from the group. ARV confidence reduced.</div>}
                    {majors.foundation&&<div style={{padding:'12px 16px',borderRadius:10,background:'var(--orange-faint)',border:'1px solid var(--orange-border)',color:'var(--orange)',fontSize:13}}>⚠ Foundation work in scope — verify with contractor before delivering this offer</div>}
                  </div>
                )}

                {/* Gap Analysis */}
                {gap!==null&&(
                  <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'16px 20px',marginBottom:16}}>
                    <div style={SEC}>Gap Analysis</div>
                    {[
                      {l:'Seller Asking',v:fmt(askN),c:'var(--text)'},
                      {l:'Your MAO',v:fmt(mao),c:'var(--gold)'},
                      {l:'Gap',v:gap<=0?`+${fmt(-gap)} below your ceiling`:`-${fmt(gap)} above your ceiling`,c:gap<=0?'var(--green)':'var(--red)'},
                    ].map((r,i)=>(
                      <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:i<2?'1px solid var(--border)':'none'}}>
                        <span style={{color:'var(--text2)'}}>{r.l}</span>
                        <span style={{fontFamily:'JetBrains Mono,monospace',fontWeight:700,color:r.c}}>{r.v}</span>
                      </div>
                    ))}
                    {/* Gap action line (spec I) */}
                    <div style={{marginTop:10,padding:'10px 14px',borderRadius:8,fontSize:13,
                      background:gap<=0?'var(--green-faint)':gap<=10000?'var(--green-faint)':gap<=25000?'var(--gold-faint)':'var(--red-faint)',
                      border:`1px solid ${gap<=0?'var(--green-border)':gap<=10000?'var(--green-border)':gap<=25000?'var(--gold-border)':'var(--red-border)'}`,
                      color:gap<=0?'var(--green)':gap<=10000?'var(--green)':gap<=25000?'var(--gold)':'var(--red)'}}>
                      {gap<=0?'✓ Asking price is within your ceiling. You have room to negotiate.':gap<=10000?'Closeable — open at your Opening Offer and negotiate up.':gap<=25000?'Tight gap — consider novation path if condition qualifies.':'Wide gap — novation path or prepare to move on.'}
                    </div>
                  </div>
                )}

                {/* Verdict */}
                <div style={{background:vBg,border:`1px solid ${vBdr}`,borderRadius:14,padding:isMobile?'20px 18px':'24px 28px',marginBottom:16}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12,marginBottom:vSub?8:0}}>
                    <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:isMobile?26:36,fontWeight:900,color:vCol}}>{vWord}</div>
                    <div style={{display:'flex',gap:8}}>
                      <span style={{fontSize:12,padding:'4px 12px',borderRadius:20,background:confColor+'18',color:confColor,border:`1px solid ${confColor}40`,fontWeight:700}}>{conf}</span>
                      {tier&&<span style={{fontSize:12,padding:'4px 12px',borderRadius:20,background:tier.color+'18',color:tier.color,border:`1px solid ${tier.color}40`,fontWeight:700}}>{tier.pct}%</span>}
                    </div>
                  </div>
                  {vSub&&<div style={{color:vCol,fontSize:14,opacity:0.85,marginBottom:8}}>{vSub}</div>}
                  <div style={{fontSize:12,color:'var(--text3)',marginTop:6}}>
                    {vGrade==='STRONG'&&'Close quickly — strong numbers with good margin.'}
                    {vGrade==='VIABLE'&&'Pursue — solid deal if seller is motivated.'}
                    {vGrade==='TIGHT'&&'Proceed cautiously — needs seller to negotiate significantly.'}
                    {vGrade==='DEAD'&&'Move on or re-evaluate ARV and rehab scope.'}
                  </div>
                </div>

                {/* Novation Eligibility Card (spec J) */}
                {(selectedTier==='Cosmetic'||selectedTier==='Light'||selectedTier==='Moderate')&&(
                  <div style={{background:'var(--surface)',border:'1px solid var(--cyan)',borderLeft:'3px solid var(--cyan)',borderRadius:14,padding:'16px 20px',marginBottom:16}}>
                    <div style={{fontSize:12,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.1em',color:'var(--cyan)',marginBottom:8}}>Novation Eligible?</div>
                    <div style={{fontSize:14,color:'var(--text2)',marginBottom:6}}>This property&apos;s condition tier ({selectedTier}) may support a retail novation if the seller needs closer to full price.</div>
                    <div style={{fontSize:13,color:'var(--text3)',marginBottom:10}}>Novation formula: ALP × 97% − transaction costs − fee − cushion = offer to seller.</div>
                    <button onClick={()=>setSwitchConfirm('novation')} style={{padding:'8px 16px',borderRadius:8,border:'1px solid var(--cyan)',background:'var(--cyan-faint)',color:'var(--cyan)',fontSize:13,fontWeight:700,cursor:'pointer'}}>Evaluate as Novation →</button>
                  </div>
                )}

                <button onClick={copyBrief} style={{width:'100%',minHeight:52,borderRadius:10,border:'none',background:vCol||'var(--gold)',color:'#000',fontWeight:800,fontSize:15,cursor:'pointer',marginBottom:10,transition:'all 0.15s'}}>
                  {copied==='saved'?'✓ Copied & Saved':copied?'✓ Copied to Clipboard':'Copy Deal Brief'}
                </button>
                {(vGrade==='STRONG'||vGrade==='VIABLE')&&(
                  <button onClick={saveHist} style={{width:'100%',minHeight:46,borderRadius:10,border:'1px solid var(--border)',background:'var(--surface3)',color:'var(--text2)',fontWeight:700,fontSize:14,cursor:'pointer'}}>
                    {savedMsg||'Save to History'}
                  </button>
                )}
              </>
            )}
          </>
        )}

        {/* ─── NOVATION ─── */}
        {mode==='novation'&&(
          <>
            {/* As-Is Comps */}
            <div style={CARD_C}>
              <div style={SEC}>As-Is Comparable Sales</div>
              <div style={{fontSize:13,color:'var(--text3)',marginBottom:14}}>What similar as-is condition homes are selling for. Comps older than 365 days or with sqft variance &gt;300 are strictly excluded.</div>
              <div style={{marginBottom:14}}>
                <label style={LBL}>Subject Property Sqft</label>
                <input style={{...INPUT,maxWidth:180,fontFamily:'JetBrains Mono,monospace',fontSize:18}} type="text" inputMode="numeric" value={novSubjectSqft} onChange={e=>setNovSubjectSqft(e.target.value.replace(/[^0-9]/g,''))} placeholder="Enter sqft" onFocus={e=>e.target.style.borderColor='var(--border2)'} onBlur={e=>e.target.style.borderColor='var(--border)'}/>
                {novSqftN>0&&<div style={{marginTop:6,fontSize:12,color:'var(--text3)'}}>ALP calculated via PPSF × {novSqftN.toLocaleString()} sqft</div>}
              </div>

              {/* Excluded comp banner for novation */}
              {novComps.some(c=>{
                const d=daysDiff(c.date);const cSqft=toN(c.sqft);
                return toN(c.price)>0&&(d!==null&&d>365||novSqftN>0&&cSqft>0&&Math.abs(cSqft-novSqftN)>300);
              })&&(
                <div style={{padding:'10px 14px',borderRadius:8,background:'var(--gold-faint)',border:'1px solid var(--gold-border)',color:'var(--gold)',fontSize:13,marginBottom:14}}>
                  ⚠ One or more comps excluded — check date and sqft variance above.
                </div>
              )}

              {novComps.map((c,i)=><CompSlot key={i} num={i+1} comp={c} subjectSqft={novSqftN} isMobile={isMobile} onChange={v=>setNovComps(cs=>cs.map((x,j)=>j===i?v:x))} accentColor="var(--cyan)"/>)}
              <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10,marginTop:4}}>
                <span style={{fontSize:13,color:'var(--text2)'}}>{novValid.length} of 4 comps valid</span>
                <span style={{fontSize:11,padding:'2px 10px',borderRadius:20,background:novConfColor+'18',color:novConfColor,border:`1px solid ${novConfColor}40`,fontWeight:700}}>{novConf} CONFIDENCE</span>
              </div>
              {suggestedALP>0&&(
                <div style={{padding:'14px 16px',borderRadius:10,background:'var(--surface3)',border:'1px solid var(--border)',marginBottom:14}}>
                  <div style={{fontSize:12,color:'var(--text3)',marginBottom:4}}>Suggested ALP (avg PPSF ${Math.round(avgNovPPSF).toLocaleString()}/sqft × {novSqftN.toLocaleString()} sqft)</div>
                  <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:28,fontWeight:700,color:isALPOverridden?'var(--text3)':'var(--cyan)',textDecoration:isALPOverridden?'line-through':'none'}}>{fmt(suggestedALP)}</div>
                  {isALPOverridden&&<div style={{fontSize:12,color:'var(--text3)',marginTop:4}}>Overridden by manual input below</div>}
                </div>
              )}
              <div>
                <label style={LBL}>Override ALP (optional)</label>
                <div style={{fontSize:12,color:'var(--text3)',marginBottom:8}}>Enter a specific average listing price if you have better market data than your comps</div>
                <div style={{position:'relative',maxWidth:220}}>
                  <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text3)',pointerEvents:'none',zIndex:1}}>$</span>
                  <DollarInput value={alpOverride} onChange={setAlpOverride} style={{...INPUT,paddingLeft:24,fontFamily:'JetBrains Mono,monospace'}}/>
                </div>
                {isALPOverridden&&<div style={{marginTop:6,fontSize:12,color:'var(--text3)'}}>Using {fmt(activeALP)} — suggested was {fmt(suggestedALP)}</div>}
              </div>
            </div>

            {/* Formula Chain */}
            {activeALP>0&&(
              <div style={CARD_C}>
                <div style={SEC}>Formula Chain</div>
                {/* ALP row */}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid var(--border)',flexWrap:'wrap',gap:8}}>
                  <div>
                    <div style={{display:'flex',alignItems:'center',gap:8,flexWrap:'wrap',marginBottom:2}}>
                      <span style={{fontSize:14,fontWeight:700,color:'var(--text)'}}>ALP — Average Listing Price</span>
                      {isALPOverridden&&<span style={{fontSize:11,padding:'2px 8px',borderRadius:4,background:'var(--orange-faint)',color:'var(--orange)',border:'1px solid var(--orange-border)',fontWeight:700}}>OVERRIDE</span>}
                    </div>
                    <div style={{fontSize:12,color:'var(--text3)'}}>{isALPOverridden?`Manual override (suggested: ${fmt(suggestedALP)})`:'Average of valid as-is comps'}</div>
                  </div>
                  <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:22,fontWeight:800,color:'var(--cyan)'}}>{fmt(activeALP)}</div>
                </div>
                {/* ELP row */}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',borderBottom:'1px solid var(--border)',flexWrap:'wrap',gap:8}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:'var(--text)'}}>ELP — Estimated Listing Price</div>
                    <div style={{fontSize:12,color:'var(--text3)'}}>ALP × 97% — priced competitively for fast sale</div>
                  </div>
                  <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:22,fontWeight:800,color:'var(--cyan)'}}>{fmt(elp)}</div>
                </div>
                {/* Transaction Costs — FeeField collapsible */}
                <div style={{padding:'12px 0',borderBottom:'1px solid var(--border)'}}>
                  <button onClick={()=>setShowFees(f=>!f)} style={{background:'none',border:'none',cursor:'pointer',display:'flex',justifyContent:'space-between',width:'100%',alignItems:'center',padding:0}}>
                    <div style={{textAlign:'left'}}>
                      <div style={{fontSize:14,fontWeight:700,color:'var(--text)'}}>Transaction Costs</div>
                      <div style={{fontSize:12,color:'var(--text3)'}}>Buyer Agent {buyerAgentPct}% · Listing {listingAgentPct}% · Closing {closingCostsPct}% · Transfer {transferMiscPct}% · Concessions {buyerConcessionsPct}% = {totalFeesPct.toFixed(1)}%</div>
                    </div>
                    <div style={{display:'flex',alignItems:'center',gap:10}}>
                      <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:18,fontWeight:700,color:'var(--red)'}}>-{fmt(sellingCosts)}</div>
                      <span style={{color:'var(--text3)',fontSize:12}}>{showFees?'▲ Hide':'▼ Edit'}</span>
                    </div>
                  </button>
                  {showFees&&(
                    <div style={{marginTop:12}}>
                      <FeeField label="Buyer Agent" pct={buyerAgentPct} setPct={setBuyerAgentPct} elp={elp}/>
                      <FeeField label="Listing Agent" pct={listingAgentPct} setPct={setListingAgentPct} elp={elp}/>
                      <FeeField label="Closing Costs" pct={closingCostsPct} setPct={setClosingCostsPct} elp={elp}/>
                      <FeeField label="Transfer / Misc" pct={transferMiscPct} setPct={setTransferMiscPct} elp={elp}/>
                      <FeeField label="Buyer Concessions" pct={buyerConcessionsPct} setPct={setBuyerConcessionsPct} elp={elp}/>
                    </div>
                  )}
                </div>
                {/* Net Proceeds */}
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'12px 0',flexWrap:'wrap',gap:8}}>
                  <div>
                    <div style={{fontSize:14,fontWeight:700,color:'var(--text)'}}>Net Proceeds</div>
                    <div style={{fontSize:12,color:'var(--text3)'}}>ELP − selling costs ({totalFeesPct.toFixed(1)}%)</div>
                  </div>
                  <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:22,fontWeight:800,color:'var(--cyan)'}}>{fmt(netProc)}</div>
                </div>
              </div>
            )}

            {/* Deal Numbers */}
            <div style={CARD_C}>
              <div style={SEC}>Deal Numbers</div>
              <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:12,marginBottom:14}}>
                <div>
                  <label style={LBL}>Novation Fee</label>
                  <div style={{position:'relative'}}>
                    <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text3)',pointerEvents:'none',zIndex:1}}>$</span>
                    <DollarInput value={novFee} onChange={setNovFee} style={{...INPUT,paddingLeft:24}}/>
                  </div>
                </div>
                <div>
                  <label style={LBL}>Safety Cushion — {fmt(novCushion)}</label>
                  <input type="range" min={5000} max={7500} step={500} value={novCushion}
                    onChange={e=>setNovCushion(Number(e.target.value))}
                    style={{width:'100%',marginTop:10,accentColor:'var(--cyan)',cursor:'pointer'}}/>
                  <div style={{display:'flex',justifyContent:'space-between',fontSize:11,color:'var(--text3)',marginTop:4}}>
                    <span>$5,000</span><span>$7,500</span>
                  </div>
                </div>
              </div>
              <div>
                <label style={LBL}>Seller Asking Price (optional)</label>
                <div style={{position:'relative'}}>
                  <span style={{position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--text3)',pointerEvents:'none',zIndex:1}}>$</span>
                  <DollarInput value={novAsking} onChange={setNovAsking} style={{...INPUT,paddingLeft:24}}/>
                </div>
              </div>
            </div>

            {/* Novation results */}
            {activeALP>0&&(
              <>
                {/* Novation Breakdown */}
                <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'20px 24px',marginBottom:16}}>
                  <div style={SEC}>Novation Breakdown</div>
                  {[
                    {l:isALPOverridden?'ALP (OVERRIDE)':'ALP',v:activeALP,c:'var(--text)'},
                    {l:'ELP (ALP × 97%)',v:elp,c:'var(--cyan)'},
                    {l:`Transaction Costs (${totalFeesPct.toFixed(1)}% of ELP)`,v:-sellingCosts,c:'var(--red)'},
                    {l:'Net Proceeds',v:netProc,c:'var(--text)'},
                    {l:'Minus Novation Fee',v:-novFeeN,c:'var(--red)'},
                    {l:'Minus Safety Cushion',v:-novCushion,c:'var(--red)'},
                  ].map((row,i)=>(
                    <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'10px 0',borderBottom:'1px solid var(--border)'}}>
                      <span style={{color:'var(--text2)',fontSize:15}}>{row.l}</span>
                      <span style={{fontFamily:'JetBrains Mono,monospace',color:row.c,fontSize:15,fontWeight:600}}>{row.v<0?`-${fmt(-row.v)}`:fmt(row.v)}</span>
                    </div>
                  ))}
                  <div style={{display:'flex',justifyContent:'space-between',padding:'14px 0 4px'}}>
                    <span style={{fontWeight:800,color:'var(--text)',fontSize:16}}>OFFER TO SELLER</span>
                    <span style={{fontFamily:'JetBrains Mono,monospace',color:'var(--gold)',fontSize:22,fontWeight:900}}>{fmt(offerToSeller)}</span>
                  </div>
                  <div style={{display:'flex',justifyContent:'space-between',padding:'4px 0'}}>
                    <span style={{color:'var(--text2)',fontSize:15}}>YOUR SPREAD (ALP − Offer)</span>
                    <span style={{fontFamily:'JetBrains Mono,monospace',color:'var(--green)',fontSize:18,fontWeight:800}}>{fmt(spread)}</span>
                  </div>
                </div>

                {/* Novation Gap Analysis */}
                {novAskN>0&&(
                  <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'16px 20px',marginBottom:16}}>
                    <div style={SEC}>Gap Analysis</div>
                    {[
                      {l:'Seller Asking',v:fmt(novAskN),c:'var(--text)'},
                      {l:'Offer to Seller',v:fmt(offerToSeller),c:'var(--gold)'},
                      {l:'Gap',v:novAskN<=offerToSeller?`+${fmt(offerToSeller-novAskN)} room`:`-${fmt(novAskN-offerToSeller)} above offer`,c:novAskN<=offerToSeller?'var(--green)':'var(--red)'},
                    ].map((r,i)=>(
                      <div key={i} style={{display:'flex',justifyContent:'space-between',padding:'8px 0',borderBottom:i<2?'1px solid var(--border)':'none'}}>
                        <span style={{color:'var(--text2)'}}>{r.l}</span>
                        <span style={{fontFamily:'JetBrains Mono,monospace',fontWeight:700,color:r.c}}>{r.v}</span>
                      </div>
                    ))}
                    <div style={{marginTop:10,padding:'10px 14px',borderRadius:8,fontSize:13,
                      background:novAskN<=offerToSeller?'var(--green-faint)':(novAskN-offerToSeller)<=10000?'var(--green-faint)':(novAskN-offerToSeller)<=25000?'var(--gold-faint)':'var(--red-faint)',
                      border:`1px solid ${novAskN<=offerToSeller?'var(--green-border)':(novAskN-offerToSeller)<=10000?'var(--green-border)':(novAskN-offerToSeller)<=25000?'var(--gold-border)':'var(--red-border)'}`,
                      color:novAskN<=offerToSeller?'var(--green)':(novAskN-offerToSeller)<=10000?'var(--green)':(novAskN-offerToSeller)<=25000?'var(--gold)':'var(--red)'}}>
                      {novAskN<=offerToSeller?'✓ Asking is within your offer — room to negotiate.':(novAskN-offerToSeller)<=10000?'Closeable — present offer and negotiate up.':(novAskN-offerToSeller)<=25000?'Tight gap — seller motivation critical.':'Wide gap — strong motivation required or move on.'}
                    </div>
                  </div>
                )}

                {/* Novation Verdict */}
                <div style={{background:novVC+'10',border:`1px solid ${novVC}40`,borderRadius:14,padding:isMobile?'20px 18px':'24px 28px',marginBottom:16}}>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',flexWrap:'wrap',gap:12,marginBottom:novVSub?8:0}}>
                    <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:isMobile?26:36,fontWeight:900,color:novVC}}>{novV}</div>
                    <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                      <span style={{fontSize:13,padding:'4px 12px',borderRadius:20,background:'var(--surface3)',border:'1px solid var(--border)',color:'var(--gold)',fontFamily:'JetBrains Mono,monospace',fontWeight:700}}>Offer: {fmt(offerToSeller)}</span>
                      <span style={{fontSize:13,padding:'4px 12px',borderRadius:20,background:'var(--surface3)',border:'1px solid var(--border)',color:'var(--green)',fontFamily:'JetBrains Mono,monospace',fontWeight:700}}>Spread: {fmt(spread)}</span>
                    </div>
                  </div>
                  {novVSub&&<div style={{color:novVC,fontSize:14,opacity:0.85,marginBottom:6}}>{novVSub}</div>}
                  <div style={{fontSize:12,color:'var(--text3)',marginTop:4}}>
                    {novV==='STRONG'&&'Strong spread — pursue and lock up contract quickly.'}
                    {novV==='VIABLE'&&'Solid deal — present offer and confirm seller motivation.'}
                    {novV==='TIGHT'&&'Proceed with caution — every dollar of negotiation matters.'}
                    {novV==='DEAD'&&'Re-evaluate ALP or fees — spread does not support a profitable deal.'}
                  </div>
                </div>

                <button onClick={copyBrief} style={{width:'100%',minHeight:52,borderRadius:10,border:'none',background:novVC||'var(--cyan)',color:'#000',fontWeight:800,fontSize:15,cursor:'pointer',transition:'all 0.15s',marginBottom:10}}>
                  {copied==='saved'?'✓ Copied & Saved':copied?'✓ Copied to Clipboard':'Copy Deal Brief'}
                </button>
              </>
            )}
          </>
        )}
      </div>

      {/* Mobile Bottom Nav */}
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
