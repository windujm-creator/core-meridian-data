/**
 * Portfolio.tsx — ZERØ MERIDIAN 2026 push86
 * push86: MANUAL ENTRY portfolio tracker — no wallet connect required.
 * Persistent via localStorage. PnL, allocation, 24h change, totals.
 * - React.memo + displayName ✓
 * - rgba() only ✓  Zero className ✓  Zero template literals in JSX ✓
 * - useCallback + useMemo ✓  mountedRef ✓  Object.freeze ✓
 */

import React, { memo, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCrypto } from '@/contexts/CryptoContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';

const C = Object.freeze({
  bg:          'rgba(6,8,14,1)',
  card:        'rgba(14,17,28,1)',
  cardHover:   'rgba(18,22,36,1)',
  border:      'rgba(32,42,68,1)',
  accent:      'rgba(0,238,255,1)',
  accentDim:   'rgba(0,238,255,0.1)',
  positive:    'rgba(34,255,170,1)',
  posDim:      'rgba(34,255,170,0.08)',
  negative:    'rgba(255,68,136,1)',
  negDim:      'rgba(255,68,136,0.08)',
  textPrimary: 'rgba(240,240,248,1)',
  textSec:     'rgba(138,138,158,1)',
  violet:      'rgba(176,130,255,1)',
  violetDim:   'rgba(176,130,255,0.1)',
  input:       'rgba(22,28,48,1)',
  inputBorder: 'rgba(48,62,100,1)',
});

const FONT_MONO = "'JetBrains Mono', monospace";
const FONT_UI   = "'JetBrains Mono', monospace";

const LS_KEY = 'zm_portfolio_v1';

const TABS = Object.freeze(['Holdings', 'Allocation', 'Performance'] as const);
type Tab = typeof TABS[number];

export interface Holding {
  id: string;
  symbol: string;
  name: string;
  qty: number;
  avgBuy: number;   // average buy price USD
  addedAt: number;
}

function loadHoldings(): Holding[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Holding[];
  } catch { return []; }
}

function saveHoldings(h: Holding[]): void {
  try { localStorage.setItem(LS_KEY, JSON.stringify(h)); } catch {}
}

