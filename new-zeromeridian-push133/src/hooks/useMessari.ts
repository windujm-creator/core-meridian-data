/**
 * useMessari.ts — ZERØ MERIDIAN 2026 Phase 10
 * Messari free tier — fundamental metrics, asset profiles, market data.
 * Free tier: no API key needed for basic endpoints.
 * Zero JSX. Zero any. React Query. mountedRef + AbortController.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface MessariMetrics {
  symbol:            string;
  name:              string;
  marketcapUsd:      number;
  volumeLastHour:    number;
  volumeLastDay:     number;
  realVolumeLast24h: number;
  ohlcvLast1h:       { open: number; high: number; low: number; close: number; volume: number } | null;
  ohlcvLast24h:      { open: number; high: number; low: number; close: number; volume: number } | null;
  percentChangeLast1h:    number;
  percentChangeLast24h:   number;
  percentChangeLast7d:    number;
  percentChangeLast30d:   number;
  percentChangeLast1y:    number;
  athUsd:                 number;
  atl:                    number;
  liquidityCurrentUsd:    number;
  circulatingSupply:      number;
  stockToFlow:            number | null;
  developerActivity:      number | null;
}

export interface MessariNews {
  id:          string;
  title:       string;
  content:     string;
  references:  { name: string; url: string }[];
  tags:        string[];
  published_at: string;
  author:      { name: string };
}

interface MessariState {
  metrics: Record<string, MessariMetrics>;
  news:    MessariNews[];
  isLoading: boolean;
  isError:   boolean;
  refetch:   () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE = 'https://data.messari.io/api/v1';

const TRACKED_ASSETS = Object.freeze([
  'bitcoin', 'ethereum', 'solana', 'binance-coin', 'cardano',
  'avalanche', 'polkadot', 'chainlink', 'polygon', 'uniswap',
]);

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchMessariMetrics(asset: string, signal: AbortSignal): Promise<MessariMetrics | null> {
  try {
    const res = await fetch(
      BASE + '/assets/' + asset + '/metrics',
      { signal }
    );
    if (!res.ok) return null;
    const json = await res.json() as { data: { symbol: string; name: string; market_data: Record<string, unknown>; roi_data: Record<string, unknown>; all_time_high: Record<string, unknown>; supply: Record<string, unknown> } };
    const d = json.data;
    const md = d.market_data as Record<string, number>;
    const roi = d.roi_data as Record<string, number>;
    const ath = d.all_time_high as Record<string, number>;
    const sup = d.supply as Record<string, number>;
    return {
      symbol:               d.symbol,
      name:                 d.name,
      marketcapUsd:         md.marketcap_dominance_percent ?? 0,
      volumeLastHour:       md.volume_last_hour ?? 0,
      volumeLastDay:        md.volume_last_day ?? 0,
      realVolumeLast24h:    md.real_volume_last_24_hours ?? 0,
      ohlcvLast1h:          md.ohlcv_last_1_hour != null ? md.ohlcv_last_1_hour as unknown as { open: number; high: number; low: number; close: number; volume: number } : null,
      ohlcvLast24h:         md.ohlcv_last_24_hours != null ? md.ohlcv_last_24_hours as unknown as { open: number; high: number; low: number; close: number; volume: number } : null,
      percentChangeLast1h:  roi.percent_change_last_1_hour ?? 0,
      percentChangeLast24h: roi.percent_change_last_24_hours ?? 0,
      percentChangeLast7d:  roi.percent_change_last_7_days ?? 0,
      percentChangeLast30d: roi.percent_change_last_30_days ?? 0,
      percentChangeLast1y:  roi.percent_change_last_1_year ?? 0,
      athUsd:               ath.price ?? 0,
      atl:                  0,
      liquidityCurrentUsd:  md.liquidity_current ?? 0,
      circulatingSupply:    sup.circulating ?? 0,
      stockToFlow:          null,
      developerActivity:    null,
    };
  } catch {
    return null;
  }
}

async function fetchMessariNews(signal: AbortSignal): Promise<MessariNews[]> {
  try {
    const res = await fetch(BASE + '/news', { signal });
    if (!res.ok) return [];
    const json = await res.json() as { data: MessariNews[] };
    return json.data ?? [];
  } catch {
    return [];
  }
}

// ─── Hooks ────────────────────────────────────────────────────────────────────

export function useMessariMetrics(asset = 'bitcoin') {
  return useQuery({
    queryKey: ['messari-metrics', asset],
    queryFn: async ({ signal }) => {
      const result = await fetchMessariMetrics(asset, signal);
      if (!result) throw new Error('Messari metrics fetch failed');
      return result;
    },
    staleTime:       60_000,
    refetchInterval: 60_000,
    retry: 2,
    retryDelay: (i) => Math.min(1000 * 2 ** i, 15000),
  });
}

export function useMessariNews() {
  return useQuery({
    queryKey: ['messari-news'],
    queryFn: async ({ signal }) => {
      const news = await fetchMessariNews(signal);
      return news;
    },
    staleTime:       120_000,
    refetchInterval: 120_000,
    retry: 2,
    retryDelay: (i) => Math.min(1000 * 2 ** i, 15000),
  });
}

export function useMessari(): MessariState {
  const btcQ   = useMessariMetrics('bitcoin');
  const ethQ   = useMessariMetrics('ethereum');
  const solQ   = useMessariMetrics('solana');
  const newsQ  = useMessariNews();

  const metrics = useMemo(() => {
    const map: Record<string, MessariMetrics> = {};
    if (btcQ.data)  map['bitcoin']  = btcQ.data;
    if (ethQ.data)  map['ethereum'] = ethQ.data;
    if (solQ.data)  map['solana']   = solQ.data;
    return map;
  }, [btcQ.data, ethQ.data, solQ.data]);

  const isLoading = btcQ.isLoading || ethQ.isLoading || solQ.isLoading;
  const isError   = btcQ.isError   && ethQ.isError   && solQ.isError;

  const refetch = useMemo(() => () => {
    btcQ.refetch();
    ethQ.refetch();
    solQ.refetch();
    newsQ.refetch();
  }, [btcQ, ethQ, solQ, newsQ]);

  return useMemo(() => ({
    metrics,
    news:    newsQ.data ?? [],
    isLoading,
    isError,
    refetch,
  }), [metrics, newsQ.data, isLoading, isError, refetch]);
}

export { TRACKED_ASSETS };
