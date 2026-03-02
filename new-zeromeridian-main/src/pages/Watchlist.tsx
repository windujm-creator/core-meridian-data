/**
 * Watchlist.tsx — ZERØ MERIDIAN 2026 push133
 * push133: Light professional reskin (Bloomberg mode push132)
 * - Object.freeze() ✓  rgba() only ✓  Zero className ✓
 * - JetBrains Mono ✓  React.memo + displayName ✓
 */

import { memo, useReducer, useCallback, useMemo, useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useCrypto } from '@/contexts/CryptoContext';
import SparklineChart from '@/components/shared/SparklineChart';
import { formatPrice, formatCompact } from '@/lib/formatters';
import type { CryptoAsset } from '@/lib/formatters';
import { useBreakpoint } from '@/hooks/useBreakpoint';

const FONT   = "'JetBrains Mono', monospace";
const LS_KEY = "zm_watchlist_v1";
const MAX    = 50;

const C = Object.freeze({
  bgBase:       "rgba(248,249,252,1)",
  bgCard:       "rgba(255,255,255,1)",
  bgRowAlt:     "rgba(250,251,254,1)",
  bgRowHov:     "rgba(243,245,252,1)",
  bgModal:      "rgba(237,240,248,1)",
  bgInput:      "rgba(243,245,252,1)",
  accent:       "rgba(15,40,180,1)",
  accentDim:    "rgba(15,40,180,0.08)",
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
  inputBorder:  "rgba(15,40,100,0.15)",
  shadow:       "0 1px 4px rgba(15,40,100,0.07), 0 0 0 1px rgba(15,40,100,0.06)",
  overlay:      "rgba(8,12,40,0.40)",
});

interface WatchlistEntry { id: string; addedAt: number; note: string; }
interface WatchlistState { entries: WatchlistEntry[]; sortKey: string; sortAsc: boolean; noteEditId: string | null; search: string; }
type WatchlistAction =
  | { type: "ADD"; id: string }
  | { type: "REMOVE"; id: string }
  | { type: "SET_SORT"; key: string }
  | { type: "SET_NOTE"; id: string; note: string }
  | { type: "EDIT_NOTE"; id: string | null }
  | { type: "SET_SEARCH"; q: string }
  | { type: "LOAD"; entries: WatchlistEntry[] };

function loadLS(): WatchlistEntry[] {
  try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : []; } catch { return []; }
}
function saveLS(e: WatchlistEntry[]) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(e)); } catch {}
}

const INIT: WatchlistState = { entries: [], sortKey: "added", sortAsc: false, noteEditId: null, search: "" };

function reducer(state: WatchlistState, action: WatchlistAction): WatchlistState {
  switch (action.type) {
    case "LOAD": return { ...state, entries: action.entries };
    case "ADD": {
      if (state.entries.find(e => e.id === action.id) || state.entries.length >= MAX) return state;
      const next = [...state.entries, { id: action.id, addedAt: Date.now(), note: "" }];
      saveLS(next);
      return { ...state, entries: next };
    }
    case "REMOVE": {
      const next = state.entries.filter(e => e.id !== action.id);
      saveLS(next);
      return { ...state, entries: next };
    }
    case "SET_SORT":
      return { ...state, sortKey: action.key, sortAsc: state.sortKey === action.key ? !state.sortAsc : false };
    case "SET_NOTE": {
      const next = state.entries.map(e => e.id === action.id ? { ...e, note: action.note } : e);
      saveLS(next);
      return { ...state, entries: next, noteEditId: null };
    }
    case "EDIT_NOTE": return { ...state, noteEditId: action.id };
    case "SET_SEARCH": return { ...state, search: action.q };
    default: return state;
  }
}

// ─── AddCoinModal ─────────────────────────────────────────────────────────────

