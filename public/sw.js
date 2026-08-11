// Minimal service worker. Its main job is to satisfy PWA installability
// requirements (a fetch handler must be registered) and give a small
// amount of offline resilience for static assets. It intentionally does
// NOT cache API responses or dynamic pages — this is a monitoring
// dashboard, so stale incident/status data would be actively misleading.

const CACHE_NAME = "monitoring-platform-shell-v1";
const SHELL_ASSETS = ["/manifest.json", "/icon-192.png", "/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(SHELL_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Only handle GET requests for our own origin's static shell assets.
  // Everything else (API calls, auth, pages) goes straight to the
  // network so the app never shows stale monitoring data.
  if (request.method !== "GET" || !SHELL_ASSETS.some((a) => request.url.endsWith(a))) {
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => cached || fetch(request))
  );
});