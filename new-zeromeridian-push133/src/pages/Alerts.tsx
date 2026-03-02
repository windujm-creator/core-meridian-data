/**
 * Alerts.tsx — ZERØ MERIDIAN 2026 push133
 * push133: Light professional reskin (Bloomberg mode push132)
 * All alert logic preserved — only theme colors changed
 * - Object.freeze() ✓  rgba() only ✓  Zero className ✓
 * - JetBrains Mono ✓  React.memo + displayName ✓
 */

import {
  memo, useReducer, useCallback, useMemo, useEffect, useRef, useState,
} from 'react';
import { useCrypto } from '@/contexts/CryptoContext';
import { formatPrice, formatChange, formatCompact, deterministicJitter } from '@/lib/formatters';
import type { CryptoAsset } from '@/lib/formatters';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import {
  Bell, BellOff, Plus, Trash2, Volume2, VolumeX, CheckCircle2,
  TrendingUp, TrendingDown, Activity, AlertTriangle, Zap, X,
  Settings, History, ChevronDown, ChevronUp,
} from 'lucide-react';

const FONT = "'JetBrains Mono', monospace";

type AlertType = 'above' | 'below' | 'change_up' | 'change_down';
type AlertStatus = 'active' | 'triggered' | 'paused';

interface PriceAlert {
  id: string; symbol: string; name: string; image?: string;
  type: AlertType; target: number; createdAt: number; status: AlertStatus;
  triggeredAt?: number; triggeredPrice?: number; note?: string;
  sound: boolean; push: boolean;
}
interface TriggeredLog {
  id: string; alertId: string; symbol: string; name: string; image?: string;
  type: AlertType; target: number; triggeredPrice: number; triggeredAt: number;
}
interface AlertsState {
  alerts: PriceAlert[]; log: TriggeredLog[];
  soundEnabled: boolean; pushEnabled: boolean;
}
type AlertsAction =
  | { type: 'ADD'; alert: PriceAlert }
  | { type: 'REMOVE'; id: string }
  | { type: 'TOGGLE_PAUSE'; id: string }
  | { type: 'TRIGGER'; id: string; price: number; logEntry: TriggeredLog }
  | { type: 'CLEAR_LOG' }
  | { type: 'TOGGLE_SOUND' }
  | { type: 'TOGGLE_PUSH' }
  | { type: 'LOAD'; state: AlertsState };

const LS_KEY    = 'zm_alerts_v2';
const MAX_LOG   = 100;
const MAX_ALERTS = 50;

const C = Object.freeze({
  bgBase:       "rgba(248,249,252,1)",
  bgCard:       "rgba(255,255,255,1)",
  bgCardHover:  "rgba(243,245,250,1)",
  bgInput:      "rgba(243,245,252,1)",
  accent:       "rgba(15,40,180,1)",
  accentDim:    "rgba(15,40,180,0.08)",
  accentBorder: "rgba(15,40,180,0.22)",
  positive:     "rgba(0,155,95,1)",
  positiveDim:  "rgba(0,155,95,0.09)",
  negative:     "rgba(208,35,75,1)",
  negativeDim:  "rgba(208,35,75,0.09)",
  warning:      "rgba(195,125,0,1)",
  warningDim:   "rgba(195,125,0,0.09)",
  warningBorder:"rgba(195,125,0,0.22)",
  violet:       "rgba(90,60,200,1)",
  violetDim:    "rgba(90,60,200,0.09)",
  violetBorder: "rgba(90,60,200,0.22)",
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

const ALERT_TYPE_CONFIG = Object.freeze({
  above:       { label: "Price Above",  Icon: TrendingUp,   color: C.positive,  bg: C.positiveDim,  border: "rgba(0,155,95,0.22)" },
  below:       { label: "Price Below",  Icon: TrendingDown, color: C.negative,  bg: C.negativeDim,  border: "rgba(208,35,75,0.22)" },
  change_up:   { label: "% Pump Alert", Icon: Zap,          color: C.accent,    bg: C.accentDim,    border: C.accentBorder },
  change_down: { label: "% Dump Alert", Icon: AlertTriangle, color: C.warning,  bg: C.warningDim,   border: C.warningBorder },
} as const);

const STATUS_CONFIG = Object.freeze({
  active:    { label: "Active",    color: C.positive, bg: C.positiveDim },
  triggered: { label: "Triggered", color: C.warning,  bg: C.warningDim },
  paused:    { label: "Paused",    color: C.textFaint, bg: "rgba(165,175,210,0.10)" },
} as const);

function loadFromLS(): AlertsState | null {
  try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}
function saveToLS(s: AlertsState) { try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {} }
function genId(attempt: number): string {
  const seed = deterministicJitter(attempt);
  return "a" + Date.now().toString(36) + seed.toString(16);
}
function playAlertSound(type: AlertType): void {
  try {
    const ctx = new AudioContext(); const osc = ctx.createOscillator(); const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    if (type === "above" || type === "change_up") { osc.frequency.setValueAtTime(880, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1); }
    else { osc.frequency.setValueAtTime(660, ctx.currentTime); osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1); }
    osc.type = "sine"; gain.gain.setValueAtTime(0.15, ctx.currentTime); gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.35);
  } catch {}
}
function checkAlert(alert: PriceAlert, asset: CryptoAsset): boolean {
  if (alert.status !== "active") return false;
  if (alert.type === "above")       return asset.price >= alert.target;
  if (alert.type === "below")       return asset.price <= alert.target;
  if (alert.type === "change_up")   return asset.change24h >= alert.target;
  if (alert.type === "change_down") return asset.change24h <= -Math.abs(alert.target);
  return false;
}

