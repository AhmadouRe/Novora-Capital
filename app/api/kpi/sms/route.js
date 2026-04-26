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
  const all = await getList('nc:kpi:sms');
  return NextResponse.json(all.filter(e => !e.deleted));
}

export async function POST(request) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const entry = { id: generateId(), ...body, loggedBy: session.userName, loggedAt: new Date().toISOString(), deleted: false };
  let list = await getList('nc:kpi:sms');
  list = purgeOldDeleted(list);
  list.push(entry);
  await saveList('nc:kpi:sms', list);
  await writeAudit(session.userId, session.userName, 'novora-capital', 'SMS_LOGGED', `Date: ${body.date}`);
  return NextResponse.json(entry);
}
