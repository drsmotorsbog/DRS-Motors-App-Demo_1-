/* DRS Motors · demo — más dibujos blueprint: camioneta (SUV), hatchback, pickup y vistas frontal y de planta
   Misma API y estilo que DRS.bp.carro (js/blueprint.js): trazo Platino (bp-t), vidrios y luces en Azul Luz
   (bp-a), cruces de eje (bp-x), haz de luz (bp-haz), pathLength="1" y --i para dibujarse en orden
   (clase .bp-dibuja). Las ruedas son las del sedán (mismo dibujo; las camionetas, un poco más grandes).
   Los ayudantes de blueprint.js son privados: aquí van copiados (trazos, rayado, rueda, globos).
   API:
     DRS.bp.suv / hatch / pickup({ ancho, dibujar, retraso, globos })   perfil, como DRS.bp.carro
     DRS.bp.frente({ ancho, dibujar, retraso, alto })                    frente genérico (alto: SUV y pickup)
     DRS.bp.frenteMoto({ ancho, dibujar, retraso })                      frente de moto
     DRS.bp.planta({ ancho, dibujar, retraso, caja })                    planta genérica (caja: pickup)
     DRS.bp.porForma(forma, o)       forma: 'sedan' | 'hatch' | 'suv' | 'pickup' | 'moto'
     DRS.bp.vista(forma, cual, o)    cual: 'perfil' | 'frente' | 'planta'
   La línea de eje discontinua usa la clase bp-eje (css/servicios.css). */
