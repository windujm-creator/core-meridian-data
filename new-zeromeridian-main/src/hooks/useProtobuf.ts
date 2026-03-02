/**
 * useProtobuf.ts — ZERØ MERIDIAN 2026 Phase 9
 * Binary decode Binance WebSocket feed (protobuf-like binary protocol).
 * Fallback to TextDecoder + JSON.parse if not binary.
 * Zero JSX ✓  mountedRef ✓  useCallback/useMemo ✓
 */
import { useRef, useEffect, useCallback, useState, useMemo } from 'react';

export interface DecodedTrade {
  eventType: string;
  symbol: string;
  price: number;
  qty: number;
  ts: number;
  isBuyer: boolean;
  raw?: Record<string, unknown>;
}

export type ProtobufStatus = 'idle' | 'ready' | 'error';

export interface ProtobufAPI {
  status: ProtobufStatus;
  decodedCount: number;
  binaryCount: number;
  jsonCount: number;
  decode: (data: ArrayBuffer | string) => DecodedTrade | null;
  decodeMany: (data: ArrayBuffer | string) => DecodedTrade[];
}

const SYM = Object.freeze<Record<number, string>>({
  1: 'BTCUSDT', 2: 'ETHUSDT', 3: 'BNBUSDT', 4: 'SOLUSDT',
  5: 'XRPUSDT', 6: 'ADAUSDT', 7: 'DOGEUSDT', 8: 'AVAXUSDT',
});

const EVT = Object.freeze<Record<number, string>>({
  1: 'trade', 2: 'aggTrade', 3: 'kline', 4: 'depthUpdate', 5: 'ticker',
});

function readVarint(v: DataView, o: number): [number, number] {
  let r = 0, s = 0, p = o;
  while (p < v.byteLength) {
    const b = v.getUint8(p++);
    r |= (b & 0x7F) << s;
    s += 7;
    if (!(b & 0x80)) break;
  }
  return [r, p];
}

function decodeBin(buf: ArrayBuffer): DecodedTrade | null {
  try {
    if (buf.byteLength < 8) return null;
    const v = new DataView(buf);
    if (v.getUint8(0) === 0x7B) return null;
    let p = 0;
    const [eid, p1] = readVarint(v, p); p = p1;
    const [sid, p2] = readVarint(v, p); p = p2;
    if (p + 8 > v.byteLength) return null;
    const pr = (v.getUint32(p, true) + v.getUint32(p + 4, true) * 0x100000000) / 1e8; p += 8;
    if (p + 8 > v.byteLength) return null;
    const qt = (v.getUint32(p, true) + v.getUint32(p + 4, true) * 0x100000000) / 1e8; p += 8;
    const [ts] = readVarint(v, p);
    const ib = p + 1 < v.byteLength ? v.getUint8(p + 1) === 1 : false;
    return {
      eventType: EVT[eid] ?? 'unknown',
      symbol: SYM[sid] ?? 'UNKNOWN',
      price: pr,
      qty: qt,
      ts: ts > 1e12 ? ts : Date.now(),
      isBuyer: ib,
    };
  } catch {
    return null;
  }
}

const TD = new TextDecoder('utf-8');

function decodeJson(data: ArrayBuffer | string): DecodedTrade | null {
  try {
    const t = typeof data === 'string' ? data : TD.decode(data);
    const r = JSON.parse(t) as Record<string, unknown>;

    if (r.e === 'aggTrade' || r.e === 'trade') {
      return {
        eventType: String(r.e),
        symbol: String(r.s ?? 'UNKNOWN'),
        price: parseFloat(String(r.p ?? 0)),
        qty: parseFloat(String(r.q ?? 0)),
        ts: typeof r.T === 'number' ? r.T : Date.now(),
        isBuyer: r.m === false,
        raw: r,
      };
    }
    if (r.e === '24hrTicker' || r.e === 'ticker') {
      return {
        eventType: 'ticker',
        symbol: String(r.s ?? 'UNKNOWN'),
        price: parseFloat(String(r.c ?? 0)),
        qty: parseFloat(String(r.v ?? 0)),
        ts: typeof r.E === 'number' ? r.E : Date.now(),
        isBuyer: false,
        raw: r,
      };
    }
    if (r.e === 'depthUpdate') {
      return {
        eventType: 'depthUpdate',
        symbol: String(r.s ?? 'UNKNOWN'),
        price: 0,
        qty: 0,
        ts: typeof r.E === 'number' ? r.E : Date.now(),
        isBuyer: false,
        raw: r,
      };
    }
    return null;
  } catch {
    return null;
  }
}

export function useProtobuf(): ProtobufAPI {
  const mountedRef = useRef(true);
  const [status, setStatus] = useState<ProtobufStatus>('idle');
  const dc = useRef(0), bc = useRef(0), jc = useRef(0);
  const [counts, setCounts] = useState({ decoded: 0, binary: 0, json: 0 });

  useEffect(() => {
    mountedRef.current = true;
    setStatus('ready');
    return () => { mountedRef.current = false; };
  }, []);

  const decode = useCallback((data: ArrayBuffer | string): DecodedTrade | null => {
    let res: DecodedTrade | null = null;
    if (data instanceof ArrayBuffer && data.byteLength > 0) {
      const v = new DataView(data);
      if (v.getUint8(0) !== 0x7B) {
        res = decodeBin(data);
        if (res) bc.current++;
      }
    }
    if (!res) {
      res = decodeJson(data);
      if (res) jc.current++;
    }
    if (res) {
      dc.current++;
      if (mountedRef.current && dc.current % 50 === 0) {
        setCounts({ decoded: dc.current, binary: bc.current, json: jc.current });
      }
    }
    return res;
  }, []);

  const decodeMany = useCallback((data: ArrayBuffer | string): DecodedTrade[] => {
    const s = decode(data);
    return s ? [s] : [];
  }, [decode]);

  return useMemo(() => ({
    status,
    decodedCount: counts.decoded,
    binaryCount: counts.binary,
    jsonCount: counts.json,
    decode,
    decodeMany,
  }), [status, counts, decode, decodeMany]);
}
