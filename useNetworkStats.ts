/**
 * useNetworkStats.ts — ZERØ MERIDIAN push129
 * push129: Zero :any — all API responses typed with proper interfaces
 * REAL DATA — Public RPC endpoints, no API key required.
 * Zero JSX. mountedRef + AbortController. useCallback/useMemo.
 */

import { useEffect, useRef, useCallback, useState, useMemo } from 'react';

export interface ChainStats {
  id: number;
  name: string;
  symbol: string;
  color: string;
  blockNumber: number;
  gasPriceGwei: number;
  latencyMs: number;
  status: 'online' | 'degraded' | 'offline';
  tpsEstimate: number;
  lastUpdated: number;
  explorerUrl: string;
  rpcUrl: string;
}

export interface NetworksState {
  chains: ChainStats[];
  loading: boolean;
  error: string | null;
  lastUpdated: number | null;
}

// ─── Raw API types ─────────────────────────────────────────────────────────────

interface JsonRpcResult {
  id: number;
  result?: string;
}

// ─── Chain config ──────────────────────────────────────────────────────────────

const CHAINS = Object.freeze([
  { id: 1,     name: 'Ethereum',  symbol: 'ETH',  color: 'rgba(98,126,234,1)',  rpcUrl: 'https://eth.llamarpc.com',               explorerUrl: 'https://etherscan.io',             avgBlockTime: 12 },
  { id: 56,    name: 'BNB Chain', symbol: 'BNB',  color: 'rgba(240,185,11,1)', rpcUrl: 'https://bsc-dataseed1.binance.org',       explorerUrl: 'https://bscscan.com',              avgBlockTime: 3 },
  { id: 137,   name: 'Polygon',   symbol: 'MATIC', color: 'rgba(130,71,229,1)', rpcUrl: 'https://polygon.llamarpc.com',           explorerUrl: 'https://polygonscan.com',          avgBlockTime: 2 },
  { id: 42161, name: 'Arbitrum',  symbol: 'ARB',  color: 'rgba(40,160,240,1)', rpcUrl: 'https://arb1.arbitrum.io/rpc',            explorerUrl: 'https://arbiscan.io',              avgBlockTime: 0.25 },
  { id: 10,    name: 'Optimism',  symbol: 'OP',   color: 'rgba(255,4,32,1)',   rpcUrl: 'https://mainnet.optimism.io',             explorerUrl: 'https://optimistic.etherscan.io',  avgBlockTime: 2 },
  { id: 43114, name: 'Avalanche', symbol: 'AVAX', color: 'rgba(232,65,66,1)',  rpcUrl: 'https://api.avax.network/ext/bc/C/rpc',   explorerUrl: 'https://snowtrace.io',             avgBlockTime: 2 },
  { id: 8453,  name: 'Base',      symbol: 'BASE', color: 'rgba(0,82,255,1)',   rpcUrl: 'https://mainnet.base.org',                explorerUrl: 'https://basescan.org',             avgBlockTime: 2 },
  { id: 250,   name: 'Fantom',    symbol: 'FTM',  color: 'rgba(19,181,236,1)', rpcUrl: 'https://rpc.ftm.tools',                  explorerUrl: 'https://ftmscan.com',              avgBlockTime: 1 },
] as const);

const REFRESH_MS = 15_000;

// ─── Fetch helper ──────────────────────────────────────────────────────────────

async function fetchChainStats(
  chain: typeof CHAINS[number],
  signal: AbortSignal
): Promise<ChainStats> {
  const t0 = Date.now();

  const body = JSON.stringify([
    { jsonrpc: '2.0', id: 1, method: 'eth_blockNumber', params: [] },
    { jsonrpc: '2.0', id: 2, method: 'eth_gasPrice',    params: [] },
  ]);

  const res = await fetch(chain.rpcUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body,
    signal,
  });

  const latencyMs = Date.now() - t0;

  if (!res.ok) {
    return {
      id: chain.id, name: chain.name, symbol: chain.symbol,
      color: chain.color, explorerUrl: chain.explorerUrl, rpcUrl: chain.rpcUrl,
      blockNumber: 0, gasPriceGwei: 0, latencyMs,
      status: 'offline', tpsEstimate: 0, lastUpdated: Date.now(),
    };
  }

  const data = await res.json() as JsonRpcResult[];
  const blockHex    = data.find(d => d.id === 1)?.result ?? '0x0';
  const gasPriceHex = data.find(d => d.id === 2)?.result ?? '0x0';

  const blockNumber  = parseInt(blockHex, 16);
  const gasPriceWei  = parseInt(gasPriceHex, 16);
  const gasPriceGwei = gasPriceWei / 1e9;
  const tpsEstimate  = Math.round(1 / chain.avgBlockTime * 100) / 100;
  const status: ChainStats['status'] = latencyMs > 3000 ? 'degraded' : 'online';

  return {
    id: chain.id, name: chain.name, symbol: chain.symbol,
    color: chain.color, explorerUrl: chain.explorerUrl, rpcUrl: chain.rpcUrl,
    blockNumber, gasPriceGwei: Math.round(gasPriceGwei * 100) / 100,
    latencyMs, status, tpsEstimate, lastUpdated: Date.now(),
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useNetworkStats() {
  const [state, setState] = useState<NetworksState>({
    chains: [], loading: true, error: null, lastUpdated: null,
  });

  const mountedRef = useRef(true);
  const abortRef   = useRef(new AbortController());
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchAll = useCallback(async () => {
    abortRef.current.abort();
    abortRef.current = new AbortController();
    const { signal } = abortRef.current;

    if (!mountedRef.current) return;
    setState(prev => ({ ...prev, loading: prev.chains.length === 0, error: null }));

    try {
      const results = await Promise.allSettled(
        CHAINS.map(chain => fetchChainStats(chain, signal))
      );

      if (!mountedRef.current) return;

      const chains = results.map((r, i) => {
        if (r.status === 'fulfilled') return r.value;
        const c = CHAINS[i];
        return {
          id: c.id, name: c.name, symbol: c.symbol, color: c.color,
          explorerUrl: c.explorerUrl, rpcUrl: c.rpcUrl,
          blockNumber: 0, gasPriceGwei: 0, latencyMs: 9999,
          status: 'offline' as const, tpsEstimate: 0, lastUpdated: Date.now(),
        };
      });

      setState({ chains, loading: false, error: null, lastUpdated: Date.now() });

    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return;
      if (!mountedRef.current) return;
      setState(prev => ({
        ...prev,
        loading: false,
        error: (err instanceof Error) ? err.message : 'Fetch failed',
      }));
    }

    if (mountedRef.current) {
      timerRef.current = setTimeout(() => {
        if (mountedRef.current) fetchAll();
      }, REFRESH_MS);
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    fetchAll();
    return () => {
      mountedRef.current = false;
      abortRef.current.abort();
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [fetchAll]);

  const refetch = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    fetchAll();
  }, [fetchAll]);

  return useMemo(() => ({ ...state, refetch }), [state, refetch]);
}
