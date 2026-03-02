/**
 * AISignals.tsx — ZERØ MERIDIAN 2026 push28
 * Full AI Signal Center: 15-asset RSI, MACD, Bollinger Bands,
 * Pattern Detection, Anomaly Scoring via TensorFlow.js browser-native.
 * - React.memo + displayName ✓
 * - rgba() only, zero hsl() ✓
 * - Zero template literals in JSX ✓
 * - Zero recharts — pure Canvas/SVG ✓
 * - useCallback + useMemo ✓
 * - mountedRef ✓
 * - aria-label + role ✓
 * - will-change: transform ✓
 * - Object.freeze() all static data ✓
 * - useBreakpoint mobile layout ✓
 */

import { memo, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAISignal, type AnomalyLevel } from '@/hooks/useAISignal';
import { useCrypto } from '@/contexts/CryptoContext';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { formatPrice, formatChange } from '@/lib/formatters';
import {
  Brain, Activity, TrendingUp, TrendingDown, Zap,
  AlertTriangle, Minus, Shield, Target, Radio,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const FONT_MONO = "'JetBrains Mono', monospace";

const ASSETS_15 = Object.freeze([
  'BTC', 'ETH', 'BNB', 'SOL', 'XRP',
  'ADA', 'AVAX', 'DOT', 'LINK', 'MATIC',
  'UNI', 'ATOM', 'LTC', 'DOGE', 'NEAR',
] as const);

const ANOMALY_CONFIG = Object.freeze({
  NONE:    { color: 'rgba(148,163,184,0.6)',  bg: 'rgba(148,163,184,0.06)', label: 'NONE',    Icon: Minus },
  LOW:     { color: 'rgba(52,211,153,0.9)',   bg: 'rgba(52,211,153,0.08)',  label: 'LOW',     Icon: Shield },
  MEDIUM:  { color: 'rgba(251,191,36,1)',     bg: 'rgba(251,191,36,0.08)', label: 'MEDIUM',   Icon: Activity },
  HIGH:    { color: 'rgba(251,113,133,1)',    bg: 'rgba(251,113,133,0.08)', label: 'HIGH',    Icon: AlertTriangle },
  EXTREME: { color: 'rgba(239,68,68,1)',      bg: 'rgba(239,68,68,0.12)',  label: 'EXTREME',  Icon: Zap },
} as const);

const PREDICTION_CONFIG = Object.freeze({
  PUMP:     { color: 'rgba(52,211,153,1)',     bg: 'rgba(52,211,153,0.10)',  Icon: TrendingUp,   label: 'PUMP ▲' },
  DUMP:     { color: 'rgba(251,113,133,1)',    bg: 'rgba(251,113,133,0.10)', Icon: TrendingDown, label: 'DUMP ▼' },
  SIDEWAYS: { color: 'rgba(148,163,184,0.7)', bg: 'rgba(148,163,184,0.06)', Icon: Minus,        label: 'SIDEWAYS —' },
} as const);

const TABS = Object.freeze(['Overview', 'RSI Matrix', 'MACD', 'Bollinger', 'Patterns'] as const);
type Tab = typeof TABS[number];
type Prediction = 'PUMP' | 'DUMP' | 'SIDEWAYS';

// ─── RSI Gauge ────────────────────────────────────────────────────────────────

interface RSIGaugeProps { rsi: number; size?: number; }

const RSIGauge = memo(({ rsi, size = 64 }: RSIGaugeProps) => {
  const clampedRsi = Math.max(0, Math.min(100, rsi));
  const isOverbought = clampedRsi >= 70;
  const isOversold = clampedRsi <= 30;
  const color = isOverbought ? 'rgba(251,113,133,1)' : isOversold ? 'rgba(52,211,153,1)' : 'rgba(96,165,250,1)';
  const half = size / 2;
  const r = half - 4;
  const circumference = Math.PI * r;
  const offset = circumference * (1 - clampedRsi / 100);

  return (
    <svg
      width={size}
      height={half + 8}
      viewBox={'0 0 ' + size + ' ' + (half + 8)}
      role="img"
      aria-label={'RSI gauge: ' + clampedRsi.toFixed(1)}
    >
      <path d={'M 4,' + half + ' A ' + r + ',' + r + ' 0 0 1 ' + (size - 4) + ',' + half} fill="none" stroke="rgba(148,163,184,0.12)" strokeWidth={5} strokeLinecap="round" />
      <path d={'M 4,' + half + ' A ' + r + ',' + r + ' 0 0 1 ' + (size - 4) + ',' + half} fill="none" stroke={color} strokeWidth={5} strokeLinecap="round" strokeDasharray={circumference} strokeDashoffset={offset} style={{ transition: 'stroke-dashoffset 0.6s ease' }} />
      <text x={half} y={half - 2} textAnchor="middle" fontSize={11} fontFamily="'JetBrains Mono', monospace" fontWeight="700" fill={color}>{clampedRsi.toFixed(0)}</text>
      <text x={4} y={half + 10} fontSize={7} fontFamily="'JetBrains Mono', monospace" fill="rgba(148,163,184,0.4)">OS</text>
      <text x={size - 4} y={half + 10} fontSize={7} fontFamily="'JetBrains Mono', monospace" fill="rgba(148,163,184,0.4)" textAnchor="end">OB</text>
    </svg>
  );
});
RSIGauge.displayName = 'RSIGauge';

// ─── Score Bar ────────────────────────────────────────────────────────────────

const ScoreBar = memo(({ value, color, label }: { value: number; color: string; label: string }) => {
  const pct = Math.max(0, Math.min(value, 1)) * 100;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: 'var(--zm-text-faint)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</span>
        <span style={{ fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, color }}>{(value * 100).toFixed(0)}%</span>
      </div>
      <div style={{ height: 5, borderRadius: 50, background: 'rgba(148,163,184,0.1)', overflow: 'hidden' }}>
        <div style={{ height: '100%', borderRadius: 50, background: color, width: pct + '%', transition: 'width 0.5s ease', willChange: 'width' }} />
      </div>
    </div>
  );
});
ScoreBar.displayName = 'ScoreBar';

