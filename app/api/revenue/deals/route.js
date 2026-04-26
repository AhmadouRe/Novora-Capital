import { NextResponse } from 'next/server';
import { getList, saveList, getItem, saveItem, purgeOldDeleted } from '../../../lib/kv.js';
import { validateSession, generateId } from '../../../lib/auth.js';
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
  const all = await getList('nc:revenue:deals');
  return NextResponse.json(all.filter(e => !e.deleted));
}

export async function POST(request) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!session.access?.revenue) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const body = await request.json();
  const deal = {
    id: generateId(),
    ...body,
    loggedBy: session.userName,
    loggedAt: new Date().toISOString(),
    deleted: false,
  };

  let list = await getList('nc:revenue:deals');
  list = purgeOldDeleted(list);
  list.push(deal);
  await saveList('nc:revenue:deals', list);

  // Update marketing budget from split
  const splits = await getItem('nc:revenue:splits') || DEFAULT_SPLITS;
  const marketingSplit = splits.find(s => s.label.toLowerCase() === 'marketing');
  if (marketingSplit && body.fee) {
    const budgets = await getItem('nc:expenses:budgets') || { marketing: 0, operating: 0, reserve: 0, owner: 0, taxes: 0 };
    const marketingAmt = Math.round((body.fee * marketingSplit.pct) / 100);
    budgets.marketing = (budgets.marketing || 0) + marketingAmt;
    await saveItem('nc:expenses:budgets', budgets);
  }

  await writeAudit(session.userId, session.userName, 'novora-capital', 'DEAL_LOGGED', `${body.address} — $${body.fee}`);
  return NextResponse.json(deal);
}
