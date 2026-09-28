/* DRS Motors · CRM del comercio — arranque, acciones y controles de la demo
   Página aparte para computador. No se sincroniza con la app del celular (son demos
   independientes): «Simular reserva de la app» hace aquí lo que haría un usuario real. */
(function () {
  'use strict';
  const DRS = window.DRS;
  const U = DRS.util;
  const { html, crudo, ico, pesos } = U;
  const crm = (DRS.crm = {});

  /* ---------------- aviso de la demo ---------------- */
  let tAviso;
  crm.aviso = function (titulo, texto) {
    const a = U.$('#aviso-escenario');
    a.innerHTML = String(html`<b>${titulo}</b><span>${texto}</span>`);
    a.classList.add('ver');
    clearTimeout(tAviso);
    tAviso = setTimeout(() => a.classList.remove('ver'), 4200);
  };
  // Los módulos del panel avisan «próximamente» por aquí
  const proxima = (que) => crm.aviso('Próximamente', `${que ? `«${String(que).replace(/^panel-/, '')}» ` : ''}todavía no está en esta demo.`);
  DRS.demo = { proxima, aviso: crm.aviso, pintarLado() {} };
  DRS.escenario = { proxima, aviso: crm.aviso, actualizar() {} };

  /* ---------------- una reserva que llega desde la app ---------------- */
  // Clientes de ejemplo que reservan desde la app (inventados)
  const CLIENTES = [
    ['Valentina R.', 'JKM312', 'automovil'], ['Santiago M.', 'HTP845', 'camioneta'], ['Laura G.', 'KSD207', 'automovil'],
    ['Andrés P.', 'FWQ63E', 'moto'], ['Camila V.', 'LMN519', 'automovil'], ['Diego H.', 'GTR774', 'camioneta'],
  ];
  let turno = 0;
  const horaAhora = () => { const a = DRS.reloj.ahora(); return U.deMin(a.getHours() * 60 + a.getMinutes()); };

  crm.simularReserva = function () {
    const c = DRS.q.comercio(DRS.estado.comercioPanel);
    const srv = (DRS.estado.servicios || []).find((s) => s.id === 'sencillo') || { nombre: 'Lavado sencillo', min: 40, precio: { automovil: 25000, camioneta: 30000, moto: 18000 } };
    const [cliente, placa, tipo] = CLIENTES[turno++ % CLIENTES.length];
    const ahora = DRS.reloj.ahora();
    const cierre = 18 * 60;
    let inicio = Math.max(8 * 60, Math.ceil((ahora.getHours() * 60 + ahora.getMinutes() + 20) / 30) * 30);
    let hueco = null;
    for (let m = inicio; m + srv.min <= cierre && !hueco; m += 30) {
      for (let b = 1; b <= c.bahias && !hueco; b++) {
        const libre = DRS.panelMas && DRS.panelMas.franjaLibre ? DRS.panelMas.franjaLibre(c.id, 0, b, U.deMin(m), srv.min) : true;
        if (libre) hueco = { m, b };
      }
    }
    if (!hueco) { crm.aviso('Agenda llena', 'Hoy ya no hay franjas libres. Mira la agenda de la semana.'); return; }
    let id;
    do { id = `DRS-${5200 + Math.floor(Math.random() * 700)}`; } while (DRS.q.reserva(id));
    const total = (srv.precio && srv.precio[tipo]) || 25000;
    DRS.cambiar((s) => {
      s.reservas.push({ id, comercio: c.id, bahia: hueco.b, d: 0, hora: U.deMin(hueco.m), min: srv.min, servicio: srv.nombre, extras: [],
        cliente, placa, tipoVeh: tipo, origen: 'app', total, medio: 'Tarjeta', estado: 'confirmada', usuario: null,
        historial: [{ estado: 'confirmada', d: 0, h: horaAhora() }] });
    }, { tipo: 'reserva-app' });
    DRS.panel.vista = 'hoy';
    DRS.panel.sel = id;
    DRS.panel.llega = id;
    DRS.panel.render();
    crm.aviso('Nueva reserva desde la app', `${cliente} · ${U.placaTxt(placa)} · ${srv.nombre} a las ${U.horaTxt(U.deMin(hueco.m))} · ${pesos(total)} ya pagados`);
  };

  /* ---------------- menú «Así gana DRS» ---------------- */
  let menuModelo = null;
  crm.modelo = function (abrir) {
    if (!menuModelo) {
      menuModelo = document.createElement('div');
      menuModelo.className = 'menu-avisos menu-modelo';
      menuModelo.setAttribute('role', 'dialog');
      menuModelo.setAttribute('aria-label', 'Así gana DRS');
      document.body.appendChild(menuModelo);
    }
    const ver = abrir == null ? !menuModelo.classList.contains('ver') : abrir;
    if (ver) menuModelo.innerHTML = String(html`<div class="menu-cab"><div><div class="ceja">Modelo de negocio</div><h2 class="d d-34" style="margin-top:8px">Así gana DRS</h2></div><button class="hoja-cerrar" data-a="crm-modelo" aria-label="Cerrar">${ico('cerrar')}</button></div>${DRS.modelo.cuerpo()}`);
    menuModelo.classList.toggle('ver', ver);
  };

  function pintarBarra() {
    U.$('#crm-barra').innerHTML = String(html`<div class="crm-marca"><span class="crm-logo">${DRS.ui.logoH()}</span><span class="cap">Panel del comercio · demo · datos ficticios</span></div>
      <div class="crm-acciones">
        <button class="ctl ctl-fuerte" data-a="crm-simular" title="Llega una reserva pagada, como si un usuario reservara desde la app">${ico('mas')}<span class="ctl-texto">Simular reserva de la app</span></button>
        <button class="ctl" data-a="crm-modelo" aria-haspopup="dialog">${ico('comision')}<span class="ctl-texto">Así gana DRS</span></button>
        ${crudo(DRS.tema.selector())}
        <button class="ctl" data-a="crm-reiniciar" title="Reiniciar la demo" aria-label="Reiniciar la demo">${ico('flecha')}<span class="ctl-texto">Reiniciar</span></button>
        <a class="ctl" href="../">${ico('telefono')}<span class="ctl-texto">Ver la app</span></a>
      </div>`);
  }

  /* ---------------- acciones ---------------- */
  Object.assign(DRS.acciones, {
    proxima: (d) => proxima(d.que),
    'pl-sel': (d) => {
      DRS.panel.sel = d.id; DRS.panel.llega = null; DRS.panel.render();
      const m = document.querySelector('.pl-main'), det = document.querySelector('.pl-det');
      if (m && det && window.matchMedia('(max-width: 759px), (pointer: coarse) and (max-height: 500px)').matches) m.scrollTop = det.offsetTop - 8;
    },
    'pl-avanzar': (d) => { DRS.panel.pulsar = false; DRS.panel.llega = null; DRS.acc.reservaAvanzar(d.id); },
    'pl-vista': (d) => DRS.panel.ir(d.v || 'hoy'),
    'crm-simular': () => crm.simularReserva(),
    'crm-modelo': () => crm.modelo(),
    'crm-reiniciar': () => { DRS.sembrar({}); DRS.panel.sel = null; DRS.panel.vista = 'hoy'; DRS.panel.render(); crm.aviso('Demo reiniciada', 'El panel vuelve a su estado inicial.'); },
  });

  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-a]');
    if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    const fn = DRS.acciones[el.dataset.a];
    if (!fn) return;
    ev.preventDefault();
    fn(el.dataset, el, ev);
  });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && menuModelo && menuModelo.classList.contains('ver')) crm.modelo(false); });

  function arrancar() {
    U.$('#sprites').innerHTML = window.DRS_MARCA.iconos + window.DRS_MARCA.logos + window.DRS_ICONOS_APP;
    DRS.tema.aplicar();
    DRS.CLAVE_ESTADO = 'drs-crm';
    DRS.iniciarEstado();
    pintarBarra();
    DRS.panel.iniciar(U.$('#panel'));
    DRS.en('cambio', () => DRS.panel.render());
    DRS.en('tema', ({ cambio }) => { if (cambio) { pintarBarra(); DRS.panel.render(); } });
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) navigator.serviceWorker.register('../sw.js').catch(() => {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
})();
