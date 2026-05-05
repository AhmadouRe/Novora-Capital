import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { validateSession } from '../../../../lib/auth.js';
import { writeAudit } from '../../../../lib/audit.js';

export const dynamic = 'force-dynamic';

const KEY = 'nc:kpi:outreach';
const LIST_TYPES = ['Pre-Foreclosure', 'Vacant', 'Tired Landlords', 'Probate', 'Tax Delinquent', 'Other'];

function clean(v) {
  return typeof v === 'string' ? v.trim() : '';
}

function parseCounties(raw) {
  if (Array.isArray(raw)) return raw.map(c => String(c).trim()).filter(Boolean);
  if (typeof raw === 'string') return raw.split(',').map(s => s.trim()).filter(Boolean);
  return [];
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
  if (body.listType !== undefined) updates.listType = LIST_TYPES.includes(body.listType) ? body.listType : 'Other';
  if (body.counties !== undefined) updates.counties = parseCounties(body.counties);
  if (body.campaignId !== undefined) updates.campaignId = body.campaignId || null;
  if (body.status !== undefined) updates.status = body.status === 'Complete' ? 'Complete' : 'Active';
  if (body.contacts !== undefined) updates.contacts = Number(body.contacts) || 0;
  if (body.date !== undefined) updates.date = clean(body.date);

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

  list[idx] = { ...list[idx], deleted: true, deletedAt: new Date().toISOString() };
  await kv.set(KEY, list);
  await writeAudit(session.userId, session.userName, 'novora-capital', 'OUTREACH_DELETED', params.id);
  return NextResponse.json({ success: true });
}
