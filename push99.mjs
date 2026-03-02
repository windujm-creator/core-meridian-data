/**
 * push99.mjs — ZERØ MERIDIAN
 * Charts.tsx → Layout PERSIS BYBIT
 * - Pair list kiri (scrollable)
 * - TradingView FULL WIDGET tengah (drawing tools, indicators, semua)
 * - Order Book kanan real-time
 * - Recent Trades feed
 * - Mobile: bottom tabs switching
 *
 * Jalankan: $env:GH_TOKEN = "ghp_TOKEN"; node push99.mjs
 */

import https from 'https';

const OWNER = 'wr98-code';
const REPO  = 'new-zeromeridian';
const TOKEN = process.env.GH_TOKEN;

if (!TOKEN) {
  console.error('❌ GH_TOKEN tidak ada!');
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
        'User-Agent': 'zm-push99',
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
  for (let attempt = 1; attempt <= 3; attempt++) {
    const sha = await getSHA(fp);
    const body = { message: msg, content: Buffer.from(content).toString('base64') };
    if (sha) body.sha = sha;
    const r = await ghReq('PUT', `/repos/${OWNER}/${REPO}/contents/${fp}`, body);
    if (r.status === 200 || r.status === 201) {
      console.log(`  ✅ ${fp}`);
      return true;
    }
    if (r.status === 409) {
      console.log(`  ⚠ 409 SHA conflict, retry ${attempt}/3...`);
      await new Promise(res => setTimeout(res, 2000));
      continue;
    }
    console.log(`  ❌ ${fp} → ${r.status} ${r.body?.message ?? ''}`);
    return false;
  }
  console.log(`  ❌ ${fp} → gagal setelah 3 attempts`);
  return false;
}

// ══════════════════════════════════════════════════════════════════════════════
// Charts.tsx — BYBIT LAYOUT + TRADINGVIEW FULL WIDGET
// ══════════════════════════════════════════════════════════════════════════════

