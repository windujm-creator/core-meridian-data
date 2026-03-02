/**
 * useGlobalStats.ts — ZERØ MERIDIAN 2026 Phase 7
 * UPGRADE: Migrated to React Query for automatic caching + background refetch.
 * Same public interface as Phase 5. Zero JSX. Zero any.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

export interface GlobalStats {
  totalMarketCap:     number;
  totalVolume24h:     number;
  btcDominance:       number;
  ethDominance:       number;
  activeCryptos:      number;
  marketCapChange24h: number;
  fearGreedValue:     number;
  fearGreedLabel:     string;
  loading:            boolean;
  lastUpdate:         number;
}

const CG_GLOBAL  = 'https://api.coingecko.com/api/v3/global';
const FNG_URL    = 'https://api.alternative.me/fng/?limit=1';
const REFRESH_MS = 60_000;

function safeNum(v: unknown): number {
  const n = Number(v);
  return isFinite(n) ? n : 0;
}

type CGGlobalResponse = {
  data: {
    total_market_cap:                         Record<string, number>;
    total_volume:                             Record<string, number>;
    market_cap_percentage:                    Record<string, number>;
    active_cryptocurrencies:                  number;
    market_cap_change_percentage_24h_usd:     number;
  };
};

type FNGResponse = {
  data: { value: string; value_classification: string }[];
};

export function useGlobalStats(): GlobalStats {
  const cgQuery = useQuery<CGGlobalResponse>({
    queryKey:       ['global-stats'],
    queryFn:        async ({ signal }) => {
      const res = await fetch(CG_GLOBAL, { signal });
      if (!res.ok) throw new Error('global stats fetch failed');
      return res.json() as Promise<CGGlobalResponse>;
    },
    staleTime:      REFRESH_MS,
    refetchInterval: REFRESH_MS,
    retry:          2,
    retryDelay:     (i) => Math.min(1000 * 2 ** i, 30_000),
  });

  const fngQuery = useQuery<FNGResponse>({
    queryKey:       ['fear-greed'],
    queryFn:        async ({ signal }) => {
      const res = await fetch(FNG_URL, { signal });
      if (!res.ok) throw new Error('fng fetch failed');
      return res.json() as Promise<FNGResponse>;
    },
    staleTime:      5 * 60_000,  // Fear & Greed updates less frequently
    refetchInterval: 5 * 60_000,
    retry:          2,
    retryDelay:     (i) => Math.min(1000 * 2 ** i, 30_000),
  });

  return useMemo((): GlobalStats => {
    const d = cgQuery.data?.data;
    const fng = fngQuery.data?.data?.[0];

    return {
      totalMarketCap:     safeNum(d?.total_market_cap?.usd),
      totalVolume24h:     safeNum(d?.total_volume?.usd),
      btcDominance:       safeNum(d?.market_cap_percentage?.btc),
      ethDominance:       safeNum(d?.market_cap_percentage?.eth),
      activeCryptos:      safeNum(d?.active_cryptocurrencies),
      marketCapChange24h: safeNum(d?.market_cap_change_percentage_24h_usd),
      fearGreedValue:     fng ? safeNum(fng.value) : 50,
      fearGreedLabel:     fng?.value_classification ?? 'Neutral',
      loading:            cgQuery.isLoading || fngQuery.isLoading,
      lastUpdate:         Math.max(cgQuery.dataUpdatedAt ?? 0, fngQuery.dataUpdatedAt ?? 0),
    };
  }, [cgQuery.data, cgQuery.isLoading, cgQuery.dataUpdatedAt, fngQuery.data, fngQuery.isLoading, fngQuery.dataUpdatedAt]);
}
