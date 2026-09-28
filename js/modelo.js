/* DRS Motors · demos — «Así gana DRS»: fuentes de ingreso y hoja de ruta (documento de producto §9 y §10)
   Lo muestran el lanzador y las opciones de la app (en una hoja) y el CRM (en un menú flotante).
   Valores de ejemplo: la mensualidad y la comisión están por definir. */
(function () {
  'use strict';
  const DRS = window.DRS;
  const U = DRS.util;
  const { html } = U;

  const FUENTES = [
    ['Mensualidad del comercio', 'Lavadero o taller', 'Plan con CRM, agenda, promociones y presencia en la app.', 'Por definir'],
    ['Comisión por reserva', 'Lavadero o taller', 'Solo en clientes que trae la app. Los clientes propios del comercio no pagan comisión.', '10 % de ejemplo'],
    ['Informe vehicular', 'Usuario', 'Pago por informe antes de comprar o vender un usado.', '$ 45.000'],
    ['SOAT y tecnomecánica', 'Aliados habilitados', 'Comisión por venta del SOAT y agendamiento en CDA aliados.', 'Fase 3'],
    ['Suscripción premium', 'Usuario', 'Planes de lavado mensual y prioridad en franjas.', 'Futuro'],
  ];
  const FASES = [
    ['0', 'Demo', 'Esta demo para inversionistas.'],
    ['1', 'Lanzamiento', 'Control del vehículo, lavaderos con pago y panel del comercio en una zona de Bogotá.'],
    ['2', 'Mantenimiento', 'Talleres, cotizaciones, mantenimiento verificado e informe vehicular.'],
    ['3', 'Plataforma', 'SOAT y seguros con aliados, tecnomecánica, premium y más ciudades.'],
  ];

  /** Contenido sin encabezado: cada página le pone el suyo (hoja o menú). */
  function cuerpo() {
    return html`<p class="t13" style="margin:0 0 12px">El control del vehículo es gratis para el usuario: es la razón para abrir la app todos los días.</p>
      <div class="modelo-tabla">${FUENTES.map(([f, q, c, v]) => html`<div class="modelo-fila"><div><b class="t13 t-1">${f}</b><span class="t11">${q} · ${c}</span></div><span class="chip ${/Fase|Futuro/.test(v) ? '' : 'chip-luz'}">${v}</span></div>`)}</div>
      <div class="ceja" style="margin:16px 0 8px">Hoja de ruta</div>
      <ol class="modelo-fases">${FASES.map(([n, t, d]) => html`<li><b class="d d-26">${n}</b><span><b class="t13 t-1">${t}</b><span class="t11">${d}</span></span></li>`)}</ol>
      <p class="t11" style="margin-top:12px">Valores de ejemplo: la mensualidad y la comisión están por definir.</p>`;
  }

  DRS.modelo = { FUENTES, FASES, cuerpo };
})();
