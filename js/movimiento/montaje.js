/* DRS Motors · demo — el vehículo abstracto de Movimiento/ en las pantallas de la app
   El módulo DRSMovimiento.vehiculo (js/movimiento/vehiculo-abstracto.js, copia de Movimiento/app/)
   dibuja y anima un vehículo como plano técnico, escaneo en puntos o la mezcla de los dos, con lo que se
   calcó de una foto: nunca muestra la foto. Guía: Movimiento/APP.md.

   Las pantallas arman HTML en texto, así que dejan un marcador y aquí se monta:
     DRS.mov.marcador(v, { modo, opciones, anim, clave, respaldo })   → html`` listo para interpolar
       v         vehículo del usuario (su carrocería elige el dibujo: POR_FORMA)
       modo      'plano' | 'puntos' | 'mixto'    opciones  las del módulo (barrido, cotas, revelado…)
       anim      true: se anima al entrar en pantalla; false: queda en su cuadro final
       clave     identifica el lugar (p. ej. 'inicio'): al repintar la pantalla el mismo dibujo se
                 reubica en vez de armarse de nuevo, y una animación en curso sigue sin cortarse
       respaldo  función que devuelve el dibujo de DRS.bp para las carrocerías sin vehículo propio
   Un solo vehículo animándose por pantalla (APP.md §6). Al cambiar de tema, el dibujo se vuelve a armar
   con los colores nuevos (el módulo los lee al montarse). */
(function () {
  'use strict';
  const DRS = window.DRS;
  const { html, crudo } = DRS.util;

  // Vehículo por carrocería (DRS.bp.forma). Las que no están siguen con el dibujo de DRS.bp.
  // coupe: BMW M2 · gt: Aston Martin Vantage · superbike: MV Agusta Superveloce (fotos de referencia de Miguel, 29/09/2026)
  const POR_FORMA = { sedan: 'coupe', moto: 'superbike' };
  // Ajustes propios de cada vehículo: el boceto de la moto trae los reflejos del carenado y va más tenue
  const AJUSTES = { superbike: { boceto: 0.26 } };
  /** Ancho sobre alto de la caja que arma el módulo (mismos márgenes que vehiculo-abstracto.js):
      con él, el CSS limita el alto de los vehículos altos, como la moto, sin deformarlos. */
  const aspecto = (d, o) => (d.w * 1.14) / (d.h * (1.32 + (o.cotas ? 0.18 : 0)));
  const vehiculoDe = (v) => POR_FORMA[DRS.bp.forma(v)] || null;
  const listo = (n) => !!(n && window.DRSMovimiento && window.DRS_VEHICULOS && window.DRS_VEHICULOS[n]);

  function marcador(v, { modo = 'plano', opciones = {}, anim = true, clave = '', respaldo = null } = {}) {
    const n = vehiculoDe(v);
    if (!listo(n)) return respaldo ? crudo(respaldo()) : '';
    const asp = aspecto(window.DRS_VEHICULOS[n], opciones).toFixed(3);
    return html`<div class="veh-mov" style="--asp:${asp}" data-vehiculo="${n}" data-modo="${modo}" data-anim="${anim ? '1' : '0'}" data-clave="${clave}" data-opciones='${JSON.stringify(opciones)}'></div>`;
  }

  /* ---------------- montaje ---------------- */
  const vivos = new Map();              // clave → { api, huella }
  const reducido = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const tema = () => (DRS.tema ? DRS.tema.modo() : '');

  function montar(el) {
    if (el._veh) return;
    const n = el.dataset.vehiculo;
    if (!listo(n)) return;
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
      modo: el.dataset.modo, alVer: anim, reproducir: anim, etiqueta: 'Plano técnico de tu vehículo',
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

  DRS.mov = { marcador, vehiculoDe, POR_FORMA };
})();
