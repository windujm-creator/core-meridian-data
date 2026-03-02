/**
 * Portfolio.tsx — ZERØ MERIDIAN 2026 push133
 * push133: Light professional reskin (Bloomberg mode push132)
 * All logic preserved — only colors/theme changed to light mode
 * - Object.freeze() ✓  rgba() only ✓  Zero className ✓
 * - JetBrains Mono ✓  React.memo + displayName ✓  localStorage ✓
 */

import React, { memo, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCrypto } from '@/contexts/CryptoContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { Loader2, RefreshCw } from 'lucide-react';

const FONT = "'JetBrains Mono', monospace";
const LS_KEY = 'zm_portfolio_v1';

const C = Object.freeze({
  bgBase:       "rgba(248,249,252,1)",
  bgCard:       "rgba(255,255,255,1)",
  bgCardHover:  "rgba(243,245,250,1)",
  bgModal:      "rgba(237,240,248,1)",
  bgInput:      "rgba(243,245,252,1)",
  accent:       "rgba(15,40,180,1)",
  accentDim:    "rgba(15,40,180,0.08)",
  accentBorder: "rgba(15,40,180,0.25)",
  positive:     "rgba(0,155,95,1)",
  positiveDim:  "rgba(0,155,95,0.09)",
  negative:     "rgba(208,35,75,1)",
  negativeDim:  "rgba(208,35,75,0.09)",
  warning:      "rgba(195,125,0,1)",
  warningDim:   "rgba(195,125,0,0.09)",
  violet:       "rgba(90,60,200,1)",
  violetDim:    "rgba(90,60,200,0.09)",
  textPrimary:  "rgba(8,12,40,1)",
  textSecondary:"rgba(55,65,110,1)",
  textMuted:    "rgba(110,120,160,1)",
  textFaint:    "rgba(165,175,210,1)",
  border:       "rgba(15,40,100,0.10)",
  borderFaint:  "rgba(15,40,100,0.06)",
  inputBorder:  "rgba(15,40,100,0.15)",
  shadow:       "0 1px 4px rgba(15,40,100,0.07), 0 0 0 1px rgba(15,40,100,0.06)",
  overlay:      "rgba(8,12,40,0.45)",
});

const TABS = Object.freeze(["Holdings", "Allocation", "Performance"] as const);
type Tab = typeof TABS[number];

const ALLOC_COLORS = Object.freeze([
  "rgba(15,40,180,1)", "rgba(0,155,95,1)", "rgba(90,60,200,1)",
  "rgba(195,125,0,1)", "rgba(208,35,75,1)", "rgba(60,120,200,1)",
  "rgba(0,130,90,1)",  "rgba(170,60,200,1)",
]);

export interface Holding {
  id: string; symbol: string; name: string;
  qty: number; avgBuy: number; addedAt: number;
}

function loadHoldings(): Holding[] {
  try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}
function saveHoldings(h: Holding[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(h)); } catch {}
}
function fmtUsd(n: number, dec = 2): string {
  if (n >= 1e9) return "$" + (n / 1e9).toFixed(2) + "B";
  if (n >= 1e6) return "$" + (n / 1e6).toFixed(2) + "M";
  if (n >= 1e3) return "$" + n.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
  return "$" + n.toFixed(dec);
}
function pct(a: number, b: number): string { return b === 0 ? "—" : ((a / b - 1) * 100).toFixed(2) + "%"; }

// ─── Sparkline ────────────────────────────────────────────────────────────────

const Sparkline = memo(({ values, positive }: { values: number[]; positive: boolean }) => {
  if (values.length < 2) return null;
  const min = Math.min(...values), max = Math.max(...values);
  const range = max - min || 1;
  const W = 60, H = 24;
  const pts = values.map((v, i) => ((i / (values.length - 1)) * W) + "," + (H - ((v - min) / range) * H)).join(" ");
  const col = positive ? C.positive : C.negative;
  return (
    <svg width={W} height={H} style={{ display: "block" }}>
      <polyline points={pts} fill="none" stroke={col} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.85" />
    </svg>
  );
});
Sparkline.displayName = "Sparkline";

// ─── AddModal ─────────────────────────────────────────────────────────────────

