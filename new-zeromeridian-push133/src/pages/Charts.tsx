/**
 * Charts.tsx — ZERØ MERIDIAN 2026 push133
 * push133: Light professional reskin (Bloomberg mode push132)
 * Layout BYBIT-style: Pairs | TradingView | OrderBook
 * - Object.freeze() ✓  rgba() only ✓  Zero className ✓
 * - JetBrains Mono ✓  React.memo + displayName ✓  mountedRef ✓
 */

import { memo, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCrypto } from '@/contexts/CryptoContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { formatPrice, formatCompact } from '@/lib/formatters';

const FONT = "'JetBrains Mono', monospace";

const C = Object.freeze({
  bgBase:       "rgba(248,249,252,1)",
  bgCard:       "rgba(255,255,255,1)",
  bgSidebar:    "rgba(252,253,255,1)",
  bgHdr:        "rgba(248,249,252,1)",
  bgRowHov:     "rgba(243,245,252,1)",
  accent:       "rgba(15,40,180,1)",
  accentDim:    "rgba(15,40,180,0.07)",
  accentBorder: "rgba(15,40,180,0.22)",
  positive:     "rgba(0,155,95,1)",
  positiveDim:  "rgba(0,155,95,0.09)",
  negative:     "rgba(208,35,75,1)",
  negativeDim:  "rgba(208,35,75,0.09)",
  textPrimary:  "rgba(8,12,40,1)",
  textSecondary:"rgba(55,65,110,1)",
  textMuted:    "rgba(110,120,160,1)",
  textFaint:    "rgba(165,175,210,1)",
  border:       "rgba(15,40,100,0.10)",
  borderFaint:  "rgba(15,40,100,0.06)",
  shadow:       "0 1px 4px rgba(15,40,100,0.07), 0 0 0 1px rgba(15,40,100,0.06)",
});

// ─── Pairs config ─────────────────────────────────────────────────────────────

interface Pair {
  symbol: string; tvSymbol: string; label: string;
  base: string; color: string; category: string;
}

const PAIRS: readonly Pair[] = Object.freeze([
  { symbol:"BTCUSDT",  tvSymbol:"BINANCE:BTCUSDT",  label:"BTC/USDT",  base:"BTC",  color:"rgba(195,125,0,1)",   category:"MAJOR" },
  { symbol:"ETHUSDT",  tvSymbol:"BINANCE:ETHUSDT",  label:"ETH/USDT",  base:"ETH",  color:"rgba(75,110,220,1)",  category:"MAJOR" },
  { symbol:"SOLUSDT",  tvSymbol:"BINANCE:SOLUSDT",  label:"SOL/USDT",  base:"SOL",  color:"rgba(130,80,200,1)",  category:"MAJOR" },
  { symbol:"BNBUSDT",  tvSymbol:"BINANCE:BNBUSDT",  label:"BNB/USDT",  base:"BNB",  color:"rgba(195,125,0,0.8)", category:"MAJOR" },
  { symbol:"XRPUSDT",  tvSymbol:"BINANCE:XRPUSDT",  label:"XRP/USDT",  base:"XRP",  color:"rgba(15,130,160,1)",  category:"MAJOR" },
  { symbol:"ADAUSDT",  tvSymbol:"BINANCE:ADAUSDT",  label:"ADA/USDT",  base:"ADA",  color:"rgba(0,155,95,1)",    category:"ALTS"  },
  { symbol:"AVAXUSDT", tvSymbol:"BINANCE:AVAXUSDT", label:"AVAX/USDT", base:"AVAX", color:"rgba(208,35,75,1)",   category:"ALTS"  },
  { symbol:"DOGEUSDT", tvSymbol:"BINANCE:DOGEUSDT", label:"DOGE/USDT", base:"DOGE", color:"rgba(180,120,0,1)",   category:"ALTS"  },
  { symbol:"DOTUSDT",  tvSymbol:"BINANCE:DOTUSDT",  label:"DOT/USDT",  base:"DOT",  color:"rgba(150,100,220,1)", category:"ALTS"  },
  { symbol:"LINKUSDT", tvSymbol:"BINANCE:LINKUSDT", label:"LINK/USDT", base:"LINK", color:"rgba(55,100,200,1)",  category:"ALTS"  },
  { symbol:"MATICUSDT",tvSymbol:"BINANCE:MATICUSDT",label:"MATIC/USDT",base:"MATIC",color:"rgba(100,60,200,1)",  category:"ALTS"  },
  { symbol:"UNIUSDT",  tvSymbol:"BINANCE:UNIUSDT",  label:"UNI/USDT",  base:"UNI",  color:"rgba(200,30,120,1)",  category:"DEFI"  },
  { symbol:"AAVEUSDT", tvSymbol:"BINANCE:AAVEUSDT", label:"AAVE/USDT", base:"AAVE", color:"rgba(160,60,220,1)",  category:"DEFI"  },
  { symbol:"CRVUSDT",  tvSymbol:"BINANCE:CRVUSDT",  label:"CRV/USDT",  base:"CRV",  color:"rgba(210,50,50,1)",   category:"DEFI"  },
  { symbol:"MKRUSDT",  tvSymbol:"BINANCE:MKRUSDT",  label:"MKR/USDT",  base:"MKR",  color:"rgba(0,150,110,1)",   category:"DEFI"  },
]);