const AddCoinModal = memo(({ assets, existingIds, onAdd, onClose }: {
  assets: CryptoAsset[]; existingIds: string[];
  onAdd: (id: string) => void; onClose: () => void;
}) => {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    if (!q.trim()) return assets.slice(0, 30);
    const lq = q.toLowerCase();
    return assets.filter(a => a.symbol.toLowerCase().includes(lq) || a.name.toLowerCase().includes(lq)).slice(0, 30);
  }, [assets, q]);

  return (
    <motion.div
      style={{ position: "fixed" as const, inset: 0, background: C.overlay, display: "flex", alignItems: "flex-start", justifyContent: "center", zIndex: 1000, padding: "80px 20px 20px" }}
      onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
    >
      <motion.div
        style={{ background: C.bgCard, border: "1px solid " + C.accentBorder, borderRadius: 14, width: "100%", maxWidth: 420, maxHeight: "70vh", display: "flex", flexDirection: "column" as const, overflow: "hidden" as const, boxShadow: "0 8px 40px rgba(15,40,100,0.14)" }}
        onClick={e => e.stopPropagation()} initial={{ scale: 0.95, y: -12 }} animate={{ scale: 1, y: 0 }}
      >
        <div style={{ padding: "14px 16px", borderBottom: "1px solid " + C.border, background: "rgba(248,249,252,0.8)" }}>
          <div style={{ position: "relative" as const }}>
            <input type="text" placeholder="Search to add…" autoFocus value={q} onChange={e => setQ(e.target.value)}
              style={{ width: "100%", fontFamily: FONT, fontSize: "12px", background: C.bgInput, border: "1px solid " + C.inputBorder, borderRadius: 8, padding: "9px 12px 9px 30px", color: C.textPrimary, outline: "none", boxSizing: "border-box" as const }} />
            <span style={{ position: "absolute" as const, left: 10, top: "50%", transform: "translateY(-50%)", fontSize: 12, color: C.textMuted }}>⌕</span>
          </div>
        </div>
        <div style={{ flex: 1, overflowY: "auto" as const }}>
          {filtered.map((a, i) => {
            const inList = existingIds.includes(a.id);
            return (
              <div key={a.id}
                onClick={() => { if (!inList) { onAdd(a.id); onClose(); } }}
                style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 16px", borderBottom: "1px solid " + C.borderFaint, cursor: inList ? "default" : "pointer", background: i % 2 === 0 ? "rgba(255,255,255,1)" : "rgba(250,251,254,1)", opacity: inList ? 0.5 : 1, transition: "background 0.1s" }}
                onMouseEnter={e => { if (!inList) e.currentTarget.style.background = C.bgRowHov; }}
                onMouseLeave={e => { e.currentTarget.style.background = i % 2 === 0 ? "rgba(255,255,255,1)" : "rgba(250,251,254,1)"; }}
              >
                {a.image ? <img src={a.image} alt="" style={{ width: 24, height: 24, borderRadius: "50%", flexShrink: 0 }} /> : <div style={{ width: 24, height: 24, borderRadius: "50%", background: C.accentDim, flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FONT, fontSize: "12px", fontWeight: 700, color: C.textPrimary }}>{a.symbol.toUpperCase()}</div>
                  <div style={{ fontFamily: FONT, fontSize: "9px", color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{a.name}</div>
                </div>
                <span style={{ fontFamily: FONT, fontSize: "12px", color: C.textSecondary, fontVariantNumeric: "tabular-nums" }}>{formatPrice(a.price)}</span>
                {inList && <span style={{ fontFamily: FONT, fontSize: "9px", color: C.positive }}>✓</span>}
              </div>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
});
AddCoinModal.displayName = "AddCoinModal";

// ─── WatchRow ─────────────────────────────────────────────────────────────────

const WatchRow = memo(({ entry, asset, onRemove, onEditNote, isMobile, index }: {
  entry: WatchlistEntry; asset: CryptoAsset | undefined;
  onRemove: (id: string) => void; onEditNote: (id: string) => void;
  isMobile: boolean; index: number;
}) => {
  const pos = (asset?.change24h ?? 0) >= 0;
  const bg  = index % 2 === 0 ? "rgba(255,255,255,1)" : "rgba(250,251,254,1)";
  return (
    <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 12, padding: isMobile ? "10px 12px" : "10px 16px", borderBottom: "1px solid " + C.borderFaint, background: bg, transition: "background 0.12s" }}
      onMouseEnter={e => { e.currentTarget.style.background = C.bgRowHov; }}
      onMouseLeave={e => { e.currentTarget.style.background = bg; }}>
      {/* Logo */}
      {!isMobile && (asset?.image
        ? <img src={asset.image} alt="" style={{ width: 28, height: 28, borderRadius: "50%", flexShrink: 0 }} />
        : <div style={{ width: 28, height: 28, borderRadius: "50%", background: C.accentDim, flexShrink: 0 }} />)}
      {/* Name */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: FONT, fontSize: "12px", fontWeight: 700, color: C.textPrimary }}>{asset ? asset.symbol.toUpperCase() : entry.id}</div>
        {!isMobile && <div style={{ fontFamily: FONT, fontSize: "9px", color: C.textMuted, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" as const }}>{asset?.name ?? "—"}</div>}
        {entry.note && !isMobile && <div style={{ fontFamily: FONT, fontSize: "9px", color: C.accent, marginTop: 2 }}>{entry.note}</div>}
      </div>
      {/* Price */}
      <span style={{ fontFamily: FONT, fontSize: "12px", fontWeight: 600, color: C.textPrimary, minWidth: 90, textAlign: "right" as const, fontVariantNumeric: "tabular-nums" }}>{asset ? formatPrice(asset.price) : "—"}</span>
      {/* Change */}
      <span style={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: pos ? C.positive : C.negative, background: pos ? C.positiveDim : C.negativeDim, border: "1px solid " + (pos ? "rgba(0,155,95,0.22)" : "rgba(208,35,75,0.22)"), borderRadius: 4, padding: "2px 6px", whiteSpace: "nowrap" as const, fontVariantNumeric: "tabular-nums" }}>
        {(pos ? "+" : "") + (asset?.change24h ?? 0).toFixed(2) + "%"}
      </span>
      {/* Mkt cap */}
      {!isMobile && <span style={{ fontFamily: FONT, fontSize: "10px", color: C.textMuted, minWidth: 80, textAlign: "right" as const, fontVariantNumeric: "tabular-nums" }}>{asset ? formatCompact(asset.marketCap) : "—"}</span>}
      {/* Sparkline */}
      {!isMobile && asset?.sparkline && (
        <div style={{ width: 72, flexShrink: 0 }}>
          <SparklineChart data={asset.sparkline} positive={pos} width={72} height={28} />
        </div>
      )}
      {/* Note button */}
      {!isMobile && (
        <button onClick={() => onEditNote(entry.id)} title="Edit note"
          style={{ fontFamily: FONT, fontSize: "11px", color: C.textFaint, background: "none", border: "1px solid " + C.border, borderRadius: 6, padding: "3px 7px", cursor: "pointer", flexShrink: 0, transition: "all 0.12s" }}
          onMouseEnter={e => { e.currentTarget.style.color = C.accent; e.currentTarget.style.borderColor = C.accentBorder; }}
          onMouseLeave={e => { e.currentTarget.style.color = C.textFaint; e.currentTarget.style.borderColor = C.border; }}>
          ✎
        </button>
      )}
      {/* Remove */}
      <button onClick={() => onRemove(entry.id)}
        style={{ fontFamily: FONT, fontSize: "13px", color: C.negative, background: C.negativeDim, border: "1px solid rgba(208,35,75,0.22)", borderRadius: 6, padding: "3px 8px", cursor: "pointer", flexShrink: 0 }}>
        ×
      </button>
    </div>
  );
});
WatchRow.displayName = "WatchRow";

// ─── Watchlist ────────────────────────────────────────────────────────────────

const Watchlist = memo(() => {
  const { assets } = useCrypto();
  const { isMobile } = useBreakpoint();
  const [state, dispatch] = useReducer(reducer, INIT);
  const [showAdd, setShowAdd] = useState(false);
  const [noteText, setNoteText] = useState("");
  const m = useRef(true);

  useEffect(() => {
    m.current = true;
    dispatch({ type: "LOAD", entries: loadLS() });
    return () => { m.current = false; };
  }, []);

  const assetMap = useMemo(() => {
    const map: Record<string, CryptoAsset> = {};
    for (const a of assets) map[a.id] = a;
    return map;
  }, [assets]);

  const sortedEntries = useMemo(() => {
    const q = state.search.toLowerCase();
    let list = q ? state.entries.filter(e => {
      const a = assetMap[e.id];
      return a ? a.symbol.toLowerCase().includes(q) || a.name.toLowerCase().includes(q) : e.id.toLowerCase().includes(q);
    }) : [...state.entries];
    list.sort((a, b) => {
      const aa = assetMap[a.id], ba = assetMap[b.id];
      let cmp = 0;
      if      (state.sortKey === "added")    cmp = a.addedAt - b.addedAt;
      else if (state.sortKey === "price")    cmp = (aa?.price ?? 0) - (ba?.price ?? 0);
      else if (state.sortKey === "change")   cmp = (aa?.change24h ?? 0) - (ba?.change24h ?? 0);
      else if (state.sortKey === "mktcap")   cmp = (aa?.marketCap ?? 0) - (ba?.marketCap ?? 0);
      else if (state.sortKey === "name")     cmp = (aa?.name ?? a.id).localeCompare(ba?.name ?? b.id);
      return state.sortAsc ? cmp : -cmp;
    });
    return list;
  }, [state.entries, state.sortKey, state.sortAsc, state.search, assetMap]);

  const SortBtn = useCallback(({ label, k }: { label: string; k: string }) => {
    const active = state.sortKey === k;
    return (
      <button type="button" onClick={() => dispatch({ type: "SET_SORT", key: k })}
        style={{ fontFamily: FONT, fontSize: "9px", color: active ? C.accent : C.textFaint, background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 3, padding: 0, fontWeight: active ? 700 : 500, letterSpacing: "0.08em" }}>
        {label} <span style={{ opacity: active ? 1 : 0.4 }}>{active ? (state.sortAsc ? "↑" : "↓") : "↕"}</span>
      </button>
    );
  }, [state.sortKey, state.sortAsc]);

  const pageSt = useMemo(() => Object.freeze({
    background: C.bgBase, minHeight: "100vh", fontFamily: FONT,
    padding: isMobile ? "12px" : "16px 20px",
  }), [isMobile]);

  return (
    <div style={pageSt}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16, gap: 12, flexWrap: "wrap" as const }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 3, height: 22, borderRadius: 2, background: C.accent }} />
            <h1 style={{ fontFamily: FONT, fontSize: isMobile ? 18 : 22, fontWeight: 800, color: C.textPrimary, margin: 0, letterSpacing: "-0.01em" }}>Watchlist</h1>
          </div>
          <p style={{ fontFamily: FONT, fontSize: "9px", color: C.textFaint, margin: "4px 0 0 13px" }}>{state.entries.length}/{MAX} assets</p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ position: "relative" as const }}>
            <input type="text" placeholder="Filter…" value={state.search} onChange={e => dispatch({ type: "SET_SEARCH", q: e.target.value })}
              style={{ fontFamily: FONT, fontSize: "11px", background: C.bgCard, border: "1px solid " + C.border, borderRadius: 7, padding: "7px 10px 7px 26px", color: C.textPrimary, outline: "none", width: 140 }} />
            <span style={{ position: "absolute" as const, left: 8, top: "50%", transform: "translateY(-50%)", fontSize: 11, color: C.textMuted }}>⌕</span>
          </div>
          <button onClick={() => setShowAdd(true)} disabled={state.entries.length >= MAX}
            style={{ fontFamily: FONT, fontSize: "10px", fontWeight: 700, color: C.accent, background: C.accentDim, border: "1px solid " + C.accentBorder, borderRadius: 7, padding: "7px 14px", cursor: "pointer", opacity: state.entries.length >= MAX ? 0.5 : 1 }}>
            + Add
          </button>
        </div>
      </div>

      {/* Table */}
      <div style={{ background: C.bgCard, border: "1px solid " + C.border, borderRadius: 10, overflow: "hidden" as const, boxShadow: C.shadow }}>
        {/* Column headers */}
        {!isMobile && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 16px", borderBottom: "1px solid " + C.borderFaint, background: "rgba(248,249,252,0.8)" }}>
            <div style={{ width: 28, flexShrink: 0 }} />
            <div style={{ flex: 1 }}><SortBtn label="ASSET" k="name" /></div>
            <div style={{ minWidth: 90, display: "flex", justifyContent: "flex-end" }}><SortBtn label="PRICE" k="price" /></div>
            <div style={{ minWidth: 72, display: "flex", justifyContent: "flex-end" }}><SortBtn label="24H" k="change" /></div>
            <div style={{ minWidth: 80, display: "flex", justifyContent: "flex-end" }}><SortBtn label="MKT CAP" k="mktcap" /></div>
            <div style={{ width: 72, flexShrink: 0 }} />
            <div style={{ width: 26, flexShrink: 0 }} />
            <div style={{ width: 28, flexShrink: 0 }} />
          </div>
        )}

        {state.entries.length === 0 ? (
          <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", padding: "60px 24px", gap: 12 }}>
            <span style={{ fontSize: 32, opacity: 0.3 }}>★</span>
            <span style={{ fontFamily: FONT, fontSize: "12px", color: C.textMuted }}>No assets in watchlist.</span>
            <button onClick={() => setShowAdd(true)} style={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: C.accent, background: C.accentDim, border: "1px solid " + C.accentBorder, borderRadius: 7, padding: "8px 18px", cursor: "pointer" }}>+ Add First Asset</button>
          </div>
        ) : sortedEntries.length === 0 ? (
          <div style={{ padding: "40px 24px", textAlign: "center" as const, fontFamily: FONT, fontSize: "11px", color: C.textMuted }}>No results for "{state.search}"</div>
        ) : (
          <AnimatePresence>
            {sortedEntries.map((entry, i) => (
              <WatchRow key={entry.id} entry={entry} asset={assetMap[entry.id]} index={i}
                onRemove={id => dispatch({ type: "REMOVE", id })}
                onEditNote={id => { setNoteText(state.entries.find(e => e.id === id)?.note ?? ""); dispatch({ type: "EDIT_NOTE", id }); }}
                isMobile={isMobile} />
            ))}
          </AnimatePresence>
        )}
      </div>

      {/* Note edit modal */}
      <AnimatePresence>
        {state.noteEditId && (
          <motion.div
            style={{ position: "fixed" as const, inset: 0, background: C.overlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
            onClick={() => dispatch({ type: "EDIT_NOTE", id: null })}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          >
            <motion.div
              style={{ background: C.bgCard, border: "1px solid " + C.accentBorder, borderRadius: 14, padding: 24, width: "100%", maxWidth: 380, boxShadow: "0 8px 40px rgba(15,40,100,0.14)" }}
              onClick={e => e.stopPropagation()} initial={{ scale: 0.95 }} animate={{ scale: 1 }}
            >
              <p style={{ fontFamily: FONT, fontSize: "11px", color: C.textFaint, letterSpacing: "0.10em", textTransform: "uppercase" as const, margin: "0 0 10px" }}>Note for {assetMap[state.noteEditId]?.symbol.toUpperCase() ?? state.noteEditId}</p>
              <textarea value={noteText} onChange={e => setNoteText(e.target.value)} rows={3}
                style={{ width: "100%", fontFamily: FONT, fontSize: "12px", background: C.bgInput, border: "1px solid " + C.inputBorder, borderRadius: 8, padding: 10, color: C.textPrimary, outline: "none", resize: "vertical" as const, boxSizing: "border-box" as const }} />
              <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
                <button onClick={() => dispatch({ type: "EDIT_NOTE", id: null })} style={{ fontFamily: FONT, fontSize: "11px", color: C.textMuted, background: C.border, border: "none", borderRadius: 7, padding: "7px 14px", cursor: "pointer" }}>Cancel</button>
                <button onClick={() => dispatch({ type: "SET_NOTE", id: state.noteEditId!, note: noteText })} style={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: C.accent, background: C.accentDim, border: "1px solid " + C.accentBorder, borderRadius: 7, padding: "7px 14px", cursor: "pointer" }}>Save</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add modal */}
      <AnimatePresence>
        {showAdd && (
          <AddCoinModal
            assets={assets}
            existingIds={state.entries.map(e => e.id)}
            onAdd={id => dispatch({ type: "ADD", id })}
            onClose={() => setShowAdd(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
});
Watchlist.displayName = "Watchlist";
export default Watchlist;
