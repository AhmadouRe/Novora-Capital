import { NextResponse } from 'next/server';
import { getItem, saveItem } from '../../../lib/kv.js';
import { validateSession } from '../../../lib/auth.js';

export const dynamic = 'force-dynamic';

async function getSessionFromReq(request) {
  return await validateSession(request.cookies.get('novora_session')?.value);
}

export async function GET(request) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const settings = await getItem('nc:expenses:account_settings') || {};
  return NextResponse.json(settings);
}

export async function PUT(request) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!session.access?.manageTeam) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  const body = await request.json();
  await saveItem('nc:expenses:account_settings', body);
  return NextResponse.json(body);
}
