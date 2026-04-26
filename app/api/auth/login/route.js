import { NextResponse } from 'next/server';
import { getList, saveList } from '../../../lib/kv.js';
import { verifyPin, createSession, seedUsers } from '../../../lib/auth.js';
import { writeAudit } from '../../../lib/audit.js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    await seedUsers();
    const { name, pin } = await request.json();

    const users = await getList('users:list');
    const user = users.find(u => u.name.toLowerCase() === name.toLowerCase() && u.active);

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    if (user.lockedUntil) {
      const lockTime = new Date(user.lockedUntil).getTime();
      if (Date.now() < lockTime) {
        const remaining = Math.ceil((lockTime - Date.now()) / 1000);
        await writeAudit(user.id, user.name, 'novora-capital', 'LOGIN_BLOCKED', `Locked ${remaining}s remaining`);
        return NextResponse.json({ error: 'Account locked', lockedUntil: user.lockedUntil, remaining }, { status: 403 });
      }
      const idx = users.findIndex(u => u.id === user.id);
      users[idx].lockedUntil = null;
      users[idx].failedAttempts = 0;
      await saveList('users:list', users);
    }

    const valid = verifyPin(pin, user.salt, user.pinHash);

    if (!valid) {
      const idx = users.findIndex(u => u.id === user.id);
      users[idx].failedAttempts = (users[idx].failedAttempts || 0) + 1;
      if (users[idx].failedAttempts >= 5) {
        users[idx].lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
        await saveList('users:list', users);
        await writeAudit(user.id, user.name, 'novora-capital', 'ACCOUNT_LOCKED', '5 failed attempts');
        return NextResponse.json({ error: 'Account locked for 15 minutes', lockedUntil: users[idx].lockedUntil, attempts: 5 }, { status: 403 });
      }
      await saveList('users:list', users);
      await writeAudit(user.id, user.name, 'novora-capital', 'LOGIN_FAILED', `Attempt ${users[idx].failedAttempts}`);
      return NextResponse.json({ error: 'Invalid PIN', attemptsRemaining: 5 - users[idx].failedAttempts }, { status: 401 });
    }

    const idx = users.findIndex(u => u.id === user.id);
    users[idx].failedAttempts = 0;
    users[idx].lockedUntil = null;
    await saveList('users:list', users);

    const sessionId = await createSession(user.id, user.name, user.access, 'novora-capital');
    await writeAudit(user.id, user.name, 'novora-capital', 'LOGIN', 'Successful login');

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, color: user.color, access: user.access },
    });
    response.cookies.set('novora_session', sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 14400,
      path: '/',
    });
    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
