const C="mt-v1";
self.addEventListener("install",e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(["./"])).catch(()=>{}))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{const r=e.request,u=new URL(r.url);if(r.method!=="GET")return;
 const keep=(x)=>{if(x&&(x.ok||x.type==="opaque")){const y=x.clone();caches.open(C).then(c=>c.put(r,y))}return x};
 if(u.hostname==="image.tmdb.org"){e.respondWith(caches.match(r).then(m=>m||fetch(r).then(keep)));return}
 if(u.origin===location.origin)e.respondWith(fetch(r).then(keep).catch(()=>caches.match(r).then(m=>m||caches.match("./"))))});
