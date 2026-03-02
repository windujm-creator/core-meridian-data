/**
 * useTokenTerminal.ts — ZERØ MERIDIAN 2026 Phase 11
 * Token Terminal free tier — protocol revenue, fees, P/E ratios.
 * Public API: no key required for basic endpoints.
 * Zero JSX. Zero any. React Query. mountedRef + AbortController.
 */

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProtocolRevenue {
  projectId:             string;
  name:                  string;
  symbol:                string;
  logoUrl:               string;
  categoryTags:          string[];
  revenueOneDayUsd:      number;
  revenueSevenDayUsd:    number;
  revenueThirtyDayUsd:   number;
  revenueAnnualizedUsd:  number;
  feesOneDayUsd:         number;
  feesSevenDayUsd:       number;
  feesThirtyDayUsd:      number;
  priceToSalesRatio:     number | null;
  priceToEarningsRatio:  number | null;
  treasuryUsd:           number | null;
  marketcapUsd:          number | null;
  fdvUsd:                number | null;
}

export interface TokenTerminalState {
  protocols:    ProtocolRevenue[];
  topByRevenue: ProtocolRevenue[];
  topByFees:    ProtocolRevenue[];
  isLoading:    boolean;
  isError:      boolean;
  refetch:      () => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const BASE = 'https://api.tokenterminal.com/v2';

// ─── Fetch helpers ────────────────────────────────────────────────────────────

async function fetchProtocolRevenue(signal: AbortSignal): Promise<ProtocolRevenue[]> {
  try {
    const res = await fetch(BASE + '/projects', {
      signal,
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) return [];
    const json = await res.json() as { data?: Record<string, unknown>[] };
    const items = json.data ?? [];

    return items
      .map((d): ProtocolRevenue | null => {
        if (!d['project_id'] || !d['name']) return null;
        return {
          projectId:             String(d['project_id']),
          name:                  String(d['name'] ?? ''),
          symbol:                String(d['symbol'] ?? ''),
          logoUrl:               String(d['logo'] ?? ''),
          categoryTags:          Array.isArray(d['tags']) ? (d['tags'] as unknown[]).map(String) : [],
          revenueOneDayUsd:      Number(d['revenue_1d']      ?? 0),
          revenueSevenDayUsd:    Number(d['revenue_7d']      ?? 0),
          revenueThirtyDayUsd:   Number(d['revenue_30d']     ?? 0),
          revenueAnnualizedUsd:  Number(d['revenue_annualized'] ?? 0),
          feesOneDayUsd:         Number(d['fees_1d']         ?? 0),
          feesSevenDayUsd:       Number(d['fees_7d']         ?? 0),
          feesThirtyDayUsd:      Number(d['fees_30d']        ?? 0),
          priceToSalesRatio:     d['ps'] != null ? Number(d['ps']) : null,
          priceToEarningsRatio:  d['pe'] != null ? Number(d['pe']) : null,
          treasuryUsd:           d['treasury'] != null ? Number(d['treasury']) : null,
          marketcapUsd:          d['market_cap_circulating'] != null ? Number(d['market_cap_circulating']) : null,
          fdvUsd:                d['market_cap_fully_diluted'] != null ? Number(d['market_cap_fully_diluted']) : null,
        };
      })
      .filter((item): item is ProtocolRevenue => item !== null);
  } catch {
    return [];
  }
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTokenTerminal(): TokenTerminalState {
  const query = useQuery({
    queryKey: ['token-terminal-protocols'],
    queryFn: async ({ signal }) => fetchProtocolRevenue(signal),
    staleTime:       300_000,
    refetchInterval: 300_000,
    retry: 2,
    retryDelay: (i) => Math.min(1000 * 2 ** i, 20000),
  });

  const protocols = query.data ?? [];

  const topByRevenue = useMemo(() =>
    [...protocols]
      .filter(p => p.revenueThirtyDayUsd > 0)
      .sort((a, b) => b.revenueThirtyDayUsd - a.revenueThirtyDayUsd)
      .slice(0, 10),
    [protocols]
  );

  const topByFees = useMemo(() =>
    [...protocols]
      .filter(p => p.feesThirtyDayUsd > 0)
      .sort((a, b) => b.feesThirtyDayUsd - a.feesThirtyDayUsd)
      .slice(0, 10),
    [protocols]
  );

  const refetch = useMemo(() => () => { query.refetch(); }, [query]);

  return useMemo(() => ({
    protocols,
    topByRevenue,
    topByFees,
    isLoading: query.isLoading,
    isError:   query.isError,
    refetch,
  }), [protocols, topByRevenue, topByFees, query.isLoading, query.isError, refetch]);
}
