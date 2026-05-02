import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { validateSession } from '../../../lib/auth.js';
import { writeAudit } from '../../../lib/audit.js';

export const dynamic = 'force-dynamic';

const SETTINGS_KEY = 'nc:kpi:settings';

export async function GET(request) {
  const session = await validateSession(request.cookies.get('novora_session')?.value);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const settings = (await kv.get(SETTINGS_KEY)) || {};
  return NextResponse.json({ initialized_v3: settings.initialized_v3 === true });
}

export async function POST(request) {
  const session = await validateSession(request.cookies.get('novora_session')?.value);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await Promise.all([
    kv.del('nc:kpi:wcl'),
    kv.del('nc:kpi:sms'),
    kv.del('nc:kpi:campaigns'),
    kv.del('nc:kpi:strategies'),
    kv.del('nc:kpi:outreach'),
  ]);

  const existing = (await kv.get(SETTINGS_KEY)) || {};
  await kv.set(SETTINGS_KEY, { ...existing, initialized_v3: true });

  await writeAudit(session.userId, session.userName, 'novora-capital', 'KPI_WIPED_V3', 'all kpi data cleared');
  return NextResponse.json({ success: true });
}
