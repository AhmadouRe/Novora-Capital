import { NextResponse } from 'next/server';
import { getList, saveList, purgeOldDeleted } from '../../../lib/kv.js';
import { validateSession, generateId } from '../../../lib/auth.js';
import { writeAudit } from '../../../lib/audit.js';

export const dynamic = 'force-dynamic';

async function getSessionFromReq(request) {
  return await validateSession(request.cookies.get('novora_session')?.value);
}

export async function GET(request) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const all = await getList('nc:kpi:wcl');
  return NextResponse.json(all.filter(e => !e.deleted));
}

export async function POST(request) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();

  // 409 duplicate detection: same date
  if (body.date) {
    const existing = await getList('nc:kpi:wcl');
    const dup = existing.find(e => !e.deleted && e.date === body.date);
    if (dup) return NextResponse.json({ error: 'Duplicate WCL entry for this date' }, { status: 409 });
  }

  const entry = {
    id: generateId(),
    date: body.date || '',
    received: Number(body.received) || 0,
    accepted: Number(body.accepted) || 0,
    conversations: Number(body.conversations) || 0,
    qualified: Number(body.qualified) || 0,
    offers: Number(body.offers) || 0,
    contracts: Number(body.contracts) || 0,
    closed: Number(body.closed) || 0,
    rejectionReasons: body.rejectionReasons || '',
    loggedBy: session.userName,
    loggedAt: new Date().toISOString(),
    deleted: false,
  };

  let list = await getList('nc:kpi:wcl');
  list = purgeOldDeleted(list);
  list.push(entry);
  await saveList('nc:kpi:wcl', list);
  await writeAudit(session.userId, session.userName, 'novora-capital', 'WCL_LOGGED', `Date: ${body.date}`);
  return NextResponse.json(entry);
}