(function () {
  'use strict';
  const DRS = window.DRS;
  let uid = 0;

  const f = (x) => Math.round(x * 10) / 10;
  function trazos(lista, sw) {
    // lista: [d, clase, grosor relativo]. bp-eje no lleva pathLength: su discontinuo es en unidades reales.
    return lista.map(([d, cls = 'bp-t', g = 1], i) => (cls === 'bp-eje'
      ? `<path d="${d}" class="bp-eje" stroke-width="${f(sw * g)}"/>`
      : `<path d="${d}" pathLength="1" class="${cls}" stroke-width="${f(sw * g)}" style="--i:${i}"/>`)).join('');
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
  function envolver(vb, contenido, { dibujar = true, retraso = 0, etiqueta = '' } = {}) {
    return `<svg class="bp${dibujar ? ' bp-dibuja' : ''}" viewBox="${vb}" style="--d0:${retraso}ms" role="img" aria-label="${etiqueta}">${contenido}</svg>`;
  }

  /** Perfil común: suelo rayado, trazos, haz, dos ruedas y globos opcionales. */
  function perfil(o, { lista, haz, ruedas, etiqueta }) {
    const { ancho = 330, dibujar = true, retraso = 0, globos = null } = o;
    const vb = globos ? [40, 22, 920, 388] : [40, 84, 920, 326];
    const sw = 1.5 / (ancho / vb[2]);
    const id = `bpm${++uid}`;
    let s = `<defs>${rayado(id, sw)}</defs>`;
    s += `<rect x="70" y="387" width="860" height="14" fill="url(#${id})" class="bp-fade"/>`;
    s += trazos(lista, sw);
    s += `<path d="${haz}" class="bp-haz"/>`;
    s += ruedas.map(([cx, cy, r]) => rueda(cx, cy, r, sw, lista.length)).join('');
    if (globos) s += globosSVG(globos, sw);
    return envolver(vb.join(' '), s, { dibujar, retraso, etiqueta });
  }

  /** Camioneta SUV de perfil (mira a la derecha). */
  function suv(o = {}) {
    return perfil(o, {
      etiqueta: 'Dibujo técnico de la camioneta',
      lista: [
        ['M40 386H960', 'bp-x', 0.8],
        ['M80 318 L80 262 L84 240 L92 222 L106 176 L130 120 Q140 104 166 104 L548 98 Q576 98 592 110 L668 190 Q780 198 878 212 Q914 220 920 248 L922 318'],
        ['M80 318 L172 318 A78 78 0 0 1 328 318 L677 318 A78 78 0 0 1 833 318 L922 318'],
        ['M92 238 L906 234', 'bp-t', 0.7],
        ['M466 194 L466 302 M654 200 L660 300 M322 192 L326 300', 'bp-t', 0.7],
        ['M336 308 L668 308', 'bp-t', 0.7],
        ['M672 204 Q780 212 882 226 M92 222 L160 218', 'bp-t', 0.7],
        ['M176 94 L540 88 M192 94 L192 103 M524 88 L524 97', 'bp-t', 0.8],
        ['M606 160 L632 158 L634 176 L610 178 Z', 'bp-t', 0.8],
        ['M500 240 L540 239 M352 242 L390 241', 'bp-t', 0.8],
        ['M922 294 L874 298 M80 294 L128 298', 'bp-t', 0.7],
        ['M578 114 L640 188 L474 188 L474 110 Z', 'bp-a'],
        ['M458 110 L458 188 L330 186 L330 108 Z', 'bp-a'],
        ['M314 108 L314 185 L150 178 L172 116 Z', 'bp-a'],
        ['M914 234 L862 224 L860 248 L916 254 Z', 'bp-a'],
        ['M84 214 L112 208 L108 234 L84 238 Z', 'bp-a'],
        ['M226 316H274M250 292V340M731 316H779M755 292V340', 'bp-x', 0.6],
      ],
      haz: 'M916 238 L1000 196 L1000 306 L916 258 Z',
      ruedas: [[250, 316, 68], [755, 316, 68]],
    });
  }

  /** Hatchback de perfil (mira a la derecha). Ruedas y altura del sedán, más corto. */
  function hatch(o = {}) {
    return perfil(o, {
      etiqueta: 'Dibujo técnico del hatchback',
      lista: [
        ['M40 386H960', 'bp-x', 0.8],
        ['M140 322 L140 264 L144 238 L154 218 L196 142 Q208 126 236 124 L494 120 Q522 120 540 136 L614 198 Q700 208 796 224 Q864 238 872 258 L875 322'],
        ['M140 322 L202 322 A68 68 0 0 1 338 322 L662 322 A68 68 0 0 1 798 322 L875 322'],
        ['M148 250 L850 248', 'bp-t', 0.7],
        ['M456 198 L456 304 M604 206 L608 302 M334 196 L338 302', 'bp-t', 0.7],
        ['M344 312 L654 312', 'bp-t', 0.7],
        ['M622 210 Q714 220 802 236 M154 228 L200 224', 'bp-t', 0.7],
        ['M204 130 L252 126', 'bp-t', 0.9],
        ['M584 178 L606 176 L608 190 L588 192 Z', 'bp-t', 0.8],
        ['M494 242 L530 241 M364 244 L396 243', 'bp-t', 0.8],
        ['M875 296 L832 300 M140 296 L182 300', 'bp-t', 0.7],
        ['M522 136 L590 194 L464 194 L464 134 Z', 'bp-a'],
        ['M448 134 L448 194 L342 192 L342 132 Z', 'bp-a'],
        ['M326 132 L326 192 L270 190 L300 134 Z', 'bp-a'],
        ['M868 252 L816 242 L814 266 L866 272 Z', 'bp-a'],
        ['M142 230 L172 224 L168 254 L141 256 Z', 'bp-a'],
        ['M246 322H294M270 298V346M706 322H754M730 298V346', 'bp-x', 0.6],
      ],
      haz: 'M870 250 L975 205 L975 318 L870 276 Z',
      ruedas: [[270, 322, 62], [730, 322, 62]],
    });
  }

  /** Pickup doble cabina de perfil (mira a la derecha). */
  function pickup(o = {}) {
    return perfil(o, {
      etiqueta: 'Dibujo técnico de la pickup',
      lista: [
        ['M40 386H960', 'bp-x', 0.8],
        ['M50 318 L50 206 L402 206 L404 118 Q406 102 424 102 L596 100 Q612 100 620 112 L664 184 L910 188 Q934 190 938 204 L944 262 L952 266 L952 318'],
        ['M50 318 L162 318 A88 88 0 0 1 338 318 L724 318 A88 88 0 0 1 900 318 L952 318'],
        ['M402 206 L402 306', 'bp-t', 0.8],
        ['M56 214 L396 214', 'bp-t', 0.7],
        ['M512 188 L512 304 M660 190 L664 302', 'bp-t', 0.7],
        ['M410 304 L720 304 L720 314 L410 314 Z', 'bp-t', 0.8],
        ['M668 198 L906 202', 'bp-t', 0.7],
        ['M154 318 A96 96 0 0 1 346 318 M716 318 A96 96 0 0 1 908 318', 'bp-t', 0.7],
        ['M440 94 L580 92 L580 98 L440 100 Z', 'bp-t', 0.7],
        ['M646 158 L672 156 L674 172 L650 174 Z', 'bp-t', 0.8],
        ['M540 228 L578 227 M432 228 L466 227', 'bp-t', 0.8],
        ['M952 286 L908 290 M50 294 L96 296', 'bp-t', 0.7],
        ['M50 304 L34 304 L34 312 L50 312', 'bp-x', 0.8],
        ['M604 116 L648 182 L520 182 L520 114 Z', 'bp-a'],
        ['M504 114 L504 182 L420 182 L420 118 Z', 'bp-a'],
        ['M944 206 L928 204 L926 230 L942 232 Z', 'bp-a'],
        ['M52 214 L66 214 L66 252 L52 252 Z', 'bp-a'],
        ['M226 316H274M250 292V340M788 316H836M812 292V340', 'bp-x', 0.6],
      ],
      haz: 'M942 212 L1000 182 L1000 282 L944 236 Z',
      ruedas: [[250, 316, 68], [812, 316, 68]],
    });
  }

  /** Vista frontal genérica. alto = true para camionetas y pickups. Misma línea de suelo que el perfil. */
  function frente({ ancho = 180, dibujar = true, retraso = 0, alto = false } = {}) {
    const vb = [0, 84, 500, 326];
    const sw = 1.5 / (ancho / vb[2]);
    const lista = alto ? [
      ['M10 386H490', 'bp-x', 0.8],
      ['M250 78V398', 'bp-eje', 0.6],
      ['M58 240H134V386H58Z M366 240H442V386H366Z', 'bp-t', 1.2],
      ['M72 290H120M72 322H120M72 354H120M380 290H428M380 322H428M380 354H428', 'bp-x', 0.7],
      ['M66 336 L56 240 Q58 186 98 180 L146 102 Q166 92 196 92 L304 92 Q334 92 354 102 L402 180 Q442 186 444 240 L434 336 Z'],
      ['M126 220 Q250 204 374 220 M98 180 Q250 160 402 180', 'bp-t', 0.7],
      ['M176 236H324V282H176Z', 'bp-t', 0.9],
      ['M176 251H324M176 266H324', 'bp-t', 0.6],
      ['M66 296 Q250 288 434 296 M146 318H354M146 336H354', 'bp-t', 0.7],
      ['M218 321H282V333H218Z', 'bp-t', 0.7],
      ['M150 84H350 M168 84V92 M332 84V92', 'bp-t', 0.8],
      ['M58 196 L26 202 L26 224 L58 220 Z M442 196 L474 202 L474 224 L442 220 Z', 'bp-t', 0.8],
      ['M162 176 L194 106 L306 106 L338 176 Z', 'bp-a'],
      ['M74 236 L148 228 L150 254 L80 260 Z M426 236 L352 228 L350 254 L420 260 Z', 'bp-a'],
    ] : [
      ['M10 386H490', 'bp-x', 0.8],
      ['M250 94V398', 'bp-eje', 0.6],
      ['M62 254H132V386H62Z M368 254H438V386H368Z', 'bp-t', 1.2],
      ['M76 300H118M76 330H118M76 360H118M382 300H424M382 330H424M382 360H424', 'bp-x', 0.7],
      ['M70 340 L60 250 Q62 200 100 196 L150 118 Q170 108 200 108 L300 108 Q330 108 350 118 L400 196 Q438 200 440 250 L430 340 Z'],
      ['M130 230 Q250 214 370 230 M100 196 Q250 176 400 196', 'bp-t', 0.7],
      ['M190 244H310V276H190Z', 'bp-t', 0.9],
      ['M190 255H310M190 266H310', 'bp-t', 0.6],
      ['M70 300 Q250 292 430 300 M150 322H350M150 340H350', 'bp-t', 0.7],
      ['M218 325H282V337H218Z', 'bp-t', 0.7],
      ['M62 208 L30 214 L30 236 L62 232 Z M438 208 L470 214 L470 236 L438 232 Z', 'bp-t', 0.8],
      ['M165 190 L196 122 L304 122 L335 190 Z', 'bp-a'],
      ['M78 246 L150 238 L152 262 L84 268 Z M422 246 L350 238 L348 262 L416 268 Z', 'bp-a'],
    ];
    return envolver(vb.join(' '), trazos(lista, sw), { dibujar, retraso, etiqueta: 'Vista frontal del vehículo' });
  }

  /** Vista frontal de una moto naked. */
  function frenteMoto({ ancho = 180, dibujar = true, retraso = 0 } = {}) {
    const vb = [0, 84, 500, 326];
    const sw = 1.5 / (ancho / vb[2]);
    const lista = [
      ['M10 386H490', 'bp-x', 0.8],
      ['M250 96V398', 'bp-eje', 0.6],
      ['M232 262H268V386H232Z', 'bp-t', 1.4],
      ['M238 292H262M238 322H262M238 352H262', 'bp-x', 0.7],
      ['M178 232 L322 232 L312 302 L188 302 Z', 'bp-x', 0.8],
      ['M226 250 L222 196 M274 250 L278 196', 'bp-t', 1.1],
      ['M224 250H276V262H224Z', 'bp-t', 0.8],
      ['M170 198 L214 178 M330 198 L286 178', 'bp-t', 0.8],
      ['M160 166 L340 166 M222 190 L232 168 M278 190 L268 168', 'bp-t', 1.1],
      ['M146 162H164V171H146Z M336 162H354V171H336Z', 'bp-t', 0.8],
      ['M176 166 L164 134 M324 166 L336 134', 'bp-t', 0.8],
      ['M160 318H196 M304 318H340', 'bp-t', 1],
      ['M220 182 L280 182 L288 204 L274 222 L226 222 L212 204 Z', 'bp-a'],
      ['M232 168 L268 168 L264 178 L236 178 Z', 'bp-a', 0.8],
      ['M144 120H182V134H144Z M318 120H356V134H318Z', 'bp-a', 0.8],
      ['M192 208 L208 208 M292 208 L308 208', 'bp-a', 1.2],
    ];
    return envolver(vb.join(' '), trazos(lista, sw), { dibujar, retraso, etiqueta: 'Vista frontal de la moto' });
  }

  /** Planta (vista desde arriba, morro a la derecha). caja = true para pickups. */
  function planta({ ancho = 330, dibujar = true, retraso = 0, caja = false } = {}) {
    const vb = [50, 10, 920, 420];
    const sw = 1.5 / (ancho / vb[2]);
    const r = caja ? [250, 812] : [250, 750];
    const llanta = (cx) => `M${cx - 50} 24H${cx + 50}V72H${cx - 50}Z M${cx - 50} 368H${cx + 50}V416H${cx - 50}Z`;
    const cruz = (cx) => `M${cx - 24} 48H${cx + 24}M${cx} 24V72M${cx - 24} 392H${cx + 24}M${cx} 368V416`;
    const lista = caja ? [
      ['M60 220H980', 'bp-eje', 0.6],
      [llanta(r[0]) + ' ' + llanta(r[1]), 'bp-t', 1.1],
      ['M110 64 L860 64 Q930 64 944 120 L950 220 L944 320 Q930 376 860 376 L110 376 Q90 376 90 356 L90 84 Q90 64 110 64 Z'],
      ['M104 84H396V356H104Z', 'bp-t', 0.9],
      ['M122 102H378V338H122Z', 'bp-x', 0.7],
      ['M430 104H630V336H430Z', 'bp-t', 0.9],
      ['M700 120 Q820 116 930 150 M700 320 Q820 324 930 290 M690 220 H940', 'bp-t', 0.7],
      ['M640 64 L660 34 L700 34 L702 64 Z M640 376 L660 406 L700 406 L702 376 Z', 'bp-t', 0.8],
      ['M630 104 L690 130 L690 310 L630 336 Z', 'bp-a'],
      ['M430 104 L412 120 L412 320 L430 336 Z', 'bp-a'],
      ['M912 104 L944 140 L948 184 L912 166 Z M912 336 L944 300 L948 256 L912 274 Z', 'bp-a'],
      ['M90 92 L106 92 L106 126 L90 126 Z M90 348 L106 348 L106 314 L90 314 Z', 'bp-a'],
      [cruz(r[0]) + cruz(r[1]), 'bp-x', 0.6],
    ] : [
      ['M60 220H980', 'bp-eje', 0.6],
      [llanta(r[0]) + ' ' + llanta(r[1]), 'bp-t', 1.1],
      ['M120 60 L820 60 Q900 60 940 120 L950 220 L940 320 Q900 380 820 380 L120 380 Q95 380 95 350 L95 90 Q95 60 120 60 Z'],
      ['M330 110 L560 110 L560 330 L330 330 Z', 'bp-t', 0.9],
      ['M660 130 Q800 120 900 160 M660 310 Q800 320 900 280 M650 220 H930', 'bp-t', 0.7],
      ['M250 140 Q180 130 130 150 M250 300 Q180 310 130 290', 'bp-t', 0.7],
      ['M600 60 L620 30 L660 30 L662 60 Z M600 380 L620 410 L660 410 L662 380 Z', 'bp-t', 0.8],
      ['M560 110 L640 140 L640 300 L560 330 Z', 'bp-a'],
      ['M330 110 L262 150 L262 290 L330 330 Z', 'bp-a'],
      ['M905 110 L945 150 L950 190 L905 170 Z M905 330 L945 290 L950 250 L905 270 Z', 'bp-a'],
      ['M95 100 L150 96 L152 124 L96 126 Z M95 340 L150 344 L152 316 L96 314 Z', 'bp-a'],
      [cruz(r[0]) + cruz(r[1]), 'bp-x', 0.6],
    ];
    return envolver(vb.join(' '), trazos(lista, sw), { dibujar, retraso, etiqueta: 'Vista en planta del vehículo' });
  }

  const bp = DRS.bp;
  const PERFIL = { sedan: (o) => bp.carro(o), hatch, suv, pickup, moto: (o) => bp.moto(o) };

  /** Perfil según la forma de la carrocería. */
  function porForma(forma, o = {}) { return (PERFIL[forma] || PERFIL.sedan)(o); }

  /** Una vista cualquiera: perfil, frente o planta. */
  function vista(forma, cual, o = {}) {
    if (cual === 'frente') return forma === 'moto' ? frenteMoto(o) : frente({ ...o, alto: forma === 'suv' || forma === 'pickup' });
    if (cual === 'planta') return planta({ ...o, caja: forma === 'pickup' });
    return porForma(forma, o);
  }

  Object.assign(DRS.bp, { suv, hatch, pickup, frente, frenteMoto, planta, porForma, vista });
})();
