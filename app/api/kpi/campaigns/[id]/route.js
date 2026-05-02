import { NextResponse } from 'next/server';
import { getList, saveList } from '../../../../lib/kv.js';
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

  list[idx] = { ...list[idx], ...body, updatedAt: new Date().toISOString() };
  await saveList('nc:kpi:campaigns', list);
  await writeAudit(session.userId, session.userName, 'novora-capital', 'CAMPAIGN_UPDATED', params.id);
  return NextResponse.json(list[idx]);
}

export async function DELETE(request, { params }) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Hard delete campaign and cascade-delete its SMS logs
  const campaigns = await getList('nc:kpi:campaigns');
  const campaign = campaigns.find(c => c.id === params.id);
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updatedCampaigns = campaigns.filter(c => c.id !== params.id);
  await saveList('nc:kpi:campaigns', updatedCampaigns);

  // Cascade: remove sms entries linked to this campaign
  const smsList = await getList('nc:kpi:sms');
  const updatedSms = smsList.filter(s => s.campaignId !== params.id);
  await saveList('nc:kpi:sms', updatedSms);

  await writeAudit(session.userId, session.userName, 'novora-capital', 'CAMPAIGN_DELETED', `${campaign.name} (cascade SMS removed)`);
  return NextResponse.json({ success: true });
}
