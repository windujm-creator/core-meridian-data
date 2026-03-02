/**
 * useTokenSecurity.ts — ZERØ MERIDIAN push129
 * push129: Zero :any — all API responses typed with proper interfaces
 * REAL DATA — GoPlus Security API (free, no API key required)
 * Zero JSX. mountedRef + AbortController. useCallback/useMemo.
 */

import { useCallback, useMemo, useRef, useState } from 'react';

// ─── Public types ──────────────────────────────────────────────────────────────

export interface TokenSecurityResult {
  contractAddress: string;
  chainId: number;
  tokenName: string;
  tokenSymbol: string;
  isHoneypot: boolean;
  isMintable: boolean;
  isProxy: boolean;
  isBlacklisted: boolean;
  canTakeBackOwnership: boolean;
  ownerChangeBalance: boolean;
  hiddenOwner: boolean;
  selfDestruct: boolean;
  externalCall: boolean;
  buyTax: number;
  sellTax: number;
  holderCount: number;
  lpHolderCount: number;
  creatorPercent: number;
  ownerPercent: number;
  riskScore: number;
  riskLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  riskFlags: string[];
  isOpenSource: boolean;
  dexInfo: Array<{ name: string; liquidity: string }>;
}

export interface SecurityScanState {
  result: TokenSecurityResult | null;
  loading: boolean;
  error: string | null;
}

// ─── Raw API types ─────────────────────────────────────────────────────────────

interface GoPlusDex {
  name?: string;
  liquidity?: string;
}

interface GoPlusTokenData {
  token_name?:              string;
  token_symbol?:            string;
  is_honeypot?:             string;
  is_mintable?:             string;
  is_proxy?:                string;
  is_blacklisted?:          string;
  can_take_back_ownership?: string;
  owner_change_balance?:    string;
  hidden_owner?:            string;
  self_destruct?:           string;
  external_call?:           string;
  buy_tax?:                 string;
  sell_tax?:                string;
  holder_count?:            string;
  lp_holder_count?:         string;
  creator_percent?:         string;
  owner_percent?:           string;
  is_open_source?:          string;
  dex?:                     GoPlusDex[];
}

