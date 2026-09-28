/* DRS Motors · app del celular — arranque y acciones (un solo manejador de clics)
   Abre el lanzador (Demo 1, 2 y 3) o, con ?demo=N en la dirección, directo esa demo.
   En computador el iPhone se ve dibujado y escalado; en el celular la app ocupa la pantalla. */
(function () {
  'use strict';
  const DRS = window.DRS;
  const U = DRS.util;

  const leerP = (d) => { try { return JSON.parse(d.p || '{}'); } catch (e) { return {}; } };
  const horaAhora = () => { const a = DRS.reloj.ahora(); return U.deMin(a.getHours() * 60 + a.getMinutes()); };

  Object.assign(DRS.acciones, {
    /* navegación del celular */
    ir: (d) => { DRS.tel.cerrarHoja(true); DRS.tel.ir(d.ruta, leerP(d)); },
    atras: () => DRS.tel.atras(),
    tab: (d) => { if (d.tab === 'reservas') DRS.tel.ui.resSeg = null; DRS.tel.tabIr(d.tab); },
    proxima: (d) => DRS.demo.proxima(d.que),

    /* hojas */
    'hoja-cerrar': () => DRS.tel.cerrarHoja(),
    'hoja-vehiculo': () => DRS.hojaVehiculo(),
    'hoja-km': (d) => DRS.hojaKm(d.v),
    vehiculo: (d) => {
      DRS.acc.vehiculoActivar(d.id);
      if (d.cerrar) { DRS.tel.cerrarHoja(); DRS.tel.tostada(`Ahora ves tu ${DRS.ui.modelo(DRS.q.vehiculo())}`); }
    },
    'km-guardar': (d) => {
      const h = DRS.tel.hojaActual();
      const km = Number(String(U.$('#km-in', h).value).replace(/\D/g, ''));
      const v = DRS.q.vehiculo(d.v);
      if (!km || km < v.km) { U.$('#km-ayuda', h).textContent = `Escribe un kilometraje igual o mayor a ${U.num(v.km)} km.`; return; }
      DRS.acc.kmActualizar(d.v, km);
      DRS.tel.cerrarHoja();
      DRS.tel.tostada('Kilometraje actualizado');
    },

    /* documentos y alertas */
    consultar: async (d) => {
      DRS.tel.ui.consultando = `${d.v}:${d.doc}`;
      DRS.tel.refrescar();
      await U.espera(1600);
      DRS.tel.ui.consultando = null;
      DRS.cambiar((s) => { s.vehiculos.find((v) => v.id === d.v)[d.doc].consulta = { d: 0, h: horaAhora() }; }, { tipo: 'consulta' });
      DRS.tel.tostada('Consulta al RUNT actualizada, sin cambios');
    },
    descargar: (d) => DRS.tel.tostada(`${d.que || 'Documento'} descargado (simulado)`, 'descargar'),
    alerta: (d) => DRS.acc.alerta(d.k),

    /* notificaciones */
    notif: (d) => {
      const n = DRS.estado.notificaciones.find((x) => x.id === d.id) || DRS.avisos.buscar(d.id);
      if (!n) return;
      U.$$('.aviso').forEach((a) => a.remove());
      DRS.avisos.abrirDestino(n);
    },
    'notif-todas': () => DRS.acc.notifLeer(),

    /* reservas y calificación */
    'res-seg': (d) => { DRS.tel.ui.resSeg = d.k; DRS.tel.refrescar(); },
    'hoja-calificar': (d) => DRS.hojaCalificar(d.id),
    'calif-nota': (d) => { DRS.tel.ui.calif.nota = Number(d.n); DRS.hojaCalificar.redibujar(); },
    'calif-ficha': (d) => {
      const f = DRS.tel.ui.calif.fichas;
      const i = f.indexOf(d.f);
      if (i >= 0) f.splice(i, 1); else f.push(d.f);
      DRS.hojaCalificar.redibujar();
    },
    'calif-enviar': () => {
      const c = DRS.tel.ui.calif;
      const txt = U.$('#calif-txt', DRS.tel.hojaActual());
      DRS.acc.reservaCalificar(c.id, c.nota, c.fichas.slice(), txt ? txt.value.trim() : '');
      DRS.tel.cerrarHoja();
    },
  });

  document.addEventListener('click', (ev) => {
    const el = ev.target.closest('[data-a]');
    if (!el || el.disabled || el.getAttribute('aria-disabled') === 'true') return;
    const fn = DRS.acciones[el.dataset.a];
    if (!fn) return;
    ev.preventDefault();
    fn(el.dataset, el, ev);
  });
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape' && DRS.tel.hojaActual()) DRS.tel.cerrarHoja();
    if (ev.key === 'Enter' && ev.target.id === 'km-in') { const b = U.$('[data-a="km-guardar"]'); if (b) b.click(); }
  });
  // iOS: el pellizco de la página no hace zoom (el mapa tiene el suyo)
  document.addEventListener('gesturestart', (ev) => ev.preventDefault());

  /* ---------------- escala del iPhone dibujado en computador ---------------- */
  function escalar() {
    const W = window.innerWidth, H = window.innerHeight;
    let k = 1;
    if (!DRS.demo.enTelefono()) {
      const lado = W >= 1024 ? 300 + 56 : 0;
      k = Math.min(1, (H - 48) / (852 + 26), (W - lado - 48) / (393 + 26));
      k = Math.max(0.5, k);
    }
    document.documentElement.style.setProperty('--k', k.toFixed(4));
  }

  function arrancar() {
    U.$('#sprites').innerHTML = window.DRS_MARCA.iconos + window.DRS_MARCA.logos + window.DRS_ICONOS_APP;
    DRS.tema.aplicar();
    DRS.CLAVE_ESTADO = 'drs-app-v1';                 // estado neutro mientras se ve el lanzador
    DRS.iniciarEstado();
    DRS.tel.iniciar(U.$('#tel'));
    DRS.ios.iniciar();

    let noLeidasAntes = DRS.q.noLeidas();
    DRS.en('cambio', () => {
      if (DRS.demo.cargando) return;
      DRS.tel.refrescar();
      DRS.tel.reloj();
      DRS.demo.pintarLado();
      const n = DRS.q.noLeidas();
      if (n > noLeidasAntes) U.$$('.badge').forEach((b) => b.classList.add('late'));
      noLeidasAntes = n;
    });
    DRS.en('aviso', ({ notif, puntos }) => {
      DRS.ios.avisar(notif);
      if (puntos) setTimeout(() => DRS.tel.tostada(`+${U.num(puntos)} puntos · mantenimiento verificado en Mi garaje`), 1400);
    });
    DRS.en('puntos', ({ puntos, motivo }) => DRS.tel.tostada(`${motivo} · +${puntos} puntos`));
    DRS.en('tema', ({ cambio }) => { if (cambio) { DRS.tel.repintar(); DRS.demo.pintarLado(); } });

    window.addEventListener('resize', escalar);
    escalar();

    const pedida = Number(new URLSearchParams(location.search).get('demo'));
    const v = pedida && DRS.variantes[`v${pedida}`];
    if (v) DRS.demo.abrir(v.id);
    else { DRS.tel.configurar(null); DRS.tel.tabIr('lanzador', { anim: false }); }
    DRS.demo.pintarLado();
    DRS.tel.intro();

    // Funciona sin internet después de la primera visita (solo servida por https o localhost)
    if ('serviceWorker' in navigator && /^https?:$/.test(location.protocol)) {
      navigator.serviceWorker.register('sw.js').catch(() => { /* sin caché: la demo sigue funcionando en línea */ });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
})();