const CATEGORIES = Object.freeze(["ALL", "MAJOR", "ALTS", "DEFI"]);

// ─── TVWidget ─────────────────────────────────────────────────────────────────

const TVWidget = memo(({ tvSymbol }: { tvSymbol: string }) => {
  const src = useMemo(() => {
    const p = new URLSearchParams({
      symbol: tvSymbol, interval: "D", timezone: "Etc/UTC",
      theme: "light", style: "1", locale: "en",
      toolbar_bg: "F8F9FC",
      enable_publishing: "false", hide_top_toolbar: "false",
      save_image: "true", allow_symbol_change: "true",
      details: "true", hotlist: "true", calendar: "true",
      studies: "RSI@tv-basicstudies,MACD@tv-basicstudies",
      show_popup_button: "true", withdateranges: "true",
      hide_side_toolbar: "false",
      watchlist: PAIRS.map(p => p.tvSymbol).join(","),
    });
    return "https://s.tradingview.com/widgetembed/?" + p.toString();
  }, [tvSymbol]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" as const }}>
      <iframe
        key={tvSymbol}
        src={src}
        style={{ width: "100%", height: "100%", border: "none", display: "block" }}
        allowFullScreen
        title={"TradingView Chart " + tvSymbol}
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-top-navigation"
        loading="lazy"
      />
    </div>
  );
});
TVWidget.displayName = "TVWidget";

// ─── OrderBookPanel ───────────────────────────────────────────────────────────

interface OBLevel { price: number; qty: number; total: number; }

