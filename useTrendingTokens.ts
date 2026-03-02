/**
 * useTrendingTokens.ts — ZERØ MERIDIAN push129
 * push129: Zero :any — all API responses typed with proper interfaces
 * Real data: CoinGecko free public API — no key required.
 * Zero JSX. mountedRef + AbortController. useCallback/useMemo.
 */

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';

export interface TrendingToken {
  id: string;
  symbol: string;
  name: string;
  thumb: string;
  marketCapRank: number | null;
  price: number;
  priceChange24h: number;
  priceChange7d: number;
  volume24h: number;
  marketCap: number;
  trendingRank: number;
}

export interface TokensState {
  trending: TrendingToken[];
  gainers: TrendingToken[];
  losers: TrendingToken[];
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

// ─── Raw API types ─────────────────────────────────────────────────────────────

interface CGTrendingItem {
  item?: {
    id?: string;
    symbol?: string;
    name?: string;
    thumb?: string;
    market_cap_rank?: number | null;
  };
}

interface CGTrendingResponse {
  coins?: CGTrendingItem[];
}

interface CGMarketCoin {
  id: string;
  symbol?: string;
  name?: string;
  image?: string;
  market_cap_rank?: number | null;
  current_price?: number;
  price_change_percentage_24h?: number;
  price_change_percentage_7d_in_currency?: number;
  total_volume?: number;
  market_cap?: number;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CG_TRENDING = 'https://api.coingecko.com/api/v3/search/trending';
const CG_MARKETS  = 'https://api.coingecko.com/api/v3/coins/markets';
const REFRESH_MS  = 60_000;

const INITIAL_STATE: TokensState = Object.freeze({
  trending: [],
  gainers: [],
  losers: [],
  loading: true,
  error: null,
  lastUpdated: null,
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toToken(c: CGMarketCoin, rank?: number): TrendingToken {
  return {
    id:             c.id,
    symbol:         (c.symbol ?? '').toUpperCase(),
    name:           c.name ?? '',
    thumb:          c.image ?? '',
    marketCapRank:  c.market_cap_rank ?? null,
    price:          c.current_price ?? 0,
    priceChange24h: c.price_change_percentage_24h ?? 0,
    priceChange7d:  c.price_change_percentage_7d_in_currency ?? 0,
    volume24h:      c.total_volume ?? 0,
    marketCap:      c.market_cap ?? 0,
    trendingRank:   rank ?? 99,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTrendingTokens() {
  const [state, setState] = useState<TokensState>(INITIAL_STATE);
  const mountedRef        = useRef(true);
  const abortRef          = useRef(new AbortController());
  const timerRef          = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchData = useCallback(async () => {
    abortRef.current.abort();
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    if (!mountedRef.current) return;
    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      // Step 1: get trending list
      const trendRes = await fetch(CG_TRENDING, { signal });
      if (!trendRes.ok) throw new Error('Trending fetch failed: ' + trendRes.status);
      const trendJson = await trendRes.json() as CGTrendingResponse;

      const trendingCoins: Array<{ id: string; rank: number }> =
        (trendJson?.coins ?? []).slice(0, 15)
          .map((c, i) => ({ id: c.item?.id ?? '', rank: i + 1 }))
          .filter(c => c.id.length > 0);

      if (!mountedRef.current) return;

      // Step 2: market data for trending coins
      const ids = trendingCoins.map(c => c.id).join(',');
      const marketsUrl = CG_MARKETS
        + '?vs_currency=usd'
        + '&ids=' + ids
        + '&order=market_cap_desc'
        + '&per_page=50'
        + '&page=1'
        + '&sparkline=false'
        + '&price_change_percentage=7d';

      const markRes = await fetch(marketsUrl, { signal });
      if (!markRes.ok) throw new Error('Markets fetch failed: ' + markRes.status);
      const markJson = await markRes.json() as CGMarketCoin[];

      if (!mountedRef.current) return;

      // Step 3: top 100 for gainers/losers
      const top100Url = CG_MARKETS
        + '?vs_currency=usd'
        + '&order=market_cap_desc'
        + '&per_page=100'
        + '&page=1'
        + '&sparkline=false'
        + '&price_change_percentage=7d';

      const top100Res = await fetch(top100Url, { signal });
      if (!top100Res.ok) throw new Error('Top100 fetch failed: ' + top100Res.status);
      const top100Json = await top100Res.json() as CGMarketCoin[];

      if (!mountedRef.current) return;

      const rankMap = new Map(trendingCoins.map(c => [c.id, c.rank]));

      const trending = markJson
        .map(c => toToken(c, rankMap.get(c.id)))
        .sort((a, b) => a.trendingRank - b.trendingRank);

      const sorted24h = [...top100Json].sort(
        (a, b) => (b.price_change_percentage_24h ?? 0) - (a.price_change_percentage_24h ?? 0)
      );
      const gainers = sorted24h.slice(0, 10).map(c => toToken(c));
      const losers  = sorted24h.slice(-10).reverse().map(c => toToken(c));

      setState({ trending, gainers, losers, loading: false, error: null, lastUpdated: Date.now() });

    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return;
      if (!mountedRef.current) return;
      setState(prev => ({
        ...prev,
        loading: false,
        error: (err instanceof Error) ? err.message : 'Unknown error',
      }));
    }

    if (mountedRef.current) {
      timerRef.current = setTimeout(() => {
        if (mountedRef.current) fetchData();
      }, REFRESH_MS);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchData();
    return () => {
      mountedRef.current = false;
      abortRef.current.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fetchData]);

  const refetch = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    fetchData();
  }, [fetchData]);

  return useMemo(() => ({ ...state, refetch }), [state, refetch]);
}