function fmtUsd(n: number, decimals = 2): string {
  if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
  if (n >= 1e6) return '$' + (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return '$' + n.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return '$' + n.toFixed(decimals);
}

function pct(a: number, b: number): string {
  if (b === 0) return '—';
  return ((a / b - 1) * 100).toFixed(2) + '%';
}

// ─── Color wheel for allocation ───────────────────────────────────────────────
const ALLOC_COLORS = Object.freeze([
  'rgba(0,238,255,1)',
  'rgba(34,255,170,1)',
  'rgba(176,130,255,1)',
  'rgba(255,170,0,1)',
  'rgba(255,68,136,1)',
  'rgba(80,160,255,1)',
  'rgba(255,220,50,1)',
  'rgba(255,100,200,1)',
]);

// ─── Inline sparkline SVG ─────────────────────────────────────────────────────
const Sparkline = memo(({ values, positive }: { values: number[]; positive: boolean }) => {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;
  const W = 60, H = 24;
  const pts = values.map((v, i) => {
    const x = (i / (values.length - 1)) * W;
    const y = H - ((v - min) / range) * H;
    return x + ',' + y;
  }).join(' ');
  const col = positive ? 'rgba(34,255,170,1)' : 'rgba(255,68,136,1)';
  return (
    <svg width={W} height={H} style={{ display: 'block' }}>
      <polyline points={pts} fill="none" stroke={col} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
    </svg>
  );
});
Sparkline.displayName = 'Sparkline';

// ─── Add Holding Modal ────────────────────────────────────────────────────────
const AddModal = memo(({ onAdd, onClose, existingSymbols }: {
  onAdd: (h: Omit<Holding, 'id' | 'addedAt'>) => void;
  onClose: () => void;
  existingSymbols: string[];
}) => {
  const [symbol, setSymbol] = useState('');
  const [name, setName]     = useState('');
  const [qty, setQty]       = useState('');
  const [avgBuy, setAvgBuy] = useState('');
  const [err, setErr]       = useState('');

  const handleSymbolChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSymbol(e.target.value.toUpperCase());
  }, []);
  const handleNameChange   = useCallback((e: React.ChangeEvent<HTMLInputElement>) => { setName(e.target.value); }, []);
  const handleQtyChange    = useCallback((e: React.ChangeEvent<HTMLInputElement>) => { setQty(e.target.value); }, []);
  const handleAvgChange    = useCallback((e: React.ChangeEvent<HTMLInputElement>) => { setAvgBuy(e.target.value); }, []);

  const handleSubmit = useCallback(() => {
    const sym = symbol.trim().toUpperCase();
    const nm  = name.trim() || sym;
    const q   = parseFloat(qty);
    const avg = parseFloat(avgBuy);
    if (!sym)          { setErr('Symbol required'); return; }
    if (isNaN(q) || q <= 0) { setErr('Invalid quantity'); return; }
    if (isNaN(avg) || avg <= 0) { setErr('Invalid buy price'); return; }
    if (existingSymbols.includes(sym)) { setErr(sym + ' already in portfolio'); return; }
    onAdd({ symbol: sym, name: nm, qty: q, avgBuy: avg });
  }, [symbol, name, qty, avgBuy, onAdd, existingSymbols]);

  const overlayStyle = useMemo(() => Object.freeze({
    position: 'fixed' as const, inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '20px',
  }), []);

  const modalStyle = useMemo(() => Object.freeze({
    background: 'rgba(16,20,34,1)', border: '1px solid rgba(0,238,255,0.2)', borderRadius: '18px',
    padding: '28px', width: '100%', maxWidth: '420px',
    boxShadow: '0 0 60px rgba(0,238,255,0.08)',
  }), []);

  const inputSt = useMemo(() => Object.freeze({
    width: '100%', background: C.input, border: '1px solid ' + C.inputBorder,
    borderRadius: '12px', padding: '10px 14px',
    fontFamily: FONT_MONO, fontSize: '13px', color: C.textPrimary,
    outline: 'none', boxSizing: 'border-box' as const,
  }), []);

  const labelSt = useMemo(() => Object.freeze({
    fontFamily: FONT_MONO, fontSize: '10px', color: C.textSec,
    letterSpacing: '0.1em', textTransform: 'uppercase' as const,
  }), []);

  return (
    <motion.div style={overlayStyle} onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <motion.div style={modalStyle} onClick={(e) => e.stopPropagation()} initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
          <h2 style={{ fontFamily: FONT_MONO, fontSize: '16px', fontWeight: 700, color: C.textPrimary, margin: 0 }}>ADD HOLDING</h2>
          <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', width: '30px', height: '30px', cursor: 'pointer', color: C.textSec, fontSize: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '14px' }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, gap: '6px' }}>
              <label style={labelSt}>Symbol *</label>
              <input style={inputSt} value={symbol} onChange={handleSymbolChange} placeholder="BTC" maxLength={10} />
            </div>
            <div style={{ flex: 2, display: 'flex', flexDirection: 'column' as const, gap: '6px' }}>
              <label style={labelSt}>Name</label>
              <input style={inputSt} value={name} onChange={handleNameChange} placeholder="Bitcoin" />
            </div>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, gap: '6px' }}>
              <label style={labelSt}>Quantity *</label>
              <input style={inputSt} type="number" value={qty} onChange={handleQtyChange} placeholder="0.5" min="0" step="any" />
            </div>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column' as const, gap: '6px' }}>
              <label style={labelSt}>Avg Buy $ *</label>
              <input style={inputSt} type="number" value={avgBuy} onChange={handleAvgChange} placeholder="45000" min="0" step="any" />
            </div>
          </div>
          {err && <p style={{ fontFamily: FONT_MONO, fontSize: '11px', color: C.negative, margin: 0 }}>⚠ {err}</p>}
          <button
            onClick={handleSubmit}
            style={{ width: '100%', padding: '12px', background: 'rgba(0,238,255,0.12)', border: '1px solid rgba(0,238,255,0.3)', borderRadius: '8px', color: C.accent, fontFamily: FONT_MONO, fontSize: '13px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em', marginTop: '4px' }}
          >
            + ADD TO PORTFOLIO
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
});
AddModal.displayName = 'AddModal';

