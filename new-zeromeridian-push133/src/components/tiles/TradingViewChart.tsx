/**
 * TradingViewChart.tsx — ZERØ MERIDIAN push97
 * FIX BUG #3: Binance klines direct (no /api proxy — CF Pages = static = 404)
 * UPGRADE: cyber-neon design, error state, loading spinner
 */

import { memo, useRef, useEffect, useCallback, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';

type Iv  = '1m'|'5m'|'15m'|'1h'|'4h'|'1d';
type Sym = 'BTCUSDT'|'ETHUSDT'|'SOLUSDT'|'BNBUSDT';

interface Candle { time: number; open: number; high: number; low: number; close: number; value: number; }
interface LWC { createChart(el: HTMLElement, o: Record<string,unknown>): LWCI; }
interface LWCI {
  addCandlestickSeries(o?: Record<string,unknown>): LWS;
  addHistogramSeries(o?: Record<string,unknown>): LWS;
  timeScale(): { fitContent(): void };
  resize(w: number, h: number): void;
  remove(): void;
}
interface LWS { setData(d: unknown[]): void; applyOptions(o: Record<string,unknown>): void; }

const SYMS: readonly Sym[] = Object.freeze(['BTCUSDT','ETHUSDT','SOLUSDT','BNBUSDT']);
const IVS:  readonly Iv[]  = Object.freeze(['1m','5m','15m','1h','4h','1d']);

const SYM_LABEL: Readonly<Record<Sym,string>> = Object.freeze({ BTCUSDT:'BTC', ETHUSDT:'ETH', SOLUSDT:'SOL', BNBUSDT:'BNB' });
const SYM_COLOR: Readonly<Record<Sym,string>> = Object.freeze({
  BTCUSDT:'rgba(251,191,36,1)', ETHUSDT:'rgba(96,165,250,1)',
  SOLUSDT:'rgba(34,255,170,1)', BNBUSDT:'rgba(251,146,60,1)',
});

const CDN = 'https://unpkg.com/lightweight-charts@4.2.0/dist/lightweight-charts.standalone.production.js';

async function fetchCandles(sym: Sym, iv: Iv, signal: AbortSignal): Promise<Candle[]> {
  try {
    // FIX BUG #3: Direct Binance API, no /api proxy
    const url = 'https://api.binance.com/api/v3/klines?symbol=' + sym + '&interval=' + iv + '&limit=300';
    const res = await fetch(url, { signal });
    if (!res.ok) return [];
    const raw = await res.json() as number[][];
    return raw.map(k => ({ time: Math.floor(k[0]/1000), open:+k[1], high:+k[2], low:+k[3], close:+k[4], value:+k[5] }));
  } catch { return []; }
}

let lwReady = false, lwBusy = false;
const lwQ: ((lw: LWC) => void)[] = [];
function loadLW(): Promise<LWC> {
  return new Promise(resolve => {
    const win = window as unknown as Record<string, unknown>;
    if (lwReady && win['LightweightCharts']) { resolve(win['LightweightCharts'] as LWC); return; }
    lwQ.push(resolve);
    if (lwBusy) return;
    lwBusy = true;
    const s = document.createElement('script');
    s.src = CDN; s.async = true; s.crossOrigin = 'anonymous';
    s.onload = () => {
      lwReady = true; lwBusy = false;
      const lw = win['LightweightCharts'] as LWC;
      lwQ.forEach(cb => cb(lw)); lwQ.length = 0;
    };
    document.head.appendChild(s);
  });
}

const TradingViewChart = memo(({ defaultSymbol = 'BTCUSDT' as Sym, defaultInterval = '1h' as Iv, height = 380 }) => {
  const mountedRef = useRef(true);
  const elRef      = useRef<HTMLDivElement>(null);
  const chartRef   = useRef<LWCI|null>(null);
  const candleRef  = useRef<LWS|null>(null);
  const volRef     = useRef<LWS|null>(null);
  const abortRef   = useRef<AbortController|null>(null);
  const roRef      = useRef<ResizeObserver|null>(null);

  const [sym,  setSym]  = useState<Sym>(defaultSymbol);
  const [iv,   setIv]   = useState<Iv>(defaultInterval);
  const [load, setLoad] = useState(true);
  const [last, setLast] = useState<number|null>(null);
  const [prev, setPrev] = useState<number|null>(null);
  const [err,  setErr]  = useState(false);

  const H = height - 70;

  useEffect(() => {
    mountedRef.current = true;
    let chart: LWCI|null = null;
    async function init() {
      const lw = await loadLW();
      if (!mountedRef.current || !elRef.current) return;
      chart = lw.createChart(elRef.current, {
        width: elRef.current.offsetWidth || 600, height: H,
        layout: { background: { color: 'rgba(0,0,0,0)' }, textColor: 'rgba(138,138,158,0.55)', fontFamily: "'JetBrains Mono',monospace", fontSize: 10 },
        grid: { vertLines: { color: 'rgba(255,255,255,0.025)', style: 1 }, horzLines: { color: 'rgba(255,255,255,0.025)', style: 1 } },
        crosshair: { vertLine: { color: 'rgba(0,238,255,0.25)', width: 1, style: 0 }, horzLine: { color: 'rgba(0,238,255,0.25)', width: 1, style: 0 } },
        timeScale: { borderColor: 'rgba(255,255,255,0.04)', timeVisible: true, secondsVisible: false },
        rightPriceScale: { borderColor: 'rgba(255,255,255,0.04)' },
        handleScroll: true, handleScale: true,
      });
      chartRef.current = chart;
      candleRef.current = chart.addCandlestickSeries({
        upColor: 'rgba(34,255,170,1)', downColor: 'rgba(255,68,136,1)',
        borderUpColor: 'rgba(34,255,170,1)', borderDownColor: 'rgba(255,68,136,1)',
        wickUpColor: 'rgba(34,255,170,0.55)', wickDownColor: 'rgba(255,68,136,0.55)',
      });
      volRef.current = chart.addHistogramSeries({ color: 'rgba(0,238,255,0.10)', priceScaleId: 'vol', scaleMargins: { top: 0.85, bottom: 0 } });
      roRef.current = new ResizeObserver(() => {
        if (!mountedRef.current || !elRef.current || !chartRef.current) return;
        chartRef.current.resize(elRef.current.offsetWidth, H);
      });
      roRef.current.observe(elRef.current);
    }
    void init();
    return () => {
      mountedRef.current = false;
      roRef.current?.disconnect();
      if (chart) chart.remove();
      chartRef.current = candleRef.current = volRef.current = null;
    };
  }, []); // eslint-disable-line

  useEffect(() => {
    abortRef.current?.abort();
    abortRef.current = new AbortController();
    setLoad(true); setErr(false);
    async function load() {
      const candles = await fetchCandles(sym, iv, abortRef.current!.signal);
      if (!mountedRef.current) return;
      if (!candles.length) { setLoad(false); setErr(true); return; }
      if (candleRef.current && volRef.current) {
        candleRef.current.setData(candles.map(c => ({ time: c.time, open: c.open, high: c.high, low: c.low, close: c.close })));
        const col = SYM_COLOR[sym];
        volRef.current.setData(candles.map(c => ({
          time: c.time, value: c.value,
          color: c.close >= c.open ? col.replace('1)','0.13)') : 'rgba(255,68,136,0.09)',
        })));
        chartRef.current?.timeScale().fitContent();
      }
      const last = candles[candles.length - 1];
      setLast(last.close);
      setPrev(candles.length >= 2 ? candles[candles.length - 2].close : last.open);
      setLoad(false);
    }
    void load();
    return () => { abortRef.current?.abort(); };
  }, [sym, iv]);

  const pct = useMemo(() => {
    if (last == null || prev == null || prev === 0) return null;
    return (last - prev) / prev * 100;
  }, [last, prev]);

  const onSym = useCallback((s: Sym) => { if (mountedRef.current) setSym(s); }, []);
  const onIv  = useCallback((i: Iv)  => { if (mountedRef.current) setIv(i); }, []);

  const btnBase = useMemo(() => ({
    fontFamily: "'JetBrains Mono',monospace", cursor: 'pointer', borderRadius: '5px',
    willChange: 'transform' as const,
  }), []);

  return (
    <GlassCard style={{ padding: '16px', display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: '8px' }}>
        {/* Symbol selector */}
        <div style={{ display: 'flex', gap: '4px' }}>
          {SYMS.map(s => (
            <button key={s} type="button" onClick={() => onSym(s)} aria-pressed={sym===s}
              style={{ ...btnBase, fontSize: '10px', letterSpacing: '0.06em', padding: '4px 10px',
                background: sym===s ? 'rgba(0,238,255,0.08)' : 'rgba(255,255,255,0.02)',
                border: '1px solid ' + (sym===s ? 'rgba(0,238,255,0.3)' : 'rgba(255,255,255,0.06)'),
                color: sym===s ? SYM_COLOR[s] : 'rgba(138,138,158,0.55)',
              }}>
              {SYM_LABEL[s]}
            </button>
          ))}
        </div>
        {/* Price */}
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '17px', fontWeight: 700, color: SYM_COLOR[sym] }}>
            {last != null ? '$'+last.toLocaleString('en-US',{minimumFractionDigits:2,maximumFractionDigits:2}) : '—'}
          </span>
          {pct != null && (
            <span style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: '11px', color: pct>=0?'rgba(34,255,170,1)':'rgba(255,68,136,1)' }}>
              {pct>=0?'+':''}{pct.toFixed(2)}%
            </span>
          )}
        </div>
        {/* Interval selector */}
        <div style={{ display: 'flex', gap: '3px', flexWrap: 'wrap' as const }}>
          {IVS.map(i => (
            <button key={i} type="button" onClick={() => onIv(i)} aria-pressed={iv===i}
              style={{ ...btnBase, fontSize: '9px', padding: '3px 7px',
                background: iv===i ? 'rgba(0,238,255,0.08)' : 'rgba(255,255,255,0.02)',
                border: '1px solid ' + (iv===i ? 'rgba(0,238,255,0.25)' : 'rgba(255,255,255,0.05)'),
                color: iv===i ? 'rgba(0,238,255,1)' : 'rgba(138,138,158,0.4)',
              }}>
              {i}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <div style={{ position: 'relative' as const }}>
        {load && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ position: 'absolute' as const, inset: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,7,13,0.7)', borderRadius: '8px' }}>
            <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '8px' }}>
              <div style={{ width:'22px', height:'22px', border:'2px solid rgba(0,238,255,0.12)', borderTop:'2px solid rgba(0,238,255,0.85)', borderRadius:'50%', animation:'spin 0.75s linear infinite' }} />
              <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', color:'rgba(0,238,255,0.5)', letterSpacing:'0.12em' }}>LOADING…</span>
            </div>
          </motion.div>
        )}
        {err && !load && (
          <div style={{ position: 'absolute' as const, inset: 0, zIndex: 10, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11px', color:'rgba(255,68,136,0.7)' }}>⚠ Chart unavailable</span>
          </div>
        )}
        <div ref={elRef} role="img" aria-label={'Chart '+SYM_LABEL[sym]+' '+iv}
          style={{ width:'100%', height:H+'px', minHeight:H+'px', willChange:'transform' }} />
      </div>

      {/* Footer */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'8px', color:'rgba(138,138,158,0.18)', letterSpacing:'0.08em' }}>
          LIGHTWEIGHT CHARTS · BINANCE DIRECT · PUSH97
        </span>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'8px', color:'rgba(34,255,170,0.45)', background:'rgba(34,255,170,0.05)', border:'1px solid rgba(34,255,170,0.1)', borderRadius:'3px', padding:'2px 6px' }}>
          LIVE
        </span>
      </div>
    </GlassCard>
  );
});
TradingViewChart.displayName = 'TradingViewChart';
export default TradingViewChart;
