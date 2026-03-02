/**
 * main.tsx — ZERØ MERIDIAN 2026 push80
 * push80: Merged full SW registration from src/main.tsx into root entry.
 *   - Periodic Background Sync (zm-price-sync, 5 min)
 *   - Background Sync (zm-market-sync)
 *   - Update detection + reload prompt
 * Root entry point — index.html → ./main.tsx → ./src/App.tsx
 */
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './src/App.tsx';
import './index.css';

// ─── Extended SW types ────────────────────────────────────────────────────────

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

// ─── SW registration ──────────────────────────────────────────────────────────

async function registerSW(): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  if (import.meta.env.DEV) return;

  try {
    const reg = await navigator.serviceWorker.register('/sw.js', {
      scope:          '/',
      updateViaCache: 'none',
    }) as ExtendedServiceWorkerRegistration;

    // Detect update: new version installed in background
    reg.addEventListener('updatefound', () => {
      const next = reg.installing;
      if (!next) return;
      next.addEventListener('statechange', () => {
        if (next.state === 'installed' && navigator.serviceWorker.controller) {
          console.info('[ZM SW] Update available — reload to apply.');
        }
      });
    });

    // Periodic Background Sync — price refresh every 5 min
    if (reg.periodicSync) {
      try {
        const status = await navigator.permissions.query({
          name: 'periodic-background-sync' as PermissionName,
        });
        if (status.state === 'granted') {
          await reg.periodicSync.register('zm-price-sync', {
            minInterval: 5 * 60 * 1000,
          });
        }
      } catch { /* ignore — unsupported browser */ }
    }

    // Background Sync — market data on reconnect
    if (reg.sync) {
      try {
        await reg.sync.register('zm-market-sync');
      } catch { /* ignore */ }
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

// Non-blocking SW registration after app is interactive
if ('requestIdleCallback' in window) {
  requestIdleCallback(registerSW);
} else {
  setTimeout(registerSW, 1200);
}
