/**
 * AISignalTile.tsx — ZERØ MERIDIAN 2026 push111
 * AI Signal Layer visualization powered by TensorFlow.js (browser-native).
 * Shows: anomaly level, volatility, trend strength, prediction, RSI, MACD, Bollinger.
 * - React.memo + displayName ✓
 * - rgba() only ✓
 * - Zero template literals in JSX ✓
 * - Object.freeze() all static data ✓
 * - useCallback + useMemo ✓
 * - mountedRef ✓
 * - aria-label + role ✓
 * - will-change: transform ✓
 */

import { memo, useCallback, useMemo, useRef, useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import GlassCard from '@/components/shared/GlassCard';
import { useAISignal, type AnomalyLevel, type AISignalResult } from '@/hooks/useAISignal';
import { useCrypto } from '@/contexts/CryptoContext';

// ─── Static data ──────────────────────────────────────────────────────────────

const ANOMALY_CONFIG = Object.freeze({
  NONE:    { color: 'rgba(148,163,184,0.5)',  bg: 'rgba(148,163,184,0.06)', label: '◆ NONE' },
  LOW:     { color: 'rgba(52,211,153,0.8)',   bg: 'rgba(52,211,153,0.08)',  label: '▲ LOW' },
  MEDIUM:  { color: 'rgba(251,191,36,1)',     bg: 'rgba(251,191,36,0.08)',  label: '◈ MEDIUM' },
  HIGH:    { color: 'rgba(251,113,133,1)',    bg: 'rgba(251,113,133,0.08)', label: '⚠ HIGH' },
  EXTREME: { color: 'rgba(239,68,68,1)',      bg: 'rgba(239,68,68,0.12)',   label: '⚡ EXTREME' },
} as const);

const PREDICTION_CONFIG = Object.freeze({
  PUMP:     { color: 'rgba(52,211,153,1)',  bg: 'rgba(52,211,153,0.10)',  label: '▲ PUMP', icon: '↑' },
  DUMP:     { color: 'rgba(251,113,133,1)', bg: 'rgba(251,113,133,0.10)', label: '▼ DUMP', icon: '↓' },
  SIDEWAYS: { color: 'rgba(96,165,250,0.7)', bg: 'rgba(96,165,250,0.06)', label: '◆ SIDEWAYS', icon: '→' },
} as const);

const BAR_CONTAINER_STYLE = Object.freeze({
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '8px',
});

const CARD_STYLE = Object.freeze({
  padding: '16px',
  height: '100%',
  display: 'flex',
  flexDirection: 'column' as const,
  gap: '12px',
});

// ─── Sub components ───────────────────────────────────────────────────────────

interface MetricBarProps {
  label: string;
  value: number;   // 0–1
  color: string;
  unit?: string;
}

const MetricBar = memo(({ label, value, color, unit = '' }: MetricBarProps) => (
  <div>
    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', letterSpacing: '0.1em', color: 'rgba(148,163,184,0.5)' }}>
        {label}
      </span>
      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color }}>
        {(value * 100).toFixed(1) + (unit || '%')}
      </span>
    </div>
    <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
      <motion.div
        animate={{ width: (value * 100).toFixed(1) + '%' }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        style={{ height: '100%', background: color, willChange: 'width', borderRadius: '2px' }}
      />
    </div>
  </div>
));
MetricBar.displayName = 'MetricBar';

interface SignalGaugeProps {
  value: number;  // -1 to +1
}

