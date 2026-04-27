'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AdminPanel from './AdminPanel.js';

function fmt(n) { return Number(n||0).toLocaleString('en-US',{style:'currency',currency:'USD',maximumFractionDigits:0}); }
function pct(a,b) { return b>0?Math.round((a/b)*100):0; }

const TOOLS = [
  { href:'/calculator', label:'Offer Generator', icon:'◈', color:'var(--gold)', tag:'ACQUISITIONS', desc:'MAO · Comps · Rehab · Novation — produces defensible offer numbers', locked:false },
  { href:'/kpi', label:'KPI Tracker', icon:'◉', color:'var(--cyan)', tag:'OPERATIONS', desc:'WCL funnel · SMS campaigns · Rate-based diagnostics · 90-day pace', locked:false },
  { href:'/revenue', label:'Revenue Dashboard', icon:'◆', color:'var(--green)', tag:'FINANCE', desc:'Deal fees · Goal pace · Monthly performance · Cash splits', accessKey:'revenue' },
  { href:'/scorecard', label:'Lead Scorecard', icon:'◐', color:'var(--purple)', tag:'QUALIFICATION', desc:'5-stage scoring engine · 7 verdicts · Contradiction detection · Copy brief', locked:false },
  { href:'/expenses', label:'Expense Tracker', icon:'◍', color:'var(--orange)', tag:'FINANCE', desc:'5 accounts · Auto-allocation from deals · Recurring expenses · Reserve transfers', accessKey:'expenses', fullWidth:true },
];

