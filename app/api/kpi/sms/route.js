import { NextResponse } from 'next/server';
import { getList, saveList, purgeOldDeleted } from '../../../lib/kv.js';
import { validateSession, generateId } from '../../../lib/auth.js';
import { writeAudit } from '../../../lib/audit.js';

export const dynamic = 'force-dynamic';

async function getSessionFromReq(request) {
  return await validateSession(request.cookies.get('novora_session')?.value);
}

export async function GET(request) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const all = await getList('nc:kpi:sms');
  return NextResponse.json(all.filter(e => !e.deleted));
}

export async function POST(request) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();

  // 409 duplicate detection: same campaignId + date
  if (body.campaignId && body.date) {
    const existing = await getList('nc:kpi:sms');
    const dup = existing.find(e => !e.deleted && e.campaignId === body.campaignId && e.date === body.date);
    if (dup) return NextResponse.json({ error: 'Duplicate SMS entry for this campaign and date' }, { status: 409 });
  }

  const entry = {
    id: generateId(),
    campaignId: body.campaignId || '',
    date: body.date || '',
    sent: Number(body.sent) || 0,
    totalReplies: Number(body.totalReplies) || 0,
    interestedReplies: Number(body.interestedReplies) || 0,
    optouts: Number(body.optouts) || 0,
    conversations: Number(body.conversations) || 0,
    qualified: Number(body.qualified) || 0,
    offers: Number(body.offers) || 0,
    contracts: Number(body.contracts) || 0,
    closed: Number(body.closed) || 0,
    cost: Number(body.cost) || 0,
    loggedBy: session.userName,
    loggedAt: new Date().toISOString(),
    deleted: false,
  };

  let list = await getList('nc:kpi:sms');
  list = purgeOldDeleted(list);
  list.push(entry);
  await saveList('nc:kpi:sms', list);
  await writeAudit(session.userId, session.userName, 'novora-capital', 'SMS_LOGGED', `Campaign: ${body.campaignId}, Date: ${body.date}`);
  return NextResponse.json(entry);
}
