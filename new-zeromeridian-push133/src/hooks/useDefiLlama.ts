/**
 * useDefiLlama.ts — ZERØ MERIDIAN 2026 Phase 7
 * UPGRADE push21: fetch via /api/defi proxy (COEP-safe).
 * Zero JSX. Zero any. React Query caching.
 */

import { useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

export interface DLProtocol {
  id:       string;
  name:     string;
  symbol:   string;
  category: string;
  chains:   string[];
  tvl:      number;
  change1h: number;
  change1d: number;
  change7d: number;
  mcap:     number;
  logo:     string;
}

export interface DLChain {
  name: string;
  tvl:  number;
}

export interface DLYield {
  pool:       string;
  project:    string;
  chain:      string;
  symbol:     string;
  tvlUsd:     number;
  apy:        number;
  apyBase:    number;
  apyReward:  number;
  il7d:       number | null;
  ilRisk:     string;
}

export interface DLGlobal {
  totalTvl: number;
  change1d: number;
  change7d: number;
}

export interface DefiLlamaData {
  global:     DLGlobal | null;
  protocols:  DLProtocol[];
  chains:     DLChain[];
  yields:     DLYield[];
  loading:    boolean;
  error:      string | null;
  lastUpdate: number;
  refetch:    () => void;
}

// ✅ push21: proxy endpoints (COEP-safe, same-origin)
const ENDPOINTS = Object.freeze({
  protocols: '/api/defi?t=protocols',
  chains:    '/api/defi?t=chains',
  yields:    '/api/defi?t=yields',
});

const REFRESH_MS = 60_000;

function safeNum(v: unknown): number {
  const n = Number(v);
  return isFinite(n) ? n : 0;
}

type RawProtocol = Record<string, unknown>;
type RawChain    = Record<string, unknown>;
type RawYield    = Record<string, unknown>;

function parseProtocols(raw: RawProtocol[]): DLProtocol[] {
  return raw
    .filter(p => safeNum(p.tvl) > 0)
    .slice(0, 100)
    .map((p): DLProtocol => ({
      id:       String(p.slug ?? p.name ?? '').toLowerCase(),
      name:     String(p.name ?? ''),
      symbol:   String(p.symbol ?? '—'),
      category: String(p.category ?? 'Other'),
      chains:   Array.isArray(p.chains) ? (p.chains as string[]).slice(0, 5) : [],
      tvl:      safeNum(p.tvl),
      change1h: safeNum(p.change_1h),
      change1d: safeNum(p.change_1d),
      change7d: safeNum(p.change_7d),
      mcap:     safeNum(p.mcap),
      logo:     String(p.logo ?? ''),
    }));
}

function parseChains(raw: RawChain[]): DLChain[] {
  return raw
    .filter(c => safeNum(c.tvl) > 0)
    .slice(0, 20)
    .map((c): DLChain => ({ name: String(c.name ?? ''), tvl: safeNum(c.tvl) }));
}

function parseYields(raw: { data?: RawYield[] }): DLYield[] {
  const pools = Array.isArray(raw?.data) ? raw.data : [];
  return pools
    .filter(p => safeNum(p.tvlUsd) > 1_000_000 && safeNum(p.apy) > 0)
    .slice(0, 50)
    .map((p): DLYield => ({
      pool:      String(p.pool ?? ''),
      project:   String(p.project ?? ''),
      chain:     String(p.chain ?? ''),
      symbol:    String(p.symbol ?? ''),
      tvlUsd:    safeNum(p.tvlUsd),
      apy:       safeNum(p.apy),
      apyBase:   safeNum(p.apyBase),
      apyReward: safeNum(p.apyReward),
      il7d:      p.il7d != null ? safeNum(p.il7d) : null,
      ilRisk:    String(p.ilRisk ?? 'NO'),
    }));
}

export function useDefiLlama(): DefiLlamaData {
  const queryClient = useQueryClient();

  const protocolsQuery = useQuery<RawProtocol[]>({
    queryKey:        ['defi-protocols'],
    queryFn:         async ({ signal }) => {
      const res = await fetch(ENDPOINTS.protocols, { signal });
      if (!res.ok) throw new Error('protocols fetch failed');
      return res.json() as Promise<RawProtocol[]>;
    },
    staleTime:       REFRESH_MS,
    refetchInterval: REFRESH_MS,
    retry:           2,
    retryDelay:      (i) => Math.min(1000 * 2 ** i, 30_000),
  });

  const chainsQuery = useQuery<RawChain[]>({
    queryKey:        ['defi-chains'],
    queryFn:         async ({ signal }) => {
      const res = await fetch(ENDPOINTS.chains, { signal });
      if (!res.ok) throw new Error('chains fetch failed');
      return res.json() as Promise<RawChain[]>;
    },
    staleTime:       REFRESH_MS,
    refetchInterval: REFRESH_MS,
    retry:           2,
    retryDelay:      (i) => Math.min(1000 * 2 ** i, 30_000),
  });

  const yieldsQuery = useQuery<{ data?: RawYield[] }>({
    queryKey:        ['defi-yields'],
    queryFn:         async ({ signal }) => {
      const res = await fetch(ENDPOINTS.yields, { signal });
      if (!res.ok) throw new Error('yields fetch failed');
      return res.json() as Promise<{ data?: RawYield[] }>;
    },
    staleTime:       REFRESH_MS,
    refetchInterval: REFRESH_MS,
    retry:           2,
    retryDelay:      (i) => Math.min(1000 * 2 ** i, 30_000),
  });

  const protocols = useMemo((): DLProtocol[] => {
    if (!protocolsQuery.data) return [];
    return parseProtocols(protocolsQuery.data);
  }, [protocolsQuery.data]);

  const globalStats = useMemo((): DLGlobal | null => {
    if (protocols.length === 0) return null;
    const totalTvl = protocols.reduce((s, p) => s + p.tvl, 0);
    const top10    = protocols.slice(0, 10);
    const avg1d    = top10.reduce((s, p) => s + p.change1d, 0) / (top10.length || 1);
    const avg7d    = top10.reduce((s, p) => s + p.change7d, 0) / (top10.length || 1);
    return { totalTvl, change1d: avg1d, change7d: avg7d };
  }, [protocols]);

  const chains = useMemo((): DLChain[] => {
    if (!chainsQuery.data) return [];
    return parseChains(chainsQuery.data);
  }, [chainsQuery.data]);

  const yields = useMemo((): DLYield[] => {
    if (!yieldsQuery.data) return [];
    return parseYields(yieldsQuery.data);
  }, [yieldsQuery.data]);

  const loading = protocolsQuery.isLoading || chainsQuery.isLoading || yieldsQuery.isLoading;

  const error = useMemo((): string | null => {
    if (protocolsQuery.isError) return 'Failed to fetch DeFi protocols';
    if (chainsQuery.isError)    return 'Failed to fetch chain data';
    if (yieldsQuery.isError)    return 'Failed to fetch yield pools';
    return null;
  }, [protocolsQuery.isError, chainsQuery.isError, yieldsQuery.isError]);

  const lastUpdate = useMemo((): number => {
    const dates = [
      protocolsQuery.dataUpdatedAt,
      chainsQuery.dataUpdatedAt,
      yieldsQuery.dataUpdatedAt,
    ].filter(Boolean);
    return dates.length > 0 ? Math.max(...dates) : 0;
  }, [protocolsQuery.dataUpdatedAt, chainsQuery.dataUpdatedAt, yieldsQuery.dataUpdatedAt]);

  const refetch = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['defi-protocols'] });
    void queryClient.invalidateQueries({ queryKey: ['defi-chains'] });
    void queryClient.invalidateQueries({ queryKey: ['defi-yields'] });
  }, [queryClient]);

  return useMemo((): DefiLlamaData => ({
    global: globalStats, protocols, chains, yields, loading, error, lastUpdate, refetch,
  }), [globalStats, protocols, chains, yields, loading, error, lastUpdate, refetch]);
}
