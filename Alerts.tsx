/**
 * Alerts.tsx — ZERØ MERIDIAN
 * Price alert center: above/below target, % change pump/dump,
 * sound notification (Web Audio API), browser push notification.
 * - localStorage persistence (key: 'zm_alerts_v2')
 * - Real-time price check via CryptoContext (WS-fed, no extra fetch)
 * - Ring buffer: max 100 triggered history
 * - Object.freeze() semua static data
 * - React.memo + displayName semua components
 * - useReducer for state, useCallback + useMemo all handlers
 * - rgba() only, zero hsl() ✓
 * - Zero className ✓ ← push26 (zm-glass/zm-corners/zm-gradient → inline)
 * - Hook .ts pattern: zero JSX (logic only in helpers)
 * - Zero Math.random() → deterministicJitter
 * - Zero template literals in JSX attrs
 * - Pure SVG icons where needed, zero recharts
 * - will-change: transform on animated elements
 */

import {
  memo, useReducer, useCallback, useMemo, useEffect, useRef, useState,
} from 'react';
import { useCrypto } from '@/contexts/CryptoContext';
import { formatPrice, formatChange, formatCompact, deterministicJitter } from '@/lib/formatters';
import type { CryptoAsset } from '@/lib/formatters';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import {

const FONT_MONO = "'JetBrains Mono', monospace";
  Bell, BellOff, Plus, Trash2, Volume2, VolumeX, CheckCircle2,
  TrendingUp, TrendingDown, Activity, AlertTriangle, Zap, X,
  Settings, History, ChevronDown, ChevronUp,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type AlertType = 'above' | 'below' | 'change_up' | 'change_down';
type AlertStatus = 'active' | 'triggered' | 'paused';

interface PriceAlert {
  id: string;
  symbol: string;           // e.g. 'btc'
  name: string;             // e.g. 'Bitcoin'
  image?: string;
  type: AlertType;
  target: number;           // price or % depending on type
  createdAt: number;        // ms epoch
  status: AlertStatus;
  triggeredAt?: number;
  triggeredPrice?: number;
  note?: string;
  sound: boolean;
  push: boolean;
}

interface TriggeredLog {
  id: string;
  alertId: string;
  symbol: string;
  name: string;
  image?: string;
  type: AlertType;
  target: number;
  triggeredPrice: number;
  triggeredAt: number;
}

interface AlertsState {
  alerts: PriceAlert[];
  log: TriggeredLog[];
  soundEnabled: boolean;
  pushEnabled: boolean;
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

// ─── Constants ────────────────────────────────────────────────────────────────

const LS_KEY = 'zm_alerts_v2';
const MAX_LOG = 100;
const MAX_ALERTS = 50;

const ALERT_TYPE_CONFIG = Object.freeze({
  above:      { label: 'Price Above',   icon: TrendingUp,   color: 'rgba(52,211,153,1)',   bg: 'rgba(52,211,153,0.10)',   border: 'rgba(52,211,153,0.22)' },
  below:      { label: 'Price Below',   icon: TrendingDown, color: 'rgba(251,113,133,1)',  bg: 'rgba(251,113,133,0.10)',  border: 'rgba(251,113,133,0.22)' },
  change_up:  { label: '% Pump Alert',  icon: Zap,          color: 'rgba(34,211,238,1)',   bg: 'rgba(34,211,238,0.10)',   border: 'rgba(34,211,238,0.22)' },
  change_down:{ label: '% Dump Alert',  icon: AlertTriangle,color: 'rgba(251,191,36,1)',   bg: 'rgba(251,191,36,0.10)',   border: 'rgba(251,191,36,0.22)' },
} as const);

const STATUS_CONFIG = Object.freeze({
  active:    { label: 'Active',    color: 'rgba(52,211,153,1)',  bg: 'rgba(52,211,153,0.10)'  },
  triggered: { label: 'Triggered', color: 'rgba(251,191,36,1)', bg: 'rgba(251,191,36,0.10)'  },
  paused:    { label: 'Paused',    color: 'rgba(148,163,184,0.6)', bg: 'rgba(148,163,184,0.08)' },
} as const);

// ─── Helpers ──────────────────────────────────────────────────────────────────

function loadFromLS(): AlertsState | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AlertsState;
  } catch {
    return null;
  }
}

function saveToLS(state: AlertsState): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(state));
  } catch {}
}

function genId(attempt: number): string {
  const seed = deterministicJitter(attempt);
  return 'a' + Date.now().toString(36) + seed.toString(16);
}

