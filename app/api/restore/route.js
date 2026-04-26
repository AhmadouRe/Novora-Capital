import { NextResponse } from 'next/server';
import { restoreItem } from '../../lib/kv.js';
import { validateSession } from '../../lib/auth.js';
import { writeAudit } from '../../lib/audit.js';

export const dynamic = 'force-dynamic';

const KEY_MAP = {
  kpi: 'nc:kpi:wcl',
  sms: 'nc:kpi:sms',
  revenue: 'nc:revenue:deals',
  expenses: 'nc:expenses:entries',
};

async function getSessionFromReq(request) {
  return await validateSession(request.cookies.get('novora_session')?.value);
}

export async function GET(request) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!session.access?.manageTeam) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  const type = searchParams.get('type');

  const key = KEY_MAP[type];
  if (!key) return NextResponse.json({ error: 'Invalid type' }, { status: 400 });

  await restoreItem(key, id);
  await writeAudit(session.userId, session.userName, 'novora-capital', 'ITEM_RESTORED', `Type: ${type}, ID: ${id}`);
  return NextResponse.json({ success: true });
}
