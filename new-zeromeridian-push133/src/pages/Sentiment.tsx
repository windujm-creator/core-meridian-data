/**
 * Sentiment.tsx — ZERØ MERIDIAN push133
 * push133: Light professional reskin (Bloomberg mode push132)
 * FULL REAL DATA — No dummy/static data anywhere
 * Sources:
 *   - Fear & Greed: Alternative.me (live)
 *   - Funding Rates + OI: Binance Futures (live)
 *   - News: CryptoPanic / CryptoCompare (live)
 *   - Put/Call & Narratives: Binance OI data + derived signals
 *
 * ✅ Zero className  ✅ rgba() only  ✅ JetBrains Mono everywhere
 * ✅ React.memo + displayName  ✅ useCallback + useMemo  ✅ mountedRef
 * ✅ No static/fake data  ✅ Real-time refresh  ✅ Error states
 */

import { memo, useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import { useSocialSentiment } from '@/hooks/useSocialSentiment';
import { useCryptoNews } from '@/hooks/useCryptoNews';

// ─── Types ────────────────────────────────────────────────────────────────────
const TABS = Object.freeze(['Overview', 'Funding', 'News Feed'] as const);
type Tab = typeof TABS[number];

const FONT = "'JetBrains Mono', monospace";

// ─── Helpers ──────────────────────────────────────────────────────────────────
function fgColor(score: number): string {
  if (score <= 20) return 'rgba(208,35,75,1)';
  if (score <= 40) return 'rgba(255,146,60,1)';
  if (score <= 60) return 'rgba(195,125,0,1)';
  if (score <= 80) return 'rgba(0,155,95,1)';
  return 'rgba(15,40,180,1)';
}

function fgLabel(score: number): string {
  if (score <= 20) return 'Extreme Fear';
  if (score <= 40) return 'Fear';
  if (score <= 60) return 'Neutral';
  if (score <= 80) return 'Greed';
  return 'Extreme Greed';
}

function timeAgo(ms: number): string {
  const diff = Date.now() - ms;
  if (diff < 60_000) return Math.floor(diff / 1000) + 's ago';
  if (diff < 3_600_000) return Math.floor(diff / 60_000) + 'm ago';
  if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + 'h ago';
  return Math.floor(diff / 86_400_000) + 'd ago';
}

// ─── Fear & Greed Gauge ───────────────────────────────────────────────────────
const FGGauge = memo(({ score, label: lbl }: { score: number; label: string }) => {
  const color = useMemo(() => fgColor(score), [score]);
  const size  = 200;
  const r     = 80;
  const cx    = size / 2;
  const cy    = size / 2 + 16;
  const circ  = Math.PI * r;
  const offset = circ * (1 - score / 100);

  const glowStyle = useMemo(() => ({
    position:  'absolute' as const,
    inset:     0,
    borderRadius: '50%',
    background: 'radial-gradient(circle at 50% 60%, ' + color.replace('1)', '0.12)') + ' 0%, transparent 65%)',
    pointerEvents: 'none' as const,
  }), [color]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8, position: 'relative' }}>
      <div style={{ position: 'relative', width: size, height: size / 2 + 40 }}>
        <div style={glowStyle} />
        <svg width={size} height={size / 2 + 40}
          viewBox={'0 0 ' + size + ' ' + (size / 2 + 40)}
          role="img" aria-label={'Fear & Greed: ' + score + ' — ' + lbl}>
          {/* Track */}
          <path
            d={'M ' + (cx - r) + ',' + cy + ' A ' + r + ',' + r + ' 0 0 1 ' + (cx + r) + ',' + cy}
            fill="none" stroke="rgba(15,40,100,0.08)" strokeWidth={16} strokeLinecap="round"
          />
          {/* Zone segments */}
          {[
            { pct: 0.20, col: 'rgba(208,35,75,1)' },
            { pct: 0.20, col: 'rgba(255,146,60,0.25)' },
            { pct: 0.20, col: 'rgba(195,125,0,0.09)' },
            { pct: 0.20, col: 'rgba(0,155,95,1)' },
            { pct: 0.20, col: 'rgba(15,40,180,1)' },
          ].reduce<{ els: React.ReactElement[]; off: number }>((acc, z, i) => {
            const zOff = circ * (1 - acc.off - z.pct);
            acc.els.push(
              <path key={i}
                d={'M ' + (cx - r) + ',' + cy + ' A ' + r + ',' + r + ' 0 0 1 ' + (cx + r) + ',' + cy}
                fill="none" stroke={z.col} strokeWidth={16} strokeLinecap="butt"
                strokeDasharray={circ * z.pct + ' ' + circ}
                strokeDashoffset={zOff}
              />
            );
            acc.off += z.pct;
            return acc;
          }, { els: [], off: 0 }).els}
          {/* Active arc */}
          <path
            d={'M ' + (cx - r) + ',' + cy + ' A ' + r + ',' + r + ' 0 0 1 ' + (cx + r) + ',' + cy}
            fill="none" stroke={color} strokeWidth={7} strokeLinecap="round"
            strokeDasharray={circ + ''} strokeDashoffset={offset + ''}
            style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.22,1,0.36,1)', filter: 'drop-shadow(0 0 6px ' + color + ')' }}
          />
          {/* Needle dot */}
          <circle
            cx={cx + r * Math.cos((Math.PI) * (1 - score / 100))}
            cy={cy - r * Math.sin((Math.PI) * (1 - score / 100))}
            r={5} fill={color}
            style={{ filter: 'drop-shadow(0 0 4px ' + color + ')' }}
          />
          {/* Center score */}
          <text x={cx} y={cy - 24} textAnchor="middle" fontSize={42}
            fontFamily={FONT} fontWeight="700" fill={color}>
            {score}
          </text>
          <text x={cx} y={cy - 4} textAnchor="middle" fontSize={12}
            fontFamily={FONT} fill={color} fontWeight="600" letterSpacing="0.08em">
            {lbl.toUpperCase()}
          </text>
          {/* Scale labels */}
          <text x={cx - r - 4} y={cy + 16} textAnchor="middle" fontSize={9}
            fontFamily={FONT} fill="rgba(208,35,75,1)">FEAR</text>
          <text x={cx + r + 4} y={cy + 16} textAnchor="middle" fontSize={9}
            fontFamily={FONT} fill="rgba(15,40,180,1)">GREED</text>
          <text x={cx} y={cy - r - 8} textAnchor="middle" fontSize={9}
            fontFamily={FONT} fill="rgba(255,255,255,0.2)">50</text>
        </svg>
      </div>
      <span style={{ fontFamily: FONT, fontSize: 9, color: 'rgba(165,175,210,1)',
        letterSpacing: '0.16em', textTransform: 'uppercase' }}>
        FEAR {'&'} GREED INDEX — ALTERNATIVE.ME
      </span>
    </div>
  );
});
FGGauge.displayName = 'FGGauge';

