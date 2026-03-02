/**
 * useLiquidations.ts — ZERØ MERIDIAN
 * Real-time Binance Futures forced liquidation stream
 * wss://fstream.binance.com/ws/!forceOrder@arr
 *
 * Architecture 2026:
 * - Ring buffer (max 200 events, oldest dropped)
 * - RAF-gated dispatch (no render flood on mass liq events)
 * - Computed stats: total long/short liq, largest event, liq per minute
 * - Deterministic reconnect + full cleanup
 */

import { useEffect, useRef, useCallback, useReducer } from 'react';
import { getReconnectDelay } from '@/lib/formatters';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LiquidationEvent {
  id: string;            // unique: symbol + ts + orderId
  symbol: string;        // e.g. BTCUSDT
  side: 'BUY' | 'SELL'; // BUY = short got liquidated, SELL = long got liquidated
  price: number;
  origQty: number;       // original order qty
  lastFilledQty: number;
  lastFilledPrice: number;
  usdValue: number;      // approx USD value
  timestamp: number;     // ms epoch
  isMajor: boolean;      // > $100k
  isWhale: boolean;      // > $1M
}

export interface LiquidationStats {
  totalLongLiqUsd: number;   // total USD value of long liquidations (side=SELL)
  totalShortLiqUsd: number;  // total USD value of short liquidations (side=BUY)
  largestEvent: LiquidationEvent | null;
  eventsPerMinute: number;
  recentCount: number;       // last 60s
}

export interface LiquidationsState {
  events: LiquidationEvent[];
  stats: LiquidationStats;
  wsStatus: 'connected' | 'disconnected' | 'reconnecting';
}

// ─── Constants ────────────────────────────────────────────────────────────────

const WS_URL = 'wss://fstream.binance.com/ws/!forceOrder@arr';
const MAX_EVENTS = 200;
const RING_BUFFER_THRESHOLD = MAX_EVENTS + 50; // trim when exceeds this

// ─── Helpers ──────────────────────────────────────────────────────────────────

let _idSeq = 0;

function computeStats(events: LiquidationEvent[]): LiquidationStats {
  if (events.length === 0) {
    return {
      totalLongLiqUsd: 0,
      totalShortLiqUsd: 0,
      largestEvent: null,
      eventsPerMinute: 0,
      recentCount: 0,
    };
  }

  const now = Date.now();
  const oneMinAgo = now - 60_000;

  let totalLongLiqUsd = 0;
  let totalShortLiqUsd = 0;
  let largestUsd = 0;
  let largestEvent: LiquidationEvent | null = null;
  let recentCount = 0;

  for (const e of events) {
    // side=SELL means a long position was liquidated
    if (e.side === 'SELL') totalLongLiqUsd += e.usdValue;
    else totalShortLiqUsd += e.usdValue;

    if (e.usdValue > largestUsd) {
      largestUsd = e.usdValue;
      largestEvent = e;
    }

    if (e.timestamp >= oneMinAgo) recentCount++;
  }

  return {
    totalLongLiqUsd,
    totalShortLiqUsd,
    largestEvent,
    eventsPerMinute: recentCount,
    recentCount,
  };
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

type Action =
  | { type: 'ADD'; events: LiquidationEvent[] }
  | { type: 'STATUS'; status: LiquidationsState['wsStatus'] };

interface InternalState {
  events: LiquidationEvent[];
  wsStatus: LiquidationsState['wsStatus'];
}

function reducer(state: InternalState, action: Action): InternalState {
  switch (action.type) {
    case 'ADD': {
      const merged = [...action.events, ...state.events];
      const trimmed = merged.length > RING_BUFFER_THRESHOLD
        ? merged.slice(0, MAX_EVENTS)
        : merged;
      return { ...state, events: trimmed };
    }
    case 'STATUS':
      return { ...state, wsStatus: action.status };
    default:
      return state;
  }
}

const INITIAL: InternalState = {
  events: [],
  wsStatus: 'disconnected',
};

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useLiquidations(): LiquidationsState {
  const [state, dispatch] = useReducer(reducer, INITIAL);

  const mountedRef = useRef(true);
  const wsRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef(0);
  const rafRef = useRef<number>(0);
  const pendingBatchRef = useRef<LiquidationEvent[]>([]);

  const scheduleFlush = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      if (!mountedRef.current || pendingBatchRef.current.length === 0) return;
      const batch = pendingBatchRef.current;
      pendingBatchRef.current = [];
      dispatch({ type: 'ADD', events: batch });
    });
  }, []);

  const connectWS = useCallback(() => {
    if (!mountedRef.current) return;
    dispatch({ type: 'STATUS', status: 'reconnecting' });

    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) { ws.close(); return; }
      attemptRef.current = 0;
      dispatch({ type: 'STATUS', status: 'connected' });
    };

    ws.onmessage = (event: MessageEvent) => {
      if (!mountedRef.current) return;
      try {
        // Binance sends either single object or array
        const raw = JSON.parse(event.data as string);
        const items = Array.isArray(raw) ? raw : [raw];

        for (const item of items) {
          // forceOrder stream wraps in { e: 'forceOrder', o: {...} }
          const o = item.o ?? item;
          if (!o || !o.s) continue;

          const lastFilledQty = parseFloat(o.l ?? '0');
          const lastFilledPrice = parseFloat(o.ap ?? o.p ?? '0');
          const origQty = parseFloat(o.q ?? '0');
          const usdValue = lastFilledQty * lastFilledPrice;

          const ev: LiquidationEvent = {
            id: o.s + '_' + (o.T ?? Date.now()) + '_' + (++_idSeq),
            symbol: o.s as string,
            side: (o.S === 'BUY' ? 'BUY' : 'SELL') as 'BUY' | 'SELL',
            price: parseFloat(o.p ?? '0'),
            origQty,
            lastFilledQty,
            lastFilledPrice,
            usdValue,
            timestamp: o.T ?? Date.now(),
            isMajor: usdValue >= 100_000,
            isWhale: usdValue >= 1_000_000,
          };

          pendingBatchRef.current.push(ev);
        }

        if (pendingBatchRef.current.length > 0) scheduleFlush();
      } catch {
        // malformed frame — skip
      }
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      dispatch({ type: 'STATUS', status: 'disconnected' });
      if (attemptRef.current < 10) {
        const delay = getReconnectDelay(attemptRef.current);
        attemptRef.current += 1;
        setTimeout(connectWS, delay);
      }
    };

    ws.onerror = () => { ws.close(); };
  }, [scheduleFlush]);

  useEffect(() => {
    mountedRef.current = true;
    connectWS();

    return () => {
      mountedRef.current = false;
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = 0;
      }
      wsRef.current?.close();
      pendingBatchRef.current = [];
    };
  }, [connectWS]);

  // Compute stats inline (lightweight, no useMemo needed at this scale)
  const stats = computeStats(state.events);

  return {
    events: state.events,
    stats,
    wsStatus: state.wsStatus,
  };
}
