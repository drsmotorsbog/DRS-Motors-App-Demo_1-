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

  /* ---------------- teclado del celular ----------------
     En iOS (y en Chrome de Android) el teclado no achica la página: tapa la parte de abajo de
     la vista visual. Se mide con visualViewport y se pasa a --teclado en .tel; .hoja, .pie-cta
     y .pantalla lo usan (css/app.css) para que el campo y el botón de la hoja queden encima. */
  const CAMPO = 'input:not([type="checkbox"]):not([type="radio"]):not([type="range"]):not([type="button"]):not([type="submit"]):not([type="reset"]):not([type="file"]):not([type="color"]), textarea, select, [contenteditable="true"]';
  let tapaAntes = 0;
  function campoActivo() {
    const f = document.activeElement;
    const tel = U.$('#tel');
    return f && tel && f.matches && f.matches(CAMPO) && tel.contains(f) ? f : null;
  }
  function medirTeclado() {
    const tel = U.$('#tel');
    const vv = window.visualViewport;
    if (!tel) return;
    let tapa = 0;
    // Solo con la app a pantalla completa, un campo enfocado y sin zoom (el pellizco también achica la vista visual)
    if (vv && DRS.demo.enTelefono() && campoActivo() && Math.abs(vv.scale - 1) < 0.02) {
      tapa = Math.round(window.innerHeight - vv.height - vv.offsetTop);
      if (tapa < 80) tapa = 0;                     // barras del navegador o redondeos: un teclado mide más
    }
    if (tapa === tapaAntes) return;
    tel.style.setProperty('--teclado', `${tapa}px`);
    tel.classList.toggle('con-teclado', tapa > 0);
    if (!tapa && (window.scrollX || window.scrollY)) window.scrollTo(0, 0);   // iOS deja la página corrida al cerrar el teclado
    tapaAntes = tapa;
    if (tapa) setTimeout(asomar, 30);
  }
  /** Con el teclado abierto: el campo enfocado a la vista y, en una hoja, también el botón que le sigue. */
  function asomar() {
    const f = campoActivo();
    if (!f) return;
    const cont = f.closest('.hoja, .pantalla');
    if (!cont) return;
    const vv = window.visualViewport;
    const rc = cont.getBoundingClientRect();
    let arriba = Math.max(rc.top, vv ? vv.offsetTop : 0) + 8;
    let abajo = Math.min(rc.bottom, vv ? vv.offsetTop + vv.height : window.innerHeight) - 8;
    if (cont.classList.contains('pantalla')) {
      const cab = U.$('.cab, .exp-cab', cont);
      if (cab) arriba = Math.max(arriba, cab.getBoundingClientRect().bottom + 8);
      const pie = U.$('.pie-cta', cont);
      if (pie) abajo = Math.min(abajo, pie.getBoundingClientRect().top - 8);
    }
    const rf = f.getBoundingClientRect();
    let d = rf.bottom > abajo ? rf.bottom - abajo : rf.top < arriba ? rf.top - arriba : 0;
    if (cont.classList.contains('hoja')) {
      const siguen = U.$$('.btn', cont).filter((b) => f.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      const btn = siguen.find((b) => b.matches('.btn-luz, .btn-acero')) || siguen[0];     // el botón principal de la hoja
      if (btn) {
        const extra = btn.getBoundingClientRect().bottom - d - abajo;
        if (extra > 0) d += Math.min(extra, Math.max(0, rf.top - d - arriba));   // sin sacar el campo por arriba
      }
    }
    if (d) cont.scrollTop += d;
  }
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', medirTeclado);
    window.visualViewport.addEventListener('scroll', medirTeclado);
  }
  document.addEventListener('focusin', () => setTimeout(medirTeclado, 60));
  document.addEventListener('focusout', () => setTimeout(medirTeclado, 60));

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
