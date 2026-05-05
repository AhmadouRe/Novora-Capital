import { NextResponse } from 'next/server';
import { getList, saveList, purgeOldDeleted, getItem, saveItem } from '../../lib/kv.js';
import { validateSession, generateId } from '../../lib/auth.js';
import { writeAudit } from '../../lib/audit.js';

export const dynamic = 'force-dynamic';

async function getSessionFromReq(request) {
  return await validateSession(request.cookies.get('novora_session')?.value);
}

export async function GET(request) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!session.access?.expenses) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  const all = await getList('nc:expenses:entries');
  return NextResponse.json(all.filter(e => !e.deleted));
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
    deleted: false,
  };
  let list = await getList('nc:expenses:entries');
  list = purgeOldDeleted(list);
  list.push(entry);
  await saveList('nc:expenses:entries', list);

  /* Deduct from current balance for marketing and operating (non-auto-allocated entries) */
  const account = body.account;
  const amount = parseFloat(body.amount) || 0;
  if (['marketing', 'operating'].includes(account) && amount > 0 && !body.autoAllocated) {
    const balances = await getItem('nc:expenses:manual_balances') || {};
    if (balances[account] !== undefined) {
      balances[account] = Math.max(0, (balances[account] || 0) - amount);
      await saveItem('nc:expenses:manual_balances', balances);
    }
  }

  await writeAudit(session.userId, session.userName, 'novora-capital', 'EXPENSE_LOGGED', `${body.vendor} — $${body.amount}`);
  return NextResponse.json(entry);
}