const OrderBookPanel = memo(({ symbol, color }: { symbol: string; color: string }) => {
  const [asks, setAsks]   = useState<OBLevel[]>([]);
  const [bids, setBids]   = useState<OBLevel[]>([]);
  const [spread, setSpread] = useState(0);
  const wsRef      = useRef<WebSocket | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const ws = new WebSocket("wss://stream.binance.com:9443/ws/" + symbol.toLowerCase() + "@depth10@100ms");
    wsRef.current = ws;
    ws.onmessage = (e) => {
      if (!mountedRef.current) return;
      try {
        const d = JSON.parse(e.data) as { asks: string[][]; bids: string[][] };
        const proc = (raw: string[][]): OBLevel[] => {
          let cum = 0;
          return raw.slice(0, 10).map(([p, q]) => { cum += parseFloat(q); return { price: parseFloat(p), qty: parseFloat(q), total: cum }; });
        };
        const a = proc(d.asks), b = proc(d.bids);
        if (mountedRef.current) { setAsks(a); setBids(b); if (a.length && b.length) setSpread(+(a[0].price - b[0].price).toFixed(2)); }
      } catch {}
    };
    ws.onerror = () => ws.close();
    return () => { mountedRef.current = false; ws.close(); };
  }, [symbol]);

  const maxTotal = useMemo(() => {
    const t = [...asks, ...bids].map(l => l.total);
    return t.length ? Math.max(...t) : 1;
  }, [asks, bids]);

  const rowSt = useCallback((side: "ask" | "bid", total: number) => {
    const pct = (total / maxTotal) * 100;
    const bg = side === "ask"
      ? "linear-gradient(to left, rgba(208,35,75,0.10) " + pct + "%, transparent " + pct + "%)"
      : "linear-gradient(to right, rgba(0,155,95,0.10) " + pct + "%, transparent " + pct + "%)";
    return { display: "flex", justifyContent: "space-between", padding: "2px 10px", background: bg, fontFamily: FONT, fontSize: "10px", cursor: "pointer" as const };
  }, [maxTotal]);

  const hdrColSt = { fontFamily: FONT, fontSize: "9px", color: C.textFaint, display: "flex", justifyContent: "space-between", padding: "4px 10px", borderBottom: "1px solid " + C.borderFaint };

  return (
    <div style={{ display: "flex", flexDirection: "column" as const, height: "100%", overflow: "hidden" as const }}>
      <div style={{ padding: "10px 10px 6px", borderBottom: "1px solid " + C.border, flexShrink: 0, background: C.bgHdr }}>
        <span style={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: C.textPrimary, letterSpacing: "0.06em" }}>ORDER BOOK</span>
        <span style={{ marginLeft: 8, fontFamily: FONT, fontSize: "9px", color, opacity: 0.8 }}>{symbol}</span>
      </div>
      <div style={hdrColSt}><span>PRICE</span><span>SIZE</span><span>TOTAL</span></div>
      <div style={{ flex: 1, overflowY: "auto" as const, display: "flex", flexDirection: "column-reverse" as const }}>
        {asks.slice().reverse().map((l, i) => (
          <div key={i} style={rowSt("ask", l.total)}>
            <span style={{ color: C.negative }}>{l.price.toFixed(2)}</span>
            <span style={{ color: C.textMuted }}>{l.qty.toFixed(4)}</span>
            <span style={{ color: C.textFaint }}>{l.total.toFixed(2)}</span>
          </div>
        ))}
      </div>
      <div style={{ padding: "4px 10px", background: C.bgHdr, borderTop: "1px solid " + C.borderFaint, borderBottom: "1px solid " + C.borderFaint, display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0 }}>
        <span style={{ fontFamily: FONT, fontSize: "11px", color, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{bids.length ? bids[0].price.toFixed(2) : "—"}</span>
        <span style={{ fontFamily: FONT, fontSize: "9px", color: C.textFaint }}>Spread: {spread}</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto" as const }}>
        {bids.map((l, i) => (
          <div key={i} style={rowSt("bid", l.total)}>
            <span style={{ color: C.positive }}>{l.price.toFixed(2)}</span>
            <span style={{ color: C.textMuted }}>{l.qty.toFixed(4)}</span>
            <span style={{ color: C.textFaint }}>{l.total.toFixed(2)}</span>
          </div>
        ))}
      </div>
    </div>
  );
});
OrderBookPanel.displayName = "OrderBookPanel";

// ─── RecentTrades ─────────────────────────────────────────────────────────────

interface Trade { id: number; price: number; qty: number; isBuyer: boolean; time: number; }

