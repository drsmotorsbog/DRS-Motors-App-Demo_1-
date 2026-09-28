/* DRS Motors · demo — catálogo de notificaciones para mostrar cómo le llegan al usuario
   Se lanzan desde las opciones de la demo (logo DRS o panel del presentador) o desde Perfil → Notificaciones.
   Cada aviso termina en una acción: al tocarlo, la app abre el paso siguiente. */
(function () {
  'use strict';
  const DRS = window.DRS;
  const U = DRS.util;
  const { html, crudo, ico, num, pesos } = U;

  const emitidos = {};   // avisos lanzados que no viven en el centro de notificaciones (WhatsApp)

  function ctx() {
    const v = DRS.q.vehiculo('v1');
    const r = DRS.q.reserva('DRS-4821');
    return {
      modelo: `${v.marca} ${v.linea.split(' ')[0]}`,
      hora: r ? U.horaTxt(r.hora) : '10:30 a. m.',
      ac: DRS.calc.aceite(v),
    };
  }

  const ESCENARIOS = [
    { grupo: 'Documentos', id: 'soat30', ico: 'garantia', titulo: () => 'Tu SOAT vence en 30 días', texto: () => 'Renuévalo desde la app: la póliza nueva empieza el día que vence la actual.', ir: { ruta: 'documento', p: { v: 'v1', doc: 'soat' } } },
    { grupo: 'Documentos', id: 'soat1', ico: 'garantia', titulo: () => 'Tu SOAT vence mañana', texto: () => 'Renuévalo hoy en dos minutos, sin papeles ni filas.', ir: { ruta: 'soat-comprar', p: { v: 'v1' } } },
    { grupo: 'Documentos', id: 'soat0', ico: 'alerta', titulo: () => 'Tu SOAT venció hoy', texto: () => 'Circular sin SOAT vigente tiene multa y pueden inmovilizar tu vehículo. Renuévalo ya.', ir: { ruta: 'soat-comprar', p: { v: 'v1' } } },
    { grupo: 'Documentos', id: 'tecno15', ico: 'certificado', titulo: () => 'Tu tecnomecánica vence en 15 días', texto: () => 'Agenda en un CDA aliado y paga desde la app.', ir: { ruta: 'explorar', p: { tipo: 'cda' } } },
    { grupo: 'Mantenimiento', id: 'aceite', ico: 'kilometraje', titulo: (c) => `Te faltan ~${num(Math.round(c.ac.faltan / 10) * 10)} km para el cambio de aceite`, texto: () => 'Agenda en un taller aliado y queda en tu historial verificado.', ir: { ruta: 'mantenimiento', p: { v: 'v1', tipo: 'aceite' } } },
    { grupo: 'Mantenimiento', id: 'llantas', ico: 'llanta', titulo: () => 'Hora de revisar tus llantas', texto: () => 'Llevas 28.000 km con las mismas. Agenda alineación y balanceo.', ir: { ruta: 'mantenimiento', p: { v: 'v1', tipo: 'llantas' } } },
    { grupo: 'Mantenimiento', id: 'km', ico: 'editar', titulo: (c) => `¿Cuántos kilómetros tiene tu ${c.modelo}?`, texto: () => 'Actualízalo en 5 segundos y calculamos bien tu próximo mantenimiento.', ir: { ruta: 'garaje' } },
    { grupo: 'Pico y placa', id: 'pypNoche', ico: 'calendario', titulo: () => 'Mañana tienes pico y placa', texto: () => 'Tu carro no sale de 6:00 a. m. a 9:00 p. m. ¿Lo dejamos lavando?', ir: { ruta: 'explorar', p: { tipo: 'lavadero' } } },
    { grupo: 'Pico y placa', id: 'pypDia', ico: 'carro', titulo: () => 'Hoy tienes pico y placa', texto: () => 'Tu carro no sale hoy, buen día para dejarlo lavando.', ir: { ruta: 'explorar', p: { tipo: 'lavadero' } } },
    { grupo: 'Reservas', id: 'resConf', ico: 'calendario', titulo: () => 'Reserva confirmada', texto: (c) => `Lavado completo en Espuma 127, hoy a las ${c.hora}. Código DRS-4821.`, ir: { ruta: 'reserva', p: { id: 'DRS-4821' } } },
    { grupo: 'Reservas', id: 'res1h', ico: 'horario', titulo: () => 'Tu lavado es en 1 hora', texto: () => 'Espuma 127 · Calle 127 # 19-40. Toca para ver cómo llegar.', ir: { ruta: 'ruta', p: { id: 'c1' } } },
    { grupo: 'Reservas', id: 'resListo', ico: 'check', titulo: (c) => `Tu ${c.modelo} está listo`, texto: () => 'Pasa por él a Espuma 127. Muestra el código DRS-4821 al llegar.', ir: { ruta: 'reserva', p: { id: 'DRS-4821' } } },
    { grupo: 'Reservas', id: 'resCalif', ico: 'comentar', titulo: () => '¿Cómo te fue en Espuma 127?', texto: () => 'Califica el servicio y suma 50 puntos.', ir: { ruta: 'reserva', p: { id: 'DRS-4821' } } },
    { grupo: 'Beneficios', id: 'promo', ico: 'precio', titulo: () => 'Promo cerca: −20 % en Espuma 127', texto: () => 'Lavado sencillo de martes a jueves, de 9:00 a 11:00 a. m.', ir: { ruta: 'comercio', p: { id: 'c1' } } },
    { grupo: 'Beneficios', id: 'puntos', ico: 'beneficios', titulo: () => 'Sumaste 440 puntos', texto: () => 'Llevas 4 de 5 lavados: el próximo tiene 50 % de descuento.', ir: { ruta: 'beneficios' } },
    { grupo: 'Servicios', id: 'cotiz', ico: 'taller', titulo: () => 'Tienes 3 cotizaciones', texto: () => 'Cambio de aceite y filtro desde $ 165.000. Compara y reserva.', ir: { ruta: 'cotizaciones', p: {} } },
    { grupo: 'Servicios', id: 'soatOk', ico: 'verificado', titulo: () => 'Tu SOAT quedó al día', texto: () => 'La póliza ya está en Mi garaje. La descargas cuando quieras.', ir: { ruta: 'documento', p: { v: 'v1', doc: 'soat' } } },
    { grupo: 'Servicios', id: 'informe', ico: 'peritaje', titulo: () => 'Tu informe vehicular está listo', texto: () => 'Propietarios, prendas, siniestros y precio de mercado. Toca para verlo.', ir: { ruta: 'informe', p: {} } },
    { grupo: 'WhatsApp', id: 'waConf', canal: 'whatsapp', ico: 'chat', titulo: () => 'DRS Motors', texto: (c) => `Hola, Andrés. Tu reserva DRS-4821 en Espuma 127 quedó confirmada para hoy a las ${c.hora}.` },
    { grupo: 'WhatsApp', id: 'waRecordatorio', canal: 'whatsapp', ico: 'chat', titulo: () => 'DRS Motors', texto: () => 'Recordatorio: tu lavado en Espuma 127 es en 1 hora. Responde 1 para confirmar o 2 para reprogramar.' },
  ];

  function construir(e) {
    const c = ctx();
    return { id: `demo-${e.id}-${Date.now()}`, d: 0, h: (() => { const a = DRS.reloj.ahora(); return U.deMin(a.getHours() * 60 + a.getMinutes()); })(),
      ico: e.ico, titulo: e.titulo(c), texto: e.texto(c), canal: e.canal || 'app', leida: false, ir: e.ir, accion: 'Abrir' };
  }

  DRS.avisos = {
    ESCENARIOS,
    lanzar(id) {
      const e = ESCENARIOS.find((x) => x.id === id);
      if (!e) return;
      const n = construir(e);
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
        if (DRS.pantallas.whatsapp) DRS.tel.ir('whatsapp', { contacto: 'DRS Motors', sub: 'Cuenta de empresa', mensajes: [{ de: 'ellos', texto: n.texto, h: n.h }] });
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
