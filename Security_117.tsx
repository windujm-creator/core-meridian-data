/**
 * Security.tsx — ZERØ MERIDIAN 2026 push117
 * push117: REAL DATA FIX — ganti api.example.com (FAKE) → GoPlus Security API (real)
 *   - Sebelumnya: fetch('https://api.example.com/security/events') — URL PALSU, selalu error
 *   - Sekarang: useTokenSecurity hook → GoPlus Security API (free, no key)
 *   - Scan 8 featured tokens otomatis: USDT, USDC, WBTC, LINK, UNI, AAVE, COMP, MKR
 *   - Honeypot detection, tax, ownership risk, mintable, proxy, blacklist flags
 *   - Risk score 0-100, level CRITICAL/HIGH/MEDIUM/LOW
 *   - Real-time contract security scanner (input address custom)
 * - React.memo + displayName ✓
 * - rgba() only ✓  Zero className ✓  Zero hex color ✓
 * - JetBrains Mono only ✓
 * - useCallback + useMemo ✓  mountedRef ✓
 */

import React, { memo, useCallback, useMemo, useState, useEffect, useRef } from 'react';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useTokenSecurity, FEATURED_TOKENS, type TokenSecurityResult } from '@/hooks/useTokenSecurity';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Constants ────────────────────────────────────────────────────────────────

const FONT = "'JetBrains Mono', monospace";

const C = Object.freeze({
  accent:       'rgba(0,238,255,1)',
  accentBg:     'rgba(0,238,255,0.08)',
  accentBorder: 'rgba(0,238,255,0.18)',
  positive:     'rgba(34,255,170,1)',
  positiveBg:   'rgba(34,255,170,0.08)',
  negative:     'rgba(255,68,136,1)',
  negativeBg:   'rgba(255,68,136,0.08)',
  warning:      'rgba(255,187,0,1)',
  warningBg:    'rgba(255,187,0,0.08)',
  orange:       'rgba(255,140,0,1)',
  orangeBg:     'rgba(255,140,0,0.08)',
  textPrimary:  'rgba(240,240,248,1)',
  textSecondary:'rgba(148,163,184,1)',
  textFaint:    'rgba(80,80,100,1)',
  bgBase:       'rgba(5,7,13,1)',
  cardBg:       'rgba(14,17,28,1)',
  glassBg:      'rgba(255,255,255,0.04)',
  glassBorder:  'rgba(255,255,255,0.06)',
  surface2:     'rgba(255,255,255,0.05)',
});

const RISK_COLORS = Object.freeze({
  LOW:      'rgba(34,255,170,1)',
  MEDIUM:   'rgba(255,187,0,1)',
  HIGH:     'rgba(255,140,0,1)',
  CRITICAL: 'rgba(255,68,136,1)',
});

