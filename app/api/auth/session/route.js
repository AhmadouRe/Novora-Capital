import { NextResponse } from 'next/server';
import { validateSession, refreshSession } from '../../../lib/auth.js';

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const sessionId = request.cookies.get('novora_session')?.value;
    if (!sessionId) return NextResponse.json({ error: 'No session' }, { status: 401 });

    const session = await refreshSession(sessionId);
    if (!session) return NextResponse.json({ error: 'Invalid session' }, { status: 401 });

    return NextResponse.json({
      userId: session.userId,
      userName: session.userName,
      access: session.access,
      expiresAt: session.expiresAt,
    });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
