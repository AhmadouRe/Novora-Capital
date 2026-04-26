'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const S = {
  bg: { minHeight: '100vh', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' },
  card: { background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 16, padding: 40, width: 400, maxWidth: '90vw' },
  logo: { width: 56, height: 56, borderRadius: '50%', background: 'var(--gold-faint)', border: '2px solid var(--gold-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: 'var(--gold)', margin: '0 auto 20px' },
  title: { textAlign: 'center', fontSize: 22, fontWeight: 700, color: 'var(--text)', marginBottom: 4 },
  sub: { textAlign: 'center', color: 'var(--text2)', fontSize: 14, marginBottom: 28 },
  grid: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 },
  userCard: { border: '1px solid var(--border)', borderRadius: 12, padding: '16px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, cursor: 'pointer', background: 'var(--surface2)', transition: 'border-color 0.15s, background 0.15s' },
  avatar: (color) => ({ width: 44, height: 44, borderRadius: '50%', background: color + '22', border: `2px solid ${color}55`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, fontWeight: 700, color }),
  pinDots: { display: 'flex', gap: 12, justifyContent: 'center', margin: '24px 0' },
  dot: (filled) => ({ width: 14, height: 14, borderRadius: '50%', background: filled ? 'var(--gold)' : 'var(--border2)', border: '2px solid ' + (filled ? 'var(--gold)' : 'var(--border2)'), transition: 'all 0.15s' }),
  pinInput: { position: 'absolute', opacity: 0, width: 0, height: 0 },
  btn: (color) => ({ width: '100%', padding: '12px 0', borderRadius: 10, border: 'none', background: color, color: '#fff', fontSize: 15, fontWeight: 600, cursor: 'pointer' }),
  backBtn: { background: 'none', border: '1px solid var(--border)', color: 'var(--text2)', borderRadius: 10, padding: '10px 0', width: '100%', fontSize: 14, cursor: 'pointer', marginTop: 8 },
  err: { color: 'var(--red)', textAlign: 'center', fontSize: 13, marginBottom: 12 },
};

export default function LoginFlow() {
  const [users, setUsers] = useState([]);
  const [step, setStep] = useState(1);
  const [selected, setSelected] = useState(null);
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockdown, setLockdown] = useState(null);
  const [countdown, setCountdown] = useState(0);
  const pinRef = useRef(null);
  const router = useRouter();

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(data => {
      if (Array.isArray(data)) setUsers(data.filter(u => u.active));
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (step === 2 && pinRef.current) pinRef.current.focus();
  }, [step]);

  useEffect(() => {
    if (!lockdown) return;
    const interval = setInterval(() => {
      const remaining = Math.max(0, Math.ceil((new Date(lockdown).getTime() - Date.now()) / 1000));
      setCountdown(remaining);
      if (remaining === 0) { setLockdown(null); setCountdown(0); }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockdown]);

  const selectUser = (user) => {
    setSelected(user);
    setPin('');
    setError('');
    setLockdown(null);
    setStep(2);
  };

  const handlePinKey = (e) => {
    if (e.key === 'Enter') { handleLogin(); return; }
    if (e.key === 'Backspace') { setPin(p => p.slice(0, -1)); return; }
    if (/^\d$/.test(e.key) && pin.length < 4) setPin(p => p + e.key);
  };

  const handleLogin = async () => {
    if (pin.length !== 4) return;
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: selected.name, pin }),
      });
      const data = await res.json();
      if (res.ok) {
        router.refresh();
      } else if (data.lockedUntil) {
        setLockdown(data.lockedUntil);
        setCountdown(Math.ceil((new Date(data.lockedUntil).getTime() - Date.now()) / 1000));
        setError('Account locked for 15 minutes');
        setPin('');
      } else {
        setError(data.attemptsRemaining !== undefined ? `Wrong PIN — ${data.attemptsRemaining} attempt${data.attemptsRemaining !== 1 ? 's' : ''} remaining` : data.error || 'Invalid PIN');
        setPin('');
        if (pinRef.current) pinRef.current.focus();
      }
    } catch { setError('Connection error'); }
    finally { setLoading(false); }
  };

  if (step === 1) return (
    <div style={S.bg}>
      <div style={S.card}>
        <div style={S.logo}>N</div>
        <div style={S.title}>Novora Capital</div>
        <div style={S.sub}>Select your profile to continue</div>
        <div style={S.grid}>
          {users.map(u => (
            <div key={u.id} style={S.userCard} onClick={() => selectUser(u)}
              onMouseEnter={e => { e.currentTarget.style.borderColor = u.color; e.currentTarget.style.background = u.color + '11'; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.background = 'var(--surface2)'; }}>
              <div style={S.avatar(u.color)}>{u.name[0].toUpperCase()}</div>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{u.name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div style={S.bg}>
      <div style={S.card}>
        <div style={{ ...S.avatar(selected.color), margin: '0 auto 16px', width: 56, height: 56, fontSize: 22 }}>{selected.name[0].toUpperCase()}</div>
        <div style={S.title}>{selected.name}</div>
        <div style={S.sub}>Enter your 4-digit PIN</div>

        <div style={S.pinDots}>
          {[0,1,2,3].map(i => <div key={i} style={S.dot(pin.length > i)} />)}
        </div>
        <input ref={pinRef} style={S.pinInput} type="password" inputMode="numeric" value={pin} onKeyDown={handlePinKey} onChange={() => {}} readOnly />

        {error && <div style={S.err}>{error}</div>}
        {lockdown && countdown > 0 && (
          <div style={{ textAlign: 'center', color: 'var(--red)', fontSize: 13, marginBottom: 12 }}>
            Account locked — try again in {Math.floor(countdown/60)}:{String(countdown%60).padStart(2,'0')}
          </div>
        )}

        <button style={S.btn(pin.length === 4 && !loading && !lockdown ? 'var(--gold)' : 'var(--border2)')}
          onClick={handleLogin} disabled={pin.length !== 4 || loading || !!lockdown}>
          {loading ? 'Signing in...' : 'Log In'}
        </button>
        <button style={S.backBtn} onClick={() => { setStep(1); setPin(''); setError(''); }}>← Back</button>
      </div>
    </div>
  );
}
