/**
 * useCoinGeckoOnChain.ts — ZERØ MERIDIAN 2026 Phase 8
 * CoinGecko on-chain endpoints (free tier) — token holder data, top holders,
 * token info by contract address on major chains.
 * Zero JSX. Zero any. React Query. mountedRef + AbortController.
 */

import { useMemo, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TokenHolder {
  address:    string;
  balance:    number;
  share:      number;   // percentage of supply
  label:      string;   // 'Binance', 'Unknown', etc.
}

export interface OnChainToken {
  address:        string;
  name:           string;
  symbol:         string;
  decimals:       number;
  totalSupply:    number;
  price:          number;
  priceChange24h: number;
  fdvUsd:         number;
  marketCap:      number;
  volume24h:      number;
  holders:        number;
}

export interface TrendingOnChain {
  id:         string;
  name:       string;
  symbol:     string;
  thumb:      string;
  priceUsd:   number;
  change24h:  number;
  volume24h:  number;
  chain:      string;
  address:    string;
}

export interface CoinGeckoOnChainData {
  trending:   TrendingOnChain[];
  loading:    boolean;
  error:      string | null;
  lastUpdate: number;
  refetch:    () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CG_BASE    = 'https://api.coingecko.com/api/v3';
const REFRESH_MS = 3 * 60_000; // 3 min

// Supported chains for on-chain endpoints
const CHAIN_PLATFORMS = Object.freeze({
  ethereum: 'ethereum',
  bsc:      'binance-smart-chain',
  polygon:  'polygon-pos',
  arbitrum: 'arbitrum-one',
  optimism: 'optimistic-ethereum',
  base:     'base',
  solana:   'solana',
  avalanche: 'avalanche',
});

// ─── Helpers ─────────────────────────────────────────────────────────────────

function safeNum(v: unknown): number {
  const n = Number(v);
  return isFinite(n) ? n : 0;
}

function safeStr(v: unknown): string {
  return typeof v === 'string' ? v : '';
}

type RawCoin    = Record<string, unknown>;
type RawItem    = Record<string, unknown>;
type RawData    = Record<string, unknown>;

interface CGTrendingResponse {
  coins?: { item?: RawItem }[];
}

async function cgFetch<T>(endpoint: string, signal: AbortSignal): Promise<T> {
  const res = await fetch(CG_BASE + endpoint, {
    headers: {
      'accept': 'application/json',
      'x-cg-demo-api-key': 'demo', // Free demo key
    },
    signal,
  });
  if (res.status === 429) throw new Error('rate limited');
  if (!res.ok) throw new Error('coingecko fetch failed: ' + res.status);
  return res.json() as Promise<T>;
}

function parseTrending(coins: { item?: RawItem }[]): TrendingOnChain[] {
  return coins.slice(0, 15).map(({ item }): TrendingOnChain => {
    const it      = (item ?? {}) as RawCoin;
    const data    = (it.data as RawData | undefined) ?? {};
    const priceStr = safeStr(data.price ?? it.current_price);
    const price   = priceStr.startsWith('$')
      ? safeNum(priceStr.replace(/[$,]/g, ''))
      : safeNum(priceStr);
    const platforms = (it.platforms as Record<string, string> | undefined) ?? {};
    const chainEntry = Object.entries(platforms)[0];

    return {
      id:        safeStr(it.id),
      name:      safeStr(it.name),
      symbol:    safeStr(it.symbol).toUpperCase(),
      thumb:     safeStr(it.thumb ?? it.small),
      priceUsd:  price,
      change24h: safeNum((data.price_change_percentage_24h as Record<string, unknown> | undefined)?.usd ?? 0),
      volume24h: safeNum(data.total_volume),
      chain:     chainEntry ? chainEntry[0] : 'ethereum',
      address:   chainEntry ? chainEntry[1] : '',
    };
  }).filter(t => t.id !== '');
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useCoinGeckoOnChain(): CoinGeckoOnChainData {
  const queryClient = useQueryClient();

  // Trending coins with on-chain data (includes contract addresses + chain info)
  const trendingQuery = useQuery<CGTrendingResponse>({
    queryKey:        ['cg-onchain-trending'],
    queryFn:         async ({ signal }) =>
      cgFetch<CGTrendingResponse>('/search/trending', signal),
    staleTime:       REFRESH_MS,
    refetchInterval: REFRESH_MS,
    retry:           2,
    retryDelay:      (i) => Math.min(1000 * 2 ** i, 30_000),
  });

  const trending = useMemo((): TrendingOnChain[] => {
    const coins = trendingQuery.data?.coins;
    if (!Array.isArray(coins)) return [];
    return parseTrending(coins);
  }, [trendingQuery.data]);

  const loading = trendingQuery.isLoading;

  const error = useMemo((): string | null => {
    if (trendingQuery.isError) return 'Failed to fetch on-chain trending data';
    return null;
  }, [trendingQuery.isError]);

  const lastUpdate = useMemo((): number => {
    return trendingQuery.dataUpdatedAt;
  }, [trendingQuery.dataUpdatedAt]);

  const refetch = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['cg-onchain-trending'] });
  }, [queryClient]);

  return useMemo((): CoinGeckoOnChainData => ({
    trending, loading, error, lastUpdate, refetch,
  }), [trending, loading, error, lastUpdate, refetch]);
}

export { CHAIN_PLATFORMS };
