/* DRS Motors · demo — Informe vehicular (paso 6 del recorrido): placa → vista previa gratis → pago de
   $ 45.000 → informe completo con historial, estudio de mercado y recomendaciones generadas con IA.
   Rutas: 'informe' (entrada pública: DRS.tel.ir('informe')), 'informe-previa' { placa }, 'informe-ver' { placa }.
   Todo es FICTICIO: placas, dueños, entidades, aseguradoras, avisos y precios. La consulta es simulada.
   Placas de ejemplo: HTV382 (limpia), GUP615 (prenda vigente), NBQ84E (moto con siniestro); cualquier
   otra placa válida devuelve un resultado genérico. Estado: DRS.estado.informes (lo que ya se compró). */
(function () {
  'use strict';
  const DRS = window.DRS;
  const U = DRS.util;
  const UI = DRS.ui;
  const { html, crudo, ico, num, pesos, placaTxt } = U;

  const PRECIO = 45000;
  const MEDIO = { tarjeta: 'Tarjeta', pse: 'PSE', nequi: 'Nequi' };
  const GLIFO = { pos: 'check', warn: 'excl', neg: 'cerrar' };

  /* ---------------- utilidades ---------------- */
  const tope = () => DRS.tel.pila[DRS.tel.pila.length - 1];
  const entrada = (el) => DRS.tel.pila.find((x) => x.el === el);
  const horaAhora = () => { const a = DRS.reloj.ahora(); return U.deMin(a.getHours() * 60 + a.getMinutes()); };
  const normPlaca = (s) => String(s || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6);
  const esCarro = (p) => /^[A-Z]{3}\d{3}$/.test(p);
  const esMoto = (p) => /^[A-Z]{3}\d{2}[A-Z]$/.test(p);
  const mesTxt = ([y, m]) => `${U.MES3[m - 1]} ${y}`;
  const mesLargo = ([y, m]) => `${U.MESES[m - 1]} de ${y}`;
  const millones = (n) => num(Math.round(n / 1e5) / 10);
  const informes = () => DRS.estado.informes || [];
  const compra = (placa) => informes().find((i) => i.placa === placa);
  const cuando = (i) => (i.d === 0 ? `hoy, ${U.horaTxt(i.h)}` : i.d === -1 ? `ayer, ${U.horaTxt(i.h)}` : `el ${U.fechaCorta(DRS.reloj.dia(i.d))}`);
  /** Semáforo de un documento por días para vencer (mismo criterio que DRS.calc.doc). */
  function porDias(dias) {
    if (dias <= 0) return { estado: 'neg', etiqueta: 'Vencida' };
    if (dias <= 30) return { estado: 'warn', etiqueta: 'Por vencer' };
    return { estado: 'pos', etiqueta: 'Vigente' };
  }

  /* ---------------- datos de ejemplo (ficticios) ---------------- */
  const EJEMPLOS = {
    HTV382: {
      tipo: 'carro', forma: 'suv', marca: 'Mazda', linea: 'CX-5', version: 'Touring', modelo: 2020, color: 'Blanco',
      clase: 'Camioneta', carroceria: 'SUV', combustible: 'Gasolina', km: 62400, matricula: [2020, 3],
      propietarios: [{ desde: [2020, 3] }, { desde: [2023, 6] }],
      prendas: [{ entidad: 'Banco Aldea', desde: [2020, 3], hasta: [2023, 5] }],
      embargos: [], siniestros: [],
      soat: { vence: 167, aseguradora: 'Seguros Aldaba', huecos: {} },
      tecno: { vence: 171, primera: 2025, cda: 'CDA Andén 170' },
      mercado: { min: 84000000, max: 91000000, comps: [
        [2020, 48000, 92500000, 'Usaquén'], [2020, 71000, 84900000, 'Suba'], [2021, 39000, 99000000, 'Cedritos'],
        [2019, 66000, 81500000, 'Engativá'], [2020, 58500, 88000000, 'Fontibón'], [2019, 82000, 78000000, 'Kennedy'],
      ] },
      atencion: (d) => [
        'Historial limpio: sin prendas vigentes, embargos ni siniestros reportados.',
        `Tuvo una prenda con Banco Aldea que se levantó en ${mesLargo(d.prendas[0].hasta)}. Confirma que el certificado de tradición la muestre cancelada.`,
        `Con ${num(d.km)} km anda cerca del mantenimiento de los 60.000 km. Pide la factura; si no se hizo, tenlo en cuenta en el precio.`,
        `El precio justo está entre $ ${millones(d.mercado.min)} y $ ${millones(d.mercado.max)} millones. Si te piden más, pregunta qué lo justifica.`,
      ],
      preguntas: [
        '¿Tienes las facturas de los mantenimientos? ¿Dónde se hicieron?',
        '¿Ha tenido choques o arreglos de latonería y pintura, aunque no se hayan reportado al seguro?',
        '¿Por qué lo vendes y hace cuánto lo tienes?',
        '¿Me dejas llevarlo a una revisión con un perito antes de cerrar?',
      ],
    },
    GUP615: {
      tipo: 'carro', forma: 'hatch', marca: 'Renault', linea: 'Stepway', version: 'Intens', modelo: 2019, color: 'Gris',
      clase: 'Automóvil', carroceria: 'Hatchback', combustible: 'Gasolina', km: 71800, matricula: [2019, 5],
      propietarios: [{ desde: [2019, 5] }, { desde: [2021, 8] }, { desde: [2024, 4] }],
      prendas: [{ entidad: 'Financiera Alcor', desde: [2024, 4] }],
      embargos: [], siniestros: [],
      soat: { vence: 203, aseguradora: 'Seguros Aldaba', huecos: { 2022: 47 } },
      tecno: { vence: 238, primera: 2024, cda: 'CDA Andén 170' },
      mercado: { min: 41500000, max: 46500000, comps: [
        [2019, 64000, 45900000, 'Suba'], [2019, 88000, 40500000, 'Bosa'], [2020, 52000, 49500000, 'Usaquén'],
        [2018, 79000, 38900000, 'Kennedy'], [2019, 70500, 44500000, 'Engativá'], [2020, 61000, 47800000, 'Teusaquillo'],
      ] },
      atencion: (d) => [
        'Tiene una prenda vigente a favor de Financiera Alcor. No pagues nada hasta tener el paz y salvo del crédito y el levantamiento inscrito.',
        'Tres propietarios en siete años. No es grave, pero pide el historial de mantenimiento de cada uno.',
        'Estuvo 47 días sin SOAT en 2022. Pregunta por qué y si tuvo comparendos en ese tiempo.',
        `El precio justo está entre $ ${millones(d.mercado.min)} y $ ${millones(d.mercado.max)} millones.`,
      ],
      preguntas: [
        '¿Cuánto falta por pagar del crédito y quién hace el levantamiento de la prenda?',
        '¿Me entregas el paz y salvo de la financiera antes de firmar?',
        '¿Por qué estuvo sin SOAT en 2022?',
        '¿Tienes las facturas de mantenimiento de los dueños anteriores?',
      ],
    },
    NBQ84E: {
      tipo: 'moto', forma: 'moto', marca: 'Bajaj', linea: 'Pulsar NS 200', version: '', modelo: 2021, color: 'Negro',
      clase: 'Motocicleta', carroceria: 'Naked', combustible: 'Gasolina', km: 38600, matricula: [2021, 2],
      propietarios: [{ desde: [2021, 2] }, { desde: [2023, 1] }],
      prendas: [], embargos: [],
      siniestros: [{ fecha: [2023, 10], tipo: 'Reclamación al SOAT', detalle: 'Atención médica por lesiones leves' }],
      soat: { vence: 139, aseguradora: 'Seguros Aldaba', huecos: {} },
      tecno: { vence: 16, primera: 2023, cda: 'CDA Andén 170' },
      mercado: { min: 9200000, max: 10600000, comps: [
        [2021, 30000, 10500000, 'Kennedy'], [2021, 45000, 9400000, 'Bosa'], [2022, 22000, 11300000, 'Suba'],
        [2020, 41000, 8900000, 'Engativá'], [2021, 36000, 9900000, 'Fontibón'],
      ] },
      atencion: (d) => [
        `Hay una reclamación al SOAT de ${mesLargo(d.siniestros[0].fecha)} por un accidente con lesiones leves. Revisa el chasis, la tijera y las barras de la suspensión.`,
        `La tecnomecánica vence en ${d.tecno.vence} días: acuerda con el vendedor quién la renueva antes del traspaso.`,
        `Dos propietarios y ${num(d.km)} km: uso normal para una moto de ${d.modelo}.`,
        `El precio justo está entre $ ${millones(d.mercado.min)} y $ ${millones(d.mercado.max)} millones.`,
      ],
      preguntas: [
        '¿Qué le pasó en el accidente de 2023 y qué se le cambió?',
        '¿Tienes las facturas de los repuestos y del taller?',
        '¿Cuándo le cambiaste el kit de arrastre y las llantas?',
        '¿Me dejas probarla y revisarla con un mecánico de confianza?',
      ],
    },
  };

  /* Resultado genérico para cualquier otra placa válida: determinista a partir de la placa. */
  const CARROS = [
    { marca: 'Chevrolet', linea: 'Onix', version: 'LT', forma: 'hatch', clase: 'Automóvil', carroceria: 'Hatchback', base: 58e6 },
    { marca: 'Renault', linea: 'Logan', version: 'Life', forma: 'sedan', clase: 'Automóvil', carroceria: 'Sedán', base: 46e6 },
    { marca: 'Kia', linea: 'Sportage', version: 'LX', forma: 'suv', clase: 'Camioneta', carroceria: 'SUV', base: 86e6 },
    { marca: 'Toyota', linea: 'Hilux', version: '4x4', forma: 'pickup', clase: 'Camioneta', carroceria: 'Pickup', base: 150e6 },
    { marca: 'Nissan', linea: 'Versa', version: 'Advance', forma: 'sedan', clase: 'Automóvil', carroceria: 'Sedán', base: 62e6 },
    { marca: 'Suzuki', linea: 'Swift', version: 'GL', forma: 'hatch', clase: 'Automóvil', carroceria: 'Hatchback', base: 56e6 },
  ];
  const MOTOS = [
    { marca: 'AKT', linea: 'NKD 125', estilo: 'Street', base: 5.2e6 },
    { marca: 'Honda', linea: 'CB 190R', estilo: 'Naked', base: 9.6e6 },
    { marca: 'Suzuki', linea: 'Gixxer 150', estilo: 'Naked', base: 8e6 },
    { marca: 'Yamaha', linea: 'XTZ 150', estilo: 'Doble propósito', base: 10.2e6 },
  ];
  const COLORES = ['Blanco', 'Gris', 'Negro', 'Plata', 'Rojo', 'Azul'];
  const ZONAS = ['Suba', 'Kennedy', 'Usaquén', 'Engativá', 'Fontibón', 'Chapinero', 'Bosa'];

  function generico(placa) {
    let h = 2166136261;
    for (const c of placa) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); }
    const rnd = () => { h ^= h << 13; h ^= h >>> 17; h ^= h << 5; return ((h >>> 0) % 10000) / 10000; };
    const moto = esMoto(placa);
    const pool = moto ? MOTOS : CARROS;
    const b = pool[Math.floor(rnd() * pool.length)];
    const modelo = 2016 + Math.floor(rnd() * 7);
    const anos = Math.max(1, DRS.reloj.hoy().getFullYear() - modelo);
    const km = Math.round((anos * (moto ? 8200 : 11500) * (0.8 + rnd() * 0.4)) / 100) * 100;
    const medio = Math.round((b.base * Math.pow(0.93, 2022 - modelo) * (0.97 + rnd() * 0.06)) / 1e5) * 1e5;
    const ancho = Math.round((medio * 0.08) / 1e5) * 1e5;
    const mes = 1 + Math.floor(rnd() * 12);
    const nProp = 1 + Math.floor(rnd() * 2);
    const propietarios = [{ desde: [modelo, mes] }];
    if (nProp > 1) propietarios.push({ desde: [modelo + Math.max(1, Math.floor(anos / 2)), 1 + Math.floor(rnd() * 12)] });
    const comps = Array.from({ length: 5 }, (_, i) => {
      const a = modelo + [0, 0, 1, -1, 0][i];
      const k = Math.max(3000, Math.round((km * (0.7 + rnd() * 0.6)) / 500) * 500);
      const pr = Math.round((medio * (1 + (a - modelo) * 0.07) * (1 - (k - km) / (km * 6)) * (0.97 + rnd() * 0.06)) / 1e5) * 1e5;
      return [a, k, pr, ZONAS[Math.floor(rnd() * ZONAS.length)]];
    });
    return {
      generico: true, tipo: moto ? 'moto' : 'carro', forma: moto ? 'moto' : b.forma, marca: b.marca, linea: b.linea, version: moto ? '' : b.version,
      modelo, color: COLORES[Math.floor(rnd() * COLORES.length)], clase: moto ? 'Motocicleta' : b.clase, carroceria: moto ? b.estilo : b.carroceria,
      combustible: 'Gasolina', km, matricula: [modelo, mes], propietarios, prendas: [], embargos: [], siniestros: [],
      soat: { vence: 40 + Math.floor(rnd() * 300), aseguradora: 'Seguros Aldaba', huecos: {} },
      tecno: { vence: 40 + Math.floor(rnd() * 300), primera: modelo + (moto ? 2 : 5), cda: 'CDA Andén 170' },
      mercado: { min: medio - ancho, max: medio + ancho, comps },
      atencion: (d) => [
        'Sin prendas, embargos ni siniestros en esta consulta de ejemplo.',
        `${d.propietarios.length === 1 ? 'Un solo propietario' : `${d.propietarios.length} propietarios`} desde ${mesTxt(d.matricula)}. Pide las facturas de mantenimiento.`,
        `El precio justo está entre $ ${millones(d.mercado.min)} y $ ${millones(d.mercado.max)} millones.`,
      ],
      preguntas: [
        '¿Tienes las facturas de los mantenimientos?',
        '¿Ha tenido choques o arreglos, aunque no se hayan reportado al seguro?',
        '¿Por qué lo vendes?',
        '¿Me dejas revisarlo con un mecánico de confianza antes de cerrar?',
      ],
    };
  }

  /** Datos completos de una placa, con los derivados que usan las pantallas. */
  const cache = {};
  function datos(placa) {
    if (cache[placa]) return cache[placa];
    const d = { placa, ...(EJEMPLOS[placa] || generico(placa)) };
    const hoy = DRS.reloj.hoy();
    d.anoHoy = hoy.getFullYear();
    d.lineaCompleta = [d.linea, d.version].filter(Boolean).join(' ');
    d.subtitulo = [d.version, d.modelo, d.color].filter(Boolean).join(' · ');
    d.prendaVigente = d.prendas.find((x) => !x.hasta) || null;
    d.soatEst = porDias(d.soat.vence);
    d.tecnoEst = porDias(d.tecno.vence);
    d.soatEst = { ...d.soatEst, etiqueta: d.soatEst.etiqueta === 'Vencida' ? 'Vencido' : d.soatEst.etiqueta };
    d.alertas = [];
    if (d.prendaVigente) d.alertas.push(`Prenda vigente con ${d.prendaVigente.entidad}`);
    d.embargos.forEach(() => d.alertas.push('Embargo registrado'));
    d.siniestros.forEach((s) => d.alertas.push(`Siniestro reportado en ${mesTxt(s.fecha)}`));
    if (d.soatEst.estado !== 'pos') d.alertas.push(d.soatEst.estado === 'neg' ? 'SOAT vencido' : 'SOAT por vencer');
    if (d.tecnoEst.estado !== 'pos') d.alertas.push(d.tecnoEst.estado === 'neg' ? 'Tecnomecánica vencida' : 'Tecnomecánica por vencer');
    // Eventos del historial, del más reciente al más antiguo
    const ev = [{ f: d.matricula, t: 'Matrícula inicial en Bogotá', s: `Propietario 1 · persona natural`, k: 'mat' }];
    d.propietarios.slice(1).forEach((o, i) => ev.push({ f: o.desde, t: `Traspaso al propietario ${i + 2}`, s: 'Persona natural · Bogotá', k: 'tras' }));
    d.prendas.forEach((x) => {
      ev.push({ f: x.desde, t: `Prenda inscrita · ${x.entidad}`, s: x.hasta ? 'Garantía de un crédito' : 'Garantía de un crédito · sigue vigente', k: 'prenda', est: x.hasta ? null : 'warn' });
      if (x.hasta) ev.push({ f: x.hasta, t: `Prenda levantada · ${x.entidad}`, s: 'Crédito pagado', k: 'levanta', est: 'pos' });
    });
    d.siniestros.forEach((s) => ev.push({ f: s.fecha, t: s.tipo, s: s.detalle, k: 'sin', est: 'warn' }));
    Object.keys(d.soat.huecos || {}).forEach((y) => ev.push({ f: [Number(y), 7], t: `${d.soat.huecos[y]} días sin SOAT`, s: 'Hueco en la cobertura', k: 'hueco', est: 'warn' }));
    d.eventos = ev.sort((a, b) => (b.f[0] * 12 + b.f[1]) - (a.f[0] * 12 + a.f[1]));
    d.textoAtencion = d.atencion(d);
    cache[placa] = d;
    return d;
  }
  DRS.en && DRS.en('reinicio', () => Object.keys(cache).forEach((k) => delete cache[k]));

  /* Informe ya comprado en la semilla, para que la lista no arranque vacía. */
  DRS.extenderSemilla((estado) => {
    estado.informes = estado.informes || [];
    if (!estado.informes.length) estado.informes.push({ id: 'INF-2291', placa: 'NBQ84E', d: -23, h: '20:14', ref: 'DRS-P318204', medio: 'Nequi', total: PRECIO });
    estado.pagos = estado.pagos || [];
    if (!estado.pagos.some((x) => x.rel === 'INF-2291')) estado.pagos.push({ id: 'p-inf-2291', d: -23, h: '20:14', concepto: 'Informe vehicular · NBQ 84E', ref: 'DRS-P318204', medio: 'Nequi', total: PRECIO, tipo: 'informe', rel: 'INF-2291' });
  });

  /* ================= 1 · Entrada: la placa ================= */
  const EJ = ['HTV382', 'GUP615', 'NBQ84E'];
  const TRAE = [
    ['Marca, línea, modelo y color', 1],
    ['Clase, servicio y estado del registro', 1],
    ['Propietarios y traspasos', 0],
    ['Prendas, embargos y limitaciones', 0],
    ['Siniestros reportados', 0],
    ['Historial de SOAT y tecnomecánica', 0],
    ['Estudio de mercado', 0],
    ['Recomendaciones generadas con IA', 0],
  ];

  function filaInforme(i) {
    const d = datos(i.placa);
    return html`<button class="fila" ${crudo(UI.irAttrs('informe-ver', { placa: i.placa }))}>
      <span class="fila-ico">${ico(d.tipo === 'moto' ? 'moto' : 'carro')}</span>
      <span><span class="t13" style="display:block">${d.marca} ${d.linea} · ${placaTxt(i.placa)}</span><span class="t11" style="display:block">Comprado ${cuando(i)} · ${pesos(i.total)} · ${i.medio}</span></span>
      ${ico('chevron')}
    </button>`;
  }

  DRS.pantallas.informe = {
    render(p) {
      const lista = informes();
      return html`${UI.cabDet('Informe vehicular')}<div class="cuerpo con-cta">
        <div class="titulo"><div class="ceja">Antes de comprar un usado</div><h1 class="d d-56">Informe vehicular</h1>
          <p class="t13">Escribe la placa. La vista previa es gratis y el informe completo cuesta ${pesos(PRECIO)}.</p></div>
        <div class="inf-placa-caja srv-rejilla">
          <label class="cap" for="inf-placa">Placa del vehículo</label>
          <input id="inf-placa" class="inf-placa" value="${p.placa ? placaTxt(p.placa) : ''}" maxlength="7" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABC 123" aria-describedby="inf-ayuda">
          <span class="inf-placa-flap" aria-hidden="true"></span>
          <span id="inf-ayuda" class="inf-ayuda t11">Carro: ABC 123 · Moto: ABC 12D</span>
        </div>
        <div class="inf-ejemplos"><span class="cap">Prueba con una placa de ejemplo</span>
          <div class="fichas">${EJ.map((x) => html`<button class="ficha" data-a="inf-ejemplo" data-placa="${x}">${placaTxt(x)}</button>`)}</div></div>
        <section class="bloque">${UI.bloqueCab('Qué trae', 'La vista previa te dice qué vehículo es. El informe completo, si te conviene.')}
          <div class="tarjeta inf-tabla" role="table" aria-label="Qué incluye la vista previa y qué incluye el informe completo">
            <div class="inf-fila inf-fila-cab" role="row"><span role="columnheader"></span><span class="cap" role="columnheader">Vista previa</span><span class="cap" role="columnheader">Completo</span></div>
            ${TRAE.map(([t, gratis]) => html`<div class="inf-fila" role="row"><span class="t13" role="cell">${t}</span>
              <span class="inf-c${gratis ? '' : ' inf-no'}" role="cell" aria-label="${gratis ? 'Incluido' : 'Bloqueado'}">${ico(gratis ? 'check' : 'prenda')}</span>
              <span class="inf-c" role="cell" aria-label="Incluido">${ico('check')}</span></div>`)}
            <div class="inf-fila inf-fila-pie" role="row"><span class="cap" role="cell">Precio</span><span class="d d-20" role="cell">Gratis</span><span class="d d-20 num" role="cell">${pesos(PRECIO)}</span></div>
          </div>
        </section>
        <section class="bloque">${UI.bloqueCab('Tus informes', lista.length ? 'Quedan guardados en tu cuenta.' : '')}
          ${lista.length ? html`<div class="lista">${lista.map(filaInforme)}</div>` : html`<p class="t13">Aún no has comprado informes. Los que compres quedan aquí.</p>`}
        </section>
        <p class="t11" style="margin-top:18px">Consulta simulada para la demo: placas, historiales y precios son de ejemplo.</p>
      </div>
      <div class="pie-cta"><button class="btn btn-acero" data-a="inf-consultar">${ico('peritaje')}Consultar placa</button><p class="t11">La vista previa es gratis.</p></div>`;
    },
    alMontar(el) { prepararPlaca(el); },
    alRefrescar(el) { prepararPlaca(el); },
  };

  function prepararPlaca(el) {
    const input = U.$('#inf-placa', el);
    const e = entrada(el);
    if (!input || !e) return;
    input.addEventListener('input', () => {
      const v = normPlaca(input.value);
      const txt = v.length > 3 && /^[A-Z]{3}/.test(v) ? `${v.slice(0, 3)} ${v.slice(3)}` : v;
      if (input.value !== txt) input.value = txt;
      e.p.placa = v;
      error(el, null);
    });
    input.addEventListener('keydown', (ev) => { if (ev.key === 'Enter') { ev.preventDefault(); consultar(); } });
  }

  function error(el, texto) {
    const ayuda = U.$('#inf-ayuda', el);
    const input = U.$('#inf-placa', el);
    if (!ayuda || !input) return;
    if (!texto) {
      if (!ayuda.classList.contains('inf-err')) return;
      ayuda.classList.remove('inf-err');
      ayuda.textContent = 'Carro: ABC 123 · Moto: ABC 12D';
      input.removeAttribute('aria-invalid');
      return;
    }
    ayuda.classList.add('inf-err');
    ayuda.innerHTML = String(html`${ico('excl')}<span>${texto}</span>`);
    input.setAttribute('aria-invalid', 'true');
    input.focus();
  }

  function consultar() {
    const e = tope();
    if (!e || e.ruta !== 'informe') return;
    const input = U.$('#inf-placa', e.el);
    const placa = normPlaca(input ? input.value : e.p.placa);
    if (!placa) return error(e.el, 'Escribe la placa del vehículo.');
    if (!esCarro(placa) && !esMoto(placa)) return error(e.el, 'Revisa la placa: carro ABC 123, moto ABC 12D.');
    e.p.placa = placa;
    DRS.tel.ir('informe-previa', { placa });
  }

  /** Toca una placa de ejemplo: se escribe sola y consulta. */
  async function ejemplo(placa) {
    const e = tope();
    const input = e && U.$('#inf-placa', e.el);
    if (!input || input.dataset.escribiendo) return;
    input.dataset.escribiendo = '1';
    error(e.el, null);
    input.value = '';
    for (const ch of placaTxt(placa)) { input.value += ch; await U.espera(55); }
    e.p.placa = placa;
    delete input.dataset.escribiendo;
    await U.espera(260);
    if (tope() === e) consultar();
  }

  /* ================= 2 · Vista previa gratis ================= */
  const BLOQUEADOS = [
    ['Propietarios y traspasos', 'Línea de tiempo de cada dueño', [92, 64]],
    ['Prendas, embargos y limitaciones', 'Qué pesa sobre el vehículo', [80, 52]],
    ['Siniestros reportados', 'Reclamaciones a aseguradoras', [70]],
    ['SOAT y tecnomecánica', 'Historial año por año', [88, 60]],
    ['Estudio de mercado', 'Rango de precio y similares en venta', 'graf'],
    ['Recomendaciones generadas con IA', 'Qué revisar y qué preguntarle al vendedor', [96, 84, 58]],
  ];
  const PASOS_SCAN = ['Placa encontrada', 'Leyendo el registro del vehículo', 'Cruzando historial y precios'];
  const dibujo = (d, o) => crudo(DRS.bp.porForma(d.forma, o));

  function previa(d, rev) {
    const filas = [
      ['Marca', d.marca], ['Línea', d.lineaCompleta],
      ['Modelo', d.modelo], ['Color', d.color],
      ['Clase', `${d.clase} · ${d.carroceria}`], ['Servicio', 'Particular'],
      ['Combustible', d.combustible], ['Placa', placaTxt(d.placa)],
    ];
    const n = d.alertas.length;
    return html`<div class="${rev}">
      <div class="cajetin">${filas.map(([k, v]) => html`<div><span class="cap">${k}</span><b>${v}</b></div>`)}
        <div class="ancho"><span class="cap">Estado del registro</span><span class="inf-reg">${UI.chipEstado('pos', 'Activo')}<span class="t11">Matriculado en ${mesTxt(d.matricula)} · Bogotá</span></span></div></div>
      <section class="bloque">${UI.bloqueCab('Estado general', n ? 'Encontramos algo que conviene revisar.' : 'Nada grave a la vista.')}
        <div class="tarjeta inf-hallazgos">
          <div><span class="d d-44 num">${d.eventos.length}</span><span class="cap">Registros en el historial</span></div>
          <div><span class="d d-44 num">${n}</span><span class="cap">${n === 1 ? 'Alerta' : 'Alertas'}</span>${n ? UI.chipEstado('warn', 'Por revisar') : UI.chipEstado('pos', 'Ninguna')}</div>
          <div><span class="d d-44 num">${d.mercado.comps.length}</span><span class="cap">Similares en venta</span></div>
        </div>
      </section>
      <section class="bloque">${UI.bloqueCab('En el informe completo', `Se desbloquea con un pago único de ${pesos(PRECIO)}.`)}
        <div class="tarjeta inf-bloqueos">${BLOQUEADOS.map(([t, s, barras]) => html`<div class="inf-bloq">
          <span class="inf-bloq-ico" aria-label="Bloqueado">${ico('prenda')}</span>
          <span><span class="t13 t-1" style="display:block">${t}</span><span class="t11" style="display:block">${s}</span></span>
          ${barras === 'graf'
    ? html`<span class="inf-bloq-graf" aria-hidden="true"><i class="trama"></i><i class="trama"></i><i class="trama"></i><i class="trama"></i><i class="trama"></i><i class="trama"></i><i class="trama"></i></span>`
    : html`<span class="inf-bloq-barras" aria-hidden="true">${barras.map((w) => html`<i class="trama" style="width:${w}%"></i>`)}</span>`}
        </div>`)}</div>
      </section>
    </div>`;
  }

  function escaneando(p) {
    const k = p.pasoScan || 0;
    return html`<ol class="proceso inf-proceso" aria-live="polite">${PASOS_SCAN.map((t, i) => html`<li class="${i < k ? 'hecho' : i === k ? 'actual' : ''}"><i>${i < k ? ico('check') : ''}</i><span>${t}</span></li>`)}</ol>`;
  }

  DRS.pantallas['informe-previa'] = {
    render(p, ctx) {
      const d = datos(p.placa);
      const listo = !!p.listo;
      const ya = !!compra(p.placa);
      const rev = p.revelar ? 'inf-revela' : '';
      return html`${UI.cabDet(listo ? 'Vista previa' : 'Consultando')}<div class="cuerpo con-cta">
        <div class="titulo">
          <div class="ceja">${listo ? 'Vista previa gratis' : 'Consultando'} · ${placaTxt(p.placa)}</div>
          ${listo
    ? html`<h1 class="d d-44 ${rev}">${d.marca} ${d.linea}</h1><p class="t13 ${rev}">${d.subtitulo}${d.generico ? ' · resultado de ejemplo' : ''}</p>`
    : html`<h1 class="d d-44">${placaTxt(p.placa)}</h1><p class="t13">Buscando el vehículo en el registro. Consulta simulada.</p>`}
        </div>
        <div class="plano inf-plano">
          ${dibujo(d, { ancho: 380, dibujar: ctx.anim })}
          ${listo ? '' : html`<span class="escaneo" aria-hidden="true"></span>`}
          <span class="inf-plano-placa">${placaTxt(p.placa)}</span>
          <span class="cap inf-plano-fuente">${listo ? `Consulta simulada · ${U.horaTxt(p.hora || horaAhora())}` : 'Escaneando…'}</span>
        </div>
        ${listo ? previa(d, rev) : escaneando(p)}
      </div>
      <div class="pie-cta">
        <button class="btn btn-acero" data-a="inf-comprar" data-placa="${p.placa}" ${crudo(listo ? '' : 'disabled')}>${ya ? 'Ver informe completo' : `Ver informe completo · ${pesos(PRECIO)}`}</button>
        <p class="t11">${ya ? 'Ya lo compraste: está guardado en tu cuenta.' : 'Pago único. El informe queda guardado en tu cuenta.'}</p>
      </div>`;
    },
    alMontar(el, p) { if (!p.listo) escanear(p); },
    alRefrescar(el, p) { p.revelar = false; },
  };

  /** Consulta simulada de ~1,5 s: tres pasos y luego se revela la vista previa. */
  function escanear(p) {
    const sigue = () => { const x = tope(); return x && x.p === p ? x : null; };
    const paso = (k) => {
      p.pasoScan = k;
      const x = sigue();
      if (!x) return;
      U.$$('.inf-proceso li', x.el).forEach((li, i) => {
        li.className = i < k ? 'hecho' : i === k ? 'actual' : '';
        const c = li.querySelector('i');
        if (c) c.innerHTML = i < k ? String(ico('check')) : '';
      });
    };
    setTimeout(() => paso(1), 480);
    setTimeout(() => paso(2), 980);
    setTimeout(() => { p.listo = true; p.revelar = true; p.hora = horaAhora(); if (sigue()) DRS.tel.refrescar(); }, 1500);
  }

  function comprar(placa) {
    if (compra(placa)) return DRS.tel.ir('informe-ver', { placa });
    DRS.pago.abrir({
      titulo: 'Pagar informe',
      concepto: `Informe vehicular · ${placaTxt(placa).replace(' ', '\u00a0')}`,
      lineas: [['Informe vehicular completo', PRECIO]],
      total: PRECIO,
      pasos: ['Consultando fuentes del vehículo'],
      alPagar: (medio, ref) => {
        DRS.cambiar((s) => {
          s.informes = s.informes || [];
          const id = `INF-${String(Date.now()).slice(-4)}`;
          s.informes.unshift({ id, placa, d: 0, h: horaAhora(), ref, medio: MEDIO[medio] || medio, total: PRECIO });
          (s.pagos = s.pagos || []).unshift({ id: `p${Date.now()}`, d: 0, h: horaAhora(), concepto: `Informe vehicular · ${placaTxt(placa)}`, ref, medio: MEDIO[medio] || medio, total: PRECIO, tipo: 'informe', rel: id });
        }, { tipo: 'informe', placa });
        DRS.tel.ir('informe-ver', { placa, nuevo: true });
        setTimeout(() => DRS.tel.tostada('Informe desbloqueado · quedó guardado en tu cuenta'), 400);
      },
    });
  }

  /* ================= 3 · Informe completo ================= */
  const f1 = (x) => Math.round(x * 10) / 10;
  const tm = ([y, m]) => y + (m - 1) / 12;
  const SER = ['var(--ser-1)', 'var(--ser-3)', 'var(--ser-4)', 'var(--ser-2)'];
  let gid = 0;
  const minus = (t, i) => (i ? t[0].toLowerCase() + t.slice(1) : t);

  function banda(d) {
    const n = d.alertas.length;
    if (!n) return html`<div class="banda est-pos inf-banda"><span class="pyp-glifo">${ico('check')}</span><div><div class="d d-34" style="color:inherit">Sin alertas graves</div><div class="t13">Sin prendas vigentes, embargos ni siniestros reportados.</div></div></div>`;
    return html`<div class="banda est-warn inf-banda"><span class="pyp-glifo">${ico('excl')}</span><div><div class="d d-34" style="color:inherit">${n === 1 ? '1 alerta' : `${n} alertas`} por revisar</div><div class="t13">${UI.listaY(d.alertas.map(minus))}.</div></div></div>`;
  }

  function tiles(d) {
    const pv = d.prendas.filter((x) => !x.hasta).length;
    const lev = d.prendas.length - pv;
    const n = d.propietarios.length;
    const items = [
      { t: 'Propietarios', v: n, s: `${n - 1} ${n - 1 === 1 ? 'traspaso' : 'traspasos'}`, e: null },
      { t: 'Prendas vigentes', v: pv, s: lev ? `${lev} levantada` : 'Sin otras registradas', e: pv ? ['warn', 'Revisar'] : ['pos', 'Libre'] },
      { t: 'Embargos', v: d.embargos.length, s: 'Registrados', e: d.embargos.length ? ['neg', 'Embargado'] : ['pos', 'Ninguno'] },
      { t: 'Siniestros', v: d.siniestros.length, s: 'Reportados', e: d.siniestros.length ? ['warn', 'Revisar'] : ['pos', 'Ninguno'] },
    ];
    return html`<div class="inf-tiles">${items.map((it) => html`<div class="tarjeta inf-tile"><span class="etq">${it.t}</span><span class="d d-44 num">${it.v}</span><span class="t11">${it.s}</span>
      ${it.e ? UI.chipEstado(it.e[0], it.e[1]) : html`<span class="inf-duenos" aria-hidden="true">${d.propietarios.map((_, i) => html`<i style="background:${crudo(SER[(n - 1 - i) % 4])}"></i>`)}</span>`}</div>`)}</div>`;
  }

  const advertencia = () => html`<div class="inf-advertencia" role="note">${ico('alerta')}<div><b>Informe orientativo</b><p>No reemplaza la revisión física del vehículo ni los certificados oficiales. Antes de pagar, revísalo con un perito y pide el certificado de tradición.</p></div></div>`;

  /** Línea de tiempo en SVG: dueños (barras por serie), traspasos, prendas (trama) y siniestros. */
  function lineaTiempo(d) {
    const hoy = DRS.reloj.hoy();
    const tHoy = hoy.getFullYear() + hoy.getMonth() / 12 + (hoy.getDate() - 1) / 365;
    const t0 = d.matricula[0];
    const t1 = tHoy + 0.35;
    const X0 = 78, X1 = 322;
    const x = (t) => f1(X0 + ((t - t0) / (t1 - t0)) * (X1 - X0));
    const n = d.propietarios.length;
    const id = `inftl${++gid}`;
    let s = `<defs><pattern id="${id}w" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)"><path d="M0 0V5" class="tl-trama-w"/></pattern>`
      + `<pattern id="${id}n" patternUnits="userSpaceOnUse" width="5" height="5" patternTransform="rotate(45)"><path d="M0 0V5" class="tl-trama-n"/></pattern></defs>`;
    for (let y = t0; y <= Math.floor(t1); y++) s += `<path d="M${x(y)} 14V88" class="tl-rej"/><text x="${x(y)}" y="102" text-anchor="middle" class="tl-ano">${y}</text>`;
    s += `<text x="0" y="32" class="tl-fila">DUEÑOS</text><text x="0" y="59" class="tl-fila">PRENDAS</text><text x="0" y="81" class="tl-fila">SINIESTROS</text>`;
    d.propietarios.forEach((o, i) => {
      const a = x(tm(o.desde));
      const b = x(i < n - 1 ? tm(d.propietarios[i + 1].desde) : tHoy);
      const w = Math.max(2, b - a - 2);
      s += `<rect x="${a}" y="20" width="${f1(w)}" height="17" style="fill:${SER[(n - 1 - i) % 4]}"/>`;
      const lab = i === n - 1 ? `P${i + 1} · ACTUAL` : `P${i + 1}`;
      if (w > (i === n - 1 ? 66 : 20)) s += `<text x="${f1(a + 5)}" y="32" class="tl-p">${lab}</text>`;
    });
    d.propietarios.slice(1).forEach((o) => { s += `<path d="M${x(tm(o.desde))} 15V42" class="tl-tras"/>`; });
    if (d.prendas.length) {
      d.prendas.forEach((pr) => {
        const a = x(tm(pr.desde));
        const b = x(pr.hasta ? tm(pr.hasta) : tHoy);
        const vig = !pr.hasta;
        s += `<rect x="${a}" y="51" width="${f1(Math.max(2, b - a))}" height="10" fill="url(#${id}${vig ? 'w' : 'n'})" class="${vig ? 'tl-prenda-v' : 'tl-prenda'}"/>`;
        if (vig) s += `<rect x="${f1(a - 17)}" y="49" width="14" height="14" class="tl-glifo-w"/><use href="#ico-excl" x="${f1(a - 16)}" y="50" width="12" height="12" class="tl-ico-w"/>`;
      });
    } else s += `<text x="${X0}" y="59" class="tl-nada">Ninguna registrada</text>`;
    if (d.siniestros.length) d.siniestros.forEach((si) => { s += `<use href="#ico-alerta" x="${f1(x(tm(si.fecha)) - 7)}" y="69" width="14" height="14" class="tl-ico-w"/>`; });
    else s += `<text x="${X0}" y="81" class="tl-nada">Ninguno reportado</text>`;
    s += `<path d="M${X0} 88H${X1}" class="tl-eje"/>`;
    const xh = x(tHoy);
    s += `<path d="M${xh} 12V88" class="tl-hoy"/><text x="${xh}" y="116" text-anchor="middle" class="tl-hoy-t">HOY</text>`;
    return `<svg class="inf-tl" viewBox="0 0 330 120" role="img" aria-label="Línea de tiempo: ${n} propietarios desde ${mesTxt(d.matricula)}, ${d.prendas.length} prendas y ${d.siniestros.length} siniestros">${s}</svg>`;
  }

  const ETQ_EV = { prenda: ['warn', 'Vigente'], levanta: ['pos', 'Levantada'], sin: ['warn', 'Reportado'], hueco: ['warn', 'Sin cobertura'] };
  function hitos(d) {
    return html`<div class="tiempo inf-hitos">${d.eventos.map((e) => {
      const et = e.k === 'prenda' && !e.est ? ['pos', 'Levantada después'] : ETQ_EV[e.k];
      return html`<div class="hito${e.k === 'tras' || e.k === 'mat' ? ' inf-h-dueno' : ''}">
        <div class="hito-top"><span class="t13">${e.t}</span><span class="cap num" style="color:var(--txt-2)">${mesTxt(e.f)}</span></div>
        <div class="t11">${e.s}</div>
        ${et && (e.est || e.k === 'levanta') ? UI.chipEstado(et[0], et[1]) : ''}
      </div>`;
    })}</div>`;
  }

  function limitaciones(d) {
    const pv = d.prendaVigente;
    const filas = [
      ['prenda', 'Prendas', pv ? `Vigente a favor de ${pv.entidad} desde ${mesTxt(pv.desde)}` : d.prendas.length ? `Ninguna vigente · ${d.prendas.length} levantada` : 'Sin registros', pv ? ['warn', 'Vigente'] : ['pos', 'Libre']],
      ['documento', 'Embargos', d.embargos.length ? 'Registrado en el vehículo' : 'Sin registros', d.embargos.length ? ['neg', 'Embargado'] : ['pos', 'Ninguno']],
      ['runt', 'Limitaciones a la propiedad', 'Sin registros', ['pos', 'Ninguna']],
      ['alerta', 'Siniestros reportados', d.siniestros.length ? d.siniestros.map((x) => `${x.tipo} · ${mesTxt(x.fecha)}`).join(' · ') : 'Sin reportes', d.siniestros.length ? ['warn', `${d.siniestros.length} reportado`] : ['pos', 'Ninguno']],
    ];
    return html`<div class="lista">${filas.map(([i, t, s, [e, et]]) => html`<div class="fila"><span class="fila-ico">${ico(i)}</span><span><span class="t13" style="display:block">${t}</span><span class="t11" style="display:block">${s}</span></span>${UI.chipEstado(e, et)}</div>`)}</div>`;
  }

  function documentos(d) {
    const anos = [];
    for (let y = d.matricula[0]; y <= d.anoHoy; y++) anos.push(y);
    const soat = (y) => (y === d.anoHoy ? d.soatEst.estado : d.soat.huecos && d.soat.huecos[y] ? 'warn' : 'pos');
    const tecno = (y) => (y < d.tecno.primera ? 'na' : y === d.anoHoy ? d.tecnoEst.estado : 'pos');
    const celda = (e, y, que) => (e === 'na'
      ? html`<span class="inf-celda inf-na" role="cell" aria-label="${que} ${y}: no aplicaba">—</span>`
      : html`<span class="inf-celda est-${e}" role="cell" aria-label="${que} ${y}: ${e === 'pos' ? 'al día' : e === 'warn' ? 'con novedad' : 'vencida'}">${ico(GLIFO[e])}</span>`);
    const fila = (i, t, sub, est) => html`<div class="fila"><span class="fila-ico">${ico(i)}</span><span><span class="t13" style="display:block">${t}</span><span class="t11" style="display:block">${sub}</span></span>${UI.chipEstado(est.estado, est.etiqueta)}</div>`;
    return html`<div class="tarjeta tarjeta-pad">
        <div class="inf-matriz" style="--n:${anos.length}" role="table" aria-label="SOAT y tecnomecánica por año">
          <span></span>${anos.map((y) => html`<span class="cap inf-ano">${y}</span>`)}
          <span class="cap">SOAT</span>${anos.map((y) => celda(soat(y), y, 'SOAT'))}
          <span class="cap">Tecno</span>${anos.map((y) => celda(tecno(y), y, 'Tecnomecánica'))}
        </div>
        <div class="inf-leyenda"><span class="est-pos">${ico('check')}<em>Al día</em></span><span class="est-warn">${ico('excl')}<em>Con novedad</em></span><span><b>—</b><em>No aplicaba aún</em></span></div>
      </div>
      <div class="lista" style="margin-top:12px">
        ${fila('garantia', 'SOAT', `Vence el ${U.fechaCorta(DRS.reloj.dia(d.soat.vence))} · ${d.soat.aseguradora}`, d.soatEst)}
        ${fila('certificado', 'Tecnomecánica', `Vence el ${U.fechaCorta(DRS.reloj.dia(d.tecno.vence))} · ${d.tecno.cda}`, d.tecnoEst)}
      </div>`;
  }

  const pasoBonito = (bruto, lista) => lista.find((o) => bruto <= o) || lista[lista.length - 1];
  /** Estudio de mercado en SVG: precio (x) contra kilometraje (y), rango estimado con trama, similares y este vehículo. */
  function grafica(d) {
    const m = d.mercado;
    const X0 = 46, X1 = 318, Y0 = 26, Y1 = 160;
    const precios = m.comps.map((c) => c[2]).concat([m.min, m.max]);
    const pP = pasoBonito((Math.max(...precios) - Math.min(...precios)) / 4, [5e5, 1e6, 2e6, 2.5e6, 5e6, 1e7, 2e7, 2.5e7, 5e7]);
    const pMin = Math.floor(Math.min(...precios) / pP) * pP;
    const pMax = Math.ceil(Math.max(...precios) / pP) * pP;
    const kms = m.comps.map((c) => c[1]).concat([d.km]);
    const pK = pasoBonito(Math.max(...kms) / 4, [5000, 10000, 20000, 25000, 50000]);
    const kMax = Math.ceil((Math.max(...kms) * 1.08) / pK) * pK;
    const X = (v) => f1(X0 + ((v - pMin) / (pMax - pMin)) * (X1 - X0));
    const Y = (k) => f1(Y1 - (k / kMax) * (Y1 - Y0));
    const id = `infg${++gid}`;
    let s = `<defs><pattern id="${id}" patternUnits="userSpaceOnUse" width="6" height="6" patternTransform="rotate(45)"><path d="M0 0V6" class="g-trama"/></pattern></defs>`;
    for (let v = pMin; v <= pMax + 1; v += pP) s += `<path d="M${X(v)} ${Y0}V${Y1}" class="g-rej"/><text x="${X(v)}" y="${Y1 + 28}" text-anchor="middle">${millones(v)}</text>`;
    for (let k = 0; k <= kMax; k += pK) s += `<path d="M${X0} ${Y(k)}H${X1}" class="g-rej"/><text x="${X0 - 6}" y="${f1(Y(k) + 3)}" text-anchor="end">${k ? `${num(k / 1000)} mil` : '0'}</text>`;
    const xa = X(m.min), xb = X(m.max);
    s += `<rect x="${xa}" y="${Y0}" width="${f1(xb - xa)}" height="${f1(Y1 - Y0)}" fill="url(#${id})" class="g-banda"/>`;
    s += `<path d="M${xa} ${Y0}V${Y1}M${xb} ${Y0}V${Y1}" class="g-banda-borde"/>`;
    s += `<rect x="${xa}" y="${Y1 + 5}" width="${f1(xb - xa)}" height="8" fill="url(#${id})" class="g-barra"/>`;
    s += `<text x="${f1((xa + xb) / 2)}" y="${Y0 - 8}" text-anchor="middle" class="g-rango">RANGO ESTIMADO</text>`;
    s += `<path d="M${X0} ${Y1}H${X1}M${X0} ${Y0}V${Y1}" class="g-eje"/>`;
    // Etiquetas sin choques: primero la del vehículo, luego el año de cada similar a la derecha o a la izquierda.
    const vx = X((m.min + m.max) / 2), vy = Y(d.km);
    const pts = m.comps.map((c) => ({ c, x: X(c[2]), y: Y(c[1]) }));
    const cajas = pts.map((q) => [q.x - 5, q.y - 5, q.x + 5, q.y + 5]).concat([[vx - 6, vy - 6, vx + 6, vy + 6]]);
    const choca = (b) => cajas.some((k) => b[0] < k[2] && b[2] > k[0] && b[1] < k[3] && b[3] > k[1]);
    const dentro = (b) => b[0] >= X0 && b[2] <= X1 + 8 && b[1] >= Y0 - 2 && b[3] <= Y1;
    const anchoVeh = 46;
    const candVeh = [
      { b: [vx - anchoVeh / 2, vy - 22, vx + anchoVeh / 2, vy - 8], tx: vx, ty: vy - 10, a: 'middle' },
      { b: [vx - anchoVeh / 2, vy + 8, vx + anchoVeh / 2, vy + 22], tx: vx, ty: vy + 19, a: 'middle' },
      { b: [vx + 9, vy - 7, vx + 9 + anchoVeh, vy + 7], tx: vx + 9, ty: vy + 4, a: 'start' },
      { b: [vx - 9 - anchoVeh, vy - 7, vx - 9, vy + 7], tx: vx - 9, ty: vy + 4, a: 'end' },
    ];
    const lv = candVeh.find((k) => dentro(k.b) && !choca(k.b)) || candVeh[0];
    cajas.push(lv.b);
    s += `<path d="M${vx} ${vy}V${Y1}M${vx} ${vy}H${X0}" class="g-cruz"/>`;
    pts.forEach((q) => {
      const lados = [
        { b: [q.x + 7, q.y - 5, q.x + 31, q.y + 5], tx: q.x + 8, ty: q.y + 3, a: 'start' },
        { b: [q.x - 31, q.y - 5, q.x - 7, q.y + 5], tx: q.x - 8, ty: q.y + 3, a: 'end' },
        { b: [q.x - 12, q.y - 17, q.x + 12, q.y - 7], tx: q.x, ty: q.y - 8, a: 'middle' },
        { b: [q.x - 12, q.y + 7, q.x + 12, q.y + 17], tx: q.x, ty: q.y + 15, a: 'middle' },
      ];
      const lado = lados.find((k) => dentro(k.b) && !choca(k.b));
      s += `<circle cx="${q.x}" cy="${q.y}" r="4.5" class="g-comp"/>`;
      if (!lado) return;
      cajas.push(lado.b);
      s += `<text x="${f1(lado.tx)}" y="${f1(lado.ty)}" text-anchor="${lado.a}" class="g-ano">${q.c[0]}</text>`;
    });
    s += `<rect x="${f1(vx - 5)}" y="${f1(vy - 5)}" width="10" height="10" class="g-veh"/>`;
    s += `<text x="${f1(lv.tx)}" y="${f1(lv.ty)}" text-anchor="${lv.a}" class="g-veh-t">${placaTxt(d.placa)}</text>`;
    s += `<text x="${X0 - 6}" y="${Y0 - 8}" text-anchor="end" class="g-tit">KM</text><text x="${X1}" y="${Y1 + 44}" text-anchor="end" class="g-tit">PRECIO · MILLONES DE PESOS</text>`;
    return `<svg class="inf-graf" viewBox="0 0 330 208" role="img" aria-label="Estudio de mercado: rango estimado entre ${pesos(m.min)} y ${pesos(m.max)} frente a ${m.comps.length} similares en venta. Valores de ejemplo.">${s}</svg>`;
  }

  function mercado(d) {
    const m = d.mercado;
    const medio = Math.round(m.comps.reduce((a, c) => a + c[2], 0) / m.comps.length / 1e5) * 1e5;
    return html`<div class="tarjeta tarjeta-pad inf-mercado">
        <div class="inf-rango"><div><span class="cap">Desde</span><span class="d d-26 num">${pesos(m.min)}</span></div><div><span class="cap">Hasta</span><span class="d d-26 num">${pesos(m.max)}</span></div></div>
        <p class="t11" style="margin-top:8px">Promedio de los similares en venta: ${pesos(medio)}.</p>
        ${crudo(grafica(d))}
        <div class="inf-leyenda"><span><i class="lg-veh"></i><em>Este vehículo</em></span><span><i class="lg-banda"></i><em>Rango estimado</em></span><span><i class="lg-comp"></i><em>Similares (año)</em></span></div>
        <p class="cap inf-ejemplo">Valores de ejemplo · avisos ficticios</p>
      </div>
      <div class="inf-comps">${m.comps.slice().sort((a, b) => b[2] - a[2]).map((c) => html`<div class="inf-comp">
        <span><span class="t13 t-1" style="display:block">${d.marca} ${d.linea} ${c[0]}</span><span class="t11" style="display:block">${num(c[1])} km · ${c[3]}</span></span>
        <span class="t13 t-1 num">${pesos(c[2])}</span></div>`)}</div>`;
  }

  function recomendaciones(d) {
    const lista = (xs) => html`<ol class="srv-lista inf-lista">${xs.map((t, i) => html`<li><span class="d d-20 num">${String(i + 1).padStart(2, '0')}</span><p class="t13">${t}</p></li>`)}</ol>`;
    return html`<div class="inf-ia" role="note">${ico('informacion')}<span><b>Generado con IA</b> · revísalo antes de decidir</span></div>
      <div class="tarjeta tarjeta-pad"><div class="ceja">Puntos de atención</div>${lista(d.textoAtencion)}</div>
      <div class="tarjeta tarjeta-pad" style="margin-top:8px"><div class="ceja">Preguntas para el vendedor</div>${lista(d.preguntas)}
        <button class="btn btn-fantasma btn-chico inf-copiar" data-a="inf-copiar" data-placa="${d.placa}">${ico('copiar', 's16')}Copiar preguntas</button></div>
      ${d.prendaVigente ? html`<button class="btn btn-borde" style="margin-top:12px" ${crudo(UI.irAttrs('tramites', { tipo: 'ambos', vehiculo: `${d.marca} ${d.linea} · ${placaTxt(d.placa)}` }))}>${ico('traspaso')}Cotizar trámites con DRS</button>` : ''}`;
  }

  DRS.pantallas['informe-ver'] = {
    render(p, ctx) {
      const d = datos(p.placa);
      const c = compra(p.placa);
      return html`${UI.cabDet(`Informe ${placaTxt(p.placa)}`)}<div class="cuerpo con-cta">
        <div class="titulo"><div class="ceja">Informe completo · ${placaTxt(p.placa)}</div><h1 class="d d-44">${d.marca} ${d.lineaCompleta}</h1>
          <p class="t13">${d.modelo} · ${d.color} · ${num(d.km)} km en la última revisión${d.generico ? ' · resultado de ejemplo' : ''}</p>
          ${c ? html`<div class="inf-pagado">${UI.chipEstado('pos', 'Pagado')}<span class="cap">Ref. ${c.ref} · ${cuando(c)}</span></div>` : ''}</div>
        <div class="plano inf-plano">${dibujo(d, { ancho: 380, dibujar: ctx.anim })}<span class="inf-plano-placa">${placaTxt(p.placa)}</span><span class="cap inf-plano-fuente">Consulta simulada</span></div>
        ${banda(d)}
        ${tiles(d)}
        ${advertencia()}
        <section class="bloque">${UI.bloqueCab('Historial', 'Propietarios, traspasos, prendas y siniestros.')}
          <div class="tarjeta tarjeta-pad">${crudo(lineaTiempo(d))}</div>
          <div class="inf-hitos-caja">${hitos(d)}</div>
        </section>
        <section class="bloque">${UI.bloqueCab('Prendas y limitaciones', 'Lo que pesa sobre el vehículo hoy.')}${limitaciones(d)}</section>
        <section class="bloque">${UI.bloqueCab('SOAT y tecnomecánica', 'Año por año, desde la matrícula.')}${documentos(d)}</section>
        <section class="bloque">${UI.bloqueCab('Estudio de mercado', 'Precio estimado frente a similares en venta en Bogotá.')}${mercado(d)}</section>
        <section class="bloque">${UI.bloqueCab('Recomendaciones', 'Qué mirar y qué preguntar antes de cerrar.')}${recomendaciones(d)}</section>
        <p class="t11" style="margin-top:22px">Informe de ejemplo para la demo: placas, propietarios, entidades, aseguradoras y precios son ficticios.</p>
      </div>
      <div class="pie-cta"><button class="btn btn-acero" data-a="descargar" data-que="Informe ${placaTxt(p.placa)} en PDF">${ico('descargar')}Descargar PDF</button></div>`;
    },
  };

  Object.assign(DRS.acciones, {
    'inf-consultar': () => consultar(),
    'inf-ejemplo': (d) => ejemplo(d.placa),
    'inf-comprar': (d) => comprar(d.placa),
    'inf-copiar': (d) => {
      const x = datos(d.placa);
      const txt = x.preguntas.map((q, i) => `${i + 1}. ${q}`).join('\n');
      try { if (navigator.clipboard) navigator.clipboard.writeText(txt).catch(() => {}); } catch (e) { /* sin portapapeles: la demo sigue */ }
      DRS.tel.tostada('Preguntas copiadas', 'copiar');
    },
  });

  DRS.informe = { datos, PRECIO, abrir: (placa) => DRS.tel.ir('informe', placa ? { placa } : {}) };
})();
