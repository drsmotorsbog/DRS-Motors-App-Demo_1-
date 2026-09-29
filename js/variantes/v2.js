/* DRS Motors · Demo 2 · «Mi carro» — el carro es la app (patrón de las apps de carro conectado)
   La bienvenida empieza por la placa: el plano del vehículo se dibuja y muestra lo que la app
   ya sabe de él (consulta simulada) antes de pedir la cuenta. El inicio es el plano grande del
   vehículo activo con una llamada por sistema (SOAT, tecnomecánica, aceite, llantas y odómetro),
   el estado general con la acción más urgente, los controles de servicio, la reserva en vivo y
   «Lo que viene». Navegación con el botón + abajo a la derecha: Mi carro · Servicios · Actividad ·
   Perfil y el atajo Lavar (desde el menú de la demo se cambia a la barra fija de abajo, como un tablero).
   Las pantallas de servicio (explorar, reservar, SOAT, informe, garaje…) son las compartidas.

   Rutas propias: v2-bienvenida, v2-inicio, v2-servicios, v2-actividad, v2-perfil.
   Estado de interfaz en DRS.tel.ui: v2bien (bienvenida), v2filtro (actividad), v2veh (último
   vehículo dibujado). Estilos en css/v2.css. El contrato de una demo está en js/variantes/v1.js. */
