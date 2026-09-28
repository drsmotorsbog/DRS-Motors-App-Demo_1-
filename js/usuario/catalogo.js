/* DRS Motors · demo — Catálogo DRS: vehículos en consignación (FICTICIOS) y su ficha.
   Rutas: 'catalogo' (entrada pública: DRS.tel.ir('catalogo')) y 'catalogo-ficha' { id }.
   Toda pieza con vehículo lleva la placa de línea (Contexto/11): flap en miniatura + línea y sello.
   Nunca se menciona la comisión de consignación. «Me interesa» abre el WhatsApp simulado. */
(function () {
  'use strict';
  const DRS = window.DRS;
  const U = DRS.util;
  const UI = DRS.ui;
  const { html, crudo, ico, num, pesos } = U;

  const tope = () => DRS.tel.pila[DRS.tel.pila.length - 1];
  const nombreUsuario = () => (DRS.q.usuario() || {}).nombre || 'Andrés';

  /* Orden del catálogo: precio descendente (Contexto/15). docs.*: días para vencer respecto al «hoy» de la demo. */
  const CATALOGO = [
    { id: 'drs-004', codigo: 'DRS-0926-004', marca: 'Jeep', modelo: 'Gladiator Rubicon', anio: 2022, km: 18700, precio: 289000000,
      forma: 'pickup', tipo: 'carro', linea: 'TERRAIN', sello: 'UNICORNIO', caja: 'Automática', zona: 'Usaquén',
      tecnica: [['Motor', '3.604 cc · V6'], ['Potencia', '285 hp'], ['Combustible', 'Gasolina'], ['Transmisión', 'Automática 8 vel.'], ['Tracción', '4x4'], ['Kilometraje', '18.700 km'], ['Color', 'Verde'], ['Dueños', '1']],
      docs: { soat: 211, tecno: null, tecnoPrimera: 'marzo de 2027', prenda: null }, puntajes: [9.5, 9.1, 9.3] },
    { id: 'drs-001', codigo: 'DRS-0926-001', marca: 'Volvo', modelo: 'XC60 T5', anio: 2021, km: 38500, precio: 139900000, nuevo: true,
      forma: 'suv', tipo: 'carro', linea: 'FAMILY', sello: 'SIGNATURE', caja: 'Automática', zona: 'Usaquén',
      tecnica: [['Motor', '1.969 cc · turbo'], ['Potencia', '250 hp'], ['Combustible', 'Gasolina'], ['Transmisión', 'Automática 8 vel.'], ['Tracción', 'AWD'], ['Kilometraje', '38.500 km'], ['Color', 'Gris'], ['Dueños', '1']],
      docs: { soat: 188, tecno: null, tecnoPrimera: 'diciembre de 2026', prenda: null }, puntajes: [9.2, 8.8, 9.4] },
    { id: 'drs-002', codigo: 'DRS-0926-002', marca: 'Volkswagen', modelo: 'Golf GTI', anio: 2019, km: 41200, precio: 104500000,
      forma: 'hatch', tipo: 'carro', linea: 'SPORT', sello: null, caja: 'Automática DSG', zona: 'Chapinero',
      tecnica: [['Motor', '1.984 cc · turbo'], ['Potencia', '230 hp'], ['Combustible', 'Gasolina'], ['Transmisión', 'Automática DSG'], ['Tracción', 'Delantera'], ['Kilometraje', '41.200 km'], ['Color', 'Rojo'], ['Dueños', '2']],
      docs: { soat: 96, tecno: 121, prenda: 'Banco Aldea' }, puntajes: [8.9, 8.4, 8.7] },
    { id: 'drs-003', codigo: 'DRS-0926-003', marca: 'Nissan', modelo: 'Sentra Advance', anio: 2020, km: 52300, precio: 72500000,
      forma: 'sedan', tipo: 'carro', linea: 'DAILY', sello: null, caja: 'Automática CVT', zona: 'Suba',
      tecnica: [['Motor', '1.798 cc'], ['Potencia', '130 hp'], ['Combustible', 'Gasolina'], ['Transmisión', 'Automática CVT'], ['Tracción', 'Delantera'], ['Kilometraje', '52.300 km'], ['Color', 'Plata'], ['Dueños', '1']],
      docs: { soat: 142, tecno: 175, prenda: null }, puntajes: [8.6, 8.2, 8.5] },
    { id: 'drs-005', codigo: 'DRS-0926-005', marca: 'KTM', modelo: '390 Duke', anio: 2023, km: 6800, precio: 24900000,
      forma: 'moto', tipo: 'moto', linea: 'MOTO · NAKED', sello: null, caja: 'Mecánica', zona: 'Teusaquillo',
      tecnica: [['Motor', '373 cc'], ['Potencia', '44 hp'], ['Combustible', 'Gasolina'], ['Transmisión', 'Mecánica 6 vel.'], ['Estilo', 'Naked'], ['Kilometraje', '6.800 km'], ['Color', 'Naranja'], ['Dueños', '1']],
      docs: { soat: 58, tecno: 64, prenda: null }, puntajes: [9.0, 8.9, null] },
  ];
  const nombre = (v) => `${v.marca} ${v.modelo}`;

  /** Placa de línea: dos líneas del flap (fina Plata arriba, gruesa Azul Luz abajo) + línea y sello. */
  function placaLinea(v, grande = false) {
    const txt = v.sello ? `${v.linea} · ${v.sello}` : v.linea;
    return html`<span class="placa-linea${grande ? ' placa-grande' : ''}" role="img" aria-label="Línea ${txt}"><i class="placa-linea-flap" aria-hidden="true"></i><span class="placa-linea-txt" aria-hidden="true">${v.linea}${v.sello ? html` · <b class="sello-${v.sello.toLowerCase()}">${v.sello}</b>` : ''}</span></span>`;
  }

  const chatInteres = (v) => ({
    contacto: 'DRS Motors', sub: 'DRS Motors · Bogotá',
    borrador: `Hola, DRS. Me interesa el ${nombre(v)} ${v.anio} del catálogo (${v.codigo}). ¿Sigue disponible? ¿Cuándo lo puedo ver?`,
    respuesta: `Hola, ${nombreUsuario()}. Soy Santiago, de DRS Motors. El ${nombre(v)} sigue disponible. ¿Te queda bien verlo esta semana en Bogotá? Te comparto la ficha completa y los papeles.`,
  });
  function chatVender() {
    const x = DRS.q.vehiculo();
    const mio = x ? `mi ${UI.modeloCorto(x)} ${x.modelo}` : 'mi vehículo';
    return {
      contacto: 'DRS Motors', sub: 'DRS Motors · Bogotá',
      borrador: `Hola, DRS. Quiero vender ${mio}. ¿Cómo funciona la consignación con ustedes?`,
      respuesta: `Hola, ${nombreUsuario()}. Soy Santiago, de DRS Motors. Con gusto te explico cómo funciona y agendamos la revisión de tu vehículo. ¿Dónde lo tienes en Bogotá?`,
    };
  }

  /* ================= Lista ================= */
  function tarjeta(v, anim, i) {
    return html`<button class="tarjeta cat-tarjeta" ${crudo(UI.irAttrs('catalogo-ficha', { id: v.id }))} aria-label="${nombre(v)} ${v.anio}, ${num(v.km)} km, ${pesos(v.precio)}">
      <span class="cat-plano srv-rejilla">${crudo(DRS.bp.porForma(v.forma, { ancho: 340, dibujar: anim, retraso: 60 + i * 110, modo: anim ? 'llega' : 'ninguno' }))}
        ${v.nuevo ? html`<span class="chip chip-luz cat-chip">Recién llegado</span>` : ''}<span class="cap cat-codigo">${v.codigo}</span></span>
      <span class="cat-info">
        <span class="d d-26 cat-modelo">${nombre(v)}</span>
        <span class="cap cat-specs">${v.anio} · ${num(v.km)} km · ${v.caja} · ${v.zona}</span>
        <span class="cat-pie">${placaLinea(v)}<span class="d d-20 num">${pesos(v.precio)}</span></span>
      </span>
    </button>`;
  }

  DRS.pantallas.catalogo = {
    render(p, ctx) {
      const filtro = p.filtro || 'todos';
      const cumple = (v, k) => k === 'todos' || (k === 'motos' ? v.tipo === 'moto' : v.tipo !== 'moto');
      const lista = CATALOGO.filter((v) => cumple(v, filtro));
      const tabs = [['todos', 'Todos'], ['carros', 'Carros'], ['motos', 'Motos']];
      return html`${UI.cabDet('Catálogo DRS')}<div class="cuerpo con-cta cat-cuerpo">
        <div class="titulo"><div class="ceja">DRS Motors · Bogotá</div><h1 class="d d-44">Catálogo</h1>
          <p class="t13">Carros y motos en consignación, revisados por DRS. Vehículos de ejemplo para la demo.</p></div>
        <div class="seg" role="tablist" aria-label="Filtrar el catálogo">${tabs.map(([k, t]) => html`<button role="tab" aria-selected="${k === filtro ? 'true' : 'false'}" data-a="cat-filtro" data-k="${k}">${t} · ${CATALOGO.filter((v) => cumple(v, k)).length}</button>`)}</div>
        ${lista.map((v, i) => tarjeta(v, ctx.anim, i))}
        <section class="bloque"><div class="lista">
          <button class="fila" ${crudo(UI.irAttrs('whatsapp', chatVender()))}>
            <span class="fila-ico">${ico('consignacion')}</span>
            <span><span class="t13" style="display:block">¿Vas a vender tu carro o tu moto?</span><span class="t11" style="display:block">Te ayudamos a publicarlo y a venderlo. Escríbenos.</span></span>
            ${ico('chevron')}
          </button></div></section>
        <p class="t11" style="margin-top:18px">Vehículos, precios y datos de ejemplo: no están a la venta.</p>
      </div>`;
    },
  };

  /* ================= Ficha ================= */
  const VISTAS = { perfil: 'Perfil', frente: 'Frente', planta: 'Planta' };

  function galeria(v, anim, i0) {
    const vistas = v.forma === 'moto' ? ['perfil', 'frente'] : ['perfil', 'frente', 'planta'];
    const ancho = { perfil: 360, frente: 196, planta: 360 };
    return html`<div class="cat-galeria srv-rejilla">
        <div class="cat-riel">${vistas.map((w, k) => html`<figure class="cat-vista">
          <span class="cat-lienzo v-${w}">${crudo(DRS.bp.vista(v.forma, w, { ancho: ancho[w], dibujar: anim && k === 0, cotas: w === 'perfil' }))}</span>
          <figcaption class="cap">${String(k + 1).padStart(2, '0')} · ${VISTAS[w]}</figcaption></figure>`)}</div>
        <span class="cap cat-cuenta" aria-live="polite"><b>${i0 + 1}</b> / ${vistas.length}</span>
      </div>
      <div class="seg cat-seg" role="tablist" aria-label="Vistas del vehículo">${vistas.map((w, k) => html`<button role="tab" aria-selected="${k === i0 ? 'true' : 'false'}" data-a="cat-vista" data-k="${k}">${VISTAS[w]}</button>`)}</div>`;
  }

  function documentos(v) {
    const vence = (dias) => U.fechaCorta(DRS.reloj.dia(dias));
    const ano = DRS.reloj.hoy().getFullYear();
    const d = v.docs;
    const neutro = (t) => html`<span class="chip">${ico('informacion')}${t}</span>`;
    const filas = [
      ['garantia', 'SOAT', `Vigente hasta el ${vence(d.soat)}`, UI.chipEstado('pos', 'Vigente')],
      ['certificado', 'Tecnomecánica', d.tecno == null ? `La primera revisión es en ${d.tecnoPrimera}` : `Vigente hasta el ${vence(d.tecno)}`, d.tecno == null ? neutro('No aplica aún') : UI.chipEstado('pos', 'Vigente')],
      ['precio', 'Impuestos', `Pagados · ${ano}`, UI.chipEstado('pos', 'Al día')],
      ['prenda', 'Prenda', d.prenda ? `Con ${d.prenda} · se levanta en el traspaso` : 'Sin prenda', d.prenda ? UI.chipEstado('warn', 'Vigente') : UI.chipEstado('pos', 'Libre')],
    ];
    return html`<div class="lista">${filas.map(([i, t, s, chip]) => html`<div class="fila"><span class="fila-ico">${ico(i)}</span><span><span class="t13" style="display:block">${t}</span><span class="t11" style="display:block">${s}</span></span>${chip}</div>`)}</div>`;
  }

  function puntajes(v) {
    const ejes = [['Mecánica', v.puntajes[0]], ['Exterior', v.puntajes[1]], ['Interior', v.puntajes[2]]];
    return html`<div class="tarjeta tarjeta-pad cat-puntajes">${ejes.map(([k, x]) => html`<div class="cat-punt">
      <span class="cap">${k}</span>
      <span class="cat-barra" role="img" aria-label="${k}: ${x == null ? 'no aplica' : `${num(x)} de 10`}">${x == null ? '' : html`<i style="width:${x * 10}%"></i>`}</span>
      <span class="d d-20 num">${x == null ? '—' : num(x)}</span></div>`)}</div>`;
  }

  DRS.pantallas['catalogo-ficha'] = {
    render(p, ctx) {
      const v = CATALOGO.find((x) => x.id === p.id) || CATALOGO[0];
      const i0 = p.vista || 0;
      return html`${UI.cabDet(nombre(v))}<div class="cuerpo con-cta">
        ${galeria(v, ctx.anim, i0)}
        <div class="titulo cat-titulo">
          <div class="ceja">${v.codigo}${v.nuevo ? ' · Recién llegado' : ''}</div>
          <h1 class="d d-44">${nombre(v)}</h1>
          <i class="cat-divisor" aria-hidden="true"></i>
          <div class="cat-specs2">${v.anio} · ${num(v.km)} km · Consignación · Bogotá</div>
          ${placaLinea(v, true)}
          <div class="cat-precio"><span class="cap">Precio</span><span class="d d-44 num">${pesos(v.precio)}</span></div>
        </div>
        <section class="bloque">${UI.bloqueCab('Datos técnicos')}
          <div class="cajetin">${v.tecnica.map(([k, x]) => html`<div><span class="cap">${k}</span><b>${x}</b></div>`)}
            <div class="ancho"><span class="cap">Ubicación</span><b>${v.zona} · Bogotá</b></div></div></section>
        <section class="bloque">${UI.bloqueCab('Revisión DRS', 'Puntaje de la revisión, sobre 10.')}${puntajes(v)}</section>
        <section class="bloque">${UI.bloqueCab('Estado documental', 'Revisado por DRS antes de publicarlo.')}${documentos(v)}</section>
        <section class="bloque"><div class="lista"><button class="fila" ${crudo(UI.irAttrs('tramites', { tipo: 'traspaso', vehiculo: `${nombre(v)} · ${v.codigo}` }))}>
          <span class="fila-ico">${ico('traspaso')}</span><span><span class="t13" style="display:block">Traspaso con DRS en Bogotá</span><span class="t11" style="display:block">Cotízalo antes de comprar.</span></span>${ico('chevron')}</button></div></section>
        <p class="t11" style="margin-top:18px">Vehículo, precio y datos de ejemplo para la demo.</p>
      </div>
      <div class="pie-cta"><button class="btn btn-acero" ${crudo(UI.irAttrs('whatsapp', chatInteres(v)))}>${ico('chat')}Me interesa</button><p class="t11">Te responde Santiago, de DRS Motors, por WhatsApp.</p></div>`;
    },
    alMontar(el, p) { prepararGaleria(el, p); },
    alRefrescar(el, p) { prepararGaleria(el, p); },
  };

  function prepararGaleria(el, p) {
    const riel = U.$('.cat-riel', el);
    if (!riel) return;
    const cuenta = U.$('.cat-cuenta b', el);
    const tabs = U.$$('.cat-seg button', el);
    if (p.vista) riel.scrollLeft = p.vista * riel.clientWidth;
    riel.addEventListener('scroll', () => {
      const i = Math.round(riel.scrollLeft / Math.max(1, riel.clientWidth));
      if (i === (p.vista || 0)) return;
      p.vista = i;
      if (cuenta) cuenta.textContent = String(i + 1);
      tabs.forEach((b, k) => b.setAttribute('aria-selected', k === i ? 'true' : 'false'));
    }, { passive: true });
  }

  Object.assign(DRS.acciones, {
    'cat-filtro': (d) => { const e = tope(); if (!e || e.ruta !== 'catalogo') return; e.p.filtro = d.k; DRS.tel.refrescar(); },
    'cat-vista': (d) => {
      const e = tope();
      const riel = e && U.$('.cat-riel', e.el);
      if (!riel) return;
      const reducido = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      riel.scrollTo({ left: Number(d.k) * riel.clientWidth, behavior: reducido ? 'auto' : 'smooth' });
    },
  });

  DRS.catalogo = { lista: CATALOGO, placaLinea, abrir: () => DRS.tel.ir('catalogo') };
})();