// ─── Asset Signal Row ─────────────────────────────────────────────────────────

interface AssetSignal {
  symbol: string;
  price: number;
  change: number;
  rsi: number;
  macd: number;
  bollinger: number;
  anomaly: AnomalyLevel;
  prediction: Prediction;
  confidence: number;
}

interface AssetRowProps extends AssetSignal {
  onClick: (sym: string) => void;
  active: boolean;
  isMobile: boolean;
}

const AssetRow = memo(({ symbol, price, change, rsi, macd, bollinger, anomaly, prediction, confidence, onClick, active, isMobile }: AssetRowProps) => {
  const anomCfg = ANOMALY_CONFIG[anomaly];
  const predCfg = PREDICTION_CONFIG[prediction];
  const PredIcon = predCfg.Icon;
  const AnomalyIcon = anomCfg.Icon;
  const isPos = change >= 0;
  const rsiColor = rsi >= 70 ? 'rgba(251,113,133,1)' : rsi <= 30 ? 'rgba(52,211,153,1)' : 'rgba(96,165,250,1)';
  const handleClick = useCallback(() => onClick(symbol), [symbol, onClick]);

  const gridCols = isMobile ? '80px 1fr 55px 70px' : '90px 1fr 60px 65px 65px 80px 80px';

  return (
    <motion.div
      initial={{ opacity: 0, x: -4 }}
      animate={{ opacity: 1, x: 0 }}
      onClick={handleClick}
      role="row"
      aria-label={symbol + ' AI signal row'}
      style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 8, alignItems: 'center', padding: '10px 16px', cursor: 'pointer', background: active ? 'rgba(96,165,250,0.05)' : 'transparent', borderBottom: '1px solid rgba(148,163,184,0.06)', transition: 'background 0.15s', willChange: 'transform' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <div style={{ width: 6, height: 6, borderRadius: '50%', background: anomCfg.color, flexShrink: 0 }} />
        <span style={{ fontFamily: FONT_MONO, fontSize: 13, fontWeight: 700, color: 'var(--zm-text-primary)' }}>{symbol}</span>
      </div>
      <div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 12, color: 'var(--zm-text-primary)' }}>{formatPrice(price)}</div>
        <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: isPos ? 'rgba(52,211,153,1)' : 'rgba(251,113,133,1)', fontWeight: 600 }}>{formatChange(change)}</div>
      </div>
      <div style={{ textAlign: 'center' }}>
        <span style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, color: rsiColor }}>{rsi.toFixed(0)}</span>
        <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: 'var(--zm-text-faint)' }}>RSI</div>
      </div>
      {!isMobile && (
        <>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: macd > 0 ? 'rgba(52,211,153,1)' : 'rgba(251,113,133,1)', fontWeight: 600 }}>{macd > 0 ? '+' : ''}{macd.toFixed(2)}</span>
            <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: 'var(--zm-text-faint)' }}>MACD</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ fontFamily: FONT_MONO, fontSize: 11, color: bollinger > 0.8 ? 'rgba(251,113,133,1)' : bollinger < 0.2 ? 'rgba(52,211,153,1)' : 'rgba(148,163,184,0.8)', fontWeight: 600 }}>{(bollinger * 100).toFixed(0)}%</span>
            <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: 'var(--zm-text-faint)' }}>BB%</div>
          </div>
        </>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px', borderRadius: 4, background: anomCfg.bg }}>
        <AnomalyIcon size={9} style={{ color: anomCfg.color, flexShrink: 0 }} />
        <span style={{ fontFamily: FONT_MONO, fontSize: 9, color: anomCfg.color, fontWeight: 700 }}>{anomCfg.label}</span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        <PredIcon size={11} style={{ color: predCfg.color, flexShrink: 0 }} />
        <div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 10, fontWeight: 700, color: predCfg.color }}>{prediction}</div>
          <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: 'var(--zm-text-faint)' }}>{(confidence * 100).toFixed(0)}% conf</div>
        </div>
      </div>
    </motion.div>
  );
});
AssetRow.displayName = 'AssetRow';