// ─── Holdings tab ─────────────────────────────────────────────────────────────
const HoldingRow = memo(({ holding, price, change24h, onRemove, isMobile }: {
  holding: Holding;
  price: number;
  change24h: number;
  onRemove: (id: string) => void;
  isMobile: boolean;
}) => {
  const value    = holding.qty * price;
  const cost     = holding.qty * holding.avgBuy;
  const pnl      = value - cost;
  const pnlPct   = cost > 0 ? (pnl / cost) * 100 : 0;
  const isPos    = pnl >= 0;
  const pnlColor = isPos ? C.positive : C.negative;
  const chColor  = change24h >= 0 ? C.positive : C.negative;
  const daily    = value * (change24h / 100);

  const handleRemove = useCallback(() => onRemove(holding.id), [holding.id, onRemove]);

  const cols = isMobile ? '1fr 70px 70px' : '40px 1fr 90px 90px 90px 90px 90px 36px';

  return (
    <motion.div
      style={{ display: 'grid', gridTemplateColumns: cols, alignItems: 'center', gap: '10px', padding: '13px 16px', borderBottom: '1px solid rgba(255,255,255,0.04)' }}
      initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      layout
    >
      {!isMobile && (
        <img
          src={'https://assets.coingecko.com/coins/images/1/thumb/' + holding.symbol.toLowerCase() + '.png'}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          width={28} height={28}
          style={{ borderRadius: '50%', objectFit: 'cover' }}
          alt={holding.symbol}
        />
      )}
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '2px' }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: '13px', fontWeight: 700, color: C.textPrimary }}>{holding.symbol}</span>
        <span style={{ fontFamily: FONT_UI, fontSize: '11px', color: C.textSec }}>{holding.qty.toLocaleString('en-US', { maximumSignificantDigits: 6 })} units</span>
      </div>
      <div style={{ textAlign: 'right' as const }}>
        <div style={{ fontFamily: FONT_MONO, fontSize: '13px', color: C.textPrimary }}>{price > 0 ? fmtUsd(value) : '—'}</div>
        {!isMobile && <div style={{ fontFamily: FONT_MONO, fontSize: '10px', color: C.textSec }}>${price > 0 ? price.toLocaleString('en-US', { maximumFractionDigits: 2 }) : '—'}</div>}
      </div>
      {!isMobile && (
        <div style={{ textAlign: 'right' as const }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: '12px', color: pnlColor, fontWeight: 700 }}>{isPos ? '+' : ''}{fmtUsd(pnl)}</div>
          <div style={{ fontFamily: FONT_MONO, fontSize: '10px', color: pnlColor }}>{isPos ? '+' : ''}{pnlPct.toFixed(2)}%</div>
        </div>
      )}
      {!isMobile && (
        <div style={{ textAlign: 'right' as const }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: '12px', color: chColor }}>{change24h >= 0 ? '+' : ''}{change24h.toFixed(2)}%</div>
          <div style={{ fontFamily: FONT_MONO, fontSize: '10px', color: chColor }}>{daily >= 0 ? '+' : ''}{fmtUsd(daily)}</div>
        </div>
      )}
      {!isMobile && (
        <div style={{ textAlign: 'right' as const }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: '12px', color: C.textSec }}>{fmtUsd(cost)}</div>
          <div style={{ fontFamily: FONT_MONO, fontSize: '10px', color: C.textSec }}>${holding.avgBuy.toLocaleString('en-US', { maximumFractionDigits: 2 })}</div>
        </div>
      )}
      <div style={{ textAlign: 'right' as const }}>
        <div style={{ fontFamily: FONT_MONO, fontSize: '12px', color: pnlColor, fontWeight: 700 }}>{isPos ? '+' : ''}{pnlPct.toFixed(2)}%</div>
      </div>
      {!isMobile && (
        <button onClick={handleRemove} style={{ width: '28px', height: '28px', borderRadius: '6px', border: '1px solid rgba(255,68,136,0.2)', background: 'rgba(255,68,136,0.06)', color: 'rgba(255,68,136,0.6)', cursor: 'pointer', fontSize: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>×</button>
      )}
    </motion.div>
  );
});
HoldingRow.displayName = 'HoldingRow';

