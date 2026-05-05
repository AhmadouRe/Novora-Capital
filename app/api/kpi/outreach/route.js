import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { validateSession } from '../../../lib/auth.js';
import { writeAudit } from '../../../lib/audit.js';

export const dynamic = 'force-dynamic';

const KEY = 'nc:kpi:outreach';
const LIST_TYPES = ['Pre-Foreclosure', 'Vacant', 'Tired Landlords', 'Probate', 'Tax Delinquent', 'Other'];

function clean(v) {
  return typeof v === 'string' ? v.trim() : '';
}

function parseCounties(raw) {
  if (Array.isArray(raw)) return raw.map(c => String(c).trim()).filter(Boolean);
  if (typeof raw === 'string') return raw.split(',').map(s => s.trim()).filter(Boolean);
  return [];
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

  const entry = {
    id: Date.now().toString(),
    listName: clean(body.listName),
    counties: parseCounties(body.counties),
    listType: LIST_TYPES.includes(body.listType) ? body.listType : 'Other',
    campaignId: body.campaignId || null,
    contacts: Number(body.contacts) || 0,
    status: body.status === 'Complete' ? 'Complete' : 'Active',
    date: clean(body.date),
    createdBy: session.userName,
    createdAt: new Date().toISOString(),
    deleted: false,
  };

  const list = (await kv.get(KEY)) || [];
  list.push(entry);
  await kv.set(KEY, list);
  await writeAudit(session.userId, session.userName, 'novora-capital', 'OUTREACH_CREATED', `List: ${entry.listName}, Type: ${entry.listType}`);
  return NextResponse.json(entry);
}