(function () {
  'use strict';
  const DRS = window.DRS;
  const U = DRS.util;
  const UI = DRS.ui;
  const { html, crudo, ico, num, pesos, placaTxt } = U;
  DRS.variantes = DRS.variantes || {};

  /* ================================================================ utilidades */
  const tope = () => DRS.tel.pila[DRS.tel.pila.length - 1];
  const esMoto = (v) => v.tipo === 'moto';
  const cual = (v) => (esMoto(v) ? 'moto' : 'carro');
  const GLIFO = UI.GLIFO;                                   // pos → check · warn → excl · neg → cerrar
  const f1 = (x) => Math.round(x * 10) / 10;
  const pct = (x, total) => `${f1((x / total) * 100)}%`;
  const diasTxt = (n) => `${num(n)} ${n === 1 ? 'día' : 'días'}`;
  const redondo = (km) => Math.round(km / 10) * 10;
  const mayus = (s) => s.charAt(0).toUpperCase() + s.slice(1);
  const horaCorta = (hhmm) => U.horaTxt(hhmm).replace(/ [ap]\. m\./, '');
  const sufijo = (hhmm) => (U.aMin(hhmm) < 720 ? 'a. m.' : 'p. m.');
  const cuandoRes = (d) => (d === 0 ? 'hoy' : d === 1 ? 'mañana' : U.fechaLarga(DRS.reloj.dia(d)));

  /** Encabezado de las pestañas de la demo: el logo abre las opciones de la demo. */
  function cab(ctx) {
    const n = DRS.q.noLeidas();
    return html`<header class="cab v2-cab">
      ${ctx && !ctx.comoPestana ? html`<button class="cab-atras" data-a="atras" aria-label="Volver">${ico('atras')}</button>` : ''}
      <button class="cab-logo v2-logo" data-a="demo-menu" aria-label="DRS Motors · opciones de la demo">${UI.logoH()}</button>
      <button class="cab-btn v2-campana" data-a="ir" data-ruta="notificaciones" aria-label="Notificaciones, ${n} sin leer">${ico('campana')}${n ? html`<span class="badge" data-badge="${n}">${n}</span>` : ''}</button>
    </header>`;
  }

  /* ================================================================ sistemas del vehículo */
  /** Kilómetros al día que rueda el vehículo, medidos desde el último cambio de aceite. */
  function ritmo(v) {
    const dias = Math.max(1, -v.aceite.ultimoD);
    return Math.max(1, (v.km - v.aceite.ultimoKm) / dias);
  }

  /** Estado de cada sistema, con lo que se ve en el plano, el detalle y la acción que lo resuelve. */
  function sistemas(v, anim = false) {
    const hoy = DRS.reloj.hoy();
    const so = DRS.calc.doc(v, 'soat');
    const te = DRS.calc.doc(v, 'tecno');
    const ac = DRS.calc.aceite(v);
    const ll = DRS.calc.llantas(v);
    const r = ritmo(v);
    const acDias = Math.max(0, Math.min(Math.round(Math.max(0, ac.faltan) / r), U.diasEntre(hoy, ac.fecha)));
    const llDias = Math.max(0, Math.round(Math.max(0, ll.faltan) / r));
    const sinKm = Math.max(0, -v.kmD);
    const doc = (id, nombre, largo, c, extra) => ({
      id, nombre, ico: id === 'soat' ? 'garantia' : 'certificado', estado: c.estado, p: c.p,
      etiqueta: id === 'tecno' && c.dias <= 0 ? 'Vencida' : c.etiqueta,          // la tecnomecánica
      cap: c.dias <= 0 ? nombre : `${nombre} · vence en`, valor: c.dias <= 0 ? (id === 'tecno' ? 'Vencida' : 'Vencido') : diasTxt(c.dias), dias: c.dias, fecha: c.vence,
      resumen: c.dias <= 0 ? `${largo} está vencid${id === 'soat' ? 'o' : 'a'}` : `${largo} vence en ${diasTxt(c.dias)}`,
      ver: UI.irAttrs('documento', { v: v.id, doc: id }), ...extra,
    });
    return [
      doc('soat', 'SOAT', 'el SOAT', so, { accion: 'Renovar SOAT', attrs: `data-a="soat-iniciar" data-v="${v.id}"` }),
      doc('tecno', 'Tecno', 'la tecnomecánica', te, { accion: 'Agendar tecnomecánica', attrs: UI.servAttrs('tecno') }),
      {
        id: 'aceite', nombre: 'Aceite', ico: 'taller', estado: ac.estado, etiqueta: ac.etiqueta, p: ac.p,
        cap: ac.faltan <= 0 ? 'Aceite' : 'Aceite · faltan', valor: ac.faltan <= 0 ? 'Vencido' : `${num(ac.faltan)} km`, dias: acDias, proximoKm: ac.proximoKm, faltan: ac.faltan,
        fecha: U.sumarDias(hoy, acDias), estimado: true,
        resumen: ac.faltan <= 0 ? 'el cambio de aceite está vencido' : `faltan ${num(ac.faltan)} km para el cambio de aceite`,
        ver: UI.irAttrs('mantenimiento', { v: v.id, tipo: 'aceite' }),
        accion: 'Cotizar cambio de aceite', attrs: UI.irAttrs('cotizar', { v: v.id, necesidad: 'aceite' }),
      },
      {
        id: 'llantas', nombre: 'Llantas', ico: 'llanta', estado: ll.estado, etiqueta: ll.etiqueta, p: ll.p,
        cap: 'Llantas · vida', valor: ll.faltan <= 0 ? 'Cambiar' : `${num(redondo(ll.faltan))} km`, dias: llDias, faltan: ll.faltan,
        fecha: U.sumarDias(hoy, llDias), estimado: true,
        resumen: ll.faltan <= 0 ? 'toca cambiar las llantas' : `a las llantas les quedan ~${num(redondo(ll.faltan))} km`,
        ver: UI.irAttrs('mantenimiento', { v: v.id, tipo: 'llantas' }),
        accion: 'Cotizar alineación y llantas', attrs: UI.irAttrs('cotizar', { v: v.id, necesidad: 'alineacion' }),
      },
      {
        id: 'km', nombre: 'Odómetro', ico: 'kilometraje', estado: sinKm > 30 ? 'warn' : 'pos', etiqueta: sinKm === 0 ? 'Actualizado hoy' : `Actualizado hace ${diasTxt(sinKm)}`,
        p: Math.max(0, 1 - sinKm / 30), cap: 'Odómetro', valor: `${num(v.km)} km`, valorHtml: odometro(v.km, anim), dias: 0,
        resumen: `actualiza el kilometraje (van ${diasTxt(sinKm)})`,
        ver: `data-a="hoja-km" data-v="${v.id}"`, accion: 'Actualizar kilometraje', attrs: `data-a="hoja-km" data-v="${v.id}"`,
      },
    ];
  }

  /** Lo que pide atención, de lo más grave a lo más lejano. */
  function urgentes(sis) {
    const peso = { neg: 0, warn: 1 };
    return sis.filter((s) => s.estado !== 'pos').sort((a, b) => peso[a.estado] - peso[b.estado] || a.dias - b.dias);
  }

  /** Odómetro de rodillos: cada cifra gira hasta su número. */
  function odometro(km, anim) {
    const s = String(Math.max(0, Math.round(km))).padStart(6, '0');
    return html`<span class="v2-odo${anim ? ' v2-odo-anima' : ''}" aria-hidden="true">${[...s].map((c, i) => html`<span class="v2-odo-d"><span class="v2-odo-rollo" style="--n:${c};--i:${i}">${'0123456789'.split('').map((x) => html`<i>${x}</i>`)}</span></span>`)}<span class="v2-odo-u">km</span></span>`;
  }

  /* ================================================================ el plano con sus llamadas */
  // Caja de cada dibujo (js/blueprint.js y blueprint-mas.js, sin globos) y el punto de cada sistema en él.
  const VB = { sedan: [40, 84, 920, 326], hatch: [40, 84, 920, 326], suv: [40, 84, 920, 326], pickup: [40, 84, 920, 326], moto: [40, 60, 920, 350] };
  const PUNTOS = {
    sedan: { soat: [388, 160], tecno: [532, 160], aceite: [738, 236], llantas: [250, 322], km: [750, 322], placa: [104, 292] },
    hatch: { soat: [395, 163], tecno: [520, 165], aceite: [722, 238], llantas: [270, 322], km: [730, 322], placa: [150, 292] },
    suv: { soat: [394, 148], tecno: [548, 150], aceite: [772, 228], llantas: [250, 316], km: [755, 316], placa: [90, 288] },
    pickup: { soat: [462, 150], tecno: [582, 150], aceite: [800, 224], llantas: [250, 316], km: [812, 316], placa: [60, 292] },
    moto: { soat: [606, 172], tecno: [690, 140], aceite: [552, 300], llantas: [255, 300], km: [745, 300], placa: [272, 254] },
  };
  /** La misma elección de dibujo que DRS.bp.vehiculo. */
  function forma(v) {
    if (v.tipo === 'moto') return 'moto';
    const c = (v.carroceria || '').toLowerCase();
    if (/hatch/.test(c) && DRS.bp.hatch) return 'hatch';
    if (/(suv|camioneta)/.test(c) && DRS.bp.suv) return 'suv';
    if (/(pick|platón|platon)/.test(c) && DRS.bp.pickup) return 'pickup';
    return 'sedan';
  }

  // Puntos de las llamadas sobre el vehículo abstracto (anclas de js/movimiento/vehiculos/indice.js; el primero que exista)
  const ANCLAS_MOV = {
    carro: { soat: ['parabrisas'], tecno: ['cabina', 'puerta'], aceite: ['capo', 'motor'], llantas: ['rueda1'], km: ['rueda2'], placa: ['trasera'] },
    moto: { soat: ['tanque'], tecno: ['faro'], aceite: ['motor'], llantas: ['rueda1'], km: ['rueda2'], placa: ['trasera'] },
  };
  /** Modo del dibujo de antes → vehículo abstracto (Movimiento/APP.md §4). */
  function movDe(modo, ms) {
    if (modo === 'escaneo') return { modo: 'puntos', opciones: { lectura: true, velocidad: +(3.4 / Math.max(0.8, ms / 1000)).toFixed(2) }, anim: true };
    if (modo === 'enciende') return { modo: 'mixto', opciones: { revelado: 'franja', fondo: false }, anim: true };
    if (modo === 'llega') return { modo: 'plano', opciones: { barrido: true }, anim: true };
    return { modo: 'plano', opciones: {}, anim: false };
  }

  /**
   * Escenario de plano: el dibujo del vehículo y una llamada por dato, con su guía hasta el punto.
   * Todo se mide en unidades de un lienzo de 390 × alto; el escenario guarda esa proporción, así
   * las posiciones en % y las guías (SVG) coinciden a cualquier ancho de celular.
   * El vehículo es el abstracto de js/movimiento/ (vehiculo: uno en particular, p. ej. el genérico); si su
   * carrocería no tiene uno propio, el dibujo de DRS.bp. Las llamadas se encienden cuando pasa el barrido.
   * llamadas: [{ punto, fila: 'arriba'|'abajo', cap, valor, estado, attrs, etiqueta }]
   */
  function escena(v, llamadas, { alto = 316, dibujar = false, anim = false, apagada = false, extra = '', etiqueta = '', modo = null, ms = 1500, t0 = null, vehiculo = null, clave = 'v2-escena' } = {}) {
    const W = 390, H = alto;
    const modoBp = modo || (dibujar ? 'llega' : 'ninguno');
    const n = DRS.mov ? vehiculo || DRS.mov.vehiculoDe(v) : null;
    let enLienzo, auto, dibujo;
    if (n) {
      const m = movDe(modoBp, ms);
      const asp = DRS.mov.caja(n, m.opciones).asp;
      const bw = Math.min(366, (H - 128) * asp), bh = bw / asp;     // entre la fila de llamadas de arriba y la de abajo
      const bx = (W - bw) / 2, by = (H - bh) / 2 + 2;
      const anclas = ANCLAS_MOV[DRS.mov.esMoto(n) ? 'moto' : 'carro'];
      enLienzo = (p) => { const [fx, fy] = DRS.mov.punto(n, anclas[p], m.opciones); return [bx + fx * bw, by + fy * bh]; };
      auto = { x: bx, y: by, w: bw };
      dibujo = DRS.mov.marcador(v, { vehiculo: n, modo: m.modo, opciones: m.opciones, anim: m.anim, clave });
      if (m.anim) t0 = Math.round(DRS.mov.duracion(m.modo, m.opciones) * 600);
    } else {
      const f = forma(v), vb = VB[f];
      const ax = 12, aw = 366, ah = (aw * vb[3]) / vb[2], at = (H - ah) / 2 + 2;
      enLienzo = (p) => { const [x, y] = PUNTOS[f][p]; return [ax + ((x - vb[0]) / vb[2]) * aw, at + ((y - vb[1]) / vb[3]) * ah]; };
      auto = { x: ax, y: at, w: aw };
      dibujo = crudo(DRS.bp.vehiculo(v, { ancho: 380, dibujar, retraso: 60, modo: modoBp, ms }));
    }
    const filas = { arriba: [], abajo: [] };
    llamadas.forEach((l) => { const [sx, sy] = enLienzo(l.punto); filas[l.fila].push({ ...l, sx, sy }); });
    const alto0 = 48;                                        // alto de una llamada (≥ 44 px a 390)
    Object.keys(filas).forEach((k) => {
      const ls = filas[k].sort((a, b) => a.sx - b.sx);
      const n = ls.length;
      ls.forEach((l, i) => {
        l.ancho = n === 1 ? l.ancho || 176 : W / n - 8;
        l.cx = n === 1 ? (l.cx != null ? l.cx : Math.min(W - l.ancho / 2 - 4, Math.max(l.ancho / 2 + 4, l.sx))) : (i + 0.5) * (W / n);
        l.y0 = k === 'arriba' ? 4 : H - 4 - alto0;
        l.borde = k === 'arriba' ? l.y0 + alto0 : l.y0;
      });
    });
    const todas = [...filas.arriba, ...filas.abajo];
    const guias = todas.map((l, i) => {
      const codo = l.fila === 'arriba' ? l.borde + 10 : l.borde - 10;
      return `<path d="M${f1(l.cx)} ${f1(l.borde)}V${f1(codo)}L${f1(l.sx)} ${f1(l.sy)}" pathLength="1" class="v2-guia" style="--i:${i}"/>`;
    }).join('');
    const clase = ['v2-escena', apagada ? 'v2-apagada' : '', anim ? 'v2-anima' : ''].filter(Boolean).join(' ');
    // modo del plano (css/vehiculos.css): al entrar, el carro llega rodando; t0 retrasa las llamadas hasta que frena
    return html`<div class="${clase}" style="aspect-ratio:${W} / ${H}${t0 != null ? `;--t0:${t0}ms` : ''}" role="group" aria-label="${etiqueta}">
      <div class="v2-auto" style="left:${pct(auto.x, W)};width:${pct(auto.w, W)};top:${pct(auto.y, H)}">${dibujo}</div>
      ${crudo(`<svg class="v2-guias" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true">${guias}</svg>`)}
      ${todas.map((l, i) => html`<span class="v2-punto${l.estado ? ` est-${l.estado}` : ''}" style="left:${pct(l.sx, W)};top:${pct(l.sy, H)};--i:${i}" aria-hidden="true"></span>`)}
      ${todas.map((l, i) => {
    const cuerpo = html`<span class="cap">${l.cap}</span><span class="v2-llam-val">${l.valor}${l.estado ? html`<i class="v2-gl est-${l.estado}">${ico(GLIFO[l.estado])}</i>` : ''}</span>`;
    const estilo = `left:${pct(l.cx - l.ancho / 2, W)};width:${pct(l.ancho, W)};top:${pct(l.y0, H)};height:${pct(alto0, H)};--i:${i}`;
    return l.attrs
      ? html`<button class="v2-llam v2-llam-${l.fila}" style="${estilo}" ${crudo(l.attrs)} aria-label="${l.etiqueta || ''}">${cuerpo}</button>`
      : html`<span class="v2-llam v2-llam-${l.fila}" style="${estilo}">${cuerpo}</span>`;
  })}
      ${extra}
    </div>`;
  }

  /** Anillo del estado general: un segmento por sistema, con su color y marcas de tablero. */
  function anillo(sis, anim) {
    const n = sis.length, c = 50, r = 40, hueco = 8, paso = 360 / n;
    const pt = (a, rr) => [c + rr * Math.cos((a * Math.PI) / 180), c + rr * Math.sin((a * Math.PI) / 180)];
    const segs = sis.map((s, i) => {
      const [x0, y0] = pt(-90 + i * paso + hueco / 2, r), [x1, y1] = pt(-90 + (i + 1) * paso - hueco / 2, r);
      return `<path d="M${f1(x0)} ${f1(y0)}A${r} ${r} 0 0 1 ${f1(x1)} ${f1(y1)}" pathLength="1" class="v2-seg est-${s.estado}" style="--i:${i}"/>`;
    }).join('');
    let marcas = '';
    for (let k = 0; k < 60; k++) {
      const [x0, y0] = pt(k * 6, 46.5), [x1, y1] = pt(k * 6, k % 12 === 0 ? 50 : 48.5);
      marcas += `M${f1(x0)} ${f1(y0)}L${f1(x1)} ${f1(y1)}`;
    }
    const ok = sis.filter((s) => s.estado === 'pos').length;
    return html`<div class="v2-anillo${anim ? ' v2-anima' : ''}" role="img" aria-label="${ok} de ${n} sistemas al día">
      ${crudo(`<svg viewBox="0 0 100 100" aria-hidden="true"><path d="${marcas}" class="v2-marcas"/><circle cx="50" cy="50" r="${r}" class="v2-pista"/>${segs}</svg>`)}
      <span class="v2-anillo-c" aria-hidden="true"><b class="d d-44 num">${ok}</b><span class="cap">de ${n}</span></span>
    </div>`;
  }

  /** Reserva en curso, como una actividad en vivo: estado, cuándo y los cuatro pasos del lavadero. */
  function enVivo(r) {
    const c = DRS.q.comercio(r.comercio);
    const v = DRS.q.vehiculo(r.vehiculo);
    const pasos = DRS.ESTADOS.slice(0, 4);
    const i = pasos.findIndex((e) => e.id === r.estado);
    const listo = r.estado === 'listo';
    const est = DRS.estadoInfo(r.estado);
    const corto = { recibido: 'Recibido', listo: 'Listo' };
    return html`<button class="v2-vivo${listo ? ' listo' : ''}" ${crudo(UI.irAttrs('reserva', { id: r.id }))} aria-label="Reserva ${r.id}, ${est.nombre}: ${r.servicio} en ${c.nombre}, ${cuandoRes(r.d)} a las ${U.horaTxt(r.hora)}. Ver seguimiento">
      <span class="v2-vivo-top">${listo ? html`<span class="v2-gl est-pos">${ico('check')}</span>` : html`<span class="pulso" aria-hidden="true"></span>`}<span class="ceja">${listo ? 'Listo para recoger' : `En vivo · ${est.nombre}`}</span><span class="cap num">${r.id}</span></span>
      <span class="v2-vivo-medio">
        <span class="v2-vivo-que"><span class="d d-26">${r.servicio}</span><span class="t13">${c.nombre} · ${UI.modeloCorto(v)} ${placaTxt(r.placa)}</span></span>
        <span class="v2-vivo-hora"><span class="d d-34 num">${horaCorta(r.hora)}</span><span class="cap">${sufijo(r.hora)} · ${cuandoRes(r.d)}</span></span>
      </span>
      <span class="v2-vivo-pasos" aria-hidden="true">${pasos.map((e, k) => html`<span class="${k < i ? 'hecho' : k === i ? 'actual' : ''}"><i></i><b>${corto[e.id] || e.nombre}</b></span>`)}</span>
    </button>`;
  }

  /* ================================================================ bienvenida: empieza por la placa */
  const estadoBien = () => (DRS.tel.ui.v2bien = DRS.tel.ui.v2bien || { placa: '', estado: 'nada', paso: 0, vid: null, error: '', dibujar: false });
  const normPlaca = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  const placaValida = (p) => /^[A-Z]{3}\d{3}$/.test(p) || /^[A-Z]{3}\d{2}[A-Z]$/.test(p);
  const AYUDA = 'Carro: ABC 123 · Moto: ABC 12D';
  const PASOS_BIEN = ['Placa encontrada en el RUNT', 'Vigencia del SOAT', 'Revisión técnico-mecánica', 'Pico y placa de hoy'];
  const GENERICO = { tipo: 'carro', carroceria: 'Sedán' };

  /** Pico y placa de hoy en pocas palabras (para una llamada del plano). */
  function pypHoy(v) {
    const x = DRS.reloj.picoPlaca(DRS.reloj.hoy(), v);
    if (!x.aplica) return { estado: 'pos', valor: esMoto(v) ? 'Exenta' : 'Circula' };
    if (x.restringido) return { estado: 'neg', valor: 'No sale' };
    return { estado: 'pos', valor: 'Circula' };
  }

  DRS.pantallas['v2-bienvenida'] = {
    render(p, ctx) {
      const s = estadoBien();
      const v = s.estado === 'listo' ? DRS.q.vehiculo(s.vid) : null;
      const buscando = s.estado === 'buscando';
      const vv = buscando ? DRS.q.vehiculo(s.vid) : v;      // mientras consulta, el escaneo ya lee la forma real
      const vacio = buscando ? '…' : '—';
      let llamadas;
      if (v) {
        const so = DRS.calc.doc(v, 'soat'), te = DRS.calc.doc(v, 'tecno'), py = pypHoy(v);
        llamadas = [
          { punto: 'soat', fila: 'arriba', cap: so.dias <= 0 ? 'SOAT' : 'SOAT · vence en', valor: so.dias <= 0 ? 'Vencido' : diasTxt(so.dias), estado: so.estado },
          { punto: 'tecno', fila: 'arriba', cap: te.dias <= 0 ? 'Tecno' : 'Tecno · vence en', valor: te.dias <= 0 ? 'Vencida' : diasTxt(te.dias), estado: te.estado },
          { punto: 'placa', fila: 'abajo', cap: 'Pico y placa · hoy', valor: py.valor, estado: py.estado, ancho: 150, cx: 79 },
        ];
      } else {
        llamadas = [
          { punto: 'soat', fila: 'arriba', cap: 'SOAT', valor: vacio },
          { punto: 'tecno', fila: 'arriba', cap: 'Tecnomecánica', valor: vacio },
          { punto: 'placa', fila: 'abajo', cap: 'Pico y placa · hoy', valor: vacio, ancho: 150, cx: 79 },
        ];
      }
      const rotulo = html`<span class="v2-rotulo${v ? ' listo' : ''}">${v
        ? html`<span class="cap">${placaTxt(v.placa)} · ${v.modelo} · ${v.carroceria}</span><b class="d d-20">${UI.modelo(v)}</b>`
        : html`<span class="cap">Vehículo</span><b class="d d-20">${buscando ? 'Consultando…' : 'Sin identificar'}</b>`}</span>`;
      const plano = escena(vv || GENERICO, llamadas, {
        alto: 286, dibujar: false, anim: !!(v && s.dibujar), apagada: !vv,
        modo: buscando ? 'escaneo' : v && s.dibujar ? 'enciende' : 'ninguno', ms: 1800, t0: 160, clave: 'v2-bien',
        vehiculo: !vv && DRS.mov ? DRS.mov.generico('v2-bien', !!(ctx && ctx.anim)) : null,     // sin identificar: se intercalan la moto y los carros
        extra: html`${rotulo}`,
        etiqueta: v ? `Plano de ${UI.modelo(v)}: lo que la app sabe de este vehículo` : 'Plano del vehículo, aún sin identificar',
      });
      const ejemplos = DRS.q.vehiculos().filter((x) => ['v1', 'v2'].includes(x.id));
      return html`<header class="cab v2-cab">
        <button class="cab-logo v2-logo" data-a="demo-menu" aria-label="DRS Motors · opciones de la demo">${UI.logoH()}</button>
        <span class="cap v2-cab-nota">Demo · datos de ejemplo</span>
      </header>
      <div class="cuerpo con-cta v2-bien">
        <div class="v2-bien-tit">
          <p class="ceja">La app de tu carro</p>
          <h1 class="d d-44">Empieza por tu placa</h1>
          <p class="t13">Escríbela y te mostramos lo que la app ya sabe de tu vehículo, sin crear cuenta.</p>
        </div>
        ${plano}
        ${buscando ? html`<ol class="proceso v2-bien-pasos" data-v2-pasos aria-live="polite">${pasosBien(s.paso)}</ol>` : ''}
        <div class="v2-placa-caja">
          <label class="cap" for="v2-placa">Placa</label>
          <input id="v2-placa" class="v2-placa-in" value="${s.placa ? placaTxt(s.placa) : ''}" maxlength="7" autocomplete="off" autocapitalize="characters" spellcheck="false" enterkeyhint="search" placeholder="ABC 123" aria-describedby="v2-placa-ayuda" ${crudo(buscando ? 'disabled' : '')} ${crudo(s.error ? 'aria-invalid="true"' : '')}>
          <span class="v2-flap" aria-hidden="true"><i></i><i></i></span>
          <span id="v2-placa-ayuda" class="t11 v2-ayuda${s.error ? ' v2-error' : ''}">${s.error ? html`${ico('excl')}<span>${s.error}</span>` : AYUDA}</span>
          <span class="v2-ejemplos"><span class="cap">Prueba con</span>${ejemplos.map((x) => html`<button class="v2-ej" data-a="v2-placa-ej" data-placa="${x.placa}" ${crudo(buscando ? 'disabled' : '')} aria-label="Placa de ejemplo ${placaTxt(x.placa)}">${placaTxt(x.placa)}</button>`)}</span>
        </div>
        ${v ? html`<section class="v2-bien-mas">
          <div class="ceja">Con tu cuenta, además</div>
          <ul class="v2-lista-ico">
            <li>${ico('campana')}<span>Te avisamos antes de cada vencimiento, con el paso siguiente.</span></li>
            <li>${ico('taller')}<span>Calculamos tu cambio de aceite y la vida de tus llantas con tu kilometraje.</span></li>
            <li>${ico('detailing')}<span>Reservas lavado, taller o tecnomecánica y pagas dentro de la app.</span></li>
          </ul>
          <button class="enlace v2-otra" data-a="v2-otra">Consultar otra placa ${ico('chevron')}</button>
        </section>` : ''}
        <p class="t11 v2-nota">Consulta simulada: placas, vencimientos y vehículos son de ejemplo.</p>
      </div>
      <div class="pie-cta v2-bien-pie">
        ${v ? html`<button class="btn btn-acero" data-a="v2-crear">Crear cuenta con ${esMoto(v) ? 'esta moto' : 'este carro'}</button>`
    : html`<button class="btn btn-acero" data-a="v2-consultar" ${crudo(buscando ? 'disabled' : '')}>${buscando ? 'Consultando…' : 'Ver lo que sabe la app'}</button>`}
        <button class="btn v2-ya" data-a="v2-entrar">Ya tengo cuenta ${ico('chevron')}</button>
      </div>`;
    },
    alMontar(el) { prepararPlaca(el); },
    alRefrescar(el) { prepararPlaca(el); const s = estadoBien(); s.dibujar = false; },
  };

  function pasosBien(k) {
    return html`${PASOS_BIEN.map((t, i) => html`<li class="${i < k ? 'hecho' : i === k ? 'actual' : ''}"><i>${i < k ? ico('check') : ''}</i><span>${t}</span></li>`)}`;
  }

  function mostrarError(el, texto) {
    const s = estadoBien();
    s.error = texto || '';
    const ayuda = el && U.$('#v2-placa-ayuda', el);
    const input = el && U.$('#v2-placa', el);
    if (!ayuda || !input) return;
    ayuda.classList.toggle('v2-error', !!texto);
    ayuda.innerHTML = String(texto ? html`${ico('excl')}<span>${texto}</span>` : AYUDA);
    if (texto) input.setAttribute('aria-invalid', 'true'); else input.removeAttribute('aria-invalid');
  }

  let tAuto = null;
  function prepararPlaca(el) {
    const input = U.$('#v2-placa', el);
    if (!input) return;
    input.addEventListener('input', () => {
      const s = estadoBien();
      const p = normPlaca(input.value);
      const txt = p.length > 3 ? `${p.slice(0, 3)} ${p.slice(3)}` : p;
      if (input.value !== txt) input.value = txt;
      s.placa = p;
      if (s.error) mostrarError(el, '');
      clearTimeout(tAuto);
      // Con una placa completa y conocida, la consulta arranca sola (como leer la placa del carro)
      if (p.length === 6 && placaValida(p) && DRS.q.vehiculos().some((x) => x.placa === p)) tAuto = setTimeout(() => consultar(), 350);
    });
    input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); consultar(); } });
  }

  /** Consulta simulada: escanea el plano, marca cuatro pasos y revela el vehículo. */
  async function consultar() {
    const e = tope();
    if (!e || e.ruta !== 'v2-bienvenida') return;
    const s = estadoBien();
    if (s.estado === 'buscando') return;
    const input = U.$('#v2-placa', e.el);
    const p = normPlaca(input ? input.value : s.placa);
    s.placa = p;
    if (!p) { mostrarError(e.el, 'Escribe la placa de tu vehículo.'); if (input) input.focus(); return; }
    if (!placaValida(p)) { mostrarError(e.el, 'Revisa la placa: carro ABC 123, moto ABC 12D.'); return; }
    const v = DRS.q.vehiculos().find((x) => x.placa === p);
    if (!v) { mostrarError(e.el, `Esa placa no está en la demo. Prueba con ${DRS.q.vehiculos().slice(0, 2).map((x) => placaTxt(x.placa)).join(' o ')}.`); return; }
    if (input) input.blur();
    Object.assign(s, { estado: 'buscando', paso: 0, vid: v.id, error: '' });
    DRS.tel.refrescar();
    e.el.scrollTop = 0;
    for (let i = 1; i <= PASOS_BIEN.length; i++) {
      await U.espera(430);
      if (tope() !== e) { s.estado = 'nada'; return; }
      s.paso = i;
      const ol = U.$('[data-v2-pasos]', e.el);
      if (ol) ol.innerHTML = String(pasosBien(i));
    }
    await U.espera(220);
    if (tope() !== e) { s.estado = 'nada'; return; }
    Object.assign(s, { estado: 'listo', dibujar: true });
    DRS.tel.refrescar();
    e.el.scrollTop = 0;
  }

  /** Toca una placa de ejemplo: se escribe sola y consulta. */
  async function ejemplo(placa) {
    const e = tope();
    const input = e && U.$('#v2-placa', e.el);
    if (!input || input.dataset.escribiendo || estadoBien().estado === 'buscando') return;
    input.dataset.escribiendo = '1';
    mostrarError(e.el, '');
    clearTimeout(tAuto);
    input.value = '';
    for (const ch of placaTxt(placa)) { input.value += ch; await U.espera(55); }
    estadoBien().placa = placa;
    delete input.dataset.escribiendo;
    await U.espera(200);
    if (tope() === e) consultar();
  }

  /* ================================================================ Mi carro (inicio) */
  function estadoCirculacion(v) {
    const R = DRS.reloj;
    const hoy = R.hoy();
    if (esMoto(v)) return { estado: 'pos', titulo: 'Sin pico y placa', texto: 'Las motos están exentas en Bogotá' };
    const x = R.picoPlaca(hoy, v);
    if (x.restringido) return { estado: 'neg', titulo: 'Hoy no sale', texto: 'Pico y placa hasta las 9:00 p. m.' };
    const prox = R.proximoRestringido(U.sumarDias(hoy, 1), v);
    return { estado: 'pos', titulo: 'Hoy puedes circular', texto: prox ? `Tu próximo pico y placa: ${U.DIAS[prox.getDay()]} ${prox.getDate()}` : 'Sin pico y placa en las próximas tres semanas' };
  }

  function controles(v) {
    return [
      { t: 'Lavar', ico: 'detailing', attrs: UI.servAttrs('lavaderos') },
      { t: 'Taller', ico: 'taller', attrs: UI.servAttrs('talleres') },
      { t: 'SOAT', ico: 'garantia', attrs: `data-a="soat-iniciar" data-v="${v.id}"` },
      { t: 'Tecno', ico: 'certificado', attrs: UI.servAttrs('tecno') },
      { t: 'Pico y placa', ico: 'calendario', attrs: UI.servAttrs('calendario') },
      { t: 'Informe', ico: 'peritaje', attrs: UI.servAttrs('informe') },
      { t: 'Trámites', ico: 'traspaso', attrs: UI.servAttrs('tramites') },
      { t: 'Catálogo', ico: 'llave', attrs: UI.servAttrs('catalogo') },
    ];
  }

  /** Lo que viene para el vehículo: reservas, pico y placa, vencimientos, mantenimientos y festivos. */
  function loQueViene(v, sis) {
    const R = DRS.reloj;
    const hoy = R.hoy();
    const ev = [];
    const vivas = ['confirmada', 'recibido', 'en_proceso', 'listo'];
    DRS.q.reservasUsuario().filter((r) => r.vehiculo === v.id && r.d >= 0 && vivas.includes(r.estado)).forEach((r) => {
      const c = DRS.q.comercio(r.comercio);
      ev.push({ dias: r.d, ico: 'reservas', estado: 'info', cap: r.estado === 'confirmada' ? 'Reserva' : DRS.estadoInfo(r.estado).nombre,
        titulo: `${r.servicio} en ${c.nombre}`, sub: `${U.horaTxt(r.hora)} · código ${r.id}`, accion: 'Ver reserva', attrs: UI.irAttrs('reserva', { id: r.id }) });
    });
    if (!esMoto(v)) {
      for (let i = 0; i <= 7; i++) {
        const d = U.sumarDias(hoy, i);
        const x = R.picoPlaca(d, v);
        if (!x.restringido) continue;
        ev.push({ dias: i, ico: 'calendario', estado: 'neg', cap: 'Pico y placa',
          titulo: i === 0 ? `Hoy tu ${cual(v)} no sale` : `El ${U.DIAS[d.getDay()]} tu ${cual(v)} no sale`,
          sub: `De 6:00 a. m. a 9:00 p. m. · placa terminada en ${x.digito}`, accion: i === 0 ? 'Dejarlo lavando hoy' : 'Dejarlo lavando ese día', attrs: UI.servAttrs('lavaderos') });
        break;
      }
    }
    const kmDia = num(Math.round(ritmo(v)));
    sis.forEach((s) => {
      let titulo, sub;
      if (s.id === 'soat' || s.id === 'tecno') {
        const vencido = s.dias <= 0;
        const nombre = s.id === 'soat' ? 'el SOAT' : 'la tecnomecánica';
        titulo = `${vencido ? 'Venció' : 'Vence'} ${nombre}`;
        sub = s.id === 'soat' ? `${v.soat.aseguradora} · póliza ${v.soat.poliza}` : `${v.tecno.cda} · certificado ${v.tecno.certificado}`;
      } else if (s.id === 'aceite') {
        titulo = s.faltan <= 0 ? 'Cambio de aceite vencido' : 'Cambio de aceite';
        sub = s.faltan <= 0 ? `Te pasaste por ${num(-s.faltan)} km` : `A los ${num(s.proximoKm)} km · estimado con tu ritmo de ~${kmDia} km al día`;
      } else if (s.id === 'llantas') {
        if (s.estado === 'pos' && s.dias > 365) return;
        titulo = s.faltan <= 0 ? 'Cambio de llantas' : 'Revisar las llantas';
        sub = s.faltan <= 0 ? 'Llegaron al final de su vida estimada' : `Quedan ~${num(redondo(s.faltan))} km · estimado con tu ritmo de uso`;
      } else return;
      ev.push({ dias: Math.max(0, s.dias), estimado: s.estimado, ico: s.ico, estado: s.estado, cap: s.nombre, titulo, sub,
        accion: s.accion.replace(/ SOAT$| tecnomecánica$/, ''), attrs: s.attrs });
    });
    const pu = R.proximoPuente(hoy, 31);
    const promo = DRS.estado.comercios.find((c) => c.promo && c.promo.puente && c.promo.estado !== 'terminada');
    if (pu) {
      ev.push({ dias: Math.max(0, U.diasEntre(hoy, pu.sabado)), ico: 'detailing', estado: 'info', cap: 'Puente festivo',
        titulo: `${pu.nombre}: del ${U.diaMes(pu.sabado)} al ${U.diaMes(pu.lunes)}`,
        sub: promo ? `${DRS.estado.servicios.find((x) => x.id === promo.promo.servicio).nombre} con ${promo.promo.pct} % en ${promo.nombre}` : 'Buen momento para dejarlo lavando',
        accion: 'Reservar', attrs: promo ? UI.irAttrs('comercio', { id: promo.id }) : UI.servAttrs('lavaderos') });
    }
    const orden = { neg: 0, warn: 1, info: 2, pos: 3 };
    return ev.sort((a, b) => a.dias - b.dias || orden[a.estado] - orden[b.estado]);
  }

  function evento(e, i, lista) {
    const d = DRS.reloj.dia(e.dias);
    const repetida = i > 0 && lista[i - 1].dias === e.dias;
    return html`<button class="v2-ev est-${e.estado === 'info' ? 'info' : e.estado}" ${crudo(e.attrs)}>
      <span class="v2-ev-fecha" ${crudo(repetida ? 'aria-hidden="true"' : '')}>${repetida ? '' : html`<span class="cap">${e.dias === 0 ? 'Hoy' : U.DIAS[d.getDay()].slice(0, 3)}</span><b class="d d-26 num">${d.getDate()}</b><span class="cap">${U.MES3[d.getMonth()]}</span>`}</span>
      <span class="v2-ev-eje" aria-hidden="true"><i>${e.estado !== 'info' ? ico(GLIFO[e.estado]) : ''}</i></span>
      <span class="v2-ev-txt">
        <span class="cap">${e.cap}${e.dias > 1 ? ` · en ${e.estimado ? '~' : ''}${diasTxt(e.dias)}` : e.dias === 1 ? ' · mañana' : ''}</span>
        <span class="t13 t-1">${e.titulo}</span>
        <span class="t11">${e.sub}</span>
        <span class="enlace">${e.accion}${ico('chevron')}</span>
      </span>
    </button>`;
  }

  function semana(v, ev) {
    const R = DRS.reloj;
    const hoy = R.hoy();
    const dias = Array.from({ length: 7 }, (_, i) => U.sumarDias(hoy, i));
    const pyp = dias.filter((d) => R.picoPlaca(d, v).restringido);
    const etiqueta = esMoto(v) ? 'Próximos 7 días. Las motos no tienen pico y placa. Ver calendario'
      : pyp.length ? `Próximos 7 días: pico y placa el ${UI.listaY(pyp.map((d) => `${U.DIAS[d.getDay()]} ${d.getDate()}`))}. Ver calendario` : 'Próximos 7 días sin pico y placa. Ver calendario';
    return html`<button class="v2-semana" ${crudo(UI.servAttrs('calendario'))} aria-label="${etiqueta}">
      ${dias.map((d, i) => {
    const x = R.picoPlaca(d, v);
    const algo = ev.some((e) => e.dias === i && e.estado !== 'neg');
    return html`<span class="v2-dia${x.restringido ? ' pyp' : ''}${!x.aplica ? ' libre' : ''}${i === 0 ? ' hoy' : ''}" aria-hidden="true"><span class="cap">${i === 0 ? 'Hoy' : U.DIAS_1[d.getDay()]}</span><b class="d d-20 num">${d.getDate()}</b>${x.restringido ? html`<i class="v2-dia-gl">${ico('cerrar')}</i>` : algo ? html`<i class="v2-dia-punto"></i>` : html`<i></i>`}</span>`;
  })}
    </button>`;
  }

  DRS.pantallas['v2-inicio'] = {
    raiz: true,
    render(p, ctx) {
      const v = DRS.q.vehiculo();
      const nuevo = DRS.tel.ui.v2veh !== v.id;
      DRS.tel.ui.v2veh = v.id;
      const anim = !!(ctx.anim || nuevo);
      const sis = sistemas(v, anim);
      const urg = urgentes(sis);
      const prim = urg[0];
      const circ = estadoCirculacion(v);
      const act = DRS.q.activaUsuario();
      const ev = loQueViene(v, sis);
      const consulta = v.soat.consulta;
      const grupos = [
        ['Hoy y mañana', ev.filter((e) => e.dias <= 1)],
        ['Esta semana', ev.filter((e) => e.dias > 1 && e.dias <= 7)],
        ['Este mes', ev.filter((e) => e.dias > 7 && e.dias <= 31)],
        ['Más adelante', ev.filter((e) => e.dias > 31)],
      ].filter(([, l]) => l.length);
      const llamadas = sis.map((s) => ({
        punto: s.id, fila: s.id === 'llantas' || s.id === 'km' ? 'abajo' : 'arriba', cap: s.cap, valor: s.valorHtml || s.valor,
        estado: s.estado, attrs: s.ver, etiqueta: `${s.nombre}: ${s.etiqueta}, ${s.valor}. Ver detalle`,
      }));
      const titSalud = urg.length === 0 ? `Tu ${cual(v)} está al día` : urg.length === 1 ? 'Una cosa pide atención' : `${urg.length} cosas piden atención`;
      const txtSalud = urg.length === 0 ? 'Nada vence pronto. Te avisamos antes de que algo cambie.' : `${mayus(UI.listaY(urg.map((s) => s.resumen)))}.`;
      return html`${cab(ctx)}<div class="cuerpo v2-inicio">
        <section class="v2-id">
          <div class="ceja">Mi ${cual(v)} · RUNT ${consulta.d === 0 ? 'hoy' : U.fechaCorta(DRS.reloj.dia(consulta.d))}, ${U.horaTxt(consulta.h)}</div>
          <button class="v2-nombre" data-a="hoja-vehiculo" aria-label="${UI.modelo(v)}, placa ${placaTxt(v.placa)}. Cambiar de vehículo">
            <span class="d ${UI.modeloCorto(v).length > 13 ? 'd-34' : 'd-44'}">${UI.modeloCorto(v)}</span><span class="v2-placa">${placaTxt(v.placa)}${ico('abajo')}</span>
          </button>
          <p class="t13">${[v.linea.split(' ').slice(1).join(' '), v.modelo, v.carroceria, v.color].filter(Boolean).join(' · ')}</p>
          <button class="v2-circula" ${crudo(UI.servAttrs('calendario'))}><span class="v2-gl est-${circ.estado}">${ico(GLIFO[circ.estado])}</span><span class="v2-circula-txt"><span class="t13 t-1">${circ.titulo}</span><span class="t11">${circ.texto}</span></span>${ico('chevron', 's16')}</button>
        </section>

        ${escena(v, llamadas, { alto: 316, dibujar: anim, anim, clave: 'v2-inicio', etiqueta: `Plano de tu ${UI.modeloCorto(v)} con el estado de cada sistema` })}
        <div class="v2-escena-pie"><span class="cap">Toca un sistema</span><button class="enlace" ${crudo(UI.irAttrs('garaje'))}>Ficha técnica ${ico('chevron')}</button></div>

        ${act ? html`<section class="v2-bloque v2-bloque-vivo">${enVivo(act)}</section>` : ''}

        <section class="v2-bloque">
          <div class="v2-salud">
            ${anillo(sis, anim)}
            <div><div class="ceja">Estado general</div><h2 class="d d-34">${titSalud}</h2><p class="t13">${txtSalud}</p></div>
          </div>
          ${prim ? html`<button class="btn btn-acero v2-cta" ${crudo(prim.attrs)}>${ico(prim.ico)}${prim.accion}</button>`
    : html`<button class="btn btn-acero v2-cta" ${crudo(UI.servAttrs('lavaderos'))}>${ico('detailing')}Reservar lavado</button>`}
        </section>

        <section class="v2-bloque">
          <div class="v2-bloque-cab"><h2 class="d d-26">Controles</h2><button class="enlace" data-a="tab" data-tab="v2-servicios">Todos los servicios ${ico('chevron')}</button></div>
          <div class="v2-controles">${controles(v).map((c) => html`<button class="v2-control" ${crudo(c.attrs)}>${ico(c.ico)}<span class="cap">${c.t}</span></button>`)}</div>
        </section>

        <section class="v2-bloque">
          <div class="v2-bloque-cab"><div><h2 class="d d-26">Lo que viene</h2><p class="t13">Cada punto trae su siguiente paso.</p></div></div>
          ${semana(v, ev)}
          ${grupos.map(([t, l]) => html`<div class="v2-evs"><div class="ceja v2-evs-tit">${t}</div>${l.map(evento)}</div>`)}
        </section>
        <p class="t11 v2-nota">Datos de ejemplo. La consulta al RUNT y las estimaciones de uso son simuladas.</p>
      </div>`;
    },
  };

  /* ================================================================ Servicios, por necesidad */
  const NECESIDADES = [['aceite', 'Cambio de aceite'], ['frenos', 'Frenos'], ['alineacion', 'Alineación y balanceo'], ['suspension', 'Suspensión'], ['diagnostico', 'Diagnóstico'], ['pretecno', 'Prepararlo para la tecno']];

  function fila(it) {
    return html`<button class="fila v2-fila" ${crudo(it.attrs)}>
      <span class="fila-ico">${ico(it.ico)}</span>
      <span class="v2-fila-txt"><span class="t13">${it.t}</span><span class="t11">${it.s}</span></span>
      <span class="v2-fila-fin">${it.chip || ''}${ico('chevron', 's16')}</span>
    </button>`;
  }

  DRS.pantallas['v2-servicios'] = {
    raiz: true,
    render(p, ctx) {
      const v = DRS.q.vehiculo();
      const u = DRS.q.usuario();
      const sis = sistemas(v);
      const urg = urgentes(sis).filter((s) => s.id !== 'km').concat(urgentes(sis).filter((s) => s.id === 'km'));
      const so = sis.find((s) => s.id === 'soat'), te = sis.find((s) => s.id === 'tecno');
      const promos = DRS.estado.comercios.filter((c) => c.tipo === 'lavadero').flatMap((c) => [c.promo, ...(c.promos || [])]).filter((x) => x && x.estado !== 'terminada');
      const maxPct = promos.reduce((a, x) => Math.max(a, x.pct || 0), 0);
      const cot = DRS.tel.ui.cot && (DRS.tel.ui.cot.respuestas || []).length;
      const grupos = [
        { n: '01', t: 'Limpieza', lema: 'Que se vea como nuevo.', filas: [
          { ico: 'detailing', t: 'Lavaderos cerca de ti', s: 'Sencillo, completo, de motor, polichado o cojinería. Pagas en la app.', attrs: UI.servAttrs('lavaderos'), chip: maxPct ? html`<span class="chip chip-lleno">Hasta −${maxPct} %</span>` : '' },
        ] },
        { n: '02', t: 'Mecánica', lema: 'Que ande como debe.', fichas: NECESIDADES, filas: [
          { ico: 'taller', t: 'Talleres aliados', s: 'Compara precio, calificación y cercanía. Lo que hagas queda verificado.', attrs: UI.servAttrs('talleres') },
          ...(cot ? [{ ico: 'documento', t: 'Tus cotizaciones', s: `${cot} ${cot === 1 ? 'respuesta' : 'respuestas'} de talleres`, attrs: UI.irAttrs('cotizaciones') }] : []),
        ] },
        { n: '03', t: 'Papeles', lema: 'Que no te paren.', filas: [
          { ico: 'garantia', t: 'SOAT', s: `${mayus(so.resumen)}. Renuévalo con una aseguradora aliada.`, attrs: `data-a="soat-iniciar" data-v="${v.id}"`, chip: UI.chipEstado(so.estado, so.etiqueta) },
          { ico: 'certificado', t: 'Tecnomecánica', s: `${mayus(te.resumen)}. Agenda en un CDA aliado.`, attrs: UI.servAttrs('tecno'), chip: UI.chipEstado(te.estado, te.etiqueta) },
          { ico: 'traspaso', t: 'Trámites en Bogotá', s: 'Traspasos y levantamiento de prenda, con cotización previa.', attrs: UI.servAttrs('tramites') },
          { ico: 'calendario', t: 'Pico y placa', s: esMoto(v) ? 'Las motos no tienen pico y placa en Bogotá.' : `Calendario del mes para tu placa terminada en ${DRS.reloj.picoPlaca(DRS.reloj.hoy(), v).digito}.`, attrs: UI.servAttrs('calendario') },
        ] },
        { n: '04', t: 'Compra y venta', lema: 'Antes de cerrar un negocio.', filas: [
          { ico: 'peritaje', t: 'Informe vehicular', s: 'Dueños, prendas, siniestros y precio de mercado de un usado. Vista previa gratis.', attrs: UI.servAttrs('informe') },
          { ico: 'llave', t: 'Catálogo DRS Motors', s: 'Carros y motos en venta, revisados por DRS.', attrs: UI.servAttrs('catalogo') },
        ] },
        { n: '05', t: 'Beneficios', lema: 'Lo que ganas por usarla.', filas: [
          { ico: 'beneficios', t: `${num(u.puntos)} puntos DRS`, s: `${u.meta.nombre}. Llevas ${u.meta.hechos} de ${u.meta.total}.`, attrs: UI.servAttrs('beneficios') },
        ] },
      ];
      return html`${cab(ctx)}<div class="cuerpo v2-serv">
        <div class="titulo"><div class="ceja">Servicios · por necesidad</div><h1 class="d d-44">¿Qué necesita tu ${cual(v)}?</h1></div>
        ${urg.length ? html`<section class="v2-ahora">
          <div class="ceja">Para tu ${UI.modeloCorto(v)}, ahora</div>
          ${urg.slice(0, 3).map((s, i) => html`<div class="v2-ahora-fila">
            ${crudo(DRS.bp.tacometro(s.id === 'km' ? 0.2 : s.p, s.estado, s.ico, { anima: !!ctx.anim }))}
            <div class="v2-ahora-txt"><span class="etq">${s.nombre}</span><span class="t13">${mayus(s.resumen)}.</span></div>
            <button class="btn btn-chico ${i === 0 ? 'btn-acero' : 'btn-borde'}" ${crudo(s.attrs)}>${s.accion.replace(/^(Cotizar|Agendar|Renovar|Actualizar) .*/, '$1')}</button>
          </div>`)}
        </section>` : html`<div class="aviso-caja v2-al-dia">${ico('check')}<span>Tu ${cual(v)} está al día: nada vence pronto. Aquí tienes todo lo demás.</span></div>`}
        ${grupos.map((g) => html`<section class="v2-grupo">
          <div class="v2-grupo-cab"><span class="d d-34 num v2-grupo-n">${g.n}</span><div><h2 class="etq">${g.t}</h2><p class="t13">${g.lema}</p></div></div>
          ${g.fichas ? html`<div class="v2-fichas" role="group" aria-label="Pedir cotización por necesidad">${g.fichas.map(([k, t]) => html`<button class="v2-ficha" ${crudo(UI.irAttrs('cotizar', { v: v.id, necesidad: k }))}>${t}</button>`)}</div>` : ''}
          <div class="lista">${g.filas.map(fila)}</div>
        </section>`)}
      </div>`;
    },
  };

  /* ================================================================ Actividad: la bitácora */
  const FILTROS = [['todo', 'Todo'], ['reservas', 'Reservas'], ['mant', 'Mantenimiento'], ['pagos', 'Pagos']];
  const ICO_MANT = { aceite: 'taller', lavado: 'detailing', tecno: 'certificado', llantas: 'llanta', frenos: 'taller', bateria: 'taller', otro: 'editar' };
  const CHIP_RES = {
    confirmada: ['chip-luz', null, 'Confirmada'], recibido: ['chip-luz', null, 'Recibido'], en_proceso: ['chip-luz', null, 'En proceso'],
    listo: ['chip-pos', 'check', 'Listo'], finalizada: ['', null, 'Finalizada'], cancelada: ['chip-neg', 'cerrar', 'Cancelada'],
  };

  function registros(filtro) {
    const out = [];
    const rs = DRS.q.reservasUsuario();
    const pagos = DRS.estado.pagos || [];
    const hora = (h) => (h ? U.aMin(h) : 0);
    if (filtro === 'todo' || filtro === 'reservas') {
      rs.forEach((r) => {
        const c = DRS.q.comercio(r.comercio);
        const v = DRS.q.vehiculo(r.vehiculo);
        out.push({ d: r.d, h: r.hora, ico: c.tipo === 'taller' ? 'taller' : c.tipo === 'cda' ? 'certificado' : 'detailing', titulo: r.servicio,
          sub: `${c.nombre} · ${v ? UI.modeloCorto(v) : placaTxt(r.placa)} · ${U.horaTxt(r.hora)}`, chip: CHIP_RES[r.estado], monto: r.total,
          attrs: UI.irAttrs('reserva', { id: r.id }) });
      });
    }
    if (filtro === 'todo' || filtro === 'mant') {
      DRS.estado.mantenimientos.forEach((m) => {
        // En «Todo», el lavado que ya aparece como reserva no se repite
        if (filtro === 'todo' && (m.reserva || (m.tipo === 'lavado' && rs.some((r) => r.vehiculo === m.vehiculo && r.d === m.d)))) return;
        const v = DRS.q.vehiculo(m.vehiculo);
        out.push({ d: m.d, h: null, ico: ICO_MANT[m.tipo] || 'taller', titulo: m.titulo,
          sub: `${m.lugar} · ${v ? UI.modeloCorto(v) : ''} · ${num(m.km)} km`, sello: m.cert, monto: m.costo || null,
          attrs: ['aceite', 'llantas'].includes(m.tipo) ? UI.irAttrs('mantenimiento', { v: m.vehiculo, tipo: m.tipo }) : UI.irAttrs('garaje') });
      });
    }
    if (filtro === 'todo' || filtro === 'pagos') {
      pagos.forEach((p) => {
        if (filtro === 'todo' && p.rel && rs.some((r) => r.id === p.rel)) return;   // el pago de una reserva va con la reserva
        out.push({ d: p.d, h: p.h, ico: p.tipo === 'soat' ? 'garantia' : p.tipo === 'informe' ? 'peritaje' : p.tipo === 'tecno' ? 'certificado' : 'pago',
          titulo: p.concepto, sub: `${p.medio} · ${p.ref}`, monto: p.total, attrs: `data-a="pf-comprobante" data-id="${p.id}"` });
      });
    }
    return out.sort((a, b) => b.d - a.d || hora(b.h) - hora(a.h));
  }

  function registro(x) {
    const fecha = x.d === 0 ? 'Hoy' : x.d === 1 ? 'Mañana' : x.d === -1 ? 'Ayer' : U.diaMes(DRS.reloj.dia(x.d));
    return html`<button class="v2-reg" ${crudo(x.attrs)}>
      <span class="fila-ico">${ico(x.ico)}</span>
      <span class="v2-reg-txt"><span class="t13 t-1">${x.titulo}</span><span class="t11">${x.sub}</span>
        ${x.chip ? html`<span class="chip ${x.chip[0]}">${x.chip[1] ? ico(x.chip[1]) : ''}${x.chip[2]}</span>` : ''}
        ${x.sello === true ? html`<span class="chip chip-luz">${ico('verificado')}Verificado por DRS</span>` : x.sello === false ? html`<span class="chip">${ico('editar')}Registrado por ti</span>` : ''}</span>
      <span class="v2-reg-der">${x.monto ? html`<span class="d d-20 num">${pesos(x.monto)}</span>` : ''}<span class="cap">${fecha}</span></span>
    </button>`;
  }

  DRS.pantallas['v2-actividad'] = {
    raiz: true,
    render(p, ctx) {
      const filtro = DRS.tel.ui.v2filtro || 'todo';
      const rs = DRS.q.reservasUsuario();
      const act = DRS.q.activaUsuario();
      const pagado = (DRS.estado.pagos || []).reduce((a, x) => a + x.total, 0);
      const verificados = DRS.estado.mantenimientos.filter((m) => m.cert).length;
      const lista = registros(filtro);
      const grupos = [
        ['Próximo', lista.filter((x) => x.d > 0)],
        ['Hoy', lista.filter((x) => x.d === 0)],
        ['Esta semana', lista.filter((x) => x.d < 0 && x.d >= -7)],
        ['Este mes', lista.filter((x) => x.d < -7 && x.d >= -31)],
        ['Antes', lista.filter((x) => x.d < -31)],
      ].filter(([, l]) => l.length);
      const cot = DRS.tel.ui.cot && (DRS.tel.ui.cot.respuestas || []).length;
      const vacio = { todo: 'Aún no hay actividad.', reservas: 'Aún no tienes reservas.', mant: 'Aún no hay mantenimientos registrados.', pagos: 'Aún no hay pagos en la app.' }[filtro];
      return html`${cab(ctx)}<div class="cuerpo v2-act">
        <div class="titulo"><div class="ceja">Bitácora de tus vehículos</div><h1 class="d d-44">Actividad</h1></div>
        <div class="v2-cifras">
          <div><span class="d d-34 num">${rs.length}</span><span class="cap">Reservas</span></div>
          <div><span class="d d-34 num">${verificados}</span><span class="cap">Verificados por DRS</span></div>
          <div><span class="d d-20 num">${pesos(pagado)}</span><span class="cap">Pagado en la app</span></div>
        </div>
        ${act ? html`<div class="v2-bloque-vivo">${enVivo(act)}</div>` : ''}
        <div class="v2-filtros" role="tablist" aria-label="Filtrar la actividad">${FILTROS.map(([k, t]) => html`<button role="tab" aria-selected="${k === filtro ? 'true' : 'false'}" data-a="v2-filtro" data-k="${k}">${t}</button>`)}</div>
        ${grupos.length ? grupos.map(([t, l]) => html`<section class="v2-regs"><div class="ceja">${t}</div><div class="lista">${l.map(registro)}</div></section>`)
    : html`<div class="vacio"><div class="d d-26">${vacio}</div><p class="t13">Lo que hagas en la app queda aquí, en orden.</p></div>`}
        <section class="v2-regs"><div class="ceja">Más</div><div class="lista">
          ${fila({ ico: 'reservas', t: 'Todas las reservas', s: 'Próximas, en curso e historial', attrs: UI.irAttrs('reservas') })}
          ${fila({ ico: 'campana', t: 'Notificaciones', s: `${DRS.q.noLeidas()} sin leer`, attrs: UI.irAttrs('notificaciones') })}
          ${fila({ ico: 'documento', t: 'Pagos y comprobantes', s: `${(DRS.estado.pagos || []).length} pagos · ${pesos(pagado)}`, attrs: UI.irAttrs('perfil-pagos') })}
          ${cot ? fila({ ico: 'taller', t: 'Cotizaciones de talleres', s: `${cot} ${cot === 1 ? 'respuesta' : 'respuestas'}`, attrs: UI.irAttrs('cotizaciones') }) : ''}
        </div></section>
      </div>`;
    },
  };

  /* ================================================================ Perfil: el compartido, como pestaña */
  // Usa la pantalla «perfil» tal cual; solo cambia su encabezado de detalle por el de la pestaña y
  // lleva «Mis vehículos» y «Mis reservas» a las piezas de esta demo. Si el marcado cambia, se ve el original.
  DRS.pantallas['v2-perfil'] = {
    raiz: true,
    render(p, ctx) {
      const base = String(DRS.pantallas.perfil.render(p, ctx));
      const sin = base.replace(/^\s*<header class="cab cab-det">[\s\S]*?<\/header>/, '');
      if (sin === base) return crudo(base);
      return html`${cab(ctx)}${crudo(sin
        .replace('data-a="tab" data-tab="garaje"', 'data-a="ir" data-ruta="garaje"')
        .replace('data-a="tab" data-tab="reservas"', 'data-a="tab" data-tab="v2-actividad"'))}`;
    },
  };

  /* ================================================================ acciones */
  Object.assign(DRS.acciones, {
    'v2-consultar': () => consultar(),
    'v2-placa-ej': (d) => ejemplo(d.placa),
    'v2-otra': () => {
      const s = estadoBien();
      Object.assign(s, { placa: '', estado: 'nada', paso: 0, vid: null, error: '' });
      DRS.tel.refrescar();
      const e = tope();
      const input = e && U.$('#v2-placa', e.el);
      if (input) input.focus();
    },
    /** Crear cuenta: registro compartido. Si ya consultó la placa del registro, el paso 4 llega resuelto. */
    'v2-crear': () => {
      const s = estadoBien();
      DRS.tel.ui.reg = null;
      DRS.tel.ir('registro-cel');
      const reg = DRS.tel.ui.reg;
      if (reg && s.estado === 'listo' && s.vid === 'v1') { reg.consulta = 'listo'; reg.paso = 3; }
    },
    /** Ya tengo cuenta: entra con el vehículo que consultó, si consultó uno. */
    'v2-entrar': () => {
      const s = estadoBien();
      if (s.estado === 'listo' && s.vid && DRS.estado.vehiculoActivo !== s.vid && DRS.q.vehiculo(s.vid)) DRS.acc.vehiculoActivar(s.vid);
      DRS.tel.tabIr(DRS.variante ? DRS.variante.inicio : 'inicio');
    },
    'v2-filtro': (d) => { DRS.tel.ui.v2filtro = d.k; DRS.tel.refrescar(); },
  });

  /* ================================================================ registro de la demo */
  DRS.variantes.v2 = {
    id: 'v2',
    numero: 2,
    nombre: 'Mi carro',
    lema: 'Tu carro es la app.',
    descripcion: 'Empieza por la placa. El inicio es el plano de tu carro con el estado de cada sistema, la acción más urgente y lo que viene. Las secciones se abren con un botón +.',
    bienvenida: 'v2-bienvenida',
    inicio: 'v2-inicio',
    tabs: [
      { id: 'v2-inicio', nombre: 'Mi carro', ico: 'carro' },
      { id: 'v2-servicios', nombre: 'Servicios', ico: 'servicios' },
      { id: 'v2-actividad', nombre: 'Actividad', ico: 'horario' },
      { id: 'v2-perfil', nombre: 'Perfil', ico: 'perfil' },
    ],
    fab: null,
    nav: 'mas',                                              // botón + abajo a la derecha (ver js/app/tel.js)
    masExtra: { nombre: 'Lavar', etiqueta: 'Reservar lavado', ico: 'detailing', ruta: 'explorar', p: { tipo: 'lavadero' } },
    clase: 'var-v2',
    /** Plano de la propuesta: el carro grande con sus llamadas, el anillo, la acción y el botón + abajo a la derecha. */
    plano: () => `<svg viewBox="0 0 120 200" aria-hidden="true" class="plano-demo">
      <rect x="1" y="1" width="118" height="198" class="pd-marco"/>
      <rect x="10" y="10" width="26" height="5" class="pd-txt"/><rect x="101" y="8" width="9" height="9" class="pd-linea"/>
      <rect x="10" y="22" width="40" height="9" class="pd-txt"/><rect x="54" y="23" width="20" height="7" class="pd-linea"/>
      <rect x="1" y="37" width="118" height="80" class="pd-linea"/>
      <rect x="6" y="41" width="33" height="12" class="pd-linea"/><rect x="43" y="41" width="33" height="12" class="pd-linea"/><rect x="81" y="41" width="33" height="12" class="pd-linea"/>
      <path d="M22 53v4l14 13M60 53v4l-3 13M97 53v4l-6 22" class="pd-trazo"/>
      <path d="M12 94h96M17 91v-7l5-3c5-1 12-2 20-2l9-8c2-2 5-3 8-3h15c3 0 5 1 7 3l7 8c8 1 13 3 17 5l2 7" class="pd-trazo"/>
      <circle cx="35" cy="91" r="6" class="pd-trazo"/><circle cx="87" cy="91" r="6" class="pd-trazo"/>
      <rect x="10" y="102" width="46" height="11" class="pd-linea"/><rect x="64" y="102" width="46" height="11" class="pd-linea"/>
      <path d="M33 102v-4l2-7M87 102v-4l0-7" class="pd-trazo"/>
      <circle cx="21" cy="132" r="9" class="pd-trazo"/><rect x="36" y="127" width="50" height="5" class="pd-txt"/><rect x="36" y="136" width="36" height="3" class="pd-linea"/>
      <rect x="10" y="147" width="100" height="11" class="pd-acento"/>
      <path d="M16 165v13" class="pd-trazo"/><rect x="13.5" y="164" width="5" height="5" class="pd-linea"/><rect x="13.5" y="174" width="5" height="5" class="pd-linea"/>
      <rect x="24" y="165" width="46" height="3" class="pd-txt"/><rect x="24" y="175" width="38" height="3" class="pd-txt"/>
      <rect x="94" y="178" width="17" height="17" class="pd-acento"/><path d="M102.5 182v9M98 186.5h9" class="pd-sobre"/>
    </svg>`,
  };
})();
