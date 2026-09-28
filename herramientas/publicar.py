#!/usr/bin/env python3
"""
Prepara el repositorio para publicarse en GitHub Pages. Ejecutar antes de cada subida:

    python3 "App/DRS-Motors-App-Demo_1-/herramientas/publicar.py"

Genera (no se editan a mano):
  sw.js                 caché para usar la app sin internet: la lista de archivos y una
                        versión que cambia con el contenido, para que el celular baje lo nuevo
  manifest.webmanifest  la ficha de la app instalable; sus colores salen de css/drs.tokens.css
Y pone en index.html y crm/index.html la huella de cada CSS y JS (?v=…): una página nueva
nunca carga un archivo viejo guardado en el celular, y la caché guarda cada versión aparte.

Los íconos se generan aparte con `node herramientas/iconos.cjs` (solo si cambia el logo).
"""
import hashlib
import json
import re
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
AVISO = "GENERADO por herramientas/publicar.py — no editar."
FUERA = {".git", "herramientas", ".DS_Store", "README.md", ".nojekyll", "sw.js", ".gitignore"}


def archivos():
    lista = []
    for f in sorted(RAIZ.rglob("*")):
        if not f.is_file():
            continue
        rel = f.relative_to(RAIZ)
        if any(p in FUERA for p in rel.parts):
            continue
        lista.append(rel.as_posix())
    return lista


def color_noche(rol: str) -> str:
    tokens = (RAIZ / "css" / "drs.tokens.css").read_text(encoding="utf-8")
    noche = tokens[tokens.index('[data-modo="noche"]'):]
    return re.search(rf"--{rol}\s*:\s*(#[0-9A-Fa-f]{{6}})", noche).group(1)


PAGINAS = ["index.html", "crm/index.html"]
REF = re.compile(r'((?:href|src)=")((?:\.\./)?(?:css|js)/[^"?#]+)(?:\?v=[0-9a-f]+)?(")')


def huella(ruta: Path) -> str:
    return hashlib.sha1(ruta.read_bytes()).hexdigest()[:10]


def versionar():
    """Agrega ?v=<huella> a los CSS y JS que carga cada página. Devuelve las URL tal como se piden,
    relativas a la raíz del sitio (las mismas que precarga el service worker)."""
    pedidas = set()
    for pag in PAGINAS:
        ruta = RAIZ / pag
        base = ruta.parent
        texto = ruta.read_text(encoding="utf-8")

        def poner(m):
            archivo = (base / m.group(2)).resolve()
            v = huella(archivo)
            rel = archivo.relative_to(RAIZ).as_posix()
            pedidas.add(f"{rel}?v={v}")
            return f"{m.group(1)}{m.group(2)}?v={v}{m.group(3)}"

        nuevo = REF.sub(poner, texto)
        if nuevo != texto:
            ruta.write_text(nuevo, encoding="utf-8")
    return pedidas


def manifest():
    fondo = color_noche("sup-1")
    datos = {
        "name": "DRS Motors · Demo de la app",
        "short_name": "DRS Motors",
        "description": "Demo de la app de DRS Motors: tres propuestas con los mismos servicios. Datos ficticios.",
        "lang": "es-CO",
        "dir": "ltr",
        "start_url": "./",
        "scope": "./",
        "display": "standalone",
        "orientation": "portrait",
        "background_color": fondo,
        "theme_color": fondo,
        "icons": [
            {"src": "iconos/icono-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
            {"src": "iconos/icono-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
            {"src": "iconos/icono-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"},
        ],
    }
    out = RAIZ / "manifest.webmanifest"
    out.write_text(json.dumps(datos, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    return out


SW = """/* {aviso} */
/* Caché de las demos: la app y el CRM funcionan sin internet después de la primera visita.
   Páginas: primero la red, sin la caché HTTP (si hay internet se ve lo último); sin internet, la guardada.
   Archivos: la URL exacta, que lleva la huella del contenido (?v=…); así nunca se mezclan versiones.
   Al activarse una versión nueva, la página se recarga sola una vez (script en el <head> de cada página). */
const VERSION = '{version}';
const ARCHIVOS = {archivos};

self.addEventListener('install', (e) => {{
  e.waitUntil(caches.open(VERSION)
    .then((c) => c.addAll(ARCHIVOS.map((u) => new Request(u, {{ cache: 'reload' }}))))
    .then(() => self.skipWaiting()));
}});
self.addEventListener('activate', (e) => {{
  e.waitUntil(caches.keys()
    .then((ks) => Promise.all(ks.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
}});
self.addEventListener('fetch', (e) => {{
  const r = e.request;
  if (r.method !== 'GET' || new URL(r.url).origin !== self.location.origin) return;
  const guardar = (resp) => {{ if (resp && resp.ok) {{ const copia = resp.clone(); caches.open(VERSION).then((c) => c.put(r, copia)); }} return resp; }};
  if (r.mode === 'navigate') {{
    e.respondWith(fetch(r.url, {{ cache: 'no-cache', credentials: 'same-origin' }}).then(guardar)
      .catch(() => caches.match(r, {{ ignoreSearch: true, ignoreVary: true }}).then((x) => x || caches.match('./', {{ ignoreVary: true }}))));
    return;
  }}
  e.respondWith(caches.match(r, {{ ignoreVary: true }}).then((x) => x || fetch(r).then(guardar)));
}});
"""


def service_worker(lista, pedidas):
    h = hashlib.sha1()
    for rel in lista:
        h.update(rel.encode())
        h.update((RAIZ / rel).read_bytes())
    version = "drs-demos-" + h.hexdigest()[:12]
    # Los CSS y JS van con su huella, tal como los piden las páginas; lo demás, con su nombre
    con_huella = {u.split("?")[0] for u in pedidas}
    resto = [a for a in lista if a not in con_huella and a not in PAGINAS]
    precache = ["./", "crm/"] + sorted(pedidas) + resto + PAGINAS
    out = RAIZ / "sw.js"
    out.write_text(SW.format(aviso=AVISO, version=version, archivos=json.dumps(precache, ensure_ascii=False, indent=2)), encoding="utf-8")
    return out, version


if __name__ == "__main__":
    m = manifest()
    pedidas = versionar()
    lista = archivos()
    s, version = service_worker(lista, pedidas)
    print(f"{m.relative_to(RAIZ)}")
    print(f"{s.relative_to(RAIZ)}  {len(lista)} archivos · {version}")
