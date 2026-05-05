import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { validateSession } from '../../../lib/auth.js';
import { writeAudit } from '../../../lib/audit.js';

export const dynamic = 'force-dynamic';

const KEY = 'nc:kpi:sms';

export async function GET(request) {
  const session = await validateSession(request.cookies.get('novora_session')?.value);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const list = (await kv.get(KEY)) || [];
  return NextResponse.json(list.filter(e => !e.deleted));
}

export async function POST(request) {
  const session = await validateSession(request.cookies.get('novora_session')?.value);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();

  const date = typeof body.date === 'string' ? body.date.trim() : '';
  const campaignId = body.campaignId || null;

  // Duplicate check: same date → return existingId so UI can switch to edit mode
  const existing = (await kv.get(KEY)) || [];
  const dup = existing.find(e => !e.deleted && e.date === date);
  if (dup) return NextResponse.json({ error: 'Duplicate SMS entry for this date', existingId: dup.id }, { status: 409 });

  const entry = {
    id: Date.now().toString(),
    date,
    positiveReplies: Number(body.positiveReplies) || 0,
    wantsToSell: Number(body.wantsToSell) || 0,
    qualified: Number(body.qualified) || 0,
    offers: Number(body.offers) || 0,
    contracts: Number(body.contracts) || 0,
    campaignId,
    loggedBy: session.userName,
    loggedAt: new Date().toISOString(),
    deleted: false,
  };

  const list = (await kv.get(KEY)) || [];
  list.push(entry);
  await kv.set(KEY, list);

  await writeAudit(session.userId, session.userName, 'novora-capital', 'SMS_LOGGED', `Date: ${date}`);
  return NextResponse.json(entry);
}
