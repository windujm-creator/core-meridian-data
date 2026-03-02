/**
 * Markets.tsx — ZERØ MERIDIAN push98
 * UPGRADE: Coinbase-style clean design
 * - Coin logos, name + symbol stacked
 * - Colored change badges
 * - Sparkline mini charts
 * - Search filter + sort headers
 * - Mobile: 4-col compact
 * - Desktop: full 7-col
 * - VirtualList: 100+ assets tanpa lag
 */

import { memo, useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { useCrypto } from '@/contexts/CryptoContext';
import { useMarketWorker } from '@/hooks/useMarketWorker';
import { useBreakpoint } from '@/hooks/useBreakpoint';
import VirtualList from '@/components/shared/VirtualList';
import SparklineChart from '@/components/shared/SparklineChart';
import { formatPrice, formatCompact } from '@/lib/formatters';
import type { CryptoAsset } from '@/lib/formatters';

type SK = 'rank'|'name'|'price'|'change24h'|'change7d'|'marketCap'|'volume24h';
type SD = 'asc'|'desc';

const ROW_H  = 52;
const ROW_HM = 56;

// ─── Change badge ─────────────────────────────────────────────────────────────

const ChangeBadge = memo(({ val, size = 11 }: { val: number; size?: number }) => {
  const pos = val >= 0;
  return (
    <span style={{
      fontFamily:"'JetBrains Mono',monospace", fontSize:size+'px', fontWeight:600,
      color: pos ? 'rgba(34,255,170,1)' : 'rgba(255,68,136,1)',
      background: pos ? 'rgba(34,255,170,0.08)' : 'rgba(255,68,136,0.08)',
      border: '1px solid ' + (pos ? 'rgba(34,255,170,0.2)' : 'rgba(255,68,136,0.2)'),
      borderRadius:'4px', padding:'2px 6px', whiteSpace:'nowrap' as const,
    }}>
      {(pos?'+':'')+val.toFixed(2)+'%'}
    </span>
  );
});
ChangeBadge.displayName = 'ChangeBadge';

// ─── Sort header ─────────────────────────────────────────────────────────────

const SortHdr = memo(({ label, k, sortKey, sortDir, onSort, align='right', width }:
  { label:string; k:SK; sortKey:SK; sortDir:SD; onSort:(k:SK)=>void; align?:string; width?:number }) => {
  const active = sortKey === k;
  return (
    <button type="button" onClick={() => onSort(k)}
      style={{
        fontFamily:"'JetBrains Mono',monospace", fontSize:'9px', letterSpacing:'0.1em',
        color: active ? 'rgba(0,238,255,0.9)' : 'rgba(80,80,100,0.8)',
        textAlign: align as 'right'|'left'|'center',
        cursor:'pointer', background:'none', border:'none', padding:'0', display:'flex',
        alignItems:'center', gap:'3px', justifyContent: align==='right' ? 'flex-end' : 'flex-start',
        width: width ? width+'px' : undefined, flexShrink:0,
        transition:'color 0.15s',
      }}>
      {label.toUpperCase()}
      <span style={{ opacity: active ? 1 : 0.3 }}>{active ? (sortDir==='asc' ? '↑' : '↓') : '↕'}</span>
    </button>
  );
});
SortHdr.displayName = 'SortHdr';

// ─── Asset Row ────────────────────────────────────────────────────────────────

const AssetRow = memo(({ asset, index, isMobile }: { asset:CryptoAsset; index:number; isMobile:boolean }) => {
  const ref = useRef<HTMLDivElement>(null);
  const prev = useRef(asset.price);
  const m = useRef(true);

  useEffect(() => { m.current = true; return () => { m.current = false; }; }, []);

  useEffect(() => {
    if (!m.current || !ref.current || asset.price === prev.current) return;
    const cls = asset.priceDirection==='up' ? 'animate-flash-pos' : asset.priceDirection==='down' ? 'animate-flash-neg' : '';
    if (!cls) { prev.current = asset.price; return; }
    ref.current.classList.remove('animate-flash-pos','animate-flash-neg');
    void ref.current.offsetWidth;
    ref.current.classList.add(cls);
    prev.current = asset.price;
    const t = setTimeout(() => { if (m.current) ref.current?.classList.remove(cls); }, 300);
    return () => clearTimeout(t);
  }, [asset.price, asset.priceDirection]);

  const bg = index%2===0 ? 'rgba(255,255,255,0.01)' : 'transparent';
  const h = isMobile ? ROW_HM : ROW_H;

  if (isMobile) {
    return (
      <div ref={ref} style={{ height:h, background:bg,
        borderBottom:'1px solid rgba(255,255,255,0.04)',
        display:'grid', gridTemplateColumns:'28px 1fr 90px 72px',
        alignItems:'center', padding:'0 12px', gap:'8px', willChange:'transform',
        transition:'background 0.12s' }}
        onMouseEnter={e=>{e.currentTarget.style.background='rgba(0,238,255,0.03)';}}
        onMouseLeave={e=>{e.currentTarget.style.background=bg;}}>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px',
          color:'rgba(80,80,100,0.7)', textAlign:'right' }}>{asset.rank}</span>
        <div style={{ display:'flex', alignItems:'center', gap:'6px', minWidth:0 }}>
          {asset.image
            ? <img src={asset.image} alt="" style={{ width:'22px', height:'22px', borderRadius:'50%', flexShrink:0 }} />
            : <div style={{ width:'22px', height:'22px', borderRadius:'50%', flexShrink:0, background:'rgba(0,238,255,0.15)' }} />}
          <div style={{ minWidth:0 }}>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11px', fontWeight:700,
              color:'rgba(230,230,242,1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>
              {asset.symbol.toUpperCase()}
            </div>
            <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px',
              color:'rgba(80,80,100,0.7)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' as const }}>
              {asset.name}
            </div>
          </div>
        </div>
        <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11px',
          textAlign:'right', color:'rgba(230,230,242,1)' }}>{formatPrice(asset.price)}</span>
        <div style={{ display:'flex', justifyContent:'flex-end' }}>
          <ChangeBadge val={asset.change24h} size={10} />
        </div>
      </div>
    );
  }

  return (
    <div ref={ref} style={{ height:h, background:bg,
      borderBottom:'1px solid rgba(255,255,255,0.035)',
      display:'flex', alignItems:'center', padding:'0 16px', gap:'0',
      transition:'background 0.12s', willChange:'transform', cursor:'pointer' }}
      onMouseEnter={e=>{e.currentTarget.style.background='rgba(0,238,255,0.025)';}}
      onMouseLeave={e=>{e.currentTarget.style.background=bg;}}>

      {/* Rank */}
      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11px',
        width:'36px', flexShrink:0, textAlign:'right', color:'rgba(80,80,100,0.6)', paddingRight:'12px' }}>
        {asset.rank}
      </span>

      {/* Asset */}
      <div style={{ display:'flex', alignItems:'center', gap:'10px', width:'180px', flexShrink:0 }}>
        {asset.image
          ? <img src={asset.image} alt="" style={{ width:'28px', height:'28px', borderRadius:'50%', flexShrink:0 }} />
          : <div style={{ width:'28px', height:'28px', borderRadius:'50%', flexShrink:0, background:'rgba(0,238,255,0.1)' }} />}
        <div>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'12px', fontWeight:700,
            color:'rgba(230,230,242,1)' }}>{asset.symbol.toUpperCase()}</div>
          <div style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'9px',
            color:'rgba(80,80,100,0.7)' }}>{asset.name}</div>
        </div>
      </div>

      {/* Price */}
      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'12px', fontWeight:600,
        marginLeft:'auto', color:'rgba(230,230,242,1)', minWidth:'110px', textAlign:'right' }}>
        {formatPrice(asset.price)}
      </span>

      {/* 24h */}
      <div style={{ minWidth:'90px', display:'flex', justifyContent:'flex-end', paddingRight:'12px' }}>
        <ChangeBadge val={asset.change24h} />
      </div>

      {/* 7d */}
      <div style={{ minWidth:'80px', display:'flex', justifyContent:'flex-end', paddingRight:'12px' }}>
        <ChangeBadge val={asset.change7d ?? 0} size={10} />
      </div>

      {/* Market Cap */}
      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11px',
        minWidth:'100px', textAlign:'right', color:'rgba(138,138,158,0.7)', paddingRight:'12px' }}>
        {formatCompact(asset.marketCap)}
      </span>

      {/* Volume */}
      <span style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'11px',
        minWidth:'90px', textAlign:'right', color:'rgba(138,138,158,0.55)', paddingRight:'12px' }}>
        {formatCompact(asset.volume24h)}
      </span>

      {/* Sparkline */}
      <div style={{ width:'80px', flexShrink:0 }}>
        {asset.sparkline && asset.sparkline.length > 0 && (
          <SparklineChart data={asset.sparkline} positive={(asset.change7d ?? 0) >= 0} width={80} height={32} />
        )}
      </div>
    </div>
  );
});
AssetRow.displayName = 'AssetRow';

