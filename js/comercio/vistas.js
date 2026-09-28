/* DRS Motors · demo — Panel del comercio aliado: agenda semanal, clientes (CRM), servicios y precios,
   promociones en horas valle, pagos y liquidaciones, reseñas y métricas.
   Cada sección se registra en DRS.panelVistas[id] = { render(comercio, ctx), alMontar(el) }.
   Pensado para un dueño con poca adopción digital: letras grandes, pocas opciones y una acción
   principal por vista. Azul Acero una sola vez por vista y solo sobre sup-1. Datos ficticios. */
(function () {
  'use strict';
  const DRS = window.DRS;
  const U = DRS.util;
  const UI = DRS.ui;
  const { html, crudo, ico, num, pesos, placaTxt } = U;
  const CD = DRS.comercioDatos;

  const HORA_INI = 8 * 60, HORA_FIN = 18 * 60, FILA_SEM = 24;
  const DIAS_L = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'];   // 0 = lunes
  const DIAS_L3 = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  const ORDEN_SEM = [1, 2, 3, 4, 5, 6, 0];                                                        // getDay, lunes primero
  const TIPOS = [['moto', 'Moto'], ['automovil', 'Automóvil'], ['camioneta', 'Camioneta']];
  const SEGMENTOS = [['todos', 'Todos'], ['frecuente', 'Frecuentes'], ['nuevo', 'Nuevos'], ['inactivo', 'Inactivos']];

  /* ---------------- estado de la interfaz (no se guarda) ---------------- */
  const UI0 = () => ({ semana: 0, filtroCli: 'todos', busqueda: '', cliente: null, editando: null, errorEd: '', filtroRes: 'todas', respondiendo: null, errorResp: '', borradores: {}, promoNueva: null, enfocar: false });
  let ui = UI0();
  let capa = null;                // formulario abierto: { tipo: 'cliente' | 'promo', f, error, desde }
  let pendiente = null;           // scroll que se restaura tras re-pintar la misma vista
  let graficas = null;            // datos de las gráficas de Métricas (se dibujan al montar, con el ancho real)
  let observador = null;

  /* ---------------- utilidades ---------------- */
  const S = () => DRS.estado;
  const comercio = () => DRS.q.comercio(S().comercioPanel);
  const datos = (c) => CD.asegurar(S(), c.id);
  const suma = (xs, f) => xs.reduce((s, x) => s + (f ? f(x) : x), 0);
  const f1 = (x) => Math.round(x * 10) / 10;
  const ahoraMin = () => { const a = DRS.reloj.ahora(); return a.getHours() * 60 + a.getMinutes(); };
  const horaAhora = () => U.deMin(ahoraMin());
  const lunesD = () => -CD.lunesIdx(DRS.reloj.hoy());
  const srvDe = (id) => S().servicios.find((s) => s.id === id);
  const srvPorNombre = (n) => S().servicios.find((s) => s.nombre === n);
  const normPlaca = (p) => String(p || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const sinTildes = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
  const millones = (v) => `$ ${num(Math.round(v / 1e5) / 10)} M`;
  const h12 = (h) => (h % 12 === 0 ? 12 : h % 12);
  const solapa = (a0, a1, b0, b1) => a0 < b1 && a1 > b0;
  const esPlaca = (p) => /^[A-Z]{3}\d{3}$|^[A-Z]{3}\d{2}[A-Z]$/.test(p);

  function fechaRel(d, hora) {
    if (d === 0) return hora ? `Hoy, ${U.horaTxt(hora)}` : 'Hoy';
    if (d === -1) return 'Ayer';
    if (d === 1) return 'Mañana';
    if (d < 0 && d > -7) return `Hace ${-d} días`;
    return U.diaMes(DRS.reloj.dia(d));
  }
  const rango = (d0, d1) => {
    const a = DRS.reloj.dia(d0), b = DRS.reloj.dia(d1);
    return a.getMonth() === b.getMonth() ? `${a.getDate()} al ${b.getDate()} de ${U.MESES[b.getMonth()]}` : `${a.getDate()} de ${U.MESES[a.getMonth()]} al ${b.getDate()} de ${U.MESES[b.getMonth()]}`;
  };

  const rangoCorto = (d0, d1) => {
    const a = DRS.reloj.dia(d0), b = DRS.reloj.dia(d1);
    return a.getMonth() === b.getMonth() ? `${a.getDate()}–${b.getDate()} ${U.MES3[b.getMonth()]}` : `${a.getDate()} ${U.MES3[a.getMonth()]} – ${b.getDate()} ${U.MES3[b.getMonth()]}`;
  };

  function cab(ceja, titulo, der) {
    return html`<header class="pl-cab"><div><div class="ceja">${ceja}</div><h1 class="d d-44">${titulo}</h1></div>${der || ''}</header>`;
  }
  const kpi = (cap, valor, sub, ejemplo) => html`<div class="kpi"><span class="cap">${cap}</span><div class="d d-34 num">${valor}</div>${sub ? html`<div class="t11">${sub}</div>` : ''}${ejemplo ? html`<div class="pv-ejemplo">Valores de ejemplo</div>` : ''}</div>`;
  const segmentos = (pares, actual, accion, cuenta) => html`<div class="pv-seg" role="radiogroup">${pares.map(([k, t]) => html`<button role="radio" aria-checked="${k === actual ? 'true' : 'false'}" data-a="${accion}" data-v="${k}">${t}${cuenta && cuenta[k] != null ? html` <b>${cuenta[k]}</b>` : ''}</button>`)}</div>`;
  const barraNota = (n) => html`<span class="pv-nota" aria-label="${n} de 5">${[1, 2, 3, 4, 5].map((i) => html`<i class="${i <= n ? 'si' : ''}"></i>`)}<b>${n}</b><em>/5</em></span>`;

  /* ---------------- capturar y restaurar (el panel se re-pinta completo en cada cambio) ---------------- */
  function capturar(vista) {
    const raiz = document.querySelector('#panel .pv-raiz');
    raiz && raiz.querySelectorAll('[data-borrador]').forEach((x) => { ui.borradores[x.dataset.borrador] = x.value; });
    if (!raiz || raiz.dataset.pv !== vista) { pendiente = null; return; }
    const main = raiz.closest('.pl-main');
    pendiente = { y: main ? main.scrollTop : 0, dentro: Array.from(raiz.querySelectorAll('[data-scroll]')).map((x) => [x.dataset.scroll, x.scrollTop]) };
  }
  function restaurar(el) {
    if (!pendiente) return;
    el.scrollTop = pendiente.y;
    pendiente.dentro.forEach(([k, y]) => { const x = el.querySelector(`[data-scroll="${k}"]`); if (x) x.scrollTop = y; });
    pendiente = null;
  }
  const borrador = (k, def) => (ui.borradores[k] != null ? ui.borradores[k] : def);
  const soltarBorradores = (prefijo) => Object.keys(ui.borradores).forEach((k) => { if (k.startsWith(prefijo)) delete ui.borradores[k]; });

  /* ---------------- tostada y capa modal: viven en la ventana, fuera de #panel, y sobreviven al re-pintado ---------------- */
  const ventana = () => { const p = document.getElementById('panel'); return p && p.closest('.ventana'); };

  function tostada(texto, icono = 'check') {
    const v = ventana();
    if (!v) return;
    v.querySelectorAll('.pv-tostada').forEach((x) => x.remove());
    const t = document.createElement('div');
    t.className = `pv-tostada${icono === 'check' ? ' ok' : ''}`;
    t.setAttribute('role', 'status');
    t.innerHTML = String(html`${ico(icono)}<span>${texto}</span>`);
    v.appendChild(t);
    void t.offsetHeight;
    t.classList.add('ver');
    setTimeout(() => { t.classList.remove('ver'); setTimeout(() => t.remove(), 300); }, 3600);
  }

  function abrirCapa(tipo, f, desde) {
    capa = { tipo, f, error: '', desde };
    const v = ventana();
    if (v) v.querySelectorAll('.pv-tostada').forEach((x) => x.remove());
    pintarCapa();
    const primero = document.querySelector('.pv-dialogo input, .pv-dialogo [aria-checked="true"]');
    if (primero) primero.focus();
  }
  function cerrarCapa() {
    capa = null;
    const el = document.querySelector('.pv-capa');
    if (el) { el.classList.remove('ver'); setTimeout(() => el.remove(), 180); }
  }
  function pintarCapa() {
    const v = ventana();
    if (!v || !capa) return;
    let el = v.querySelector('.pv-capa');
    if (!el) {
      el = document.createElement('div');
      el.className = 'pv-capa';
      el.innerHTML = '<div class="pv-velo" data-a="pl-capa-cerrar"></div><div class="pv-dialogo" role="dialog" aria-modal="true"></div>';
      el.addEventListener('input', alEscribir);
      v.appendChild(el);
      void el.offsetHeight;
      el.classList.add('ver');
    }
    const dlg = el.querySelector('.pv-dialogo');
    const act = document.activeElement;
    const foco = act && dlg.contains(act) && act.name ? { n: act.name, s: act.selectionStart } : null;
    const y = dlg.scrollTop;
    dlg.innerHTML = String(capa.tipo === 'cliente' ? formCliente() : formPromo());
    dlg.setAttribute('aria-label', capa.tipo === 'cliente' ? 'Agregar cliente propio' : 'Nueva promoción');
    dlg.scrollTop = y;
    if (foco) {
      const x = dlg.querySelector(`[name="${foco.n}"]`);
      if (x) { x.focus(); try { x.setSelectionRange(foco.s, foco.s); } catch (e) { /* campo sin cursor */ } }
    }
  }
  function errorCapa(txt) { capa.error = txt; pintarCapa(); }

  function alEscribir(ev) {
    const t = ev.target;
    if (!capa || !t.name) return;
    capa.f[t.name] = t.value;
    if (capa.tipo === 'cliente' && t.name === 'placa') {
      const p = normPlaca(t.value);
      const cl = p.length >= 5 ? clientesCRM(comercio()).find((x) => x.placa === p) : null;
      let repintar = false;
      if (cl && cl.placa !== capa.f.conocido) {
        capa.f.conocido = cl.placa;
        if (!capa.f.nombre) capa.f.nombre = cl.nombre;
        if (cl.tipoVeh && cl.tipoVeh !== capa.f.tipo) capa.f.tipo = cl.tipoVeh;
        repintar = true;
      } else if (!cl && capa.f.conocido) { capa.f.conocido = null; repintar = true; }
      if (!cl && /^[A-Z]{3}\d{2}[A-Z]$/.test(p) && capa.f.tipo !== 'moto') { capa.f.tipo = 'moto'; repintar = true; }
      if (repintar) pintarCapa();
    }
  }

  /* =====================================================================================
     CONSULTAS (derivadas de estado.reservas + estado.panelDatos)
  ===================================================================================== */

  /** Reservas de un día como bloques de agenda: las reales (estado.reservas) y, fuera de hoy, las de ejemplo. */
  function bloquesDia(c, d) {
    const reales = S().reservas.filter((r) => r.comercio === c.id && r.d === d).map((r) => ({
      d, b: r.bahia, ini: r.hora, min: r.min, o: r.origen, s: (srvPorNombre(r.servicio) || {}).id || 'otro', t: r.total,
      id: r.id, cliente: r.cliente, placa: r.placa, estado: r.estado, real: true,
    }));
    if (d === 0) return reales;
    const anon = datos(c).agenda.filter((x) => x.d === d && !reales.some((r) => r.b === x.b && solapa(U.aMin(r.ini), U.aMin(r.ini) + r.min, U.aMin(x.ini), U.aMin(x.ini) + x.min)));
    return anon.concat(reales);
  }
  const ocupacion = (c, bl) => suma(bl, (x) => x.min) / (c.bahias * (HORA_FIN - HORA_INI));

  /** CRM: clientes de la semilla más los que aparecen en las reservas del comercio. */
  function clientesCRM(c) {
    const pd = datos(c);
    const mapa = new Map();
    pd.clientes.forEach((cl) => mapa.set(cl.placa, { ...cl, visitas: cl.visitas.map((v) => ({ ...v, servicio: (srvDe(v.s) || {}).nombre || 'Lavado' })), proxima: null }));
    S().reservas.filter((r) => r.comercio === c.id).forEach((r) => {
      let cl = mapa.get(r.placa);
      if (!cl) {
        const veh = r.vehiculo && r.usuario === 'u1' ? DRS.q.vehiculo(r.vehiculo) : null;
        cl = { id: `cr-${r.placa}`, nombre: r.cliente, placa: r.placa, tipoVeh: r.tipoVeh, vehiculo: veh ? UI.modelo(veh) : '', origen: r.origen, celular: null, usuario: r.usuario, visitas: [], proxima: null };
        mapa.set(r.placa, cl);
      }
      if (r.d > 0) { if (!cl.proxima || r.d < cl.proxima.d) cl.proxima = { d: r.d, hora: r.hora }; return; }
      cl.visitas.push({ d: r.d, servicio: r.servicio, t: r.total, o: r.origen, id: r.id, estado: r.estado, hora: r.hora });
    });
    return Array.from(mapa.values()).map((cl) => {
      const vs = cl.visitas.slice().sort((a, b) => b.d - a.d || (b.hora ? U.aMin(b.hora) : 0) - (a.hora ? U.aMin(a.hora) : 0));
      const n = vs.length;
      const ultima = n ? vs[0].d : null;
      const primera = n ? vs[n - 1].d : null;
      const en90 = vs.filter((v) => v.d >= -90).length;
      const seg = !n || primera >= -30 ? 'nuevo' : ultima < -60 ? 'inactivo' : en90 >= 3 ? 'frecuente' : 'regular';
      return { ...cl, visitas: vs, n, gasto: suma(vs, (v) => v.t), ultima, primera, seg, horaHoy: vs[0] && vs[0].d === 0 ? vs[0].hora : null };
    }).sort((a, b) => (b.ultima == null ? -999 : b.ultima) - (a.ultima == null ? -999 : a.ultima) || (b.horaHoy ? -U.aMin(b.horaHoy) : 0) - (a.horaHoy ? -U.aMin(a.horaHoy) : 0) || b.gasto - a.gasto);
  }
  const clientePorPlaca = (c, placa) => clientesCRM(c).find((x) => x.placa === normPlaca(placa));

  /** Promociones activas: la que trae la semilla (comercio.promo) y las nuevas (comercio.promos). */
  function promosActivas(c) {
    const pd = datos(c);
    const out = [];
    if (c.promo && !c.promo.puente) out.push({ p: c.promo, base: true, diasSemana: pd.promoBase.diasSemana, ini: pd.promoBase.ini, fin: pd.promoBase.fin, usados: pd.promoBase.usados, desde: null });
    (c.promos || []).filter((p) => p.estado !== 'terminada').forEach((p) => out.push({ p, base: false, diasSemana: p.diasSemana, ini: p.ini, fin: p.fin, usados: p.usados || 0, desde: p.desde }));
    return out;
  }

  /** Sugerencia automática: las dos horas seguidas con menos ocupación que no tienen promo. */
  function sugerencia(c) {
    const pd = datos(c);
    const F = pd.franjas.dias, H = pd.franjas.horas;
    const cubiertas = new Set();
    promosActivas(c).forEach((a) => a.diasSemana.forEach((g) => {
      for (let h = U.aMin(a.ini) / 60; h < U.aMin(a.fin) / 60; h++) cubiertas.add(`${(g + 6) % 7}-${h}`);
    }));
    let mejor = null;
    for (let dl = 0; dl < 7; dl++) {
      for (let i = 0; i < H.length - 1; i++) {
        const v1 = F[dl][i], v2 = F[dl][i + 1];
        if (v1 == null || v2 == null || cubiertas.has(`${dl}-${H[i]}`) || cubiertas.has(`${dl}-${H[i + 1]}`)) continue;
        const prom = (v1 + v2) / 2;
        if (!mejor || prom < mejor.prom) mejor = { dl, ini: H[i], fin: H[i] + 2, prom };
      }
    }
    if (!mejor) return null;
    return { ...mejor, g: ORDEN_SEM[mejor.dl], libre: 100 - Math.round(mejor.prom) };
  }

  /** 8 semanas: 7 cerradas (semilla) y la actual en vivo. */
  function semanas(c) {
    const pd = datos(c);
    const L = lunesD();
    const out = pd.historia.map((h) => ({ lunes: h.lunes, srv: h.srv, calif: h.calif, dias: h.dias.map((x, k) => ({ ...x, d: h.lunes + k })) }));
    const actual = { lunes: L, srv: {}, calif: null, dias: [] };
    for (let k = 0; k < 7; k++) {
      const d = L + k;
      const bl = bloquesDia(c, d);
      const app = bl.filter((x) => x.o === 'app');
      actual.dias.push({ d, n: bl.length, app: app.length, total: suma(bl, (x) => x.t), totalApp: suma(app, (x) => x.t), nuevos: bl.filter((x) => x.nu).length, min: suma(bl, (x) => x.min), futuro: d > 0, hoy: d === 0 });
      if (d <= 0) bl.forEach((x) => { actual.srv[x.s] = (actual.srv[x.s] || 0) + 1; });
    }
    out.push(actual);
    return out;
  }

  function liquidaciones(c) {
    const com = datos(c).plan.comision;
    return semanas(c).map((w) => {
      const dias = w.dias.filter((x) => !x.futuro);
      const vendido = suma(dias, (x) => x.totalApp);
      const comision = Math.round(vendido * com);
      const cerrada = w.lunes + 6 < 0;
      const pago = w.lunes + 8;           // calendario de ejemplo: el martes siguiente al cierre
      return { lunes: w.lunes, n: suma(dias, (x) => x.app), vendido, comision, neto: vendido - comision, local: suma(dias, (x) => x.total - x.totalApp), nLocal: suma(dias, (x) => x.n - x.app), pago, estado: !cerrada ? 'curso' : pago <= 0 ? 'pagada' : 'programada' };
    }).reverse();
  }

  function resenas(c) {
    const pd = datos(c);
    const escritas = pd.resenas.map((r) => ({ ...r, resp: pd.respuestas[r.id] || null }));
    const deApp = S().reservas.filter((r) => r.comercio === c.id && r.nota).map((r) => ({
      id: `res-${r.id}`, autor: r.cliente, placa: r.placa, nota: r.nota, fichas: r.fichas || [], texto: r.comentario || '', d: r.d, servicio: r.servicio, nueva: r.d === 0, resp: pd.respuestas[`res-${r.id}`] || null,
    }));
    const lista = deApp.concat(escritas).sort((a, b) => b.d - a.d);
    const dist = { ...pd.distribucion };
    deApp.filter((x) => x.d >= 0).forEach((x) => { dist[x.nota] = (dist[x.nota] || 0) + 1; });
    const total = suma([1, 2, 3, 4, 5], (k) => dist[k] || 0);
    const prom = suma([1, 2, 3, 4, 5], (k) => k * (dist[k] || 0)) / total;
    return { lista, dist, total, prom };
  }

  /* ---------------- textos de promociones ---------------- */
  const pluralDia = (n) => (n === 'sábado' ? 'sábados' : n === 'domingo' ? 'domingos' : n);
  function diasTexto(diasSemana) {
    const orden = ORDEN_SEM.filter((g) => diasSemana.includes(g));
    const nombres = orden.map((g) => U.DIAS[g]);
    if (orden.length === 7) return 'todos los días';
    const idx = orden.map((g) => ORDEN_SEM.indexOf(g));
    const seguidos = idx.every((x, i) => i === 0 || x === idx[i - 1] + 1);
    if (seguidos && orden.length >= 3) return `de ${nombres[0]} a ${nombres[nombres.length - 1]}`;
    return `los ${UI.listaY(nombres.map(pluralDia))}`;
  }
  function franjaTexto(ini, fin) {
    const a = ini < 12 ? 'a. m.' : 'p. m.', b = fin < 12 ? 'a. m.' : 'p. m.';
    return a === b ? `de ${h12(ini)}:00 a ${h12(fin)}:00 ${b}` : `de ${h12(ini)}:00 ${a} a ${h12(fin)}:00 ${b}`;
  }
  function franjaChip(ini, fin) {
    const a = ini < 12 ? 'a. m.' : 'p. m.', b = fin < 12 ? 'a. m.' : 'p. m.';
    return a === b ? `${h12(ini)}–${h12(fin)} ${b}` : `${h12(ini)} ${a}–${h12(fin)} ${b}`;
  }
  function condiciones(p, base) {
    const srv = srvDe(p.servicio);
    const hasta = U.fechaCorta(DRS.reloj.dia(p.hasta));
    if (base) return `Aplica a ${srv.nombre.toLowerCase()} de automóvil, ${p.dias}, ${p.franja} Hasta ${p.cupos} cupos por semana. Vigente hasta el ${hasta}.`;
    const tipos = TIPOS.filter(([k]) => srv.precio[k]).map(([, n]) => n.toLowerCase());
    return `Aplica a ${srv.nombre.toLowerCase()} de ${UI.listaY(tipos)}, ${p.dias}, ${p.franja} Hasta ${p.cupos} cupos por semana. Vigente del ${U.fechaCorta(DRS.reloj.dia(p.desde || 0))} al ${hasta}.`;
  }
  const punto = (t) => (/[.!?]$/.test(t) ? t : `${t}.`);
  const promoCorta = (p) => { const srv = srvDe(p.servicio); return `−${p.pct} % en ${srv ? srv.nombre.toLowerCase() : 'lavado'}, ${p.dias}, ${p.franja}`; };

  /* =====================================================================================
     1 · AGENDA SEMANAL
  ===================================================================================== */
  function vistaAgenda(c) {
    capturar('agenda');
    const pd = datos(c);
    const L = lunesD() + ui.semana * 7;
    const ahora = ahoraMin();
    const dias = Array.from({ length: 7 }, (_, k) => {
      const d = L + k;
      const bl = bloquesDia(c, d);
      const app = bl.filter((x) => x.o === 'app').length;
      return { d, k, fecha: DRS.reloj.dia(d), bl, app, propio: bl.length - app, bq: pd.bloqueos.filter((x) => x.d === d), oc: ocupacion(c, bl) };
    });
    const todas = [].concat(...dias.map((x) => x.bl));
    const nApp = todas.filter((x) => x.o === 'app').length;
    const nBloq = suma(dias, (x) => x.bq.length);
    const ocSem = suma(dias, (x) => x.oc) / 7;
    const y = (min) => ((min - HORA_INI) / 30) * FILA_SEM;
    const altoCol = ((HORA_FIN - HORA_INI) / 30) * FILA_SEM;
    const horas = [];
    for (let m = HORA_INI; m < HORA_FIN; m += 60) horas.push(m);

    const carril = (dia, b) => {
      const bls = dia.bl.filter((x) => x.b === b);
      const bqs = dia.bq.filter((x) => x.b === b);
      let s = [];
      for (let t = HORA_INI; t < HORA_FIN; t += 30) {
        const ocupado = bls.some((x) => solapa(t, t + 30, U.aMin(x.ini), U.aMin(x.ini) + x.min));
        const bloq = bqs.find((x) => U.aMin(x.ini) === t);
        const pasado = dia.d < 0 || (dia.d === 0 && t + 30 <= ahora);
        const lbl = `${DIAS_L[dia.k]} ${dia.fecha.getDate()}, ${U.horaTxt(U.deMin(t))}, bahía ${b}`;
        if (bloq) {
          s.push(html`<button class="pv-bloq" style="top:${y(t)}px;height:${FILA_SEM}px" data-a="pl-ag-bloq" data-d="${dia.d}" data-b="${b}" data-ini="${U.deMin(t)}" ${crudo(pasado ? 'disabled' : '')} aria-label="Bloqueada: ${lbl}. Toca para liberar" title="Bloqueada · toca para liberar"></button>`);
        } else if (!ocupado && !pasado) {
          s.push(html`<button class="pv-hueco" style="top:${y(t)}px;height:${FILA_SEM}px" data-a="pl-ag-bloq" data-d="${dia.d}" data-b="${b}" data-ini="${U.deMin(t)}" aria-label="Libre: ${lbl}. Toca para bloquear" title="Libre · toca para bloquear"></button>`);
        }
      }
      bls.forEach((x) => {
        const i0 = Math.max(HORA_INI, U.aMin(x.ini)), i1 = Math.min(HORA_FIN, U.aMin(x.ini) + x.min);
        if (i1 <= i0) return;
        const srv = srvDe(x.s);
        const tit = `${x.real ? `${placaTxt(x.placa)} · ${x.cliente} · ` : ''}${srv ? srv.nombre : 'Servicio'} · ${U.horaTxt(x.ini)} · ${x.o === 'app' ? 'App DRS' : 'Cliente propio'}`;
        const cls = `pv-rv ${x.o === 'app' ? 'app' : 'propio'}${x.estado === 'finalizada' ? ' fin' : dia.d < 0 ? ' pasado' : ''}`;
        const est = `top:${y(i0) + 1}px;height:${Math.max(4, y(i1) - y(i0) - 2)}px`;
        s.push(x.real && dia.d === 0
          ? html`<button class="${cls}" style="${est}" data-a="pl-ag-res" data-id="${x.id}" title="${tit} · ver en Hoy" aria-label="${tit}. Ver en Hoy"></button>`
          : html`<span class="${cls}" style="${est}" title="${tit}"></span>`);
      });
      return html`<div class="pv-carril">${s}</div>`;
    };

    const cabDia = (dia) => {
      const pApp = (suma(dia.bl.filter((x) => x.o === 'app'), (x) => x.min) / (c.bahias * 600)) * 100;
      const pPro = (suma(dia.bl.filter((x) => x.o !== 'app'), (x) => x.min) / (c.bahias * 600)) * 100;
      return html`<div class="pv-dia-cab${dia.d === 0 ? ' hoy' : ''}${dia.d < 0 ? ' pasado' : ''}">
        <div class="pv-dia-top"><span class="cap">${dia.d === 0 ? 'Hoy' : DIAS_L3[dia.k]}</span><span class="d d-20">${dia.fecha.getDate()}</span><span class="d d-20 num pv-dia-oc">${Math.round(dia.oc * 100)} %</span></div>
        <div class="pv-dia-barra" aria-hidden="true"><i class="app" style="width:${f1(Math.min(100, pApp))}%"></i><i class="propio" style="width:${f1(Math.min(100 - pApp, pPro))}%"></i></div>
        <div class="cap pv-dia-n">${dia.bl.length} · ${dia.app} app</div>
      </div>`;
    };

    const hoyCol = dias.find((x) => x.d === 0);
    const lineaAhora = hoyCol && ahora >= HORA_INI && ahora <= HORA_FIN ? html`<i class="pv-ahora" style="top:${y(ahora)}px" aria-hidden="true"></i>` : '';

    return html`<div class="pv-raiz" data-pv="agenda">
      ${cab(`Semana del ${rango(L, L + 6)}`, 'Agenda', segmentos([['0', 'Esta semana'], ['1', 'Próxima semana']], String(ui.semana), 'pl-ag-semana'))}
      <section class="pl-kpis">
        ${kpi('Reservas', num(todas.length), ui.semana ? 'Reservadas hasta hoy' : `${num(todas.filter((x) => x.d <= 0).length)} hasta hoy · ${num(todas.filter((x) => x.d > 0).length)} por venir`)}
        ${kpi('Ocupación', `${Math.round(ocSem * 100)} %`, 'De 8:00 a. m. a 6:00 p. m.')}
        ${kpi('Por la App DRS', `${todas.length ? Math.round((nApp / todas.length) * 100) : 0} %`, `${num(nApp)} reservas ya pagadas`)}
        ${kpi('Bloqueadas', `${num(nBloq / 2)} h`, nBloq ? `${num(nBloq)} ${nBloq === 1 ? 'franja' : 'franjas'} de 30 min` : 'Ninguna franja cerrada')}
      </section>
      <div class="pv-cuerpo">
        <div class="pv-leyenda">
          <span><i class="pv-m app"></i>App DRS</span><span><i class="pv-m propio"></i>Cliente propio</span><span><i class="pv-m bloq"></i>Bloqueada</span><span><i class="pv-m libre"></i>Libre</span>
          <span class="pv-leyenda-ayuda">${ico('informacion', 's16')}Toca un espacio libre para bloquearlo. Tócalo otra vez para liberarlo.</span>
        </div>
        <div class="pv-sem" style="--fila:${FILA_SEM}px">
          <div class="pv-sem-esq"></div>
          ${dias.map(cabDia)}
          <div class="pv-sem-esq pv-sem-b"></div>
          ${dias.map((dia) => html`<div class="pv-sem-b${dia.d === 0 ? ' hoy' : ''}">${Array.from({ length: c.bahias }, (_, i) => html`<span>B${i + 1}</span>`)}</div>`)}
          <div class="pv-sem-horas" style="height:${altoCol}px">${horas.map((m) => html`<span style="top:${y(m)}px">${U.horaTxt(U.deMin(m)).replace(':00', '')}</span>`)}</div>
          ${dias.map((dia) => html`<div class="pv-sem-dia${dia.d === 0 ? ' hoy' : ''}${dia.d < 0 ? ' pasado' : ''}" style="height:${altoCol}px;--bahias:${c.bahias}">${Array.from({ length: c.bahias }, (_, i) => carril(dia, i + 1))}${dia.d === 0 ? lineaAhora : ''}</div>`)}
        </div>
      </div>
    </div>`;
  }

  /* =====================================================================================
     2 · CLIENTES (CRM)
  ===================================================================================== */
  const SEG_TXT = { frecuente: 'Frecuente', nuevo: 'Nuevo', inactivo: 'Inactivo', regular: 'Regular' };
  function chipSeg(seg) {
    if (seg === 'inactivo') return html`<span class="chip chip-warn">${ico('excl')}Inactivo</span>`;
    if (seg === 'nuevo') return html`<span class="chip chip-luz">Nuevo</span>`;
    return html`<span class="chip">${SEG_TXT[seg]}</span>`;
  }
  const chipOrigen = (o) => (o === 'app' ? html`<span class="chip chip-app">App DRS</span>` : html`<span class="chip">Propio</span>`);

  function vistaClientes(c) {
    capturar('clientes');
    const todos = clientesCRM(c);
    const cuenta = { todos: todos.length };
    SEGMENTOS.slice(1).forEach(([k]) => { cuenta[k] = todos.filter((x) => x.seg === k).length; });
    const lista = ui.filtroCli === 'todos' ? todos : todos.filter((x) => x.seg === ui.filtroCli);
    if (!ui.cliente || !todos.find((x) => x.placa === ui.cliente)) ui.cliente = (lista.find((x) => x.usuario === 'u1') || lista[0] || {}).placa || null;
    const sel = todos.find((x) => x.placa === ui.cliente);
    const busca = (cl) => sinTildes(`${cl.nombre} ${cl.placa} ${placaTxt(cl.placa)} ${cl.vehiculo}`);

    return html`<div class="pv-raiz pv-fija" data-pv="clientes">
      ${cab(`CRM · ${num(todos.length)} clientes · ${num(cuenta.frecuente)} frecuentes`, 'Clientes', html`<div class="pv-cab-der">
        <label class="pv-buscar">${ico('buscar', 's16')}<span class="oculto">Buscar cliente</span><input id="pv-buscar" type="search" placeholder="Nombre o placa" value="${ui.busqueda}" autocomplete="off"></label>
        <button class="btn btn-fantasma btn-chico" data-a="pl-cliente-propio" data-desde="clientes">${ico('mas', 's16')}Cliente propio</button></div>`)}
      <div class="pv-filtros">${segmentos(SEGMENTOS, ui.filtroCli, 'pl-cli-filtro', cuenta)}
        <p class="t11 pv-filtros-ayuda">Frecuentes: 3 visitas o más en 90 días · Nuevos: primera visita hace menos de 30 días · Inactivos: más de 60 días sin venir.</p></div>
      <div class="pv-dos">
        <div class="pv-marco pv-scroll" data-scroll="tabla">
          <table class="pv-tabla">
            <thead><tr><th>Cliente</th><th>Vehículo</th><th class="pv-c">Visitas</th><th class="pv-der">Gasto</th><th>Última visita</th><th>Origen</th></tr></thead>
            <tbody>${lista.map((cl) => html`<tr data-a="pl-cli-sel" data-placa="${cl.placa}" data-buscar="${busca(cl)}" aria-selected="${cl.placa === ui.cliente ? 'true' : 'false'}">
              <td class="pv-nw"><button class="pv-fila-btn" data-a="pl-cli-sel" data-placa="${cl.placa}">${cl.nombre}</button><span class="cap">${SEG_TXT[cl.seg]}</span></td>
              <td><span class="pv-placa">${placaTxt(cl.placa)}</span><span class="t11 pv-corta">${cl.vehiculo}</span></td>
              <td class="pv-c"><span class="d d-20 num">${cl.n}</span></td>
              <td class="pv-der num">${pesos(cl.gasto)}</td>
              <td class="pv-nw">${cl.ultima == null ? html`<span class="t-3">Sin visitas</span>` : fechaRel(cl.ultima)}</td>
              <td>${chipOrigen(cl.origen)}</td>
            </tr>`)}</tbody>
          </table>
          <p class="pv-vacia t13" hidden>Ningún cliente coincide con la búsqueda.</p>
        </div>
        ${detalleCliente(c, sel)}
      </div>
    </div>`;
  }

  function detalleCliente(c, cl) {
    if (!cl) return html`<aside class="pl-det"><div class="pl-det-cuerpo"><p class="t13">Elige un cliente de la lista.</p></div></aside>`;
    const pd = datos(c);
    const esApp = cl.origen === 'app';
    const envio = pd.envios[cl.placa];
    const nota = borrador(`nota:${cl.placa}`, pd.notas[cl.placa] || '');
    const ticket = cl.n ? Math.round(cl.gasto / cl.n / 100) * 100 : 0;
    return html`<aside class="pl-det pv-det" aria-label="Detalle del cliente">
      <div class="pl-det-cuerpo" data-scroll="detalle">
        <div class="ceja">${cl.primera != null ? `Desde el ${U.fechaCorta(DRS.reloj.dia(cl.primera))}` : 'Cliente nuevo'}</div>
        <div class="d d-34">${cl.nombre}</div>
        <div class="t13 t-1">${cl.vehiculo ? `${cl.vehiculo} · ` : ''}${placaTxt(cl.placa)}</div>
        <div class="chips">${chipOrigen(cl.origen)}${chipSeg(cl.seg)}</div>
        <div class="pv-mini">
          <div><span class="cap">Visitas</span><b class="d d-20 num">${cl.n}</b></div>
          <div><span class="cap">Gasto</span><b class="d d-20 num">${pesos(cl.gasto)}</b></div>
          <div><span class="cap">Ticket</span><b class="d d-20 num">${pesos(ticket)}</b></div>
        </div>
        <dl class="datos">
          <dt>Comisión DRS</dt><dd>${esApp ? `Solo en reservas por la app (ej. ${Math.round(pd.plan.comision * 100)} %)` : 'Sin comisión'}</dd>
          ${cl.celular ? html`<dt>Celular</dt><dd class="num">${cl.celular}</dd>` : ''}
          ${cl.proxima ? html`<dt>Próxima cita</dt><dd>${fechaRel(cl.proxima.d)} · ${U.horaTxt(cl.proxima.hora)}</dd>` : ''}
        </dl>
        <div class="sep"></div>
        <div class="etq pv-sub">Historial de servicios</div>
        <ol class="pv-hist">${cl.visitas.map((v) => html`<li><span class="t13 t-1">${v.servicio}</span><span class="num t13 t-1">${pesos(v.t)}</span><span class="cap">${fechaRel(v.d)} · ${v.o === 'app' ? 'App DRS' : 'En el local'}</span></li>`)}</ol>
        ${!cl.visitas.length ? html`<p class="t11">Todavía sin servicios.</p>` : ''}
        <div class="sep"></div>
        <label class="etq pv-sub" for="pv-nota">Notas</label>
        <textarea id="pv-nota" class="pv-area" data-borrador="nota:${cl.placa}" placeholder="Algo que tu equipo deba saber de este cliente">${nota}</textarea>
        <button class="btn btn-fantasma btn-chico pv-guardar-nota" data-a="pl-cli-nota" data-placa="${cl.placa}">${ico('guardar', 's16')}Guardar nota</button>
      </div>
      <div class="pl-det-pie">
        <button class="btn btn-acero" data-a="pl-cli-promo" data-placa="${cl.placa}">${ico('enviar')}Enviar promo</button>
        <p class="t11">${envio && envio.d === 0 ? `Ya le enviaste una promo hoy, ${U.horaTxt(envio.h)}` : esApp ? 'Le llega como aviso en la app DRS.' : cl.celular ? `Le llega por WhatsApp al ${cl.celular}.` : 'Le llega por WhatsApp.'}</p>
      </div>
    </aside>`;
  }

  /* =====================================================================================
     3 · SERVICIOS Y PRECIOS
  ===================================================================================== */
  function vistaServicios(c) {
    capturar('servicios');
    const com = datos(c).plan.comision;
    const srvs = S().servicios;
    const extras = S().extras;
    const neto = (v) => pesos(Math.round((v * (1 - com)) / 100) * 100);
    const barraEd = (k, cols) => html`<tr class="pv-ed-barra"><td colspan="${cols}">
      <div class="pv-ed-acc">
        <button class="btn btn-acero btn-chico" data-a="pl-srv-guardar" data-k="${k}">${ico('guardar', 's16')}Guardar cambios</button>
        <button class="btn btn-fantasma btn-chico" data-a="pl-srv-cancelar">Cancelar</button>
        <span class="t11">Bajo cada precio: lo que recibes por una reserva de la app (comisión de ejemplo: ${Math.round(com * 100)} %). Deja vacío lo que no ofreces.</span>
      </div>
      ${ui.errorEd ? html`<p class="pv-error" role="alert">${ico('excl')}${ui.errorEd}</p>` : ''}
    </td></tr>`;
    const celdaPrecio = (s, k) => {
      const v = s.precio[k];
      if (ui.editando === `srv:${s.id}`) {
        const val = borrador(`srv:${s.id}:${k}`, v ? num(v) : '');
        return html`<td class="pv-der"><label class="pv-in"><span>$</span><input name="${k}" inputmode="numeric" data-borrador="srv:${s.id}:${k}" value="${val}" placeholder="No aplica" aria-label="Precio de ${s.nombre} para ${k}"></label><span class="t11 pv-neto" data-neto="${k}">${v ? `Recibes ${neto(v)}` : ''}</span></td>`;
      }
      return html`<td class="pv-der">${v ? html`<span class="d d-20 num">${pesos(v)}</span>` : html`<span class="t11">No aplica</span>`}</td>`;
    };
    const filaSrv = (s) => {
      const ed = ui.editando === `srv:${s.id}`;
      return html`<tr class="${ed ? 'editando' : ''}" data-fila="srv:${s.id}">
        <td class="pv-srv"><span class="t13 t-1 pv-srv-nom">${s.nombre}</span><span class="t11">${s.desc}</span></td>
        <td>${ed ? html`<label class="pv-in pv-in-min"><input name="min" inputmode="numeric" data-borrador="srv:${s.id}:min" value="${borrador(`srv:${s.id}:min`, s.min)}" aria-label="Duración en minutos"><span>min</span></label>` : html`<span class="t13 num pv-nw">${s.min} min</span>`}</td>
        ${TIPOS.map(([k]) => celdaPrecio(s, k))}
        <td class="pv-acc">${ed ? html`<span class="cap t-luz">Editando</span>` : html`<button class="btn btn-fantasma btn-chico" data-a="pl-srv-editar" data-k="srv:${s.id}" ${crudo(ui.editando ? 'disabled' : '')}>${ico('editar', 's16')}Editar</button>`}</td>
      </tr>${ed ? barraEd(`srv:${s.id}`, 6) : ''}`;
    };
    const filaExtra = (x) => {
      const ed = ui.editando === `ext:${x.id}`;
      return html`<tr class="${ed ? 'editando' : ''}" data-fila="ext:${x.id}">
        <td><span class="t13 t-1">${x.nombre}</span></td>
        <td class="pv-der">${ed ? html`<label class="pv-in"><span>$</span><input name="precio" inputmode="numeric" data-borrador="ext:${x.id}:precio" value="${borrador(`ext:${x.id}:precio`, num(x.precio))}" aria-label="Precio de ${x.nombre}"></label>` : html`<span class="d d-20 num">${pesos(x.precio)}</span>`}</td>
        <td class="pv-acc">${ed ? html`<span class="cap t-luz">Editando</span>` : html`<button class="btn btn-fantasma btn-chico" data-a="pl-srv-editar" data-k="ext:${x.id}" ${crudo(ui.editando ? 'disabled' : '')}>${ico('editar', 's16')}Editar</button>`}</td>
      </tr>${ed ? barraEd(`ext:${x.id}`, 3) : ''}`;
    };
    return html`<div class="pv-raiz" data-pv="servicios">
      ${cab('Lo que ven los usuarios en la app', 'Servicios y precios')}
      <div class="pv-cuerpo">
        <div class="pv-marco">
          <table class="pv-tabla pv-tabla-srv">
            <thead><tr><th>Servicio</th><th>Duración</th>${TIPOS.map(([k, n]) => html`<th class="pv-der"><span class="pv-th-ico">${ico(k === 'moto' ? 'moto' : 'carro', 's16')}${n}</span></th>`)}<th></th></tr></thead>
            <tbody>${srvs.map(filaSrv)}</tbody>
          </table>
        </div>
        <div class="pv-bloque-cab"><h2 class="d d-26">Extras</h2><p class="t11">Se suman a cualquier servicio.</p></div>
        <div class="pv-marco pv-marco-extras">
          <table class="pv-tabla">
            <thead><tr><th>Extra</th><th class="pv-der">Precio</th><th></th></tr></thead>
            <tbody>${extras.map(filaExtra)}</tbody>
          </table>
        </div>
        <div class="pv-notas">
          <p>${ico('informacion', 's16')}<span>Los cambios se ven de inmediato en la app. Las reservas ya pagadas conservan su precio.</span></p>
          <p>${ico('comision', 's16')}<span>Por cada reserva de la app recibes el precio menos la comisión DRS (valor de ejemplo: ${Math.round(com * 100)} %). Tus clientes propios pagan el precio completo en el local, sin comisión.</span></p>
        </div>
      </div>
    </div>`;
  }

  /* =====================================================================================
     4 · PROMOCIONES EN HORAS VALLE
  ===================================================================================== */
  function tiraDia(c, dl, marca) {
    const pd = datos(c);
    const fila = pd.franjas.dias[dl];
    return html`<div class="pv-tira" aria-hidden="true">${pd.franjas.horas.map((h, i) => {
      const v = fila[i];
      const en = marca && h >= marca.ini && h < marca.fin;
      return html`<div class="pv-tira-c${en ? ' marca' : ''}${marca && h === marca.ini ? ' ini' : ''}${marca && h === marca.fin - 1 ? ' fin' : ''}">
        <b class="num">${v == null ? '—' : `${v} %`}</b><i class="${v == null ? 'pv-cerrado' : ''}"><s style="height:${v == null ? 0 : v}%"></s></i><span class="cap">${h12(h)}</span></div>`;
    })}</div>`;
  }
  const rampa = (v) => 5 - Math.min(4, Math.floor(v / 20));   // 1 = más ocupado (ser-1) … 5 = más libre (ser-5)

  function vistaPromos(c) {
    capturar('promos');
    const pd = datos(c);
    const sug = sugerencia(c);
    const activas = promosActivas(c);
    const ultima = pd.historia[pd.historia.length - 1];
    const usadosAntes = ultima ? Math.min(12, suma(ultima.dias, (x) => x.promo || 0)) : 0;
    const tarjeta = (a) => {
      const p = a.p;
      const srv = srvDe(p.servicio);
      const nueva = ui.promoNueva && p.id === ui.promoNueva;
      const base = srv.precio.automovil || srv.precio.moto;
      return html`<article class="pv-promo${nueva ? ' nueva' : ''}">
        <div class="pv-promo-top">
          <span class="chip chip-pos">${ico('check')}Activa</span>
          ${nueva ? html`<span class="chip chip-luz">Nueva</span>` : ''}
          <span class="cap pv-promo-vis">${ico('ubicacion', 's16')}Visible en la app</span>
        </div>
        <div class="pv-promo-pct"><span class="d d-56 num">−${p.pct} %</span><div><div class="t13 t-1">${srv.nombre}</div><div class="t11"><span class="num">${pesos(Math.round((base * (100 - p.pct)) / 100 / 100) * 100)}</span> en lugar de <span class="tachado num">${pesos(base)}</span></div></div></div>
        <dl class="datos">
          <dt>Días</dt><dd>${p.dias.charAt(0).toUpperCase() + p.dias.slice(1)}</dd>
          <dt>Franja</dt><dd>${p.franja.replace(/^de /, '')}</dd>
          <dt>Vigencia</dt><dd>Hasta el ${U.fechaCorta(DRS.reloj.dia(p.hasta))} · ${num(p.hasta)} días</dd>
        </dl>
        <div class="pv-cupos">
          <div class="pv-cupos-top"><span class="cap">Cupos usados esta semana</span><span class="t13 t-1 num">${a.usados} de ${p.cupos}</span></div>
          <div class="pv-cupos-seg" style="--n:${p.cupos}">${Array.from({ length: p.cupos }, (_, i) => html`<i class="${i < a.usados ? 'si' : ''}"></i>`)}</div>
          ${a.base ? html`<p class="t11 pv-cupos-ant">La semana pasada: ${usadosAntes} de ${p.cupos}.</p>` : html`<p class="t11 pv-cupos-ant">${punto(`Publicada ${p.creada && p.creada.d === 0 ? `hoy, ${U.horaTxt(p.creada.h)}` : 'esta semana'}`)}</p>`}
        </div>
        ${a.base ? html`<div class="pv-efecto"><span class="cap">Ocupación de la franja</span>
          <div class="pv-efecto-fila"><span class="t11">Antes</span><span class="pv-efecto-barra"><i style="width:${pd.promoBase.antes}%"></i></span><b class="num">${pd.promoBase.antes} %</b></div>
          <div class="pv-efecto-fila"><span class="t11">Ahora</span><span class="pv-efecto-barra ahora"><i style="width:${pd.promoBase.ahora}%"></i></span><b class="num">${pd.promoBase.ahora} %</b></div></div>` : ''}
        <p class="cond">${condiciones(p, a.base)}</p>
      </article>`;
    };
    const comoFunciona = html`<aside class="pv-como">
      <span class="etq">Cómo funciona</span>
      <ol>
        <li><b class="d d-26">1</b><span>Eliges servicio, días, franja, descuento, vigencia y cupos.</span></li>
        <li><b class="d d-26">2</b><span>La app la muestra a los usuarios cercanos, con las condiciones completas.</span></li>
        <li><b class="d d-26">3</b><span>Llenas horas vacías. Pagas comisión solo por las reservas que llegan por la app.</span></li>
      </ol>
    </aside>`;
    return html`<div class="pv-raiz" data-pv="promos">
      ${cab('Horas valle · la ven los usuarios cercanos en la app', 'Promociones', html`<button class="btn btn-fantasma btn-chico" data-a="pl-promo-nueva">${ico('mas', 's16')}Nueva promoción</button>`)}
      <div class="pv-cuerpo">
        ${sug ? html`<section class="pv-sug" aria-label="Sugerencia automática">
          <div class="pv-sug-txt">
            <div class="ceja">${ico('informacion', 's16')}Sugerencia automática</div>
            <p class="pv-sug-frase">Los ${pluralDia(DIAS_L[sug.dl])} de ${franjaTexto(sug.ini, sug.fin).replace(/^de /, '')} tienes <b class="d d-34 num pv-nw">${sug.libre} %</b> de capacidad libre.</p>
            <p class="t13">Lo calculamos con tus reservas de las últimas 8 semanas en tus ${c.bahias} bahías. Una promo en esa franja llena espacios vacíos sin quitarte clientes de las horas pico.</p>
            <button class="btn btn-acero pv-sug-btn" data-a="pl-promo-sugerida">${ico('precio')}Crear promoción</button>
          </div>
          <div class="pv-sug-graf"><span class="cap">Ocupación de los ${pluralDia(DIAS_L[sug.dl])} por hora</span>${tiraDia(c, sug.dl, sug)}
            <div class="pv-tira-ley"><span class="cap"><i class="pv-m propio"></i>Ocupado</span><span class="cap"><i class="pv-m libre"></i>Libre</span><span class="cap"><i class="pv-m recuadro"></i>Franja sugerida</span></div></div>
        </section>` : html`<section class="pv-sug pv-sug-ok"><p class="t16">${ico('check')}Tus horas valle ya tienen promoción. Te avisamos cuando veamos otra franja con espacio.</p></section>`}
        <div class="pv-bloque-cab"><h2 class="d d-26">Activas</h2><p class="t11">${activas.length} ${activas.length === 1 ? 'promoción' : 'promociones'} · se muestran con sus condiciones completas</p></div>
        <div class="pv-promos">${activas.slice().reverse().map(tarjeta)}${activas.length % 2 ? comoFunciona : ''}</div>
        <p class="pv-legal">${ico('documento', 's16')}<span>Condiciones y vigencia visibles para el usuario antes de reservar, como pide el Estatuto del Consumidor (Ley 1480 de 2011, art. 33).</span></p>
      </div>
    </div>`;
  }

  /* =====================================================================================
     5 · PAGOS Y LIQUIDACIONES
  ===================================================================================== */
  function vistaPagos(c) {
    capturar('pagos');
    const pd = datos(c);
    const com = pd.plan.comision;
    const liq = liquidaciones(c);
    const act = liq[0];
    const prox = liq.slice().reverse().find((x) => x.estado !== 'pagada') || act;
    const L = lunesD();
    const hoy = DRS.reloj.hoy();
    const dCobro = U.diasEntre(hoy, new Date(hoy.getFullYear(), hoy.getMonth() + 1, 1));
    const dUltimo = U.diasEntre(hoy, new Date(hoy.getFullYear(), hoy.getMonth(), 1));
    const pctNeto = Math.round((1 - com) * 100);
    const fPago = DRS.reloj.dia(prox.pago);
    const chipEst = (e) => (e === 'pagada' ? html`<span class="chip chip-pos">${ico('check')}Pagada</span>` : e === 'programada' ? html`<span class="chip">${ico('horario')}Programada</span>` : html`<span class="chip chip-luz">En curso</span>`);
    return html`<div class="pv-raiz" data-pv="pagos">
      ${cab(`Semana del ${rango(L, L + 6)}`, 'Pagos', html`<button class="btn btn-fantasma btn-chico" data-a="pl-pag-extracto">${ico('descargar', 's16')}Descargar extracto</button>`)}
      <div class="pv-cuerpo">
        <section class="pv-pago">
          <div class="pv-pago-neto">
            <span class="ceja">Próxima liquidación</span>
            <div class="d d-76 num">${pesos(prox.neto)}</div>
            <p class="t16 t-1">Se paga el ${U.fechaLarga(fPago)}.</p>
            <p class="t13">${prox.estado === 'curso' ? `Lo que llevas esta semana por la app, ya descontada la comisión. La semana se cierra ${L + 6 === 0 ? 'hoy' : 'el domingo'}.` : 'Semana cerrada: lo que recibes por las reservas de la app, ya descontada la comisión.'}</p>
            <p class="t11">${pd.cuenta}</p>
          </div>
          <div class="pv-pago-cuenta">
            <dl class="pv-cuenta">
              <dt>Vendido por la app</dt><dd class="num">${pesos(prox.vendido)}</dd>
              <dt>Comisión DRS · ${Math.round(com * 100)} % · valor de ejemplo</dt><dd class="num">−${pesos(prox.comision)}</dd>
              <dt class="total">Neto a recibir</dt><dd class="total num">${pesos(prox.neto)}</dd>
            </dl>
            <div class="pv-reparto" role="img" aria-label="De cada $ 100 vendidos por la app, $ ${pctNeto} son para ti y $ ${100 - pctNeto} son comisión">
              <i class="neto" style="width:${pctNeto}%"></i><i class="com" style="width:${100 - pctNeto}%"></i>
            </div>
            <div class="pv-reparto-lbl"><span class="cap">${pctNeto} % para ti</span><span class="cap">${100 - pctNeto} % comisión</span></div>
            <div class="pv-propios">
              <span class="chip chip-pos">${ico('check')}Sin comisión</span>
              <p class="t13"><b class="t-1">Clientes propios: ${pesos(prox.local)}</b> cobrados en el local ${prox.estado === 'curso' ? 'esta semana' : 'esa semana'} (${num(prox.nLocal)} servicios). Ese dinero no pasa por DRS y es 100 % tuyo.</p>
            </div>
          </div>
        </section>

        <div class="pv-bloque-cab"><h2 class="d d-26">Liquidaciones semanales</h2><p class="t11">Cada martes pagamos la semana anterior, de lunes a domingo. Calendario de ejemplo.</p></div>
        <div class="pv-marco">
          <table class="pv-tabla pv-tabla-liq">
            <thead><tr><th>Semana</th><th class="pv-c">Reservas app</th><th class="pv-der">Vendido por la app</th><th class="pv-der">Comisión</th><th class="pv-der">Neto</th><th>Estado</th><th>Pago</th></tr></thead>
            <tbody>${liq.map((x) => html`<tr>
              <td class="pv-nw"><span class="t13 t-1">${rangoCorto(x.lunes, x.lunes + 6)}</span></td>
              <td class="pv-c"><span class="d d-20 num">${x.n}</span></td>
              <td class="pv-der num pv-nw">${pesos(x.vendido)}</td>
              <td class="pv-der num pv-nw t-3">−${pesos(x.comision)}</td>
              <td class="pv-der pv-nw"><span class="d d-20 num">${pesos(x.neto)}</span></td>
              <td>${chipEst(x.estado)}</td>
              <td class="pv-nw t13">${U.diaMes(DRS.reloj.dia(x.pago))}</td>
            </tr>`)}</tbody>
          </table>
        </div>

        <section class="pv-plan">
          <div class="pv-plan-nom"><span class="ceja">Tu plan</span><div class="d d-44">${pd.plan.nombre}</div><span class="chip chip-pos">${ico('check')}Al día</span></div>
          <div class="pv-plan-precio"><span class="d d-34 num">${pesos(pd.plan.mensualidad)}</span><span class="t11">al mes · valor de ejemplo</span>
            <dl class="datos"><dt>Último pago</dt><dd>${U.fechaCorta(DRS.reloj.dia(dUltimo))}</dd><dt>Próximo cobro</dt><dd>${U.fechaCorta(DRS.reloj.dia(dCobro))}</dd></dl></div>
          <ul class="pv-incluye">${['Agenda y CRM de tus clientes', 'Promociones en horas valle', 'Presencia en la app DRS', 'Liquidación semanal'].map((t) => html`<li>${ico('check', 's16')}${t}</li>`)}</ul>
        </section>
        <p class="pv-legal">${ico('informacion', 's16')}<span>Valores de ejemplo: la comisión y la mensualidad del plan están por definir.</span></p>
      </div>
    </div>`;
  }

  /* =====================================================================================
     6 · RESEÑAS
  ===================================================================================== */
  function vistaResenas(c) {
    capturar('resenas');
    const R = resenas(c);
    const pend = R.lista.filter((x) => !x.resp && (x.texto || x.nota <= 3));
    const lista = ui.filtroRes === 'pendientes' ? pend : R.lista;
    const maxDist = Math.max(...[1, 2, 3, 4, 5].map((k) => R.dist[k] || 0));
    const item = (r) => {
      const resp = r.resp;
      const abierta = ui.respondiendo === r.id;
      return html`<article class="pv-res-item${r.nueva ? ' nueva' : ''}" data-id="${r.id}">
        <header class="pv-res-cab">
          <div><b class="t13 t-1">${r.autor}</b><span class="t11">${r.servicio} · ${fechaRel(r.d)}</span></div>
          <div class="pv-res-der">${r.nueva ? html`<span class="chip chip-luz">Nueva</span>` : ''}<span class="cap pv-verif">${ico('verificado', 's16')}Reservó por la app</span></div>
        </header>
        ${barraNota(r.nota)}
        ${r.fichas.length ? html`<div class="pv-fichas">${r.fichas.map((f) => html`<span class="chip">${f}</span>`)}</div>` : ''}
        ${r.texto ? html`<p class="t13 t-1 pv-res-txt">${r.texto}</p>` : html`<p class="t11">Calificó sin comentario.</p>`}
        ${resp ? html`<div class="pv-resp"><span class="cap">Respuesta de ${c.nombre} · ${fechaRel(resp.d)}</span><p class="t13">${resp.texto}</p></div>`
          : abierta ? html`<div class="pv-resp-form">
              <label class="oculto" for="pv-resp">Tu respuesta</label>
              <textarea id="pv-resp" class="pv-area" data-borrador="resp:${r.id}" placeholder="Escribe tu respuesta. Corta y amable.">${borrador(`resp:${r.id}`, `Gracias, ${r.autor.split(' ')[0]}. `)}</textarea>
              ${ui.errorResp ? html`<p class="pv-error" role="alert">${ico('excl')}${ui.errorResp}</p>` : ''}
              <div class="pv-resp-acc"><button class="btn btn-acero btn-chico" data-a="pl-res-publicar" data-id="${r.id}">${ico('enviar', 's16')}Publicar respuesta</button><button class="btn btn-fantasma btn-chico" data-a="pl-res-cancelar">Cancelar</button><span class="t11">La ven todos en tu perfil de la app.</span></div>
            </div>`
            : ui.respondiendo ? '' : html`<button class="enlace pv-res-btn" data-a="pl-res-responder" data-id="${r.id}">${ico('comentar')}Responder</button>`}
      </article>`;
    };
    return html`<div class="pv-raiz" data-pv="resenas">
      ${cab('Solo opinan clientes que reservaron por la app', 'Reseñas', segmentos([['todas', 'Todas'], ['pendientes', 'Sin responder']], ui.filtroRes, 'pl-res-filtro', { todas: R.lista.length, pendientes: pend.length }))}
      <div class="pv-cuerpo pv-res">
        <aside class="pv-res-resumen">
          <span class="cap">Calificación promedio</span>
          <div class="pv-res-prom"><span class="d d-76 num">${num(Math.round(R.prom * 10) / 10)}</span><span class="d d-26">/5</span></div>
          <p class="t13">${num(R.total)} reseñas · así te ven en la app</p>
          <div class="pv-dist">${[5, 4, 3, 2, 1].map((k) => html`<div class="pv-dist-fila"><span class="d d-20">${k}</span><span class="pv-dist-barra"><i style="width:${f1(((R.dist[k] || 0) / maxDist) * 100)}%"></i></span><span class="t11 num">${num(R.dist[k] || 0)}</span></div>`)}</div>
          <div class="sep"></div>
          <p class="t11">Responder rápido sube la confianza: los usuarios ven tus respuestas en el perfil del lavadero.</p>
          <div class="pv-res-pend"><span class="d d-34 num">${pend.length}</span><span class="t13">sin responder</span></div>
        </aside>
        <div class="pv-res-lista">${lista.length ? lista.map(item) : html`<div class="vacio"><div class="d d-26">Todo respondido</div><p class="t13">No tienes reseñas pendientes.</p></div>`}</div>
      </div>
    </div>`;
  }

  /* =====================================================================================
     7 · MÉTRICAS (gráficas SVG hechas a mano, estilo tablero técnico)
  ===================================================================================== */
  function vistaMetricas(c) {
    capturar('metricas');
    const pd = datos(c);
    const W = semanas(c);
    const diasTodos = [].concat(...W.map((w) => w.dias));
    const vistos = diasTodos.filter((x) => !x.futuro);
    const nTot = suma(vistos, (x) => x.n), nApp = suma(vistos, (x) => x.app);
    const ingresos = suma(vistos, (x) => x.total);
    const ocProm = suma(vistos, (x) => x.min) / (vistos.length * c.bahias * 600);
    const nuevos = suma(vistos, (x) => x.nuevos || 0);
    const R = resenas(c);
    const srvCuenta = {};
    W.forEach((w) => Object.entries(w.srv).forEach(([k, v]) => { srvCuenta[k] = (srvCuenta[k] || 0) + v; }));
    const srvLista = Object.entries(srvCuenta).filter(([k]) => srvDe(k)).map(([k, n]) => ({ nombre: srvDe(k).nombre, n })).sort((a, b) => b.n - a.n);
    const sug = sugerencia(c);
    const cuota = (w) => { const ds = w.dias.filter((x) => !x.futuro); const n = suma(ds, (x) => x.n); return n ? Math.round((suma(ds, (x) => x.app) / n) * 100) : 0; };
    const califSem = W.map((w) => (w.calif != null ? w.calif : Math.round(R.prom * 10) / 10));
    const semTot = W.map((w, i) => ({ fecha: DRS.reloj.dia(w.lunes), total: suma(w.dias.filter((x) => !x.futuro), (x) => x.total), app: suma(w.dias.filter((x) => !x.futuro), (x) => x.totalApp), parcial: i === W.length - 1 }));
    const ultCerrada = semTot[semTot.length - 2];

    graficas = {
      dias: diasTodos.map((x) => ({ fecha: DRS.reloj.dia(x.d), n: x.n, app: x.app, futuro: x.futuro, hoy: x.hoy })),
      franjas: pd.franjas, sug, promos: promosActivas(c),
      semanas: semTot,
      nuevos, recurrentes: nTot - nuevos,
      servicios: srvLista,
      calif: califSem,
    };
    const lamina = (id, clase, titulo, sub, cifra, alto, bajo) => html`<figure class="pv-lamina ${clase}">
      <figcaption><div><span class="etq">${titulo}</span>${sub ? html`<span class="t11">${sub}</span>` : ''}</div>${cifra || ''}</figcaption>
      ${bajo ? html`<div class="pv-lamina-ley">${bajo}</div>` : ''}
      <div class="pv-graf" data-graf="${id}" style="height:${alto}px"></div>
      <div class="pv-lamina-pie"><span class="cap">Valores de ejemplo</span><span class="cap">${c.nombre} · ${U.fechaCorta(DRS.reloj.hoy())}</span></div>
    </figure>`;
    const ley = (pares) => html`<span class="pv-leyenda-g">${pares.map(([m, t]) => html`<span><i class="pv-m ${m}"></i>${t}</span>`)}</span>`;
    return html`<div class="pv-raiz" data-pv="metricas">
      ${cab('Últimas 8 semanas · valores de ejemplo', 'Métricas')}
      <section class="pl-kpis">
        ${kpi('Reservas', num(nTot), `${num(Math.round(nTot / vistos.length))} por día en promedio`)}
        ${kpi('Ingresos', millones(ingresos), 'App DRS y clientes propios')}
        ${kpi('Ocupación', `${Math.round(ocProm * 100)} %`, 'De 8:00 a. m. a 6:00 p. m.')}
        ${kpi('Por la App DRS', `${Math.round((nApp / nTot) * 100)} %`, `Del ${cuota(W[0])} % en la semana 1 al ${cuota(W[W.length - 2])} % en la 7`)}
      </section>
      <div class="pv-cuerpo pv-tablero">
        ${lamina('reservas', 'pv-l6', 'Reservas por día', 'App DRS abajo, clientes propios arriba. Lo que viene: solo lo ya reservado.', ley([['app', 'App DRS'], ['propio', 'Propias'], ['contorno', 'Ya reservadas']]), 200)}
        ${lamina('calor', 'pv-l4', 'Ocupación por franja', 'Promedio por día y hora, en %', html`<span class="pv-rampa pv-rampa-g"><span class="cap">0 %</span>${[5, 4, 3, 2, 1].map((i) => html`<i class="pv-r${i}"></i>`)}<span class="cap">100 %</span></span>`, 238,
          html`<span><i class="pv-m recuadro"></i>${sug ? `Sugerencia de promo: ${pluralDia(DIAS_L[sug.dl])}, ${franjaChip(sug.ini, sug.fin)}` : 'Sin sugerencia pendiente'}</span><span><i class="pv-m esquina"></i>Franja con promo activa</span>`)}
        ${lamina('servicios', 'pv-l2', 'Más vendidos', 'Servicios en 8 semanas', html`<span class="d d-26 num">${num(suma(srvLista, (x) => x.n))}</span>`, 244)}
        ${lamina('ingresos', 'pv-l2', 'Ingresos', 'Por semana cerrada', html`<span class="d d-26 num">${millones(ultCerrada.total)}</span>`, 160, ley([['l1', 'Total'], ['l3', 'App DRS']]))}
        ${lamina('clientes', 'pv-l2', 'Nuevos y recurrentes', 'Visitas de las 8 semanas', '', 182)}
        ${lamina('calif', 'pv-l2', 'Calificación', `${num(R.total)} reseñas · por semana`, html`<span class="pv-calif-g"><span class="d d-34 num">${num(Math.round(R.prom * 10) / 10)}</span><span class="d d-20">/5</span></span>`, 182)}
      </div>
    </div>`;
  }

  /* ---------------- gráficas ---------------- */
  const svg = (w, h, etiqueta, cuerpo) => `<svg class="pv-svg" viewBox="0 0 ${f1(w)} ${h}" width="${f1(w)}" height="${h}" role="img" aria-label="${U.esc(etiqueta)}">${cuerpo}</svg>`;
  const txt = (x, y, t, cls = '', anc = 'start') => `<text x="${f1(x)}" y="${f1(y)}" text-anchor="${anc}"${cls ? ` class="${cls}"` : ''}>${U.esc(t)}</text>`;

  const GRAF = {
    reservas(w, h, g) {
      const m = { l: 30, r: 4, t: 18, b: 22 };
      const pw = w - m.l - m.r, ph = h - m.t - m.b;
      const max = Math.max(10, Math.ceil(Math.max(...g.dias.map((x) => x.n)) / 10) * 10);
      const y = (v) => m.t + ph - (v / max) * ph;
      const paso = pw / g.dias.length, bw = Math.max(2, paso - 3);
      let s = '';
      for (let v = 0; v <= max; v += 10) { s += `<path d="M${m.l} ${f1(y(v))}H${f1(w - m.r)}" class="${v ? 'reja' : 'eje'}"/>` + txt(m.l - 7, y(v) + 3, String(v), '', 'end'); }
      for (let k = 0; k < g.dias.length; k += 7) {
        const x = m.l + k * paso;
        if (k) s += `<path d="M${f1(x)} ${m.t - 8}V${f1(m.t + ph)}" class="reja"/>`;
        s += txt(x + 3, h - 6, `SEM. ${k / 7 + 1} · ${U.diaMes(g.dias[k].fecha).toUpperCase()}`);
      }
      g.dias.forEach((d, i) => {
        const x = m.l + i * paso + (paso - bw) / 2;
        const tit = `<title>${U.esc(`${U.fechaLarga(d.fecha)}: ${d.n} reservas, ${d.app} por la app${d.futuro ? ' (reservadas hasta hoy)' : ''}`)}</title>`;
        if (d.futuro) { s += `<g>${tit}<rect x="${f1(x + 0.5)}" y="${f1(y(d.n) + 0.5)}" width="${f1(bw - 1)}" height="${f1(Math.max(0, y(0) - y(d.n) - 1))}" class="contorno"/></g>`; return; }
        const ya = y(d.app), yt = y(d.n);
        s += `<g class="barra">${tit}<rect x="${f1(x)}" y="${f1(ya)}" width="${f1(bw)}" height="${f1(y(0) - ya)}" class="s-app"/><rect x="${f1(x)}" y="${f1(yt)}" width="${f1(bw)}" height="${f1(ya - yt)}" class="s-propio"/></g>`;
        if (d.hoy) s += `<path d="M${f1(x + bw / 2)} ${f1(yt - 3)}V${f1(yt - 9)}" class="eje-1"/>` + txt(x + bw / 2, yt - 12, 'HOY', 't1', 'middle');
      });
      return svg(w, h, 'Reservas por día de las últimas 8 semanas', s);
    },

    calor(w, h, g) {
      const m = { l: 34, r: 2, t: 16, b: 24 };
      const F = g.franjas;
      const cw = (w - m.l - m.r) / F.horas.length, ch = (h - m.t - m.b) / 7;
      let s = '';
      F.horas.forEach((hh, j) => { s += txt(m.l + j * cw + cw / 2, m.t - 6, String(h12(hh)), '', 'middle'); });
      const cubre = new Set();
      g.promos.forEach((a) => a.diasSemana.forEach((gd) => { for (let x = U.aMin(a.ini) / 60; x < U.aMin(a.fin) / 60; x++) cubre.add(`${(gd + 6) % 7}-${x}`); }));
      F.dias.forEach((fila, i) => {
        s += txt(m.l - 8, m.t + i * ch + ch / 2 + 3, DIAS_L3[i].toUpperCase(), '', 'end');
        fila.forEach((v, j) => {
          const x = m.l + j * cw, yy = m.t + i * ch;
          if (v == null) { s += `<rect x="${f1(x + 1)}" y="${f1(yy + 1)}" width="${f1(cw - 2)}" height="${f1(ch - 2)}" class="cerrado"><title>Cerrado</title></rect>` + txt(x + cw / 2, yy + ch / 2 + 3, '—', '', 'middle'); return; }
          const r = rampa(v);
          s += `<g><title>${U.esc(`${DIAS_L[i]}, ${h12(F.horas[j])}:00 ${F.horas[j] < 12 ? 'a. m.' : 'p. m.'}: ${v} % de ocupación`)}</title><rect x="${f1(x + 1)}" y="${f1(yy + 1)}" width="${f1(cw - 2)}" height="${f1(ch - 2)}" class="r${r}"/>`
            + txt(x + cw / 2, yy + ch / 2 + 3, `${v}`, r === 5 ? 'sobre-osc' : 'sobre-clr', 'middle') + '</g>';
          if (cubre.has(`${i}-${F.horas[j]}`)) s += `<path d="M${f1(x + 3)} ${f1(yy + 9)}V${f1(yy + 3)}H${f1(x + 9)}" class="marca-promo"/>`;
        });
      });
      if (g.sug) {
        const j0 = F.horas.indexOf(g.sug.ini);
        s += `<rect x="${f1(m.l + j0 * cw - 1)}" y="${f1(m.t + g.sug.dl * ch - 1)}" width="${f1(cw * (g.sug.fin - g.sug.ini) + 2)}" height="${f1(ch + 2)}" class="sugerida"/>`;
      }
      const yb = h - m.b + 9;
      const x0 = m.l + 2, x1 = m.l + 4 * cw - 2, x2 = m.l + 4 * cw + 2, x3 = w - m.r - 2;
      s += `<path d="M${f1(x0)} ${yb - 4}V${yb}H${f1(x1)}V${yb - 4}M${f1(x2)} ${yb - 4}V${yb}H${f1(x3)}V${yb - 4}" class="eje"/>`;
      s += txt((x0 + x1) / 2, yb + 12, 'A. M.', '', 'middle') + txt((x2 + x3) / 2, yb + 12, 'P. M.', '', 'middle');
      return svg(w, h, 'Ocupación promedio por día y hora', s);
    },

    servicios(w, h, g) {
      const lista = g.servicios;
      const max = Math.max(...lista.map((x) => x.n));
      const tot = suma(lista, (x) => x.n);
      const fh = h / lista.length;
      let s = '';
      lista.forEach((it, i) => {
        const y0 = i * fh;
        s += txt(0, y0 + 13, it.nombre, 'nombre') + txt(w, y0 + 15, num(it.n), 'cifra-l', 'end');
        s += `<rect x="0" y="${f1(y0 + 21)}" width="${f1(w)}" height="10" class="pista"/><rect x="0" y="${f1(y0 + 21)}" width="${f1((w * it.n) / max)}" height="10" class="s-serie"/>`;
        s += txt(0, y0 + 43, `${Math.round((it.n / tot) * 100)} % DEL TOTAL`);
      });
      return svg(w, h, 'Servicios más vendidos', s);
    },

    ingresos(w, h, g0) {
      const g = { semanas: g0.semanas.slice(0, -1) };      // solo semanas cerradas: la actual va aparte
      const m = { l: 40, r: 10, t: 10, b: 20 };
      const pw = w - m.l - m.r, ph = h - m.t - m.b;
      const n = g.semanas.length;
      const maxM = Math.max(1, Math.ceil(Math.max(...g.semanas.map((x) => x.total)) / 1e6));
      const x = (i) => m.l + (i * pw) / (n - 1);
      const y = (v) => m.t + ph - (v / (maxM * 1e6)) * ph;
      let s = '';
      for (let v = 0; v <= maxM; v++) s += `<path d="M${m.l} ${f1(y(v * 1e6))}H${f1(w - m.r)}" class="${v ? 'reja' : 'eje'}"/>` + txt(m.l - 7, y(v * 1e6) + 3, v ? `$ ${v} M` : '0', '', 'end');
      [0, Math.floor((n - 1) / 2), n - 1].forEach((i) => { s += txt(x(i), h - 4, U.diaMes(g.semanas[i].fecha).toUpperCase(), '', i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'); });
      const linea = (k, cls) => {
        const pts = g.semanas.map((sm, i) => [x(i), y(sm[k])]);
        let t = `<path d="${pts.map((p, i) => `${i ? 'L' : 'M'}${f1(p[0])} ${f1(p[1])}`).join('')}" class="${cls}"/>`;
        pts.forEach((p, i) => { t += `<rect x="${f1(p[0] - 3)}" y="${f1(p[1] - 3)}" width="6" height="6" class="pto ${cls}"><title>${U.esc(`Semana del ${U.diaMes(g.semanas[i].fecha)}: ${pesos(g.semanas[i][k])}`)}</title></rect>`; });
        return t;
      };
      return svg(w, h, 'Ingresos por semana', s + linea('total', 'l1') + linea('app', 'l3'));
    },

    clientes(w, h, g) {
      const tot = g.nuevos + g.recurrentes;
      const p = tot ? g.nuevos / tot : 0;
      const sw = 14;
      const r = Math.max(30, Math.min(h / 2 - sw / 2 - 12, (w - 150) / 2));
      const cx = r + sw / 2 + 10, cy = h / 2;
      const C = 2 * Math.PI * r;
      let s = `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}" class="an-rec" stroke-width="${sw}"/>`;
      s += `<circle cx="${f1(cx)}" cy="${f1(cy)}" r="${f1(r)}" class="an-nue" stroke-width="${sw}" stroke-dasharray="${f1(C * p)} ${f1(C)}" transform="rotate(-90 ${f1(cx)} ${f1(cy)})"/>`;
      for (let k = 0; k < 24; k++) {
        const a = (k / 24) * 2 * Math.PI, r0 = r + sw / 2 + 3, r1 = r0 + (k % 6 === 0 ? 6 : 3);
        s += `<path d="M${f1(cx + r0 * Math.sin(a))} ${f1(cy - r0 * Math.cos(a))}L${f1(cx + r1 * Math.sin(a))} ${f1(cy - r1 * Math.cos(a))}" class="eje"/>`;
      }
      s += txt(cx, cy + 7, `${Math.round(p * 100)} %`, 'cifra-m', 'middle') + txt(cx, cy + 21, 'NUEVOS', '', 'middle');
      const lx = cx + r + sw / 2 + 22;
      s += `<rect x="${f1(lx)}" y="${f1(cy - 36)}" width="10" height="10" class="an-nue-f"/>` + txt(lx + 16, cy - 27, 'NUEVOS') + txt(lx, cy - 6, num(g.nuevos), 'cifra');
      s += `<rect x="${f1(lx)}" y="${f1(cy + 10)}" width="10" height="10" class="an-rec-f"/>` + txt(lx + 16, cy + 19, 'RECURRENTES') + txt(lx, cy + 40, num(g.recurrentes), 'cifra');
      return svg(w, h, `Clientes nuevos ${Math.round(p * 100)} %, recurrentes ${100 - Math.round(p * 100)} %`, s);
    },

    calif(w, h, g) {
      const m = { l: 30, r: 10, t: 10, b: 20 };
      const pw = w - m.l - m.r, ph = h - m.t - m.b;
      const n = g.calif.length;
      const y = (v) => m.t + ph - ((v - 4) / 1) * ph;
      const x = (i) => m.l + (i * pw) / n;
      let s = '';
      [4, 4.5, 5].forEach((v) => { s += `<path d="M${m.l} ${f1(y(v))}H${f1(w - m.r)}" class="${v === 4 ? 'eje' : 'reja'}"/>` + txt(m.l - 7, y(v) + 3, num(v), '', 'end'); });
      let d = '';
      g.calif.forEach((v, i) => { d += `${i ? `V${f1(y(v))}` : `M${f1(x(0))} ${f1(y(v))}`}H${f1(x(i + 1))}`; });
      s += `<path d="${d}" class="escalon"/>`;
      g.calif.forEach((v, i) => { s += `<rect x="${f1(x(i) + pw / n / 2 - 2)}" y="${f1(y(v) - 2)}" width="4" height="4" class="pto-e"><title>${U.esc(`Semana ${i + 1}: ${num(v)} /5`)}</title></rect>`; });
      s += txt(x(0), h - 4, 'SEM. 1') + txt(x(n), h - 4, 'HOY', 't1', 'end');
      s += `<path d="M${f1(x(n))} ${m.t}V${f1(m.t + ph)}" class="lector"/>`;
      return svg(w, h, 'Calificación promedio por semana', s);
    },
  };

  function dibujarGraficas(el) {
    if (!graficas) return;
    el.querySelectorAll('[data-graf]').forEach((cont) => {
      const fn = GRAF[cont.dataset.graf];
      const w = cont.clientWidth;
      if (fn && w > 40) cont.innerHTML = fn(w, cont.clientHeight, graficas);
    });
  }

  /* =====================================================================================
     FORMULARIOS: cliente propio y nueva promoción
  ===================================================================================== */
  function franjasLibres(c, bahia, min) {
    const ocup = DRS.q.agenda(c.id).filter((r) => r.bahia === bahia).map((r) => [U.aMin(r.hora), U.aMin(r.hora) + r.min]);
    datos(c).bloqueos.filter((x) => x.d === 0 && x.b === bahia).forEach((x) => ocup.push([U.aMin(x.ini), U.aMin(x.ini) + 30]));
    const actual = Math.floor(ahoraMin() / 30) * 30;
    const out = [];
    for (let t = HORA_INI; t + min <= HORA_FIN; t += 30) out.push({ hora: U.deMin(t), libre: !ocup.some(([a, z]) => solapa(t, t + min, a, z)), pasada: t < actual });
    return out;
  }

  function abrirClientePropio(desde) {
    const c = comercio();
    const srv = srvDe('sencillo');
    let mejor = { b: 1, t: 9999 };
    for (let b = 1; b <= c.bahias; b++) {
      const libre = franjasLibres(c, b, srv.min).find((x) => x.libre && !x.pasada);
      if (libre && U.aMin(libre.hora) < mejor.t) mejor = { b, t: U.aMin(libre.hora) };
    }
    abrirCapa('cliente', { nombre: '', placa: '', tipo: 'automovil', servicio: 'sencillo', bahia: mejor.b, hora: null, conocido: null }, desde);
  }

  function formCliente() {
    const c = comercio();
    const f = capa.f;
    const srvs = S().servicios.filter((s) => s.precio[f.tipo]);
    if (!srvs.find((s) => s.id === f.servicio)) f.servicio = srvs[0].id;
    const srv = srvDe(f.servicio);
    const slots = franjasLibres(c, f.bahia, srv.min);
    if (!f.hora || !slots.find((x) => x.hora === f.hora && x.libre)) f.hora = (slots.find((x) => x.libre && !x.pasada) || slots.find((x) => x.libre) || {}).hora || null;
    const conocido = f.conocido ? clientePorPlaca(c, f.conocido) : null;
    const chips = (lista) => lista.map((x) => html`<button class="pv-hora${x.pasada ? ' pasada' : ''}" role="radio" aria-checked="${x.hora === f.hora ? 'true' : 'false'}" data-a="pl-cp" data-k="hora" data-v="${x.hora}" ${crudo(x.libre ? '' : 'disabled')} aria-label="${U.horaTxt(x.hora)}${x.libre ? '' : ', ocupada'}">${U.horaTxt(x.hora).replace(/ [ap]\. m\./, '')}</button>`);
    const man = slots.filter((x) => U.aMin(x.hora) < 12 * 60), tar = slots.filter((x) => U.aMin(x.hora) >= 12 * 60);
    return html`<div class="pv-dlg-cab">
        <div><div class="ceja">Agenda de hoy · ${U.fechaLarga(DRS.reloj.hoy())}</div><h2 class="d d-34">Cliente propio</h2><p class="t13">Para quien llega sin la app. Queda en tu agenda y en tu CRM, y no paga comisión.</p></div>
        <button class="hoja-cerrar" data-a="pl-capa-cerrar" aria-label="Cerrar">${ico('cerrar')}</button>
      </div>
      <div class="pv-dlg-cuerpo">
        <div class="pv-dlg-col">
          <div class="pv-campos-2">
            <div class="campo"><label class="cap" for="cp-nombre">Nombre</label><input id="cp-nombre" name="nombre" autocomplete="off" value="${f.nombre}" placeholder="Ej.: Laura M."></div>
            <div class="campo"><label class="cap" for="cp-placa">Placa</label><input id="cp-placa" name="placa" autocomplete="off" value="${f.placa}" placeholder="ABC 123" maxlength="8" class="pv-in-placa"></div>
          </div>
          ${conocido ? html`<p class="pv-ok">${ico('check', 's16')}Ya es tu cliente: ${conocido.nombre}${conocido.vehiculo ? ` · ${conocido.vehiculo}` : ''} · ${conocido.n} ${conocido.n === 1 ? 'visita' : 'visitas'}.</p>` : ''}
          <div class="campo"><span class="cap">Tipo de vehículo</span>
            <div class="pv-seg pv-seg-g" role="radiogroup" aria-label="Tipo de vehículo">${TIPOS.map(([k, n]) => html`<button role="radio" aria-checked="${f.tipo === k ? 'true' : 'false'}" data-a="pl-cp" data-k="tipo" data-v="${k}">${ico(k === 'moto' ? 'moto' : 'carro', 's16')}${n}</button>`)}</div></div>
          <div class="campo"><span class="cap">Servicio</span>
            <div role="radiogroup" aria-label="Servicio">${srvs.map((s) => html`<button class="opcion pv-op" role="radio" aria-checked="${s.id === f.servicio ? 'true' : 'false'}" data-a="pl-cp" data-k="servicio" data-v="${s.id}">
              <span><span class="t13 t-1">${s.nombre}</span><span class="t11"> · ${s.min} min</span></span><span class="d d-20 num">${pesos(s.precio[f.tipo])}</span><span class="radio"></span></button>`)}</div></div>
        </div>
        <div class="pv-dlg-col">
          <div class="campo"><span class="cap">Bahía</span>
            <div class="pv-seg pv-seg-g" role="radiogroup" aria-label="Bahía">${Array.from({ length: c.bahias }, (_, i) => html`<button role="radio" aria-checked="${f.bahia === i + 1 ? 'true' : 'false'}" data-a="pl-cp" data-k="bahia" data-v="${i + 1}">Bahía ${i + 1}</button>`)}</div></div>
          <div class="campo"><span class="cap">Hora · franjas libres de la bahía ${f.bahia}</span>
            <div class="pv-horas" role="radiogroup" aria-label="Hora"><span class="cap">a. m.</span><div>${chips(man)}</div><span class="cap">p. m.</span><div>${chips(tar)}</div></div>
            ${slots.some((x) => x.libre && !x.pasada) ? '' : html`<p class="t11 pv-horas-nota">${ico('informacion', 's16')}Por hoy ya no quedan franjas en esta bahía. Puedes registrar un servicio que ya hiciste o probar otra bahía.</p>`}</div>
          <dl class="datos pv-resumen">
            <dt>Servicio</dt><dd>${srv.nombre} · ${srv.min} min</dd>
            <dt>Hora</dt><dd>${f.hora ? `${U.horaTxt(f.hora)} · bahía ${f.bahia}` : 'Sin franja libre'}</dd>
            <dt>Cobras en el local</dt><dd><span class="d d-26 num">${pesos(srv.precio[f.tipo])}</span></dd>
            <dt>Comisión DRS</dt><dd>$ 0 · cliente propio</dd>
          </dl>
          ${capa.error ? html`<p class="pv-error" role="alert">${ico('excl')}${capa.error}</p>` : ''}
          <button class="btn btn-luz" data-a="pl-cp-guardar" ${crudo(f.hora ? '' : 'disabled')}>${ico('mas')}Agregar a la agenda</button>
        </div>
      </div>`;
  }

  function guardarClientePropio() {
    const c = comercio();
    const f = capa.f;
    const nombre = String(f.nombre || '').trim().replace(/\s+/g, ' ');
    const placa = normPlaca(f.placa);
    if (nombre.length < 2) return errorCapa('Escribe el nombre del cliente.');
    if (!esPlaca(placa)) return errorCapa('Revisa la placa: tres letras y tres números para carro, o tres letras, dos números y una letra para moto.');
    const srv = srvDe(f.servicio);
    if (!srv || !srv.precio[f.tipo]) return errorCapa('Ese servicio no aplica para este tipo de vehículo.');
    if (!f.hora || !franjasLibres(c, f.bahia, srv.min).find((x) => x.hora === f.hora && x.libre)) return errorCapa('Elige una hora libre en esa bahía.');
    const ini = U.aMin(f.hora), fin = ini + srv.min, ahora = ahoraMin(), h = horaAhora();
    const estado = fin <= ahora ? 'finalizada' : ini <= ahora ? 'recibido' : 'confirmada';
    const historial = [{ estado: 'confirmada', d: 0, h }];
    if (estado !== 'confirmada') historial.push({ estado: 'recibido', d: 0, h: estado === 'finalizada' ? f.hora : h });
    if (estado === 'finalizada') historial.push({ estado: 'en_proceso', d: 0, h: f.hora }, { estado: 'listo', d: 0, h: U.deMin(fin) }, { estado: 'finalizada', d: 0, h });
    const ids = new Set(S().reservas.map((r) => r.id));
    let n = 5100;                                  // fuera del rango que usa la reserva desde la app (4800–4989)
    do { n += 7; } while (ids.has(`DRS-${n}`));
    const r = {
      id: `DRS-${n}`, comercio: c.id, bahia: f.bahia, d: 0, hora: f.hora, min: srv.min, servicio: srv.nombre, extras: [], cliente: nombre, placa, tipoVeh: f.tipo,
      origen: 'propio', valor: srv.precio[f.tipo], descuento: 0, total: srv.precio[f.tipo], medio: 'En el local', estado, usuario: null, historial,
    };
    const desde = capa.desde;
    cerrarCapa();
    if (desde === 'hoy') { DRS.panel.sel = r.id; DRS.panel.llega = r.id; }
    ui.cliente = placa;
    ui.filtroCli = 'todos';
    ui.verSel = true;
    DRS.cambiar((s) => { s.reservas.push(r); }, { tipo: 'cliente-propio', id: r.id });
    tostada(`${placaTxt(placa)} quedó en la agenda de hoy: ${U.horaTxt(f.hora)}, bahía ${f.bahia}. Sin comisión.`);
  }

  function abrirPromo(origen) {
    const sug = origen === 'sugerencia' ? sugerencia(comercio()) : null;
    const f = sug
      ? { servicio: 'sencillo', dias: [sug.g], ini: sug.ini, fin: sug.fin, pct: 20, semanas: 4, cupos: 12, origen }
      : { servicio: 'sencillo', dias: [2, 3], ini: 14, fin: 16, pct: 15, semanas: 4, cupos: 12, origen: 'manual' };
    abrirCapa('promo', f, 'promos');
  }

  function formPromo() {
    const c = comercio();
    const f = capa.f;
    const srv = srvDe(f.servicio);
    const base = srv.precio.automovil || srv.precio.moto;
    const precio = Math.round((base * (100 - f.pct)) / 100 / 100) * 100;
    const p = { pct: f.pct, servicio: f.servicio, dias: f.dias.length ? diasTexto(f.dias) : '—', franja: franjaTexto(f.ini, f.fin), chip: franjaChip(f.ini, f.fin), cupos: f.cupos, hasta: f.semanas * 7, desde: 0 };
    const opc = (k, pares, fmt) => html`<div class="pv-seg pv-seg-g" role="radiogroup">${pares.map((v) => html`<button role="radio" aria-checked="${f[k] === v ? 'true' : 'false'}" data-a="pl-pf" data-k="${k}" data-v="${v}">${fmt(v)}</button>`)}</div>`;
    const horas = (k, desde, hasta) => {
      const lista = Array.from({ length: hasta - desde + 1 }, (_, i) => desde + i);
      const am = lista.filter((x) => x < 12).length;
      return html`<div class="pv-horas-f" role="radiogroup">${lista.map((hh) => html`<button role="radio" class="pv-hora" aria-checked="${f[k] === hh ? 'true' : 'false'}" data-a="pl-pf" data-k="${k}" data-v="${hh}" ${crudo(k === 'fin' && hh <= f.ini ? 'disabled' : '')} aria-label="${h12(hh)}:00 ${hh < 12 ? 'a. m.' : 'p. m.'}">${h12(hh)}</button>`)}</div>
        <div class="pv-ampm" style="grid-template-columns:${am}fr ${lista.length - am}fr"><span>a. m.</span><span>p. m.</span></div>`;
    };
    return html`<div class="pv-dlg-cab">
        <div><div class="ceja">${f.origen === 'sugerencia' ? 'Desde la sugerencia automática' : 'Horas valle'}</div><h2 class="d d-34">Nueva promoción</h2><p class="t13">Aparece en la app de los usuarios cercanos con sus condiciones completas.</p></div>
        <button class="hoja-cerrar" data-a="pl-capa-cerrar" aria-label="Cerrar">${ico('cerrar')}</button>
      </div>
      <div class="pv-dlg-cuerpo">
        <div class="pv-dlg-col">
          <div class="campo"><span class="cap">Servicio</span>
            <div role="radiogroup" aria-label="Servicio">${S().servicios.map((s) => html`<button class="opcion pv-op" role="radio" aria-checked="${s.id === f.servicio ? 'true' : 'false'}" data-a="pl-pf" data-k="servicio" data-v="${s.id}"><span class="t13 t-1">${s.nombre}</span><span class="t11 num">desde ${pesos(Math.min(...Object.values(s.precio)))}</span><span class="radio"></span></button>`)}</div></div>
          <div class="campo"><span class="cap">Días</span>
            <div class="pv-dias" role="group" aria-label="Días">${ORDEN_SEM.map((g) => html`<button aria-pressed="${f.dias.includes(g) ? 'true' : 'false'}" data-a="pl-pf" data-k="dias" data-v="${g}" aria-label="${U.DIAS[g]}">${U.DIAS[g].slice(0, 3)}</button>`)}</div></div>
          <div class="campo"><span class="cap">Desde · hora de inicio</span>${horas('ini', 8, 17)}</div>
          <div class="campo"><span class="cap">Hasta · hora de cierre</span>${horas('fin', 9, 18)}</div>
        </div>
        <div class="pv-dlg-col">
          <div class="campo"><span class="cap">Descuento</span>${opc('pct', [10, 15, 20, 25, 30], (v) => `${v} %`)}</div>
          <div class="campo"><span class="cap">Vigencia</span>${opc('semanas', [2, 4, 8], (v) => `${v} semanas`)}</div>
          <div class="campo"><span class="cap">Cupos por semana</span>${opc('cupos', [8, 12, 20, 30], (v) => String(v))}</div>
          <div class="pv-vista-app">
            <span class="cap">Así la ven en la app</span>
            <div class="tarjeta promo pv-promo-app">
              <span class="promo-plano" style="display:block">${crudo(DRS.bp.bahias({ n: c.bahias, ocupadas: c.ocupadas, ancho: 230 }))}<span class="chip chip-lleno">−${f.pct} % · ${p.chip}</span></span>
              <span class="promo-info" style="display:block">
                <span class="d d-20" style="display:block">${c.nombre}</span>
                <span class="t11" style="display:block">${c.zona} · ${num(c.km)} km · <span class="calif"><b>${num(c.calif)}</b><i>/5</i></span></span>
                <span class="precio"><span class="d d-20 num">${pesos(precio)}</span><span class="t11 tachado num">${pesos(base)}</span></span>
                <span class="cap" style="display:block;margin-top:4px">${srv.nombre}</span>
              </span>
            </div>
            <p class="pv-cond-box"><span class="cap">Condiciones visibles · Ley 1480 de 2011, art. 33</span>${f.dias.length ? condiciones(p, false) : 'Elige al menos un día.'}</p>
          </div>
          ${capa.error ? html`<p class="pv-error" role="alert">${ico('excl')}${capa.error}</p>` : ''}
          <button class="btn btn-luz" data-a="pl-promo-publicar" ${crudo(f.dias.length && f.fin > f.ini ? '' : 'disabled')}>${ico('precio')}Publicar promoción</button>
        </div>
      </div>`;
  }

  function publicarPromo() {
    const c = comercio();
    const f = capa.f;
    if (!f.dias.length) return errorCapa('Elige al menos un día.');
    if (f.fin <= f.ini) return errorCapa('La hora de cierre debe ser después de la de inicio.');
    const srv = srvDe(f.servicio);
    const p = {
      id: `pr${Date.now().toString(36)}`, pct: f.pct, servicio: f.servicio,
      dias: diasTexto(f.dias), franja: franjaTexto(f.ini, f.fin), chip: franjaChip(f.ini, f.fin), cupos: f.cupos, hasta: f.semanas * 7,
      diasSemana: ORDEN_SEM.filter((g) => f.dias.includes(g)), ini: U.deMin(f.ini * 60), fin: U.deMin(f.fin * 60),
      desde: 0, usados: 0, creada: { d: 0, h: horaAhora() }, origen: f.origen, estado: 'activa',
    };
    const aviso = {
      id: `n${Date.now()}`, d: 0, h: horaAhora(), ico: 'precio', canal: 'app', leida: false,
      titulo: `Promo cerca: −${p.pct} % en ${c.nombre}`, texto: `${srv.nombre} ${p.dias}, ${p.franja}`,
      ...(DRS.pantallas && DRS.pantallas.comercio ? { ir: { ruta: 'comercio', p: { id: c.id } } } : { proxima: 'lavaderos' }), accion: 'Ver promo',
    };
    cerrarCapa();
    ui.promoNueva = p.id;
    DRS.cambiar((s) => {
      const com = s.comercios.find((x) => x.id === c.id);
      (com.promos = com.promos || []).push(p);
      s.notificaciones.unshift(aviso);
    }, { tipo: 'promo', id: p.id });
    DRS.emitir('aviso', { notif: aviso, puntos: 0 });
    tostada('Promoción publicada. Ya aparece en la app de los usuarios cercanos.');
  }

  /* =====================================================================================
     ACCIONES
  ===================================================================================== */
  const repintar = () => DRS.panel.render();

  Object.assign(DRS.acciones, {
    'pl-cliente-propio': (d) => abrirClientePropio(d.desde || 'hoy'),
    'pl-capa-cerrar': () => cerrarCapa(),
    'pl-cp': (d) => {
      if (!capa) return;
      const v = d.k === 'bahia' ? Number(d.v) : d.v;
      capa.f[d.k] = v;
      capa.error = '';
      pintarCapa();
    },
    'pl-cp-guardar': () => { if (capa) guardarClientePropio(); },

    /* agenda */
    'pl-ag-semana': (d) => { ui.semana = Number(d.v) || 0; repintar(); },
    'pl-ag-bloq': (d) => {
      const c = comercio();
      const dd = Number(d.d), b = Number(d.b);
      const pd = datos(c);
      const i = pd.bloqueos.findIndex((x) => x.d === dd && x.b === b && x.ini === d.ini);
      const lbl = `${U.fechaLarga(DRS.reloj.dia(dd))}, ${U.horaTxt(d.ini)} a ${U.horaTxt(U.deMin(U.aMin(d.ini) + 30))}, bahía ${b}`;
      DRS.cambiar((s) => {
        const lista = s.panelDatos[c.id].bloqueos;
        if (i >= 0) lista.splice(i, 1); else lista.push({ d: dd, b, ini: d.ini });
      }, { tipo: 'bloqueo' });
      tostada(i >= 0 ? `Franja liberada: ${lbl}. La app vuelve a ofrecerla.` : `Franja bloqueada: ${lbl}. La app no la ofrece.`, i >= 0 ? 'check' : 'horario');
    },
    'pl-ag-res': (d) => { DRS.panel.sel = d.id; DRS.panel.llega = null; DRS.panel.ir('hoy'); },

    /* clientes */
    'pl-cli-filtro': (d) => { ui.filtroCli = d.v; ui.cliente = null; repintar(); },
    'pl-cli-sel': (d) => { if (ui.cliente === d.placa) return; ui.cliente = d.placa; repintar(); },
    'pl-cli-nota': (d) => {
      const c = comercio();
      const t = document.getElementById('pv-nota');
      const texto = t ? t.value.trim() : '';
      soltarBorradores(`nota:${d.placa}`);
      DRS.cambiar((s) => { const pd = s.panelDatos[c.id]; if (texto) pd.notas[d.placa] = texto; else delete pd.notas[d.placa]; }, { tipo: 'nota' });
      tostada('Nota guardada. La ve todo tu equipo.');
    },
    'pl-cli-promo': (d) => {
      const c = comercio();
      const cl = clientePorPlaca(c, d.placa);
      if (!cl) return;
      const act = promosActivas(c);
      const a = act[act.length - 1];
      if (!a) { tostada('Primero crea una promoción.', 'informacion'); DRS.panel.ir('promos'); return; }
      const h = horaAhora();
      let aviso = null;
      DRS.cambiar((s) => {
        s.panelDatos[c.id].envios[cl.placa] = { d: 0, h, promo: a.p.id || 'base' };
        if (cl.usuario === 'u1') {
          aviso = { id: `n${Date.now()}`, d: 0, h, ico: 'precio', canal: 'app', leida: false, titulo: `${c.nombre} te envió una promo`, texto: punto(promoCorta(a.p)),
            ...(DRS.pantallas && DRS.pantallas.comercio ? { ir: { ruta: 'comercio', p: { id: c.id } } } : { proxima: 'lavaderos' }), accion: 'Ver promo' };
          s.notificaciones.unshift(aviso);
        }
      }, { tipo: 'promo-enviada' });
      if (aviso) DRS.emitir('aviso', { notif: aviso, puntos: 0 });
      tostada(`Promo enviada a ${cl.nombre}: ${punto(promoCorta(a.p))}`, 'enviar');
    },

    /* servicios */
    'pl-srv-editar': (d) => { ui.editando = d.k; ui.errorEd = ''; ui.enfocar = true; soltarBorradores(d.k); repintar(); },
    'pl-srv-cancelar': () => { if (ui.editando) soltarBorradores(ui.editando); ui.editando = null; ui.errorEd = ''; repintar(); },
    'pl-srv-guardar': (d) => {
      const fila = document.querySelector(`[data-fila="${d.k}"]`);
      if (!fila) return;
      const val = (n) => { const x = fila.querySelector(`[name="${n}"]`); return x ? x.value.replace(/\D/g, '') : ''; };
      const [tipo, id] = d.k.split(':');
      let cambios;
      if (tipo === 'srv') {
        const min = Number(val('min'));
        if (!min || min < 15 || min > 480) { ui.errorEd = 'La duración va de 15 a 480 minutos.'; return repintar(); }
        const precio = {};
        for (const [k] of TIPOS) {
          const v = val(k);
          if (!v) continue;
          const n = Number(v);
          if (n < 5000 || n > 1000000) { ui.errorEd = 'Cada precio va de $ 5.000 a $ 1.000.000. Deja vacío lo que no ofreces.'; return repintar(); }
          precio[k] = Math.round(n / 100) * 100;
        }
        if (!Object.keys(precio).length) { ui.errorEd = 'Escribe al menos un precio.'; return repintar(); }
        cambios = (s) => { const x = s.servicios.find((y) => y.id === id); x.min = Math.round(min / 5) * 5; x.precio = precio; };
      } else {
        const n = Number(val('precio'));
        if (n < 1000 || n > 200000) { ui.errorEd = 'El precio del extra va de $ 1.000 a $ 200.000.'; return repintar(); }
        cambios = (s) => { s.extras.find((y) => y.id === id).precio = Math.round(n / 100) * 100; };
      }
      const nombre = tipo === 'srv' ? srvDe(id).nombre : S().extras.find((y) => y.id === id).nombre;
      soltarBorradores(d.k);
      ui.editando = null;
      ui.errorEd = '';
      DRS.cambiar(cambios, { tipo: 'precios', id });
      tostada(`${nombre}: precios actualizados. Ya se ven así en la app.`);
    },

    /* promociones */
    'pl-promo-sugerida': () => abrirPromo('sugerencia'),
    'pl-promo-nueva': () => abrirPromo('manual'),
    'pl-pf': (d) => {
      if (!capa) return;
      const f = capa.f;
      if (d.k === 'dias') { const g = Number(d.v); f.dias = f.dias.includes(g) ? f.dias.filter((x) => x !== g) : f.dias.concat(g); }
      else if (d.k === 'servicio') f.servicio = d.v;
      else f[d.k] = Number(d.v);
      if (d.k === 'ini' && f.fin <= f.ini) f.fin = Math.min(18, f.ini + 2);
      capa.error = '';
      pintarCapa();
    },
    'pl-promo-publicar': () => { if (capa) publicarPromo(); },

    /* pagos */
    'pl-pag-extracto': () => tostada('Extracto de la semana descargado (simulado).', 'descargar'),

    /* reseñas */
    'pl-res-filtro': (d) => { ui.filtroRes = d.v; repintar(); },
    'pl-res-responder': (d) => { ui.respondiendo = d.id; ui.errorResp = ''; ui.enfocar = true; repintar(); },
    'pl-res-cancelar': () => { if (ui.respondiendo) soltarBorradores(`resp:${ui.respondiendo}`); ui.respondiendo = null; ui.errorResp = ''; repintar(); },
    'pl-res-publicar': (d) => {
      const c = comercio();
      const t = document.getElementById('pv-resp');
      const texto = t ? t.value.trim() : '';
      if (texto.length < 8) { ui.errorResp = 'Escribe una respuesta un poco más completa.'; ui.borradores[`resp:${d.id}`] = t ? t.value : ''; return repintar(); }
      soltarBorradores(`resp:${d.id}`);
      ui.respondiendo = null;
      ui.errorResp = '';
      DRS.cambiar((s) => { s.panelDatos[c.id].respuestas[d.id] = { texto, d: 0, h: horaAhora() }; }, { tipo: 'respuesta', id: d.id });
      tostada('Respuesta publicada. La ven todos en tu perfil de la app.');
    },
  });

  /* =====================================================================================
     REGISTRO DE LAS VISTAS
  ===================================================================================== */
  function montarBusqueda(el) {
    const inp = el.querySelector('#pv-buscar');
    if (!inp) return;
    const filtrar = () => {
      ui.busqueda = inp.value;
      const q = sinTildes(inp.value.trim()).replace(/\s+/g, ' ');
      const qp = normPlaca(inp.value);
      let vis = 0;
      el.querySelectorAll('.pv-tabla tbody tr').forEach((tr) => {
        const ok = !q || tr.dataset.buscar.includes(q) || (qp.length >= 2 && tr.dataset.buscar.includes(qp.toLowerCase()));
        tr.hidden = !ok;
        if (ok) vis++;
      });
      const v = el.querySelector('.pv-vacia');
      if (v) v.hidden = vis > 0;
    };
    inp.addEventListener('input', filtrar);
    if (ui.busqueda) filtrar();
  }

  function montarPrecios(el) {
    const fila = el.querySelector('tr.editando');
    if (!fila) return;
    const com = datos(comercio()).plan.comision;
    fila.addEventListener('input', (ev) => {
      const t = ev.target;
      const n = fila.querySelector(`[data-neto="${t.name}"]`);
      if (!n) return;
      const v = Number(t.value.replace(/\D/g, ''));
      n.textContent = v >= 1000 ? `Recibes ${pesos(Math.round((v * (1 - com)) / 100) * 100)}` : '';
    });
    fila.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') { ev.preventDefault(); const b = fila.querySelector('[data-a="pl-srv-guardar"]'); if (b) b.click(); }
      if (ev.key === 'Escape') { ev.preventDefault(); DRS.acciones['pl-srv-cancelar'](); }
    });
    if (ui.enfocar) { ui.enfocar = false; const x = fila.querySelector('input'); if (x) { x.focus(); x.select(); } }
  }

  const V = DRS.panelVistas;
  V.agenda = { render: (c) => vistaAgenda(c), alMontar: (el) => restaurar(el) };
  V.clientes = {
    render: (c) => vistaClientes(c),
    alMontar: (el) => {
      restaurar(el);
      montarBusqueda(el);
      if (!ui.verSel) return;
      ui.verSel = false;
      const cont = el.querySelector('[data-scroll="tabla"]');
      const fila = cont && cont.querySelector('tr[aria-selected="true"]');
      if (!fila) return;
      const top = fila.closest('table').offsetTop + fila.offsetTop;
      if (top < cont.scrollTop + 44 || top + fila.offsetHeight > cont.scrollTop + cont.clientHeight) cont.scrollTop = Math.max(0, top - cont.clientHeight / 2);
    },
  };
  V.servicios = { render: (c) => vistaServicios(c), alMontar: (el) => { restaurar(el); montarPrecios(el); } };
  V.promos = { render: (c) => vistaPromos(c), alMontar: (el) => { restaurar(el); if (ui.promoNueva) { const n = el.querySelector('.pv-promo.nueva'); if (n) setTimeout(() => { ui.promoNueva = null; }, 4000); } } };
  V.pagos = { render: (c) => vistaPagos(c), alMontar: (el) => restaurar(el) };
  V.resenas = {
    render: (c) => vistaResenas(c),
    alMontar: (el) => {
      restaurar(el);
      const t = el.querySelector('#pv-resp');
      if (t && ui.enfocar) { ui.enfocar = false; t.focus(); t.setSelectionRange(t.value.length, t.value.length); }
    },
  };
  V.metricas = {
    render: (c) => vistaMetricas(c),
    alMontar: (el) => {
      restaurar(el);
      dibujarGraficas(el);
      if (observador) observador.disconnect();
      if (window.ResizeObserver) {
        const cont = el.querySelector('.pv-tablero');
        let w0 = cont ? cont.clientWidth : 0;
        observador = new ResizeObserver(() => {
          if (!cont || !cont.isConnected) { observador.disconnect(); return; }
          if (Math.abs(cont.clientWidth - w0) > 4) { w0 = cont.clientWidth; dibujarGraficas(el); }
        });
        if (cont) observador.observe(cont);
      }
    },
  };

  DRS.en('reinicio', () => { ui = UI0(); cerrarCapa(); });
  document.addEventListener('keydown', (ev) => { if (ev.key === 'Escape' && capa) { ev.preventDefault(); cerrarCapa(); } });

  /** ¿Está libre una franja del comercio? Cuenta reservas reales, las de ejemplo de la agenda y los bloqueos.
      Sirve al flujo de reserva del usuario para no ofrecer lo que el lavadero ya cerró. */
  function franjaLibre(idComercio, d, bahia, hora, min = 30) {
    const c = DRS.q.comercio(idComercio);
    if (!c) return true;
    const a = U.aMin(hora), z = a + min;
    const ocupado = bloquesDia(c, d).some((x) => x.b === bahia && solapa(a, z, U.aMin(x.ini), U.aMin(x.ini) + x.min));
    const cerrado = datos(c).bloqueos.some((x) => x.d === d && x.b === bahia && solapa(a, z, U.aMin(x.ini), U.aMin(x.ini) + 30));
    return !ocupado && !cerrado;
  }

  /** Para otros módulos (p. ej. el modo guiado o la reserva desde la app). */
  DRS.panelMas = { tostada, abrirClientePropio, abrirPromo, franjaLibre, sugerencia: () => sugerencia(comercio()) };
})();
