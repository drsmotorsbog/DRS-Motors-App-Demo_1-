/* DRS Motors · Demo 3 · «Mapa» — Bogotá es la app (patrón R5 / Uber)
   El mapa de la ciudad es la pantalla principal. Arriba: el logo (opciones de la demo), la placa
   activa, el perfil, el buscador «¿Qué necesita tu carro?» y fichas por servicio. Las fichas con
   lugar físico (Todo, Lavar, Taller, Tecno) cambian los pines con precio; las demás (SOAT, Trámites,
   Informe, Catálogo) abren su flujo. Abajo, una hoja que sube y baja con el dedo o con un toque:
   plegada muestra el estado del carro en una línea (SOAT, tecno, pico y placa de hoy) y la reserva
   activa; subida, los lugares de la ficha y los accesos (garaje, reservas, beneficios, avisos).
   Sin barra inferior. Las pantallas de servicio son las comunes (js/usuario/).

   Rutas propias: v3-bienvenida (el mapa con «usar mi ubicación» antes de crear cuenta o entrar),
   v3-inicio (el mapa) y v3-buscar (servicios, lugares y zonas de Bogotá).
   Estado de la vista: DRS.tel.ui.v3 (mapa) y DRS.tel.ui.v3bv (bienvenida); se reinician con la demo.
   El mapa se conserva entre repintados: mientras no cambien los pines, se vuelve a colgar el mismo
   nodo, así no parpadea y guarda su encuadre. Contrato de una demo: cabecera de js/variantes/v1.js. */
