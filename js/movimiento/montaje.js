/* DRS Motors · demo — el vehículo abstracto de Movimiento/ en las pantallas de la app
   El módulo DRSMovimiento.vehiculo (js/movimiento/vehiculo-abstracto.js, copia de Movimiento/app/)
   dibuja y anima un vehículo como plano técnico, escaneo en puntos o la mezcla de los dos, con lo que se
   calcó de una foto: nunca muestra la foto. Guía: Movimiento/APP.md.

   Las pantallas arman HTML en texto, así que dejan un marcador y aquí se monta:
     DRS.mov.marcador(x, { vehiculo, modo, opciones, anim, clave, capa, respaldo })   → html`` listo para interpolar
       x         vehículo del usuario o su forma ('sedan', 'moto'…): elige el dibujo por carrocería (POR_FORMA)
       vehiculo  uno en particular, p. ej. DRS.mov.generico(clave) donde el vehículo no es del usuario
       modo      'plano' | 'puntos' | 'mixto'    opciones  las del módulo (barrido, cotas, revelado, lectura, velocidad…)
       anim      true: se anima al entrar en pantalla; false: queda en su cuadro final
       clave     identifica el lugar (p. ej. 'inicio'): al repintar la pantalla el mismo dibujo se reubica
                 en vez de armarse de nuevo, y una animación en curso sigue sin cortarse
       capa      HTML encima del dibujo, con su misma caja (p. ej. DRS.mov.globos)
       respaldo  función que devuelve el dibujo de DRS.bp si la carrocería no tiene vehículo propio
     DRS.mov.punto(n, anclas, opciones) → [x, y] en fracción de la caja del dibujo, para ubicar llamadas
     DRS.mov.duracion(modo, opciones) → segundos que dura esa animación
   El tamaño, las ruedas y las anclas de cada vehículo están en js/movimiento/vehiculos/indice.js; el dibujo
   completo se carga solo cuando una pantalla lo necesita. Un solo vehículo animándose por pantalla
   (APP.md §6). Al cambiar de tema, el dibujo se vuelve a armar con los colores nuevos. */
