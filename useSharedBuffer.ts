/**
 * useSharedBuffer.ts — ZERØ MERIDIAN
 * SharedArrayBuffer ring buffer for zero-copy price streaming.
 * Requires COOP/COEP headers (already set in vercel.json).
 * Zero JSX — pure TS hook.
 * - mountedRef ✓
 * - useCallback + useMemo ✓
 */

import { useRef, useState, useEffect, useCallback, useMemo } from 'react';

export interface SharedBufferState {
  supported:    boolean;
  buffer:       SharedArrayBuffer | null;
  view:         Float64Array | null;
  capacity:     number;
  writeIndex:   number;
}

const BUFFER_CAPACITY = 512; // slots × Float64 (8 bytes each)
const BYTES_PER_SLOT  = 8;

export function useSharedBuffer(capacity = BUFFER_CAPACITY): SharedBufferState & {
  write:    (value: number) => void;
  readAll:  () => Float64Array;
  readLast: (n: number) => Float64Array;
  reset:    () => void;
} {
  const mountedRef    = useRef(true);
  const writeIdxRef   = useRef(0);
  const [state, setState] = useState<SharedBufferState>(() => {
    // typeof check alone is insufficient — SAB can exist but throw SecurityError
    // on instantiation if COOP/COEP headers are mismatched (e.g. credentialless vs require-corp).
    // Always wrap in try/catch to prevent app-level crash.
    try {
      if (typeof SharedArrayBuffer === 'undefined') {
        return { supported: false, buffer: null, view: null, capacity, writeIndex: 0 };
      }
      const buffer = new SharedArrayBuffer(capacity * BYTES_PER_SLOT);
      const view   = new Float64Array(buffer);
      return { supported: true, buffer, view, capacity, writeIndex: 0 };
    } catch {
      return { supported: false, buffer: null, view: null, capacity, writeIndex: 0 };
    }
  });

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const write = useCallback((value: number) => {
    if (!state.view) return;
    const idx = writeIdxRef.current % capacity;
    state.view[idx] = value;
    writeIdxRef.current++;
    if (mountedRef.current) {
      setState(prev => ({ ...prev, writeIndex: writeIdxRef.current }));
    }
  }, [state.view, capacity]);

  const readAll = useCallback((): Float64Array => {
    if (!state.view) return new Float64Array(0);
    const count = Math.min(writeIdxRef.current, capacity);
    const result = new Float64Array(count);
    const startIdx = writeIdxRef.current > capacity
      ? writeIdxRef.current % capacity
      : 0;
    for (let i = 0; i < count; i++) {
      result[i] = state.view[(startIdx + i) % capacity];
    }
    return result;
  }, [state.view, capacity]);

  const readLast = useCallback((n: number): Float64Array => {
    if (!state.view) return new Float64Array(0);
    const count = Math.min(n, Math.min(writeIdxRef.current, capacity));
    const result = new Float64Array(count);
    const endIdx = writeIdxRef.current - 1;
    for (let i = 0; i < count; i++) {
      result[count - 1 - i] = state.view[(endIdx - i + capacity) % capacity];
    }
    return result;
  }, [state.view, capacity]);

  const reset = useCallback(() => {
    if (state.view) {
      state.view.fill(0);
    }
    writeIdxRef.current = 0;
    if (mountedRef.current) {
      setState(prev => ({ ...prev, writeIndex: 0 }));
    }
  }, [state.view]);

  return useMemo(() => ({
    ...state,
    write,
    readAll,
    readLast,
    reset,
  }), [state, write, readAll, readLast, reset]);
}
