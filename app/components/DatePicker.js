'use client';
import { useState, useEffect, useRef } from 'react';

const DAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const SHORT_MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const SHORT_DAYS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

function parseDate(str) {
  if (!str) return null;
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function toISO(date) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function formatDisplay(str) {
  const d = parseDate(str);
  if (!d) return '';
  return `${SHORT_DAYS[d.getDay()]}, ${SHORT_MONTHS[d.getMonth()]} ${d.getDate()} ${d.getFullYear()}`;
}

export default function DatePicker({ value, onChange, label, placeholder }) {
  const [open, setOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const today = new Date();
  const [viewYear, setViewYear] = useState(() => {
    const d = parseDate(value) || today;
    return d.getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    const d = parseDate(value) || today;
    return d.getMonth();
  });
  const triggerRef = useRef(null);
  const overlayRef = useRef(null);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (!open) return;
    function handleClick(e) {
      if (triggerRef.current?.contains(e.target)) return;
      if (overlayRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  useEffect(() => {
    if (open && value) {
      const d = parseDate(value) || today;
      setViewYear(d.getFullYear());
      setViewMonth(d.getMonth());
    }
  }, [open]);

  function prevMonth() {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  }

  function buildDays() {
    const first = new Date(viewYear, viewMonth, 1).getDay();
    const total = new Date(viewYear, viewMonth + 1, 0).getDate();
    const prevTotal = new Date(viewYear, viewMonth, 0).getDate();
    const cells = [];
    for (let i = first - 1; i >= 0; i--) cells.push({ day: prevTotal - i, cur: false, m: viewMonth - 1, y: viewMonth === 0 ? viewYear - 1 : viewYear });
    for (let i = 1; i <= total; i++) cells.push({ day: i, cur: true, m: viewMonth, y: viewYear });
    while (cells.length < 42) {
      const n = cells.length - first - total + 1;
      cells.push({ day: n, cur: false, m: viewMonth + 1, y: viewMonth === 11 ? viewYear + 1 : viewYear });
    }
    return cells;
  }

  function selectDay(cell) {
    const month = cell.m < 0 ? 11 : cell.m > 11 ? 0 : cell.m;
    const year = cell.m < 0 ? cell.y : cell.m > 11 ? cell.y : cell.y;
    const d = new Date(year, month, cell.day);
    onChange(toISO(d));
    setOpen(false);
  }

  const isToday = (cell) => {
    const d = new Date(cell.cur ? viewYear : (cell.m < 0 ? viewYear - 1 : viewYear + 1), cell.m < 0 ? 11 : cell.m > 11 ? 0 : cell.m, cell.day);
    return d.toDateString() === today.toDateString();
  };
  const isSelected = (cell) => {
    if (!value) return false;
    const sel = parseDate(value);
    const d = new Date(cell.cur ? viewYear : (cell.m < 0 ? viewYear - 1 : viewYear + 1), cell.m < 0 ? 11 : cell.m > 11 ? 0 : cell.m, cell.day);
    return sel && d.toDateString() === sel.toDateString();
  };

  const displayVal = value ? formatDisplay(value) : '';

  const calendarContent = (
    <div style={{ padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
        <button onClick={prevMonth} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface3)', color: 'var(--text2)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>‹</button>
        <span style={{ fontWeight: 700, color: 'var(--text)', fontSize: 15 }}>{MONTHS[viewMonth]} {viewYear}</span>
        <button onClick={nextMonth} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid var(--border)', background: 'var(--surface3)', color: 'var(--text2)', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>›</button>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2, marginBottom: 6 }}>
        {DAYS.map(d => <div key={d} style={{ textAlign: 'center', fontSize: 11, color: 'var(--text3)', fontWeight: 600, padding: '4px 0' }}>{d}</div>)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 2 }}>
        {buildDays().map((cell, i) => {
          const sel = isSelected(cell);
          const tod = isToday(cell);
          return (
            <div key={i} onClick={() => selectDay(cell)} style={{ width: 36, height: 36, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', cursor: 'pointer', fontSize: 13, fontFamily: 'JetBrains Mono, monospace', background: sel ? 'var(--gold)' : 'transparent', color: sel ? '#000' : cell.cur ? 'var(--text)' : 'var(--text3)', fontWeight: sel ? 700 : 400, outline: tod && !sel ? '2px solid var(--border2)' : 'none', outlineOffset: -1, transition: 'background 0.12s' }}
              onMouseEnter={e => { if (!sel) e.currentTarget.style.background = 'var(--surface3)'; }}
              onMouseLeave={e => { if (!sel) e.currentTarget.style.background = 'transparent'; }}>
              {cell.day}
            </div>
          );
        })}
      </div>
    </div>
  );

  return (
    <div style={{ position: 'relative' }}>
      {label && <div style={{ fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.11em', color: 'var(--text3)', marginBottom: 8 }}>{label}</div>}
      <div ref={triggerRef} onClick={() => setOpen(o => !o)} style={{ minHeight: 48, padding: '12px 16px', borderRadius: 10, background: 'var(--surface3)', border: `1px solid ${open ? 'var(--border2)' : 'var(--border)'}`, color: displayVal ? 'var(--text)' : 'var(--text3)', fontSize: 15, fontFamily: 'JetBrains Mono, monospace', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', transition: 'border-color 0.15s', userSelect: 'none' }}>
        <span>{displayVal || placeholder || 'Select date'}</span>
        <span style={{ color: 'var(--gold)', fontSize: 16 }}>📅</span>
      </div>

      {open && !isMobile && (
        <div ref={overlayRef} style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 1000, background: 'var(--surface)', border: '1px solid var(--border2)', borderRadius: 14, boxShadow: '0 16px 48px rgba(0,0,0,0.5)', minWidth: 280 }}>
          {calendarContent}
        </div>
      )}

      {open && isMobile && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.7)' }} onClick={() => setOpen(false)}>
          <div ref={overlayRef} onClick={e => e.stopPropagation()} style={{ position: 'fixed', bottom: 0, left: 0, right: 0, background: 'var(--surface)', borderRadius: '20px 20px 0 0', paddingBottom: 24 }} className="slide-up">
            <div style={{ display: 'flex', justifyContent: 'center', paddingTop: 10, paddingBottom: 6 }}>
              <div style={{ width: 40, height: 4, borderRadius: 2, background: 'var(--border2)' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 20px 4px' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Select Date</span>
              <button onClick={() => setOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 20, cursor: 'pointer' }}>×</button>
            </div>
            {calendarContent}
          </div>
        </div>
      )}
    </div>
  );
}
