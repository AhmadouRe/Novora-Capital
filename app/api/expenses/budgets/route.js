import { NextResponse } from 'next/server';
import { getItem, saveItem } from '../../../lib/kv.js';
import { validateSession } from '../../../lib/auth.js';
import { writeAudit } from '../../../lib/audit.js';

export const dynamic = 'force-dynamic';

const DEFAULT_BUDGETS = { marketing: 0, operating: 0, reserve: 0, owner: 0, taxes: 0 };

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
  await saveItem('nc:expenses:budgets', body);
  await writeAudit(session.userId, session.userName, 'novora-capital', 'BUDGETS_UPDATED', 'Budgets updated');
  return NextResponse.json(body);
}