const INITIAL_STATE: AlertsState = Object.freeze({ alerts: [], log: [], soundEnabled: true, pushEnabled: false } as AlertsState);

function reducer(state: AlertsState, action: AlertsAction): AlertsState {
  switch (action.type) {
    case "LOAD":          return action.state;
    case "ADD":           return { ...state, alerts: [...state.alerts, action.alert].slice(-MAX_ALERTS) };
    case "REMOVE":        return { ...state, alerts: state.alerts.filter(a => a.id !== action.id) };
    case "TOGGLE_PAUSE":  return { ...state, alerts: state.alerts.map(a => a.id === action.id ? { ...a, status: a.status === "paused" ? "active" : "paused" } : a) };
    case "TRIGGER":       return { ...state, alerts: state.alerts.map(a => a.id === action.id ? { ...a, status: "triggered" as const, triggeredAt: Date.now(), triggeredPrice: action.price } : a), log: [action.logEntry, ...state.log].slice(0, MAX_LOG) };
    case "CLEAR_LOG":     return { ...state, log: [] };
    case "TOGGLE_SOUND":  return { ...state, soundEnabled: !state.soundEnabled };
    case "TOGGLE_PUSH":   return { ...state, pushEnabled: !state.pushEnabled };
    default: return state;
  }
}

// ─── AddAlertModal ────────────────────────────────────────────────────────────