export default function Dashboard({ session }) {
  const [clock, setClock] = useState('');
  const [showAdmin, setShowAdmin] = useState(false);
  const [goalData, setGoalData] = useState(null);
  const [deals, setDeals] = useState([]);
  const [users, setUsers] = useState([]);
  const [wclEntries, setWclEntries] = useState([]);
  const [smsEntries, setSmsEntries] = useState([]);
  const [lockedMsg, setLockedMsg] = useState(null);
  const [isMobile, setIsMobile] = useState(false);
  const [showSessionWarning, setShowSessionWarning] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    const tick = () => setClock(new Date().toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit',second:'2-digit'}));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (session.access?.revenue) {
      fetch('/api/revenue/deals').then(r=>r.json()).then(d=>{if(Array.isArray(d))setDeals(d);}).catch(()=>{});
      fetch('/api/revenue/goal').then(r=>r.json()).then(d=>{if(d.amount)setGoalData(d);}).catch(()=>{});
    }
    fetch('/api/users').then(r=>r.json()).then(d=>{if(Array.isArray(d))setUsers(d.filter(u=>u.active));}).catch(()=>{});
    fetch('/api/kpi/wcl').then(r=>r.json()).then(d=>{if(Array.isArray(d))setWclEntries(d);}).catch(()=>{});
    fetch('/api/kpi/sms').then(r=>r.json()).then(d=>{if(Array.isArray(d))setSmsEntries(d);}).catch(()=>{});
  }, []);

  useEffect(() => {
    const check = async () => {
      const res = await fetch('/api/auth/session').catch(()=>null);
      if (!res?.ok) { router.push('/'); return; }
      const data = await res.json();
      if (data.expiresAt) setShowSessionWarning((new Date(data.expiresAt).getTime()-Date.now())/1000/60<=15);
    };
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, []);

  const signOut = async () => { await fetch('/api/auth/logout',{method:'POST'}); router.refresh(); };
  const extendSession = async () => { await fetch('/api/auth/session'); setShowSessionWarning(false); };

  const totalRevenue = deals.reduce((s,d)=>s+Number(d.fee||0),0);
  const goal = goalData?.amount || 50000;
  const goalPct = pct(totalRevenue, goal);
  const remaining = Math.max(0, goal - totalRevenue);
  const dealsNeeded = Math.ceil(remaining / 9000);

  const now = new Date();
  const endDate = goalData?.endDate ? new Date(goalData.endDate) : new Date('2026-07-25');
  const daysLeft = Math.max(0, Math.ceil((endDate-now)/86400000));
  const daysColor = daysLeft>=31?'var(--green)':daysLeft>=15?'var(--gold)':'var(--red)';

  const hour = now.getHours();
  const greeting = hour<12?'Good morning':hour<17?'Good afternoon':'Good evening';
  const todayStr = now.toISOString().slice(0,10);
  const todayKpi = [
    ...wclEntries.filter(e=>e.date===todayStr),
    ...smsEntries.filter(e=>e.date===todayStr),
  ].length;

  const p = isMobile ? 16 : 24;
  const navH = 58;
  const bottomNavH = isMobile ? 64 : 0;

  return (
    <div style={{minHeight:'100vh',background:'var(--bg)',paddingBottom: isMobile ? 80 : 0}}>
      {/* Nav */}
      {!isMobile && (
        <nav style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'0 24px',height:navH,background:'var(--surface)',borderBottom:'1px solid var(--border)',position:'sticky',top:0,zIndex:100}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:34,height:34,borderRadius:'50%',background:'var(--gold)',display:'flex',alignItems:'center',justifyContent:'center',fontWeight:900,color:'#000',fontSize:15}}>N</div>
            <div>
              <div style={{fontWeight:700,color:'var(--text)',fontSize:14,lineHeight:1.2}}>Novora Capital</div>
              <div style={{color:'var(--text3)',fontSize:12}}>Deal OS</div>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:10}}>
            <span style={{fontFamily:'JetBrains Mono,monospace',fontSize:13,color:'var(--text3)'}}>{clock}</span>
            {session.access?.manageTeam && (
              <button onClick={()=>setShowAdmin(true)} style={{padding:'6px 14px',borderRadius:8,border:'1px solid var(--gold-border)',background:'var(--gold-faint)',color:'var(--gold)',fontSize:13,fontWeight:700,minHeight:36,transition:'all 0.15s'}}
                onMouseEnter={e=>e.currentTarget.style.background='rgba(232,160,32,0.15)'}
                onMouseLeave={e=>e.currentTarget.style.background='var(--gold-faint)'}>
                Admin
              </button>
            )}
            <div style={{display:'flex',alignItems:'center',gap:8,padding:'5px 12px',borderRadius:20,background:'var(--surface2)',border:'1px solid var(--border)'}}>
              <div style={{width:28,height:28,borderRadius:'50%',background:'rgba(232,160,32,0.15)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:12,fontWeight:800,color:'var(--gold)'}}>{session.userName?.[0]?.toUpperCase()}</div>
              <span style={{fontSize:13,color:'var(--text)',fontWeight:700}}>{session.userName}</span>
            </div>
            <button onClick={signOut} style={{padding:'6px 12px',borderRadius:8,border:'1px solid var(--border)',background:'transparent',color:'var(--text3)',fontSize:13,minHeight:36,transition:'all 0.15s'}}
              onMouseEnter={e=>e.currentTarget.style.background='var(--surface2)'}
              onMouseLeave={e=>e.currentTarget.style.background='transparent'}>
              Sign Out
            </button>
          </div>
        </nav>
      )}

      <div style={{maxWidth:900,margin:'0 auto',padding:`${isMobile?16:28}px ${p}px`}}>
        {/* Goal Banner */}
        <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:16,padding:isMobile?'20px 18px':'24px 28px',marginBottom:isMobile?12:16}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:18,flexWrap:'wrap',gap:12}}>
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontSize:isMobile?20:26,fontWeight:800,color:'var(--text)',marginBottom:6}}>{greeting}, {session.userName}</div>
              {session.access?.revenue ? (
                <div style={{color:'var(--text2)',fontSize:15}}>
                  <span style={{fontFamily:'JetBrains Mono,monospace',color:'var(--gold)',fontWeight:700,fontSize:20}}>{fmt(totalRevenue)}</span>
                  <span style={{margin:'0 8px',color:'var(--text3)'}}>·</span>
                  {goalPct}% of {fmt(goal)} goal
                </div>
              ) : (
                <div style={{color:'var(--text3)',fontSize:14}}>Revenue data restricted</div>
              )}
            </div>
            <div style={{display:'flex',gap:isMobile?16:24,flexShrink:0}}>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:isMobile?36:56,fontWeight:900,fontFamily:'JetBrains Mono,monospace',color:daysColor,lineHeight:1}}>{daysLeft}</div>
                <div style={{fontSize:isMobile?10:13,color:'var(--text3)',marginTop:3}}>days to July 25</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:isMobile?36:56,fontWeight:900,fontFamily:'JetBrains Mono,monospace',color:'var(--cyan)',lineHeight:1}}>{todayKpi}</div>
                <div style={{fontSize:isMobile?10:13,color:'var(--text3)',marginTop:3}}>KPI today</div>
              </div>
            </div>
          </div>

          <div style={{display:'flex',alignItems:'center',justifyContent:'flex-end',marginBottom:10}}>
            <div style={{padding:'4px 12px',borderRadius:20,background:'var(--surface3)',border:'1px solid var(--border)',color:'var(--text2)',fontSize:13}}>
              {dealsNeeded} deal{dealsNeeded!==1?'s':''} needed
            </div>
          </div>

          <div style={{height:8,borderRadius:4,background:'var(--surface3)',overflow:'hidden',marginBottom:8}}>
            <div style={{height:'100%',borderRadius:4,width:`${Math.min(100,goalPct)}%`,background:'linear-gradient(90deg,var(--gold),var(--green))',transition:'width 0.6s ease'}}/>
          </div>
          <div style={{display:'flex',justifyContent:'space-between',fontSize:13}}>
            <span style={{color:'var(--text3)'}}>{goalPct}% complete</span>
            <span style={{color:'var(--text3)'}}>{todayKpi} KPI entries today</span>
          </div>
        </div>

        {/* Tool Grid */}
        <div style={{display:'grid',gridTemplateColumns:isMobile?'1fr':'1fr 1fr',gap:isMobile?10:14,marginBottom:isMobile?12:16}}>
          {TOOLS.map(tool => {
            const locked = tool.accessKey && !session.access?.[tool.accessKey];
            return (
              <div key={tool.href}
                style={{gridColumn:tool.fullWidth&&!isMobile?'1/-1':'auto'}}
                onClick={()=>{
                  if (locked) { setLockedMsg(tool.href); setTimeout(()=>setLockedMsg(null),3000); return; }
                  router.push(tool.href);
                }}>
                <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:14,padding:'20px 24px',display:'flex',alignItems:'center',gap:20,cursor:locked?'default':'pointer',opacity:locked?0.55:1,transition:'all 0.18s'}}
                  onMouseEnter={e=>{if(!locked){e.currentTarget.style.borderColor=tool.color+'80';e.currentTarget.style.background=tool.color+'0a';}}}
                  onMouseLeave={e=>{e.currentTarget.style.borderColor='var(--border)';e.currentTarget.style.background='var(--surface)';}}>
                  <div style={{width:48,height:48,borderRadius:13,background:locked?'var(--surface3)':tool.color+'26',border:`1px solid ${locked?'var(--border)':tool.color+'40'}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,color:locked?'var(--text3)':tool.color,flexShrink:0}}>
                    {locked?'🔒':tool.icon}
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontSize:10,fontWeight:700,textTransform:'uppercase',letterSpacing:'0.12em',color:locked?'var(--text3)':tool.color,marginBottom:4}}>{tool.tag}{locked?' · 🔒':''}</div>
                    <div style={{fontSize:16,fontWeight:800,color:locked?'var(--text3)':'var(--text)',marginBottom:4}}>{tool.label}</div>
                    <div style={{fontSize:13,color:'var(--text2)',lineHeight:1.5}}>{locked?'Contact Ahmadou for access':tool.desc}</div>
                  </div>
                  {!locked && <div style={{color:tool.color,fontSize:18,flexShrink:0}}>→</div>}
                </div>
                {lockedMsg===tool.href && (
                  <div style={{marginTop:8,padding:'10px 16px',borderRadius:10,background:'var(--surface2)',border:'1px solid var(--border)',color:'var(--text3)',fontSize:13}}>
                    Contact Ahmadou for access to {tool.label}.
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Team Strip */}
        {users.length>0 && (
          <div style={{background:'var(--surface)',border:'1px solid var(--border)',borderRadius:12,padding:'16px 20px',display:'flex',alignItems:'center',gap:20,flexWrap:'wrap'}}>
            <span style={{color:'var(--text3)',fontSize:11,textTransform:'uppercase',letterSpacing:'0.06em',fontWeight:600}}>Team</span>
            <div style={{display:'flex',gap:16,flexWrap:'wrap',alignItems:'center'}}>
              {users.map(u=>(
                <div key={u.id} style={{display:'flex',alignItems:'center',gap:8}}>
                  <div style={{width:32,height:32,borderRadius:'50%',background:u.color+'20',border:`2px solid ${u.color}50`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:13,fontWeight:700,color:u.color}}>{u.name[0].toUpperCase()}</div>
                  <span style={{fontSize:14,color:u.id===session.userId?'var(--text)':'var(--text2)',fontWeight:u.id===session.userId?700:400}}>
                    {u.name}
                    {u.id===session.userId && <span style={{marginLeft:8,fontSize:10,background:'var(--gold-faint)',color:'var(--gold)',border:'1px solid var(--gold-border)',borderRadius:4,padding:'1px 6px',fontWeight:700,verticalAlign:'middle'}}>YOU</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile bottom nav */}
      {isMobile && (
        <nav style={{position:'fixed',bottom:0,left:0,right:0,height:64,background:'var(--surface)',borderTop:'1px solid var(--border)',display:'flex',alignItems:'center',zIndex:100}}>
          {[
            {href:'/',icon:'⌂',label:'Home'},
            {href:'/calculator',icon:'◈',label:'Offers'},
            {href:'/kpi',icon:'◉',label:'KPI'},
            {href:'/revenue',icon:'◆',label:'Revenue'},
            {href:'/scorecard',icon:'◐',label:'Score'},
          ].map(item=>(
            <div key={item.href} onClick={()=>router.push(item.href)} style={{flex:1,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:2,cursor:'pointer',color:item.href==='/'?'var(--gold)':'var(--text3)',transition:'color 0.15s'}}>
              <span style={{fontSize:18}}>{item.icon}</span>
              <span style={{fontSize:10,fontWeight:600}}>{item.label}</span>
            </div>
          ))}
        </nav>
      )}

      {showSessionWarning && (
        <div style={{position:'fixed',bottom:isMobile?64:0,left:0,right:0,background:'var(--surface)',borderTop:'1px solid var(--gold-border)',padding:'12px 24px',display:'flex',alignItems:'center',justifyContent:'space-between',zIndex:200}}>
          <span style={{color:'var(--gold)',fontSize:14}}>⚠ Session expiring soon</span>
          <button onClick={extendSession} style={{padding:'7px 18px',borderRadius:8,border:'none',background:'var(--gold)',color:'#000',fontWeight:800,fontSize:13,cursor:'pointer'}}>Extend Session</button>
        </div>
      )}

      {showAdmin && <AdminPanel session={session} onClose={()=>setShowAdmin(false)}/>}
    </div>
  );
}
