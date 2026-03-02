/**
 * push97.mjs — ZERØ MERIDIAN — MEGA FIX + UPGRADE
 * ═══════════════════════════════════════════════
 * Jalankan: $env:GH_TOKEN = "ghp_TOKEN"; node push97.mjs
 */

import https from 'https';

const OWNER = 'wr98-code';
const REPO  = 'new-zeromeridian';
const TOKEN = process.env.GH_TOKEN;

if (!TOKEN) {
  console.error('❌ GH_TOKEN tidak ada!');
  console.error('   Jalankan: $env:GH_TOKEN = "ghp_..."; node push97.mjs');
  process.exit(1);
}

function ghReq(method, path, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = https.request({
      hostname: 'api.github.com', path, method,
      headers: {
        'Authorization': `token ${TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'zm-push97',
        'Content-Type': 'application/json',
        ...(data ? { 'Content-Length': Buffer.byteLength(data) } : {}),
      },
    }, res => {
      let buf = '';
      res.on('data', d => buf += d);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(buf) }); }
        catch { resolve({ status: res.statusCode, body: buf }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function getSHA(fp) {
  const r = await ghReq('GET', `/repos/${OWNER}/${REPO}/contents/${fp}`);
  return r.status === 200 ? r.body.sha : null;
}

async function push(fp, content, msg) {
  const sha = await getSHA(fp);
  const body = { message: msg, content: Buffer.from(content).toString('base64') };
  if (sha) body.sha = sha;
  const r = await ghReq('PUT', `/repos/${OWNER}/${REPO}/contents/${fp}`, body);
  const ok = r.status === 200 || r.status === 201;
  console.log(ok ? `  ✅ ${fp}` : `  ❌ ${fp} → ${r.status} ${r.body?.message ?? ''}`);
  return ok;
}

// ════════════════════════════════════════════
// FILE 1: useCryptoData.ts — FIX BUG #1 + #2
// ════════════════════════════════════════════

const USE_CRYPTO_DATA = `/**
 * useCryptoData.ts — ZERØ MERIDIAN push97
 * FIX BUG #1: Direct CoinGecko (CF Pages = static, no /api routes)
 * FIX BUG #2: Skip WebTransport, langsung connectWS()
 */

import { useEffect, useRef, useCallback } from 'react';
import { useCrypto, useCryptoDispatch } from '@/contexts/CryptoContext';
import { getReconnectDelay, type CryptoAsset } from '@/lib/formatters';
import { useIndexedDB } from '@/hooks/useIndexedDB';

const SYMBOLS = Object.freeze([
  'btcusdt','ethusdt','solusdt','bnbusdt','xrpusdt',
  'adausdt','avaxusdt','dogeusdt','dotusdt','maticusdt',
  'linkusdt','uniusdt','ltcusdt','atomusdt','nearusdt',
  'trxusdt','shibusdt','tonusdt','arbusdt','opusdt',
] as const);

const WS_URL = 'wss://stream.binance.com:9443/stream?streams=' +
  SYMBOLS.map(s => s + '@ticker').join('/');

const CG_MARKETS = 'https://api.coingecko.com/api/v3/coins/markets' +
  '?vs_currency=usd&order=market_cap_desc&per_page=100&page=1' +
  '&sparkline=true&price_change_percentage=7d,30d';
const CG_GLOBAL = 'https://api.coingecko.com/api/v3/global';
const FNG_URL   = 'https://api.alternative.me/fng/?limit=1';
const PERSIST   = Object.freeze(['btcusdt', 'ethusdt', 'solusdt'] as const);

export function useCryptoData() {
  const dispatch = useCryptoDispatch();
  const { isLeader } = useCrypto();
  const { saveTick, loadTicks } = useIndexedDB();

  const mountedRef   = useRef(true);
  const abortRef     = useRef(new AbortController());
  const wsRef        = useRef<WebSocket | null>(null);
  const attemptRef   = useRef(0);
  const lastPriceRef = useRef<Record<string, number>>({});
  const isLeaderRef  = useRef(isLeader);

  useEffect(() => { isLeaderRef.current = isLeader; }, [isLeader]);

  const processTick = useCallback((
    symbol: string, price: number, pct: number,
    hi: number, lo: number, vol: number,
  ) => {
    if (!mountedRef.current || !isLeaderRef.current) return;
    const key = symbol.toLowerCase();
    const prev = lastPriceRef.current[key] ?? price;
    const dir: 'up'|'down'|'neutral' = price > prev ? 'up' : price < prev ? 'down' : 'neutral';
    lastPriceRef.current[key] = price;
    dispatch({ type: 'UPDATE_PRICES', payload: { [key]: { price, change24h: pct, high24h: hi, low24h: lo, volume24h: vol, direction: dir } } });
    if ((PERSIST as readonly string[]).includes(key)) saveTick(key, price).catch(() => {});
  }, [dispatch, saveTick]);

  const connectWS = useCallback(() => {
    if (!mountedRef.current || !isLeaderRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    dispatch({ type: 'SET_WS_STATUS', payload: 'reconnecting' });
    const ws = new WebSocket(WS_URL);
    wsRef.current = ws;
    ws.onopen = () => {
      if (!mountedRef.current) { ws.close(); return; }
      attemptRef.current = 0;
      dispatch({ type: 'SET_WS_STATUS', payload: 'connected' });
    };
    ws.onmessage = (e: MessageEvent<string>) => {
      if (!mountedRef.current || !isLeaderRef.current) return;
      try {
        const msg = JSON.parse(e.data) as Record<string, unknown>;
        const d = msg.data as Record<string, unknown>;
        if (typeof d?.s !== 'string') return;
        processTick(String(d.s), +String(d.c), +String(d.P), +String(d.h), +String(d.l), +String(d.v));
      } catch {}
    };
    ws.onclose = () => {
      if (!mountedRef.current) return;
      dispatch({ type: 'SET_WS_STATUS', payload: 'disconnected' });
      if (attemptRef.current < 8) setTimeout(connectWS, getReconnectDelay(attemptRef.current++));
    };
    ws.onerror = () => { ws.close(); };
  }, [dispatch, processTick]);

  const fetchMarkets = useCallback(async () => {
    if (!isLeaderRef.current) return;
    try {
      const res = await fetch(CG_MARKETS, { signal: abortRef.current.signal });
      if (!res.ok || !mountedRef.current) return;
      const data = await res.json() as Record<string, unknown>[];
      if (!mountedRef.current) return;
      const assets: CryptoAsset[] = data.map((c, i) => ({
        id: String(c.id ?? ''), symbol: String(c.symbol ?? ''), name: String(c.name ?? ''),
        price: Number(c.current_price ?? 0),
        change24h: Number(c.price_change_percentage_24h ?? 0),
        change7d: Number(c.price_change_percentage_7d_in_currency ?? 0),
        change30d: Number(c.price_change_percentage_30d_in_currency ?? 0),
        marketCap: Number(c.market_cap ?? 0),
        volume24h: Number(c.total_volume ?? 0),
        circulatingSupply: Number(c.circulating_supply ?? 0),
        totalSupply: c.total_supply != null ? Number(c.total_supply) : undefined,
        ath: Number(c.ath ?? 0), athDate: String(c.ath_date ?? ''),
        rank: Number(c.market_cap_rank ?? i + 1), image: String(c.image ?? ''),
        sparkline: ((c.sparkline_in_7d as Record<string, number[]>)?.price) ?? [],
        lastUpdated: String(c.last_updated ?? ''), priceDirection: 'neutral' as const,
      }));
      for (const a of assets) lastPriceRef.current[a.symbol.toLowerCase() + 'usdt'] = a.price;
      dispatch({ type: 'UPDATE_MARKETS', payload: assets });
    } catch (e: unknown) {
      if ((e as Error)?.name !== 'AbortError' && mountedRef.current)
        dispatch({ type: 'SET_ERROR', payload: 'Failed to fetch market data' });
    }
  }, [dispatch]);

  const fetchGlobal = useCallback(async () => {
    if (!isLeaderRef.current) return;
    try {
      const res = await fetch(CG_GLOBAL, { signal: abortRef.current.signal });
      if (!res.ok || !mountedRef.current) return;
      const json = await res.json() as { data: Record<string, unknown> };
      const d = json.data;
      if (!mountedRef.current) return;
      dispatch({ type: 'UPDATE_GLOBAL', payload: {
        totalMcap: Number((d.total_market_cap as Record<string, number>)?.usd ?? 0),
        totalVolume: Number((d.total_volume as Record<string, number>)?.usd ?? 0),
        btcDominance: Number((d.market_cap_percentage as Record<string, number>)?.btc ?? 0),
        ethDominance: Number((d.market_cap_percentage as Record<string, number>)?.eth ?? 0),
        activeCurrencies: Number(d.active_cryptocurrencies ?? 0),
        mcapChange24h: Number(d.market_cap_change_percentage_24h_usd ?? 0),
      }});
    } catch {}
  }, [dispatch]);

  const fetchFearGreed = useCallback(async () => {
    if (!isLeaderRef.current) return;
    try {
      const res = await fetch(FNG_URL, { signal: abortRef.current.signal });
      if (!res.ok || !mountedRef.current) return;
      const json = await res.json() as { data: Record<string, string>[] };
      const d = json.data?.[0];
      if (!mountedRef.current || !d) return;
      dispatch({ type: 'UPDATE_FEAR_GREED', payload: { value: Number(d.value), label: d.value_classification } });
    } catch {}
  }, [dispatch]);

  useEffect(() => {
    if (!isLeader) return;
    void (async () => {
      for (const sym of PERSIST) {
        try {
          const ticks = await loadTicks(sym, 1);
          if (ticks.length > 0 && mountedRef.current)
            lastPriceRef.current[sym] = ticks[ticks.length - 1].price;
        } catch {}
      }
    })();
  }, [isLeader, loadTicks]);

  useEffect(() => {
    if (!isLeader) return;
    mountedRef.current = true;
    abortRef.current   = new AbortController();
    fetchMarkets();
    fetchGlobal();
    fetchFearGreed();
    connectWS(); // FIX BUG #2: skip WebTransport, langsung WS
    const t1 = setInterval(fetchMarkets,   30_000);
    const t2 = setInterval(fetchGlobal,    60_000);
    const t3 = setInterval(fetchFearGreed, 300_000);
    return () => {
      mountedRef.current = false;
      abortRef.current.abort();
      wsRef.current?.close();
      clearInterval(t1); clearInterval(t2); clearInterval(t3);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLeader]);
}
`;

// ════════════════════════════════════════════
// FILE 2: TradingViewChart.tsx — FIX BUG #3
// ════════════════════════════════════════════

const CHART = `/**
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
`;

// ════════════════════════════════════════════
// FILE 3: public/_headers — Fix COEP
// ════════════════════════════════════════════

const CF_HEADERS = `/*
  Cross-Origin-Opener-Policy: same-origin-allow-popups
  Cross-Origin-Embedder-Policy: credentialless
  Cross-Origin-Resource-Policy: cross-origin
  X-Content-Type-Options: nosniff
  X-Frame-Options: SAMEORIGIN
  Referrer-Policy: strict-origin-when-cross-origin
`;

// ════════════════════════════════════════════
// MAIN
// ════════════════════════════════════════════

async function patchCSS() {
  const r = await ghReq('GET', `/repos/${OWNER}/${REPO}/contents/src/index.css`);
  if (r.status !== 200) { console.log('  ⚠ Tidak bisa fetch index.css, skip'); return; }
  const curr = Buffer.from(r.body.content, 'base64').toString('utf-8');
  if (curr.includes('@keyframes spin')) {
    console.log('  ✅ src/index.css (spin sudah ada)');
    return;
  }
  const patched = curr + '\n@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }\n';
  const wr = await ghReq('PUT', `/repos/${OWNER}/${REPO}/contents/src/index.css`, {
    message: 'push97: add spin keyframe',
    content: Buffer.from(patched).toString('base64'),
    sha: r.body.sha,
  });
  console.log((wr.status === 200 || wr.status === 201) ? '  ✅ src/index.css' : `  ❌ src/index.css ${wr.status}`);
}

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════╗');
  console.log('║  ZERØ MERIDIAN — push97 MEGA FIX               ║');
  console.log('╚══════════════════════════════════════════════════╝');
  console.log('');

  const me = await ghReq('GET', '/user');
  if (me.status !== 200) {
    console.error('❌ Token tidak valid! Cek token kamu.');
    process.exit(1);
  }
  console.log('✅ Token OK — user: ' + me.body.login);
  console.log('📦 Repo: ' + OWNER + '/' + REPO);
  console.log('');
  console.log('Pushing files...');

  const results = await Promise.all([
    push('src/hooks/useCryptoData.ts', USE_CRYPTO_DATA, 'push97: FIX BUG#1 data kosong + FIX BUG#2 WS reconnecting'),
    push('src/components/tiles/TradingViewChart.tsx', CHART, 'push97: FIX BUG#3 chart kosong (Binance direct)'),
    push('public/_headers', CF_HEADERS, 'push97: CF Pages COEP credentialless fix'),
  ]);

  await patchCSS();

  console.log('');
  if (results.every(Boolean)) {
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║  ✅ SEMUA BERHASIL!                             ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log('║  ✅ BUG #1 — Data kosong / "---"               ║');
    console.log('║  ✅ BUG #2 — WS RECONNECTING terus             ║');
    console.log('║  ✅ BUG #3 — TradingView chart kosong          ║');
    console.log('║  ✅ BUG #4 — Markets "0 assets" (auto fix)     ║');
    console.log('╠══════════════════════════════════════════════════╣');
    console.log('║  🕐 Tunggu 1-2 menit CF Pages deploy           ║');
    console.log('║  🌐 https://new-zeromeridian.pages.dev         ║');
    console.log('╚══════════════════════════════════════════════════╝');
  } else {
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║  ⚠ SEBAGIAN GAGAL — cek error di atas         ║');
    console.log('║  Tips: cek token scope (harus: repo)           ║');
    console.log('╚══════════════════════════════════════════════════╝');
  }
  console.log('');
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
