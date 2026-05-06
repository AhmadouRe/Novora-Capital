import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { validateSession } from '../../../../lib/auth.js';
import { writeAudit } from '../../../../lib/audit.js';

export const dynamic = 'force-dynamic';

function clean(v) {
  return typeof v === 'string' ? v.trim() : '';
}

export async function PUT(request, { params }) {
  const session = await validateSession(request.cookies.get('novora_session')?.value);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();

  const campaigns = (await kv.get('nc:kpi:campaigns')) || [];
  const idx = campaigns.findIndex(c => c.id === params.id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updates = {};
  if (body.name !== undefined) updates.name = clean(body.name);
  if (body.counties !== undefined) updates.counties = Array.isArray(body.counties) ? body.counties.map(s => clean(s)).filter(Boolean) : [];
  if (body.status !== undefined) updates.status = body.status === 'closed' ? 'closed' : 'active';
  if (body.startDate !== undefined) updates.startDate = clean(body.startDate);
  if (body.contacts !== undefined) updates.contacts = Math.max(0, parseInt(String(body.contacts||'').replace(/[^0-9]/g,''))||0);

  campaigns[idx] = { ...campaigns[idx], ...updates, updatedAt: new Date().toISOString() };
  await kv.set('nc:kpi:campaigns', campaigns);
  await writeAudit(session.userId, session.userName, 'novora-capital', 'CAMPAIGN_UPDATED', params.id);
  return NextResponse.json(campaigns[idx]);
}

export async function DELETE(request, { params }) {
  const session = await validateSession(request.cookies.get('novora_session')?.value);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const [campaigns, outreach, wclLogs, smsLogs] = await Promise.all([
    kv.get('nc:kpi:campaigns'),
    kv.get('nc:kpi:outreach'),
    kv.get('nc:kpi:wcl'),
    kv.get('nc:kpi:sms'),
  ]);

  const campaignList = campaigns || [];
  const campaign = campaignList.find(c => c.id === params.id);
  if (!campaign) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updatedCampaigns = campaignList.filter(c => c.id !== params.id);
  const updatedOutreach = (outreach || []).filter(o => o.campaignId !== params.id);
  const updatedWcl = (wclLogs || []).map(e => e.campaignId === params.id ? { ...e, campaignId: null } : e);
  const updatedSms = (smsLogs || []).map(e => e.campaignId === params.id ? { ...e, campaignId: null } : e);

  await Promise.all([
    kv.set('nc:kpi:campaigns', updatedCampaigns),
    kv.set('nc:kpi:outreach', updatedOutreach),
    kv.set('nc:kpi:wcl', updatedWcl),
    kv.set('nc:kpi:sms', updatedSms),
  ]);

  await writeAudit(session.userId, session.userName, 'novora-capital', 'CAMPAIGN_DELETED', `${campaign.name} (cascade: outreach removed, wcl/sms unlinked)`);
  return NextResponse.json({ success: true });
}
