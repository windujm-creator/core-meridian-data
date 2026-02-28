/**
 * CryptoContext.tsx — ZERØ MERIDIAN 2026 Phase 7
 * UPGRADE Phase 7:
 * - useSharedBuffer: zero-copy price ring buffer (SAB) for perf-sensitive consumers
 * Previous: BroadcastChannel leader election + Web Worker merge + memory pool
 */

import React, {
  createContext, useContext, useReducer, useMemo,
  useEffect, useRef, useCallback,
  type ReactNode,
} from 'react';
import {
  type CryptoAsset, type GlobalData, type FearGreedData,
  type MarketRegime, type AISignal,
  detectRegime, computeSignal,
} from '@/lib/formatters';
import { useSharedBuffer } from '@/hooks/useSharedBuffer';

// ─── Types ────────────────────────────────────────────────────────────────────

interface CryptoState {
  assets:   CryptoAsset[];
  global:   GlobalData;
  fearGreed: FearGreedData;
  regime:   MarketRegime;
  signal:   AISignal;
  wsStatus: 'connected' | 'disconnected' | 'reconnecting';
  loading:  boolean;
  error:    string | null;
  isLeader: boolean;
  tabCount: number;
}

type PriceUpdate = {
  price: number; change24h: number;
  high24h?: number; low24h?: number; volume24h?: number;
  direction?: 'up' | 'down' | 'neutral';
};

export type CryptoAction =
  | { type: 'UPDATE_PRICES';    payload: Record<string, PriceUpdate> }
  | { type: 'UPDATE_MARKETS';   payload: CryptoAsset[] }
  | { type: 'UPDATE_GLOBAL';    payload: GlobalData }
  | { type: 'UPDATE_FEAR_GREED'; payload: FearGreedData }
  | { type: 'SET_LOADING';      payload: boolean }
  | { type: 'SET_ERROR';        payload: string | null }
  | { type: 'SET_WS_STATUS';    payload: 'connected' | 'disconnected' | 'reconnecting' }
  | { type: 'SET_LEADER';       payload: boolean }
  | { type: 'SET_TAB_COUNT';    payload: number }
  | { type: '_WORKER_PRICES';   payload: { assets: CryptoAsset[]; regime: MarketRegime; signal: AISignal } };

// ─── Memory pool ──────────────────────────────────────────────────────────────

