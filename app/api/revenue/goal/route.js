import { NextResponse } from 'next/server';
import { getItem, saveItem } from '../../../lib/kv.js';
import { validateSession } from '../../../lib/auth.js';
import { writeAudit } from '../../../lib/audit.js';

export const dynamic = 'force-dynamic';

const DEFAULT_GOAL = { amount: 50000, startDate: '2026-04-25', endDate: '2026-07-25' };

async function getSessionFromReq(request) {
  return await validateSession(request.cookies.get('novora_session')?.value);
}

export async function GET(request) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!session.access?.revenue) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  const goal = await getItem('nc:revenue:goal') || DEFAULT_GOAL;
  return NextResponse.json(goal);
}

export async function PUT(request) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!session.access?.revenue) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  const body = await request.json();
  await saveItem('nc:revenue:goal', body);
  await writeAudit(session.userId, session.userName, 'novora-capital', 'GOAL_UPDATED', `$${body.amount}`);
  return NextResponse.json(body);
}
