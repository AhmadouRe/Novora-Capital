import { NextResponse } from 'next/server';
import { updateItem, softDeleteItem } from '../../../../lib/kv.js';
import { validateSession } from '../../../../lib/auth.js';
import { writeAudit } from '../../../../lib/audit.js';

export const dynamic = 'force-dynamic';

async function getSessionFromReq(request) {
  return await validateSession(request.cookies.get('novora_session')?.value);
}

export async function PUT(request, { params }) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const updated = await updateItem('nc:kpi:wcl', params.id, body);
  await writeAudit(session.userId, session.userName, 'novora-capital', 'WCL_UPDATED', params.id);
  return NextResponse.json(updated);
}

export async function DELETE(request, { params }) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  await softDeleteItem('nc:kpi:wcl', params.id);
  await writeAudit(session.userId, session.userName, 'novora-capital', 'WCL_DELETED', params.id);
  return NextResponse.json({ success: true });
}
