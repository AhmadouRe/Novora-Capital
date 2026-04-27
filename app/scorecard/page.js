'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

function toN(v) { if (!v && v !== 0) return 0; const n = parseFloat(String(v).replace(/[^0-9.]/g, '')); return isNaN(n) ? 0 : n; }
function fmt(n) { return Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }); }

const INPUT = { width: '100%', minHeight: 48, padding: '12px 16px', background: 'var(--surface3)', border: '1px solid var(--border)', borderRadius: 10, color: 'var(--text)', fontSize: 15, outline: 'none', fontFamily: 'Outfit,sans-serif', transition: 'border-color 0.15s' };

function Label({ children, color, req, sub }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <span style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.11em', color: color || 'var(--text3)' }}>{children}</span>
      {req && <span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>}
      {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 2, fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>{sub}</div>}
    </div>
  );
}

function SCard({ title, color, accent, sub, badge, children }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: color ? `3px solid ${color}` : '1px solid var(--border)', borderRadius: 14, padding: '22px 24px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: accent || 'var(--text)' }}>{title}</div>
          {sub && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>}
        </div>
        {badge && <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: (accent || 'var(--text2)') + '18', color: accent || 'var(--text2)', border: `1px solid ${(accent || 'var(--border2)')}44` }}>{badge}</span>}
      </div>
      {children}
    </div>
  );
}

function TInput({ value, onChange, placeholder }) {
  return <input style={INPUT} type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder || ''} onFocus={e => e.target.style.borderColor = 'var(--border2)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />;
}

function CInput({ value, onChange }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface3)', border: `1px solid ${focused ? 'var(--border2)' : 'var(--border)'}`, borderRadius: 10, overflow: 'hidden', transition: 'border-color 0.15s', minHeight: 48 }}>
      <span style={{ padding: '0 12px', color: 'var(--text3)', background: 'var(--surface2)', borderRight: '1px solid var(--border)', height: '100%', minHeight: 48, display: 'flex', alignItems: 'center', fontSize: 15 }}>$</span>
      <input style={{ flex: 1, padding: '12px 14px', background: 'transparent', border: 'none', color: 'var(--text)', fontSize: 15, outline: 'none', fontFamily: 'JetBrains Mono,monospace' }}
        type="text" inputMode="decimal"
        value={focused ? value : (toN(value) ? Number(toN(value)).toLocaleString() : '')}
        onChange={e => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        placeholder="" />
    </div>
  );
}

