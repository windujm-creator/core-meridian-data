/**
 * usePushNotifications.ts — ZERØ MERIDIAN 2026
 * Push notification + price alerts
 * - Zero JSX ✓
 * - mountedRef ✓
 * - useCallback ✓
 */

import { useRef, useEffect, useCallback, useState } from 'react';

export type PushStatus = 'idle' | 'requesting' | 'granted' | 'denied' | 'unsupported';

export interface PushNotificationAPI {
  status:      PushStatus;
  isSupported: boolean;
  request:     () => Promise<void>;
  notify:      (title: string, body: string, url?: string) => void;
}

export function usePushNotifications(): PushNotificationAPI {
  const mountedRef               = useRef(true);
  const [status, setStatus]      = useState<PushStatus>(() => {
    if (typeof Notification === 'undefined') return 'unsupported';
    if (Notification.permission === 'granted') return 'granted';
    if (Notification.permission === 'denied')  return 'denied';
    return 'idle';
  });

  const isSupported = typeof Notification !== 'undefined';

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const request = useCallback(async (): Promise<void> => {
    if (!isSupported || !mountedRef.current) return;
    if (status === 'granted') return;

    setStatus('requesting');
    try {
      const result = await Notification.requestPermission();
      if (!mountedRef.current) return;
      setStatus(result === 'granted' ? 'granted' : 'denied');
    } catch {
      if (mountedRef.current) setStatus('denied');
    }
  }, [isSupported, status]);

  const notify = useCallback((title: string, body: string, url = '/dashboard'): void => {
    if (!isSupported || Notification.permission !== 'granted') return;
    try {
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.ready.then((reg) => {
          reg.showNotification(title, {
            body,
            icon:     '/icons/icon-192.png',
            badge:    '/icons/badge-72.png',
            tag:      'zm-price-alert',
            renotify: true,
            data:     { url },
          });
        }).catch(() => {
          new Notification(title, { body, icon: '/icons/icon-192.png' });
        });
      } else {
        new Notification(title, { body, icon: '/icons/icon-192.png' });
      }
    } catch {}
  }, [isSupported]);

  return { status, isSupported, request, notify };
}