const CHARTS = `/**
 * Charts.tsx — ZERØ MERIDIAN push99
 * Layout PERSIS BYBIT:
 * ┌──────────┬──────────────────────────┬─────────────┐
 * │ PAIRS    │  TRADINGVIEW FULL WIDGET │  ORDER BOOK │
 * │  list    │  (drawing tools, indic.) │  + TRADES   │
 * │  kiri    │       TENGAH             │    kanan    │
 * └──────────┴──────────────────────────┴─────────────┘
 *
 * TradingView Widget = FREE embed dari tradingview.com
 * Include: semua drawing tools, 100+ indicators, multi-TF,
 *          fullscreen, screenshot, alerts, dll.
 *
 * Mobile: tab switcher (Chart | Book | Trades)
 */

import { memo, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCrypto } from '@/contexts/CryptoContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { formatPrice, formatCompact } from '@/lib/formatters';

// ─── Pairs config ─────────────────────────────────────────────────────────────

interface Pair {
  symbol: string;   // Binance symbol e.g. BTCUSDT
  tvSymbol: string; // TradingView symbol e.g. BINANCE:BTCUSDT
  label: string;
  base: string;
  color: string;
  category: string;
}

const PAIRS: readonly Pair[] = Object.freeze([
  // MAJOR
  { symbol:'BTCUSDT', tvSymbol:'BINANCE:BTCUSDT', label:'BTC/USDT', base:'BTC', color:'rgba(251,191,36,1)',  category:'MAJOR' },
  { symbol:'ETHUSDT', tvSymbol:'BINANCE:ETHUSDT', label:'ETH/USDT', base:'ETH', color:'rgba(96,165,250,1)',  category:'MAJOR' },
  { symbol:'SOLUSDT', tvSymbol:'BINANCE:SOLUSDT', label:'SOL/USDT', base:'SOL', color:'rgba(167,139,250,1)', category:'MAJOR' },
  { symbol:'BNBUSDT', tvSymbol:'BINANCE:BNBUSDT', label:'BNB/USDT', base:'BNB', color:'rgba(251,146,60,1)',  category:'MAJOR' },
  { symbol:'XRPUSDT', tvSymbol:'BINANCE:XRPUSDT', label:'XRP/USDT', base:'XRP', color:'rgba(34,211,238,1)',  category:'MAJOR' },
  // ALTCOINS
  { symbol:'ADAUSDT', tvSymbol:'BINANCE:ADAUSDT', label:'ADA/USDT', base:'ADA', color:'rgba(52,211,153,1)',  category:'ALTS' },
  { symbol:'AVAXUSDT',tvSymbol:'BINANCE:AVAXUSDT',label:'AVAX/USDT',base:'AVAX',color:'rgba(251,113,133,1)', category:'ALTS' },
  { symbol:'DOGEUSDT',tvSymbol:'BINANCE:DOGEUSDT',label:'DOGE/USDT',base:'DOGE',color:'rgba(251,191,36,0.7)',category:'ALTS' },
  { symbol:'DOTUSDT', tvSymbol:'BINANCE:DOTUSDT', label:'DOT/USDT', base:'DOT', color:'rgba(196,181,253,1)', category:'ALTS' },
  { symbol:'LINKUSDT',tvSymbol:'BINANCE:LINKUSDT',label:'LINK/USDT',base:'LINK',color:'rgba(96,165,250,0.8)',category:'ALTS' },
  { symbol:'MATICUSDT',tvSymbol:'BINANCE:MATICUSDT',label:'MATIC/USDT',base:'MATIC',color:'rgba(130,71,229,1)',category:'ALTS' },
  { symbol:'UNIUSDT', tvSymbol:'BINANCE:UNIUSDT', label:'UNI/USDT', base:'UNI', color:'rgba(255,0,122,0.9)', category:'ALTS' },
  { symbol:'ATOMUSDT',tvSymbol:'BINANCE:ATOMUSDT',label:'ATOM/USDT',base:'ATOM',color:'rgba(110,86,207,1)',  category:'ALTS' },
  { symbol:'NEARUSDT',tvSymbol:'BINANCE:NEARUSDT',label:'NEAR/USDT',base:'NEAR',color:'rgba(0,236,151,1)',   category:'ALTS' },
  // DEFI
  { symbol:'AAVEUSDT',tvSymbol:'BINANCE:AAVEUSDT',label:'AAVE/USDT',base:'AAVE',color:'rgba(183,75,254,1)',  category:'DEFI' },
  { symbol:'CRVUSDT', tvSymbol:'BINANCE:CRVUSDT', label:'CRV/USDT', base:'CRV', color:'rgba(254,40,40,0.9)', category:'DEFI' },
  { symbol:'MKRUSDT', tvSymbol:'BINANCE:MKRUSDT', label:'MKR/USDT', base:'MKR', color:'rgba(28,196,140,1)',  category:'DEFI' },
]);

const CATEGORIES = Object.freeze(['ALL', 'MAJOR', 'ALTS', 'DEFI']);

// ─── TradingView Full Widget ──────────────────────────────────────────────────
// Menggunakan TradingView Advanced Chart Widget — FREE, no API key needed
// Include: semua drawing tools, 100+ indicators, timeframes, fullscreen dll

const TVWidget = memo(({ tvSymbol, theme = 'dark' }: { tvSymbol: string; theme?: 'dark'|'light' }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetRef    = useRef<HTMLIFrameElement|null>(null);
  const mountedRef   = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // TradingView Advanced Chart widget URL — completely free
  const src = useMemo(() => {
    const params = new URLSearchParams({
      symbol:             tvSymbol,
      interval:           'D',
      timezone:           'Etc/UTC',
      theme:              theme,
      style:              '1',
      locale:             'en',
      toolbar_bg:         '#0A0C14',
      enable_publishing:  'false',
      hide_top_toolbar:   'false',
      hide_legend:        'false',
      save_image:         'true',
      container_id:       'tv_chart_' + tvSymbol.replace(':','_'),
      allow_symbol_change:'true',
      details:            'true',
      hotlist:            'true',
      calendar:           'true',
      studies:            'RSI@tv-basicstudies,MACD@tv-basicstudies',
      show_popup_button:  'true',
      popup_width:        '1000',
      popup_height:       '650',
      withdateranges:     'true',
      hide_side_toolbar:  'false',
      watchlist:          PAIRS.map(p => p.tvSymbol).join(','),
    });
    return 'https://s.tradingview.com/widgetembed/?' + params.toString();
  }, [tvSymbol, theme]);

  return (
    <div ref={containerRef} style={{ width:'100%', height:'100%', position:'relative' as const, borderRadius:'8px', overflow:'hidden' as const }}>
      <iframe
        key={tvSymbol}
        src={src}
        style={{ width:'100%', height:'100%', border:'none', display:'block' }}
        allowFullScreen
        title={'TradingView Chart ' + tvSymbol}
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation"
        loading="lazy"
      />
    </div>
  );
});
TVWidget.displayName = 'TVWidget';

// ─── Order Book ───────────────────────────────────────────────────────────────

interface OBLevel { price: number; qty: number; total: number; }

const OrderBookPanel = memo(({ symbol, color }: { symbol: string; color: string }) => {
  const [asks, setAsks] = useState<OBLevel[]>([]);
  const [bids, setBids] = useState<OBLevel[]>([]);
  const [spread, setSpread] = useState(0);
  const wsRef      = useRef<WebSocket|null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const ws = new WebSocket('wss://stream.binance.com:9443/ws/' + symbol.toLowerCase() + '@depth10@100ms');
    wsRef.current = ws;

    ws.onmessage = (e) => {
      if (!mountedRef.current) return;
      try {
        const d = JSON.parse(e.data) as { asks: string[][]; bids: string[][] };
        const processLevels = (raw: string[][]): OBLevel[] => {
          let cum = 0;
          return raw.slice(0,10).map(([p,q]) => {
            cum += parseFloat(q);
            return { price: parseFloat(p), qty: parseFloat(q), total: cum };
          });
        };
        const a = processLevels(d.asks);
        const b = processLevels(d.bids);
        if (mountedRef.current) {
          setAsks(a);
          setBids(b);
          if (a.length && b.length) setSpread(+(a[0].price - b[0].price).toFixed(2));
        }
      } catch {}
    };
    ws.onerror = () => ws.close();

    return () => {
      mountedRef.current = false;
      ws.close();
    };
  }, [symbol]);

  const maxTotal = useMemo(() => {
    const allTotals = [...asks, ...bids].map(l => l.total);
    return allTotals.length ? Math.max(...allTotals) : 1;
  }, [asks, bids]);

  const rowStyle = useCallback((side: 'ask'|'bid', total: number) => {
    const pct = (total / maxTotal) * 100;
    const bg = side === 'ask'
      ? 'linear-gradient(to left, rgba(255,68,136,0.12) ' + pct + '%, transparent ' + pct + '%)'
      : 'linear-gradient(to right, rgba(34,255,170,0.12) ' + pct + '%, transparent ' + pct + '%)';
    return { display:'flex', justifyContent:'space-between', padding:'2px 10px',
      background: bg, fontFamily:"'JetBrains Mono',monospace", fontSize:'10px',
      letterSpacing:'0.02em', cursor:'pointer' as const, transition:'opacity 0.1s',
    };
  }, [maxTotal]);

  const hdrStyle = { fontFamily:"'JetBrains Mono',monospace", fontSize:'9px',
    color:'rgba(80,80,100,0.7)', display:'flex', justifyContent:'space-between',
    padding:'4px 10px', borderBottom:'1px solid rgba(255,255,255,0.04)' };

  return (
    <div style={{ display:'flex', flexDirection:'column' as const, height:'100%', overflow:'hidden' as const }}>
      {/* Header */}
      <div style={{ padding:'10px 10px 6px', borderBottom:'1px solid rgba(255,255,255,0.05)', flexShrink:0 }}>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11px', fontWeight:700,
          color:'rgba(230,230,242,0.9)', letterSpacing:'0.06em' }}>ORDER BOOK</span>
        <span style={{ marginLeft:'8px', fontFamily:"'JetBrains Mono',monospace", fontSize:'9px',
          color: color, opacity:0.7 }}>{symbol}</span>
      </div>
      {/* Col headers */}
      <div style={hdrStyle}>
        <span>PRICE</span><span>SIZE</span><span>TOTAL</span>
      </div>
      {/* Asks (sells) — reversed so lowest ask at bottom */}
      <div style={{ flex:1, overflowY:'auto' as const, display:'flex', flexDirection:'column-reverse' as const }}>
        {asks.slice().reverse().map((l, i) => (
          <div key={i} style={rowStyle('ask', l.total)}>
            <span style={{ color:'rgba(255,68,136,0.9)' }}>{l.price.toFixed(2)}</span>
            <span style={{ color:'rgba(138,138,158,0.7)' }}>{l.qty.toFixed(4)}</span>
            <span style={{ color:'rgba(80,80,100,0.6)' }}>{l.total.toFixed(2)}</span>
          </div>
        ))}
      </div>
      {/* Spread */}
      <div style={{ padding:'4px 10px', background:'rgba(255,255,255,0.02)',
        borderTop:'1px solid rgba(255,255,255,0.04)', borderBottom:'1px solid rgba(255,255,255,0.04)',
        display:'flex', alignItems:'center', justifyContent:'space-between', flexShrink:0 }}>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', color: color, fontWeight:700 }}>
          {bids.length ? bids[0].price.toFixed(2) : '—'}
        </span>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', color:'rgba(80,80,100,0.6)' }}>
          Spread: {spread}
        </span>
      </div>
      {/* Bids (buys) */}
      <div style={{ flex:1, overflowY:'auto' as const }}>
        {bids.map((l, i) => (
          <div key={i} style={rowStyle('bid', l.total)}>
            <span style={{ color:'rgba(34,255,170,0.9)' }}>{l.price.toFixed(2)}</span>
            <span style={{ color:'rgba(138,138,158,0.7)' }}>{l.qty.toFixed(4)}</span>
            <span style={{ color:'rgba(80,80,100,0.6)' }}>{l.total.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
});
OrderBookPanel.displayName = 'OrderBookPanel';

// ─── Recent Trades ────────────────────────────────────────────────────────────

interface Trade { id: number; price: number; qty: number; isBuyer: boolean; time: number; }

const RecentTrades = memo(({ symbol }: { symbol: string }) => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const wsRef      = useRef<WebSocket|null>(null);
  const mountedRef = useRef(true);
  const bufRef     = useRef<Trade[]>([]);

  useEffect(() => {
    mountedRef.current = true;
    const ws = new WebSocket('wss://stream.binance.com:9443/ws/' + symbol.toLowerCase() + '@trade');
    wsRef.current = ws;

    ws.onmessage = (e) => {
      if (!mountedRef.current) return;
      try {
        const d = JSON.parse(e.data) as { t: number; p: string; q: string; m: boolean; T: number };
        const trade: Trade = { id: d.t, price: parseFloat(d.p), qty: parseFloat(d.q), isBuyer: !d.m, time: d.T };
        bufRef.current = [trade, ...bufRef.current].slice(0, 40);
        if (mountedRef.current) setTrades([...bufRef.current]);
      } catch {}
    };
    ws.onerror = () => ws.close();
    return () => { mountedRef.current = false; ws.close(); };
  }, [symbol]);

  return (
    <div style={{ display:'flex', flexDirection:'column' as const, height:'100%', overflow:'hidden' as const }}>
      <div style={{ padding:'8px 10px 6px', borderBottom:'1px solid rgba(255,255,255,0.05)', flexShrink:0 }}>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11px', fontWeight:700,
          color:'rgba(230,230,242,0.9)', letterSpacing:'0.06em' }}>RECENT TRADES</span>
      </div>
      <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px',
        color:'rgba(80,80,100,0.7)', display:'flex', justifyContent:'space-between',
        padding:'4px 10px', borderBottom:'1px solid rgba(255,255,255,0.04)' }}>
        <span>PRICE</span><span>SIZE</span><span>TIME</span>
      </div>
      <div style={{ flex:1, overflowY:'auto' as const }}>
        {trades.map(t => (
          <div key={t.id} style={{ display:'flex', justifyContent:'space-between',
            padding:'2px 10px', fontFamily:"'JetBrains Mono',monospace", fontSize:'10px' }}>
            <span style={{ color: t.isBuyer ? 'rgba(34,255,170,0.9)' : 'rgba(255,68,136,0.9)' }}>
              {t.price.toFixed(2)}
            </span>
            <span style={{ color:'rgba(138,138,158,0.6)' }}>{t.qty.toFixed(4)}</span>
            <span style={{ color:'rgba(80,80,100,0.5)' }}>
              {new Date(t.time).toLocaleTimeString('en-US',{hour12:false,hour:'2-digit',minute:'2-digit',second:'2-digit'})}
            </span>
          </div>
        ))}
        {trades.length === 0 && (
          <div style={{ padding:'20px 10px', fontFamily:"'JetBrains Mono',monospace",
            fontSize:'10px', color:'rgba(80,80,100,0.5)', textAlign:'center' as const }}>
            Connecting…
          </div>
        )}
      </div>
    </div>
  );
});
RecentTrades.displayName = 'RecentTrades';

// ─── Pair List Item ───────────────────────────────────────────────────────────

const PairItem = memo(({ pair, active, price, change24h, onSelect }:
  { pair:Pair; active:boolean; price:number; change24h:number; onSelect:(p:Pair)=>void }) => {
  const pos = change24h >= 0;
  return (
    <div onClick={() => onSelect(pair)}
      style={{ padding:'8px 10px', cursor:'pointer' as const,
        background: active ? 'rgba(0,238,255,0.06)' : 'transparent',
        borderLeft: '2px solid ' + (active ? pair.color : 'transparent'),
        borderBottom:'1px solid rgba(255,255,255,0.03)',
        transition:'background 0.12s',
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background='rgba(255,255,255,0.025)'; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background='transparent'; }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11px', fontWeight:700,
          color: active ? pair.color : 'rgba(230,230,242,0.85)' }}>
          {pair.label}
        </span>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px', fontWeight:600,
          color: pos ? 'rgba(34,255,170,0.9)' : 'rgba(255,68,136,0.9)' }}>
          {(pos?'+':'')+change24h.toFixed(2)+'%'}
        </span>
      </div>
      {price > 0 && (
        <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px',
          color:'rgba(138,138,158,0.6)', marginTop:'1px' }}>
          {formatPrice(price)}
        </div>
      )}
    </div>
  );
});
PairItem.displayName = 'PairItem';

// ─── Pair List Sidebar ────────────────────────────────────────────────────────

const PairList = memo(({ activePair, onSelect }: { activePair: Pair; onSelect: (p:Pair) => void }) => {
  const { assets } = useCrypto();
  const [cat, setCat] = useState('ALL');
  const [search, setSearch] = useState('');
  const m = useRef(true);
  useEffect(() => { m.current = true; return () => { m.current = false; }; }, []);

  const priceMap = useMemo(() => {
    const map: Record<string, { price:number; change:number }> = {};
    for (const a of assets) {
      map[a.symbol.toUpperCase() + 'USDT'] = { price: a.price, change: a.change24h };
    }
    return map;
  }, [assets]);

  const filtered = useMemo(() => PAIRS.filter(p =>
    (cat === 'ALL' || p.category === cat) &&
    (search === '' || p.label.toLowerCase().includes(search.toLowerCase()) || p.base.toLowerCase().includes(search.toLowerCase()))
  ), [cat, search]);

  return (
    <div style={{ display:'flex', flexDirection:'column' as const, height:'100%', overflow:'hidden' as const }}>
      {/* Search */}
      <div style={{ padding:'8px', borderBottom:'1px solid rgba(255,255,255,0.05)', flexShrink:0 }}>
        <div style={{ position:'relative' as const }}>
          <input type="text" placeholder="Search…" value={search}
            onChange={e => { if (m.current) setSearch(e.target.value); }}
            style={{ width:'100%', fontFamily:"'JetBrains Mono',monospace", fontSize:'10px',
              background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.07)',
              borderRadius:'6px', padding:'6px 8px 6px 24px', color:'rgba(230,230,242,0.8)',
              outline:'none', boxSizing:'border-box' as const }} />
          <span style={{ position:'absolute' as const, left:'7px', top:'50%', transform:'translateY(-50%)',
            fontSize:'11px', color:'rgba(80,80,100,0.6)' }}>⌕</span>
        </div>
      </div>
      {/* Category tabs */}
      <div style={{ display:'flex', borderBottom:'1px solid rgba(255,255,255,0.05)', flexShrink:0 }}>
        {CATEGORIES.map(c => (
          <button key={c} type="button" onClick={() => { if (m.current) setCat(c); }}
            style={{ flex:1, fontFamily:"'JetBrains Mono',monospace", fontSize:'9px',
              padding:'6px 0', cursor:'pointer' as const,
              background: cat===c ? 'rgba(0,238,255,0.06)' : 'transparent',
              border:'none', borderBottom: '2px solid ' + (cat===c ? 'rgba(0,238,255,0.7)' : 'transparent'),
              color: cat===c ? 'rgba(0,238,255,0.9)' : 'rgba(80,80,100,0.7)',
              transition:'all 0.12s',
            }}>
            {c}
          </button>
        ))}
      </div>
      {/* Pair rows */}
      <div style={{ flex:1, overflowY:'auto' as const }}>
        {filtered.map(p => (
          <PairItem key={p.symbol} pair={p} active={p.symbol === activePair.symbol}
            price={priceMap[p.symbol]?.price ?? 0}
            change24h={priceMap[p.symbol]?.change ?? 0}
            onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
});
PairList.displayName = 'PairList';

// ─── Price Header ─────────────────────────────────────────────────────────────

const PairHeader = memo(({ pair }: { pair: Pair }) => {
  const { assets } = useCrypto();
  const asset = useMemo(() => assets.find(a =>
    a.symbol.toUpperCase() + 'USDT' === pair.symbol
  ), [assets, pair.symbol]);

  const stats = useMemo(() => [
    { label:'24H CHANGE', value: asset ? (asset.change24h >= 0 ? '+' : '') + asset.change24h.toFixed(2) + '%' : '—',
      color: asset ? (asset.change24h >= 0 ? 'rgba(34,255,170,0.9)' : 'rgba(255,68,136,0.9)') : 'rgba(138,138,158,0.5)' },
    { label:'24H HIGH', value: asset?.high24h ? formatPrice(asset.high24h) : '—', color:'rgba(230,230,242,0.7)' },
    { label:'24H LOW',  value: asset?.low24h  ? formatPrice(asset.low24h)  : '—', color:'rgba(230,230,242,0.7)' },
    { label:'24H VOL',  value: asset?.volume24h ? formatCompact(asset.volume24h) : '—', color:'rgba(138,138,158,0.6)' },
  ], [asset]);

  return (
    <div style={{ display:'flex', alignItems:'center', gap:'16px', padding:'8px 16px',
      background:'rgba(255,255,255,0.015)', borderBottom:'1px solid rgba(255,255,255,0.05)',
      flexWrap:'wrap' as const, flexShrink:0 }}>
      {/* Pair name + price */}
      <div style={{ display:'flex', alignItems:'baseline', gap:'10px', minWidth:'200px' }}>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'16px', fontWeight:700,
          color: pair.color, letterSpacing:'0.04em' }}>
          {pair.label}
        </span>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'20px', fontWeight:700,
          color:'rgba(230,230,242,1)' }}>
          {asset ? formatPrice(asset.price) : '—'}
        </span>
      </div>
      {/* Stats */}
      <div style={{ display:'flex', gap:'20px', flexWrap:'wrap' as const }}>
        {stats.map(s => (
          <div key={s.label} style={{ display:'flex', flexDirection:'column' as const }}>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'8px',
              color:'rgba(80,80,100,0.7)', letterSpacing:'0.1em' }}>{s.label}</span>
            <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11px',
              color: s.color, fontWeight:600 }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
});
PairHeader.displayName = 'PairHeader';

// ─── Mobile Tab Bar ───────────────────────────────────────────────────────────

type MobileTab = 'chart'|'book'|'trades'|'pairs';

const MobileTabBar = memo(({ active, onChange }: { active: MobileTab; onChange: (t: MobileTab) => void }) => {
  const tabs: { id: MobileTab; label: string; icon: string }[] = [
    { id:'pairs',  label:'Pairs',  icon:'≡' },
    { id:'chart',  label:'Chart',  icon:'📈' },
    { id:'book',   label:'Book',   icon:'▤' },
    { id:'trades', label:'Trades', icon:'⚡' },
  ];
  return (
    <div style={{ display:'flex', borderTop:'1px solid rgba(255,255,255,0.06)', flexShrink:0 }}>
      {tabs.map(t => (
        <button key={t.id} type="button" onClick={() => onChange(t.id)}
          style={{ flex:1, fontFamily:"'JetBrains Mono',monospace", fontSize:'9px',
            padding:'8px 0', cursor:'pointer' as const,
            background: active===t.id ? 'rgba(0,238,255,0.06)' : 'transparent',
            border:'none', borderTop: '2px solid ' + (active===t.id ? 'rgba(0,238,255,0.8)' : 'transparent'),
            color: active===t.id ? 'rgba(0,238,255,0.9)' : 'rgba(80,80,100,0.7)',
            display:'flex', flexDirection:'column' as const, alignItems:'center', gap:'2px',
          }}>
          <span style={{ fontSize:'14px' }}>{t.icon}</span>
          {t.label}
        </button>
      ))}
    </div>
  );
});
MobileTabBar.displayName = 'MobileTabBar';

// ─── Main Charts Page ─────────────────────────────────────────────────────────

const Charts = memo(() => {
  const { isMobile, isTablet } = useBreakpoint();
  const [activePair, setActivePair] = useState<Pair>(PAIRS[0]);
  const [mobileTab, setMobileTab]   = useState<MobileTab>('chart');
  const m = useRef(true);

  useEffect(() => { m.current = true; return () => { m.current = false; }; }, []);

  const handleSelect = useCallback((p: Pair) => {
    if (!m.current) return;
    setActivePair(p);
    if (isMobile) setMobileTab('chart');
  }, [isMobile]);

  // ─── DESKTOP / TABLET LAYOUT ─────────────────────────────────────────────

  if (!isMobile) {
    return (
      <div style={{ display:'flex', flexDirection:'column' as const, height:'calc(100vh - 48px)', overflow:'hidden' as const }}>

        {/* Price header bar */}
        <PairHeader pair={activePair} />

        {/* Main 3-col layout */}
        <div style={{ display:'flex', flex:1, overflow:'hidden' as const, gap:0 }}>

          {/* LEFT: Pair list */}
          {!isTablet && (
            <div style={{ width:'200px', flexShrink:0, borderRight:'1px solid rgba(255,255,255,0.05)',
              background:'rgba(8,10,18,0.9)', overflow:'hidden' as const }}>
              <PairList activePair={activePair} onSelect={handleSelect} />
            </div>
          )}

          {/* CENTER: TradingView Full Widget */}
          <div style={{ flex:1, minWidth:0, overflow:'hidden' as const, padding:'0' }}>
            <TVWidget tvSymbol={activePair.tvSymbol} />
          </div>

          {/* RIGHT: Order Book + Recent Trades */}
          <div style={{ width: isTablet ? '220px' : '240px', flexShrink:0,
            borderLeft:'1px solid rgba(255,255,255,0.05)',
            background:'rgba(8,10,18,0.9)',
            display:'flex', flexDirection:'column' as const, overflow:'hidden' as const }}>
            <div style={{ flex:'0 0 55%', borderBottom:'1px solid rgba(255,255,255,0.05)', overflow:'hidden' as const }}>
              <OrderBookPanel symbol={activePair.symbol} color={activePair.color} />
            </div>
            <div style={{ flex:'0 0 45%', overflow:'hidden' as const }}>
              <RecentTrades symbol={activePair.symbol} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── MOBILE LAYOUT ───────────────────────────────────────────────────────

  return (
    <div style={{ display:'flex', flexDirection:'column' as const, height:'calc(100vh - 96px)', overflow:'hidden' as const }}>

      {/* Price header */}
      <PairHeader pair={activePair} />

      {/* Content area */}
      <div style={{ flex:1, overflow:'hidden' as const, position:'relative' as const }}>
        <AnimatePresence mode="wait">
          {mobileTab === 'pairs' && (
            <motion.div key="pairs" initial={{ opacity:0, x:-20 }} animate={{ opacity:1, x:0 }}
              exit={{ opacity:0, x:-20 }} transition={{ duration:0.18 }}
              style={{ position:'absolute' as const, inset:0, overflow:'hidden' as const }}>
              <PairList activePair={activePair} onSelect={handleSelect} />
            </motion.div>
          )}
          {mobileTab === 'chart' && (
            <motion.div key="chart" initial={{ opacity:0 }} animate={{ opacity:1 }}
              exit={{ opacity:0 }} transition={{ duration:0.2 }}
              style={{ position:'absolute' as const, inset:0 }}>
              <TVWidget tvSymbol={activePair.tvSymbol} />
            </motion.div>
          )}
          {mobileTab === 'book' && (
            <motion.div key="book" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }}
              exit={{ opacity:0, x:20 }} transition={{ duration:0.18 }}
              style={{ position:'absolute' as const, inset:0, overflow:'hidden' as const }}>
              <OrderBookPanel symbol={activePair.symbol} color={activePair.color} />
            </motion.div>
          )}
          {mobileTab === 'trades' && (
            <motion.div key="trades" initial={{ opacity:0, x:20 }} animate={{ opacity:1, x:0 }}
              exit={{ opacity:0, x:20 }} transition={{ duration:0.18 }}
              style={{ position:'absolute' as const, inset:0, overflow:'hidden' as const }}>
              <RecentTrades symbol={activePair.symbol} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom tab bar */}
      <MobileTabBar active={mobileTab} onChange={setMobileTab} />
    </div>
  );
});
Charts.displayName = 'Charts';
export default Charts;
`;

