// レシート仕分けカメラ Service Worker
// アプリ本体（同一オリジン）だけをキャッシュし、Anthropic API などの外部通信は常にネットワークを使う。
const CACHE_NAME = "receipt-sorter-v6";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./img/og.jpg"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // 外部オリジン（Anthropic API 等）はキャッシュしない
  if (url.origin !== self.location.origin) return;
  event.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(req, copy)).catch(() => {});
        return res;
      }).catch(() => {
        if (req.mode === "navigate") return caches.match("./index.html");
        return new Response("", { status: 504 });
      });
    })
  );
});