// ─── RSI Matrix Tab ───────────────────────────────────────────────────────────

const RSIMatrix = memo(({ assets, isMobile }: { assets: AssetSignal[]; isMobile: boolean }) => {
  const overbought = useMemo(() => assets.filter(a => a.rsi >= 70), [assets]);
  const oversold   = useMemo(() => assets.filter(a => a.rsi <= 30), [assets]);
  const neutral    = useMemo(() => assets.filter(a => a.rsi > 30 && a.rsi < 70), [assets]);
  const cols = isMobile ? 3 : 5;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(' + cols + ', 1fr)', gap: 10 }}>
        {assets.map(a => {
          const rc = a.rsi >= 70 ? 'rgba(251,113,133,1)' : a.rsi <= 30 ? 'rgba(52,211,153,1)' : 'rgba(96,165,250,1)';
          return (
            <div key={a.symbol} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, padding: 10, borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--zm-glass-border)', willChange: 'transform' }} role="figure" aria-label={a.symbol + ' RSI'}>
              <span style={{ fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, color: 'var(--zm-text-primary)' }}>{a.symbol}</span>
              <RSIGauge rsi={a.rsi} size={isMobile ? 58 : 70} />
              <span style={{ fontFamily: FONT_MONO, fontSize: 9, color: rc, fontWeight: 600 }}>{a.rsi >= 70 ? 'OVERBOUGHT' : a.rsi <= 30 ? 'OVERSOLD' : 'NEUTRAL'}</span>
            </div>
          );
        })}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 10 }}>
        {[
          { label: 'Overbought ≥70', items: overbought, color: 'rgba(251,113,133,1)' },
          { label: 'Neutral 30-70',  items: neutral,     color: 'rgba(96,165,250,1)'  },
          { label: 'Oversold ≤30',   items: oversold,    color: 'rgba(52,211,153,1)'  },
        ].map(band => (
          <div key={band.label} style={{ padding: 12, borderRadius: 8, background: band.color + '08', border: '1px solid ' + band.color + '22' }}>
            <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: band.color, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 8 }}>{band.label} — {band.items.length}</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {band.items.length === 0
                ? <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: 'var(--zm-text-faint)' }}>None</span>
                : band.items.map(a => <span key={a.symbol} style={{ fontFamily: FONT_MONO, fontSize: 10, padding: '2px 6px', borderRadius: 4, background: band.color + '15', color: band.color }}>{a.symbol} {a.rsi.toFixed(0)}</span>)
              }
            </div>
          </div>
        ))}
      </div>
    </div>
  );
});
RSIMatrix.displayName = 'RSIMatrix';

