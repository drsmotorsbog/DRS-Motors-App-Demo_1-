/* DRS Motors · demo — datos de ejemplo del panel del comercio aliado (FICTICIOS)
   Clientes, placas, celulares, reseñas, cifras y calendario de liquidaciones son
   inventados. Las fechas son desfases en días respecto al «hoy» de la demo
   (DRS.reloj.dia(n) da la fecha real).

   Todo vive en estado.panelDatos[idComercio]:
     plan          mensualidad y comisión de ejemplo del plan «Aliado»
     clientes      CRM: 30 clientes con sus visitas anteriores (las de hoy salen de estado.reservas)
     resenas       reseñas escritas (las calificaciones nuevas salen de estado.reservas)
     respuestas    { idReseña: { texto, d, h } }
     franjas       ocupación promedio de las últimas 8 semanas, lunes a domingo × 8:00–17:00 (%)
     historia      7 semanas cerradas antes de esta, agregadas por día
     agenda        reservas de ejemplo (sin nombre) de esta semana y la próxima, menos hoy
     bloqueos      franjas de 30 min que el comercio cerró: { d, b, ini }
     promoBase     franja y uso de la promo que ya existe en comercio.promo
     notas, envios lo que el comercio escribe o envía desde el CRM, por placa

   Las promociones nuevas van en comercio.promos (mismos campos de texto que comercio.promo). */
