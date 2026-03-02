/**
 * useWasm.ts — ZERØ MERIDIAN 2026 Phase 9
 * WebAssembly orderbook computation engine.
 * Tries to load /wasm/orderbook.wasm, falls back to pure JS.
 * Zero JSX ✓  mountedRef ✓  AbortController ✓  useCallback/useMemo ✓
 */
import { useRef, useState, useEffect, useCallback, useMemo } from 'react';

export interface OrderLevel { price: number; qty: number; }

export interface WasmOrderBookResult {
  midPrice: number; spread: number; spreadPct: number;
  imbalance: number; bidVwap: number; askVwap: number;
  totalBidQty: number; totalAskQty: number;
}

export type WasmStatus = 'idle' | 'loading' | 'ready' | 'fallback' | 'error';
export interface WasmAPI {
  status: WasmStatus; isNative: boolean;
  compute: (bids: OrderLevel[], asks: OrderLevel[]) => WasmOrderBookResult;
  benchmarkNs: number;
}

interface WasmExports { compute: (a: number, b: number, n: number, r: number) => void; mem: WebAssembly.Memory; }
interface WasmInst { exports: WasmExports; }

function jsCompute(bids: OrderLevel[], asks: OrderLevel[]): WasmOrderBookResult {
  let tbq = 0, bvn = 0, taq = 0, avn = 0;
  for (const b of bids) { tbq += b.qty; bvn += b.price * b.qty; }
  for (const a of asks) { taq += a.qty; avn += a.price * a.qty; }
  const bb = bids[0]?.price ?? 0, ba = asks[0]?.price ?? 0;
  const mid = (bb + ba) / 2, spread = ba - bb;
  const tot = tbq + taq;
  return {
    midPrice: mid, spread, spreadPct: mid > 0 ? (spread / mid) * 100 : 0,
    imbalance: tot > 0 ? (tbq - taq) / tot : 0,
    bidVwap: tbq > 0 ? bvn / tbq : bb, askVwap: taq > 0 ? avn / taq : ba,
    totalBidQty: tbq, totalAskQty: taq,
  };
}

async function tryLoad(signal: AbortSignal): Promise<WasmInst | null> {
  if (typeof WebAssembly === 'undefined') return null;
  try {
    const r = await fetch('/wasm/orderbook.wasm', { signal });
    if (!r.ok) return null;
    const buf = await r.arrayBuffer();
    if (!buf.byteLength) return null;
    const { instance } = await WebAssembly.instantiate(buf, { env: { memory: new WebAssembly.Memory({ initial: 4 }) } });
    return instance as unknown as WasmInst;
  } catch { return null; }
}

export function useWasm(): WasmAPI {
  const mountedRef = useRef(true);
  const wasmRef    = useRef<WasmInst | null>(null);
  const [status, setStatus]   = useState<WasmStatus>('idle');
  const [isNative, setNative] = useState(false);
  const [benchmarkNs, setBench] = useState(0);

  useEffect(() => {
    mountedRef.current = true;
    const ctrl = new AbortController();
    async function init() {
      if (!mountedRef.current) return;
      setStatus('loading');
      const inst = await tryLoad(ctrl.signal);
      if (!mountedRef.current) return;
      if (inst) { wasmRef.current = inst; setNative(true); setStatus('ready'); }
      else { setNative(false); setStatus('fallback'); }
    }
    init().catch(() => { if (mountedRef.current) setStatus('fallback'); });
    return () => { mountedRef.current = false; ctrl.abort(); };
  }, []);

  const compute = useCallback((bids: OrderLevel[], asks: OrderLevel[]): WasmOrderBookResult => {
    const t0 = performance.now();
    let res: WasmOrderBookResult;
    const w = wasmRef.current;
    if (w && isNative && bids.length > 0 && asks.length > 0) {
      try {
        const mem = new Float64Array(w.exports.mem.buffer);
        const n = Math.min(bids.length, asks.length, 100);
        const bo = 0, ao = n * 2, ro = n * 4;
        for (let i = 0; i < n; i++) {
          mem[bo + i*2] = bids[i].price; mem[bo + i*2+1] = bids[i].qty;
          mem[ao + i*2] = asks[i].price; mem[ao + i*2+1] = asks[i].qty;
        }
        w.exports.compute(bo*8, ao*8, n, ro*8);
        const [tbq,bv,taq,av,mid,sp,imb] = [mem[ro],mem[ro+1],mem[ro+2],mem[ro+3],mem[ro+4],mem[ro+5],mem[ro+6]];
        res = { midPrice: mid, spread: sp, spreadPct: mid>0?(sp/mid)*100:0, imbalance: imb, bidVwap: bv, askVwap: av, totalBidQty: tbq, totalAskQty: taq };
      } catch { res = jsCompute(bids, asks); }
    } else { res = jsCompute(bids, asks); }
    const ns = (performance.now() - t0) * 1_000_000;
    if (mountedRef.current) setBench(Math.round(ns));
    return res;
  }, [isNative]);

  return useMemo(() => ({ status, isNative, compute, benchmarkNs }), [status, isNative, compute, benchmarkNs]);
}
