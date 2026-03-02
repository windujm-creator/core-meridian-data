/**
 * sw.js — ZERØ MERIDIAN 2026 Phase 7
 * UPGRADE Phase 7:
 * - Background Sync: SyncManager queue for offline alerts
 * - Periodic sync: zm-price-sync every 5 minutes
 * - Offline alert queue stored in Cache Storage (IndexedDB in SW context)
 */

const CACHE_NAME    = 'zm-v4';
const OFFLINE_URL   = '/offline.html';
const STATIC_ASSETS = [
  '/',
  '/dashboard',
  '/markets',
  '/defi',
  '/offline.html',
  '/manifest.json',
  '/favicon.ico',
];

// ─── Alert queue (stored in cache for background sync) ────────────────────────

const ALERT_QUEUE_KEY = 'zm-alert-queue';

async function getAlertQueue() {
  const cache = await caches.open(CACHE_NAME);
  const res   = await cache.match(ALERT_QUEUE_KEY);
  if (!res) return [];
  try { return await res.json(); } catch { return []; }
}

async function setAlertQueue(queue) {
  const cache = await caches.open(CACHE_NAME);
  await cache.put(ALERT_QUEUE_KEY, new Response(JSON.stringify(queue), {
    headers: { 'Content-Type': 'application/json' },
  }));
}

async function flushAlertQueue() {
  const queue = await getAlertQueue();
  if (queue.length === 0) return;

  const failed = [];
  for (const alert of queue) {
    try {
      const res = await fetch('/api/alerts', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(alert),
      });
      if (!res.ok) failed.push(alert);
    } catch {
      failed.push(alert);
    }
  }

  await setAlertQueue(failed);

  // Notify clients that we're back online and alerts synced
  const clients = await self.clients.matchAll();
  clients.forEach(client => client.postMessage({
    type:    'ALERTS_SYNCED',
    flushed: queue.length - failed.length,
    pending: failed.length,
  }));
}

// ─── Install ──────────────────────────────────────────────────────────────────

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return Promise.allSettled(
        STATIC_ASSETS.map(url => cache.add(url).catch(() => {}))
      );
    }).then(() => self.skipWaiting())
  );
});

// ─── Activate ─────────────────────────────────────────────────────────────────

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAME)
          .map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// ─── Fetch ────────────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== 'GET') return;
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return;

  const isExternalApi = (
    url.hostname.includes('binance.com')       ||
    url.hostname.includes('coingecko.com')     ||
    url.hostname.includes('llama.fi')          ||
    url.hostname.includes('alternative.me')    ||
    url.hostname.includes('cryptocompare.com')
  );
  if (isExternalApi) return;

  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      fetch(request)
        .catch(() => new Response(JSON.stringify({ error: 'offline' }), {
          headers: { 'Content-Type': 'application/json' },
        }))
    );
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then(res => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then(c => c.put(request, clone));
          }
          return res;
        })
        .catch(() =>
          caches.match(request)
            .then(cached => cached || caches.match(OFFLINE_URL))
        )
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then(c => c.put(request, clone));
        }
        return res;
      }).catch(() => new Response('Not found', { status: 404 }));
    })
  );
});

// ─── Background Sync — SyncManager ────────────────────────────────────────────

self.addEventListener('sync', (event) => {
  // Market data sync: notify clients to refetch
  if (event.tag === 'zm-market-sync' || event.tag === 'zm-bg-sync') {
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage({ type: 'BACK_ONLINE' }));
      })
    );
  }

  // Alert queue sync: flush queued alerts when back online
  if (event.tag === 'zm-alert-queue-sync') {
    event.waitUntil(flushAlertQueue());
  }
});

// ─── Periodic Background Sync ─────────────────────────────────────────────────

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'zm-price-sync') {
    event.waitUntil(
      self.clients.matchAll().then(clients => {
        clients.forEach(client => client.postMessage({ type: 'PERIODIC_SYNC_TICK' }));
      })
    );
  }
});

// ─── Push Notifications ───────────────────────────────────────────────────────

self.addEventListener('push', (event) => {
  if (!event.data) return;
  let data = {};
  try { data = event.data.json(); } catch { data = { title: 'ZERØ MERIDIAN', body: event.data.text() }; }

  const title   = data.title   || 'ZERØ MERIDIAN Alert';
  const options = {
    body:    data.body    || 'Price alert triggered!',
    icon:    '/favicon.ico',
    badge:   '/favicon.ico',
    tag:     data.tag     || 'zm-alert',
    vibrate: [100, 50, 100],
    data:    { url: data.url || '/alerts' },
    actions: [
      { action: 'view',    title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  if (event.action === 'dismiss') return;
  const url = event.notification.data?.url || '/dashboard';
  event.waitUntil(self.clients.openWindow(url));
});

// ─── Message ──────────────────────────────────────────────────────────────────

self.addEventListener('message', (event) => {
  if (!event.data) return;
  const { type } = event.data;

  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  // Queue an alert for background sync when offline
  if (type === 'QUEUE_ALERT') {
    getAlertQueue().then(queue => {
      queue.push({ ...event.data.alert, queuedAt: Date.now() });
      return setAlertQueue(queue);
    }).then(() => {
      // Register background sync when back online
      if ('sync' in self.registration) {
        self.registration.sync.register('zm-alert-queue-sync').catch(() => {});
      }
    }).catch(() => {});
  }

  // Clear alert queue (e.g., user dismisses)
  if (type === 'CLEAR_ALERT_QUEUE') {
    setAlertQueue([]).catch(() => {});
  }
});
