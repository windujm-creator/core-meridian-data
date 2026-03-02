/**
 * usePriceAlerts.ts — ZERØ MERIDIAN 2026 Phase 10
 * Price alert engine — monitor prices, trigger notifications
 * - Zero JSX ✓
 * - mountedRef ✓
 * - useCallback + useMemo ✓
 * - Object.freeze() static data ✓
 * - Zero Math.random() → deterministicJitter ✓
 */

import { useRef, useEffect, useCallback, useState, useMemo } from 'react';
import { useCrypto } from '@/contexts/CryptoContext';
import { usePushNotifications } from './usePushNotifications';
import { formatPrice, deterministicJitter } from '@/lib/formatters';

// ─── Types ────────────────────────────────────────────────────────────────────

export type AlertCondition = 'above' | 'below';
export type AlertStatus    = 'active' | 'triggered' | 'dismissed';

export interface PriceAlert {
  id:         string;
  symbol:     string;
  condition:  AlertCondition;
  targetPrice: number;
  status:     AlertStatus;
  createdAt:  number;
  triggeredAt?: number;
}

export interface PriceAlertsAPI {
  alerts:       PriceAlert[];
  addAlert:     (symbol: string, condition: AlertCondition, targetPrice: number) => void;
  removeAlert:  (id: string) => void;
  dismissAlert: (id: string) => void;
  clearAll:     () => void;
}

// ─── Storage helpers ──────────────────────────────────────────────────────────

const STORAGE_KEY = 'zm_price_alerts';

function loadAlerts(): PriceAlert[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as PriceAlert[];
  } catch {
    return [];
  }
}

function saveAlerts(alerts: PriceAlert[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  } catch {}
}

// Deterministic ID — no Math.random()
let _idCounter = 0;
function genAlertId(): string {
  _idCounter++;
  const jitter = deterministicJitter(_idCounter);
  return 'alert_' + Date.now().toString(36) + '_' + jitter.toString(16).padStart(4, '0');
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function usePriceAlerts(): PriceAlertsAPI {
  const { assets }  = useCrypto();
  const { notify }  = usePushNotifications();
  const mountedRef  = useRef(true);
  const [alerts, setAlerts] = useState<PriceAlert[]>(loadAlerts);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Persist to localStorage on change
  useEffect(() => {
    saveAlerts(alerts);
  }, [alerts]);

  // Price monitor — check every assets update
  useEffect(() => {
    if (!mountedRef.current || assets.length === 0) return;

    setAlerts(prev => {
      let changed = false;
      const next = prev.map(alert => {
        if (alert.status !== 'active') return alert;

        const asset = assets.find(
          a => a.symbol.toLowerCase() === alert.symbol.toLowerCase()
        );
        if (!asset) return alert;

        const triggered =
          (alert.condition === 'above' && asset.price >= alert.targetPrice) ||
          (alert.condition === 'below' && asset.price <= alert.targetPrice);

        if (!triggered) return alert;

        changed = true;

        // Fire notification
        const direction = alert.condition === 'above' ? '▲ Above' : '▼ Below';
        notify(
          'ZERØ MERIDIAN — Price Alert',
          alert.symbol.toUpperCase() + ' ' + direction + ' ' + formatPrice(alert.targetPrice) +
          ' — Now: ' + formatPrice(asset.price),
          '/alerts'
        );

        return {
          ...alert,
          status:      'triggered' as AlertStatus,
          triggeredAt: Date.now(),
        };
      });

      return changed ? next : prev;
    });
  }, [assets, notify]);

  const addAlert = useCallback((
    symbol:      string,
    condition:   AlertCondition,
    targetPrice: number
  ): void => {
    if (!mountedRef.current) return;
    const alert: PriceAlert = {
      id:          genAlertId(),
      symbol:      symbol.toLowerCase(),
      condition,
      targetPrice,
      status:      'active',
      createdAt:   Date.now(),
    };
    setAlerts(prev => [alert, ...prev]);
  }, []);

  const removeAlert = useCallback((id: string): void => {
    if (!mountedRef.current) return;
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const dismissAlert = useCallback((id: string): void => {
    if (!mountedRef.current) return;
    setAlerts(prev => prev.map(a =>
      a.id === id ? { ...a, status: 'dismissed' as AlertStatus } : a
    ));
  }, []);

  const clearAll = useCallback((): void => {
    if (!mountedRef.current) return;
    setAlerts([]);
  }, []);

  return useMemo(() => ({
    alerts, addAlert, removeAlert, dismissAlert, clearAll,
  }), [alerts, addAlert, removeAlert, dismissAlert, clearAll]);
}
