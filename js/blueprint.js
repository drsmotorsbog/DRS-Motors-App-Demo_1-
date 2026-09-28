/* DRS Motors · demo — dibujos en estilo blueprint (SVG, sin imágenes externas)
   Motor común de los planos de vehículo y los dibujos del sedán y la moto. Los demás
   cuerpos (hatchback, camioneta, pickup) y las vistas frontal y de planta van en
   js/blueprint-mas.js; la animación al entrar la lleva js/vehiculos.js con css/vehiculos.css.

   Un plano se arma con una especificación: silueta de UN solo trazo (Platino), detalles
   en orden de pluma (Plata), líneas de construcción (Humo), vidrios y luces (azul gráfico),
   ruedas con radios (más dos copias fantasma para el desenfoque al girar), haz de luz,
   flap (las dos líneas de la marca, la de arriba se abre), cotas, globos y rótulo.
   Cada trazo lleva pathLength="1": su dibujo es stroke-dashoffset de 1 a 0.

   API (la misma de siempre, con opciones nuevas):
     DRS.bp.carro / moto({ ancho, dibujar, retraso, globos, modo, rapido, cotas, rotulo, lecturas, ms })
       modo: 'traza' (se dibuja con cursor) · 'llega' (entra rodando y frena) · 'escaneo'
             (lectura de datos con línea que barre, dura ms) · 'enciende' (luces, vidrios,
             suspensión y flap) · 'tecnica' (traza + cotas + globos) · 'ninguno'.
             Sin modo: dibujar ? 'traza' : 'ninguno'; con globos y dibujar → 'tecnica'.
       rapido: versión corta (×0,7) para tarjetas pequeñas.
       cotas: true → distancia entre ejes y largo total (sin cifras: el plano no está a escala).
       rotulo: texto del cajetín («PLANO 01 · PERFIL»). lecturas: [{ x, y, t }] en unidades del
       dibujo, para el escaneo. ms: duración del escaneo.
     DRS.bp.perfil(spec, o)   construye cualquier perfil (lo usan los de blueprint-mas.js)
     DRS.bp.vehiculo(v, o)    elige el dibujo por tipo y carrocería
     DRS.bp.bahias / tacometro / qr   sin cambios */
