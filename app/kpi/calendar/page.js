'use client';
import { useState, useEffect, useMemo } from 'react';

const C = {
  bg:     'var(--background)',
  sf:     'var(--surface)',
  s2:     'var(--surface-2)',
  s3:     'var(--surface-3)',
  bd:     'var(--border)',
  tx:     'var(--text)',
  t2:     'var(--text-2)',
  t3:     'var(--text-3)',
  gold:   'var(--gold)',
  green:  'var(--green)',
  red:    'var(--red)',
  cyan:   'var(--cyan)',
  purple: 'var(--purple)',
  orange: 'var(--orange)',
};

function safeNum(v) { const n = Number(v); return isFinite(n) ? n : 0; }
function fmtDate(d) {
  if (!d) return '';
  const [y, m, day] = d.split('-');
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return `${months[parseInt(m,10)-1]} ${parseInt(day,10)}, ${y}`;
}
function fmtCost(n) { return '$' + (Number(n) || 0).toFixed(2); }

function getDaysInMonth(year, month) { return new Date(year, month + 1, 0).getDate(); }
function getFirstDow(year, month) {
  const dow = new Date(year, month, 1).getDay();
  return (dow + 6) % 7; // Mon=0
}
function padZ(n) { return String(n).padStart(2, '0'); }
function dateStr(y, m, d) { return `${y}-${padZ(m+1)}-${padZ(d)}`; }

