/* DRS Motors · demos — tema oscuro (modo noche), claro (modo documento) o automático
   Va en el <head>, antes de los estilos: así la página no parpadea al abrir.
   La preferencia se guarda en este navegador y la comparten la app y el CRM. */
(function () {
  'use strict';
  const DRS = (window.DRS = window.DRS || {});
  DRS.acciones = DRS.acciones || {};
  const CLAVE = 'drs-tema';
  const OPCIONES = [['oscuro', 'Oscuro'], ['claro', 'Claro'], ['auto', 'Auto']];
  const mq = window.matchMedia ? window.matchMedia('(prefers-color-scheme: light)') : null;

  function leer() {
    try { const v = localStorage.getItem(CLAVE); return OPCIONES.some(([k]) => k === v) ? v : 'oscuro'; } catch (e) { return 'oscuro'; }
  }
  const modoDe = (pref) => (pref === 'claro' || (pref === 'auto' && mq && mq.matches) ? 'documento' : 'noche');

  /** La barra de Safari toma el color de la superficie del tema (se lee del token, no se copia). */
  function pintarMeta() {
    const m = document.querySelector('meta[name="theme-color"]');
    if (!m) return;
    const c = getComputedStyle(document.documentElement).getPropertyValue('--sup-1').trim();
    if (c) m.setAttribute('content', c);
  }

  DRS.tema = {
    OPCIONES,
    pref: leer,
    modo: () => document.documentElement.dataset.modo || 'noche',
    claro: () => document.documentElement.dataset.modo === 'documento',
    aplicar(pref) {
      if (pref) { try { localStorage.setItem(CLAVE, pref); } catch (e) { /* sin almacenamiento: vale para esta visita */ } }
      const raiz = document.documentElement;
      const antes = raiz.dataset.modo;
      raiz.classList.add('sin-transicion');
      raiz.dataset.modo = modoDe(pref || leer());
      pintarMeta();
      void raiz.offsetHeight;
      setTimeout(() => raiz.classList.remove('sin-transicion'), 30);
      if (DRS.emitir) DRS.emitir('tema', { pref: pref || leer(), modo: raiz.dataset.modo, cambio: antes !== raiz.dataset.modo });
    },
    /** Selector de tres opciones; lo usan el lanzador, el menú de la demo, Perfil y el CRM. */
    selector() {
      const p = leer();
      return '<div class="tema-sel" role="group" aria-label="Tema">' + OPCIONES.map(([k, n]) =>
        `<button type="button" data-a="tema" data-t="${k}" aria-pressed="${p === k ? 'true' : 'false'}">${n}</button>`).join('') + '</div>';
    },
  };

  DRS.acciones.tema = (d) => {
    DRS.tema.aplicar(d.t);
    document.querySelectorAll('.tema-sel [data-t]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.t === d.t ? 'true' : 'false'));
  };

  if (mq) {
    const alCambiar = () => { if (leer() === 'auto') DRS.tema.aplicar(); };
    if (mq.addEventListener) mq.addEventListener('change', alCambiar); else if (mq.addListener) mq.addListener(alCambiar);
  }
  document.documentElement.dataset.modo = modoDe(leer());
  document.addEventListener('DOMContentLoaded', pintarMeta);
})();
