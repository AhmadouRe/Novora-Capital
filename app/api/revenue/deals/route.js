import { NextResponse } from 'next/server';
import { getList, saveList, getItem, saveItem, purgeOldDeleted } from '../../../lib/kv.js';
import { validateSession, generateId } from '../../../lib/auth.js';
import { writeAudit } from '../../../lib/audit.js';

export const dynamic = 'force-dynamic';

const DEFAULT_SPLITS = [
  { label: 'Taxes',     pct: 30, color: '#EF4444', key: 'taxes'     },
  { label: 'Marketing', pct: 30, color: '#E8A020', key: 'marketing'  },
  { label: 'Reserve',   pct: 20, color: '#A78BFA', key: 'reserve'    },
  { label: 'Owner Pay', pct: 10, color: '#22C55E', key: 'owner'      },
  { label: 'Operating', pct: 10, color: '#06B6D4', key: 'operating'  },
];

function labelToKey(label) {
  const map = { taxes: 'taxes', marketing: 'marketing', reserve: 'reserve', 'owner pay': 'owner', owner: 'owner', operating: 'operating' };
  return map[label.toLowerCase()] || label.toLowerCase();
}

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

  /* auto-allocate all 5 splits to expense budgets */
  if (body.fee && Number(body.fee) > 0) {
    const fee = Number(body.fee);
    const savedSplits = await getItem('nc:revenue:splits') || DEFAULT_SPLITS;
    const budgets = await getItem('nc:expenses:budgets') || { marketing: 0, operating: 0, reserve: 0, owner: 0, taxes: 0 };

    const splitAmounts = {};
    for (const split of savedSplits) {
      const key = labelToKey(split.label);
      if (!key) continue;
      const amount = Math.round((fee * split.pct) / 100);
      splitAmounts[key] = amount;
      budgets[key] = (budgets[key] || 0) + amount;
    }
    await saveItem('nc:expenses:budgets', budgets);

    /* bump manual_balances for marketing + operating so current balance reflects new revenue */
    const manualBalances = await getItem('nc:expenses:manual_balances') || {};
    for (const key of ['marketing', 'operating']) {
      if (splitAmounts[key] > 0) {
        manualBalances[key] = (typeof manualBalances[key] === 'number' ? manualBalances[key] : 0) + splitAmounts[key];
      }
    }
    await saveItem('nc:expenses:manual_balances', manualBalances);

    /* create one auto-expense entry per split account */
    let expenseList = await getList('nc:expenses:entries');
    expenseList = purgeOldDeleted(expenseList);
    for (const [key, amount] of Object.entries(splitAmounts)) {
      if (amount <= 0) continue;
      expenseList.push({
        id: generateId(),
        account: key,
        vendor: `Auto — ${body.address || 'Deal'}`,
        amount,
        category: 'Auto-Allocated',
        date: body.closeDate || new Date().toISOString().slice(0, 10),
        notes: `Auto-allocated from deal: ${body.address || deal.id}`,
        autoAllocated: true,
        dealId: deal.id,
        loggedBy: session.userName,
        loggedAt: new Date().toISOString(),
        deleted: false,
      });
    }
    await saveList('nc:expenses:entries', expenseList);
  }

  await writeAudit(session.userId, session.userName, 'novora-capital', 'DEAL_LOGGED', `${body.address} — $${body.fee}`);
  return NextResponse.json(deal);
}
