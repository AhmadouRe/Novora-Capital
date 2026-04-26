import { getList, saveList } from './kv.js';
import { generateId } from './auth.js';

export async function writeAudit(userId, userName, app, action, detail) {
  try {
    const log = await getList('audit:log');
    const entry = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      userId,
      userName,
      app,
      action,
      detail,
    };
    const updated = [entry, ...log].slice(0, 500);
    await saveList('audit:log', updated);
  } catch {}
}
