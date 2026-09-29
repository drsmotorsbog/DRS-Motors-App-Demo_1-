#!/usr/bin/env python3
"""
Sincroniza las demos con la carpeta Marca/. Ejecutar desde cualquier sitio:

    python3 "App/DRS-Motors-App-Demo_1-/herramientas/sincronizar.py"

Genera (no se editan a mano):
  css/drs.tokens.css  copia literal de Marca/drs.tokens.css
  css/fuentes.css     Bebas Neue y Montserrat recortadas a latín y embebidas en base64,
                      para que las demos abran sin internet
  js/marca.js         los sprites de iconos y lockups de Marca/, como texto, para
                      insertarlos en línea (la regla de 14: <use> a otro archivo falla en file://)
  js/movimiento/      el vehículo abstracto de Movimiento/app/ (plano técnico, escaneo en puntos
                      o la mezcla, nunca la foto): el módulo, los vehículos de VEHICULOS_APP y
                      vehiculos/indice.js (tamaño, ruedas y anclas de cada uno, para ubicar llamadas
                      antes de cargar el dibujo completo, que se pide solo cuando una pantalla lo usa)

Si cambias un token, una fuente, un icono o un logo en Marca/, o el módulo o un vehículo en
Movimiento/app/, vuelve a correr este script. Solo el vehículo abstracto:
    python3 herramientas/sincronizar.py movimiento
"""
import base64
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

DEMO = Path(__file__).resolve().parent.parent      # raíz del repositorio de las demos
RAIZ = DEMO.parent.parent                           # carpeta del proyecto DRS Motors
MARCA = RAIZ / "Marca"
MOVIMIENTO = RAIZ / "Movimiento" / "app"
# Vehículos que usa la app (Movimiento/app/vehiculos/<nombre>.js y su boceto; se arman con
# Movimiento/herramientas/paquete_app.py). La carrocería de cada uno se asigna en js/movimiento/montaje.js.
# coupe, gt y superbike salen de las fotos de referencia de Miguel; x1 y corolla, del inventario de DRS.
VEHICULOS_APP = ["coupe", "gt", "superbike", "x1", "corolla"]

AVISO = "GENERADO por herramientas/sincronizar.py — no editar. Fuente: {src}"


def tokens():
    src = MARCA / "drs.tokens.css"
    out = DEMO / "css" / "drs.tokens.css"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(f"/* {AVISO.format(src='Marca/drs.tokens.css')} */\n" + src.read_text(encoding="utf-8"), encoding="utf-8")
    return out


# Latín básico + Latin-1 + puntuación tipográfica, flechas y el signo de pesos.
UNICODES = "U+0020-007E,U+00A0-00FF,U+2010-2027,U+2030-203A,U+20AC,U+2190-2193,U+2212,U+00B7,U+2116"


def recortar(ttf: Path) -> bytes:
    with tempfile.TemporaryDirectory() as tmp:
        dst = Path(tmp) / "f.woff"
        cmd = [sys.executable, "-m", "fontTools.subset", str(ttf), f"--unicodes={UNICODES}",
               "--flavor=woff", "--layout-features=*", f"--output-file={dst}"]
        subprocess.run(cmd, check=True, capture_output=True)
        return dst.read_bytes()


def fuentes():
    fuentes_dir = MARCA / "Fuentes"
    bebas = base64.b64encode(recortar(fuentes_dir / "BebasNeue-Regular.ttf")).decode()
    mont = base64.b64encode(recortar(fuentes_dir / "Montserrat.ttf")).decode()
    css = (
        f"/* {AVISO.format(src='Marca/Fuentes/')} */\n"
        "/* Inter no se incluye: retirada por decisión de la marca el 24/09/2026 (ver drs.tokens.css, --f-body). */\n"
        "@font-face{font-family:'Bebas Neue';font-style:normal;font-weight:400;font-display:block;"
        f"src:url(data:font/woff;base64,{bebas}) format('woff')}}\n"
        "@font-face{font-family:'Montserrat';font-style:normal;font-weight:100 900;font-display:block;"
        f"src:url(data:font/woff;base64,{mont}) format('woff')}}\n"
    )
    out = DEMO / "css" / "fuentes.css"
    out.write_text(css, encoding="utf-8")
    return out


def sprite(nombre: str) -> str:
    s = (MARCA / nombre).read_text(encoding="utf-8")
    s = re.sub(r"<!--.*?-->", "", s, flags=re.S)
    s = re.sub(r"\n\s*\n+", "\n", s).strip()
    return s


def marca():
    datos = {"iconos": sprite("drs.iconos.svg"), "logos": sprite("drs.logos.svg")}
    js = (
        f"/* {AVISO.format(src='Marca/drs.iconos.svg y Marca/drs.logos.svg')} */\n"
        "window.DRS_MARCA = " + json.dumps(datos, ensure_ascii=False) + ";\n"
    )
    out = DEMO / "js" / "marca.js"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(js, encoding="utf-8")
    return out


def movimiento():
    """Copia el módulo y los vehículos. Nunca copia fotos: solo los .js y *_boceto.webp de Movimiento/app/."""
    dst = DEMO / "js" / "movimiento"
    (dst / "vehiculos").mkdir(parents=True, exist_ok=True)
    salida = []
    mod = dst / "vehiculo-abstracto.js"
    mod.write_text(f"/* {AVISO.format(src='Movimiento/app/vehiculo-abstracto.js')} */\n"
                   + (MOVIMIENTO / "vehiculo-abstracto.js").read_text(encoding="utf-8"), encoding="utf-8")
    salida.append(mod)
    for n in VEHICULOS_APP:
        for nombre in (f"{n}.js", f"{n}_boceto.webp"):
            src, out = MOVIMIENTO / "vehiculos" / nombre, dst / "vehiculos" / nombre
            out.write_bytes(src.read_bytes())
            salida.append(out)
    indice = {}
    for n in VEHICULOS_APP:
        texto = (MOVIMIENTO / "vehiculos" / f"{n}.js").read_text(encoding="utf-8")
        d = json.loads(re.search(r"var d = (\{.*\});\n", texto).group(1))
        indice[n] = {"w": d["w"], "h": d["h"], "meta": d.get("meta", {})}
    idx = dst / "vehiculos" / "indice.js"
    idx.write_text(f"/* {AVISO.format(src='Movimiento/app/vehiculos/*.js')} */\n"
                   "window.DRS_VEHICULOS_INDICE = " + json.dumps(indice, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
    salida.append(idx)
    viejos = [f for f in (dst / "vehiculos").iterdir() if f.name != "indice.js" and f.stem.replace("_boceto", "") not in VEHICULOS_APP]
    for f in viejos:
        f.unlink()
    return salida


if __name__ == "__main__":
    solo_mov = sys.argv[1:] == ["movimiento"]
    hechos = movimiento() if solo_mov else [tokens(), fuentes(), marca(), *movimiento()]
    for f in hechos:
        print(f"{f.relative_to(RAIZ)}  {f.stat().st_size / 1024:,.0f} KB")
