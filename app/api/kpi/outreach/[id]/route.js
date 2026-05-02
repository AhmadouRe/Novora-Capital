import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { validateSession } from '../../../../lib/auth.js';
import { writeAudit } from '../../../../lib/audit.js';

export const dynamic = 'force-dynamic';

const KEY = 'nc:kpi:outreach';
const SETTINGS_KEY = 'nc:kpi:settings';

function clean(v) {
  return typeof v === 'string' ? v.trim() : '';
}

export async function PUT(request, { params }) {
  const session = await validateSession(request.cookies.get('novora_session')?.value);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();

  const list = (await kv.get(KEY)) || [];
  const idx = list.findIndex(e => e.id === params.id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const updates = {};
  if (body.listName !== undefined) updates.listName = clean(body.listName);
  if (body.county !== undefined) updates.county = clean(body.county);
  if (body.campaignId !== undefined) updates.campaignId = body.campaignId || null;
  if (body.status !== undefined) updates.status = body.status;
  if (body.totalReplies !== undefined) updates.totalReplies = Number(body.totalReplies) || 0;
  if (body.positiveReplies !== undefined) updates.positiveReplies = Number(body.positiveReplies) || 0;

  if (body.contacts !== undefined) {
    const contacts = Number(body.contacts) || 0;
    const settings = (await kv.get(SETTINGS_KEY)) || {};
    const smsCostPerText = typeof settings.smsCostPerText === 'number' ? settings.smsCostPerText : 0.04;
    updates.contacts = contacts;
    updates.cost = Math.round(contacts * smsCostPerText * 100) / 100;
  }

  list[idx] = { ...list[idx], ...updates, updatedAt: new Date().toISOString() };
  await kv.set(KEY, list);
  await writeAudit(session.userId, session.userName, 'novora-capital', 'OUTREACH_UPDATED', params.id);
  return NextResponse.json(list[idx]);
}

export async function DELETE(request, { params }) {
  const session = await validateSession(request.cookies.get('novora_session')?.value);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const list = (await kv.get(KEY)) || [];
  const idx = list.findIndex(e => e.id === params.id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  list.splice(idx, 1);
  await kv.set(KEY, list);
  await writeAudit(session.userId, session.userName, 'novora-capital', 'OUTREACH_DELETED', params.id);
  return NextResponse.json({ success: true });
}