const FILTERS = Object.freeze(['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const);
type FilterType = typeof FILTERS[number];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function riskColor(level: TokenSecurityResult['riskLevel']): string {
  return RISK_COLORS[level];
}

function riskBg(level: TokenSecurityResult['riskLevel']): string {
  return riskColor(level).replace('1)', '0.09)');
}

// ─── RiskBadge ───────────────────────────────────────────────────────────────

const RiskBadge = memo(({ level }: { level: TokenSecurityResult['riskLevel'] }) => {
  const col = riskColor(level);
  return (
    <span style={{
      fontFamily:    FONT,
      fontSize:      9,
      fontWeight:    700,
      letterSpacing: '0.10em',
      color:         col,
      background:    col.replace('1)', '0.12)'),
      border:        '1px solid ' + col.replace('1)', '0.25)'),
      borderRadius:  4,
      padding:       '2px 6px',
      textTransform: 'uppercase' as const,
      flexShrink:    0,
      display:       'inline-block',
    }}>{level}</span>
  );
});
RiskBadge.displayName = 'RiskBadge';

// ─── ScoreRing ───────────────────────────────────────────────────────────────

const ScoreRing = memo(({ score, level }: { score: number; level: TokenSecurityResult['riskLevel'] }) => {
  const col = riskColor(level);
  const r = 22;
  const circ = 2 * Math.PI * r;
  const dash = circ * (1 - score / 100);
  return (
    <svg width={56} height={56} style={{ flexShrink: 0 }}>
      <circle cx={28} cy={28} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={4} />
      <circle
        cx={28} cy={28} r={r}
        fill="none"
        stroke={col}
        strokeWidth={4}
        strokeDasharray={circ}
        strokeDashoffset={dash}
        strokeLinecap="round"
        transform="rotate(-90 28 28)"
        style={{ transition: 'stroke-dashoffset 0.5s ease' }}
      />
      <text x={28} y={33} textAnchor="middle" fontSize={12} fontWeight={700} fontFamily={FONT} fill={col}>{score}</text>
    </svg>
  );
});
ScoreRing.displayName = 'ScoreRing';

// ─── TokenCard ───────────────────────────────────────────────────────────────

interface TokenCardProps { result: TokenSecurityResult; label: string; }
const TokenCard = memo(({ result, label }: TokenCardProps) => {
  const [expanded, setExpanded] = useState(false);
  const toggle = useCallback(() => setExpanded(e => !e), []);
  const col = riskColor(result.riskLevel);

  const cardStyle = useMemo(() => ({
    background:   result.riskLevel === 'CRITICAL' ? C.negativeBg : result.riskLevel === 'HIGH' ? C.orangeBg : C.glassBg,
    border:       '1px solid ' + (result.riskLevel === 'LOW' ? C.glassBorder : col.replace('1)', '0.22)')),
    borderRadius: 10,
    padding:      16,
    cursor:       'pointer' as const,
    transition:   'background 0.2s ease',
  }), [result.riskLevel, col]);

  return (
    <div style={cardStyle} onClick={toggle} role="button" aria-expanded={expanded}>
      {/* Top row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: expanded ? 14 : 0 }}>
        <ScoreRing score={result.riskScore} level={result.riskLevel} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: C.textPrimary }}>{label}</span>
            <RiskBadge level={result.riskLevel} />
          </div>
          <span style={{ fontFamily: FONT, fontSize: 9, color: C.textFaint, display: 'block', wordBreak: 'break-all' as const }}>
            {result.contractAddress.slice(0, 18)}...
          </span>
        </div>
        <span style={{ fontFamily: FONT, fontSize: 10, color: C.textFaint, flexShrink: 0 }}>
          {expanded ? '▲' : '▼'}
        </span>
      </div>

      {/* Flags summary always visible */}
      {result.riskFlags.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 4, marginTop: expanded ? 0 : 8 }}>
          {result.riskFlags.slice(0, expanded ? undefined : 3).map(f => (
            <span key={f} style={{ fontFamily: FONT, fontSize: 8, color: col, background: col.replace('1)', '0.10)'), borderRadius: 3, padding: '1px 5px', letterSpacing: '0.06em' }}>
              {f}
            </span>
          ))}
          {!expanded && result.riskFlags.length > 3 && (
            <span style={{ fontFamily: FONT, fontSize: 8, color: C.textFaint }}>+{result.riskFlags.length - 3} more</span>
          )}
        </div>
      )}

      {/* Expanded details */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 8, marginTop: 12 }}>
              {[
                { label: 'Buy Tax',    value: (result.buyTax * 100).toFixed(1) + '%',  alert: result.buyTax > 0.1 },
                { label: 'Sell Tax',   value: (result.sellTax * 100).toFixed(1) + '%', alert: result.sellTax > 0.1 },
                { label: 'Holders',    value: result.holderCount.toLocaleString(),      alert: false },
                { label: 'Honeypot',   value: result.isHoneypot ? 'YES' : 'NO',        alert: result.isHoneypot },
                { label: 'Mintable',   value: result.isMintable ? 'YES' : 'NO',        alert: result.isMintable },
                { label: 'Open Source',value: result.isOpenSource ? 'YES' : 'NO',      alert: !result.isOpenSource },
              ].map(item => (
                <div key={item.label} style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 6, padding: '8px 10px' }}>
                  <div style={{ fontFamily: FONT, fontSize: 8, color: C.textFaint, letterSpacing: '0.10em', marginBottom: 4 }}>{item.label}</div>
                  <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: item.alert ? C.negative : C.positive }}>{item.value}</div>
                </div>
              ))}
            </div>
            {result.dexInfo.length > 0 && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontFamily: FONT, fontSize: 8, color: C.textFaint, letterSpacing: '0.12em', marginBottom: 6 }}>DEX LIQUIDITY</div>
                <div style={{ display: 'flex', flexWrap: 'wrap' as const, gap: 6 }}>
                  {result.dexInfo.slice(0, 4).map(d => (
                    <span key={d.name} style={{ fontFamily: FONT, fontSize: 9, color: C.accent, background: C.accentBg, borderRadius: 4, padding: '2px 8px' }}>
                      {d.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});
TokenCard.displayName = 'TokenCard';

// ─── ScanInput ───────────────────────────────────────────────────────────────

interface ScanInputProps { onScan: (addr: string, chainId: number) => void; scanning: boolean; }
const ScanInput = memo(({ onScan, scanning }: ScanInputProps) => {
  const [addr, setAddr] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const handleScan = useCallback(() => {
    const trimmed = addr.trim();
    if (trimmed.length === 42 && trimmed.startsWith('0x')) onScan(trimmed, 1);
  }, [addr, onScan]);

  const handleKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleScan();
  }, [handleScan]);

  return (
    <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
      <input
        ref={inputRef}
        value={addr}
        onChange={e => setAddr(e.target.value)}
        onKeyDown={handleKey}
        placeholder="0x... (Ethereum contract address)"
        style={{
          flex:         1,
          fontFamily:   FONT,
          fontSize:     11,
          color:        C.textPrimary,
          background:   C.glassBg,
          border:       '1px solid ' + C.glassBorder,
          borderRadius: 8,
          padding:      '10px 14px',
          outline:      'none',
        }}
        aria-label="Contract address to scan"
      />
      <button
        onClick={handleScan}
        disabled={scanning || addr.trim().length !== 42}
        style={{
          fontFamily:   FONT,
          fontSize:     10,
          fontWeight:   700,
          color:        scanning ? C.textFaint : C.bgBase,
          background:   scanning ? C.glassBg   : C.accent,
          border:       '1px solid ' + (scanning ? C.glassBorder : C.accent),
          borderRadius: 8,
          padding:      '10px 16px',
          cursor:       scanning ? 'not-allowed' : 'pointer',
          flexShrink:   0,
          letterSpacing:'0.06em',
          transition:   'all 0.15s ease',
        }}
        aria-label="Scan contract"
      >
        {scanning ? 'Scanning...' : '⚡ Scan'}
      </button>
    </div>
  );
});
ScanInput.displayName = 'ScanInput';