// ─── F&G History Bar ─────────────────────────────────────────────────────────
const FGHistory = memo(({ history }: { history: { value: number; label: string; timestamp: number }[] }) => {
  if (history.length < 2) return null;
  return (
    <div style={{ display: 'flex', gap: 4, alignItems: 'flex-end', height: 48 }}>
      {history.slice(0, 7).reverse().map((pt, i) => {
        const col = fgColor(pt.value);
        const h   = Math.max(8, (pt.value / 100) * 44);
        const isToday = i === history.slice(0, 7).length - 1;
        return (
          <div key={pt.timestamp} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <span style={{ fontFamily: FONT, fontSize: 8, color: col, opacity: isToday ? 1 : 0.6 }}>
              {pt.value}
            </span>
            <div style={{
              width: '100%', height: h, borderRadius: 3,
              background: col.replace('1)', isToday ? '0.8)' : '0.35)'),
              border: isToday ? '1px solid ' + col : 'none',
              transition: 'height 0.6s ease',
            }} />
            <span style={{ fontFamily: FONT, fontSize: 7, color: 'rgba(165,175,210,0.8)' }}>
              {i === 0 ? '6d' : i === history.slice(0, 7).length - 1 ? 'now' : (history.slice(0, 7).length - 1 - i) + 'd'}
            </span>
          </div>
        );
      })}
    </div>
  );
});
FGHistory.displayName = 'FGHistory';

