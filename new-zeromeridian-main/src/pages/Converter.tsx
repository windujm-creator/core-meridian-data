/**
 * Converter.tsx — ZERØ MERIDIAN push133
 * push133: Light professional reskin (Bloomberg mode push132)
 * push24: 112 className → 0, 100% inline style
 * - Multi-currency converter + DCA calculator + Position Sizer
 * - Live prices via CryptoContext (WS-fed, zero extra fetch)
 * - Pure SVG charts, zero recharts
 * - React.memo + displayName ✓
 * - useReducer state, useCallback + useMemo ✓
 * - Object.freeze() all static data ✓
 * - rgba() only, zero hsl() ✓
 * - Zero template literals in JSX ✓
 * - Zero className in pages ✓
 * - will-change: transform on animated elements ✓
 */

import {
  memo, useReducer, useCallback, useMemo, useState, useRef, useEffect,
} from 'react';
import { useCrypto } from '@/contexts/CryptoContext';
import { formatPrice, formatCompact, formatChange } from '@/lib/formatters';
import type { CryptoAsset } from '@/lib/formatters';
import {
  ArrowLeftRight, Calculator, TrendingUp, DollarSign,
  ChevronDown, RefreshCw, Target, Loader2,
} from 'lucide-react';
import { useBreakpoint } from '@/hooks/useBreakpoint';

const FONT_MONO = "'JetBrains Mono', monospace";

// ─── Constants ────────────────────────────────────────────────────────────────

const FIAT_CURRENCIES = Object.freeze([
  { code: 'USD', symbol: '$',  rate: 1 },
  { code: 'IDR', symbol: 'Rp', rate: 16250 },
  { code: 'EUR', symbol: '€',  rate: 0.92 },
  { code: 'GBP', symbol: '£',  rate: 0.79 },
  { code: 'JPY', symbol: '¥',  rate: 149.5 },
  { code: 'SGD', symbol: 'S$', rate: 1.34 },
  { code: 'MYR', symbol: 'RM', rate: 4.71 },
  { code: 'AUD', symbol: 'A$', rate: 1.53 },
] as const);

const DCA_INTERVALS = Object.freeze([
  { label: 'Daily',   days: 1  },
  { label: 'Weekly',  days: 7  },
  { label: 'Monthly', days: 30 },
] as const);

const DCA_DURATIONS = Object.freeze([
  { label: '3 Bulan', months: 3  },
  { label: '6 Bulan', months: 6  },
  { label: '1 Tahun', months: 12 },
  { label: '2 Tahun', months: 24 },
] as const);

const TABS = Object.freeze(['Converter', 'DCA Kalkulator', 'Position Sizer'] as const);
type Tab = typeof TABS[number];

// ─── Shared styles ────────────────────────────────────────────────────────────

const INPUT_BASE = Object.freeze({
  width:        '100%',
  padding:      '8px 12px',
  borderRadius: '8px',
  fontSize:     '13px',
  fontFamily: FONT_MONO,
  outline:      'none',
  background:   'rgba(15,40,100,0.05)',
  border:       '1px solid rgba(15,40,100,0.08)',
  color:        'rgba(8,12,40,1)',
  boxSizing:    'border-box' as const,
});

const LABEL_STYLE = Object.freeze({
  fontFamily: FONT_MONO,
  fontSize:     '10px',
  marginBottom: '5px',
  color:        'rgba(165,175,210,1)',
  letterSpacing:'0.04em',
  display:      'block',
});

