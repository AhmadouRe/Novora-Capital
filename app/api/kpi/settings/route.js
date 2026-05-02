import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { validateSession } from '../../../lib/auth.js';
import { writeAudit } from '../../../lib/audit.js';

export const dynamic = 'force-dynamic';

const SETTINGS_KEY = 'nc:kpi:settings';

const DEFAULTS = {
  wclCost: 4.99,
  smsCostPerText: 0.04,
  positiveReplyFloor: 1.0,
  offerRateFloor: 90,
  minPositiveRepliesForDiag: 10,
  initialized_v3: false,
};

export async function GET(request) {
  const session = await validateSession(request.cookies.get('novora_session')?.value);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const stored = (await kv.get(SETTINGS_KEY)) || {};
  return NextResponse.json({ ...DEFAULTS, ...stored });
}

export async function PUT(request) {
  const session = await validateSession(request.cookies.get('novora_session')?.value);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const current = (await kv.get(SETTINGS_KEY)) || {};
  const updated = { ...DEFAULTS, ...current, ...body };
  await kv.set(SETTINGS_KEY, updated);
  await writeAudit(session.userId, session.userName, 'novora-capital', 'KPI_SETTINGS_UPDATED', JSON.stringify(body));
  return NextResponse.json(updated);
}
