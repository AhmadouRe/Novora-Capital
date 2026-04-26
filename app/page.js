import { cookies } from 'next/headers';
import { validateSession, seedUsers } from './lib/auth.js';
import LoginFlow from './components/LoginFlow.js';
import Dashboard from './components/Dashboard.js';

export const dynamic = 'force-dynamic';

export default async function Home() {
  await seedUsers();

  const cookieStore = cookies();
  const sessionCookie = cookieStore.get('novora_session');
  let session = null;
  if (sessionCookie?.value) {
    session = await validateSession(sessionCookie.value);
  }

  if (!session) {
    return <LoginFlow />;
  }

  return <Dashboard session={session} />;
}
