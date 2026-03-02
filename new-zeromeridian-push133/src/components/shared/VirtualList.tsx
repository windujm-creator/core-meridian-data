/**
 * VirtualList.tsx — ZERØ MERIDIAN 2026
 * Virtual scroll — render only visible rows
 * - Zero external deps (pure React + DOM)
 * - React.memo + displayName ✓
 * - rgba() only ✓
 * - useCallback + useMemo ✓
 */

import { memo, useRef, useState, useCallback, useMemo, useEffect } from 'react';

interface VirtualListProps<T> {
  items:      T[];
  itemHeight: number;
  height:     number;
  overscan?:  number;
  renderItem: (item: T, index: number) => React.ReactNode;
  getKey:     (item: T, index: number) => string;
}

function VirtualListInner<T>({
  items,
  itemHeight,
  height,
  overscan = 3,
  renderItem,
  getKey,
}: VirtualListProps<T>) {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const mountedRef   = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const onScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (!mountedRef.current) return;
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  const { startIndex, endIndex, offsetY, totalHeight } = useMemo(() => {
    const totalHeight = items.length * itemHeight;
    const startIndex  = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
    const endIndex    = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + height) / itemHeight) + overscan
    );
    const offsetY = startIndex * itemHeight;
    return { startIndex, endIndex, offsetY, totalHeight };
  }, [scrollTop, items.length, itemHeight, height, overscan]);

  const visibleItems = useMemo(
    () => items.slice(startIndex, endIndex + 1),
    [items, startIndex, endIndex]
  );

  return (
    <div
      ref={containerRef}
      onScroll={onScroll}
      style={{
        height,
        overflowY: 'auto',
        overflowX: 'hidden',
        position: 'relative',
        willChange: 'transform',
      }}
    >
      {/* Total height spacer */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {/* Visible window */}
        <div style={{ transform: 'translateY(' + offsetY + 'px)' }}>
          {visibleItems.map((item, i) => (
            <div
              key={getKey(item, startIndex + i)}
              style={{ height: itemHeight, overflow: 'hidden' }}
            >
              {renderItem(item, startIndex + i)}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

const VirtualList = memo(VirtualListInner) as typeof VirtualListInner;
(VirtualList as unknown as { displayName: string }).displayName = 'VirtualList';

export default VirtualList;
export type { VirtualListProps };
