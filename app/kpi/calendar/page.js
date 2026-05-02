'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const toN=v=>{const n=Number(String(v||'').replace(/[^0-9.-]/g,''));return isNaN(n)?0:n;};
const todayISO=()=>new Date().toISOString().slice(0,10);

const MONTH_NAMES=['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAY_NAMES=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const CAMP_COLORS=['#E8A020','#06B6D4','#A78BFA','#22C55E','#EF4444','#F97316'];

function fmt$(n){return Number(n||0).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0});}

export default function KPICalendar(){
  const router=useRouter();
  const [isMobile,setIsMobile]=useState(false);
  const [wclEntries,setWclEntries]=useState([]);
  const [campaigns,setCampaigns]=useState([]);
  const [smsEntries,setSmsEntries]=useState([]);
  const [loading,setLoading]=useState(true);

  const today=new Date();
  const [viewYear,setViewYear]=useState(today.getFullYear());
  const [viewMonth,setViewMonth]=useState(today.getMonth());
  const [selectedDate,setSelectedDate]=useState(null);

  useEffect(()=>{const c=()=>setIsMobile(window.innerWidth<768);c();window.addEventListener('resize',c);return()=>window.removeEventListener('resize',c);},[]);

  useEffect(()=>{
    Promise.all([
      fetch('/api/kpi/wcl').then(r=>r.json()).catch(()=>[]),
      fetch('/api/kpi/campaigns').then(r=>r.json()).catch(()=>[]),
      fetch('/api/kpi/sms').then(r=>r.json()).catch(()=>[]),
    ]).then(([wcl,camps,sms])=>{
      if(Array.isArray(wcl))setWclEntries(wcl.filter(e=>!e.deleted));
      if(Array.isArray(camps))setCampaigns(camps.filter(c=>!c.deleted));
      if(Array.isArray(sms))setSmsEntries(sms.filter(e=>!e.deleted));
      setLoading(false);
    });
  },[]);

  function prevMonth(){
    if(viewMonth===0){setViewMonth(11);setViewYear(y=>y-1);}
    else setViewMonth(m=>m-1);
    setSelectedDate(null);
  }
  function nextMonth(){
    if(viewMonth===11){setViewMonth(0);setViewYear(y=>y+1);}
    else setViewMonth(m=>m+1);
    setSelectedDate(null);
  }

  // Build calendar grid
  const firstDay=new Date(viewYear,viewMonth,1).getDay();
  const daysInMonth=new Date(viewYear,viewMonth+1,0).getDate();
  const cells=[];
  for(let i=0;i<firstDay;i++)cells.push(null);
  for(let d=1;d<=daysInMonth;d++)cells.push(d);
  while(cells.length%7!==0)cells.push(null);

  function dateStr(day){
    if(!day)return null;
    return `${viewYear}-${String(viewMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
  }

  // Get WCL entry for a date
  function getWcl(ds){return wclEntries.find(e=>e.date===ds)||null;}

  // Get SMS entries for a date, with campaign color
  function getSmsForDate(ds){
    return smsEntries.filter(e=>e.date===ds).map(e=>{
      const idx=campaigns.findIndex(c=>c.id===e.campaignId);
      return{...e,campColor:idx>=0?CAMP_COLORS[idx%CAMP_COLORS.length]:'#A78BFA',campName:campaigns.find(c=>c.id===e.campaignId)?.name||e.campaignId};
    });
  }

  // Selected date detail
  const selWcl=selectedDate?getWcl(selectedDate):null;
  const selSms=selectedDate?getSmsForDate(selectedDate):[];

  const todayStr=todayISO();

  const p=isMobile?12:24;

  return(
    <div style={{maxWidth:900,margin:'0 auto',padding:`${p}px ${p}px 80px`}}>
      {/* Header */}
      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:10}}>
        <div>
          <div style={{fontSize:11,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.12em',color:'var(--gold)',marginBottom:4}}>KPI Tracker</div>
          <div style={{fontSize:isMobile?20:26,fontWeight:900,color:'var(--text)'}}>Activity Calendar</div>
        </div>
        <button onClick={()=>router.push('/kpi')} style={{minHeight:38,padding:'0 16px',borderRadius:10,border:'1px solid var(--border)',background:'var(--surface3)',color:'var(--text2)',fontWeight:700,fontSize:13,cursor:'pointer'}}>← Back to KPI</button>
      </div>

      {loading&&<div style={{padding:40,textAlign:'center',color:'var(--text3)',fontSize:14}}>Loading…</div>}

      {!loading&&(
        <>
          {/* Legend */}
          <div style={{display:'flex',gap:16,marginBottom:16,flexWrap:'wrap'}}>
            <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--text2)'}}><div style={{width:10,height:10,borderRadius:'50%',background:'var(--gold)',flexShrink:0}}/> WCL Entry</div>
            <div style={{display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--text2)'}}><div style={{width:10,height:10,borderRadius:'50%',background:'#A78BFA',flexShrink:0}}/> SMS Entry</div>
            <div style={{marginLeft:'auto',display:'flex',gap:6,alignItems:'center'}}>
              {campaigns.slice(0,4).map((c,i)=>(
                <div key={c.id} style={{display:'flex',alignItems:'center',gap:4,fontSize:11,color:'var(--text3)'}}>
                  <div style={{width:8,height:8,borderRadius:'50%',background:CAMP_COLORS[i%CAMP_COLORS.length]}}/>
                  <span style={{maxWidth:80,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{c.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Month navigation */}
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,overflow:'hidden',marginBottom:16}}>
            <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 20px',borderBottom:'1px solid var(--border)'}}>
              <button onClick={prevMonth} style={{width:36,height:36,borderRadius:8,border:'1px solid var(--border)',background:'var(--surface3)',color:'var(--text2)',cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center'}}>‹</button>
              <div style={{fontSize:18,fontWeight:800,color:'var(--text)'}}>{MONTH_NAMES[viewMonth]} {viewYear}</div>
              <button onClick={nextMonth} style={{width:36,height:36,borderRadius:8,border:'1px solid var(--border)',background:'var(--surface3)',color:'var(--text2)',cursor:'pointer',fontSize:18,display:'flex',alignItems:'center',justifyContent:'center'}}>›</button>
            </div>

            {/* Day headers */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)',borderBottom:'1px solid var(--border)'}}>
              {DAY_NAMES.map(d=>(
                <div key={d} style={{padding:'8px 0',textAlign:'center',fontSize:11,fontWeight:700,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.08em'}}>{d}</div>
              ))}
            </div>

            {/* Calendar cells */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(7,1fr)'}}>
              {cells.map((day,idx)=>{
                const ds=dateStr(day);
                const wcl=ds?getWcl(ds):null;
                const smsArr=ds?getSmsForDate(ds):[];
                const isToday=ds===todayStr;
                const isSelected=ds===selectedDate;
                const hasActivity=!!wcl||smsArr.length>0;

                return(
                  <div key={idx} onClick={()=>ds&&setSelectedDate(isSelected?null:ds)} style={{
                    minHeight:isMobile?56:72,
                    padding:isMobile?'4px':'6px 8px',
                    borderRight:(idx+1)%7===0?'none':'1px solid var(--border)',
                    borderBottom:idx<cells.length-7?'1px solid var(--border)':'none',
                    background:isSelected?'var(--gold-faint)':isToday?'var(--surface2)':'transparent',
                    cursor:ds?'pointer':'default',
                    position:'relative',
                    transition:'background 0.1s',
                  }}>
                    {day&&(
                      <>
                        <div style={{
                          fontSize:isMobile?12:13,
                          fontWeight:isToday?900:400,
                          color:isToday?'var(--gold)':isSelected?'var(--gold)':'var(--text)',
                          marginBottom:4,
                          fontFamily:'JetBrains Mono,monospace',
                        }}>{day}</div>

                        {/* Dots */}
                        <div style={{display:'flex',flexWrap:'wrap',gap:2}}>
                          {wcl&&(
                            <div style={{width:8,height:8,borderRadius:'50%',background:'var(--gold)',flexShrink:0}} title="WCL entry"/>
                          )}
                          {smsArr.map((s,si)=>(
                            <div key={si} style={{width:8,height:8,borderRadius:'50%',background:s.campColor,flexShrink:0}} title={s.campName}/>
                          ))}
                        </div>

                        {/* Quick numbers */}
                        {!isMobile&&hasActivity&&(
                          <div style={{marginTop:3,display:'flex',flexDirection:'column',gap:1}}>
                            {wcl&&toN(wcl.received)>0&&<div style={{fontSize:9,color:'var(--gold)',fontFamily:'JetBrains Mono,monospace'}}>{toN(wcl.received)}r/{toN(wcl.accepted)}a</div>}
                            {smsArr.map((s,si)=>toN(s.sent)>0&&<div key={si} style={{fontSize:9,color:s.campColor,fontFamily:'JetBrains Mono,monospace'}}>{toN(s.sent).toLocaleString()}s</div>)}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected date detail panel */}
          {selectedDate&&(selWcl||selSms.length>0)&&(
            <div style={{background:'var(--surface)',border:'1px solid var(--gold-border)',borderRadius:14,padding:'20px 24px'}}>
              <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
                <div style={{fontSize:16,fontWeight:800,color:'var(--text)'}}>
                  {new Date(selectedDate+'T00:00:00').toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}
                </div>
                <button onClick={()=>setSelectedDate(null)} style={{background:'none',border:'none',color:'var(--text3)',fontSize:22,cursor:'pointer',lineHeight:1}}>×</button>
              </div>

              {/* WCL detail */}
              {selWcl&&(
                <div style={{marginBottom:selSms.length>0?16:0,padding:'14px 16px',borderRadius:10,background:'var(--gold-faint)',border:'1px solid var(--gold-border)'}}>
                  <div style={{fontSize:12,fontWeight:700,textTransform:'uppercase',color:'var(--gold)',marginBottom:10,letterSpacing:'0.08em'}}>WCL Entry</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(90px,1fr))',gap:8}}>
                    {[['Received',selWcl.received],['Accepted',selWcl.accepted],['Convos',selWcl.conversations],['Qualified',selWcl.qualified],['Offers',selWcl.offers],['Contracts',selWcl.contracts],['Closed',selWcl.closed]].map(([l,v])=>(
                      <div key={l} style={{textAlign:'center',padding:'8px 4px',borderRadius:6,background:'rgba(255,255,255,0.06)'}}>
                        <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:18,fontWeight:900,color:'var(--gold)'}}>{toN(v)}</div>
                        <div style={{fontSize:10,color:'var(--gold)',opacity:0.7,textTransform:'uppercase',letterSpacing:'0.05em'}}>{l}</div>
                      </div>
                    ))}
                  </div>
                  {selWcl.rejectionReasons?.length>0&&(
                    <div style={{marginTop:8,fontSize:12,color:'var(--gold)',opacity:0.8}}>Rejections: {Array.isArray(selWcl.rejectionReasons)?selWcl.rejectionReasons.join(', '):selWcl.rejectionReasons}</div>
                  )}
                  {selWcl.loggedBy&&<div style={{marginTop:4,fontSize:11,color:'var(--gold)',opacity:0.6}}>Logged by {selWcl.loggedBy}</div>}
                </div>
              )}

              {/* SMS detail(s) */}
              {selSms.map((s,i)=>(
                <div key={s.id} style={{marginBottom:i<selSms.length-1?12:0,padding:'14px 16px',borderRadius:10,background:'rgba(167,139,250,0.08)',border:`1px solid ${s.campColor}40`}}>
                  <div style={{fontSize:12,fontWeight:700,textTransform:'uppercase',color:s.campColor,marginBottom:10,letterSpacing:'0.08em'}}>{s.campName}</div>
                  <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(90px,1fr))',gap:8}}>
                    {[['Sent',s.sent],['Total Replies',s.totalReplies],['Interested',s.interestedReplies],['Optouts',s.optouts],['Convos',s.conversations],['Qualified',s.qualified],['Offers',s.offers],['Contracts',s.contracts],['Closed',s.closed]].map(([l,v])=>(
                      <div key={l} style={{textAlign:'center',padding:'8px 4px',borderRadius:6,background:'rgba(255,255,255,0.04)'}}>
                        <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:16,fontWeight:900,color:s.campColor}}>{toN(v)}</div>
                        <div style={{fontSize:9,color:s.campColor,opacity:0.7,textTransform:'uppercase',letterSpacing:'0.04em'}}>{l}</div>
                      </div>
                    ))}
                  </div>
                  {toN(s.cost)>0&&<div style={{marginTop:8,fontSize:12,color:s.campColor,opacity:0.8}}>Cost: {fmt$(s.cost)}</div>}
                  {s.loggedBy&&<div style={{marginTop:4,fontSize:11,color:s.campColor,opacity:0.6}}>Logged by {s.loggedBy}</div>}
                </div>
              ))}
            </div>
          )}

          {selectedDate&&!selWcl&&selSms.length===0&&(
            <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'24px',textAlign:'center',color:'var(--text3)',fontSize:14}}>
              No activity logged for {selectedDate}. <button onClick={()=>router.push('/kpi')} style={{background:'none',border:'none',color:'var(--gold)',cursor:'pointer',fontWeight:700,fontSize:14}}>Log now →</button>
            </div>
          )}

          {/* Monthly summary */}
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'20px 24px',marginTop:16}}>
            <div style={{fontSize:13,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.12em',color:'var(--text3)',marginBottom:14}}>{MONTH_NAMES[viewMonth]} {viewYear} Summary</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(110px,1fr))',gap:10}}>
              {(()=>{
                const monthStr=`${viewYear}-${String(viewMonth+1).padStart(2,'0')}`;
                const monthWcl=wclEntries.filter(e=>e.date.startsWith(monthStr));
                const monthSms=smsEntries.filter(e=>e.date.startsWith(monthStr));
                const wclDays=new Set(monthWcl.map(e=>e.date)).size;
                const smsDays=new Set(monthSms.map(e=>e.date)).size;
                const wclRec=monthWcl.reduce((s,e)=>s+toN(e.received),0);
                const wclCon=monthWcl.reduce((s,e)=>s+toN(e.contracts),0);
                const smsSent=monthSms.reduce((s,e)=>s+toN(e.sent),0);
                const smsCon=monthSms.reduce((s,e)=>s+toN(e.contracts),0);
                return[
                  <StatBox key="wcldays" l="WCL Days" v={wclDays}/>,
                  <StatBox key="smsdates" l="SMS Days" v={smsDays}/>,
                  <StatBox key="wclrec" l="WCL Leads" v={wclRec.toLocaleString()}/>,
                  <StatBox key="smssent" l="SMS Sent" v={smsSent.toLocaleString()}/>,
                  <StatBox key="wclcon" l="WCL Contracts" v={wclCon} color="var(--gold)"/>,
                  <StatBox key="smscon" l="SMS Contracts" v={smsCon} color="var(--purple,#A78BFA)"/>,
                ];
              })()}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatBox({l,v,color}){
  return(
    <div style={{textAlign:'center',padding:'12px 8px',borderRadius:10,background:'var(--surface2)',border:'1px solid var(--border)'}}>
      <div style={{fontFamily:'JetBrains Mono,monospace',fontSize:20,fontWeight:900,color:color||'var(--text)',marginBottom:3}}>{v}</div>
      <div style={{fontSize:10,color:'var(--text3)',textTransform:'uppercase',letterSpacing:'0.06em'}}>{l}</div>
    </div>
  );
}