// Web Audio API — synthesize alert beep (no external sound file needed)
function playAlertSound(type: AlertType): void {
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);

    if (type === 'above' || type === 'change_up') {
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(1320, ctx.currentTime + 0.1);
    } else {
      osc.frequency.setValueAtTime(660, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(440, ctx.currentTime + 0.1);
    }
    osc.type = 'sine';
    gain.gain.setValueAtTime(0.18, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.35);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.35);

    // Second tone
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.frequency.setValueAtTime(type === 'above' || type === 'change_up' ? 1320 : 440, ctx.currentTime + 0.12);
    osc2.type = 'sine';
    gain2.gain.setValueAtTime(0.12, ctx.currentTime + 0.12);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.45);
    osc2.start(ctx.currentTime + 0.12);
    osc2.stop(ctx.currentTime + 0.45);
  } catch {}
}

function sendPushNotification(alert: PriceAlert, price: number): void {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  try {
    const cfg = ALERT_TYPE_CONFIG[alert.type];
    const body = alert.type === 'above' || alert.type === 'below'
      ? alert.symbol.toUpperCase() + ' hit ' + formatPrice(price) + ' (target: ' + formatPrice(alert.target) + ')'
      : alert.symbol.toUpperCase() + ' changed ' + formatChange(alert.target) + ' (now: ' + formatChange(price) + ')';
    new Notification('ZERØ MERIDIAN — ' + cfg.label, {
      body,
      icon: alert.image,
      tag: alert.id,
      silent: false,
    });
  } catch {}
}

function checkAlert(alert: PriceAlert, asset: CryptoAsset): boolean {
  if (alert.status !== 'active') return false;
  if (alert.type === 'above')       return asset.price >= alert.target;
  if (alert.type === 'below')       return asset.price <= alert.target;
  if (alert.type === 'change_up')   return asset.change24h >= alert.target;
  if (alert.type === 'change_down') return asset.change24h <= -Math.abs(alert.target);
  return false;
}

// ─── Reducer ──────────────────────────────────────────────────────────────────

const INITIAL_STATE: AlertsState = Object.freeze({
  alerts: [],
  log: [],
  soundEnabled: true,
  pushEnabled: false,
} as AlertsState);