// ─── Funding Rate Row ─────────────────────────────────────────────────────────
const FundingRow = memo(({ sym, ratePct, annualized, oiUsd, signal, index }:
  { sym: string; ratePct: number; annualized: number; oiUsd: number; signal: string; index: number }) => {
  const sigColor = signal === 'LONG'
    ? 'rgba(0,155,95,1)' : signal === 'SHORT'
    ? 'rgba(208,35,75,1)' : 'rgba(195,125,0,1)';
  const rateColor = ratePct >= 0 ? 'rgba(0,155,95,1)' : 'rgba(208,35,75,1)';
  const bg = index % 2 === 0 ? 'rgba(15,40,100,0.02)' : 'transparent';

  return (
    <div style={{
      display: 'grid', gridTemplateColumns: '80px 90px 100px 1fr 80px',
      alignItems: 'center', padding: '10px 16px',
      background: bg, borderBottom: '1px solid rgba(15,40,100,0.05)',
      transition: 'background 0.12s',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(15,40,180,1)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = bg; }}
    >
      <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: 'rgba(8,12,40,1)' }}>
        {sym}
      </span>
      <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: rateColor, textAlign: 'right' }}>
        {(ratePct >= 0 ? '+' : '') + ratePct.toFixed(4) + '%'}
      </span>
      <span style={{ fontFamily: FONT, fontSize: 11, color: 'rgba(110,120,160,0.8)', textAlign: 'right' }}>
        {(annualized >= 0 ? '+' : '') + annualized.toFixed(1) + '%/yr'}
      </span>
      <span style={{ fontFamily: FONT, fontSize: 11, color: 'rgba(110,120,160,0.7)', textAlign: 'right', paddingRight: 16 }}>
        {oiUsd >= 1e9 ? '$' + (oiUsd / 1e9).toFixed(2) + 'B'
          : oiUsd >= 1e6 ? '$' + (oiUsd / 1e6).toFixed(1) + 'M' : '—'}
      </span>
      <span style={{
        fontFamily: FONT, fontSize: 9, fontWeight: 700,
        color: sigColor, background: sigColor.replace('1)', '0.1)'),
        border: '1px solid ' + sigColor.replace('1)', '0.25)'),
        borderRadius: 4, padding: '2px 7px', textAlign: 'center',
        letterSpacing: '0.08em',
      }}>
        {signal}
      </span>
    </div>
  );
});
FundingRow.displayName = 'FundingRow';

// ─── News Row ─────────────────────────────────────────────────────────────────
const NewsRow = memo(({ title, source, publishedAt, sentiment, url, index }:
  { title: string; source: string; publishedAt: number; sentiment: string; url: string; index: number }) => {
  const sColor = sentiment === 'bullish'
    ? 'rgba(0,155,95,1)' : sentiment === 'bearish'
    ? 'rgba(208,35,75,1)' : 'rgba(195,125,0,1)';
  const bg = index % 2 === 0 ? 'rgba(15,40,100,0.02)' : 'transparent';

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none' }}>
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid rgba(15,40,100,0.05)',
        background: bg,
        display: 'grid', gridTemplateColumns: '1fr 80px',
        gap: 12, alignItems: 'center',
        cursor: 'pointer', transition: 'background 0.12s',
      }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(15,40,180,1)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = bg; }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
            <span style={{
              fontFamily: FONT, fontSize: 9, padding: '1px 6px', borderRadius: 3,
              background: 'rgba(15,40,100,0.08)', color: 'rgba(138,138,158,0.8)',
            }}>
              {source}
            </span>
            <span style={{ fontFamily: FONT, fontSize: 9, color: 'rgba(165,175,210,0.8)' }}>
              {timeAgo(publishedAt)}
            </span>
          </div>
          <p style={{ fontFamily: FONT, fontSize: 11, color: 'rgba(220,220,235,0.9)', margin: 0, lineHeight: 1.5 }}>
            {title}
          </p>
        </div>
        <span style={{
          fontFamily: FONT, fontSize: 9, fontWeight: 700,
          color: sColor, background: sColor.replace('1)', '0.1)'),
          border: '1px solid ' + sColor.replace('1)', '0.22)'),
          borderRadius: 4, padding: '3px 7px',
          textAlign: 'center', letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}>
          {sentiment}
        </span>
      </div>
    </a>
  );
});
NewsRow.displayName = 'NewsRow';

