import { NextResponse } from 'next/server';
import { getItem, saveItem } from '../../../lib/kv.js';
import { validateSession } from '../../../lib/auth.js';

export const dynamic = 'force-dynamic';

async function getSessionFromReq(request) {
  return await validateSession(request.cookies.get('novora_session')?.value);
}

export async function GET(request) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const balances = await getItem('nc:expenses:manual_balances') || {};
  return NextResponse.json({ balances });
}

export async function PUT(request) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { account, balance } = await request.json();
  const validAccounts = ['marketing', 'operating', 'reserve', 'taxes', 'owner'];
  if (!validAccounts.includes(account)) return NextResponse.json({ error: 'Invalid account' }, { status: 400 });

  const current = await getItem('nc:expenses:manual_balances') || {};
  current[account] = balance;
  await saveItem('nc:expenses:manual_balances', current);
  return NextResponse.json({ ok: true, account, balance });
}
