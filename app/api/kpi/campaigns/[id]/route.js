import { NextResponse } from 'next/server';
import { getList, saveList, softDeleteItem } from '../../../../lib/kv.js';
import { validateSession } from '../../../../lib/auth.js';
import { writeAudit } from '../../../../lib/audit.js';

export const dynamic = 'force-dynamic';

async function getSessionFromReq(request) {
  return await validateSession(request.cookies.get('novora_session')?.value);
}

export async function PUT(request, { params }) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const list = await getList('nc:kpi:campaigns');
  const idx = list.findIndex(c => c.id === params.id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (body.dailyEntry) {
    list[idx].dailyEntries = [...(list[idx].dailyEntries || []), body.dailyEntry];
    delete body.dailyEntry;
  }
  list[idx] = { ...list[idx], ...body, updatedAt: new Date().toISOString() };
  await saveList('nc:kpi:campaigns', list);
  await writeAudit(session.userId, session.userName, 'novora-capital', 'CAMPAIGN_UPDATED', params.id);
  return NextResponse.json(list[idx]);
}

export async function DELETE(request, { params }) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const list = await getList('nc:kpi:campaigns');
  const campaign = list.find(c => c.id === params.id);
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updated = list.filter(c => c.id !== params.id);
  await saveList('nc:kpi:campaigns', updated);
  await writeAudit(session.userId, session.userName, 'novora-capital', 'CAMPAIGN_DELETED', `${campaign.name}`);
  return NextResponse.json({ success: true });
}
