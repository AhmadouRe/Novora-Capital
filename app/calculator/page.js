'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const TIERS = [
  { max: 139999,  pct: 70, label: 'Below $140K', color: 'var(--cyan)' },
  { max: 179999,  pct: 73, label: '$140–180K',   color: 'var(--gold)' },
  { max: 229999,  pct: 75, label: '$190–230K',   color: 'var(--gold)' },
  { max: 279999,  pct: 78, label: '$240–280K',   color: 'var(--purple)' },
  { max: Infinity, pct: 80, label: '$300K+',      color: 'var(--green)' },
];

function getTier(arv) {
  const n = toN(arv);
  if (!n) return null;
  return TIERS.find(t => n <= t.max) || TIERS[TIERS.length - 1];
}

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

const S = {
  page: { minHeight: '100vh', background: 'var(--bg)', color: 'var(--text)' },
  nav: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px', height: 56, background: 'var(--surface)', borderBottom: '1px solid var(--border)', position: 'sticky', top: 0, zIndex: 50 },
  wrap: { maxWidth: 800, margin: '0 auto', padding: '28px 20px' },
  card: (border) => ({ background: 'var(--surface)', border: `1px solid ${border || 'var(--border)'}`, borderRadius: 14, padding: 24, marginBottom: 20 }),
  label: { fontSize: 12, color: 'var(--text2)', marginBottom: 6, display: 'block' },
  input: { width: '100%', padding: '10px 12px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, color: 'var(--text)', fontSize: 15 },
  currencyWrap: { display: 'flex', alignItems: 'center', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden' },
  prefix: { padding: '0 10px', color: 'var(--text2)', fontSize: 15, background: 'var(--surface3)', borderRight: '1px solid var(--border)', height: 42, display: 'flex', alignItems: 'center' },
  currIn: { flex: 1, padding: '10px 12px', background: 'transparent', border: 'none', color: 'var(--text)', fontSize: 15, outline: 'none', fontFamily: 'JetBrains Mono, monospace' },
  btn: (c, light) => ({ padding: '10px 20px', borderRadius: 9, border: 'none', background: light ? c + '15' : c, color: light ? c : '#000', fontWeight: 600, fontSize: 14, cursor: 'pointer' }),
  tab: (active) => ({ padding: '8px 20px', borderRadius: 8, border: 'none', background: active ? 'var(--gold)' : 'var(--surface2)', color: active ? '#000' : 'var(--text2)', fontWeight: active ? 700 : 400, fontSize: 14, cursor: 'pointer' }),
  row: { display: 'flex', gap: 16, marginBottom: 16 },
  col: { flex: 1 },
};

function CurrInput({ value, onChange, placeholder, style }) {
  const [focused, setFocused] = useState(false);
  const display = focused ? value : (toN(value) ? Number(toN(value)).toLocaleString() : '');
  return (
    <div style={S.currencyWrap}>
      <span style={S.prefix}>$</span>
      <input style={{ ...S.currIn, ...style }} type="text" inputMode="decimal"
        value={focused ? value : display}
        onChange={e => onChange(e.target.value.replace(/[^0-9.]/g, ''))}
        onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
        placeholder={placeholder} />
    </div>
  );
}

const REHAB_GUIDE = [
  { label: 'Cosmetic', range: '$5–15K', amount: '10000' },
  { label: 'Moderate', range: '$15–35K', amount: '25000' },
  { label: 'Full Gut', range: '$35–70K', amount: '50000' },
  { label: 'Major', range: '$70K+', amount: '75000' },
];

export default function CalculatorPage() {
  const router = useRouter();
  const [sessionOk, setSessionOk] = useState(false);
  const [userName, setUserName] = useState('');
  const [mode, setMode] = useState('assignment');
  const [address, setAddress] = useState('');
  const [arv, setArv] = useState('');
  const [rehab, setRehab] = useState('');
  const [showRehab, setShowRehab] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [fee, setFee] = useState('12000');
  const [cushion, setCushion] = useState('5000');
  const [comps, setComps] = useState([{ addr: '', price: '' }, { addr: '', price: '' }, { addr: '', price: '' }]);
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

  const tier = getTier(arv);
  const arvN = toN(arv), rehabN = toN(rehab), feeN = toN(fee), cushionN = toN(cushion);
  const mao = tier ? Math.round(arvN * (tier.pct / 100) - rehabN - feeN - cushionN) : 0;
  const maoColor = mao >= 12000 ? 'var(--green)' : mao >= 6000 ? 'var(--gold)' : 'var(--red)';
  const maoLabel = mao >= 12000 ? 'Strong Deal ✓' : mao >= 6000 ? 'Viable Deal ✓' : 'Below Minimum — Pass';

  // Novation
  const listN = toN(listPrice), novFeeN = toN(novFee), novCushionN = toN(novCushion), askN = toN(askingPrice);
  const conservative = Math.round(listN * 0.9);
  const finalOffer = Math.round(conservative - novFeeN - novCushionN);
  const spread = Math.round(listN - finalOffer);
  const gap = askN > 0 ? Math.round(askN - finalOffer) : null;

  const saveHistory = async () => {
    if (mao < 6000) return;
    setSaving(true);
    const payload = { address, arv: arvN, rehab: rehabN, fee: feeN, cushion: cushionN, mao, tier: tier?.pct, tierLabel: tier?.label, comps, mode: 'assignment' };
    const res = await fetch('/api/calculator/history', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    if (res.ok) { const d = await res.json(); setHistory(prev => [d, ...prev].slice(0, 20)); setSavedMsg('Saved!'); setTimeout(() => setSavedMsg(''), 2500); }
    setSaving(false);
  };

  const loadEntry = (e) => {
    setAddress(e.address || '');
    setArv(String(e.arv || ''));
    setRehab(String(e.rehab || ''));
    setFee(String(e.fee || '12000'));
    setCushion(String(e.cushion || '5000'));
    if (e.comps) setComps(e.comps);
    setShowHistory(false);
  };

  const deleteHistory = async (id) => {
    await fetch(`/api/calculator/history/${id}`, { method: 'DELETE' });
    setHistory(prev => prev.filter(e => e.id !== id));
  };

  const copyBrief = () => {
    const t = `NOVATION DEAL BRIEF\n─────────────────\nList Price: ${fmt(listN)}\nConservative (90%): ${fmt(conservative)}\nNovation Fee: ${fmt(novFeeN)}\nSafety Cushion: ${fmt(novCushionN)}\nFinal Offer: ${fmt(finalOffer)}\nYour Spread: ${fmt(spread)}${askN ? `\nAsking Price: ${fmt(askN)}\nGap from Ask: ${fmt(gap)}` : ''}\n`;
    navigator.clipboard?.writeText(t);
  };

  if (!sessionOk) return <div style={{ minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text2)' }}>Loading…</div>;

  return (
    <div style={S.page}>
      <nav style={S.nav}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <a href="/" style={{ color: 'var(--text2)', textDecoration: 'none', fontSize: 20 }}>←</a>
          <span style={{ fontWeight: 700, fontSize: 16 }}>Deal Calculator</span>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button style={S.btn('var(--surface2)', false)} onClick={() => setShowHistory(!showHistory)}>
            History {history.length > 0 && <span style={{ background: 'var(--gold)', color: '#000', borderRadius: 10, padding: '1px 7px', fontSize: 11, marginLeft: 4 }}>{history.length}</span>}
          </button>
          <span style={{ fontSize: 13, color: 'var(--text2)' }}>{userName}</span>
        </div>
      </nav>

      <div style={S.wrap}>
        {/* Mode tabs */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
          <button style={S.tab(mode === 'assignment')} onClick={() => setMode('assignment')}>Assignment</button>
          <button style={S.tab(mode === 'novation')} onClick={() => setMode('novation')}>Novation</button>
        </div>

        {mode === 'assignment' && (
          <>
            <div style={S.card()}>
              <div style={{ marginBottom: 16 }}>
                <label style={S.label}>Property Address (optional)</label>
                <input style={S.input} value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St, City, ST" />
              </div>
              <div style={S.row}>
                <div style={S.col}>
                  <label style={S.label}>After Repair Value (ARV)</label>
                  <CurrInput value={arv} onChange={setArv} placeholder="0" />
                  {tier && (
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 12, padding: '3px 10px', borderRadius: 20, background: tier.color + '15', color: tier.color, border: `1px solid ${tier.color}44`, fontWeight: 600 }}>{tier.pct}% Tier</span>
                      <span style={{ fontSize: 12, color: 'var(--text2)' }}>{tier.label}</span>
                    </div>
                  )}
                </div>
                <div style={S.col}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ ...S.label, margin: 0 }}>Estimated Rehab</label>
                    <button style={{ fontSize: 12, color: 'var(--cyan)', background: 'none', border: 'none', cursor: 'pointer' }} onClick={() => setShowRehab(!showRehab)}>Guide</button>
                  </div>
                  <CurrInput value={rehab} onChange={setRehab} placeholder="0" />
                </div>
              </div>

              {showRehab && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 10, marginTop: 12 }}>
                  {REHAB_GUIDE.map(g => (
                    <div key={g.label} onClick={() => { setRehab(g.amount); setShowRehab(false); }} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '10px 12px', cursor: 'pointer', textAlign: 'center', background: 'var(--surface2)' }}
                      onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--gold)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                      <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13 }}>{g.label}</div>
                      <div style={{ color: 'var(--text2)', fontSize: 12 }}>{g.range}</div>
                    </div>
                  ))}
                </div>
              )}

              <div style={{ marginTop: 12 }}>
                <button style={{ background: 'none', border: 'none', color: 'var(--text2)', fontSize: 13, cursor: 'pointer' }} onClick={() => setShowAdvanced(!showAdvanced)}>
                  {showAdvanced ? '▼' : '▶'} Advanced Settings
                </button>
                {showAdvanced && (
                  <div style={{ ...S.row, marginTop: 12 }}>
                    <div style={S.col}>
                      <label style={S.label}>Assignment Fee</label>
                      <CurrInput value={fee} onChange={setFee} placeholder="12000" />
                    </div>
                    <div style={S.col}>
                      <label style={S.label}>Safety Cushion</label>
                      <CurrInput value={cushion} onChange={setCushion} placeholder="5000" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* MAO Output */}
            {arvN > 0 && tier && (
              <div style={{ ...S.card(`${maoColor}44`), textAlign: 'center', borderLeftWidth: 4, borderLeftColor: maoColor }}>
                <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 4 }}>Maximum Allowable Offer</div>
                <div className="num" style={{ fontSize: 72, fontWeight: 800, color: maoColor, lineHeight: 1 }}>{fmt(mao)}</div>
                <div style={{ marginTop: 8, fontSize: 14, fontWeight: 600, color: maoColor }}>{maoLabel}</div>

                <div style={{ marginTop: 24, border: '1px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
                  {[
                    [`ARV × ${tier.pct}%`, Math.round(arvN * tier.pct / 100), 'var(--text)'],
                    ['− Rehab', -rehabN, 'var(--red)'],
                    ['− Assignment Fee', -feeN, 'var(--red)'],
                    ['− Safety Cushion', -cushionN, 'var(--red)'],
                    ['= MAO', mao, maoColor],
                  ].map(([label, val, color], i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 16px', borderBottom: i < 4 ? '1px solid var(--border)' : 'none', background: i === 4 ? 'var(--surface2)' : 'transparent' }}>
                      <span style={{ color: 'var(--text2)', fontSize: 14 }}>{label}</span>
                      <span className="num" style={{ color, fontWeight: i === 4 ? 700 : 400, fontSize: 14 }}>{fmt(val)}</span>
                    </div>
                  ))}
                </div>

                <div style={{ marginTop: 16, background: 'var(--surface2)', borderRadius: 10, padding: 16 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text2)', marginBottom: 10 }}>Negotiation Range</div>
                  {[
                    ['Open Here (90% MAO)', Math.round(mao * 0.9), 'var(--cyan)'],
                    ['Your Ceiling (MAO)', mao, 'var(--gold)'],
                    ['Walk Away (MAO − $15K)', mao - 15000, 'var(--red)'],
                  ].map(([l, v, c]) => (
                    <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: '1px solid var(--border)' }}>
                      <span style={{ fontSize: 13, color: 'var(--text2)' }}>{l}</span>
                      <span className="num" style={{ fontSize: 13, color: c, fontWeight: 600 }}>{fmt(v)}</span>
                    </div>
                  ))}
                </div>

                {/* Comp notes */}
                <div style={{ marginTop: 16, textAlign: 'left' }}>
                  <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>Comp Notes</div>
                  {comps.map((c, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
                      <input style={{ ...S.input, flex: 2 }} placeholder={`Comp ${i+1} address`} value={c.addr} onChange={e => { const n = [...comps]; n[i] = { ...n[i], addr: e.target.value }; setComps(n); }} />
                      <div style={{ flex: 1 }}>
                        <CurrInput value={c.price} onChange={v => { const n = [...comps]; n[i] = { ...n[i], price: v }; setComps(n); }} placeholder="Sale price" />
                      </div>
                    </div>
                  ))}
                </div>

                <div style={{ display: 'flex', gap: 10, marginTop: 16 }}>
                  <button style={{ ...S.btn(mao >= 6000 ? 'var(--gold)' : 'var(--border)', false), flex: 1, opacity: mao < 6000 ? 0.4 : 1 }}
                    onClick={saveHistory} disabled={mao < 6000 || saving}>
                    {saving ? 'Saving…' : savedMsg || '💾 Save to History'}
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {mode === 'novation' && (
          <>
            <div style={S.card()}>
              <div style={{ ...S.row }}>
                <div style={S.col}>
                  <label style={S.label}>Listing Comps / Est. List Price</label>
                  <CurrInput value={listPrice} onChange={setListPrice} placeholder="0" />
                  {listN > 0 && <div style={{ marginTop: 6, fontSize: 12, color: 'var(--text2)' }}>Conservative (90%): <span className="num" style={{ color: 'var(--text)' }}>{fmt(conservative)}</span></div>}
                </div>
                <div style={S.col}>
                  <label style={S.label}>Asking Price (if known)</label>
                  <CurrInput value={askingPrice} onChange={setAskingPrice} placeholder="optional" />
                </div>
              </div>
              <div style={S.row}>
                <div style={S.col}>
                  <label style={S.label}>Novation Fee</label>
                  <CurrInput value={novFee} onChange={setNovFee} placeholder="8000" />
                </div>
                <div style={S.col}>
                  <label style={S.label}>Safety Cushion</label>
                  <CurrInput value={novCushion} onChange={setNovCushion} placeholder="5000" />
                </div>
              </div>
            </div>
            {listN > 0 && (
              <div style={S.card('var(--purple-border)')}>
                {[
                  ['List Price', fmt(listN), 'var(--text)'],
                  ['Conservative (90%)', fmt(conservative), 'var(--text2)'],
                  ['− Novation Fee', fmt(novFeeN), 'var(--red)'],
                  ['− Safety Cushion', fmt(novCushionN), 'var(--red)'],
                  ['Final Offer', fmt(finalOffer), 'var(--purple)'],
                  ['Your Spread', fmt(spread), 'var(--green)'],
                  ...(gap !== null ? [['Gap from Asking', fmt(gap), gap > 0 ? 'var(--red)' : 'var(--green)']] : []),
                ].map(([l, v, c]) => (
                  <div key={l} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}>
                    <span style={{ color: 'var(--text2)', fontSize: 14 }}>{l}</span>
                    <span className="num" style={{ color: c, fontSize: 14, fontWeight: 600 }}>{v}</span>
                  </div>
                ))}
                <button style={{ ...S.btn('var(--purple)', false), marginTop: 16, width: '100%' }} onClick={copyBrief}>📋 Copy Deal Brief</button>
              </div>
            )}
          </>
        )}

        {/* History panel */}
        {showHistory && (
          <div style={{ ...S.card(), border: '1px solid var(--border2)' }}>
            <div style={{ fontWeight: 600, marginBottom: 14, fontSize: 15 }}>Calculation History</div>
            {history.length === 0 ? <p style={{ color: 'var(--text2)', fontSize: 14 }}>No saved calculations</p> : history.map(e => (
              <div key={e.id} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: '12px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div onClick={() => loadEntry(e)} style={{ cursor: 'pointer', flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{e.address || 'No address'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>
                    ARV: <span className="num">{fmt(e.arv, true)}</span> · MAO: <span className="num" style={{ color: e.mao >= 6000 ? 'var(--green)' : 'var(--red)' }}>{fmt(e.mao, true)}</span>
                    {e.tier && <span style={{ marginLeft: 6, fontSize: 11, padding: '1px 6px', borderRadius: 4, background: 'var(--surface2)', color: 'var(--text2)' }}>{e.tier}%</span>}
                    <span style={{ marginLeft: 6, fontSize: 11, color: 'var(--text3)' }}>{e.savedAt?.slice(0,10)}</span>
                  </div>
                </div>
                <button onClick={() => deleteHistory(e.id)} style={{ background: 'none', border: 'none', color: 'var(--text3)', cursor: 'pointer', fontSize: 16, padding: '0 4px' }}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
