import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { validateSession } from '../../../../lib/auth.js';
import { writeAudit } from '../../../../lib/audit.js';

export const dynamic = 'force-dynamic';

const KEY = 'nc:kpi:sms';
const FIELDS = ['positiveReplies', 'wantsToSell', 'qualified', 'offers', 'contracts'];

export async function PUT(request, { params }) {
  const session = await validateSession(request.cookies.get('novora_session')?.value);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();

  const list = (await kv.get(KEY)) || [];
  const idx = list.findIndex(e => e.id === params.id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updates = {};
  for (const f of FIELDS) {
    if (body[f] !== undefined) updates[f] = Number(body[f]) || 0;
  }
  if (body.campaignId !== undefined) updates.campaignId = body.campaignId || null;
  if (body.date !== undefined) updates.date = typeof body.date === 'string' ? body.date.trim() : '';

  list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
  await kv.set(KEY, list);
  await writeAudit(session.userId, session.userName, 'novora-capital', 'SMS_UPDATED', params.id);
  return NextResponse.json(list[idx]);
}

export async function DELETE(request, { params }) {
  const session = await validateSession(request.cookies.get('novora_session')?.value);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const list = (await kv.get(KEY)) || [];
  const idx = list.findIndex(e => e.id === params.id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  list[idx] = { ...list[idx], deleted: true, deletedAt: new Date().toISOString() };
  await kv.set(KEY, list);
  await writeAudit(session.userId, session.userName, 'novora-capital', 'SMS_DELETED', params.id);
  return NextResponse.json({ success: true });
}