function reducer(state: AlertsState, action: AlertsAction): AlertsState {
  switch (action.type) {
    case 'LOAD':
      return action.state;
    case 'ADD': {
      if (state.alerts.length >= MAX_ALERTS) return state;
      return { ...state, alerts: [action.alert, ...state.alerts] };
    }
    case 'REMOVE':
      return { ...state, alerts: state.alerts.filter(a => a.id !== action.id) };
    case 'TOGGLE_PAUSE':
      return {
        ...state,
        alerts: state.alerts.map(a =>
          a.id === action.id
            ? { ...a, status: a.status === 'paused' ? 'active' : 'paused' }
            : a
        ),
      };
    case 'TRIGGER': {
      const newLog = [action.logEntry, ...state.log].slice(0, MAX_LOG);
      return {
        ...state,
        alerts: state.alerts.map(a =>
          a.id === action.id
            ? { ...a, status: 'triggered', triggeredAt: Date.now(), triggeredPrice: action.price }
            : a
        ),
        log: newLog,
      };
    }
    case 'CLEAR_LOG':
      return { ...state, log: [] };
    case 'TOGGLE_SOUND':
      return { ...state, soundEnabled: !state.soundEnabled };
    case 'TOGGLE_PUSH':
      return { ...state, pushEnabled: !state.pushEnabled };
    default:
      return state;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

const WsStatusDot = memo(({ status }: { status: string }) => {
  const color = status === 'connected'
    ? 'rgba(52,211,153,1)'
    : status === 'reconnecting'
    ? 'rgba(251,191,36,1)'
    : 'rgba(251,113,133,1)';
  return (
    <span
            style={{ width: 6, height: 6, borderRadius: '50%', display: 'inline-block', background: color, boxShadow: '0 0 5px ' + color, willChange: 'transform' }}
    />
  );
});
WsStatusDot.displayName = 'WsStatusDot';

// ─── Add Alert Form ───────────────────────────────────────────────────────────

interface AddAlertFormProps {
  assets: CryptoAsset[];
  onAdd: (alert: PriceAlert) => void;
  onClose: () => void;
  idCounter: number;
}

const AddAlertForm = memo(({ assets, onAdd, onClose, idCounter }: AddAlertFormProps) => {
  const [symbol, setSymbol] = useState('btc');
  const [alertType, setAlertType] = useState<AlertType>('above');
  const [target, setTarget] = useState('');
  const [note, setNote] = useState('');
  const [sound, setSound] = useState(true);
  const [push, setPush] = useState(false);
  const [error, setError] = useState('');

  const selectedAsset = useMemo(
    () => assets.find(a => a.symbol.toLowerCase() === symbol) ?? assets[0],
    [assets, symbol]
  );

  const isPercent = alertType === 'change_up' || alertType === 'change_down';
  const placeholder = isPercent ? 'e.g. 5 (for 5%)' : selectedAsset ? 'e.g. ' + Math.round(selectedAsset.price * 1.05) : 'Target price';

  const handleSubmit = useCallback(() => {
    const val = parseFloat(target);
    if (!isFinite(val) || val <= 0) { setError('Target tidak valid bro'); return; }
    if (!selectedAsset) { setError('Pilih aset dulu'); return; }
    setError('');
    const alert: PriceAlert = {
      id: genId(idCounter),
      symbol: selectedAsset.symbol.toLowerCase(),
      name: selectedAsset.name,
      image: selectedAsset.image,
      type: alertType,
      target: val,
      createdAt: Date.now(),
      status: 'active',
      note: note.trim() || undefined,
      sound,
      push,
    };
    onAdd(alert);
    onClose();
  }, [target, selectedAsset, alertType, note, sound, push, idCounter, onAdd, onClose]);

  const topAssets = useMemo(() => assets.slice(0, 30), [assets]);

  return (
    <div
            style={{ position: 'fixed', inset: 0, zIndex: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(5,5,14,0.82)', backdropFilter: 'blur(10px)' }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
                style={{ width: '100%', maxWidth: 448, margin: '0 16px', padding: 24, background: 'rgba(8,8,24,0.98)', border: '1px solid rgba(96,165,250,0.18)', borderRadius: '12px', position: 'relative' }}
      >
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <Bell size={16} style={{ color: 'rgba(96,165,250,1)' }} />
            <span style={{ fontFamily: FONT_MONO, fontSize: 14, fontWeight: 700, color: 'var(--zm-text-primary)' }}>
              New Alert
            </span>
          </div>
          <button
            onClick={onClose}
            aria-label="Close new alert dialog"
                        style={{ padding: 4, borderRadius: 8, transition: 'color 0.15s,background 0.15s', cursor: 'pointer', background: 'transparent', border: 'none', color: 'var(--zm-text-faint)' }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Asset Select */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 10, fontFamily: FONT_MONO, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'block', color: 'var(--zm-text-faint)' }}>
            Asset
          </label>
          <select
            value={symbol}
            onChange={e => setSymbol(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 14, fontFamily: FONT_MONO, outline: 'none', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(96,165,250,0.14)', color: 'var(--zm-text-primary)' }}
          >
            {topAssets.map(a => (
              <option key={a.id} value={a.symbol.toLowerCase()} style={{ background: 'rgba(8,8,24,1)' }}>
                {a.symbol.toUpperCase()} — {a.name}
              </option>
            ))}
          </select>
          {selectedAsset && (
            <div style={{ marginTop: 4, fontSize: 11, fontFamily: FONT_MONO, color: 'var(--zm-text-faint)' }}>
              Current: {formatPrice(selectedAsset.price)} · {formatChange(selectedAsset.change24h)}
            </div>
          )}
        </div>

        {/* Alert Type */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 10, fontFamily: FONT_MONO, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'block', color: 'var(--zm-text-faint)' }}>
            Alert Type
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {(Object.keys(ALERT_TYPE_CONFIG) as AlertType[]).map(t => {
              const cfg = ALERT_TYPE_CONFIG[t];
              const active = alertType === t;
              return (
                <button
                  key={t}
                  type="button"
                  onClick={() => setAlertType(t)}
                  aria-pressed={active}
                  aria-label={'Select alert type: ' + cfg.label}
                  style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, textAlign: 'left', transition: 'all 0.15s', cursor: 'pointer', background: active ? cfg.bg : 'rgba(255,255,255,0.03)', border: '1px solid ' + (active ? cfg.border : 'rgba(255,255,255,0.06)'), color: active ? cfg.color : 'var(--zm-text-secondary)', willChange: 'transform' }}
                >
                  <cfg.icon size={12} />
                  <span style={{ fontSize: 11, fontFamily: FONT_MONO }}>{cfg.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Target */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 10, fontFamily: FONT_MONO, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'block', color: 'var(--zm-text-faint)' }}>
            {isPercent ? 'Change % Target' : 'Price Target (USD)'}
          </label>
          <input
            type="number"
            value={target}
            onChange={e => setTarget(e.target.value)}
            placeholder={placeholder}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 14, fontFamily: FONT_MONO, outline: 'none', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(96,165,250,0.14)', color: 'var(--zm-text-primary)' }}
          />
          {error && (
            <div style={{ marginTop: 4, fontSize: 11, fontFamily: FONT_MONO, color: 'var(--zm-text-negative)' }}>{error}</div>
          )}
        </div>

        {/* Note */}
        <div style={{ marginBottom: 16 }}>
          <label style={{ fontSize: 10, fontFamily: FONT_MONO, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6, display: 'block', color: 'var(--zm-text-faint)' }}>
            Note (optional)
          </label>
          <input
            type="text"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="e.g. Resistance level, DCA point..."
            maxLength={80}
            style={{ width: '100%', padding: '8px 12px', borderRadius: 8, fontSize: 14, fontFamily: FONT_MONO, outline: 'none', boxSizing: 'border-box', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(96,165,250,0.14)', color: 'var(--zm-text-primary)' }}
          />
        </div>

        {/* Notification Options */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
          <button
            onClick={() => setSound(s => !s)}
            type="button"
            aria-pressed={sound}
            aria-label={sound ? 'Disable sound notification' : 'Enable sound notification'}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, flex: 1, transition: 'all 0.15s', cursor: 'pointer', background: sound ? 'rgba(96,165,250,0.10)' : 'rgba(255,255,255,0.03)', border: '1px solid ' + (sound ? 'rgba(96,165,250,0.25)' : 'rgba(255,255,255,0.06)'), color: sound ? 'rgba(96,165,250,1)' : 'var(--zm-text-faint)' }}
          >
            {sound ? <Volume2 size={13} /> : <VolumeX size={13} />}
            <span style={{ fontSize: 11, fontFamily: FONT_MONO }}>Sound</span>
          </button>
          <button
            onClick={() => setPush(p => !p)}
            type="button"
            aria-pressed={push}
            aria-label={push ? 'Disable push notification' : 'Enable push notification'}
            style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', borderRadius: 8, flex: 1, transition: 'all 0.15s', cursor: 'pointer', background: push ? 'rgba(167,139,250,0.10)' : 'rgba(255,255,255,0.03)', border: '1px solid ' + (push ? 'rgba(167,139,250,0.25)' : 'rgba(255,255,255,0.06)'), color: push ? 'rgba(167,139,250,1)' : 'var(--zm-text-faint)' }}
          >
            {push ? <Bell size={13} /> : <BellOff size={13} />}
            <span style={{ fontSize: 11, fontFamily: FONT_MONO }}>Push</span>
          </button>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          type="button"
          aria-label="Create new price alert"
          style={{ width: '100%', padding: '10px 0', borderRadius: 8, fontFamily: FONT_MONO, fontSize: 14, fontWeight: 600, transition: 'all 0.15s', cursor: 'pointer', background: 'rgba(96,165,250,0.18)', border: '1px solid rgba(96,165,250,0.30)', color: 'rgba(96,165,250,1)' }}
        >
          Set Alert
        </button>
      </div>
    </div>
  );
});
AddAlertForm.displayName = 'AddAlertForm';

// ─── Alert Card ───────────────────────────────────────────────────────────────

interface AlertCardProps {
  alert: PriceAlert;
  currentPrice?: number;
  currentChange?: number;
  onRemove: (id: string) => void;
  onTogglePause: (id: string) => void;
}

const AlertCard = memo(({ alert, currentPrice, currentChange, onRemove, onTogglePause }: AlertCardProps) => {
  const cfg = ALERT_TYPE_CONFIG[alert.type];
  const sCfg = STATUS_CONFIG[alert.status];
  const isPercent = alert.type === 'change_up' || alert.type === 'change_down';

  // Progress toward target
  const progress = useMemo(() => {
    if (!currentPrice && !currentChange) return null;
    if (isPercent && currentChange !== undefined) {
      const pct = Math.min(Math.abs(currentChange) / alert.target, 1);
      return { pct, current: currentChange };
    }
    if (!isPercent && currentPrice !== undefined) {
      const base = alert.type === 'above'
        ? Math.min(currentPrice / alert.target, 1)
        : Math.min(alert.target / currentPrice, 1);
      return { pct: Math.max(0, Math.min(base, 1)), current: currentPrice };
    }
    return null;
  }, [alert.type, alert.target, currentPrice, currentChange, isPercent]);

  const handleRemove = useCallback(() => onRemove(alert.id), [alert.id, onRemove]);
  const handlePause = useCallback(() => onTogglePause(alert.id), [alert.id, onTogglePause]);

  return (
    <div
      style={{ padding: 16, transition: 'all 0.15s', background: alert.status === 'triggered' ? cfg.bg : 'var(--zm-glass-bg)', border: '1px solid ' + (alert.status === 'triggered' ? cfg.border : 'var(--zm-glass-border)'), borderRadius: '12px', position: 'relative', opacity: alert.status === 'paused' ? 0.6 : 1, willChange: 'transform' }}
    >
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {alert.image && <img src={alert.image} alt="" style={{ width: 20, height: 20, borderRadius: '50%' }} />}
          <span style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, color: 'var(--zm-text-primary)' }}>
            {alert.symbol.toUpperCase()}
          </span>
          <div
                        style={{ display: 'flex', alignItems: 'center', gap: 4, borderRadius: 4, padding: '2px 6px', background: cfg.bg, border: '1px solid ' + cfg.border }}
          >
            <cfg.icon size={10} style={{ color: cfg.color }} />
            <span style={{ fontSize: 9, fontFamily: FONT_MONO, color: cfg.color }}>
              {cfg.label}
            </span>
          </div>
          <div
                        style={{ borderRadius: 4, padding: '2px 6px', background: sCfg.bg }}
          >
            <span style={{ fontSize: 9, fontFamily: FONT_MONO, color: sCfg.color }}>
              {sCfg.label}
            </span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
          {alert.sound && <Volume2 size={11} style={{ color: 'var(--zm-text-faint)' }} />}
          {alert.push && <Bell size={11} style={{ color: 'var(--zm-text-faint)' }} />}
          <button
            onClick={handlePause}
            type="button"
            style={{ padding: 4, borderRadius: 4, transition: 'color 0.15s,background 0.15s', cursor: 'pointer', background: 'transparent', border: 'none', color: 'var(--zm-text-faint)' }}
            aria-label={alert.status === 'paused' ? 'Resume alert' : 'Pause alert'}
          >
            {alert.status === 'paused'
              ? <Bell size={13} />
              : <BellOff size={13} />
            }
          </button>
          <button
            onClick={handleRemove}
            type="button"
            style={{ padding: 4, borderRadius: 4, transition: 'color 0.15s,background 0.15s', cursor: 'pointer', background: 'transparent', border: 'none', color: 'rgba(251,113,133,0.5)' }}
            aria-label="Remove alert"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Target */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 8 }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 18, fontWeight: 700, color: cfg.color }}>
          {isPercent ? formatChange(alert.target) : formatPrice(alert.target)}
        </span>
        {currentPrice !== undefined && !isPercent && (
          <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: 'var(--zm-text-secondary)' }}>
            now {formatPrice(currentPrice)}
          </span>
        )}
        {currentChange !== undefined && isPercent && (
          <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: 'var(--zm-text-secondary)' }}>
            now {formatChange(currentChange)}
          </span>
        )}
      </div>

      {/* Progress bar */}
      {progress !== null && alert.status === 'active' && (
        <div style={{ marginBottom: 8 }}>
          <div
                        style={{ height: 4, borderRadius: '50vw', overflow: 'hidden', background: 'rgba(255,255,255,0.06)' }}
          >
            <div
              style={{ height: '100%', borderRadius: '50vw', transition: 'all 0.5s', width: (progress.pct * 100).toFixed(1) + '%', background: cfg.color, willChange: 'width' }}
            />
          </div>
          <div style={{ fontSize: 9, fontFamily: FONT_MONO, marginTop: 2, color: 'var(--zm-text-faint)' }}>
            {(progress.pct * 100).toFixed(1) + '% toward target'}
          </div>
        </div>
      )}

      {/* Triggered info */}
      {alert.status === 'triggered' && alert.triggeredPrice !== undefined && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 4 }}>
          <CheckCircle2 size={11} style={{ color: cfg.color }} />
          <span style={{ fontSize: 10, fontFamily: FONT_MONO, color: 'var(--zm-text-secondary)' }}>
            {'Triggered at ' + formatPrice(alert.triggeredPrice) + ' · ' + new Date(alert.triggeredAt!).toLocaleTimeString()}
          </span>
        </div>
      )}

      {/* Note */}
      {alert.note && (
        <div style={{ fontSize: 10, fontFamily: FONT_MONO, marginTop: 4, color: 'var(--zm-text-faint)' }}>
          {alert.note}
        </div>
      )}
    </div>
  );
});
AlertCard.displayName = 'AlertCard';

