import { kv } from '@vercel/kv';

export async function getList(key) {
  try {
    const data = await kv.get(key);
    return data || [];
  } catch {
    return [];
  }
}

export async function getItem(key) {
  try {
    const data = await kv.get(key);
    return data;
  } catch {
    return null;
  }
}

export async function saveList(key, arr) {
  await kv.set(key, arr);
}

export async function saveItem(key, value) {
  await kv.set(key, value);
}

export async function appendItem(key, item) {
  const list = await getList(key);
  const updated = [...list, item];
  await saveList(key, updated);
  return updated;
}

export async function appendItemWithLimit(key, item, max) {
  const list = await getList(key);
  const updated = [item, ...list].slice(0, max);
  await saveList(key, updated);
  return updated;
}

export async function updateItem(key, id, updates) {
  const list = await getList(key);
  const updated = list.map(item =>
    item.id === id ? { ...item, ...updates, updatedAt: new Date().toISOString() } : item
  );
  await saveList(key, updated);
  return updated.find(i => i.id === id);
}

export async function softDeleteItem(key, id) {
  return updateItem(key, id, { deleted: true, deletedAt: new Date().toISOString() });
}

export async function restoreItem(key, id) {
  return updateItem(key, id, { deleted: false, deletedAt: null });
}

export function purgeOldDeleted(arr) {
  const cutoff = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return arr.filter(item => {
    if (!item.deleted) return true;
    if (!item.deletedAt) return false;
    return new Date(item.deletedAt) > cutoff;
  });
}

export async function deleteKV(key) {
  await kv.del(key);
}
