/* DRS Motors · demo — dibujos en estilo blueprint (SVG, sin imágenes externas)
   Vocabulario del piloto «Servicios DRS» (Videos/Servicios DRS (demo)/proyecto/blueprint.cjs):
   trazo Platino, vidrios y luces en Azul Luz, línea de suelo con rayado, cruces de eje.
   Cada trazo lleva pathLength="1" y --i para dibujarse en orden (clase .bp-dibuja). */
(function () {
  'use strict';
  const DRS = window.DRS;
  let uid = 0;

  const f = (x) => Math.round(x * 10) / 10;
  function trazos(lista, sw) {
    // lista: [d, clase, grosor relativo]
    return lista.map(([d, cls = 'bp-t', g = 1], i) =>
      `<path d="${d}" pathLength="1" class="${cls}" stroke-width="${f(sw * g)}" style="--i:${i}"/>`).join('');
  }
  function rayado(id, sw, clase = 'bp-n') {
    return `<pattern id="${id}" patternUnits="userSpaceOnUse" width="14" height="14" patternTransform="rotate(45)">`
      + `<path d="M0 0V14" class="${clase}" stroke-width="${f(sw * 0.9)}" style="stroke-dasharray:none;animation:none"/></pattern>`;
  }
  function rueda(cx, cy, r, sw, i0, { rin = 0.68, rayos = 5, disco = 0 } = {}) {
    const rr = r * rin;
    let s = `<g class="bp-rueda">`;
    s += `<circle cx="${cx}" cy="${cy}" r="${r}" pathLength="1" class="bp-t" stroke-width="${f(sw * 2.1)}" style="--i:${i0}"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${f(rr)}" pathLength="1" class="bp-t" stroke-width="${f(sw)}" style="--i:${i0 + 1}"/>`;
    if (disco) s += `<circle cx="${cx}" cy="${cy}" r="${f(r * disco)}" pathLength="1" class="bp-a" stroke-width="${f(sw)}" style="--i:${i0 + 2}"/>`;
    s += `<circle cx="${cx}" cy="${cy}" r="${f(r * 0.14)}" pathLength="1" class="bp-a" stroke-width="${f(sw)}" style="--i:${i0 + 2}"/>`;
    for (let k = 0; k < rayos; k++) {
      const a = (k * 360) / rayos - 90;
      const t = (a * Math.PI) / 180;
      const r0 = r * 0.19, r1 = rr * 0.95;
      s += `<path d="M${f(cx + r0 * Math.cos(t))} ${f(cy + r0 * Math.sin(t))}L${f(cx + r1 * Math.cos(t))} ${f(cy + r1 * Math.sin(t))}" pathLength="1" class="bp-a" stroke-width="${f(sw * 0.9)}" style="--i:${i0 + 3}"/>`;
    }
    return s + `</g>`;
  }
  function envolver(vb, ancho, contenido, { dibujar = true, retraso = 0, etiqueta = '' } = {}) {
    return `<svg class="bp${dibujar ? ' bp-dibuja' : ''}" viewBox="${vb}" style="--d0:${retraso}ms" role="img" aria-label="${etiqueta}">${contenido}</svg>`;
  }

  /** Sedán de perfil (mira a la derecha). */
  function carro({ ancho = 330, dibujar = true, retraso = 0, globos = null } = {}) {
    const vb = globos ? [40, 22, 920, 388] : [40, 84, 920, 326];
    const sw = 1.5 / (ancho / vb[2]);
    const id = `bpr${++uid}`;
    let s = `<defs>${rayado(id, sw)}</defs>`;
    s += `<rect x="70" y="387" width="860" height="14" fill="url(#${id})" class="bp-fade"/>`;
    s += trazos([
      ['M40 386H960', 'bp-x', 0.8],
      ['M95 322 L95 262 L118 232 Q160 214 245 208 L300 156 Q330 118 380 112 L520 112 Q548 112 565 132 L612 190 Q700 205 805 228 Q880 240 900 258 L905 322'],
      ['M95 322 L182 322 A68 68 0 0 1 318 322 L682 322 A68 68 0 0 1 818 322 L905 322'],
      ['M130 250 L860 246', 'bp-t', 0.7],
      ['M470 192 L470 302 M600 200 L605 300 M318 196 L326 300', 'bp-t', 0.7],
      ['M330 312 L670 312', 'bp-t', 0.7],
      ['M640 205 Q720 214 805 232 M120 232 L245 214', 'bp-t', 0.7],
      ['M598 178 L620 176 L622 190 L604 192 Z', 'bp-t', 0.8],
      ['M500 236 L540 235 M360 238 L396 237', 'bp-t', 0.8],
      ['M905 296 L860 300 M95 296 L140 300', 'bp-t', 0.7],
      ['M535 132 L595 188 L470 188 L470 128 Z', 'bp-a'],
      ['M452 128 L452 188 L318 188 L352 132 Z', 'bp-a'],
      ['M900 254 L840 242 L838 268 L898 274 Z', 'bp-a'],
      ['M98 236 L140 230 L140 256 L98 258 Z', 'bp-a'],
      ['M226 322H274M250 298V346M726 322H774M750 298V346', 'bp-x', 0.6],
    ], sw);
    s += `<path d="M900 250 L1000 205 L1000 318 L900 275 Z" class="bp-haz"/>`;
    s += rueda(250, 322, 62, sw, 15) + rueda(750, 322, 62, sw, 15);
    if (globos) s += globosSVG(globos, sw);
    return envolver(vb.join(' '), ancho, s, { dibujar, retraso, etiqueta: 'Dibujo técnico del vehículo' });
  }

  /** Moto naked de perfil (mira a la derecha). */
  function moto({ ancho = 330, dibujar = true, retraso = 0, globos = null } = {}) {
    const vb = globos ? [40, 0, 920, 410] : [40, 60, 920, 350];
    const sw = 1.5 / (ancho / vb[2]);
    const id = `bpr${++uid}`;
    let s = `<defs>${rayado(id, sw)}</defs>`;
    s += `<rect x="90" y="387" width="820" height="14" fill="url(#${id})" class="bp-fade"/>`;
    s += trazos([
      ['M40 386H960', 'bp-x', 0.8],
      ['M470 282 L262 290 M470 304 L262 312 M470 282 L470 304'],
      ['M255 272 L478 283 M255 328 L478 307', 'bp-x', 0.6],
      ['M478 238 L600 232 L628 262 L618 330 L520 342 L478 318 Z'],
      ['M560 232 L585 180 L640 186 L628 262', 'bp-t', 0.9],
      ['M574 206 L634 212 M568 220 L631 226', 'bp-x', 0.6],
      ['M638 248 L662 300 L640 350 L520 360 M520 350 L402 354 L394 372 L520 372 Z', 'bp-t', 0.9],
      ['M688 146 L702 192', 'bp-t', 2.2],
      ['M696 168 L560 192 L478 262 M700 190 L612 232 M560 192 L360 176 M478 262 L382 190', 'bp-t', 0.8],
      ['M560 190 Q590 146 650 142 L690 156 L684 196 L612 206 Z'],
      ['M640 196 L700 198 L690 240 L628 232 Z', 'bp-t', 0.8],
      ['M566 188 L480 180 L430 170 L360 158 L352 170 L432 186 L480 194 L562 202 Z'],
      ['M360 158 L300 150 L296 164 L352 170', 'bp-t', 0.8],
      ['M190 250 Q255 196 318 244 M690 232 Q745 206 800 236', 'bp-x', 0.8],
      ['M694 176 L752 300 M708 170 L766 294', 'bp-t', 1.1],
      ['M690 146 L668 124 L630 116 L612 114 M668 124 L660 96 L676 90', 'bp-t', 0.9],
      ['M706 150 L742 144 L748 180 L714 186 Z', 'bp-a'],
      ['M298 150 L284 148 L284 162 L296 164 Z', 'bp-a'],
      ['M680 130 L700 126 L702 138 L682 142 Z', 'bp-a', 0.8],
      ['M486 300 L512 300', 'bp-t', 1.4],
      ['M231 300H279M255 276V324M721 300H769M745 276V324', 'bp-x', 0.6],
    ], sw);
    s += `<path d="M746 162 L850 118 L850 226 L746 182 Z" class="bp-haz"/>`;
    s += rueda(255, 300, 86, sw, 21, { rin: 0.74, rayos: 5 }) + rueda(745, 300, 86, sw, 21, { rin: 0.74, rayos: 5, disco: 0.44 });
    if (globos) s += globosSVG(globos, sw);
    return envolver(vb.join(' '), ancho, s, { dibujar, retraso, etiqueta: 'Dibujo técnico de la moto' });
  }

  /** Globos numerados: [{ x, y, bx, by, n, t }] punto → globo con número y texto. */
  function globosSVG(globos, sw) {
    return globos.map((g, k) => {
      const r = 20;
      const lado = g.bx < g.x ? 'end' : 'start';
      const tx = lado === 'end' ? g.bx - r - 10 : g.bx + r + 10;
      return `<g style="--i:${30 + k}">`
        + `<path d="M${g.x} ${g.y}L${g.bx} ${g.by}" pathLength="1" class="bp-x" stroke-width="${f(sw * 0.7)}" style="--i:${30 + k}"/>`
        + `<rect x="${g.x - 5}" y="${g.y - 5}" width="10" height="10" class="bp-a bp-fade" stroke-width="${f(sw * 0.8)}" style="stroke-dasharray:none;animation:none"/>`
        + `<circle cx="${g.bx}" cy="${g.by}" r="${r}" pathLength="1" class="bp-a" stroke-width="${f(sw * 0.9)}" style="--i:${30 + k}"/>`
        + `<text x="${g.bx}" y="${g.by + 7}" text-anchor="middle" class="bp-txa" style="font-family:var(--f-display);font-weight:400;font-size:22px;letter-spacing:0">${String(g.n).padStart(2, '0')}</text>`
        + (g.t ? `<text x="${tx}" y="${g.by + 6}" text-anchor="${lado}" class="bp-tx1" style="font-size:17px">${g.t}</text>` : '')
        + `</g>`;
    }).join('');
  }

  /** Planta de un lavadero: bahías vistas desde arriba; las ocupadas llevan un carro. */
  function bahias({ n = 3, ocupadas = [], ancho = 230, dibujar = false, etiquetas = true } = {}) {
    const W = 300, H = 150;
    const sw = 1.3 / (ancho / W);
    const x0 = 14, x1 = 286, y0 = 16, y1 = 116;
    const bw = (x1 - x0) / n;
    let lista = [['M' + x0 + ' ' + y0 + 'H' + x1, 'bp-t', 1.4]];
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

  /** Dibujo según el tipo y la carrocería; usa los dibujos extra (js/blueprint-mas.js) si existen. */
  function vehiculo(v, o) {
    if (v.tipo === 'moto') return moto(o);
    const c = (v.carroceria || '').toLowerCase();
    if (/hatch/.test(c) && DRS.bp.hatch) return DRS.bp.hatch(o);
    if (/(suv|camioneta)/.test(c) && DRS.bp.suv) return DRS.bp.suv(o);
    if (/(pick|platón|platon)/.test(c) && DRS.bp.pickup) return DRS.bp.pickup(o);
    return carro(o);
  }
  DRS.bp = Object.assign(DRS.bp || {}, { carro, moto, bahias, tacometro, qr, vehiculo });
})();