// ══════════════════════════════════════════════════════════════════════════════
// MAIN
// ══════════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('');
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║   ZERØ MERIDIAN — push99 BYBIT LAYOUT + TV WIDGET      ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log('');

  const me = await ghReq('GET', '/user');
  if (me.status !== 200) { console.error('❌ Token tidak valid!'); process.exit(1); }
  console.log('✅ Token OK — user: ' + me.body.login);
  console.log('');
  console.log('Pushing...');
  console.log('');

  const ok = await push(
    'src/pages/Charts.tsx',
    CHARTS,
    'push99: Charts — Bybit layout (pair list + TradingView full widget + orderbook + trades)'
  );

  console.log('');
  if (ok) {
    console.log('╔══════════════════════════════════════════════════════════╗');
    console.log('║  ✅ BERHASIL!                                           ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log('║                                                          ║');
    console.log('║  Layout Bybit:                                           ║');
    console.log('║  ✅ Pair list kiri (search + category filter)           ║');
    console.log('║  ✅ TradingView FULL widget tengah                      ║');
    console.log('║     → Drawing tools lengkap                             ║');
    console.log('║     → 100+ indicators (RSI, MACD, BB, dll)             ║');
    console.log('║     → Multi timeframe                                   ║');
    console.log('║     → Fullscreen mode                                   ║');
    console.log('║     → Screenshot & alerts                               ║');
    console.log('║  ✅ Order Book kanan real-time (WebSocket)              ║');
    console.log('║  ✅ Recent Trades feed real-time                        ║');
    console.log('║  ✅ Price header bar (24h stats)                        ║');
    console.log('║  ✅ Mobile: tab switcher (Pairs|Chart|Book|Trades)      ║');
    console.log('║                                                          ║');
    console.log('║  Buka: https://new-zeromeridian.pages.dev/charts        ║');
    console.log('╚══════════════════════════════════════════════════════════╝');
  } else {
    console.log('❌ GAGAL — cek token');
  }
  console.log('');
}

main().catch(err => { console.error('Fatal:', err.message); process.exit(1); });
