'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const TIERS = [
  { max: 139999,  pct: 70, label: 'Below $140K' },
  { max: 179999,  pct: 73, label: '$140–180K' },
  { max: 229999,  pct: 75, label: '$190–230K' },
  { max: 279999,  pct: 78, label: '$240–280K' },
  { max: Infinity, pct: 80, label: '$300K+' },
];

const TIER_COLORS = { 70: '#00B8D4', 73: '#F0A500', 75: '#F0A500', 78: '#9B7EF8', 80: '#16C47E' };

const REHAB_GUIDE = [
  { label: 'Cosmetic', range: '$5–15K', amount: '10000', desc: 'Paint, carpet, fixtures, landscaping' },
  { label: 'Moderate', range: '$15–35K', amount: '25000', desc: 'Kitchen/bath update, HVAC service' },
  { label: 'Full Gut', range: '$35–70K', amount: '50000', desc: 'Full renovation, new kitchen/bath' },
  { label: 'Major', range: '$70K+', amount: '75000', desc: 'Structural, foundation, total rebuild' },
];

function toN(v) {
  if (!v && v !== 0) return 0;
  const n = parseFloat(String(v).replace(/[^0-9.]/g, ''));
  return isNaN(n) ? 0 : n;
}

function fmt(n, short) {
  const v = Number(n || 0);
  if (short && Math.abs(v) >= 1000) return '$' + (v / 1000).toFixed(0) + 'K';
  return v.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
}

function getTier(arv) {
  const n = toN(arv);
  if (!n) return null;
  return TIERS.find(t => n <= t.max) || TIERS[TIERS.length - 1];
}

// Styles
const S = {
  page: { minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' },
  nav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 56, background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50 },
  wrap: { maxWidth: 820, margin: '0 auto', padding: '24px 20px' },
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: '22px 24px', marginBottom: 16 },
  lbl: { fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, display: 'block', marginBottom: 6 },
  input: { width: '100%', padding: '10px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 14, outline: 'none' },
  tab: (active) => ({ padding: '9px 22px', borderRadius: 8, border: 'none', background: active ? 'var(--gold)' : 'var(--surface2)', color: active ? '#000' : 'var(--text2)', fontWeight: active ? 700 : 400, fontSize: 14, cursor: 'pointer' }),
  btn: (c, ghost) => ({ padding: '10px 20px', borderRadius: 9, border: ghost ? `1px solid ${c}44` : 'none', background: ghost ? c + '14' : c, color: ghost ? c : '#000', fontWeight: 700, fontSize: 13, cursor: 'pointer' }),
  sectionTitle: { fontWeight: 700, fontSize: 15, color: 'var(--text)', marginBottom: 16 },
};

function CurrInput({ value, onChange, placeholder, style }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: 'flex', alignItems: 'center', background: 'var(--surface2)', border: `1px solid ${focused ? 'var(--border2)' : 'var(--border)'}`, borderRadius: 8, overflow: 'hidden', transition: 'border-color 0.15s' }}>
      <span style={{ padding: '0 10px', color: 'var(--text3)', background: 'var(--surface3)', borderRight: '1px solid var(--border)', height: 40, display: 'flex', alignItems: 'center', fontSize: 13, flexShrink: 0 }}>$</span>
      <input style={{ flex: 1, padding: '9px 12px', background: 'transparent', border: 'none', color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: 'JetBrains Mono, monospace', minWidth: 0, ...style }}
        type="text" inputMode="decimal"
        value={focused ? value : (toN(value) ? Number(toN(value)).toLocaleString() : '')}
        onChange={e => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        placeholder={placeholder || ''} />
    </div>
  );
}

function NumInput({ value, onChange, placeholder }) {
  return <input style={S.input} type="number" value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} />;
}

