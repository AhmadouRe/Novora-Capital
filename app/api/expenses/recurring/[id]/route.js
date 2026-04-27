import { NextResponse } from 'next/server';
import { getList, saveList } from '../../../../lib/kv.js';
import { validateSession } from '../../../../lib/auth.js';
import { writeAudit } from '../../../../lib/audit.js';

export const dynamic = 'force-dynamic';

async function getSessionFromReq(request) {
  return await validateSession(request.cookies.get('novora_session')?.value);
}

export async function PUT(request, { params }) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!session.access?.expenses) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const body = await request.json();
  const list = await getList('nc:expenses:recurring');
  const idx = list.findIndex(r => r.id === params.id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  list[idx] = { ...list[idx], ...body, updatedAt: new Date().toISOString() };
  await saveList('nc:expenses:recurring', list);

  await writeAudit(session.userId, session.userName, 'novora-capital', 'RECURRING_UPDATED', `${list[idx].vendor}`);
  return NextResponse.json(list[idx]);
}

export async function DELETE(request, { params }) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!session.access?.expenses) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const list = await getList('nc:expenses:recurring');
  const idx = list.findIndex(r => r.id === params.id);
  if (idx === -1) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  list[idx] = { ...list[idx], deleted: true, deletedAt: new Date().toISOString() };
  await saveList('nc:expenses:recurring', list);

  await writeAudit(session.userId, session.userName, 'novora-capital', 'RECURRING_DELETED', params.id);
  return NextResponse.json({ success: true });
}
