/**
 * useSocialSentiment.ts — ZERØ MERIDIAN push129
 * push129: Zero :any — all API responses typed with proper interfaces
 * Fear & Greed (Alternative.me), Funding Rate + OI (Binance Futures).
 * mountedRef pattern ✓  useCallback ✓  useMemo ✓  Object.freeze ✓
 */

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ─── Public types ──────────────────────────────────────────────────────────────

export interface FearGreedPoint {
  value: number;
  label: string;
  timestamp: number;
}

export interface FundingData {
  symbol: string;
  rate: number;
  ratePct: number;
  annualized: number;
  oiUsd: number;
  signal: 'LONG' | 'SHORT' | 'NEUTRAL';
}

export interface SentimentData {
  fearGreed: FearGreedPoint[];
  current: FearGreedPoint | null;
  funding: FundingData[];
  loadingFG: boolean;
  loadingFunding: boolean;
  errorFG: string | null;
  errorFunding: string | null;
  refreshFunding: () => void;
  lastUpdatedFunding: number | null;
}

// ─── Raw API types ─────────────────────────────────────────────────────────────

interface FnGItem {
  value?: string;
  value_classification?: string;
  timestamp?: string;
}

interface FnGResponse {
  data?: FnGItem[];
}

interface BinanceFundingItem {
  symbol?: string;
  lastFundingRate?: string;
}

interface BinanceOIItem {
  symbol?: string;
  sumOpenInterestValue?: string;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const FUNDING_SYMBOLS = Object.freeze([
  'BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT','XRPUSDT',
  'ADAUSDT','AVAXUSDT','DOTUSDT','LINKUSDT','MATICUSDT',
]);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toFundingSignal(rate: number): 'LONG' | 'SHORT' | 'NEUTRAL' {
  if (rate >  0.0001) return 'SHORT';
  if (rate < -0.0001) return 'LONG';
  return 'NEUTRAL';
}

async function fetchFearGreed(): Promise<FearGreedPoint[]> {
  const res = await fetch('https://api.alternative.me/fng/?limit=7', {
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error('FnG error');
  const data = await res.json() as FnGResponse;
  return (data.data ?? []).map((d): FearGreedPoint => ({
    value:     parseInt(d.value ?? '50', 10),
    label:     d.value_classification ?? 'Neutral',
    timestamp: parseInt(d.timestamp ?? '0', 10) * 1000,
  }));
}

async function fetchFundingAndOI(signal: AbortSignal): Promise<FundingData[]> {
  const [fundingRes, oiRes] = await Promise.allSettled([
    fetch('https://fapi.binance.com/fapi/v1/premiumIndex', { signal }),
    fetch('https://fapi.binance.com/fapi/v1/openInterest?symbol=BTCUSDT', { signal }),
  ]);

  let fundingMap: Record<string, number> = {};
  if (fundingRes.status === 'fulfilled' && fundingRes.value.ok) {
    const allFunding = await fundingRes.value.json() as BinanceFundingItem[];
    for (const f of allFunding) {
      if (f.symbol && FUNDING_SYMBOLS.includes(f.symbol)) {
        fundingMap[f.symbol] = parseFloat(f.lastFundingRate ?? '0');
      }
    }
  }

  let oiMap: Record<string, number> = {};
  if (oiRes.status === 'fulfilled' && oiRes.value.ok) {
    const oiData = await oiRes.value.json() as BinanceOIItem | BinanceOIItem[];
    const items = Array.isArray(oiData) ? oiData : [oiData];
    for (const item of items) {
      if (item.symbol) {
        oiMap[item.symbol] = parseFloat(item.sumOpenInterestValue ?? '0');
      }
    }
  }

  return FUNDING_SYMBOLS.map(sym => {
    const rate = fundingMap[sym] ?? 0;
    return {
      symbol:     sym,
      rate,
      ratePct:    rate * 100,
      annualized: rate * 3 * 365 * 100,
      oiUsd:      oiMap[sym] ?? 0,
      signal:     toFundingSignal(rate),
    };
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSocialSentiment(): SentimentData {
  const [fearGreed, setFearGreed]             = useState<FearGreedPoint[]>([]);
  const [loadingFG, setLoadingFG]             = useState(true);
  const [errorFG, setErrorFG]                 = useState<string | null>(null);
  const [funding, setFunding]                 = useState<FundingData[]>([]);
  const [loadingFunding, setLoadingFunding]   = useState(true);
  const [errorFunding, setErrorFunding]       = useState<string | null>(null);
  const [lastUpdatedFunding, setLastUpdated]  = useState<number | null>(null);

  const mountedRef  = useRef(true);
  const abortRef    = useRef(new AbortController());
  const fgTimerRef  = useRef<ReturnType<typeof setInterval> | null>(null);
  const funTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadFearGreed = useCallback(async () => {
    if (!mountedRef.current) return;
    setLoadingFG(true);
    try {
      const data = await fetchFearGreed();
      if (!mountedRef.current) return;
      setFearGreed(data);
      setErrorFG(null);
    } catch {
      if (!mountedRef.current) return;
      setErrorFG('Failed to load Fear & Greed');
    } finally {
      if (mountedRef.current) setLoadingFG(false);
    }
  }, []);

  const loadFunding = useCallback(async () => {
    if (!mountedRef.current) return;
    abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoadingFunding(true);
    try {
      const data = await fetchFundingAndOI(abortRef.current.signal);
      if (!mountedRef.current) return;
      setFunding(data);
      setErrorFunding(null);
      setLastUpdated(Date.now());
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return;
      if (!mountedRef.current) return;
      setErrorFunding('Failed to load funding');
    } finally {
      if (mountedRef.current) setLoadingFunding(false);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;

    loadFearGreed();
    loadFunding();

    fgTimerRef.current  = setInterval(loadFearGreed, 5 * 60 * 1000);
    funTimerRef.current = setInterval(loadFunding, 60 * 1000);

    return () => {
      mountedRef.current = false;
      abortRef.current.abort();
      if (fgTimerRef.current)  clearInterval(fgTimerRef.current);
      if (funTimerRef.current) clearInterval(funTimerRef.current);
    };
  }, [loadFearGreed, loadFunding]);

  const current = useMemo(() => fearGreed[0] ?? null, [fearGreed]);

  return useMemo((): SentimentData => ({
    fearGreed,
    current,
    funding,
    loadingFG,
    loadingFunding,
    errorFG,
    errorFunding,
    refreshFunding: loadFunding,
    lastUpdatedFunding,
  }), [fearGreed, current, funding, loadingFG, loadingFunding, errorFG, errorFunding, loadFunding, lastUpdatedFunding]);
}
