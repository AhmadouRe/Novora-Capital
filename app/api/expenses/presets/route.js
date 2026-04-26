import { NextResponse } from 'next/server';
import { getList, saveList } from '../../../lib/kv.js';
import { validateSession, generateId } from '../../../lib/auth.js';

export const dynamic = 'force-dynamic';

async function getSessionFromReq(request) {
  return await validateSession(request.cookies.get('novora_session')?.value);
}

export async function GET(request) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const list = await getList('nc:expenses:presets');
  return NextResponse.json(list);
}

export async function POST(request) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const preset = { id: generateId(), ...body };
  const list = await getList('nc:expenses:presets');
  list.push(preset);
  await saveList('nc:expenses:presets', list);
  return NextResponse.json(preset);
}
