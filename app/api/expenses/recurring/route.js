import { NextResponse } from 'next/server';
import { getList, saveList } from '../../../lib/kv.js';
import { validateSession, generateId } from '../../../lib/auth.js';
import { writeAudit } from '../../../lib/audit.js';

export const dynamic = 'force-dynamic';

async function getSessionFromReq(request) {
  return await validateSession(request.cookies.get('novora_session')?.value);
}

export async function GET(request) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!session.access?.expenses) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  const list = await getList('nc:expenses:recurring');
  return NextResponse.json(list.filter(r => !r.deleted));
}

export async function POST(request) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!session.access?.expenses) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const body = await request.json();
  const entry = {
    id: generateId(),
    ...body,
    loggedBy: session.userName,
    loggedAt: new Date().toISOString(),
    active: true,
    deleted: false,
  };

  const list = await getList('nc:expenses:recurring');
  list.push(entry);
  await saveList('nc:expenses:recurring', list);

  await writeAudit(session.userId, session.userName, 'novora-capital', 'RECURRING_ADDED', `${body.vendor} — $${body.amount} ${body.frequency}`);
  return NextResponse.json(entry);
}
