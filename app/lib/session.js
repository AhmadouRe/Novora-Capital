import { cookies } from 'next/headers';
import { validateSession, refreshSession } from './auth.js';

export async function getSession() {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('novora_session');
    if (!sessionCookie?.value) return null;
    return await validateSession(sessionCookie.value);
  } catch {
    return null;
  }
}

export async function getSessionAndRefresh() {
  try {
    const cookieStore = cookies();
    const sessionCookie = cookieStore.get('novora_session');
    if (!sessionCookie?.value) return null;
    return await refreshSession(sessionCookie.value);
  } catch {
    return null;
  }
}