(function () {
  'use strict';
  const DRS = window.DRS;
  let uid = 0;

  const f = (x) => Math.round(x * 10) / 10;
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const CLASE = { t: 'bp-t', s: 'bp-s', x: 'bp-x', n: 'bp-n', a: 'bp-a' };

  /* ---------------- piezas ---------------- */
  function rayado(id, sw, clase = 'bp-n') {
    return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="14" height="14" patternTransform="rotate(45)">`
      + `<path d="M0 0V14" class="${clase}" stroke-width="${f(sw * 0.9)}" style="stroke-dasharray:none;animation:none"/></pattern>`;
  }
  /** Un trazo que se dibuja (pathLength 1). cls: t | s | x | a. */
  const trazo = (d, cls, sw, extra = '') => `<path d="${d}" pathLength="1" class="${CLASE[cls] || cls} bp-tr${extra}" stroke-width="${f(sw)}"/>`;

  /** Rueda en coordenadas locales (el grupo va trasladado al centro): llanta, rin, disco y tres
      capas de radios, dos de ellas fantasma para el desenfoque al girar. */
  function rueda(cx, cy, r, sw, { rin = 0.68, rayos = 5, dobles = true, disco = 0, pinza = null, corona = 0 } = {}) {
    const rr = r * rin;
    // los anillos que se trazan van como arcos (pathLength en <circle> no es seguro en Safari viejo)
    const anillo = (ra, cls, g) => `<path d="M${f(-ra)} 0A${f(ra)} ${f(ra)} 0 1 1 ${f(ra)} 0A${f(ra)} ${f(ra)} 0 1 1 ${f(-ra)} 0Z" pathLength="1" class="${cls} bp-tr" stroke-width="${f(sw * g)}"/>`;
    let s = `<g class="bp-rueda" transform="translate(${cx} ${cy})">`;
    s += anillo(r, 'bp-t bp-llanta', 2.2);
    s += anillo(r * 0.91, 'bp-x bp-llanta', 0.55);
    s += anillo(rr, 'bp-t bp-rin', 1);
    s += anillo(rr * 0.9, 'bp-s bp-rin', 0.55);
    if (disco) s += `<circle r="${f(r * disco)}" class="bp-x bp-cubo" stroke-width="${f(sw * 0.8)}" style="--df:760ms"/>`;
    if (corona) s += `<circle r="${f(r * corona)}" class="bp-s bp-cubo" stroke-width="${f(sw * 0.7)}" style="--df:760ms"/>`;
    if (pinza) s += `<path d="${pinza}" class="bp-s bp-cubo" stroke-width="${f(sw * 0.9)}" style="--df:800ms"/>`;
    let radios = '';
    const r0 = r * 0.2, r1 = rr * 0.9;
    for (let k = 0; k < rayos; k++) {
      const a = (k * 360) / rayos - 90;
      const angs = dobles ? [a - 5.5, a + 5.5] : [a];
      angs.forEach((g) => {
        const t = (g * Math.PI) / 180;
        radios += `<path d="M${f(r0 * Math.cos(t))} ${f(r0 * Math.sin(t))}L${f(r1 * Math.cos(t))} ${f(r1 * Math.sin(t))}" class="bp-s" stroke-width="${f(sw * 0.9)}"/>`;
      });
    }
    for (let k = 1; k <= 3; k++) s += `<g class="bp-rayos bp-rayos-${k}">${radios}</g>`;
    s += `<circle r="${f(r * 0.15)}" class="bp-s bp-cubo" stroke-width="${f(sw)}" style="--df:800ms"/>`;
    s += `<circle r="${f(r * 0.05)}" class="bp-t bp-cubo" stroke-width="${f(sw * 0.8)}" style="--df:840ms"/>`;
    return s + `</g>`;
  }

  /** Globos numerados: [{ x, y, bx, by, n, t }] punto → globo con número y texto. */
  function globosSVG(globos, sw) {
    return globos.map((g, k) => {
      const r = 20;
      const lado = g.bx < g.x ? 'end' : 'start';
      const tx = lado === 'end' ? g.bx - r - 10 : g.bx + r + 10;
      return `<g class="bp-globo" style="--i:${k}">`
        + `<path d="M${g.x} ${g.y}L${g.bx} ${g.by}" pathLength="1" class="bp-x bp-tr bp-globo-guia" stroke-width="${f(sw * 0.7)}"/>`
        + `<rect x="${g.x - 5}" y="${g.y - 5}" width="10" height="10" class="bp-a bp-globo-punto" stroke-width="${f(sw * 0.8)}"/>`
        + `<g transform="translate(${g.bx} ${g.by})"><g class="bp-globo-c">`
        + `<circle r="${r}" class="bp-a" stroke-width="${f(sw * 0.9)}" fill="var(--sup-1)"/>`
        + `<text y="7" text-anchor="middle" class="bp-txa" style="font-family:var(--f-display);font-weight:400;font-size:22px;letter-spacing:0">${String(g.n).padStart(2, '0')}</text>`
        + `</g></g>`
        + (g.t ? `<text x="${tx}" y="${g.by + 6}" text-anchor="${lado}" class="bp-tx1 bp-globo-txt" style="font-size:17px">${esc(g.t)}</text>` : '')
        + `</g>`;
    }).join('');
  }

  /** Cota horizontal: líneas de extensión, línea de cota que se despliega, marcas y rótulo. */
  function cota(x1, x2, y, sw, texto, { ext = null, arriba = true } = {}) {
    let s = `<g class="bp-cota">`;
    if (ext) ext.forEach(([x, y0]) => { s += `<path d="M${x} ${y0}V${arriba ? y - 6 : y + 6}" pathLength="1" class="bp-x bp-tr bp-cota-ext" stroke-width="${f(sw * 0.6)}"/>`; });
    s += `<g transform="translate(${x1} ${y})"><g class="bp-cota-lin"><path d="M0 0H${f(x2 - x1)}" class="bp-x" stroke-width="${f(sw * 0.7)}"/></g></g>`;
    s += `<path d="M${x1 - 4} ${y + 4}L${x1 + 4} ${y - 4}M${x2 - 4} ${y + 4}L${x2 + 4} ${y - 4}" class="bp-x bp-cota-marca" stroke-width="${f(sw * 0.8)}"/>`;
    s += `<text x="${f((x1 + x2) / 2)}" y="${arriba ? y - 7 : y + 20}" text-anchor="middle" class="bp-cota-txt">${esc(texto)}</text>`;
    return s + `</g>`;
  }

  /** Lecturas del escaneo: cajita con el dato en la franja de arriba y guía hasta su punto. */
  function lecturasSVG(lecturas, vb, sw) {
    const ancho = (t) => Math.round(t.length * 17.6 + 24);          // estimado; js/vehiculos.js lo ajusta a la medida real
    const filas = [];
    return lecturas.map((l, k) => {
      const w = ancho(l.t), h = 32;
      let x = Math.max(vb[0] + 6, Math.min(vb[0] + vb[2] - w - 6, l.x - w * 0.35));
      let fila = 0;
      while (filas.some((o) => o.f === fila && x < o.x + o.w + 8 && o.x < x + w + 8)) fila++;
      filas.push({ f: fila, x, w });
      const y = 26 + fila * 38;
      const gx = Math.max(x + 8, Math.min(x + w - 8, l.x));
      return `<g class="bp-lect" style="--i:${k}">`
        + `<path d="M${f(gx)} ${y + h}V${f(l.y - 8)}" class="bp-x" stroke-width="${f(sw * 0.6)}"/>`
        + `<rect x="${f(l.x - 5)}" y="${f(l.y - 5)}" width="10" height="10" class="bp-a" stroke-width="${f(sw * 0.8)}"/>`
        + `<rect x="${f(x)}" y="${y}" width="${w}" height="${h}" class="bp-lect-caja" stroke-width="${f(sw * 0.7)}"/>`
        + `<text x="${f(x + 12)}" y="${y + 22}" class="bp-lect-txt">${esc(l.t)}</text></g>`;
    }).join('');
  }

  /** Cajetín pequeño (rótulo del plano), abajo a la derecha. */
  function rotuloSVG(texto, vb, sw, y) {
    const w = Math.round(texto.length * 12.6 + 26), h = 26;          // estimado; js/vehiculos.js lo ajusta a la medida real
    const x = vb[0] + vb[2] - w - 8;
    return `<g transform="translate(${f(x + w / 2)} ${f(y + h / 2)})"><g class="bp-rotulo"><g transform="translate(${f(-w / 2)} ${f(-h / 2)})">`
      + `<rect width="${w}" height="${h}" class="bp-rotulo-caja" stroke-width="${f(sw * 0.7)}"/>`
      + `<path d="M0 0H${w}" class="bp-s" stroke-width="${f(sw * 1.4)}"/>`
      + `<text x="12" y="18" class="bp-rotulo-txt">${esc(texto)}</text></g></g></g>`;
  }

  /* ---------------- el plano de perfil ---------------- */
  /**
   * spec: { etiqueta, vb: [x, y, w, h], suelo, ruedas: [[cx, cy, r, opciones]], sil, det: [[d, cls, g]],
   *         vidrios: [d], luces: [d], haz, flap: { base, ala, pivote }, cotas: { ejes: [x1, x2], largo: [[x, y], [x, y]] },
   *         frente: [x, y] (eje delantero: origen del cabeceo) }
   */
  function perfil(spec, o = {}) {
    const { ancho = 330, dibujar = true, retraso = 0, globos = null, rapido = false, cotas = false, rotulo = '', lecturas = null } = o;
    let modo = o.modo || (dibujar ? (globos ? 'tecnica' : 'traza') : 'ninguno');
    if (modo === 'escaneo') return escaneo(spec, o);
    const base = spec.vb;
    const suelo = spec.suelo;
    let top = base[1], fondo = base[1] + base[3];
    if (globos || lecturas) top = Math.min(top, 22);
    if (cotas && !globos) top = Math.min(top, base[1] - 30);
    if (cotas || rotulo) fondo = Math.max(fondo, suelo + 46);
    const vb = [base[0], top, base[2], fondo - top];
    const sw = 1.5 / (ancho / vb[2]);
    const id = `bpr${++uid}`;
    const [fx, fy] = spec.frente || spec.ruedas[spec.ruedas.length - 1];
    let s = `<defs>${rayado(id, sw)}</defs>`;

    // suelo: rayado y línea (las vistas sin suelo, como la planta, no lo llevan)
    if (!spec.sinSuelo) {
      s += `<g class="bp-fondo"><rect x="${vb[0] + 30}" y="${suelo + 1}" width="${vb[2] - 60}" height="14" fill="url(#${id})" class="bp-fade" style="--df:200ms"/>`;
      s += trazo(`M${vb[0]} ${suelo}H${vb[0] + vb[2]}`, 'x', sw * 0.8, ' bp-suelo') + `</g>`;
    }

    // líneas de velocidad (solo al llegar)
    if (modo === 'llega') {
      s += [[58, 262, 132], [46, 300, 150], [62, 338, 118]].map(([x, y, w], i) => `<path d="M${x} ${y}h${w}" pathLength="1" class="bp-x bp-vel" stroke-width="${f(sw * 0.8)}" style="--i:${i}"/>`).join('');
    }

    // el vehículo: carrocería (cabecea sobre el eje delantero) + ruedas + haz
    s += `<g class="bp-vehiculo"><g transform="translate(${fx} ${fy})"><g class="bp-carroceria"><g transform="translate(${-fx} ${-fy})">`;
    s += trazo(spec.sil, 't', sw, ' bp-sil');
    (spec.det || []).forEach(([d, cls = 's', g = 1]) => {
      // 'eje': línea de eje discontinua (no se traza: su patrón es en unidades reales; aparece)
      s += cls === 'eje' ? `<path d="${d}" class="bp-eje bp-fade" stroke-width="${f(sw * g)}" style="--df:520ms"/>` : trazo(d, cls, sw * g, ' bp-det');
    });
    (spec.vidrios || []).forEach((d) => { s += `<path d="${d}" class="bp-vidrio-relleno"/>` + trazo(d, 'a', sw * 0.85, ' bp-det bp-vidrio'); });
    (spec.luces || []).forEach((d) => { s += trazo(d, 'a', sw * 0.9, ' bp-det'); });
    if (spec.flap) {
      // el flap de la marca: dos líneas paralelas; la de arriba nace sobre la de abajo y se separa
      s += trazo(spec.flap, 't', sw * 1.2, ' bp-det');
      s += `<g class="bp-flap"><path d="${spec.flap}" class="bp-s" stroke-width="${f(sw * 0.9)}"/></g>`;
    }
    s += `</g></g></g>`;
    spec.ruedas.forEach(([cx, cy, r, op]) => { s += rueda(cx, cy, r, sw, op); });
    if (spec.haz) {
      const [hx, hy] = spec.hazOrigen || [fx, fy];
      s += `<g transform="translate(${hx} ${hy})"><g class="bp-haz-g"><path d="${spec.haz}" class="bp-haz" transform="translate(${-hx} ${-hy})"/></g></g>`;
    }
    s += `</g>`;

    // construcción: cruces de eje y cotas
    s += `<g class="bp-constr">`;
    spec.ruedas.forEach(([cx, cy, r], i) => {
      s += `<g transform="translate(${cx} ${cy})"><g class="bp-cruz" style="--i:${i}"><path d="M${-r * 0.42} 0H${r * 0.42}M0 ${-r * 0.42}V${r * 0.42}" class="bp-x" stroke-width="${f(sw * 0.6)}"/></g></g>`;
    });
    if (cotas && spec.cotas) {
      const c = spec.cotas;
      if (c.ejes) s += cota(c.ejes[0], c.ejes[1], suelo + 26, sw, 'Entre ejes', { ext: spec.ruedas.map(([cx, cy, r]) => [cx, cy + r + 4]), arriba: false });
      if (c.largo && !globos) s += cota(c.largo[0][0], c.largo[1][0], top + 16, sw, 'Largo total', { ext: c.largo.map(([x, y]) => [x, y - 10]), arriba: true });
    }
    s += `</g>`;
    if (globos) s += globosSVG(globos, sw);
    if (rotulo) s += rotuloSVG(rotulo, vb, sw, suelo + 16);
    if (modo === 'traza' || modo === 'tecnica') s += `<g class="bp-cursor"><path d="M-9 0H-3M3 0H9M0 -9V-3M0 3V9" class="bp-t" stroke-width="${f(sw)}"/><rect x="-2.5" y="-2.5" width="5" height="5"/></g>`;

    const anim = modo !== 'ninguno';
    const cls = ['bp', 'bp-perfil', anim ? 'bp-anim' : '', anim ? `bp-m-${modo}` : '', rapido ? 'bp-rapido' : ''].filter(Boolean).join(' ');
    return `<svg class="${cls}" viewBox="${vb.join(' ')}" style="--d0:${retraso}ms" role="img" aria-label="${esc(spec.etiqueta)}"${anim ? ` data-anim="${modo}"` : ''}>${s}</svg>`;
  }

  /** Escaneo: el plano fantasma debajo y el plano brillante (con lecturas) revelado por la línea. */
  function escaneo(spec, o) {
    const { retraso = 0, ms = 1500, lecturas = null, ancho = 330 } = o;
    // los dos planos comparten viewBox (lecturas solo amplía la franja de arriba)
    const fantasma = perfil(spec, { ...o, modo: 'ninguno', dibujar: false, globos: null, cotas: false, rotulo: '' });
    let brillo = fantasma;
    if (lecturas && lecturas.length) {
      const vb = brillo.match(/viewBox="([^"]+)"/)[1].split(' ').map(Number);
      const sw = 1.5 / (ancho / vb[2]);
      brillo = brillo.replace('</svg>', `<g class="bp-lecturas">${lecturasSVG(lecturas, vb, sw)}</g></svg>`);
    }
    return `<span class="bp-scan" style="--ms:${ms}ms;--d0:${retraso}ms">`
      + fantasma.replace('class="bp ', 'class="bp bp-fantasma ')
      + brillo.replace('class="bp ', 'class="bp bp-brillo ').replace('role="img"', 'aria-hidden="true"')
      + `<i class="bp-scan-linea" aria-hidden="true"></i></span>`;
  }

  /* ---------------- especificaciones ---------------- */
  /** Sedán de perfil (mira a la derecha). Ruedas en 250 y 750, suelo en 386. */
  const SEDAN = {
    etiqueta: 'Dibujo técnico del vehículo',
    vb: [40, 84, 920, 326], suelo: 386,
    ruedas: [[250, 322, 62, { disco: 0.5, pinza: 'M-12 -30 L-24 -20 L-32 -4' }], [750, 322, 62, { disco: 0.5, pinza: 'M-12 -30 L-24 -20 L-32 -4' }]],
    frente: [750, 322],
    sil: 'M118 352 L100 320 Q94 296 96 270 L110 234 Q190 226 266 220 C298 172 348 130 402 122 Q482 114 560 118 C612 126 660 158 692 188 L862 214 Q892 218 898 226 C908 238 914 272 914 302 Q914 332 908 342 L896 356 L880 358 L836 356 L822 350 A78 78 0 1 0 678 350 L322 350 A78 78 0 1 0 178 350 L130 352 Z',
    det: [
      ['M296 224 C318 180 360 142 404 134 Q480 128 552 131 C598 138 640 166 664 208 L666 224 Z', 's', 0.9],   // marco de vidrios
      ['M472 224 L470 130', 's', 1.1],                 // pilar B
      ['M358 224 L353 160', 's', 0.8],                 // división del vidrio trasero
      ['M666 226 L662 348', 's', 0.9],                 // corte de la puerta delantera
      ['M474 226 L470 348', 's', 0.9],                 // corte entre puertas
      ['M304 226 L308 270', 's', 0.9],                 // corte de la puerta trasera
      ['M604 246 L642 244 L642 254 L604 256 Z', 's', 0.8],  // manija delantera
      ['M410 248 L448 246 L448 256 L410 258 Z', 's', 0.8],  // manija trasera
      ['M340 302 Q500 296 662 298', 's', 0.7],         // línea baja de las puertas
      ['M334 338 L664 338', 's', 0.7],                 // estribo
      ['M694 200 L724 196 L726 214 L698 216 Z', 's', 0.9],  // espejo
      ['M196 258 L220 256 L220 278 L196 280 Z', 's', 0.7],  // tapa de combustible
      ['M902 310 L878 312 L878 344 L900 344', 's', 0.8],    // toma de aire
      ['M100 322 L128 320 L128 332 L100 334 Z', 's', 0.7],  // reflector trasero
      ['M176 288 A86 86 0 0 1 324 288', 'x', 0.6],     // reborde del paso de rueda trasero
      ['M676 288 A86 86 0 0 1 824 288', 'x', 0.6],     // reborde del paso de rueda delantero
    ],
    vidrios: ['M306 218 C326 180 364 148 406 140 L462 137 L466 218 Z', 'M480 218 L478 136 L552 135 C596 142 636 168 656 208 L656 218 Z'],
    luces: ['M896 230 L842 240 L846 266 L912 268 Z', 'M110 236 L156 232 L156 272 L98 276 Z'],
    haz: 'M900 232 L1000 200 L1000 300 L910 270 Z', hazOrigen: [900, 250],
    flap: 'M108 232 L172 227',
    cotas: { ejes: [250, 750], largo: [[96, 270], [914, 302]] },
  };

  /** Moto naked de perfil (mira a la derecha). Ruedas en 255 y 745, suelo en 386. */
  const MOTO = {
    etiqueta: 'Dibujo técnico de la moto',
    vb: [40, 60, 920, 350], suelo: 386,
    ruedas: [[255, 300, 86, { rin: 0.74, rayos: 5, disco: 0.52, corona: 0.4, pinza: 'M-22 -42 L-38 -32 L-46 -12' }], [745, 300, 86, { rin: 0.74, rayos: 5, disco: 0.64, pinza: 'M-20 -48 L-36 -38 L-46 -16' }]],
    frente: [745, 300],
    // silueta: tanque, asiento y colín en un solo contorno (el colín sube, como en una naked)
    sil: 'M676 168 Q640 146 600 150 Q566 154 566 160 Q548 190 560 226 L470 234 Q400 236 334 222 L264 196 L254 222 L300 240 L340 246 L470 254 L556 240 L600 226 L660 222 Q676 200 676 168 Z',
    det: [
      ['M486 258 L612 254 L624 280 L618 332 L522 344 L488 322 Z', 't', 0.95],   // bloque del motor
      ['M558 256 L570 228 L634 228 L628 256', 's', 0.9],                         // culata (bajo el tanque)
      ['M562 242 L630 244', 'x', 0.6],                                            // aleta
      ['M636 238 L664 240 L658 298 L630 294 Z', 's', 0.8],                       // radiador
      ['M640 252 L660 254 M638 266 L658 268 M637 280 L657 282', 'x', 0.6],
      ['M676 178 L638 236', 't', 0.9],                                            // tubo delantero del chasis
      ['M474 256 L468 314 L502 318 L506 258 Z', 's', 0.9],                       // placa del pivote
      ['M632 250 C662 282 654 340 612 352', 's', 1.2],                           // tubo de escape
      ['M612 344 L476 352 L472 376 L614 366 Z', 's', 0.9],                       // silenciador
      ['M472 298 L262 296 M472 314 L262 310', 't', 0.95],                        // basculante
      ['M466 254 L438 302', 's', 2.4],                                            // amortiguador
      ['M470 250 L434 306', 'x', 0.7],
      ['M486 288 L255 266', 'x', 0.6],                                            // cadena (tramo superior)
      ['M751 302 L705 174 M738 298 L692 170', 's', 1.1],                         // barras de la horquilla
      ['M705 175 L727 236 M692 170 L714 231', 's', 2.2],                         // botellas
      ['M686 166 L716 178 M680 146 L710 158', 't', 1.2],                         // tijas
      ['M696 150 L690 132 L666 128 M666 128 L640 130', 's', 1.3],               // manubrio y puño
      ['M660 129 L648 100', 's', 0.8],                                            // brazo del espejo
      ['M636 92 L660 88 L662 102 L638 106 Z', 's', 0.8],                          // espejo
      ['M676 134 L704 130 L706 142 L678 146 Z', 's', 0.8],                        // tablero
      ['M670 237 A98 98 0 0 1 830 251', 's', 1],                                  // guardabarros delantero
      ['M174 253 A94 94 0 0 1 271 207', 's', 0.9],                                // guardabarros trasero
      ['M506 326 L532 330', 's', 1.4],                                            // posapiés
      ['M256 240 L292 248 L288 268 L252 260 Z', 's', 0.7],                        // portaplaca
    ],
    vidrios: [],
    luces: ['M708 148 L746 142 L748 176 L716 182 Z', 'M266 198 L258 210 L266 214 L272 202 Z'],
    haz: 'M748 146 L840 106 L840 206 L750 178 Z', hazOrigen: [748, 162],
    flap: 'M334 222 L266 197',
    cotas: { ejes: [255, 745], largo: [[174, 253], [830, 251]] },
  };

  function carro(o = {}) { return perfil(SEDAN, o); }
  function moto(o = {}) { return perfil(MOTO, o); }

  /* ---------------- otros dibujos (sin cambios de API) ---------------- */
  function trazos(lista, sw) {
    return lista.map(([d, cls = 'bp-t', g = 1], i) =>
      `<path d="${d}" pathLength="1" class="${cls}" stroke-width="${f(sw * g)}" style="--i:${i}"/>`).join('');
  }

  /** Planta de un lavadero: bahías vistas desde arriba; las ocupadas llevan un carro. */
  function bahias({ n = 3, ocupadas = [], ancho = 230, dibujar = false, etiquetas = true } = {}) {
    const W = 300, H = 150;
    const sw = 1.3 / (ancho / W);
    const x0 = 14, x1 = 286, y0 = 16, y1 = 116;
    const bw = (x1 - x0) / n;
    const lista = [['M' + x0 + ' ' + y0 + 'H' + x1, 'bp-t', 1.4]];
    for (let i = 0; i <= n; i++) lista.push([`M${f(x0 + i * bw)} ${y0}V${y1}`, 'bp-t', i === 0 || i === n ? 1.4 : 1]);
    for (let i = 0; i < n; i++) {
      const cx = x0 + bw * (i + 0.5);
      lista.push([`M${f(cx - 9)} 62h18v10h-18Z M${f(cx - 5)} 62v10 M${f(cx)} 62v10 M${f(cx + 5)} 62v10`, 'bp-x', 0.7]);
      lista.push([`M${f(cx)} 138V124 M${f(cx - 5)} 129L${f(cx)} 124L${f(cx + 5)} 129`, 'bp-x', 0.8]);
      if (ocupadas.includes(i)) {
        const cw = Math.min(bw * 0.52, 40), l = cx - cw / 2, r = cx + cw / 2;
        lista.push([`M${f(l + 4)} 30 L${f(r - 4)} 30 L${f(r)} 38 L${f(r)} 100 L${f(r - 3)} 106 L${f(l + 3)} 106 L${f(l)} 100 L${f(l)} 38 Z`, 'bp-a', 1]);
        lista.push([`M${f(l + 3)} 50 L${f(r - 3)} 50 M${f(l + 3)} 84 L${f(r - 3)} 84 M${f(l + 3)} 50 L${f(l + 3)} 84 M${f(r - 3)} 50 L${f(r - 3)} 84`, 'bp-a', 0.7]);
      }
    }
    let s = trazos(lista, sw);
    if (etiquetas) for (let i = 0; i < n; i++) s += `<text x="${f(x0 + i * bw + 7)}" y="31" style="font-size:11px">B${i + 1}</text>`;
    return `<svg class="bp${dibujar ? ' bp-dibuja' : ''}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="Plano del lavadero: ${n} bahías">${s}</svg>`;
  }

  /** Tacómetro de «vida restante»: arco de 270°, p de 0 a 1, estado pos/warn/neg. */
  function tacometro(p, estado, icono, { anima = true } = {}) {
    const cx = 32, cy = 32, r = 25;
    const pt = (a, rr) => [cx + rr * Math.cos((a * Math.PI) / 180), cy + rr * Math.sin((a * Math.PI) / 180)];
    const [sx, sy] = pt(135, r), [ex, ey] = pt(45, r);
    const arco = `M${f(sx)} ${f(sy)}A${r} ${r} 0 1 1 ${f(ex)} ${f(ey)}`;
    let marcas = '';
    for (let k = 0; k <= 8; k++) {
      const a = 135 + (270 / 8) * k;
      const [x0, y0] = pt(a, 29.5), [x1, y1] = pt(a, k % 4 === 0 ? 33.5 : 32);
      marcas += `M${f(x0)} ${f(y0)}L${f(x1)} ${f(y1)}`;
    }
    const pp = Math.max(0.02, Math.min(1, p));
    return `<span class="gauge${anima ? ' anima' : ''}" style="--p:${pp.toFixed(3)}"><svg viewBox="0 0 64 64" aria-hidden="true" style="fill:none;stroke-linecap:butt">`
      + `<path d="${marcas}" class="g-marca" stroke-width="1"/>`
      + `<path d="${arco}" class="g-pista" stroke-width="4"/>`
      + `<path d="${arco}" pathLength="1" class="g-valor est-${estado}" stroke-width="4"/>`
      + `</svg><svg class="ico" aria-hidden="true"><use href="#ico-${icono}"/></svg></span>`;
  }

  /** QR de muestra (no codifica datos reales): patrón determinista a partir del código. */
  function qr(texto, n = 25) {
    let h = 2166136261;
    for (const c of texto) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    const rnd = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 1000) / 1000; };
    const m = Array.from({ length: n }, () => Array(n).fill(0));
    const finder = (x, y) => { for (let i = 0; i < 7; i++) for (let j = 0; j < 7; j++) m[y + i][x + j] = (i === 0 || i === 6 || j === 0 || j === 6 || (i > 1 && i < 5 && j > 1 && j < 5)) ? 1 : 0; };
    const reservada = (x, y) => (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8);
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
      if (reservada(x, y)) continue;
      if (y === 6 || x === 6) { m[y][x] = (x + y) % 2 === 0 ? 1 : 0; continue; }
      m[y][x] = rnd() > 0.52 ? 1 : 0;
    }
    finder(0, 0); finder(n - 7, 0); finder(0, n - 7);
    let d = '';
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (m[y][x]) d += `M${x} ${y}h1v1h-1z`;
    return `<svg viewBox="0 0 ${n} ${n}" shape-rendering="crispEdges" role="img" aria-label="Código QR de la reserva ${texto}"><path d="${d}" fill="var(--sup-1)"/></svg>`;
  }

  /** Forma del dibujo según tipo y carrocería: 'sedan' | 'hatch' | 'suv' | 'pickup' | 'moto'. */
  function forma(v) {
    if (v.tipo === 'moto') return 'moto';
    const c = (v.carroceria || '').toLowerCase();
    if (/hatch/.test(c)) return 'hatch';
    if (/(suv|camioneta)/.test(c)) return 'suv';
    if (/(pick|platón|platon)/.test(c)) return 'pickup';
    return 'sedan';
  }
  /** Lecturas del escaneo ancladas en el dibujo de cada forma: techo, parabrisas y capó (en la moto:
      tanque, asiento y motor). textos: hasta tres cadenas; v: vehículo o nombre de la forma. */
  const ANCLAS = {
    sedan: [[480, 122], [610, 170], [800, 210]], hatch: [[420, 120], [590, 176], [760, 210]], suv: [[350, 104], [600, 148], [790, 206]],
    pickup: [[510, 100], [600, 160], [800, 190]], moto: [[600, 150], [420, 236], [560, 300]],
  };
  function lecturas(v, textos) {
    const anclas = ANCLAS[typeof v === 'string' ? v : forma(v)] || ANCLAS.sedan;
    return textos.filter(Boolean).slice(0, 3).map((t, i) => ({ x: anclas[i][0], y: anclas[i][1], t: String(t) }));
  }

  /** Dibujo según el tipo y la carrocería; usa los dibujos extra (js/blueprint-mas.js) si existen. */
  function vehiculo(v, o) {
    const fm = forma(v);
    if (fm === 'moto') return moto(o);
    if (fm !== 'sedan' && DRS.bp[fm]) return DRS.bp[fm](o);
    return carro(o);
  }
  DRS.bp = Object.assign(DRS.bp || {}, { carro, moto, perfil, forma, lecturas, bahias, tacometro, qr, vehiculo, _spec: { sedan: SEDAN, moto: MOTO } });
})();
