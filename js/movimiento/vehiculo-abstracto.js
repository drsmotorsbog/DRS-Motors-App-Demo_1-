/* GENERADO por herramientas/sincronizar.py — no editar. Fuente: Movimiento/app/vehiculo-abstracto.js */
/* DRS Motors · Vehículo abstracto — plano técnico, escaneo en puntos y la mezcla de los dos.
   Nunca usa la foto del vehículo: dibuja con lo que Movimiento/herramientas saca de ella
   (silueta, trazos, ruedas, boceto de bordes, nube de puntos y punteado).
   Sin librerías. Es una función pura del tiempo: se reproduce sola o se lleva a cualquier segundo.

   const v = DRSMovimiento.vehiculo(contenedor, datos, opciones);
     datos: el objeto de Movimiento/app/vehiculos/<nombre>.js  (window.DRS_VEHICULOS[nombre])
     opciones (todas opcionales):
       modo       'plano' | 'puntos' | 'mixto'                              ('plano')
       barrido    plano: el trazo llega en borrador y una línea azul lo pasa en limpio   (false)
       cotas      plano: cota «entre ejes» bajo el vehículo                          (false)
       rejilla    rejilla técnica detrás                                             (false)
       cursor     pluma de CAD sobre la silueta                                      (true)
       lectura    puntos: porcentaje de lectura pegado a la línea                    (false)
       revelado   mixto: 'lente' (lupa que recorre) | 'franja' (barrido de izq. a der.)   ('lente')
       paradas    mixto con lente: [[x, y], ...] en fracciones del vehículo           (tres paradas)
       boceto     opacidad final del boceto de bordes                                (0.42)
       velocidad  multiplicador de tiempo                                            (1)
       reproducir arranca al montarse                                                (true)
       alVer      arranca cuando el contenedor entra en pantalla (en vez de al montarse)   (false)
     devuelve { raiz, duracion, play(), pause(), ir(segundos), tiempo(), destruir() }
   Colores: lee los roles --sup-1, --txt-1, --txt-2, --txt-3, --acc-2 del contenedor (modo noche o
   documento de Marca/drs.tokens.css); sin ellos usa los del modo noche.
   Con «reducir movimiento» se queda en el cuadro final. */