const RecentTrades = memo(({ symbol }: { symbol: string }) => {
  const [trades, setTrades] = useState<Trade[]>([]);
  const wsRef      = useRef<WebSocket | null>(null);
  const mountedRef = useRef(true);
  const bufRef     = useRef<Trade[]>([]);

  useEffect(() => {
    mountedRef.current = true;
    const ws = new WebSocket("wss://stream.binance.com:9443/ws/" + symbol.toLowerCase() + "@trade");
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
    <div style={{ display: "flex", flexDirection: "column" as const, height: "100%", overflow: "hidden" as const }}>
      <div style={{ padding: "8px 10px 6px", borderBottom: "1px solid " + C.border, flexShrink: 0, background: C.bgHdr }}>
        <span style={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: C.textPrimary, letterSpacing: "0.06em" }}>RECENT TRADES</span>
      </div>
      <div style={{ fontFamily: FONT, fontSize: "9px", color: C.textFaint, display: "flex", justifyContent: "space-between", padding: "4px 10px", borderBottom: "1px solid " + C.borderFaint }}>
        <span>PRICE</span><span>SIZE</span><span>TIME</span>
      </div>
      <div style={{ flex: 1, overflowY: "auto" as const }}>
        {trades.map(t => (
          <div key={t.id} style={{ display: "flex", justifyContent: "space-between", padding: "2px 10px", fontFamily: FONT, fontSize: "10px" }}>
            <span style={{ color: t.isBuyer ? C.positive : C.negative, fontVariantNumeric: "tabular-nums" }}>{t.price.toFixed(2)}</span>
            <span style={{ color: C.textMuted }}>{t.qty.toFixed(4)}</span>
            <span style={{ color: C.textFaint }}>{new Date(t.time).toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
          </div>
        ))}
        {trades.length === 0 && (
          <div style={{ padding: "20px 10px", fontFamily: FONT, fontSize: "10px", color: C.textFaint, textAlign: "center" as const }}>Connecting…</div>
        )}
      </div>
    </div>
  );
});
RecentTrades.displayName = "RecentTrades";

// ─── PairItem ─────────────────────────────────────────────────────────────────

const PairItem = memo(({ pair, active, price, change24h, onSelect }: {
  pair: Pair; active: boolean; price: number; change24h: number; onSelect: (p: Pair) => void;
}) => {
  const pos = change24h >= 0;
  return (
    <div
      onClick={() => onSelect(pair)}
      style={{
        padding: "8px 10px", cursor: "pointer" as const,
        background: active ? C.accentDim : "transparent",
        borderLeft: "2px solid " + (active ? pair.color : "transparent"),
        borderBottom: "1px solid " + C.borderFaint,
        transition: "background 0.12s",
      }}
      onMouseEnter={e => { if (!active) e.currentTarget.style.background = C.bgRowHov; }}
      onMouseLeave={e => { if (!active) e.currentTarget.style.background = "transparent"; }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: active ? pair.color : C.textPrimary }}>{pair.label}</span>
        <span style={{ fontFamily: FONT, fontSize: "10px", fontWeight: 600, color: pos ? C.positive : C.negative, fontVariantNumeric: "tabular-nums" }}>
          {(pos ? "+" : "") + change24h.toFixed(2) + "%"}
        </span>
      </div>
      {price > 0 && <div style={{ fontFamily: FONT, fontSize: "10px", color: C.textMuted, marginTop: 1, fontVariantNumeric: "tabular-nums" }}>{formatPrice(price)}</div>}
    </div>
  );
});
PairItem.displayName = "PairItem";

// ─── PairList ─────────────────────────────────────────────────────────────────

