import { NextResponse } from 'next/server';
import { deleteSession, validateSession } from '../../../lib/auth.js';
import { writeAudit } from '../../../lib/audit.js';

export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const sessionId = request.cookies.get('novora_session')?.value;
    if (sessionId) {
      const session = await validateSession(sessionId);
      if (session) {
        await writeAudit(session.userId, session.userName, 'novora-capital', 'LOGOUT', 'User logged out');
      }
      await deleteSession(sessionId);
    }
    const response = NextResponse.json({ success: true });
    response.cookies.set('novora_session', '', { maxAge: 0, path: '/' });
    return response;
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
