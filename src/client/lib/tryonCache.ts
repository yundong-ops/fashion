const DB_NAME = 'fitmate-tryon-cache';
const STORE = 'images';
const MAX_ENTRIES = 30;

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'key' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export interface CacheEntry {
  key: string;
  blob: Blob;
  savedAt: number;
}

export async function getCached(key: string): Promise<Blob | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve((req.result as CacheEntry | undefined)?.blob ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function setCached(key: string, blob: Blob): Promise<void> {
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put({ key, blob, savedAt: Date.now() } satisfies CacheEntry);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
  await evictOldest(db);
}

async function evictOldest(db: IDBDatabase): Promise<void> {
  const all = await new Promise<CacheEntry[]>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readonly');
    const req = tx.objectStore(STORE).getAll();
    req.onsuccess = () => resolve(req.result as CacheEntry[]);
    req.onerror = () => reject(req.error);
  });

  if (all.length <= MAX_ENTRIES) return;

  const toEvict = all.sort((a, b) => a.savedAt - b.savedAt).slice(0, all.length - MAX_ENTRIES);
  const tx = db.transaction(STORE, 'readwrite');
  for (const entry of toEvict) tx.objectStore(STORE).delete(entry.key);
}

export async function clearCache(): Promise<void> {
  const db = await openDb();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).clear();
}