export default function CalculatorPage() {
  const router = useRouter();
  const [sessionOk, setSessionOk] = useState(false);
  const [userName, setUserName] = useState('');
  const [mode, setMode] = useState('assignment');

  // Property info
  const [address, setAddress] = useState('');
  const [beds, setBeds] = useState('');
  const [baths, setBaths] = useState('');
  const [subjectSqft, setSubjectSqft] = useState('');
  const [yearBuilt, setYearBuilt] = useState('');

  // Comps
  const [comps, setComps] = useState([
    { addr: '', price: '', sqft: '' },
    { addr: '', price: '', sqft: '' },
    { addr: '', price: '', sqft: '' },
  ]);
  const [arvOverride, setArvOverride] = useState('');

  // Rehab
  const [rehab, setRehab] = useState('');
  const [showRehabGuide, setShowRehabGuide] = useState(false);

  // Advanced
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [fee, setFee] = useState('12000');
  const [cushion, setCushion] = useState('5000');

  // History
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState('');

  // Novation
  const [listPrice, setListPrice] = useState('');
  const [novFee, setNovFee] = useState('8000');
  const [novCushion, setNovCushion] = useState('5000');
  const [askingPrice, setAskingPrice] = useState('');

  useEffect(() => {
    fetch('/api/auth/session').then(r => {
      if (!r.ok) { router.push('/'); return; }
      return r.json();
    }).then(d => { if (d?.userName) { setSessionOk(true); setUserName(d.userName); } }).catch(() => router.push('/'));
    fetch('/api/calculator/history').then(r => r.json()).then(d => { if (Array.isArray(d)) setHistory(d); }).catch(() => {});
  }, []);

  // ARV calculations
  const compPrices = comps.map(c => toN(c.price)).filter(p => p > 0);
  const suggestedArv = compPrices.length > 0 ? Math.round(compPrices.reduce((a, b) => a + b, 0) / compPrices.length) : 0;
  const finalArv = toN(arvOverride) || suggestedArv;
  const usingOverride = toN(arvOverride) > 0;

  // MAO calculations
  const tier = getTier(finalArv);
  const arvN = finalArv;
  const rehabN = toN(rehab);
  const feeN = toN(fee) || 12000;
  const cushionN = toN(cushion) || 5000;
  const arvPct = tier && arvN > 0 ? Math.round(arvN * tier.pct / 100) : 0;
  const mao = tier && arvN > 0 ? Math.round(arvPct - rehabN - feeN - cushionN) : 0;
  const maoColor = mao >= 12000 ? 'var(--green)' : mao >= 6000 ? 'var(--gold)' : 'var(--red)';
  const maoLabel = mao >= 12000 ? 'Strong Deal ✓' : mao >= 6000 ? 'Viable Deal ✓' : 'Below Minimum — Pass';
  const novSpread = arvN > 0 && mao > 0 ? arvN - mao : 0;

  // Novation
  const listN = toN(listPrice), novFeeN = toN(novFee), novCushionN = toN(novCushion), askN = toN(askingPrice);
  const conservative = Math.round(listN * 0.9);
  const finalOffer = Math.round(conservative - novFeeN - novCushionN);
  const spread = Math.round(listN - finalOffer);
  const gap = askN > 0 ? Math.round(askN - finalOffer) : null;

  const updateComp = (i, field, val) => {
    const n = [...comps]; n[i] = { ...n[i], [field]: val }; setComps(n);
  };

  const saveHistory = async () => {
    if (mao < 6000) return;
    setSaving(true);
    const payload = {
      address, arv: arvN, rehab: rehabN, fee: feeN, cushion: cushionN, mao,
      tier: tier?.pct, tierLabel: tier?.label,
      comps: comps.map(c => ({ addr: c.addr, price: toN(c.price), sqft: toN(c.sqft) })),
      mode: 'assignment',
    };
    const res = await fetch('/api/calculator/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) {
      const d = await res.json();
      setHistory(prev => [d, ...prev].slice(0, 20));
      setSavedMsg('Saved!');
      setTimeout(() => setSavedMsg(''), 2500);
    }
    setSaving(false);
  };

  const loadEntry = (e) => {
    setAddress(e.address || '');
    setArvOverride(String(e.arv || ''));
    setRehab(String(e.rehab || ''));
    setFee(String(e.fee || '12000'));
    setCushion(String(e.cushion || '5000'));
    if (e.comps) setComps(e.comps.map(c => ({ addr: c.addr || '', price: String(c.price || ''), sqft: String(c.sqft || '') })));
    setShowHistory(false);
    setMode('assignment');
  };

  const deleteHistory = async (id) => {
    await fetch(`/api/calculator/history/${id}`, { method: 'DELETE' });
    setHistory(prev => prev.filter(e => e.id !== id));
  };

  const copyBrief = () => {
    const t = `NOVATION DEAL BRIEF\n─────────────────\nList Price: ${fmt(listN)}\nConservative (90%): ${fmt(conservative)}\nNovation Fee: ${fmt(novFeeN)}\nSafety Cushion: ${fmt(novCushionN)}\nFinal Offer: ${fmt(finalOffer)}\nYour Spread: ${fmt(spread)}${askN ? `\nAsking Price: ${fmt(askN)}\nGap from Ask: ${fmt(gap)}` : ''}\n`;
    navigator.clipboard?.writeText(t);
  };

  if (!sessionOk) return <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text3)' }}>Loading…</div>;

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/" style={{ color: 'var(--text3)', textDecoration: 'none', fontSize: 20, lineHeight: 1, display: 'flex', alignItems: 'center' }}>←</a>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Deal Calculator</span>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button style={{ ...S.btn('var(--surface2)', false), color: 'var(--text2)', border: '1px solid var(--border)', fontSize: 13 }} onClick={() => setShowHistory(!showHistory)}>
            History {history.length > 0 && <span style={{ background: 'var(--gold)', color: '#000', borderRadius: 10, padding: '1px 7px', fontSize: 11, marginLeft: 6 }}>{history.length}</span>}
          </button>
          <span style={{ fontSize: 12, color: 'var(--text3)' }}>{userName}</span>
        </div>
      </nav>

      <div style={S.wrap}>
        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <button style={S.tab(mode === 'assignment')} onClick={() => setMode('assignment')}>Assignment</button>
          <button style={S.tab(mode === 'novation')} onClick={() => setMode('novation')}>Novation</button>
        </div>

        {mode === 'assignment' && (
          <>
            {/* Section 1 — Property Info */}
            <div style={S.card}>
              <div style={S.sectionTitle}>Property Info</div>
              <div style={{ marginBottom: 14 }}>
                <label style={S.lbl}>Property Address</label>
                <input style={S.input} value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St, City, ST 00000" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 12 }}>
                <div><label style={S.lbl}>Beds</label><NumInput value={beds} onChange={setBeds} placeholder="3" /></div>
                <div><label style={S.lbl}>Baths</label><NumInput value={baths} onChange={setBaths} placeholder="2" /></div>
                <div><label style={S.lbl}>Sqft</label><NumInput value={subjectSqft} onChange={setSubjectSqft} placeholder="1,400" /></div>
                <div><label style={S.lbl}>Year Built</label><NumInput value={yearBuilt} onChange={setYearBuilt} placeholder="1985" /></div>
              </div>
            </div>

            {/* Section 2 — Comparable Sales */}
            <div style={S.card}>
              <div style={S.sectionTitle}>Comparable Sales — Calculate ARV</div>

              {/* Column headers */}
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 90px', gap: 8, marginBottom: 8 }}>
                {['Address', 'Sale Price', 'Sqft', '$/Sqft'].map(h => (
                  <span key={h} style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600 }}>{h}</span>
                ))}
              </div>

              {comps.map((c, i) => {
                const priceN = toN(c.price), sqftN = toN(c.sqft);
                const ppsf = priceN > 0 && sqftN > 0 ? Math.round(priceN / sqftN) : 0;
                return (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 90px', gap: 8, marginBottom: 8 }}>
                    <input style={S.input} placeholder={`Comp ${i + 1} address`} value={c.addr} onChange={e => updateComp(i, 'addr', e.target.value)} />
                    <CurrInput value={c.price} onChange={v => updateComp(i, 'price', v)} placeholder="" />
                    <input style={S.input} type="number" placeholder="Sqft" value={c.sqft} onChange={e => updateComp(i, 'sqft', e.target.value)} />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface3)', borderRadius: 8, fontSize: 13, color: ppsf ? 'var(--text)' : 'var(--text3)', fontFamily: 'JetBrains Mono, monospace', border: '1px solid var(--border)' }}>
                      {ppsf ? '$' + ppsf : '—'}
                    </div>
                  </div>
                );
              })}

              {/* Suggested ARV */}
              <div style={{ marginTop: 16, padding: '14px 16px', background: 'var(--surface2)', borderRadius: 10, display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border)' }}>
                <div>
                  <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>Suggested ARV</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)' }}>
                    {compPrices.length > 0 ? `Average of ${compPrices.length} comp${compPrices.length !== 1 ? 's' : ''}` : 'Enter sale prices above'}
                  </div>
                </div>
                <span className="num" style={{ fontSize: 24, fontWeight: 800, color: suggestedArv > 0 ? 'var(--gold)' : 'var(--text3)' }}>
                  {suggestedArv > 0 ? fmt(suggestedArv) : '—'}
                </span>
              </div>

              {/* Override ARV */}
              <div style={{ marginTop: 14 }}>
                <label style={S.lbl}>Override ARV <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--text3)' }}>— optional, overrides suggested</span></label>
                <CurrInput value={arvOverride} onChange={setArvOverride} placeholder="" />
              </div>

              {/* Which ARV is being used */}
              {finalArv > 0 && (
                <div style={{ marginTop: 10, padding: '10px 14px', background: usingOverride ? 'var(--gold-faint)' : 'var(--green-faint)', border: `1px solid ${usingOverride ? 'var(--gold-border)' : 'var(--green-border)'}`, borderRadius: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: 12, color: usingOverride ? 'var(--gold)' : 'var(--green)', fontWeight: 600 }}>
                    {usingOverride ? 'Using override ARV' : 'Using suggested ARV from comps'}
                  </span>
                  <span className="num" style={{ fontSize: 15, fontWeight: 800, color: usingOverride ? 'var(--gold)' : 'var(--green)' }}>{fmt(finalArv)}</span>
                </div>
              )}
            </div>

            {/* Section 3 — Rehab Estimate */}
            <div style={S.card}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                <div style={S.sectionTitle}>Rehab Estimate</div>
                <button style={{ fontSize: 12, color: 'var(--cyan)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 600 }} onClick={() => setShowRehabGuide(!showRehabGuide)}>
                  {showRehabGuide ? 'Hide Guide' : 'Show Guide'}
                </button>
              </div>
              <CurrInput value={rehab} onChange={setRehab} placeholder="" />
              {showRehabGuide && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10, marginTop: 14 }}>
                  {REHAB_GUIDE.map(g => (
                    <div key={g.label} onClick={() => { setRehab(g.amount); setShowRehabGuide(false); }}
                      style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '12px 14px', cursor: 'pointer', background: 'var(--surface2)', transition: 'all 0.15s' }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--gold)'; e.currentTarget.style.background = 'var(--gold-faint)'; }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface2)'; }}>
                      <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13, marginBottom: 3 }}>{g.label}</div>
                      <div style={{ color: 'var(--gold)', fontSize: 13, fontWeight: 600, fontFamily: 'JetBrains Mono, monospace', marginBottom: 4 }}>{g.range}</div>
                      <div style={{ color: 'var(--text3)', fontSize: 11 }}>{g.desc}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Section 4 — Advanced Settings */}
            <div style={{ ...S.card, marginBottom: 16 }}>
              <button style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 13, cursor: 'pointer', fontFamily: 'Outfit, sans-serif', display: 'flex', alignItems: 'center', gap: 6, fontWeight: 600 }} onClick={() => setShowAdvanced(!showAdvanced)}>
                <span style={{ fontSize: 10 }}>{showAdvanced ? '▼' : '▶'}</span> Advanced Settings
                {!showAdvanced && <span style={{ color: 'var(--text3)', fontWeight: 400 }}>— Fee: {fmt(feeN, true)} · Cushion: {fmt(cushionN, true)}</span>}
              </button>
              {showAdvanced && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 16 }}>
                  <div>
                    <label style={S.lbl}>Assignment Fee</label>
                    <CurrInput value={fee} onChange={setFee} placeholder="" />
                  </div>
                  <div>
                    <label style={S.lbl}>Safety Cushion</label>
                    <CurrInput value={cushion} onChange={setCushion} placeholder="" />
                  </div>
                </div>
              )}
            </div>

            {/* Section 5 — MAO RESULT (always visible) */}
            <div style={{ background: 'var(--surface)', border: `1px solid ${arvN > 0 ? maoColor + '44' : 'var(--border)'}`, borderLeft: `4px solid ${arvN > 0 ? maoColor : 'var(--border2)'}`, borderRadius: 14, padding: '28px 24px', marginBottom: 16 }}>
              <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 600, marginBottom: 8 }}>Maximum Allowable Offer</div>

              {arvN === 0 ? (
                <div style={{ textAlign: 'center', padding: '24px 0' }}>
                  <div style={{ fontSize: 14, color: 'var(--text3)' }}>Enter comparable sales or an override ARV to calculate MAO</div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 20, marginBottom: 16, flexWrap: 'wrap' }}>
                    <div className="num" style={{ fontSize: 72, fontWeight: 900, color: maoColor, lineHeight: 1 }}>{fmt(mao)}</div>
                    <div style={{ paddingBottom: 8 }}>
                      {tier && (
                        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, padding: '5px 12px', borderRadius: 20, background: TIER_COLORS[tier.pct] + '18', border: `1px solid ${TIER_COLORS[tier.pct]}44`, marginBottom: 6 }}>
                          <span style={{ fontSize: 13, fontWeight: 800, color: TIER_COLORS[tier.pct] }}>{tier.pct}%</span>
                          <span style={{ fontSize: 12, color: 'var(--text3)' }}>{tier.label}</span>
                        </div>
                      )}
                      <div style={{ fontSize: 15, fontWeight: 700, color: maoColor }}>{maoLabel}</div>
                    </div>
                  </div>

                  {/* Breakdown table */}
                  <div style={{ border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden', marginBottom: 20 }}>
                    {[
                      [`ARV × ${tier?.pct}%`, arvPct, 'var(--text)'],
                      ['− Estimated Rehab', -rehabN, 'var(--red)'],
                      ['− Assignment Fee', -feeN, 'var(--red)'],
                      ['− Safety Cushion', -cushionN, 'var(--red)'],
                      ['= MAO', mao, maoColor],
                    ].map(([label, val, color], i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 16px', borderBottom: i < 4 ? '1px solid var(--border)' : 'none', background: i === 4 ? 'var(--surface2)' : 'transparent' }}>
                        <span style={{ color: 'var(--text2)', fontSize: 14 }}>{label}</span>
                        <span className="num" style={{ color, fontWeight: i === 4 ? 800 : 400, fontSize: 14 }}>{fmt(val)}</span>
                      </div>
                    ))}
                  </div>

                  {/* Negotiation Range */}
                  <div style={{ marginBottom: 20 }}>
                    <div style={{ fontSize: 11, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', fontWeight: 600, marginBottom: 12 }}>Negotiation Range</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                      {[
                        ['Open Here', Math.round(mao * 0.9), 'var(--cyan)', 'Start offer at 90% of MAO'],
                        ['Your Ceiling', mao, 'var(--gold)', 'Never exceed this number'],
                        ['Walk Away', mao - 15000, 'var(--red)', 'Below this, kill the deal'],
                      ].map(([label, val, color, hint]) => (
                        <div key={label} style={{ background: color + '0E', border: `1px solid ${color}33`, borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
                          <div style={{ fontSize: 10, color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 6 }}>{label}</div>
                          <div className="num" style={{ fontSize: 20, fontWeight: 800, color, marginBottom: 4 }}>{fmt(val)}</div>
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>{hint}</div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Novation opportunity */}
                  {novSpread > 15000 && (
                    <div style={{ background: 'var(--cyan-faint)', border: '1px solid var(--cyan-border)', borderRadius: 10, padding: '14px 18px', marginBottom: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--cyan)', marginBottom: 2 }}>Novation Opportunity</div>
                        <div style={{ fontSize: 12, color: 'var(--text2)' }}>ARV − MAO spread — retail buyer exit viable</div>
                      </div>
                      <span className="num" style={{ fontSize: 20, fontWeight: 800, color: 'var(--cyan)' }}>{fmt(novSpread)}</span>
                    </div>
                  )}

                  {/* Save button */}
                  <button
                    style={{ width: '100%', padding: '13px 0', borderRadius: 10, border: 'none', background: mao >= 6000 ? 'var(--gold)' : 'var(--surface3)', color: mao >= 6000 ? '#000' : 'var(--text3)', fontWeight: 700, fontSize: 14, cursor: mao >= 6000 ? 'pointer' : 'default', transition: 'all 0.15s' }}
                    onClick={saveHistory} disabled={mao < 6000 || saving}>
                    {saving ? 'Saving…' : savedMsg || '💾 Save to History'}
                  </button>
                </>
              )}
            </div>
          </>
        )}

        {/* Novation mode */}
        {mode === 'novation' && (
          <>
            <div style={S.card}>
              <div style={S.sectionTitle}>Novation Calculator</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
                <div>
                  <label style={S.lbl}>Listing Comps / Est. List Price</label>
                  <CurrInput value={listPrice} onChange={setListPrice} placeholder="" />
                  {listN > 0 && <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text2)' }}>Conservative (90%): <span className="num" style={{ color: 'var(--text)' }}>{fmt(conservative)}</span></div>}
                </div>
                <div>
                  <label style={S.lbl}>Asking Price <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0 }}>(optional)</span></label>
                  <CurrInput value={askingPrice} onChange={setAskingPrice} placeholder="" />
                </div>
                <div>
                  <label style={S.lbl}>Novation Fee</label>
                  <CurrInput value={novFee} onChange={setNovFee} placeholder="" />
                </div>
                <div>
                  <label style={S.lbl}>Safety Cushion</label>
                  <CurrInput value={novCushion} onChange={setNovCushion} placeholder="" />
                </div>
              </div>
            </div>
            {listN > 0 && (
              <div style={{ ...S.card, borderLeft: '4px solid var(--purple)' }}>
                {[
                  ['List Price', fmt(listN), 'var(--text)'],
                  ['Conservative (90%)', fmt(conservative), 'var(--text2)'],
                  ['− Novation Fee', fmt(novFeeN), 'var(--red)'],
                  ['− Safety Cushion', fmt(novCushionN), 'var(--red)'],
                  ['Final Offer', fmt(finalOffer), 'var(--purple)'],
                  ['Your Spread', fmt(spread), 'var(--green)'],
                  ...(gap !== null ? [['Gap from Asking', fmt(gap), gap > 0 ? 'var(--red)' : 'var(--green)']] : []),
                ].map(([l, v, c]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '11px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text2)', fontSize: 14 }}>{l}</span>
                    <span className="num" style={{ color: c, fontSize: 14, fontWeight: 700 }}>{v}</span>
                  </div>
                ))}
                <button style={{ ...S.btn('var(--purple)', false), marginTop: 18, width: '100%', padding: '13px 0', fontSize: 14 }} onClick={copyBrief}>📋 Copy Deal Brief</button>
              </div>
            )}
          </>
        )}

        {/* History panel */}
        {showHistory && (
          <div style={{ ...S.card, border: '1px solid var(--border2)' }}>
            <div style={{ fontWeight: 700, marginBottom: 16, fontSize: 15 }}>Calculation History</div>
            {history.length === 0 ? (
              <p style={{ color: 'var(--text3)', fontSize: 14 }}>No saved calculations yet.</p>
            ) : history.map(e => (
              <div key={e.id} style={{ border: '1px solid var(--border)', borderRadius: 10, padding: '12px 16px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
                <div onClick={() => loadEntry(e)} style={{ cursor: 'pointer', flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>{e.address || 'No address'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text3)', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <span>ARV <span className="num" style={{ color: 'var(--text2)' }}>{fmt(e.arv, true)}</span></span>
                    <span>MAO <span className="num" style={{ color: e.mao >= 6000 ? 'var(--green)' : 'var(--red)', fontWeight: 700 }}>{fmt(e.mao, true)}</span></span>
                    {e.tier && <span style={{ padding: '1px 7px', borderRadius: 4, background: 'var(--surface2)', color: 'var(--text3)' }}>{e.tier}%</span>}
                    <span>{e.savedAt?.slice(0, 10)}</span>
                  </div>
                </div>
                <button onClick={() => deleteHistory(e.id)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 16, padding: '4px' }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
