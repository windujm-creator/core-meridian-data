/**
 * Networks.tsx — ZERØ MERIDIAN 2026 push110
 * push110: Fix font — Space Grotesk → JetBrains Mono (standar wajib)
 * - React.memo + displayName ✓
 * - rgba() only ✓  Zero className ✓  Zero hex color ✓
 * - FONT = JetBrains Mono ONLY ✓
 * - useCallback + useMemo ✓
 */

import React, { memo, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNetworkStats, type ChainStats } from '@/hooks/useNetworkStats';
import { useBreakpoint } from '@/hooks/useBreakpoint';

const FONT = "'JetBrains Mono', monospace";

function fmtBlock(n: number): string {
  return n > 0 ? n.toLocaleString('en-US') : '—';
}
function fmtGas(g: number): string {
  return g > 0 ? g.toFixed(2) + ' Gwei' : '—';
}
function fmtLatency(ms: number): string {
  if (ms >= 9999) return '—';
  return ms + 'ms';
}

const StatusDot = React.memo(({ status }: { status: ChainStats['status'] }) => {
  const color =
    status === 'online'   ? 'rgba(52,211,153,1)'  :
    status === 'degraded' ? 'rgba(251,191,36,1)'  :
                            'rgba(251,113,133,1)';
  const shadow =
    status === 'online'   ? '0 0 6px rgba(52,211,153,0.7)'  :
    status === 'degraded' ? '0 0 6px rgba(251,191,36,0.7)'  :
                            '0 0 6px rgba(251,113,133,0.7)';
  return (
    <motion.div
      style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, boxShadow: shadow, flexShrink: 0 }}
      animate={status === 'online' ? { opacity: [1, 0.5, 1] } : {}}
      transition={{ duration: 2, repeat: Infinity }}
    />
  );
});
StatusDot.displayName = 'StatusDot';

