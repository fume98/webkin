/*
 * Service worker: guarda la app en el dispositivo para poder abrirla sin internet.
 * Siempre intenta primero la versión más nueva (red) y, si no hay conexión, usa la guardada.
 * Solo maneja archivos de la propia app: los datos de Supabase nunca pasan por acá.
 */
const CACHE = 'consultorio-v5';
const ARCHIVOS = [
  './',
  'index.html',
  'manifest.webmanifest',
  'css/styles.css',
  'js/marca.js',
  'js/tema.js',
  'js/utils.js',
  'js/store.js',
  'js/ui.js',
  'js/marca-ui.js',
  'js/avisos.js',
  'js/vendor/supabase.js',
  'js/config.js',
  'js/nube.js',
  'js/pacientes.js',
  'js/agenda.js',
  'js/pagos.js',
  'js/inicio.js',
  'js/ajustes.js',
  'js/demo.js',
  'js/app.js',
  'img/logo.webp',
  'img/simbolo.webp',
  'img/simbolo-64.png',
  'img/simbolo-180.png',
  'img/simbolo-192.png',
  'img/simbolo-512.png',
  'img/generico.svg',
  'img/generico-64.png',
  'img/generico-180.png',
  'img/generico-192.png',
  'img/generico-512.png'
];

self.addEventListener('install', function (event) {
  event.waitUntil(caches.open(CACHE).then(function (c) { return c.addAll(ARCHIVOS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== CACHE; }).map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(
    fetch(req).then(function (res) {
      if (res && res.ok) {
        const copia = res.clone();
        caches.open(CACHE).then(function (c) { c.put(req, copia); });
      }
      return res;
    }).catch(function () {
      return caches.match(req, { ignoreSearch: true }).then(function (r) {
        return r || (req.mode === 'navigate' ? caches.match('index.html') : undefined);
      });
    })
  );
});