// ─── Allocation pie (pure SVG) ────────────────────────────────────────────────
const AllocationPie = memo(({ slices }: { slices: { label: string; value: number; color: string; pct: number }[] }) => {
  const SIZE = 200, R = 80, cx = 100, cy = 100;
  let cumAngle = -Math.PI / 2;

  const paths = slices.map((s, i) => {
    const angle = (s.pct / 100) * 2 * Math.PI;
    const startAngle = cumAngle;
    cumAngle += angle;
    const endAngle = cumAngle;
    const x1 = cx + R * Math.cos(startAngle);
    const y1 = cy + R * Math.sin(startAngle);
    const x2 = cx + R * Math.cos(endAngle);
    const y2 = cy + R * Math.sin(endAngle);
    const large = angle > Math.PI ? 1 : 0;
    return { d: 'M ' + cx + ' ' + cy + ' L ' + x1 + ' ' + y1 + ' A ' + R + ' ' + R + ' 0 ' + large + ' 1 ' + x2 + ' ' + y2 + ' Z', color: s.color, label: s.label, pct: s.pct };
  });

  return (
    <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: '24px', alignItems: 'center' }}>
      <svg width={SIZE} height={SIZE} style={{ flexShrink: 0 }}>
        {paths.map((p, i) => (
          <motion.path key={p.label} d={p.d} fill={p.color} stroke="rgba(6,8,14,1)" strokeWidth="2"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.08 }} />
        ))}
        <circle cx={cx} cy={cy} r="44" fill="rgba(6,8,14,1)" />
        <text x={cx} y={cy - 6} textAnchor="middle" fill="rgba(240,240,248,1)" fontSize="14" fontFamily={FONT_MONO} fontWeight="700">
          Portfolio
        </text>
        <text x={cx} y={cy + 14} textAnchor="middle" fill="rgba(138,138,158,1)" fontSize="10" fontFamily={FONT_MONO}>
          Allocation
        </text>
      </svg>
      <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '8px', flex: 1, minWidth: '160px' }}>
        {slices.map((s, i) => (
          <div key={s.label} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '10px', height: '10px', borderRadius: '2px', background: s.color, flexShrink: 0 }} />
            <span style={{ fontFamily: FONT_MONO, fontSize: '12px', color: C.textPrimary, flex: 1 }}>{s.label}</span>
            <span style={{ fontFamily: FONT_MONO, fontSize: '12px', color: s.color, fontWeight: 700 }}>{s.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
});
AllocationPie.displayName = 'AllocationPie';

// ─── Empty state ──────────────────────────────────────────────────────────────
const EmptyState = memo(({ onAdd }: { onAdd: () => void }) => (
  <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', gap: '16px', padding: '60px 20px', textAlign: 'center' as const }}>
    <div style={{ fontSize: '48px', lineHeight: '1' }}>💼</div>
    <div>
      <p style={{ fontFamily: FONT_UI, fontSize: '18px', fontWeight: 700, color: C.textPrimary, margin: '0 0 8px' }}>No holdings yet</p>
      <p style={{ fontFamily: FONT_UI, fontSize: '14px', color: C.textSec, margin: 0 }}>Add your first asset to start tracking your portfolio performance.</p>
    </div>
    <button onClick={onAdd} style={{ padding: '12px 28px', background: 'rgba(0,238,255,0.12)', border: '1px solid rgba(0,238,255,0.3)', borderRadius: '12px', color: C.accent, fontFamily: FONT_MONO, fontSize: '13px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.06em' }}>
      + ADD FIRST HOLDING
    </button>
  </motion.div>
));
EmptyState.displayName = 'EmptyState';

