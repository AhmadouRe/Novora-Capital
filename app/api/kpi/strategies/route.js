import { NextResponse } from 'next/server';
import { getList, saveList } from '../../../lib/kv.js';
import { validateSession, generateId } from '../../../lib/auth.js';

export const dynamic = 'force-dynamic';

const BUILTIN_STRATEGIES = [
  { id: 'wcl', name: 'WCL/Propwire', color: '#E8A020', notes: 'Warm inbound seller leads', builtin: true, active: true },
  { id: 'sms', name: 'SMS Outreach', color: '#A78BFA', notes: 'SMS campaign outreach', builtin: true, active: true },
  { id: 'jv', name: 'JV/InvestorBase', color: '#06B6D4', notes: 'Joint venture network', builtin: true, active: true },
];

async function getSessionFromReq(request) {
  return await validateSession(request.cookies.get('novora_session')?.value);
}

async function ensureStrategies() {
  let list = await getList('nc:kpi:strategies');
  if (!list || list.length === 0) {
    await saveList('nc:kpi:strategies', BUILTIN_STRATEGIES);
    return BUILTIN_STRATEGIES;
  }
  return list;
}

export async function GET(request) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const list = await ensureStrategies();
  return NextResponse.json(list);
}

export async function POST(request) {
  const session = await getSessionFromReq(request);
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const strategy = { id: generateId(), ...body, builtin: false, active: true };
  const list = await ensureStrategies();
  list.push(strategy);
  await saveList('nc:kpi:strategies', list);
  return NextResponse.json(strategy);
}
