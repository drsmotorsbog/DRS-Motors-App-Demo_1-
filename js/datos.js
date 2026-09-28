/* DRS Motors · demo — datos de ejemplo (FICTICIOS)
   Personas, placas, comercios, aseguradoras y precios son inventados. Los precios
   son valores de ejemplo dentro del rango del documento de producto ($18.000–$60.000).
   Las fechas se guardan como desfase en días respecto al «hoy» de la demo, así la
   historia no cambia con el día en que se muestre («el SOAT vence en 12 días»). */
(function () {
  'use strict';
  const DRS = window.DRS;
  const U = DRS.util;

  const SERVICIOS_LAVADO = [
    { id: 'sencillo', nombre: 'Lavado sencillo', desc: 'Exterior, aspirado y llantas.', min: 40, precio: { moto: 18000, automovil: 25000, camioneta: 30000 } },
    { id: 'completo', nombre: 'Lavado completo', desc: 'Exterior, interior, aspirado, tablero y llantas.', min: 60, precio: { moto: 25000, automovil: 38000, camioneta: 45000 } },
    { id: 'motor', nombre: 'Lavado de motor', desc: 'Desengrase y protección de plásticos.', min: 45, precio: { automovil: 30000, camioneta: 35000 } },
    { id: 'polichado', nombre: 'Polichado', desc: 'Brillo y corrección leve de la pintura.', min: 120, precio: { automovil: 55000, camioneta: 60000 } },
    { id: 'cojineria', nombre: 'Lavado de cojinería', desc: 'Tapicería y alfombras con máquina.', min: 180, precio: { automovil: 50000, camioneta: 60000 } },
  ];
  const EXTRAS = [
    { id: 'silicona', nombre: 'Silicona para llantas', precio: 6000 },
    { id: 'aroma', nombre: 'Aromatizante', precio: 5000 },
    { id: 'vidrios', nombre: 'Desmanchado de vidrios', precio: 10000 },
  ];

  const COMERCIOS = [
    { id: 'c1', pos: [127, 19], nombre: 'Espuma 127', tipo: 'lavadero', zona: 'Usaquén', barrio: 'Santa Bárbara', direccion: 'Calle 127 # 19-40', km: 2.1, calif: 4.8, resenas: 212, bahias: 3, ocupadas: [1],
      horario: 'Lun–sáb 7:00 a. m. – 7:00 p. m. · dom 8:00 a. m. – 3:00 p. m.', plan: 'Aliado',
      promo: { pct: 20, servicio: 'sencillo', dias: 'de martes a jueves', franja: 'de 9:00 a 11:00 a. m.', chip: '9–11 a. m.', cupos: 12, hasta: 34 } },
    { id: 'c2', pos: [115, 69.2], nombre: 'Nimbo Autolavado', tipo: 'lavadero', zona: 'Suba', barrio: 'Niza', direccion: 'Av. Suba # 115-62', km: 6.8, calif: 4.6, resenas: 148, bahias: 4, ocupadas: [0, 2],
      promo: { pct: 15, servicio: 'completo', dias: 'puente festivo', franja: 'todo el día', chip: 'puente', cupos: 30, hasta: 16, puente: true } },
    { id: 'c3', pos: [63.3, 5], nombre: 'Bruma Detailing', tipo: 'lavadero', zona: 'Chapinero', barrio: 'Chapinero Alto', direccion: 'Carrera 5 # 63-17', km: 8.3, calif: 4.9, resenas: 97, bahias: 2, ocupadas: [0] },
    { id: 'c4', pos: [53, 72.4], nombre: 'Lavadero Galvano', tipo: 'lavadero', zona: 'Engativá', barrio: 'Normandía', direccion: 'Calle 53 # 72-15', km: 12.6, calif: 4.4, resenas: 176, bahias: 3, ocupadas: [],
      promo: { pct: 25, servicio: 'sencillo', dias: 'de lunes a miércoles', franja: 'de 2:00 a 4:00 p. m.', chip: '2–4 p. m.', cupos: 15, hasta: 20 } },
    { id: 'c5', pos: [138, 58], nombre: 'Cromo & Espuma', tipo: 'lavadero', zona: 'Suba', barrio: 'Colina Campestre', direccion: 'Calle 138 # 58-20', km: 4.9, calif: 4.7, resenas: 133, bahias: 3, ocupadas: [1, 2] },
    { id: 'c6', pos: [147, 11], nombre: 'Punto Neutro', tipo: 'lavadero', zona: 'Usaquén', barrio: 'Cedritos', direccion: 'Calle 147 # 11-30', km: 1.4, calif: 4.5, resenas: 88, bahias: 2, ocupadas: [1] },
    { id: 'c7', pos: [74, 68], nombre: 'Aqua 68', tipo: 'lavadero', zona: 'Engativá', barrio: 'Las Ferias', direccion: 'Av. 68 # 74-20', km: 11.2, calif: 4.3, resenas: 204, bahias: 4, ocupadas: [0, 1, 3] },
  ];

  // Talleres y centros de diagnóstico automotor (CDA) aliados. FICTICIOS; precios de ejemplo.
  const SERVICIOS_TALLER = [
    { id: 'aceite', nombre: 'Cambio de aceite y filtro', desc: 'Aceite sintético, filtro y revisión de niveles.', min: 60, desde: 165000 },
    { id: 'frenos', nombre: 'Frenos: pastillas delanteras', desc: 'Pastillas, limpieza y prueba en vía.', min: 120, desde: 210000 },
    { id: 'alineacion', nombre: 'Alineación y balanceo', desc: 'Cuatro ruedas, con reporte impreso.', min: 60, desde: 90000 },
    { id: 'diagnostico', nombre: 'Diagnóstico con escáner', desc: 'Lectura de códigos y reporte.', min: 45, desde: 80000 },
    { id: 'revision', nombre: 'Revisión general', desc: '40 puntos: frenos, suspensión, luces, fluidos.', min: 90, desde: 120000 },
    { id: 'pretecno', nombre: 'Preparación para la tecnomecánica', desc: 'Revisamos lo que el CDA va a revisar.', min: 60, desde: 95000 },
    { id: 'suspension', nombre: 'Suspensión', desc: 'Amortiguadores y bujes. Precio según diagnóstico.', min: 180, desde: null },
  ];
  const TALLERES = [
    { id: 't1', pos: [134, 18], nombre: 'Taller Biela', tipo: 'taller', zona: 'Usaquén', barrio: 'Contador', direccion: 'Calle 134 # 18-22', calif: 4.7, resenas: 164, bahias: 4, ocupadas: [0, 2], factor: 1.0, horario: 'Lun–sáb 7:30 a. m. – 6:00 p. m.' },
    { id: 't2', pos: [163, 20], nombre: 'Pistón Norte', tipo: 'taller', zona: 'Usaquén', barrio: 'Toberín', direccion: 'Calle 163 # 20-15', calif: 4.5, resenas: 121, bahias: 3, ocupadas: [1], factor: 0.94, horario: 'Lun–sáb 8:00 a. m. – 6:00 p. m.' },
    { id: 't3', pos: [80, 69], nombre: 'Torque 80', tipo: 'taller', zona: 'Engativá', barrio: 'Las Ferias', direccion: 'Calle 80 # 69-40', calif: 4.6, resenas: 198, bahias: 5, ocupadas: [0, 1, 3], factor: 0.9, horario: 'Lun–sáb 7:00 a. m. – 7:00 p. m.' },
    { id: 't4', pos: [100, 49], nombre: 'Mecánica Balanza', tipo: 'taller', zona: 'Barrios Unidos', barrio: 'La Castellana', direccion: 'Calle 100 # 49-12', calif: 4.8, resenas: 143, bahias: 3, ocupadas: [2], factor: 1.08, horario: 'Lun–vie 8:00 a. m. – 6:00 p. m. · sáb hasta la 1:00 p. m.' },
  ];
  const CDAS = [
    { id: 'd1', pos: [170, 20], nombre: 'CDA Andén 170', tipo: 'cda', zona: 'Usaquén', barrio: 'San Antonio Norte', direccion: 'Calle 170 # 20-35', calif: 4.6, resenas: 312, lineas: 3, precio: { automovil: 318400, moto: 218300 }, drs: 0.05, horario: 'Lun–sáb 7:00 a. m. – 5:00 p. m.' },
    { id: 'd2', pos: [80, 90], nombre: 'CDA Ruta 80', tipo: 'cda', zona: 'Engativá', barrio: 'Bochica', direccion: 'Calle 80 # 90-11', calif: 4.4, resenas: 276, lineas: 4, precio: { automovil: 302500, moto: 217200 }, drs: 0.05, horario: 'Lun–sáb 6:30 a. m. – 5:00 p. m.' },
    { id: 'd3', pos: [147, 45], nombre: 'CDA Norte 147', tipo: 'cda', zona: 'Suba', barrio: 'Mazurén', direccion: 'Calle 147 # 45-20', calif: 4.7, resenas: 188, lineas: 2, precio: { automovil: 324900, moto: 229100 }, drs: 0.05, horario: 'Lun–vie 7:00 a. m. – 5:00 p. m.' },
    { id: 'd4', pos: [13, 68], nombre: 'CDA Occidente 13', tipo: 'cda', zona: 'Kennedy', barrio: 'Carvajal', direccion: 'Calle 13 # 68-50', calif: 4.3, resenas: 401, lineas: 5, precio: { automovil: 297800, moto: 215900 }, drs: 0.05, horario: 'Lun–sáb 6:00 a. m. – 6:00 p. m.' },
  ];
  const CASA = { nombre: 'Casa', pos: [145, 16], direccion: 'Calle 145 # 16-30, Cedritos' };
  // Distancia de la casa del usuario a cada comercio (km, aproximada por la malla vial)
  const kmDesdeCasa = (p) => Math.round((Math.abs(p[0] - CASA.pos[0]) + Math.abs(p[1] - CASA.pos[1])) * 0.12 * 10) / 10;

  /** Agenda del día del comercio c1, armada alrededor de la franja S de la reserva de la demo. */
  function agendaC1(S, minAhora, cierreHoy = 19 * 60) {
    const otros = [
      { b: 1, ini: -150, srv: 'completo', cli: 'Carolina R.', placa: 'HJT902', app: false, tipo: 'automovil' },
      { b: 1, ini: -60, srv: 'sencillo', cli: 'Julián P.', placa: 'BNM318', app: true, tipo: 'automovil' },
      { b: 2, ini: -130, srv: 'polichado', cli: 'Luis M.', placa: 'FRV227', app: false, tipo: 'automovil' },
      { b: 3, ini: -90, srv: 'sencillo', cli: 'Daniela C.', placa: 'QWE45A', app: true, tipo: 'moto' },
      { b: 3, ini: -30, srv: 'motor', cli: 'Paula S.', placa: 'DFG590', app: true, tipo: 'automovil' },
      { b: 1, ini: 30, srv: 'completo', cli: 'Sergio V.', placa: 'JKL771', app: false, tipo: 'camioneta' },
      { b: 3, ini: 60, srv: 'sencillo', cli: 'Camilo T.', placa: 'UIO128', app: true, tipo: 'automovil' },
      { b: 2, ini: 120, srv: 'cojineria', cli: 'Marta L.', placa: 'RTY334', app: false, tipo: 'automovil' },
      { b: 1, ini: 180, srv: 'completo', cli: 'Felipe A.', placa: 'PLM615', app: true, tipo: 'automovil' },
      { b: 3, ini: 240, srv: 'sencillo', cli: 'Natalia O.', placa: 'ZXC903', app: false, tipo: 'automovil' },
    ];
    let n = 4700;
    return otros.map((o) => {
      const srv = SERVICIOS_LAVADO.find((s) => s.id === o.srv);
      const ini = S + o.ini;
      const fin = ini + srv.min;
      const estado = fin <= minAhora ? 'finalizada' : ini <= minAhora ? 'en_proceso' : 'confirmada';
      const total = srv.precio[o.tipo];
      return {
        id: `DRS-${n += 7}`, comercio: 'c1', bahia: o.b, d: 0, hora: U.deMin(ini), min: srv.min,
        servicio: srv.nombre, extras: [], cliente: o.cli, placa: o.placa, tipoVeh: o.tipo,
        origen: o.app ? 'app' : 'propio', total, medio: o.app ? 'Tarjeta' : 'En el local', estado, usuario: null,
      };
    }).filter((r) => { const i = U.aMin(r.hora); return i >= 7 * 60 && i + r.min <= cierreHoy; });
  }

  DRS.SEMILLA_VERSION = 5;   // súbela cuando cambie la forma de los datos: lo guardado en el navegador se descarta

  /** Los módulos agregan sus datos de ejemplo: DRS.extenderSemilla((estado, demo) => { estado.x = … }) */
  DRS._extSemilla = DRS._extSemilla || [];
  DRS.extenderSemilla = (fn) => DRS._extSemilla.push(fn);

  DRS.semilla = function (demo) {
    const ahora = DRS.reloj.ahora();
    const minAhora = ahora.getHours() * 60 + ahora.getMinutes();
    // Franja de la reserva de la demo: 10:30 en modo guiado; en modo libre, la próxima media hora con margen.
    const domingo = ahora.getDay() === 0;
    const cierreHoy = domingo ? 15 * 60 : 19 * 60;          // Espuma 127 abre los domingos de 8:00 a. m. a 3:00 p. m.
    let S = 10 * 60 + 30;
    if (!demo.fecha && minAhora >= 7 * 60 && minAhora < cierreHoy - 90) S = Math.ceil((minAhora + 20) / 30) * 30;

    const vehiculos = [
      { id: 'v1', tipo: 'carro', clase: 'Automóvil', placa: 'KDM484', marca: 'Mazda', linea: '2 Grand Touring', modelo: 2021, carroceria: 'Sedán',
        color: 'Gris', cilindraje: 1496, combustible: 'Gasolina', transmision: 'Automática', servicio: 'Particular', km: 48320, kmD: -9,
        soat: { vence: 12, inicio: -353, poliza: 'SA-1029-4471-26', aseguradora: 'Seguros Aldaba', consulta: { d: 0, h: '06:02' } },
        tecno: { vence: 214, ultima: -151, cda: 'CDA Andén 170', certificado: 'RTM 5510-2026', consulta: { d: 0, h: '06:02' } },
        aceite: { ultimoKm: 43800, ultimoD: -121, cadaKm: 5000, cadaMeses: 6 },
        llantas: { montadasKm: 20000, vidaKm: 50000, revisionD: -290 } },
      { id: 'v2', tipo: 'moto', clase: 'Motocicleta', placa: 'MQT41F', marca: 'Yamaha', linea: 'MT-03', modelo: 2022, carroceria: 'Naked',
        color: 'Negro', cilindraje: 321, combustible: 'Gasolina', transmision: 'Mecánica', servicio: 'Particular', km: 12480, kmD: -4,
        soat: { vence: 143, inicio: -222, poliza: 'SA-2210-0385-26', aseguradora: 'Seguros Aldaba', consulta: { d: 0, h: '06:02' } },
        tecno: { vence: 95, ultima: -270, cda: 'CDA Andén 170', certificado: 'RTM 3318-2025', consulta: { d: 0, h: '06:02' } },
        aceite: { ultimoKm: 10000, ultimoD: -60, cadaKm: 3000, cadaMeses: 4 },
        llantas: { montadasKm: 3500, vidaKm: 18000, revisionD: -60 } },
    ];

    const reservaDemo = {
      id: 'DRS-4821', comercio: 'c1', bahia: 2, d: 0, hora: U.deMin(S), min: 60,
      servicio: 'Lavado completo', extras: ['Silicona para llantas'], cliente: 'Andrés G.', placa: 'KDM484', tipoVeh: 'automovil',
      origen: 'app', valor: 38000 + 6000, descuento: 0, total: 44000, medio: 'Nequi', estado: 'confirmada', usuario: 'u1', vehiculo: 'v1',
      historial: [{ estado: 'confirmada', d: -1, h: '19:42' }],
    };

    const reservasPasadas = [
      { id: 'DRS-3310', comercio: 'c1', bahia: 1, d: -38, hora: '09:00', min: 60, servicio: 'Lavado completo', extras: [], cliente: 'Andrés G.', placa: 'KDM484', tipoVeh: 'automovil',
        origen: 'app', valor: 38000, descuento: 0, total: 38000, medio: 'Tarjeta', estado: 'finalizada', usuario: 'u1', vehiculo: 'v1', nota: 5, historial: [] },
      { id: 'DRS-2791', comercio: 'c6', bahia: 1, d: -71, hora: '16:00', min: 40, servicio: 'Lavado sencillo', extras: [], cliente: 'Andrés G.', placa: 'MQT41F', tipoVeh: 'moto',
        origen: 'app', valor: 18000, descuento: 0, total: 18000, medio: 'PSE', estado: 'finalizada', usuario: 'u1', vehiculo: 'v2', nota: 4, historial: [] },
    ];

    const notificaciones = demo.sinReserva ? [] : [
      { id: 'n2', d: -1, h: '19:42', ico: 'calendario', titulo: 'Reserva confirmada', texto: `Lavado completo en Espuma 127, hoy a las ${U.horaTxt(U.deMin(S))}. Código DRS-4821.`, leida: false, ir: { ruta: 'reserva', p: { id: 'DRS-4821' } }, accion: 'Ver reserva' },
      { id: 'n3', d: -1, h: '08:00', ico: 'certificado', titulo: 'Tu SOAT vence en 13 días', texto: 'Renuévalo a tiempo para no quedarte sin cobertura.', leida: true, ir: { ruta: 'documento', p: { v: 'v1', doc: 'soat' } }, accion: 'Ver opciones' },
      { id: 'n4', d: -3, h: '12:10', ico: 'precio', titulo: 'Promo cerca: −20 % en Espuma 127', texto: 'Lavado sencillo de martes a jueves, de 9:00 a 11:00 a. m.', leida: true, proxima: 'lavaderos', accion: 'Reservar' },
    ];
    if (demo.sinReserva) notificaciones.push(
      { id: 'n3', d: -1, h: '08:00', ico: 'certificado', titulo: 'Tu SOAT vence en 13 días', texto: 'Renuévalo a tiempo para no quedarte sin cobertura.', leida: true, ir: { ruta: 'documento', p: { v: 'v1', doc: 'soat' } }, accion: 'Ver opciones' });
    const pyp = DRS.reloj.picoPlaca(DRS.reloj.hoy(), vehiculos[0]);
    if (pyp.restringido) {
      notificaciones.unshift({ id: 'n1', d: 0, h: '06:00', ico: 'carro', titulo: 'Hoy tienes pico y placa', texto: 'Tu carro no sale hoy, buen día para dejarlo lavando.', leida: false, ir: { ruta: 'explorar', p: { tipo: 'lavadero' } }, accion: 'Reservar lavado' });
    }

    const estado = {
      version: DRS.SEMILLA_VERSION,
      demo: { fecha: demo.fecha || null, hora: demo.hora || null, guiado: !!demo.guiado, paso: demo.paso || null, sinReserva: !!demo.sinReserva },
      usuario: { id: 'u1', nombre: 'Andrés', apellido: 'Gómez', celular: '300 555 0142', correo: 'andres.gomez@ejemplo.com', documento: 'CC 1.020.456.789',
        puntos: 1250, meta: { nombre: 'Tu 5.º lavado tiene 50 % de descuento', hechos: 3, total: 5 } },
      vehiculoActivo: 'v1',
      vehiculos,
      mantenimientos: [
        { id: 'm1', vehiculo: 'v1', d: -38, tipo: 'lavado', titulo: 'Lavado completo', lugar: 'Espuma 127', km: 47650, costo: 38000, cert: true },
        { id: 'm2', vehiculo: 'v1', d: -121, tipo: 'aceite', titulo: 'Cambio de aceite y filtro', lugar: 'Taller de barrio', km: 43800, costo: 185000, cert: false, factura: true },
        { id: 'm3', vehiculo: 'v1', d: -151, tipo: 'tecno', titulo: 'Revisión técnico-mecánica', lugar: 'CDA Andén 170', km: 42900, costo: 0, cert: false, factura: true },
        { id: 'm4', vehiculo: 'v1', d: -290, tipo: 'llantas', titulo: 'Alineación y balanceo', lugar: 'Taller aliado', km: 36200, costo: 90000, cert: true },
        { id: 'm5', vehiculo: 'v2', d: -60, tipo: 'aceite', titulo: 'Cambio de aceite', lugar: 'Taller de barrio', km: 10000, costo: 65000, cert: false },
        { id: 'm6', vehiculo: 'v2', d: -71, tipo: 'lavado', titulo: 'Lavado sencillo', lugar: 'Punto Neutro', km: 9700, costo: 18000, cert: true },
      ],
      alertas: { soat: true, tecno: true, aceite: true, llantas: true, pyp: true, km: true, anticipacion: 30 },
      comercios: [...COMERCIOS, ...TALLERES, ...CDAS].map((c) => ({ ...c, km: kmDesdeCasa(c.pos) })),
      casa: CASA,
      serviciosTaller: SERVICIOS_TALLER,
      servicios: SERVICIOS_LAVADO,
      extras: EXTRAS,
      reservas: [...(demo.sinReserva ? [] : [reservaDemo]), ...reservasPasadas, ...agendaC1(S, minAhora, cierreHoy)],
      notificaciones,
      comercioPanel: 'c1',
    };
    DRS._extSemilla.forEach((fn) => fn(estado, demo));
    return estado;
  };
})();
