/**
 * useCryptoCompare.ts — ZERØ MERIDIAN 2026 Phase 8
 * CryptoCompare free tier — historical OHLCV data for chart enrichment.
 * Free tier: 100k calls/month — no API key needed for basic endpoints.
 * Zero JSX. Zero any. React Query. mountedRef + AbortController.
 */

import { useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface OHLCVCandle {
  time:     number;  // Unix ms
  open:     number;
  high:     number;
  low:      number;
  close:    number;
  volume:   number;
  volumeUsd: number;
}

export interface CCTopPair {
  exchange:     string;
  fromSymbol:   string;
  toSymbol:     string;
  volume24h:    number;
  volume24hUsd: number;
  lastPrice:    number;
}

export interface CryptoCompareData {
  candles:    OHLCVCandle[];
  topPairs:   CCTopPair[];
  symbol:     string;
  loading:    boolean;
  error:      string | null;
  lastUpdate: number;
  setSymbol:  (sym: string) => void;
  refetch:    () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CC_BASE      = 'https://min-api.cryptocompare.com/data';
const REFRESH_MS   = 5 * 60_000;   // 5 min cache
const DEFAULT_SYM  = 'BTC';
const CANDLE_LIMIT = 90;            // 90 days of daily candles

const SYMBOLS = Object.freeze(['BTC', 'ETH', 'SOL', 'BNB', 'XRP', 'AVAX', 'DOGE', 'ADA']);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function safeNum(v: unknown): number {
  const n = Number(v);
  return isFinite(n) ? n : 0;
}

function safeStr(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

type RawCandle = Record<string, unknown>;
type RawPair   = Record<string, unknown>;

interface CCOHLCVResponse {
  Response?: string;
  Data?:     { Data?: RawCandle[] };
  Message?:  string;
}

interface CCTopPairsResponse {
  Response?: string;
  Data?:     RawPair[];
  Message?:  string;
}

async function ccFetch<T>(endpoint: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(CC_BASE + endpoint, {
    headers: { 'authorization': 'Apikey demo' }, // demo key = rate limited but functional
    signal,
  });
  if (!res.ok) throw new Error('cryptocompare fetch failed: ' + res.status);
  return res.json() as Promise<T>;
}

function parseCandles(raw: RawCandle[]): OHLCVCandle[] {
  return raw
    .filter(c => safeNum(c.time) > 0)
    .map((c): OHLCVCandle => ({
      time:      safeNum(c.time) * 1000,
      open:      safeNum(c.open),
      high:      safeNum(c.high),
      low:       safeNum(c.low),
      close:     safeNum(c.close),
      volume:    safeNum(c.volumefrom),
      volumeUsd: safeNum(c.volumeto),
    }));
}

function parseTopPairs(raw: RawPair[]): CCTopPair[] {
  return raw.slice(0, 20).map((p): CCTopPair => ({
    exchange:     safeStr(p.exchange),
    fromSymbol:   safeStr(p.fromSymbol),
    toSymbol:     safeStr(p.toSymbol),
    volume24h:    safeNum(p.volume24h),
    volume24hUsd: safeNum(p.volume24hTo),
    lastPrice:    safeNum(p.price),
  }));
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCryptoCompare(initialSymbol: string = DEFAULT_SYM): CryptoCompareData {
  const queryClient = useQueryClient();

  // Symbol state via query param trick — use query key to drive reactivity
  const symbolKey = useMemo(() => {
    const valid = SYMBOLS.includes(initialSymbol) ? initialSymbol : DEFAULT_SYM;
    return valid;
  }, [initialSymbol]);

  const candlesQuery = useQuery<CCOHLCVResponse>({
    queryKey:        ['cc-ohlcv', symbolKey],
    queryFn:         async ({ signal }) =>
      ccFetch<CCOHLCVResponse>(
        '/v2/histoday?fsym=' + symbolKey + '&tsym=USD&limit=' + CANDLE_LIMIT + '&aggregate=1',
        signal,
      ),
    staleTime:       REFRESH_MS,
    refetchInterval: REFRESH_MS,
    retry:           2,
    retryDelay:      (i) => Math.min(1000 * 2 ** i, 30_000),
  });

  const topPairsQuery = useQuery<CCTopPairsResponse>({
    queryKey:        ['cc-toppairs', symbolKey],
    queryFn:         async ({ signal }) =>
      ccFetch<CCTopPairsResponse>(
        '/top/exchanges?fsym=' + symbolKey + '&tsym=USD&limit=20',
        signal,
      ),
    staleTime:       REFRESH_MS,
    refetchInterval: REFRESH_MS,
    retry:           2,
    retryDelay:      (i) => Math.min(1000 * 2 ** i, 30_000),
  });

  const candles = useMemo((): OHLCVCandle[] => {
    const raw = candlesQuery.data?.Data?.Data;
    if (!Array.isArray(raw)) return [];
    return parseCandles(raw);
  }, [candlesQuery.data]);

  const topPairs = useMemo((): CCTopPair[] => {
    const raw = topPairsQuery.data?.Data;
    if (!Array.isArray(raw)) return [];
    return parseTopPairs(raw);
  }, [topPairsQuery.data]);

  const loading = candlesQuery.isLoading || topPairsQuery.isLoading;

  const error = useMemo((): string | null => {
    if (candlesQuery.isError)  return 'Failed to fetch OHLCV candle data';
    if (topPairsQuery.isError) return 'Failed to fetch top trading pairs';
    return null;
  }, [candlesQuery.isError, topPairsQuery.isError]);

  const lastUpdate = useMemo((): number => {
    return Math.max(candlesQuery.dataUpdatedAt, topPairsQuery.dataUpdatedAt);
  }, [candlesQuery.dataUpdatedAt, topPairsQuery.dataUpdatedAt]);

  const setSymbol = useCallback((sym: string): void => {
    const next = SYMBOLS.includes(sym) ? sym : DEFAULT_SYM;
    void queryClient.prefetchQuery({
      queryKey: ['cc-ohlcv', next],
      queryFn:  async ({ signal }) =>
        ccFetch<CCOHLCVResponse>(
          '/v2/histoday?fsym=' + next + '&tsym=USD&limit=' + CANDLE_LIMIT + '&aggregate=1',
          signal,
        ),
    });
  }, [queryClient]);

  const refetch = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['cc-ohlcv', symbolKey] });
    void queryClient.invalidateQueries({ queryKey: ['cc-toppairs', symbolKey] });
  }, [queryClient, symbolKey]);

  return useMemo((): CryptoCompareData => ({
    candles, topPairs, symbol: symbolKey,
    loading, error, lastUpdate, setSymbol, refetch,
  }), [candles, topPairs, symbolKey, loading, error, lastUpdate, setSymbol, refetch]);
}

export { SYMBOLS as CC_SYMBOLS };
