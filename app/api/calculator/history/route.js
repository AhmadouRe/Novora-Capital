import { NextResponse } from 'next/server';
import { getList, appendItemWithLimit } from '../../../lib/kv.js';
import { validateSession, generateId } from '../../../lib/auth.js';

export const dynamic = 'force-dynamic';

async function getSessionFromReq(request) {
  return await validateSession(request.cookies.get('novora_session')?.value);
}

export async function GET(request) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const list = await getList('nc:calc:history');
  return NextResponse.json(list);
}

export async function POST(request) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const entry = { id: generateId(), ...body, loggedBy: session.userName, savedAt: new Date().toISOString() };
  await appendItemWithLimit('nc:calc:history', entry, 20);
  return NextResponse.json(entry);
}