const SignalGauge = memo(({ value }: SignalGaugeProps) => {
  const pct = ((value + 1) / 2) * 100;
  const color = value > 0.2 ? 'rgba(52,211,153,1)' : value < -0.2 ? 'rgba(251,113,133,1)' : 'rgba(96,165,250,0.7)';
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: 'rgba(148,163,184,0.5)', letterSpacing: '0.1em' }}>TREND STRENGTH</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '10px', color }}>
          {value > 0 ? '+' : ''}{(value * 100).toFixed(0)}
        </span>
      </div>
      <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', position: 'relative' }}>
        <div style={{ position: 'absolute', left: '50%', top: 0, bottom: 0, width: '1px', background: 'rgba(255,255,255,0.1)' }} />
        <motion.div
          animate={{ left: '50%', width: Math.abs(value) * 50 + '%', marginLeft: value < 0 ? '-' + Math.abs(value) * 50 + '%' : '0' }}
          transition={{ duration: 0.5 }}
          style={{ position: 'absolute', height: '100%', background: color, willChange: 'transform', borderRadius: '2px' }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '8px', color: 'rgba(251,113,133,0.4)' }}>BEAR</span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '8px', color: 'rgba(52,211,153,0.4)' }}>BULL</span>
      </div>
    </div>
  );
});
SignalGauge.displayName = 'SignalGauge';

// ─── Main component ───────────────────────────────────────────────────────────

interface AISignalTileProps {
  symbol?: string;
}

