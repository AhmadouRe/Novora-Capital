import { NextResponse } from 'next/server';
import { getItem, saveItem } from '../../../lib/kv.js';
import { validateSession } from '../../../lib/auth.js';
import { writeAudit } from '../../../lib/audit.js';

export const dynamic = 'force-dynamic';

const DEFAULT_BUDGETS = { marketing: 0, operating: 0, reserve: 0, owner: 0, taxes: 0 };
const VALID_ACCOUNTS = ['marketing', 'operating', 'reserve', 'taxes', 'owner'];

async function getSessionFromReq(request) {
  return await validateSession(request.cookies.get('novora_session')?.value);
}

export async function GET(request) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!session.access?.expenses) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  const budgets = await getItem('nc:expenses:budgets') || DEFAULT_BUDGETS;
  return NextResponse.json(budgets);
}

export async function PUT(request) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!session.access?.expenses) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const body = await request.json();

  /* Individual account update: { account, amount } */
  if (body.account !== undefined && body.amount !== undefined) {
    if (!VALID_ACCOUNTS.includes(body.account)) {
      return NextResponse.json({ error: 'Invalid account' }, { status: 400 });
    }
    const budgets = await getItem('nc:expenses:budgets') || { ...DEFAULT_BUDGETS };
    budgets[body.account] = parseFloat(body.amount) || 0;
    await saveItem('nc:expenses:budgets', budgets);
    await writeAudit(session.userId, session.userName, 'novora-capital', 'BUDGET_UPDATED', `${body.account}: ${body.amount}`);
    return NextResponse.json({ ok: true, budgets });
  }

  /* Legacy: full budgets object replacement */
  await saveItem('nc:expenses:budgets', body);
  await writeAudit(session.userId, session.userName, 'novora-capital', 'BUDGETS_UPDATED', 'Budgets updated');
  return NextResponse.json(body);
}
