import { NextResponse } from 'next/server';
import { getList, getItem } from '../../lib/kv.js';
import { validateSession } from '../../lib/auth.js';

export const dynamic = 'force-dynamic';

async function getSessionFromReq(request) {
  return await validateSession(request.cookies.get('novora_session')?.value);
}

export async function GET(request) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!session.access?.revenue || !session.access?.expenses) return NextResponse.json({ error: 'Access denied' }, { status: 403 });

  const [deals, goal, splits, expenses, budgets, wcl, sms, campaigns, strategies, calcHistory, scoreHistory, users, auditLog] = await Promise.all([
    getList('nc:revenue:deals'),
    getItem('nc:revenue:goal'),
    getItem('nc:revenue:splits'),
    getList('nc:expenses:entries'),
    getItem('nc:expenses:budgets'),
    getList('nc:kpi:wcl'),
    getList('nc:kpi:sms'),
    getList('nc:kpi:campaigns'),
    getList('nc:kpi:strategies'),
    getList('nc:calc:history'),
    getList('nc:scorecard:history'),
    getList('users:list'),
    getList('audit:log'),
  ]);

  const backup = {
    exportedAt: new Date().toISOString(),
    exportedBy: session.userName,
    data: {
      'nc:revenue:deals': deals,
      'nc:revenue:goal': goal,
      'nc:revenue:splits': splits,
      'nc:expenses:entries': expenses,
      'nc:expenses:budgets': budgets,
      'nc:kpi:wcl': wcl,
      'nc:kpi:sms': sms,
      'nc:kpi:campaigns': campaigns,
      'nc:kpi:strategies': strategies,
      'nc:calc:history': calcHistory,
      'nc:scorecard:history': scoreHistory,
      'users:list': users.map(({ pinHash, salt, ...u }) => u),
      'audit:log': auditLog,
    },
  };

  return new NextResponse(JSON.stringify(backup, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="novora-backup-${new Date().toISOString().slice(0,10)}.json"`,
    },
  });
}
