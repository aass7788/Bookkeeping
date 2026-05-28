const CACHE_NAME = "bookkeeping-v5";

// 只缓存静态文件，不缓存 API
const STATIC_ASSETS = [
  "/static/scene3d.js",
  "/static/manifest.json",
  "/"
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
});

self.addEventListener("fetch", event => {
  // API 请求：只用网络，不缓存
  if (event.request.url.includes("/api/")) {
    return;
  }
  // 其他：网络优先
  event.respondWith(
    fetch(event.request).then(res => {
      const clone = res.clone();
      caches.open(CACHE_NAME).then(c => c.put(event.request, clone));
      return res;
    }).catch(() => caches.match(event.request))
  );
});
