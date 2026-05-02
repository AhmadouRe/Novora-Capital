import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { validateSession } from '../../../lib/auth.js';
import { writeAudit } from '../../../lib/audit.js';

export const dynamic = 'force-dynamic';

async function getSessionFromReq(request) {
  return await validateSession(request.cookies.get('novora_session')?.value);
}

export async function POST(request) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await kv.del('nc:kpi:wcl');
    await kv.del('nc:kpi:sms');
    await kv.del('nc:kpi:campaigns');
    await kv.del('nc:kpi:strategies');
    await kv.set('nc:kpi:initialized_v2', true);
    await writeAudit(session.userId, session.userName, 'novora-capital', 'KPI_WIPED', 'All KPI data wiped and initialized v2');
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: 'Wipe failed', detail: String(err) }, { status: 500 });
  }
}

export async function GET(request) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    const initialized = await kv.get('nc:kpi:initialized_v2');
    return NextResponse.json({ initialized: !!initialized });
  } catch {
    return NextResponse.json({ initialized: false });
  }
}
