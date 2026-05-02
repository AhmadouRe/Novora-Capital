import { NextResponse } from 'next/server';
import { getList, saveList } from '../../../lib/kv.js';
import { validateSession, generateId } from '../../../lib/auth.js';
import { writeAudit } from '../../../lib/audit.js';

export const dynamic = 'force-dynamic';

async function getSessionFromReq(request) {
  return await validateSession(request.cookies.get('novora_session')?.value);
}

export async function GET(request) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const all = await getList('nc:kpi:campaigns');
  return NextResponse.json(all.filter(e => !e.deleted));
}

export async function POST(request) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();

  // name + startDate uniqueness check
  if (body.name && body.startDate) {
    const existing = await getList('nc:kpi:campaigns');
    const dup = existing.find(e =>
      !e.deleted &&
      e.name?.toLowerCase() === body.name?.toLowerCase() &&
      e.startDate === body.startDate
    );
    if (dup) return NextResponse.json({ error: 'Duplicate campaign for this name and start date' }, { status: 409 });
  }

  const campaign = {
    id: generateId(),
    name: body.name || '',
    listType: body.listType || '',
    county: body.county || '',
    startDate: body.startDate || '',
    totalContacts: Number(body.totalContacts) || 0,
    status: body.status || 'active',
    createdBy: session.userName,
    createdAt: new Date().toISOString(),
    deleted: false,
  };

  const list = await getList('nc:kpi:campaigns');
  list.push(campaign);
  await saveList('nc:kpi:campaigns', list);
  await writeAudit(session.userId, session.userName, 'novora-capital', 'CAMPAIGN_CREATED', `Campaign: ${body.name}`);
  return NextResponse.json(campaign);
}
