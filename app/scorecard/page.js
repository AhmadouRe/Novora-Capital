'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

function toN(v) {
  if (!v && v !== 0) return 0;
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : n;
}
function fmt(n) { return Number(n || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }); }

const TODAY = new Date().toISOString().slice(0, 10);
const navS = { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 56, background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50 };
const cardBase = { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 22, marginBottom: 18 };
const inputS = { width: '100%', padding: '10px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14, outline: 'none' };
const btnS = (c, light) => ({ padding: '9px 18px', borderRadius: 8, border: 'none', background: light ? c + '18' : c, color: light ? c : '#000', fontWeight: 600, fontSize: 13, cursor: 'pointer' });

// ── Reusable components ──────────────────────────────────────────
function Label({ children, color, req, sub }) {
  return (
    <div style={{ marginBottom: 6 }}>
      <span style={{ fontSize: 12, color: color || 'var(--text2)' }}>{children}</span>
      {req && <span style={{ color: 'var(--red)', marginLeft: 2 }}>*</span>}
      {sub && <div style={{ fontSize: 11, color: 'var(--text3)', marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

function SCard({ title, color, accent, sub, badge, children }) {
  return (
    <div style={{ ...cardBase, borderLeft: color ? `4px solid ${color}` : undefined }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: 15, color: accent || 'var(--text)' }}>{title}</div>
          {sub && <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{sub}</div>}
        </div>
        {badge && <span style={{ fontSize: 11, padding: '3px 10px', borderRadius: 20, background: (accent || 'var(--text)') + '18', color: accent || 'var(--text2)', border: `1px solid ${(accent || 'var(--border)')}44` }}>{badge}</span>}
      </div>
      {children}
    </div>
  );
}

function TInput({ value, onChange, placeholder }) {
  return <input style={inputS} type="text" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />;
}

function CInput({ value, onChange, placeholder }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface2)', border: `1px solid ${focused ? 'var(--border2)' : 'var(--border)'}`, borderRadius: 8, overflow: 'hidden' }}>
      <span style={{ padding: '0 10px', color: 'var(--text2)', background: 'var(--surface3)', borderRight: '1px solid var(--border)', height: 40, display: 'flex', alignItems: 'center', fontSize: 14 }}>$</span>
      <input style={{ flex: 1, padding: '9px 12px', background: 'transparent', border: 'none', color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'JetBrains Mono,monospace' }}
        type="text" inputMode="decimal"
        value={focused ? value : (toN(value) ? Number(toN(value)).toLocaleString() : '')}
        onChange={e => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        placeholder={placeholder} />
    </div>
  );
}

function Sel({ value, onChange, opts, placeholder }) {
  return (
    <select style={{ ...inputS, appearance: 'none', cursor: 'pointer' }} value={value} onChange={e => onChange(e.target.value)}>
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
            <div style={{ width: 16, height: 16, borderRadius: '50%', border: `2px solid ${sel ? 'var(--gold)' : 'var(--border2)'}`, background: sel ? 'var(--gold)' : 'transparent', flexShrink: 0, marginTop: 1, transition: 'all 0.15s' }} />
            <div>
              <div style={{ fontSize: 14, fontWeight: sel ? 600 : 400, color: sel ? 'var(--gold)' : 'var(--text)' }}>{o.l}</div>
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
      <div onClick={() => onChange(!value)} style={{ width: 44, height: 24, borderRadius: 12, background: value ? 'var(--green)' : 'var(--border)', cursor: 'pointer', position: 'relative', transition: 'background 0.2s', flexShrink: 0, marginLeft: 12 }}>
        <div style={{ position: 'absolute', top: 3, left: value ? 23 : 3, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left 0.2s', boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }} />
      </div>
    </div>
  );
}

function ConfidenceRing({ pct }) {
  const r = 42, circ = 2 * Math.PI * r;
  const offset = circ - (pct / 100) * circ;
  const color = pct >= 70 ? 'var(--green)' : pct >= 40 ? 'var(--gold)' : 'var(--red)';
  return (
    <svg width={104} height={104} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={52} cy={52} r={r} fill="none" stroke="var(--surface3)" strokeWidth={8} />
      <circle cx={52} cy={52} r={r} fill="none" stroke={color} strokeWidth={8}
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 0.8s ease' }} strokeLinecap="round" />
      <text x={52} y={52} textAnchor="middle" dominantBaseline="central" fill={color}
        fontSize={16} fontWeight={700} fontFamily="JetBrains Mono,monospace"
        style={{ transform: 'rotate(90deg)', transformOrigin: '52px 52px' }}>
        {pct}%
      </text>
    </svg>
  );
}

// ── Recommendation engine (exact spec) ──────────────────────────
function computeRecommendation({ motivation, decisionMaker, multipleOwners, timeline, accessType, condition, majorIssues, arv, mortgage, taxesOwed, liens, asking, repairs, mao, rental, exit }) {
  const signals = [];
  let deal = 0, follow = 0, dead = 0, dataPoints = 0;

  if (motivation) {
    dataPoints++;
    if (motivation === 'needs') { deal += 4; signals.push({ t: 'pos', m: 'Seller needs to sell — high urgency and motivation' }); }
    else if (motivation === 'wants') { follow += 1; signals.push({ t: 'neu', m: 'Seller wants to sell — motivation present, no urgency' }); }
    else if (motivation === 'none') { dead += 4; signals.push({ t: 'neg', m: 'No reason to sell — very low motivation' }); }
    else { follow += 1; signals.push({ t: 'neu', m: 'Other motivation — verify before proceeding' }); }
  }

  if (motivation || timeline) {
    dataPoints++;
    if (!decisionMaker) { dead += 2; signals.push({ t: 'neg', m: 'Decision maker not confirmed — deal cannot move forward' }); }
    else { deal += 1; signals.push({ t: 'pos', m: 'Decision maker confirmed' }); }
  }
  if (multipleOwners && !decisionMaker) { dead += 1; signals.push({ t: 'neg', m: 'Multiple owners — not all parties confirmed' }); }

  if (timeline) {
    dataPoints++;
    if (timeline === 'asap') { deal += 3; signals.push({ t: 'pos', m: 'ASAP timeline — maximum urgency' }); }
    else if (timeline === '30d') { deal += 2; signals.push({ t: 'pos', m: 'Within 30 days — strong urgency' }); }
    else if (timeline === '60d') { follow += 1; signals.push({ t: 'neu', m: '30-60 day timeline — workable' }); }
    else if (timeline === '90d') { follow += 2; signals.push({ t: 'neu', m: '60-90 day timeline — low urgency' }); }
    else if (timeline === '6mo') { follow += 3; signals.push({ t: 'neu', m: '3-6 months — nurture candidate' }); }
    else { follow += 3; dead += 1; signals.push({ t: 'neg', m: 'No real urgency — whenever timeline' }); }
  }

  if (accessType) {
    dataPoints++;
    if (accessType === 'none') { dead += 4; signals.push({ t: 'neg', m: 'No access — deal killer, cannot inspect or show property' }); }
    else if (accessType === 'lockbox' || accessType === 'vacant') { deal += 1; signals.push({ t: 'pos', m: 'Easy access — ' + accessType }); }
    else if (accessType === 'appt') { signals.push({ t: 'neu', m: 'Access by appointment — manageable' }); }
    else { follow += 1; signals.push({ t: 'neu', m: 'Tenant occupied — coordination needed' }); }
  }

  if (condition) {
    dataPoints++;
    if (condition === 'moveIn') { deal += 1; signals.push({ t: 'pos', m: 'Move-in ready — easier disposition' }); }
    else if (condition === 'major') { follow += 1; signals.push({ t: 'neu', m: 'Major rehab needed — verify repair estimate carefully' }); }
  }
  if (majorIssues) { signals.push({ t: 'neu', m: 'Major issues noted: ' + majorIssues }); }

  const arvN = toN(arv), mortgageN = toN(mortgage), taxesN = toN(taxesOwed);
  const equityAmt = arvN > 0 && mortgageN > 0 ? arvN - mortgageN - taxesN : null;
  const equityPct = equityAmt !== null && arvN > 0 ? (equityAmt / arvN) * 100 : null;
  if (arvN > 0 && mortgageN > 0) {
    dataPoints += 2;
    if (equityPct < 10) { dead += 3; signals.push({ t: 'neg', m: 'Critical — only ' + equityPct.toFixed(0) + '% equity, deal not viable' }); }
    else if (equityPct < 20) { follow += 2; signals.push({ t: 'neg', m: 'Thin equity — ' + equityPct.toFixed(0) + '%, numbers must be perfect' }); }
    else if (equityPct < 40) { deal += 1; signals.push({ t: 'neu', m: 'Workable equity — ' + equityPct.toFixed(0) + '%' }); }
    else { deal += 2; signals.push({ t: 'pos', m: 'Strong equity — ' + equityPct.toFixed(0) + '%, good spread available' }); }
  }
  if (liens) { dead += 1; signals.push({ t: 'neg', m: 'Liens or judgments present — verify before proceeding' }); }

  const askN = toN(asking), maoN = toN(mao), repairsN = toN(repairs);
  if (maoN > 0 && askN > 0) {
    dataPoints += 2;
    const gap = askN - maoN;
    if (gap <= 0) { deal += 3; signals.push({ t: 'pos', m: 'Asking price at or below MAO — deal viable at ask' }); }
    else if (gap <= 5000) { deal += 1; signals.push({ t: 'neu', m: 'Asking $' + gap.toLocaleString() + ' above MAO — small gap, negotiable' }); }
    else if (gap <= 15000) { follow += 2; signals.push({ t: 'neg', m: 'Asking $' + gap.toLocaleString() + ' over MAO — significant negotiation needed' }); }
    else { dead += 2; signals.push({ t: 'neg', m: 'Asking $' + gap.toLocaleString() + ' over MAO — likely not viable' }); }
  } else if (askN > 0 && arvN > 0 && repairsN > 0) {
    dataPoints++;
    const roughMao = arvN * 0.70 - repairsN - 12000;
    if (askN <= roughMao) { deal += 2; signals.push({ t: 'pos', m: 'Rough MAO check — asking looks viable (~$' + Math.round(roughMao).toLocaleString() + ' rough MAO at 70%)' }); }
    else { follow += 1; signals.push({ t: 'neu', m: 'Rough MAO check — gap of ~$' + Math.round(askN - roughMao).toLocaleString() + ' at 70% tier' }); }
  }

  if (arvN > 0 && maoN > 0) {
    const novSpread = arvN - maoN;
    if (novSpread >= 20000) { signals.push({ t: 'pos', m: 'Novation opportunity — $' + novSpread.toLocaleString() + ' spread between ARV and MAO. Retail buyer exit viable.' }); }
    else if (novSpread >= 10000) { signals.push({ t: 'neu', m: 'Novation possible — $' + novSpread.toLocaleString() + ' spread. Check comps before committing.' }); }
  }

  if (toN(rental) > 0) { signals.push({ t: 'pos', m: 'Rental estimate: $' + toN(rental).toLocaleString() + '/mo — adds buyer disposition options' }); }

  const confidence = Math.min(100, Math.round((dataPoints / 12) * 100));

  let verdict, reason, next, vColor;
  if (!motivation && !timeline) {
    verdict = 'INCOMPLETE'; vColor = 'var(--cyan)';
    reason = 'Not enough qualification data to generate a recommendation.';
    next = 'Complete motivation, timeline, decision maker, and access at minimum.';
  } else if (dead >= 4 && dead > deal) {
    verdict = 'DEAD'; vColor = 'var(--red)';
    reason = 'Multiple deal killers present — not worth pursuing at this time.';
    next = 'Remove from active pipeline. Document reason in CRM.';
  } else if (deal >= 5 && deal > follow && deal > dead) {
    verdict = 'DEAL'; vColor = 'var(--green)';
    reason = confidence >= 70 ? 'Strong signals across all core categories. Move fast.' : 'Strong qualification signals. Add financial data to confirm.';
    next = 'Move to underwriting immediately. Offer same day.';
  } else {
    verdict = 'FOLLOW-UP'; vColor = 'var(--gold)';
    reason = 'Potential exists but timing, pricing, or access needs more work.';
    next = 'Move to Active Follow-Up. Set next touch in 3 days.';
  }

  return { verdict, vColor, reason, next, confidence, signals, equityAmt, equityPct };
}

const OUTCOMES = ['Pending', 'Under Contract', 'Dead-Price', 'Dead-Motivation', 'Dead-No Access', 'Closed', 'Follow-Up Later'];

export default function ScorecardPage() {
  const router = useRouter();
  const [sessionOk, setSessionOk] = useState(false);
  const [userName, setUserName] = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState([]);
  const [copied, setCopied] = useState(false);

  // Property
  const [streetAddr, setStreetAddr] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [zip, setZip] = useState('');
  const [county, setCounty] = useState('');

  // Lead Qualification
  const [motivation, setMotivation] = useState('');
  const [occupancy, setOccupancy] = useState('');
  const [condition, setCondition] = useState('');
  const [majorIssues, setMajorIssues] = useState('');
  const [timeline, setTimeline] = useState('');
  const [accessType, setAccessType] = useState('');
  const [decisionMaker, setDecisionMaker] = useState(false);
  const [multipleOwners, setMultipleOwners] = useState(false);

  // Financials
  const [mortgage, setMortgage] = useState('');
  const [monthlyPayment, setMonthlyPayment] = useState('');
  const [taxesOwed, setTaxesOwed] = useState('');
  const [arv, setArv] = useState('');
  const [liens, setLiens] = useState(false);

  // Deal Analysis
  const [asking, setAsking] = useState('');
  const [repairs, setRepairs] = useState('');
  const [mao, setMao] = useState('');
  const [rental, setRental] = useState('');
  const [exit, setExit] = useState('');

  // Notes
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetch('/api/auth/session').then(r => { if (!r.ok) { router.push('/'); return; } return r.json(); })
      .then(d => { if (d?.userName) { setSessionOk(true); setUserName(d.userName); } }).catch(() => router.push('/'));
    fetch('/api/scorecard/history').then(r => r.json()).then(d => { if (Array.isArray(d)) setHistory(d); }).catch(() => {});
  }, []);

  const rec = computeRecommendation({ motivation, decisionMaker, multipleOwners, timeline, accessType, condition, majorIssues, arv, mortgage, taxesOwed, liens, asking, repairs, mao, rental, exit });
  const { verdict, vColor, reason, next, confidence, signals, equityAmt, equityPct } = rec;

  const arvN = toN(arv), mortN = toN(mortgage), taxN = toN(taxesOwed);
  const showEquity = arvN > 0 && mortN > 0;
  const equityColor = equityPct < 20 ? 'var(--red)' : equityPct < 40 ? 'var(--gold)' : 'var(--green)';

  const requiredFields = [motivation, timeline, accessType, occupancy, condition];
  const missingCount = requiredFields.filter(f => !f).length;

  const reset = () => {
    setStreetAddr(''); setCity(''); setState(''); setZip(''); setCounty('');
    setMotivation(''); setOccupancy(''); setCondition(''); setMajorIssues(''); setTimeline(''); setAccessType('');
    setDecisionMaker(false); setMultipleOwners(false);
    setMortgage(''); setMonthlyPayment(''); setTaxesOwed(''); setArv(''); setLiens(false);
    setAsking(''); setRepairs(''); setMao(''); setRental(''); setExit('');
    setNotes('');
  };

  const buildText = () => {
    const addr = [streetAddr, city, state, zip].filter(Boolean).join(', ');
    return `LEAD SCORECARD — NOVORA CAPITAL
═════════════════════════════════
${addr ? 'Property: ' + addr + '\n' : ''}${county ? 'County: ' + county + '\n' : ''}
VERDICT: ${verdict}
Confidence: ${confidence}%
Reason: ${reason}
Next Step: ${next}

─── SIGNALS ───────────────────
${signals.map(s => `${s.t === 'pos' ? '✓' : s.t === 'neg' ? '✗' : '○'} ${s.m}`).join('\n')}

─── QUALIFICATION ──────────────
Motivation: ${motivation || '—'}
Timeline: ${timeline || '—'}
Occupancy: ${occupancy || '—'}
Condition: ${condition || '—'}
Access: ${accessType || '—'}
Decision Maker: ${decisionMaker ? 'Yes' : 'No'}

${notes ? '─── NOTES ──────────────────────\n' + notes : ''}
─────────────────────────────────
Logged by: ${userName} | ${new Date().toLocaleDateString()}
`;
  };

  const copyAndSave = async () => {
    const text = buildText();
    navigator.clipboard?.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
    if (verdict !== 'INCOMPLETE') {
      const payload = {
        address: [streetAddr, city, state, zip].filter(Boolean).join(', '),
        verdict,
        confidence,
        motivation, timeline, accessType, occupancy, condition,
        arv: toN(arv), mortgage: toN(mortgage), asking: toN(asking), mao: toN(mao),
        notes,
      };
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

  const clearAll = async () => {
    if (!confirm('Clear all history?')) return;
    await Promise.all(history.map(e => fetch(`/api/scorecard/${e.id}`, { method: 'DELETE' })));
    setHistory([]);
  };

  if (!sessionOk) return <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>Loading…</div>;

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' }}>
      <nav style={navS}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/" style={{ color: 'var(--text2)', textDecoration: 'none', fontSize: 20 }}>←</a>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Lead Scorecard</span>
          <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: missingCount === 0 ? 'var(--green-faint)' : 'var(--gold-faint)', color: missingCount === 0 ? 'var(--green)' : 'var(--gold)', border: `1px solid ${missingCount === 0 ? 'var(--green-border)' : 'var(--gold-border)'}` }}>
            {missingCount === 0 ? '✓ All filled' : `${missingCount} missing`}
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={{ ...btnS('var(--surface2)', false), color: 'var(--text2)', fontSize: 12 }} onClick={() => setShowHistory(!showHistory)}>
            History {history.length > 0 && <span style={{ background: 'var(--purple)', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11, marginLeft: 4 }}>{history.length}</span>}
          </button>
          <button style={{ ...btnS('var(--surface2)', false), color: 'var(--red)', fontSize: 12 }} onClick={reset}>Reset</button>
          <span style={{ fontSize: 12, color: 'var(--text3)', padding: '4px 10px', background: 'var(--surface2)', borderRadius: 8 }}>{userName}</span>
        </div>
      </nav>

      <div style={{ maxWidth: 860, margin: '0 auto', padding: '24px 20px' }}>

        {/* Property */}
        <SCard title="Property" color="var(--gold)" accent="var(--gold)">
          <Label>Street Address</Label>
          <div style={{ marginBottom: 12 }}><TInput value={streetAddr} onChange={setStreetAddr} placeholder="123 Main St" /></div>
          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
            <div><Label>City</Label><TInput value={city} onChange={setCity} placeholder="City" /></div>
            <div><Label>State</Label><TInput value={state} onChange={setState} placeholder="ST" /></div>
            <div><Label>ZIP</Label><TInput value={zip} onChange={setZip} placeholder="00000" /></div>
          </div>
          <Label>County</Label>
          <TInput value={county} onChange={setCounty} placeholder="County" />
        </SCard>

        {/* Lead Qualification */}
        <SCard title="Lead Qualification" color="var(--purple)" accent="var(--purple)" sub="Complete every field — required for recommendation">
          <Label req>Motivation Level</Label>
          <div style={{ marginBottom: 16 }}>
            <Radio value={motivation} onChange={setMotivation} opts={[
              { v: 'needs', l: 'Needs to sell', sub: 'Has a real problem — financial pressure, life event, urgency' },
              { v: 'wants', l: 'Wants to sell', sub: 'Interested but no major urgency — flexible on timing' },
              { v: 'none', l: 'No clear reason', sub: 'Just curious or testing the market — no real intent' },
              { v: 'other', l: 'Other', sub: 'Specific situation — explain in notes' },
            ]} />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <Label req>Occupancy</Label>
              <Sel value={occupancy} onChange={setOccupancy} placeholder="Select…" opts={[{ v: 'vacant', l: 'Vacant' }, { v: 'owner', l: 'Owner Occupied' }, { v: 'tenant', l: 'Tenant Occupied' }]} />
            </div>
            <div>
              <Label req>Property Condition</Label>
              <Sel value={condition} onChange={setCondition} placeholder="Select…" opts={[{ v: 'moveIn', l: 'Move-In Ready' }, { v: 'light', l: 'Light Rehab' }, { v: 'medium', l: 'Medium Rehab' }, { v: 'major', l: 'Major Rehab / Full Gut' }]} />
            </div>
            <div>
              <Label req>Selling Timeline</Label>
              <Sel value={timeline} onChange={setTimeline} placeholder="Select…" opts={[
                { v: 'asap', l: 'ASAP — needs to close immediately' },
                { v: '30d', l: 'Within 30 days' },
                { v: '60d', l: '30-60 days' },
                { v: '90d', l: '60-90 days' },
                { v: '6mo', l: '3-6 months' },
                { v: 'whenever', l: 'Whenever — no real urgency' },
              ]} />
            </div>
            <div>
              <Label req>Access Type</Label>
              <Sel value={accessType} onChange={setAccessType} placeholder="Select…" opts={[
                { v: 'lockbox', l: 'Lockbox — easy access anytime' },
                { v: 'vacant', l: 'Vacant — access with notice' },
                { v: 'appt', l: 'By appointment with seller' },
                { v: 'tenant', l: 'Tenant occupied — needs coordination' },
                { v: 'none', l: 'No access — blocked' },
              ]} />
            </div>
          </div>

          <div>
            <Label>Major Issues (optional)</Label>
            <div style={{ marginBottom: 14 }}><TInput value={majorIssues} onChange={setMajorIssues} placeholder="Foundation issues, roof damage, mold, etc." /></div>
          </div>

          <div style={{ background: 'var(--surface3)', borderRadius: 10, padding: '4px 14px' }}>
            <Toggle value={decisionMaker} onChange={setDecisionMaker} label="Decision maker confirmed" sub="All required parties on the call or reachable" />
            <div style={{ borderTop: '1px solid var(--border)' }} />
            <Toggle value={multipleOwners} onChange={setMultipleOwners} label="Multiple owners on title" sub="More than one person needs to agree to sell" />
          </div>
        </SCard>

        {/* Financials */}
        <SCard title="Financials" color="var(--cyan)" accent="var(--cyan)" badge="OPTIONAL — affects recommendation">
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>Fill in what you have. More data = more accurate recommendation.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div><Label>Mortgage Balance</Label><CInput value={mortgage} onChange={setMortgage} placeholder="0" /></div>
            <div><Label>Monthly Payment</Label><CInput value={monthlyPayment} onChange={setMonthlyPayment} placeholder="0" /></div>
            <div><Label>Taxes Owed</Label><CInput value={taxesOwed} onChange={setTaxesOwed} placeholder="0" /></div>
            <div><Label>ARV</Label><CInput value={arv} onChange={setArv} placeholder="0" /></div>
          </div>

          {showEquity && (
            <div style={{ background: equityColor + '18', border: `1px solid ${equityColor}44`, borderRadius: 10, padding: '12px 16px', marginBottom: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>Equity</span>
                <div>
                  <span className="num" style={{ fontSize: 18, fontWeight: 700, color: equityColor }}>{fmt(equityAmt)}</span>
                  <span style={{ fontSize: 13, color: equityColor, marginLeft: 8 }}>({equityPct?.toFixed(0)}%)</span>
                </div>
              </div>
            </div>
          )}

          <Toggle value={liens} onChange={setLiens} label="Liens or judgments present" sub="" />
        </SCard>

        {/* Deal Analysis */}
        <SCard title="Deal Analysis" color="var(--green)" accent="var(--green)" badge="OPTIONAL — affects recommendation">
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 16 }}>MAO vs asking price is the most impactful field here.</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div><Label>Asking Price</Label><CInput value={asking} onChange={setAsking} placeholder="0" /></div>
            <div><Label>Repair Estimate</Label><CInput value={repairs} onChange={setRepairs} placeholder="0" /></div>
            <div><Label>MAO</Label><CInput value={mao} onChange={setMao} placeholder="0" /></div>
            <div><Label>Rental Estimate</Label><CInput value={rental} onChange={setRental} placeholder="0" /></div>
            <div>
              <Label>Exit Strategy</Label>
              <Sel value={exit} onChange={setExit} placeholder="Select…" opts={[{ v: 'assignment', l: 'Assignment' }, { v: 'novation', l: 'Novation' }, { v: 'either', l: 'Either' }]} />
            </div>
          </div>
        </SCard>

        {/* Notes */}
        <SCard title="Notes">
          <textarea style={{ ...inputS, height: 100, resize: 'vertical', fontFamily: 'inherit' }} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Seller situation, personality, objections raised, key quotes, next step agreed on…" />
        </SCard>

        {/* Recommendation */}
        <div style={{ ...cardBase, border: `2px solid ${vColor}44` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 20, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 11, color: 'var(--text2)', marginBottom: 4 }}>RECOMMENDATION</div>
              <div style={{ fontSize: 48, fontWeight: 900, color: vColor, lineHeight: 1 }}>{verdict}</div>
            </div>
            <ConfidenceRing pct={confidence} />
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 4 }}>Why</div>
              <div style={{ fontSize: 14, color: 'var(--text)', marginBottom: 12 }}>{reason}</div>
              <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 4 }}>Next Step</div>
              <div style={{ fontSize: 14, fontWeight: 600, color: vColor }}>{next}</div>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            {signals.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ fontSize: 13, color: s.t === 'pos' ? 'var(--green)' : s.t === 'neg' ? 'var(--red)' : 'var(--gold)', flexShrink: 0, marginTop: 1 }}>
                  {s.t === 'pos' ? '✓' : s.t === 'neg' ? '✗' : '○'}
                </span>
                <span style={{ fontSize: 13, color: 'var(--text2)' }}>{s.m}</span>
              </div>
            ))}
          </div>

          <button style={{ ...btnS(vColor, false), width: '100%', fontSize: 14 }} onClick={copyAndSave}>
            {copied ? '✓ Copied' : '📋 Copy Scorecard & Save to History'}
          </button>
        </div>

        {/* History */}
        {showHistory && (
          <div style={{ ...cardBase, border: '1px solid var(--border2)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <span style={{ fontWeight: 600, fontSize: 15 }}>History ({history.length})</span>
              {history.length > 0 && <button style={{ ...btnS('var(--red-faint)', false), color: 'var(--red)', border: '1px solid var(--red-border)', fontSize: 12, padding: '4px 12px' }} onClick={clearAll}>Clear All</button>}
            </div>
            {history.length === 0 ? <p style={{ color: 'var(--text2)', fontSize: 14 }}>No saved scorecards yet.</p> : history.map(e => {
              const c = e.verdict === 'DEAL' ? 'var(--green)' : e.verdict === 'DEAD' ? 'var(--red)' : e.verdict === 'FOLLOW-UP' ? 'var(--gold)' : 'var(--cyan)';
              return (
                <div key={e.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', marginBottom: 10 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: c, marginRight: 10 }}>{e.verdict}</span>
                      <span style={{ fontSize: 13, color: 'var(--text)' }}>{e.address || 'No address'}</span>
                      <span className="num" style={{ fontSize: 11, color: c, marginLeft: 8 }}>{e.confidence}%</span>
                      <span style={{ fontSize: 11, color: 'var(--text3)', marginLeft: 8 }}>{e.savedAt?.slice(0, 10)}</span>
                      <span style={{ fontSize: 11, padding: '1px 6px', borderRadius: 4, background: 'var(--surface2)', color: 'var(--text3)', marginLeft: 8 }}>{e.loggedBy}</span>
                    </div>
                    <button onClick={() => deleteHistory(e.id)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 15 }}>✕</button>
                  </div>
                  <select style={{ ...inputS, padding: '5px 10px', fontSize: 12, width: 'auto' }} value={e.outcome || 'Pending'} onChange={ev => updateOutcome(e.id, ev.target.value)}>
                    {OUTCOMES.map(o => <option key={o}>{o}</option>)}
                  </select>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
