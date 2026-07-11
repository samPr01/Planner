/* Ledger — Service Worker for offline PWA support.
   Cache-first for the app shell, network-first for navigation with offline fallback. */
const CACHE = "ledger-cache-v1";
const CORE_ASSETS = [
    "./",
    "./index.html",
    "./manifest.json",
    "./icon-192.svg",
    "./icon-512.svg",
    "./favicon.ico",
];

self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE).then((cache) => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting())
    );
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim())
    );
});

self.addEventListener("fetch", (event) => {
    const { request } = event;
    if (request.method !== "GET") return;
    const url = new URL(request.url);
    // Skip cross-origin (fonts CDN etc.)
    if (url.origin !== self.location.origin) return;

    // Navigation requests → network first, cache fallback, then offline shell
    if (request.mode === "navigate") {
        event.respondWith(
            fetch(request)
                .then((resp) => {
                    const copy = resp.clone();
                    caches.open(CACHE).then((c) => c.put(request, copy));
                    return resp;
                })
                .catch(() => caches.match(request).then((r) => r || caches.match("./index.html")))
        );
        return;
    }

    // Static assets → cache first, populate on miss
    event.respondWith(
        caches.match(request).then((cached) => {
            if (cached) return cached;
            return fetch(request)
                .then((resp) => {
                    if (!resp || resp.status !== 200 || resp.type !== "basic") return resp;
                    const copy = resp.clone();
                    caches.open(CACHE).then((c) => c.put(request, copy));
                    return resp;
                })
                .catch(() => cached);
        })
    );
});