const PairList = memo(({ activePair, onSelect }: { activePair: Pair; onSelect: (p: Pair) => void }) => {
  const { assets } = useCrypto();
  const [cat, setCat]     = useState("ALL");
  const [search, setSearch] = useState("");
  const m = useRef(true);
  useEffect(() => { m.current = true; return () => { m.current = false; }; }, []);

  const priceMap = useMemo(() => {
    const map: Record<string, { price: number; change: number }> = {};
    for (const a of assets) map[a.symbol.toUpperCase() + "USDT"] = { price: a.price, change: a.change24h };
    return map;
  }, [assets]);

  const filtered = useMemo(() => PAIRS.filter(p =>
    (cat === "ALL" || p.category === cat) &&
    (search === "" || p.label.toLowerCase().includes(search.toLowerCase()) || p.base.toLowerCase().includes(search.toLowerCase()))
  ), [cat, search]);

  return (
    <div style={{ display: "flex", flexDirection: "column" as const, height: "100%", overflow: "hidden" as const }}>
      <div style={{ padding: 8, borderBottom: "1px solid " + C.border, flexShrink: 0 }}>
        <div style={{ position: "relative" as const }}>
          <input type="text" placeholder="Search…" value={search}
            onChange={e => { if (m.current) setSearch(e.target.value); }}
            style={{ width: "100%", fontFamily: FONT, fontSize: "10px", background: C.bgCard, border: "1px solid " + C.border, borderRadius: 6, padding: "6px 8px 6px 24px", color: C.textPrimary, outline: "none", boxSizing: "border-box" as const }} />
          <span style={{ position: "absolute" as const, left: 7, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: C.textMuted }}>⌕</span>
        </div>
      </div>
      <div style={{ display: "flex", borderBottom: "1px solid " + C.border, flexShrink: 0 }}>
        {CATEGORIES.map(c => (
          <button key={c} type="button" onClick={() => { if (m.current) setCat(c); }}
            style={{ flex: 1, fontFamily: FONT, fontSize: "9px", padding: "6px 0", cursor: "pointer" as const, background: cat === c ? C.accentDim : "transparent", border: "none", borderBottom: "2px solid " + (cat === c ? C.accent : "transparent"), color: cat === c ? C.accent : C.textFaint, transition: "all 0.12s", letterSpacing: "0.08em" }}>
            {c}
          </button>
        ))}
      </div>
      <div style={{ flex: 1, overflowY: "auto" as const }}>
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
PairList.displayName = "PairList";

// ─── PairHeader ───────────────────────────────────────────────────────────────

const PairHeader = memo(({ pair }: { pair: Pair }) => {
  const { assets } = useCrypto();
  const asset = useMemo(() => assets.find(a => a.symbol.toUpperCase() + "USDT" === pair.symbol), [assets, pair.symbol]);
  const stats = useMemo(() => [
    { label: "24H CHANGE", value: asset ? (asset.change24h >= 0 ? "+" : "") + asset.change24h.toFixed(2) + "%" : "—", color: asset ? (asset.change24h >= 0 ? C.positive : C.negative) : C.textFaint },
    { label: "24H HIGH",   value: asset?.high24h ? formatPrice(asset.high24h) : "—", color: C.textSecondary },
    { label: "24H LOW",    value: asset?.low24h  ? formatPrice(asset.low24h)  : "—", color: C.textSecondary },
    { label: "24H VOL",    value: asset?.volume24h ? formatCompact(asset.volume24h) : "—", color: C.textMuted },
  ], [asset]);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "8px 16px", background: C.bgHdr, borderBottom: "1px solid " + C.border, flexWrap: "wrap" as const, flexShrink: 0 }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 10, minWidth: 200 }}>
        <span style={{ fontFamily: FONT, fontSize: 16, fontWeight: 700, color: pair.color, letterSpacing: "0.04em" }}>{pair.label}</span>
        <span style={{ fontFamily: FONT, fontSize: 20, fontWeight: 700, color: C.textPrimary, fontVariantNumeric: "tabular-nums" }}>{asset ? formatPrice(asset.price) : "—"}</span>
      </div>
      <div style={{ display: "flex", gap: 20, flexWrap: "wrap" as const }}>
        {stats.map(s => (
          <div key={s.label} style={{ display: "flex", flexDirection: "column" as const }}>
            <span style={{ fontFamily: FONT, fontSize: "8px", color: C.textFaint, letterSpacing: "0.10em" }}>{s.label}</span>
            <span style={{ fontFamily: FONT, fontSize: "11px", color: s.color, fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{s.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
});
PairHeader.displayName = "PairHeader";

// ─── Mobile tab bar ───────────────────────────────────────────────────────────

type MobileTab = "chart" | "book" | "trades" | "pairs";

const MobileTabBar = memo(({ active, onChange }: { active: MobileTab; onChange: (t: MobileTab) => void }) => {
  const tabs = Object.freeze([
    { id: "pairs" as MobileTab, label: "Pairs", icon: "≡" },
    { id: "chart" as MobileTab, label: "Chart", icon: "📈" },
    { id: "book"  as MobileTab, label: "Book",  icon: "▤" },
    { id: "trades"as MobileTab, label: "Trades",icon: "⚡" },
  ]);
  return (
    <div style={{ display: "flex", borderTop: "1px solid " + C.border, flexShrink: 0, background: C.bgCard }}>
      {tabs.map(t => (
        <button key={t.id} type="button" onClick={() => onChange(t.id)}
          style={{ flex: 1, fontFamily: FONT, fontSize: "9px", padding: "8px 0", cursor: "pointer" as const, background: active === t.id ? C.accentDim : "transparent", border: "none", borderTop: "2px solid " + (active === t.id ? C.accent : "transparent"), color: active === t.id ? C.accent : C.textFaint, display: "flex", flexDirection: "column" as const, alignItems: "center", gap: 2 }}>
          <span style={{ fontSize: 14 }}>{t.icon}</span>
          {t.label}
        </button>
      ))}
    </div>
  );
});
MobileTabBar.displayName = "MobileTabBar";

// ─── Charts ───────────────────────────────────────────────────────────────────

const Charts = memo(() => {
  const { isMobile, isTablet } = useBreakpoint();
  const [activePair, setActivePair] = useState<Pair>(PAIRS[0]);
  const [mobileTab, setMobileTab]   = useState<MobileTab>("chart");
  const m = useRef(true);
  useEffect(() => { m.current = true; return () => { m.current = false; }; }, []);

  const handleSelect = useCallback((p: Pair) => {
    if (!m.current) return;
    setActivePair(p);
    if (isMobile) setMobileTab("chart");
  }, [isMobile]);

  const wrapSt = Object.freeze({
    display: "flex", flexDirection: "column" as const,
    height: "calc(100vh - 48px)", overflow: "hidden" as const,
    background: C.bgBase,
  });

  if (!isMobile) {
    return (
      <div style={wrapSt}>
        <PairHeader pair={activePair} />
        <div style={{ display: "flex", flex: 1, overflow: "hidden" as const }}>
          {!isTablet && (
            <div style={{ width: 200, flexShrink: 0, borderRight: "1px solid " + C.border, background: C.bgSidebar, overflow: "hidden" as const }}>
              <PairList activePair={activePair} onSelect={handleSelect} />
            </div>
          )}
          <div style={{ flex: 1, minWidth: 0, overflow: "hidden" as const }}>
            <TVWidget tvSymbol={activePair.tvSymbol} />
          </div>
          <div style={{ width: isTablet ? 220 : 240, flexShrink: 0, borderLeft: "1px solid " + C.border, background: C.bgSidebar, display: "flex", flexDirection: "column" as const, overflow: "hidden" as const }}>
            <div style={{ flex: "0 0 55%", borderBottom: "1px solid " + C.border, overflow: "hidden" as const }}>
              <OrderBookPanel symbol={activePair.symbol} color={activePair.color} />
            </div>
            <div style={{ flex: "0 0 45%", overflow: "hidden" as const }}>
              <RecentTrades symbol={activePair.symbol} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ ...wrapSt, height: "calc(100vh - 96px)" }}>
      <PairHeader pair={activePair} />
      <div style={{ flex: 1, overflow: "hidden" as const, position: "relative" as const }}>
        <AnimatePresence mode="wait">
          {mobileTab === "pairs" && (
            <motion.div key="pairs" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.18 }}
              style={{ position: "absolute" as const, inset: 0, overflow: "hidden" as const }}>
              <PairList activePair={activePair} onSelect={handleSelect} />
            </motion.div>
          )}
          {mobileTab === "chart" && (
            <motion.div key="chart" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }}
              style={{ position: "absolute" as const, inset: 0 }}>
              <TVWidget tvSymbol={activePair.tvSymbol} />
            </motion.div>
          )}
          {mobileTab === "book" && (
            <motion.div key="book" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.18 }}
              style={{ position: "absolute" as const, inset: 0, overflow: "hidden" as const }}>
              <OrderBookPanel symbol={activePair.symbol} color={activePair.color} />
            </motion.div>
          )}
          {mobileTab === "trades" && (
            <motion.div key="trades" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }} transition={{ duration: 0.18 }}
              style={{ position: "absolute" as const, inset: 0, overflow: "hidden" as const }}>
              <RecentTrades symbol={activePair.symbol} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <MobileTabBar active={mobileTab} onChange={setMobileTab} />
    </div>
  );
});
Charts.displayName = "Charts";
export default Charts;
