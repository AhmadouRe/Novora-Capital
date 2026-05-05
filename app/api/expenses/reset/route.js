import { NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
import { validateSession } from '../../../lib/auth.js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  const session = await validateSession(request.cookies.get('novora_session')?.value);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  await kv.set('nc:expenses:entries', []);
  await kv.set('nc:expenses:budgets', {
    marketing: 0, operating: 0, reserve: 0, owner: 0, taxes: 0,
  });
  await kv.set('nc:expenses:manual_balances', {
    marketing: 0, operating: 0, reserve: 0, owner: 0, taxes: 0,
  });
  await kv.set('nc:expenses:recurring', []);

  /* Mark as done so it never runs again */
  const s = (await kv.get('nc:kpi:settings')) || {};
  s.expenses_reset_v2 = true;
  await kv.set('nc:kpi:settings', s);

  return NextResponse.json({ ok: true });
}