(function () {
  'use strict';
  const DRS = window.DRS;
  const U = DRS.util;
  const UI = DRS.ui;
  const { html, crudo, ico, num, pesos, placaTxt } = U;
  DRS.variantes = DRS.variantes || {};

  /* ================================================================ datos de la vista */
  const TIPO = {
    lavadero: { uno: 'Lavadero', varios: 'Lavaderos', ico: 'detailing', aria: 'lavadero' },
    taller: { uno: 'Taller', varios: 'Talleres', ico: 'taller', aria: 'taller' },
    cda: { uno: 'CDA', varios: 'Tecnomecánica', ico: 'certificado', aria: 'centro de diagnóstico' },
  };
  /** Fichas con lugar en el mapa: cambian los pines. */
  const LUGAR = [
    { cat: 'todo', t: 'Todo', ico: 'mapa' },
    { cat: 'lavadero', t: 'Lavar', ico: 'detailing' },
    { cat: 'taller', t: 'Taller', ico: 'taller' },
    { cat: 'cda', t: 'Tecno', ico: 'certificado' },
  ];
  /** Fichas sin lugar físico: abren su flujo encima del mapa. */
  const FLUJO = [
    { t: 'SOAT', ico: 'garantia', attrs: () => `data-a="soat-iniciar" data-v="${DRS.estado.vehiculoActivo}"` },
    { t: 'Trámites', ico: 'traspaso', attrs: () => UI.servAttrs('tramites') },
    { t: 'Informe', ico: 'peritaje', attrs: () => UI.servAttrs('informe') },
    { t: 'Catálogo', ico: 'llave', attrs: () => UI.servAttrs('catalogo') },
  ];
  const CERCA_KM = 5;
  const UKM = 100;   // unidades del mapa por kilómetro (js/mapa.js: 10 por cuadra de 100 m)

  const st = () => (DRS.tel.ui.v3 = DRS.tel.ui.v3 || {
    cat: 'todo', sel: null, orden: 'cerca', promo: false, hoja: 'plegada',
    vista: null, encuadrar: true, pend: null, mapa: null, h: null, entrada: true, chipsX: 0, cuerpoY: 0,
  });
  const stBv = () => (DRS.tel.ui.v3bv = DRS.tel.ui.v3bv || { paso: 'inicio', hechos: 0, mapa: null, m: null, turno: 0, sel: null });
  const tope = () => DRS.tel.pila[DRS.tel.pila.length - 1];
  const enTope = (ruta) => { const t = tope(); return !!t && t.ruta === ruta; };
  const suCarro = (v) => (v.tipo === 'moto' ? 'tu moto' : 'tu carro');
  const norm = (s) => String(s).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

  /* ================================================================ lugares y precios */
  function lugares(cat, promo) {
    const v = DRS.q.vehiculo();
    let ls = DRS.estado.comercios.filter((c) => cat === 'todo' || c.tipo === cat).map((c) => ({ c, p: DRS.explorar.precioDesde(c, v) }));
    if (promo && cat === 'lavadero') ls = ls.filter((x) => x.p.promo);
    return ls.sort((a, b) => a.c.km - b.c.km);
  }
  const ORDEN = {
    cerca: (a, b) => a.c.km - b.c.km,
    precio: (a, b) => a.p.valor - b.p.valor || a.c.km - b.c.km,
    calif: (a, b) => b.c.calif - a.c.calif || a.c.km - b.c.km,
  };
  // El pin muestra el precio, como en R5; el nombre y la distancia van en la tarjeta.
  const etqPin = (x) => `$${Math.round(x.p.valor / 1000)}k`;
  const minimo = (ls) => (ls.length ? Math.min(...ls.map((x) => x.p.valor)) : 0);

  /* ================================================================ geometría del mapa */
  /** Vista { s, tx, ty } que encuadra las posiciones dentro de la franja libre, y su centro para enfocar().
      Los márgenes son de pantalla: dejan sitio a la etiqueta del pin (arriba y a los lados) y a «Casa» (abajo). */
  const MARGEN = { lado: 58, arriba: 52, abajo: 34 };
  function encuadre(poses, caja) {
    const xy = poses.map((p) => DRS.mapa.pt(p[0], p[1]));
    const xs = xy.map((a) => a[0]), ys = xy.map((a) => a[1]);
    const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
    const y0px = caja.arriba + MARGEN.arriba, y1px = Math.max(y0px + 60, caja.h - caja.abajo - MARGEN.abajo);
    const s = Math.max(0.3, Math.min((caja.w - 2 * MARGEN.lado) / Math.max(UKM * 0.5, x1 - x0), (y1px - y0px) / Math.max(UKM * 0.5, y1 - y0), caja.w / (0.9 * UKM)));
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
    const cyPx = (y0px + y1px) / 2;
    return { s, tx: caja.w / 2 - cx * s, ty: cyPx - cy * s, centro: DRS.mapa.inv(cx, cy), alto: cyPx / caja.h };
  }
  /** Tu casa y los lugares más cercanos que quepan sin que los pines se amontonen:
      si el zoom quedaría muy lejos (pantallas bajas), se encuadran menos lugares, nunca menos de «minimo». */
  function encuadreCercano(poses, caja, minimo = 2, sMin = 0.6) {
    const casa = DRS.estado.casa.pos;
    let n = poses.length;
    let f = encuadre([casa, ...poses], caja);
    while (f.s < sMin && n > minimo) { n -= 1; f = encuadre([casa, ...poses.slice(0, n)], caja); }
    return f;
  }
  /** Barra de escala: una distancia redonda que mida entre 48 y ~120 px. */
  function escala(s) {
    const pxKm = UKM * s;
    const d = [0.1, 0.2, 0.5, 1, 2, 5, 10].find((x) => x * pxKm >= 48) || 10;
    return { w: Math.round(d * pxKm), txt: d < 1 ? `${Math.round(d * 1000)} m` : `${num(d)} km` };
  }
  /** Los pines comunes llevan solo el precio: aquí se les pone el ícono del tipo y una etiqueta completa. */
  function decorarPines(mapaEl, ls) {
    mapaEl.querySelectorAll('.mapa-pin').forEach((b, i) => {
      const x = ls[i];
      if (!x) return;
      const t = TIPO[x.c.tipo];
      b.classList.add('v3-pin', `v3-t-${x.c.tipo}`);
      b.style.setProperty('--v3-i', String(i));
      b.setAttribute('aria-label', `${x.c.nombre}, ${t.aria}, ${x.c.tipo === 'cda' ? 'revisión' : 'desde'} ${pesos(x.p.valor)}`);
      const s = b.querySelector('span');
      if (s && !s.querySelector('.v3-pin-ico')) s.insertAdjacentHTML('afterbegin', String(ico(t.ico, 'v3-pin-ico')));
    });
  }

  /* ================================================================ piezas del inicio */
  function chips(e) {
    return html`<div class="v3-chips" role="toolbar" aria-label="Qué necesitas" data-v3-chips>
      ${LUGAR.map((x) => html`<button class="v3-chip" data-a="v3-cat" data-cat="${x.cat}" aria-pressed="${e.cat === x.cat ? 'true' : 'false'}">${ico(x.ico)}<span>${x.t}</span></button>`)}
      <span class="v3-chips-sep" aria-hidden="true"></span>
      ${FLUJO.map((x) => html`<button class="v3-chip v3-chip-flujo" ${crudo(x.attrs())}>${ico(x.ico)}<span>${x.t}</span>${ico('chevron', 'v3-chip-ir')}</button>`)}
    </div>`;
  }

  /** Estado del carro en una línea: SOAT, tecnomecánica y pico y placa de hoy. */
  function estadoCarro(v) {
    const so = DRS.calc.doc(v, 'soat'), te = DRS.calc.doc(v, 'tecno');
    const R = DRS.reloj;
    const r = R.picoPlaca(R.hoy(), v);
    const dias = (n) => (n <= 0 ? 'Vencido' : `${num(n)} ${n === 1 ? 'día' : 'días'}`);
    const pyp = v.tipo === 'moto' ? ['pos', 'Exenta', 'las motos no tienen pico y placa']
      : !r.aplica ? ['pos', 'Sin medida', `hoy no aplica (${r.motivo === 'festivo' ? 'festivo' : r.motivo})`]
        : r.restringido ? ['neg', 'No circula', 'hoy no puede circular'] : ['pos', 'Circula', 'hoy puede circular'];
    const items = [
      { t: 'SOAT', e: so.estado, v: dias(so.dias), attrs: UI.irAttrs('documento', { v: v.id, doc: 'soat' }), aria: `SOAT: ${so.etiqueta.toLowerCase()}, ${dias(so.dias)}` },
      { t: 'Tecno', e: te.estado, v: dias(te.dias), attrs: UI.irAttrs('documento', { v: v.id, doc: 'tecno' }), aria: `Tecnomecánica: ${te.etiqueta.toLowerCase()}, ${dias(te.dias)}` },
      { t: 'Pico y placa', e: pyp[0], v: pyp[1], attrs: UI.servAttrs('calendario'), aria: `Pico y placa: ${pyp[2]}` },
    ];
    return html`<div class="v3-estado" role="group" aria-label="Estado de ${suCarro(v)}">${items.map((x) => html`<button class="v3-est" data-e="${x.e}" ${crudo(x.attrs)} aria-label="${x.aria}">
      <span class="v3-est-top"><span class="v3-est-glifo">${ico(UI.GLIFO[x.e])}</span><span class="cap">${x.t}</span></span>
      <b class="d d-20 num">${x.v}</b>
    </button>`)}</div>`;
  }

  function tiraActiva(r) {
    const c = DRS.q.comercio(r.comercio);
    const est = DRS.estadoInfo(r.estado);
    const listo = r.estado === 'listo';
    const cuando = r.d === 0 ? 'hoy' : r.d === 1 ? 'mañana' : U.fechaCorta(DRS.reloj.dia(r.d));
    return html`<button class="v3-activa${listo ? ' listo' : ''}" ${crudo(UI.irAttrs('reserva', { id: r.id }))}>
      ${listo ? html`<span class="v3-activa-ok" aria-hidden="true">${ico('check')}</span>` : html`<span class="pulso" aria-hidden="true"></span>`}
      <span class="v3-activa-txt"><span class="ceja">${est.nombre} · ${cuando} ${U.horaTxt(r.hora)}</span><span class="t13">${r.servicio} · ${c.nombre}</span></span>
      ${ico('chevron')}
    </button>`;
  }

  function tituloHoja(e, ls) {
    const n = ls.length;
    const cerca = ls.filter((x) => x.c.km <= CERCA_KM).length;
    const ceja = e.cat === 'todo' ? 'Aliados en el mapa' : `${TIPO[e.cat].varios} cerca de ti`;
    const linea = !n ? html`<span>Ninguno con promo esta semana</span>`
      : e.cat === 'todo' ? html`<b class="d d-26 num">${n}</b><span>lugares · ${cerca} a menos de ${CERCA_KM} km</span>`
        : html`<b class="d d-26 num">${n}</b><span>${e.cat === 'cda' ? 'CDA' : 'lugares'} · desde <b class="t-1">${pesos(minimo(ls))}</b></span>`;
    return html`<button class="v3-hoja-tit" data-v3-alternar aria-controls="v3-cuerpo" aria-expanded="${e.hoja === 'subida' ? 'true' : 'false'}">
      <span class="v3-tit-txt"><span class="ceja">${ceja}</span><span class="v3-tit-linea">${linea}</span></span>
      <span class="v3-tit-ico" aria-hidden="true">${ico('abajo')}</span>
    </button>`;
  }

  function filaLugar(x, cat) {
    const c = x.c, p = x.p, t = TIPO[c.tipo];
    return html`<div class="v3-fila" role="listitem">
      <button class="v3-fila-main" ${crudo(UI.irAttrs('comercio', { id: c.id }))}>
        <span class="v3-fila-ico">${ico(t.ico)}</span>
        <span class="v3-fila-info"><span class="d d-20">${c.nombre}</span><span class="t11">${cat === 'todo' ? `${t.uno} · ` : ''}${c.barrio} · ${num(c.km)} km</span><span class="calif"><b>${num(c.calif)}</b><i>/5 · ${c.resenas} reseñas</i></span></span>
        <span class="v3-fila-precio">${p.etiqueta ? html`<span class="chip chip-luz">${p.promo ? ico('precio') : ''}${p.etiqueta}</span>` : html`<span class="cap">Desde</span>`}<b class="d d-20 num">${pesos(p.valor)}</b>${p.antes ? html`<span class="t11 tachado num">${pesos(p.antes)}</span>` : ''}</span>
      </button>
      <button class="v3-fila-mapa" data-a="v3-ver" data-id="${c.id}" aria-label="Ver ${c.nombre} en el mapa">${ico('ubicacion')}</button>
    </div>`;
  }

  function extraCategoria(e, v) {
    const cta = (icono, titulo, sub, attrs, clase = '') => html`<button class="v3-cta${clase}" ${crudo(attrs)}><span class="v3-cta-ico">${icono}</span><span class="v3-cta-txt"><b>${titulo}</b><span class="t11">${sub}</span></span>${ico('chevron')}</button>`;
    if (e.cat === 'taller') {
      const cot = DRS.tel.ui.cot;
      const n = cot && cot.respuestas ? cot.respuestas.length : 0;
      return html`<div class="v3-extra">${cta(ico('taller'), 'Pide cotización a varios talleres', 'Te responden con un valor antes de que reserves.', UI.irAttrs('cotizar', { v: v.id }))}
        ${n ? cta(ico('documento'), `Tus cotizaciones · ${n}`, 'Compara y elige la que te sirva.', UI.irAttrs('cotizaciones', {})) : ''}</div>`;
    }
    if (e.cat === 'cda') {
      const te = DRS.calc.doc(v, 'tecno');
      return html`<div class="v3-extra">${cta(ico(UI.GLIFO[te.estado]), te.dias <= 0 ? 'Tu tecnomecánica está vencida' : `Tu tecnomecánica vence en ${num(te.dias)} días`, 'En un CDA aliado pagas con precio DRS.', UI.irAttrs('documento', { v: v.id, doc: 'tecno' }), ` v3-e-${te.estado}`)}</div>`;
    }
    if (e.cat === 'lavadero') {
      const r = DRS.reloj.picoPlaca(DRS.reloj.hoy(), v);
      if (r.restringido) return html`<div class="v3-extra">${cta(ico('calendario'), `Hoy ${suCarro(v)} no circula`, 'Buen día para dejarlo lavando.', UI.servAttrs('calendario'))}</div>`;
    }
    return '';
  }

  function accesos() {
    const rs = DRS.q.reservasUsuario();
    const activas = rs.filter((r) => ['confirmada', 'recibido', 'en_proceso', 'listo'].includes(r.estado)).length;
    const n = DRS.q.noLeidas();
    const u = DRS.q.usuario();
    const nv = DRS.q.vehiculos().length;
    const it = [
      { t: 'Mi garaje', s: `${nv} ${nv === 1 ? 'vehículo' : 'vehículos'} · documentos`, ico: 'garaje', attrs: UI.irAttrs('garaje') },
      { t: 'Reservas', s: activas ? `${activas} ${activas === 1 ? 'activa' : 'activas'}` : 'Sin reservas activas', ico: 'reservas', attrs: 'data-a="v3-reservas"' },
      { t: 'Beneficios', s: `${num(u.puntos)} puntos`, ico: 'beneficios', attrs: UI.servAttrs('beneficios') },
      { t: 'Avisos', s: n ? `${n} sin leer` : 'Todo leído', ico: 'campana', attrs: UI.irAttrs('notificaciones'), badge: n },
    ];
    return html`<div class="v3-accesos">${it.map((x) => html`<button class="v3-acceso" ${crudo(x.attrs)}>
      <span class="v3-acceso-ico">${ico(x.ico)}${x.badge ? html`<span class="badge" data-badge="${x.badge}">${x.badge}</span>` : ''}</span>
      <span class="v3-acceso-t">${x.t}</span><span class="t11">${x.s}</span>
    </button>`)}</div>`;
  }

  function filasVehiculo(v) {
    const ac = DRS.calc.aceite(v), ll = DRS.calc.llantas(v);
    const fila = (i, t, s, attrs, extra = '') => html`<button class="fila" ${crudo(attrs)}><span class="fila-ico">${ico(i)}</span><span><span class="t13 v3-linea">${t}</span>${s ? html`<span class="t11 v3-linea">${s}</span>` : ''}</span><span class="v3-fila-fin">${extra}${ico('chevron', 's16')}</span></button>`;
    return html`<div class="lista">
      ${fila('kilometraje', 'Cambio de aceite', ac.faltan <= 0 ? 'Ya toca: agenda en un taller aliado' : `Faltan ${num(ac.faltan)} km · a los ${num(ac.proximoKm)} km`, UI.irAttrs('mantenimiento', { v: v.id, tipo: 'aceite' }), UI.chipEstado(ac.estado, ac.etiqueta))}
      ${fila('llanta', 'Llantas', `~${num(Math.round(ll.faltan / 10) * 10)} km de vida estimada`, UI.irAttrs('mantenimiento', { v: v.id, tipo: 'llantas' }), UI.chipEstado(ll.estado, ll.etiqueta))}
      ${fila('calendario', 'Pico y placa del mes', v.tipo === 'moto' ? 'Las motos están exentas en Bogotá' : 'Qué días no circula tu placa', UI.servAttrs('calendario'))}
      ${fila(v.tipo === 'moto' ? 'moto' : 'carro', 'Cambiar de vehículo', `${DRS.q.vehiculos().map((x) => placaTxt(x.placa)).join(' · ')}`, 'data-a="hoja-vehiculo"')}
      ${fila('mas', 'Agregar otro vehículo', 'Carro o moto, con la placa', UI.irAttrs('agregar-vehiculo'))}
    </div>`;
  }

  function cuerpoHoja(e, v, ls) {
    const lista = ls.slice().sort(ORDEN[e.orden] || ORDEN.cerca);
    const ordenes = e.cat === 'todo' ? [['cerca', 'Cerca'], ['calif', 'Calificación']] : [['cerca', 'Cerca'], ['precio', 'Precio'], ['calif', 'Calificación']];
    return html`<div class="v3-hoja-cuerpo" id="v3-cuerpo" data-v3-cuerpo>
      <div class="v3-orden" role="toolbar" aria-label="Ordenar la lista">
        ${ordenes.map(([k, t]) => html`<button class="v3-orden-b" data-a="v3-orden" data-k="${k}" aria-pressed="${e.orden === k ? 'true' : 'false'}">${t}</button>`)}
        ${e.cat === 'lavadero' ? html`<button class="v3-orden-b" data-a="v3-promo" aria-pressed="${e.promo ? 'true' : 'false'}">${ico('precio')}Con promo</button>` : ''}
      </div>
      ${extraCategoria(e, v)}
      <div class="v3-lista" role="list" aria-label="Lugares">${lista.length ? lista.map((x) => filaLugar(x, e.cat)) : html`<p class="t13 v3-vacio">Esta semana no hay promos en este tipo de lugar. Quita el filtro para ver todos.</p>`}</div>
      <section class="v3-bloque"><div class="ceja">Tu cuenta</div>${accesos()}</section>
      <section class="v3-bloque"><div class="ceja">${UI.modelo(v)} · ${placaTxt(v.placa)}</div>${filasVehiculo(v)}</section>
      <p class="t11 v3-nota">Comercios ficticios · precios de ejemplo.</p>
    </div>`;
  }

  function tarjeta(x) {
    const c = x.c, p = x.p, t = TIPO[c.tipo];
    return html`<button class="v3-card" data-card="${c.id}" ${crudo(UI.irAttrs('comercio', { id: c.id }))} aria-label="${c.nombre}, ${t.aria}. Ver el lugar">
      <span class="v3-card-plano">${crudo(DRS.bp.bahias({ n: c.bahias || c.lineas, ocupadas: c.ocupadas || [0], ancho: 78, etiquetas: false }))}${p.etiqueta ? html`<span class="chip chip-luz">${p.etiqueta}</span>` : ''}</span>
      <span class="v3-card-info">
        <span class="ceja">${t.uno} · ${num(c.km)} km</span>
        <span class="d d-26 v3-card-nom">${c.nombre}</span>
        <span class="t11">${c.barrio} · <span class="calif"><b>${num(c.calif)}</b><i>/5 · ${c.resenas}</i></span></span>
        <span class="v3-card-precio"><span class="cap">${c.tipo === 'cda' ? 'Revisión' : 'Desde'}</span><b class="d d-20 num">${pesos(p.valor)}</b>${p.antes ? html`<span class="t11 tachado num">${pesos(p.antes)}</span>` : ''}</span>
      </span>
      <span class="v3-card-ir" aria-hidden="true">${ico('chevron')}</span>
    </button>`;
  }

  /* ================================================================ inicio: el mapa */
  DRS.pantallas['v3-inicio'] = {
    raiz: true,
    render() {
      const e = st();
      const v = DRS.q.vehiculo();
      const u = DRS.q.usuario();
      const ls = lugares(e.cat, e.promo);
      if (e.sel && !ls.some((x) => x.c.id === e.sel)) e.sel = null;
      const act = DRS.q.activaUsuario();
      return html`<div class="v3-inicio${e.sel ? ' v3-con-sel' : ''}${e.entrada ? ' v3-entrada' : ''}" data-hoja="${e.hoja}" data-cat="${e.cat}">
        <div class="exp-mapa v3-mapa" data-v3-mapa></div>
        <header class="v3-cab">
          <div class="v3-cab-fila">
            <button class="v3-logo" data-a="demo-menu" aria-label="DRS Motors · opciones de la demo">${UI.logoH()}</button>
            <button class="v3-placa" data-a="hoja-vehiculo" aria-label="Vehículo activo ${placaTxt(v.placa)}. Cambiar de vehículo">${ico(v.tipo === 'moto' ? 'moto' : 'carro')}<span class="placa-txt">${placaTxt(v.placa)}</span>${ico('abajo', 's-flecha')}</button>
            <button class="v3-perfil" data-a="ir" data-ruta="perfil" aria-label="Tu perfil"><span class="avatar">${u.nombre[0]}${u.apellido[0]}</span></button>
          </div>
          <button class="v3-buscar" data-a="v3-abrir-buscar" aria-label="Buscar: ¿qué necesita ${suCarro(v)}?">${ico('buscar')}<span>¿Qué necesita ${suCarro(v)}?</span></button>
          ${chips(e)}
        </header>
        <section class="v3-hoja" aria-label="Tu vehículo y lugares cerca">
          <div class="v3-flota">
            <div class="v3-flota-fila">
              <div class="v3-escala" aria-hidden="true"><i data-v3-escala-barra></i><span class="cap" data-v3-escala-txt></span></div>
              ${ls.length > 1 ? html`<span class="v3-escala v3-pos cap num" data-v3-pos aria-hidden="true">1 / ${ls.length}</span>` : ''}
              <button class="v3-yo" data-a="v3-yo" aria-label="Centrar el mapa en tu casa">${ico('ubicacion')}</button>
            </div>
            <div class="v3-carrusel" data-v3-carrusel role="group" aria-label="Lugares en el mapa: desliza para ver los demás">${ls.map(tarjeta)}</div>
          </div>
          <div class="v3-hoja-cab">
            <button class="v3-asa" data-v3-alternar aria-controls="v3-cuerpo" aria-expanded="${e.hoja === 'subida' ? 'true' : 'false'}" aria-label="Subir o bajar la hoja"><i></i></button>
            ${tituloHoja(e, ls)}
            ${estadoCarro(v)}
            ${act ? tiraActiva(act) : ''}
          </div>
          ${cuerpoHoja(e, v, ls)}
        </section>
        <i class="v3-sonda" aria-hidden="true"></i>
      </div>`;
    },
    alMontar(el) { montarInicio(el); },
    alRefrescar(el) { montarInicio(el); },
  };

  function montarInicio(el) {
    const e = st();
    const raiz = el.querySelector('.v3-inicio');
    if (!raiz) return;
    const cab = raiz.querySelector('.v3-cab');
    const hoja = raiz.querySelector('.v3-hoja');
    const hcab = raiz.querySelector('.v3-hoja-cab');
    const sonda = raiz.querySelector('.v3-sonda');
    const m = {
      tope: cab.offsetHeight,
      cabH: hcab.offsetHeight,
      seguro: parseFloat(getComputedStyle(sonda).paddingBottom) || 0,
      alto: raiz.clientHeight,
      ancho: raiz.clientWidth,
    };
    m.hojaTop = m.tope + 2;
    m.yPleg = Math.max(0, m.alto - m.hojaTop - m.cabH - m.seguro);
    raiz.style.setProperty('--v3-tope', `${m.tope}px`);
    hoja.style.top = `${m.hojaTop}px`;
    hoja.style.transform = `translateY(${e.hoja === 'subida' ? 0 : m.yPleg}px)`;
    const H = (e.h = { raiz, hoja, hcab, m, cuerpo: raiz.querySelector('[data-v3-cuerpo]'), car: raiz.querySelector('[data-v3-carrusel]') });

    montarMapa(raiz, e);
    activarHoja(H);
    activarCarrusel(H);

    // Se conservan los desplazamientos de las fichas y de la hoja entre repintados
    const chipsEl = raiz.querySelector('[data-v3-chips]');
    if (chipsEl) {
      chipsEl.scrollLeft = e.chipsX;
      const f = chipsEl.querySelector('[aria-pressed="true"]');
      if (f && f.offsetLeft + f.offsetWidth > chipsEl.scrollLeft + chipsEl.clientWidth - 15) chipsEl.scrollLeft = f.offsetLeft + f.offsetWidth - chipsEl.clientWidth + 15;
      else if (f && f.offsetLeft < chipsEl.scrollLeft + 15) chipsEl.scrollLeft = Math.max(0, f.offsetLeft - 15);
      chipsEl.addEventListener('scroll', () => { st().chipsX = chipsEl.scrollLeft; }, { passive: true });
    }
    if (H.cuerpo) { H.cuerpo.scrollTop = e.cuerpoY; H.cuerpo.addEventListener('scroll', () => { st().cuerpoY = H.cuerpo.scrollTop; }, { passive: true }); }

    // Lo que pidió el buscador: ir a un lugar o a una zona
    if (e.pend) {
      const p = e.pend;
      e.pend = null;
      const ctl = e.mapa.ctl;
      setTimeout(() => ctl.enfocar(p.pos, p.s || Math.max(ctl.vista().s, 0.95), altoLibre()), 80);
    }
    // La hoja sube al entrar solo la primera vez; un repintado en ese lapso no la repite
    if (e.entrada) { e.entrada = false; setTimeout(() => { const h = st().h; if (h) h.raiz.classList.remove('v3-entrada'); }, 1200); }
  }

  /** La franja del mapa que no tapan la cabecera, la hoja plegada ni las tarjetas. */
  function franja() {
    const H = st().h;
    if (!H) return { arriba: 150, abajo: 240, alto: 800 };
    const fl = H.hoja.querySelector('.v3-flota');
    return { arriba: H.m.tope, abajo: H.m.cabH + H.m.seguro + (fl ? fl.offsetHeight : 60), alto: H.m.alto };
  }
  const altoLibre = () => { const f = franja(); return (f.arriba + (f.alto - f.abajo)) / 2 / f.alto; };
  /** Lo que tapan piezas opacas (la parte llena de la cabecera y la hoja plegada): el borde del mapa
      puede meterse ahí, así se alcanza a ver todo Bogotá sin que aparezca espacio vacío. */
  const tapaInicio = () => { const H = st().h; return H ? { arriba: Math.max(0, H.m.tope - 50), abajo: H.m.cabH + H.m.seguro } : {}; };

  function montarMapa(raiz, e) {
    const hueco = raiz.querySelector('[data-v3-mapa]');
    const ls = lugares(e.cat, e.promo);
    const firma = `${e.cat}|${e.promo}|${ls.map((x) => `${x.c.id}:${x.p.valor}`).join(',')}`;
    const viejo = e.mapa;
    if (viejo && viejo.firma === firma) {
      hueco.replaceWith(viejo.el);
      viejo.ctl.seleccionar(e.sel);
      pintarEscala(viejo.el, viejo.ctl.vista().s);
      return;
    }
    const f = franja();
    const cerca = ls.filter((x) => x.c.km <= 6).length;
    const poses = ls.slice(0, Math.max(2, Math.min(5, cerca))).map((x) => x.c.pos);
    const vista = e.encuadrar || !e.vista ? encuadreCercano(poses, { w: raiz.clientWidth, h: raiz.clientHeight, arriba: f.arriba, abajo: f.abajo }) : e.vista;
    e.encuadrar = false;
    const ctl = DRS.explorar.crearMapa(hueco, {
      lugares: ls.map((x) => ({ id: x.c.id, pos: x.c.pos, etq: etqPin(x), promo: !!x.p.promo, nombre: x.c.nombre })),
      sel: e.sel, yo: DRS.estado.casa.pos, vista: { s: vista.s, tx: vista.tx, ty: vista.ty }, arriba: f.arriba, tapa: tapaInicio,
      alPin: (id) => elegir(id, { desdeMapa: true }),
      alMover: (v) => { st().vista = v; pintarEscala(hueco, v.s); },
    });
    decorarPines(hueco, ls);
    tocarFondo(hueco);
    hueco.classList.add('v3-aparece');
    setTimeout(() => hueco.classList.remove('v3-aparece'), 1500);
    e.mapa = { el: hueco, ctl, firma };
    pintarEscala(hueco, ctl.vista().s);
  }

  function pintarEscala(mapaEl, s) {
    const raiz = mapaEl.closest('.v3-inicio');
    if (!raiz) return;
    const barra = raiz.querySelector('[data-v3-escala-barra]');
    const txt = raiz.querySelector('[data-v3-escala-txt]');
    if (!barra || !txt) return;
    const x = escala(s);
    barra.style.width = `${x.w}px`;
    txt.textContent = x.txt;
  }

  /** Un toque en el mapa (sin arrastrar ni pellizcar) cierra la tarjeta del lugar elegido. */
  function tocarFondo(mapaEl) {
    let t0 = null;
    mapaEl.addEventListener('pointerdown', (ev) => {
      if (!ev.isPrimary || ev.target.closest('.mapa-pin')) { t0 = null; return; }
      t0 = { x: ev.clientX, y: ev.clientY, t: Date.now() };
    });
    mapaEl.addEventListener('pointerup', (ev) => {
      if (!t0 || !ev.isPrimary) return;
      const toque = Math.hypot(ev.clientX - t0.x, ev.clientY - t0.y) < 8 && Date.now() - t0.t < 400;
      t0 = null;
      if (toque) soltarSeleccion();
    });
    mapaEl.addEventListener('pointercancel', () => { t0 = null; });
  }

  function soltarSeleccion() {
    const e = st();
    if (!e.sel) return;
    e.sel = null;
    if (e.mapa) e.mapa.ctl.seleccionar(null);
    if (e.h) e.h.raiz.classList.remove('v3-con-sel');
  }

  /** Elige un lugar: pin resaltado, su tarjeta a la vista y el mapa lo muestra si quedó tapado. */
  function elegir(id, { desdeMapa = false, centrar = false } = {}) {
    const e = st();
    const H = e.h;
    if (!H || !e.mapa) return;
    const antes = H.raiz.classList.contains('v3-con-sel');
    e.sel = id;
    e.mapa.ctl.seleccionar(id);
    H.raiz.classList.add('v3-con-sel');
    if (e.hoja === 'subida') ponerHoja('plegada', H);
    if (H.cc) H.cc.ir(id, antes);          // el carrusel va a su tarjeta sin elegir las del camino
    const c = DRS.q.comercio(id);
    if (!c) return;
    const ctl = e.mapa.ctl;
    if (centrar) ctl.enfocar(c.pos, Math.max(ctl.vista().s, 0.95), altoLibre());
    else if (!ctl.visible(c.pos, franja().abajo / franja().alto)) ctl.enfocar(c.pos, null, altoLibre());
    if (desdeMapa && DRS.tel.hojaActual()) DRS.tel.cerrarHoja();
  }

  /* ---------------- la hoja: arrastrar con el dedo o tocar el asa ---------------- */
  function ponerHoja(estado, H = st().h) {
    st().hoja = estado;
    if (!H) return;
    H.hoja.classList.remove('v3-arrastrando');
    H.raiz.classList.remove('v3-arrastrando');
    H.hoja.style.transform = `translateY(${estado === 'subida' ? 0 : H.m.yPleg}px)`;
    H.raiz.dataset.hoja = estado;
    H.raiz.querySelectorAll('[data-v3-alternar]').forEach((b) => b.setAttribute('aria-expanded', estado === 'subida' ? 'true' : 'false'));
  }

  function activarHoja(H) {
    const { hcab, hoja, raiz } = H;
    let a = null;
    let ignorar = false;
    hcab.addEventListener('pointerdown', (ev) => {
      if (ev.pointerType === 'mouse' && ev.button !== 0) return;
      ignorar = false;
      const base = st().hoja === 'subida' ? 0 : H.m.yPleg;
      a = { id: ev.pointerId, y0: ev.clientY, base, y: base, k: (raiz.getBoundingClientRect().height / raiz.offsetHeight) || 1, movio: false, pts: [[ev.clientY, performance.now()]] };
    });
    hcab.addEventListener('pointermove', (ev) => {
      if (!a || ev.pointerId !== a.id) return;
      const dy = (ev.clientY - a.y0) / a.k;
      if (!a.movio) {
        if (Math.abs(dy) < 7) return;
        a.movio = true;
        try { hcab.setPointerCapture(ev.pointerId); } catch (_) { /* el puntero ya se soltó */ }
        hoja.classList.add('v3-arrastrando');
        raiz.classList.add('v3-arrastrando');
      }
      const lim = H.m.yPleg;
      let y = a.base + dy;
      if (y < 0) y = -Math.sqrt(-y) * 2;                  // resistencia en los extremos
      if (y > lim) y = lim + Math.sqrt(y - lim) * 2;
      a.y = y;
      hoja.style.transform = `translateY(${y.toFixed(1)}px)`;
      a.pts.push([ev.clientY, performance.now()]);
      if (a.pts.length > 5) a.pts.shift();
    });
    const soltar = (ev) => {
      if (!a || ev.pointerId !== a.id) return;
      const x = a;
      a = null;
      if (!x.movio) return;
      ignorar = true;
      const p0 = x.pts[0], p1 = x.pts[x.pts.length - 1];
      const vel = (p1[0] - p0[0]) / x.k / Math.max(1, p1[1] - p0[1]);     // px por ms; positivo hacia abajo
      const destino = vel < -0.3 ? 'subida' : vel > 0.3 ? 'plegada' : x.y < H.m.yPleg / 2 ? 'subida' : 'plegada';
      if (destino === 'subida') soltarSeleccion();
      ponerHoja(destino, H);
    };
    hcab.addEventListener('pointerup', soltar);
    hcab.addEventListener('pointercancel', (ev) => { if (a && a.movio) soltar(ev); else a = null; });
    hcab.addEventListener('click', (ev) => {
      if (ignorar) { ignorar = false; ev.preventDefault(); ev.stopPropagation(); return; }
      if (!ev.target.closest('[data-v3-alternar]')) return;
      const sube = st().hoja !== 'subida';
      if (sube) soltarSeleccion();
      ponerHoja(sube ? 'subida' : 'plegada', H);
    });
  }

  /* ---------------- tarjetas de los lugares, sincronizadas con los pines ---------------- */
  // Deslizar elige de inmediato la tarjeta que queda a la vista: pin resaltado y el mapa va hasta él
  // (DRS.explorar.carrusel, el mismo del explorador). Tocar un pin lleva el carrusel a su tarjeta (elegir).
  function activarCarrusel(H) {
    const car = H.car;
    const e = st();
    if (!car) return;
    const pos = H.raiz.querySelector('[data-v3-pos]');
    H.cc = DRS.explorar.carrusel(car, {
      alElegir: (id) => {
        const x = st();
        if (!x.sel || !x.mapa) return;
        x.sel = id;
        x.mapa.ctl.seleccionar(id);
        const c = DRS.q.comercio(id);
        if (c) x.mapa.ctl.enfocar(c.pos, null, altoLibre());
      },
      alCambiar: (i, n) => { if (pos) pos.textContent = `${i + 1} / ${n}`; },
    });
    if (e.sel) H.cc.ir(e.sel, false);
  }

  /* ================================================================ buscador */
  const SUGERIDOS = ['Lavado', 'Cambio de aceite y filtro', 'Tecnomecánica', 'SOAT', 'Traspaso', 'Informe vehicular'];
  let RESULTADOS = [];

  function indice() {
    const v = DRS.q.vehiculo();
    const it = [];
    const srv = (titulo, sub, icono, accion, claves = '') => it.push({ g: 'Servicios', titulo, sub, ico: icono, accion, claves: norm(`${titulo} ${sub} ${claves}`) });
    srv('Lavado', 'Lavaderos en el mapa, con precio', 'detailing', { cat: 'lavadero' }, 'lavar lavadero lavaderos espuma carro limpio');
    DRS.estado.servicios.forEach((s) => srv(s.nombre, `Lavaderos · ${s.min} min`, 'detailing', { cat: 'lavadero' }, s.desc));
    srv('Taller', 'Talleres en el mapa', 'taller', { cat: 'taller' }, 'mecanico mecanica talleres arreglo');
    DRS.estado.serviciosTaller.forEach((s) => srv(s.nombre, 'Pide cotización a talleres cerca', 'taller', { ruta: 'cotizar', p: { v: v.id, necesidad: s.id } }, `${s.desc} taller mecanico`));
    srv('Tecnomecánica', 'CDA en el mapa · precio DRS', 'certificado', { cat: 'cda' }, 'tecno rtm revision tecnico mecanica emisiones cda');
    srv('SOAT', 'Renuévalo con una aseguradora aliada', 'garantia', { soat: true }, 'seguro obligatorio poliza');
    srv('Traspaso', 'Trámites DRS · solo Bogotá', 'traspaso', { ruta: 'tramites', p: { tipo: 'traspaso' } }, 'tramite tramites vender comprar transito');
    srv('Levantamiento de prenda', 'Trámites DRS · solo Bogotá', 'prenda', { ruta: 'tramites', p: { tipo: 'prenda' } }, 'prenda credito tramite banco');
    srv('Informe vehicular', 'Antes de comprar un usado', 'peritaje', { ruta: 'informe', p: {} }, 'historial placa usado comprar dueños');
    srv('Catálogo DRS', 'Carros y motos en venta', 'llave', { ruta: 'catalogo', p: {} }, 'comprar carro moto venta usados');
    srv('Pico y placa', 'Calendario del mes', 'calendario', { ruta: 'calendario-pyp', p: {} }, 'restriccion placa calendario');
    srv('Mi garaje', 'Tus vehículos, documentos e historial', 'garaje', { ruta: 'garaje', p: {} }, 'documentos vehiculos historial mantenimiento');
    srv('Reservas', 'Próximas, en curso e historial', 'reservas', { reservas: true }, 'reserva citas agenda');
    srv('Beneficios', 'Puntos, metas y bonos', 'beneficios', { ruta: 'beneficios', p: {} }, 'puntos descuento bonos nivel');
    srv('Avisos', 'Tus notificaciones', 'campana', { ruta: 'notificaciones', p: {} }, 'notificaciones mensajes alertas');
    srv('Perfil', 'Datos, medios de pago y privacidad', 'perfil', { ruta: 'perfil', p: {} }, 'cuenta datos pagos privacidad');
    DRS.estado.comercios.slice().sort((a, b) => a.km - b.km).forEach((c) => it.push({
      g: 'Lugares', titulo: c.nombre, sub: `${TIPO[c.tipo].uno} · ${c.barrio} · ${num(c.km)} km`, ico: TIPO[c.tipo].ico,
      accion: { lugar: c.id }, claves: norm(`${c.nombre} ${c.barrio} ${c.zona} ${c.direccion} ${TIPO[c.tipo].uno} ${TIPO[c.tipo].aria}`),
    }));
    (DRS.mapa.ZONAS || []).forEach((z) => it.push({ g: 'Zonas de Bogotá', titulo: z.nombre, sub: z.tipo === 'localidad' ? 'Localidad' : 'Barrio', ico: 'ubicacion', accion: { zona: [z.calle, z.carrera], tipo: z.tipo }, claves: norm(z.nombre) }));
    return it;
  }

  function puesto(x, q) {
    const t = norm(x.titulo);
    if (t.startsWith(q)) return 0;
    const ws = q.split(/\s+/).filter(Boolean);
    const partir = (s) => s.split(/[\s·,#()-]+/).filter(Boolean);
    const tt = partir(t), cc = partir(x.claves);
    const en = (toks, w) => toks.some((k) => k.startsWith(w));
    if (ws.every((w) => en(tt, w))) return 1;
    if (ws.every((w) => en(tt, w) || en(cc, w))) return 3;
    if (x.claves.includes(q)) return 4;
    return 9;
  }

  function resultados(q) {
    const n = norm(q.trim());
    const idx = indice();
    let grupos;
    if (!n) {
      grupos = [
        ['Sugerencias', SUGERIDOS.map((t) => idx.find((x) => x.g === 'Servicios' && x.titulo === t)).filter(Boolean)],
        ['Cerca de ti', idx.filter((x) => x.g === 'Lugares').slice(0, 3)],
      ];
    } else {
      const hits = idx.map((x) => ({ x, r: puesto(x, n) })).filter((h) => h.r < 9).sort((a, b) => a.r - b.r);
      const cupo = { Servicios: 6, Lugares: 5, 'Zonas de Bogotá': 4 };
      grupos = Object.keys(cupo).map((g) => [g, hits.filter((h) => h.x.g === g).slice(0, cupo[g]).map((h) => h.x)]).filter(([, l]) => l.length);
    }
    RESULTADOS = grupos.flatMap(([, l]) => l);
    if (!RESULTADOS.length) return html`<p class="t13 v3-bus-vacio">No encontramos «${q.trim()}». Prueba con lavado, aceite, SOAT o un barrio como Cedritos.</p>`;
    let i = 0;
    return html`${grupos.map(([g, l]) => html`<section class="v3-bus-grupo"><div class="ceja">${g}</div><div class="lista">${l.map((x) => html`<button class="fila" data-a="v3-bus-ir" data-i="${i++}"><span class="fila-ico">${ico(x.ico)}</span><span><span class="t13 v3-linea">${x.titulo}</span><span class="t11 v3-linea">${x.sub}</span></span>${ico('chevron')}</button>`)}</div></section>`)}`;
  }

  /** Lo elegido en el buscador: una ficha o un lugar vuelven al mapa; un servicio abre su flujo. */
  function ejecutar(acc) {
    const e = st();
    if (acc.cat) {
      Object.assign(e, { cat: acc.cat, sel: null, encuadrar: e.cat !== acc.cat || e.encuadrar, promo: false, hoja: 'plegada', cuerpoY: 0 });
      DRS.tel.atras();
      return;
    }
    if (acc.lugar) {
      const c = DRS.q.comercio(acc.lugar);
      const cat = e.cat === 'todo' ? 'todo' : c.tipo;
      Object.assign(e, { cat, sel: c.id, promo: false, hoja: 'plegada', encuadrar: e.cat !== cat, pend: { pos: c.pos }, cuerpoY: 0 });
      DRS.tel.atras();
      return;
    }
    if (acc.zona) {
      Object.assign(e, { sel: null, hoja: 'plegada', pend: { pos: acc.zona, s: acc.tipo === 'localidad' ? 0.55 : 0.9 } });
      DRS.tel.atras();
      return;
    }
    DRS.tel.atras();
    if (acc.soat) DRS.acciones['soat-iniciar']({ v: DRS.estado.vehiculoActivo });
    else if (acc.reservas) DRS.acciones['v3-reservas']();
    else DRS.tel.ir(acc.ruta, acc.p || {});
  }

  DRS.pantallas['v3-buscar'] = {
    render() {
      const q = DRS.tel.ui.v3q || '';
      const v = DRS.q.vehiculo();
      return html`<div class="v3-bus">
        <header class="v3-bus-cab">
          <button class="v3-bus-atras" data-a="atras" aria-label="Volver al mapa">${ico('atras')}</button>
          <label class="v3-bus-campo">${ico('buscar')}<input id="v3-bus-in" type="search" value="${q}" placeholder="¿Qué necesita ${suCarro(v)}?" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="search" aria-label="Busca un servicio, un lugar o una zona de Bogotá"></label>
        </header>
        <div class="v3-bus-res" data-v3-res>${resultados(q)}</div>
      </div>`;
    },
    alMontar(el) { montarBuscar(el, true); },
    alRefrescar(el) { montarBuscar(el, false); },
  };

  function montarBuscar(el, enfocar) {
    const input = el.querySelector('#v3-bus-in');
    const res = el.querySelector('[data-v3-res]');
    if (!input || !res) return;
    input.addEventListener('input', () => {
      DRS.tel.ui.v3q = input.value;
      res.innerHTML = String(resultados(input.value));
    });
    input.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Enter') return;
      ev.preventDefault();
      if (RESULTADOS[0]) ejecutar(RESULTADOS[0].accion);
    });
    if (enfocar) {
      try { input.focus({ preventScroll: true }); } catch (_) { input.focus(); }
    } else if (document.activeElement === document.body) {
      const n = input.value.length;
      try { input.focus({ preventScroll: true }); input.setSelectionRange(n, n); } catch (_) { /* sin foco */ }
    }
  }

  /* ================================================================ bienvenida */
  function montarBv(el) {
    const b = stBv();
    const raiz = el.querySelector('.v3-bv');
    if (!raiz) return;
    const hueco = raiz.querySelector('[data-v3-bvmapa]');
    const panel = raiz.querySelector('.v3-bv-panel');
    const cab = raiz.querySelector('.v3-bv-cab');
    b.m = { w: raiz.clientWidth, h: raiz.clientHeight, arriba: cab.offsetHeight, abajo: panel.offsetHeight };
    if (b.mapa && b.mapa.el) hueco.replaceWith(b.mapa.el);
    else {
      const v = DRS.q.vehiculo();
      const ls = DRS.estado.comercios.map((c) => ({ c, p: DRS.explorar.precioDesde(c, v) })).sort((x, y) => x.c.km - y.c.km);
      const vista = b.paso === 'inicio' ? vistaCiudad(b.m) : encuadreCasa(b.m, ls);
      const ctl = DRS.explorar.crearMapa(hueco, {
        lugares: ls.map((x) => ({ id: x.c.id, pos: x.c.pos, etq: etqPin(x), promo: !!x.p.promo, nombre: x.c.nombre })),
        yo: DRS.estado.casa.pos, vista: { s: vista.s, tx: vista.tx, ty: vista.ty }, arriba: b.m.arriba,
        // cabecera llena hasta el 55 % y panel lleno salvo sus 56 px de arriba (css/v3.css): ahí el mapa puede terminar
        tapa: () => { const m = stBv().m; return m ? { arriba: m.arriba * 0.55, abajo: Math.max(0, m.abajo - 56) } : {}; },
        alPin: (id) => {
          const bb = stBv();
          if (bb.paso !== 'listo') return;
          bb.sel = bb.sel === id ? null : id;
          DRS.tel.refrescar();
        },
      });
      decorarPines(hueco, ls);
      b.mapa = { el: hueco, ctl, ls };
    }
    const mapa = b.mapa.el;
    b.mapa.ctl.seleccionar(b.sel || null);
    mapa.classList.toggle('v3-ubicado', b.paso !== 'inicio');
    mapa.classList.toggle('v3-precios', b.paso === 'listo');
  }

  /** Vista de conjunto del norte de la ciudad, antes de ubicarte. */
  function vistaCiudad(m) {
    const s = Math.max(0.36, m.w / (8.5 * UKM));
    const centro = DRS.mapa.pt(128, 44);
    const cy = m.arriba + (m.h - m.arriba - m.abajo) / 2;
    return { s, tx: m.w / 2 - centro[0] * s, ty: cy - centro[1] * s };
  }
  /** Tu casa y los aliados más cercanos, entre la cabecera y el panel. */
  function encuadreCasa(m, ls) {
    const cerca = ls.filter((x) => x.c.km <= CERCA_KM).slice(0, 6).map((x) => x.c.pos);
    return encuadreCercano(cerca, { w: m.w, h: m.h, arriba: m.arriba, abajo: m.abajo - 40 }, 3, 0.55);
  }

  function ubicar() {
    const b = stBv();
    if (b.paso !== 'inicio' || !b.mapa) return;
    const turno = ++b.turno;
    const vigente = () => stBv() === b && b.turno === turno && enTope('v3-bienvenida');
    b.paso = 'ubicando';
    b.hechos = 0;
    DRS.tel.refrescar();
    const m = b.m;
    b.mapa.ctl.enfocar(DRS.estado.casa.pos, Math.max(0.55, m.w / (6 * UKM)), (m.arriba + (m.h - m.abajo)) / 2 / m.h);
    [[1, 650], [2, 1250], [3, 1800]].forEach(([n, ms]) => setTimeout(() => { if (!vigente()) return; b.hechos = n; DRS.tel.refrescar(); }, ms));
    setTimeout(() => {
      if (!vigente()) return;
      b.paso = 'listo';
      DRS.tel.refrescar();
      const f = encuadreCasa(b.m, b.mapa.ls);
      b.mapa.ctl.enfocar(f.centro, f.s, f.alto);
      setTimeout(() => { if (b.mapa) b.mapa.el.classList.add('v3-quietos'); }, 2200);
    }, 2300);
  }

  DRS.pantallas['v3-bienvenida'] = {
    render() {
      const b = stBv();
      if (b.paso === 'ubicando' && !b.mapa) b.paso = 'inicio';
      const casa = DRS.estado.casa;
      const v = DRS.q.vehiculo();
      const cerca = DRS.estado.comercios.filter((c) => c.km <= CERCA_KM).map((c) => ({ c, p: DRS.explorar.precioDesde(c, v) }));
      const desdeTipo = (t) => minimo(cerca.filter((x) => x.c.tipo === t));
      const paso = (i, t) => html`<li class="${b.hechos > i ? 'hecho' : b.hechos === i ? 'actual' : ''}"><i>${b.hechos > i ? ico('check') : ''}</i><span>${t}</span></li>`;
      let panel;
      if (b.paso === 'inicio') {
        panel = html`<div class="ceja">Bogotá · el mapa de ${suCarro(v)}</div>
          <h1 class="d d-44">Todo lo que ${suCarro(v)} necesita, cerca de ti</h1>
          <p class="t16">Lavaderos, talleres y tecnomecánica con el precio a la vista en el mapa. SOAT, trámites e informe vehicular, en la misma app.</p>
          <button class="btn btn-acero" data-a="v3-ubicar">${ico('ubicacion')}Usar mi ubicación</button>
          <button class="btn btn-fantasma" data-a="v3-direccion">Escribir mi dirección</button>
          <p class="t11 v3-bv-nota">Solo la usamos para mostrarte lo que hay cerca. Datos ficticios para la demo.</p>`;
      } else if (b.paso === 'ubicando') {
        panel = html`<div class="ceja">Ubicándote</div>
          <h1 class="d d-44">Buscando lo que hay cerca</h1>
          <ol class="proceso v3-bv-proceso">${paso(0, `Tu ubicación: ${casa.direccion}`)}${paso(1, 'Lavaderos, talleres y CDA a tu alrededor')}${paso(2, 'Precios de hoy')}</ol>`;
      } else {
        const elegido = b.sel && DRS.q.comercio(b.sel);
        const pe = elegido && DRS.explorar.precioDesde(elegido, v);
        panel = html`<div class="ceja">${casa.direccion.replace(', ', ' · ')}</div>
          <h1 class="d d-44"><span class="num">${cerca.length}</span> aliados a menos de ${CERCA_KM} km</h1>
          ${elegido ? html`<div class="v3-bv-elegido"><span class="v3-bv-elegido-ico">${ico(TIPO[elegido.tipo].ico)}</span><span><span class="ceja">${TIPO[elegido.tipo].uno} · ${num(elegido.km)} km · ${num(elegido.calif)}/5</span><span class="d d-26 v3-linea">${elegido.nombre}</span><span class="t13 v3-linea">${elegido.tipo === 'cda' ? 'Revisión' : 'Desde'} ${pesos(pe.valor)} · crea tu cuenta para reservar</span></span></div>`
    : html`<p class="t16">Lavados desde ${pesos(desdeTipo('lavadero'))}, talleres desde ${pesos(desdeTipo('taller'))} y tecnomecánica con precio DRS desde ${pesos(desdeTipo('cda'))}. Precios de ejemplo.</p>`}
          <button class="btn btn-acero" data-a="reg-empezar">Crear cuenta</button>
          <button class="btn btn-fantasma" data-a="v3-entrar">Ya tengo cuenta</button>
          <p class="t11 v3-bv-nota">Toca un precio para ver el lugar. Datos ficticios para la demo.</p>`;
      }
      return html`<div class="v3-bv" data-paso="${b.paso}">
        <div class="exp-mapa v3-bv-mapa" data-v3-bvmapa></div>
        <header class="v3-bv-cab">
          <button class="v3-logo" data-a="demo-menu" aria-label="DRS Motors · opciones de la demo">${UI.logoH()}</button>
          <span class="cap v3-bv-lugar">${ico(b.paso === 'listo' ? 'ubicacion' : 'mapa')}${b.paso === 'listo' ? 'Cedritos · Bogotá' : 'Bogotá'}</span>
        </header>
        <section class="v3-bv-panel" aria-live="polite">${panel}</section>
      </div>`;
    },
    alMontar(el) { montarBv(el); },
    alRefrescar(el) { montarBv(el); },
  };

  /* ================================================================ acciones */
  Object.assign(DRS.acciones, {
    'v3-ubicar': () => ubicar(),
    'v3-direccion': () => DRS.tel.hoja(html`<div class="hoja-cab"><div><div class="ceja">Tu dirección</div><h2 class="d d-34 v3-hoja-h">¿Dónde está ${suCarro(DRS.q.vehiculo())}?</h2></div><button class="hoja-cerrar" data-a="hoja-cerrar" aria-label="Cerrar">${ico('cerrar')}</button></div>
      <div class="campo"><label class="cap" for="v3-dir">Dirección en Bogotá</label><input id="v3-dir" value="${DRS.estado.casa.direccion.split(',')[0]}" autocomplete="street-address"></div>
      <button class="opcion" data-a="v3-dir-ok">${ico('ubicacion')}<span><span class="t13 t-1 v3-linea">${DRS.estado.casa.direccion.split(',')[0]}</span><span class="t11">Cedritos, Usaquén · Bogotá</span></span>${ico('chevron')}</button>
      <button class="btn btn-luz" data-a="v3-dir-ok">Usar esta dirección</button>
      <p class="t11 v3-bv-nota">Por ahora DRS Motors opera en Bogotá.</p>`, { clase: 'v3-hoja-dir' }),
    'v3-dir-ok': () => { DRS.tel.cerrarHoja(); setTimeout(ubicar, 260); },
    'v3-entrar': () => {
      DRS.tel.tabIr(DRS.variante ? DRS.variante.inicio : 'v3-inicio');
      setTimeout(() => DRS.tel.tostada(`Hola de nuevo, ${DRS.q.usuario().nombre}`), 520);
    },
    'v3-cat': (d) => {
      const e = st();
      if (e.cat === d.cat) { if (e.hoja === 'plegada') { soltarSeleccion(); ponerHoja('subida'); } return; }
      Object.assign(e, { cat: d.cat, sel: null, encuadrar: true, promo: false, cuerpoY: 0, orden: d.cat === 'todo' && e.orden === 'precio' ? 'cerca' : e.orden });
      DRS.tel.refrescar();
    },
    'v3-orden': (d) => { const e = st(); e.orden = d.k; e.cuerpoY = 0; DRS.tel.refrescar(); },
    'v3-promo': () => { const e = st(); e.promo = !e.promo; e.sel = null; e.cuerpoY = 0; DRS.tel.refrescar(); },
    'v3-ver': (d) => elegir(d.id, { centrar: true }),
    'v3-yo': () => { const e = st(); if (e.mapa) e.mapa.ctl.enfocar(DRS.estado.casa.pos, null, altoLibre()); },
    'v3-abrir-buscar': () => { DRS.tel.ui.v3q = ''; DRS.tel.ir('v3-buscar', {}); },
    'v3-bus-ir': (d) => { const x = RESULTADOS[Number(d.i)]; if (x) ejecutar(x.accion); },
    'v3-reservas': () => { DRS.tel.ui.resSeg = null; DRS.tel.ir('reservas', {}); },
  });

  // Al girar el celular o cambiar el tamaño de la ventana se vuelven a medir el mapa y la hoja
  let tRes = null;
  window.addEventListener('resize', () => {
    clearTimeout(tRes);
    tRes = setTimeout(() => {
      if (!DRS.variante || DRS.variante.id !== 'v3') return;
      if (enTope('v3-inicio') || enTope('v3-bienvenida')) DRS.tel.refrescar();
    }, 180);
  });

  /* ================================================================ contrato */
  DRS.variantes.v3 = {
    id: 'v3',
    numero: 3,
    nombre: 'Mapa',
    lema: 'Todo lo que tu carro necesita, cerca de ti.',
    descripcion: 'Bogotá es la app: el mapa a pantalla completa con precios, un buscador, fichas por servicio y una hoja que sube con tu carro, tus reservas y tus accesos. Sin barra inferior.',
    bienvenida: 'v3-bienvenida',
    inicio: 'v3-inicio',
    tabs: [],
    fab: null,
    clase: 'var-v3',
    /** Gancho opcional (solo actúa si js/app/tel.js lo consulta en tel.ir): en esta demo el mapa común
        de «explorar» no se apila encima del mapa; se vuelve al inicio con la ficha de ese tipo elegida. */
    redirigir(ruta, p) {
      if (ruta !== 'explorar') return false;
      const cat = ['lavadero', 'taller', 'cda'].includes(p && p.tipo) ? p.tipo : 'todo';
      const e = st();
      Object.assign(e, { cat, sel: null, encuadrar: e.cat !== cat || e.encuadrar, promo: false, hoja: 'plegada', cuerpoY: 0 });
      DRS.tel.tabIr('v3-inicio');
      return true;
    },
    /** Plano de la propuesta: el mapa con pines de precio, el buscador y las fichas arriba, y la hoja abajo. */
    plano: () => `<svg viewBox="0 0 120 200" aria-hidden="true" class="plano-demo">
      <rect x="1" y="1" width="118" height="198" class="pd-marco"/>
      <path d="M1 72H119M1 100H119M1 128H119M26 52V150M62 52V150M96 52V150" class="pd-linea"/>
      <path d="M1 140L56 96L119 66" class="pd-trazo"/>
      <rect x="10" y="9" width="26" height="5" class="pd-txt"/><rect x="78" y="7" width="20" height="9" class="pd-linea"/><rect x="101" y="7" width="9" height="9" class="pd-linea"/>
      <rect x="10" y="22" width="100" height="11" class="pd-linea"/><path d="M14 27.5h6" class="pd-trazo"/>
      <rect x="10" y="38" width="15" height="7" class="pd-txt"/><rect x="28" y="38" width="15" height="7" class="pd-linea"/><rect x="46" y="38" width="15" height="7" class="pd-linea"/><rect x="64" y="38" width="15" height="7" class="pd-linea"/><rect x="82" y="38" width="15" height="7" class="pd-linea"/>
      <path d="M12 78h16v7h-6l-2 3-2-3h-6zM72 84h16v7h-6l-2 3-2-3h-6zM30 114h16v7h-6l-2 3-2-3h-6zM80 118h16v7h-6l-2 3-2-3h-6z" class="pd-linea"/>
      <path d="M44 92h18v8h-7l-2 3-2-3h-7z" class="pd-acento"/>
      <rect x="58" y="110" width="7" height="7" class="pd-acento-trazo"/>
      <path d="M1 154H119" class="pd-linea"/><rect x="52" y="158" width="16" height="2" class="pd-txt"/>
      <rect x="10" y="165" width="30" height="13" class="pd-linea"/><rect x="45" y="165" width="30" height="13" class="pd-linea"/><rect x="80" y="165" width="30" height="13" class="pd-linea"/>
      <rect x="10" y="183" width="100" height="9" class="pd-linea"/>
    </svg>`,
  };
})();
