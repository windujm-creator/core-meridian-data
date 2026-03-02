/**
 * useMarketWorker.ts — ZERØ MERIDIAN 2026
 * Hook wrapper untuk marketWorker.ts.
 * - Singleton worker per app (tidak re-create setiap render)
 * - Promise-based API dengan timeout
 * - Full cleanup
 * Zero JSX.
 */

import { useEffect, useRef, useCallback } from 'react';
import type { CryptoAsset } from '@/lib/formatters';

type MarketRegime = 'SURGE' | 'BULL' | 'CRAB' | 'BEAR';
type AISignal = 'STRONG_BUY' | 'BUY' | 'NEUTRAL' | 'SELL' | 'STRONG_SELL';
type SortKey = 'rank' | 'name' | 'price' | 'change24h' | 'change7d' | 'marketCap' | 'volume24h';

interface PriceUpdate {
  price: number; change24h: number;
  high24h?: number; low24h?: number; volume24h?: number;
  direction?: 'up' | 'down' | 'neutral';
}

type Callback = (data: unknown) => void;

// Singleton worker — shared across hook instances
let _worker: Worker | null = null;
let _refCount = 0;
const _callbacks = new Map<string, Callback>();
let _msgId = 0;

function getWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  if (!_worker) {
    _worker = new Worker(
      new URL('../workers/marketWorker.ts', import.meta.url),
      { type: 'module' }
    );
    _worker.onmessage = (e) => {
      const { _id, ...data } = e.data as { _id?: string } & Record<string, unknown>;
      if (_id && _callbacks.has(_id)) {
        _callbacks.get(_id)!(data);
        _callbacks.delete(_id);
      }
    };
    _worker.onerror = (err) => {
      console.error('[MarketWorker]', err.message);
    };
  }
  return _worker;
}

function postMsg<T>(msg: object, timeoutMs = 5000): Promise<T> {
  return new Promise((resolve, reject) => {
    const worker = getWorker();
    if (!worker) {
      reject(new Error('Web Worker not available'));
      return;
    }
    const id = 'wm_' + (++_msgId);
    const timer = setTimeout(() => {
      _callbacks.delete(id);
      reject(new Error('Worker timeout'));
    }, timeoutMs);
    _callbacks.set(id, (data: unknown) => {
      clearTimeout(timer);
      resolve(data as T);
    });
    worker.postMessage({ ...msg, _id: id });
  });
}

export interface MarketWorkerAPI {
  mergeAndCompute: (
    assets: CryptoAsset[],
    updates: Record<string, PriceUpdate>
  ) => Promise<{ assets: CryptoAsset[]; regime: MarketRegime; signal: AISignal }>;

  sortAndFilter: (
    assets: CryptoAsset[],
    sortKey: SortKey,
    sortDir: 'asc' | 'desc',
    query: string
  ) => Promise<{ assets: CryptoAsset[] }>;

  computeMarket: (
    assets: CryptoAsset[]
  ) => Promise<{ regime: MarketRegime; signal: AISignal }>;
}

export function useMarketWorker(): MarketWorkerAPI {
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    _refCount++;
    return () => {
      mountedRef.current = false;
      _refCount--;
      // Terminate worker only when last consumer unmounts
      if (_refCount === 0 && _worker) {
        _worker.terminate();
        _worker = null;
        _callbacks.clear();
      }
    };
  }, []);

  const mergeAndCompute = useCallback(async (
    assets: CryptoAsset[],
    updates: Record<string, PriceUpdate>
  ) => {
    return postMsg<{ assets: CryptoAsset[]; regime: MarketRegime; signal: AISignal }>({
      type: 'MERGE_PRICES', assets, updates,
    });
  }, []);

  const sortAndFilter = useCallback(async (
    assets: CryptoAsset[],
    sortKey: SortKey,
    sortDir: 'asc' | 'desc',
    query: string
  ) => {
    return postMsg<{ assets: CryptoAsset[] }>({
      type: 'SORT_FILTER', assets, sortKey, sortDir, query,
    });
  }, []);

  const computeMarket = useCallback(async (assets: CryptoAsset[]) => {
    return postMsg<{ regime: MarketRegime; signal: AISignal }>({
      type: 'COMPUTE_MARKET', assets,
    });
  }, []);

  return { mergeAndCompute, sortAndFilter, computeMarket };
}