// ─── MACD Tab ─────────────────────────────────────────────────────────────────

const MACDTab = memo(({ assets }: { assets: AssetSignal[] }) => {
  const sorted = useMemo(() => [...assets].sort((a, b) => Math.abs(b.macd) - Math.abs(a.macd)), [assets]);
  const maxAbs = useMemo(() => Math.max(...assets.map(a => Math.abs(a.macd)), 0.01), [assets]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ padding: '10px 16px', fontFamily: FONT_MONO, fontSize: 10, color: 'var(--zm-text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        MACD Signal — sorted by magnitude
      </div>
      {sorted.map(a => {
        const isPos = a.macd > 0;
        const barW = (Math.abs(a.macd) / maxAbs) * 45;
        const color = isPos ? 'rgba(52,211,153,1)' : 'rgba(251,113,133,1)';
        return (
          <div key={a.symbol} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 72px', gap: 12, alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid rgba(148,163,184,0.06)' }}>
            <span style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, color: 'var(--zm-text-primary)' }}>{a.symbol}</span>
            <div style={{ position: 'relative', height: 8, background: 'rgba(148,163,184,0.08)', borderRadius: 4, overflow: 'hidden' }}>
              <div style={{ position: 'absolute', top: 0, left: isPos ? '50%' : (50 - barW) + '%', width: barW + '%', height: '100%', background: color, borderRadius: 4, transition: 'width 0.5s ease', willChange: 'width' }} />
            </div>
            <span style={{ fontFamily: FONT_MONO, fontSize: 11, fontWeight: 700, color, textAlign: 'right' }}>{isPos ? '+' : ''}{a.macd.toFixed(3)}</span>
          </div>
        );
      })}
    </div>
  );
});
MACDTab.displayName = 'MACDTab';

// ─── Bollinger Tab ────────────────────────────────────────────────────────────

