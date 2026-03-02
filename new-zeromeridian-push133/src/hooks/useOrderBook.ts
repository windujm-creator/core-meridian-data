/**
 * useOrderBook.ts — ZERØ MERIDIAN
 * Pure TypeScript — zero JSX, zero React components in this file.
 * WebSocket: wss://stream.binance.com:9443/ws/{symbol}@depth20@100ms
 * RAF-gated dispatch, exponential backoff, full cleanup.
 */

import { useEffect, useRef, useCallback, useReducer } from 'react';
import { getReconnectDelay } from '@/lib/formatters';

export interface OrderBookLevel {
  price: number;
  size: number;
  cumSize: number;
  depthPct: number;
  delta: 'new' | 'removed' | 'up' | 'down' | 'same';
}

export interface OrderBookState {
  symbol: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
  spreadPct: number;
  midPrice: number;
  lastUpdateMs: number;
  wsStatus: 'connected' | 'disconnected' | 'reconnecting';
  totalBidSize: number;
  totalAskSize: number;
  bidAskRatio: number;
}

interface RawLevel {
  price: number;
  size: number;
}

interface InternalState {
  bids: RawLevel[];
  asks: RawLevel[];
  lastUpdateMs: number;
  wsStatus: 'connected' | 'disconnected' | 'reconnecting';
}

export const ORDER_BOOK_SYMBOLS = Object.freeze([
  'btcusdt', 'ethusdt', 'solusdt', 'bnbusdt', 'xrpusdt',
  'adausdt', 'avaxusdt', 'dogeusdt', 'dotusdt', 'maticusdt',
  'linkusdt', 'uniusdt', 'ltcusdt', 'trxusdt', 'tonusdt',
  'arbusdt', 'opusdt', 'nearusdt', 'atomusdt', 'shibusdt',
] as const);

export type OrderBookSymbol = typeof ORDER_BOOK_SYMBOLS[number];

const DEPTH_LEVELS = 20;

function parseLevel(raw: [string, string]): RawLevel {
  return { price: parseFloat(raw[0]), size: parseFloat(raw[1]) };
}

function computeLevels(rawLevels: RawLevel[], prevLevels: RawLevel[]): OrderBookLevel[] {
  if (rawLevels.length === 0) return [];
  const prevMap = new Map<number, number>();
  for (const l of prevLevels) prevMap.set(l.price, l.size);
  const clamped = rawLevels.slice(0, DEPTH_LEVELS);
  let cumSize = 0;
  const withCum = clamped.map(l => { cumSize += l.size; return { price: l.price, size: l.size, cumSize }; });
  const maxCum = withCum.length > 0 ? withCum[withCum.length - 1].cumSize : 1;
  return withCum.map(l => {
    const prev = prevMap.get(l.price);
    let delta: OrderBookLevel['delta'] = 'same';
    if (prev === undefined) delta = 'new';
    else if (l.size === 0) delta = 'removed';
    else if (l.size > prev) delta = 'up';
    else if (l.size < prev) delta = 'down';
    return { price: l.price, size: l.size, cumSize: l.cumSize, depthPct: maxCum > 0 ? (l.cumSize / maxCum) * 100 : 0, delta };
  });
}

type Action =
  | { type: 'UPDATE'; bids: RawLevel[]; asks: RawLevel[]; ts: number }
  | { type: 'STATUS'; status: InternalState['wsStatus'] };

function reducer(state: InternalState, action: Action): InternalState {
  switch (action.type) {
    case 'UPDATE': return { ...state, bids: action.bids, asks: action.asks, lastUpdateMs: action.ts };
    case 'STATUS': return { ...state, wsStatus: action.status };
    default: return state;
  }
}

const INITIAL_STATE: InternalState = { bids: [], asks: [], lastUpdateMs: 0, wsStatus: 'disconnected' };

export function useOrderBook(symbol: OrderBookSymbol = 'btcusdt'): OrderBookState {
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const mountedRef = useRef(true);
  const wsRef = useRef<WebSocket | null>(null);
  const attemptRef = useRef(0);
  const rafRef = useRef<number>(0);
  const pendingRef = useRef<{ bids: RawLevel[]; asks: RawLevel[]; ts: number } | null>(null);
  const prevBidsRef = useRef<RawLevel[]>([]);
  const prevAsksRef = useRef<RawLevel[]>([]);

  const scheduleFlush = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = 0;
      const pending = pendingRef.current;
      if (!pending || !mountedRef.current) return;
      pendingRef.current = null;
      prevBidsRef.current = pending.bids;
      prevAsksRef.current = pending.asks;
      dispatch({ type: 'UPDATE', bids: pending.bids, asks: pending.asks, ts: pending.ts });
    });
  }, []);

  const connectWS = useCallback(() => {
    if (!mountedRef.current) return;
    dispatch({ type: 'STATUS', status: 'reconnecting' });
    const url = 'wss://stream.binance.com:9443/ws/' + symbol + '@depth20@100ms';
    const ws = new WebSocket(url);
    wsRef.current = ws;
    ws.onopen = () => {
      if (!mountedRef.current) { ws.close(); return; }
      attemptRef.current = 0;
      dispatch({ type: 'STATUS', status: 'connected' });
    };
    ws.onmessage = (event: MessageEvent) => {
      if (!mountedRef.current) return;
      try {
        const msg = JSON.parse(event.data as string);
        const rawBids = (msg.bids as [string, string][]).map(parseLevel);
        const rawAsks = (msg.asks as [string, string][]).map(parseLevel);
        pendingRef.current = { bids: rawBids, asks: rawAsks, ts: Date.now() };
        scheduleFlush();
      } catch { }
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
  }, [symbol, scheduleFlush]);

  useEffect(() => {
    mountedRef.current = true;
    prevBidsRef.current = [];
    prevAsksRef.current = [];
    connectWS();
    return () => {
      mountedRef.current = false;
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = 0; }
      wsRef.current?.close();
      pendingRef.current = null;
    };
  }, [connectWS]);

  const bids = computeLevels(state.bids, prevBidsRef.current);
  const asks = computeLevels(state.asks, prevAsksRef.current);
  const bestBid = bids[0]?.price ?? 0;
  const bestAsk = asks[0]?.price ?? 0;
  const spread = bestAsk > 0 && bestBid > 0 ? bestAsk - bestBid : 0;
  const midPrice = bestBid > 0 && bestAsk > 0 ? (bestBid + bestAsk) / 2 : 0;
  const spreadPct = midPrice > 0 ? (spread / midPrice) * 100 : 0;
  const totalBidSize = state.bids.reduce((s, l) => s + l.size, 0);
  const totalAskSize = state.asks.reduce((s, l) => s + l.size, 0);
  const totalSize = totalBidSize + totalAskSize;
  const bidAskRatio = totalSize > 0 ? totalBidSize / totalSize : 0.5;

  return { symbol, bids, asks, spread, spreadPct, midPrice, lastUpdateMs: state.lastUpdateMs, wsStatus: state.wsStatus, totalBidSize, totalAskSize, bidAskRatio };
}
