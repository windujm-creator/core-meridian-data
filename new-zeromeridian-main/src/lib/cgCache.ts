/**
 * cgCache.ts — ZERØ MERIDIAN
 * Centralized CoinGecko cache + rate limit guard.
 * All CG requests deduplicated here — never call CG directly from hooks.
 * Free tier: 30 req/min → 1 req/2s minimum interval.
 */

interface CacheEntry<T> {
  data: T;
  ts:   number;
}

const store = new Map<string, CacheEntry<unknown>>();

// Pending requests: deduplicate inflight
const pending = new Map<string, Promise<unknown>>();

const BASE = 'https://api.coingecko.com/api/v3';

// Minimum ms between requests (rate-limit guard: 30/min = 1 per 2s)
const MIN_INTERVAL_MS = 2200;
let lastRequestTs = 0;

async function guardedFetch(url: string, signal?: AbortSignal): Promise<Response> {
  const now = Date.now();
  const wait = MIN_INTERVAL_MS - (now - lastRequestTs);
  if (wait > 0) await new Promise(r => setTimeout(r, wait));
  lastRequestTs = Date.now();
  return fetch(url, { signal });
}

export async function cgFetch<T>(
  endpoint: string,
  ttlMs: number,
  signal?: AbortSignal,
): Promise<T> {
  const key = endpoint;

  // Return cached if fresh
  const entry = store.get(key) as CacheEntry<T> | undefined;
  if (entry && Date.now() - entry.ts < ttlMs) return entry.data;

  // Deduplicate: return existing pending promise
  if (pending.has(key)) return pending.get(key) as Promise<T>;

  const promise = (async () => {
    const res = await guardedFetch(BASE + endpoint, signal);
    if (!res.ok) throw new Error(`CoinGecko ${res.status}: ${endpoint}`);
    const data = await res.json() as T;
    store.set(key, { data, ts: Date.now() });
    return data;
  })().finally(() => pending.delete(key));

  pending.set(key, promise);
  return promise;
}

export function cgInvalidate(endpoint: string) {
  store.delete(endpoint);
}