(function () {
  'use strict';
  const DRS = window.DRS;
  const U = DRS.util;

  /* ---------------- azar con semilla fija: la demo sale igual en cada reinicio ---------------- */
  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function azar(semilla) {
    let a = hash(semilla);
    return () => {
      a = (a + 0x6D2B79F5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function elegir(r, pesos) {
    const claves = Object.keys(pesos);
    let x = r() * claves.reduce((s, k) => s + pesos[k], 0);
    for (const k of claves) { x -= pesos[k]; if (x < 0) return k; }
    return claves[0];
  }

  /* ---------------- ocupación por franja (lunes a domingo × 8:00–17:00), en % ----------------
     Promedio de las últimas 8 semanas. null = cerrado (domingo desde las 3:00 p. m.).
     La promo que ya existe (martes a jueves, 9:00–11:00) subió esa franja del 30 % al 48 %. */
  const HORAS = [8, 9, 10, 11, 12, 13, 14, 15, 16, 17];
  const FRANJAS = [
    [36, 33, 35, 40, 46, 43, 31, 29, 40, 47],        // lunes
    [40, 39, 40, 45, 52, 47, 37, 39, 48, 56],        // martes
    [42, 38, 41, 46, 54, 49, 35, 36, 50, 58],        // miércoles
    [44, 39, 40, 47, 55, 51, 39, 41, 53, 61],        // jueves
    [49, 45, 47, 51, 61, 57, 50, 56, 66, 73],        // viernes
    [66, 79, 87, 89, 85, 77, 71, 64, 60, 55],        // sábado
    [58, 71, 75, 69, 57, 44, 26, null, null, null],  // domingo
  ];
  const PROMO_BASE = { diasSemana: [2, 3, 4], ini: '09:00', fin: '11:00', antes: 30, ahora: 48, desdeSemana: -3 };
  const PROMO_RECIENTE = 48;   // ocupación de la franja en promo en las últimas 4 semanas (la simulación la usa)

  /* ---------------- clientes (CRM) ----------------
     [id, nombre, placa, tipo, vehículo, origen, celular, primera, última, visitas, preferencias, fijas, nota]
     Los 10 primeros están en la agenda de hoy (js/datos.js); cl11 es el usuario de la demo. */
  const CLIENTES = [
    ['cl01', 'Carolina R.', 'HJT902', 'automovil', 'Kia Picanto', 'propio', '310 555 0118', -168, -14, 12, { completo: 6, sencillo: 3 }, {}, 'Paga en efectivo. Prefiere sin silicona en las llantas.'],
    ['cl02', 'Julián P.', 'BNM318', 'automovil', 'Chevrolet Onix', 'app', null, -96, -12, 8, { sencillo: 8, completo: 2 }, { '-12': 'sencillo' }, 'Reserva el sencillo antes de entrar a trabajar.'],
    ['cl03', 'Luis M.', 'FRV227', 'automovil', 'Mazda 3 Hatchback', 'propio', '311 555 0190', -150, -30, 5, { polichado: 6, completo: 2 }, {}, 'Polichado cada mes. Cuidado con el spoiler trasero.'],
    ['cl04', 'Daniela C.', 'QWE45A', 'moto', 'Yamaha NMAX 155', 'app', null, -12, -12, 1, { sencillo: 5, completo: 1 }, {}, ''],
    ['cl05', 'Paula S.', 'DFG590', 'automovil', 'Renault Sandero', 'app', null, -110, -18, 6, { motor: 3, completo: 3, sencillo: 2 }, { '-18': 'motor' }, ''],
    ['cl06', 'Sergio V.', 'JKL771', 'camioneta', 'Toyota Fortuner', 'propio', '312 555 0164', -126, -21, 6, { completo: 5, motor: 2 }, {}, 'Camioneta de empresa: pide la factura a nombre de la empresa.'],
    ['cl07', 'Camilo T.', 'UIO128', 'automovil', 'Suzuki Swift', 'app', null, -9, -9, 1, { sencillo: 3, completo: 1 }, {}, ''],
    ['cl08', 'Marta L.', 'RTY334', 'automovil', 'Nissan Versa', 'propio', '313 555 0127', -135, -45, 3, { cojineria: 3, completo: 2 }, {}, 'Viaja con su perro: aspirar bien los pelos de la cojinería.'],
    ['cl09', 'Felipe A.', 'PLM615', 'automovil', 'Volkswagen Polo', 'app', null, -84, -10, 8, { completo: 6, sencillo: 2 }, { '-10': 'completo' }, ''],
    ['cl10', 'Natalia O.', 'ZXC903', 'automovil', 'Hyundai Accent', 'propio', '314 555 0152', -35, -35, 1, { sencillo: 3, completo: 2 }, {}, 'Llegó recomendada por Carolina R.'],
    ['cl11', 'Andrés G.', 'KDM484', 'automovil', 'Mazda 2 Grand Touring', 'app', null, 0, 0, 0, {}, {}, ''],
    ['cl12', 'Alejandro N.', 'GHK562', 'camioneta', 'Mazda CX-30', 'app', null, -98, -5, 7, { completo: 5, polichado: 2 }, { '-5': 'completo' }, ''],
    ['cl13', 'Catalina P.', 'MNB804', 'camioneta', 'Renault Duster', 'propio', '315 555 0133', -90, -3, 7, { sencillo: 4, completo: 3 }, {}, 'Siempre viene con los niños: ofrecerle la sala de espera.'],
    ['cl14', 'Hernán C.', 'TRD219', 'camioneta', 'Chevrolet Tracker', 'propio', '316 555 0171', -102, -6, 9, { completo: 4, motor: 2, sencillo: 2 }, {}, ''],
    ['cl15', 'Lorena D.', 'WXS377', 'automovil', 'Kia Rio', 'app', null, -95, -15, 5, { completo: 4, sencillo: 2 }, { '-15': 'completo' }, 'Revisar el secado de los vidrios traseros antes de entregar.'],
    ['cl16', 'Tomás E.', 'CVB650', 'automovil', 'Toyota Corolla', 'app', null, -72, -2, 9, { sencillo: 6, completo: 3 }, {}, ''],
    ['cl17', 'Valentina G.', 'LKJ218', 'automovil', 'Renault Kwid', 'app', null, -11, -11, 1, { completo: 1 }, {}, 'Sin aromatizante.'],
    ['cl18', 'Mateo R.', 'POI483', 'automovil', 'Chevrolet Joy', 'app', null, -19, -4, 2, { sencillo: 1 }, {}, ''],
    ['cl19', 'Sofía L.', 'YTR09E', 'moto', 'Honda CB 190R', 'app', null, -22, -22, 1, { sencillo: 1 }, {}, ''],
    ['cl20', 'Diego M.', 'ASD741', 'camioneta', 'Ford Escape', 'propio', '317 555 0149', -6, -6, 1, { completo: 1 }, {}, ''],
    ['cl21', 'Juliana T.', 'QAZ332', 'camioneta', 'Kia Sportage', 'app', null, -29, -8, 2, { completo: 2, sencillo: 1 }, { '-29': 'completo' }, 'Preguntó por el polichado.'],
    ['cl22', 'Ricardo B.', 'EDC918', 'automovil', 'Chevrolet Spark GT', 'propio', '318 555 0105', -240, -94, 4, { sencillo: 3, completo: 1 }, {}, ''],
    ['cl23', 'Laura V.', 'RFV124', 'automovil', 'Nissan March', 'app', null, -130, -71, 2, { sencillo: 2, completo: 1 }, {}, ''],
    ['cl24', 'Jorge H.', 'TGB557', 'camioneta', 'Toyota Hilux', 'propio', '319 555 0186', -300, -120, 6, { motor: 3, completo: 3 }, {}, 'Lavado de motor al volver de la finca: llega con barro.'],
    ['cl25', 'Mónica F.', 'YHN38F', 'moto', 'Suzuki Gixxer 150', 'app', null, -118, -83, 2, { sencillo: 1 }, {}, ''],
    ['cl26', 'Esteban Q.', 'UJM702', 'automovil', 'Renault Logan', 'propio', '320 555 0112', -190, -65, 4, { sencillo: 2, completo: 2 }, {}, ''],
    ['cl27', 'Gabriela S.', 'IKL419', 'automovil', 'Mazda 2 Sedán', 'propio', '321 555 0158', -145, -25, 4, { completo: 3, cojineria: 1 }, {}, ''],
    ['cl28', 'Óscar J.', 'OLP835', 'camioneta', 'Volkswagen T-Cross', 'app', null, -115, -24, 4, { completo: 3, sencillo: 1 }, {}, ''],
    ['cl29', 'Manuela K.', 'ZAQ61C', 'moto', 'Bajaj Pulsar NS 200', 'app', null, -62, -27, 2, { sencillo: 1, completo: 1 }, {}, ''],
    ['cl30', 'Fernando Z.', 'XSW286', 'camioneta', 'Hyundai Tucson', 'propio', '322 555 0194', -124, -40, 4, { completo: 2, polichado: 1 }, {}, ''],
  ];

  /* ---------------- reseñas escritas ----------------
     [id, cliente, nota, fichas, texto, respuesta (null o [texto, días después])]
     La fecha es la de la visita más reciente del cliente. La calificación de Andrés G.
     (reserva DRS-3310) sale de estado.reservas. */
  const RESENAS = [
    ['rs01', 'cl16', 5, ['Puntual', 'Volvería'], 'Siempre cumplen la hora. Llevo tres lavados este mes y el carro sale igual de bien.', null],
    ['rs02', 'cl18', 5, ['Precio justo', 'Puntual'], 'Rápido y a buen precio. El aviso de listo me llegó justo cuando salía de una reunión.', null],
    ['rs03', 'cl12', 5, ['Buen acabado'], 'El completo queda muy bien por dentro, hasta los rieles de las sillas.', null],
    ['rs04', 'cl09', 5, ['Buen acabado', 'Volvería'], 'Cumplidos y el carro queda impecable. Ya es mi lavadero fijo.', null],
    ['rs05', 'cl17', 4, ['Buena atención'], 'Buen servicio. El aromatizante es muy fuerte, la próxima vez lo pido sin.', null],
    ['rs06', 'cl02', 5, ['Puntual', 'Buena atención'], 'Llegué a la hora, lo recibieron de una y a los 40 minutos estaba listo. El aviso al celular sirve mucho.', null],
    ['rs07', 'cl04', 4, ['Buena atención'], 'Buen lavado para la moto. Me tocó esperar unos 10 minutos más de lo que decía la app.',
      ['Gracias, Daniela. Ese día se juntaron dos camionetas en la bahía 3. Ya ajustamos los tiempos de las motos en la agenda.', 1]],
    ['rs08', 'cl15', 2, [], 'Me dejaron marcas de agua en los vidrios de atrás y tuve que volver.',
      ['Lorena, tienes razón y lo sentimos. Te escribimos para repetir el secado de vidrios sin costo esta semana.', 1]],
    ['rs09', 'cl05', 5, ['Buen acabado', 'Volvería'], 'Lavado de motor impecable, sin dejar humedad en los plásticos.', null],
    ['rs10', 'cl19', 4, ['Buena atención'], 'Todo bien con la moto, aunque el espacio para esperar es pequeño.', null],
    ['rs11', 'cl28', 5, ['Puntual'], 'Me avisaron cuando estaba lista la camioneta y llegué justo a tiempo.', null],
    ['rs12', 'cl29', 3, [], 'El lavado estuvo bien, pero tardaron en entregarme la moto al final.', null],
    ['rs13', 'cl21', 5, ['Buena atención', 'Volvería'], 'Me explicaron qué incluye cada servicio sin afán. Vuelvo por el polichado.',
      ['Gracias, Juliana. Te esperamos para el polichado: entre semana en la mañana hay más espacio.', 1]],
    ['rs14', 'cl23', 4, ['Puntual'], 'Buen lavado. La app me dejó reservar justo a la hora que necesitaba.', null],
  ];
  /** Distribución de las 212 reseñas de c1 (4,8 /5). Las calificaciones de hoy se suman aparte. */
  const DISTRIBUCION = { 5: 178, 4: 24, 3: 6, 2: 3, 1: 1 };
  const CALIF_SEMANAL = [4.7, 4.6, 4.8, 4.7, 4.8, 4.7, 4.9];   // semanas −7 … −1

  /* ---------------- simulación de un día de trabajo ---------------- */
  const PESO_CARRO = { sencillo: 38, completo: 33, motor: 12, polichado: 9, cojineria: 8 };
  const PESO_MOTO = { sencillo: 70, completo: 30 };
  const PESO_TIPO = { automovil: 70, camioneta: 18, moto: 12 };
  const lunesIdx = (fecha) => (fecha.getDay() + 6) % 7;            // 0 = lunes … 6 = domingo
  const enPromo = (dowL, h, sem) => dowL >= 1 && dowL <= 3 && (h === 9 || h === 10) && sem >= PROMO_BASE.desdeSemana;

  function objetivo(dowL, h, sem) {
    let o = FRANJAS[dowL][h - 8];
    if (o == null) return null;
    if (dowL >= 1 && dowL <= 3 && (h === 9 || h === 10)) o = sem >= PROMO_BASE.desdeSemana ? PROMO_RECIENTE : PROMO_BASE.antes;
    return (o / 100) * (1 + 0.03 * sem);          // el negocio crece ~3 % por semana desde que llegó a la app
  }

  /** Reservas de un día (anónimas). sem = semana relativa a la actual (−7 … 1). */
  function simularDia(servicios, fecha, sem) {
    const r = azar(`espuma127:${U.isoDia(fecha)}`);
    const dowL = lunesIdx(fecha);
    const cierre = dowL === 6 ? 15 * 60 : 18 * 60;
    const L = 2.4;                                  // duración media en franjas de 30 min
    const out = [];
    let usadosPromo = 0;
    for (let b = 1; b <= 3; b++) {
      let t = 8 * 60;
      while (t < cierre) {
        const h = Math.floor(t / 60);
        const o0 = objetivo(dowL, h, sem);
        if (o0 == null) break;
        const o = Math.min(0.97, o0 * 1.4 * (0.9 + r() * 0.2));
        if (r() < o / (L * (1 - o) + o)) {
          const promo = enPromo(dowL, h, sem) && usadosPromo < 12 && r() < 0.7;
          const tipo = promo ? 'automovil' : elegir(r, PESO_TIPO);
          const s = promo ? 'sencillo' : tipo === 'moto' ? elegir(r, PESO_MOTO) : elegir(r, PESO_CARRO);
          const srv = servicios.find((x) => x.id === s);
          if (srv && srv.precio[tipo] && t + srv.min <= cierre) {
            const app = promo || r() < 0.38 + 0.024 * (sem + 7);
            const nuevo = r() < (app ? 0.28 : 0.1);
            const x = { b, ini: U.deMin(t), min: srv.min, s, tipo, o: app ? 'app' : 'propio', t: srv.precio[tipo] };
            if (promo) { x.pr = 1; x.t = Math.round((srv.precio[tipo] * 0.8) / 100) * 100; usadosPromo++; }
            if (nuevo) x.nu = 1;
            out.push(x);
            t += Math.ceil(srv.min / 30) * 30;
            continue;
          }
        }
        t += 30;
      }
    }
    return out;
  }

  /* ---------------- armado de los datos del comercio ---------------- */
  function visitasCliente(c, servicios) {
    const [id, , placa, tipo, , origen, , primera, ultima, n, pref, fijas] = c;
    if (!n) return [];
    const r = azar(`cliente:${id}:${placa}`);
    const out = [];
    for (let i = 0; i < n; i++) {
      let d = n === 1 ? ultima : Math.round(primera + ((ultima - primera) * i) / (n - 1));
      if (i > 0 && i < n - 1) d += Math.round(r() * 4) - 2;
      let s = fijas[String(d)] || elegir(r, pref);
      let srv = servicios.find((x) => x.id === s);
      if (!srv || !srv.precio[tipo]) { s = 'sencillo'; srv = servicios.find((x) => x.id === s); }
      out.push({ d, s, t: srv.precio[tipo], o: origen });
    }
    return out;
  }

  function generar(estado, idComercio) {
    const servicios = estado.servicios;
    const hoy = DRS.reloj.hoy();
    const lunesD = -lunesIdx(hoy);
    const pd = {
      comercio: idComercio,
      plan: { nombre: 'Aliado', mensualidad: 89000, comision: 0.10, ejemplo: true },   // valores de ejemplo: por definir
      cuenta: 'Cuenta de ahorros terminada en 2231',
      promoBase: { ...PROMO_BASE, usados: 0 },
      franjas: { horas: HORAS.slice(), dias: FRANJAS.map((f) => f.slice()) },
      distribucion: { ...DISTRIBUCION },
      clientes: [],
      resenas: [],
      respuestas: {},
      historia: [],
      agenda: [],
      bloqueos: [],
      notas: {},
      envios: {},
    };

    // CRM
    CLIENTES.forEach((c) => {
      const [id, nombre, placa, tipoVeh, vehiculo, origen, celular] = c;
      pd.clientes.push({ id, nombre, placa, tipoVeh, vehiculo, origen, celular, usuario: id === 'cl11' ? 'u1' : null, visitas: visitasCliente(c, servicios) });
      if (c[12]) pd.notas[placa] = c[12];
    });

    // Reseñas: la fecha y el servicio son los de la última visita del cliente
    RESENAS.forEach(([id, cli, nota, fichas, texto, resp]) => {
      const c = pd.clientes.find((x) => x.id === cli);
      const v = c.visitas[c.visitas.length - 1];
      const d = cli === 'cl21' ? c.visitas[0].d : v.d;
      const srv = servicios.find((x) => x.id === (cli === 'cl21' ? c.visitas[0].s : v.s));
      pd.resenas.push({ id, cliente: cli, autor: c.nombre, placa: c.placa, nota, fichas, texto, d, servicio: srv ? srv.nombre : 'Lavado' });
      if (resp) pd.respuestas[id] = { texto: resp[0], d: d + resp[1], h: '08:40' };
    });

    // Historia: 7 semanas cerradas, agregadas por día
    for (let w = -7; w <= -1; w++) {
      const lunes = lunesD + w * 7;
      const dias = [];
      const srv = {};
      for (let k = 0; k < 7; k++) {
        const bl = simularDia(servicios, DRS.reloj.dia(lunes + k), w);
        const app = bl.filter((x) => x.o === 'app');
        dias.push({
          n: bl.length, app: app.length, total: bl.reduce((s, x) => s + x.t, 0), totalApp: app.reduce((s, x) => s + x.t, 0),
          nuevos: bl.filter((x) => x.nu).length, promo: bl.filter((x) => x.pr).length,
          min: bl.reduce((s, x) => s + x.min, 0),
        });
        bl.forEach((x) => { srv[x.s] = (srv[x.s] || 0) + 1; });
      }
      pd.historia.push({ lunes, dias, srv, calif: CALIF_SEMANAL[w + 7] });
    }

    // Agenda de ejemplo: esta semana y la próxima, menos hoy (hoy sale de estado.reservas).
    // Días pasados: todo lo que se atendió. Días futuros: lo que ya está reservado (más por la app).
    const r = azar(`agenda:${U.isoDia(hoy)}`);
    let primerHabil = null;
    for (let d = lunesD; d <= lunesD + 13; d++) {
      if (d === 0) continue;
      const fecha = DRS.reloj.dia(d);
      const sem = d < lunesD + 7 ? 0 : 1;
      const bl = simularDia(servicios, fecha, sem);
      const pb = Math.max(0.35, 0.88 - 0.05 * (d - 1));   // mañana ya está casi lleno; la otra semana, a medias
      bl.forEach((x) => {
        if (d > 0 && r() > (x.o === 'app' ? pb : pb * 0.45)) return;
        pd.agenda.push({ d, ...x });
      });
      if (d > 0 && primerHabil == null && lunesIdx(fecha) < 5) primerHabil = d;
    }
    pd.promoBase.usados = Math.min(12, pd.agenda.filter((x) => x.pr && x.d < 0 && x.d >= lunesD).length);

    // Un bloqueo de ejemplo: mantenimiento de la hidrolavadora de la bahía 3 el próximo día hábil
    if (primerHabil != null) {
      ['12:00', '12:30'].forEach((ini) => pd.bloqueos.push({ d: primerHabil, b: 3, ini }));
      const a = U.aMin('12:00'), z = U.aMin('13:00');
      pd.agenda = pd.agenda.filter((x) => !(x.d === primerHabil && x.b === 3 && U.aMin(x.ini) < z && U.aMin(x.ini) + x.min > a));
    }
    return pd;
  }

  /** Datos del panel para un comercio; los genera si faltan (p. ej. estado guardado antes de este módulo). */
  function asegurar(estado, idComercio) {
    estado.panelDatos = estado.panelDatos || {};
    if (!estado.panelDatos[idComercio]) estado.panelDatos[idComercio] = generar(estado, idComercio);
    return estado.panelDatos[idComercio];
  }

  DRS.extenderSemilla((estado) => {
    // Al recargar, estado.js vuelve a sembrar con DRS.estado = lo guardado y copia de la semilla
    // comercios, servicios y extras. Aquí se conservan las ediciones del panel (precios, duración y
    // promociones nuevas); al reiniciar (DRS.estado sin comercios) todo vuelve a la semilla.
    const previo = DRS.estado && DRS.estado !== estado ? DRS.estado : null;

    // Copias propias: editar un precio no debe tocar las constantes de datos.js
    estado.servicios = estado.servicios.map((s) => ({ ...s, precio: { ...s.precio } }));
    estado.extras = estado.extras.map((x) => ({ ...x }));
    if (previo && Array.isArray(previo.servicios)) {
      estado.servicios.forEach((s) => {
        const p = previo.servicios.find((x) => x.id === s.id);
        if (p && p.precio) { s.precio = { ...p.precio }; if (p.min) s.min = p.min; }
      });
    }
    if (previo && Array.isArray(previo.extras)) {
      estado.extras.forEach((x) => { const p = previo.extras.find((y) => y.id === x.id); if (p && p.precio) x.precio = p.precio; });
    }

    estado.comercios.forEach((c) => {
      const p = previo && Array.isArray(previo.comercios) ? previo.comercios.find((x) => x.id === c.id) : null;
      c.promos = p && Array.isArray(p.promos) ? p.promos : [];
    });

    const id = estado.comercioPanel || 'c1';
    estado.panelDatos = { [id]: generar(estado, id) };
  });

  DRS.comercioDatos = { generar, asegurar, lunesIdx, HORAS };
})();
