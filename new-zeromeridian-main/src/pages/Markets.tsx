/**
 * Markets.tsx — ZERØ MERIDIAN 2026 push133
 * push133: Light professional reskin (Bloomberg mode push132)
 * - Object.freeze() all static objects ✓  rgba() only ✓  Zero className ✓
 * - JetBrains Mono only ✓  React.memo + displayName ✓
 * - useMemo + useCallback ✓  mountedRef ✓  VirtualList ✓
 */

import { memo, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useCrypto } from '@/contexts/CryptoContext';
import { useMarketWorker } from '@/hooks/useMarketWorker';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import VirtualList from '@/components/shared/VirtualList';
import SparklineChart from '@/components/shared/SparklineChart';
import { formatPrice, formatCompact } from '@/lib/formatters';
import type { CryptoAsset } from '@/lib/formatters';

type SK = 'rank'|'name'|'price'|'change24h'|'change7d'|'marketCap'|'volume24h';
type SD = 'asc'|'desc';
const ROW_H  = 52;
const ROW_HM = 58;
const FONT   = "'JetBrains Mono', monospace";

const C = Object.freeze({
  bgBase:       "rgba(248,249,252,1)",
  bgCard:       "rgba(255,255,255,1)",
  bgHdr:        "rgba(248,249,252,1)",
  bgRow:        "rgba(255,255,255,1)",
  bgRowAlt:     "rgba(250,251,254,1)",
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

// ─── ChangeBadge ──────────────────────────────────────────────────────────────

const ChangeBadge = memo(({ val, size = 11 }: { val: number; size?: number }) => {
  const pos = val >= 0;
  return (
    <span style={{
      fontFamily: FONT, fontSize: size + "px", fontWeight: 600,
      color:      pos ? C.positive : C.negative,
      background: pos ? C.positiveDim : C.negativeDim,
      border:     "1px solid " + (pos ? "rgba(0,155,95,0.22)" : "rgba(208,35,75,0.22)"),
      borderRadius: 4, padding: "2px 6px", whiteSpace: "nowrap" as const,
      fontVariantNumeric: "tabular-nums",
    }}>
      {(pos ? "+" : "") + val.toFixed(2) + "%"}
    </span>
  );
});
ChangeBadge.displayName = "ChangeBadge";

// ─── SortHdr ──────────────────────────────────────────────────────────────────

const SortHdr = memo(({ label, k, sortKey, sortDir, onSort, align = "right", width }: {
  label: string; k: SK; sortKey: SK; sortDir: SD;
  onSort: (k: SK) => void; align?: string; width?: number;
}) => {
  const active = sortKey === k;
  return (
    <button
      type="button"
      onClick={() => onSort(k)}
      style={{
        fontFamily: FONT, fontSize: "9px", letterSpacing: "0.10em",
        color:      active ? C.accent : C.textFaint,
        textAlign:  align as "right" | "left" | "center",
        cursor: "pointer", background: "none", border: "none", padding: 0,
        display: "flex", alignItems: "center", gap: 3,
        justifyContent: align === "right" ? "flex-end" : "flex-start",
        width: width ? width + "px" : undefined, flexShrink: 0,
        transition: "color 0.15s", fontWeight: active ? 700 : 500,
      }}
    >
      {label.toUpperCase()}
      <span style={{ opacity: active ? 1 : 0.35 }}>{active ? (sortDir === "asc" ? "↑" : "↓") : "↕"}</span>
    </button>
  );
});
SortHdr.displayName = "SortHdr";

// ─── AssetRow ─────────────────────────────────────────────────────────────────

const AssetRow = memo(({ asset, index, isMobile }: { asset: CryptoAsset; index: number; isMobile: boolean }) => {
  const ref  = useRef<HTMLDivElement>(null);
  const prev = useRef(asset.price);
  const m    = useRef(true);

  useEffect(() => { m.current = true; return () => { m.current = false; }; }, []);

  useEffect(() => {
    if (!m.current || !ref.current || asset.price === prev.current) return;
    const cls = asset.priceDirection === "up" ? "animate-flash-pos" : asset.priceDirection === "down" ? "animate-flash-neg" : "";
    if (!cls) { prev.current = asset.price; return; }
    ref.current.classList.remove("animate-flash-pos", "animate-flash-neg");
    void ref.current.offsetWidth;
    ref.current.classList.add(cls);
    prev.current = asset.price;
    const t = setTimeout(() => { if (m.current) ref.current?.classList.remove(cls); }, 300);
    return () => clearTimeout(t);
  }, [asset.price, asset.priceDirection]);

  const bg = index % 2 === 0 ? C.bgRow : C.bgRowAlt;
  const h  = isMobile ? ROW_HM : ROW_H;

  const avatarFallback = useMemo(() => ({
    width: isMobile ? 22 : 28, height: isMobile ? 22 : 28,
    borderRadius: "50%", flexShrink: 0,
    background: C.accentDim, border: "1px solid " + C.accentBorder,
    display: "flex", alignItems: "center", justifyContent: "center",
  }), [isMobile]);

  if (isMobile) {
    return (
      <div ref={ref} style={{
        height: h, background: bg, borderBottom: "1px solid " + C.borderFaint,
        display: "grid", gridTemplateColumns: "24px 1fr 88px 68px",
        alignItems: "center", padding: "0 12px", gap: "8px",
        willChange: "transform", transition: "background 0.12s",
      }}
        onMouseEnter={e => { e.currentTarget.style.background = C.bgRowHov; }}
        onMouseLeave={e => { e.currentTarget.style.background = bg; }}>
        <span style={{ fontFamily: FONT, fontSize: "10px", color: C.textFaint, textAlign: "right" as const }}>{asset.rank}</span>
        <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
          {asset.image
            ? <img src={asset.image} alt="" style={{ width: 22, height: 22, borderRadius: "50%", flexShrink: 0 }} />
            : <div style={avatarFallback} />}
          <div style={{ minWidth: 0 }}>
            <div style={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: C.textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{asset.symbol.toUpperCase()}</div>
            <div style={{ fontFamily: FONT, fontSize: "9px", color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{asset.name}</div>
          </div>
        </div>
        <span style={{ fontFamily: FONT, fontSize: "11px", textAlign: "right" as const, color: C.textPrimary, fontVariantNumeric: "tabular-nums" }}>{formatPrice(asset.price)}</span>
        <div style={{ display: "flex", justifyContent: "flex-end" }}><ChangeBadge val={asset.change24h} size={10} /></div>
      </div>
    );
  }

  return (
    <div ref={ref} style={{
      height: h, background: bg, borderBottom: "1px solid " + C.borderFaint,
      display: "flex", alignItems: "center", padding: "0 16px", gap: 0,
      transition: "background 0.12s", willChange: "transform", cursor: "pointer",
    }}
      onMouseEnter={e => { e.currentTarget.style.background = C.bgRowHov; }}
      onMouseLeave={e => { e.currentTarget.style.background = bg; }}>
      {/* Rank */}
      <span style={{ fontFamily: FONT, fontSize: "11px", width: 36, flexShrink: 0, textAlign: "right" as const, color: C.textFaint, paddingRight: 12, fontVariantNumeric: "tabular-nums" }}>{asset.rank}</span>
      {/* Asset */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, width: 180, flexShrink: 0 }}>
        {asset.image
          ? <img src={asset.image} alt="" style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0 }} />
          : <div style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0, background: C.accentDim, border: "1px solid " + C.accentBorder }} />}
        <div>
          <div style={{ fontFamily: FONT, fontSize: "12px", fontWeight: 700, color: C.textPrimary }}>{asset.symbol.toUpperCase()}</div>
          <div style={{ fontFamily: FONT, fontSize: "9px", color: C.textMuted }}>{asset.name}</div>
        </div>
      </div>
      {/* Price */}
      <span style={{ fontFamily: FONT, fontSize: "12px", fontWeight: 600, marginLeft: "auto", color: C.textPrimary, minWidth: 110, textAlign: "right" as const, fontVariantNumeric: "tabular-nums" }}>{formatPrice(asset.price)}</span>
      {/* 24h */}
      <div style={{ minWidth: 90, display: "flex", justifyContent: "flex-end", paddingRight: 12 }}><ChangeBadge val={asset.change24h} /></div>
      {/* 7d */}
      <div style={{ minWidth: 80, display: "flex", justifyContent: "flex-end", paddingRight: 12 }}><ChangeBadge val={asset.change7d ?? 0} size={10} /></div>
      {/* Market Cap */}
      <span style={{ fontFamily: FONT, fontSize: "11px", minWidth: 100, textAlign: "right" as const, color: C.textMuted, paddingRight: 12, fontVariantNumeric: "tabular-nums" }}>{formatCompact(asset.marketCap)}</span>
      {/* Volume */}
      <span style={{ fontFamily: FONT, fontSize: "11px", minWidth: 90, textAlign: "right" as const, color: C.textFaint, paddingRight: 12, fontVariantNumeric: "tabular-nums" }}>{formatCompact(asset.volume24h)}</span>
      {/* Sparkline */}
      <div style={{ width: 80, flexShrink: 0 }}>
        {asset.sparkline && asset.sparkline.length > 0 && (
          <SparklineChart data={asset.sparkline} positive={(asset.change7d ?? 0) >= 0} width={80} height={32} />
        )}
      </div>
    </div>
  );
});
AssetRow.displayName = "AssetRow";

