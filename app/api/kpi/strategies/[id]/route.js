import { NextResponse } from 'next/server';
import { getList, saveList } from '../../../../lib/kv.js';
import { validateSession } from '../../../../lib/auth.js';

export const dynamic = 'force-dynamic';

async function getSessionFromReq(request) {
  return await validateSession(request.cookies.get('novora_session')?.value);
}

export async function PUT(request, { params }) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const list = await getList('nc:kpi:strategies');
  const idx = list.findIndex(s => s.id === params.id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  list[idx] = { ...list[idx], ...body };
  await saveList('nc:kpi:strategies', list);
  return NextResponse.json(list[idx]);
}

export async function DELETE(request, { params }) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const list = await getList('nc:kpi:strategies');
  const strategy = list.find(s => s.id === params.id);
  if (!strategy) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (strategy.builtin) return NextResponse.json({ error: 'Cannot delete built-in strategy' }, { status: 400 });
  const updated = list.filter(s => s.id !== params.id);
  await saveList('nc:kpi:strategies', updated);
  return NextResponse.json({ success: true });
}