const AISignalTile = memo(({ symbol = 'BTC' }: AISignalTileProps) => {
  const { assets } = useCrypto();
  const { result, push, isReady } = useAISignal();
  const mountedRef  = useRef(true);
  const tickRef     = useRef(0);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Feed price data into AI signal
  useEffect(() => {
    if (!mountedRef.current || assets.length === 0) return;
    const asset = assets.find(a => a.symbol.toLowerCase() === symbol.toLowerCase());
    if (!asset) return;
    push({
      price:     asset.price,
      volume:    asset.volume24h,
      change:    asset.change24h,
      timestamp: Date.now(),
    });
    tickRef.current++;
  }, [assets, symbol, push]);

  const anomalyCfg    = useMemo(() => ANOMALY_CONFIG[result.anomalyLevel], [result.anomalyLevel]);
  const predictionCfg = useMemo(() => PREDICTION_CONFIG[result.prediction], [result.prediction]);

  const headerStyle = useMemo(() => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  }), []);

  const titleStyle = useMemo(() => ({
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '11px',
    letterSpacing: '0.14em',
    color: 'rgba(255,255,255,0.7)',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
  }), []);

  const anomalyBadgeStyle = useMemo(() => ({
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '9px',
    letterSpacing: '0.1em',
    color: anomalyCfg.color,
    background: anomalyCfg.bg,
    border: '1px solid ' + anomalyCfg.color.replace('1)', '0.25)').replace('0.8)', '0.25)'),
    borderRadius: '4px',
    padding: '2px 8px',
    willChange: 'transform',
  }), [anomalyCfg]);

  const predictionBoxStyle = useMemo(() => ({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    background: predictionCfg.bg,
    border: '1px solid ' + predictionCfg.color.replace('1)', '0.2)').replace('0.7)', '0.2)'),
    borderRadius: '8px',
    padding: '10px 14px',
    willChange: 'transform',
  }), [predictionCfg]);

  const featureGridStyle = useMemo(() => ({
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
  }), []);

  const featureBoxStyle = useMemo(() => ({
    background: 'rgba(255,255,255,0.025)',
    borderRadius: '6px',
    padding: '8px 10px',
    border: '1px solid rgba(255,255,255,0.04)',
  }), []);

  const backendBadgeStyle = useMemo(() => ({
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '8px',
    color: result.tfReady ? 'rgba(52,211,153,0.6)' : 'rgba(148,163,184,0.3)',
    letterSpacing: '0.08em',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    marginTop: 'auto',
  }), [result.tfReady]);

  return (
    <GlassCard style={CARD_STYLE}>

      {/* Header */}
      <div style={headerStyle}>
        <div style={titleStyle}>
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none" aria-hidden="true">
            <polygon points="5,1 9,8 1,8" stroke="rgba(167,139,250,0.8)" strokeWidth="1" fill="none" />
            <circle cx="5" cy="5" r="1.5" fill="rgba(167,139,250,0.8)" />
          </svg>
          AI SIGNAL · {symbol}
        </div>
        <motion.div
          key={result.anomalyLevel}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={anomalyBadgeStyle}
          aria-label={'Anomaly level: ' + result.anomalyLevel}
        >
          {anomalyCfg.label}
        </motion.div>
      </div>

      {/* Prediction */}
      <motion.div
        key={result.prediction}
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        style={predictionBoxStyle}
        role="status"
        aria-label={'Market prediction: ' + result.prediction}
      >
        <div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: 'rgba(148,163,184,0.4)', letterSpacing: '0.1em', marginBottom: '2px' }}>
            PREDICTION
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', fontWeight: 700, color: predictionCfg.color }}>
            {predictionCfg.icon} {predictionCfg.label}
          </div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '9px', color: 'rgba(148,163,184,0.4)', letterSpacing: '0.1em', marginBottom: '2px' }}>
            CONFIDENCE
          </div>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '14px', fontWeight: 700, color: predictionCfg.color }}>
            {(result.signalConfidence * 100).toFixed(0)}%
          </div>
        </div>
      </motion.div>

      {/* Trend Gauge */}
      <SignalGauge value={result.trendStrength} />

      {/* Metric Bars */}
      <div style={BAR_CONTAINER_STYLE}>
        <MetricBar
          label="ANOMALY SCORE"
          value={result.anomalyScore}
          color={anomalyCfg.color}
        />
        <MetricBar
          label="VOLATILITY"
          value={result.volatilityScore}
          color="rgba(251,191,36,0.8)"
        />
      </div>

      {/* Feature Grid */}
      <div style={featureGridStyle}>
        <div style={featureBoxStyle}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '8px', color: 'rgba(148,163,184,0.4)', letterSpacing: '0.08em', marginBottom: '3px' }}>RSI</div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: 700,
            color: result.features.rsi > 70 ? 'rgba(251,113,133,1)' : result.features.rsi < 30 ? 'rgba(52,211,153,1)' : 'rgba(96,165,250,0.9)',
          }}>
            {result.features.rsi.toFixed(1)}
          </div>
        </div>
        <div style={featureBoxStyle}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '8px', color: 'rgba(148,163,184,0.4)', letterSpacing: '0.08em', marginBottom: '3px' }}>MACD</div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: 700,
            color: result.features.macdSignal > 0 ? 'rgba(52,211,153,1)' : 'rgba(251,113,133,1)',
          }}>
            {result.features.macdSignal > 0 ? '+' : ''}{(result.features.macdSignal * 1000).toFixed(2)}
          </div>
        </div>
        <div style={featureBoxStyle}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '8px', color: 'rgba(148,163,184,0.4)', letterSpacing: '0.08em', marginBottom: '3px' }}>BB POS</div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: 700,
            color: result.features.bollingerPos > 0.8 ? 'rgba(251,113,133,1)' : result.features.bollingerPos < 0.2 ? 'rgba(52,211,153,1)' : 'rgba(96,165,250,0.9)',
          }}>
            {(result.features.bollingerPos * 100).toFixed(0)}%
          </div>
        </div>
        <div style={featureBoxStyle}>
          <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '8px', color: 'rgba(148,163,184,0.4)', letterSpacing: '0.08em', marginBottom: '3px' }}>VOL ANOM</div>
          <div style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: '13px', fontWeight: 700,
            color: result.features.volumeAnomaly > 0.5 ? 'rgba(251,191,36,1)' : 'rgba(148,163,184,0.7)',
          }}>
            {(result.features.volumeAnomaly * 100).toFixed(0)}%
          </div>
        </div>
      </div>

      {/* Backend badge */}
      <div style={backendBadgeStyle} aria-label={'AI backend: ' + (result.tfReady ? 'TensorFlow.js ' + result.backend : 'Pure JS fallback')}>
        <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: result.tfReady ? 'rgba(52,211,153,0.8)' : 'rgba(148,163,184,0.3)', display: 'inline-block' }} />
        {result.tfReady ? 'TF.js · ' + result.backend.toUpperCase() : 'Pure JS · ' + (isReady ? 'Ready' : 'Loading...')}
        {' · ' + tickRef.current + ' ticks'}
      </div>

    </GlassCard>
  );
});
AISignalTile.displayName = 'AISignalTile';

export default AISignalTile;