const AddAlertModal = memo(({ assets, onAdd, onClose }: {
  assets: CryptoAsset[];
  onAdd: (a: PriceAlert) => void;
  onClose: () => void;
}) => {
  const [symbol, setSymbol] = useState("");
  const [type, setType]     = useState<AlertType>("above");
  const [target, setTarget] = useState("");
  const [note, setNote]     = useState("");
  const [sound, setSound]   = useState(true);
  const [err, setErr]       = useState("");

  const matched = useMemo(() => {
    const q = symbol.toLowerCase();
    return q ? assets.filter(a => a.symbol.toLowerCase().startsWith(q) || a.name.toLowerCase().startsWith(q)).slice(0, 6) : [];
  }, [assets, symbol]);

  const handleAdd = useCallback(() => {
    const t = parseFloat(target);
    if (!symbol.trim()) { setErr("Symbol required"); return; }
    if (isNaN(t) || t <= 0) { setErr("Invalid target value"); return; }
    const asset = assets.find(a => a.symbol.toLowerCase() === symbol.trim().toLowerCase());
    const alert: PriceAlert = {
      id: genId(0), symbol: symbol.trim().toLowerCase(), name: asset?.name ?? symbol.toUpperCase(),
      image: asset?.image, type, target: t, createdAt: Date.now(), status: "active",
      note: note.trim() || undefined, sound, push: false,
    };
    onAdd(alert); onClose();
  }, [symbol, type, target, note, sound, assets, onAdd, onClose]);

  const inputSt = useMemo(() => Object.freeze({
    width: "100%", background: C.bgInput, border: "1px solid " + C.inputBorder, borderRadius: 8,
    padding: "9px 12px", fontFamily: FONT, fontSize: "12px", color: C.textPrimary, outline: "none", boxSizing: "border-box" as const,
  }), []);

  return (
    <div
      style={{ position: "fixed" as const, inset: 0, background: C.overlay, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: 20 }}
      onClick={onClose}
    >
      <div
        style={{ background: C.bgCard, border: "1px solid " + C.accentBorder, borderRadius: 16, padding: 28, width: "100%", maxWidth: 440, boxShadow: "0 8px 40px rgba(15,40,100,0.14)" }}
        onClick={e => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 22 }}>
          <h2 style={{ fontFamily: FONT, fontSize: 15, fontWeight: 800, color: C.textPrimary, margin: 0 }}>NEW ALERT</h2>
          <button onClick={onClose} style={{ background: C.border, border: "none", borderRadius: 8, width: 30, height: 30, cursor: "pointer", color: C.textMuted, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
        </div>

        <div style={{ display: "flex", flexDirection: "column" as const, gap: 14 }}>
          {/* Symbol */}
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 5 }}>
            <label style={{ fontFamily: FONT, fontSize: "9px", color: C.textMuted, letterSpacing: "0.10em", textTransform: "uppercase" as const }}>Asset Symbol</label>
            <input style={inputSt} value={symbol} onChange={e => setSymbol(e.target.value)} placeholder="BTC, ETH, SOL…" />
            {matched.length > 0 && (
              <div style={{ background: C.bgCard, border: "1px solid " + C.border, borderRadius: 8, overflow: "hidden" as const, marginTop: -2 }}>
                {matched.map(a => (
                  <div key={a.id} onClick={() => setSymbol(a.symbol)} style={{ display: "flex", alignItems: "center", gap: 8, padding: "7px 12px", cursor: "pointer", borderBottom: "1px solid " + C.borderFaint }}
                    onMouseEnter={e => { e.currentTarget.style.background = C.bgCardHover; }}
                    onMouseLeave={e => { e.currentTarget.style.background = "transparent"; }}>
                    {a.image && <img src={a.image} alt="" style={{ width: 20, height: 20, borderRadius: "50%" }} />}
                    <span style={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: C.textPrimary }}>{a.symbol.toUpperCase()}</span>
                    <span style={{ fontFamily: FONT, fontSize: "10px", color: C.textMuted }}>{a.name}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Alert type */}
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 5 }}>
            <label style={{ fontFamily: FONT, fontSize: "9px", color: C.textMuted, letterSpacing: "0.10em", textTransform: "uppercase" as const }}>Alert Type</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              {(Object.entries(ALERT_TYPE_CONFIG) as [AlertType, typeof ALERT_TYPE_CONFIG[AlertType]][]).map(([k, cfg]) => {
                const active = type === k;
                return (
                  <button key={k} type="button" onClick={() => setType(k)}
                    style={{ fontFamily: FONT, fontSize: "10px", fontWeight: active ? 700 : 500, color: active ? cfg.color : C.textMuted, background: active ? cfg.bg : "transparent", border: "1px solid " + (active ? cfg.border : C.border), borderRadius: 8, padding: "8px", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5, transition: "all 0.13s" }}>
                    <cfg.Icon size={11} /> {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target */}
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 5 }}>
            <label style={{ fontFamily: FONT, fontSize: "9px", color: C.textMuted, letterSpacing: "0.10em", textTransform: "uppercase" as const }}>
              {type === "change_up" || type === "change_down" ? "% Change Threshold" : "Target Price (USD)"}
            </label>
            <input style={inputSt} type="number" value={target} onChange={e => setTarget(e.target.value)} placeholder={type === "change_up" || type === "change_down" ? "e.g. 5" : "e.g. 50000"} min="0" step="any" />
          </div>

          {/* Note */}
          <div style={{ display: "flex", flexDirection: "column" as const, gap: 5 }}>
            <label style={{ fontFamily: FONT, fontSize: "9px", color: C.textMuted, letterSpacing: "0.10em", textTransform: "uppercase" as const }}>Note (optional)</label>
            <input style={inputSt} value={note} onChange={e => setNote(e.target.value)} placeholder="Optional note…" />
          </div>

          {/* Sound */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <span style={{ fontFamily: FONT, fontSize: "11px", color: C.textSecondary }}>Play sound on trigger</span>
            <div onClick={() => setSound(v => !v)} style={{ width: 36, height: 20, borderRadius: 10, background: sound ? C.accent : C.border, position: "relative" as const, cursor: "pointer", transition: "background 0.2s" }}>
              <div style={{ position: "absolute" as const, top: 3, left: sound ? 19 : 3, width: 14, height: 14, borderRadius: 7, background: "rgba(255,255,255,1)", transition: "left 0.2s" }} />
            </div>
          </div>

          {err && <p style={{ fontFamily: FONT, fontSize: "11px", color: C.negative, margin: 0 }}>⚠ {err}</p>}

          <button onClick={handleAdd} style={{ width: "100%", padding: "11px", background: C.accentDim, border: "1px solid " + C.accentBorder, borderRadius: 8, color: C.accent, fontFamily: FONT, fontSize: "12px", fontWeight: 700, cursor: "pointer", letterSpacing: "0.06em", marginTop: 4 }}>
            + CREATE ALERT
          </button>
        </div>
      </div>
    </div>
  );
});
AddAlertModal.displayName = "AddAlertModal";

// ─── AlertCard ────────────────────────────────────────────────────────────────

const AlertCard = memo(({ alert, onRemove, onTogglePause }: {
  alert: PriceAlert;
  onRemove: (id: string) => void;
  onTogglePause: (id: string) => void;
}) => {
  const cfg  = ALERT_TYPE_CONFIG[alert.type];
  const stcfg = STATUS_CONFIG[alert.status];
  const Icon  = cfg.Icon;
  return (
    <div style={{ background: C.bgCard, border: "1px solid " + C.border, borderRadius: 10, padding: "13px 15px", display: "flex", alignItems: "center", gap: 12, boxShadow: C.shadow }}>
      <div style={{ width: 36, height: 36, borderRadius: 9, background: cfg.bg, border: "1px solid " + cfg.border, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Icon size={16} style={{ color: cfg.color }} />
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 3 }}>
          <span style={{ fontFamily: FONT, fontSize: "13px", fontWeight: 700, color: C.textPrimary }}>{alert.symbol.toUpperCase()}</span>
          <span style={{ fontFamily: FONT, fontSize: "9px", color: stcfg.color, background: stcfg.bg, border: "1px solid " + (alert.status === "active" ? "rgba(0,155,95,0.22)" : alert.status === "triggered" ? "rgba(195,125,0,0.22)" : C.borderFaint), borderRadius: 4, padding: "1px 6px" }}>{stcfg.label}</span>
        </div>
        <div style={{ fontFamily: FONT, fontSize: "10px", color: cfg.color }}>{cfg.label}: {alert.type === "change_up" || alert.type === "change_down" ? alert.target.toFixed(1) + "%" : formatPrice(alert.target)}</div>
        {alert.note && <div style={{ fontFamily: FONT, fontSize: "10px", color: C.textMuted, marginTop: 2 }}>{alert.note}</div>}
        {alert.triggeredPrice && <div style={{ fontFamily: FONT, fontSize: "10px", color: C.warning, marginTop: 2 }}>Triggered at {formatPrice(alert.triggeredPrice)}</div>}
      </div>
      <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
        <button onClick={() => onTogglePause(alert.id)}
          style={{ fontFamily: FONT, fontSize: "10px", color: alert.status === "paused" ? C.accent : C.textMuted, background: alert.status === "paused" ? C.accentDim : "rgba(165,175,210,0.10)", border: "1px solid " + (alert.status === "paused" ? C.accentBorder : C.border), borderRadius: 6, padding: "4px 8px", cursor: "pointer" }}>
          {alert.status === "paused" ? "Resume" : "Pause"}
        </button>
        <button onClick={() => onRemove(alert.id)}
          style={{ width: 28, height: 28, borderRadius: 6, border: "1px solid rgba(208,35,75,0.22)", background: C.negativeDim, color: C.negative, cursor: "pointer", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>×</button>
      </div>
    </div>
  );
});
AlertCard.displayName = "AlertCard";

// ─── Alerts ───────────────────────────────────────────────────────────────────

const Alerts = memo(() => {
  const { assets } = useCrypto();
  const { isMobile } = useBreakpoint();
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const [showAdd, setShowAdd] = useState(false);
  const [activeTab, setActiveTab] = useState<"active" | "history">("active");
  const mountedRef = useRef(true);
  const triggeredIds = useRef(new Set<string>());

  useEffect(() => {
    mountedRef.current = true;
    const saved = loadFromLS();
    if (saved) dispatch({ type: "LOAD", state: saved });
    return () => { mountedRef.current = false; };
  }, []);

  useEffect(() => { saveToLS(state); }, [state]);

  // Check alerts
  useEffect(() => {
    if (!assets.length) return;
    for (const alert of state.alerts) {
      if (alert.status !== "active") continue;
      const asset = assets.find(a => a.symbol.toLowerCase() === alert.symbol.toLowerCase());
      if (!asset) continue;
      if (checkAlert(alert, asset) && !triggeredIds.current.has(alert.id)) {
        triggeredIds.current.add(alert.id);
        if (state.soundEnabled && alert.sound) playAlertSound(alert.type);
        dispatch({
          type: "TRIGGER", id: alert.id, price: asset.price,
          logEntry: { id: genId(triggeredIds.current.size), alertId: alert.id, symbol: alert.symbol, name: alert.name, image: alert.image, type: alert.type, target: alert.target, triggeredPrice: asset.price, triggeredAt: Date.now() },
        });
      }
    }
  }, [assets, state.alerts, state.soundEnabled]);

  const addAlert = useCallback((a: PriceAlert) => { dispatch({ type: "ADD", alert: a }); }, []);

  const pageSt = useMemo(() => Object.freeze({
    background: C.bgBase, minHeight: "100vh", fontFamily: FONT,
    padding: isMobile ? "12px" : "16px 20px",
  }), [isMobile]);

  const activeAlerts = state.alerts.filter(a => a.status !== "triggered");
  const triggeredAlerts = state.alerts.filter(a => a.status === "triggered");

  return (
    <div style={pageSt}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 20, gap: 12 }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 3, height: 22, borderRadius: 2, background: C.accent }} />
            <h1 style={{ fontFamily: FONT, fontSize: isMobile ? 18 : 22, fontWeight: 800, color: C.textPrimary, margin: 0, letterSpacing: "-0.01em" }}>Alerts</h1>
          </div>
          <p style={{ fontFamily: FONT, fontSize: "9px", color: C.textFaint, margin: "4px 0 0 13px", letterSpacing: "0.10em", textTransform: "uppercase" as const }}>
            {activeAlerts.length} active · {triggeredAlerts.length} triggered
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          <button onClick={() => dispatch({ type: "TOGGLE_SOUND" })}
            style={{ width: 34, height: 34, borderRadius: 8, border: "1px solid " + C.border, background: C.bgCard, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", color: state.soundEnabled ? C.accent : C.textFaint }}>
            {state.soundEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
          </button>
          <button onClick={() => setShowAdd(true)} disabled={state.alerts.length >= MAX_ALERTS}
            style={{ fontFamily: FONT, fontSize: "10px", fontWeight: 700, color: C.accent, background: C.accentDim, border: "1px solid " + C.accentBorder, borderRadius: 7, padding: "7px 14px", cursor: "pointer" }}>
            + New
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 0, marginBottom: 14, borderBottom: "1px solid " + C.border }}>
        {(["active", "history"] as const).map(t => (
          <button key={t} type="button" onClick={() => setActiveTab(t)}
            style={{ fontFamily: FONT, fontSize: "11px", fontWeight: activeTab === t ? 700 : 500, color: activeTab === t ? C.accent : C.textMuted, background: "none", border: "none", borderBottom: "2px solid " + (activeTab === t ? C.accent : "transparent"), padding: "8px 14px", cursor: "pointer", textTransform: "capitalize" as const, letterSpacing: "0.04em" }}>
            {t === "active" ? "Active Alerts" : "History"}
            {t === "active" && state.alerts.length > 0 && (
              <span style={{ marginLeft: 7, fontFamily: FONT, fontSize: "9px", color: C.accent, background: C.accentDim, border: "1px solid " + C.accentBorder, borderRadius: "99px", padding: "1px 6px" }}>{state.alerts.length}</span>
            )}
            {t === "history" && state.log.length > 0 && (
              <span style={{ marginLeft: 7, fontFamily: FONT, fontSize: "9px", color: C.warning, background: C.warningDim, border: "1px solid " + C.warningBorder, borderRadius: "99px", padding: "1px 6px" }}>{state.log.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* Active alerts */}
      {activeTab === "active" && (
        <>
          {state.alerts.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", padding: "60px 24px", gap: 12 }}>
              <Bell size={36} style={{ color: C.textFaint, opacity: 0.4 }} />
              <span style={{ fontFamily: FONT, fontSize: "12px", color: C.textMuted }}>No alerts configured.</span>
              <button onClick={() => setShowAdd(true)} style={{ fontFamily: FONT, fontSize: "11px", fontWeight: 700, color: C.accent, background: C.accentDim, border: "1px solid " + C.accentBorder, borderRadius: 7, padding: "8px 18px", cursor: "pointer" }}>+ Create First Alert</button>
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column" as const, gap: 8 }}>
              {state.alerts.map(alert => (
                <AlertCard key={alert.id} alert={alert}
                  onRemove={id => dispatch({ type: "REMOVE", id })}
                  onTogglePause={id => dispatch({ type: "TOGGLE_PAUSE", id })} />
              ))}
            </div>
          )}
        </>
      )}

      {/* History */}
      {activeTab === "history" && (
        <>
          {state.log.length === 0 ? (
            <div style={{ display: "flex", flexDirection: "column" as const, alignItems: "center", padding: "60px 24px", gap: 12 }}>
              <History size={32} style={{ color: C.textFaint, opacity: 0.4 }} />
              <span style={{ fontFamily: FONT, fontSize: "12px", color: C.textMuted }}>No triggered alerts yet.</span>
            </div>
          ) : (
            <>
              <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}>
                <button onClick={() => dispatch({ type: "CLEAR_LOG" })} style={{ fontFamily: FONT, fontSize: "10px", color: C.negative, background: C.negativeDim, border: "1px solid rgba(208,35,75,0.22)", borderRadius: 6, padding: "5px 10px", cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
                  <Trash2 size={11} /> Clear History
                </button>
              </div>
              <div style={{ background: C.bgCard, border: "1px solid " + C.border, borderRadius: 10, overflow: "hidden" as const, boxShadow: C.shadow }}>
                {state.log.map((log, i) => {
                  const cfg = ALERT_TYPE_CONFIG[log.type];
                  return (
                    <div key={log.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 16px", borderBottom: "1px solid " + C.borderFaint, background: i % 2 === 0 ? "rgba(255,255,255,1)" : "rgba(250,251,254,1)" }}>
                      <cfg.Icon size={13} style={{ color: cfg.color, flexShrink: 0 }} />
                      <span style={{ fontFamily: FONT, fontSize: "12px", fontWeight: 700, color: C.textPrimary, width: 50, flexShrink: 0 }}>{log.symbol.toUpperCase()}</span>
                      <span style={{ fontFamily: FONT, fontSize: "10px", color: cfg.color, flex: 1 }}>{cfg.label}: {formatPrice(log.target)} → {formatPrice(log.triggeredPrice)}</span>
                      <span style={{ fontFamily: FONT, fontSize: "9px", color: C.textFaint, flexShrink: 0 }}>{new Date(log.triggeredAt).toLocaleString()}</span>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </>
      )}

      {showAdd && (
        <AddAlertModal assets={assets} onAdd={addAlert} onClose={() => setShowAdd(false)} />
      )}
    </div>
  );
});
Alerts.displayName = "Alerts";
export default Alerts;
