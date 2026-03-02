/**
 * Skeleton.tsx — ZERØ MERIDIAN
 * Skeleton loading components exposed via namespace default export.
 * Usage: import Skeleton from './Skeleton';
 *        <Skeleton.Base width={80} /> | <Skeleton.Card /> | <Skeleton.Page />
 * - React.memo + displayName ✓
 * - rgba() only ✓
 * - Zero template literals in JSX attrs ✓
 * - export default ONLY — zero named export ✓
 * - Object.freeze static styles ✓
 */

import { memo } from 'react';

// ─── Base Skeleton ────────────────────────────────────────────────────────────

interface SkeletonBaseProps {
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
}

const SHIMMER_STYLE = Object.freeze({
  background: 'linear-gradient(90deg, rgba(15,40,100,0.05) 25%, rgba(15,40,100,0.09) 50%, rgba(15,40,100,0.05) 75%)',
  backgroundSize: '200% 100%',
  animation: 'shimmer 1.8s ease infinite',
});

const SkeletonBase = memo(({ width, height = 16, borderRadius = 6 }: SkeletonBaseProps) => (
  <div
    style={{
      ...SHIMMER_STYLE,
      width: width ?? '100%',
      height,
      borderRadius,
      display: 'block',
    }}
  />
));
SkeletonBase.displayName = 'SkeletonBase';

// ─── Skeleton Card (MetricCard shape) ────────────────────────────────────────

const SkeletonCard = memo(() => (
  <div
    style={{
      minHeight: 88,
      padding: '16px',
      display: 'flex',
      flexDirection: 'column',
      gap: '8px',
      background: 'rgba(248,249,252,1)',
      border: '1px solid rgba(15,40,100,0.09)',
      borderRadius: '12px',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <SkeletonBase width={70} height={10} />
      <SkeletonBase width={14} height={14} borderRadius={4} />
    </div>
    <SkeletonBase width="60%" height={28} borderRadius={6} />
    <SkeletonBase width={50} height={10} />
  </div>
));
SkeletonCard.displayName = 'SkeletonCard';

// ─── Skeleton Row (table / list shape) ───────────────────────────────────────

const SkeletonRow = memo(() => (
  <div
    style={{
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      padding: '8px 4px',
      borderBottom: '1px solid rgba(15,40,100,0.07)',
    }}
  >
    <SkeletonBase width={24} height={24} borderRadius={12} />
    <SkeletonBase width={60} height={11} />
    <div style={{ flex: 1 }} />
    <SkeletonBase width={80} height={11} />
    <SkeletonBase width={55} height={11} />
  </div>
));
SkeletonRow.displayName = 'SkeletonRow';

// ─── Skeleton Table ───────────────────────────────────────────────────────────

interface SkeletonTableProps {
  rows?: number;
}

const SkeletonTable = memo(({ rows = 8 }: SkeletonTableProps) => (
  <div
    style={{
      background: 'rgba(248,249,252,1)',
      border: '1px solid rgba(15,40,100,0.09)',
      borderRadius: '12px',
      padding: '16px',
    }}
  >
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingBottom: '12px', marginBottom: '4px', borderBottom: '1px solid rgba(15,40,100,0.08)' }}>
      <SkeletonBase width={40} height={9} />
      <SkeletonBase width={90} height={9} />
      <div style={{ flex: 1 }} />
      <SkeletonBase width={70} height={9} />
      <SkeletonBase width={60} height={9} />
      <SkeletonBase width={50} height={9} />
    </div>
    {Array.from({ length: rows }, (_, i) => (
      <SkeletonRow key={i} />
    ))}
  </div>
));
SkeletonTable.displayName = 'SkeletonTable';

// ─── Page Skeleton (full page loading state) ─────────────────────────────────

const SkeletonPage = memo(() => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', animation: 'fadeIn 0.3s ease' }}>
    {/* Title bar */}
    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
      <SkeletonBase width={200} height={24} borderRadius={8} />
      <SkeletonBase width={80} height={20} borderRadius={10} />
    </div>

    {/* Metric cards row */}
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: '12px' }}>
      {Array.from({ length: 6 }, (_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>

    {/* Main content area */}
    <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: '16px' }}>
      <div style={{ background: 'rgba(248,249,252,1)',
        border: '1px solid rgba(15,40,100,0.09)', borderRadius: '12px', padding: '16px', minHeight: 280 }}>
        <SkeletonBase width={220} height={12} />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '6px', marginTop: '16px' }}>
          {Array.from({ length: 20 }, (_, i) => (
            <SkeletonBase key={i} height={64} borderRadius={8} />
          ))}
        </div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ background: 'rgba(248,249,252,1)',
        border: '1px solid rgba(15,40,100,0.09)', borderRadius: '12px', padding: '16px', minHeight: 120 }}>
          <SkeletonBase width={160} height={12} />
          <div style={{ marginTop: '12px' }}>
            <SkeletonBase height={60} borderRadius={8} />
          </div>
        </div>
        <div style={{ background: 'rgba(248,249,252,1)',
        border: '1px solid rgba(15,40,100,0.09)', borderRadius: '12px', padding: '16px', minHeight: 120 }}>
          <SkeletonBase width={100} height={12} />
          <div style={{ marginTop: '12px' }}>
            {Array.from({ length: 4 }, (_, i) => (
              <SkeletonRow key={i} />
            ))}
          </div>
        </div>
      </div>
    </div>
  </div>
));
SkeletonPage.displayName = 'SkeletonPage';

// ─── Namespace Default Export ─────────────────────────────────────────────────
// Usage:
//   import Skeleton from '@/components/shared/Skeleton';
//   <Skeleton.Base width={80} />
//   <Skeleton.Card />
//   <Skeleton.Row />
//   <Skeleton.Table rows={5} />
//   <Skeleton.Page />

const Skeleton = Object.assign(SkeletonBase, {
  Card:  SkeletonCard,
  Row:   SkeletonRow,
  Table: SkeletonTable,
  Page:  SkeletonPage,
});

Skeleton.displayName = 'Skeleton';

export default Skeleton;
// ⚠️ ZERO named export — all sub-components via Skeleton.Card / Skeleton.Page etc
