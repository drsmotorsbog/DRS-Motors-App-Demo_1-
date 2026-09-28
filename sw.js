/* GENERADO por herramientas/publicar.py — no editar. */
/* Caché de las demos: la app y el CRM funcionan sin internet después de la primera visita.
   Páginas: primero la red, sin la caché HTTP (si hay internet se ve lo último); sin internet, la guardada.
   Archivos: la URL exacta, que lleva la huella del contenido (?v=…); así nunca se mezclan versiones.
   Al activarse una versión nueva, la página se recarga sola una vez (script en el <head> de cada página). */
const VERSION = 'drs-demos-40b7f26aa696';
const ARCHIVOS = [
  "./",
  "crm/",
  "css/app.css?v=e049b5e008",
  "css/base.css?v=7f014d5ac7",
  "css/crm.css?v=6f4525b869",
  "css/drs.tokens.css?v=045d133d62",
  "css/escritorio.css?v=f517c835ea",
  "css/flujos.css?v=35295a0d9c",
  "css/fuentes.css?v=480fc5308f",
  "css/ios.css?v=9ae858a939",
  "css/lanzador.css?v=5ae01362d8",
  "css/mapa.css?v=c5d58f9407",
  "css/movil.css?v=f62d729e35",
  "css/navegacion.css?v=bc97220a5c",
  "css/panel-mas.css?v=c316422d1c",
  "css/panel.css?v=8943cefce1",
  "css/servicios.css?v=9f4040d06a",
  "css/tema.css?v=ecfed58884",
  "css/v2.css?v=6e6bcb8cc1",
  "css/v3.css?v=1fb132324f",
  "css/vehiculos.css?v=b1dcd13bfc",
  "js/app/arranque.js?v=d526e83c64",
  "js/app/avisos.js?v=c77edf0a21",
  "js/app/demo-menu.js?v=d97e3b54f0",
  "js/app/ios.js?v=4aa9074dd0",
  "js/app/lanzador.js?v=cf19a91eac",
  "js/app/pago.js?v=fb2dd21c1d",
  "js/app/tel.js?v=7ccba44973",
  "js/blueprint-mas.js?v=a463832d4c",
  "js/blueprint.js?v=7e7349c3d5",
  "js/comercio/crm.js?v=cb45a45a59",
  "js/comercio/datos-comercio.js?v=00ec523feb",
  "js/comercio/panel.js?v=d58e2dc7c7",
  "js/comercio/vistas.js?v=ffa95df17d",
  "js/datos.js?v=83186d2438",
  "js/estado.js?v=15d0563b6c",
  "js/iconos-app.js?v=eedd592e22",
  "js/mapa.js?v=03e8b23d56",
  "js/marca.js?v=bba0e11dc3",
  "js/modelo.js?v=68d977b2b4",
  "js/reloj.js?v=61b7890076",
  "js/tema.js?v=dc007a37cb",
  "js/usuario/beneficios.js?v=d6292b414a",
  "js/usuario/catalogo.js?v=265be7502a",
  "js/usuario/comun.js?v=477b94034a",
  "js/usuario/explorar.js?v=0e2d5de67a",
  "js/usuario/garaje.js?v=1adf109b5b",
  "js/usuario/informe.js?v=912867f61b",
  "js/usuario/inicio.js?v=8ba8d78418",
  "js/usuario/otras.js?v=53ebe5cd30",
  "js/usuario/perfil.js?v=8606ec28be",
  "js/usuario/registro.js?v=4938846c6c",
  "js/usuario/reservas.js?v=304f691047",
  "js/usuario/soat.js?v=769ed16b40",
  "js/usuario/tramites.js?v=1e6ac344f7",
  "js/usuario/whatsapp.js?v=32bfee0c78",
  "js/util.js?v=c4e1ff23bd",
  "js/variantes/v1.js?v=c712d59103",
  "js/variantes/v2.js?v=bd7777929e",
  "js/variantes/v3.js?v=a5449f06f8",
  "js/vehiculos.js?v=68c2d3f716",
  "iconos/icono-180.png",
  "iconos/icono-192.png",
  "iconos/icono-32.png",
  "iconos/icono-512.png",
  "manifest.webmanifest",
  "index.html",
  "crm/index.html"
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION)
    .then((c) => c.addAll(ARCHIVOS.map((u) => new Request(u, { cache: 'reload' }))))
    .then(() => self.skipWaiting()));
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
    e.respondWith(fetch(r.url, { cache: 'no-cache', credentials: 'same-origin' }).then(guardar)
      .catch(() => caches.match(r, { ignoreSearch: true, ignoreVary: true }).then((x) => x || caches.match('./', { ignoreVary: true }))));
    return;
  }
  e.respondWith(caches.match(r, { ignoreVary: true }).then((x) => x || fetch(r).then(guardar)));
});
