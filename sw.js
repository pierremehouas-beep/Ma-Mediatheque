/* My Mediatheque — cache limité à cette application */
const CACHE = "my-mediatheque-v10";
const APP_SHELL = ["./", "./index.html", "./style.css", "./app.js"];
const OPTIONAL = ["./manifest.json", "./icon-192.png", "./icon-512.png", "./sync.js"];
const IMG_MAX = 250;       // nombre maximal d'affiches gardées pour le hors-ligne
const NET_TIMEOUT = 4000;  // réseau trop lent : on sert la copie en cache

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(APP_SHELL);
    // Ressources secondaires : un échec ici ne doit jamais bloquer l'installation.
    await Promise.allSettled(OPTIONAL.map(u => cache.add(u)));
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

async function trimImages(cache) {
  const keys = await cache.keys();
  const imgs = keys.filter(r => new URL(r.url).hostname === "image.tmdb.org");
  for (const r of imgs.slice(0, Math.max(0, imgs.length - IMG_MAX))) await cache.delete(r);
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;
  const url = new URL(request.url);
  const scope = new URL(self.registration.scope);

  // Les affiches TMDB sont gardées pour la consultation hors ligne (taille plafonnée).
  if (url.hostname === "image.tmdb.org") {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const cached = await cache.match(request);
      if (cached) return cached;
      let response;
      try {
        // En mode CORS la réponse est lisible (pas « opaque ») : elle ne gonfle pas le quota de stockage.
        response = await fetch(url.href, { mode: "cors", credentials: "omit" });
      } catch (e) {
        response = await fetch(request);
      }
      if (response.ok) {
        event.waitUntil(cache.put(request, response.clone()).then(() => trimImages(cache)).catch(() => {}));
      }
      return response;
    })());
    return;
  }

  // Ne traite que les fichiers servis dans le sous-dossier de cette application.
  if (url.origin !== scope.origin || !url.pathname.startsWith(scope.pathname)) return;
  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const net = fetch(request).then(response => {
      if (response.ok) cache.put(request, response.clone()).catch(() => {});
      return response;
    });
    event.waitUntil(net.catch(() => {}));
    const fallback = async () => (await cache.match(request, { ignoreSearch: true })) || (await cache.match("./index.html"));
    try {
      // Réseau d'abord ; s'il traîne (mauvaise connexion), on sert la copie locale.
      return await Promise.race([net, new Promise((_, rej) => setTimeout(() => rej(new Error("timeout")), NET_TIMEOUT))]);
    } catch (error) {
      return (await fallback()) || net;
    }
  })());
});
