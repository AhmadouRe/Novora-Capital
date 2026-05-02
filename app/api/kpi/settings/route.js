import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { validateSession } from '../../../lib/auth.js';
import { writeAudit } from '../../../lib/audit.js';

export const dynamic = 'force-dynamic';

const SETTINGS_KEY = 'nc:kpi:settings';

const DEFAULTS = {
  wclCost: 4.99,
  smsCostPerText: 0.04,
  diagnosticMinDays: 5,
  interestedReplyFloor: 2.0,
  offerRateFloor: 90,
};

async function getSessionFromReq(request) {
  return await validateSession(request.cookies.get('novora_session')?.value);
}

export async function GET(request) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const stored = await kv.get(SETTINGS_KEY);
    return NextResponse.json({ ...DEFAULTS, ...(stored || {}) });
  } catch {
    return NextResponse.json(DEFAULTS);
  }
}

export async function PUT(request) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const current = await kv.get(SETTINGS_KEY) || {};
  const updated = { ...DEFAULTS, ...current, ...body };
  await kv.set(SETTINGS_KEY, updated);
  await writeAudit(session.userId, session.userName, 'novora-capital', 'KPI_SETTINGS_UPDATED', JSON.stringify(body));
  return NextResponse.json(updated);
}