(function (global) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';

  /* ---------- utilidades ---------- */
  function bezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx, cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const fx = (t) => ((ax * t + bx) * t + cx) * t, fy = (t) => ((ay * t + by) * t + cy) * t, dx = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return (x) => { if (x <= 0) return 0; if (x >= 1) return 1; let t = x; for (let i = 0; i < 8; i++) { const e = fx(t) - x, d = dx(t); if (Math.abs(e) < 1e-6) return fy(t); if (Math.abs(d) < 1e-6) break; t -= e / d; } let lo = 0, hi = 1; t = x; for (let i = 0; i < 30; i++) { const v = fx(t); if (Math.abs(v - x) < 1e-6) break; if (v < x) lo = t; else hi = t; t = (lo + hi) / 2; } return fy(t); };
  }
  const EASE = { draw: bezier(0.65, 0, 0.35, 1), sweep: bezier(0.45, 0, 0.2, 1), out: bezier(0.2, 0.7, 0.2, 1), snap: bezier(0.16, 1, 0.3, 1), lin: (x) => x };
  const cl = (v) => (v < 0 ? 0 : v > 1 ? 1 : v);
  const rnd = (s) => { s = s >>> 0 || 1; return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; }; };
  const el = (tag, a, padre) => { const e = document.createElementNS(NS, tag); if (a) for (const k in a) if (a[k] != null) e.setAttribute(k, a[k]); if (padre) padre.appendChild(e); return e; };
  const hexLum = (hex) => { const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim()); if (!m) return 0; const n = parseInt(m[1], 16); return (0.2126 * (n >> 16) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255; };
  function paleta(host) {
    const cs = getComputedStyle(host); const v = (n, f) => (cs.getPropertyValue(n) || '').trim() || f;
    const p = { sup1: v('--sup-1', '#0A0B0D'), txt1: v('--txt-1', '#E8EAEE'), txt2: v('--txt-2', '#C9CDD4'), txt3: v('--txt-3', '#8A8F98'), linea: v('--linea', '#262A31'), acc2: v('--acc-2', '#5B93C4') };
    p.claro = hexLum(p.sup1) > 0.5;   // modo documento: el boceto (blanco) se oscurece
    return p;
  }
  function cajaSilueta(d) { const n = (d.silueta.match(/-?\d+(\.\d+)?/g) || []).map(Number); let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (let i = 0; i + 1 < n.length; i += 2) { x0 = Math.min(x0, n[i]); x1 = Math.max(x1, n[i]); y0 = Math.min(y0, n[i + 1]); y1 = Math.max(y1, n[i + 1]); } return { x0, y0, x1, y1 }; }
  function contactoRueda(e) { const t = e.rot * Math.PI / 180, c = Math.cos(t), s = Math.sin(t), rx = e.rx * e.k, ry = e.ry * e.k; let mejor = [e.cx, e.cy]; for (let i = 0; i < 360; i += 2) { const a = i * Math.PI / 180, x = e.cx + rx * Math.cos(a) * c - ry * Math.sin(a) * s, y = e.cy + rx * Math.cos(a) * s + ry * Math.sin(a) * c; if (y > mejor[1]) mejor = [x, y]; } return mejor; }

  function vehiculo(host, d, opciones) {
    const o = Object.assign({ modo: 'plano', barrido: false, cotas: false, rejilla: false, cursor: true, lectura: false, revelado: 'lente', paradas: null, boceto: 0.42, velocidad: 1, reproducir: true, alVer: false, semilla: 7, grosor: { sil: 2.2, lin: 1.15, rueda: 1.4, guia: 1.2 } }, opciones || {});
    const W = d.w, H = d.h, px = W * 0.07, py = H * 0.16, pyAbajo = H * (o.cotas ? 0.34 : 0.16);
    const VX = -px, VY = -py, VW = W + 2 * px, VH = H + py + pyAbajo;
    const pal = paleta(host);
    const boceto = o.bocetoUrl || d.boceto;
    const meta = d.meta || {}; const ruedas = meta.ruedas || [];

    /* ---------- estructura ---------- */
    const raiz = document.createElement('div');
    raiz.className = 'dm-vehiculo'; raiz.setAttribute('role', 'img'); raiz.setAttribute('aria-label', o.etiqueta || 'Plano del vehículo');
    raiz.style.cssText = `position:relative;width:100%;max-width:100%;aspect-ratio:${VW.toFixed(1)} / ${VH.toFixed(1)};`;
    const lienzo = document.createElement('canvas'); lienzo.style.cssText = 'position:absolute;left:0;top:0;width:100%;height:100%;display:block';
    const svg = el('svg', { viewBox: `${VX} ${VY} ${VW} ${VH}`, preserveAspectRatio: 'xMidYMid meet', style: 'position:absolute;left:0;top:0;width:100%;height:100%;overflow:hidden', 'aria-hidden': 'true' });
    raiz.appendChild(lienzo); raiz.appendChild(svg); host.appendChild(raiz);
    const uid = 'dm' + Math.floor(Math.random() * 1e9).toString(36);
    const defs = el('defs', null, svg);
    const sw = (clave) => `var(--dm-${clave})`;
    // grosores en px de pantalla: se traducen a unidades del dibujo al cambiar de tamaño
    const escala = () => (raiz.clientWidth || 1) / VW;
    const fijos = [];   // grosores que no heredan (rect de la línea, arco del lente): se fijan por atributo
    const aplicarGrosor = () => { const k = escala(); for (const c in o.grosor) svg.style.setProperty(`--dm-${c}`, (o.grosor[c] / k).toFixed(3)); fijos.forEach(([e, attr, c, f]) => e.setAttribute(attr, (o.grosor[c] * f / k).toFixed(3))); };

    /* ---------- capas del plano ---------- */
    let gRejilla = null;
    if (o.rejilla) {
      const paso = W / 12, pat = el('pattern', { id: uid + 'r', width: paso, height: paso, patternUnits: 'userSpaceOnUse', x: 0, y: 0 }, defs);
      el('path', { d: `M0 0H${paso}M0 0V${paso}`, stroke: pal.linea, 'stroke-width': 1, 'vector-effect': 'non-scaling-stroke', fill: 'none' }, pat);
      gRejilla = el('rect', { x: VX, y: VY, width: VW, height: VH, fill: `url(#${uid}r)` }, svg);
    }
    const cs = cajaSilueta(d);
    const contactos = ruedas.map(contactoRueda);
    const gCons = el('g', { fill: 'none', stroke: pal.txt3, style: `stroke-width:${sw('guia')}` }, svg);
    const trazos = [];                        // todo lo que se dibuja con pathLength=1
    const linea = (padre, dd, estilo) => { const p = el('path', { d: dd, pathLength: 1, 'stroke-dasharray': '1 1', 'stroke-dashoffset': 1, fill: 'none', style: estilo || '' }, padre); trazos.push(p); return p; };
    let suelo = null, techo = null; const ejes = [];
    if (contactos.length >= 2) {
      const [a, b] = contactos, m = (b[1] - a[1]) / (b[0] - a[0] || 1), yEn = (x) => a[1] + m * (x - a[0]);
      suelo = linea(gCons, `M${(-px * 0.7).toFixed(1)} ${yEn(-px * 0.7).toFixed(1)}L${(W + px * 0.7).toFixed(1)} ${yEn(W + px * 0.7).toFixed(1)}`);
      ruedas.forEach((e) => ejes.push(linea(gCons, `M${e.cx - e.rx * 0.5} ${e.cy}H${e.cx + e.rx * 0.5}M${e.cx} ${e.cy - e.ry * 0.5}V${e.cy + e.ry * 0.5}`)));
    }
    techo = linea(gCons, `M${(cs.x0 + (cs.x1 - cs.x0) * 0.35).toFixed(1)} ${cs.y0.toFixed(1)}H${(W + px * 0.7).toFixed(1)}`);

    // grupo del plano (en el modo mixto va dentro del lente)
    const clipLente = el('clipPath', { id: uid + 'l' }, defs); const circLente = el('circle', { cx: -1e4, cy: -1e4, r: 0 }, clipLente);
    const clipFranja = el('clipPath', { id: uid + 'f' }, defs); const rectFranja = el('rect', { x: VX, y: VY, width: 0, height: VH }, clipFranja);
    const gMarco = el('g', null, svg);
    if (o.modo === 'mixto') gMarco.setAttribute('clip-path', `url(#${o.revelado === 'franja' ? uid + 'f' : uid + 'l'})`);
    const disco = o.modo === 'mixto' ? el('rect', { x: VX, y: VY, width: VW, height: VH, fill: pal.sup1, opacity: 0.9 }, gMarco) : null;
    const gZoom = el('g', null, gMarco);
    const imgBoceto = boceto ? el('image', { href: boceto, x: 0, y: 0, width: W, height: H, preserveAspectRatio: 'none', opacity: 0, style: pal.claro ? 'filter:brightness(0)' : '' }, gZoom) : null;
    const clipBoceto = el('clipPath', { id: uid + 'b' }, defs); const rectBoceto = el('rect', { x: VX, y: VY, width: VW, height: VH }, clipBoceto);
    if (imgBoceto && o.barrido) imgBoceto.setAttribute('clip-path', `url(#${uid}b)`);
    const gLin = el('g', { fill: 'none', stroke: pal.txt2, style: `stroke-width:${sw('lin')}` }, gZoom);
    const lineas = (d.lineas || []).map((l) => { const p = linea(gLin, l.d); p.dataset.op = Math.min(1, 0.45 + (l.f || 200) / 380).toFixed(2); p.dataset.cx = l.cx != null ? l.cx : W / 2; return p; });
    const gRue = el('g', { fill: 'none', stroke: pal.txt1, style: `stroke-width:${sw('rueda')}` }, gZoom);
    const elip = (e, f) => { const rx = e.rx * f, ry = e.ry * f; return `M${e.cx - rx} ${e.cy}a${rx} ${ry} 0 1 0 ${2 * rx} 0a${rx} ${ry} 0 1 0 ${-2 * rx} 0`; };
    const rue = ruedas.map((e) => { const g = el('g', { transform: `rotate(${e.rot} ${e.cx} ${e.cy})` }, gRue); return { e, llanta: linea(g, elip(e, e.k)), rin: linea(g, elip(e, 1), 'opacity:.8'), cubo: linea(g, elip(e, 0.22), 'opacity:.7') }; });
    const sil = linea(gZoom, d.silueta, `stroke:${pal.txt1};stroke-width:${sw('sil')}`);
    const medida = el('path', { d: d.silueta, fill: 'none', stroke: 'none' }, svg); const LS = medida.getTotalLength();

    // cotas
    let cota = null;
    if (o.cotas && contactos.length >= 2) {
      const [a, b] = contactos, dx = b[0] - a[0], dy = b[1] - a[1], L = Math.hypot(dx, dy), nx = -dy / L, ny = dx / L, off = H * 0.13, q1 = [a[0] + nx * off, a[1] + ny * off], q2 = [b[0] + nx * off, b[1] + ny * off], mid = [(q1[0] + q2[0]) / 2, (q1[1] + q2[1]) / 2];
      const g = el('g', { fill: 'none', stroke: pal.txt2, style: `stroke-width:${sw('guia')}` }, svg);
      cota = { ext: [linea(g, `M${a[0] + nx * 8} ${a[1] + ny * 8}L${q1[0] + nx * 14} ${q1[1] + ny * 14}`), linea(g, `M${b[0] + nx * 8} ${b[1] + ny * 8}L${q2[0] + nx * 14} ${q2[1] + ny * 14}`)], a: linea(g, `M${mid[0]} ${mid[1]}L${q1[0]} ${q1[1]}`), b: linea(g, `M${mid[0]} ${mid[1]}L${q2[0]} ${q2[1]}`),
        marcas: el('path', { d: `M${q1[0] - 9} ${q1[1] + 9}L${q1[0] + 9} ${q1[1] - 9}M${q2[0] - 9} ${q2[1] + 9}L${q2[0] + 9} ${q2[1] - 9}`, stroke: pal.txt1, opacity: 0, style: `stroke-width:${sw('rueda')}` }, g),
        texto: el('text', { x: 0, y: 0, 'text-anchor': 'middle', fill: pal.txt2, opacity: 0, transform: `translate(${mid[0] - nx * 16} ${mid[1] - ny * 16}) rotate(${Math.atan2(dy, dx) * 180 / Math.PI})`, style: `font:600 ${(W * 0.024).toFixed(1)}px Montserrat, Arial, sans-serif;letter-spacing:.22em` }, g) };
      cota.texto.textContent = o.textoCota || 'ENTRE EJES';
    }

    // línea de barrido / escaneo con su halo, y el lente
    const gBar = el('g', { opacity: 0 }, svg);
    const vertical = o.modo === 'puntos';                     // el escaneo de puntos baja; los demás barridos cruzan
    const grad = el('linearGradient', { id: uid + 'h', x1: vertical ? 0 : 1, y1: vertical ? 1 : 0, x2: 0, y2: 0 }, defs);
    el('stop', { offset: 0, 'stop-color': pal.acc2, 'stop-opacity': 0.22 }, grad); el('stop', { offset: 1, 'stop-color': pal.acc2, 'stop-opacity': 0 }, grad);
    const halo = vertical ? el('rect', { x: VX, width: VW, height: H * 0.28, fill: `url(#${uid}h)` }, gBar) : el('rect', { y: VY, height: VH, width: W * 0.2, fill: `url(#${uid}h)` }, gBar);
    const raya = vertical ? el('rect', { x: VX, width: VW, height: 1, fill: pal.acc2 }, gBar) : el('rect', { y: VY, height: VH, width: 1, fill: pal.acc2 }, gBar);
    fijos.push([raya, vertical ? 'height' : 'width', 'rueda', 1.2]);
    const pct = o.lectura ? el('text', { 'text-anchor': 'end', fill: pal.txt1, style: `font:400 ${(W * 0.045).toFixed(1)}px 'Bebas Neue', 'Arial Narrow', sans-serif` }, gBar) : null;
    const gLente = el('g', { opacity: 0 }, svg);
    const R0 = Math.min(W, H) * 0.3;
    el('circle', { r: R0, fill: 'none', stroke: pal.txt1, style: `stroke-width:${sw('rueda')}` }, gLente);
    const marcas = el('g', null, gLente);
    for (let i = 0; i < 72; i++) { const a = i * 5 * Math.PI / 180, l = i % 6 ? R0 * 0.045 : R0 * 0.1; el('line', { x1: Math.cos(a) * R0 * 1.04, y1: Math.sin(a) * R0 * 1.04, x2: Math.cos(a) * (R0 * 1.04 + l), y2: Math.sin(a) * (R0 * 1.04 + l), stroke: i % 6 ? pal.txt3 : pal.txt2, style: `stroke-width:${sw('guia')}` }, marcas); }
    const arco = el('path', { d: `M${R0 * 1.02} 0A${R0 * 1.02} ${R0 * 1.02} 0 0 1 ${R0 * 1.02 * Math.cos(1.05)} ${R0 * 1.02 * Math.sin(1.05)}`, fill: 'none', stroke: pal.acc2 }, gLente);
    fijos.push([arco, 'stroke-width', 'rueda', 2.6]);
    // cursor de CAD
    const gCur = el('g', { opacity: 0 }, svg);
    const cz = W * 0.022; el('path', { d: `M${-cz * 1.6} 0H${-cz * 0.45}M${cz * 0.45} 0H${cz * 1.6}M0 ${-cz * 1.6}V${-cz * 0.45}M0 ${cz * 0.45}V${cz * 1.6}`, stroke: pal.txt1, style: `stroke-width:${sw('rueda')}` }, gCur);
    el('rect', { x: -cz * 0.32, y: -cz * 0.32, width: cz * 0.64, height: cz * 0.64, fill: 'none', stroke: pal.txt1, style: `stroke-width:${sw('rueda')}` }, gCur);

    /* ---------- nube y punteado (canvas) ---------- */
    const R = rnd(o.semilla);
    const nube = (d.puntos || []).map(([x, y, b]) => { const a = R() * 6.2832, dist = W * (0.18 + R() * 0.62); return { x, y, b, sx: x + Math.cos(a) * dist, sy: y + Math.sin(a) * dist * 0.6 - H * 0.2, del: R() * 0.5 + (x / W) * 0.25, fase: R() * 6.28 }; });
    const aPuntos = (lista) => (lista || []).map(([x, y, a]) => ({ x, y, a, del: R() }));
    const puntFino = aPuntos(d.punteado), puntAncho = d.punteado2 ? aPuntos(d.punteado2) : null;
    let punt = puntFino;
    const est = { t: 0, scan: null, nube: 0, punteado: 0, atenuar: 1 };   // lo que pinta el canvas

    /* ---------- pistas: cada una fija su estado a partir de u ∈ [0,1] ---------- */
    const pistas = [];
    // g: grupo de la propiedad. Si varios tramos animan lo mismo, en cada instante manda el último
    // que ya empezó (o el primero, antes de que empiece ninguno); así ir(t) sirve hacia atrás y hacia adelante.
    const pista = (a, dur, e, f, g) => pistas.push({ a, d: Math.max(dur, 1e-3), e, f, g, u: -1 });
    const dash = (p, v) => p.setAttribute('stroke-dashoffset', (1 - v).toFixed(4));
    const semillaTrazos = rnd(o.semilla + 11);
    const plumaSil = (a, dur, op) => {
      pista(a, dur, EASE.draw, (v) => { dash(sil, v); const pt = medida.getPointAtLength(v * LS); gCur.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`); });
      if (o.cursor) { pista(a, 0.15, EASE.lin, (v) => gCur.setAttribute('opacity', v), 'cur'); pista(a + dur, 0.2, EASE.lin, (v) => gCur.setAttribute('opacity', 1 - v), 'cur'); }
      if (op != null) sil.style.opacity = op;
    };
    const calco = (a, ventana, opBase) => lineas.forEach((p, i) => { const len = (d.lineas[i] && d.lineas[i].len) || 60; const t0 = a + Math.pow(semillaTrazos(), 1.25) * ventana + (i / lineas.length) * ventana * 0.12; pista(t0, Math.min(0.5, 0.16 + Math.sqrt(len) / 60), EASE.out, (v) => dash(p, v)); p.style.opacity = opBase != null ? opBase : p.dataset.op; });
    const dibujarRuedas = (a) => rue.forEach((w, i) => { pista(a + i * 0.12, 0.7, EASE.draw, (v) => dash(w.llanta, v)); pista(a + 0.15 + i * 0.12, 0.6, EASE.draw, (v) => dash(w.rin, v)); pista(a + 0.4 + i * 0.12, 0.35, EASE.out, (v) => dash(w.cubo, v)); });
    const construccion = (a) => { if (suelo) pista(a, 0.55, EASE.out, (v) => dash(suelo, v)); pista(a + 0.08, 0.5, EASE.out, (v) => dash(techo, v)); ejes.forEach((p, i) => pista(a + 0.2 + i * 0.08, 0.3, EASE.out, (v) => dash(p, v))); };
    const bocetoEn = (a, dur, hasta) => { if (imgBoceto) pista(a, dur, EASE.lin, (v) => imgBoceto.setAttribute('opacity', (v * hasta).toFixed(3))); };
    const cotasEn = (a) => { if (!cota) return; cota.ext.forEach((p) => pista(a, 0.3, EASE.out, (v) => dash(p, v))); pista(a + 0.25, 0.45, EASE.snap, (v) => { dash(cota.a, v); dash(cota.b, v); }); pista(a + 0.6, 0.25, EASE.lin, (v) => { cota.marcas.setAttribute('opacity', v); cota.texto.setAttribute('opacity', v); }); };
    let fin = 0;

    if (o.modo === 'plano' && !o.barrido) {
      construccion(0); plumaSil(0.15, 1.3); calco(0.3, 1.15); dibujarRuedas(0.7); bocetoEn(1.35, 0.6, o.boceto); cotasEn(1.75);
      fin = o.cotas ? 2.7 : 2.2;
    } else if (o.modo === 'plano' && o.barrido) {
      // borrador: silueta y trazos tenues; la línea azul los pasa en limpio a su paso
      plumaSil(0, 1.3, 0.62); calco(0.1, 1.2, 0.3);
      const B0 = 1.5, BD = 1.5, x0 = VX, x1 = W + px;
      const xEn = (v) => x0 + (x1 - x0) * v;
      pista(B0 - 0.05, 0.1, EASE.lin, (v) => gBar.setAttribute('opacity', v), 'bar');
      pista(B0, BD, EASE.sweep, (v) => {
        const x = xEn(v); raya.setAttribute('x', x); halo.setAttribute('x', x - W * 0.2);
        rectBoceto.setAttribute('width', Math.max(0, x - VX));
        sil.style.opacity = x > W ? 1 : 0.62 + 0.38 * cl((x - cs.x0) / (cs.x1 - cs.x0));
        lineas.forEach((p) => { p.style.opacity = +p.dataset.cx < x ? p.dataset.op : 0.3; });
      });
      if (imgBoceto) { rectBoceto.setAttribute('width', 0); imgBoceto.setAttribute('opacity', o.boceto); }
      // ruedas y construcción se trazan cuando la línea pasa por ellas
      rue.forEach((w) => { const u = cl((w.e.cx - x0) / (x1 - x0)); const tu = B0 + BD * inversa(EASE.sweep, u); pista(tu, 0.45, EASE.draw, (v) => { dash(w.llanta, v); dash(w.rin, v); }); pista(tu + 0.25, 0.3, EASE.out, (v) => dash(w.cubo, v)); });
      construccion(B0 + BD * 0.55);
      pista(B0 + BD, 0.25, EASE.lin, (v) => gBar.setAttribute('opacity', 1 - v), 'bar');
      cotasEn(B0 + BD); fin = B0 + BD + (o.cotas ? 0.9 : 0.3);
    } else if (o.modo === 'puntos') {
      // la nube llega volando; la línea baja y deja el punteado fino detrás
      const S0 = 1.3, SD = 1.8, y0 = VY, y1 = H + pyAbajo * 0.5;
      pista(0, 6, EASE.lin, (v) => { est.t = v * 6; });
      pista(S0 - 0.05, 0.12, EASE.lin, (v) => gBar.setAttribute('opacity', v), 'bar');
      pista(S0, SD, EASE.sweep, (v) => { const y = y0 + (y1 - y0) * v; est.scan = v <= 0 ? null : y; raya.setAttribute('y', y); halo.setAttribute('y', y - H * 0.28); if (pct) { pct.setAttribute('x', W + px * 0.35); pct.setAttribute('y', y - H * 0.03); pct.textContent = Math.round(v * 100) + ' %'; } });
      pista(S0 + SD, 0.3, EASE.lin, (v) => gBar.setAttribute('opacity', 1 - v), 'bar');
      est.modo = 'puntos'; fin = S0 + SD + 0.3;
    } else if (o.modo === 'mixto') {
      // base de puntos que aparece; el plano solo se ve dentro del lente (o detrás de la franja)
      pista(0, 6, EASE.lin, (v) => { est.t = v * 6; }); est.modo = 'mixto';
      // el plano ya está trazado por dentro: solo lo revela el recorte
      [sil, ...lineas, ...rue.flatMap((w) => [w.llanta, w.rin, w.cubo])].forEach((p) => p.setAttribute('stroke-dashoffset', 0));
      if (imgBoceto) imgBoceto.setAttribute('opacity', Math.min(0.6, o.boceto + 0.15));
      if (o.revelado === 'franja') {
        const B0 = 0.9, BD = 1.6, x0 = VX, x1 = W + px;
        pista(B0 - 0.05, 0.1, EASE.lin, (v) => gBar.setAttribute('opacity', v), 'bar');
        pista(B0, BD, EASE.sweep, (v) => { const x = x0 + (x1 - x0) * v; raya.setAttribute('x', x); halo.setAttribute('x', x - W * 0.2); rectFranja.setAttribute('width', Math.max(0, x - VX)); est.corte = x; });
        pista(B0 + BD, 0.25, EASE.lin, (v) => gBar.setAttribute('opacity', 1 - v), 'bar');
        pista(B0 + BD, 0.5, EASE.lin, (v) => { est.atenuar = 1 - 0.7 * v; });
        fin = B0 + BD + 0.5;
      } else {
        const paradas = (o.paradas || [[0.3, 0.42], [0.66, 0.28], [0.9, 0.62]]).map(([u, w]) => [u * W, w * H]);
        const L = { x: VX - R0, y: paradas[0][1], r: R0, z: 1.15, giro: 0 };
        const pintarLente = () => { circLente.setAttribute('cx', L.x); circLente.setAttribute('cy', L.y); circLente.setAttribute('r', L.r); gZoom.setAttribute('transform', `translate(${L.x} ${L.y}) scale(${L.z}) translate(${-L.x} ${-L.y})`); gLente.setAttribute('transform', `translate(${L.x} ${L.y})`); marcas.setAttribute('transform', `rotate(${L.giro * 0.35})`); arco.setAttribute('transform', `rotate(${L.giro})`); };
        // recorrido por fotogramas clave: {t, x, y, r, z, e} (e: curva del tramo que termina en esa clave)
        const claves = [{ t: 0.8, x: VX - R0, y: paradas[0][1], r: R0, z: 1.15 }];
        let t = 0.8;
        paradas.forEach((p, i) => { const dur = i ? 0.6 : 0.8; t += dur; claves.push({ t, x: p[0], y: p[1], r: R0, z: 1.15, e: i ? EASE.draw : EASE.out }); t += 0.75; claves.push({ t, x: p[0], y: p[1], r: R0, z: 1.15 }); });
        claves.push({ t: t + 0.45, x: W / 2, y: H / 2, r: R0, z: 1.15, e: EASE.draw });
        claves.push({ t: t + 0.95, x: W / 2, y: H / 2, r: Math.hypot(VW, VH), z: 1, e: EASE.snap });
        const tFin = claves[claves.length - 1].t;
        pista(0, tFin, EASE.lin, (v) => {
          const tt = v * tFin; let k = 0; while (k < claves.length - 1 && claves[k + 1].t <= tt) k++;
          const A = claves[k], B = claves[Math.min(k + 1, claves.length - 1)];
          const u = B === A ? 1 : (B.e || EASE.lin)(cl((tt - A.t) / (B.t - A.t)));
          for (const q of ['x', 'y', 'r', 'z']) L[q] = A[q] + (B[q] - A[q]) * u;
          L.giro = tt * 620 / 7; pintarLente();
        });
        pista(0.8, 0.2, EASE.lin, (v) => gLente.setAttribute('opacity', v), 'len');
        pista(t + 0.4, 0.3, EASE.lin, (v) => gLente.setAttribute('opacity', 1 - v), 'len');
        pista(t + 0.5, 0.6, EASE.lin, (v) => { est.atenuar = 1 - 0.72 * v; });
        fin = t + 1.1;
      }
    }

    function inversa(e, y) { let lo = 0, hi = 1; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (e(m) < y) lo = m; else hi = m; } return (lo + hi) / 2; }

    /* ---------- canvas ---------- */
    function pintar() {
      if (!est.modo) { if (lienzo.width) { lienzo.width = 0; } return; }
      const dpr = global.devicePixelRatio || 1, cw = Math.max(1, Math.round(raiz.clientWidth * dpr)), ch = Math.max(1, Math.round(raiz.clientHeight * dpr));
      if (lienzo.width !== cw || lienzo.height !== ch) { lienzo.width = cw; lienzo.height = ch; }
      const g = lienzo.getContext('2d'); g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, cw, ch);
      const k = cw / VW; g.setTransform(k, 0, 0, k, -VX * k, -VY * k);
      const kp = k / dpr;                                     // px de pantalla por unidad del dibujo
      const t = est.t, scan = est.scan, rP = Math.max(0.75, Math.min(1.6, 1.25 * kp)) / kp;   // radio del punteado
      // densidad: el punteado fino pide ≥2,4 px entre puntos; si no alcanza, el espaciado; la nube se ralea
      punt = (4.2 * kp >= 2.4 || !puntAncho) ? puntFino : puntAncho;
      const pasoP = punt === puntFino ? 4.2 : 8.4, ralearP = Math.max(1, Math.ceil(Math.pow(2.4 / (pasoP * kp), 2)));
      const ralear = Math.max(1, Math.ceil(Math.pow(2.6 / (4.2 * kp), 2)));
      g.fillStyle = pal.txt1;
      if (est.modo === 'puntos') {
        for (let i = 0; i < nube.length; i += ralear) { const p = nube[i]; const u = cl((t - p.del) / 0.85), e2 = 1 - Math.pow(1 - u, 3); const x = p.sx + (p.x - p.sx) * e2, y = p.sy + (p.y - p.sy) * e2; let a = p.b * (0.25 + 0.75 * e2) * (0.8 + 0.2 * Math.sin(t * 5 + p.fase)); if (scan != null) { const q = (scan - y) / (H * 0.1); if (q > 0) a *= Math.max(0, 1 - q); } if (a <= 0.02) continue; g.globalAlpha = Math.min(1, a); const s = (1.6 - 0.5 * e2) / kp; g.fillRect(x - s / 2, y - s / 2, s, s); }
        if (scan != null) for (let i = 0; i < punt.length; i += ralearP) { const p = punt[i]; const q = (scan - p.y) / (H * 0.07); if (q <= 0) continue; const a = p.a * Math.min(1, q); const brillo = q < 1.6; g.globalAlpha = a; g.fillStyle = brillo ? pal.acc2 : pal.txt1; g.beginPath(); g.arc(p.x, p.y, rP * (brillo ? 1.25 : 1), 0, 6.2832); g.fill(); }
      } else if (est.modo === 'mixto') {
        const at = est.atenuar;
        for (let i = 0; i < punt.length; i += ralearP) { const p = punt[i]; const u = cl((t - p.del * 0.75) / 0.25); if (u <= 0) continue; if (est.corte != null && p.x < est.corte) continue; g.globalAlpha = p.a * u * at; g.beginPath(); g.arc(p.x, p.y, rP, 0, 6.2832); g.fill(); }
      }
      g.globalAlpha = 1;
    }

    /* ---------- reloj ---------- */
    const duracion = fin;
    let t = 0, corriendo = false, ultimo = 0, raf = 0;
    const ultimoDeGrupo = {};
    function render(tt) {
      t = Math.max(0, Math.min(duracion, tt));
      const manda = {};
      for (const p of pistas) if (p.g && (!manda[p.g] || p.a <= t)) manda[p.g] = p;
      for (const p of pistas) {
        if (p.g) { if (manda[p.g] !== p) continue; if (ultimoDeGrupo[p.g] !== p) { ultimoDeGrupo[p.g] = p; p.u = -1; } }
        const u = cl((t - p.a) / p.d); if (u === p.u) continue; p.u = u; p.f(p.e(u), u);
      }
      pintar();
    }
    function paso(ahora) { if (!corriendo) return; const dt = Math.min(0.1, (ahora - ultimo) / 1000) * o.velocidad; ultimo = ahora; render(t + dt); if (t >= duracion) { corriendo = false; if (o.alTerminar) o.alTerminar(); return; } raf = requestAnimationFrame(paso); }
    const api = {
      raiz, duracion,
      play(desde) { if (desde != null) render(desde); else if (t >= duracion) render(0); corriendo = true; ultimo = performance.now(); cancelAnimationFrame(raf); raf = requestAnimationFrame(paso); return api; },
      pause() { corriendo = false; cancelAnimationFrame(raf); return api; },
      ir(s) { render(s); return api; },
      tiempo: () => t,
      destruir() { api.pause(); if (ro) ro.disconnect(); if (io) io.disconnect(); raiz.remove(); },
    };
    aplicarGrosor(); render(0);
    let ro = null, io = null;
    if ('ResizeObserver' in global) { ro = new ResizeObserver(() => { aplicarGrosor(); pintar(); }); ro.observe(raiz); }
    const reducido = global.matchMedia && global.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reducido) render(duracion);
    else if (o.alVer && 'IntersectionObserver' in global) { io = new IntersectionObserver((es) => { if (es.some((e) => e.isIntersecting)) { io.disconnect(); io = null; api.play(0); } }, { threshold: 0.3 }); io.observe(raiz); }
    else if (o.reproducir) api.play(0);
    return api;
  }

  global.DRSMovimiento = Object.assign(global.DRSMovimiento || {}, { vehiculo, version: '1.0' });
})(window);
