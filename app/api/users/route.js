import { NextResponse } from 'next/server';
import { getList, saveList } from '../../lib/kv.js';
import { validateSession, generateSalt, hashPin, generateId } from '../../lib/auth.js';
import { writeAudit } from '../../lib/audit.js';

export const dynamic = 'force-dynamic';

async function requireSession(request) {
  const sessionId = request.cookies.get('novora_session')?.value;
  return await validateSession(sessionId);
}

export async function GET(request) {
  try {
    const session = await requireSession(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const users = await getList('users:list');
    const safe = users.map(({ pinHash, salt, ...u }) => u);
    return NextResponse.json(safe);
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await requireSession(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!session.access?.manageTeam) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { name, pin, color, access } = await request.json();
    if (!name || !pin || !color) return NextResponse.json({ error: 'Missing fields' }, { status: 400 });

    const salt = generateSalt();
    const pinHash = hashPin(String(pin), salt);
    const newUser = {
      id: generateId(),
      name,
      pinHash,
      salt,
      color,
      addedAt: new Date().toISOString(),
      active: true,
      failedAttempts: 0,
      lockedUntil: null,
      access: access || { revenue: false, expenses: false, manageTeam: false },
    };

    const users = await getList('users:list');
    users.push(newUser);
    await saveList('users:list', users);

    await writeAudit(session.userId, session.userName, 'novora-capital', 'USER_CREATED', `Created user: ${name}`);
    const { pinHash: ph, salt: s, ...safe } = newUser;
    return NextResponse.json(safe);
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
