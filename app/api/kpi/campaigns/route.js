import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { validateSession } from '../../../lib/auth.js';
import { writeAudit } from '../../../lib/audit.js';

export const dynamic = 'force-dynamic';

const KEY = 'nc:kpi:campaigns';

function clean(v) {
  return typeof v === 'string' ? v.trim() : '';
}

export async function GET(request) {
  const session = await validateSession(request.cookies.get('novora_session')?.value);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const list = (await kv.get(KEY)) || [];
  return NextResponse.json(list.filter(c => !c.deleted));
}

export async function POST(request) {
  const session = await validateSession(request.cookies.get('novora_session')?.value);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();

  const name = clean(body.name);
  const startDate = clean(body.startDate);

  if (name && startDate) {
    const existing = (await kv.get(KEY)) || [];
    const dup = existing.find(c =>
      !c.deleted &&
      c.name?.toLowerCase() === name.toLowerCase() &&
      c.startDate === startDate
    );
    if (dup) return NextResponse.json({ error: 'Duplicate campaign for this name and start date' }, { status: 409 });
  }

  const campaign = {
    id: Date.now().toString(),
    name,
    counties: Array.isArray(body.counties) ? body.counties.map(s => clean(s)).filter(Boolean) : [],
    startDate,
    status: body.status || 'active',
    contacts: Math.max(0, parseInt(String(body.contacts||'').replace(/[^0-9]/g,''))||0),
    createdBy: session.userName,
    createdAt: new Date().toISOString(),
    deleted: false,
  };

  const list = (await kv.get(KEY)) || [];
  list.push(campaign);
  await kv.set(KEY, list);
  await writeAudit(session.userId, session.userName, 'novora-capital', 'CAMPAIGN_CREATED', `Campaign: ${name}`);
  return NextResponse.json(campaign);
}