// ─── Markets ──────────────────────────────────────────────────────────────────

const Markets = memo(() => {
  const { assets } = useCrypto();
  const { isMobile } = useBreakpoint();
  const [sortKey, setSortKey] = useState<SK>('rank');
  const [sortDir, setSortDir] = useState<SD>('asc');
  const [search, setSearch] = useState('');
  const searchRef = useRef('');
  const m = useRef(true);

  useEffect(() => { m.current = true; return () => { m.current = false; }; }, []);

  const [sorted, setSorted] = useState<CryptoAsset[]>([]);
  const marketWorker = useMarketWorker();

  // Run sort+filter via worker whenever deps change
  useEffect(() => {
    let cancelled = false;
    marketWorker.sortAndFilter(assets, sortKey, sortDir, search)
      .then(result => { if (!cancelled && m.current) setSorted(result.assets); })
      .catch(() => {
        // Worker unavailable — sort inline as fallback
        if (cancelled || !m.current) return;
        const q = search.toLowerCase();
        let filtered = q
          ? assets.filter(a => a.name.toLowerCase().includes(q) || a.symbol.toLowerCase().includes(q))
          : [...assets];
        filtered.sort((a, b) => {
          const av = (a as Record<string, unknown>)[sortKey] ?? 0;
          const bv = (b as Record<string, unknown>)[sortKey] ?? 0;
          const cmp = typeof av === 'string'
            ? (av as string).localeCompare(bv as string)
            : (av as number) - (bv as number);
          return sortDir === 'asc' ? cmp : -cmp;
        });
        setSorted(filtered);
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assets, sortKey, sortDir, search]);

  const handleSort = useCallback((k: SK) => {
    if (!m.current) return;
    setSortDir(d => sortKey === k ? (d==='asc'?'desc':'asc') : 'desc');
    setSortKey(k);
  }, [sortKey]);

  const handleSearch = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (!m.current) return;
    searchRef.current = e.target.value;
    setSearch(e.target.value);
  }, []);

  const rowHeight = isMobile ? ROW_HM : ROW_H;

  const renderRow = useCallback((asset: CryptoAsset, index: number) => (
    <AssetRow key={asset.id} asset={asset} index={index} isMobile={isMobile} />
  ), [isMobile]);

  const containerStyle = useMemo(() => ({
    background:'rgba(8,10,18,1)', borderRadius:'12px',
    border:'1px solid rgba(255,255,255,0.06)', overflow:'hidden' as const,
  }), []);

  const headerStyle = useMemo(() => ({
    padding: isMobile ? '12px 12px 10px' : '14px 16px 12px',
    borderBottom:'1px solid rgba(255,255,255,0.05)',
    display:'flex', alignItems:'center', gap:'12px', flexWrap:'wrap' as const,
    background:'rgba(255,255,255,0.015)',
  }), [isMobile]);

  const colHdrStyle = useMemo(() => ({
    display: isMobile ? 'none' : 'flex',
    alignItems:'center', padding:'8px 16px',
    borderBottom:'1px solid rgba(255,255,255,0.04)',
    background:'rgba(255,255,255,0.01)',
    position:'sticky' as const, top:0, zIndex:2,
  }), [isMobile]);

  return (
    <div style={{ padding: isMobile ? '12px' : '16px 20px' }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'16px', flexWrap:'wrap' as const, gap:'10px' }}>
        <div>
          <h1 style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'16px', fontWeight:700,
            color:'rgba(230,230,242,1)', margin:0, letterSpacing:'0.06em' }}>MARKETS</h1>
          <p style={{ fontFamily:"'JetBrains Mono',monospace", fontSize:'10px',
            color:'rgba(80,80,100,0.8)', margin:'2px 0 0', letterSpacing:'0.06em' }}>
            {sorted.length} assets · LIVE
          </p>
        </div>
        {/* Search */}
        <div style={{ position:'relative' as const }}>
          <input
            type="text"
            placeholder="Search assets…"
            value={search}
            onChange={handleSearch}
            style={{
              fontFamily:"'JetBrains Mono',monospace", fontSize:'11px',
              background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:'8px', padding:'8px 12px 8px 32px',
              color:'rgba(230,230,242,0.9)', outline:'none',
              width: isMobile ? '160px' : '220px',
            }}
            aria-label="Search assets"
          />
          <span style={{ position:'absolute' as const, left:'10px', top:'50%', transform:'translateY(-50%)',
            fontSize:'12px', color:'rgba(80,80,100,0.6)' }}>⌕</span>
        </div>
      </div>

      <div style={containerStyle}>
        {/* Table header */}
        {!isMobile && (
          <div style={colHdrStyle}>
            <SortHdr label="#" k="rank" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="right" width={36} />
            <SortHdr label="Asset" k="name" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} align="left" width={180} />
            <SortHdr label="Price" k="price" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} width={110} />
            <SortHdr label="24h" k="change24h" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} width={90} />
            <SortHdr label="7d" k="change7d" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} width={80} />
            <SortHdr label="Mkt Cap" k="marketCap" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} width={100} />
            <SortHdr label="Volume" k="volume24h" sortKey={sortKey} sortDir={sortDir} onSort={handleSort} width={90} />
            <span style={{ width:'80px', flexShrink:0, fontFamily:"'JetBrains Mono',monospace",
              fontSize:'9px', color:'rgba(80,80,100,0.6)', textAlign:'center' }}>7D CHART</span>
          </div>
        )}
        {/* Rows */}
        {sorted.length === 0 && assets.length === 0 ? (
          <div style={{ display:'flex', flexDirection:'column' as const }}>
            {Array.from({ length: 8 }, (_, i) => (
              <div key={i} style={{ height: isMobile ? 64 : 54, borderBottom:'1px solid rgba(255,255,255,0.04)',
                display:'flex', alignItems:'center', padding:'0 12px', gap:'12px', overflow:'hidden', position:'relative' as const }}>
                <div style={{ width:28, height:28, borderRadius:'50%', background:'rgba(255,255,255,0.05)', flexShrink:0 }} />
                <div style={{ flex:1, display:'flex', flexDirection:'column' as const, gap:6 }}>
                  <div style={{ width:'40%', height:10, borderRadius:3, background:'rgba(255,255,255,0.05)' }} />
                  <div style={{ width:'25%', height:8, borderRadius:3, background:'rgba(255,255,255,0.04)' }} />
                </div>
                <div style={{ width:80, height:14, borderRadius:3, background:'rgba(255,255,255,0.05)', flexShrink:0 }} />
                <motion.div animate={{ x:['-100%','200%'] }} transition={{ duration:1.4+i*0.07, repeat:Infinity, ease:'linear' }}
                  style={{ position:'absolute' as const, inset:0, background:'linear-gradient(90deg,transparent,rgba(0,238,255,0.04),transparent)', willChange:'transform' }} />
              </div>
            ))}
          </div>
        ) : sorted.length === 0 ? (
          <div style={{ padding:'40px', textAlign:'center' as const,
            fontFamily:"'JetBrains Mono',monospace", fontSize:'11px', color:'rgba(80,80,100,0.6)' }}>
            {'No results for "' + search + '"'}
          </div>
        ) : (
          <VirtualList
            items={sorted}
            itemHeight={rowHeight}
            height={Math.min(sorted.length * rowHeight, window.innerHeight - 200)}
            renderItem={renderRow}
            getKey={(item: CryptoAsset) => item.id}
          />
        )}
      </div>
    </div>
  );
});
Markets.displayName = 'Markets';
export default Markets;