(function () {
  'use strict';
  const DRS = window.DRS;
  const { html, crudo } = DRS.util;

  // Vehículo por carrocería (DRS.bp.forma); la camioneta de platón (pickup) sigue con el dibujo de DRS.bp.
  // coupe: BMW M2 · gt: Aston Martin Vantage · superbike: MV Agusta Superveloce (fotos de referencia de Miguel, 29/09/2026)
  // x1 y corolla: camionetas del inventario de DRS; el Corolla Cross hace de hatchback mientras no haya uno propio
  const POR_FORMA = { sedan: 'coupe', moto: 'superbike', hatch: 'corolla', suv: 'x1' };
  // Donde el vehículo no es del usuario (bienvenidas, pantalla bloqueada) se intercalan la moto y los carros
  const GENERICOS = ['coupe', 'superbike', 'gt'];
  // Ajustes propios de cada vehículo: el boceto de la moto trae los reflejos del carenado y va más tenue
  const AJUSTES = { superbike: { boceto: 0.26 } };
  const RUTA = 'js/movimiento/vehiculos/';
  const DURACION = { plano: 2.2, cotas: 2.7, barrido: 3.3, puntos: 3.4, franja: 3.0, lente: 6.2 };

  const IDX = () => window.DRS_VEHICULOS_INDICE || {};
  const hay = (n) => !!(n && window.DRSMovimiento && IDX()[n]);
  const cargado = (n) => !!(window.DRS_VEHICULOS && window.DRS_VEHICULOS[n]);
  const formaDe = (x) => (typeof x === 'string' ? x : DRS.bp.forma(x));
  const vehiculoDe = (x) => { if (x == null) return null; const n = POR_FORMA[formaDe(x)]; return hay(n) ? n : null; };
  const esMoto = (n) => n === 'superbike';

  let turno = 0;
  const asignado = {};
  /** Vehículo de un lugar genérico: el mismo mientras la pantalla se repinta; el siguiente de la lista al volver a entrar. */
  function generico(clave, nuevo, lista = GENERICOS) {
    if (nuevo || !asignado[clave] || !lista.includes(asignado[clave])) {
      let n = GENERICOS[turno++ % GENERICOS.length];
      while (!lista.includes(n)) n = GENERICOS[turno++ % GENERICOS.length];
      asignado[clave] = n;
    }
    return asignado[clave];
  }

  /** Caja que arma el módulo (mismos márgenes que vehiculo-abstracto.js), en unidades del vehículo. */
  function caja(n, o = {}) {
    const d = IDX()[n], W = d.w, H = d.h;
    const VX = -W * 0.07, VY = -H * 0.16, VW = W * 1.14, VH = H * (1.32 + (o.cotas ? 0.18 : 0));
    return { W, H, VX, VY, VW, VH, asp: VW / VH };
  }
  /** Una ancla como fracción (0–1) de esa caja. nombres: el primero que exista; rueda1 es la de la izquierda. */
  function punto(n, nombres, o = {}) {
    const d = IDX()[n], c = caja(n, o), meta = d.meta || {};
    const ruedas = (meta.ruedas || []).slice().sort((a, b) => a.cx - b.cx);
    let p = null;
    for (const nm of [].concat(nombres)) {
      if (nm === 'rueda1' && ruedas[0]) { p = [ruedas[0].cx, ruedas[0].cy]; break; }
      if (nm === 'rueda2' && ruedas[1]) { p = [ruedas[1].cx, ruedas[1].cy]; break; }
      if (meta.anclas && meta.anclas[nm]) { p = meta.anclas[nm]; break; }
    }
    if (!p) p = [d.w / 2, d.h / 2];
    return [(p[0] - c.VX) / c.VW, (p[1] - c.VY) / c.VH];
  }
  function duracion(modo, o = {}) {
    const s = modo === 'puntos' ? DURACION.puntos : modo === 'mixto' ? (o.revelado === 'franja' ? DURACION.franja : DURACION.lente)
      : o.barrido ? DURACION.barrido : o.cotas ? DURACION.cotas : DURACION.plano;
    return s / (o.velocidad || 1);
  }

  function marcador(x, { vehiculo = null, modo = 'plano', opciones = {}, anim = true, clave = '', capa = '', respaldo = null } = {}) {
    const n = hay(vehiculo) ? vehiculo : vehiculoDe(x);
    if (!n) return respaldo ? crudo(respaldo()) : '';
    const asp = caja(n, opciones).asp.toFixed(3);
    const dur = duracion(modo, opciones).toFixed(2);
    return html`<div class="veh-mov${esMoto(n) ? ' veh-mov-moto' : ''}" style="--asp:${asp};--dur:${dur}s" data-vehiculo="${n}" data-modo="${modo}" data-anim="${anim ? '1' : '0'}" data-clave="${clave}" data-opciones='${JSON.stringify(opciones)}'>${capa}</div>`;
  }

  /** Plano de una consulta (RUNT, SOAT, informe): escanea en puntos mientras busca, a la medida de lo que dura la
      consulta (ms), y al encontrar el vehículo el plano se revela una vez (Movimiento/APP.md §4: escaneo → puntos,
      enciende → mixto con franja). respaldo: opciones de DRS.bp.vehiculo para la carrocería sin vehículo propio. */
  function consulta(x, { buscando = false, revelar = false, ms = 1800, clave = '', vehiculo = null, respaldo = null } = {}) {
    const bp = respaldo ? () => DRS.bp.vehiculo(typeof x === 'string' ? { tipo: x === 'moto' ? 'moto' : 'carro', carroceria: x } : x, respaldo) : null;
    if (buscando) return marcador(x, { vehiculo, modo: 'puntos', opciones: { lectura: true, velocidad: +(DURACION.puntos / Math.max(0.8, ms / 1000)).toFixed(2) }, anim: true, clave, respaldo: bp });
    return marcador(x, { vehiculo, modo: revelar ? 'mixto' : 'plano', opciones: revelar ? { revelado: 'franja', fondo: false } : {}, anim: revelar, clave, respaldo: bp });
  }
  /** Vehículo que entra a una pantalla: llega en borrador y la línea azul lo pasa en limpio (llega → plano con barrido). */
  const entrada = (x, anim, clave, extra = {}) => marcador(x, Object.assign({ modo: 'plano', opciones: anim ? { barrido: true } : {}, anim, clave }, extra));

  /** Globos numerados sobre el plano (Mi garaje): lista [{ n, ancla: [nombres] }]. Capa SVG con la caja del módulo. */
  function globos(n, lista, o = {}) {
    const c = caja(n, o), r = c.W * 0.03, f = (v) => v.toFixed(1), sw = f(c.VW * 0.0034);   // ≈1,2 px en la tarjeta
    const pts = lista.map((g) => { const [fx, fy] = punto(n, g.ancla, o); return { ...g, x: c.VX + fx * c.VW, y: c.VY + fy * c.VH }; })
      .sort((a, b) => a.x - b.x);
    const yG = c.VY + r * 1.25;
    const partes = pts.map((p, i) => {
      const xG = c.VX + c.VW * (0.14 + (0.72 * (i + 0.5)) / pts.length);
      return `<g class="vm-globo" style="--i:${i}"><path d="M${f(xG)} ${f(yG + r)}L${f(p.x)} ${f(p.y)}" pathLength="1" class="vm-guia" stroke-width="${sw}"/>`
        + `<rect x="${f(p.x - r * 0.25)}" y="${f(p.y - r * 0.25)}" width="${f(r * 0.5)}" height="${f(r * 0.5)}" class="vm-punto"/>`
        + `<g class="vm-pop" style="transform-origin:${f(xG)}px ${f(yG)}px"><circle cx="${f(xG)}" cy="${f(yG)}" r="${f(r)}" class="vm-circ" stroke-width="${sw}"/>`
        + `<text x="${f(xG)}" y="${f(yG + r * 0.36)}" class="vm-num" style="font-size:${f(r * 1.05)}px">${String(p.n).padStart(2, '0')}</text></g></g>`;
    }).join('');
    return crudo(`<svg class="vm-capa" viewBox="${f(c.VX)} ${f(c.VY)} ${f(c.VW)} ${f(c.VH)}" aria-hidden="true">${partes}</svg>`);
  }

  /* ---------------- carga del dibujo completo ---------------- */
  const cargas = {};
  function cargar(n) {
    if (cargado(n)) return Promise.resolve();
    if (!cargas[n]) {
      cargas[n] = new Promise((res, rej) => {
        const s = document.createElement('script');
        s.src = `${RUTA}${n}.js`;
        s.onload = res;
        s.onerror = () => { delete cargas[n]; rej(new Error(`no cargó ${n}`)); };
        document.head.appendChild(s);
      });
    }
    return cargas[n];
  }

  /* ---------------- montaje ---------------- */
  const vivos = new Map();              // clave → { api, huella }
  const reducido = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const tema = () => (DRS.tema ? DRS.tema.modo() : '');

  function montar(el) {
    if (el._veh || el._esperando) return;
    const n = el.dataset.vehiculo;
    if (!hay(n)) return;
    if (!cargado(n)) {                                        // se monta cuando llegue el dibujo
      el._esperando = true;
      cargar(n).then(() => { el._esperando = false; if (el.isConnected) montar(el); }, () => { el._esperando = false; });
      return;
    }
    let opc = {};
    try { opc = JSON.parse(el.dataset.opciones || '{}'); } catch (e) { opc = {}; }
    const anim = el.dataset.anim === '1', clave = el.dataset.clave || '';
    const huella = [n, el.dataset.modo, el.dataset.opciones, tema()].join('|');
    const prev = clave && vivos.get(clave);
    if (prev && prev.huella === huella && !prev.api.raiz.isConnected) {
      el.appendChild(prev.api.raiz);                          // el mismo dibujo: se reubica
      el._veh = prev.api;
      if (anim) { if (reducido()) prev.api.ir(prev.api.duracion); else prev.api.play(0); }
      return;
    }
    if (prev && !prev.api.raiz.isConnected) prev.api.destruir();
    const api = DRSMovimiento.vehiculo(el, window.DRS_VEHICULOS[n], Object.assign({
      modo: el.dataset.modo, alVer: anim, reproducir: anim, etiqueta: 'Plano técnico del vehículo',
    }, AJUSTES[n], opc));
    if (!anim) api.ir(api.duracion);
    el._veh = api;
    if (clave) vivos.set(clave, { api, huella });
  }
  /** Un dibujo que salió de la pantalla y no volvió a entrar se detiene en su cuadro final. */
  function soltar(el) {
    const api = el._veh;
    if (!api || api.raiz.isConnected) return;
    const clave = el.dataset.clave;
    if (clave && vivos.get(clave) && vivos.get(clave).api === api) { api.pause(); api.ir(api.duracion); return; }
    api.destruir();
  }
  const marcadores = (nodo, fn) => {
    if (!nodo || nodo.nodeType !== 1) return;
    if (nodo.matches('.veh-mov')) fn(nodo);
    nodo.querySelectorAll('.veh-mov').forEach(fn);
  };
  // Primero se montan los que llegaron (así un repintado reubica el dibujo) y después se sueltan los que se fueron
  const obs = new MutationObserver((ms) => {
    ms.forEach((m) => m.addedNodes.forEach((x) => marcadores(x, montar)));
    ms.forEach((m) => m.removedNodes.forEach((x) => marcadores(x, soltar)));
  });
  const arrancar = () => { obs.observe(document.body, { childList: true, subtree: true }); marcadores(document.body, montar); };
  if (document.body) arrancar(); else document.addEventListener('DOMContentLoaded', arrancar);

  DRS.mov = { marcador, consulta, entrada, vehiculoDe, generico, punto, caja, duracion, globos, esMoto, POR_FORMA, GENERICOS };
})();