const AddModal = memo(({ onAdd, onClose, existingSymbols }: {
  onAdd: (h: Omit<Holding, "id" | "addedAt">) => void;
  onClose: () => void;
  existingSymbols: string[];
}) => {
  const [symbol, setSymbol] = useState("");
  const [name, setName]     = useState("");
  const [qty, setQty]       = useState("");
  const [avgBuy, setAvgBuy] = useState("");
  const [err, setErr]       = useState("");

  const handleSubmit = useCallback(() => {
    const sym = symbol.trim().toUpperCase();
    const nm  = name.trim() || sym;
    const q   = parseFloat(qty);
    const avg = parseFloat(avgBuy);
    if (!sym) { setErr("Symbol required"); return; }
    if (isNaN(q) || q <= 0) { setErr("Invalid quantity"); return; }
    if (isNaN(avg) || avg <= 0) { setErr("Invalid buy price"); return; }
    if (existingSymbols.includes(sym)) { setErr(sym + " already in portfolio"); return; }
    onAdd({ symbol: sym, name: nm, qty: q, avgBuy: avg });
  }, [symbol, name, qty, avgBuy, onAdd, existingSymbols]);

  const inputSt = useMemo(() => Object.freeze({
    width: "100%", background: C.bgInput, border: "1px solid " + C.inputBorder,
    borderRadius: 8, padding: "9px 12px", fontFamily: FONT, fontSize: "12px",
    color: C.textPrimary, outline: "none", boxSizing: "border-box" as const,
  }), []);
  const labelSt = useMemo(() => Object.freeze({
    fontFamily: FONT, fontSize: "9px", color: C.textMuted,
    letterSpacing: "0.10em", textTransform: "uppercase" as const,
  }), []);

  return (
    <motion.div
      style={{ position: "fixed" as const, inset: 0, background: C.overlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
      onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <motion.div
        style={{ background: C.bgCard, border: "1px solid " + C.accentBorder, borderRadius: 16, padding: 28, width: "100%", maxWidth: 420, boxShadow: "0 8px 40px rgba(15,40,100,0.14)" }}
        onClick={e => e.stopPropagation()} initial={{ scale: 0.94, y: 16 }} animate={{ scale: 1, y: 0 }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <h2 style={{ fontFamily: FONT, fontSize: 15, fontWeight: 800, color: C.textPrimary, margin: 0, letterSpacing: "0.04em" }}>ADD HOLDING</h2>
          <button onClick={onClose} style={{ background: C.border, border: "none", borderRadius: 8, width: 30, height: 30, cursor: "pointer", color: C.textMuted, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>
        <div style={{ display: "flex", flexDirection: "column" as const, gap: 12 }}>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" as const, gap: 5 }}>
              <label style={labelSt}>Symbol *</label>
              <input style={inputSt} value={symbol} onChange={e => setSymbol(e.target.value.toUpperCase())} placeholder="BTC" maxLength={10} />
            </div>
            <div style={{ flex: 2, display: "flex", flexDirection: "column" as const, gap: 5 }}>
              <label style={labelSt}>Name</label>
              <input style={inputSt} value={name} onChange={e => setName(e.target.value)} placeholder="Bitcoin" />
            </div>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" as const, gap: 5 }}>
              <label style={labelSt}>Quantity *</label>
              <input style={inputSt} type="number" value={qty} onChange={e => setQty(e.target.value)} placeholder="0.5" min="0" step="any" />
            </div>
            <div style={{ flex: 1, display: "flex", flexDirection: "column" as const, gap: 5 }}>
              <label style={labelSt}>Avg Buy $ *</label>
              <input style={inputSt} type="number" value={avgBuy} onChange={e => setAvgBuy(e.target.value)} placeholder="45000" min="0" step="any" />
            </div>
          </div>
          {err && <p style={{ fontFamily: FONT, fontSize: "11px", color: C.negative, margin: 0 }}>⚠ {err}</p>}
          <button
            onClick={handleSubmit}
            style={{ width: "100%", padding: "11px", background: C.accentDim, border: "1px solid " + C.accentBorder, borderRadius: 8, color: C.accent, fontFamily: FONT, fontSize: "12px", fontWeight: 700, cursor: "pointer", letterSpacing: "0.06em", marginTop: 4 }}
          >+ ADD TO PORTFOLIO</button>
        </div>
      </motion.div>
    </motion.div>
  );
});
AddModal.displayName = "AddModal";

// ─── HoldingRow ───────────────────────────────────────────────────────────────

const HoldingRow = memo(({ holding, price, change24h, onRemove, isMobile }: {
  holding: Holding; price: number; change24h: number;
  onRemove: (id: string) => void; isMobile: boolean;
}) => {
  const value  = holding.qty * price;
  const cost   = holding.qty * holding.avgBuy;
  const pnl    = value - cost;
  const pnlPct = cost > 0 ? (pnl / cost) * 100 : 0;
  const isPos  = pnl >= 0;
  const daily  = value * (change24h / 100);
  const pnlCol = isPos ? C.positive : C.negative;
  const chCol  = change24h >= 0 ? C.positive : C.negative;

  const cols = isMobile ? "1fr 70px 70px" : "36px 1fr 88px 88px 88px 88px 88px 32px";

  return (
    <motion.div
      style={{ display: "grid", gridTemplateColumns: cols, alignItems: "center", gap: 8, padding: "12px 16px", borderBottom: "1px solid " + C.borderFaint }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} layout
    >
      {!isMobile && (
        <img
          src={"https://assets.coingecko.com/coins/images/1/thumb/" + holding.symbol.toLowerCase() + ".png"}
          onError={e => { (e.target as HTMLImageElement).style.display = "none"; }}
          width={26} height={26}
          style={{ borderRadius: "50%", objectFit: "cover" }}
          alt={holding.symbol}
        />
      )}
      <div style={{ display: "flex", flexDirection: "column" as const, gap: 2 }}>
        <span style={{ fontFamily: FONT, fontSize: "12px", fontWeight: 700, color: C.textPrimary }}>{holding.symbol}</span>
        <span style={{ fontFamily: FONT, fontSize: "10px", color: C.textMuted }}>{holding.qty.toLocaleString("en-US", { maximumSignificantDigits: 6 })} units</span>
      </div>
      <div style={{ textAlign: "right" as const }}>
        <div style={{ fontFamily: FONT, fontSize: "12px", color: C.textPrimary, fontVariantNumeric: "tabular-nums" }}>{price > 0 ? fmtUsd(value) : "—"}</div>
        {!isMobile && <div style={{ fontFamily: FONT, fontSize: "9px", color: C.textMuted, fontVariantNumeric: "tabular-nums" }}>${price > 0 ? price.toLocaleString("en-US", { maximumFractionDigits: 2 }) : "—"}</div>}
      </div>
      {!isMobile && (
        <div style={{ textAlign: "right" as const }}>
          <div style={{ fontFamily: FONT, fontSize: "11px", color: pnlCol, fontWeight: 700 }}>{isPos ? "+" : ""}{fmtUsd(pnl)}</div>
          <div style={{ fontFamily: FONT, fontSize: "9px", color: pnlCol }}>{isPos ? "+" : ""}{pnlPct.toFixed(2)}%</div>
        </div>
      )}
      {!isMobile && (
        <div style={{ textAlign: "right" as const }}>
          <div style={{ fontFamily: FONT, fontSize: "11px", color: chCol }}>{change24h >= 0 ? "+" : ""}{change24h.toFixed(2)}%</div>
          <div style={{ fontFamily: FONT, fontSize: "9px", color: chCol }}>{daily >= 0 ? "+" : ""}{fmtUsd(daily)}</div>
        </div>
      )}
      {!isMobile && <div style={{ textAlign: "right" as const }}><div style={{ fontFamily: FONT, fontSize: "11px", color: C.textMuted, fontVariantNumeric: "tabular-nums" }}>{fmtUsd(cost)}</div></div>}
      <div style={{ textAlign: "right" as const }}>
        <div style={{ fontFamily: FONT, fontSize: "11px", color: pnlCol, fontWeight: 700 }}>{isPos ? "+" : ""}{pnlPct.toFixed(2)}%</div>
      </div>
      {!isMobile && (
        <button onClick={() => onRemove(holding.id)} style={{ width: 26, height: 26, borderRadius: 6, border: "1px solid rgba(208,35,75,0.22)", background: C.negativeDim, color: C.negative, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>×</button>
      )}
    </motion.div>
  );
});
HoldingRow.displayName = "HoldingRow";

// ─── AllocationPie ────────────────────────────────────────────────────────────

const AllocationPie = memo(({ slices }: { slices: { label: string; value: number; color: string; pct: number }[] }) => {
  const SIZE = 200, R = 80, cx = 100, cy = 100;
  let cum = -Math.PI / 2;
  const paths = slices.map(s => {
    const angle = (s.pct / 100) * 2 * Math.PI;
    const start = cum; cum += angle;
    const x1 = cx + R * Math.cos(start), y1 = cy + R * Math.sin(start);
    const x2 = cx + R * Math.cos(cum),   y2 = cy + R * Math.sin(cum);
    return { d: "M " + cx + " " + cy + " L " + x1 + " " + y1 + " A " + R + " " + R + " 0 " + (angle > Math.PI ? 1 : 0) + " 1 " + x2 + " " + y2 + " Z", color: s.color, label: s.label, pct: s.pct };
  });
  return (
    <div style={{ display: "flex", flexWrap: "wrap" as const, gap: 24, alignItems: "center" }}>
      <svg width={SIZE} height={SIZE} style={{ flexShrink: 0 }}>
        {paths.map((p, i) => (
          <motion.path key={p.label} d={p.d} fill={p.color} stroke={C.bgCard} strokeWidth="2"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.07 }} />
        ))}
      </svg>
      <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
        {slices.map((s, i) => (
          <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: s.color, flexShrink: 0 }} />
            <span style={{ fontFamily: FONT, fontSize: "11px", color: C.textSecondary, fontWeight: 600, minWidth: 50 }}>{s.label}</span>
            <span style={{ fontFamily: FONT, fontSize: "11px", color: C.textMuted }}>{s.pct.toFixed(1)}%</span>
            <span style={{ fontFamily: FONT, fontSize: "11px", color: C.textFaint, fontVariantNumeric: "tabular-nums" }}>{fmtUsd(s.value)}</span>
          </div>
        ))}
      </div>
    </div>
  );
});
AllocationPie.displayName = "AllocationPie";

// ─── Portfolio ────────────────────────────────────────────────────────────────

const Portfolio = memo(() => {
  const { assets } = useCrypto();
  const { isMobile } = useBreakpoint();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [tab, setTab] = useState<Tab>("Holdings");
  const [showAdd, setShowAdd] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    setHoldings(loadHoldings());
    return () => { mountedRef.current = false; };
  }, []);

  const priceMap = useMemo(() => {
    const m: Record<string, { price: number; change: number; sparkline: number[] }> = {};
    for (const a of assets) m[a.symbol.toUpperCase()] = { price: a.price, change: a.change24h, sparkline: a.sparkline ?? [] };
    return m;
  }, [assets]);

  const addHolding = useCallback((h: Omit<Holding, "id" | "addedAt">) => {
    const newH: Holding = { ...h, id: Date.now().toString(36), addedAt: Date.now() };
    setHoldings(prev => { const next = [...prev, newH]; saveHoldings(next); return next; });
    setShowAdd(false);
  }, []);

  const removeHolding = useCallback((id: string) => {
    setHoldings(prev => { const next = prev.filter(h => h.id !== id); saveHoldings(next); return next; });
  }, []);

  const summary = useMemo(() => {
    let totalValue = 0, totalCost = 0;
    for (const h of holdings) {
      const pm = priceMap[h.symbol];
      if (pm) { totalValue += h.qty * pm.price; totalCost += h.qty * h.avgBuy; }
    }
    const totalPnl = totalValue - totalCost;
    const pnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
    const daily = holdings.reduce((s, h) => {
      const pm = priceMap[h.symbol];
      return pm ? s + (h.qty * pm.price * (pm.change / 100)) : s;
    }, 0);
    return { totalValue, totalCost, totalPnl, pnlPct, daily };
  }, [holdings, priceMap]);

  const allocationSlices = useMemo(() => {
    const items = holdings.map((h, i) => {
      const pm = priceMap[h.symbol];
      const val = pm ? h.qty * pm.price : 0;
      return { label: h.symbol, value: val, color: ALLOC_COLORS[i % ALLOC_COLORS.length], pct: 0 };
    }).filter(s => s.value > 0);
    const total = items.reduce((s, x) => s + x.value, 0);
    return items.map(s => ({ ...s, pct: total > 0 ? (s.value / total) * 100 : 0 }));
  }, [holdings, priceMap]);

  const pageSt = useMemo(() => Object.freeze({
    background: C.bgBase, minHeight: "100vh", fontFamily: FONT,
    padding: isMobile ? "12px" : "16px 20px",
  }), [isMobile]);

  const pnlColor = summary.totalPnl >= 0 ? C.positive : C.negative;

  const colHdrCols = isMobile ? "1fr 70px 70px" : "36px 1fr 88px 88px 88px 88px 88px 32px";

  return (
    <div style={pageSt}>
      {/* Page header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 3, height: 22, borderRadius: 2, background: C.accent }} />
            <h1 style={{ fontFamily: FONT, fontSize: isMobile ? 18 : 22, fontWeight: 800, color: C.textPrimary, margin: 0, letterSpacing: "-0.01em" }}>Portfolio</h1>
          </div>
          <p style={{ fontFamily: FONT, fontSize: "9px", color: C.textFaint, margin: "4px 0 0 13px", letterSpacing: "0.10em", textTransform: "uppercase" as const }}>
            {holdings.length} holdings
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          style={{ fontFamily: FONT, fontSize: "10px", fontWeight: 700, color: C.accent, background: C.accentDim, border: "1px solid " + C.accentBorder, borderRadius: 7, padding: "7px 14px", cursor: "pointer", flexShrink: 0 }}
        >+ Add</button>
      </div>

      {/* Summary cards */}
      {holdings.length > 0 && (
        <div style={{ display: "grid", gridTemplateColumns: isMobile ? "1fr 1fr" : "repeat(4,1fr)", gap: 10, marginBottom: 16 }}>
          {[
            { label: "Total Value",  value: fmtUsd(summary.totalValue), col: C.textPrimary },
            { label: "Total P&L",    value: (summary.totalPnl >= 0 ? "+" : "") + fmtUsd(summary.totalPnl), col: pnlColor },
            { label: "P&L %",        value: (summary.pnlPct >= 0 ? "+" : "") + summary.pnlPct.toFixed(2) + "%", col: pnlColor },
            { label: "Today's P&L",  value: (summary.daily >= 0 ? "+" : "") + fmtUsd(summary.daily), col: summary.daily >= 0 ? C.positive : C.negative },
          ].map(s => (
            <div key={s.label} style={{ background: C.bgCard, border: "1px solid " + C.border, borderRadius: 10, padding: "13px 15px", boxShadow: C.shadow }}>
              <div style={{ fontFamily: FONT, fontSize: "9px", color: C.textFaint, letterSpacing: "0.10em", textTransform: "uppercase" as const, marginBottom: 6 }}>{s.label}</div>
              <div style={{ fontFamily: FONT, fontSize: "16px", fontWeight: 700, color: s.col, fontVariantNumeric: "tabular-nums" }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 14, borderBottom: "1px solid " + C.border }}>
        {TABS.map(t => (
          <button key={t} type="button" onClick={() => setTab(t)}
            style={{ fontFamily: FONT, fontSize: "11px", fontWeight: tab === t ? 700 : 500, color: tab === t ? C.accent : C.textMuted, background: "none", border: "none", borderBottom: "2px solid " + (tab === t ? C.accent : "transparent"), padding: "8px 14px", cursor: "pointer", transition: "all 0.15s", letterSpacing: "0.04em" }}>
            {t}
          </button>
        ))}
      </div>

      {/* Empty state */}
      {holdings.length === 0 && (
        <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", padding: "60px 24px", gap: 12 }}>
          <span style={{ fontSize: 32, opacity: 0.3 }}>📊</span>
          <span style={{ fontFamily: FONT, fontSize: "12px", color: C.textMuted, textAlign: "center" as const }}>No holdings yet.</span>
          <button onClick={() => setShowAdd(true)} style={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: C.accent, background: C.accentDim, border: "1px solid " + C.accentBorder, borderRadius: 7, padding: "8px 18px", cursor: "pointer" }}>+ Add First Holding</button>
        </div>
      )}

      {/* Holdings tab */}
      {tab === "Holdings" && holdings.length > 0 && (
        <div style={{ background: C.bgCard, border: "1px solid " + C.border, borderRadius: 10, overflow: "hidden" as const, boxShadow: C.shadow }}>
          {/* Column header */}
          {!isMobile && (
            <div style={{ display: "grid", gridTemplateColumns: colHdrCols, gap: 8, padding: "8px 16px", borderBottom: "1px solid " + C.borderFaint, background: "rgba(248,249,252,0.8)" }}>
              {["", "Asset", "Value", "P&L", "24H", "Cost Basis", "P&L %", ""].map((h, i) => (
                <span key={i} style={{ fontFamily: FONT, fontSize: "9px", color: C.textFaint, textAlign: i > 1 ? "right" as const : "left" as const, letterSpacing: "0.08em", textTransform: "uppercase" as const }}>{h}</span>
              ))}
            </div>
          )}
          <AnimatePresence>
            {holdings.map(h => (
              <HoldingRow
                key={h.id}
                holding={h}
                price={priceMap[h.symbol]?.price ?? 0}
                change24h={priceMap[h.symbol]?.change ?? 0}
                onRemove={removeHolding}
                isMobile={isMobile}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Allocation tab */}
      {tab === "Allocation" && holdings.length > 0 && (
        <div style={{ background: C.bgCard, border: "1px solid " + C.border, borderRadius: 10, padding: "24px", boxShadow: C.shadow }}>
          {allocationSlices.length > 0
            ? <AllocationPie slices={allocationSlices} />
            : <div style={{ fontFamily: FONT, fontSize: "12px", color: C.textMuted, textAlign: "center" as const, padding: "40px 0" }}>No price data available.</div>
          }
        </div>
      )}

      {/* Performance tab */}
      {tab === "Performance" && holdings.length > 0 && (
        <div style={{ background: C.bgCard, border: "1px solid " + C.border, borderRadius: 10, padding: "24px", boxShadow: C.shadow }}>
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 0 }}>
            {holdings.map(h => {
              const pm   = priceMap[h.symbol];
              const val  = pm ? h.qty * pm.price : 0;
              const cost = h.qty * h.avgBuy;
              const pnl  = val - cost;
              const pp   = cost > 0 ? (pnl / cost) * 100 : 0;
              const isP  = pnl >= 0;
              return (
                <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 0", borderBottom: "1px solid " + C.borderFaint }}>
                  <span style={{ fontFamily: FONT, fontSize: "12px", fontWeight: 700, color: C.textPrimary, width: 60, flexShrink: 0 }}>{h.symbol}</span>
                  <div style={{ flex: 1, height: 6, borderRadius: 3, background: C.border, position: "relative" as const, overflow: "hidden" as const }}>
                    <motion.div
                      style={{ position: "absolute" as const, top: 0, left: 0, height: "100%", background: isP ? C.positive : C.negative, borderRadius: 3 }}
                      initial={{ width: 0 }}
                      animate={{ width: Math.min(Math.abs(pp), 100) + "%" }}
                      transition={{ duration: 0.7, ease: "easeOut" }}
                    />
                  </div>
                  <span style={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: isP ? C.positive : C.negative, minWidth: 70, textAlign: "right" as const, fontVariantNumeric: "tabular-nums" }}>
                    {isP ? "+" : ""}{pp.toFixed(2)}%
                  </span>
                  <span style={{ fontFamily: FONT, fontSize: "11px", color: C.textMuted, minWidth: 80, textAlign: "right" as const, fontVariantNumeric: "tabular-nums" }}>
                    {isP ? "+" : ""}{fmtUsd(pnl)}
                  </span>
                  {pm && <Sparkline values={pm.sparkline} positive={isP} />}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Add modal */}
      <AnimatePresence>
        {showAdd && (
          <AddModal
            onAdd={addHolding}
            onClose={() => setShowAdd(false)}
            existingSymbols={holdings.map(h => h.symbol)}
          />
        )}
      </AnimatePresence>
    </div>
  );
});
Portfolio.displayName = "Portfolio";
export default Portfolio;
