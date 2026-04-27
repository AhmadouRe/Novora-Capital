import { NextResponse } from 'next/server';
import { getList, saveList, getItem, saveItem, softDeleteItem } from '../../../../lib/kv.js';
import { validateSession } from '../../../../lib/auth.js';
import { writeAudit } from '../../../../lib/audit.js';

export const dynamic = 'force-dynamic';

const DEFAULT_SPLITS = [
  { label: 'Taxes',     pct: 30, key: 'taxes'     },
  { label: 'Marketing', pct: 30, key: 'marketing'  },
  { label: 'Reserve',   pct: 20, key: 'reserve'    },
  { label: 'Owner Pay', pct: 10, key: 'owner'      },
  { label: 'Operating', pct: 10, key: 'operating'  },
];

function labelToKey(label) {
  const map = { taxes: 'taxes', marketing: 'marketing', reserve: 'reserve', 'owner pay': 'owner', owner: 'owner', operating: 'operating' };
  return map[label.toLowerCase()] || label.toLowerCase();
}

async function getSessionFromReq(request) {
  return await validateSession(request.cookies.get('novora_session')?.value);
}

export async function PUT(request, { params }) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!session.access?.revenue) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const body = await request.json();
  const dealList = await getList('nc:revenue:deals');
  const idx = dealList.findIndex(d => d.id === params.id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const oldDeal = dealList[idx];
  const oldFee = Number(oldDeal.fee || 0);
  const newFee = Number(body.fee || oldFee);

  dealList[idx] = { ...oldDeal, ...body, updatedAt: new Date().toISOString() };
  await saveList('nc:revenue:deals', dealList);

  // Recalculate expense allocations if fee changed
  if (oldFee !== newFee) {
    const splits = await getItem('nc:revenue:splits') || DEFAULT_SPLITS;
    const budgets = await getItem('nc:expenses:budgets') || { marketing: 0, operating: 0, reserve: 0, owner: 0, taxes: 0 };

    // Reverse old allocations and apply new ones
    for (const split of splits) {
      const key = labelToKey(split.label);
      if (!key) continue;
      const oldAmt = Math.round((oldFee * split.pct) / 100);
      const newAmt = Math.round((newFee * split.pct) / 100);
      budgets[key] = Math.max(0, (budgets[key] || 0) - oldAmt + newAmt);
    }
    await saveItem('nc:expenses:budgets', budgets);

    // Update auto-expense entries for this deal
    const expList = await getList('nc:expenses:entries');
    for (const split of splits) {
      const key = labelToKey(split.label);
      const entryIdx = expList.findIndex(e => e.dealId === params.id && e.account === key && e.autoAllocated);
      const newAmt = Math.round((newFee * split.pct) / 100);
      if (entryIdx !== -1) {
        expList[entryIdx] = { ...expList[entryIdx], amount: newAmt, updatedAt: new Date().toISOString() };
      }
    }
    await saveList('nc:expenses:entries', expList);
  }

  await writeAudit(session.userId, session.userName, 'novora-capital', 'DEAL_UPDATED', `${body.address || oldDeal.address} — $${newFee}`);
  return NextResponse.json(dealList[idx]);
}

export async function DELETE(request, { params }) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!session.access?.revenue) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  // Get deal info before deleting
  const dealList = await getList('nc:revenue:deals');
  const deal = dealList.find(d => d.id === params.id);

  await softDeleteItem('nc:revenue:deals', params.id);

  // Reverse expense allocations
  if (deal && Number(deal.fee) > 0) {
    const fee = Number(deal.fee);
    const splits = await getItem('nc:revenue:splits') || DEFAULT_SPLITS;
    const budgets = await getItem('nc:expenses:budgets') || { marketing: 0, operating: 0, reserve: 0, owner: 0, taxes: 0 };

    for (const split of splits) {
      const key = labelToKey(split.label);
      if (!key) continue;
      const amt = Math.round((fee * split.pct) / 100);
      budgets[key] = Math.max(0, (budgets[key] || 0) - amt);
    }
    await saveItem('nc:expenses:budgets', budgets);

    // Soft-delete matching auto-expense entries
    const expList = await getList('nc:expenses:entries');
    let changed = false;
    for (let i = 0; i < expList.length; i++) {
      if (expList[i].dealId === params.id && expList[i].autoAllocated) {
        expList[i] = { ...expList[i], deleted: true, deletedAt: new Date().toISOString() };
        changed = true;
      }
    }
    if (changed) await saveList('nc:expenses:entries', expList);
  }

  await writeAudit(session.userId, session.userName, 'novora-capital', 'DEAL_DELETED', `${deal?.address || params.id} — expense allocations reversed`);
  return NextResponse.json({ success: true });
}
