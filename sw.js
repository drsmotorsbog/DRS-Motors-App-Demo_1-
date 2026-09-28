/* GENERADO por herramientas/publicar.py — no editar. */
/* Caché de las demos: la app y el CRM funcionan sin internet después de la primera visita.
   Páginas: primero la red (si hay internet se ve lo último); archivos: primero la caché. */
const VERSION = 'drs-demos-120f6bd20469';
const ARCHIVOS = [
  "./",
  "crm/",
  "css/app.css",
  "css/base.css",
  "css/crm.css",
  "css/drs.tokens.css",
  "css/escritorio.css",
  "css/flujos.css",
  "css/fuentes.css",
  "css/ios.css",
  "css/lanzador.css",
  "css/mapa.css",
  "css/movil.css",
  "css/panel-mas.css",
  "css/panel.css",
  "css/servicios.css",
  "css/tema.css",
  "css/v2.css",
  "css/v3.css",
  "iconos/icono-180.png",
  "iconos/icono-192.png",
  "iconos/icono-32.png",
  "iconos/icono-512.png",
  "js/app/arranque.js",
  "js/app/avisos.js",
  "js/app/demo-menu.js",
  "js/app/ios.js",
  "js/app/lanzador.js",
  "js/app/pago.js",
  "js/app/tel.js",
  "js/blueprint-mas.js",
  "js/blueprint.js",
  "js/comercio/crm.js",
  "js/comercio/datos-comercio.js",
  "js/comercio/panel.js",
  "js/comercio/vistas.js",
  "js/datos.js",
  "js/estado.js",
  "js/iconos-app.js",
  "js/mapa.js",
  "js/marca.js",
  "js/modelo.js",
  "js/reloj.js",
  "js/tema.js",
  "js/usuario/beneficios.js",
  "js/usuario/catalogo.js",
  "js/usuario/comun.js",
  "js/usuario/explorar.js",
  "js/usuario/garaje.js",
  "js/usuario/informe.js",
  "js/usuario/inicio.js",
  "js/usuario/otras.js",
  "js/usuario/perfil.js",
  "js/usuario/registro.js",
  "js/usuario/reservas.js",
  "js/usuario/soat.js",
  "js/usuario/tramites.js",
  "js/usuario/whatsapp.js",
  "js/util.js",
  "js/variantes/v1.js",
  "js/variantes/v2.js",
  "js/variantes/v3.js",
  "manifest.webmanifest",
  "index.html",
  "crm/index.html"
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(ARCHIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  const guardar = (resp) => { if (resp && resp.ok) { const copia = resp.clone(); caches.open(VERSION).then((c) => c.put(r, copia)); } return resp; };
  if (r.mode === 'navigate') {
    e.respondWith(fetch(r).then(guardar).catch(() => caches.match(r, { ignoreSearch: true }).then((x) => x || caches.match('./'))));
    return;
  }
  e.respondWith(caches.match(r, { ignoreSearch: true }).then((x) => x || fetch(r).then(guardar)));
});