// ─── Main page ────────────────────────────────────────────────────────────────
const Portfolio: React.FC = () => {
  const { assets } = useCrypto();
  const { isMobile } = useBreakpoint();
  const [holdings, setHoldings] = useState<Holding[]>(() => loadHoldings());
  const [showAdd, setShowAdd]   = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('Holdings');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => {
    saveHoldings(holdings);
  }, [holdings]);

  // Build price map from context
  const priceMap = useMemo(() => {
    const m: Record<string, { price: number; change24h: number }> = {};
    for (const a of assets) {
      m[a.symbol.toUpperCase()] = { price: a.current_price, change24h: a.price_change_percentage_24h ?? 0 };
    }
    return m;
  }, [assets]);

  const enriched = useMemo(() => holdings.map(h => {
    const info = priceMap[h.symbol] ?? { price: 0, change24h: 0 };
    const value = h.qty * info.price;
    const cost  = h.qty * h.avgBuy;
    const pnl   = value - cost;
    return { ...h, price: info.price, change24h: info.change24h, value, cost, pnl, pnlPct: cost > 0 ? (pnl / cost) * 100 : 0 };
  }).sort((a, b) => b.value - a.value), [holdings, priceMap]);

  const totals = useMemo(() => {
    const totalValue = enriched.reduce((s, h) => s + h.value, 0);
    const totalCost  = enriched.reduce((s, h) => s + h.cost, 0);
    const totalPnl   = totalValue - totalCost;
    const pnlPct     = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;
    const daily      = enriched.reduce((s, h) => s + h.value * (h.change24h / 100), 0);
    return { totalValue, totalCost, totalPnl, pnlPct, daily };
  }, [enriched]);

  const allocSlices = useMemo(() => {
    if (totals.totalValue === 0) return [];
    return enriched.slice(0, 8).map((h, i) => ({
      label: h.symbol,
      value: h.value,
      pct: totals.totalValue > 0 ? (h.value / totals.totalValue) * 100 : 0,
      color: ALLOC_COLORS[i % ALLOC_COLORS.length],
    }));
  }, [enriched, totals.totalValue]);

  const handleAdd = useCallback((h: Omit<Holding, 'id' | 'addedAt'>) => {
    if (!mountedRef.current) return;
    const newH: Holding = { ...h, id: crypto.randomUUID(), addedAt: Date.now() };
    setHoldings(prev => [...prev, newH]);
    setShowAdd(false);
  }, []);

  const handleRemove = useCallback((id: string) => {
    if (!mountedRef.current) return;
    setHoldings(prev => prev.filter(h => h.id !== id));
  }, []);

  const openAdd  = useCallback(() => setShowAdd(true),  []);
  const closeAdd = useCallback(() => setShowAdd(false), []);

  const existingSymbols = useMemo(() => holdings.map(h => h.symbol), [holdings]);

  const pageStyle = useMemo(() => Object.freeze({
    display: 'flex', flexDirection: 'column' as const, gap: '20px',
    padding: isMobile ? '16px' : '24px', minHeight: '100vh', background: C.bg,
  }), [isMobile]);

  const isPosTotal = totals.totalPnl >= 0;
  const isPosDaily = totals.daily >= 0;

  const summaryCards = useMemo(() => Object.freeze([
    { label: 'Total Value',    value: fmtUsd(totals.totalValue),    sub: '',                                               color: C.textPrimary },
    { label: 'Total PnL',      value: (isPosTotal ? '+' : '') + fmtUsd(totals.totalPnl), sub: (isPosTotal ? '+' : '') + totals.pnlPct.toFixed(2) + '%', color: isPosTotal ? C.positive : C.negative },
    { label: '24h Change',     value: (isPosDaily ? '+' : '') + fmtUsd(totals.daily),    sub: '',                          color: isPosDaily ? C.positive : C.negative },
    { label: 'Total Cost',     value: fmtUsd(totals.totalCost),     sub: holdings.length + ' holdings',                   color: C.textSec },
  ]), [totals, isPosTotal, isPosDaily, holdings.length]);

  const hdrCols = isMobile ? '1fr 70px 70px' : '40px 1fr 90px 90px 90px 90px 90px 36px';
  const hdrSt = useMemo(() => Object.freeze({ fontFamily: FONT_MONO, fontSize: '10px', color: C.textSec, letterSpacing: '0.08em', textTransform: 'uppercase' as const, textAlign: 'right' as const }), []);

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' as const, gap: '12px' }}>
        <div>
          <h1 style={{ fontFamily: FONT_MONO, fontSize: isMobile ? '18px' : '22px', fontWeight: 800, color: C.textPrimary, letterSpacing: '-0.02em', margin: '0 0 4px' }}>PORTFOLIO</h1>
          <p style={{ fontFamily: FONT_UI, fontSize: '13px', color: C.textSec, margin: 0 }}>Manual entry · Prices from live market feed</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          {holdings.length > 0 && (
            <button onClick={openAdd} style={{ padding: '9px 18px', background: 'rgba(0,238,255,0.12)', border: '1px solid rgba(0,238,255,0.3)', borderRadius: '8px', color: C.accent, fontFamily: FONT_MONO, fontSize: '12px', fontWeight: 700, cursor: 'pointer', letterSpacing: '0.05em' }}>
              + ADD
            </button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      {holdings.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px' }}>
          {summaryCards.map(card => (
            <motion.div key={card.label} style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: '12px', padding: '16px' }} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <div style={{ fontFamily: FONT_MONO, fontSize: '10px', color: C.textSec, letterSpacing: '0.1em', textTransform: 'uppercase' as const, marginBottom: '8px' }}>{card.label}</div>
              <div style={{ fontFamily: FONT_MONO, fontSize: '18px', fontWeight: 700, color: card.color }}>{card.value}</div>
              {card.sub && <div style={{ fontFamily: FONT_MONO, fontSize: '11px', color: card.color, opacity: 0.7, marginTop: '2px' }}>{card.sub}</div>}
            </motion.div>
          ))}
        </div>
      )}

      {/* Tab bar */}
      {holdings.length > 0 && (
        <div style={{ display: 'flex', gap: '4px', padding: '4px', background: 'rgba(255,255,255,0.04)', borderRadius: '12px', alignSelf: 'flex-start' as const }}>
          {TABS.map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{ padding: '8px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontFamily: FONT_MONO, fontSize: '12px', fontWeight: 600, background: activeTab === tab ? 'rgba(0,238,255,0.15)' : 'transparent', color: activeTab === tab ? C.accent : C.textSec, outline: activeTab === tab ? '1px solid rgba(0,238,255,0.3)' : 'none', transition: 'all 0.18s' }}>
              {tab}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {holdings.length === 0
        ? <EmptyState onAdd={openAdd} />
        : (
          <AnimatePresence mode="wait">
            <motion.div key={activeTab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.18 }}>
              {activeTab === 'Holdings' && (
                <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: '12px', overflow: 'hidden' as const }}>
                  <div style={{ display: 'grid', gridTemplateColumns: hdrCols, alignItems: 'center', gap: '10px', padding: '10px 16px', background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    {!isMobile && <div />}
                    <span style={{ ...hdrSt, textAlign: 'left' as const }}>Asset</span>
                    <span style={hdrSt}>Value</span>
                    {!isMobile && <span style={hdrSt}>PnL</span>}
                    {!isMobile && <span style={hdrSt}>24h</span>}
                    {!isMobile && <span style={hdrSt}>Cost</span>}
                    <span style={hdrSt}>PnL%</span>
                    {!isMobile && <div />}
                  </div>
                  <AnimatePresence>
                    {enriched.map(h => (
                      <HoldingRow key={h.id} holding={h} price={h.price} change24h={h.change24h} onRemove={handleRemove} isMobile={isMobile} />
                    ))}
                  </AnimatePresence>
                  {/* Footer total */}
                  <div style={{ display: 'grid', gridTemplateColumns: hdrCols, alignItems: 'center', gap: '10px', padding: '13px 16px', borderTop: '1px solid rgba(255,255,255,0.06)', background: 'rgba(255,255,255,0.02)' }}>
                    {!isMobile && <div />}
                    <span style={{ fontFamily: FONT_MONO, fontSize: '12px', fontWeight: 700, color: C.textSec }}>TOTAL</span>
                    <span style={{ fontFamily: FONT_MONO, fontSize: '13px', fontWeight: 700, color: C.textPrimary, textAlign: 'right' as const }}>{fmtUsd(totals.totalValue)}</span>
                    {!isMobile && <span style={{ fontFamily: FONT_MONO, fontSize: '12px', fontWeight: 700, color: isPosTotal ? C.positive : C.negative, textAlign: 'right' as const }}>{isPosTotal ? '+' : ''}{fmtUsd(totals.totalPnl)}</span>}
                    {!isMobile && <span style={{ fontFamily: FONT_MONO, fontSize: '12px', color: isPosDaily ? C.positive : C.negative, textAlign: 'right' as const }}>{isPosDaily ? '+' : ''}{fmtUsd(totals.daily)}</span>}
                    {!isMobile && <span style={{ fontFamily: FONT_MONO, fontSize: '12px', color: C.textSec, textAlign: 'right' as const }}>{fmtUsd(totals.totalCost)}</span>}
                    <span style={{ fontFamily: FONT_MONO, fontSize: '12px', fontWeight: 700, color: isPosTotal ? C.positive : C.negative, textAlign: 'right' as const }}>{isPosTotal ? '+' : ''}{totals.pnlPct.toFixed(2)}%</span>
                    {!isMobile && <div />}
                  </div>
                </div>
              )}

              {activeTab === 'Allocation' && (
                <div style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: '12px', padding: '24px' }}>
                  <div style={{ fontFamily: FONT_MONO, fontSize: '10px', color: C.textSec, letterSpacing: '0.12em', textTransform: 'uppercase' as const, marginBottom: '20px' }}>Allocation by Value</div>
                  {allocSlices.length > 0
                    ? <AllocationPie slices={allocSlices} />
                    : <div style={{ color: C.textSec, fontFamily: FONT_UI, fontSize: '13px' }}>No price data available yet.</div>
                  }
                </div>
              )}

              {activeTab === 'Performance' && (
                <div style={{ display: 'flex', flexDirection: 'column' as const, gap: '12px' }}>
                  {enriched.map((h, i) => {
                    const barW = totals.totalValue > 0 ? (h.value / totals.totalValue) * 100 : 0;
                    const col = ALLOC_COLORS[i % ALLOC_COLORS.length];
                    const isPosH = h.pnl >= 0;
                    return (
                      <div key={h.id} style={{ background: C.card, border: '1px solid ' + C.border, borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column' as const, gap: '10px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <div style={{ width: '10px', height: '10px', borderRadius: '50%', background: col, flexShrink: 0 }} />
                            <span style={{ fontFamily: FONT_MONO, fontSize: '14px', fontWeight: 700, color: C.textPrimary }}>{h.symbol}</span>
                            <span style={{ fontFamily: FONT_UI, fontSize: '12px', color: C.textSec }}>{h.name}</span>
                          </div>
                          <div style={{ display: 'flex', gap: '20px' }}>
                            <div style={{ textAlign: 'right' as const }}>
                              <div style={{ fontFamily: FONT_MONO, fontSize: '12px', color: C.textPrimary }}>{fmtUsd(h.value)}</div>
                              <div style={{ fontFamily: FONT_MONO, fontSize: '10px', color: C.textSec }}>{barW.toFixed(1)}% of portfolio</div>
                            </div>
                            <div style={{ textAlign: 'right' as const }}>
                              <div style={{ fontFamily: FONT_MONO, fontSize: '12px', fontWeight: 700, color: isPosH ? C.positive : C.negative }}>{isPosH ? '+' : ''}{h.pnlPct.toFixed(2)}%</div>
                              <div style={{ fontFamily: FONT_MONO, fontSize: '10px', color: isPosH ? C.positive : C.negative }}>{isPosH ? '+' : ''}{fmtUsd(h.pnl)}</div>
                            </div>
                          </div>
                        </div>
                        <div style={{ height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                          <motion.div style={{ height: '100%', background: col, borderRadius: '2px' }} initial={{ width: 0 }} animate={{ width: barW + '%' }} transition={{ duration: 0.7, delay: i * 0.04 }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        )
      }

      {/* Disclaimer */}
      {holdings.length > 0 && (
        <p style={{ fontFamily: FONT_UI, fontSize: '11px', color: 'rgba(138,138,158,0.5)', textAlign: 'center' as const, margin: 0, lineHeight: '1.6' }}>
          Portfolio data is stored locally in your browser. Prices are sourced from the live market feed.
        </p>
      )}

      {/* Add Modal */}
      <AnimatePresence>
        {showAdd && <AddModal onAdd={handleAdd} onClose={closeAdd} existingSymbols={existingSymbols} />}
      </AnimatePresence>
    </div>
  );
};

Portfolio.displayName = 'Portfolio';
export default React.memo(Portfolio);