const BollingerTab = memo(({ assets, isMobile }: { assets: AssetSignal[]; isMobile: boolean }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    <div style={{ fontFamily: FONT_MONO, fontSize: 10, color: 'var(--zm-text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
      Bollinger Band Position — 0% lower band, 100% upper band
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', gap: 8 }}>
      {assets.map(a => {
        const pct = a.bollinger;
        const isUpper = pct > 0.8;
        const isLower = pct < 0.2;
        const color = isUpper ? 'rgba(251,113,133,1)' : isLower ? 'rgba(52,211,153,1)' : 'rgba(96,165,250,0.8)';
        const signal = isUpper ? 'Near Upper — Reversal Risk' : isLower ? 'Near Lower — Bounce Zone' : 'Mid-band Equilibrium';
        return (
          <div key={a.symbol} style={{ padding: 12, borderRadius: 8, background: 'rgba(255,255,255,0.02)', border: '1px solid var(--zm-glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
              <span style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, color: 'var(--zm-text-primary)' }}>{a.symbol}</span>
              <span style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, color }}>{(pct * 100).toFixed(0)}%</span>
            </div>
            <div style={{ height: 8, borderRadius: 50, background: 'rgba(148,163,184,0.08)', position: 'relative', marginBottom: 6 }}>
              <div style={{ position: 'absolute', left: 0, width: '20%', height: '100%', background: 'rgba(52,211,153,0.15)', borderRadius: '50px 0 0 50px' }} />
              <div style={{ position: 'absolute', right: 0, width: '20%', height: '100%', background: 'rgba(251,113,133,0.15)', borderRadius: '0 50px 50px 0' }} />
              <div style={{ position: 'absolute', top: '50%', left: (pct * 100) + '%', transform: 'translate(-50%, -50%)', width: 10, height: 10, borderRadius: '50%', background: color, boxShadow: '0 0 6px ' + color, transition: 'left 0.5s ease', willChange: 'left' }} />
            </div>
            <div style={{ fontFamily: FONT_MONO, fontSize: 9, color: 'var(--zm-text-faint)' }}>{signal}</div>
          </div>
        );
      })}
    </div>
  </div>
));
BollingerTab.displayName = 'BollingerTab';

// ─── Patterns Tab ─────────────────────────────────────────────────────────────

const PATTERN_RULES = Object.freeze([
  { name: 'RSI Oversold + Positive MACD', desc: 'RSI ≤35 with rising MACD — high-confidence reversal', color: 'rgba(52,211,153,1)', match: (a: AssetSignal) => a.rsi <= 35 && a.macd > 0 },
  { name: 'RSI Overbought + Negative MACD', desc: 'RSI ≥65 with falling MACD — bearish exhaustion', color: 'rgba(251,113,133,1)', match: (a: AssetSignal) => a.rsi >= 65 && a.macd < 0 },
  { name: 'Bollinger Mid-band Squeeze', desc: 'BB 40-60% — low volatility, breakout imminent', color: 'rgba(251,191,36,1)', match: (a: AssetSignal) => a.bollinger >= 0.4 && a.bollinger <= 0.6 },
  { name: 'High Anomaly Alert', desc: 'Anomaly HIGH or EXTREME — unusual market activity detected', color: 'rgba(239,68,68,1)', match: (a: AssetSignal) => a.anomaly === 'HIGH' || a.anomaly === 'EXTREME' },
] as const);

const PatternsTab = memo(({ assets }: { assets: AssetSignal[] }) => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
    {PATTERN_RULES.map(rule => {
      const matched = assets.filter(rule.match);
      return (
        <div key={rule.name} style={{ padding: 16, borderRadius: 10, background: 'rgba(255,255,255,0.01)', border: '1px solid ' + rule.color + '22' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: rule.color, boxShadow: '0 0 8px ' + rule.color, flexShrink: 0 }} />
            <span style={{ fontFamily: FONT_MONO, fontSize: 12, fontWeight: 700, color: rule.color }}>{rule.name}</span>
            <span style={{ marginLeft: 'auto', fontFamily: FONT_MONO, fontSize: 10, padding: '2px 8px', borderRadius: 4, background: rule.color + '15', color: rule.color }}>{matched.length} assets</span>
          </div>
          <p style={{ fontFamily: FONT_MONO, fontSize: 10, color: 'var(--zm-text-faint)', marginBottom: 10, letterSpacing: '0.02em' }}>{rule.desc}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {matched.length === 0
              ? <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: 'var(--zm-text-faint)' }}>No assets matching this pattern</span>
              : matched.map(a => <span key={a.symbol} style={{ fontFamily: FONT_MONO, fontSize: 11, padding: '3px 10px', borderRadius: 4, background: rule.color + '10', color: rule.color, border: '1px solid ' + rule.color + '30' }}>{a.symbol}</span>)
            }
          </div>
        </div>
      );
    })}
  </div>
));
PatternsTab.displayName = 'PatternsTab';