// ─── Log Entry ────────────────────────────────────────────────────────────────

const LogEntry = memo(({ entry }: { entry: TriggeredLog }) => {
  const cfg = ALERT_TYPE_CONFIG[entry.type];
  return (
    <div
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', paddingTop: 8, paddingBottom: 8, borderColor: 'var(--zm-glass-border)' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {entry.image && <img src={entry.image} alt="" style={{ width: 16, height: 16, borderRadius: '50%' }} />}
        <span style={{ fontFamily: FONT_MONO, fontSize: 11, fontWeight: 600, color: 'var(--zm-text-primary)' }}>
          {entry.symbol.toUpperCase()}
        </span>
        <div
                    style={{ display: 'flex', alignItems: 'center', gap: 4, borderRadius: 4, padding: '2px 6px', background: cfg.bg }}
        >
          <cfg.icon size={9} style={{ color: cfg.color }} />
          <span style={{ fontSize: 9, fontFamily: FONT_MONO, color: cfg.color }}>{cfg.label}</span>
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: 'var(--zm-text-primary)' }}>
          {formatPrice(entry.triggeredPrice)}
        </div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: 'var(--zm-text-faint)' }}>
          {new Date(entry.triggeredAt).toLocaleString()}
        </div>
      </div>
    </div>
  );
});
LogEntry.displayName = 'LogEntry';

