import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { validateSession } from '../../../../../lib/auth.js';
import { writeAudit } from '../../../../../lib/audit.js';

export const dynamic = 'force-dynamic';

// POST /api/kpi/campaigns/[id]/merge
// Body: { targetId: string }
// Reassigns all outreach + pipeline entries from source (id) to target (targetId),
// sums contacts, then deletes the source campaign. Atomic via Promise.all.
export async function POST(request, { params }) {
  const session = await validateSession(request.cookies.get('novora_session')?.value);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { targetId } = await request.json();
  if (!targetId) return NextResponse.json({ error: 'targetId is required' }, { status: 400 });
  if (targetId === params.id) return NextResponse.json({ error: 'Cannot merge a campaign into itself' }, { status: 400 });

  const [campaigns, outreach, smsLogs] = await Promise.all([
    kv.get('nc:kpi:campaigns'),
    kv.get('nc:kpi:outreach'),
    kv.get('nc:kpi:sms'),
  ]);

  const campaignList = campaigns || [];
  const source = campaignList.find(c => c.id === params.id);
  const target = campaignList.find(c => c.id === targetId);

  if (!source) return NextResponse.json({ error: 'Source campaign not found' }, { status: 404 });
  if (!target) return NextResponse.json({ error: 'Target campaign not found' }, { status: 404 });

  const outreachList = outreach || [];
  const smsList      = smsLogs  || [];

  const movedOutreach = outreachList.filter(o => o.campaignId === params.id).length;
  const movedSms      = smsList.filter(e => e.campaignId === params.id).length;

  // Reassign outreach entries
  const updatedOutreach = outreachList.map(o =>
    o.campaignId === params.id ? { ...o, campaignId: targetId } : o
  );

  // Reassign pipeline (sms) entries
  const updatedSms = smsList.map(e =>
    e.campaignId === params.id ? { ...e, campaignId: targetId } : e
  );

  // Sum contacts; remove source; update target
  const mergedContacts = (source.contacts || 0) + (target.contacts || 0);
  const updatedCampaigns = campaignList
    .filter(c => c.id !== params.id)
    .map(c => c.id === targetId
      ? { ...c, contacts: mergedContacts, updatedAt: new Date().toISOString() }
      : c
    );

  await Promise.all([
    kv.set('nc:kpi:campaigns', updatedCampaigns),
    kv.set('nc:kpi:outreach', updatedOutreach),
    kv.set('nc:kpi:sms', updatedSms),
  ]);

  await writeAudit(
    session.userId, session.userName, 'novora-capital', 'CAMPAIGN_MERGED',
    `"${source.name}" merged into "${target.name}" — ${movedOutreach} outreach, ${movedSms} pipeline entries reassigned; contacts combined: ${mergedContacts}`
  );

  return NextResponse.json({ success: true, movedOutreach, movedSms, mergedContacts });
}
