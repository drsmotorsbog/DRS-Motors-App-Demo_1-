/* DRS Motors · demos — estado de una demo
   Cada demo guarda lo suyo por separado en este navegador (la app 1, 2 y 3 y el CRM
   no se mezclan): la clave la fija la página en DRS.CLAVE_ESTADO antes de iniciar.
   «Reiniciar» vuelve a la semilla. */
(function () {
  'use strict';
  const DRS = window.DRS;
  const U = DRS.util;
  const clave = () => DRS.CLAVE_ESTADO || 'drs-demo-v1';
  const oyentes = {};

  DRS.en = (evento, fn) => { (oyentes[evento] = oyentes[evento] || []).push(fn); };
  DRS.emitir = (evento, datos) => { (oyentes[evento] || []).forEach((fn) => fn(datos)); };

  function guardar() {
    try { localStorage.setItem(clave(), JSON.stringify(DRS.estado)); } catch (e) { /* navegador sin almacenamiento: la demo sigue igual */ }
  }
  function cargar() {
    try {
      const s = JSON.parse(localStorage.getItem(clave()) || 'null');
      return s && s.version === DRS.SEMILLA_VERSION ? s : null;
    } catch (e) { return null; }
  }

  /** Fuera del horario de los lavaderos la demo se ubica a las 10:12 a. m. de hoy, para que
      siempre haya reservas por venir y franjas libres, se presente a la hora que se presente. */
  DRS.horaDemo = function () {
    const a = new Date();
    const m = a.getHours() * 60 + a.getMinutes();
    const cierre = a.getDay() === 0 ? 13 * 60 : 17 * 60;
    return m < 7 * 60 + 30 || m > cierre ? '10:12' : null;
  };

  /** Arranca con lo guardado (si es de hoy) o con la semilla. */
  DRS.iniciarEstado = function () {
    const guardado = cargar();                      // si cambia la forma de los datos, se sube DRS.SEMILLA_VERSION
    if (guardado && guardado.demo && guardado.demo.creado === U.isoDia(new Date())) { DRS.estado = guardado; return; }
    DRS.sembrar({});                                // cada día la demo empieza de nuevo
  };

  /** Deja la demo como nueva. demo = { fecha, hora } */
  DRS.sembrar = function (demo) {
    if (demo.hora === undefined && !demo.fecha) demo = { ...demo, hora: DRS.horaDemo() };
    DRS.estado = { demo: { fecha: demo.fecha || null, hora: demo.hora || null } }; // el reloj lee esto al sembrar
    DRS.estado = DRS.semilla(demo);
    DRS.estado.demo.creado = U.isoDia(new Date());
    guardar();
    DRS.emitir('reinicio');
    DRS.emitir('cambio', { tipo: 'reinicio' });
  };

  /** Aplica una mutación, guarda y avisa a las dos caras. */
  DRS.cambiar = function (fn, meta = {}) {
    fn(DRS.estado);
    guardar();
    DRS.emitir('cambio', meta);
  };

  /* ---------------- consultas ---------------- */
  const S = () => DRS.estado;
  DRS.q = {
    usuario: () => S().usuario,
    vehiculos: () => S().vehiculos,
    vehiculo: (id) => S().vehiculos.find((v) => v.id === (id || S().vehiculoActivo)),
    comercio: (id) => S().comercios.find((c) => c.id === id),
    reserva: (id) => S().reservas.find((r) => r.id === id),
    reservasUsuario: () => S().reservas.filter((r) => r.usuario === 'u1'),
    activaUsuario: () => S().reservas.find((r) => r.usuario === 'u1' && ['confirmada', 'recibido', 'en_proceso', 'listo'].includes(r.estado)),
    agenda: (comercio) => S().reservas.filter((r) => r.comercio === comercio && r.d === 0 && r.estado !== 'cancelada').sort((a, b) => U.aMin(a.hora) - U.aMin(b.hora)),
    mantenimientos: (v) => S().mantenimientos.filter((m) => m.vehiculo === v).sort((a, b) => b.d - a.d),
    noLeidas: () => S().notificaciones.filter((n) => !n.leida).length,
  };

  /* ---------------- estados de una reserva ---------------- */
  DRS.ESTADOS = [
    { id: 'confirmada', nombre: 'Confirmada', accion: 'Recibir vehículo' },
    { id: 'recibido', nombre: 'Vehículo recibido', accion: 'Iniciar servicio' },
    { id: 'en_proceso', nombre: 'En proceso', accion: 'Marcar como listo' },
    { id: 'listo', nombre: 'Listo para recoger', accion: 'Entregar y cerrar' },
    { id: 'finalizada', nombre: 'Finalizada', accion: null },
  ];
  DRS.estadoInfo = (id) => DRS.ESTADOS.find((e) => e.id === id);

  /* ---------------- acciones ---------------- */
  const horaAhora = () => { const a = DRS.reloj.ahora(); return U.deMin(a.getHours() * 60 + a.getMinutes()); };

  DRS.acc = {
    vehiculoActivar(id) { DRS.cambiar((s) => { s.vehiculoActivo = id; }, { tipo: 'vehiculo' }); },

    kmActualizar(vid, km) {
      DRS.cambiar((s) => { const v = s.vehiculos.find((x) => x.id === vid); v.km = km; v.kmD = 0; }, { tipo: 'km' });
    },

    notifLeer(id) { DRS.cambiar((s) => { s.notificaciones.forEach((n) => { if (!id || n.id === id) n.leida = true; }); }, { tipo: 'notif' }); },

    alerta(clave) { DRS.cambiar((s) => { s.alertas[clave] = !s.alertas[clave]; }, { tipo: 'alertas' }); },

    /** El comercio avanza la reserva un estado. Cada cambio avisa al usuario en la app. */
    reservaAvanzar(id) {
      const r = DRS.q.reserva(id);
      const i = DRS.ESTADOS.findIndex((e) => e.id === r.estado);
      const sig = DRS.ESTADOS[i + 1];
      if (!sig) return;
      const h = horaAhora();
      let aviso = null;
      let puntos = 0;
      DRS.cambiar((s) => {
        const res = s.reservas.find((x) => x.id === id);
        res.estado = sig.id;
        (res.historial = res.historial || []).push({ estado: sig.id, d: 0, h });
        if (res.usuario !== 'u1') return;
        const veh = s.vehiculos.find((v) => v.id === res.vehiculo);
        const com = s.comercios.find((c) => c.id === res.comercio);
        const modelo = `${veh.marca} ${veh.linea.split(' ')[0]}`;
        const textos = {
          recibido: [`Recibimos tu ${modelo}`, `${com.nombre} ya tiene tu vehículo. Te avisamos cuando empiece el servicio.`],
          en_proceso: [`Tu ${modelo} está en proceso`, `${res.servicio} en la bahía ${res.bahia} de ${com.nombre}.`],
          listo: [`Tu ${modelo} está listo`, `Pasa por él a ${com.nombre}. Muestra el código ${res.id} al llegar.`],
          finalizada: ['Servicio entregado', `Gracias por usar DRS. Califica tu experiencia en ${com.nombre}.`],
        };
        const [titulo, texto] = textos[sig.id];
        const n = { id: `n${Date.now()}`, d: 0, h, ico: sig.id === 'listo' ? 'check' : 'calendario', titulo, texto, leida: false,
          ir: { ruta: 'reserva', p: { id } }, accion: sig.id === 'listo' ? 'Ver reserva' : 'Seguir' };
        s.notificaciones.unshift(n);
        aviso = n;
        if (sig.id === 'listo') {
          // Mantenimiento certificado y puntos: 1 punto por cada $ 100 pagados en la app (valor de ejemplo)
          puntos = Math.round(res.total / 100);
          s.usuario.puntos += puntos;
          s.mantenimientos.push({ id: `m${Date.now()}`, vehiculo: res.vehiculo, d: 0, tipo: 'lavado', titulo: res.servicio, lugar: com.nombre,
            km: veh.km, costo: res.total, cert: true, nuevo: true, reserva: res.id });
          res.puntos = puntos;
          (s.movPuntos = s.movPuntos || []).unshift({ d: 0, txt: `${res.servicio} · ${com.nombre}`, pts: puntos });
        }
      }, { tipo: 'reserva', id, estado: sig.id });
      if (aviso) DRS.emitir('aviso', { notif: aviso, puntos });
    },

    reservaCalificar(id, nota, fichas, comentario) {
      let puntos = 50; // valor de ejemplo
      DRS.cambiar((s) => {
        const r = s.reservas.find((x) => x.id === id);
        r.nota = nota; r.fichas = fichas; r.comentario = comentario;
        s.usuario.puntos += puntos;
        const com = s.comercios.find((c) => c.id === r.comercio);
        (s.movPuntos = s.movPuntos || []).unshift({ d: 0, txt: `Calificaste ${com ? com.nombre : 'el servicio'}`, pts: puntos });
      }, { tipo: 'calificacion', id });
      DRS.emitir('puntos', { puntos, motivo: 'Calificación enviada' });
    },
  };
})();