const CARD_STYLE = Object.freeze({
  background:   'rgba(15,40,100,0.05)',
  border:       '1px solid rgba(15,40,100,0.08)',
  borderRadius: '12px',
  padding:      '20px',
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface ConverterState {
  fromCoin:           string;
  toCoin:             string;
  fromAmount:         string;
  fiatCode:           string;
  dcaCoin:            string;
  dcaAmount:          string;
  dcaIntervalDays:    number;
  dcaDurationMonths:  number;
  dcaCurrentPrice:    boolean;
  dcaEntryPrice:      string;
  posCoin:            string;
  posAccountSize:     string;
  posRiskPct:         string;
  posEntryPrice:      string;
  posStopLoss:        string;
}

type ConverterAction =
  | { type: 'SET'; key: keyof ConverterState; value: string | number | boolean };

// ─── Reducer ──────────────────────────────────────────────────────────────────

const INITIAL: ConverterState = Object.freeze({
  fromCoin:           'bitcoin',
  toCoin:             'ethereum',
  fromAmount:         '1',
  fiatCode:           'USD',
  dcaCoin:            'bitcoin',
  dcaAmount:          '100',
  dcaIntervalDays:    7,
  dcaDurationMonths:  12,
  dcaCurrentPrice:    true,
  dcaEntryPrice:      '',
  posCoin:            'bitcoin',
  posAccountSize:     '10000',
  posRiskPct:         '2',
  posEntryPrice:      '',
  posStopLoss:        '',
} as ConverterState);

function reducer(state: ConverterState, action: ConverterAction): ConverterState {
  return { ...state, [action.key]: action.value };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtFiat(val: number, code: string, symbol: string): string {
  if (!isFinite(val)) return '—';
  if (code === 'IDR') return symbol + new Intl.NumberFormat('id-ID').format(Math.round(val));
  if (code === 'JPY') return symbol + new Intl.NumberFormat('ja-JP').format(Math.round(val));
  return symbol + new Intl.NumberFormat('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(val);
}

function getFiatRate(code: string): number {
  return FIAT_CURRENCIES.find(f => f.code === code)?.rate ?? 1;
}

// ─── Coin Selector ────────────────────────────────────────────────────────────

interface CoinSelectorProps {
  assets:   CryptoAsset[];
  value:    string;
  onChange: (id: string) => void;
  label:    string;
}

const CoinSelector = memo(({ assets, value, onChange, label }: CoinSelectorProps) => {
  const [open, setOpen]  = useState(false);
  const [q, setQ]        = useState('');
  const ref              = useRef<HTMLDivElement>(null);
  const selected         = useMemo(() => assets.find(a => a.id === value), [assets, value]);

  const filtered = useMemo(() => {
    if (!q) return assets.slice(0, 30);
    const lower = q.toLowerCase();
    return assets.filter(a => a.name.toLowerCase().includes(lower) || a.symbol.toLowerCase().includes(lower)).slice(0, 30);
  }, [assets, q]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <label style={LABEL_STYLE}>{label}</label>
      <button
        onClick={() => setOpen(o => !o)}
        aria-label={label + ' — ' + (selected?.name ?? 'select coin')}
        aria-expanded={open}
        style={{
          width:          '100%',
          display:        'flex',
          alignItems:     'center',
          gap:            '8px',
          padding:        '8px 12px',
          borderRadius:   '10px',
          textAlign:      'left',
          cursor:         'pointer',
          background:     'rgba(15,40,100,0.05)',
          border:         '1px solid ' + (open ? 'rgba(15,40,180,0.22)' : 'rgba(15,40,100,0.08)'),
          color:          'rgba(8,12,40,1)',
          transition:     'border-color 0.15s',
          willChange:     'transform',
        }}
      >
        {selected?.image && (
          <img src={selected.image} alt="" style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0 }} />
        )}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: '12px', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {selected?.name ?? '—'}
          </div>
          <div style={{ fontFamily: FONT_MONO, fontSize: '10px', color: 'rgba(165,175,210,1)' }}>
            {selected ? formatPrice(selected.price) : ''}
          </div>
        </div>
        <ChevronDown size={13} style={{ color: 'rgba(165,175,210,1)', flexShrink: 0, transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
      </button>

      {open && (
        <div style={{
          position:     'absolute',
          left:         0,
          right:        0,
          top:          '100%',
          marginTop:    '4px',
          zIndex:       50,
          borderRadius: '8px',
          overflow:     'hidden',
          background:   'rgba(248,249,252,1)',
          border:       '1px solid rgba(15,40,180,0.12)',
          boxShadow:    '0 8px 32px rgba(0,0,0,0.5)',
          maxHeight:    '280px',
        }}>
          <div style={{ padding: '8px', borderBottom: '1px solid rgba(15,40,100,0.07)' }}>
            <input
              autoFocus
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Cari coin..."
              style={{
                width:        '100%',
                padding:      '6px 8px',
                borderRadius: '8px',
                fontSize:     '12px',
                fontFamily: FONT_MONO,
                outline:      'none',
                background:   'rgba(255,255,255,1)',
                border:       '1px solid rgba(15,40,180,0.12)',
                color:        'rgba(226,232,240,0.9)',
                boxSizing:    'border-box',
              }}
            />
          </div>
          <div style={{ overflowY: 'auto', maxHeight: '220px' }}>
            {filtered.map(a => (
              <button
                key={a.id}
                onClick={() => { onChange(a.id); setOpen(false); setQ(''); }}
                aria-label={'Select ' + a.name}
                aria-selected={a.id === value}
                style={{
                  width:       '100%',
                  display:     'flex',
                  alignItems:  'center',
                  gap:         '8px',
                  padding:     '8px 12px',
                  textAlign:   'left',
                  cursor:      'pointer',
                  background:  a.id === value ? 'rgba(15,40,180,0.07)' : 'transparent',
                  border:      'none',
                  transition:  'background 0.1s',
                  willChange:  'transform',
                }}
                onMouseEnter={e => { if (a.id !== value) e.currentTarget.style.background = 'rgba(15,40,180,0.06)'; }}
                onMouseLeave={e => { if (a.id !== value) e.currentTarget.style.background = 'transparent'; }}
              >
                {a.image && <img src={a.image} alt="" style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0 }} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: FONT_MONO, fontSize: '12px', fontWeight: 600, color: 'rgba(226,232,240,0.9)' }}>
                    {a.symbol.toUpperCase()}
                  </div>
                  <div style={{ fontFamily: FONT_MONO, fontSize: '10px', color: 'rgba(165,175,210,1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {a.name}
                  </div>
                </div>
                <div style={{ textAlign: 'right', flexShrink: 0 }}>
                  <div style={{ fontFamily: FONT_MONO, fontSize: '10px', color: 'rgba(110,120,160,0.7)' }}>
                    {formatPrice(a.price)}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
});
CoinSelector.displayName = 'CoinSelector';

// ─── DCA Chart (SVG) ─────────────────────────────────────────────────────────

interface DCAChartProps { invested: number[]; value: number[]; }

const DCAChart = memo(({ invested, value }: DCAChartProps) => {
  const W = 500; const H = 120;
  const PAD = { t: 8, b: 8, l: 4, r: 4 };
  const cW = W - PAD.l - PAD.r;
  const cH = H - PAD.t - PAD.b;

  const { invPath, valPath } = useMemo(() => {
    if (invested.length < 2) return { invPath: '', valPath: '' };
    const allVals = [...invested, ...value];
    const minV = Math.min(...allVals);
    const maxV = Math.max(...allVals, minV + 1);
    const range = maxV - minV;
    const scaleX = (i: number) => PAD.l + (i / (invested.length - 1)) * cW;
    const scaleY = (v: number) => PAD.t + cH - ((v - minV) / range) * cH;
    const ip = 'M' + invested.map((v, i) => scaleX(i).toFixed(1) + ',' + scaleY(v).toFixed(1)).join('L');
    const vp = 'M' + value.map((v, i) => scaleX(i).toFixed(1) + ',' + scaleY(v).toFixed(1)).join('L');
    return { invPath: ip, valPath: vp };
  }, [invested, value, cW, cH]);

  if (!invPath) return null;

  return (
    <svg width="100%" viewBox={'0 0 ' + W + ' ' + H} preserveAspectRatio="none" style={{ display: 'block', height: H }}>
      <path d={invPath} fill="none" stroke="rgba(15,40,180,0.4)" strokeWidth="1.5" strokeDasharray="4 2" strokeLinecap="round" />
      <path d={valPath} fill="none" stroke="rgba(0,155,95,1)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
});
DCAChart.displayName = 'DCAChart';

// ─── Converter Tab ────────────────────────────────────────────────────────────

const ConverterTab = memo(({ assets, state, dispatch }: {
  assets: CryptoAsset[];
  state:  ConverterState;
  dispatch: React.Dispatch<ConverterAction>;
}) => {
  const set = useCallback((key: keyof ConverterState, value: string) => dispatch({ type: 'SET', key, value }), [dispatch]);

  const fromAsset = useMemo(() => assets.find(a => a.id === state.fromCoin), [assets, state.fromCoin]);
  const toAsset   = useMemo(() => assets.find(a => a.id === state.toCoin),   [assets, state.toCoin]);
  const fiatInfo  = useMemo(() => FIAT_CURRENCIES.find(f => f.code === state.fiatCode) ?? FIAT_CURRENCIES[0], [state.fiatCode]);

  const fromAmt    = parseFloat(state.fromAmount) || 0;
  const resultCoin = useMemo(() => (!fromAsset || !toAsset || !fromAmt) ? 0 : (fromAmt * fromAsset.price) / toAsset.price, [fromAsset, toAsset, fromAmt]);
  const resultFiat = useMemo(() => (!fromAsset || !fromAmt) ? 0 : fromAmt * fromAsset.price * fiatInfo.rate, [fromAsset, fromAmt, fiatInfo]);

  const handleSwap = useCallback(() => {
    dispatch({ type: 'SET', key: 'fromCoin', value: state.toCoin });
    dispatch({ type: 'SET', key: 'toCoin', value: state.fromCoin });
  }, [dispatch, state.fromCoin, state.toCoin]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Coin ↔ Coin */}
      <div style={CARD_STYLE}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <ArrowLeftRight size={14} style={{ color: 'rgba(15,40,180,0.7)' }} />
          <span style={{ fontFamily: FONT_MONO, fontSize: '12px', fontWeight: 600, color: 'rgba(8,12,40,1)' }}>
            Coin ↔ Coin Converter
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: '12px', alignItems: 'end' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <CoinSelector assets={assets} value={state.fromCoin} onChange={v => set('fromCoin', v)} label="Dari" />
            <div>
              <label style={LABEL_STYLE}>Jumlah</label>
              <input
                type="number"
                value={state.fromAmount}
                onChange={e => set('fromAmount', e.target.value)}
                min="0"
                style={INPUT_BASE}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(15,40,180,0.22)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(15,40,100,0.08)'; }}
              />
            </div>
          </div>

          <button
            onClick={handleSwap}
            aria-label="Swap from and to currencies"
            style={{
              display:      'flex',
              alignItems:   'center',
              justifyContent:'center',
              width:        '36px',
              height:       '36px',
              borderRadius: '8px',
              cursor:       'pointer',
              background:   'rgba(15,40,180,0.08)',
              border:       '1px solid rgba(15,40,180,0.20)',
              color:        'rgba(15,40,180,1)',
              willChange:   'transform',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(15,40,180,0.12)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(15,40,180,0.08)'; }}
          >
            <RefreshCw size={14} />
          </button>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <CoinSelector assets={assets} value={state.toCoin} onChange={v => set('toCoin', v)} label="Ke" />
            <div style={{ padding: '8px 12px', borderRadius: '8px', background: 'rgba(0,155,95,0.06)', border: '1px solid rgba(0,155,95,0.12)' }}>
              <div style={{ fontFamily: FONT_MONO, fontSize: '14px', fontWeight: 700, color: 'rgba(0,155,95,1)' }}>
                {resultCoin > 0 ? resultCoin.toFixed(8).replace(/.?0+$/, '') : '—'}
              </div>
              <div style={{ fontFamily: FONT_MONO, fontSize: '10px', color: 'rgba(165,175,210,1)', marginTop: '2px' }}>
                {toAsset ? toAsset.symbol.toUpperCase() : '—'}
              </div>
            </div>
          </div>
        </div>

        {fromAsset && toAsset && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', paddingTop: '12px', marginTop: '12px', borderTop: '1px solid rgba(15,40,100,0.08)' }}>
            <div>
              <span style={{ fontFamily: FONT_MONO, fontSize: '10px', color: 'rgba(165,175,210,1)' }}>
                {'1 ' + fromAsset.symbol.toUpperCase() + ' = '}
              </span>
              <span style={{ fontFamily: FONT_MONO, fontSize: '11px', fontWeight: 600, color: 'rgba(8,12,40,1)' }}>
                {(fromAsset.price / toAsset.price).toFixed(6) + ' ' + toAsset.symbol.toUpperCase()}
              </span>
            </div>
            <div>
              <span style={{ fontFamily: FONT_MONO, fontSize: '10px', color: 'rgba(165,175,210,1)' }}>
                {'1 ' + toAsset.symbol.toUpperCase() + ' = '}
              </span>
              <span style={{ fontFamily: FONT_MONO, fontSize: '11px', fontWeight: 600, color: 'rgba(8,12,40,1)' }}>
                {(toAsset.price / fromAsset.price).toFixed(6) + ' ' + fromAsset.symbol.toUpperCase()}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Coin → Fiat */}
      <div style={CARD_STYLE}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <DollarSign size={14} style={{ color: 'rgba(0,155,95,1)' }} />
          <span style={{ fontFamily: FONT_MONO, fontSize: '12px', fontWeight: 600, color: 'rgba(8,12,40,1)' }}>
            Coin → Fiat
          </span>
        </div>

        <div>
          <label style={LABEL_STYLE}>Mata Uang</label>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
            {FIAT_CURRENCIES.map(f => {
              const active = f.code === state.fiatCode;
              return (
                <button
                  key={f.code}
                  onClick={() => set('fiatCode', f.code)}
                  style={{
                    padding:      '5px 10px',
                    borderRadius: '8px',
                    fontSize:     '11px',
                    fontFamily: FONT_MONO,
                    cursor:       'pointer',
                    background:   active ? 'rgba(0,155,95,0.09)' : 'transparent',
                    color:        active ? 'rgba(0,155,95,1)' : 'rgba(55,65,110,1)',
                    border:       '1px solid ' + (active ? 'rgba(0,155,95,0.28)' : 'rgba(15,40,100,0.08)'),
                    transition:   'all 0.15s',
                    willChange:   'transform',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(243,245,250,1)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                >
                  {f.code}
                </button>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: '12px', padding: '12px 16px', background: 'rgba(0,155,95,0.06)', border: '1px solid rgba(0,155,95,0.09)' }}>
          <div>
            <div style={{ fontFamily: FONT_MONO, fontSize: '10px', color: 'rgba(148,163,184,0.5)', marginBottom: '4px' }}>
              {fromAmt + ' ' + (fromAsset?.symbol.toUpperCase() ?? '—') + ' ='}
            </div>
            <div style={{ fontFamily: FONT_MONO, fontSize: '22px', fontWeight: 700, color: 'rgba(0,155,95,1)' }}>
              {fmtFiat(resultFiat, state.fiatCode, fiatInfo.symbol)}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontFamily: FONT_MONO, fontSize: '10px', color: 'rgba(165,175,210,1)', marginBottom: '2px' }}>Rate</div>
            <div style={{ fontFamily: FONT_MONO, fontSize: '11px', color: 'rgba(110,120,160,0.7)' }}>
              {fmtFiat(getFiatRate(state.fiatCode), state.fiatCode, fiatInfo.symbol) + ' / USD'}
            </div>
            {fromAsset && (
              <div style={{ fontFamily: FONT_MONO, fontSize: '11px', marginTop: '2px', color: fromAsset.change24h >= 0 ? 'rgba(0,155,95,1)' : 'rgba(208,35,75,0.85)' }}>
                {formatChange(fromAsset.change24h) + ' 24h'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});
ConverterTab.displayName = 'ConverterTab';

// ─── DCA Tab ──────────────────────────────────────────────────────────────────

const DCATab = memo(({ assets, state, dispatch }: {
  assets: CryptoAsset[];
  state:  ConverterState;
  dispatch: React.Dispatch<ConverterAction>;
}) => {
  const set = useCallback((key: keyof ConverterState, value: string | number | boolean) =>
    dispatch({ type: 'SET', key, value }), [dispatch]);

  const asset = useMemo(() => assets.find(a => a.id === state.dcaCoin), [assets, state.dcaCoin]);

  const dcaResult = useMemo(() => {
    const amtPerInterval = parseFloat(state.dcaAmount) || 0;
    const entryPrice = state.dcaCurrentPrice ? (asset?.price ?? 0) : (parseFloat(state.dcaEntryPrice) || 0);
    if (!amtPerInterval || !entryPrice) return null;
    const totalDays        = state.dcaDurationMonths * 30;
    const intervals        = Math.floor(totalDays / state.dcaIntervalDays);
    const totalInvested    = amtPerInterval * intervals;
    const coinsAccumulated = totalInvested / entryPrice;
    const currentValue     = coinsAccumulated * (asset?.price ?? entryPrice);
    const pnl              = currentValue - totalInvested;
    const pnlPct           = (pnl / totalInvested) * 100;
    const investedArr: number[] = [];
    const valueArr:    number[] = [];
    const steps = Math.min(intervals, 50);
    for (let i = 0; i <= steps; i++) {
      const frac  = i / steps;
      const inv   = amtPerInterval * (frac * intervals);
      const coins = inv / entryPrice;
      investedArr.push(inv);
      valueArr.push(coins * (asset?.price ?? entryPrice));
    }
    return { totalInvested, coinsAccumulated, currentValue, pnl, pnlPct, intervals, investedArr, valueArr };
  }, [state, asset]);

  const isProfitable = (dcaResult?.pnl ?? 0) >= 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={CARD_STYLE}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Calculator size={14} style={{ color: 'rgba(251,191,36,0.8)' }} />
          <span style={{ fontFamily: FONT_MONO, fontSize: '12px', fontWeight: 600, color: 'rgba(8,12,40,1)' }}>
            DCA Kalkulator
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <CoinSelector assets={assets} value={state.dcaCoin} onChange={v => set('dcaCoin', v)} label="Coin" />
          <div>
            <label style={LABEL_STYLE}>Jumlah per Interval (USD)</label>
            <input
              type="number" value={state.dcaAmount} onChange={e => set('dcaAmount', e.target.value)} min="1"
              style={INPUT_BASE}
              onFocus={e => { e.currentTarget.style.borderColor = 'rgba(15,40,180,0.22)'; }}
              onBlur={e => { e.currentTarget.style.borderColor = 'rgba(15,40,100,0.08)'; }}
            />
          </div>
          <div>
            <label style={LABEL_STYLE}>Interval Beli</label>
            <div style={{ display: 'flex', gap: '6px' }}>
              {DCA_INTERVALS.map(interval => {
                const active = state.dcaIntervalDays === interval.days;
                return (
                  <button key={interval.label} onClick={() => set('dcaIntervalDays', interval.days)} style={{
                    flex: 1, padding: '8px 0', borderRadius: '8px', fontSize: '11px', fontFamily: FONT_MONO, cursor: 'pointer',
                    background: active ? 'rgba(251,191,36,0.12)' : 'transparent',
                    color:      active ? 'rgba(195,125,0,1)' : 'rgba(55,65,110,1)',
                    border:     '1px solid ' + (active ? 'rgba(251,191,36,0.28)' : 'rgba(15,40,100,0.08)'),
                    willChange: 'transform',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(243,245,250,1)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                  >{interval.label}</button>
                );
              })}
            </div>
          </div>
          <div>
            <label style={LABEL_STYLE}>Durasi</label>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {DCA_DURATIONS.map(dur => {
                const active = state.dcaDurationMonths === dur.months;
                return (
                  <button key={dur.label} onClick={() => set('dcaDurationMonths', dur.months)} style={{
                    flex: 1, padding: '8px 0', borderRadius: '8px', fontSize: '11px', fontFamily: FONT_MONO, cursor: 'pointer',
                    background: active ? 'rgba(15,40,180,0.08)' : 'transparent',
                    color:      active ? 'rgba(15,40,180,1)' : 'rgba(55,65,110,1)',
                    border:     '1px solid ' + (active ? 'rgba(15,40,180,0.22)' : 'rgba(15,40,100,0.08)'),
                    willChange: 'transform',
                  }}
                  onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(243,245,250,1)'; }}
                  onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
                  >{dur.label}</button>
                );
              })}
            </div>
          </div>
          <div>
            <label style={LABEL_STYLE}>Harga Entry</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={() => set('dcaCurrentPrice', !state.dcaCurrentPrice)}
                style={{
                  padding: '8px 12px', borderRadius: '8px', fontSize: '11px', fontFamily: FONT_MONO, cursor: 'pointer', flexShrink: 0,
                  background: state.dcaCurrentPrice ? 'rgba(0,155,95,0.09)' : 'transparent',
                  border:     '1px solid ' + (state.dcaCurrentPrice ? 'rgba(0,155,95,0.28)' : 'rgba(15,40,100,0.08)'),
                  color:      state.dcaCurrentPrice ? 'rgba(0,155,95,1)' : 'rgba(55,65,110,1)',
                }}
              >Live Price</button>
              {!state.dcaCurrentPrice && (
                <input
                  type="number" value={state.dcaEntryPrice} onChange={e => set('dcaEntryPrice', e.target.value)} placeholder="Custom..."
                  style={{ ...INPUT_BASE, flex: 1 }}
                  onFocus={e => { e.currentTarget.style.borderColor = 'rgba(15,40,180,0.22)'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = 'rgba(15,40,100,0.08)'; }}
                />
              )}
            </div>
          </div>
        </div>
      </div>

      {dcaResult && (
        <div style={CARD_STYLE}>
          <div style={{ fontFamily: FONT_MONO, fontSize: '12px', fontWeight: 600, color: 'rgba(8,12,40,1)', marginBottom: '16px' }}>
            Hasil Simulasi
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '16px' }}>
            {[
              { label: 'Total Diinvestasi', value: '$' + dcaResult.totalInvested.toLocaleString('en-US', { maximumFractionDigits: 0 }), color: 'rgba(15,40,180,1)' },
              { label: 'Coin Dikumpulkan', value: dcaResult.coinsAccumulated.toFixed(6) + ' ' + (asset?.symbol.toUpperCase() ?? ''), color: 'rgba(195,125,0,1)' },
              { label: 'Nilai Sekarang', value: '$' + dcaResult.currentValue.toLocaleString('en-US', { maximumFractionDigits: 0 }), color: isProfitable ? 'rgba(0,155,95,1)' : 'rgba(208,35,75,1)' },
              { label: 'P&L', value: (dcaResult.pnl >= 0 ? '+' : '') + '$' + Math.abs(dcaResult.pnl).toLocaleString('en-US', { maximumFractionDigits: 0 }) + ' (' + (dcaResult.pnlPct >= 0 ? '+' : '') + dcaResult.pnlPct.toFixed(1) + '%)', color: isProfitable ? 'rgba(0,155,95,1)' : 'rgba(208,35,75,1)' },
            ].map(stat => (
              <div key={stat.label} style={{ borderRadius: '12px', padding: '12px', background: 'rgba(255,255,255,1)', border: '1px solid rgba(15,40,100,0.08)' }}>
                <div style={{ fontFamily: FONT_MONO, fontSize: '10px', color: 'rgba(165,175,210,1)', marginBottom: '4px' }}>{stat.label}</div>
                <div style={{ fontFamily: FONT_MONO, fontSize: '13px', fontWeight: 700, color: stat.color }}>{stat.value}</div>
              </div>
            ))}
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '24px', height: '2px', background: 'rgba(15,40,180,0.4)', borderTop: '2px dashed rgba(15,40,180,0.4)' }} />
                <span style={{ fontFamily: FONT_MONO, fontSize: '10px', color: 'rgba(148,163,184,0.5)' }}>Invested</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <div style={{ width: '24px', height: '2px', background: 'rgba(0,155,95,1)' }} />
                <span style={{ fontFamily: FONT_MONO, fontSize: '10px', color: 'rgba(148,163,184,0.5)' }}>Portfolio Value</span>
              </div>
            </div>
            <div style={{ borderRadius: '12px', overflow: 'hidden', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(15,40,100,0.08)', padding: '12px 8px 4px' }}>
              <DCAChart invested={dcaResult.investedArr} value={dcaResult.valueArr} />
            </div>
          </div>
          <div style={{ fontFamily: FONT_MONO, fontSize: '10px', color: 'rgba(165,175,210,1)', marginTop: '10px' }}>
            * Simulasi menggunakan harga live saat ini sebagai referensi. Bukan financial advice.
          </div>
        </div>
      )}
    </div>
  );
});
DCATab.displayName = 'DCATab';

// ─── Position Sizer Tab ───────────────────────────────────────────────────────

const PositionSizerTab = memo(({ assets, state, dispatch }: {
  assets: CryptoAsset[];
  state:  ConverterState;
  dispatch: React.Dispatch<ConverterAction>;
}) => {
  const set = useCallback((key: keyof ConverterState, value: string) => dispatch({ type: 'SET', key, value }), [dispatch]);
  const asset = useMemo(() => assets.find(a => a.id === state.posCoin), [assets, state.posCoin]);

  const result = useMemo(() => {
    const account = parseFloat(state.posAccountSize) || 0;
    const riskPct = parseFloat(state.posRiskPct) || 0;
    const entry   = parseFloat(state.posEntryPrice) || (asset?.price ?? 0);
    const sl      = parseFloat(state.posStopLoss) || 0;
    if (!account || !riskPct || !entry || !sl || sl >= entry) return null;
    const riskUsd   = account * (riskPct / 100);
    const slPct     = ((entry - sl) / entry) * 100;
    const posSize   = riskUsd / (entry * (slPct / 100));
    const posValue  = posSize * entry;
    const leverage  = posValue / account;
    const rrRatio   = (entry * 1.02 - entry) / (entry - sl);
    return { riskUsd, slPct, posSize, posValue, leverage, rrRatio };
  }, [state, asset]);

  const FIELDS = useMemo(() => Object.freeze([
    { key: 'posAccountSize' as const, label: 'Ukuran Akun (USD)',             placeholder: '10000' },
    { key: 'posRiskPct'     as const, label: 'Risk per Trade (%)',             placeholder: '2' },
    { key: 'posEntryPrice'  as const, label: 'Entry Price — kosong = live',   placeholder: asset ? formatPrice(asset.price) : '' },
    { key: 'posStopLoss'    as const, label: 'Stop Loss Price (USD)',          placeholder: '' },
  ]), [asset]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={CARD_STYLE}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <Target size={14} style={{ color: 'rgba(208,35,75,0.85)' }} />
          <span style={{ fontFamily: FONT_MONO, fontSize: '12px', fontWeight: 600, color: 'rgba(8,12,40,1)' }}>
            Position Sizer
          </span>
          <span style={{ fontSize: '10px', fontFamily: FONT_MONO, padding: '2px 6px', borderRadius: '4px', marginLeft: 'auto', background: 'rgba(208,35,75,0.09)', color: 'rgba(208,35,75,0.85)', border: '1px solid rgba(208,35,75,0.22)' }}>
            Risk Management
          </span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <CoinSelector assets={assets} value={state.posCoin} onChange={v => set('posCoin', v)} label="Coin" />
          {FIELDS.map(field => (
            <div key={field.key}>
              <label style={LABEL_STYLE}>{field.label}</label>
              <input
                type="number" value={state[field.key] as string} onChange={e => set(field.key, e.target.value)} placeholder={field.placeholder} min="0"
                style={INPUT_BASE}
                onFocus={e => { e.currentTarget.style.borderColor = 'rgba(15,40,180,0.22)'; }}
                onBlur={e => { e.currentTarget.style.borderColor = 'rgba(15,40,100,0.08)'; }}
              />
            </div>
          ))}
        </div>
      </div>

      {result ? (
        <div style={CARD_STYLE}>
          <div style={{ fontFamily: FONT_MONO, fontSize: '12px', fontWeight: 600, color: 'rgba(8,12,40,1)', marginBottom: '14px' }}>
            Hasil Kalkulasi
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
            {[
              { label: 'Risk USD',        value: '$' + result.riskUsd.toFixed(2),                                                               color: 'rgba(208,35,75,1)' },
              { label: 'SL Distance',     value: result.slPct.toFixed(2) + '%',                                                                  color: 'rgba(195,125,0,1)' },
              { label: 'Position Size',   value: result.posSize.toFixed(6) + ' ' + (asset?.symbol.toUpperCase() ?? ''),                          color: 'rgba(15,40,180,1)' },
              { label: 'Position Value',  value: '$' + result.posValue.toLocaleString('en-US', { maximumFractionDigits: 0 }),                    color: 'rgba(15,40,180,1)' },
              { label: 'Leverage Used',   value: result.leverage.toFixed(2) + 'x',                                                               color: result.leverage > 3 ? 'rgba(208,35,75,1)' : 'rgba(0,155,95,1)' },
              { label: 'R:R (2% TP)',     value: '1:' + result.rrRatio.toFixed(2),                                                               color: result.rrRatio >= 2 ? 'rgba(0,155,95,1)' : 'rgba(195,125,0,1)' },
            ].map(stat => (
              <div key={stat.label} style={{ borderRadius: '12px', padding: '12px', background: 'rgba(255,255,255,1)', border: '1px solid rgba(15,40,100,0.08)' }}>
                <div style={{ fontFamily: FONT_MONO, fontSize: '10px', color: 'rgba(165,175,210,1)', marginBottom: '4px' }}>{stat.label}</div>
                <div style={{ fontFamily: FONT_MONO, fontSize: '13px', fontWeight: 700, color: stat.color }}>{stat.value}</div>
              </div>
            ))}
          </div>
          {result.leverage > 5 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 12px', borderRadius: '8px', marginTop: '12px', background: 'rgba(208,35,75,0.07)', border: '1px solid rgba(208,35,75,0.18)' }}>
              <TrendingUp size={12} style={{ color: 'rgba(208,35,75,0.85)' }} />
              <span style={{ fontFamily: FONT_MONO, fontSize: '11px', color: 'rgba(208,35,75,0.85)' }}>
                Leverage tinggi! Pertimbangkan kecilkan position atau perlebar SL.
              </span>
            </div>
          )}
          <div style={{ fontFamily: FONT_MONO, fontSize: '10px', color: 'rgba(165,175,210,1)', marginTop: '10px' }}>
            * Bukan financial advice. Selalu atur risk sesuai toleransi kamu.
          </div>
        </div>
      ) : (
        <div style={{ ...CARD_STYLE, textAlign: 'center', padding: '40px' }}>
          <Target size={28} style={{ color: 'rgba(148,163,184,0.2)', margin: '0 auto 8px' }} />
          <div style={{ fontFamily: FONT_MONO, fontSize: '12px', color: 'rgba(165,175,210,1)' }}>
            Isi semua field di atas untuk kalkulasi position size
          </div>
        </div>
      )}
    </div>
  );
});
PositionSizerTab.displayName = 'PositionSizerTab';

// ─── Main Page ────────────────────────────────────────────────────────────────

const Converter = memo(() => {
  const { assets, loading } = useCrypto();
  const { isMobile } = useBreakpoint();
  const mountedRef = useRef(true);
  const [activeTab, setActiveTab] = useState<Tab>('Converter');
  const [state, dispatch]         = useReducer(reducer, INITIAL);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  useEffect(() => {
    if (assets.length > 0) setLastUpdated(Date.now());
  }, [assets]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const handleTab = useCallback((tab: Tab) => {
    if (!mountedRef.current) return;
    setActiveTab(tab);
  }, []);

  const pageStyle = useMemo(() => ({
    display: 'flex', flexDirection: 'column' as const, gap: '16px',
    padding: isMobile ? '12px' : '16px', minHeight: '100vh',
  }), [isMobile]);

  const lastUpdStr = lastUpdated
    ? new Date(lastUpdated).toLocaleTimeString()
    : '—';

  if (!loading && assets.length === 0) {
    return (
      <div style={pageStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <div style={{ fontFamily: FONT_MONO, fontSize: '13px', color: 'rgba(255,68,136,1)' }}>⚠ Gagal memuat data aset. Periksa koneksi internet.</div>
        </div>
      </div>
    );
  }

  if (loading && assets.length === 0) {
    return (
      <div style={pageStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
          <Loader2 style={{ color: 'rgba(15,40,180,1)', animation: 'spin 1s linear infinite' }} size={32} />
        </div>
      </div>
    );
  }

  return (
    <div style={pageStyle}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', willChange: 'transform' }}>
        <h1 style={{ fontFamily: FONT_MONO, fontSize: '20px', fontWeight: 700, margin: 0, background: 'linear-gradient(135deg, rgba(15,40,180,1), rgba(15,40,180,1))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', letterSpacing: '0.04em' }}>
          Converter & Tools
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '3px 10px', borderRadius: '6px', background: 'rgba(15,40,180,0.05)', border: '1px solid rgba(15,40,180,0.12)' }}>
          <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(0,155,95,1)', boxShadow: '0 0 5px rgba(0,155,95,1)', flexShrink: 0 }} />
          <span style={{ fontFamily: FONT_MONO, fontSize: '10px', color: 'rgba(0,155,95,1)', letterSpacing: '0.06em' }}>
            Live Prices
          </span>
        </div>
        <span style={{ fontFamily: FONT_MONO, fontSize: '10px', color: 'rgba(80,80,100,1)', marginLeft: 'auto' }}>Updated: {lastUpdStr}</span>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '6px', flexWrap: isMobile ? 'wrap' : 'nowrap' }} role="tablist" aria-label="Converter tools">
        {TABS.map(tab => {
          const active = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => handleTab(tab)}
              aria-selected={active}
              role="tab"
              style={{
                padding:      '8px 16px',
                borderRadius: '8px',
                fontSize:     '12px',
                fontFamily: FONT_MONO,
                cursor:       'pointer',
                background:   active ? 'rgba(15,40,180,0.08)' : 'transparent',
                color:        active ? 'rgba(15,40,180,1)' : 'rgba(55,65,110,1)',
                border:       '1px solid ' + (active ? 'rgba(15,40,180,0.22)' : 'rgba(15,40,100,0.08)'),
                transition:   'all 0.15s',
                willChange:   'transform',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'rgba(243,245,250,1)'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}
            >
              {tab}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeTab === 'Converter'       && <ConverterTab     assets={assets} state={state} dispatch={dispatch} />}
      {activeTab === 'DCA Kalkulator'  && <DCATab           assets={assets} state={state} dispatch={dispatch} />}
      {activeTab === 'Position Sizer'  && <PositionSizerTab assets={assets} state={state} dispatch={dispatch} />}
    </div>
  );
});
Converter.displayName = 'Converter';

export default Converter;
