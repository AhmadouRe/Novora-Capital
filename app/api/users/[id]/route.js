import { NextResponse } from 'next/server';
import { getList, saveList } from '../../../lib/kv.js';
import { validateSession, hashPin, generateSalt } from '../../../lib/auth.js';
import { writeAudit } from '../../../lib/audit.js';

export const dynamic = 'force-dynamic';

async function requireSession(request) {
  const sessionId = request.cookies.get('novora_session')?.value;
  return await validateSession(sessionId);
}

export async function PUT(request, { params }) {
  try {
    const session = await requireSession(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!session.access?.manageTeam) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = params;
    if (id === 'ahmadou') {
      const body = await request.json();
      if (body.access) return NextResponse.json({ error: 'Cannot modify Ahmadou access' }, { status: 403 });
    }

    const body = await request.json();
    const users = await getList('users:list');
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    if (body.pin) {
      const salt = generateSalt();
      users[idx].salt = salt;
      users[idx].pinHash = hashPin(String(body.pin), salt);
    }
    if (body.access && id !== 'ahmadou') {
      users[idx].access = { ...users[idx].access, ...body.access };
    }
    if (body.active !== undefined && id !== 'ahmadou') {
      users[idx].active = body.active;
    }

    await saveList('users:list', users);
    await writeAudit(session.userId, session.userName, 'novora-capital', 'USER_UPDATED', `Updated user: ${users[idx].name}`);

    const { pinHash, salt, ...safe } = users[idx];
    return NextResponse.json(safe);
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const session = await requireSession(request);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    if (!session.access?.manageTeam) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { id } = params;
    if (id === 'ahmadou') return NextResponse.json({ error: 'Cannot delete Ahmadou' }, { status: 403 });

    const users = await getList('users:list');
    const idx = users.findIndex(u => u.id === id);
    if (idx === -1) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    users[idx].active = false;
    await saveList('users:list', users);
    await writeAudit(session.userId, session.userName, 'novora-capital', 'USER_DEACTIVATED', `Deactivated: ${users[idx].name}`);

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
