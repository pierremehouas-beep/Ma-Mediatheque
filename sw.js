/* My Mediatheque — cache limité à cette application */
const CACHE = "my-mediatheque-v2";
const APP_SHELL = ["./", "./index.html", "./style.css", "./app.js"];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    // Ne supprime que les anciennes versions de CE service worker.
    const keys = await caches.keys();
    await Promise.all(keys.filter(key => key.startsWith("my-mediatheque-") && key !== CACHE).map(key => caches.delete(key)));
    await self.clients.claim();
  })());
});

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);

  // Les affiches TMDB peuvent être conservées pour la consultation hors ligne.
  if (url.hostname === "image.tmdb.org") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok || response.type === "opaque") event.waitUntil(cache.put(request, response.clone()));
      return response;
    })());
    return;
  }

  // Ne traite que les fichiers servis dans le sous-dossier de cette application.
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    try {
      const response = await fetch(request);
      if (response.ok) event.waitUntil(cache.put(request, response.clone()));
      return response;
    } catch (error) {
      return (await cache.match(request)) || (await cache.match("./index.html"));
    }
  })());
});
