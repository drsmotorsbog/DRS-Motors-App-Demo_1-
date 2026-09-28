/* DRS Motors · demo — lanzador: lo primero que se ve al abrir la app
   DRS Motors, las tres propuestas de la app, el tema y los accesos del presentador.
   Cada demo guarda sus datos aparte; elegir una abre su propia bienvenida. */
(function () {
  'use strict';
  const DRS = window.DRS;
  const U = DRS.util;
  const { html, crudo, ico } = U;

  const lista = () => Object.values(DRS.variantes || {}).sort((a, b) => a.numero - b.numero);
  const TOTAL = 3;

  function tarjeta(v) {
    return html`<button class="lz-demo" data-a="demo-abrir" data-v="${v.id}">
      <span class="lz-plano">${crudo(v.plano ? v.plano() : '')}</span>
      <span class="lz-info">
        <span class="cap">Demo ${v.numero}</span>
        <span class="d d-34 lz-nombre">${v.nombre}</span>
        <span class="t13 t-1 lz-lema">${v.lema}</span>
        <span class="t11 lz-desc">${v.descripcion}</span>
        <span class="lz-ir">Abrir demo ${v.numero}${ico('chevron')}</span>
      </span>
    </button>`;
  }
  function pendiente(n) {
    return html`<div class="lz-demo lz-pendiente" aria-disabled="true">
      <span class="lz-plano"></span>
      <span class="lz-info"><span class="cap">Demo ${n}</span><span class="d d-34 lz-nombre">En construcción</span><span class="t11 lz-desc">Esta propuesta llega en la próxima actualización.</span></span>
    </div>`;
  }

  DRS.pantallas.lanzador = {
    render() {
      const vs = lista();
      const nums = vs.map((v) => v.numero);
      const faltan = [];
      for (let n = 1; n <= TOTAL; n++) if (!nums.includes(n)) faltan.push(n);
      const instalada = DRS.demo.instalada();
      return html`<div class="lanzador">
        <header class="lz-cab">
          <span class="lz-logo" role="img" aria-label="DRS Motors">${DRS.ui.logoH()}</span>
          <span class="lz-marca-sub cap">Demo · datos ficticios</span>
        </header>
        <div class="lz-titulo">
          <p class="ceja">La app de DRS Motors</p>
          <h1 class="d d-56">Tres propuestas</h1>
          <p class="t13">Las tres tienen los mismos servicios: lavaderos, talleres, SOAT, tecnomecánica, informe vehicular, trámites y catálogo. Cambia cómo se presentan.</p>
        </div>
        <div class="lz-demos">${vs.map(tarjeta)}${faltan.map(pendiente)}</div>

        <section class="lz-bloque">
          <div class="lz-fila"><span><span class="t13 t-1" style="display:block;font-weight:600">Tema</span><span class="t11">Oscuro, claro o como tu celular.</span></span>${crudo(DRS.tema.selector())}</div>
          <button class="lz-fila lz-boton" data-a="modelo-abrir"><span><span class="t13 t-1" style="display:block;font-weight:600">Así gana DRS</span><span class="t11">Fuentes de ingreso y hoja de ruta.</span></span>${ico('chevron')}</button>
          ${instalada ? '' : html`<button class="lz-fila lz-boton" data-a="instalar"><span><span class="t13 t-1" style="display:block;font-weight:600">Instálala en tu celular</span><span class="t11">Queda con su ícono y abre a pantalla completa.</span></span>${ico('chevron')}</button>`}
          <a class="lz-fila lz-boton" href="crm/"><span><span class="t13 t-1" style="display:block;font-weight:600">Panel del comercio (CRM)</span><span class="t11">La otra cara: para verlo en un computador.</span></span>${ico('chevron')}</a>
        </section>
        <p class="t11 lz-pie">Demo para inversionistas. Personas, placas, comercios y precios son inventados. Dentro de cada demo, la barra de arriba te trae de vuelta aquí o te lleva a otra; el logo DRS abre sus opciones: tema, navegación y avisos de ejemplo.</p>
      </div>`;
    },
  };
})();
