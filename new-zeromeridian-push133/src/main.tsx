import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// ─── Extended SW Types ─────────────────────────────────────────────────────────

interface PeriodicSyncManager {
  register(tag: string, options?: { minInterval: number }): Promise<void>;
}

interface SyncManager {
  register(tag: string): Promise<void>;
}

interface ExtendedServiceWorkerRegistration extends ServiceWorkerRegistration {
  periodicSync?: PeriodicSyncManager;
  sync?: SyncManager;
}

// ─── Service Worker Registration ──────────────────────────────────────────────

async function registerSW(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  if (import.meta.env.DEV) return;

  try {
    const reg = await navigator.serviceWorker.register('/sw.js', {
      scope:          '/',
      updateViaCache: 'none',
    }) as ExtendedServiceWorkerRegistration;

    // Update detection
    reg.addEventListener('updatefound', () => {
      const next = reg.installing;
      if (!next) return;
      next.addEventListener('statechange', () => {
        if (next.state === 'installed' && navigator.serviceWorker.controller) {
          console.info('[ZM SW] Update available — reload to apply.');
        }
      });
    });

    // Register Periodic Background Sync
    if (reg.periodicSync) {
      try {
        const status = await navigator.permissions.query({
          name: 'periodic-background-sync' as PermissionName,
        });
        if (status.state === 'granted') {
          await reg.periodicSync.register('zm-price-sync', {
            minInterval: 5 * 60 * 1000, // 5 minutes
          });
        }
      } catch {}
    }

    // Register Background Sync
    if (reg.sync) {
      try {
        await reg.sync.register('zm-market-sync');
      } catch {}
    }

  } catch (err) {
    console.warn('[ZM SW] Registration failed:', err);
  }
}

// ─── Mount ────────────────────────────────────────────────────────────────────

const container = document.getElementById('root');
if (!container) throw new Error('[ZM] Root element #root not found');

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Non-blocking SW register
if ('requestIdleCallback' in window) {
  requestIdleCallback(registerSW);
} else {
  setTimeout(registerSW, 1000);
}