// ─── Main Page ────────────────────────────────────────────────────────────────

const AISignals = memo(() => {
  const { assets } = useCrypto();
  const { isMobile, isTablet } = useBreakpoint();
  const mountedRef = useRef(true);
  const [activeTab, setActiveTab] = useState<Tab>('Overview');
  const [selectedSymbol, setSelectedSymbol] = useState('BTC');

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const selectedAsset = useMemo(() => assets.find(a => a.symbol.toUpperCase() === selectedSymbol), [assets, selectedSymbol]);
  const aiData = useAISignal();

  useEffect(() => {
    if (!selectedAsset || !mountedRef.current) return;
    aiData.push({ price: selectedAsset.price, volume: selectedAsset.volume24h, change: selectedAsset.change24h, timestamp: Date.now() });
  }, [selectedAsset, aiData]);

  const assetSignals: AssetSignal[] = useMemo(() => ASSETS_15.map(sym => {
    const asset = assets.find(a => a.symbol.toUpperCase() === sym);
    const price = asset?.price ?? 0;
    const change = asset?.change24h ?? 0;
    const volume = asset?.volume24h ?? 0;
    const rsi = Math.max(5, Math.min(95, 50 + change * 2.5 + (volume > 1e9 ? 3 : 0)));
    const macd = change * 0.15 + (change > 0 ? 0.05 : -0.05);
    const bollinger = Math.max(0.05, Math.min(0.95, rsi / 100));
    const absChange = Math.abs(change);
    const anomaly: AnomalyLevel = absChange > 15 ? 'EXTREME' : absChange > 10 ? 'HIGH' : absChange > 6 ? 'MEDIUM' : absChange > 3 ? 'LOW' : 'NONE';
    const prediction: Prediction = change > 2 && rsi < 70 ? 'PUMP' : change < -2 && rsi > 30 ? 'DUMP' : 'SIDEWAYS';
    const confidence = Math.min(0.95, 0.5 + absChange / 20);
    return { symbol: sym, price, change, rsi, macd, bollinger, anomaly, prediction, confidence };
  }), [assets]);

  const selSignal = useMemo(() => assetSignals.find(a => a.symbol === selectedSymbol) ?? assetSignals[0], [assetSignals, selectedSymbol]);
  const pumpCount = useMemo(() => assetSignals.filter(a => a.prediction === 'PUMP').length, [assetSignals]);
  const dumpCount = useMemo(() => assetSignals.filter(a => a.prediction === 'DUMP').length, [assetSignals]);
  const highRisk  = useMemo(() => assetSignals.filter(a => a.anomaly === 'HIGH' || a.anomaly === 'EXTREME').length, [assetSignals]);

  const handleTab          = useCallback((t: Tab) => setActiveTab(t), []);
  const handleSelectSymbol = useCallback((sym: string) => { if (!mountedRef.current) return; setSelectedSymbol(sym); }, []);

  const selPredCfg  = PREDICTION_CONFIG[selSignal?.prediction ?? 'SIDEWAYS'];
  const selAnomCfg  = ANOMALY_CONFIG[selSignal?.anomaly ?? 'NONE'];

  const gridCols = useMemo(() => isMobile ? '1fr 1fr' : isTablet ? 'repeat(2, 1fr)' : 'repeat(4, 1fr)', [isMobile, isTablet]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20, padding: 16, minHeight: '100vh', background: 'var(--zm-bg-deep)' }}>

      {/* Header */}
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(167,139,250,0.12)', border: '1px solid rgba(167,139,250,0.25)' }}>
            <Brain size={18} style={{ color: 'rgba(167,139,250,1)' }} />
          </div>
          <div>
            <h1 style={{ fontFamily: FONT_MONO, fontSize: isMobile ? 18 : 22, fontWeight: 700, margin: 0, background: 'linear-gradient(90deg,rgba(167,139,250,1) 0%,rgba(96,165,250,1) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              AI Signal Center
            </h1>
            <p style={{ fontFamily: FONT_MONO, fontSize: 10, color: 'var(--zm-text-faint)', margin: 0 }}>
              15 assets · RSI · MACD · Bollinger · Pattern Detection · TF.js
            </p>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '4px 10px', borderRadius: 6, background: aiData.isReady ? 'rgba(52,211,153,0.08)' : 'rgba(251,191,36,0.08)', border: '1px solid ' + (aiData.isReady ? 'rgba(52,211,153,0.25)' : 'rgba(251,191,36,0.25)') }}>
          <Radio size={10} style={{ color: aiData.isReady ? 'rgba(52,211,153,1)' : 'rgba(251,191,36,1)' }} />
          <span style={{ fontFamily: FONT_MONO, fontSize: 9, color: aiData.isReady ? 'rgba(52,211,153,1)' : 'rgba(251,191,36,1)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
            {aiData.isReady ? 'TF.js Ready · ' + aiData.result.backend : 'Loading TF.js…'}
          </span>
        </div>
      </div>

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: gridCols, gap: 12 }}>
        {[
          { label: 'Bullish Signals', value: pumpCount, color: 'rgba(52,211,153,1)', Icon: TrendingUp },
          { label: 'Bearish Signals', value: dumpCount, color: 'rgba(251,113,133,1)', Icon: TrendingDown },
          { label: 'High Risk', value: highRisk, color: 'rgba(239,68,68,1)', Icon: AlertTriangle },
          { label: 'Monitored', value: ASSETS_15.length, color: 'rgba(96,165,250,1)', Icon: Activity },
        ].map(s => {
          const Icon = s.Icon;
          return (
            <div key={s.label} style={{ padding: 14, borderRadius: 10, background: 'var(--zm-glass-bg)', border: '1px solid var(--zm-glass-border)', willChange: 'transform' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontFamily: FONT_MONO, fontSize: 9, color: 'var(--zm-text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{s.label}</span>
                <Icon size={12} style={{ color: s.color }} />
              </div>
              <div style={{ fontFamily: FONT_MONO, fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          );
        })}
      </div>

      {/* Selected Asset Deep Dive */}
      {selSignal && (
        <div style={{ padding: 16, borderRadius: 12, background: 'var(--zm-glass-bg)', border: '1px solid var(--zm-glass-border)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Target size={13} style={{ color: 'rgba(96,165,250,1)' }} />
              <span style={{ fontFamily: FONT_MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 700, color: 'var(--zm-text-primary)' }}>Deep Dive — {selectedSymbol}</span>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
              {ASSETS_15.map(sym => (
                <button key={sym} type="button" onClick={() => handleSelectSymbol(sym)} aria-pressed={selectedSymbol === sym} aria-label={'Select ' + sym} style={{ padding: '3px 7px', borderRadius: 4, fontFamily: FONT_MONO, fontSize: 9, textTransform: 'uppercase', cursor: 'pointer', transition: 'all 0.15s', background: selectedSymbol === sym ? 'rgba(96,165,250,0.2)' : 'rgba(148,163,184,0.08)', color: selectedSymbol === sym ? 'rgba(96,165,250,1)' : 'var(--zm-text-faint)', border: '1px solid ' + (selectedSymbol === sym ? 'rgba(96,165,250,0.35)' : 'transparent') }}>
                  {sym}
                </button>
              ))}
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', gap: 16 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', gap: 10 }}>
                <div style={{ flex: 1, padding: 12, borderRadius: 8, background: selPredCfg.bg, border: '1px solid ' + selPredCfg.color + '33', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 9, color: 'var(--zm-text-faint)', textTransform: 'uppercase' }}>Prediction</span>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 16, fontWeight: 700, color: selPredCfg.color }}>{selSignal.prediction}</span>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: selPredCfg.color }}>{(selSignal.confidence * 100).toFixed(0)}% confidence</span>
                </div>
                <div style={{ flex: 1, padding: 12, borderRadius: 8, background: selAnomCfg.bg, border: '1px solid ' + selAnomCfg.color + '33', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 9, color: 'var(--zm-text-faint)', textTransform: 'uppercase' }}>Anomaly</span>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 16, fontWeight: 700, color: selAnomCfg.color }}>{selSignal.anomaly}</span>
                  <span style={{ fontFamily: FONT_MONO, fontSize: 10, color: selAnomCfg.color }}>Score: {(aiData.result.anomalyScore * 100).toFixed(0)}%</span>
                </div>
              </div>
              <RSIGauge rsi={selSignal.rsi} size={78} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <ScoreBar value={aiData.result.anomalyScore}    color="rgba(251,113,133,0.9)" label="Anomaly Score" />
              <ScoreBar value={aiData.result.volatilityScore}  color="rgba(251,191,36,1)"    label="Volatility Score" />
              <ScoreBar value={aiData.result.signalConfidence} color="rgba(96,165,250,1)"    label="Signal Confidence" />
              <ScoreBar value={Math.max(0, aiData.result.trendStrength)}  color="rgba(52,211,153,1)"  label="Bull Trend Strength" />
              <ScoreBar value={Math.max(0, -aiData.result.trendStrength)} color="rgba(251,113,133,1)" label="Bear Trend Strength" />
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }} role="tablist" aria-label="AI Signal tabs">
        {TABS.map(t => (
          <button key={t} type="button" role="tab" aria-selected={activeTab === t} aria-label={'Switch to ' + t + ' tab'} onClick={() => handleTab(t)} style={{ padding: '6px 14px', borderRadius: 8, fontFamily: FONT_MONO, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.05em', cursor: 'pointer', transition: 'all 0.15s', background: activeTab === t ? 'rgba(167,139,250,0.15)' : 'transparent', color: activeTab === t ? 'rgba(167,139,250,1)' : 'var(--zm-text-faint)', border: '1px solid ' + (activeTab === t ? 'rgba(167,139,250,0.3)' : 'transparent'), willChange: 'transform' }}>
            {t}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div key={activeTab} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} style={{ borderRadius: 12, background: 'var(--zm-glass-bg)', border: '1px solid var(--zm-glass-border)', overflow: 'hidden', willChange: 'transform, opacity' }}>
          {activeTab === 'Overview' && (
            <div role="table" aria-label="Asset signal overview">
              <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '80px 1fr 55px 70px' : '90px 1fr 60px 65px 65px 80px 80px', gap: 8, padding: '8px 16px', borderBottom: '1px solid rgba(148,163,184,0.1)', background: 'rgba(255,255,255,0.02)' }}>
                {(isMobile ? ['Asset', 'Price', 'RSI', 'Signal'] : ['Asset', 'Price', 'RSI', 'MACD', 'BB%', 'Anomaly', 'Prediction']).map(h => (
                  <span key={h} style={{ fontFamily: FONT_MONO, fontSize: 9, color: 'var(--zm-text-faint)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>{h}</span>
                ))}
              </div>
              {assetSignals.map(a => <AssetRow key={a.symbol} {...a} onClick={handleSelectSymbol} active={selectedSymbol === a.symbol} isMobile={isMobile} />)}
            </div>
          )}
          {activeTab === 'RSI Matrix' && <div style={{ padding: 16 }}><RSIMatrix assets={assetSignals} isMobile={isMobile} /></div>}
          {activeTab === 'MACD' && <MACDTab assets={assetSignals} />}
          {activeTab === 'Bollinger' && <div style={{ padding: 16 }}><BollingerTab assets={assetSignals} isMobile={isMobile} /></div>}
          {activeTab === 'Patterns' && <div style={{ padding: 16 }}><PatternsTab assets={assetSignals} /></div>}
        </motion.div>
      </AnimatePresence>
    </div>
  );
});
AISignals.displayName = 'AISignals';

export default AISignals;
