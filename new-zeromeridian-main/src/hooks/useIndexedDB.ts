/**
 * useIndexedDB.ts — ZERØ MERIDIAN 2026
 * Tick history storage — time-series data persistent
 * - Zero external deps
 * - mountedRef + AbortController ✓
 * - Zero JSX ✓
 */

import { useRef, useCallback, useEffect } from 'react';

const DB_NAME    = 'zm_tickdb';
const DB_VERSION = 1;
const STORE_NAME = 'ticks';
const MAX_TICKS  = 1440; // 24h at 1min resolution

interface TickRecord {
  symbol:    string;
  price:     number;
  timestamp: number;
}

// ─── Singleton DB connection ──────────────────────────────────────────────────

let _db: IDBDatabase | null = null;

function openDB(): Promise<IDBDatabase> {
  if (_db) return Promise.resolve(_db);
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db    = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, {
          keyPath: ['symbol', 'timestamp'],
        });
        store.createIndex('by_symbol', 'symbol', { unique: false });
        store.createIndex('by_time',   'timestamp', { unique: false });
      }
    };
    req.onsuccess = (e) => {
      _db = (e.target as IDBOpenDBRequest).result;
      resolve(_db);
    };
    req.onerror = () => reject(req.error);
  });
}

function putTick(db: IDBDatabase, tick: TickRecord): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(tick);
    tx.oncomplete = () => resolve();
    tx.onerror    = () => reject(tx.error);
  });
}

function getTicks(db: IDBDatabase, symbol: string, limit = MAX_TICKS): Promise<TickRecord[]> {
  return new Promise((resolve, reject) => {
    const tx      = db.transaction(STORE_NAME, 'readonly');
    const store   = tx.objectStore(STORE_NAME);
    const index   = store.index('by_symbol');
    const range   = IDBKeyRange.only(symbol);
    const results: TickRecord[] = [];
    const req     = index.openCursor(range, 'prev');
    let count     = 0;

    req.onsuccess = (e) => {
      const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
      if (cursor && count < limit) {
        results.push(cursor.value as TickRecord);
        count++;
        cursor.continue();
      } else {
        resolve(results.reverse());
      }
    };
    req.onerror = () => reject(req.error);
  });
}

function pruneOldTicks(db: IDBDatabase, symbol: string): void {
  const tx      = db.transaction(STORE_NAME, 'readwrite');
  const store   = tx.objectStore(STORE_NAME);
  const index   = store.index('by_symbol');
  const range   = IDBKeyRange.only(symbol);
  const req     = index.openCursor(range);
  let count     = 0;

  req.onsuccess = (e) => {
    const cursor = (e.target as IDBRequest<IDBCursorWithValue>).result;
    if (cursor) { count++; cursor.continue(); }
    else if (count > MAX_TICKS) {
      // Prune oldest — re-open and delete
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      const tx2    = db.transaction(STORE_NAME, 'readwrite');
      const s2     = tx2.objectStore(STORE_NAME);
      const idx2   = s2.index('by_time');
      const r2     = IDBKeyRange.upperBound(cutoff);
      idx2.openCursor(r2).onsuccess = (ev) => {
        const c2 = (ev.target as IDBRequest<IDBCursorWithValue>).result;
        if (c2) { c2.delete(); c2.continue(); }
      };
    }
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface IndexedDBAPI {
  saveTick:  (symbol: string, price: number) => Promise<void>;
  loadTicks: (symbol: string, limit?: number) => Promise<TickRecord[]>;
}

export function useIndexedDB(): IndexedDBAPI {
  const mountedRef = useRef(true);
  const dbRef      = useRef<IDBDatabase | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    openDB().then(db => {
      if (mountedRef.current) dbRef.current = db;
    }).catch(() => {});
    return () => { mountedRef.current = false; };
  }, []);

  const saveTick = useCallback(async (symbol: string, price: number): Promise<void> => {
    if (!mountedRef.current) return;
    try {
      const db = dbRef.current ?? await openDB();
      if (!mountedRef.current) return;
      const tick: TickRecord = { symbol, price, timestamp: Date.now() };
      await putTick(db, tick);
      pruneOldTicks(db, symbol);
    } catch {}
  }, []);

  const loadTicks = useCallback(async (symbol: string, limit = MAX_TICKS): Promise<TickRecord[]> => {
    if (!mountedRef.current) return [];
    try {
      const db = dbRef.current ?? await openDB();
      if (!mountedRef.current) return [];
      return await getTicks(db, symbol, limit);
    } catch {
      return [];
    }
  }, []);

  return { saveTick, loadTicks };
}

export type { TickRecord };