function Sel({ value, onChange, opts, placeholder }) {
  return (
    <select style={{ ...INPUT, cursor: 'pointer', appearance: 'none' }} value={value} onChange={e => onChange(e.target.value)} onFocus={e => e.target.style.borderColor = 'var(--border2)'} onBlur={e => e.target.style.borderColor = 'var(--border)'}>
      {placeholder && <option value="">{placeholder}</option>}
      {opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
    </select>
  );
}

function Radio({ value, onChange, opts }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {opts.map(o => {
        const sel = value === o.v;
        return (
          <div key={o.v} onClick={() => onChange(o.v)} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '10px 14px', borderRadius: 10, border: `1px solid ${sel ? 'var(--gold-border)' : 'var(--border)'}`, background: sel ? 'var(--gold-faint)' : 'var(--surface2)', cursor: 'pointer', transition: 'all 0.15s' }}>
            <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${sel ? 'var(--gold)' : 'var(--border2)'}`, background: sel ? 'var(--gold)' : 'transparent', flexShrink: 0, marginTop: 2 }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: sel ? 700 : 400, color: sel ? 'var(--gold)' : 'var(--text)' }}>{o.l}</div>
              {o.sub && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{o.sub}</div>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function Toggle({ value, onChange, label, sub }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
      <div>
        <div style={{ fontSize: 14, color: 'var(--text)' }}>{label}</div>
        {sub && <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 2 }}>{sub}</div>}
      </div>
      <div onClick={() => onChange(!value)} style={{ width: 44, height: 24, borderRadius: 12, background: value ? 'var(--green)' : 'var(--surface3)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0, marginLeft: 12, border: '1px solid var(--border)' }}>
        <div style={{ position: 'absolute', top: 3, left: value ? 22 : 3, width: 16, height: 16, borderRadius: '50%', background: '#fff', transition: 'left 0.2s' }} />
      </div>
    </div>
  );
}

function ConfidenceRing({ pct }) {
  const r = 42, circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--gold)' : 'var(--red)';
  return (
    <svg width={104} height={104} style={{ transform: 'rotate(-90deg)', flexShrink: 0 }}>
      <circle cx={52} cy={52} r={r} fill="none" stroke="var(--surface3)" strokeWidth={8} />
      <circle cx={52} cy={52} r={r} fill="none" stroke={color} strokeWidth={8} strokeDasharray={circ} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.8s ease' }} strokeLinecap="round" />
      <text x={52} y={52} textAnchor="middle" dominantBaseline="central" fill={color} fontSize={16} fontWeight={700} fontFamily="JetBrains Mono,monospace" style={{ transform: 'rotate(90deg)', transformOrigin: '52px 52px' }}>{pct}%</text>
    </svg>
  );
}

function computeScore({ motivation, decisionMaker, multipleOwners, timeline, accessType, condition, majorIssues, arv, mortgage, taxesOwed, liens, asking, repairs, mao, rental, exitStrategy }) {
  const arvN = toN(arv), mortN = toN(mortgage), taxN = toN(taxesOwed);
  const equityAmt = arvN > 0 && mortN > 0 ? arvN - mortN - taxN : null;
  const equityPct = equityAmt !== null && arvN > 0 ? (equityAmt / arvN) * 100 : null;
  const askN = toN(asking), maoN = toN(mao), repairsN = toN(repairs);

  // STAGE 1 — HARD BLOCKERS
  const hardBlockers = [];
  if (accessType === 'none') hardBlockers.push('No property access — cannot inspect, show, or appraise. No path to closing.');
  if (equityPct !== null && equityPct < 5) hardBlockers.push('Equity confirmed below 5% — no margin exists for any fee structure.');
  if (motivation === 'none' && (timeline === 'whenever' || !timeline)) hardBlockers.push('No motivation AND no timeline — seller has no problem and no urgency. No deal exists yet.');
  if (multipleOwners && !decisionMaker) hardBlockers.push('Multiple owners confirmed but decision maker not confirmed — cannot get contract signed without all parties.');

  // STAGE 2 — EXIT STRATEGY DETECTION
  const assignSigs = [], novSigs = [];
  if (condition === 'major') assignSigs.push('Major rehab condition');
  if (equityPct !== null && equityPct > 30) assignSigs.push('Strong equity above 30%');
  if (timeline === 'asap' || timeline === '30d') assignSigs.push('Urgent timeline');
  if (condition === 'moveIn' || condition === 'light') novSigs.push('Light condition — retail eligible');
  if (askN > 0 && arvN > 0 && Math.abs(askN - arvN) / arvN < 0.15) novSigs.push('Asking price within 15% of ARV');
  const isNovation = exitStrategy === 'novation';
  const switchDetected = exitStrategy === 'assignment' && novSigs.length >= 2 && assignSigs.length === 0;

  // STAGE 3 — WEIGHTED SCORING
  const weights = { motivation: isNovation ? 0.30 : 0.35, economics: isNovation ? 0.40 : 0.35, logistics: 0.20, property: 0.10 };

  // MOTIVATION
  let motivationScore = 0;
  const motKey = motivation && timeline ? `${motivation}-${timeline}` : motivation;
  const motMap = { 'needs-asap': 100, 'needs-30d': 85, 'needs-60d': 70, 'wants-asap': 65, 'wants-30d': 50, 'wants-60d': 35, 'wants-6mo': 20, 'wants-whenever': 10, 'wants-90d': 40, 'needs-90d': 60, 'needs-6mo': 40, 'needs-whenever': 20, 'none': 5, 'other': 30 };
  motivationScore = motMap[motKey] || motMap[motivation] || 20;
  if (decisionMaker) motivationScore = Math.min(100, motivationScore + 10);
  if (multipleOwners && !decisionMaker) motivationScore = Math.max(0, motivationScore - 15);

  // ECONOMICS
  let economicsScore = 0;
  const lao = maoN > 0 ? maoN * 0.70 : 0;
  if (maoN > 0 && askN > 0) {
    if (askN <= lao) economicsScore = 100;
    else if (askN <= maoN) economicsScore = 75;
    else if (askN <= maoN * 1.10) economicsScore = 50;
    else if (askN <= maoN * 1.25) economicsScore = 25;
    else economicsScore = 0;
  } else if (equityPct !== null) {
    if (equityPct >= 50) economicsScore = 90;
    else if (equityPct >= 30) economicsScore = 70;
    else if (equityPct >= 20) economicsScore = 45;
    else if (equityPct >= 10) economicsScore = 20;
    else economicsScore = 0;
  }
  if (liens) economicsScore = Math.max(0, economicsScore - 20);

  // LOGISTICS
  let logisticsScore = 0;
  if (accessType === 'lockbox' || accessType === 'vacant') logisticsScore = 100;
  else if (accessType === 'appt') logisticsScore = 70;
  else if (accessType === 'tenant') logisticsScore = 40;

  // PROPERTY
  let propertyScore = 0;
  if (condition === 'moveIn') propertyScore = 90;
  else if (condition === 'light') propertyScore = 75;
  else if (condition === 'medium') propertyScore = 55;
  else if (condition === 'major') propertyScore = 35;
  if (majorIssues && majorIssues.trim().length > 0) propertyScore = Math.max(0, propertyScore - 10);

  // STAGE 4 — COMPOSITE
  const composite = Math.round(
    (motivationScore * weights.motivation) +
    (economicsScore * weights.economics) +
    (logisticsScore * weights.logistics) +
    (propertyScore * weights.property)
  );

  // STAGE 5 — CONFIDENCE
  const cats = [motivationScore, economicsScore, logisticsScore, propertyScore];
  const catsAbove60 = cats.filter(s => s >= 60).length;
  const contradictions = [];
  if (motivationScore >= 70 && economicsScore < 30) contradictions.push('Motivated seller but price gap is large. Motivation may not be enough to bridge the numbers.');
  if (motivationScore < 30 && economicsScore >= 70) contradictions.push('Numbers work but seller motivation is weak. Risk of seller backing out before or after contract.');
  if ((timeline === 'asap' || timeline === '30d') && logisticsScore < 70) contradictions.push('Urgent timeline but access is limited. May not be able to move fast enough to close.');
  let confidence;
  if (catsAbove60 >= 3 && contradictions.length === 0) confidence = 'HIGH';
  else if (catsAbove60 >= 2 || (catsAbove60 >= 3 && contradictions.length > 0)) confidence = 'MEDIUM';
  else confidence = 'LOW';
  if (contradictions.length > 0 && confidence === 'HIGH') confidence = 'MEDIUM';
  const confPct = confidence === 'HIGH' ? 85 : confidence === 'MEDIUM' ? 55 : 25;

  // VERDICT
  let verdict, vColor, verdictReason, verdictNext;
  const incomplete = !motivation && !timeline;
  if (incomplete) {
    verdict = 'INCOMPLETE'; vColor = 'var(--cyan)';
    verdictReason = 'Not enough qualification data to generate a recommendation.';
    verdictNext = 'Complete motivation, timeline, access, and condition at minimum.';
  } else if (hardBlockers.length > 0) {
    verdict = 'DEAD'; vColor = 'var(--red)';
    verdictReason = hardBlockers[0];
    verdictNext = 'Remove from active pipeline. Document reason in CRM. Do not invest more time.';
  } else if (switchDetected) {
    verdict = 'SWITCH'; vColor = 'var(--orange)';
    verdictReason = 'Strong novation signals detected but assignment selected. ' + novSigs.join(', ') + '.';
    verdictNext = 'Run novation numbers in the Offer Generator before delivering any offer.';
  } else if (composite >= 75 && (confidence === 'HIGH' || confidence === 'MEDIUM')) {
    verdict = 'PUSH'; vColor = 'var(--green)';
    verdictReason = composite >= 85 ? 'Strong signals across all categories. Move immediately.' : 'Strong qualification signals. Financial data confirms viability.';
    verdictNext = 'Run Offer Generator now. Deliver offer today. Every hour matters.';
  } else if (composite >= 55 && hardBlockers.length === 0) {
    verdict = 'HOLD'; vColor = 'var(--gold)';
    verdictReason = 'Missing data or friction present. Potential is there but not confirmed.';
    verdictNext = 'Continue qualifying. Get financial data. Schedule callback within 24 hours.';
  } else if (composite >= 35 || confidence === 'LOW') {
    verdict = 'FOLLOW-UP'; vColor = 'var(--gold)';
    verdictReason = 'Signals are mixed. Not ready to pursue actively.';
    verdictNext = 'Move to Active Follow-Up sequence. Set next touch in 3 days.';
  } else {
    verdict = 'KILL'; vColor = 'var(--text3)';
    verdictReason = 'Insufficient signals across multiple categories. Not worth active pursuit.';
    verdictNext = 'Move to passive follow-up. Do not spend more active time on this lead.';
  }

  // SIGNALS LIST
  const signals = [];
  if (motivation) { const mots = { needs: { t: 'pos', m: 'Seller needs to sell — high urgency and motivation' }, wants: { t: 'neu', m: 'Seller wants to sell — motivation present, no urgency' }, none: { t: 'neg', m: 'No reason to sell — very low motivation' }, other: { t: 'neu', m: 'Other motivation — verify before proceeding' } }; if (mots[motivation]) signals.push(mots[motivation]); }
  if (timeline) { const tls = { asap: { t: 'pos', m: 'ASAP timeline — maximum urgency' }, '30d': { t: 'pos', m: 'Within 30 days — strong urgency' }, '60d': { t: 'neu', m: '30-60 day timeline — workable' }, '90d': { t: 'neu', m: '60-90 days — low urgency' }, '6mo': { t: 'neg', m: '3-6 months — nurture candidate' }, whenever: { t: 'neg', m: 'No real urgency — whenever timeline' } }; if (tls[timeline]) signals.push(tls[timeline]); }
  if (!decisionMaker && motivation) signals.push({ t: 'neg', m: 'Decision maker not confirmed — deal cannot move forward' });
  else if (decisionMaker) signals.push({ t: 'pos', m: 'Decision maker confirmed' });
  if (multipleOwners && !decisionMaker) signals.push({ t: 'neg', m: 'Multiple owners — not all parties confirmed' });
  if (accessType) { const acc = { lockbox: { t: 'pos', m: 'Lockbox — easy access anytime' }, vacant: { t: 'pos', m: 'Vacant — access with notice' }, appt: { t: 'neu', m: 'Access by appointment — manageable' }, tenant: { t: 'neu', m: 'Tenant occupied — coordination needed' }, none: { t: 'neg', m: 'No access — deal killer, cannot inspect or show property' } }; if (acc[accessType]) signals.push(acc[accessType]); }
  if (equityPct !== null) {
    if (equityPct < 5) signals.push({ t: 'neg', m: `Critical — only ${equityPct.toFixed(0)}% equity, deal not viable` });
    else if (equityPct < 20) signals.push({ t: 'neg', m: `Thin equity — ${equityPct.toFixed(0)}%, numbers must be perfect` });
    else if (equityPct < 40) signals.push({ t: 'neu', m: `Workable equity — ${equityPct.toFixed(0)}%` });
    else signals.push({ t: 'pos', m: `Strong equity — ${equityPct.toFixed(0)}%, good spread available` });
  }
  if (liens) signals.push({ t: 'neg', m: 'Liens or judgments present — verify before proceeding' });
  if (maoN > 0 && askN > 0) {
    const gap = askN - maoN;
    if (gap <= 0) signals.push({ t: 'pos', m: 'Asking price at or below MAO — deal viable at ask' });
    else if (gap <= 5000) signals.push({ t: 'neu', m: `Asking $${gap.toLocaleString()} above MAO — small gap, negotiable` });
    else if (gap <= 15000) signals.push({ t: 'neg', m: `Asking $${gap.toLocaleString()} over MAO — significant negotiation needed` });
    else signals.push({ t: 'neg', m: `Asking $${gap.toLocaleString()} over MAO — likely not viable` });
  }
  if (condition === 'moveIn') signals.push({ t: 'pos', m: 'Move-in ready — easier disposition' });
  else if (condition === 'major') signals.push({ t: 'neu', m: 'Major rehab needed — verify repair estimate carefully' });
  if (majorIssues?.trim()) signals.push({ t: 'neu', m: 'Major issues noted: ' + majorIssues });
  if (toN(rental) > 0) signals.push({ t: 'pos', m: `Rental estimate: $${toN(rental).toLocaleString()}/mo — adds buyer disposition options` });
  if (switchDetected) novSigs.forEach(s => signals.push({ t: 'neu', m: '→ Novation signal: ' + s }));

  return { verdict, vColor, verdictReason, verdictNext, confidence, confPct, composite, contradictions, signals, equityAmt, equityPct, hardBlockers };
}

const OUTCOMES = ['Pending', 'Under Contract', 'Dead-Price', 'Dead-Motivation', 'Dead-No Access', 'Closed', 'Follow-Up Later'];

const STATE_ABBR = ['AL','AK','AZ','AR','CA','CO','CT','DE','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME','MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI','SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY'];
const STATE_COMPLIANCE = { IL:'red',NE:'red',KY:'red',GA:'red',SC:'red',OK:'red',VA:'red', OH:'yellow',MD:'yellow',TN:'yellow',ND:'yellow',CT:'yellow',MN:'yellow',IA:'yellow' };

export default function ScorecardPage() {
  const router = useRouter();
  const [isMobile, setIsMobile] = useState(false);
  const [sessionOk, setSessionOk] = useState(false);
  const [userName, setUserName] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(false);

  const [streetAddr, setStreetAddr] = useState('');
  const [city, setCity] = useState('');
  const [stateVal, setStateVal] = useState('');
  const [zip, setZip] = useState('');
  const [county, setCounty] = useState('');

  const [motivation, setMotivation] = useState('');
  const [occupancy, setOccupancy] = useState('');
  const [condition, setCondition] = useState('');
  const [majorIssues, setMajorIssues] = useState('');
  const [timeline, setTimeline] = useState('');
  const [accessType, setAccessType] = useState('');
  const [decisionMaker, setDecisionMaker] = useState(false);
  const [multipleOwners, setMultipleOwners] = useState(false);

  const [mortgage, setMortgage] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [taxesOwed, setTaxesOwed] = useState('');
  const [arv, setArv] = useState('');
  const [liens, setLiens] = useState(false);

  const [asking, setAsking] = useState('');
  const [repairs, setRepairs] = useState('');
  const [mao, setMao] = useState('');
  const [rental, setRental] = useState('');
  const [exitStrategy, setExitStrategy] = useState('');

  const [notes, setNotes] = useState('');

  useEffect(() => { const c = () => setIsMobile(window.innerWidth < 768); c(); window.addEventListener('resize', c); return () => window.removeEventListener('resize', c); }, []);

  useEffect(() => {
    fetch('/api/auth/session').then(r => { if (!r.ok) { router.push('/'); return null; } return r.json(); })
      .then(d => { if (d?.userName) { setSessionOk(true); setUserName(d.userName); } }).catch(() => router.push('/'));
    fetch('/api/scorecard/history').then(r => r.json()).then(d => { if (Array.isArray(d)) setHistory(d); }).catch(() => {});
  }, []);

  const rec = computeScore({ motivation, decisionMaker, multipleOwners, timeline, accessType, condition, majorIssues, arv, mortgage, taxesOwed, liens, asking, repairs, mao, rental, exitStrategy });
  const { verdict, vColor, verdictReason, verdictNext, confidence, confPct, composite, contradictions, signals, equityAmt, equityPct, hardBlockers } = rec;

  const arvN = toN(arv), mortN = toN(mortgage);
  const showEquity = arvN > 0 && mortN > 0;
  const equityColor = equityPct !== null ? (equityPct < 20 ? 'var(--red)' : equityPct < 40 ? 'var(--gold)' : 'var(--green)') : 'var(--text2)';

  const requiredFields = [motivation, timeline, accessType, occupancy, condition];
  const missingCount = requiredFields.filter(f => !f).length;

  const stateUpper = stateVal.toUpperCase().trim();
  const complianceLevel = STATE_ABBR.includes(stateUpper) ? (STATE_COMPLIANCE[stateUpper] || 'green') : null;
  const complianceBanner = complianceLevel ? {
    red:    { bg:'var(--red-faint)',   border:'var(--red-border)',  color:'var(--red)',   icon:'⛔', msg:`${stateUpper} is a restricted state. Novation is not permitted. Do not present novation as an option.` },
    yellow: { bg:'var(--gold-faint)',  border:'var(--gold-border)', color:'var(--gold)',  icon:'⚠',  msg:`${stateUpper} requires additional compliance steps for novation. Confirm attorney review before proceeding.` },
    green:  { bg:'var(--green-faint)', border:'var(--green-border)',color:'var(--green)', icon:'✓',  msg:`${stateUpper} — No known novation restrictions. Standard process applies.` },
  }[complianceLevel] : null;

  const reset = () => {
    setStreetAddr(''); setCity(''); setStateVal(''); setZip(''); setCounty('');
    setMotivation(''); setOccupancy(''); setCondition(''); setMajorIssues(''); setTimeline(''); setAccessType('');
    setDecisionMaker(false); setMultipleOwners(false);
    setMortgage(''); setMonthlyPayment(''); setTaxesOwed(''); setArv(''); setLiens(false);
    setAsking(''); setRepairs(''); setMao(''); setRental(''); setExitStrategy(''); setNotes('');
  };

  const buildText = () => {
    const addr = [streetAddr, city, stateVal, zip].filter(Boolean).join(', ');
    return `LEAD SCORECARD — NOVORA CAPITAL\n═══════════════════════════════\n${addr ? 'Property: ' + addr + '\n' : ''}${county ? 'County: ' + county + '\n' : ''}\nVERDICT: ${verdict} | Score: ${composite}/100 | Confidence: ${confidence}\nReason: ${verdictReason}\nNext Step: ${verdictNext}\n${contradictions.length > 0 ? '\n⚠ CONTRADICTIONS:\n' + contradictions.map(c => '  • ' + c).join('\n') : ''}\n\n─── SIGNALS ────────────────────\n${signals.map(s => `${s.t === 'pos' ? '✓' : s.t === 'neg' ? '✗' : '○'} ${s.m}`).join('\n')}\n\n─── QUALIFICATION ──────────────\nMotivation: ${motivation || '—'} | Timeline: ${timeline || '—'}\nOccupancy: ${occupancy || '—'} | Condition: ${condition || '—'}\nAccess: ${accessType || '—'} | Decision Maker: ${decisionMaker ? 'Yes' : 'No'}\n${notes ? '\n─── NOTES ──────────────────────\n' + notes : ''}\n───────────────────────────────\nLogged by: ${userName} | ${new Date().toLocaleDateString()}\n`;
  };

  const copyAndSave = async () => {
    navigator.clipboard?.writeText(buildText()).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    if (verdict !== 'INCOMPLETE') {
      const payload = { address: [streetAddr, city, stateVal, zip].filter(Boolean).join(', '), verdict, confidence, composite, motivation, timeline, accessType, occupancy, condition, arv: toN(arv), mortgage: toN(mortgage), asking: toN(asking), mao: toN(mao), notes };
      const res = await fetch('/api/scorecard/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) { const d = await res.json(); setHistory(prev => [d, ...prev].slice(0, 30)); }
    }
  };

  const updateOutcome = async (id, outcome) => {
    await fetch(`/api/scorecard/${id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ outcome }) });
    setHistory(prev => prev.map(e => e.id === id ? { ...e, outcome } : e));
  };

  const deleteHistory = async (id) => {
    await fetch(`/api/scorecard/${id}`, { method: 'DELETE' });
    setHistory(prev => prev.filter(e => e.id !== id));
  };

  const verdictHistColor = v => v === 'PUSH' ? 'var(--green)' : v === 'HOLD' ? 'var(--gold)' : v === 'FOLLOW-UP' ? 'var(--gold)' : v === 'DEAD' ? 'var(--red)' : v === 'KILL' ? 'var(--text3)' : v === 'SWITCH' ? 'var(--orange)' : 'var(--cyan)';

  if (!sessionOk) return <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}>Loading…</div>;

  const p = isMobile ? 16 : 24;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)', paddingBottom: isMobile ? 80 : 40 }}>
      <nav style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: `0 ${p}px`, height: 58, background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={() => router.push('/')} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 20, cursor: 'pointer', padding: '4px 8px', borderRadius: 6 }}>←</button>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Lead Scorecard</span>
          <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: missingCount === 0 ? 'var(--green-faint)' : 'var(--gold-faint)', color: missingCount === 0 ? 'var(--green)' : 'var(--gold)', border: `1px solid ${missingCount === 0 ? 'var(--green-border)' : 'var(--gold-border)'}`, fontWeight: 700 }}>
            {missingCount === 0 ? '✓ All required filled' : `${missingCount} fields missing`}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface2)', color: 'var(--text2)', fontSize: 13, cursor: 'pointer', position: 'relative' }} onClick={() => setShowHistory(!showHistory)}>
            History{history.length > 0 && <span style={{ position: 'absolute', top: -6, right: -6, background: 'var(--purple)', color: '#fff', borderRadius: '50%', width: 18, height: 18, fontSize: 10, fontWeight: 800, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>{history.length}</span>}
          </button>
          <button style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid var(--red-border)', background: 'var(--red-faint)', color: 'var(--red)', fontSize: 13, cursor: 'pointer' }} onClick={reset}>Reset</button>
        </div>
      </nav>

      {complianceBanner && (
        <div style={{ position: 'sticky', top: 58, zIndex: 40, background: complianceBanner.bg, borderBottom: `1px solid ${complianceBanner.border}`, padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 16 }}>{complianceBanner.icon}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: complianceBanner.color }}>{complianceBanner.msg}</span>
        </div>
      )}

      <div style={{ maxWidth: 860, margin: '0 auto', padding: `${isMobile ? 16 : 24}px ${p}px` }}>

        <SCard title="Property" color="var(--gold)" accent="var(--gold)">
          <div style={{ marginBottom: 12 }}><Label>Street Address</Label><TInput value={streetAddr} onChange={setStreetAddr} placeholder="123 Main St" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr 1fr' : '2fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div><Label>City</Label><TInput value={city} onChange={setCity} placeholder="City" /></div>
            <div><Label>State</Label><TInput value={stateVal} onChange={setStateVal} placeholder="OH" /></div>
            <div><Label>ZIP</Label><TInput value={zip} onChange={setZip} placeholder="44101" /></div>
          </div>
          <Label>County</Label>
          <TInput value={county} onChange={setCounty} placeholder="County" />
        </SCard>

        <SCard title="Lead Qualification" color="var(--purple)" accent="var(--purple)" sub="Complete every field — required for recommendation">
          <div style={{ marginBottom: 18 }}>
            <Label>Motivation Level</Label>
            <Radio value={motivation} onChange={setMotivation} opts={[
              { v: 'needs', l: 'Needs to sell', sub: 'Real problem — financial pressure, life event, urgency' },
              { v: 'wants', l: 'Wants to sell', sub: 'Interested but no major urgency — flexible on timing' },
              { v: 'none', l: 'No clear reason', sub: 'Just curious or testing market — no real intent' },
              { v: 'other', l: 'Other', sub: 'Specific situation — explain in notes' },
            ]} />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 18 }}>
            <div><Label>Occupancy</Label><Sel value={occupancy} onChange={setOccupancy} placeholder="Select…" opts={[{ v: 'vacant', l: 'Vacant' }, { v: 'owner', l: 'Owner Occupied' }, { v: 'tenant', l: 'Tenant Occupied' }]} /></div>
            <div><Label>Property Condition</Label><Sel value={condition} onChange={setCondition} placeholder="Select…" opts={[{ v: 'moveIn', l: 'Move-In Ready' }, { v: 'light', l: 'Light Rehab' }, { v: 'medium', l: 'Medium Rehab' }, { v: 'major', l: 'Major Rehab / Full Gut' }]} /></div>
            <div><Label>Selling Timeline</Label><Sel value={timeline} onChange={setTimeline} placeholder="Select…" opts={[{ v: 'asap', l: 'ASAP — needs to close immediately' }, { v: '30d', l: 'Within 30 days' }, { v: '60d', l: '30-60 days' }, { v: '90d', l: '60-90 days' }, { v: '6mo', l: '3-6 months' }, { v: 'whenever', l: 'Whenever — no real urgency' }]} /></div>
            <div><Label>Access Type</Label><Sel value={accessType} onChange={setAccessType} placeholder="Select…" opts={[{ v: 'lockbox', l: 'Lockbox — easy access anytime' }, { v: 'vacant', l: 'Vacant — access with notice' }, { v: 'appt', l: 'By appointment with seller' }, { v: 'tenant', l: 'Tenant occupied — needs coordination' }, { v: 'none', l: 'No access — blocked' }]} /></div>
          </div>
          <div style={{ marginBottom: 16 }}>
            <Label>Major Issues <span style={{ fontWeight: 400, color: 'var(--text3)', textTransform: 'none', letterSpacing: 0 }}>(optional)</span></Label>
            <TInput value={majorIssues} onChange={setMajorIssues} placeholder="Foundation issues, roof damage, mold, etc." />
          </div>
          <div style={{ background: 'var(--surface2)', borderRadius: 10, padding: '2px 14px', border: '1px solid var(--border)' }}>
            <Toggle value={decisionMaker} onChange={setDecisionMaker} label="Decision maker confirmed" sub="All required parties on the call or reachable" />
            <div style={{ borderTop: '1px solid var(--border)' }} />
            <Toggle value={multipleOwners} onChange={setMultipleOwners} label="Multiple owners on title" sub="More than one person needs to agree to sell" />
          </div>
        </SCard>

        <SCard title="Financials" color="var(--cyan)" accent="var(--cyan)" badge="OPTIONAL — affects recommendation">
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>Fill in what you have. More data = more accurate recommendation.</p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div><Label>Mortgage Balance</Label><CInput value={mortgage} onChange={setMortgage} /></div>
            <div><Label>Monthly Payment</Label><CInput value={monthlyPayment} onChange={setMonthlyPayment} /></div>
            <div><Label>Taxes Owed</Label><CInput value={taxesOwed} onChange={setTaxesOwed} /></div>
            <div><Label>ARV</Label><CInput value={arv} onChange={setArv} /></div>
          </div>
          {showEquity && (
            <div style={{ background: equityColor + '14', border: `1px solid ${equityColor}33`, borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>Equity</span>
                <div>
                  <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 20, fontWeight: 800, color: equityColor }}>{fmt(equityAmt)}</span>
                  <span style={{ fontSize: 13, color: equityColor, marginLeft: 8 }}>({equityPct?.toFixed(0)}%)</span>
                </div>
              </div>
            </div>
          )}
          <Toggle value={liens} onChange={setLiens} label="Liens or judgments present" sub="" />
        </SCard>

        <SCard title="Deal Analysis" color="var(--green)" accent="var(--green)" badge="OPTIONAL — affects recommendation">
          <p style={{ fontSize: 13, color: 'var(--text3)', marginBottom: 16 }}>MAO vs asking price is the most impactful field here.</p>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 14 }}>
            <div><Label>Asking Price</Label><CInput value={asking} onChange={setAsking} /></div>
            <div><Label>Repair Estimate</Label><CInput value={repairs} onChange={setRepairs} /></div>
            <div><Label>MAO</Label><CInput value={mao} onChange={setMao} /></div>
            <div><Label>Rental Estimate</Label><CInput value={rental} onChange={setRental} /></div>
            <div><Label>Exit Strategy</Label><Sel value={exitStrategy} onChange={setExitStrategy} placeholder="Select…" opts={[{ v: 'assignment', l: 'Assignment' }, { v: 'novation', l: 'Novation' }, { v: 'either', l: 'Either' }]} /></div>
          </div>
        </SCard>

        <SCard title="Notes">
          <textarea style={{ ...INPUT, minHeight: 100, resize: 'vertical', fontFamily: 'inherit' }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Seller situation, personality, objections, key quotes, next step agreed on…" onFocus={e => e.target.style.borderColor = 'var(--border2)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
        </SCard>

        {/* Recommendation */}
        <div style={{ background: 'var(--surface)', border: `1px solid ${vColor}33`, borderLeft: `3px solid ${vColor}`, borderRadius: 14, padding: '22px 24px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: isMobile ? 16 : 24, marginBottom: 20, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 600, marginBottom: 6 }}>Recommendation</div>
              <div style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: isMobile ? 36 : 48, fontWeight: 900, color: vColor, lineHeight: 1, letterSpacing: '-0.02em', marginBottom: 12 }}>{verdict}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Why</div>
              <div style={{ fontSize: 14, color: 'var(--text)', marginBottom: 14, lineHeight: 1.6 }}>{verdictReason}</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Next Step</div>
              <div style={{ fontSize: 14, fontWeight: 700, color: vColor }}>{verdictNext}</div>
            </div>
            <ConfidenceRing pct={confPct} />
          </div>

          {contradictions.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
              {contradictions.slice(0, 3).map((c, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '10px 14px', borderRadius: 8, background: 'var(--orange-faint)', border: '1px solid var(--orange-border)' }}>
                  <span style={{ color: 'var(--orange)', fontSize: 14, flexShrink: 0 }}>⚠</span>
                  <span style={{ fontSize: 13, color: 'var(--orange)', lineHeight: 1.5 }}>{c}</span>
                </div>
              ))}
            </div>
          )}

          <div style={{ marginBottom: 20 }}>
            <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 10 }}>Signals</div>
            {signals.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '9px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 14, color: s.t === 'pos' ? 'var(--green)' : s.t === 'neg' ? 'var(--red)' : 'var(--gold)', flexShrink: 0, fontWeight: 700 }}>{s.t === 'pos' ? '✓' : s.t === 'neg' ? '✗' : '○'}</span>
                <span style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{s.m}</span>
              </div>
            ))}
          </div>

          <button style={{ width: '100%', minHeight: 52, padding: '15px 0', borderRadius: 10, border: 'none', background: vColor, color: ['var(--cyan)', 'var(--gold)', 'var(--green)'].includes(vColor) ? '#000' : '#fff', fontWeight: 800, fontSize: 15, cursor: 'pointer', letterSpacing: '0.02em', transition: 'all 0.15s' }} onClick={copyAndSave}>
            {copied ? '✓ Copied to Clipboard' : 'Copy Scorecard & Save to History'}
          </button>
        </div>

        {/* History */}
        {showHistory && (
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '20px 24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>History ({history.length})</span>
            </div>
            {history.length === 0 ? <p style={{ color: 'var(--text3)', fontSize: 14 }}>No saved scorecards yet.</p>
              : history.map(e => {
                const c = verdictHistColor(e.verdict);
                return (
                  <div key={e.id} style={{ border: '1px solid var(--border)', borderLeft: `3px solid ${c}`, borderRadius: 10, padding: '14px 16px', marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <span style={{ fontSize: 14, fontWeight: 800, color: c, marginRight: 10 }}>{e.verdict}</span>
                        <span style={{ fontSize: 13, color: 'var(--text)' }}>{e.address || 'No address'}</span>
                        <span style={{ fontFamily: 'JetBrains Mono,monospace', fontSize: 11, color: 'var(--text3)', marginLeft: 8 }}>{e.savedAt?.slice(0, 10)}</span>
                        {e.loggedBy && <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, background: 'var(--gold-faint)', color: 'var(--gold)', marginLeft: 8 }}>{e.loggedBy}</span>}
                      </div>
                      <button onClick={() => deleteHistory(e.id)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 15 }}>✕</button>
                    </div>
                    <select style={{ ...INPUT, padding: '6px 10px', fontSize: 12, width: 'auto', minHeight: 36 }} value={e.outcome || 'Pending'} onChange={ev => updateOutcome(e.id, ev.target.value)}>
                      {OUTCOMES.map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                );
              })}
          </div>
        )}
      </div>

      {isMobile && (
        <nav style={{ position: 'fixed', bottom: 0, left: 0, right: 0, height: 64, background: 'var(--surface)', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', zIndex: 100 }}>
          {[{ href: '/', icon: '⌂', label: 'Home' }, { href: '/calculator', icon: '◈', label: 'Offers' }, { href: '/kpi', icon: '◉', label: 'KPI' }, { href: '/revenue', icon: '◆', label: 'Revenue' }, { href: '/scorecard', icon: '◐', label: 'Score' }].map(item => (
            <div key={item.href} onClick={() => router.push(item.href)} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2, cursor: 'pointer', color: item.href === '/scorecard' ? 'var(--gold)' : 'var(--text3)' }}>
              <span style={{ fontSize: 18 }}>{item.icon}</span><span style={{ fontSize: 10, fontWeight: 600 }}>{item.label}</span>
            </div>
          ))}
        </nav>
      )}
    </div>
  );
}
