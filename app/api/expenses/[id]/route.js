import { NextResponse } from 'next/server';
import { softDeleteItem } from '../../../lib/kv.js';
import { validateSession } from '../../../lib/auth.js';
import { writeAudit } from '../../../lib/audit.js';

export const dynamic = 'force-dynamic';

async function getSessionFromReq(request) {
  return await validateSession(request.cookies.get('novora_session')?.value);
}

export async function DELETE(request, { params }) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!session.access?.expenses) return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  await softDeleteItem('nc:expenses:entries', params.id);
  await writeAudit(session.userId, session.userName, 'novora-capital', 'EXPENSE_DELETED', params.id);
  return NextResponse.json({ success: true });
}
