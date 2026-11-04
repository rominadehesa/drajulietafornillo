// Service worker de la PWA de turnos de la Dra. Julieta.
// Estrategia simple: cache-first para los archivos propios (app shell),
// y TODO lo de Firebase (firestore.googleapis.com, gstatic) va siempre a la
// red: los datos de turnos nunca se sirven desde caché.
// ⚠️ Al cambiar archivos, subí VERSION para que los celulares se actualicen.
const VERSION = "drajulieta-v11";
const APP_SHELL = [
  "./",
  "./index.html",
  "./admin.html",
  "./config.js",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/perfil.jpg",
];

self.addEventListener("install", e => {
  e.waitUntil(
    caches.open(VERSION)
      .then(c => c.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", e => {
  e.waitUntil(
    caches.keys()
      .then(claves => Promise.all(claves.filter(k => k !== VERSION).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  // Solo GETs del propio dominio; Firebase y demás van directo a la red.
  if (e.request.method !== "GET" || url.origin !== self.location.origin) return;
  if (url.pathname.endsWith(".rules")) return;

  e.respondWith(
    caches.match(e.request).then(hit =>
      hit || fetch(e.request).then(resp => {
        const copia = resp.clone();
        caches.open(VERSION).then(c => c.put(e.request, copia));
        return resp;
      }).catch(() => {
        // Sin conexión: mientras haya algo en caché, se abre igual.
        return caches.match(url.pathname.startsWith("/admin") ? "./admin.html" : "./index.html");
      })
    )
  );
});
