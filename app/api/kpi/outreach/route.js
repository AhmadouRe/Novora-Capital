import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { validateSession } from '../../../lib/auth.js';
import { writeAudit } from '../../../lib/audit.js';

export const dynamic = 'force-dynamic';

const KEY = 'nc:kpi:outreach';
const SETTINGS_KEY = 'nc:kpi:settings';

function clean(v) {
  return typeof v === 'string' ? v.trim() : '';
}

export async function GET(request) {
  const session = await validateSession(request.cookies.get('novora_session')?.value);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const list = (await kv.get(KEY)) || [];
  return NextResponse.json(list.filter(e => !e.deleted));
}

export async function POST(request) {
  const session = await validateSession(request.cookies.get('novora_session')?.value);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();

  const settings = (await kv.get(SETTINGS_KEY)) || {};
  const smsCostPerText = typeof settings.smsCostPerText === 'number' ? settings.smsCostPerText : 0.04;
  const contacts = Number(body.contacts) || 0;
  const cost = Math.round(contacts * smsCostPerText * 100) / 100;

  const entry = {
    id: Date.now().toString(),
    listName: clean(body.listName),
    county: clean(body.county),
    campaignId: body.campaignId || null,
    contacts,
    totalReplies: Number(body.totalReplies) || 0,
    positiveReplies: Number(body.positiveReplies) || 0,
    cost,
    status: body.status || 'active',
    date: clean(body.date),
    createdBy: session.userName,
    createdAt: new Date().toISOString(),
    deleted: false,
  };

  const list = (await kv.get(KEY)) || [];
  list.push(entry);
  await kv.set(KEY, list);
  await writeAudit(session.userId, session.userName, 'novora-capital', 'OUTREACH_CREATED', `List: ${entry.listName}, County: ${entry.county}`);
  return NextResponse.json(entry);
}
