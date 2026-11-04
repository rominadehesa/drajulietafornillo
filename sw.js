// Service worker de la PWA de turnos de la Dra. Julieta.
// Estrategia:
//   - Navegaciones (los HTML): NETWORK-FIRST. Cada recarga trae la versión
//     publicada al instante; la caché se usa solo como respaldo sin conexión.
//   - Estáticos inmutables (íconos, perfil, manifest): cache-first.
//   - Firebase (firestore.googleapis.com, gstatic): SIEMPRE red, nunca caché.
// ⚠️ Al cambiar archivos, subí VERSION para que los celulares se actualicen.
const VERSION = "drajulieta-v17";
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

  // Navegaciones (HTML): red primero, caché solo si falla (offline).
  if (e.request.mode === "navigate") {
    e.respondWith(
      fetch(e.request).then(resp => {
        const copia = resp.clone();
        caches.open(VERSION).then(c => c.put(e.request, copia));
        return resp;
      }).catch(() =>
        caches.match(e.request)
          .then(hit => hit || caches.match(url.pathname.startsWith("/admin") ? "./admin.html" : "./index.html"))
      )
    );
    return;
  }

  // Estáticos inmutables (íconos, perfil, manifest, config): caché primero.
  e.respondWith(
    caches.match(e.request).then(hit =>
      hit || fetch(e.request).then(resp => {
        const copia = resp.clone();
        caches.open(VERSION).then(c => c.put(e.request, copia));
        return resp;
      })
    )
  );
});