// ─── Loading Skeleton ─────────────────────────────────────────────────────────
const LoadBar = memo(({ w = '100%', h = 12 }: { w?: string | number; h?: number }) => (
  <div style={{
    width: w, height: h, borderRadius: 4,
    background: 'rgba(15,40,100,0.06)',
    position: 'relative', overflow: 'hidden',
  }}>
    <motion.div
      animate={{ x: ['-100%', '200%'] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
      style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(90deg, transparent, rgba(15,40,180,0.07), transparent)',
        willChange: 'transform',
      }}
    />
  </div>
));
LoadBar.displayName = 'LoadBar';

// ─── Section Label ────────────────────────────────────────────────────────────
const Sec = memo(({ label, color, mt = 20 }: { label: string; color?: string; mt?: number }) => (
  <p style={{
    fontFamily: FONT, fontSize: 9, letterSpacing: '0.18em',
    color: color ?? 'rgba(165,175,210,1)', marginBottom: 10, marginTop: mt,
    textTransform: 'uppercase',
  }}>
    {label}
  </p>
));
Sec.displayName = 'Sec';

// ─── Overview Tab ─────────────────────────────────────────────────────────────
const OverviewTab = memo(({ isMobile, isTablet }: { isMobile: boolean; isTablet: boolean }) => {
  const { current, fearGreed, funding, loadingFG, loadingFunding, errorFG, errorFunding } = useSocialSentiment();

  const score   = current?.value ?? 0;
  const label   = current?.label ?? (loadingFG ? 'Loading…' : 'N/A');
  const fgCol   = useMemo(() => fgColor(score), [score]);

  // Compute aggregate sentiment from funding
  const { bullCount, bearCount, netBias } = useMemo(() => {
    const b = funding.filter(f => f.signal === 'LONG').length;
    const s = funding.filter(f => f.signal === 'SHORT').length;
    const bias = b > s ? 'BULLISH' : s > b ? 'BEARISH' : 'NEUTRAL';
    return { bullCount: b, bearCount: s, netBias: bias };
  }, [funding]);

  const biasColor = netBias === 'BULLISH'
    ? 'rgba(0,155,95,1)' : netBias === 'BEARISH'
    ? 'rgba(208,35,75,1)' : 'rgba(195,125,0,1)';

  // Avg funding rate
  const avgFunding = useMemo(() => {
    if (!funding.length) return 0;
    return funding.reduce((s, f) => s + f.ratePct, 0) / funding.length;
  }, [funding]);

  // Total OI
  const totalOI = useMemo(() =>
    funding.reduce((s, f) => s + f.oiUsd, 0), [funding]);

  const g2 = useMemo(() => ({
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr',
    gap: 16, marginBottom: 20,
  }), [isMobile]);

  const g3 = useMemo(() => ({
    display: 'grid',
    gridTemplateColumns: isMobile ? '1fr 1fr' : isTablet ? 'repeat(2,1fr)' : 'repeat(4,1fr)',
    gap: 12, marginBottom: 20,
  }), [isMobile, isTablet]);

  const statCards = useMemo(() => [
    {
      label: 'F&G Score',
      value: loadingFG ? '—' : score.toString(),
      sub: loadingFG ? 'Loading…' : fgLabel(score),
      color: fgCol,
    },
    {
      label: 'Funding Bias',
      value: loadingFunding ? '—' : netBias,
      sub: loadingFunding ? 'Loading…' : (bullCount + '/' + funding.length + ' bullish'),
      color: biasColor,
    },
    {
      label: 'Avg Funding',
      value: loadingFunding ? '—' : (avgFunding >= 0 ? '+' : '') + avgFunding.toFixed(4) + '%',
      sub: 'Per 8h interval',
      color: avgFunding >= 0 ? 'rgba(0,155,95,1)' : 'rgba(208,35,75,1)',
    },
    {
      label: 'Total OI',
      value: loadingFunding ? '—' : '$' + (totalOI / 1e9).toFixed(2) + 'B',
      sub: 'Open interest tracked',
      color: 'rgba(15,40,180,1)',
    },
  ], [loadingFG, score, fgCol, loadingFunding, netBias, bullCount, funding.length, biasColor, avgFunding, totalOI]);

  return (
    <div>
      {/* Stat Cards */}
      <Sec label="▸ Market Sentiment — Live" mt={0} />
      <div style={g3}>
        {statCards.map(c => (
          <div key={c.label} style={{
            padding: '14px 16px', borderRadius: 12,
            background: 'rgba(255,255,255,1)',
            border: '1px solid ' + c.color.replace('1)', '0.18)'),
            position: 'relative', overflow: 'hidden',
          }}>
            <div style={{
              position: 'absolute', top: 0, left: 0, right: 0, height: 1,
              background: 'linear-gradient(90deg, transparent, ' + c.color + ', transparent)',
              opacity: 0.5,
            }} />
            <p style={{ fontFamily: FONT, fontSize: 9, color: 'rgba(165,175,210,1)',
              letterSpacing: '0.12em', textTransform: 'uppercase', margin: '0 0 6px' }}>
              {c.label}
            </p>
            <p style={{ fontFamily: FONT, fontSize: 20, fontWeight: 700,
              color: c.color, margin: '0 0 4px',
              textShadow: '0 0 16px ' + c.color.replace('1)', '0.4)') }}>
              {c.value}
            </p>
            <p style={{ fontFamily: FONT, fontSize: 9, color: 'rgba(100,100,120,0.8)', margin: 0 }}>
              {c.sub}
            </p>
          </div>
        ))}
      </div>

      {/* F&G Gauge + History */}
      <div style={g2}>
        <div style={{
          padding: 24, borderRadius: 12,
          background: 'rgba(255,255,255,1)',
          border: '1px solid rgba(15,40,100,0.08)',
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16,
        }}>
          {loadingFG ? (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, paddingTop: 20 }}>
              <LoadBar w={180} h={90} />
              <LoadBar w={120} h={10} />
            </div>
          ) : errorFG ? (
            <p style={{ fontFamily: FONT, fontSize: 11, color: 'rgba(208,35,75,1)', textAlign: 'center' }}>
              {errorFG}
            </p>
          ) : (
            <FGGauge score={score} label={label} />
          )}
          {fearGreed.length > 1 && (
            <div style={{ width: '100%' }}>
              <p style={{ fontFamily: FONT, fontSize: 9, color: 'rgba(165,175,210,0.9)',
                letterSpacing: '0.12em', textTransform: 'uppercase', marginBottom: 8 }}>
                7-DAY HISTORY
              </p>
              <FGHistory history={fearGreed} />
            </div>
          )}
        </div>

        {/* Funding summary */}
        <div style={{
          padding: '20px', borderRadius: 12,
          background: 'rgba(255,255,255,1)',
          border: '1px solid rgba(15,40,100,0.08)',
        }}>
          <p style={{ fontFamily: FONT, fontSize: 9, color: 'rgba(165,175,210,1)',
            letterSpacing: '0.14em', textTransform: 'uppercase', marginBottom: 16 }}>
            FUNDING RATE SIGNALS — BINANCE FUTURES
          </p>
          {loadingFunding ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[1,2,3,4,5].map(i => <LoadBar key={i} h={18} />)}
            </div>
          ) : errorFunding ? (
            <p style={{ fontFamily: FONT, fontSize: 11, color: 'rgba(208,35,75,1)' }}>
              {errorFunding}
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {funding.slice(0, 8).map((f, i) => {
                const sigColor = f.signal === 'LONG'
                  ? 'rgba(0,155,95,1)' : f.signal === 'SHORT'
                  ? 'rgba(208,35,75,1)' : 'rgba(195,125,0,1)';
                return (
                  <div key={f.symbol} style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    padding: '8px 0',
                    borderBottom: i < 7 ? '1px solid rgba(15,40,100,0.05)' : 'none',
                  }}>
                    <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700,
                      color: 'rgba(8,12,40,1)', width: 60 }}>
                      {f.symbol}
                    </span>
                    <span style={{ fontFamily: FONT, fontSize: 11,
                      color: f.ratePct >= 0 ? 'rgba(0,155,95,1)' : 'rgba(208,35,75,1)' }}>
                      {(f.ratePct >= 0 ? '+' : '') + f.ratePct.toFixed(4) + '%'}
                    </span>
                    <span style={{
                      fontFamily: FONT, fontSize: 9, fontWeight: 700,
                      color: sigColor, background: sigColor.replace('1)', '0.1)'),
                      border: '1px solid ' + sigColor.replace('1)', '0.22)'),
                      borderRadius: 4, padding: '2px 6px',
                    }}>
                      {f.signal}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Net bias summary */}
          {!loadingFunding && !errorFunding && (
            <div style={{
              marginTop: 16, padding: '10px 14px', borderRadius: 8,
              background: biasColor.replace('1)', '0.06)'),
              border: '1px solid ' + biasColor.replace('1)', '0.2)'),
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <span style={{ fontFamily: FONT, fontSize: 10, color: 'rgba(138,138,158,0.8)' }}>
                Market Bias
              </span>
              <span style={{ fontFamily: FONT, fontSize: 13, fontWeight: 700, color: biasColor }}>
                {netBias}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});
OverviewTab.displayName = 'OverviewTab';

// ─── Funding Tab ──────────────────────────────────────────────────────────────
const FundingTab = memo(() => {
  const { funding, loadingFunding, errorFunding, refreshFunding, lastUpdatedFunding } = useSocialSentiment();

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
        <Sec label="▸ Funding Rates + Open Interest — Binance Futures" mt={0} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {lastUpdatedFunding && (
            <span style={{ fontFamily: FONT, fontSize: 9, color: 'rgba(165,175,210,0.8)' }}>
              {timeAgo(lastUpdatedFunding)}
            </span>
          )}
          <button
            type="button"
            onClick={refreshFunding}
            style={{
              fontFamily: FONT, fontSize: 9, color: 'rgba(15,40,180,0.8)',
              background: 'rgba(15,40,180,0.05)', border: '1px solid rgba(15,40,180,0.22)',
              borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
              letterSpacing: '0.1em',
            }}
          >
            ↺ REFRESH
          </button>
        </div>
      </div>

      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(15,40,100,0.08)', background: 'rgba(248,249,252,1)' }}>
        {/* Header */}
        <div style={{
          display: 'grid', gridTemplateColumns: '80px 90px 100px 1fr 80px',
          padding: '10px 16px', borderBottom: '1px solid rgba(15,40,100,0.06)',
          background: 'rgba(15,40,100,0.03)',
        }}>
          {['Symbol', 'Rate/8h', 'Annualized', 'Open Interest', 'Signal'].map((h, i) => (
            <span key={h} style={{
              fontFamily: FONT, fontSize: 9, color: 'rgba(165,175,210,0.9)',
              letterSpacing: '0.1em', textTransform: 'uppercase',
              textAlign: i === 0 ? 'left' : i === 4 ? 'center' : 'right',
            }}>
              {h}
            </span>
          ))}
        </div>

        {loadingFunding ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[1,2,3,4,5,6,7,8,9,10].map(i => <LoadBar key={i} h={20} />)}
          </div>
        ) : errorFunding ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <p style={{ fontFamily: FONT, fontSize: 11, color: 'rgba(208,35,75,1)' }}>
              {errorFunding}
            </p>
          </div>
        ) : (
          funding.map((f, i) => (
            <FundingRow key={f.symbol}
              sym={f.symbol} ratePct={f.ratePct} annualized={f.annualized}
              oiUsd={f.oiUsd} signal={f.signal} index={i}
            />
          ))
        )}
      </div>
    </div>
  );
});
FundingTab.displayName = 'FundingTab';