// ─── Markets ──────────────────────────────────────────────────────────────────

const Markets = memo(() => {
  const { assets }  = useCrypto();
  const { isMobile } = useBreakpoint();
  const [sortKey, setSortKey] = useState<SK>("rank");
  const [sortDir, setSortDir] = useState<SD>("asc");
  const [search, setSearch]   = useState("");
  const m = useRef(true);
  useEffect(() => { m.current = true; return () => { m.current = false; }; }, []);

  const [sorted, setSorted] = useState<CryptoAsset[]>([]);
  const marketWorker = useMarketWorker();

  useEffect(() => {
    let cancelled = false;
    marketWorker.sortAndFilter(assets, sortKey, sortDir, search)
      .then(result => { if (!cancelled && m.current) setSorted(result.assets); })
      .catch(() => {
        if (cancelled || !m.current) return;
        const q = search.toLowerCase();
        let filtered = q ? assets.filter(a => a.name.toLowerCase().includes(q) || a.symbol.toLowerCase().includes(q)) : [...assets];
        filtered.sort((a, b) => {
          const av = (a as Record<string, unknown>)[sortKey] ?? 0;
          const bv = (b as Record<string, unknown>)[sortKey] ?? 0;
          const cmp = typeof av === "string" ? (av as string).localeCompare(bv as string) : (av as number) - (bv as number);
          return sortDir === "asc" ? cmp : -cmp;
        });
        setSorted(filtered);
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets, sortKey, sortDir, search]);

  const handleSort = useCallback((k: SK) => {
    if (!m.current) return;
    setSortDir(d => sortKey === k ? (d === "asc" ? "desc" : "asc") : "desc");
    setSortKey(k);
  }, [sortKey]);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!m.current) return;
    setSearch(e.target.value);
  }, []);

  const rowHeight  = isMobile ? ROW_HM : ROW_H;
  const renderRow  = useCallback((asset: CryptoAsset, index: number) => (
    <AssetRow key={asset.id} asset={asset} index={index} isMobile={isMobile} />
  ), [isMobile]);

  const containerSt = useMemo(() => Object.freeze({
    background: C.bgCard, borderRadius: 10,
    border: "1px solid " + C.border, overflow: "hidden" as const,
    boxShadow: C.shadow,
  }), []);

  const colHdrSt = useMemo(() => Object.freeze({
    display: isMobile ? "none" : "flex",
    alignItems: "center", padding: "8px 16px",
    borderBottom: "1px solid " + C.borderFaint,
    background: C.bgHdr,
    position: "sticky" as const, top: 0, zIndex: 2,
  }), [isMobile]);

  const pageSt = useMemo(() => Object.freeze({
    background: C.bgBase, minHeight: "100vh",
    padding: isMobile ? "12px" : "16px 20px",
  }), [isMobile]);

  return (
    <div style={pageSt}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16, flexWrap: "wrap" as const, gap: 10 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 3, height: 20, borderRadius: 2, background: C.accent }} />
            <h1 style={{ fontFamily: FONT, fontSize: 20, fontWeight: 800, color: C.textPrimary, margin: 0, letterSpacing: "-0.01em" }}>Markets</h1>
          </div>
          <p style={{ fontFamily: FONT, fontSize: "9px", color: C.textFaint, margin: "4px 0 0 13px", letterSpacing: "0.08em" }}>
            {sorted.length} assets · LIVE
          </p>
        </div>
        {/* Search */}
        <div style={{ position: "relative" as const }}>
          <input
            type="text"
            placeholder="Search assets…"
            value={search}
            onChange={handleSearch}
            style={{
              fontFamily: FONT, fontSize: "11px",
              background: C.bgCard, border: "1px solid " + C.border,
              borderRadius: 8, padding: "8px 12px 8px 30px",
              color: C.textPrimary, outline: "none",
              width: isMobile ? "160px" : "220px",
              boxShadow: "0 1px 3px rgba(15,40,100,0.05)",
            }}
            aria-label="Search assets"
          />
          <span style={{ position: "absolute" as const, left: "10px", top: "50%", transform: "translateY(-50%)", fontSize: "12px", color: C.textMuted }}>⌕</span>
        </div>
      </div>

      <div style={containerSt}>
        {/* Column headers */}
        {!isMobile && (
          <div style={colHdrSt}>
            <SortHdr label="#" k="rank" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" width={36} />
            <SortHdr label="Asset" k="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" width={180} />
            <SortHdr label="Price" k="price" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} width={110} />
            <SortHdr label="24h" k="change24h" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} width={90} />
            <SortHdr label="7d" k="change7d" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} width={80} />
            <SortHdr label="Mkt Cap" k="marketCap" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} width={100} />
            <SortHdr label="Volume" k="volume24h" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} width={90} />
            <span style={{ width: 80, flexShrink: 0, fontFamily: FONT, fontSize: "9px", color: C.textFaint, textAlign: "center" as const, letterSpacing: "0.08em" }}>7D CHART</span>
          </div>
        )}

        {/* Rows */}
        {sorted.length === 0 && assets.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column" as const }}>
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} style={{
                height: isMobile ? 58 : 52, borderBottom: "1px solid " + C.borderFaint,
                display: "flex", alignItems: "center", padding: "0 12px", gap: 12,
                overflow: "hidden", position: "relative" as const,
                background: i % 2 === 0 ? C.bgRow : C.bgRowAlt,
              }}>
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.border, flexShrink: 0 }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column" as const, gap: 6 }}>
                  <div style={{ width: "40%", height: 9, borderRadius: 3, background: C.border }} />
                  <div style={{ width: "25%", height: 8, borderRadius: 3, background: "rgba(15,40,100,0.06)" }} />
                </div>
                <div style={{ width: 80, height: 13, borderRadius: 3, background: C.border, flexShrink: 0 }} />
                <motion.div
                  animate={{ x: ["-100%", "200%"] }}
                  transition={{ duration: 1.4 + i * 0.07, repeat: Infinity, ease: "linear" }}
                  style={{ position: "absolute" as const, inset: 0, background: "linear-gradient(90deg,transparent,rgba(15,40,180,0.04),transparent)", willChange: "transform" }}
                />
              </div>
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ padding: "40px", textAlign: "center" as const, fontFamily: FONT, fontSize: "11px", color: C.textMuted }}>
            {'No results for "' + search + '"'}
          </div>
        ) : (
          <VirtualList
            items={sorted}
            itemHeight={rowHeight}
            height={Math.min(sorted.length * rowHeight, window.innerHeight - 200)}
            renderItem={renderRow}
            getKey={(item: CryptoAsset) => item.id}
          />
        )}
      </div>
    </div>
  );
});
Markets.displayName = "Markets";
export default Markets;