interface GoPlusResponse {
  code: number;
  message?: string;
  result?: Record<string, GoPlusTokenData>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const CHAIN_IDS = Object.freeze({
  ethereum: 1,
  bsc: 56,
  polygon: 137,
  arbitrum: 42161,
  base: 8453,
  avalanche: 43114,
} as const);

const GOPLUS_BASE = 'https://api.gopluslabs.io/api/v1';

export const FEATURED_TOKENS = Object.freeze([
  { address: '0xdac17f958d2ee523a2206206994597c13d831ec7', chainId: 1, label: 'USDT' },
  { address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48', chainId: 1, label: 'USDC' },
  { address: '0x2260fac5e5542a773aa44fbcfedf7c193bc2c599', chainId: 1, label: 'WBTC' },
  { address: '0x514910771af9ca656af840dff83e8264ecf986ca', chainId: 1, label: 'LINK' },
  { address: '0x1f9840a85d5af5bf1d1762f925bdaddc4201f984', chainId: 1, label: 'UNI' },
  { address: '0x7fc66500c84a76ad7e9c93437bfc5ac33e2ddae9', chainId: 1, label: 'AAVE' },
  { address: '0xc00e94cb662c3520282e6f5717214004a7f26888', chainId: 1, label: 'COMP' },
  { address: '0x9f8f72aa9304c8b593d555f12ef6589cc3a579a2', chainId: 1, label: 'MKR' },
] as const);

// ─── Risk calculator ───────────────────────────────────────────────────────────

function calcRisk(data: GoPlusTokenData): {
  score: number;
  level: TokenSecurityResult['riskLevel'];
  flags: string[];
} {
  const flags: string[] = [];
  let score = 0;

  if (data.is_honeypot             === '1') { flags.push('HONEYPOT');       score += 80; }
  if (data.hidden_owner            === '1') { flags.push('HIDDEN OWNER');   score += 30; }
  if (data.can_take_back_ownership === '1') { flags.push('RECLAIM OWNER');  score += 25; }
  if (data.owner_change_balance    === '1') { flags.push('OWNER MINT');     score += 25; }
  if (data.self_destruct           === '1') { flags.push('SELF DESTRUCT');  score += 20; }
  if (data.external_call           === '1') { flags.push('EXTERNAL CALL');  score += 15; }
  if (data.is_mintable             === '1') { flags.push('MINTABLE');       score += 15; }
  if (data.is_blacklisted          === '1') { flags.push('BLACKLIST');      score += 10; }
  if (data.is_proxy                === '1') { flags.push('PROXY');          score += 5;  }
  if (parseFloat(data.buy_tax  ?? '0') > 0.1) { flags.push('HIGH BUY TAX');  score += 10; }
  if (parseFloat(data.sell_tax ?? '0') > 0.1) { flags.push('HIGH SELL TAX'); score += 15; }
  if (data.is_open_source !== '1')          { flags.push('NOT VERIFIED');   score += 10; }

  const capped = Math.min(score, 100);
  const level: TokenSecurityResult['riskLevel'] =
    capped >= 70 ? 'CRITICAL' :
    capped >= 40 ? 'HIGH' :
    capped >= 20 ? 'MEDIUM' : 'LOW';

  return { score: capped, level, flags };
}

// ─── Scan function ─────────────────────────────────────────────────────────────

async function scanToken(
  address: string,
  chainId: number,
  signal: AbortSignal
): Promise<TokenSecurityResult> {
  const url = `${GOPLUS_BASE}/token_security/${chainId}?contract_addresses=${address.toLowerCase()}`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error('GoPlus API error: ' + res.status);

  const json = await res.json() as GoPlusResponse;
  if (json.code !== 1) throw new Error(json.message ?? 'GoPlus error');

  const data = json.result?.[address.toLowerCase()];
  if (!data) throw new Error('Token not found');

  const { score, level, flags } = calcRisk(data);

  return {
    contractAddress:      address,
    chainId,
    tokenName:            data.token_name    ?? 'Unknown',
    tokenSymbol:          data.token_symbol  ?? '???',
    isHoneypot:           data.is_honeypot             === '1',
    isMintable:           data.is_mintable             === '1',
    isProxy:              data.is_proxy                === '1',
    isBlacklisted:        data.is_blacklisted          === '1',
    canTakeBackOwnership: data.can_take_back_ownership === '1',
    ownerChangeBalance:   data.owner_change_balance    === '1',
    hiddenOwner:          data.hidden_owner            === '1',
    selfDestruct:         data.self_destruct           === '1',
    externalCall:         data.external_call           === '1',
    buyTax:               parseFloat(data.buy_tax   ?? '0'),
    sellTax:              parseFloat(data.sell_tax  ?? '0'),
    holderCount:          parseInt(data.holder_count    ?? '0'),
    lpHolderCount:        parseInt(data.lp_holder_count ?? '0'),
    creatorPercent:       parseFloat(data.creator_percent ?? '0'),
    ownerPercent:         parseFloat(data.owner_percent   ?? '0'),
    isOpenSource:         data.is_open_source === '1',
    dexInfo:              (data.dex ?? []).map(d => ({ name: d.name ?? '', liquidity: d.liquidity ?? '0' })),
    riskScore: score,
    riskLevel: level,
    riskFlags: flags,
  };
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useTokenSecurity() {
  const [state, setState] = useState<SecurityScanState>({
    result: null, loading: false, error: null,
  });

  const mountedRef = useRef(true);
  const abortRef   = useRef(new AbortController());

  const scan = useCallback(async (address: string, chainId = 1) => {
    if (!address.match(/^0x[0-9a-fA-F]{40}$/)) {
      setState({ result: null, loading: false, error: 'Invalid contract address' });
      return;
    }

    abortRef.current.abort();
    abortRef.current = new AbortController();
    setState({ result: null, loading: true, error: null });

    try {
      const result = await scanToken(address, chainId, abortRef.current.signal);
      if (!mountedRef.current) return;
      setState({ result, loading: false, error: null });
    } catch (err: unknown) {
      if ((err as Error)?.name === 'AbortError') return;
      if (!mountedRef.current) return;
      setState({ result: null, loading: false, error: (err instanceof Error) ? err.message : 'Scan failed' });
    }
  }, []);

  const [batchResults, setBatchResults] = useState<TokenSecurityResult[]>([]);
  const [batchLoading, setBatchLoading] = useState(false);

  const scanBatch = useCallback(async (
    tokens: Array<{ address: string; chainId: number }>
  ) => {
    if (!mountedRef.current) return;
    setBatchLoading(true);
    setBatchResults([]);

    const results: TokenSecurityResult[] = [];

    for (const token of tokens) {
      try {
        await new Promise<void>(res => setTimeout(res, 300));
        const r = await scanToken(token.address, token.chainId, abortRef.current.signal);
        results.push(r);
        if (mountedRef.current) setBatchResults([...results]);
      } catch {
        // skip failed
      }
    }

    if (mountedRef.current) setBatchLoading(false);
  }, []);

  return useMemo(() => ({
    ...state,
    batchResults,
    batchLoading,
    scan,
    scanBatch,
    chainIds: CHAIN_IDS,
  }), [state, batchResults, batchLoading, scan, scanBatch]);
}
