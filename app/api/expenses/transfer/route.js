import { NextResponse } from 'next/server';
import { getList, saveList, getItem, saveItem } from '../../../lib/kv.js';
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
  const transfers = await getList('nc:expenses:transfers');
  return NextResponse.json(transfers.filter(t => !t.deleted));
}

export async function POST(request) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!session.access?.expenses) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const body = await request.json();
  const { from, to, amount, note, date } = body;

  if (!from || !to || !amount || amount <= 0) {
    return NextResponse.json({ error: 'Invalid transfer data' }, { status: 400 });
  }

  const transfer = {
    id: generateId(),
    from,
    to,
    amount: Number(amount),
    note: note || '',
    date: date || new Date().toISOString().slice(0, 10),
    loggedBy: session.userName,
    loggedAt: new Date().toISOString(),
    deleted: false,
  };

  const transfers = await getList('nc:expenses:transfers');
  transfers.push(transfer);
  await saveList('nc:expenses:transfers', transfers);

  await writeAudit(session.userId, session.userName, 'novora-capital', 'RESERVE_TRANSFER', `Reserve → ${to} — $${amount}`);
  return NextResponse.json(transfer);
}
