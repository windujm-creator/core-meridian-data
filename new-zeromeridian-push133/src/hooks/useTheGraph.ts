/**
 * useTheGraph.ts — ZERØ MERIDIAN 2026 Phase 8
 * The Graph free tier — Uniswap V3 subgraph: DEX pools, volume, whale swaps.
 * Zero JSX. Zero any. React Query. mountedRef + AbortController.
 */

import { useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface GraphPool {
  id:              string;
  token0Symbol:    string;
  token1Symbol:    string;
  feeTier:         number;
  tvlUsd:          number;
  volumeUsd24h:    number;
  txCount24h:      number;
  apr:             number;
}

export interface GraphWhaleSwap {
  id:          string;
  timestamp:   number;
  amountUsd:   number;
  token0:      string;
  token1:      string;
  sender:      string;
  type:        'buy' | 'sell';
}

export interface GraphDexStats {
  totalVolumeUsd:     number;
  totalTvlUsd:        number;
  txCount24h:         number;
  poolCount:          number;
}

export interface TheGraphData {
  pools:      GraphPool[];
  whaleSwaps: GraphWhaleSwap[];
  dexStats:   GraphDexStats | null;
  loading:    boolean;
  error:      string | null;
  lastUpdate: number;
  refetch:    () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

// Uniswap V3 subgraph — The Graph decentralized network (free queries)
const SUBGRAPH_URL = 'https://api.thegraph.com/subgraphs/name/uniswap/uniswap-v3';
const REFRESH_MS   = 60_000;
const TVL_THRESH   = 500_000; // $500k minimum TVL
const WHALE_USD    = 100_000; // $100k+ = whale swap

const POOLS_QUERY = Object.freeze(`{
  pools(
    first: 30
    orderBy: totalValueLockedUSD
    orderDirection: desc
    where: { totalValueLockedUSD_gt: "${TVL_THRESH}" }
  ) {
    id
    token0 { symbol }
    token1 { symbol }
    feeTier
    totalValueLockedUSD
    poolDayData(first: 1 orderBy: date orderDirection: desc) {
      volumeUSD
      txCount
      feesUSD
    }
  }
  factories(first: 1) {
    txCount
    totalValueLockedUSD
    totalVolumeUSD
    poolCount
  }
}`);

const SWAPS_QUERY = Object.freeze(`{
  swaps(
    first: 50
    orderBy: timestamp
    orderDirection: desc
    where: { amountUSD_gt: "${WHALE_USD}" }
  ) {
    id
    timestamp
    amountUSD
    token0 { symbol }
    token1 { symbol }
    sender
    amount0
    amount1
  }
}`);

// ─── Helpers ─────────────────────────────────────────────────────────────────

function safeNum(v: unknown): number {
  const n = Number(v);
  return isFinite(n) ? n : 0;
}

function safeStr(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

type RawPool      = Record<string, unknown>;
type RawFactory   = Record<string, unknown>;
type RawSwap      = Record<string, unknown>;
type RawToken     = Record<string, unknown>;
type RawDayData   = Record<string, unknown>;

interface PoolsResponse {
  data?: {
    pools?:     RawPool[];
    factories?: RawFactory[];
  };
}

interface SwapsResponse {
  data?: {
    swaps?: RawSwap[];
  };
}

async function graphFetch<T>(query: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(SUBGRAPH_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ query }),
    signal,
  });
  if (!res.ok) throw new Error('graph fetch failed: ' + res.status);
  return res.json() as Promise<T>;
}

function parsePools(raw: RawPool[]): GraphPool[] {
  return raw.map((p): GraphPool => {
    const t0       = (p.token0 as RawToken | undefined) ?? {};
    const t1       = (p.token1 as RawToken | undefined) ?? {};
    const dayData  = Array.isArray(p.poolDayData)
      ? (p.poolDayData[0] as RawDayData | undefined) ?? {}
      : {};
    const tvl      = safeNum(p.totalValueLockedUSD);
    const vol24h   = safeNum(dayData.volumeUSD);
    const fees24h  = safeNum(dayData.feesUSD);
    const apr      = tvl > 0 ? (fees24h * 365 / tvl) * 100 : 0;

    return {
      id:           safeStr(p.id),
      token0Symbol: safeStr(t0.symbol),
      token1Symbol: safeStr(t1.symbol),
      feeTier:      safeNum(p.feeTier) / 10000,
      tvlUsd:       tvl,
      volumeUsd24h: vol24h,
      txCount24h:   safeNum(dayData.txCount),
      apr,
    };
  });
}

