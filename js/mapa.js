/* =============================================================================
   DRS MOTORS · DEMO — MAPA BASE DE BOGOTÁ  (js/mapa.js)
   Plano ESTILIZADO, no cartografía real. Malla vial, avenidas, cerros, agua y
   etiquetas se generan por código con azar determinista: dos ejecuciones dan
   el mismo SVG. Sin archivos externos, sin fetch: funciona con file://.

   Convención de Bogotá: las CALLES crecen hacia el norte (arriba) y las
   CARRERAS hacia el occidente (izquierda). Calles del sur y carreras del
   oriente son negativas (Calle 20 Sur = -20 · Carrera 3 Este = -3).
   1 cuadra ≈ 100 m ≈ 10 unidades del viewBox. Norte arriba.

   API — DRS.mapa
     W, H, S                 lienzo 1440 × 2600 (unidades del viewBox) · 10 unidades por cuadra
     pt(calle, carrera)      → [x, y]
     inv(x, y)               → [calle, carrera]
     vista(calle, carrera, anchoPx, altoPx, escala = 1)
                             → 'x y w h' para el viewBox (escala = px de pantalla por unidad)
     svg({ detalle: 'alto' | 'medio', clase: '' })
                             → '<svg class="mapa-base mapa-alto|mapa-medio …">' completo, sin
                               marcadores. Se genera una vez por detalle (≈130 ms) y se reutiliza.
                               'alto'  vista de calle, ≈0,8–3 px por unidad: toda la malla.
                               'medio' vista de conjunto, ≈0,4–0,7 px por unidad (una ruta entera
                                       en el celular): texto al doble, menos etiquetas y calles.
     rutear([c, k], [c, k])  → { puntos: [[x, y]…], km, min, pasos: [texto…],
                                 tramos: [{ via, km, puntos }] }   2–5 tramos en viajes normales
     dir(calle, carrera)     → 'Calle 127 # 19-40'
     ZONAS                   → [{ nombre, calle, carrera, tipo: 'localidad' | 'barrio' }]
   Zoom. Con viewBox o con transform: scale(z) sobre el lienzo, fija --mapa-k: z en el
   <svg> y las etiquetas conservan su tamaño en pantalla (ver css/mapa.css).
============================================================================= */
(function () {
  'use strict';
  const DRS = window.DRS;

  /* ------------------------------------------------------------ 1 · lienzo */
  const W = 1440, H = 2600, S = 10, X0 = 1275, Y0 = 2075;
  const C_MIN = (Y0 - H) / S, C_MAX = Y0 / S;          // −52,5 … 207,5
  const K_MIN = (X0 - W) / S, K_MAX = X0 / S;          // −16,5 … 127,5
  const xk = (k) => X0 - S * k;
  const yc = (c) => Y0 - S * c;
  const pt = (c, k) => [xk(k), yc(c)];
  const inv = (x, y) => [(Y0 - y) / S, (X0 - x) / S];

  /* ------------------------------------------------- 2 · azar determinista */
  function mezcla(n) {
    n = (n ^ (n >>> 16)) >>> 0;
    n = Math.imul(n, 0x7feb352d); n = (n ^ (n >>> 15)) >>> 0;
    n = Math.imul(n, 0x846ca68b); n = (n ^ (n >>> 16)) >>> 0;
    return n;
  }
  const hash = (i, j, s) =>
    mezcla(Math.imul(i | 0, 0x9e3779b1) ^ mezcla(Math.imul(j | 0, 0x85ebca77) ^ mezcla((s | 0) + 0x27d4eb2f))) / 4294967296;
  const suave = (t) => t * t * (3 - 2 * t);
  function ruido1(t, s) {
    const i = Math.floor(t), u = suave(t - i);
    return (hash(i, 0, s) * (1 - u) + hash(i + 1, 0, s) * u) * 2 - 1;
  }
  function ruido2(x, y, s) {
    const i = Math.floor(x), j = Math.floor(y), u = suave(x - i), v = suave(y - j);
    const a = hash(i, j, s), b = hash(i + 1, j, s), c = hash(i, j + 1, s), d = hash(i + 1, j + 1, s);
    return ((a + (b - a) * u) * (1 - v) + (c + (d - c) * u) * v) * 2 - 1;
  }
  const fbm = (x, y, s) => 0.62 * ruido2(x, y, s) + 0.26 * ruido2(x * 2.07 + 5.3, y * 2.07 + 1.7, s + 7)
    + 0.12 * ruido2(x * 4.3 + 2.1, y * 4.3 + 7.9, s + 13);
  function azar(semilla) {
    let a = semilla >>> 0;
    return () => {
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /* --------------------------------------------------------- 3 · geometría */
  const r1 = (v) => Math.round(v * 10) / 10;
  const dist = (a, b) => Math.hypot(b[0] - a[0], b[1] - a[1]);
  /** tabla [[x, y]…] ordenada por x ascendente → y interpolada */
  function interp(t, v) {
    if (v <= t[0][0]) return t[0][1];
    for (let i = 1; i < t.length; i++) {
      if (v <= t[i][0]) { const [a0, b0] = t[i - 1], [a1, b1] = t[i]; return b0 + ((b1 - b0) * (v - a0)) / (a1 - a0); }
    }
    return t[t.length - 1][1];
  }
  /** precalcula f en [a, b] con paso fijo → búsqueda O(1) con interpolación lineal */
  function tablaRapida(f, a, b, paso) {
    const n = Math.ceil((b - a) / paso) + 1, v = new Float64Array(n);
    for (let i = 0; i < n; i++) v[i] = f(a + i * paso);
    return (x) => {
      let t = (x - a) / paso;
      if (t <= 0) return v[0];
      if (t >= n - 1) return v[n - 1];
      const i = t | 0; t -= i;
      return v[i] * (1 - t) + v[i + 1] * t;
    };
  }
  function caja(p) {
    let c0 = Infinity, c1 = -Infinity, k0 = Infinity, k1 = -Infinity;
    for (const [c, k] of p) { if (c < c0) c0 = c; if (c > c1) c1 = c; if (k < k0) k0 = k; if (k > k1) k1 = k; }
    return [c0, c1, k0, k1];
  }
  function dentro(p, c, k) {
    let d = false;
    for (let i = 0, j = p.length - 1; i < p.length; j = i++) {
      const ci = p[i][0], ki = p[i][1], cj = p[j][0], kj = p[j][1];
      if ((ci > c) !== (cj > c) && k < ((kj - ki) * (c - ci)) / (cj - ci) + ki) d = !d;
    }
    return d;
  }
  function largo(p) { let s = 0; for (let i = 1; i < p.length; i++) s += dist(p[i - 1], p[i]); return s; }
  function area(p) { let s = 0; for (let i = 0, j = p.length - 1; i < p.length; j = i++) s += (p[j][1] + p[i][1]) * (p[j][0] - p[i][0]); return s / 2; }
  /** misma orientación para todos los polígonos: con fill-rule nonzero los solapes no abren huecos */
  const orientar = (p) => (area(p) < 0 ? p.slice().reverse() : p);
  function remuestrear(p, paso) {
    const out = [p[0]];
    let resto = 0;
    for (let i = 1; i < p.length; i++) {
      const a = p[i - 1], b = p[i], l = dist(a, b);
      let t = paso - resto;
      while (t <= l) { out.push([a[0] + ((b[0] - a[0]) * t) / l, a[1] + ((b[1] - a[1]) * t) / l]); t += paso; }
      resto = l - (t - paso);
    }
    const u = p[p.length - 1];
    if (dist(u, out[out.length - 1]) > paso * 0.3) out.push(u);
    return out;
  }
  /** Douglas–Peucker iterativo */
  function simplificar(p, tol) {
    if (p.length < 3) return p;
    const keep = new Uint8Array(p.length);
    keep[0] = keep[p.length - 1] = 1;
    const pila = [[0, p.length - 1]];
    while (pila.length) {
      const [i0, i1] = pila.pop();
      const ax = p[i0][0], ay = p[i0][1], dx = p[i1][0] - ax, dy = p[i1][1] - ay, l2 = dx * dx + dy * dy || 1e-12;
      let dmax = 0, im = -1;
      for (let i = i0 + 1; i < i1; i++) {
        let t = ((p[i][0] - ax) * dx + (p[i][1] - ay) * dy) / l2;
        t = t < 0 ? 0 : t > 1 ? 1 : t;
        const d = Math.hypot(ax + t * dx - p[i][0], ay + t * dy - p[i][1]);
        if (d > dmax) { dmax = d; im = i; }
      }
      if (dmax > tol) { keep[im] = 1; pila.push([i0, im], [im, i1]); }
    }
    return p.filter((_, i) => keep[i]);
  }
  /** punto más cercano de una polilínea: { d, s (longitud recorrida), c, k, i (segmento) } */
  function proyectar(p, c, k) {
    let m = { d: Infinity }, s0 = 0;
    for (let i = 0; i < p.length - 1; i++) {
      const ac = p[i][0], ak = p[i][1], dc = p[i + 1][0] - ac, dk = p[i + 1][1] - ak, l2 = dc * dc + dk * dk, l = Math.sqrt(l2);
      let t = l2 ? ((c - ac) * dc + (k - ak) * dk) / l2 : 0;
      t = t < 0 ? 0 : t > 1 ? 1 : t;
      const qc = ac + t * dc, qk = ak + t * dk, d = Math.hypot(c - qc, k - qk);
      if (d < m.d) m = { d, s: s0 + t * l, c: qc, k: qk, i };
      s0 += l;
    }
    return m;
  }
  /** punto a la distancia s sobre la polilínea */
  function enS(p, s) {
    for (let i = 0; i < p.length - 1; i++) {
      const l = dist(p[i], p[i + 1]);
      if (s <= l || i === p.length - 2) { const t = l ? Math.max(0, Math.min(1, s / l)) : 0; return [p[i][0] + (p[i + 1][0] - p[i][0]) * t, p[i][1] + (p[i + 1][1] - p[i][1]) * t]; }
      s -= l;
    }
    return p[p.length - 1];
  }
  /** subpolilínea entre s0 y s1 (acepta s0 > s1: la devuelve en ese sentido) */
  function tramoS(p, s0, s1) {
    const inv = s0 > s1, a = Math.min(s0, s1), b = Math.max(s0, s1);
    const out = [enS(p, a)];
    let acc = 0;
    for (let i = 1; i < p.length; i++) { acc += dist(p[i - 1], p[i]); if (acc > a + 1e-6 && acc < b - 1e-6) out.push(p[i]); }
    out.push(enS(p, b));
    return inv ? out.reverse() : out;
  }
  /** cruce de los segmentos ab y cd con tolerancia en los extremos (uniones en T) */
  function cruceSeg(a, b, c, d, tol = 0.25) {
    const r0 = b[0] - a[0], r1_ = b[1] - a[1], s0 = d[0] - c[0], s1 = d[1] - c[1];
    const den = r0 * s1 - r1_ * s0;
    if (Math.abs(den) < 1e-9) return null;
    const q0 = c[0] - a[0], q1 = c[1] - a[1];
    const t = (q0 * s1 - q1 * s0) / den, u = (q0 * r1_ - q1 * r0) / den;
    const et = tol / Math.hypot(r0, r1_), eu = tol / Math.hypot(s0, s1);
    if (t < -et || t > 1 + et || u < -eu || u > 1 + eu) return null;
    const tt = Math.max(0, Math.min(1, t)), uu = Math.max(0, Math.min(1, u));
    return { t: tt, u: uu, c: a[0] + r0 * tt, k: a[1] + r1_ * tt };
  }
  /** franja alrededor de un eje: ancho (cuadras a cada lado) fijo o función del índice */
  function franja(eje, ancho) {
    const izq = [], der = [];
    for (let i = 0; i < eje.length; i++) {
      const a = eje[Math.max(0, i - 1)], b = eje[Math.min(eje.length - 1, i + 1)];
      let dc = b[0] - a[0], dk = b[1] - a[1];
      const l = Math.hypot(dc, dk) || 1; dc /= l; dk /= l;
      const w = typeof ancho === 'function' ? ancho(i, eje.length) : ancho;
      izq.push([eje[i][0] - dk * w, eje[i][1] + dc * w]);
      der.push([eje[i][0] + dk * w, eje[i][1] - dc * w]);
    }
    return izq.concat(der.reverse());
  }
  /** mancha orgánica (humedal, lago): franja con extremos afinados y borde con ruido */
  function mancha(eje, ancho, semilla) {
    const e = remuestrear(eje, 0.25);
    return franja(e, (i, n) => ancho * (0.5 + 0.5 * Math.sqrt(Math.sin((Math.PI * (i + 0.5)) / n))) * (1 + 0.2 * ruido1(i / 11, semilla) + 0.05 * ruido1(i / 3, semilla + 9)));
  }
  const R = (c1, k1, c2, k2) => [[c1, k1], [c1, k2], [c2, k2], [c2, k1]];
  /** rectángulo girado: centro [c, k], dirección u (unitaria, en c/k), semilargo y semiancho en cuadras */
  function rectGirado(ce, u, hl, hw) {
    const n = [u[1], -u[0]];
    return [
      [ce[0] + u[0] * hl + n[0] * hw, ce[1] + u[1] * hl + n[1] * hw],
      [ce[0] + u[0] * hl - n[0] * hw, ce[1] + u[1] * hl - n[1] * hw],
      [ce[0] - u[0] * hl - n[0] * hw, ce[1] - u[1] * hl - n[1] * hw],
      [ce[0] - u[0] * hl + n[0] * hw, ce[1] - u[1] * hl + n[1] * hw],
    ];
  }

  /* -------------------------------------------------------- 4 · trazo SVG */
  // Números con un decimal, sin ceros sobrantes: «-.5» en vez de «-0.5».
  const num = (v) => { const r = Math.round(v * 10) / 10 || 0; return String(r).replace(/^(-?)0\./, '$1.'); };
  const junta = (a, b) => (b[0] === '-' ? a + b : a + ' ' + b);
  /** varias polilíneas en coordenadas del lienzo → un solo «d» con comandos relativos */
  function dRel(lineas, cerrar) {
    let s = '', px = 0, py = 0;
    for (const p of lineas) {
      let prev = null;
      for (let i = 0; i < p.length; i++) {
        const x = Math.round(p[i][0] * 10) / 10, y = Math.round(p[i][1] * 10) / 10;
        if (prev && x === prev[0] && y === prev[1]) continue;
        const dx = num(x - px), dy = num(y - py);
        if (!prev) s += (s ? 'm' : 'M') + (s ? junta(dx, dy) : junta(num(x), num(y)));
        else if (y === py) s += 'h' + dx;
        else if (x === px) s += 'v' + dy;
        else s += 'l' + junta(dx, dy);
        px = x; py = y; prev = [x, y];
      }
      if (cerrar && prev) { s += 'z'; px = Math.round(p[0][0] * 10) / 10; py = Math.round(p[0][1] * 10) / 10; }
    }
    return s;
  }
  const aLienzo = (run) => run.map(([c, k]) => [xk(k), yc(c)]);
  /** polilíneas [c, k] → «d» compacto */
  const trazos = (runs, cerrar) => dRel(runs.map(aLienzo), cerrar);
  const trazo = (run, cerrar) => trazos([run], cerrar);
  const trazoXY = (p, cerrar) => dRel([p], cerrar);
  const esc = (t) => String(t).replace(/[&<>"]/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[ch]));

  /* ------------------------------------------------- 5 · geografía (datos) */
  // Borde occidental de los Cerros Orientales [calle, carrera]: ancho al norte
  // (Usaquén llega a la Cra 5–7), pegado a la Cra 1–3 en el centro, y abriéndose
  // hacia el oriente en el sur (San Cristóbal, carreras «Este»).
  const BORDE = [[-60, -10.8], [-52, -10], [-44, -8.8], [-36, -7.6], [-28, -6.4], [-20, -5], [-12, -3.6], [-6, -2.5],
    [0, -1.6], [6, -0.8], [12, -0.2], [18, 0.4], [24, 1.0], [30, 1.6], [36, 2.1], [40, 2.4], [46, 2.1], [52, 1.8],
    [58, 1.4], [64, 1.1], [70, 1.0], [76, 1.3], [82, 1.8], [88, 2.2], [94, 2.6], [100, 3.0], [108, 3.3], [116, 3.5],
    [124, 3.9], [132, 4.4], [140, 4.8], [148, 5.2], [156, 5.5], [164, 5.8], [172, 6.0], [180, 6.2], [190, 6.4],
    [200, 6.6], [212, 6.8]];
  const bordeS = tablaRapida((c) => interp(BORDE, c), C_MIN - 3, C_MAX + 3, 0.25);
  const borde = tablaRapida((c) => {
    const b = interp(BORDE, c) + 0.42 * ruido1(c / 6.5, 101) + 0.18 * ruido1(c / 2.2, 102);
    return c > 100 ? Math.min(b, 6.7) : b;
  }, C_MIN - 3, C_MAX + 3, 0.05);

  // Límite norte de lo urbanizado [carrera, calle]: la ciudad termina en la 193
  // junto a la Séptima y la Autopista; Suba se abre en humedales y potreros.
  const NORTE = [[-20, 194.5], [8, 194.5], [20, 193.6], [44, 192.8], [48, 188], [56, 183], [66, 179], [76, 175],
    [90, 171.5], [100, 166], [110, 161.5], [120, 158.5], [140, 157]];
  const limNorte = tablaRapida((k) => interp(NORTE, k) + 1.1 * ruido1(k / 4, 111), K_MIN - 3, K_MAX + 3, 0.05);

  // Curso medio del río Bogotá [calle, carrera]; los meandros se generan encima.
  const RIO_B = [[-60, 100.5], [-46, 104], [-38, 106.5], [-30, 109], [-22, 111.5], [-14, 114], [-6, 116.5], [2, 119],
    [10, 121], [18, 122.4], [28, 123], [40, 122.6], [52, 122], [64, 122.3], [76, 121.8], [88, 122.5], [100, 122],
    [112, 122.5], [122, 123.5], [130, 125.5], [140, 127.5], [152, 129], [168, 130], [184, 131], [200, 132.5], [216, 134]];
  const rioK = tablaRapida((c) => interp(RIO_B, c), C_MIN - 3, C_MAX + 3, 0.25);

  // Río Salitre / Juan Amarillo: de la Av. 68 con 80 al noroccidente, hasta el río Bogotá.
  const JA = [[64.5, 44], [67, 48], [70, 52], [73, 56], [76.5, 60.5], [79.5, 65], [81.5, 68], [84, 71.5], [87, 75],
    [90.5, 79], [94, 83], [97.5, 87], [100.5, 90.5], [103, 94], [106, 98], [109, 102], [112, 106], [115, 110],
    [118, 114], [121, 118], [123.2, 121]];
  const jaC = tablaRapida((k) => interp(JA.map(([c, kk]) => [kk, c]), k), K_MIN - 3, K_MAX + 3, 0.1);
  // Río Fucha: baja de los cerros en San Cristóbal y cruza el sur hacia el occidente.
  const FU = [[-11.4, -13], [-11.2, -8], [-11, -3], [-10.6, 2], [-10, 7], [-9, 13], [-7.8, 19], [-6.2, 25], [-4.4, 31],
    [-2.4, 37], [-0.2, 43], [2, 49], [4, 55], [5.8, 61], [7.4, 67], [8.8, 73], [9.9, 79.5], [10.8, 86], [11.5, 93],
    [12.1, 100], [12.6, 107], [13, 113], [13.3, 117.6]];

  // Quebradas de los cerros (calle donde bajan) y cumbres con nombre.
  const QUEBRADAS = [-47, -36, -24, -11, -2, 13, 30, 39, 48, 57, 71, 80, 88, 97, 107, 118, 128, 139, 151, 162, 174, 186, 197];
  const CUMBRES = [['Monserrate', 21, -9, 0.26, 40], ['Guadalupe', 3.5, -10.2, 0.34, 46]];

  // Cerro de Suba: colina aislada al occidente de la Av. Boyacá.
  const NIVEL_SUBA = 0.14;
  function hSuba(c, k) {
    let h = 0;
    for (const [c0, k0, sc, sk, a] of LOMAS_SUBA) {
      const dc = (c - c0) / sc, dk = (k - k0) / sk;
      h += a * Math.exp(-(dc * dc + dk * dk));
    }
    return h * (1 + 0.22 * fbm(k / 2.1, c / 2.1, 301));
  }
  // [calle, carrera, semieje N-S, semieje E-O, altura]: cuerpo, lomo norte, espolón sur, hombro occidental
  const LOMAS_SUBA = [[153, 80.2, 9, 3.4, 1], [160, 82, 5.5, 2.6, 0.8], [143.5, 78.6, 4.2, 2.2, 0.7], [150, 84, 4, 2.4, 0.55]];

  /* Red vial. n: nombre en los pasos · c: 'p' principal, 'a' arteria · e: 'k' si la
     dirección usa el número de calle (vía tipo carrera), 'c' si usa el de carrera ·
     et: texto de la etiqueta si difiere · dn: nombre en las direcciones.        */
  function crearVias() {
    const circ = [];
    for (let c = 6; c <= 90; c += 2) circ.push([c, bordeS(c) - 0.65 + 0.3 * Math.sin(c / 3.1)]);
    circ.unshift([6, -1.4]);
    circ.push([92, 5]);
    return [
      { n: 'Carrera Séptima', dn: 'Carrera 7', c: 'p', e: 'k', pts: [[1, 7], [207.5, 7]] },
      { n: 'Av. Caracas', c: 'p', e: 'k', pts: [[-52.5, 10.6], [-44, 11.1], [-36, 11.7], [-28, 12.4], [-20, 13.1], [-12, 13.6], [-4, 13.9], [2, 14], [76, 14]] },
      { n: 'Autopista Norte', c: 'p', e: 'k', pts: [[76, 14], [78, 14.5], [80, 15.6], [82, 17.2], [85, 20.3], [88, 23.8], [91, 27.8], [94, 32.2], [97, 36.8], [100, 41.3], [102, 44], [104, 45.5], [106, 46], [207.5, 46]] },
      { n: 'NQS', et: 'Av. NQS', dn: 'Av. NQS', c: 'p', e: 'k', pts: [[92, 29.27], [90.5, 30], [6, 30], [2, 31], [-4, 33], [-12, 36], [-20, 39.5], [-28, 43], [-36, 46.5], [-44, 50], [-52.5, 53.7]] },
      { n: 'Av. 68', dn: 'Av. Carrera 68', dnH: 'Calle 100', c: 'p', e: 'k', pts: [[100, 41.3], [100, 56.5], [99.6, 59.4], [98.2, 62.2], [95.8, 64.6], [92.4, 66.5], [88.6, 67.6], [84.5, 68], [-52.5, 68]] },
      { n: 'Av. Boyacá', c: 'p', e: 'k', pts: [[170, 72], [-52.5, 72]] },
      { n: 'Av. Ciudad de Cali', c: 'p', e: 'k', pts: [[138.5, 86], [-52.5, 86]] },
      { n: 'Av. Suba', c: 'p', e: 'k', pts: [[100, 56.5], [103, 59.6], [107, 63], [111, 66.2], [115, 69.2], [119, 72], [123, 74.9], [127, 77.8], [131, 80.6], [135, 83.4], [138.5, 86], [141.5, 88.4], [145, 91], [147.5, 93.4]] },
      { n: 'Calle 80', c: 'p', e: 'c', pts: [[80, 15.6], [80, 100], [81.2, 110], [82.6, 120], [83.6, 127.5]] },
      { n: 'Calle 26', c: 'p', e: 'c', pts: [[26, 4], [26, 30]] },
      { n: 'Calle 26', et: 'Av. El Dorado', c: 'p', e: 'c', pts: [[26, 30], [26, 102.6]] },
      { n: 'Calle 100', c: 'p', e: 'c', pts: [[100, 3.6], [100, 41.3]] },
      { n: 'Calle 127', c: 'p', e: 'c', pts: [[127, 4.6], [127, 77.8]] },
      { n: 'Calle 134', c: 'p', e: 'c', pts: [[134, 5.1], [134, 72]] },
      { n: 'Calle 147', c: 'p', e: 'c', pts: [[147, 5.8], [147, 72]] },
      { n: 'Calle 170', c: 'p', e: 'c', pts: [[170, 6.4], [170, 96]] },
      { n: 'Av. Américas', c: 'p', e: 'c', pts: [[13, 30], [8.4, 41], [4, 51.5], [-0.4, 62], [-3.6, 70], [-7.2, 79], [-11, 88.5], [-14.6, 97.5]] },
      { n: 'Av. Primero de Mayo', c: 'p', e: 'c', pts: [[-22, 12.93], [-22, 31], [-23.4, 42], [-25.6, 53], [-28.8, 63], [-33, 72], [-38, 80.5], [-43, 88]] },
      { n: 'Calle 13', c: 'p', e: 'c', pts: [[13, 14], [13, 68]] },
      { n: 'Calle 13', et: 'Av. Centenario', c: 'p', e: 'c', pts: [[13, 68], [14.6, 90], [16.4, 110], [17.8, 127.5]] },
      { n: 'Av. Jiménez', c: 'a', e: 'c', pts: [[13, 0.2], [13, 14]] },
      { n: 'Calle 80', c: 'a', e: 'c', pts: [[80, 5], [80, 15.6]] },
      { n: 'Carrera 15', c: 'a', e: 'k', pts: [[78.91, 15], [134, 15]] },
      { n: 'Carrera 19', c: 'a', e: 'k', pts: [[100, 19], [193, 19]] },
      { n: 'Carrera 11', c: 'a', e: 'k', pts: [[72, 11], [127, 11]] },
      { n: 'Carrera 9', c: 'a', e: 'k', pts: [[100, 9], [170, 9]] },
      { n: 'Carrera 10', c: 'a', e: 'k', pts: [[26, 10], [-24, 10]] },
      { n: 'Calle 72', c: 'a', e: 'c', pts: [[72, 1.6], [72, 104]] },
      { n: 'Calle 63', c: 'a', e: 'c', pts: [[63, 3.2], [63, 104]] },
      { n: 'Calle 53', c: 'a', e: 'c', pts: [[53, 5.5], [53, 86]] },
      { n: 'Calle 45', c: 'a', e: 'c', pts: [[45, 5], [45, 30]] },
      { n: 'Calle 116', et: 'Av. Pepe Sierra', c: 'a', e: 'c', pts: [[116, 4.8], [116, 69.9]] },
      { n: 'Calle 138', c: 'a', e: 'c', pts: [[138, 46], [138, 72]] },
      { n: 'Calle 92', c: 'a', e: 'c', pts: [[92, 5], [92, 29.27]] },
      { n: 'Calle 19', c: 'a', e: 'c', pts: [[19, 1.2], [19, 30]] },
      { n: 'Calle 6', c: 'a', e: 'c', pts: [[6, -1.4], [6, 30]] },
      { n: 'Av. Circunvalar', c: 'a', e: 'k', pts: circ },
      { n: 'Vía Suba–Cota', et: 'Vía a Cota', c: 'a', e: 'k', pts: [[147.5, 93.4], [151, 97], [155, 101.5], [159, 106], [163, 110.5], [167, 115.5], [171, 121], [175, 127.5]] },
    ];
  }

  /* Zonas: localidades y barrios de referencia (etiquetas y búsqueda).
     r: giro de la etiqueta · t: tamaño si difiere del de su tipo. */
  const ZONAS_DEF = [
    ['Usaquén', 158, 30, 'localidad'], ['Suba', 156, 111, 'localidad'], ['Chapinero', 68, 9.4, 'localidad', -90],
    ['Barrios Unidos', 70.4, 46, 'localidad'], ['Teusaquillo', 49, 37.5, 'localidad'], ['Engativá', 71, 98, 'localidad'],
    ['Fontibón', 5, 104, 'localidad'], ['Kennedy', -27, 94, 'localidad'], ['Puente Aranda', 3.5, 47, 'localidad'],
    ['Santa Fe', 31, 10.2, 'localidad', -90], ['La Candelaria', 5.4, 4.6, 'localidad', 0, 12], ['Los Mártires', 17.5, 22, 'localidad', 0, 16],
    ['Antonio Nariño', -11, 22, 'localidad', 0, 16], ['San Cristóbal', -27, 1.2, 'localidad', -90, 16],
    ['Rafael Uribe Uribe', -36, 25, 'localidad', 0, 16], ['Tunjuelito', -47.5, 38, 'localidad', 0, 16],
    ['Cedritos', 150.4, 14.2, 'barrio'], ['Santa Bárbara', 121.6, 13.4, 'barrio'], ['Chicó', 96.6, 13.8, 'barrio'],
    ['Rosales', 76.6, 4.4, 'barrio'], ['Chapinero Alto', 60.2, 4, 'barrio', -90], ['Niza', 124, 66.4, 'barrio'],
    ['Colina Campestre', 142.6, 59, 'barrio'], ['Mazurén', 155.4, 55.5, 'barrio'], ['Pasadena', 106.2, 51, 'barrio'],
    ['Normandía', 56.4, 76.8, 'barrio'], ['Las Ferias', 76.4, 75.4, 'barrio'], ['Minuto de Dios', 84.4, 76.6, 'barrio'],
    ['Galerías', 51.2, 24, 'barrio'], ['Salitre', 21.8, 60, 'barrio'],
    ['Modelia', 22.6, 79.2, 'barrio'], ['Restrepo', -17, 19, 'barrio'], ['20 de Julio', -27.8, 8.4, 'barrio'],
    ['Toberín', 166, 25, 'barrio'], ['Verbenal', 187, 16, 'barrio'], ['El Rincón', 127.6, 97, 'barrio'],
    ['Tibabuyes', 140.5, 112, 'barrio'], ['Quirigua', 88.4, 93, 'barrio'], ['Garcés Navas', 73.6, 107, 'barrio'],
  ];
  const ZONAS = ZONAS_DEF.map(([nombre, calle, carrera, tipo]) => ({ nombre, calle, carrera, tipo }));

  /* Lugares: solo etiqueta (y marca en las cumbres). cls: cer (cerros) · lug · agua */
  const LUGARES = [
    ['Monserrate', 19.4, -9, 'cer', 0, 'medio'], ['Guadalupe', 1.9, -10.2, 'cer', 0, 'medio'],
    ['Cerros Orientales', 150, -8.2, 'cer', -90, 'medio'], ['Cerros Orientales', 58, -8.8, 'cer', -90, 'alto'],
    ['Cerro de Suba', 153.5, 80, 'cer', -90, 'medio'], ['Simón Bolívar', 58.3, 58.6, 'lug', 0, 'medio'],
    ['El Virrey', 89.95, 11.4, 'lug', 0, 'alto'], ['Parque de la 93', 94.9, 12.2, 'lug', 0, 'alto'],
    ['Parque Nacional', 37.4, 4.4, 'lug', -90, 'alto'], ['El Campín', 59.8, 28.4, 'lug', 0, 'alto'],
    ['U. Nacional', 36, 37.6, 'lug', 0, 'medio'], ['Plaza de Bolívar', 11.7, 7.7, 'lug', 0, 'alto'],
    ['Jardín Botánico', 60, 70, 'lug', -90, 'alto'],
  ];

  /* ------------------------------------------ 6 · geografía (construcción) */
  // Índice espacial de lo que NO lleva malla vial: parques, agua, aeropuerto…
  const CUBO = 6;
  const INDICE = new Map();
  function registrar(p) {
    const b = caja(p), o = { p, b };
    for (let i = Math.floor(b[0] / CUBO); i <= Math.floor(b[1] / CUBO); i++) {
      for (let j = Math.floor(b[2] / CUBO); j <= Math.floor(b[3] / CUBO); j++) {
        const key = i * 1000 + j;
        let l = INDICE.get(key);
        if (!l) INDICE.set(key, (l = []));
        l.push(o);
      }
    }
    return p;
  }
  function excluido(c, k) {
    const l = INDICE.get(Math.floor(c / CUBO) * 1000 + Math.floor(k / CUBO));
    if (!l) return false;
    for (let i = 0; i < l.length; i++) {
      const o = l[i], b = o.b;
      if (c >= b[0] && c <= b[1] && k >= b[2] && k <= b[3] && dentro(o.p, c, k)) return true;
    }
    return false;
  }
  const enCerroSuba = (c, k) => c > 136 && c < 171 && k > 70 && k < 91 && hSuba(c, k) > NIVEL_SUBA;
  /** ¿hay ciudad (manzanas) en este punto? */
  function urbano(c, k) {
    if (k < borde(c) + 0.12) return false;          // cerros
    if (k > rioK(c) - 2.5) return false;            // ronda y occidente del río Bogotá
    if (c > limNorte(k)) return false;              // sabana al norte
    if (enCerroSuba(c, k)) return false;
    return !excluido(c, k);
  }
  function lejosDeVias(vias, c, k, d) {
    for (const v of vias) if (proyectar(v.pts, c, k).d < d) return false;
    return true;
  }

  /** Río Bogotá con meandros: curva de Kinoshita montada sobre el curso medio.
      Cada media onda sortea su largo y su amplitud: curvas amplias junto a lazos cerrados. */
  function meandros() {
    const base = remuestrear(RIO_B, 0.25);
    const L = [0];
    for (let i = 1; i < base.length; i++) L.push(L[i - 1] + dist(base[i - 1], base[i]));
    const total = L[L.length - 1], ds = 0.08, out = [];
    let u = 0, v = 0, fase = 0, media = 0, j = 0;
    let largoMedia = 4, th0 = 1;
    const sortear = () => {
      const r = hash(media, 0, 131), q = hash(media, 1, 132);
      largoMedia = 2.2 + 5.2 * r * r + (q < 0.12 ? 3 : 0);          // cuadras de cauce por media onda
      th0 = q < 0.12 ? 0.25 + 0.3 * r : 0.55 + 1.05 * hash(media, 2, 133);   // tramos casi rectos y lazos
    };
    sortear();
    while (u < total) {
      fase += (Math.PI * ds) / largoMedia;
      if (fase >= Math.PI * (media + 1)) { media += 1; sortear(); }
      const f = fase - Math.PI * media, sgn = media % 2 ? -1 : 1;
      const th = sgn * (th0 * Math.sin(f) + th0 * th0 * th0 * (0.03 * Math.cos(3 * f) - 0.02 * Math.sin(3 * f)));
      u += Math.cos(th) * ds;
      v += Math.sin(th) * ds - 0.025 * v * ds;
      const sb = Math.max(0, Math.min(u, total));
      while (j < L.length - 2 && L[j + 1] < sb) j++;
      while (j > 0 && L[j] > sb) j--;
      const a = base[j], b = base[j + 1], t = (sb - L[j]) / (L[j + 1] - L[j] || 1);
      let dc = b[0] - a[0], dk = b[1] - a[1];
      const l = Math.hypot(dc, dk) || 1; dc /= l; dk /= l;
      const w = 2.2 * Math.tanh(v / 2.2);
      out.push([a[0] + (b[0] - a[0]) * t - dk * w, a[1] + (b[1] - a[1]) * t + dc * w]);
    }
    return simplificar(out, 0.03);
  }
  function unirAlRio(p, rio) {
    const u = p[p.length - 1], m = proyectar(rio, u[0], u[1]);
    return p.concat([[m.c, m.k]]);
  }

  let GEO = null;
  function geo() {
    if (GEO) return GEO;
    const g = (GEO = {});
    g.vias = crearVias();
    g.rioB = meandros();
    g.ja = unirAlRio(JA, g.rioB);
    g.fu = unirAlRio(FU, g.rioB);
    const verdes = [], aguas = [];
    const verde = (p) => { p = orientar(p); verdes.push(p); return registrar(p); };
    const agua = (p) => { p = orientar(p); aguas.push(p); return registrar(p); };

    // parques con nombre (aproximados)
    verde([[62.6, 48.8], [62.6, 67.3], [53.5, 67.3], [53.5, 52.2], [55.6, 48.8]]);       // Simón Bolívar
    verde(R(63.5, 58.5, 66.4, 67.3));                                                    // El Salitre
    verde(R(63.5, 45.2, 66.2, 49.6));                                                    // Los Novios
    verde(R(57.2, 68.7, 62.6, 71.3));                                                    // Jardín Botánico
    verde([[88.55, 7.4], [88.55, 15.2], [87.45, 15.2], [87.45, 7.4]]);                   // El Virrey
    verde(R(92.9, 11.4, 93.8, 12.9));                                                    // Parque de la 93
    verde([[39.5, 6.6], [39.5, bordeS(39.5) - 0.3], [35.4, bordeS(35.4) - 0.3], [35.4, 6.6]]); // Parque Nacional
    verde(R(26.4, 5.2, 28, 6.8));                                                        // Independencia
    verde(R(127.6, 11.3, 129.4, 14.6));                                                  // El Country
    verde(R(6.4, 10.4, 9.6, 13.4));                                                      // Tercer Milenio
    verde(R(24, 17.2, 25.6, 21.2));                                                      // Cementerio Central
    verde([[45, 23.9], [45, 24.7], [36.2, 23.1], [36.2, 22.3]]);                         // Park Way
    verde(R(-40.6, 72.8, -44.4, 77.4));                                                  // Timiza
    verde(R(-46.6, 20.6, -53.5, 27.4));                                                  // El Tunal
    verde(R(171, 54, 178.5, 64.5));                                                      // Suba norte
    verde(R(158, 91.5, 164.5, 99));
    verde(R(139, 113, 144, 118.5));
    verde(R(116.8, 74.6, 121.4, 80.2));
    g.campus = verde(R(27.4, 30.8, 44.6, 44.4));                                         // U. Nacional

    // humedales: ronda verde + lámina de agua
    const humedal = (eje, wAgua, wRonda, sem) => { verde(mancha(eje, wRonda, sem)); agua(mancha(eje, wAgua, sem + 1)); };
    g.ejeJA = [[100.2, 89.8], [103, 94], [106, 98], [109, 102], [110.6, 104.2]];
    humedal(g.ejeJA, 2.1, 3.3, 401);                                                     // Juan Amarillo
    g.ejeCordoba = [[126.2, 48.8], [123.4, 52], [120.8, 55.2], [118.6, 57.9], [116.6, 60.3]];
    verde(mancha(g.ejeCordoba, 1.5, 411));                                               // Córdoba
    agua(mancha([[125.8, 49.3], [123.9, 51.5]], 0.5, 412));
    agua(mancha([[122.3, 53.6], [120.4, 56]], 0.62, 413));
    agua(mancha([[118.7, 57.9], [117, 59.7]], 0.45, 414));
    humedal([[76.6, 109], [74.4, 112.4], [72, 115.6], [70.2, 118]], 0.75, 1.9, 421);     // Jaboque
    humedal([[77.1, 73.5], [76, 75.5]], 0.7, 1.25, 431);                                 // Santa María del Lago
    humedal([[196, 48.4], [200.5, 49], [205, 49.6], [209, 50]], 0.55, 1.4, 441);         // Torca-Guaymaral
    humedal([[160.5, 107.5], [163.5, 111], [166.5, 114.5]], 0.65, 1.8, 451);             // La Conejera
    agua(mancha([[60.4, 55.2], [59.2, 58.2], [57.6, 61.4]], 1.25, 461));                 // lago del Simón Bolívar
    agua(mancha([[-42, 74], [-43, 76]], 0.6, 471));                                      // lago de Timiza
    agua(mancha([[65, 46.5], [64.3, 48]], 0.45, 481));                                   // lago de Los Novios
    // rondas de los ríos canalizados
    verde(franja(remuestrear(JA, 0.5), 0.75));
    verde(franja(remuestrear(FU.filter(([, k]) => k > -2), 0.5), 0.55));

    // aeropuerto El Dorado: dos pistas paralelas hacia el noroccidente
    const l = Math.hypot(6, 16), u = [6 / l, 16 / l], n = [u[1], -u[0]];
    const PS = [[21.2, 103.6], [27.2, 119.6]], PN = [[34.4, 104.2], [40.4, 120.2]];
    const mas = (p, v, f) => [p[0] + v[0] * f, p[1] + v[1] * f];
    g.aero = registrar([mas(mas(PS[0], u, -1.5), n, -2.6), mas(mas(PS[1], u, 1.5), n, -2.6),
      mas(mas(PN[1], u, 1.5), n, 2.6), mas(mas(PN[0], u, -1.5), n, 2.6)]);
    g.pistas = [PS, PN]; g.uPista = u; g.nPista = n;

    // estadio El Campín (octágono), plaza de Bolívar
    const ce = [57, 28.4], a = 1.7, b = 1.15, ch = 0.55;
    g.estadio = registrar([[ce[0] + a, ce[1] - b + ch], [ce[0] + a, ce[1] + b - ch], [ce[0] + a - ch, ce[1] + b], [ce[0] - a + ch, ce[1] + b],
      [ce[0] - a, ce[1] + b - ch], [ce[0] - a, ce[1] - b + ch], [ce[0] - a + ch, ce[1] - b], [ce[0] + a - ch, ce[1] - b]]);
    g.plaza = registrar(R(10.1, 7.2, 10.9, 8.2));

    // parques de barrio: manzanas sueltas lejos de las vías
    g.parquecitos = [];
    const rnd = azar(4242);
    for (let i = 0; i < 1500 && g.parquecitos.length < 130; i++) {
      const c = Math.floor(C_MIN + 2 + rnd() * (C_MAX - C_MIN - 4)), k = Math.floor(K_MIN + 2 + rnd() * (K_MAX - K_MIN - 4));
      const h = rnd() < 0.3 ? 2 : 1, w = rnd() < 0.3 ? 2 : 1;
      let ok = true;
      for (const [dc, dk] of [[0, 0], [h, 0], [0, w], [h, w], [h / 2, w / 2]]) if (!enDefecto(c + dc, k + dk)) { ok = false; break; }
      if (!ok || !lejosDeVias(g.vias, c + h / 2, k + w / 2, 0.9 + Math.max(h, w) / 2)) continue;
      const p = orientar(R(c + 0.13, k + 0.13, c + h - 0.13, k + w - 0.13));
      g.parquecitos.push(registrar(p));
    }
    g.verdes = verdes;
    g.aguas = aguas;
    return g;
  }

  /* ---------------------------------------------- 7 · sectores de la malla */
  // Franja de ladera: las carreras siguen la curva del cerro (Chapinero Alto, Rosales,
  // La Macarena, Usaquén oriental, San Cristóbal); las calles siguen rectas.
  const enLadera = (c, k) => ((c > 16 && c < 196) || c < 3) && k < Math.min(bordeS(c) + 4.2, c > 90 ? 6.8 : 99);
  const SECTORES = [
    { id: 'suburbio', en: (c, k) => c > 116.3 && c < 176 && k > 46.6 && k < 71.6 && (c > 119.6 || k < 69.4) },
    { id: 'subaOeste', en: (c, k) => k > 86.3 && c > 96 && c > jaC(k) + 0.1 },
    { id: 'engativa', en: (c, k) => k > 92 && c > 44.6 && c < jaC(k) - 0.1 },
    { id: 'kennedy', en: (c, k) => c > -44.6 && c < -16.2 && k > 73.2 && k < 85.6 },
    { id: 'fontibon', en: (c, k) => c > 13.9 && c < 24.8 && k > 90.5 && k < 101.9 },
    { id: 'salitre', en: (c, k) => c > 17.6 && c < 25.6 && k > 50.4 && k < 71.6 },
    { id: 'industrial', en: (c, k) => c > -6.4 && c < 12.4 && k > 31 && k < 67.4 },
  ];
  function sectorDe(c, k) {
    for (let i = 0; i < SECTORES.length; i++) if (SECTORES[i].en(c, k)) return SECTORES[i];
    return null;
  }
  const enDefecto = (c, k) => urbano(c, k) && !sectorDe(c, k);

  /** malla girada: líneas en tramos de una cuadra, con algunos tramos suprimidos */
  function mallaRotada(ce, ang, paso, radio, alto, soloM) {
    const a = (ang * Math.PI) / 180, sa = Math.sin(a), ca = Math.cos(a);
    const P = (u, v) => [ce[0] + u * sa + v * ca, ce[1] + u * ca - v * sa];
    const out = [], n = Math.ceil(radio / paso), sem = 700 + Math.round(ang * 10);
    for (let i = -n; i <= n; i++) {
      const cls = soloM || i % 2 === 0 ? 'm' : 't';
      if (cls === 't' && !alto) continue;
      for (const eje of [0, 1]) {
        let ini = null;
        for (let j = -n; j < n; j++) {
          const quita = hash(i * 3 + eje, j, sem) < (cls === 'm' ? 0.04 : 0.1);
          if (!quita && ini === null) ini = j;
          if ((quita || j === n - 1) && ini !== null) {
            const fin = quita ? j : j + 1;
            out.push({ pts: eje ? [P(i * paso, ini * paso), P(i * paso, fin * paso)] : [P(ini * paso, i * paso), P(fin * paso, i * paso)], cls });
            ini = null;
          }
        }
      }
    }
    return out;
  }
  /** conjuntos del noroccidente (Niza, Colina Campestre, Mazurén): calles sinuosas y culatas */
  function suburbio(alto) {
    const out = [];
    for (let i = 0, c = 116.7; c < 176; i++, c += 1.5) {
      if (!alto && i % 2) continue;
      const pts = [];
      for (let k = 45.8; k <= 72.4; k += 0.4) pts.push([c + 0.5 * ruido1(k / 3.3 + i * 1.7, 90 + i), k]);
      out.push({ pts, cls: i % 2 ? 't' : 'm' });
    }
    for (let j = 0, k = 48; k < 72; j++, k += 2) {
      let c = 116 + hash(j, 0, 91) * 1.5;
      while (c < 176) {
        const q = Math.round(c * 10), l = 1.6 + hash(j, q, 92) * 4.2;
        if (hash(j, q, 93) > 0.2) out.push({ pts: [[c, k + 0.1 * ruido1(c / 2.2, j + 95)], [c + l, k + 0.1 * ruido1((c + l) / 2.2, j + 95)]], cls: 'm' });
        c += l + 0.7 + hash(j, q, 94) * 1.1;
      }
    }
    return out;
  }
  function patronSector(s, alto) {
    switch (s.id) {
      case 'suburbio': return suburbio(alto);
      case 'subaOeste': return mallaRotada([129, 105], 17, 1, 40, alto);
      case 'engativa': return mallaRotada([72, 106], 7.3, 1, 36, alto);
      case 'kennedy': return mallaRotada([-30, 79.5], 32, 1, 24, alto);
      case 'fontibon': return mallaRotada([19.3, 96.2], -21, 0.9, 14, alto);
      case 'salitre': return mallaRotada([21.6, 61], 40, 2.2, 18, alto, true);
      case 'industrial': return mallaRotada([3, 49], -22.7, 1.6, 30, alto, true);
    }
    return [];
  }

  /* ---------------------------------------------------------- 8 · malla vial */
  /** recorta una polilínea [c, k] a donde ok() es cierto; bisección en los bordes */
  function recortar(p, ok, paso = 0.5, minimo = 0.45) {
    const runs = [];
    let prevIn = ok(p[0][0], p[0][1]), cur = prevIn ? [p[0]] : null;
    for (let i = 0; i < p.length - 1; i++) {
      const a = p[i], b = p[i + 1], dc = b[0] - a[0], dk = b[1] - a[1];
      const n = Math.max(1, Math.ceil(Math.hypot(dc, dk) / paso));
      let t0 = 0;
      for (let j = 1; j <= n; j++) {
        const t = j / n, dentroAhora = ok(a[0] + dc * t, a[1] + dk * t);
        if (dentroAhora !== prevIn) {
          let lo = t0, hi = t;
          for (let it = 0; it < 8; it++) {
            const m = (lo + hi) / 2;
            if (ok(a[0] + dc * m, a[1] + dk * m) === prevIn) lo = m; else hi = m;
          }
          const tm = prevIn ? lo : hi, q = [a[0] + dc * tm, a[1] + dk * tm];
          if (prevIn) { cur.push(q); runs.push(cur); cur = null; } else cur = [q];
          prevIn = dentroAhora;
        }
        t0 = t;
      }
      if (cur) cur.push(b);
    }
    if (cur && cur.length > 1) runs.push(cur);
    return runs.filter((r) => largo(r) >= minimo);
  }
  /** línea recta partida en cuadras; algunas se suprimen (culatas, manzanas dobles) */
  function lineaConCortes(a, b, fija, eje, pQuita, sem) {
    const out = [], bordes = [a];
    for (let v = Math.ceil(a); v <= Math.floor(b); v++) if (v > a && v < b) bordes.push(v);
    bordes.push(b);
    let ini = null;
    for (let j = 0; j < bordes.length - 1; j++) {
      const quita = hash(Math.round(fija * 4), Math.floor(bordes[j]), sem) < pQuita;
      if (!quita && ini === null) ini = bordes[j];
      if ((quita || j === bordes.length - 2) && ini !== null) {
        const fin = quita ? bordes[j] : bordes[j + 1];
        if (fin - ini > 0.3) out.push(eje === 'h' ? [[fija, ini], [fija, fin]] : [[ini, fija], [fin, fija]]);
        ini = null;
      }
    }
    return out;
  }
  function diagonales() {
    const rnd = azar(777), out = [];
    for (let n = 0; n < 600 && out.length < 22; n++) {
      const c = -50 + rnd() * 240, k = rnd() * 122;
      if (!enDefecto(c, k)) continue;
      const base = rnd() < 0.5 ? 0 : 90;
      const ang = ((base + (rnd() < 0.5 ? 1 : -1) * (18 + rnd() * 24)) * Math.PI) / 180;
      const L = 4 + rnd() * 11, dc = (Math.sin(ang) * L) / 2, dk = (Math.cos(ang) * L) / 2;
      out.push([[c - dc, k - dk], [c + dc, k + dk]]);
    }
    return out;
  }
  /* Células de barrio: colectoras cada 3–7 cuadras (continuas, clase M) y, dentro de
     cada célula, un trazado propio (clase T): cuadrícula, manzanas partidas, conjunto
     cerrado, transversales en diagonal o calles torcidas. Las calles interiores siguen
     en números enteros, así una ruta por una calle local cae sobre su trazo. */
  const CORTES_K = [], CORTES_C = [];
  for (let k = Math.floor(K_MIN) - 1; k < K_MAX + 8;) { CORTES_K.push(k); k += 3 + Math.floor(hash(k + 500, 0, 301) * 5); }
  for (let c = Math.floor(C_MIN) - 1; c < C_MAX + 8;) { CORTES_C.push(c); c += 3 + Math.floor(hash(c + 500, 1, 302) * 5); }
  function celda(i, j, c0, c1, k0, k1, alto) {
    const r = hash(i, j, 303), out = [], h = c1 - c0, w = k1 - k0;
    const sem = i * 131 + j;
    const cuadricula = (paso, pQ, medias) => {
      for (let c = c0 + paso; c < c1 - 0.01; c += paso) {
        if (!alto && Math.round(c) % 2) continue;
        for (const seg of lineaConCortes(k0, k1, c, 'h', pQ, 63 + (sem % 7))) out.push({ pts: seg, v: false });
      }
      for (let k = k0 + paso; k < k1 - 0.01; k += paso) {
        if (!alto && Math.round(k) % 2) continue;
        for (const seg of lineaConCortes(c0, c1, k, 'v', pQ, 64 + (sem % 7))) out.push({ pts: seg, v: true });
      }
      if (medias && alto) {
        const hor = hash(i, j, 304) < 0.5;
        for (let q = (hor ? c0 : k0) + 0.5; q < (hor ? c1 : k1); q += 1) {
          if (hash(Math.round(q * 2), sem, 305) < 0.3) continue;
          out.push({ pts: hor ? [[q, k0], [q, k1]] : [[c0, q], [c1, q]], v: !hor });
        }
      }
    };
    if (r < 0.5 || h < 3 || w < 3) cuadricula(1, 0.07, false);
    else if (r < 0.64) cuadricula(1, 0.05, true);
    else if (r < 0.79) {
      // conjunto cerrado: una calle interior y un acceso que termina en culata (T o L)
      const cm = c0 + Math.round(h / 2), km = k0 + Math.round(w / 2), hor = hash(i, j, 306) < 0.5;
      if (hor) out.push({ pts: [[cm, k0], [cm, k1]], v: false }); else out.push({ pts: [[c0, km], [c1, km]], v: true });
      const fondo = hor ? [c0 + Math.max(1, h * 0.3), km] : [cm, k0 + Math.max(1, w * 0.3)];
      out.push({ pts: [[cm, km], fondo], v: hor });
      const brazo = 0.6 + 0.5 * hash(i, j, 309), ele = hash(i, j, 312) < 0.5;
      const a = hor ? [fondo[0], fondo[1] - (ele ? 0 : brazo)] : [fondo[0] - (ele ? 0 : brazo), fondo[1]];
      const b = hor ? [fondo[0], fondo[1] + brazo] : [fondo[0] + brazo, fondo[1]];
      out.push({ pts: [a, b], v: !hor });
    } else if (r < 0.87) {
      // transversales: calles a 30–45° dentro de la célula
      const ang = ((hash(i, j, 307) < 0.5 ? 1 : -1) * (30 + 15 * hash(i, j, 308)) * Math.PI) / 180;
      const dc = Math.sin(ang), dk = Math.cos(ang), n = [-dk, dc], R0 = Math.hypot(h, w);
      const ce = [(c0 + c1) / 2, (k0 + k1) / 2];
      for (let q = -R0; q <= R0; q += 1.6) {
        const a = [ce[0] + n[0] * q - dc * R0, ce[1] + n[1] * q - dk * R0], b = [ce[0] + n[0] * q + dc * R0, ce[1] + n[1] * q + dk * R0];
        for (const run of recortar([a, b], (c, k) => c > c0 && c < c1 && k > k0 && k < k1, 0.25, 0.3)) out.push({ pts: run, v: true });
      }
      const cm = c0 + Math.round(h / 2);
      out.push({ pts: [[cm, k0], [cm, k1]], v: false });
    } else {
      // calles torcidas: cuadrícula con ondulación y más culatas
      for (let c = c0 + 1; c < c1; c += 1) {
        if (!alto && c % 2) continue;
        const pts = [];
        for (let k = k0; k <= k1 + 1e-9; k += 0.5) pts.push([c + 0.2 * ruido1(k / 1.8 + c * 0.7, 310 + sem), k]);
        out.push({ pts, v: false });
      }
      for (let k = k0 + 1; k < k1; k += 1) {
        if (!alto && k % 2) continue;
        for (const seg of lineaConCortes(c0, c1, k, 'v', 0.2, 311)) out.push({ pts: seg, v: true });
      }
    }
    return out;
  }
  /** calles menores: M = colectoras y trazados de sector · T = calles interiores */
  function malla(det) {
    const alto = det === 'alto', M = [], T = [];
    const okH = (c, k) => urbano(c, k) && !sectorDe(c, k);
    const okV = (c, k) => okH(c, k) && !enLadera(c, k);
    const poner = (runs, cls) => { for (const r of runs) (cls === 'm' ? M : T).push(r); };
    for (const c of CORTES_C) {
      if (c < C_MIN - 1 || c > C_MAX + 1) continue;
      for (const seg of lineaConCortes(K_MIN, K_MAX, c, 'h', 0.02, 61)) poner(recortar(seg, okH), 'm');
    }
    for (const k of CORTES_K) {
      if (k < K_MIN - 1 || k > K_MAX + 1) continue;
      for (const seg of lineaConCortes(C_MIN, C_MAX, k, 'v', 0.02, 62)) poner(recortar(seg, okV), 'm');
    }
    for (let i = 0; i < CORTES_C.length - 1; i++) {
      for (let j = 0; j < CORTES_K.length - 1; j++) {
        const c0 = CORTES_C[i], c1 = CORTES_C[i + 1], k0 = CORTES_K[j], k1 = CORTES_K[j + 1];
        if (c1 < C_MIN || c0 > C_MAX || k1 < K_MIN || k0 > K_MAX) continue;
        // célula sin nada urbano en su centro ni en sus esquinas: se salta
        const muestras = [[(c0 + c1) / 2, (k0 + k1) / 2], [c0 + 0.5, k0 + 0.5], [c1 - 0.5, k1 - 0.5], [c0 + 0.5, k1 - 0.5], [c1 - 0.5, k0 + 0.5]];
        if (!muestras.some(([c, k]) => okH(c, k))) continue;
        for (const { pts, v } of celda(i, j, c0, c1, k0, k1, alto)) poner(recortar(pts, v ? okV : okH), 't');
      }
    }
    for (const [ca, cb] of [[16.5, 195.5], [C_MIN - 0.5, 2.5]]) {
      for (let j = 1; j <= 4; j++) {
        if (!alto && j % 2) continue;
        const pts = [];
        for (let c = ca; c <= cb; c += 0.5) pts.push([c, bordeS(c) + j * 0.98 + 0.28 * ruido1(c / 4.5, 80 + j)]);
        poner(recortar(pts, (c, k) => okH(c, k) && enLadera(c, k)), j === 2 ? 'm' : 't');
      }
    }
    for (const s of SECTORES) {
      const ok = (c, k) => urbano(c, k) && sectorDe(c, k) === s;
      for (const { pts, cls } of patronSector(s, alto)) poner(recortar(pts, ok), cls);
    }
    for (const d of diagonales()) poner(recortar(d, okV), 'm');
    return { M, T };
  }
  /** potreros de la sabana (norte y occidente del río): cuadrícula girada, lotes de 2–7 cuadras */
  function parcelas() {
    const out = [];
    const rural = (c, k) => k > borde(c) + 0.6 && (c > limNorte(k) + 0.6 || k > rioK(c) + 1.4) && !enCerroSuba(c, k) && !excluido(c, k);
    const zonas = [[[186, 72], 7, 70, (c) => c > 140, 1], [[40, 124], -4, 100, (c) => c <= 140, 2]];
    for (const [ce, ang, R0, cual, sem] of zonas) {
      const a = (ang * Math.PI) / 180, sa = Math.sin(a), ca = Math.cos(a);
      const P = (u, v) => [ce[0] + u * sa + v * ca, ce[1] + u * ca - v * sa];
      const ok = (c, k) => cual(c) && rural(c, k);
      for (const eje of [0, 1]) {
        for (let i = 0, q = -R0; q < R0; i++) {
          q += 2 + 5 * hash(i, eje * 7 + sem, 950);
          for (let j = 0, t = -R0; t < R0; j++) {
            const l = 2 + 5.5 * hash(i, j, 951 + sem * 3 + eje);
            if (hash(i, j, 952 + sem * 3 + eje) > 0.35) {
              const A = eje ? P(q, t) : P(t, q), B = eje ? P(q, t + l) : P(t + l, q);
              if (ok((A[0] + B[0]) / 2, (A[1] + B[1]) / 2) || ok(A[0], A[1]) || ok(B[0], B[1])) for (const r of recortar([A, B], ok)) out.push(r);
            }
            t += l;
          }
        }
      }
    }
    return out;
  }

  /* ------------------------------------------------- 9 · curvas de nivel */
  /** marching squares; val[(j)(cols+1) + i]; devuelve polilíneas en coordenadas del lienzo */
  function isolineas(val, cols, rows, x0, y0, cel, nivel) {
    const NX = cols + 1, nH = (rows + 1) * cols, nE = nH + rows * NX;
    const segA = new Int32Array(nE).fill(-1), segB = new Int32Array(nE).fill(-1);
    const px = new Float64Array(nE), py = new Float64Array(nE), hecho = new Uint8Array(nE);
    const segs = [];
    const punto = (e, i0, j0, i1, j1) => {
      if (hecho[e]) return;
      hecho[e] = 1;
      const a = val[j0 * NX + i0], b = val[j1 * NX + i1], t = (nivel - a) / (b - a);
      px[e] = x0 + (i0 + (i1 - i0) * t) * cel;
      py[e] = y0 + (j0 + (j1 - j0) * t) * cel;
    };
    const unir = (e1, e2) => {
      const s = segs.length / 2;
      segs.push(e1, e2);
      for (const e of [e1, e2]) { if (segA[e] === -1) segA[e] = s; else segB[e] = s; }
    };
    for (let j = 0; j < rows; j++) {
      for (let i = 0; i < cols; i++) {
        const a = val[j * NX + i], b = val[j * NX + i + 1], c = val[(j + 1) * NX + i + 1], d = val[(j + 1) * NX + i];
        const caso = (a > nivel ? 8 : 0) | (b > nivel ? 4 : 0) | (c > nivel ? 2 : 0) | (d > nivel ? 1 : 0);
        if (caso === 0 || caso === 15) continue;
        const T = j * cols + i, B = (j + 1) * cols + i, L = nH + j * NX + i, Rr = nH + j * NX + i + 1;
        const usa = { [T]: [i, j, i + 1, j], [B]: [i, j + 1, i + 1, j + 1], [L]: [i, j, i, j + 1], [Rr]: [i + 1, j, i + 1, j + 1] };
        let pares;
        switch (caso) {
          case 1: case 14: pares = [[L, B]]; break;
          case 2: case 13: pares = [[B, Rr]]; break;
          case 3: case 12: pares = [[L, Rr]]; break;
          case 4: case 11: pares = [[T, Rr]]; break;
          case 6: case 9: pares = [[T, B]]; break;
          case 7: case 8: pares = [[L, T]]; break;
          default: {
            const m = (a + b + c + d) / 4;
            pares = (m > nivel) === (caso === 5) ? [[L, T], [B, Rr]] : [[L, B], [T, Rr]];
          }
        }
        for (const [e1, e2] of pares) { punto(e1, ...usa[e1]); punto(e2, ...usa[e2]); unir(e1, e2); }
      }
    }
    const nS = segs.length / 2, usado = new Uint8Array(nS), lineas = [];
    const otro = (e, s) => (segA[e] === s ? segB[e] : segA[e]);
    const avanzar = (s, e, lista) => {
      for (;;) {
        const n = otro(e, s);
        if (n === -1 || usado[n]) return;
        usado[n] = 1;
        const e2 = segs[2 * n] === e ? segs[2 * n + 1] : segs[2 * n];
        lista.push(e2); s = n; e = e2;
      }
    };
    for (let s0 = 0; s0 < nS; s0++) {
      if (usado[s0]) continue;
      usado[s0] = 1;
      const fw = [segs[2 * s0], segs[2 * s0 + 1]], bw = [];
      avanzar(s0, segs[2 * s0 + 1], fw);
      avanzar(s0, segs[2 * s0], bw);
      lineas.push(bw.reverse().concat(fw).map((e) => [px[e], py[e]]));
    }
    return lineas;
  }
  const QDEF = QUEBRADAS.map((c, i) => ({ y: yc(c), c, p: 0.2 + 0.14 * hash(i, 1, 201), w: 9 + 6 * hash(i, 2, 201), sk: (hash(i, 3, 201) - 0.5) * 0.3, i }));
  const ejeQuebrada = (q, d) => q.y + q.sk * d + 6 * ruido1(d / 40 + q.i * 3.1, 211);
  function curvasCerros(det) {
    const cel = 5, x0 = 1150, y0 = -10, cols = Math.ceil((W + 10 - x0) / cel), rows = Math.ceil((H + 20) / cel);
    const NX = cols + 1, val = new Float64Array(NX * (rows + 1));
    const cimas = CUMBRES.map(([, c, k, a, r]) => ({ x: xk(k), y: yc(c), a, r }));
    const rnd = azar(515);
    for (let y = 40; y < H; y += 150 + rnd() * 80) {
      const d = 120 + rnd() * 80;
      cimas.push({ x: Math.min(W - 10, xk(borde((Y0 - y) / S)) + d), y, a: 0.08 + rnd() * 0.12, r: 30 + rnd() * 28 });
    }
    for (let j = 0; j <= rows; j++) {
      const y = y0 + j * cel, xb = xk(borde((Y0 - y) / S));
      for (let i = 0; i <= cols; i++) {
        const x = x0 + i * cel, d = x - xb;
        if (d < 0) { val[j * NX + i] = d / 40; continue; }
        let h = 1 - Math.exp(-d / 88);
        for (const q of QDEF) {
          const w = q.w * (1 + d / 260), t = (y - ejeQuebrada(q, d)) / w;
          if (t > -4 && t < 4) h -= q.p * Math.exp(-t * t) * (1 - Math.exp(-d / 22)) * Math.exp(-d / 320);
        }
        for (const p of cimas) {
          const dx = (x - p.x) / p.r, dy = (y - p.y) / p.r, e = dx * dx + dy * dy;
          if (e < 9) h += p.a * Math.exp(-e);
        }
        val[j * NX + i] = h + 0.035 * fbm(x / 70, y / 70, 231) * Math.min(1, d / 25);
      }
    }
    const normales = [], maestras = [];
    for (let n = 0; n < 16; n += det === 'alto' ? 1 : 2) {
      for (const l of isolineas(val, cols, rows, x0, y0, cel, 0.12 + 0.075 * n)) {
        const s = simplificar(l, 0.6);
        if (s.length > 1) (n % 4 === 0 ? maestras : normales).push(trazoXY(s));
      }
    }
    return { normales: normales.join(''), maestras: maestras.join('') };
  }
  function curvasSuba(det) {
    const cel = 3, x0 = xk(92), y0 = yc(173), cols = Math.ceil((xk(69) - x0) / cel), rows = Math.ceil((yc(134) - y0) / cel);
    const NX = cols + 1, val = new Float64Array(NX * (rows + 1));
    for (let j = 0; j <= rows; j++) {
      for (let i = 0; i <= cols; i++) { const q = inv(x0 + i * cel, y0 + j * cel); val[j * NX + i] = hSuba(q[0], q[1]); }
    }
    const contorno = [], normales = [], maestras = [];
    for (let n = 0; n < 8; n++) {
      if (det !== 'alto' && n % 2) continue;
      for (const l of isolineas(val, cols, rows, x0, y0, cel, NIVEL_SUBA + 0.12 * n)) {
        const s = simplificar(l, 0.5);
        if (s.length < 3) continue;
        if (n === 0) contorno.push(trazoXY(s, true));
        (n % 4 === 0 ? maestras : normales).push(trazoXY(s));
      }
    }
    return { contorno: contorno.join(''), normales: normales.join(''), maestras: maestras.join('') };
  }
  function dCerros() {
    const p = [];
    for (let c = C_MAX + 1; c >= C_MIN - 1; c -= 0.25) p.push([xk(borde(c)), yc(c)]);
    const s = simplificar(p, 0.35);
    s.push([W + 5, yc(C_MIN - 1)], [W + 5, yc(C_MAX + 1)]);
    return trazoXY(s, true);
  }
  /** quebradas: bajan por el eje de cada valle hasta el borde de la ciudad */
  function dQuebradas() {
    let s = '';
    for (const q of QDEF) {
      const p = [];
      for (let d = 3; d <= 210; d += 4) {
        const y = ejeQuebrada(q, d), x = xk(borde((Y0 - y) / S)) + d;
        if (x > W + 4 || y < -4 || y > H + 4) break;
        p.push([x, y]);
      }
      if (p.length > 3) s += trazoXY(simplificar(p, 0.5));
    }
    return s;
  }

  /* ----------------------------------------------------------- 10 · etiquetas */
  // Avance de Montserrat 600 por glifo (milésimas de em), medido en Chrome: las
  // colisiones no dependen de que la fuente ya esté cargada.
  const GLIFOS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZÁÉÍÓÚÑÜ0123456789 .·-#,()\'°/–';
  const ANCHOS = [749, 761, 718, 826, 670, 637, 772, 810, 319, 527, 729, 599, 955, 810, 842, 726, 842, 731, 629, 602, 789,
    729, 1144, 693, 661, 663, 749, 670, 319, 842, 789, 810, 789, 673, 381, 582, 582, 679, 584, 627, 608, 652, 627, 276, 244,
    284, 385, 711, 244, 347, 348, 220, 419, 371, 500];
  const ANCHO = {};
  for (let i = 0; i < GLIFOS.length; i++) ANCHO[GLIFOS[i]] = ANCHOS[i];
  // t: tamaño en unidades · tr: tracking en em. DEBEN coincidir con css/mapa.css.
  const ESTILO = {
    loc: { t: 21, tr: 0.34 }, bar: { t: 9, tr: 0.2 }, av: { t: 8.5, tr: 0.2 }, art: { t: 7.5, tr: 0.2 },
    lug: { t: 7.5, tr: 0.2 }, agua: { t: 7.5, tr: 0.22 }, cer: { t: 9, tr: 0.3 },
  };
  const mayus = (t) => t.toLocaleUpperCase('es-CO');
  // «medio» es la vista de conjunto (≈0,4–0,7 px por unidad): texto al doble (css: .mapa-medio)
  let FT = 1;
  const tamDe = (cls, tam) => (tam || ESTILO[cls].t) * FT;
  function anchoTexto(t, tam, tr) {
    let s = 0;
    for (const ch of t) s += ANCHO[ch] || 640;
    return (s / 1000) * tam + tr * tam * (t.length - 1);
  }
  /** etiqueta centrada en (cx, cy), girada ang°; caja orientada para colisiones */
  function rotulo(txt, cls, cx, cy, ang = 0, tam = 0, extra = {}) {
    const st = ESTILO[cls], t = tamDe(cls, tam), T = mayus(txt);
    // las localidades piden más aire a lo largo: dos seguidas no deben leerse como un solo nombre
    const hw = anchoTexto(T, t, st.tr) / 2 + (cls === 'loc' ? t * 0.45 : 2.5), hh = t * 0.42 + 2;
    const a = (ang * Math.PI) / 180, u = [Math.cos(a), Math.sin(a)], v = [-u[1], u[0]];
    const p = [[1, 1], [1, -1], [-1, -1], [-1, 1]].map(([su, sv]) => [cx + u[0] * hw * su + v[0] * hh * sv, cy + u[1] * hw * su + v[1] * hh * sv]);
    // text-anchor: middle cuenta el tracking tras la última letra: se compensa medio tracking
    const ts = (st.tr * t) / 2;
    return Object.assign({ T, cls, x: cx + u[0] * ts, y: cy + u[1] * ts, ang, t: tam, caja: { p, u, v, cx, cy, r: Math.hypot(hw, hh) } }, extra);
  }
  function choca(A, B) {
    if (Math.hypot(A.cx - B.cx, A.cy - B.cy) > A.r + B.r) return false;
    for (const [ax, ay] of [A.u, A.v, B.u, B.v]) {
      let a0 = Infinity, a1 = -Infinity, b0 = Infinity, b1 = -Infinity;
      for (const q of A.p) { const d = q[0] * ax + q[1] * ay; if (d < a0) a0 = d; if (d > a1) a1 = d; }
      for (const q of B.p) { const d = q[0] * ax + q[1] * ay; if (d < b0) b0 = d; if (d > b1) b1 = d; }
      if (a1 < b0 || b1 < a0) return false;
    }
    return true;
  }
  function rotulador() {
    const puestos = [];
    return {
      puestos,
      libre(r) {
        for (const q of r.caja.p) if (q[0] < 3 || q[0] > W - 3 || q[1] < 3 || q[1] > H - 3) return false;
        for (const o of puestos) if (choca(o.caja, r.caja)) return false;
        return true;
      },
      poner(r) { puestos.push(r); return r; },
      /** prueba la posición y unos corrimientos; pone la primera libre */
      probar(txt, cls, cx, cy, ang, tam, extra) {
        const n = ang ? [-Math.sin((ang * Math.PI) / 180), Math.cos((ang * Math.PI) / 180)] : [0, 1];
        for (const f of [0, -1, 1, -2, 2, -3, 3]) {
          const d = f * (tamDe(cls, tam) * 0.9 + 3);
          const r = rotulo(txt, cls, cx + n[0] * d, cy + n[1] * d, ang, tam, extra);
          if (this.libre(r)) return this.poner(r);
        }
        return null;
      },
    };
  }
  const normAng = (ang) => {
    if (ang > 90.01) ang -= 180; else if (ang <= -90.01) ang += 180;
    return Math.abs(Math.abs(ang) - 90) < 0.5 ? -90 : ang;   // verticales: se leen de abajo arriba
  };
  /** etiquetas a lo largo de una polilínea del lienzo: la etiqueta va sobre la cuerda
      entre s − L/2 y s + L/2 y solo si el trazo no se aparta más de 1,2 unidades de ella */
  function rotularLinea(P, txt, cls, rot, { paso = 700, desde = 0, cruces = [], extra, lado = 0 } = {}) {
    const st = ESTILO[cls], L = anchoTexto(mayus(txt), tamDe(cls), st.tr) + 12;
    const cum = [0];
    for (let i = 1; i < P.length; i++) cum.push(cum[i - 1] + dist(P[i - 1], P[i]));
    const total = cum[cum.length - 1];
    const enArco = (s) => {
      let i = 1;
      while (i < cum.length - 1 && cum[i] < s) i++;
      const l = cum[i] - cum[i - 1] || 1, t = Math.max(0, Math.min(1, (s - cum[i - 1]) / l));
      return [P[i - 1][0] + (P[i][0] - P[i - 1][0]) * t, P[i - 1][1] + (P[i][1] - P[i - 1][1]) * t];
    };
    let ultimo = -1e9;
    for (let s = Math.max(desde, L / 2 + 2); s <= total - L / 2 - 2; s += 16) {
      if (s - ultimo < paso) continue;
      if (cruces.some((q) => Math.abs(q - s) < L / 2 + 6)) continue;
      const a = enArco(s - L / 2), b = enArco(s + L / 2), ab = dist(a, b);
      if (ab < L * 0.9) continue;
      const ux = (b[0] - a[0]) / ab, uy = (b[1] - a[1]) / ab;
      let dmax = 0;
      for (let i = 0; i < P.length; i++) {
        if (cum[i] <= s - L / 2 || cum[i] >= s + L / 2) continue;
        dmax = Math.max(dmax, Math.abs((P[i][0] - a[0]) * uy - (P[i][1] - a[1]) * ux));
      }
      if (dmax > 1.2) continue;
      const ang = normAng((Math.atan2(uy, ux) * 180) / Math.PI);
      const r = rotulo(txt, cls, (a[0] + b[0]) / 2 - uy * lado, (a[1] + b[1]) / 2 + ux * lado, ang, 0, extra);
      if (!rot.libre(r)) continue;
      rot.poner(r);
      ultimo = s;
    }
  }
  function textoSVG(r) {
    const x = r1(r.x), y = r1(r.y), giro = r.ang ? ` transform="rotate(${r1(r.ang)} ${x} ${y})"` : '';
    const tam = r.t ? ` style="font-size:calc(${r1(r.t * FT)}px / var(--mapa-k))"` : '';
    const clase = `m-e-${r.cls}${r.oscuro ? ' m-e-o' : ''}`;
    if (!r.placa) return `<text class="${clase}" x="${x}" y="${y}"${giro}${tam}>${esc(r.T)}</text>`;
    // placa: corta el trazo de la vía bajo el nombre, como la cota de un plano
    const st = ESTILO[r.cls], t = tamDe(r.cls, r.t), w = anchoTexto(r.T, t, st.tr) + t * 0.9, h = r.cls === 'av' ? (FT > 1 ? 13 : 7.4) : (FT > 1 ? 7.6 : 5.2);
    const cx = r.x - (st.tr * t) / 2;
    return `<g${giro}><rect class="m-placa m-placa-${r.cls}${r.oscuro ? ' m-e-o' : ''}" x="${r1(cx - w / 2)}" y="${r1(r.y - h / 2)}" width="${r1(w)}" height="${h}"/>`
      + `<text class="${clase}" x="${x}" y="${y}"${tam}>${esc(r.T)}</text></g>`;
  }

  /* ---------------------------------------------------------------- 11 · SVG */
  const mas = (p, v, f) => [p[0] + v[0] * f, p[1] + v[1] * f];
  function dirXY(a, b) {
    const dx = xk(b[1]) - xk(a[1]), dy = yc(b[0]) - yc(a[0]), l = Math.hypot(dx, dy) || 1;
    return [dx / l, dy / l];
  }
  /** orejas (lazos) en los cruces a desnivel más conocidos */
  function orejas() {
    const Rd = red(), vistos = [];
    const pares = [['Calle 80', 'Av. 68'], ['Calle 26', 'Av. 68'], ['Calle 26', 'Av. Boyacá'], ['Calle 80', 'Av. Boyacá'],
      ['Calle 26', 'NQS'], ['Calle 127', 'Autopista Norte'], ['Av. Américas', 'Av. 68'], ['Av. Américas', 'Av. Boyacá'],
      ['Calle 170', 'Autopista Norte'], ['Calle 13', 'Av. 68'], ['Calle 100', 'Autopista Norte']];
    let s = '';
    for (const [na, nb] of pares) {
      for (const va of Rd.vias.filter((v) => v.n === na && v.c === 'p')) for (const vb of Rd.vias.filter((v) => v.n === nb && v.c === 'p')) for (let i = 0; i < va.pts.length - 1; i++) {
        for (let j = 0; j < vb.pts.length - 1; j++) {
          const x = cruceSeg(va.pts[i], va.pts[i + 1], vb.pts[j], vb.pts[j + 1], 0.05);
          if (!x) continue;
          const [X, Y] = pt(x.c, x.k);
          if (vistos.some(([a, b]) => Math.hypot(a - X, b - Y) < 5)) continue;
          vistos.push([X, Y]);
          const d1 = dirXY(va.pts[i], va.pts[i + 1]), d2 = dirXY(vb.pts[j], vb.pts[j + 1]);
          for (const s1 of [1, -1]) {
            for (const s2 of [1, -1]) {
              const bx = s1 * d1[0] + s2 * d2[0], by = s1 * d1[1] + s2 * d2[1], bl = Math.hypot(bx, by);
              const half = Math.acos(Math.max(-1, Math.min(1, s1 * s2 * (d1[0] * d2[0] + d1[1] * d2[1])))) / 2;
              if (bl < 1e-6 || half < 0.35) continue;
              // lazo tangente a las dos vías: sale de una, gira 270° por fuera y entra en la otra
              const r = 6.5, dc = r / Math.sin(half), cx = X + (bx / bl) * dc, cy = Y + (by / bl) * dc, dt = r / Math.tan(half);
              const ta = [X + s1 * d1[0] * dt, Y + s1 * d1[1] * dt], tb = [X + s2 * d2[0] * dt, Y + s2 * d2[1] * dt];
              let delta = Math.atan2(tb[1] - cy, tb[0] - cx) - Math.atan2(ta[1] - cy, ta[0] - cx);
              while (delta <= -Math.PI) delta += 2 * Math.PI;
              while (delta > Math.PI) delta -= 2 * Math.PI;
              s += `M${r1(ta[0])} ${r1(ta[1])}A${r} ${r} 0 1 ${delta > 0 ? 0 : 1} ${r1(tb[0])} ${r1(tb[1])}`;
            }
          }
        }
      }
    }
    return s;
  }
  function aeropuerto(g) {
    const u = g.uPista, n = g.nPista, pistas = [], ejes = [], rodajes = [];
    g.pistas.forEach(([a, b], i) => {
      const ce = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
      pistas.push(trazo(rectGirado(ce, u, dist(a, b) / 2, 0.28), true));
      ejes.push(trazo([mas(a, u, 0.7), mas(b, u, -0.7)]));
      const lado = i === 0 ? 1 : -1;   // calle de rodaje del lado de la terminal
      rodajes.push(trazo([mas(mas(a, u, 0.3), n, lado * 1.3), mas(mas(b, u, -0.3), n, lado * 1.3)]));
    });
    const plataforma = trazo(rectGirado([27.8, 107.4], u, 4.2, 1.8), true);
    const terminal = trazo(rectGirado([28.5, 106.3], u, 2.6, 0.5), true);
    return `<path class="m-aero" fill="url(#§ID§-a)" d="${trazo(g.aero, true)}"/>`
      + `<path class="m-aero-p" d="${plataforma}"/><path class="m-aero-t" d="${terminal}"/>`
      + `<path class="m-rodaje" d="${rodajes.join('')}${trazo([[26, 102.6], [26.6, 104.3]])}"/>`
      + `<path class="m-pista" d="${pistas.join('')}"/><path class="m-pista-e" d="${ejes.join('')}"/>`;
  }
  function dCampus() {
    const ce = [36, 37.6], rc = 6.2, rk = 4.8, p = [];
    for (let i = 0; i <= 20; i++) { const a = (i / 20) * 2 * Math.PI; p.push([ce[0] + rc * Math.sin(a), ce[1] + rk * Math.cos(a)]); }
    return trazo(p) + trazo([[27.4, 37.6], [ce[0] - rc, 37.6]]) + trazo([[44.6, 37.6], [ce[0] + rc, 37.6]])
      + trazo([[36, 30.8], [36, ce[1] - rk]]) + trazo([[36, 44.4], [36, ce[1] + rk]]);
  }
  /** etiqueta paralela al eje de un humedal, desplazada a su ronda */
  function rotuloEje(rot, eje, txt, desplazamiento) {
    const a = eje[0], b = eje[eje.length - 1], mid = enS(eje, largo(eje) / 2);
    const l = dist(a, b), nrm = [(b[1] - a[1]) / l, -(b[0] - a[0]) / l];
    const ce = mas(mid, nrm, desplazamiento), [x, y] = pt(ce[0], ce[1]);
    const [x1, y1] = pt(a[0], a[1]), [x2, y2] = pt(b[0], b[1]);
    return rot.probar(txt, 'agua', x, y, normAng((Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI));
  }
  function etiquetas(det, g) {
    const alto = det === 'alto', rot = rotulador(), Rd = red();
    FT = alto ? 1 : 2;
    const P = (lista) => lista.map(([c, k]) => pt(c, k));
    for (const [nombre, c, k, tipo, ang = 0, t = 0] of ZONAS_DEF) {
      if (tipo !== 'localidad') continue;
      const [x, y] = pt(c, k), r = rotulo(nombre, 'loc', x, y, ang, t);
      if (alto || rot.libre(r)) rot.poner(r);   // en «medio», con texto al doble, una localidad chica puede no caber
    }
    for (const [txt, c, k, cls, ang = 0, nivel] of LUGARES) {
      if (cls !== 'cer' || (nivel === 'alto' && !alto)) continue;
      const [x, y] = pt(c, k);
      rot.probar(txt, cls, x, y, ang);
    }
    for (const [nombre, c, k, tipo, ang = 0, t = 0] of ZONAS_DEF) {
      if (tipo === 'barrio') { const [x, y] = pt(c, k); rot.probar(nombre, 'bar', x, y, ang, t); }
    }
    for (const [txt, c, k, cls, ang = 0, nivel] of LUGARES) {
      if (cls === 'cer' || (nivel === 'alto' && !alto)) continue;
      const [x, y] = pt(c, k);
      rot.probar(txt, cls, x, y, ang);
    }
    {
      const [a, b] = g.pistas, ce = [(a[0][0] + a[1][0] + b[0][0] + b[1][0]) / 4 + 0.4, (a[0][1] + a[1][1] + b[0][1] + b[1][1]) / 4 + 3.2];
      const [x, y] = pt(ce[0], ce[1]), [x1, y1] = pt(...b[0]), [x2, y2] = pt(...b[1]);
      rot.probar('Aeropuerto El Dorado', 'lug', x, y, normAng((Math.atan2(y2 - y1, x2 - x1) * 180) / Math.PI));
    }
    for (const v of Rd.vias) {
      if (v.c === 'p') rotularLinea(P(v.pts), v.et || v.n, 'av', rot, { paso: alto ? 640 : 1100, cruces: v.cruces.map((s) => s * S), extra: { placa: true } });
    }
    rotularLinea(P(RIO_B.map(([c, k]) => [c, k - 1.35])), 'Río Bogotá', 'agua', rot, { paso: 900, desde: 200 });
    rotularLinea(P(simplificar(JA, 0.8)), 'Río Juan Amarillo', 'agua', rot, { paso: 800, desde: 40, lado: 8 });
    rotularLinea(P(simplificar(FU.filter(([, k]) => k > 0), 0.8)), 'Río Fucha', 'agua', rot, { paso: 900, desde: 40, lado: 8 });
    rotuloEje(rot, g.ejeJA, 'Humedal Juan Amarillo', -2.75);
    rotuloEje(rot, g.ejeCordoba, 'Humedal Córdoba', 1.05);
    if (alto) {
      for (const v of Rd.vias) {
        if (v.c === 'a') rotularLinea(P(v.pts), v.et || v.n, 'art', rot, { paso: 820, cruces: v.cruces.map((s) => s * S), extra: { placa: true, oscuro: v.n === 'Av. Circunvalar' } });
      }
    }
    const out = rot.puestos.map(textoSVG).join('');
    FT = 1;
    return out;
  }
  function componer(det) {
    const g = geo(), alto = det === 'alto', Rd = red();
    const m = malla(det), cc = curvasCerros(det), cs = curvasSuba(det);
    const vias = (cls) => trazos(Rd.vias.filter((v) => v.c === cls).map((v) => v.pts));
    const cimas = CUMBRES.map(([, c, k]) => { const [x, y] = pt(c, k); return `M${r1(x)} ${r1(y - 4.5)}L${r1(x + 4.5)} ${r1(y + 3)}L${r1(x - 4.5)} ${r1(y + 3)}Z`; }).join('');
    const canales = trazos([[[88, bordeS(88)], [88, 15.2]], g.ejeCordoba]);
    const o = [
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" class="mapa-base §CLASE§" preserveAspectRatio="xMidYMid slice" role="img" aria-label="Mapa estilizado de Bogotá">`,
      '<defs>',
      '<pattern id="§ID§-v" width="4.5" height="4.5" patternUnits="userSpaceOnUse"><rect width="4.5" height="4.5" class="m-pv-f"/><rect x="1.7" y="1.7" width="1.1" height="1.1" class="m-pv-p"/></pattern>',
      '<pattern id="§ID§-a" width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="5" height="5" class="m-pa-f"/><path d="M0 0V5" class="m-pa-l"/></pattern>',
      '</defs>',
      `<rect class="m-suelo" width="${W}" height="${H}"/>`,
      alto ? `<path class="m-rural" d="${trazos(parcelas())}"/>` : '',
      `<path class="m-cerro" d="${dCerros()}${cs.contorno}"/>`,
      `<path class="m-curva" d="${cc.normales}${cs.normales}"/>`,
      `<path class="m-curva m-curva-i" d="${cc.maestras}${cs.maestras}"/>`,
      `<path class="m-queb" d="${dQuebradas()}"/>`,
      `<path class="m-verde" fill="url(#§ID§-v)" d="${trazos(g.verdes.concat(g.parquecitos), true)}"/>`,
      aeropuerto(g),
      `<path class="m-agua" d="${trazos(g.aguas, true)}"/>`,
      `<path class="m-calle-t" d="${trazos(m.T)}"/>`,
      `<path class="m-calle" d="${trazos(m.M)}"/>`,
      `<path class="m-campus" d="${dCampus()}"/>`,
      `<path class="m-estadio" d="${trazo(g.estadio, true)}"/><path class="m-cancha" d="${trazo(R(57.9, 27.85, 56.1, 28.95), true)}"/>`,
      `<path class="m-plaza" d="${trazo(g.plaza, true)}"/>`,
      `<path class="m-rio m-rio-b" d="${trazo(g.rioB)}"/>`,
      `<path class="m-rio" d="${trazos([g.ja, g.fu])}"/>`,
      `<path class="m-canal" d="${canales}"/>`,
      alto ? `<path class="m-oreja" d="${orejas()}"/>` : '',
      `<path class="m-art" d="${vias('a')}"/>`,
      `<path class="m-av-c" d="${vias('p')}"/>`,
      `<path class="m-av" d="${vias('p')}"/>`,
      `<path class="m-cima" d="${cimas}"/>`,
      `<g class="m-etiquetas">${etiquetas(det, g)}</g>`,
      '</svg>',
    ];
    return o.join('');
  }
  const MEMO = {};
  let uid = 0;
  function svg(op = {}) {
    const det = op.detalle === 'medio' ? 'medio' : 'alto';
    if (!MEMO[det]) MEMO[det] = componer(det);
    uid += 1;
    const clase = ('mapa-' + det + ' ' + (op.clase ? esc(op.clase) : '')).trim();
    return MEMO[det].replace(/§ID§/g, 'mapa' + uid).replace('§CLASE§', clase);
  }
  function vista(c, k, anchoPx, altoPx, escala = 1) {
    const [x, y] = pt(c, k), w = anchoPx / escala, h = altoPx / escala;
    return `${r1(x - w / 2)} ${r1(y - h / 2)} ${r1(w)} ${r1(h)}`;
  }

  /* ------------------------------------------------------------- 12 · ruteo */
  // Costo = cuadras / velocidad relativa + castigo por cada cambio de vía.
  const VEL = { p: 1, a: 0.8, l: 0.5 }, GIRO = 6;
  let RED = null;
  /** grafo de la red principal: nodos en los cruces, aristas a lo largo de cada vía */
  function red() {
    if (RED) return RED;
    const vias = geo().vias.map((v, i) => {
      const L = [0];
      for (let j = 1; j < v.pts.length; j++) L.push(L[j - 1] + dist(v.pts[j - 1], v.pts[j]));
      return Object.assign({}, v, { i, L, total: L[L.length - 1] });
    });
    const nodos = [];
    const nodoEn = (c, k) => {
      for (let i = 0; i < nodos.length; i++) if (Math.abs(nodos[i][0] - c) < 0.2 && Math.abs(nodos[i][1] - k) < 0.2) return i;
      nodos.push([c, k]);
      return nodos.length - 1;
    };
    const en = vias.map((v) => [{ s: 0, n: nodoEn(...v.pts[0]) }, { s: v.total, n: nodoEn(...v.pts[v.pts.length - 1]) }]);
    for (let a = 0; a < vias.length; a++) {
      for (let b = a + 1; b < vias.length; b++) {
        const A = vias[a], B = vias[b];
        for (let i = 0; i < A.pts.length - 1; i++) {
          for (let j = 0; j < B.pts.length - 1; j++) {
            const x = cruceSeg(A.pts[i], A.pts[i + 1], B.pts[j], B.pts[j + 1], 0.3);
            if (!x) continue;
            const n = nodoEn(x.c, x.k);
            en[a].push({ s: A.L[i] + x.t * (A.L[i + 1] - A.L[i]), n });
            en[b].push({ s: B.L[j] + x.u * (B.L[j + 1] - B.L[j]), n });
          }
        }
      }
    }
    const ady = nodos.map(() => []);
    vias.forEach((v, i) => {
      const lista = en[i].sort((x, y) => x.s - y.s).filter((x, j, arr) => j === 0 || x.n !== arr[j - 1].n);
      for (let j = 0; j < lista.length - 1; j++) {
        const x = lista[j], y = lista[j + 1], len = y.s - x.s;
        if (len < 1e-6) continue;
        ady[x.n].push({ a: y.n, via: i, s0: x.s, s1: y.s, costo: len / VEL[v.c] });
        ady[y.n].push({ a: x.n, via: i, s0: y.s, s1: x.s, costo: len / VEL[v.c] });
      }
      v.nodos = lista;
      v.cruces = lista.map((x) => x.s);
    });
    RED = { vias, nodos, ady };
    return RED;
  }
  const nombreCalle = (c) => `Calle ${Math.round(Math.abs(c))}${c < -0.01 ? ' Sur' : ''}`;
  const nombreCarrera = (k) => `Carrera ${Math.round(Math.abs(k))}${k < -0.01 ? ' Este' : ''}`;
  /** ¿el tramo local pasa por ciudad? (tolera los extremos y alguna manzana de parque) */
  function tramoUrbano(a, b) {
    const l = dist(a, b), n = Math.max(1, Math.ceil(l / 0.5));
    let malos = 0, total = 0;
    for (let i = 0; i <= n; i++) {
      const s = (i / n) * l;
      if (s < 0.8 || s > l - 0.8) continue;
      total++;
      if (!urbano(a[0] + ((b[0] - a[0]) * s) / l, a[1] + ((b[1] - a[1]) * s) / l)) malos++;
    }
    return !total || malos / total <= 0.15;
  }
  function cardinal(a, b) {
    const dx = xk(b[1]) - xk(a[1]), dy = yc(b[0]) - yc(a[0]);
    const ang = (((Math.atan2(-dy, dx) * 180) / Math.PI) + 360) % 360;       // 0 = oriente, 90 = norte
    const nombres = ['el oriente', 'el nororiente', 'el norte', 'el noroccidente', 'el occidente', 'el suroccidente', 'el sur', 'el suroriente'];
    const i = Math.round(ang / 45) % 8;
    if (i % 2 && Math.abs(ang - i * 45) > 15) return nombres[(Math.round(ang / 90) * 2) % 8];
    return nombres[i];
  }
  function giro(t1, t2) {
    const a = t1.pts, b = t2.pts, h1 = dirXY(a[a.length - 2], a[a.length - 1]), h2 = dirXY(b[0], b[1]);
    const ang = (Math.atan2(h1[0] * h2[1] - h1[1] * h2[0], h1[0] * h2[0] + h1[1] * h2[1]) * 180) / Math.PI;
    if (Math.abs(ang) < 28) return 'sigue';
    return ang > 0 ? 'derecha' : 'izquierda';
  }
  /** limpia puntos repetidos, quita tramos nulos y funde los consecutivos de la misma vía */
  function fundir(tramos) {
    const out = [];
    for (const t0 of tramos) {
      const pts = t0.pts.filter((p, i, arr) => i === 0 || dist(p, arr[i - 1]) > 1e-6);
      if (pts.length < 2 || largo(pts) < 0.05) continue;
      const u = out[out.length - 1];
      if (u && u.via === t0.via) u.pts = u.pts.concat(pts.slice(1)); else out.push({ via: t0.via, pts });
    }
    return out;
  }
  /** un punto en cerro, parque o agua se corre al punto urbano más cercano por su calle o su carrera */
  function aTierra(P) {
    if (urbano(P[0], P[1]) || red().vias.some((v) => proyectar(v.pts, P[0], P[1]).d < 0.35)) return P;
    for (let d = 0.25; d <= 25; d += 0.25) {
      for (const Q of [[P[0], P[1] + d], [P[0], P[1] - d], [P[0] + d, P[1]], [P[0] - d, P[1]]]) if (urbano(Q[0], Q[1])) return Q;
    }
    return P;
  }
  /** ruta por la malla: [calle, carrera] → [calle, carrera] */
  function rutear(o, d) {
    const Rd = red(), O = aTierra([Number(o[0]), Number(o[1])]), D = aTierra([Number(d[0]), Number(d[1])]);
    const cuadras = Math.abs(O[0] - D[0]) + Math.abs(O[1] - D[1]);
    const km = Math.round(cuadras * 0.1 * 1.2 * 10) / 10;
    const min = cuadras ? Math.max(1, Math.round((km / 22) * 60)) : 0;
    const pos = Rd.nodos.slice(), extra = new Map(), temporales = [];
    const nuevo = (p) => { pos.push(p); return pos.length - 1; };
    const unir = (n, e) => { let l = extra.get(n); if (!l) extra.set(n, (l = [])); l.push(e); };
    function enVia(vi, s) {
      const v = Rd.vias[vi], lista = v.nodos, vel = VEL[v.c];
      for (let j = 0; j < lista.length - 1; j++) {
        if (s < lista[j].s - 1e-9 || s > lista[j + 1].s + 1e-9) continue;
        const n = nuevo(enS(v.pts, s)), A = lista[j], B = lista[j + 1];
        unir(n, { a: A.n, via: vi, s0: s, s1: A.s, costo: (s - A.s) / vel });
        unir(n, { a: B.n, via: vi, s0: s, s1: B.s, costo: (B.s - s) / vel });
        unir(A.n, { a: n, via: vi, s0: A.s, s1: s, costo: (s - A.s) / vel });
        unir(B.n, { a: n, via: vi, s0: B.s, s1: s, costo: (B.s - s) / vel });
        for (const t of temporales) {
          if (t.vi !== vi || t.j !== j) continue;
          const c = Math.abs(t.s - s) / vel;
          unir(n, { a: t.n, via: vi, s0: s, s1: t.s, costo: c });
          unir(t.n, { a: n, via: vi, s0: t.s, s1: s, costo: c });
        }
        temporales.push({ vi, s, n, j });
        return n;
      }
      return -1;
    }
    const iO = nuevo(O), iD = nuevo(D);
    const sobre = (P) => Rd.vias.map((v, vi) => ({ vi, m: proyectar(v.pts, P[0], P[1]) })).filter((x) => x.m.d < 0.35);
    for (const { vi, m } of sobre(O)) {
      const n = enVia(vi, m.s);
      if (n >= 0) unir(iO, { a: n, via: -1, nombre: Rd.vias[vi].n, pts: [O, [m.c, m.k]], costo: m.d / VEL.l });
    }
    for (const { vi, m } of sobre(D)) {
      const n = enVia(vi, m.s);
      if (n >= 0) unir(n, { a: iD, via: -1, nombre: Rd.vias[vi].n, pts: [[m.c, m.k], D], costo: m.d / VEL.l });
    }
    // por la calle y la carrera del punto hasta la primera vía de la red
    function rayos(P, iP, salida) {
      for (const [dc, dk] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
        const lejos = [P[0] + dc * 30, P[1] + dk * 30];
        let mejor = null;
        Rd.vias.forEach((v, vi) => {
          for (let j = 0; j < v.pts.length - 1; j++) {
            const x = cruceSeg(P, lejos, v.pts[j], v.pts[j + 1], 0.01);
            if (!x || x.t * 30 < 0.4) continue;
            if (!mejor || x.t < mejor.t) mejor = { t: x.t, vi, s: v.L[j] + x.u * (v.L[j + 1] - v.L[j]), q: [x.c, x.k] };
          }
        });
        if (!mejor || !tramoUrbano(P, mejor.q)) continue;
        const n = enVia(mejor.vi, mejor.s);
        if (n < 0) continue;
        const nombre = dc ? nombreCarrera(P[1]) : nombreCalle(P[0]), costo = (mejor.t * 30) / VEL.l;
        if (salida) unir(iP, { a: n, via: -1, nombre, pts: [P, mejor.q], costo });
        else unir(n, { a: iP, via: -1, nombre, pts: [mejor.q, P], costo });
      }
    }
    rayos(O, iO, true);
    rayos(D, iD, false);
    // rutas directas en L por calles de barrio
    for (const [K, n1, n2] of [[[O[0], D[1]], nombreCalle(O[0]), nombreCarrera(D[1])], [[D[0], O[1]], nombreCarrera(O[1]), nombreCalle(D[0])]]) {
      if (!tramoUrbano(O, K) || !tramoUrbano(K, D)) continue;
      const iK = nuevo(K);
      unir(iO, { a: iK, via: -1, nombre: n1, pts: [O, K], costo: dist(O, K) / VEL.l });
      unir(iK, { a: iD, via: -1, nombre: n2, pts: [K, D], costo: dist(K, D) / VEL.l });
    }
    // Dijkstra con estado (nodo, vía por la que se llega)
    const nombreDe = (e) => (e.via >= 0 ? Rd.vias[e.via].n : e.nombre);
    const vecinos = (n) => (n < Rd.nodos.length ? Rd.ady[n] : []).concat(extra.get(n) || []);
    const mejor = new Map(), previo = new Map(), heap = [];
    const sube = (x) => {
      heap.push(x);
      for (let i = heap.length - 1; i > 0;) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; }
    };
    const saca = () => {
      const top = heap[0], ult = heap.pop();
      if (heap.length) {
        heap[0] = ult;
        for (let i = 0; ;) {
          const l = 2 * i + 1, r = l + 1;
          let m = i;
          if (l < heap.length && heap[l][0] < heap[m][0]) m = l;
          if (r < heap.length && heap[r][0] < heap[m][0]) m = r;
          if (m === i) break;
          [heap[m], heap[i]] = [heap[i], heap[m]]; i = m;
        }
      }
      return top;
    };
    // si la ruta sale con más de 5 tramos, se repite castigando más cada giro
    // sin alargar el viaje más de un 30 % frente a la ruta más corta
    let tramos = camino(GIRO);
    if (tramos && fundir(tramos).length > 5) {
      const base = tramos.costo;
      for (const castigo of [15, 40, 90]) {
        const t = camino(castigo);
        if (t && fundir(t).length <= 5 && t.costo <= base * 1.3) { tramos = t; break; }
      }
    }
    function camino(castigo) {
      mejor.clear(); previo.clear(); heap.length = 0;
      mejor.set(iO + '|', 0);
      sube([0, iO, '', iO + '|']);
      let fin = null;
      while (heap.length) {
        const [cst, n, nom, key] = saca();
        if (cst > (mejor.get(key) ?? Infinity) + 1e-9) continue;
        if (n === iD) { fin = key; break; }
        for (const e of vecinos(n)) {
          const ne = nombreDe(e), nc = cst + e.costo + (nom && ne !== nom ? castigo : 0), k2 = e.a + '|' + ne;
          if (nc < (mejor.get(k2) ?? Infinity) - 1e-9) { mejor.set(k2, nc); previo.set(k2, { key, e }); sube([nc, e.a, ne, k2]); }
        }
      }
      if (!fin) return null;
      const aristas = [];
      for (let k = fin; previo.has(k); k = previo.get(k).key) aristas.push(previo.get(k).e);
      const lista = aristas.reverse().map((e) => ({ via: nombreDe(e), pts: (e.via >= 0 ? tramoS(Rd.vias[e.via].pts, e.s0, e.s1) : e.pts).slice() }));
      lista.costo = aristas.reduce((t, e) => t + e.costo, 0);
      return lista;
    }
    if (!tramos) tramos = [{ via: nombreCalle(O[0]), pts: [O, [O[0], D[1]]] }, { via: nombreCarrera(D[1]), pts: [[O[0], D[1]], D] }];
    const limpios = fundir(tramos);
    const pasos = [];
    limpios.forEach((t, i) => {
      if (i === 0) { pasos.push(`Toma la ${t.via} hacia ${cardinal(t.pts[0], t.pts[t.pts.length - 1])}`); return; }
      const gd = giro(limpios[i - 1], t);
      pasos.push(gd === 'sigue' ? `Continúa por la ${t.via}` : `Gira a la ${gd} en la ${t.via}`);
    });
    pasos.push(limpios.length ? `Llegas a ${dir(D[0], D[1])}` : `Ya estás en ${dir(D[0], D[1])}`);
    const lienzo = (p) => p.map(([c, k]) => [r1(xk(k)), r1(yc(c))]);
    const puntos = [];
    for (const t of limpios) for (const q of lienzo(t.pts)) { const u = puntos[puntos.length - 1]; if (!u || u[0] !== q[0] || u[1] !== q[1]) puntos.push(q); }
    if (!puntos.length) puntos.push(lienzo([O])[0]);
    const total = limpios.reduce((s, t) => s + largo(t.pts), 0) || 1;
    return {
      puntos, km, min, pasos,
      tramos: limpios.map((t) => ({ via: t.via, km: Math.round((km * largo(t.pts) * 10) / total) / 10, puntos: lienzo(t.pts) })),
    };
  }

  /* -------------------------------------------------------- 13 · direcciones */
  function numCruce(v, tipo) {
    const a = Math.abs(v);
    let base = Math.floor(a + 1e-9), xx = Math.round((a - base) * 100);
    if (xx > 94) { base += 1; xx = 0; }
    if (xx < 6) xx = 12 + Math.floor(hash(base, Math.round(a * 7), 501) * 8) * 10;
    return `${base}-${String(xx).padStart(2, '0')}${v < -0.01 ? (tipo === 'c' ? ' Sur' : ' Este') : ''}`;
  }
  /** dirección aproximada al estilo de Bogotá: «Calle 127 # 19-40», «Av. Suba # 115-22» */
  function dir(c, k) {
    c = Number(c); k = Number(k);
    let mejor = null;
    for (const v of geo().vias) {
      const m = proyectar(v.pts, c, k);
      if (m.d < 0.12 && (!mejor || m.d < mejor.m.d)) mejor = { v, m };
    }
    if (mejor) {
      const { v, m } = mejor, a = v.pts[m.i], b = v.pts[m.i + 1];
      const horizontal = Math.abs(b[1] - a[1]) > Math.abs(b[0] - a[0]);
      if (v.dnH && horizontal) return `${v.dnH} # ${numCruce(k, 'k')}`;
      return v.e === 'k' ? `${v.dn || v.n} # ${numCruce(c, 'c')}` : `${v.dn || v.n} # ${numCruce(k, 'k')}`;
    }
    const fc = Math.abs(c - Math.round(c)), fk = Math.abs(k - Math.round(k));
    if (fk < 0.06 && fc >= 0.06) return `${nombreCarrera(k)} # ${numCruce(c, 'c')}`;
    if (fc < 0.06 || fc <= fk) return `${nombreCalle(c)} # ${numCruce(k, 'k')}`;
    return `${nombreCarrera(k)} # ${numCruce(c, 'c')}`;
  }

  DRS.mapa = { W, H, S, pt, inv, vista, svg, rutear, dir, ZONAS };
})();