// ─── Toast Notification ───────────────────────────────────────────────────────

interface ToastItem {
  id: string;
  symbol: string;
  type: AlertType;
  price: number;
  target: number;
  ts: number;
}

const AlertToast = memo(({ toast, onDismiss }: { toast: ToastItem; onDismiss: (id: string) => void }) => {
  const cfg = ALERT_TYPE_CONFIG[toast.type];
  const isPercent = toast.type === 'change_up' || toast.type === 'change_down';

  const dismiss = useCallback(() => onDismiss(toast.id), [toast.id, onDismiss]);

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 16px', borderRadius: 12, background: 'rgba(8,8,24,0.97)', border: '1px solid ' + cfg.border, backdropFilter: 'blur(20px)', willChange: 'transform', minWidth: 280 }}
    >
      <div
                style={{ width: 32, height: 32, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, background: cfg.bg, border: '1px solid ' + cfg.border }}
      >
        <cfg.icon size={14} style={{ color: cfg.color }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, color: cfg.color }}>
          {cfg.label} — {toast.symbol.toUpperCase()}
        </div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 11, color: 'var(--zm-text-secondary)' }}>
          {isPercent
            ? formatChange(toast.price) + ' (target ' + formatChange(toast.target) + ')'
            : formatPrice(toast.price) + ' (target ' + formatPrice(toast.target) + ')'}
        </div>
      </div>
      <button onClick={dismiss} type="button" aria-label="Dismiss notification" style={{ color: 'var(--zm-text-faint)' }}>
        <X size={13} />
      </button>
    </div>
  );
});
AlertToast.displayName = 'AlertToast';

