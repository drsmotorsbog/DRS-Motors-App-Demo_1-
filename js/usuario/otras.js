/* DRS Motors · demo — Servicios, Notificaciones, Perfil y hojas (vehículo, kilometraje) */
(function () {
  'use strict';
  const DRS = window.DRS;
  const U = DRS.util;
  const UI = DRS.ui;
  const { html, crudo, ico, num, placaTxt } = U;

  DRS.pantallas.servicios = {
    raiz: true,
    render() {
      const s = [
        { que: 'lavaderos', ico: 'detailing', t: 'Lavaderos', d: 'Compara, reserva y paga sin llamar. Promos en horas valle.', chip: '−20 %' },
        { que: 'talleres', ico: 'taller', t: 'Talleres', d: 'Cotiza antes de ir. Lo que hagas queda verificado.' },
        { que: 'tecno', ico: 'certificado', t: 'Tecnomecánica', d: 'Agenda tu revisión en un CDA aliado.' },
        { que: 'soat', ico: 'garantia', t: 'SOAT', d: 'Renuévalo con una aseguradora aliada, sin papeles.' },
        { que: 'informe', ico: 'peritaje', t: 'Informe vehicular', d: 'Antes de comprar un usado: dueños, prendas y precio de mercado.', precio: '$ 45.000' },
        { que: 'tramites', ico: 'traspaso', t: 'Trámites DRS', d: 'Traspasos y levantamiento de prenda en Bogotá, con cotización previa.' },
      ];
      return html`${UI.cabRaiz()}<div class="cuerpo">
        <div class="titulo"><h1 class="d d-44">Servicios</h1><p class="t13">Todo lo que tu vehículo necesita, pagado dentro de la app.</p></div>
        <div class="rejilla-2">${s.map((x) => html`<button class="tarjeta tile" ${crudo(UI.servAttrs(x.que))} style="min-height:176px">
          <span class="tile-top"><span class="rec-ico">${ico(x.ico)}</span>${x.chip ? html`<span class="chip chip-lleno">${x.chip}</span>` : x.precio ? html`<span class="chip">${x.precio}</span>` : ''}</span>
          <span class="d d-26" style="margin-top:auto">${x.t}</span>
          <span class="t11" style="margin-top:6px">${x.d}</span>
        </button>`)}</div>
        <section class="bloque">
          <button class="fila" ${crudo(UI.servAttrs('catalogo'))} style="border-top:1px solid var(--linea)">
            <span class="fila-ico">${ico('llave')}</span>
            <span><span class="t13" style="display:block">Catálogo DRS Motors</span><span class="t11" style="display:block">Carros y motos en venta, revisados por DRS.</span></span>
            ${ico('chevron')}
          </button>
        </section>
      </div>`;
    },
  };

  DRS.pantallas.notificaciones = {
    render() {
      const ns = DRS.estado.notificaciones;
      const grupos = [
        ['Hoy', ns.filter((n) => n.d === 0)],
        ['Esta semana', ns.filter((n) => n.d < 0 && n.d >= -7)],
      ].filter(([, l]) => l.length);
      const sinLeer = ns.filter((n) => !n.leida).length;
      return html`${UI.cabDet('Notificaciones')}<div class="cuerpo">
        <div class="titulo" style="display:flex;justify-content:space-between;align-items:flex-end;gap:10px"><h1 class="d d-44">Avisos</h1>${sinLeer ? html`<button class="enlace" data-a="notif-todas">Marcar leídas</button>` : ''}</div>
        ${grupos.map(([t, l]) => html`<section style="margin-bottom:22px"><div class="ceja" style="margin-bottom:10px">${t}</div><div class="lista">${l.map((n) => html`<button class="fila" data-a="notif" data-id="${n.id}" style="${n.leida ? '' : 'box-shadow:inset 3px 0 0 var(--acc-graf);padding-left:10px'}">
          <span class="fila-ico">${ico(n.ico)}</span>
          <span><span class="t13" style="display:block;font-weight:${n.leida ? 500 : 700}">${n.titulo}</span><span class="t11" style="display:block;color:var(--txt-2)">${n.texto}</span><span class="enlace" style="margin-top:8px">${n.accion}${ico('chevron')}</span></span>
          <time class="cap" style="align-self:flex-start">${U.horaTxt(n.h)}</time>
        </button>`)}</div></section>`)}
        <p class="t11">Las confirmaciones y recordatorios de reservas también llegan por WhatsApp.</p>
      </div>`;
    },
  };

  /* ---------------- hojas ---------------- */
  DRS.hojaVehiculo = function () {
    const act = DRS.estado.vehiculoActivo;
    DRS.tel.hoja(html`<div class="hoja-cab"><h2 class="d d-34">Tu vehículo</h2><button class="hoja-cerrar" data-a="hoja-cerrar" aria-label="Cerrar">${ico('cerrar')}</button></div>
      <div role="radiogroup" aria-label="Vehículo activo">${DRS.q.vehiculos().map((v) => html`<button class="opcion" role="radio" aria-checked="${v.id === act ? 'true' : 'false'}" data-a="vehiculo" data-id="${v.id}" data-cerrar="1">
        ${ico(v.tipo === 'moto' ? 'moto' : 'carro')}
        <span><span class="d d-20" style="display:block">${UI.modelo(v)}</span><span class="t11">${placaTxt(v.placa)} · ${v.modelo} · ${num(v.km)} km</span></span>
        <span class="radio"></span>
      </button>`)}</div>
      <button class="btn btn-fantasma" ${crudo(UI.irAttrs('agregar-vehiculo'))} style="margin-top:8px">${ico('mas')}Agregar otro vehículo</button>`);
  };

  DRS.hojaKm = function (vid) {
    const v = DRS.q.vehiculo(vid);
    DRS.tel.hoja(html`<div class="hoja-cab"><div><div class="ceja">${placaTxt(v.placa)} · ${UI.modelo(v)}</div><h2 class="d d-34" style="margin-top:8px">Actualizar kilometraje</h2></div><button class="hoja-cerrar" data-a="hoja-cerrar" aria-label="Cerrar">${ico('cerrar')}</button></div>
      <p class="t13" style="margin:0 0 14px">Con tu kilometraje calculamos el cambio de aceite y la vida de tus llantas.</p>
      <div class="campo"><label class="cap" for="km-in">Kilometraje actual</label><input id="km-in" inputmode="numeric" value="${num(v.km)}" aria-describedby="km-ayuda"><span id="km-ayuda" class="t11">Último registro: ${num(v.km)} km.</span></div>
      <button class="btn btn-luz" data-a="km-guardar" data-v="${v.id}">Guardar kilometraje</button>`, {
      alAbrir: (h) => { const i = U.$('#km-in', h); setTimeout(() => { i.focus(); i.select(); }, 320); },
    });
  };
})();
