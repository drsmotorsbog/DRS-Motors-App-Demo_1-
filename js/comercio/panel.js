/* DRS Motors · demo — Panel del comercio aliado: hoy, agenda por bahía y detalle de la reserva */
(function () {
  'use strict';
  const DRS = window.DRS;
  const U = DRS.util;
  const UI = DRS.ui;
  const { html, crudo, ico, num, pesos, placaTxt } = U;

  const HORA_INI = 8 * 60, HORA_FIN = 18 * 60, FILA = 28;
  // Comisión: la define el plan del comercio (js/comercio/datos-comercio.js); valor de ejemplo, por definir (doc. de producto §9)
  const comisionDe = (c) => ((DRS.estado.panelDatos && DRS.estado.panelDatos[c.id] && DRS.estado.panelDatos[c.id].plan) || { comision: 0.10 }).comision;
  const panel = (DRS.panel = { sel: 'DRS-4821', vista: 'hoy', llega: null, pulsar: false });
  /** Otras secciones del panel: DRS.panelVistas[id] = { render(comercio, ctx) → html, alMontar?(el) } */
  DRS.panelVistas = DRS.panelVistas || {};
  panel.ir = function (v) { panel.vista = v; panel.render(); const m = raiz && raiz.querySelector('.pl-main'); if (m) m.scrollTop = 0; };
  let raiz;

  const MENU = [
    ['hoy', 'inicio', 'Hoy'], ['agenda', 'calendario', 'Agenda'], ['clientes', 'perfil', 'Clientes'], ['servicios', 'lista', 'Servicios'],
    ['promos', 'precio', 'Promociones'], ['pagos', 'pago', 'Pagos'], ['resenas', 'comentar', 'Reseñas'], ['metricas', 'kilometraje', 'Métricas'],
  ];

  panel.iniciar = function (el) { raiz = el; panel.render(); };

  function kpis(c, ag) {
    const app = ag.filter((r) => r.origen === 'app');
    const ocup = Math.round((ag.reduce((s, r) => s + r.min, 0) / (c.bahias * (HORA_FIN - HORA_INI))) * 100);
    const ventas = ag.reduce((s, r) => s + r.total, 0);
    const fin = ag.filter((r) => r.estado === 'finalizada').length;
    return html`<section class="pl-kpis">
      <div class="kpi"><span class="cap">Reservas hoy</span><div class="d d-34 num">${ag.length}</div><div class="t11">${fin} finalizadas</div></div>
      <div class="kpi"><span class="cap">Llegaron por la app</span><div class="d d-34 num">${app.length}</div><div class="t11">Todas ya pagadas</div></div>
      <div class="kpi"><span class="cap">Ocupación</span><div class="d d-34 num">${ocup} %</div><div class="t11">de 8:00 a. m. a 6:00 p. m.</div></div>
      <div class="kpi"><span class="cap">Ventas del día</span><div class="d d-34 num">${pesos(ventas)}</div><div class="kpi-ejemplo">Valores de ejemplo</div></div>
    </section>`;
  }

  function agenda(c, ag) {
    const ahora = DRS.reloj.ahora();
    const minAhora = ahora.getHours() * 60 + ahora.getMinutes();
    const y = (min) => ((min - HORA_INI) / 30) * FILA;
    const horas = [];
    for (let m = HORA_INI; m < HORA_FIN; m += 60) horas.push(m);
    const bloques = (b) => ag.filter((r) => r.bahia === b).map((r) => {
      const ini = U.aMin(r.hora);
      const top = y(ini) + 1, alto = (r.min / 30) * FILA - 3;
      const est = DRS.estadoInfo(r.estado);
      const cls = ['bloque-ag', r.origen === 'app' ? 'app' : '', r.estado === 'finalizada' ? 'fin' : '', r.id === panel.sel ? 'sel' : '', r.id === panel.llega ? 'llega' : ''].join(' ');
      return html`<button class="${cls}" style="top:${top}px;height:${alto}px" data-a="pl-sel" data-id="${r.id}" aria-label="${placaTxt(r.placa)}, ${r.servicio}, ${U.horaTxt(r.hora)}, ${est.nombre}">
        <span class="fila-b"><span class="placa-txt">${placaTxt(r.placa)}</span>${r.origen === 'app' ? html`<span class="chip chip-app">App DRS</span>` : html`<span class="chip">Propio</span>`}</span>
        ${alto > 40 ? html`<span class="t11">${r.servicio} · ${r.cliente}</span>` : ''}
        ${alto > 60 ? html`<span class="cap">${U.horaTxt(r.hora)} · ${est.nombre}</span>` : ''}
      </button>`;
    });
    const altoCol = ((HORA_FIN - HORA_INI) / 30) * FILA;
    return html`<div class="agenda" style="--bahias:${c.bahias};--fila:${FILA}px">
      <div class="ag-cab"></div>${Array.from({ length: c.bahias }, (_, i) => html`<div class="ag-cab">Bahía ${i + 1}</div>`)}
      <div class="ag-horas" style="height:${altoCol}px">${horas.map((m) => html`<span class="ag-hora" style="top:${y(m)}px">${U.horaTxt(U.deMin(m)).replace(':00', '')}</span>`)}</div>
      ${Array.from({ length: c.bahias }, (_, i) => html`<div class="ag-col" style="height:${altoCol}px">${bloques(i + 1)}</div>`)}
      ${minAhora >= HORA_INI && minAhora <= HORA_FIN ? html`<div class="ag-ahora" style="top:${30 + y(minAhora)}px" aria-hidden="true"></div>` : ''}
    </div>`;
  }

  function detalle(r) {
    if (!r) return html`<aside class="pl-det"><div class="pl-det-cuerpo"><p class="t13">Elige una reserva de la agenda.</p></div></aside>`;
    const idx = DRS.ESTADOS.findIndex((e) => e.id === r.estado);
    const sig = DRS.ESTADOS[idx].accion;
    const esApp = r.origen === 'app';
    const v = r.vehiculo ? DRS.q.vehiculo(r.vehiculo) : null;
    const hist = {};
    (r.historial || []).forEach((h) => { hist[h.estado] = h; });
    const comision = esApp ? Math.round(r.total * comisionDe(DRS.q.comercio(r.comercio))) : 0;
    return html`<aside class="pl-det" aria-label="Detalle de la reserva">
      <div class="pl-det-cuerpo">
        <div class="ceja">Reserva ${r.id}</div>
        <div class="d d-34">${placaTxt(r.placa)}</div>
        <div class="t13 t-1">${r.cliente}${v ? ` · ${UI.modelo(v)}` : ''}</div>
        <div class="chips">${esApp ? html`<span class="chip chip-app">App DRS</span><span class="chip chip-pos">${ico('check')}Pagada · ${r.medio}</span>` : html`<span class="chip">Cliente propio</span><span class="chip">Paga en el local</span>`}</div>
        <dl class="datos">
          <dt>Servicio</dt><dd>${r.servicio}</dd>
          ${r.extras.length ? html`<dt>Extras</dt><dd>${r.extras.join(', ')}</dd>` : ''}
          <dt>Hora</dt><dd>${U.horaTxt(r.hora)} · bahía ${r.bahia}</dd>
          <dt>Total</dt><dd class="num">${pesos(r.total)}</dd>
          ${esApp ? html`<dt>Comisión DRS</dt><dd class="num">${pesos(comision)} <span class="t-3">(ej. ${Math.round(comisionDe(DRS.q.comercio(r.comercio)) * 100)} %)</span></dd><dt>Te liquidamos</dt><dd class="num">${pesos(r.total - comision)}</dd>` : html`<dt>Comisión DRS</dt><dd>Sin comisión <span class="t-3">(cliente propio)</span></dd>`}
        </dl>
        <div class="sep"></div>
        <div class="estados">${DRS.ESTADOS.map((e, i) => {
          const cls = i < idx || (i === idx && r.estado === 'finalizada') ? 'hecho' : i === idx ? 'actual' : '';
          const h = hist[e.id];
          return html`<div class="est ${cls}"><i>${cls === 'hecho' ? ico('check') : ''}</i><span class="etq">${e.nombre}</span><time>${h && h.d === 0 ? U.horaTxt(h.h) : ''}</time></div>`;
        })}</div>
      </div>
      <div class="pl-det-pie">
        ${sig ? html`<button class="btn btn-acero${panel.pulsar && r.id === 'DRS-4821' && sig === 'Marcar como listo' ? ' late-suave' : ''}" data-a="pl-avanzar" data-id="${r.id}">${sig}</button>` : html`<button class="btn" disabled>Servicio cerrado</button>`}
        <p class="t11">${esApp ? 'Cada cambio le llega al cliente como aviso en la app.' : 'Registrado en tu CRM como cliente propio.'}</p>
      </div>
    </aside>`;
  }

  panel.render = function () {
    if (!raiz || !DRS.estado) return;
    const c = DRS.q.comercio(DRS.estado.comercioPanel);
    const ag = DRS.q.agenda(c.id);
    if (!ag.find((r) => r.id === panel.sel)) panel.sel = (ag.find((r) => r.origen === 'app') || ag[0] || {}).id;
    const r = ag.find((x) => x.id === panel.sel);
    raiz.innerHTML = String(html`<div class="panel">
      <aside class="pl-lado">
        <div class="pl-marca"><span class="pl-logo">${UI.logoH()}</span>
          <div class="d d-26">${c.nombre}</div><div class="t11">Lavadero · ${c.zona} · ${c.bahias} bahías</div></div>
        <nav class="pl-menu" aria-label="Panel">${MENU.map(([id, i, t]) => {
          const existe = id === 'hoy' || DRS.panelVistas[id];
          const attrs = existe ? `data-a="pl-vista" data-v="${id}"${panel.vista === id ? ' aria-current="page"' : ''}` : `data-a="proxima" data-que="panel-${id}" aria-disabled="true"`;
          return html`<button class="pl-item" ${crudo(attrs)}>${ico(i)}${t}</button>`;
        })}</nav>
        <div class="pl-plan"><span class="cap">Plan ${c.plan}</span><p class="t11" style="margin:6px 0 0">CRM, agenda, promociones y presencia en la app. Mensualidad por definir.</p></div>
      </aside>
      ${panel.vista !== 'hoy' && DRS.panelVistas[panel.vista]
    ? html`<main class="pl-main pl-main-vista">${DRS.panelVistas[panel.vista].render(c, { panel })}</main>`
    : html`<main class="pl-main">
        <header class="pl-cab"><div><div class="ceja">${U.fechaLarga(DRS.reloj.hoy())}</div><h1 class="d d-44">Hoy</h1></div>
          <button class="btn btn-fantasma btn-chico" ${crudo(DRS.acciones['pl-cliente-propio'] ? 'data-a="pl-cliente-propio"' : UI.proxAttrs('panel-cliente'))}>${ico('mas', 's16')}Cliente propio</button></header>
        ${kpis(c, ag)}
        <div class="pl-dos">${agenda(c, ag)}${detalle(r)}</div>
      </main>`}
    </div>`);
    const v = DRS.panelVistas[panel.vista];
    if (panel.vista !== 'hoy' && v && v.alMontar) v.alMontar(raiz.querySelector('.pl-main'));
  };
})();