// ─── Security (Main) ──────────────────────────────────────────────────────────

const Security = memo(() => {
  const { isMobile, isTablet } = useBreakpoint();
  const [filter, setFilter] = useState<FilterType>('ALL');
  const { results, loading, error, scan, scanBatch } = useTokenSecurity();
  const mountedRef = useRef(true);

  // Auto-scan featured tokens on mount
  useEffect(() => {
    mountedRef.current = true;
    scanBatch(FEATURED_TOKENS.map(t => ({ address: t.address, chainId: t.chainId })));
    return () => { mountedRef.current = false; };
  }, [scanBatch]);

  // Filter results by risk level
  const filteredResults = useMemo(() => {
    const entries = Object.entries(results) as [string, TokenSecurityResult][];
    if (filter === 'ALL') return entries;
    return entries.filter(([, r]) => r.riskLevel === filter);
  }, [results, filter]);

  // Stats
  const stats = useMemo(() => {
    const all = Object.values(results);
    return {
      total:    all.length,
      critical: all.filter(r => r.riskLevel === 'CRITICAL').length,
      high:     all.filter(r => r.riskLevel === 'HIGH').length,
      medium:   all.filter(r => r.riskLevel === 'MEDIUM').length,
      low:      all.filter(r => r.riskLevel === 'LOW').length,
      avgScore: all.length ? Math.round(all.reduce((s, r) => s + r.riskScore, 0) / all.length) : 0,
    };
  }, [results]);

  const makeFilterStyle = useCallback((f: FilterType) => ({
    fontFamily:    FONT,
    fontSize:      10,
    fontWeight:    600 as const,
    letterSpacing: '0.08em',
    color:         f === filter ? C.bgBase : C.textFaint,
    background:    f === filter ? C.accent : 'transparent',
    border:        '1px solid ' + (f === filter ? C.accent : C.glassBorder),
    borderRadius:  6,
    padding:       '4px 10px',
    cursor:        'pointer' as const,
    transition:    'all 0.15s ease',
  }), [filter]);

  const pageStyle = useMemo(() => ({
    background:  C.bgBase,
    minHeight:   '100vh',
    color:       C.textPrimary,
    fontFamily:  FONT,
    padding:     isMobile ? '16px 12px' : '20px 16px',
  }), [isMobile]);

  const metricsGridCols = isMobile ? 'repeat(2,1fr)' : isTablet ? 'repeat(3,1fr)' : 'repeat(4,1fr)';

  // Label map: address → symbol label
  const labelMap = useMemo(() => {
    const m: Record<string, string> = {};
    FEATURED_TOKENS.forEach(t => { m[t.address.toLowerCase()] = t.label; });
    return m;
  }, []);

  const getLabelForResult = useCallback((addr: string): string => {
    return labelMap[addr.toLowerCase()] ?? addr.slice(0, 6) + '...' + addr.slice(-4);
  }, [labelMap]);

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, gap: 12 }}>
        <div>
          <h1 style={{ fontFamily: FONT, fontSize: isMobile ? 16 : 20, fontWeight: 700, letterSpacing: '0.06em', color: C.textPrimary, margin: 0 }}>
            Security
          </h1>
          <p style={{ fontFamily: FONT, fontSize: 9, letterSpacing: '0.18em', textTransform: 'uppercase' as const, color: C.textFaint, margin: '6px 0 0' }}>
            Contract scanner · GoPlus Security API · Real-time
          </p>
        </div>
        <button
          style={{ fontFamily: FONT, fontSize: 10, fontWeight: 600, color: C.accent, background: C.accentBg, border: '1px solid ' + C.accentBorder, borderRadius: 6, padding: '6px 12px', cursor: 'pointer', flexShrink: 0 }}
          onClick={() => scanBatch(FEATURED_TOKENS.map(t => ({ address: t.address, chainId: t.chainId })))}
          aria-label="Refresh security scan"
        >
          ↻ Rescan
        </button>
      </div>

      {/* Stats bar */}
      {stats.total > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: metricsGridCols, gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Scanned',  value: stats.total + ' tokens',      color: C.accent   },
            { label: 'Critical', value: stats.critical + ' tokens',   color: C.negative },
            { label: 'High Risk',value: stats.high + ' tokens',       color: C.orange   },
            { label: 'Avg Risk', value: 'Score ' + stats.avgScore,    color: stats.avgScore >= 70 ? C.negative : stats.avgScore >= 40 ? C.warning : C.positive },
          ].map(s => (
            <div key={s.label} style={{ background: s.color.replace('1)', '0.06)'), border: '1px solid ' + s.color.replace('1)', '0.18)'), borderRadius: 10, padding: '12px 14px' }}>
              <span style={{ fontFamily: FONT, fontSize: 8, letterSpacing: '0.14em', textTransform: 'uppercase' as const, color: s.color, display: 'block', marginBottom: 6 }}>{s.label}</span>
              <span style={{ fontFamily: FONT, fontSize: 16, fontWeight: 700, color: s.color }}>{s.value}</span>
            </div>
          ))}
        </div>
      )}

      {/* Scanner input */}
      <ScanInput onScan={scan} scanning={loading} />

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' as const }}>
        {FILTERS.map(f => (
          <button key={f} style={makeFilterStyle(f)} onClick={() => setFilter(f)}>{f}</button>
        ))}
      </div>

      {/* Loading */}
      {loading && Object.keys(results).length === 0 && (
        <div style={{ background: C.glassBg, border: '1px solid ' + C.glassBorder, borderRadius: 12, padding: '48px 24px', textAlign: 'center' as const }}>
          <div style={{ fontFamily: FONT, fontSize: 11, color: C.textFaint, letterSpacing: '0.08em' }}>
            Scanning {FEATURED_TOKENS.length} featured tokens via GoPlus Security API...
          </div>
          <div style={{ fontFamily: FONT, fontSize: 9, color: C.textFaint, marginTop: 8, opacity: 0.5 }}>
            Checking honeypot · tax · ownership · blacklist · proxy
          </div>
        </div>
      )}

      {/* Error */}
      {!loading && error && Object.keys(results).length === 0 && (
        <div style={{ background: C.negativeBg, border: '1px solid ' + C.negative.replace('1)', '0.3)'), borderRadius: 12, padding: '24px', textAlign: 'center' as const }}>
          <span style={{ fontFamily: FONT, fontSize: 12, color: C.negative }}>{error}</span>
        </div>
      )}

      {/* Results grid */}
      <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2,1fr)' : 'repeat(2,1fr)', gap: 12 }}>
        <AnimatePresence>
          {filteredResults.map(([addr, result]) => (
            <motion.div
              key={addr}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.97 }}
              transition={{ duration: 0.2 }}
            >
              <TokenCard result={result} label={getLabelForResult(addr)} />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Empty filtered */}
      {!loading && filteredResults.length === 0 && Object.keys(results).length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column' as const, alignItems: 'center', padding: '48px 24px', gap: 10 }}>
          <span style={{ fontSize: 28, opacity: 0.2 }}>🛡</span>
          <span style={{ fontFamily: FONT, fontSize: 12, color: C.textFaint }}>
            No {filter !== 'ALL' ? filter : ''} risk tokens found.
          </span>
        </div>
      )}

      {/* Source note */}
      <div style={{ marginTop: 24, fontFamily: FONT, fontSize: 9, color: C.textFaint, textAlign: 'center' as const, opacity: 0.5 }}>
        Data: GoPlus Security Labs API · Free tier · No API key required
      </div>
    </div>
  );
});
Security.displayName = 'Security';

export default Security;