function parseDexStats(factories: RawFactory[]): GraphDexStats | null {
  const f = factories[0];
  if (!f) return null;
  return {
    totalVolumeUsd: safeNum(f.totalVolumeUSD),
    totalTvlUsd:    safeNum(f.totalValueLockedUSD),
    txCount24h:     safeNum(f.txCount),
    poolCount:      safeNum(f.poolCount),
  };
}

function parseWhaleSwaps(raw: RawSwap[]): GraphWhaleSwap[] {
  return raw.map((s): GraphWhaleSwap => {
    const t0     = (s.token0 as RawToken | undefined) ?? {};
    const t1     = (s.token1 as RawToken | undefined) ?? {};
    const amount0 = safeNum(s.amount0);
    const type: 'buy' | 'sell' = amount0 < 0 ? 'buy' : 'sell';
    return {
      id:        safeStr(s.id),
      timestamp: safeNum(s.timestamp) * 1000,
      amountUsd: safeNum(s.amountUSD),
      token0:    safeStr(t0.symbol),
      token1:    safeStr(t1.symbol),
      sender:    safeStr(s.sender),
      type,
    };
  });
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTheGraph(): TheGraphData {
  const queryClient = useQueryClient();

  const poolsQuery = useQuery<PoolsResponse>({
    queryKey:        ['graph-pools'],
    queryFn:         async ({ signal }) =>
      graphFetch<PoolsResponse>(POOLS_QUERY, signal),
    staleTime:       REFRESH_MS,
    refetchInterval: REFRESH_MS,
    retry:           2,
    retryDelay:      (i) => Math.min(1000 * 2 ** i, 30_000),
  });

  const swapsQuery = useQuery<SwapsResponse>({
    queryKey:        ['graph-swaps'],
    queryFn:         async ({ signal }) =>
      graphFetch<SwapsResponse>(SWAPS_QUERY, signal),
    staleTime:       REFRESH_MS,
    refetchInterval: REFRESH_MS,
    retry:           2,
    retryDelay:      (i) => Math.min(1000 * 2 ** i, 30_000),
  });

  const pools = useMemo((): GraphPool[] => {
    const raw = poolsQuery.data?.data?.pools;
    if (!Array.isArray(raw)) return [];
    return parsePools(raw);
  }, [poolsQuery.data]);

  const dexStats = useMemo((): GraphDexStats | null => {
    const raw = poolsQuery.data?.data?.factories;
    if (!Array.isArray(raw)) return null;
    return parseDexStats(raw);
  }, [poolsQuery.data]);

  const whaleSwaps = useMemo((): GraphWhaleSwap[] => {
    const raw = swapsQuery.data?.data?.swaps;
    if (!Array.isArray(raw)) return [];
    return parseWhaleSwaps(raw);
  }, [swapsQuery.data]);

  const loading = poolsQuery.isLoading || swapsQuery.isLoading;

  const error = useMemo((): string | null => {
    if (poolsQuery.isError) return 'Failed to fetch DEX pool data';
    if (swapsQuery.isError) return 'Failed to fetch whale swaps';
    return null;
  }, [poolsQuery.isError, swapsQuery.isError]);

  const lastUpdate = useMemo((): number => {
    return Math.max(poolsQuery.dataUpdatedAt, swapsQuery.dataUpdatedAt);
  }, [poolsQuery.dataUpdatedAt, swapsQuery.dataUpdatedAt]);

  const refetch = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['graph-pools'] });
    void queryClient.invalidateQueries({ queryKey: ['graph-swaps'] });
  }, [queryClient]);

  return useMemo((): TheGraphData => ({
    pools, whaleSwaps, dexStats, loading, error, lastUpdate, refetch,
  }), [pools, whaleSwaps, dexStats, loading, error, lastUpdate, refetch]);
}
