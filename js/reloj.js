/* DRS Motors · demo — reloj de la demo, festivos y pico y placa de Bogotá
   Regla 2026 para vehículos particulares (Secretaría Distrital de Movilidad):
   lunes a viernes, 6:00 a. m. – 9:00 p. m.; en días impares circulan las placas
   terminadas en 1-5 y en días pares las terminadas en 6-0. No aplica sábados,
   domingos ni festivos. Las motos están exentas.
   Fuentes: bogota.gov.co (calendario de septiembre de 2026) y
   bogota.gov.co «Pico y Placa: motos están exentas de esta medida». */
(function () {
  'use strict';
  const DRS = window.DRS;
  const U = DRS.util;

  // Festivos de Colombia 2026 (Ley 51 de 1983, «Ley Emiliani»; Pascua el 5 de abril).
  const FESTIVOS = new Set([
    '2026-01-01', '2026-01-12', '2026-03-23', '2026-04-02', '2026-04-03', '2026-05-01', '2026-05-18',
    '2026-06-08', '2026-06-15', '2026-06-29', '2026-07-20', '2026-08-07', '2026-08-17', '2026-10-12',
    '2026-11-02', '2026-11-16', '2026-12-08', '2026-12-25',
  ]);
  const NOMBRE_FESTIVO = { '2026-10-12': 'Día de la Raza', '2026-11-02': 'Todos los Santos', '2026-11-16': 'Independencia de Cartagena', '2026-12-08': 'Inmaculada Concepción', '2026-12-25': 'Navidad' };

  const REGLA = {
    ciudad: 'Bogotá',
    horario: '6:00 a. m. – 9:00 p. m.',
    fuente: 'Secretaría Distrital de Movilidad · calendario 2026',
  };

  /** Hora de la demo: la real, salvo que la demo fije fecha u hora (fuera de horario fija las 10:12 a. m. de hoy). */
  function ahora() {
    const demo = DRS.estado && DRS.estado.demo;
    if (!demo || (!demo.fecha && !demo.hora)) return new Date();
    const d = demo.fecha ? U.deIso(demo.fecha) : U.sinHora(new Date());
    const [h, m] = (demo.hora || '10:12').split(':').map(Number);
    d.setHours(h, m, 0, 0);
    return d;
  }
  const hoy = () => U.sinHora(ahora());
  /** Fecha real de un desfase en días respecto al «hoy» de la demo. */
  const dia = (desfase) => U.sumarDias(hoy(), desfase);
  const esFestivo = (d) => FESTIVOS.has(U.isoDia(d));
  const ultimoDigito = (placa) => { const m = placa.match(/(\d)(?!.*\d)/); return m ? Number(m[1]) : null; };

  /** Estado del pico y placa de un vehículo en una fecha. */
  function picoPlaca(d, veh) {
    const base = { fecha: d, digito: ultimoDigito(veh.placa) };
    if (veh.tipo === 'moto') return { ...base, aplica: false, restringido: false, motivo: 'moto' };
    const dow = d.getDay();
    if (dow === 0 || dow === 6) return { ...base, aplica: false, restringido: false, motivo: dow === 0 ? 'domingo' : 'sábado' };
    if (esFestivo(d)) return { ...base, aplica: false, restringido: false, motivo: 'festivo', festivo: NOMBRE_FESTIVO[U.isoDia(d)] || 'festivo' };
    const par = d.getDate() % 2 === 0;
    const circulan = par ? [6, 7, 8, 9, 0] : [1, 2, 3, 4, 5];
    const noCirculan = par ? [1, 2, 3, 4, 5] : [6, 7, 8, 9, 0];
    return { ...base, aplica: true, par, circulan, noCirculan, restringido: noCirculan.includes(base.digito) };
  }

  /** Semana (lunes a domingo) que contiene la fecha. */
  function semana(d) {
    const dow = (d.getDay() + 6) % 7; // lunes = 0
    const lunes = U.sumarDias(d, -dow);
    return Array.from({ length: 7 }, (_, i) => U.sumarDias(lunes, i));
  }

  /** Primer día hábil, desde la fecha dada, en que el vehículo tiene pico y placa. */
  function proximoRestringido(desde, veh) {
    for (let i = 0; i < 21; i++) {
      const d = U.sumarDias(desde, i);
      if (picoPlaca(d, veh).restringido) return d;
    }
    return null;
  }

  /** Próximo puente festivo (festivo en lunes) dentro de N días. */
  function proximoPuente(desde, dentro = 21) {
    for (let i = 1; i <= dentro; i++) {
      const d = U.sumarDias(desde, i);
      if (esFestivo(d) && d.getDay() === 1) return { lunes: d, sabado: U.sumarDias(d, -2), nombre: NOMBRE_FESTIVO[U.isoDia(d)] || 'festivo' };
    }
    return null;
  }

  DRS.reloj = { ahora, hoy, dia, esFestivo, picoPlaca, semana, proximoRestringido, proximoPuente, REGLA };
})();
