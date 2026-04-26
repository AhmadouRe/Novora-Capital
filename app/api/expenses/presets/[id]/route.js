import { NextResponse } from 'next/server';
import { getList, saveList } from '../../../../lib/kv.js';
import { validateSession } from '../../../../lib/auth.js';

export const dynamic = 'force-dynamic';

async function getSessionFromReq(request) {
  return await validateSession(request.cookies.get('novora_session')?.value);
}

export async function DELETE(request, { params }) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const list = await getList('nc:expenses:presets');
  const updated = list.filter(p => p.id !== params.id);
  await saveList('nc:expenses:presets', updated);
  return NextResponse.json({ success: true });
}
