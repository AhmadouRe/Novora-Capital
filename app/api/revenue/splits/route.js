import { NextResponse } from 'next/server';
import { getItem, saveItem } from '../../../lib/kv.js';
import { validateSession } from '../../../lib/auth.js';
import { writeAudit } from '../../../lib/audit.js';

export const dynamic = 'force-dynamic';

const DEFAULT_SPLITS = [
  { label: 'Taxes', pct: 30, color: '#EF4444' },
  { label: 'Owner', pct: 30, color: '#22C55E' },
  { label: 'Marketing', pct: 20, color: '#E8A020' },
  { label: 'Reserve', pct: 12, color: '#A78BFA' },
  { label: 'Operating', pct: 8, color: '#06B6D4' },
];

async function getSessionFromReq(request) {
  return await validateSession(request.cookies.get('novora_session')?.value);
}

export async function GET(request) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!session.access?.revenue) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  const splits = await getItem('nc:revenue:splits') || DEFAULT_SPLITS;
  return NextResponse.json(splits);
}

export async function PUT(request) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!session.access?.revenue) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  const body = await request.json();
  const total = body.reduce((s, sp) => s + Number(sp.pct), 0);
  if (Math.abs(total - 100) > 0.01) return NextResponse.json({ error: 'Splits must total 100%' }, { status: 400 });
  await saveItem('nc:revenue:splits', body);
  await writeAudit(session.userId, session.userName, 'novora-capital', 'SPLITS_UPDATED', 'Revenue splits updated');
  return NextResponse.json(body);
}
