const CACHE_NAME = "bookkeeping-v2";
const STATIC_ASSETS = [
    "/static/css/style.css",
    "/static/js/utils.js",
    "/static/js/api.js",
    "/static/js/app.js",
    "/static/js/pages/addBill.js",
    "/static/js/pages/billList.js",
    "/static/js/pages/stats.js",
    "/static/js/pages/settings.js",
    "/static/manifest.json",
];

self.addEventListener("install", event => {
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
    );
    self.skipWaiting();
});

self.addEventListener("activate", event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        )
    );
    self.clients.claim();
});

self.addEventListener("fetch", event => {
    const url = new URL(event.request.url);

    // API: network-first
    if (url.pathname.startsWith("/api/")) {
        event.respondWith(
            fetch(event.request).catch(() =>
                new Response(JSON.stringify({ error: "离线状态，无法完成此操作" }), {
                    status: 503,
                    headers: { "Content-Type": "application/json" },
                })
            )
        );
        return;
    }

    // Static: cache-first, then network
    event.respondWith(
        caches.match(event.request).then(cached => {
            const fetchPromise = fetch(event.request).then(networkResp => {
                const clone = networkResp.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                return networkResp;
            });
            return cached || fetchPromise;
        })
    );
});
