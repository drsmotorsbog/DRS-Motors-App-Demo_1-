/* DRS Motors · demo — catálogo de notificaciones para mostrar cómo le llegan al usuario
   Se lanzan desde las opciones de la demo (logo DRS o panel del presentador) o desde Perfil → Notificaciones.
   Cada aviso termina en una acción: al tocarlo, la app abre el paso siguiente. */
(function () {
  'use strict';
  const DRS = window.DRS;
  const U = DRS.util;
  const { html, crudo, ico, num, pesos } = U;

  const emitidos = {};   // avisos lanzados que no viven en el centro de notificaciones (WhatsApp)

  /** Datos con que se escriben los avisos: salen del estado, para que el aviso diga lo mismo que la
      pantalla a la que lleva. `extra` trae lo del momento (la reserva recién pagada, las cotizaciones). */
  function ctx(extra = {}) {
    const v = DRS.q.vehiculo('v1');
    const r = extra.r || DRS.q.activaUsuario() || DRS.q.reserva('DRS-4821');
    const com = r ? DRS.q.comercio(r.comercio) : DRS.q.comercio('c1');
    const u = DRS.q.usuario();
    const dias = (n) => `${n} ${n === 1 ? 'día' : 'días'}`;
    return {
      modelo: `${v.marca} ${v.linea.split(' ')[0]}`,
      nombre: u.nombre,
      r, com,
      id: r ? r.id : 'DRS-4821',
      hora: r ? U.horaTxt(r.hora) : '10:30 a. m.',
      cuando: !r || r.d === 0 ? 'hoy' : r.d === 1 ? 'mañana' : U.fechaLarga(DRS.reloj.dia(r.d)),
      srv: r ? r.servicio : 'Lavado completo',
      ac: DRS.calc.aceite(v),
      soat: DRS.calc.doc(v, 'soat'),
      tecno: DRS.calc.doc(v, 'tecno'),
      meta: u.meta,
      dias,
      extra,
    };
  }
  /** «vence en 12 días» o, si falta mucho, la fecha. */
  const venceTxt = (c, d) => (d.dias <= 0 ? 'venció' : d.dias <= 45 ? `vence en ${c.dias(d.dias)}` : `está al día hasta el ${U.fechaCorta(d.vence)}`);

  const ESCENARIOS = [
    { grupo: 'Documentos', id: 'soat30', ico: 'garantia', titulo: (c) => `Tu SOAT ${venceTxt(c, c.soat)}`, texto: () => 'Renuévalo desde la app: la póliza nueva empieza el día que vence la actual.', ir: { ruta: 'documento', p: { v: 'v1', doc: 'soat' } } },
    { grupo: 'Documentos', id: 'soat1', ico: 'garantia', titulo: () => 'Tu SOAT vence mañana', texto: () => 'Renuévalo hoy en dos minutos, sin papeles ni filas.', ir: { ruta: 'soat-comprar', p: { v: 'v1' } } },
    { grupo: 'Documentos', id: 'soat0', ico: 'alerta', titulo: () => 'Tu SOAT venció hoy', texto: () => 'Circular sin SOAT vigente tiene multa y pueden inmovilizar tu vehículo. Renuévalo ya.', ir: { ruta: 'soat-comprar', p: { v: 'v1' } } },
    { grupo: 'Documentos', id: 'tecno15', ico: 'certificado', titulo: (c) => `Tu tecnomecánica ${venceTxt(c, c.tecno)}`, texto: () => 'Agenda en un CDA aliado y paga desde la app, con precio DRS.', ir: { ruta: 'explorar', p: { tipo: 'cda' } } },
    { grupo: 'Mantenimiento', id: 'aceite', ico: 'kilometraje', titulo: (c) => `Te faltan ~${num(Math.round(c.ac.faltan / 10) * 10)} km para el cambio de aceite`, texto: () => 'Agenda en un taller aliado y queda en tu historial verificado.', ir: { ruta: 'mantenimiento', p: { v: 'v1', tipo: 'aceite' } } },
    { grupo: 'Mantenimiento', id: 'llantas', ico: 'llanta', titulo: () => 'Hora de revisar tus llantas', texto: () => 'Llevas 28.000 km con las mismas. Agenda alineación y balanceo.', ir: { ruta: 'mantenimiento', p: { v: 'v1', tipo: 'llantas' } } },
    { grupo: 'Mantenimiento', id: 'km', ico: 'editar', titulo: (c) => `¿Cuántos kilómetros tiene tu ${c.modelo}?`, texto: () => 'Actualízalo en 5 segundos y calculamos bien tu próximo mantenimiento.', ir: { ruta: 'garaje' } },
    { grupo: 'Pico y placa', id: 'pypNoche', ico: 'calendario', titulo: () => 'Mañana tienes pico y placa', texto: () => 'Tu carro no sale de 6:00 a. m. a 9:00 p. m. ¿Lo dejamos lavando?', ir: { ruta: 'explorar', p: { tipo: 'lavadero' } } },
    { grupo: 'Pico y placa', id: 'pypDia', ico: 'carro', titulo: () => 'Hoy tienes pico y placa', texto: () => 'Tu carro no sale hoy, buen día para dejarlo lavando.', ir: { ruta: 'explorar', p: { tipo: 'lavadero' } } },
    { grupo: 'Reservas', id: 'resConf', ico: 'calendario', titulo: () => 'Reserva confirmada', texto: (c) => `${c.srv} en ${c.com.nombre}, ${c.cuando} a las ${c.hora}. Código ${c.id}`, ir: (c) => ({ ruta: 'reserva', p: { id: c.id } }) },
    { grupo: 'Reservas', id: 'res1h', ico: 'horario', titulo: () => 'Tu lavado es en 1 hora', texto: (c) => `${c.com.nombre} · ${c.com.direccion}. Toca para ver cómo llegar.`, ir: (c) => ({ ruta: 'ruta', p: { id: c.com.id } }) },
    { grupo: 'Reservas', id: 'resListo', ico: 'check', titulo: (c) => `Tu ${c.modelo} está listo`, texto: (c) => `Pasa por él a ${c.com.nombre}. Muestra el código ${c.id} al llegar.`, ir: (c) => ({ ruta: 'reserva', p: { id: c.id } }) },
    { grupo: 'Reservas', id: 'resCalif', ico: 'comentar', titulo: (c) => `¿Cómo te fue en ${c.com.nombre}?`, texto: () => 'Califica el servicio y suma 50 puntos.', ir: (c) => ({ ruta: 'reserva', p: { id: c.id } }) },
    { grupo: 'Beneficios', id: 'promo', ico: 'precio', titulo: () => 'Promo cerca: −20 % en Espuma 127', texto: () => 'Lavado sencillo de martes a jueves, de 9:00 a 11:00 a. m.', ir: { ruta: 'comercio', p: { id: 'c1' } } },
    { grupo: 'Beneficios', id: 'puntos', ico: 'beneficios', titulo: () => 'Sumaste 440 puntos', texto: (c) => (c.meta.hechos === c.meta.total - 1 ? `Llevas ${c.meta.hechos} de ${c.meta.total} lavados: el próximo tiene 50 % de descuento.` : `Llevas ${c.meta.hechos} de ${c.meta.total} lavados en tu meta. Te faltan ${c.meta.total - 1 - c.meta.hechos} para el 50 %.`), ir: { ruta: 'beneficios' } },
    { grupo: 'Servicios', id: 'cotiz', ico: 'taller', titulo: (c) => `Tienes ${c.extra.n || 3} cotizaciones`, texto: (c) => (c.extra.desde ? `${c.extra.nombre} desde ${pesos(c.extra.desde)}. Compara y reserva.` : 'Cambio de aceite y filtro. Compara precios y reserva.'), ir: { ruta: 'cotizaciones', p: {} } },
    { grupo: 'Servicios', id: 'soatOk', ico: 'verificado', titulo: (c) => (c.extra.otro ? `SOAT expedido · ${U.placaTxt(c.extra.placa)}` : 'Tu SOAT quedó al día'), texto: (c) => (c.extra.otro ? 'La póliza quedó registrada en el RUNT. Te la enviamos al correo.' : 'La póliza ya está en Mi garaje. La descargas cuando quieras.'), ir: { ruta: 'documento', p: { v: 'v1', doc: 'soat' } } },
    { grupo: 'Servicios', id: 'informe', ico: 'peritaje', titulo: () => 'Tu informe vehicular está listo', texto: () => 'Propietarios, prendas, siniestros y precio de mercado. Toca para verlo.', ir: { ruta: 'informe', p: {} } },
    { grupo: 'WhatsApp', id: 'waConf', canal: 'whatsapp', ico: 'chat', titulo: () => 'DRS Motors', texto: (c) => `Hola, ${c.nombre}. Tu reserva ${c.id} en ${c.com.nombre} quedó confirmada para ${c.cuando} a las ${c.hora}` },
    { grupo: 'WhatsApp', id: 'waRecordatorio', canal: 'whatsapp', ico: 'chat', titulo: () => 'DRS Motors', texto: (c) => `Recordatorio: tu lavado en ${c.com.nombre} es en 1 hora. Responde 1 para confirmar o 2 para reprogramar.` },
  ];

  function construir(e, extra) {
    const c = ctx(extra);
    return { id: `demo-${e.id}-${Date.now()}`, d: 0, h: (() => { const a = DRS.reloj.ahora(); return U.deMin(a.getHours() * 60 + a.getMinutes()); })(),
      ico: e.ico, titulo: e.titulo(c), texto: e.texto(c), canal: e.canal || 'app', leida: false, ir: typeof e.ir === 'function' ? e.ir(c) : e.ir, accion: 'Abrir' };
  }

  DRS.avisos = {
    ctx,
    ESCENARIOS,
    lanzar(id, extra) {
      const e = ESCENARIOS.find((x) => x.id === id);
      if (!e) return;
      const n = construir(e, extra);
      if (n.canal === 'whatsapp') emitidos[n.id] = n;
      else DRS.cambiar((s) => { s.notificaciones.unshift(n); }, { tipo: 'notif-demo' });
      DRS.ios.avisar(n, { canal: n.canal });
    },
    buscar: (id) => emitidos[id] || null,
    /** Abre el destino de un aviso tocado (desde el banner o desde la pantalla bloqueada). */
    abrirDestino(n) {
      if (!n) return;
      if (n.id && DRS.estado.notificaciones.find((x) => x.id === n.id)) DRS.acc.notifLeer(n.id);
      if (n.canal === 'whatsapp') {
        if (DRS.pantallas.whatsapp) DRS.tel.ir('whatsapp', { contacto: 'DRS Motors', sub: 'DRS Motors · Bogotá', mensajes: [{ de: 'ellos', texto: n.texto, h: n.h }] });
        else DRS.tel.tostada('En la app real se abre WhatsApp');
        return;
      }
      if (n.ir) {
        const P = DRS.pantallas[n.ir.ruta];
        if (P && P.raiz) DRS.tel.tabIr(n.ir.ruta);
        else DRS.tel.ir(n.ir.ruta, n.ir.p || {});
      } else if (n.proxima) DRS.demo.proxima(n.proxima);
    },
  };

  /* ---------------- lista para las opciones de la demo ---------------- */
  DRS.avisos.lista = function () {
    const grupos = [...new Set(ESCENARIOS.map((e) => e.grupo))];
    const c = ctx();
    return String(html`${grupos.map((g) => html`<div class="menu-grupo"><div class="cap">${g}</div>${ESCENARIOS.filter((e) => e.grupo === g).map((e) => html`<button class="menu-item" data-a="avisos-lanzar" data-id="${e.id}">${ico(e.ico)}<span>${e.titulo(c)}</span>${e.canal === 'whatsapp' ? html`<span class="chip">WhatsApp</span>` : ''}</button>`)}</div>`)}`);
  };

  Object.assign(DRS.acciones, {
    'avisos-lanzar': (d) => { DRS.tel.cerrarHoja(true); setTimeout(() => DRS.avisos.lanzar(d.id), 120); },
    'avisos-bloqueo': () => {
      DRS.tel.cerrarHoja(true);
      if (DRS.ios.bloqueado()) DRS.ios.desbloquear(); else DRS.ios.bloquear();
      if (DRS.demo) setTimeout(() => DRS.demo.pintarLado(), 60);
    },
  });
})();