function mergePricesPool(
  assets: CryptoAsset[],
  updates: Record<string, PriceUpdate>
): CryptoAsset[] {
  let changed = false;
  const result: CryptoAsset[] = new Array(assets.length);
  for (let i = 0; i < assets.length; i++) {
    const a = assets[i];
    const key = a.symbol.toLowerCase() + 'usdt';
    const tick = updates[key];
    if (tick) {
      changed = true;
      result[i] = {
        id: a.id, symbol: a.symbol, name: a.name,
        price: tick.price, change24h: tick.change24h,
        change7d: a.change7d, change30d: a.change30d,
        marketCap: a.marketCap,
        volume24h: tick.volume24h ?? a.volume24h,
        high24h: tick.high24h ?? a.high24h,
        low24h: tick.low24h ?? a.low24h,
        circulatingSupply: a.circulatingSupply,
        totalSupply: a.totalSupply,
        ath: a.ath, athDate: a.athDate,
        rank: a.rank, image: a.image,
        sparkline: a.sparkline, lastUpdated: a.lastUpdated,
        priceDirection: tick.direction ?? 'neutral',
      };
    } else {
      result[i] = a;
    }
  }
  return changed ? result : assets;
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

const initialState: CryptoState = {
  assets:    [],
  global:    { totalMcap: 0, totalVolume: 0, btcDominance: 0, ethDominance: 0, activeCurrencies: 0, mcapChange24h: 0 },
  fearGreed: { value: 50, label: 'Neutral' },
  regime:    'CRAB',
  signal:    'NEUTRAL',
  wsStatus:  'disconnected',
  loading:   true,
  error:     null,
  isLeader:  false,
  tabCount:  1,
};

function cryptoReducer(state: CryptoState, action: CryptoAction): CryptoState {
  switch (action.type) {
    case 'UPDATE_PRICES': {
      const updated = mergePricesPool(state.assets, action.payload);
      if (updated === state.assets) return state;
      return { ...state, assets: updated, regime: detectRegime(updated), signal: computeSignal(updated) };
    }
    case '_WORKER_PRICES':
      return { ...state, assets: action.payload.assets, regime: action.payload.regime, signal: action.payload.signal };
    case 'UPDATE_MARKETS': {
      const assets = action.payload;
      return { ...state, assets, regime: detectRegime(assets), signal: computeSignal(assets), loading: false };
    }
    case 'UPDATE_GLOBAL':      return { ...state, global: action.payload };
    case 'UPDATE_FEAR_GREED':  return { ...state, fearGreed: action.payload };
    case 'SET_LOADING':        return { ...state, loading: action.payload };
    case 'SET_ERROR':          return { ...state, error: action.payload, loading: false };
    case 'SET_WS_STATUS':      return { ...state, wsStatus: action.payload };
    case 'SET_LEADER':         return { ...state, isLeader: action.payload };
    case 'SET_TAB_COUNT':      return { ...state, tabCount: action.payload };
    default:                   return state;
  }
}

// ─── BroadcastChannel ─────────────────────────────────────────────────────────

const BC_CHANNEL = 'zm_market_sync';

type BCMessage =
  | { type: 'CLAIM_LEADER'; tabId: string }
  | { type: 'LEADER_ACK';   tabId: string }
  | { type: 'PRICE_UPDATE'; payload: Record<string, PriceUpdate> }
  | { type: 'MARKET_UPDATE'; payload: CryptoAsset[] }
  | { type: 'GLOBAL_UPDATE'; payload: GlobalData }
  | { type: 'FNG_UPDATE';   payload: FearGreedData }
  | { type: 'WS_STATUS';    status: 'connected' | 'disconnected' | 'reconnecting' }
  | { type: 'TAB_PING';     tabId: string }
  | { type: 'TAB_PONG';     tabId: string };

const TAB_ID = 'tab_' + Date.now().toString(36) + '_' + ((Date.now() ^ (Date.now() >>> 7)) & 0xffff).toString(16);

// ─── SharedBuffer context ─────────────────────────────────────────────────────

interface SharedBufferAPI {
  supported:   boolean;
  writePrice:  (price: number) => void;
  readLast:    (n: number) => Float64Array;
}

const SharedBufferContext = createContext<SharedBufferAPI>({
  supported:  false,
  writePrice: () => {},
  readLast:   () => new Float64Array(0),
});

export function useSharedPriceBuffer(): SharedBufferAPI {
  return useContext(SharedBufferContext);
}

// ─── Contexts ─────────────────────────────────────────────────────────────────

const CryptoContext         = createContext<CryptoState>(initialState);
const CryptoDispatchContext = createContext<React.Dispatch<CryptoAction>>(() => {});

// ─── Provider ─────────────────────────────────────────────────────────────────

export function CryptoProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(cryptoReducer, initialState);
  const stateValue = useMemo(() => state, [state]);

  // push98: staleRef — hindari stale closure di enhancedDispatch
  const stateRef = useRef(state);
  useEffect(() => { stateRef.current = state; }, [state]);

  // ── SharedArrayBuffer ring buffer (Phase 7) ──────────────────────────────
  const { write: sbWrite, readLast: sbReadLast, supported: sbSupported } = useSharedBuffer();
  const sbWriteRef = useRef(sbWrite);
  sbWriteRef.current = sbWrite;

  const sharedBufferAPI = useMemo<SharedBufferAPI>(() => ({
    supported:  sbSupported,
    writePrice: (price: number) => sbWriteRef.current(price),
    readLast:   (n: number) => sbReadLast(n),
  }), [sbSupported, sbReadLast]);

  // ── Worker ───────────────────────────────────────────────────────────────
  const workerRef      = useRef<Worker | null>(null);
  const workerReadyRef = useRef(false);

  useEffect(() => {
    if (typeof Worker === 'undefined') return;
    try {
      const worker = new Worker(
        new URL('../workers/marketWorker.ts', import.meta.url),
        { type: 'module' }
      );
      workerRef.current      = worker;
      workerReadyRef.current = true;
      worker.onmessage = (e: MessageEvent<{ type: string; assets: CryptoAsset[]; regime: MarketRegime; signal: AISignal }>) => {
        if (e.data.type === 'MERGE_RESULT') {
          dispatch({ type: '_WORKER_PRICES', payload: { assets: e.data.assets, regime: e.data.regime, signal: e.data.signal } });
        }
      };
      worker.onerror = () => { workerReadyRef.current = false; };
    } catch {
      workerReadyRef.current = false;
    }
    return () => {
      workerRef.current?.terminate();
      workerRef.current      = null;
      workerReadyRef.current = false;
    };
  }, []);

  // ── BroadcastChannel ─────────────────────────────────────────────────────
  const bcRef        = useRef<BroadcastChannel | null>(null);
  const isLeaderRef  = useRef(false);
  const tabsRef      = useRef<Set<string>>(new Set([TAB_ID]));

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') {
      isLeaderRef.current = true;
      dispatch({ type: 'SET_LEADER', payload: true });
      return;
    }

    const bc = new BroadcastChannel(BC_CHANNEL);
    bcRef.current = bc;

    bc.onmessage = (e: MessageEvent<BCMessage>) => {
      const msg = e.data;
      switch (msg.type) {
        case 'CLAIM_LEADER':
          if (isLeaderRef.current) bc.postMessage({ type: 'LEADER_ACK', tabId: TAB_ID } satisfies BCMessage);
          break;
        case 'LEADER_ACK':
          if (isLeaderRef.current) { isLeaderRef.current = false; dispatch({ type: 'SET_LEADER', payload: false }); }
          break;
        case 'PRICE_UPDATE':
          if (!isLeaderRef.current) dispatch({ type: 'UPDATE_PRICES', payload: msg.payload });
          break;
        case 'MARKET_UPDATE':
          if (!isLeaderRef.current) dispatch({ type: 'UPDATE_MARKETS', payload: msg.payload });
          break;
        case 'GLOBAL_UPDATE':
          if (!isLeaderRef.current) dispatch({ type: 'UPDATE_GLOBAL', payload: msg.payload });
          break;
        case 'FNG_UPDATE':
          if (!isLeaderRef.current) dispatch({ type: 'UPDATE_FEAR_GREED', payload: msg.payload });
          break;
        case 'WS_STATUS':
          if (!isLeaderRef.current) dispatch({ type: 'SET_WS_STATUS', payload: msg.status });
          break;
        case 'TAB_PING':
          tabsRef.current.add(msg.tabId);
          bc.postMessage({ type: 'TAB_PONG', tabId: TAB_ID } satisfies BCMessage);
          dispatch({ type: 'SET_TAB_COUNT', payload: tabsRef.current.size });
          break;
        case 'TAB_PONG':
          tabsRef.current.add(msg.tabId);
          dispatch({ type: 'SET_TAB_COUNT', payload: tabsRef.current.size });
          break;
      }
    };

    bc.postMessage({ type: 'TAB_PING', tabId: TAB_ID } satisfies BCMessage);
    const leaderTimer = setTimeout(() => {
      isLeaderRef.current = true;
      dispatch({ type: 'SET_LEADER', payload: true });
      bc.postMessage({ type: 'CLAIM_LEADER', tabId: TAB_ID } satisfies BCMessage);
    }, 200);

    return () => {
      clearTimeout(leaderTimer);
      bc.close();
      bcRef.current = null;
    };
  }, []);

  // ── Enhanced dispatch (Worker + BC + SharedBuffer) ────────────────────────
  const enhancedDispatch = useCallback<React.Dispatch<CryptoAction>>((action) => {
    if (action.type === 'UPDATE_PRICES') {
      // Write first price to SharedBuffer ring for perf-sensitive consumers
      const firstTick = Object.values(action.payload)[0];
      if (firstTick?.price) sbWriteRef.current(firstTick.price);

      if (workerReadyRef.current && workerRef.current) {
        workerRef.current.postMessage({ type: 'MERGE_PRICES', assets: stateRef.current.assets, updates: action.payload });
        bcRef.current?.postMessage({ type: 'PRICE_UPDATE', payload: action.payload } satisfies BCMessage);
        return;
      }
      bcRef.current?.postMessage({ type: 'PRICE_UPDATE', payload: action.payload } satisfies BCMessage);
    }
    if (action.type === 'UPDATE_MARKETS')   bcRef.current?.postMessage({ type: 'MARKET_UPDATE', payload: action.payload } satisfies BCMessage);
    if (action.type === 'UPDATE_GLOBAL')    bcRef.current?.postMessage({ type: 'GLOBAL_UPDATE', payload: action.payload } satisfies BCMessage);
    if (action.type === 'UPDATE_FEAR_GREED') bcRef.current?.postMessage({ type: 'FNG_UPDATE', payload: action.payload } satisfies BCMessage);
    if (action.type === 'SET_WS_STATUS')    bcRef.current?.postMessage({ type: 'WS_STATUS', status: action.payload } satisfies BCMessage);
    dispatch(action);
  // push98: empty deps — stateRef.current selalu fresh, tidak perlu [state]
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <SharedBufferContext.Provider value={sharedBufferAPI}>
      <CryptoContext.Provider value={stateValue}>
        <CryptoDispatchContext.Provider value={enhancedDispatch}>
          {children}
        </CryptoDispatchContext.Provider>
      </CryptoContext.Provider>
    </SharedBufferContext.Provider>
  );
}

export function useCrypto()         { return useContext(CryptoContext); }
export function useCryptoDispatch() { return useContext(CryptoDispatchContext); }
