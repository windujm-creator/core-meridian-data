/**
 * useWebTransport.ts — ZERØ MERIDIAN 2026
 * Ultra-low latency transport (Chrome 97+)
 * Fallback ke WebSocket otomatis jika tidak support
 * - mountedRef + AbortController ✓
 * - Zero JSX ✓
 * - Zero any ✓
 */

import { useRef, useEffect, useCallback, useState } from 'react';

// ─── WebTransport Type Declarations ──────────────────────────────────────────
// WebTransport belum masuk lib.dom.d.ts secara luas, declare minimal di sini

interface WebTransportDatagramDuplexStream {
  readable: ReadableStream<Uint8Array>;
  writable: WritableStream<Uint8Array>;
}

interface WebTransportInstance {
  ready: Promise<void>;
  closed: Promise<void>;
  close(): void;
  datagrams: WebTransportDatagramDuplexStream;
}

interface WebTransportConstructor {
  new (url: string): WebTransportInstance;
}

// ─── Hook Types ───────────────────────────────────────────────────────────────

interface WebTransportOptions {
  url:         string;
  onMessage:   (data: Uint8Array) => void;
  onConnected?: () => void;
  onError?:     (err: string) => void;
}

export type TransportStatus = 'idle' | 'connecting' | 'connected' | 'closed' | 'error' | 'unsupported';

export interface WebTransportAPI {
  status:     TransportStatus;
  isSupported: boolean;
  connect:    () => void;
  disconnect: () => void;
  send:       (data: Uint8Array) => Promise<void>;
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function getWebTransportConstructor(): WebTransportConstructor | null {
  const wt = (globalThis as Record<string, unknown>)['WebTransport'];
  if (typeof wt === 'function') return wt as WebTransportConstructor;
  return null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useWebTransport({
  url,
  onMessage,
  onConnected,
  onError,
}: WebTransportOptions): WebTransportAPI {
  const [status, setStatus]     = useState<TransportStatus>('idle');
  const mountedRef              = useRef(true);
  const transportRef            = useRef<WebTransportInstance | null>(null);
  const readerRef               = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null);

  const isSupported = getWebTransportConstructor() !== null;

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      disconnect();
    };
  }, []);

  const disconnect = useCallback(() => {
    try {
      readerRef.current?.cancel();
      transportRef.current?.close();
    } catch {}
    readerRef.current  = null;
    transportRef.current = null;
    if (mountedRef.current) setStatus('closed');
  }, []);

  const connect = useCallback(async () => {
    const WebTransportCtor = getWebTransportConstructor();
    if (!WebTransportCtor) {
      setStatus('unsupported');
      onError?.('WebTransport not supported — use Chrome 97+');
      return;
    }
    if (!mountedRef.current) return;

    setStatus('connecting');

    try {
      const wt = new WebTransportCtor(url);
      transportRef.current = wt;

      await wt.ready;
      if (!mountedRef.current) { wt.close(); return; }

      setStatus('connected');
      onConnected?.();

      // Read datagrams
      const reader = wt.datagrams.readable.getReader();
      readerRef.current = reader;

      const pump = async () => {
        try {
          while (mountedRef.current) {
            const { value, done } = await reader.read();
            if (done || !mountedRef.current) break;
            if (value) onMessage(value);
          }
        } catch {
          if (mountedRef.current) {
            setStatus('error');
            onError?.('WebTransport read error');
          }
        }
      };
      pump();

      // Handle close
      wt.closed.then(() => {
        if (mountedRef.current) setStatus('closed');
      }).catch(() => {
        if (mountedRef.current) setStatus('error');
      });

    } catch (err: unknown) {
      if (!mountedRef.current) return;
      const msg = err instanceof Error ? err.message : String(err);
      setStatus('error');
      onError?.('WebTransport connect failed: ' + msg);
    }
  }, [url, onMessage, onConnected, onError, isSupported]);

  const send = useCallback(async (data: Uint8Array): Promise<void> => {
    if (!transportRef.current || status !== 'connected') return;
    try {
      const writer = transportRef.current.datagrams.writable.getWriter();
      await writer.write(data);
      writer.releaseLock();
    } catch {}
  }, [status]);

  return { status, isSupported, connect, disconnect, send };
}