const LatencyBar = React.memo(({ ms }: { ms: number }) => {
  const pct = ms >= 9999 ? 100 : Math.min(ms / 3000 * 100, 100);
  const color = ms < 500 ? 'rgba(52,211,153,1)' : ms < 1500 ? 'rgba(251,191,36,1)' : 'rgba(251,113,133,1)';
  return (
    <div style={{ width: '60px', height: '4px', borderRadius: '2px', background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
      <motion.div
        style={{ height: '100%', borderRadius: '2px', background: color }}
        initial={{ width: 0 }}
        animate={{ width: pct + '%' }}
        transition={{ duration: 0.6, ease: 'easeOut' }}
      />
    </div>
  );
});
LatencyBar.displayName = 'LatencyBar';

const ChainCard = React.memo(({ chain, isMobile }: { chain: ChainStats; isMobile: boolean }) => {
  const cardStyle = useMemo(() => Object.freeze({
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    borderRadius: '14px',
    padding: isMobile ? '12px' : '16px',
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    transition: 'border-color 0.2s',
  }), [isMobile]);

  const rowStyle = useMemo(() => Object.freeze({
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
  }), []);

  const nameStyle = useMemo(() => Object.freeze({
    fontFamily: FONT,
    fontSize: isMobile ? '12px' : '14px',
    fontWeight: 700,
    color: 'rgba(255,255,255,0.9)',
  }), [isMobile]);

  const symbolStyle = useMemo(() => Object.freeze({
    fontFamily: FONT,
    fontSize: '10px',
    color: chain.color,
    background: chain.color.replace('1)', '0.1)'),
    border: '1px solid ' + chain.color.replace('1)', '0.25)'),
    borderRadius: '4px',
    padding: '1px 6px',
    letterSpacing: '0.06em',
  }), [chain.color]);

  const statLabelStyle = useMemo(() => Object.freeze({
    fontFamily: FONT,
    fontSize: '9px',
    color: 'rgba(255,255,255,0.3)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase' as const,
  }), []);

  const statValStyle = useMemo(() => Object.freeze({
    fontFamily: FONT,
    fontSize: '12px',
    fontWeight: 600,
    color: 'rgba(255,255,255,0.8)',
    marginTop: '2px',
  }), []);

  const statusLabel = chain.status === 'online' ? 'ONLINE' : chain.status === 'degraded' ? 'SLOW' : 'OFFLINE';
  const statusColor = chain.status === 'online' ? 'rgba(52,211,153,0.8)' : chain.status === 'degraded' ? 'rgba(251,191,36,0.8)' : 'rgba(251,113,133,0.8)';

  return (
    <motion.div
      style={cardStyle}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ borderColor: chain.color.replace('1)', '0.3)') }}
    >
      {/* Header row */}
      <div style={rowStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <StatusDot status={chain.status} />
          <span style={nameStyle}>{chain.name}</span>
          <span style={symbolStyle}>{chain.symbol}</span>
        </div>
        <span style={{ fontFamily: FONT, fontSize: '10px', color: statusColor, fontWeight: 700 }}>
          {statusLabel}
        </span>
      </div>

      {/* Stats grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
        <div>
          <div style={statLabelStyle}>Block</div>
          <div style={statValStyle}>{fmtBlock(chain.blockNumber)}</div>
        </div>
        <div>
          <div style={statLabelStyle}>Gas</div>
          <div style={statValStyle}>{fmtGas(chain.gasPriceGwei)}</div>
        </div>
        <div>
          <div style={statLabelStyle}>TPS est.</div>
          <div style={{ ...statValStyle, color: chain.color }}>{chain.tpsEstimate}/s</div>
        </div>
      </div>

      {/* Latency bar */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', justifyContent: 'space-between' }}>
        <div>
          <div style={statLabelStyle}>Latency</div>
          <div style={{ marginTop: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <LatencyBar ms={chain.latencyMs} />
            <span style={{ fontFamily: FONT, fontSize: '11px', color: 'rgba(255,255,255,0.5)' }}>
              {fmtLatency(chain.latencyMs)}
            </span>
          </div>
        </div>
        <a
          href={chain.explorerUrl}
          target="_blank"
          rel="noopener noreferrer"
          style={{ fontFamily: FONT, fontSize: '10px', color: 'rgba(0,200,255,0.5)', textDecoration: 'none' }}
        >
          Explorer ↗
        </a>
      </div>
    </motion.div>
  );
});
ChainCard.displayName = 'ChainCard';

const SkeletonCard = React.memo(({ i }: { i: number }) => (
  <motion.div
    style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)', borderRadius: '14px', padding: '16px', height: '130px' }}
    animate={{ opacity: [0.3, 0.6, 0.3] }}
    transition={{ duration: 1.4, repeat: Infinity, delay: i * 0.1 }}
  />
));
SkeletonCard.displayName = 'SkeletonCard';

const SummaryBar = React.memo(({ chains }: { chains: ChainStats[] }) => {
  const online   = chains.filter(c => c.status === 'online').length;
  const degraded = chains.filter(c => c.status === 'degraded').length;
  const offline  = chains.filter(c => c.status === 'offline').length;

  const chipStyle = (color: string) => Object.freeze({
    display: 'flex', alignItems: 'center', gap: '6px',
    background: color.replace('1)', '0.06)'),
    border: '1px solid ' + color.replace('1)', '0.18)'),
    borderRadius: '10px', padding: '6px 12px',
    fontFamily: FONT,
    fontSize: '12px', color,
  });

  return (
    <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' as const }}>
      <div style={chipStyle('rgba(52,211,153,1)')}>
        <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(52,211,153,1)', display: 'inline-block' }} />
        {online} Online
      </div>
      {degraded > 0 && (
        <div style={chipStyle('rgba(251,191,36,1)')}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(251,191,36,1)', display: 'inline-block' }} />
          {degraded} Degraded
        </div>
      )}
      {offline > 0 && (
        <div style={chipStyle('rgba(251,113,133,1)')}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(251,113,133,1)', display: 'inline-block' }} />
          {offline} Offline
        </div>
      )}
      <div style={{ ...chipStyle('rgba(0,200,255,0.7)'), marginLeft: 'auto' }}>
        Public RPC · no key
      </div>
    </div>
  );
});
SummaryBar.displayName = 'SummaryBar';

const Networks: React.FC = () => {
  const { chains, loading, error, lastUpdated, refetch } = useNetworkStats();
  const { isMobile } = useBreakpoint();

  const lastUpdatedStr = useMemo(() =>
    lastUpdated ? new Date(lastUpdated).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : ''
  , [lastUpdated]);

  const gridStyle = useMemo(() => Object.freeze({
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '12px',
  }), [isMobile]);

  return (
    <div style={{ padding: isMobile ? '16px 12px' : '24px', maxWidth: '1100px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', flexWrap: 'wrap' as const, gap: '12px' }}>
        <h1 style={{ fontFamily: FONT, fontSize: isMobile ? '16px' : '20px', fontWeight: 700, color: 'rgba(255,255,255,0.9)', margin: 0 }}>
          🌐 Network Intelligence
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {lastUpdatedStr && (
            <span style={{ fontFamily: FONT, fontSize: '10px', color: 'rgba(255,255,255,0.25)' }}>
              {lastUpdatedStr}
            </span>
          )}
          <button onClick={refetch} style={{ padding: '7px 16px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'rgba(255,255,255,0.05)', color: 'rgba(255,255,255,0.6)', fontFamily: FONT, fontSize: '12px', cursor: 'pointer' }}>
            ↺ Refresh
          </button>
        </div>
      </div>

      {/* Summary bar */}
      {!loading && chains.length > 0 && <SummaryBar chains={chains} />}

      <AnimatePresence mode="wait">
        {loading && chains.length === 0 ? (
          <motion.div key="skel" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={gridStyle}>
            {Array.from({ length: 8 }, (_, i) => <SkeletonCard key={i} i={i} />)}
          </motion.div>
        ) : error ? (
          <motion.div key="err" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ padding: '32px 16px', textAlign: 'center' as const, fontFamily: FONT, fontSize: '14px', color: 'rgba(251,113,133,0.8)' }}>
            <div>⚠ {error}</div>
            <button onClick={refetch} style={{ marginTop: '12px', padding: '8px 20px', borderRadius: '8px', background: 'rgba(251,113,133,0.1)', border: '1px solid rgba(251,113,133,0.3)', color: 'rgba(251,113,133,0.9)', fontFamily: FONT, fontSize: '13px', cursor: 'pointer' }}>Retry</button>
          </motion.div>
        ) : (
          <motion.div key="data" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={gridStyle}>
            {chains.map((chain, i) => (
              <motion.div key={chain.id} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <ChainCard chain={chain} isMobile={isMobile} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Footer */}
      {!loading && chains.length > 0 && (
        <div style={{ marginTop: '16px', fontFamily: FONT, fontSize: '10px', color: 'rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(52,211,153,0.8)', display: 'inline-block' }} />
          Live · Public RPC · refresh 15s
        </div>
      )}
    </div>
  );
};

Networks.displayName = 'Networks';
export default memo(Networks);