export default function KPICalendarPage() {
  const now = new Date();
  const [year, setYear]       = useState(now.getFullYear());
  const [month, setMonth]     = useState(now.getMonth());
  const [selected, setSelected] = useState(null);
  const [wcl, setWcl]         = useState([]);
  const [sms, setSms]         = useState([]);
  const [outreach, setOutreach] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [wRes, sRes, oRes, cRes] = await Promise.all([
          fetch('/api/kpi/wcl'),
          fetch('/api/kpi/sms'),
          fetch('/api/kpi/outreach'),
          fetch('/api/kpi/campaigns'),
        ]);
        if (wRes.ok) setWcl(await wRes.json());
        if (sRes.ok) setSms(await sRes.json());
        if (oRes.ok) setOutreach(await oRes.json());
        if (cRes.ok) setCampaigns(await cRes.json());
      } catch (e) { /* silent */ }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const todayStr = now.toISOString().slice(0, 10);
  const maxFutureDate = new Date(now.getFullYear(), now.getMonth() + 2, 1);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelected(null);
  }

  function nextMonth() {
    const next = new Date(year, month + 1, 1);
    if (next >= maxFutureDate) return;
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelected(null);
  }

  const canGoNext = useMemo(() => {
    const next = new Date(year, month + 1, 1);
    return next < maxFutureDate;
  }, [year, month, maxFutureDate]);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDow    = getFirstDow(year, month);

  // Build day index
  const dayData = useMemo(() => {
    const map = {};
    const ds  = (d) => dateStr(year, month, d);

    for (let d = 1; d <= daysInMonth; d++) {
      const key = ds(d);
      map[key] = {
        wcl:     wcl.filter(e => e.date === key),
        sms:     sms.filter(e => e.date === key),
        outreach: outreach.filter(e => e.date === key),
      };
    }
    return map;
  }, [year, month, daysInMonth, wcl, sms, outreach]);

  // Monthly summary
  const monthlySummary = useMemo(() => {
    const keys = Object.keys(dayData);
    return {
      wclReceived:  keys.reduce((s,k) => s + dayData[k].wcl.reduce((a,e) => a + safeNum(e.received),0), 0),
      wclContracts: keys.reduce((s,k) => s + dayData[k].wcl.reduce((a,e) => a + safeNum(e.contracts),0), 0),
      smsContracts: keys.reduce((s,k) => s + dayData[k].sms.reduce((a,e) => a + safeNum(e.contracts),0), 0),
      outContacts:  keys.reduce((s,k) => s + dayData[k].outreach.reduce((a,e) => a + safeNum(e.contacts),0), 0),
      outCost:      keys.reduce((s,k) => s + dayData[k].outreach.reduce((a,e) => a + safeNum(e.cost),0), 0),
    };
  }, [dayData]);

  const monthNames = ['January','February','March','April','May','June','July','August','September','October','November','December'];

  const selData = selected ? dayData[selected] : null;

  if (loading) return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh', color:C.t3, fontFamily:'Outfit,sans-serif' }}>
      Loading calendar…
    </div>
  );

  return (
    <div style={{ padding:'24px 20px', maxWidth:1000, margin:'0 auto', fontFamily:'Outfit,sans-serif', color:C.tx }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <a href="/kpi" style={{ color:C.t2, textDecoration:'none', fontSize:13, background:C.s2, border:`1px solid ${C.bd}`, borderRadius:6, padding:'6px 12px' }}>← KPI</a>
          <div style={{ fontSize:20, fontWeight:700, color:C.tx }}>{monthNames[month]} {year}</div>
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <button onClick={prevMonth} style={{
            background:C.s2, border:`1px solid ${C.bd}`, borderRadius:8,
            padding:'8px 16px', color:C.tx, fontSize:14, cursor:'pointer', minHeight:40,
          }}>← Prev</button>
          <button onClick={nextMonth} disabled={!canGoNext} style={{
            background: canGoNext ? C.s2 : C.s3, border:`1px solid ${C.bd}`, borderRadius:8,
            padding:'8px 16px', color: canGoNext ? C.tx : C.t3, fontSize:14,
            cursor: canGoNext ? 'pointer' : 'not-allowed', minHeight:40,
          }}>Next →</button>
        </div>
      </div>

      {/* Monthly summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:10, marginBottom:20 }}>
        {[
          { label:'WCL Received',  value: monthlySummary.wclReceived,  color: C.gold   },
          { label:'WCL Contracts', value: monthlySummary.wclContracts, color: C.gold   },
          { label:'SMS Contracts', value: monthlySummary.smsContracts, color: C.purple },
          { label:'Out. Contacts', value: monthlySummary.outContacts.toLocaleString(), color: C.cyan },
          { label:'Out. Cost',     value: fmtCost(monthlySummary.outCost), color: C.orange },
        ].map(item => (
          <div key={item.label} style={{
            background:C.sf, border:`1px solid ${C.bd}`, borderLeft:`3px solid ${item.color}`,
            borderRadius:10, padding:'12px 14px', textAlign:'center',
          }}>
            <div style={{ fontSize:22, fontFamily:'JetBrains Mono,monospace', fontWeight:700, color:item.color }}>{item.value}</div>
            <div style={{ fontSize:11, color:C.t3, marginTop:2 }}>{item.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns: selected ? '1fr 320px' : '1fr', gap:20 }}>
        {/* Calendar grid */}
        <div>
          {/* Day-of-week headers */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2, marginBottom:4 }}>
            {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(d => (
              <div key={d} style={{ textAlign:'center', fontSize:11, color:C.t3, padding:'4px 0' }}>{d}</div>
            ))}
          </div>

          {/* Cells */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:2 }}>
            {/* Leading blanks */}
            {Array.from({ length: firstDow }).map((_, i) => (
              <div key={`blank-${i}`} style={{ minHeight:88, background:C.s2, borderRadius:6, opacity:0.3 }} />
            ))}

            {Array.from({ length: daysInMonth }).map((_, i) => {
              const day = i + 1;
              const ds  = dateStr(year, month, day);
              const data = dayData[ds] || { wcl:[], sms:[], outreach:[] };
              const isToday    = ds === todayStr;
              const isSelected = ds === selected;
              const hasWcl     = data.wcl.length > 0;
              const hasSms     = data.sms.length > 0;
              const outCount   = data.outreach.length;

              return (
                <div key={ds} onClick={() => setSelected(isSelected ? null : ds)} style={{
                  minHeight:88, background: isSelected ? C.s3 : C.sf,
                  border: `1px solid ${isToday ? C.gold : (isSelected ? C.gold : C.bd)}`,
                  borderRadius:6, padding:'6px 8px', cursor:'pointer',
                  transition:'background 0.15s',
                }}>
                  <div style={{
                    fontSize:13, fontWeight: isToday ? 700 : 400,
                    color: isToday ? C.gold : C.tx, marginBottom:6,
                  }}>{day}</div>
                  <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
                    {hasWcl && (
                      <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:C.gold }} title="WCL" />
                    )}
                    {hasSms && (
                      <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:C.purple }} title="SMS pipeline" />
                    )}
                    {outCount > 0 && (() => {
                      const show = data.outreach.slice(0, 3);
                      const extra = outCount - 3;
                      return (
                        <div style={{ display:'flex', gap:2, flexWrap:'wrap', alignItems:'center' }}>
                          {show.map((o, oi) => (
                            <span key={oi} style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:C.cyan }} title="Outreach" />
                          ))}
                          {extra > 0 && <span style={{ fontSize:9, color:C.cyan }}>+{extra}</span>}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Legend */}
          <div style={{ display:'flex', gap:16, marginTop:12, flexWrap:'wrap' }}>
            {[
              { color: C.gold,   label: 'WCL entry' },
              { color: C.purple, label: 'SMS pipeline' },
              { color: C.cyan,   label: 'Outreach list' },
            ].map(l => (
              <div key={l.label} style={{ display:'flex', alignItems:'center', gap:6 }}>
                <span style={{ display:'inline-block', width:8, height:8, borderRadius:'50%', background:l.color }} />
                <span style={{ fontSize:12, color:C.t3 }}>{l.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Detail panel */}
        {selected && selData && (
          <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
            <div style={{ fontSize:14, fontWeight:700, color:C.tx }}>{fmtDate(selected)}</div>

            {/* WCL section */}
            {selData.wcl.length > 0 && selData.wcl.map(e => (
              <div key={e.id} style={{ background:C.sf, border:`1px solid ${C.bd}`, borderLeft:`3px solid ${C.gold}`, borderRadius:10, padding:14 }}>
                <div style={{ fontSize:12, fontWeight:600, color:C.gold, marginBottom:8 }}>WCL Entry</div>
                {[
                  ['Received',       e.received],
                  ['Conversations',  e.conversations],
                  ['Qualified',      e.qualified],
                  ['Offers',         e.offers],
                  ['Responses',      e.responses],
                  ['Contracts',      e.contracts],
                  ['Closed',         e.closed],
                ].filter(([,v]) => safeNum(v) > 0).map(([label, val]) => (
                  <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'3px 0' }}>
                    <span style={{ fontSize:12, color:C.t2 }}>{label}</span>
                    <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:12, color:C.tx }}>{safeNum(val)}</span>
                  </div>
                ))}
                {safeNum(e.received) === 0 && safeNum(e.contracts) === 0 && (
                  <div style={{ fontSize:12, color:C.t3 }}>No data logged</div>
                )}
              </div>
            ))}

            {/* SMS section */}
            {selData.sms.length > 0 && selData.sms.map(e => {
              const camp = campaigns.find(c => c.id === e.campaignId);
              return (
                <div key={e.id} style={{ background:C.sf, border:`1px solid ${C.bd}`, borderLeft:`3px solid ${C.purple}`, borderRadius:10, padding:14 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:C.purple, marginBottom:4 }}>SMS Pipeline</div>
                  {camp && <div style={{ fontSize:11, color:C.t3, marginBottom:8 }}>{camp.name}</div>}
                  {[
                    ['Conversations', e.conversations],
                    ['Qualified',     e.qualified],
                    ['Offers',        e.offers],
                    ['Responses',     e.responses],
                    ['Contracts',     e.contracts],
                    ['Closed',        e.closed],
                  ].filter(([,v]) => safeNum(v) > 0).map(([label, val]) => (
                    <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'3px 0' }}>
                      <span style={{ fontSize:12, color:C.t2 }}>{label}</span>
                      <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:12, color:C.tx }}>{safeNum(val)}</span>
                    </div>
                  ))}
                  {safeNum(e.conversations) === 0 && <div style={{ fontSize:12, color:C.t3 }}>No pipeline data</div>}
                </div>
              );
            })}

            {/* Outreach entries */}
            {selData.outreach.length > 0 && selData.outreach.map(o => {
              const camp = campaigns.find(c => c.id === o.campaignId);
              return (
                <div key={o.id} style={{ background:C.sf, border:`1px solid ${C.bd}`, borderLeft:`3px solid ${C.cyan}`, borderRadius:10, padding:14 }}>
                  <div style={{ fontSize:12, fontWeight:600, color:C.cyan, marginBottom:4 }}>Outreach</div>
                  <div style={{ fontSize:13, color:C.tx, marginBottom:4 }}>{o.listName || '—'}</div>
                  {o.county && <div style={{ fontSize:11, color:C.t3, marginBottom:4 }}>{o.county}{camp ? ` · ${camp.name}` : ''}</div>}
                  {[
                    ['Contacts',        o.contacts],
                    ['Total Replies',   o.totalReplies],
                    ['Positive Replies',o.positiveReplies],
                  ].map(([label, val]) => (
                    <div key={label} style={{ display:'flex', justifyContent:'space-between', padding:'3px 0' }}>
                      <span style={{ fontSize:12, color:C.t2 }}>{label}</span>
                      <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:12, color:C.tx }}>{safeNum(val).toLocaleString()}</span>
                    </div>
                  ))}
                  <div style={{ display:'flex', justifyContent:'space-between', padding:'3px 0' }}>
                    <span style={{ fontSize:12, color:C.t2 }}>Cost</span>
                    <span style={{ fontFamily:'JetBrains Mono,monospace', fontSize:12, color:C.orange }}>{fmtCost(o.cost)}</span>
                  </div>
                </div>
              );
            })}

            {selData.wcl.length === 0 && selData.sms.length === 0 && selData.outreach.length === 0 && (
              <div style={{ color:C.t3, fontSize:13, padding:'16px 0' }}>No entries on this day.</div>
            )}

            <button onClick={() => setSelected(null)} style={{
              background:C.s2, border:`1px solid ${C.bd}`, borderRadius:8,
              padding:'8px 16px', color:C.t2, fontSize:13, cursor:'pointer', minHeight:38,
            }}>Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