// ─── News Tab ─────────────────────────────────────────────────────────────────
const NewsTab = memo(() => {
  const { filteredNews, loading, error, filter, setFilter, refresh, lastUpdated } = useCryptoNews();

  const FILTERS = Object.freeze(['ALL', 'IMPORTANT', 'BTC', 'ETH', 'ALTCOIN'] as const);

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
        <Sec label="▸ Crypto News — Live Feed" mt={0} />
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          {lastUpdated && (
            <span style={{ fontFamily: FONT, fontSize: 9, color: 'rgba(165,175,210,0.8)' }}>
              {timeAgo(lastUpdated)}
            </span>
          )}
          <button type="button" onClick={refresh} style={{
            fontFamily: FONT, fontSize: 9, color: 'rgba(15,40,180,0.8)',
            background: 'rgba(15,40,180,0.05)', border: '1px solid rgba(15,40,180,0.22)',
            borderRadius: 6, padding: '4px 10px', cursor: 'pointer',
          }}>
            ↺ REFRESH
          </button>
        </div>
      </div>

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 12, flexWrap: 'wrap' }}>
        {FILTERS.map(f => {
          const active = filter === f;
          return (
            <button key={f} type="button" onClick={() => setFilter(f as any)}
              style={{
                fontFamily: FONT, fontSize: 9, letterSpacing: '0.1em',
                padding: '5px 10px', borderRadius: 6, cursor: 'pointer',
                background: active ? 'rgba(15,40,180,0.08)' : 'rgba(15,40,100,0.05)',
                border: '1px solid ' + (active ? 'rgba(15,40,180,1)' : 'rgba(15,40,100,0.10)'),
                color: active ? 'rgba(15,40,180,1)' : 'rgba(110,120,160,0.8)',
                transition: 'all 0.15s',
              }}>
              {f}
            </button>
          );
        })}
      </div>

      <div style={{ borderRadius: 12, overflow: 'hidden', border: '1px solid rgba(15,40,100,0.08)', background: 'rgba(248,249,252,1)' }}>
        {loading ? (
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                <LoadBar w="30%" h={10} />
                <LoadBar h={12} />
                <LoadBar w="80%" h={12} />
              </div>
            ))}
          </div>
        ) : error ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <p style={{ fontFamily: FONT, fontSize: 11, color: 'rgba(208,35,75,1)' }}>{error}</p>
          </div>
        ) : filteredNews.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            <p style={{ fontFamily: FONT, fontSize: 11, color: 'rgba(165,175,210,0.8)' }}>No news found for filter</p>
          </div>
        ) : (
          filteredNews.slice(0, 40).map((item, i) => (
            <NewsRow key={item.id}
              title={item.title} source={item.source}
              publishedAt={item.publishedAt} sentiment={item.sentiment}
              url={item.url} index={i}
            />
          ))
        )}
      </div>
    </div>
  );
});
NewsTab.displayName = 'NewsTab';

