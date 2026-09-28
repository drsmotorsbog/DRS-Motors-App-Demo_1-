/* DRS Motors · demo — explorar en el mapa, perfil del comercio, reservar, cómo llegar y cotizar
   El mapa de Bogotá lo dibuja js/mapa.js (DRS.mapa). Aquí van los marcadores con precio,
   el orden por precio / calificación / cercanía, el carrusel sincronizado, el zoom y la ruta. */
(function () {
  'use strict';
  const DRS = window.DRS;
  const U = DRS.util;
  const UI = DRS.ui;
  const { html, crudo, ico, num, pesos, placaTxt } = U;

  const TIPOS = {
    lavadero: { titulo: 'Lavaderos', uno: 'Lavadero', ico: 'detailing' },
    taller: { titulo: 'Talleres', uno: 'Taller', ico: 'taller' },
    cda: { titulo: 'Tecnomecánica', uno: 'Centro de diagnóstico automotor', ico: 'certificado' },
  };
  const tipoVeh = (v) => (v.tipo === 'moto' ? 'moto' : 'automovil');
  const redondear = (n) => Math.round(n / 100) * 100;
  const horaAhora = () => { const a = DRS.reloj.ahora(); return U.deMin(a.getHours() * 60 + a.getMinutes()); };

  /* ================================================================ precios */
  function servicios(c, v) {
    const t = tipoVeh(v);
    if (c.tipo === 'lavadero') return DRS.estado.servicios.filter((s) => s.precio[t]).map((s) => ({ id: s.id, nombre: s.nombre, desc: s.desc, min: s.min, valor: s.precio[t] }));
    if (c.tipo === 'taller') return DRS.estado.serviciosTaller.map((s) => ({ id: s.id, nombre: s.nombre, desc: s.desc, min: s.min, valor: s.desde ? Math.round((s.desde * (c.factor || 1)) / 1000) * 1000 : null }));
    const base = c.precio[t] || c.precio.automovil;
    return [{ id: 'rtm', nombre: 'Revisión técnico-mecánica y de emisiones', desc: `Certificado al instante en el RUNT. Precio DRS con ${Math.round(c.drs * 100)} % de descuento.`, min: 60, valor: redondear(base * (1 - c.drs)), antes: base }];
  }
  /** Promo que aplica a un servicio en un día y franja (lavaderos). */
  function promoDe(c, servicioId, dia, hhmm) {
    const promos = [c.promo, ...(c.promos || [])].filter((p) => p && p.estado !== 'terminada');
    return promos.find((p) => {
      if (p.servicio && p.servicio !== servicioId) return false;
      if (!dia) return true;
      const dow = dia.getDay();
      const dias = p.puente ? null : Array.isArray(p.diasSemana) ? p.diasSemana : p.dias && p.dias.includes('martes a jueves') ? [2, 3, 4] : p.dias && p.dias.includes('lunes a miércoles') ? [1, 2, 3] : null;
      if (p.puente) return DRS.reloj.esFestivo(U.sumarDias(dia, (8 - dow) % 7)) && [6, 0, 1].includes(dow);
      if (dias && !dias.includes(dow)) return false;
      if (!hhmm) return true;
      if (p.ini && p.fin) { const mm = U.aMin(hhmm); return mm >= U.aMin(p.ini) && mm < U.aMin(p.fin); }
      const m = U.aMin(hhmm);
      const fr = p.franja && p.franja.match(/(\d+):?(\d*)\s*a\s*(\d+):?(\d*)\s*([ap])/);
      if (!fr) return true;
      let i = Number(fr[1]) * 60 + Number(fr[2] || 0), f = Number(fr[3]) * 60 + Number(fr[4] || 0);
      if (fr[5] === 'p' && Number(fr[1]) < 12) { i += 720; f += 720; }
      return m >= i && m < f;
    }) || null;
  }
  function precioDesde(c, v) {
    const ss = servicios(c, v).filter((s) => s.valor);
    const min = ss.reduce((a, s) => (s.valor < a.valor ? s : a), ss[0]);
    if (c.tipo === 'lavadero') {
      const pr = promoDe(c, min.id);
      if (pr) return { valor: redondear(min.valor * (1 - pr.pct / 100)), antes: min.valor, etiqueta: `−${pr.pct} %`, promo: pr };
      return { valor: min.valor };
    }
    if (c.tipo === 'cda') return { valor: min.valor, antes: min.antes, etiqueta: 'Precio DRS' };
    return { valor: min.valor };
  }

  /** Con «reducir movimiento» en el sistema, el mapa salta en vez de animarse. */
  const reducido = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  /* ================================================================ mapa */
  const MAPA = { cache: null };
  const W = () => (DRS.mapa && DRS.mapa.W) || 1400;
  const H = () => (DRS.mapa && DRS.mapa.H) || 2600;
  const pt = (pos) => (DRS.mapa && DRS.mapa.pt ? DRS.mapa.pt(pos[0], pos[1]) : [(130 - pos[1]) * 10, (205 - pos[0]) * 10]);
  const uKm = () => { const a = pt([100, 10]), b = pt([100, 20]); return Math.hypot(a[0] - b[0], a[1] - b[1]) || 100; };
  /** redondea x a pasos parejos en escala logarítmica (n pasos por cada factor e) */
  const escalon = (x, n) => Math.exp(Math.round(Math.log(x) * n) / n);
  function baseSvg() {
    if (!MAPA.cache) {
      MAPA.cache = DRS.mapa && DRS.mapa.svg ? DRS.mapa.svg({ detalle: 'alto', clase: 'exp-base' })
        : `<svg viewBox="0 0 ${W()} ${H()}" class="exp-base"><rect width="100%" height="100%" fill="var(--sup-2)"/></svg>`;
    }
    return MAPA.cache;
  }

  /**
   * Monta un mapa interactivo dentro de el (un div de tamaño fijo).
   * cfg: { lugares: [{ id, pos, etq, promo }], sel, yo: pos, ruta: [[x,y]] (unidades del mapa),
   *        vista: {s,tx,ty} para restaurar, ajustar: [pos] para encuadrar, alPin(id), alMover(vista), interactivo }
   * La vista nunca sale del lienzo (Bogotá entera y sus alrededores): alejado al máximo, el mapa
   * llena la pantalla justo, sin bordes vacíos. (cfg.alejar ya no aplica: el lienzo alcanza.)
   * cfg.tapa: { arriba, abajo } px que tapa una pieza OPACA (el panel de la ruta, la hoja de la Demo 3),
   * o una función que los devuelve: el borde del lienzo puede entrar ahí, así todo el mapa se alcanza a ver.
   */
  function crearMapa(el, cfg) {
    el.innerHTML = `<div class="exp-lienzo" style="width:${W()}px;height:${H()}px">${baseSvg()}</div><svg class="exp-sobre" aria-hidden="true"></svg><div class="exp-pines"></div>`;
    const lienzo = el.querySelector('.exp-lienzo');
    const sobre = el.querySelector('.exp-sobre');
    const capa = el.querySelector('.exp-pines');
    const vw = () => el.clientWidth || 393, vh = () => el.clientHeight || 760;
    let v = cfg.vista ? { ...cfg.vista } : null;
    let sel = cfg.sel || null;
    let rutaDibujada = 1;

    const tapa = () => (typeof cfg.tapa === 'function' ? cfg.tapa() : cfg.tapa) || {};
    const tA = () => Math.max(0, tapa().arriba || 0), tB = () => Math.max(0, tapa().abajo || 0);
    const sMin = () => Math.max(vw() / W(), (vh() - tA() - tB()) / H());
    const sMax = () => Math.max(sMin(), vw() / (0.6 * uKm()));
    // La vista queda siempre dentro del lienzo: ni al alejar ni al arrastrar se ve espacio vacío
    // (solo bajo una pieza opaca, cfg.tapa, puede quedar fuera, porque ahí no se ve).
    function limitar() {
      v.s = Math.min(sMax(), Math.max(sMin(), v.s));
      v.tx = Math.min(0, Math.max(vw() - W() * v.s, v.tx));
      v.ty = Math.min(tA(), Math.max(vh() - tB() - H() * v.s, v.ty));
    }
    // arriba: lo que tapa la cabecera; derecha: lo que tapan los botones de zoom
    const arriba = cfg.arriba != null ? cfg.arriba : 130, derecha = cfg.derecha || 0;
    function encuadrar(poses, abajo = 0.34) {
      const xs = poses.map((p) => pt(p));
      const x0 = Math.min(...xs.map((a) => a[0])), x1 = Math.max(...xs.map((a) => a[0]));
      const y0 = Math.min(...xs.map((a) => a[1])), y1 = Math.max(...xs.map((a) => a[1]));
      const pad = 1.2 * uKm();
      const anchoUtil = vw() - derecha;
      const altoUtil = vh() * (1 - abajo) - arriba - 20;
      // la escala se limita antes de centrar: si el trayecto no cabe ni alejado al máximo, queda centrado igual
      const s = Math.max(sMin(), Math.min(anchoUtil / (x1 - x0 + pad * 2), altoUtil / (y1 - y0 + pad * 2), sMax()));
      v = { s, tx: anchoUtil / 2 - ((x0 + x1) / 2) * s, ty: arriba + altoUtil / 2 - ((y0 + y1) / 2) * s };
    }
    if (!v) {
      if (cfg.ajustar && cfg.ajustar.length > 1) encuadrar(cfg.ajustar, cfg.abajo);
      else { const c = pt(cfg.centro || cfg.yo || DRS.estado.casa.pos); const s = vw() / ((cfg.kmAncho || 5.5) * uKm()); v = { s, tx: (vw() - derecha) / 2 - c[0] * s, ty: vh() * (cfg.alto || 0.36) - c[1] * s }; }
    }

    // Marcadores (HTML: nítidos y tocables)
    const lugares = cfg.lugares || [];
    capa.innerHTML = String(html`${lugares.map((l) => html`<button class="mapa-pin${l.id === sel ? ' sel' : ''}${l.promo ? ' con-promo' : ''}" data-pin="${l.id}" aria-label="${l.nombre || l.id}: ${l.etq}"><span>${l.promo ? html`<i class="mapa-pin-promo">%</i>` : ''}${l.etq}</span></button>`)}
      ${cfg.yo ? html`<span class="mapa-yo" aria-label="Tu ubicación"><i></i><b>${cfg.yoTxt || 'Casa'}</b></span>` : ''}
      ${cfg.destino ? html`<span class="mapa-destino" aria-hidden="true"><i>${ico(cfg.destinoIco || 'ubicacion')}</i></span>` : ''}`);
    const pines = [...capa.querySelectorAll('.mapa-pin')];
    const yo = capa.querySelector('.mapa-yo');
    const destino = capa.querySelector('.mapa-destino');

    const base = lienzo.querySelector('svg');
    const lejos = base ? [...base.querySelectorAll('.m-et-l1, .m-et-l2')] : [];
    let kAntes = '', kvAntes = '', nivelAntes = '';
    function pintar() {
      lienzo.style.transform = `translate(${v.tx}px, ${v.ty}px) scale(${v.s})`;
      // Al acercar, las etiquetas conservan su tamaño en pantalla y las vías engordan con moderación (css/mapa.css).
      // Al alejar, las etiquetas del plano no se agrandan (sus choques se calcularon a escala 1): por debajo de
      // ≈0,6 el SVG cambia a las de conjunto (localidades, municipios), de tamaño fijo en pantalla (--mapa-s),
      // y los trazos engruesan hasta el doble para que la ciudad se siga leyendo. Solo se escribe lo que cambia,
      // y en escalones de ≈4 % (texto) y ≈6 % (trazos): durante el pellizco el SVG se repinta mucho menos.
      if (base) {
        const k = escalon(Math.max(1, v.s), 24).toFixed(3), kv = escalon(v.s >= 1 ? Math.sqrt(v.s) : Math.max(0.5, Math.sqrt(v.s)), 16).toFixed(3);
        if (k !== kAntes) { base.style.setProperty('--mapa-k', k); kAntes = k; }
        if (kv !== kvAntes) { base.style.setProperty('--mapa-kv', kv); kvAntes = kv; }
        const n = DRS.mapa && DRS.mapa.nivel ? DRS.mapa.nivel(v.s) : '';
        if (n !== nivelAntes) { if (nivelAntes) base.classList.remove(nivelAntes); if (n) base.classList.add(n); nivelAntes = n; }
        if (n) lejos.forEach((g) => g.style.setProperty('--mapa-s', v.s.toFixed(4)));
      }
      const a = (pos) => { const [x, y] = pt(pos); return [v.tx + x * v.s, v.ty + y * v.s]; };
      pines.forEach((b, i) => { const [x, y] = a(lugares[i].pos); b.style.transform = `translate(${x}px, ${y}px)`; });
      if (yo) { const [x, y] = a(cfg.yo); yo.style.transform = `translate(${x}px, ${y}px)`; }
      if (destino) { const [x, y] = a(cfg.destino); destino.style.transform = `translate(${x}px, ${y}px)`; }
      if (cfg.ruta && cfg.ruta.length) {
        const pts = cfg.ruta.map(([x, y]) => `${(v.tx + x * v.s).toFixed(1)},${(v.ty + y * v.s).toFixed(1)}`).join(' ');
        sobre.innerHTML = `<polyline points="${pts}" class="ruta-casco"/><polyline points="${pts}" class="ruta-linea" pathLength="1" style="stroke-dasharray:1 1;stroke-dashoffset:${1 - rutaDibujada}"/>`;
        if (cfg.movil != null) {
          const pl = sobre.querySelector('.ruta-linea');
          const L = pl.getTotalLength();
          const q = pl.getPointAtLength(L * cfg.movil);
          sobre.insertAdjacentHTML('beforeend', `<rect x="${(q.x - 7).toFixed(1)}" y="${(q.y - 7).toFixed(1)}" width="14" height="14" class="ruta-movil"/>`);
        }
      }
      if (cfg.alMover) cfg.alMover(v);
    }
    limitar();
    pintar();

    // Arrastrar con un dedo (o el mouse), pellizcar con dos, doble toque para acercar; rueda y botones en computador.
    // Las coordenadas se pasan a píxeles del celular: en computador el iPhone está escalado (--k).
    const dedos = new Map();
    let gesto = null, toque = null, ultimoToque = null, animacion = 0;
    const local = (x, y) => { const r = el.getBoundingClientRect(); const k = r.width / vw() || 1; return [(x - r.left) / k, (y - r.top) / k]; };
    function iniciarGesto() {
      const ps = [...dedos.values()];
      if (ps.length >= 2) {
        const [a, b] = ps.map((q) => local(q.x, q.y));
        gesto = { tipo: 'pellizco', d0: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, cx: (a[0] + b[0]) / 2, cy: (a[1] + b[1]) / 2, v0: { ...v } };
      } else if (ps.length === 1) {
        const [a] = ps.map((q) => local(q.x, q.y));
        gesto = { tipo: 'mover', x: a[0], y: a[1], tx: v.tx, ty: v.ty };
      } else gesto = null;
    }
    // Un dedo que cae sobre un pin también cuenta para arrastrar o pellizcar (alejado, los pines se juntan):
    // no se captura, para que el toque siga llegando al pin; si el dedo se movió, ese toque no abre el pin.
    let arrastro = false, finArrastre = 0, inicio = null;
    el.addEventListener('pointerdown', (e) => {
      const enPin = !!e.target.closest('.mapa-pin');
      animacion++;                                   // el dedo manda: corta cualquier viaje animado del mapa
      if (!dedos.size) { arrastro = false; inicio = { x: e.clientX, y: e.clientY }; }
      dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (!enPin) { try { el.setPointerCapture(e.pointerId); } catch (_) { /* puntero ya liberado */ } }
      el.classList.add('moviendo');
      toque = dedos.size === 1 && !enPin ? { x: e.clientX, y: e.clientY, t: Date.now() } : null;
      iniciarGesto();
    });
    el.addEventListener('pointermove', (e) => {
      if (!dedos.has(e.pointerId) || !gesto) return;
      dedos.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (toque && Math.hypot(e.clientX - toque.x, e.clientY - toque.y) > 8) toque = null;
      if (!arrastro && (dedos.size > 1 || (inicio && Math.hypot(e.clientX - inicio.x, e.clientY - inicio.y) > 8))) {
        arrastro = true;
        for (const id of dedos.keys()) { try { el.setPointerCapture(id); } catch (_) { /* ya se soltó */ } }   // el que empezó en un pin, también
      }
      const ps = [...dedos.values()];
      if (gesto.tipo === 'pellizco' && ps.length >= 2) {
        const [a, b] = ps.map((q) => local(q.x, q.y));
        const d = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1;
        const s2 = Math.min(sMax(), Math.max(sMin(), gesto.v0.s * d / gesto.d0));
        const mx = (gesto.cx - gesto.v0.tx) / gesto.v0.s, my = (gesto.cy - gesto.v0.ty) / gesto.v0.s;   // punto del mapa bajo el centro inicial
        v.s = s2; v.tx = (a[0] + b[0]) / 2 - mx * s2; v.ty = (a[1] + b[1]) / 2 - my * s2;
      } else if (gesto.tipo === 'mover') {
        const [x, y] = local(e.clientX, e.clientY);
        v.tx = gesto.tx + (x - gesto.x); v.ty = gesto.ty + (y - gesto.y);
      }
      limitar(); pintar();
    });
    const soltar = (e) => {
      if (!dedos.has(e.pointerId)) return;
      dedos.delete(e.pointerId);
      if (e.type === 'pointerup' && toque && !dedos.size) {
        const ahora = Date.now();
        if (ultimoToque && ahora - ultimoToque.t < 320 && Math.hypot(e.clientX - ultimoToque.x, e.clientY - ultimoToque.y) < 30) {
          const [x, y] = local(e.clientX, e.clientY);
          zoom(1.8, x, y);
          ultimoToque = null;
        } else ultimoToque = { x: e.clientX, y: e.clientY, t: ahora };
      }
      toque = null;
      if (!dedos.size) {
        gesto = null; el.classList.remove('moviendo');
        if (arrastro) finArrastre = Date.now();
        arrastro = false;
      } else iniciarGesto();
    };
    el.addEventListener('pointerup', soltar);
    el.addEventListener('pointercancel', soltar);
    el.addEventListener('wheel', (e) => {
      e.preventDefault();
      const r = el.getBoundingClientRect();
      const k = r.width / vw();
      zoom(e.deltaY < 0 ? 1.18 : 1 / 1.18, (e.clientX - r.left) / k, (e.clientY - r.top) / k);
    }, { passive: false });
    capa.addEventListener('click', (e) => {
      const b = e.target.closest('.mapa-pin');
      if (!b) return;
      e.stopPropagation();
      if (Date.now() - finArrastre < 400) return;    // venía de arrastrar o pellizcar: no es un toque al pin
      if (cfg.alPin) cfg.alPin(b.dataset.pin);
    });

    function zoom(f, cx = vw() / 2, cy = vh() * 0.4) {
      animacion++;
      const s2 = Math.min(sMax(), Math.max(sMin(), v.s * f));
      v.tx = cx - ((cx - v.tx) * s2) / v.s;
      v.ty = cy - ((cy - v.ty) * s2) / v.s;
      v.s = s2; limitar(); pintar();
    }
    /** Viaje animado a otra vista. Uno nuevo (o un gesto) reemplaza al que iba: nunca pelean dos. */
    function ir(destinoV, ms = 380) {
      const id = ++animacion;
      if (reducido()) { v = destinoV; limitar(); pintar(); return; }
      const o = { ...v };
      const t0 = performance.now();
      const fin = setTimeout(() => { if (id !== animacion) return; v = destinoV; limitar(); pintar(); }, ms + 60);
      const paso = (t) => {
        if (id !== animacion) { clearTimeout(fin); return; }
        const k = Math.min(1, (t - t0) / ms), e = 1 - Math.pow(1 - k, 3);
        v = { s: o.s + (destinoV.s - o.s) * e, tx: o.tx + (destinoV.tx - o.tx) * e, ty: o.ty + (destinoV.ty - o.ty) * e };
        limitar(); pintar();
        if (k < 1) requestAnimationFrame(paso); else clearTimeout(fin);
      };
      requestAnimationFrame(paso);
    }
    return {
      vista: () => ({ ...v }),
      zoom,
      enfocar(pos, s, alto = 0.36) { const [x, y] = pt(pos); const ss = s || v.s; ir({ s: ss, tx: (vw() - derecha) / 2 - x * ss, ty: vh() * alto - y * ss }); },
      seleccionar(id) { sel = id; pines.forEach((b) => b.classList.toggle('sel', b.dataset.pin === id)); },
      /** ¿El punto se ve entre la cabecera, los botones y la franja de abajo? */
      visible(pos, abajo = 0.3) { const [x, y] = pt(pos); const sx = v.tx + x * v.s, sy = v.ty + y * v.s; return sx > 24 && sx < vw() - derecha - 24 && sy > arriba + 16 && sy < vh() * (1 - abajo) - 24; },
      dibujarRuta(ms = 1100) {
        if (reducido()) { rutaDibujada = 1; pintar(); return; }
        const t0 = performance.now();
        rutaDibujada = 0; pintar();
        const fin = setTimeout(() => { rutaDibujada = 1; pintar(); }, ms + 80);
        const paso = (t) => { rutaDibujada = Math.min(1, (t - t0) / ms); pintar(); if (rutaDibujada < 1) requestAnimationFrame(paso); else clearTimeout(fin); };
        requestAnimationFrame(paso);
      },
      mover(k) { cfg.movil = k; pintar(); },
    };
  }

  /* ================================================================ explorar */
  const estadoExp = (tipo) => { const t = (DRS.tel.ui.exp = DRS.tel.ui.exp || {}); return (t[tipo] = t[tipo] || { orden: 'cerca', promo: false, modo: 'mapa', sel: null, vista: null }); };
  function lugares(tipo, e) {
    const v = DRS.q.vehiculo();
    let ls = DRS.estado.comercios.filter((c) => c.tipo === tipo).map((c) => ({ c, precio: precioDesde(c, v) }));
    if (e.promo) ls = ls.filter((x) => x.precio.promo);
    const orden = { precio: (a, b) => a.precio.valor - b.precio.valor, calif: (a, b) => b.c.calif - a.c.calif, cerca: (a, b) => a.c.km - b.c.km }[e.orden];
    return ls.sort(orden);
  }
  // El pin muestra el precio (como en R5); solo al ordenar por calificación muestra la nota. La distancia va en la tarjeta.
  const etiquetaPin = (x, orden) => (orden === 'calif' ? num(x.c.calif) : `$${Math.round(x.precio.valor / 1000)}k`);

  function mini(c, ancho = 92) {
    if (c.tipo === 'lavadero') return crudo(DRS.bp.bahias({ n: c.bahias, ocupadas: c.ocupadas || [], ancho, etiquetas: false }));
    if (c.tipo === 'taller') return crudo(DRS.bp.bahias({ n: c.bahias, ocupadas: c.ocupadas || [], ancho, etiquetas: false }));
    return crudo(DRS.bp.bahias({ n: c.lineas, ocupadas: [0], ancho, etiquetas: false }));
  }
  function tarjetaLugar(x, tipo, grande) {
    const c = x.c, p = x.precio;
    return html`<button class="tarjeta exp-card${grande ? ' grande' : ''}" data-card="${c.id}" ${crudo(UI.irAttrs('comercio', { id: c.id }))}>
      <span class="exp-card-plano">${mini(c, grande ? 150 : 92)}${p.etiqueta ? html`<span class="chip ${p.promo ? 'chip-lleno' : 'chip-luz'}">${p.etiqueta}</span>` : ''}</span>
      <span class="exp-card-info">
        <span class="d d-20">${c.nombre}</span>
        <span class="t11">${c.barrio} · ${num(c.km)} km</span>
        <span class="calif"><b>${num(c.calif)}</b><i>/5 · ${c.resenas} reseñas</i></span>
        <span class="precio" style="margin-top:6px"><span class="cap">${tipo === 'cda' ? 'Revisión' : 'Desde'}</span><span class="d d-20 num">${pesos(p.valor)}</span>${p.antes ? html`<span class="t11 tachado num">${pesos(p.antes)}</span>` : ''}</span>
      </span>
    </button>`;
  }

  DRS.pantallas.explorar = {
    render(p) {
      const tipo = p.tipo || 'lavadero';
      const t = TIPOS[tipo];
      const e = estadoExp(tipo);
      const ls = lugares(tipo, e);
      const chips = [['precio', 'Precio'], ['calif', 'Calificación'], ['cerca', 'Cercanía']];
      return html`<div class="exp${e.modo === 'lista' ? ' modo-lista' : ''}">
        ${e.modo === 'mapa' ? html`<div class="exp-mapa" data-mapa></div>` : ''}
        <header class="exp-cab">
          <button class="exp-btn" data-a="atras" aria-label="Volver">${ico('atras')}</button>
          <div class="exp-tit"><div class="ceja">${ls.length} cerca de ti · Cedritos</div><h1 class="d d-26">${t.titulo}</h1></div>
          <button class="exp-btn" data-a="exp-modo" data-tipo="${tipo}" aria-label="${e.modo === 'mapa' ? 'Ver lista' : 'Ver mapa'}">${ico(e.modo === 'mapa' ? 'lista' : 'mapa')}</button>
        </header>
        <div class="exp-chips" role="toolbar" aria-label="Ordenar y filtrar">
          ${chips.map(([k, n]) => html`<button class="exp-chip" aria-pressed="${e.orden === k ? 'true' : 'false'}" data-a="exp-orden" data-k="${k}" data-tipo="${tipo}">${n}</button>`)}
          ${tipo === 'lavadero' ? html`<button class="exp-chip" aria-pressed="${e.promo ? 'true' : 'false'}" data-a="exp-promo" data-tipo="${tipo}">Con promo</button>` : ''}
        </div>
        ${e.modo === 'mapa' ? html`
          <div class="exp-zoom"><button data-a="exp-zoom" data-f="1.5" aria-label="Acercar">${ico('mas')}</button><button data-a="exp-zoom" data-f="0.66" aria-label="Alejar"><svg class="ico" aria-hidden="true"><path d="M4 12h16"/></svg></button><button data-a="exp-yo" aria-label="Centrar en tu ubicación">${ico('ubicacion')}</button></div>
          ${ls.length > 1 ? html`<span class="exp-chip exp-pos num" data-carrusel-pos aria-hidden="true">1 / ${ls.length}</span>` : ''}
          <div class="exp-carrusel" data-carrusel role="group" aria-label="${t.titulo}: desliza para ver los demás">${ls.map((x) => tarjetaLugar(x, tipo, false))}</div>`
    : html`<div class="exp-lista">${ls.map((x) => tarjetaLugar(x, tipo, true))}<p class="t11" style="text-align:center;margin:14px 0 0">Comercios ficticios · precios de ejemplo</p></div>`}
      </div>`;
    },
    alMontar(el, p) { montarExplorar(el, p); },
    alRefrescar(el, p) { montarExplorar(el, p); },
  };

  let ctlExp = null;
  function montarExplorar(el, p) {
    const tipo = p.tipo || 'lavadero';
    const e = estadoExp(tipo);
    const cont = el.querySelector('[data-mapa]');
    ctlExp = null;
    if (!cont) return;
    const ls = lugares(tipo, e);
    if (!e.sel || !ls.find((x) => x.c.id === e.sel)) e.sel = ls.length ? ls[0].c.id : null;
    const cercanos = ls.slice().sort((a, b) => a.c.km - b.c.km).slice(0, 4).map((x) => x.c.pos);
    // Tarjetas ↔ pines: deslizar elige el lugar (pin resaltado y el mapa va hasta él); tocar un pin lleva a su tarjeta
    const car = el.querySelector('[data-carrusel]'), pos = el.querySelector('[data-carrusel-pos]');
    const cc = car && carrusel(car, {
      alElegir: (id) => {
        e.sel = id;
        if (!ctlExp) return;
        ctlExp.seleccionar(id);
        const c = DRS.q.comercio(id);
        if (c) ctlExp.enfocar(c.pos, null, 0.34);
      },
      alCambiar: (i, n) => { if (pos) pos.textContent = `${i + 1} / ${n}`; },
    });
    ctlExp = crearMapa(cont, {
      lugares: ls.map((x) => ({ id: x.c.id, pos: x.c.pos, etq: etiquetaPin(x, e.orden), promo: !!x.precio.promo, nombre: x.c.nombre })),
      sel: e.sel, yo: DRS.estado.casa.pos, vista: e.vista, ajustar: [DRS.estado.casa.pos, ...cercanos], abajo: 0.3, derecha: 64,
      alPin: (id) => { e.sel = id; ctlExp.seleccionar(id); if (cc) cc.ir(id); },
      alMover: (v) => { e.vista = v; },
    });
    // Si el elegido quedó fuera de la vista (por ejemplo al cambiar el orden), el mapa va hasta él
    const elegido = e.sel && DRS.q.comercio(e.sel);
    if (elegido && !ctlExp.visible(elegido.pos)) ctlExp.enfocar(elegido.pos, null, 0.34);
    if (cc && e.sel) cc.ir(e.sel, false);
    // el indicador «2 / 7» va justo encima de las tarjetas, midan lo que midan
    const exp = el.querySelector('.exp');
    if (car && exp) exp.style.setProperty('--exp-pie', `${Math.max(0, exp.clientHeight - car.offsetTop)}px`);
  }

  /**
   * Carrusel de tarjetas [data-card] sincronizado con el mapa. El CSS encaja una tarjeta por gesto
   * (scroll-snap); aquí, mientras el dedo desliza, la tarjeta que va quedando a la vista se elige de
   * inmediato, sin esperar a que el carrusel se detenga. ir(id) lo lleva a una tarjeta (al tocar su
   * pin) sin elegir las que pasa por el camino.
   * op: { alElegir(id, i) — el dedo eligió otra tarjeta · alCambiar(i, n) — cambió la tarjeta a la vista }
   * Lo usan el explorador y la Demo 3 (js/variantes/v3.js).
   */
  function carrusel(car, { alElegir, alCambiar } = {}) {
    const lista = [...car.querySelectorAll('[data-card]')], tarjetas = () => lista;   // el carrusel se rehace con cada repintado
    const pad = parseFloat(getComputedStyle(car).scrollPaddingLeft) || 0;
    let actual = -1, destino = -1, tDestino = null;
    // dónde encaja cada tarjeta: su borde menos el scroll-padding, dentro del recorrido posible
    function encajes(cs) {
      const max = car.scrollWidth - car.clientWidth;
      return cs.map((c) => Math.max(0, Math.min(max, c.offsetLeft - pad)));
    }
    function indice(cs) {
      const e = encajes(cs), x = car.scrollLeft;
      let m = 0;
      for (let i = 1; i < e.length; i++) if (Math.abs(e[i] - x) < Math.abs(e[m] - x)) m = i;
      return m;
    }
    function marcar(i, cs, avisar) {
      if (!cs[i]) return;
      actual = i;
      if (alCambiar) alCambiar(i, cs.length);
      if (avisar && alElegir) alElegir(cs[i].dataset.card, i);
    }
    car.addEventListener('scroll', () => {
      const cs = tarjetas();
      if (!cs.length) return;
      const i = indice(cs);
      if (destino >= 0) { if (i !== destino) return; destino = -1; clearTimeout(tDestino); }
      if (i !== actual) marcar(i, cs, true);
    }, { passive: true });
    // si el dedo toca el carrusel en medio de un ir(), deja de esperar esa tarjeta
    const soltar = () => { destino = -1; clearTimeout(tDestino); };
    for (const t of ['pointerdown', 'touchstart', 'wheel']) car.addEventListener(t, soltar, { passive: true });
    return {
      ir(id, suave = true) {
        const cs = tarjetas(), i = cs.findIndex((c) => c.dataset.card === id);
        if (i < 0) return;
        const x = encajes(cs)[i];
        marcar(i, cs, false);
        if (Math.abs(car.scrollLeft - x) < 1) return;
        destino = i;
        clearTimeout(tDestino);
        tDestino = setTimeout(soltar, 900);
        car.scrollTo({ left: x, behavior: suave && !reducido() ? 'smooth' : 'auto' });
      },
      indice: () => actual,
    };
  }

  /* ================================================================ comercio */
  const RESENAS = [
    ['Laura M.', 5, 'Puntuales y el carro quedó impecable por dentro.'],
    ['Andrés F.', 4, 'Buen servicio. Tocó esperar diez minutos más de lo dicho.'],
    ['Paola R.', 5, 'Me avisaron por la app cuando estaba listo. Así sí.'],
    ['Jorge L.', 4, 'Precio justo y buena atención.'],
  ];
  function resenasDe(c) {
    const reales = (DRS.estado.resenas || []).filter((r) => (r.comercio || 'c1') === c.id).slice(0, 3);
    if (reales.length) return reales.map((r) => [r.cliente || r.autor || r.nombre || 'Cliente', r.nota || r.calif || 5, r.texto || r.comentario || '']);
    const k = c.id.charCodeAt(1) % RESENAS.length;
    return [RESENAS[k], RESENAS[(k + 1) % RESENAS.length], RESENAS[(k + 2) % RESENAS.length]];
  }

  DRS.pantallas.comercio = {
    render(p) {
      const c = DRS.q.comercio(p.id);
      const v = DRS.q.vehiculo();
      const t = TIPOS[c.tipo];
      const ss = servicios(c, v);
      const selId = DRS.tel.ui.comSel && DRS.tel.ui.comSel[c.id] || (c.tipo === 'lavadero' ? 'completo' : ss[0].id);
      const sel = ss.find((s) => s.id === selId) || ss[0];
      const pr = c.tipo === 'lavadero' ? promoDe(c, sel.id) : null;
      const esTaller = c.tipo === 'taller';
      const precioSel = sel.valor;
      return html`${UI.cabDet(c.nombre)}<div class="cuerpo con-cta">
        <div class="com-plano">${crudo(DRS.bp.bahias({ n: c.bahias || c.lineas, ocupadas: c.ocupadas || [0], ancho: 360, dibujar: true }))}
          ${pr ? html`<span class="chip chip-lleno">−${pr.pct} % · ${pr.chip || pr.franja}</span>` : c.tipo === 'cda' ? html`<span class="chip chip-luz">Precio DRS · −${Math.round(c.drs * 100)} %</span>` : ''}</div>
        <div class="titulo" style="padding-top:14px"><div class="ceja">${t.uno} · ${c.barrio}, ${c.zona}</div><h1 class="d d-44">${c.nombre}</h1>
          <div class="com-meta"><span class="calif"><b>${num(c.calif)}</b><i>/5 · ${c.resenas} reseñas</i></span><span class="t11">${num(c.km)} km de tu casa</span></div></div>
        <div class="com-acciones">
          <button class="btn btn-borde btn-chico" ${crudo(UI.irAttrs('ruta', { id: c.id }))}>${ico('ubicacion', 's16')}Cómo llegar</button>
          <button class="btn btn-fantasma btn-chico" data-a="com-llamar">${ico('telefono', 's16')}Llamar</button>
          <button class="btn btn-fantasma btn-chico" data-a="com-guardar">${ico('guardar', 's16')}Guardar</button>
        </div>
        <dl class="datos tarjeta tarjeta-pad" style="margin:14px 0 0"><dt>Dirección</dt><dd>${c.direccion}</dd><dt>Horario</dt><dd>${c.horario || HORARIO_LAVADERO}</dd>${c.bahias ? html`<dt>Capacidad</dt><dd>${c.bahias} bahías</dd>` : html`<dt>Líneas de revisión</dt><dd>${c.lineas}</dd>`}</dl>
        ${pr ? html`<div class="aviso-caja" style="margin-top:8px">${ico('precio')}<span><b class="t-1">−${pr.pct} % en ${DRS.estado.servicios.find((s) => s.id === pr.servicio).nombre.toLowerCase()}</b> · ${pr.dias}, ${pr.franja}. ${pr.cupos} cupos. Vigente hasta el ${U.fechaCorta(DRS.reloj.dia(pr.hasta || 30))}.</span></div>` : ''}
        <section class="bloque">${UI.bloqueCab(esTaller ? 'Servicios' : 'Elige el servicio', `Precios para ${v.tipo === 'moto' ? 'moto' : 'automóvil'} · ${placaTxt(v.placa)}`)}
          <div role="radiogroup" aria-label="Servicio">${ss.map((s) => html`<button class="opcion com-srv" role="radio" aria-checked="${s.id === sel.id ? 'true' : 'false'}" data-a="com-srv" data-c="${c.id}" data-s="${s.id}">
            <span class="radio"></span><span><span class="t13 t-1" style="display:block;font-weight:600">${s.nombre}</span><span class="t11">${s.desc} · ${s.min} min</span></span>
            <span style="text-align:right">${s.valor ? html`<span class="d d-20 num" style="display:block">${pesos(s.valor)}</span>${s.antes ? html`<span class="t11 tachado num">${pesos(s.antes)}</span>` : ''}` : html`<span class="cap">Cotizar</span>`}</span></button>`)}</div>
        </section>
        <section class="bloque">${UI.bloqueCab('Reseñas')}
          ${resenasDe(c).map(([n, nota, txt]) => html`<div class="com-resena"><div style="display:flex;justify-content:space-between;align-items:baseline"><span class="t13 t-1">${n}</span><span class="calif"><b>${nota}</b><i>/5</i></span></div><p class="t13" style="margin:6px 0 0">${txt}</p></div>`)}
        </section>
        <section class="bloque">${UI.bloqueCab('Ubicación', c.direccion)}<button class="com-mini" ${crudo(UI.irAttrs('ruta', { id: c.id }))} aria-label="Ver cómo llegar"><div data-minimapa></div></button></section>
        <p class="t11" style="margin-top:14px">Comercio ficticio para la demo. Precios de ejemplo.</p>
      </div>
      <div class="pie-cta">${esTaller
    ? html`<button class="btn btn-acero" ${crudo(UI.irAttrs('cotizar', { v: v.id, taller: c.id, necesidad: sel.id }))}>${sel.valor ? `Pedir cotización · desde ${pesos(sel.valor)}` : 'Pedir cotización'}</button><p class="t11">El taller responde con un valor antes de que reserves.</p>`
    : html`<button class="btn btn-acero" ${crudo(UI.irAttrs('reservar', { id: c.id, servicio: sel.id }))}>${pr && pr.servicio === sel.id ? `Reservar · desde ${pesos(redondear(precioSel * (1 - pr.pct / 100)))}` : `Reservar · ${pesos(precioSel)}`}</button><p class="t11">${pr && pr.servicio === sel.id ? 'El descuento aplica en las franjas marcadas. ' : ''}Pagas en la app y llegas con tu código.</p>`}</div>`;
    },
    alMontar(el, p) { minimapa(el, p); },
    alRefrescar(el, p) { minimapa(el, p); },
  };
  function minimapa(el, p) {
    const c = DRS.q.comercio(p.id);
    const m = el.querySelector('[data-minimapa]');
    if (!m) return;
    // Cerca de casa se ven los dos puntos; si queda lejos, el mapa muestra solo el barrio del comercio
    const cerca = c.km <= 5;
    const ctl = crearMapa(m, { lugares: [{ id: c.id, pos: c.pos, etq: c.nombre, nombre: c.nombre }], sel: c.id, abajo: 0, arriba: 16, yo: DRS.estado.casa.pos,
      ajustar: cerca ? [c.pos, DRS.estado.casa.pos] : null, centro: c.pos, kmAncho: 3.2, alto: 0.55 });
    return ctl;
  }

  /* ================================================================ reservar */
  const estadoRes = () => (DRS.tel.ui.res = DRS.tel.ui.res || {});
  /** Hora de cierre (minutos) del comercio ese día, leída de su horario; 0 si ese día no abre.
      Los lavaderos abren los domingos hasta las 3:00 p. m.; talleres y CDA no abren los domingos. */
  const HORARIO_LAVADERO = 'Lun–sáb 7:00 a. m. – 7:00 p. m. · dom 8:00 a. m. – 3:00 p. m.';
  const aMinTxt = (h, m, ap) => (Number(h) % 12 + (ap === 'p' ? 12 : 0)) * 60 + Number(m);
  function cierre(c, dia) {
    const dow = dia.getDay();
    if (c.tipo === 'lavadero') return dow === 0 ? 15 * 60 : 18 * 60;          // franjas de la app: de 8:00 a. m. a 6:00 p. m., como la agenda del panel
    if (dow === 0) return 0;
    const h = c.horario || '';
    if (dow === 6) {
      if (/^Lun–vie/.test(h) && !/sáb/.test(h)) return 0;
      const sab = h.match(/sáb hasta la (\d{1,2}):(\d{2}) ([ap])\. m\./);
      if (sab) return aMinTxt(sab[1], sab[2], sab[3]);
    }
    const fin = h.match(/–\s*(\d{1,2}):(\d{2}) ([ap])\. m\./);
    return fin ? aMinTxt(fin[1], fin[2], fin[3]) : 18 * 60 + 30;
  }
  function franjas(c, dia, servMin) {
    const out = [];
    const agenda = c.id === 'c1' && U.isoDia(dia) === U.isoDia(DRS.reloj.hoy()) ? DRS.q.agenda('c1') : [];
    const ahoraMin = (() => { const a = DRS.reloj.ahora(); return a.getHours() * 60 + a.getMinutes(); })();
    const esHoy = U.isoDia(dia) === U.isoDia(DRS.reloj.hoy());
    for (let m = 8 * 60; m <= 17 * 60; m += 30) {
      const ocupadas = agenda.filter((r) => { const i = U.aMin(r.hora); return m < i + r.min && m + servMin > i; }).length;
      const pseudo = (c.id.charCodeAt(1) * 7 + dia.getDate() * 3 + m / 30) % 5 === 0;
      const dOff = U.diasEntre(DRS.reloj.hoy(), dia);
      // En el lavadero del panel manda su agenda real (reservas, bloqueos y días siguientes)
      const libreComercio = c.id === 'c1' && DRS.panelMas
        ? Array.from({ length: c.bahias }, (_, b) => b + 1).some((b) => DRS.panelMas.franjaLibre(c.id, dOff, b, U.deMin(m), servMin) && !(esHoy && agenda.some((r) => r.bahia === b && m < U.aMin(r.hora) + r.min && m + servMin > U.aMin(r.hora))))
        : (c.id === 'c1' && esHoy ? ocupadas < c.bahias : !pseudo);
      const libre = libreComercio && (!esHoy || m > ahoraMin + 10) && m + servMin <= cierre(c, dia);
      out.push({ h: U.deMin(m), libre });
    }
    return out;
  }

  DRS.pantallas.reservar = {
    render(p) {
      const c = DRS.q.comercio(p.id);
      const e = estadoRes();
      const pedido = p.cotizado ? `cot:${p.cotizado.nombre}:${p.cotizado.valor}` : p.servicio || '';
      const nuevo = e.c !== c.id || e.pedido !== pedido;
      if (nuevo) Object.assign(e, { c: c.id, pedido, v: DRS.estado.vehiculoActivo, s: p.cotizado ? 'cotizado' : p.servicio, extras: [], dia: 0, h: null, puntos: false });
      const v = DRS.q.vehiculo(e.v);
      const ss = p.cotizado
        ? [{ id: 'cotizado', nombre: p.cotizado.nombre, desc: `Cotización de ${c.nombre}`, min: p.cotizado.min || 90, valor: p.cotizado.valor }]
        : servicios(c, v).filter((s) => s.valor > 0);
      const srv = ss.find((s) => s.id === e.s) || ss[0];
      const dias = Array.from({ length: 7 }, (_, i) => DRS.reloj.dia(i));
      if (nuevo) {   // arranca en el primer día con franjas libres (p. ej. si hoy el comercio ya cerró)
        const min0 = (ss.find((x) => x.id === e.s) || ss[0]).min;
        const i = dias.findIndex((d) => franjas(c, d, min0).some((f) => f.libre));
        e.dia = i < 0 ? 0 : i;
      }
      const dia = dias[e.dia];
      const fr = franjas(c, dia, srv.min);
      if (!e.h || !fr.find((f) => f.h === e.h && f.libre)) e.h = (fr.find((f) => f.h === '10:30' && f.libre) || fr.find((f) => f.libre) || {}).h;
      const pr = c.tipo === 'lavadero' && e.h ? promoDe(c, srv.id, dia, e.h) : null;
      const extras = c.tipo === 'lavadero' ? DRS.estado.extras : [];
      const lineas = [[srv.nombre, srv.valor], ...extras.filter((x) => e.extras.includes(x.id)).map((x) => [x.nombre, x.precio])];
      let total = lineas.reduce((a, l) => a + l[1], 0);
      if (pr) { const d = redondear(srv.valor * pr.pct / 100); lineas.push([`Promo −${pr.pct} %`, -d]); total -= d; }
      const u = DRS.q.usuario();
      const meta = c.tipo === 'lavadero' && u.meta.hechos === u.meta.total - 1;
      if (meta) { const d = redondear(total * 0.5); lineas.push(['Meta: 5.º lavado −50 %', -d]); total -= d; }
      const maxPts = Math.min(u.puntos * 10, redondear(total * 0.5));
      if (e.puntos && maxPts > 0) { lineas.push([`Puntos (${num(maxPts / 10)} pts)`, -maxPts]); total -= maxPts; }
      e.total = total; e.lineas = lineas; e.srvNombre = srv.nombre; e.min = srv.min;
      const pyp = DRS.reloj.picoPlaca(dia, v);
      return html`${UI.cabDet('Reservar')}<div class="cuerpo con-cta">
        <div class="titulo"><div class="ceja">${c.nombre} · ${c.barrio}</div><h1 class="d d-44">Reservar</h1></div>
        <section class="res-bloque"><div class="ceja">Vehículo</div>
          <div class="seg" role="tablist">${DRS.q.vehiculos().map((x) => html`<button role="tab" aria-selected="${x.id === v.id ? 'true' : 'false'}" data-a="res-v" data-id="${x.id}">${UI.modeloCorto(x)} · ${placaTxt(x.placa)}</button>`)}</div></section>
        <section class="res-bloque"><div class="ceja">Servicio</div>
          <div role="radiogroup">${ss.map((s) => html`<button class="opcion com-srv" role="radio" aria-checked="${s.id === srv.id ? 'true' : 'false'}" data-a="res-s" data-s="${s.id}"><span class="radio"></span><span><span class="t13 t-1" style="display:block;font-weight:600">${s.nombre}</span><span class="t11">${s.min} min</span></span><span class="d d-20 num">${pesos(s.valor)}</span></button>`)}</div>
          ${extras.length ? html`<div class="fichas" style="margin-top:6px">${extras.map((x) => html`<button class="ficha" aria-pressed="${e.extras.includes(x.id) ? 'true' : 'false'}" data-a="res-extra" data-id="${x.id}">+ ${x.nombre} · ${pesos(x.precio)}</button>`)}</div>` : ''}</section>
        <section class="res-bloque"><div class="ceja">Día</div>
          <div class="res-dias">${dias.map((d, i) => { const x = DRS.reloj.picoPlaca(d, v); return html`<button class="res-dia${x.restringido ? ' pyp' : ''}" aria-pressed="${i === e.dia ? 'true' : 'false'}" data-a="res-dia" data-i="${i}"><span class="cap">${i === 0 ? 'Hoy' : U.DIAS[d.getDay()].slice(0, 3)}</span><b class="d d-26 num">${d.getDate()}</b>${x.restringido ? html`<i class="cap">P&P</i>` : ''}</button>`; })}</div>
          ${pyp.restringido ? html`<p class="t11" style="margin:8px 0 0;color:var(--txt-2)">Ese día tu carro tiene pico y placa: buen día para dejarlo.</p>` : ''}</section>
        <section class="res-bloque"><div class="ceja">Hora</div>
          <div class="res-horas">${fr.map((f) => { const prf = c.tipo === 'lavadero' && f.libre ? promoDe(c, srv.id, dia, f.h) : null; return html`<button class="res-hora${prf ? ' promo' : ''}" aria-pressed="${f.h === e.h ? 'true' : 'false'}" ${crudo(f.libre ? '' : 'disabled')} data-a="res-h" data-h="${f.h}">${U.horaTxt(f.h).replace(/ ([ap])\. m\./, '$1')}${prf ? html`<i>−${prf.pct}%</i>` : ''}</button>`; })}</div></section>
        <section class="res-bloque">
          <button class="check" role="checkbox" aria-checked="${e.puntos ? 'true' : 'false'}" data-a="res-puntos"><i>${e.puntos ? ico('check') : ''}</i><span>Usar mis puntos: ${num(u.puntos)} pts, hasta ${pesos(maxPts)} en esta reserva.</span></button>
          ${meta ? html`<div class="aviso-caja">${ico('beneficios')}<span>Este es tu 5.º lavado: tiene 50 % de descuento.</span></div>` : ''}</section>
        <section class="res-bloque"><div class="ceja">Resumen</div>
          <div class="tarjeta tarjeta-pad"><dl class="datos" style="margin:0">${lineas.map(([k, val]) => html`<dt>${k}</dt><dd class="num${val < 0 ? ' t-luz' : ''}">${val < 0 ? '−' + pesos(-val) : pesos(val)}</dd>`)}
            <dt>Cuándo</dt><dd>${U.fechaLarga(dia)} · ${e.h ? U.horaTxt(e.h) : 'sin franja'}</dd></dl>
            <div class="pago-total"><span class="cap">Total</span><span class="d d-44 num">${pesos(total)}</span></div></div>
          <p class="t11" style="margin-top:10px">Cancela o reprograma sin costo hasta 2 horas antes. Después aplica la política del comercio. Condiciones de las promociones según la Ley 1480 de 2011.</p></section>
      </div>
      <div class="pie-cta"><button class="btn btn-acero" data-a="res-pagar" data-c="${c.id}" ${crudo(e.h ? '' : 'disabled')}>Pagar ${pesos(total)}</button></div>`;
    },
  };

  function crearReserva(c, e, medio, ref) {
    const v = DRS.q.vehiculo(e.v);
    const dia = e.dia;
    let id;
    do { id = `DRS-${4800 + Math.floor(Math.random() * 190)}`; } while (DRS.q.reserva(id));
    const esHistoria = DRS.estado.demo.guiado && c.id === 'c1' && dia === 0 && !DRS.q.reserva('DRS-4821');
    if (esHistoria) id = 'DRS-4821';
    const agenda = dia === 0 ? DRS.q.agenda(c.id) : [];
    const ini = U.aMin(e.h);
    let bahia = 1;
    for (let b = 1; b <= (c.bahias || c.lineas || 1); b++) {
      const libreAgenda = !agenda.some((r) => r.bahia === b && ini < U.aMin(r.hora) + r.min && ini + e.min > U.aMin(r.hora));
      const librePanel = c.id !== 'c1' || !DRS.panelMas || DRS.panelMas.franjaLibre(c.id, dia, b, e.h, e.min);
      if (libreAgenda && librePanel) { bahia = b; break; }
    }
    const nombresMedio = { tarjeta: 'Tarjeta', pse: 'PSE', nequi: 'Nequi' };
    const r = { id, comercio: c.id, bahia, d: dia, hora: e.h, min: e.min, servicio: e.srvNombre, extras: e.lineas.slice(1).filter((l) => l[1] > 0).map((l) => l[0]),
      lineas: e.lineas, cliente: `${DRS.q.usuario().nombre} ${DRS.q.usuario().apellido[0]}.`, placa: v.placa, tipoVeh: tipoVeh(v), origen: 'app',
      valor: e.lineas.filter((l) => l[1] > 0).reduce((a, l) => a + l[1], 0), descuento: 0, total: e.total, medio: nombresMedio[medio], estado: 'confirmada', usuario: 'u1', vehiculo: v.id,
      historial: [{ estado: 'confirmada', d: 0, h: horaAhora() }] };
    const usados = e.lineas.find((l) => /^Puntos/.test(l[0]));
    DRS.cambiar((s) => {
      s.reservas.push(r);
      if (usados) { const pts = Math.round(-usados[1] / 10); s.usuario.puntos -= pts; (s.movPuntos = s.movPuntos || []).unshift({ d: 0, txt: `Usaste puntos en ${c.nombre}`, pts: -pts }); }
      if (c.tipo === 'lavadero') {                  // la meta cuenta lavados pagados; el 5.º, con su descuento, cierra el ciclo
        const m = s.usuario.meta;
        m.hechos = e.lineas.some((l) => /^Meta/.test(l[0])) ? 0 : Math.min(m.total - 1, m.hechos + 1);
      }
      (s.pagos = s.pagos || []).unshift({ id: `p${Date.now()}`, d: 0, h: horaAhora(), concepto: `${e.srvNombre} · ${c.nombre}`, ref, medio: nombresMedio[medio] === 'Tarjeta' ? 'Tarjeta Visa terminada en 4417' : nombresMedio[medio], total: e.total, tipo: c.tipo === 'cda' ? 'tecno' : 'reserva', rel: id });
      s.notificaciones.unshift({ id: `n${Date.now()}`, d: 0, h: horaAhora(), ico: 'calendario', titulo: 'Reserva confirmada', texto: `${e.srvNombre} en ${c.nombre}, ${dia === 0 ? 'hoy' : U.fechaLarga(DRS.reloj.dia(dia))} a las ${U.horaTxt(e.h)} · código ${id}`, leida: false, ir: { ruta: 'reserva', p: { id } }, accion: 'Ver reserva' });
    }, { tipo: 'reserva-nueva', id });
    if (c.id === 'c1' && dia === 0 && DRS.panel) { DRS.panel.sel = id; DRS.panel.llega = id; DRS.panel.render(); }
    return r;
  }

  DRS.pantallas['reserva-confirmada'] = {
    render(p) {
      const r = DRS.q.reserva(p.id);
      const c = DRS.q.comercio(r.comercio);
      return html`${UI.cabDet('Reserva confirmada')}<div class="cuerpo">
        <div class="festejo"><i class="l1"></i><i class="l2"></i><div class="d d-56">Reserva confirmada</div><p class="t13" style="margin:0 auto;max-width:32ch">${c.nombre} ya la tiene en su agenda, pagada. Te llega la confirmación por WhatsApp.</p></div>
        <div class="tarjeta qr-caja" style="margin-top:18px"><div class="qr">${crudo(DRS.bp.qr(r.id))}</div>
          <div><span class="cap">Código</span><div class="d d-34" style="margin:6px 0">${r.id}</div><p class="t13" style="margin:0">${r.d === 0 ? 'Hoy' : U.fechaLarga(DRS.reloj.dia(r.d))} · ${U.horaTxt(r.hora)} · ${c.tipo === 'cda' ? 'línea' : 'bahía'} ${r.bahia}</p></div></div>
        <dl class="datos tarjeta tarjeta-pad" style="margin:8px 0 0"><dt>Servicio</dt><dd>${r.servicio}</dd><dt>Lugar</dt><dd>${c.direccion}</dd><dt>Pagado</dt><dd class="num">${pesos(r.total)} · ${r.medio}</dd></dl>
        <button class="btn btn-borde" ${crudo(UI.irAttrs('reserva', { id: r.id }))} style="margin-top:18px">${ico('reservas')}Ver reserva</button>
        <button class="btn btn-fantasma" ${crudo(UI.irAttrs('ruta', { id: c.id }))} style="margin-top:8px">${ico('ubicacion')}Cómo llegar</button>
        <button class="btn btn-fantasma" data-a="tab" data-tab="inicio" style="margin-top:8px">${ico('inicio')}Volver al inicio</button>
      </div>`;
    },
  };

  /* ================================================================ cómo llegar */
  DRS.pantallas.ruta = {
    render(p) {
      const c = DRS.q.comercio(p.id);
      const casa = DRS.estado.casa;
      const r = DRS.mapa && DRS.mapa.rutear ? DRS.mapa.rutear(casa.pos, c.pos) : { km: c.km, min: Math.round(c.km / 22 * 60), pasos: [`Dirígete a ${c.direccion}`] };
      const res = DRS.q.reservasUsuario().find((x) => x.comercio === c.id && x.d === 0 && ['confirmada', 'recibido'].includes(x.estado));
      const salir = res ? U.deMin(Math.max(0, U.aMin(res.hora) - r.min - 5)) : null;
      const e = rutaDe(c.id);
      return html`<div class="exp ruta">
        <div class="exp-mapa" data-mapa></div>
        <header class="exp-cab"><button class="exp-btn" data-a="atras" aria-label="Volver">${ico('atras')}</button>
          <div class="exp-tit"><div class="ceja">Cómo llegar</div><h1 class="d d-26">${c.nombre}</h1></div><span style="width:40px"></span></header>
        <div class="ruta-panel">
          <div class="ruta-top"><div><span class="d d-56 num">${r.min}</span><span class="etq t-3" style="margin-left:6px">min</span></div>
            <div style="text-align:right"><div class="d d-26 num">${num(r.km)} km</div><div class="t11">en carro · tráfico normal</div></div></div>
          ${salir ? html`<div class="aviso-caja" style="margin:10px 0 0">${ico('horario')}<span>Sal a las <b class="t-1">${U.horaTxt(salir)}</b> para llegar a tu reserva de las ${U.horaTxt(res.hora)}</span></div>` : ''}
          <ol class="ruta-pasos">${r.pasos.map((x, i) => (/^Llegas/.test(x) ? `Llegas a ${c.direccion}` : x)).map((x, i) => html`<li><i>${i === r.pasos.length - 1 && /^Llegas/.test(x) ? ico('ubicacion') : i + 1}</i><span>${x}</span></li>`)}${r.pasos.some((x) => /^Llegas/.test(x)) ? '' : html`<li><i>${ico('ubicacion')}</i><span>Llegas a ${c.direccion}</span></li>`}</ol>
          <div class="ruta-botones">
            <button class="btn btn-luz btn-chico" data-a="ruta-iniciar" data-id="${c.id}" ${crudo(e.andando ? 'disabled' : '')}>${ico('flecha', 's16')}${e.andando ? 'En camino…' : 'Iniciar'}</button>
            <button class="btn btn-fantasma btn-chico" data-a="ruta-app" data-app="Waze">Waze</button>
            <button class="btn btn-fantasma btn-chico" data-a="ruta-app" data-app="Google Maps">Google Maps</button>
          </div>
        </div>
      </div>`;
    },
    alMontar(el, p) { montarRuta(el, p, true); },
    alRefrescar(el, p) { montarRuta(el, p, false); },
  };
  let ctlRuta = null;
  /** Estado del recorrido por comercio: «En camino…» en uno no bloquea el botón de otro. */
  const rutaDe = (id) => { const t = (DRS.tel.ui.rutas = DRS.tel.ui.rutas || {}); return (t[id] = t[id] || {}); };
  function montarRuta(el, p, animar) {
    const c = DRS.q.comercio(p.id);
    const casa = DRS.estado.casa;
    const r = DRS.mapa && DRS.mapa.rutear ? DRS.mapa.rutear(casa.pos, c.pos) : { puntos: [pt(casa.pos), pt([casa.pos[0], c.pos[1]]), pt(c.pos)] };
    const cont = el.querySelector('[data-mapa]');
    // el panel de abajo es opaco: el mapa puede meterse debajo y el trayecto se encuadra en lo que queda a la vista
    const panel = el.querySelector('.ruta-panel'), tapaAbajo = panel ? panel.offsetHeight : 0;
    const abajo = cont.clientHeight && tapaAbajo ? Math.min(0.62, tapaAbajo / cont.clientHeight + 0.02) : 0.46;
    ctlRuta = crearMapa(cont, { lugares: [], yo: casa.pos, destino: c.pos, destinoIco: TIPOS[c.tipo].ico, ruta: r.puntos, ajustar: [casa.pos, c.pos], abajo, tapa: { abajo: tapaAbajo } });
    if (animar) ctlRuta.dibujarRuta(1200);
  }

  /* ================================================================ cotizar (talleres) */
  const NECESIDADES = [['aceite', 'Cambio de aceite'], ['frenos', 'Frenos'], ['alineacion', 'Alineación y balanceo'], ['suspension', 'Suspensión'], ['diagnostico', 'Diagnóstico'], ['revision', 'Revisión general'], ['pretecno', 'Preparación para la tecno']];
  DRS.pantallas.cotizar = {
    render(p) {
      const e = (DRS.tel.ui.cot = DRS.tel.ui.cot || {});
      if (e.clave !== JSON.stringify(p)) Object.assign(e, { clave: JSON.stringify(p), nec: [p.necesidad || 'aceite'], talleres: null, foto: false });
      const v = DRS.q.vehiculo(p.v);
      const talleres = DRS.estado.comercios.filter((c) => c.tipo === 'taller').sort((a, b) => a.km - b.km);
      if (!e.talleres) e.talleres = p.taller ? [p.taller, ...talleres.filter((c) => c.id !== p.taller).slice(0, 2).map((c) => c.id)] : talleres.slice(0, 3).map((c) => c.id);
      return html`${UI.cabDet('Pedir cotización')}<div class="cuerpo con-cta">
        <div class="titulo"><div class="ceja">${placaTxt(v.placa)} · ${UI.modelo(v)} · ${num(v.km)} km</div><h1 class="d d-44">Pedir cotización</h1><p class="t13">Cuéntanos qué necesita. Los talleres responden con un valor antes de que reserves.</p></div>
        <section class="res-bloque"><div class="ceja">¿Qué necesita tu vehículo?</div>
          <div class="fichas">${NECESIDADES.map(([k, n]) => html`<button class="ficha" aria-pressed="${e.nec.includes(k) ? 'true' : 'false'}" data-a="cot-nec" data-k="${k}">${n}</button>`)}</div></section>
        <section class="res-bloque"><div class="campo"><label class="cap" for="cot-txt">Cuéntanos más</label><textarea id="cot-txt">Toca cambio de aceite y filtro. Al frenar en bajada suena un poco.</textarea></div>
          <button class="btn btn-fantasma btn-chico" data-a="cot-foto" style="width:100%">${ico('sesion-foto', 's16')}${e.foto ? 'Foto adjunta · tablero.jpg' : 'Adjuntar una foto (opcional)'}</button></section>
        <section class="res-bloque"><div class="ceja">¿A qué talleres?</div>
          ${talleres.map((c) => html`<button class="check" role="checkbox" aria-checked="${e.talleres.includes(c.id) ? 'true' : 'false'}" data-a="cot-taller" data-id="${c.id}"><i>${e.talleres.includes(c.id) ? ico('check') : ''}</i><span><b class="t-1">${c.nombre}</b> · ${c.barrio} · ${num(c.km)} km · ${num(c.calif)}/5</span></button>`)}</section>
      </div>
      <div class="pie-cta"><button class="btn btn-acero" data-a="cot-enviar" data-v="${v.id}" ${crudo(e.nec.length && e.talleres.length ? '' : 'disabled')}>Pedir ${e.talleres.length} ${e.talleres.length === 1 ? 'cotización' : 'cotizaciones'}</button></div>`;
    },
  };

  /** Respuesta de ejemplo de un taller a la solicitud (valor según el taller y lo pedido). */
  function respuesta(e, id, i) {
    const c = DRS.q.comercio(id);
    const nombres = e.nec.map((k) => (NECESIDADES.find((n) => n[0] === k) || [k, k])[1]);
    const base = e.nec.reduce((a, k) => { const s = DRS.estado.serviciosTaller.find((x) => x.id === k); return a + (s && s.desde ? s.desde : 150000); }, 0);
    const valor = Math.round((base * (c.factor || 1) * (1 + (i % 2 ? 0.06 : -0.03))) / 1000) * 1000;
    return { id, nombre: nombres.join(' + '), valor, min: 90, tiempo: i === 0 ? 'Listo en 2 h' : i === 1 ? 'Listo hoy' : 'Listo mañana',
      incluye: e.nec.includes('aceite') ? ['Aceite sintético 5W-30', 'Filtro de aceite', 'Revisión de frenos y niveles'] : ['Diagnóstico inicial', 'Mano de obra', 'Reporte con fotos'] };
  }

  DRS.pantallas.cotizaciones = {
    render() {
      // Abierta desde un aviso, sin solicitud en curso: se muestran las respuestas de ejemplo, no una espera sin fin
      let e = DRS.tel.ui.cot;
      if (!e || (!e.sol && !(e.respuestas || []).length)) {
        e = DRS.tel.ui.cot = { ...(e || {}), nec: (e && e.nec) || ['aceite'], talleres: (e && e.talleres) || ['t1', 't2', 't4'] };
        e.respuestas = e.talleres.map((id, i) => respuesta(e, id, i));
      }
      const resp = e.respuestas || [];
      const faltan = (e.talleres || []).length - resp.length;
      return html`${UI.cabDet('Cotizaciones')}<div class="cuerpo">
        <div class="titulo"><div class="ceja">${faltan > 0 ? 'Los talleres están revisando tu solicitud' : `${resp.length} respuestas`}</div><h1 class="d d-44">Cotizaciones</h1></div>
        ${faltan > 0 ? html`<div class="aviso-caja" style="margin-bottom:12px"><span class="cot-espera"></span><span>Esperando ${faltan} ${faltan === 1 ? 'respuesta' : 'respuestas'}. Normalmente tardan menos de 15 minutos; en la demo, segundos.</span></div>` : ''}
        ${resp.map((q) => { const c = DRS.q.comercio(q.id); return html`<article class="tarjeta tarjeta-pad cot-card">
          <div style="display:flex;justify-content:space-between;gap:10px"><div><div class="d d-26">${c.nombre}</div><div class="t11">${c.barrio} · ${num(c.km)} km · ${num(c.calif)}/5</div></div><div style="text-align:right"><div class="d d-34 num">${pesos(q.valor)}</div><div class="t11">${q.tiempo}</div></div></div>
          <ul class="cot-incluye">${q.incluye.map((x) => html`<li>${ico('check')}${x}</li>`)}</ul>
          <div style="display:flex;gap:8px;align-items:center;justify-content:space-between"><span class="chip chip-luz">${ico('verificado')}Queda verificado por DRS</span>
            <button class="btn btn-luz btn-chico" ${crudo(UI.irAttrs('reservar', { id: c.id, servicio: 'cotizado', cotizado: { nombre: q.nombre, valor: q.valor, min: q.min } }))}>Elegir</button></div>
        </article>`; })}
      </div>`;
    },
  };

  /* ================================================================ acciones */
  Object.assign(DRS.acciones, {
    'exp-modo': (d) => { const e = estadoExp(d.tipo); e.modo = e.modo === 'mapa' ? 'lista' : 'mapa'; DRS.tel.refrescar(); },
    'exp-orden': (d) => { const e = estadoExp(d.tipo); e.orden = d.k; e.sel = null; DRS.tel.refrescar(); },
    'exp-promo': (d) => { const e = estadoExp(d.tipo); e.promo = !e.promo; e.sel = null; DRS.tel.refrescar(); },
    'exp-zoom': (d) => { if (ctlExp) ctlExp.zoom(Number(d.f)); },
    'exp-yo': () => { if (ctlExp) ctlExp.enfocar(DRS.estado.casa.pos, null, 0.34); },
    'com-srv': (d) => { (DRS.tel.ui.comSel = DRS.tel.ui.comSel || {})[d.c] = d.s; DRS.tel.refrescar(); },
    'com-llamar': () => DRS.tel.tostada('En la app real se abre la llamada', 'telefono'),
    'com-guardar': () => DRS.tel.tostada('En la app real queda en tus favoritos', 'guardar'),
    'res-v': (d) => { estadoRes().v = d.id; DRS.tel.refrescar(); },
    'res-s': (d) => { estadoRes().s = d.s; DRS.tel.refrescar(); },
    'res-extra': (d) => { const e = estadoRes(); e.extras = e.extras.includes(d.id) ? e.extras.filter((x) => x !== d.id) : [...e.extras, d.id]; DRS.tel.refrescar(); },
    'res-dia': (d) => { const e = estadoRes(); e.dia = Number(d.i); e.h = null; DRS.tel.refrescar(); },
    'res-h': (d) => { estadoRes().h = d.h; DRS.tel.refrescar(); },
    'res-puntos': () => { const e = estadoRes(); e.puntos = !e.puntos; DRS.tel.refrescar(); },
    'res-pagar': (d) => {
      const c = DRS.q.comercio(d.c);
      const e = estadoRes();
      DRS.pago.abrir({
        titulo: 'Pagar reserva', concepto: `${e.srvNombre} · ${c.nombre}`, lineas: e.lineas, total: e.total,
        pasos: [c.tipo === 'cda' ? 'Reservando tu turno en el CDA' : `Apartando la franja en ${c.nombre}`],
        alPagar: (medio, ref) => {
          const r = crearReserva(c, e, medio, ref);
          DRS.tel.ui.res = null;
          DRS.tel.saltar('reservas', 'reserva-confirmada', { id: r.id });   // «atrás» ya no vuelve a la pantalla de pago
          if (DRS.avisos && DRS.estado.canales && DRS.estado.canales.whatsapp) setTimeout(() => DRS.avisos.lanzar('waConf', { r }), 1600);
        },
      });
    },
    'ruta-iniciar': (d) => {
      const e = rutaDe(d.id);
      if (!ctlRuta || e.andando) return;
      e.andando = true; DRS.tel.refrescar();
      const pantalla = DRS.tel.pila[DRS.tel.pila.length - 1];
      let k = 0;
      // El recorrido se detiene si se sale de la pantalla (no deja un intervalo corriendo)
      const parar = () => { clearInterval(tic); e.andando = false; };
      const tic = setInterval(() => {
        if (DRS.tel.pila[DRS.tel.pila.length - 1] !== pantalla || !ctlRuta) return parar();
        k = reducido() ? 1 : Math.min(1, k + 0.02);
        try { ctlRuta.mover(k); } catch (err) { return parar(); }
        if (k >= 1) { parar(); DRS.tel.refrescar(); DRS.tel.tostada('Llegaste a tu destino', 'ubicacion'); }
      }, 60);
    },
    'ruta-app': (d) => DRS.tel.tostada(`En la app real se abre ${d.app} con la ruta`, 'enlace-externo'),
    'cot-nec': (d) => { const e = DRS.tel.ui.cot; e.nec = e.nec.includes(d.k) ? e.nec.filter((x) => x !== d.k) : [...e.nec, d.k]; DRS.tel.refrescar(); },
    'cot-taller': (d) => { const e = DRS.tel.ui.cot; e.talleres = e.talleres.includes(d.id) ? e.talleres.filter((x) => x !== d.id) : [...e.talleres, d.id]; DRS.tel.refrescar(); },
    'cot-foto': () => { DRS.tel.ui.cot.foto = true; DRS.tel.refrescar(); },
    'cot-enviar': () => {
      const e = DRS.tel.ui.cot;
      const sol = (e.sol = Date.now());               // una solicitud nueva deja sin efecto los temporizadores de la anterior
      e.respuestas = [];
      DRS.tel.ir('cotizaciones', {});
      e.talleres.forEach((id, i) => setTimeout(() => {
        if (e.sol !== sol || DRS.tel.ui.cot !== e) return;
        e.respuestas.push(respuesta(e, id, i));
        const tope = DRS.tel.pila[DRS.tel.pila.length - 1];
        if (tope && tope.ruta === 'cotizaciones') DRS.tel.refrescar();
        if (e.respuestas.length === e.talleres.length && DRS.avisos) DRS.avisos.lanzar('cotiz', { n: e.talleres.length, desde: Math.min(...e.respuestas.map((x) => x.valor)), nombre: e.respuestas[0].nombre });
      }, 1300 + i * 1100));
    },
  });

  /** Genera el SVG del mapa por adelantado (tarda unos cientos de ms en un celular), para que el primer mapa abra sin espera. */
  const precalentar = () => { baseSvg(); };
  DRS.explorar = { crearMapa, carrusel, precioDesde, servicios, promoDe, precalentar };
})();
