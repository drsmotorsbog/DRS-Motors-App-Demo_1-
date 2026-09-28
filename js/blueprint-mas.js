/* DRS Motors · demo — más dibujos blueprint: camioneta (SUV), hatchback, pickup y vistas frontal y de planta
   Misma especificación y motor que DRS.bp.carro (js/blueprint.js, DRS.bp.perfil): silueta de un
   trazo (Platino), detalles en orden de pluma (Plata), construcción (Humo), vidrios y luces (azul
   gráfico), ruedas con radios, haz, flap y cotas. Las ruedas de las camionetas son más grandes.
   API:
     DRS.bp.suv / hatch / pickup(o)             perfil, como DRS.bp.carro (mismas opciones)
     DRS.bp.frente({ ..., alto })                frente genérico (alto: SUV y pickup)
     DRS.bp.frenteMoto(o)                        frente de moto
     DRS.bp.planta({ ..., caja })                planta genérica (caja: pickup)
     DRS.bp.porForma(forma, o)                   forma: 'sedan' | 'hatch' | 'suv' | 'pickup' | 'moto'
     DRS.bp.vista(forma, cual, o)                cual: 'perfil' | 'frente' | 'planta'
   La línea de eje discontinua es la clase bp-eje (css/vehiculos.css). */
(function () {
  'use strict';
  const DRS = window.DRS;
  const bp = DRS.bp;
  const PINZA = 'M-14 -34 L-28 -22 L-36 -4';

  /** Camioneta SUV de perfil (mira a la derecha). Ruedas en 250 y 755 (r 68). */
  const SUV = {
    etiqueta: 'Dibujo técnico de la camioneta',
    vb: [40, 84, 920, 326], suelo: 386,
    ruedas: [[250, 316, 68, { disco: 0.5, pinza: PINZA }], [755, 316, 68, { disco: 0.5, pinza: PINZA }]],
    frente: [755, 316],
    sil: 'M100 354 L82 334 Q76 302 80 266 L88 226 C94 190 104 152 128 124 Q136 108 160 106 L536 100 Q572 100 592 114 C630 146 660 180 678 194 L864 210 Q900 214 908 230 C918 252 922 290 920 316 Q920 340 914 348 L898 358 L880 360 L838 358 L830 352 A82 82 0 1 0 680 352 L326 352 A82 82 0 1 0 174 352 L100 354 Z',
    det: [
      ['M172 98 L524 92 M188 98 V106 M508 92 V100', 's', 0.9],                              // barras del techo
      ['M114 214 C120 176 138 132 168 118 L528 112 C562 116 600 146 642 190 L652 214 Z', 's', 0.9],   // marco de vidrios
      ['M462 214 L458 116', 's', 1.1],                                                        // pilar B
      ['M322 214 L318 118', 's', 1.1],                                                        // pilar C
      ['M672 216 L666 350', 's', 0.9],                                                        // corte puerta delantera
      ['M462 216 L458 350', 's', 0.9],                                                        // corte entre puertas
      ['M318 216 L322 270', 's', 0.9],                                                        // corte puerta trasera
      ['M600 240 L640 238 L640 250 L600 252 Z', 's', 0.8],                                    // manijas
      ['M400 242 L440 240 L440 252 L400 254 Z', 's', 0.8],
      ['M104 334 L168 333 M334 332 L674 331 M838 330 L902 330', 's', 0.8],                    // moldura inferior (entre pasos de rueda)
      ['M338 342 L666 342', 's', 0.7],                                                        // estribo
      ['M684 200 L716 196 L718 216 L688 218 Z', 's', 0.9],                                    // espejo
      ['M212 254 L238 252 L238 276 L212 278 Z', 's', 0.7],                                    // tapa de combustible
      ['M910 312 L880 314 L880 346 L906 346', 's', 0.8],                                      // toma de aire
      ['M84 322 L112 320 L112 332 L84 334 Z', 's', 0.7],                                      // reflector
      ['M170 280 A92 92 0 0 1 330 280', 'x', 0.6],                                            // rebordes de los pasos de rueda
      ['M675 280 A92 92 0 0 1 835 280', 'x', 0.6],
    ],
    vidrios: ['M124 208 C130 176 146 140 172 126 L312 122 L316 208 Z', 'M330 208 L326 122 L452 120 L456 208 Z', 'M470 208 L466 120 L526 118 C558 122 592 150 636 200 L638 208 Z'],
    luces: ['M906 232 L852 240 L856 266 L920 268 Z', 'M92 236 L128 230 L126 276 L84 280 Z'],
    haz: 'M912 236 L1000 200 L1000 300 L920 270 Z', hazOrigen: [912, 252],
    flap: 'M116 124 L160 107',
    cotas: { ejes: [250, 755], largo: [[80, 266], [920, 316]] },
  };

  /** Hatchback de perfil (mira a la derecha). Ruedas en 270 y 730 (r 62), más corto que el sedán. */
  const HATCH = {
    etiqueta: 'Dibujo técnico del hatchback',
    vb: [40, 84, 920, 326], suelo: 386,
    ruedas: [[270, 322, 62, { disco: 0.5, pinza: 'M-12 -30 L-24 -20 L-32 -4' }], [730, 322, 62, { disco: 0.5, pinza: 'M-12 -30 L-24 -20 L-32 -4' }]],
    frente: [730, 322],
    sil: 'M180 352 L156 330 Q148 300 152 262 L162 214 C170 170 186 138 216 128 Q380 114 520 118 C570 126 620 158 654 190 L830 214 Q862 218 866 226 C878 240 882 272 882 302 Q882 334 876 344 L862 356 L846 358 L808 356 L802 350 A78 78 0 1 0 658 350 L342 350 A78 78 0 1 0 198 350 L180 352 Z',
    det: [
      ['M232 224 C244 178 268 146 312 136 Q420 128 512 131 C556 138 598 166 624 208 L626 224 Z', 's', 0.9],   // marco de vidrios
      ['M446 224 L444 130', 's', 1.1],                                                        // pilar B
      ['M330 224 L326 140', 's', 0.8],                                                        // pilar C
      ['M628 226 L622 348', 's', 0.9],                                                        // corte puerta delantera
      ['M448 226 L444 348', 's', 0.9],                                                        // corte entre puertas
      ['M318 226 L322 266', 's', 0.9],                                                        // corte puerta trasera
      ['M566 246 L602 244 L602 254 L566 256 Z', 's', 0.8],                                    // manijas
      ['M386 248 L422 246 L422 256 L386 258 Z', 's', 0.8],
      ['M202 240 Q480 232 828 236', 's', 0.7],                                                // línea de cintura (sobre los pasos de rueda)
      ['M356 338 L624 338', 's', 0.7],                                                        // estribo
      ['M656 202 L686 198 L688 216 L660 218 Z', 's', 0.9],                                    // espejo
      ['M224 262 L246 260 L246 282 L224 284 Z', 's', 0.7],                                    // tapa de combustible
      ['M870 310 L846 312 L846 344 L868 344', 's', 0.8],                                      // toma de aire
      ['M156 322 L184 320 L184 332 L156 334 Z', 's', 0.7],                                    // reflector
      ['M196 288 A86 86 0 0 1 344 288', 'x', 0.6],                                            // rebordes de los pasos de rueda
      ['M656 288 A86 86 0 0 1 804 288', 'x', 0.6],
    ],
    vidrios: ['M242 218 C254 180 278 152 316 142 L436 138 L440 218 Z', 'M454 218 L452 138 L512 137 C552 142 592 170 616 208 L616 218 Z'],
    luces: ['M864 232 L812 240 L816 268 L880 270 Z', 'M156 236 L196 232 L196 272 L152 270 Z'],
    haz: 'M868 234 L968 202 L968 302 L880 272 Z', hazOrigen: [868, 252],
    flap: 'M170 136 L222 126',
    cotas: { ejes: [270, 730], largo: [[152, 262], [882, 302]] },
  };

  /** Pickup doble cabina de perfil (mira a la derecha). Ruedas en 250 y 812 (r 68). */
  const PICKUP = {
    etiqueta: 'Dibujo técnico de la pickup',
    vb: [40, 84, 920, 326], suelo: 386,
    ruedas: [[250, 316, 68, { disco: 0.5, pinza: PINZA }], [812, 316, 68, { disco: 0.5, pinza: PINZA }]],
    frente: [812, 316],
    sil: 'M60 352 L48 330 L46 214 L56 206 L404 206 L406 116 Q408 100 428 100 L596 98 Q614 98 622 110 L664 184 L912 188 Q934 190 938 204 L944 262 L952 266 L954 316 Q954 340 948 348 L934 358 L912 360 L890 358 L884 352 A82 82 0 1 0 740 352 L322 352 A82 82 0 1 0 178 352 L60 352 Z',
    det: [
      ['M56 214 L396 214', 's', 0.8],                                                         // riel del platón
      ['M404 206 L402 350', 's', 0.9],                                                        // costura cabina-platón
      ['M416 178 L416 118 L502 116 L504 178 Z', 's', 0.9],                                    // marcos de vidrios
      ['M520 178 L518 116 L596 114 C610 120 640 160 648 178 Z', 's', 0.9],
      ['M516 186 L512 350', 's', 0.9],                                                        // corte entre puertas
      ['M662 190 L660 350', 's', 0.9],                                                        // corte puerta delantera
      ['M604 232 L642 230 L642 242 L604 244 Z', 's', 0.8],                                    // manijas
      ['M448 232 L486 230 L486 242 L448 244 Z', 's', 0.8],
      ['M668 194 L700 190 L702 210 L672 212 Z', 's', 0.9],                                    // espejo
      ['M440 92 L580 90 L580 96 L440 98 Z', 's', 0.7],                                        // barra del techo
      ['M420 340 L720 340 L720 350 L420 350 Z', 's', 0.8],                                    // estribo
      ['M166 320 A94 94 0 0 1 334 320 M728 320 A94 94 0 0 1 896 320', 't', 0.8],             // ensanchamientos
      ['M56 300 L396 300', 'x', 0.6],                                                         // línea del platón
      ['M672 198 L906 200', 's', 0.7],                                                        // filo del capó
    ],
    vidrios: ['M424 172 L424 124 L496 122 L498 172 Z', 'M528 172 L526 124 L592 122 C604 128 628 158 636 172 Z'],
    luces: ['M944 212 L928 214 L928 244 L946 246 Z', 'M50 222 L66 222 L66 262 L50 262 Z'],
    haz: 'M946 218 L1000 190 L1000 290 L950 250 Z', hazOrigen: [946, 234],
    flap: 'M46 214 L104 214',
    cotas: { ejes: [250, 812], largo: [[46, 214], [954, 316]] },
  };

  /** Vista frontal genérica. alto = true para camionetas y pickups. Misma línea de suelo que el perfil. */
  function frente({ alto = false, ...o } = {}) {
    const spec = alto ? {
      etiqueta: 'Vista frontal del vehículo', vb: [0, 84, 500, 326], suelo: 386, ruedas: [], frente: [250, 386],
      sil: 'M66 336 L56 240 Q58 186 98 180 L146 102 Q166 92 196 92 L304 92 Q334 92 354 102 L402 180 Q442 186 444 240 L434 336 Z',
      det: [
        ['M250 78V398', 'eje', 0.6],
        ['M58 240H134V386H58Z M366 240H442V386H366Z', 't', 1.2],
        ['M72 290H120M72 322H120M72 354H120M380 290H428M380 322H428M380 354H428', 'x', 0.7],
        ['M126 220 Q250 204 374 220 M98 180 Q250 160 402 180', 's', 0.7],
        ['M176 236H324V282H176Z', 's', 0.9], ['M176 251H324M176 266H324', 's', 0.6],
        ['M66 296 Q250 288 434 296 M146 318H354M146 336H354', 's', 0.7],
        ['M218 321H282V333H218Z', 's', 0.7], ['M150 84H350 M168 84V92 M332 84V92', 's', 0.8],
        ['M58 196 L26 202 L26 224 L58 220 Z M442 196 L474 202 L474 224 L442 220 Z', 's', 0.8],
      ],
      vidrios: ['M162 176 L194 106 L306 106 L338 176 Z'],
      luces: ['M74 236 L148 228 L150 254 L80 260 Z', 'M426 236 L352 228 L350 254 L420 260 Z'],
    } : {
      etiqueta: 'Vista frontal del vehículo', vb: [0, 84, 500, 326], suelo: 386, ruedas: [], frente: [250, 386],
      sil: 'M70 340 L60 250 Q62 200 100 196 L150 118 Q170 108 200 108 L300 108 Q330 108 350 118 L400 196 Q438 200 440 250 L430 340 Z',
      det: [
        ['M250 94V398', 'eje', 0.6],
        ['M62 254H132V386H62Z M368 254H438V386H368Z', 't', 1.2],
        ['M76 300H118M76 330H118M76 360H118M382 300H424M382 330H424M382 360H424', 'x', 0.7],
        ['M130 230 Q250 214 370 230 M100 196 Q250 176 400 196', 's', 0.7],
        ['M190 244H310V276H190Z', 's', 0.9], ['M190 255H310M190 266H310', 's', 0.6],
        ['M70 300 Q250 292 430 300 M150 322H350M150 340H350', 's', 0.7],
        ['M218 325H282V337H218Z', 's', 0.7],
        ['M62 208 L30 214 L30 236 L62 232 Z M438 208 L470 214 L470 236 L438 232 Z', 's', 0.8],
      ],
      vidrios: ['M165 190 L196 122 L304 122 L335 190 Z'],
      luces: ['M78 246 L150 238 L152 262 L84 268 Z', 'M422 246 L350 238 L348 262 L416 268 Z'],
    };
    return bp.perfil(spec, o);
  }

  /** Vista frontal de una moto naked. */
  function frenteMoto(o = {}) {
    return bp.perfil({
      etiqueta: 'Vista frontal de la moto', vb: [0, 84, 500, 326], suelo: 386, ruedas: [], frente: [250, 386],
      sil: 'M232 262H268V386H232Z',
      det: [
        ['M250 96V398', 'eje', 0.6],
        ['M238 292H262M238 322H262M238 352H262', 'x', 0.7],
        ['M178 232 L322 232 L312 302 L188 302 Z', 'x', 0.8],
        ['M226 250 L222 196 M274 250 L278 196', 's', 1.1], ['M224 250H276V262H224Z', 's', 0.8],
        ['M170 198 L214 178 M330 198 L286 178', 's', 0.8],
        ['M160 166 L340 166 M222 190 L232 168 M278 190 L268 168', 't', 1.1],
        ['M146 162H164V171H146Z M336 162H354V171H336Z', 's', 0.8],
        ['M176 166 L164 134 M324 166 L336 134', 's', 0.8],
        ['M160 318H196 M304 318H340', 's', 1],
        ['M144 120H182V134H144Z M318 120H356V134H318Z', 's', 0.8],
        ['M192 208 L208 208 M292 208 L308 208', 'a', 1.2],
      ],
      vidrios: [],
      luces: ['M220 182 L280 182 L288 204 L274 222 L226 222 L212 204 Z', 'M232 168 L268 168 L264 178 L236 178 Z'],
    }, o);
  }

  /** Planta (vista desde arriba, morro a la derecha). caja = true para pickups. */
  function planta({ caja = false, ...o } = {}) {
    const r = caja ? [250, 812] : [250, 750];
    const llanta = (cx) => `M${cx - 50} 24H${cx + 50}V72H${cx - 50}Z M${cx - 50} 368H${cx + 50}V416H${cx - 50}Z`;
    const cruz = (cx) => `M${cx - 24} 48H${cx + 24}M${cx} 24V72M${cx - 24} 392H${cx + 24}M${cx} 368V416`;
    const spec = caja ? {
      etiqueta: 'Vista en planta del vehículo', vb: [50, 10, 920, 420], suelo: 430, sinSuelo: true, ruedas: [], frente: [940, 220],
      sil: 'M110 64 L860 64 Q930 64 944 120 L950 220 L944 320 Q930 376 860 376 L110 376 Q90 376 90 356 L90 84 Q90 64 110 64 Z',
      det: [
        ['M60 220H980', 'eje', 0.6],
        [llanta(r[0]) + ' ' + llanta(r[1]), 't', 1.1],
        ['M104 84H396V356H104Z', 's', 0.9], ['M122 102H378V338H122Z', 'x', 0.7],
        ['M430 104H630V336H430Z', 's', 0.9],
        ['M700 120 Q820 116 930 150 M700 320 Q820 324 930 290 M690 220 H940', 's', 0.7],
        ['M640 64 L660 34 L700 34 L702 64 Z M640 376 L660 406 L700 406 L702 376 Z', 's', 0.8],
        [cruz(r[0]) + cruz(r[1]), 'x', 0.6],
      ],
      vidrios: ['M630 104 L690 130 L690 310 L630 336 Z', 'M430 104 L412 120 L412 320 L430 336 Z'],
      luces: ['M912 104 L944 140 L948 184 L912 166 Z', 'M912 336 L944 300 L948 256 L912 274 Z', 'M90 92 L106 92 L106 126 L90 126 Z', 'M90 348 L106 348 L106 314 L90 314 Z'],
    } : {
      etiqueta: 'Vista en planta del vehículo', vb: [50, 10, 920, 420], suelo: 430, sinSuelo: true, ruedas: [], frente: [940, 220],
      sil: 'M120 60 L820 60 Q900 60 940 120 L950 220 L940 320 Q900 380 820 380 L120 380 Q95 380 95 350 L95 90 Q95 60 120 60 Z',
      det: [
        ['M60 220H980', 'eje', 0.6],
        [llanta(r[0]) + ' ' + llanta(r[1]), 't', 1.1],
        ['M330 110 L560 110 L560 330 L330 330 Z', 's', 0.9],
        ['M660 130 Q800 120 900 160 M660 310 Q800 320 900 280 M650 220 H930', 's', 0.7],
        ['M250 140 Q180 130 130 150 M250 300 Q180 310 130 290', 's', 0.7],
        ['M600 60 L620 30 L660 30 L662 60 Z M600 380 L620 410 L660 410 L662 380 Z', 's', 0.8],
        [cruz(r[0]) + cruz(r[1]), 'x', 0.6],
      ],
      vidrios: ['M560 110 L640 140 L640 300 L560 330 Z', 'M330 110 L262 150 L262 290 L330 330 Z'],
      luces: ['M905 110 L945 150 L950 190 L905 170 Z', 'M905 330 L945 290 L950 250 L905 270 Z', 'M95 100 L150 96 L152 124 L96 126 Z', 'M95 340 L150 344 L152 316 L96 314 Z'],
    };
    return bp.perfil(spec, o);
  }

  const suv = (o = {}) => bp.perfil(SUV, o);
  const hatch = (o = {}) => bp.perfil(HATCH, o);
  const pickup = (o = {}) => bp.perfil(PICKUP, o);
  const PERFIL = { sedan: (o) => bp.carro(o), hatch, suv, pickup, moto: (o) => bp.moto(o) };

  /** Perfil según la forma de la carrocería. */
  function porForma(forma, o = {}) { return (PERFIL[forma] || PERFIL.sedan)(o); }

  /** Una vista cualquiera: perfil, frente o planta. */
  function vista(forma, cual, o = {}) {
    if (cual === 'frente') return forma === 'moto' ? frenteMoto(o) : frente({ ...o, alto: forma === 'suv' || forma === 'pickup' });
    if (cual === 'planta') return planta({ ...o, caja: forma === 'pickup' });
    return porForma(forma, o);
  }

  Object.assign(bp._spec, { suv: SUV, hatch: HATCH, pickup: PICKUP });
  Object.assign(bp, { suv, hatch, pickup, frente, frenteMoto, planta, porForma, vista });
})();