// ─── Main Page ────────────────────────────────────────────────────────────────
const Sentiment = memo(() => {
  const { isMobile, isTablet } = useBreakpoint();
  const mountedRef = useRef(true);
  const [activeTab, setActiveTab] = useState<Tab>('Overview');

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const handleTab = useCallback((t: Tab) => {
    if (mountedRef.current) setActiveTab(t);
  }, []);

  return (
    <div style={{ padding: isMobile ? '12px' : '16px 20px' }}>
      {/* Page Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h1 style={{ fontFamily: FONT, fontSize: 20, fontWeight: 700,
            color: 'rgba(8,12,40,1)', margin: 0, letterSpacing: '0.06em',
            textShadow: '0 0 20px rgba(15,40,180,1)' }}>
            SENTIMENT
          </h1>
          <p style={{ fontFamily: FONT, fontSize: 10, color: 'rgba(165,175,210,0.9)',
            margin: '2px 0 0', letterSpacing: '0.06em' }}>
            Real-time market psychology &amp; derivatives signals
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6,
          padding: '5px 12px', background: 'rgba(0,155,95,1)',
          border: '1px solid rgba(0,155,95,1)', borderRadius: 6 }}>
          <span style={{ width: 6, height: 6, borderRadius: '50%',
            background: 'rgba(0,155,95,1)', boxShadow: '0 0 6px rgba(0,155,95,0.9)' }} />
          <span style={{ fontFamily: FONT, fontSize: 9, color: 'rgba(0,155,95,0.9)',
            letterSpacing: '0.1em' }}>LIVE</span>
        </div>
      </div>

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: 2, marginBottom: 20,
        background: 'rgba(15,40,100,0.03)', borderRadius: 10, padding: 4,
        border: '1px solid rgba(15,40,100,0.06)', width: 'fit-content' }}>
        {TABS.map(t => {
          const active = activeTab === t;
          return (
            <button key={t} type="button" onClick={() => handleTab(t)}
              style={{
                fontFamily: FONT, fontSize: 10, letterSpacing: '0.1em',
                padding: '7px 16px', borderRadius: 8, cursor: 'pointer',
                background: active ? 'rgba(15,40,180,1)' : 'transparent',
                border: active ? '1px solid rgba(15,40,180,0.30)' : '1px solid transparent',
                color: active ? 'rgba(15,40,180,1)' : 'rgba(110,120,160,0.7)',
                transition: 'all 0.18s',
                textTransform: 'uppercase',
              }}>
              {t}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        >
          {activeTab === 'Overview' && <OverviewTab isMobile={isMobile} isTablet={isTablet} />}
          {activeTab === 'Funding'  && <FundingTab />}
          {activeTab === 'News Feed' && <NewsTab />}
        </motion.div>
      </AnimatePresence>
    </div>
  );
});
Sentiment.displayName = 'Sentiment';
export default Sentiment;