// ─── Main Page ────────────────────────────────────────────────────────────────

const Alerts = memo(() => {
  const { assets, wsStatus } = useCrypto();
  const { isMobile, isTablet } = useBreakpoint();
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const [showForm, setShowForm] = useState(false);
  const [tab, setTab] = useState<'alerts' | 'history'>('alerts');
  const [filterStatus, setFilterStatus] = useState<'all' | AlertStatus>('all');
  const [showLogAll, setShowLogAll] = useState(false);
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const idCounterRef = useRef(0);
  const mountedRef = useRef(true);

  // Load from localStorage on mount
  useEffect(() => {
    mountedRef.current = true;
    const saved = loadFromLS();
    if (saved) dispatch({ type: 'LOAD', state: saved });
    if ('Notification' in window) setPushPermission(Notification.permission);
    return () => { mountedRef.current = false; };
  }, []);

  // Save to localStorage on state change
  useEffect(() => {
    saveToLS(state);
  }, [state]);

  // Build asset lookup map
  const assetMap = useMemo(() => {
    const m = new Map<string, CryptoAsset>();
    for (const a of assets) {
      m.set(a.symbol.toLowerCase(), a);
    }
    return m;
  }, [assets]);

  // Dismiss toast
  const dismissToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  // Check alerts against live prices
  useEffect(() => {
    if (assets.length === 0) return;
    for (const alert of state.alerts) {
      if (alert.status !== 'active') continue;
      const asset = assetMap.get(alert.symbol.toLowerCase());
      if (!asset) continue;
      if (!checkAlert(alert, asset)) continue;

      // Fire!
      const price = alert.type === 'change_up' || alert.type === 'change_down'
        ? asset.change24h
        : asset.price;

      const logEntry: TriggeredLog = {
        id: genId(++idCounterRef.current),
        alertId: alert.id,
        symbol: alert.symbol,
        name: alert.name,
        image: alert.image,
        type: alert.type,
        target: alert.target,
        triggeredPrice: price,
        triggeredAt: Date.now(),
      };

      dispatch({ type: 'TRIGGER', id: alert.id, price, logEntry });

      if (alert.sound && state.soundEnabled) playAlertSound(alert.type);
      if (alert.push && state.pushEnabled) sendPushNotification(alert, price);

      // Show toast
      const toast: ToastItem = {
        id: logEntry.id,
        symbol: alert.symbol,
        type: alert.type,
        price,
        target: alert.target,
        ts: Date.now(),
      };
      setToasts(prev => [toast, ...prev].slice(0, 5));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets]);

  // Auto-dismiss toasts after 6s
  useEffect(() => {
    if (toasts.length === 0) return;
    const newest = toasts[0];
    const remaining = 6000 - (Date.now() - newest.ts);
    const t = setTimeout(() => {
      if (mountedRef.current) setToasts(prev => prev.slice(0, -1));
    }, Math.max(remaining, 1000));
    return () => clearTimeout(t);
  }, [toasts]);

  const handleAdd = useCallback((alert: PriceAlert) => {
    dispatch({ type: 'ADD', alert });
  }, []);

  const handleRemove = useCallback((id: string) => {
    dispatch({ type: 'REMOVE', id });
  }, []);

  const handleTogglePause = useCallback((id: string) => {
    dispatch({ type: 'TOGGLE_PAUSE', id });
  }, []);

  const handleToggleSound = useCallback(() => {
    dispatch({ type: 'TOGGLE_SOUND' });
  }, []);

  const handleTogglePush = useCallback(async () => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'default') {
      const perm = await Notification.requestPermission();
      setPushPermission(perm);
      if (perm === 'granted') dispatch({ type: 'TOGGLE_PUSH' });
    } else {
      dispatch({ type: 'TOGGLE_PUSH' });
    }
  }, []);

  // Filtered alerts
  const filteredAlerts = useMemo(() => {
    return state.alerts.filter(a =>
      filterStatus === 'all' ? true : a.status === filterStatus
    );
  }, [state.alerts, filterStatus]);

  const activeCount = useMemo(() => state.alerts.filter(a => a.status === 'active').length, [state.alerts]);
  const triggeredCount = useMemo(() => state.alerts.filter(a => a.status === 'triggered').length, [state.alerts]);

  const logToShow = showLogAll ? state.log : state.log.slice(0, 20);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Toast Container */}
      <div
                style={{ position: 'fixed', top: 16, right: 16, zIndex: 300, display: 'flex', flexDirection: 'column', gap: 8, willChange: 'transform' }}
      >
        {toasts.map(t => (
          <AlertToast key={t.id} toast={t} onDismiss={dismissToast} />
        ))}
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <h1 style={{ fontSize: 20, fontWeight: 700, fontFamily: FONT_MONO, margin: 0, background: 'linear-gradient(90deg, var(--zm-accent) 0%, var(--zm-violet) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>Alerts Center</h1>
          <div
                        style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 8px', borderRadius: 4, background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.2)' }}
          >
            <WsStatusDot status={wsStatus} />
            <span style={{ fontSize: 10, fontFamily: FONT_MONO, color: 'rgba(52,211,153,0.9)' }}>
              {wsStatus === 'connected' ? 'LIVE · Prices realtime' : wsStatus.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Global Controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            onClick={handleToggleSound}
            type="button"
            aria-pressed={state.soundEnabled}
            aria-label={state.soundEnabled ? 'Mute alert sounds' : 'Unmute alert sounds'}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, fontSize: 11, fontFamily: FONT_MONO, transition: 'all 0.15s', background: state.soundEnabled ? 'rgba(96,165,250,0.10)' : 'rgba(255,255,255,0.04)', border: '1px solid ' + (state.soundEnabled ? 'rgba(96,165,250,0.22)' : 'rgba(255,255,255,0.08)'), color: state.soundEnabled ? 'rgba(96,165,250,1)' : 'var(--zm-text-faint)' }}
          >
            {state.soundEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
            Sound
          </button>
          <button
            onClick={handleTogglePush}
            type="button"
            aria-pressed={state.pushEnabled}
            aria-label={state.pushEnabled ? 'Disable push notifications' : 'Enable push notifications'}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 8, fontSize: 11, fontFamily: FONT_MONO, transition: 'all 0.15s', background: state.pushEnabled ? 'rgba(167,139,250,0.10)' : 'rgba(255,255,255,0.04)', border: '1px solid ' + (state.pushEnabled ? 'rgba(167,139,250,0.22)' : 'rgba(255,255,255,0.08)'), color: state.pushEnabled ? 'rgba(167,139,250,1)' : 'var(--zm-text-faint)' }}
            title={pushPermission === 'denied' ? 'Push notifications blocked by browser' : ''}
          >
            {state.pushEnabled ? <Bell size={12} /> : <BellOff size={12} />}
            Push {pushPermission === 'denied' && '(blocked)'}
          </button>
          <button
            onClick={() => setShowForm(true)}
            type="button"
            disabled={state.alerts.length >= MAX_ALERTS}
            aria-label="Create new price alert"
            aria-disabled={state.alerts.length >= MAX_ALERTS}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '6px 16px', borderRadius: 8, fontSize: 11, fontFamily: FONT_MONO, fontWeight: 600, transition: 'all 0.15s', cursor: 'pointer', background: 'rgba(96,165,250,0.16)', border: '1px solid rgba(96,165,250,0.30)', color: 'rgba(96,165,250,1)', opacity: state.alerts.length >= MAX_ALERTS ? 0.5 : 1 }}
          >
            <Plus size={13} />
            New Alert
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)', gap: 12 }}>
        {[
          { label: 'Total Alerts', value: String(state.alerts.length), color: 'rgba(96,165,250,1)', icon: Bell },
          { label: 'Active', value: String(activeCount), color: 'rgba(52,211,153,1)', icon: Activity },
          { label: 'Triggered', value: String(triggeredCount), color: 'rgba(251,191,36,1)', icon: Zap },
          { label: 'History', value: String(state.log.length), color: 'rgba(167,139,250,1)', icon: History },
        ].map(s => (
          <div key={s.label} style={{ padding: 16, background: 'var(--zm-glass-bg)', border: '1px solid var(--zm-glass-border)', borderRadius: '12px', position: 'relative' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
              <span style={{ fontSize: 10, fontFamily: FONT_MONO, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--zm-text-faint)' }}>
                {s.label}
              </span>
              <s.icon size={13} style={{ color: s.color }} />
            </div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 24, fontWeight: 700, color: s.color }}>
              {s.value}
            </div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {(['alerts', 'history'] as const).map(t => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            aria-label={t === 'alerts' ? 'My Alerts tab' : 'Trigger History tab'}
            onClick={() => setTab(t)}
            style={{ padding: '6px 16px', borderRadius: 8, fontSize: 11, fontFamily: FONT_MONO, fontWeight: 600, textTransform: 'capitalize', transition: 'all 0.15s', cursor: 'pointer', background: tab === t ? 'rgba(96,165,250,0.12)' : 'rgba(255,255,255,0.03)', border: '1px solid ' + (tab === t ? 'rgba(96,165,250,0.25)' : 'rgba(255,255,255,0.06)'), color: tab === t ? 'rgba(96,165,250,1)' : 'var(--zm-text-faint)' }}
          >
            {t === 'alerts' ? 'My Alerts' : 'Trigger History'}
          </button>
        ))}
      </div>

      {/* Alerts Tab */}
      {tab === 'alerts' && (
        <div>
          {/* Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
            {(['all', 'active', 'triggered', 'paused'] as const).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setFilterStatus(f)}
                aria-pressed={filterStatus === f}
                aria-label={'Filter by ' + f + ' alerts'}
                style={{ padding: '4px 10px', borderRadius: 4, fontSize: 10, fontFamily: FONT_MONO, textTransform: 'capitalize', transition: 'all 0.15s', cursor: 'pointer', background: filterStatus === f ? 'rgba(96,165,250,0.10)' : 'transparent', border: '1px solid ' + (filterStatus === f ? 'rgba(96,165,250,0.22)' : 'rgba(255,255,255,0.06)'), color: filterStatus === f ? 'rgba(96,165,250,1)' : 'var(--zm-text-faint)' }}
              >
                {f}
              </button>
            ))}
          </div>

          {filteredAlerts.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', background: 'var(--zm-glass-bg)', border: '1px solid var(--zm-glass-border)', borderRadius: '12px', position: 'relative' }}>
              <Bell size={32} style={{ color: 'var(--zm-text-faint)', margin:'0 auto', marginBottom:12, display:'block' }} />
              <div style={{ fontFamily: FONT_MONO, fontSize: 14, color: 'var(--zm-text-secondary)' }}>
                {state.alerts.length === 0
                  ? 'Belum ada alert. Klik "New Alert" buat mulai!'
                  : 'Tidak ada alert dengan filter ini.'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2,1fr)' : 'repeat(3,1fr)', gap: 12 }}>
              {filteredAlerts.map(alert => {
                const asset = assetMap.get(alert.symbol.toLowerCase());
                return (
                  <AlertCard
                    key={alert.id}
                    alert={alert}
                    currentPrice={asset?.price}
                    currentChange={asset?.change24h}
                    onRemove={handleRemove}
                    onTogglePause={handleTogglePause}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {tab === 'history' && (
        <div style={{ padding: 16, background: 'var(--zm-glass-bg)', border: '1px solid var(--zm-glass-border)', borderRadius: '12px', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <h2 style={{ fontSize: 12, fontFamily: FONT_MONO, textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--zm-text-faint)' }}>
              Trigger History ({state.log.length})
            </h2>
            {state.log.length > 0 && (
              <button
                type="button"
                onClick={() => dispatch({ type: 'CLEAR_LOG' })}
                aria-label="Clear trigger history"
                                style={{ fontSize: 10, fontFamily: FONT_MONO, display: 'flex', alignItems: 'center', gap: 4, transition: 'color 0.15s', color: 'rgba(251,113,133,0.6)' }}
              >
                <Trash2 size={11} /> Clear All
              </button>
            )}
          </div>

          {state.log.length === 0 ? (
            <div style={{ textAlign: 'center', paddingTop: 40, paddingBottom: 40 }}>
              <History size={28} style={{ color: 'var(--zm-text-faint)', margin:'0 auto', marginBottom:8, display:'block' }} />
              <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: 'var(--zm-text-secondary)' }}>
                Belum ada alert yang triggered.
              </div>
            </div>
          ) : (
            <>
              {logToShow.map(entry => (
                <LogEntry key={entry.id} entry={entry} />
              ))}
              {state.log.length > 20 && (
                <button
                  type="button"
                  onClick={() => setShowLogAll(s => !s)}
                  aria-label={showLogAll ? 'Show fewer log entries' : 'Show all log entries'}
                                    style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 12, fontSize: 10, fontFamily: FONT_MONO, transition: 'color 0.15s,background 0.15s', color: 'var(--zm-text-faint)' }}
                >
                  {showLogAll ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                  {showLogAll ? 'Sembunyikan' : 'Lihat semua ' + state.log.length + ' entri'}
                </button>
              )}
            </>
          )}
        </div>
      )}

      {/* Add Alert Modal */}
      {showForm && (
        <AddAlertForm
          assets={assets}
          onAdd={handleAdd}
          onClose={() => setShowForm(false)}
          idCounter={++idCounterRef.current}
        />
      )}
    </div>
  );
});
Alerts.displayName = 'Alerts';

export default Alerts;
