/* DRS Motors · demo — opciones de la demo (lo que antes hacía la barra del escenario)
   En el celular se abren tocando el logo DRS; en el computador también viven en el
   panel de la izquierda. Sin sincronización con el CRM: aquí se simula al lavadero. */
(function () {
  'use strict';
  const DRS = window.DRS;
  const U = DRS.util;
  const { html, crudo, ico } = U;
  const demo = (DRS.demo = DRS.demo || {});

  /* ---------------- aviso de la demo (no es de la app) ---------------- */
  let tAviso;
  demo.aviso = function (titulo, texto) {
    const a = U.$('#aviso-escenario');
    if (!a) return;
    a.innerHTML = String(html`<b>${titulo}</b><span>${texto}</span>`);
    a.classList.add('ver');
    clearTimeout(tAviso);
    tAviso = setTimeout(() => a.classList.remove('ver'), 3800);
  };
  demo.proxima = (que) => demo.aviso('Próximamente', `«${que}» todavía no está en esta demo.`);
  // Compatibilidad: módulos anteriores llamaban al escenario
  DRS.escenario = { proxima: demo.proxima, aviso: demo.aviso, actualizar() { demo.pintarLado(); } };

  /* ---------------- ¿abierta como app instalada? ---------------- */
  demo.instalada = () => !!(window.navigator.standalone || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches));
  demo.enTelefono = () => !!(window.matchMedia && window.matchMedia('(max-width: 759px), (display-mode: standalone), (pointer: coarse) and (max-height: 500px)').matches);   // la misma condición de css/movil.css
  const esIOS = () => /iP(hone|ad|od)/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  let promptInstalar = null;                         // Android/Chrome ofrece su propio botón de instalar
  window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); promptInstalar = e; });

  /* ---------------- abrir una demo o volver al lanzador ---------------- */
  demo.abrir = function (id) {
    const v = DRS.variantes && DRS.variantes[id];
    if (!v) return;
    demo.cargando = true;
    DRS.CLAVE_ESTADO = `drs-app-${id}`;
    DRS.tel.ui = {};
    DRS.tel.configurar(v);
    DRS.iniciarEstado();
    demo.cargando = false;
    DRS.tel.tabIr(v.bienvenida);
    try { history.replaceState(null, '', `?demo=${v.numero}`); } catch (e) { /* file:// */ }
    demo.pintarLado();
    // Mientras se ve la bienvenida, se prepara el mapa de Bogotá
    const ocio = window.requestIdleCallback || ((fn) => setTimeout(fn, 900));
    ocio(() => { if (DRS.explorar && DRS.explorar.precalentar) DRS.explorar.precalentar(); });
  };
  demo.lanzador = function () {
    DRS.tel.cerrarHoja(true);
    if (DRS.ios.bloqueado()) DRS.ios.desbloquear();
    DRS.tel.configurar(null);
    DRS.tel.tabIr('lanzador');
    try { history.replaceState(null, '', location.pathname); } catch (e) { /* file:// */ }
    demo.pintarLado();
  };

  /* ---------------- simular al lavadero (la otra cara vive en el CRM) ---------------- */
  function pasoLavadero() {
    if (!DRS.variante || !DRS.estado) return null;
    const r = DRS.q.activaUsuario();
    if (!r) return null;
    const i = DRS.ESTADOS.findIndex((e) => e.id === r.estado);
    const sig = DRS.ESTADOS[i + 1];
    return sig ? { r, sig, ahora: DRS.ESTADOS[i] } : null;
  }
  demo.avanzarLavadero = function () {
    const x = pasoLavadero();
    if (!x) return;
    DRS.tel.cerrarHoja(true);
    DRS.acc.reservaAvanzar(x.r.id);
    demo.pintarLado();
  };

  /* ---------------- contenido de las opciones (hoja y panel lateral) ---------------- */
  function bloqueDemos() {
    const actual = DRS.variante ? DRS.variante.id : null;
    const vs = Object.values(DRS.variantes || {}).sort((a, b) => a.numero - b.numero);
    return html`<div class="dm-demos">${vs.map((v) => html`<button class="dm-demo" data-a="demo-abrir" data-v="${v.id}" aria-pressed="${v.id === actual ? 'true' : 'false'}"><b class="d d-26">${v.numero}</b><span>${v.nombre}</span></button>`)}</div>
      <button class="dm-fila" data-a="demo-lanzador">${ico('servicios')}<span>Ver las tres demos</span>${ico('chevron')}</button>`;
  }
  /** Barra de pestañas o botón +: se elige por demo, para compararlas en la misma propuesta. */
  const notaNav = (modo) => (modo === 'mas' ? 'Un botón + abajo a la derecha abre las secciones y el atajo.' : 'Las secciones en una barra abajo y el atajo aparte.');
  function bloqueNav() {
    const v = DRS.variante;
    const modo = DRS.tel.modoNav(v);
    if (!modo) return '';
    const op = (k, n) => html`<button type="button" data-a="nav-modo" data-modo="${k}" aria-pressed="${modo === k ? 'true' : 'false'}">${n}</button>`;
    return html`<div class="dm-grupo"><div class="cap">Navegación de la demo ${v.numero}</div>
      <div class="tema-sel dm-nav" role="group" aria-label="Navegación">${op('barra', 'Pestañas abajo')}${op('mas', 'Botón +')}</div>
      <p class="t11 dm-nav-nota">${notaNav(modo)}</p>
    </div>`;
  }
  function bloqueLavadero() {
    if (!DRS.variante) return '';
    const x = pasoLavadero();
    return html`<div class="dm-grupo"><div class="cap">Simular al lavadero</div>
      ${x ? html`<p class="t11">Reserva ${x.r.id}: «${x.ahora.nombre}». El lavadero la pasa a «${x.sig.nombre}» y te llega el aviso.</p>
        <button class="btn btn-borde btn-chico dm-accion" data-a="demo-lavadero">${ico('check', 's16')}${x.sig.accion ? x.sig.nombre : 'Avanzar'}</button>`
    : html`<p class="t11">No tienes reservas activas. Reserva un lavado y vuelve aquí para ver cómo te avisa el lavadero.</p>`}
    </div>`;
  }
  function contenido(enHoja) {
    const v = DRS.variante;
    return html`${enHoja ? html`<div class="hoja-cab"><div><div class="ceja">Opciones de la demo</div><h2 class="d d-34" style="margin-top:8px">${v ? `Demo ${v.numero} · ${v.nombre}` : 'DRS Motors'}</h2></div><button class="hoja-cerrar" data-a="hoja-cerrar" aria-label="Cerrar">${ico('cerrar')}</button></div>` : ''}
      <div class="dm-grupo"><div class="cap">Demos</div>${bloqueDemos()}</div>
      <div class="dm-grupo"><div class="cap">Tema</div>${crudo(DRS.tema.selector())}</div>
      ${bloqueNav()}
      ${bloqueLavadero()}
      ${v ? html`<div class="dm-grupo"><div class="cap">Notificaciones de ejemplo</div>
        <button class="dm-fila" data-a="demo-avisos">${ico('campana')}<span>Lanzar un aviso</span>${ico('chevron')}</button>
        <div class="dm-fila dm-switch"><span>${ico('telefono')}<span>Ver con el celular bloqueado</span></span><button class="inter" role="switch" aria-checked="${DRS.ios.bloqueado() ? 'true' : 'false'}" data-a="avisos-bloqueo" aria-label="Celular bloqueado"></button></div>
      </div>` : ''}
      <div class="dm-grupo"><div class="cap">Más</div>
        <button class="dm-fila" data-a="modelo-abrir">${ico('comision')}<span>Así gana DRS</span>${ico('chevron')}</button>
        ${demo.instalada() ? '' : html`<button class="dm-fila" data-a="instalar">${ico('descargar')}<span>Instalar en el celular</span>${ico('chevron')}</button>`}
        <a class="dm-fila" href="crm/">${ico('enlace-externo')}<span>Abrir el CRM del comercio</span>${ico('chevron')}</a>
        ${v ? html`<button class="dm-fila" data-a="demo-reiniciar">${ico('flecha')}<span>Reiniciar esta demo</span>${ico('chevron')}</button>` : ''}
      </div>`;
  }

  demo.menu = function () {
    DRS.tel.hoja(contenido(true), { clase: 'hoja-demo' });
  };

  /* Panel del presentador en computador (a la izquierda del iPhone) */
  demo.pintarLado = function () {
    const lado = U.$('#esc-lado');
    if (!lado) return;
    lado.innerHTML = String(html`<div class="esc-marca">${DRS.ui.logoH()}<span class="cap">Demo · datos ficticios</span></div>
      ${contenido(false)}
      <p class="t11 esc-nota">En el celular, toca el logo DRS dentro de la app para ver estas mismas opciones.</p>`);
  };

  /* ---------------- hojas: avisos de ejemplo, modelo e instalar ---------------- */
  demo.hojaAvisos = function () {
    DRS.tel.hoja(html`<div class="hoja-cab"><div><div class="ceja">Notificaciones de ejemplo</div><p class="t13" style="margin-top:6px">Toca una: la hoja se cierra y te llega como a un usuario de verdad.</p></div><button class="hoja-cerrar" data-a="hoja-cerrar" aria-label="Cerrar">${ico('cerrar')}</button></div>
      ${crudo(DRS.avisos.lista())}`, { clase: 'hoja-demo' });
  };
  demo.hojaModelo = function () {
    DRS.tel.hoja(html`<div class="hoja-cab"><div><div class="ceja">Modelo de negocio</div><h2 class="d d-34" style="margin-top:8px">Así gana DRS</h2></div><button class="hoja-cerrar" data-a="hoja-cerrar" aria-label="Cerrar">${ico('cerrar')}</button></div>
      ${DRS.modelo.cuerpo()}`, { clase: 'hoja-demo' });
  };
  demo.hojaInstalar = function () {
    if (promptInstalar) { promptInstalar.prompt(); promptInstalar = null; return; }
    const ios = esIOS();
    DRS.tel.hoja(html`<div class="hoja-cab"><div><div class="ceja">Instalar</div><h2 class="d d-34" style="margin-top:8px">DRS Motors en tu celular</h2></div><button class="hoja-cerrar" data-a="hoja-cerrar" aria-label="Cerrar">${ico('cerrar')}</button></div>
      ${ios ? html`<ol class="dm-pasos">
          <li><b class="d d-26">1</b><span>Abre esta página en <b class="t-1">Safari</b>.</span></li>
          <li><b class="d d-26">2</b><span>Toca <b class="t-1">Compartir</b> (el cuadro con la flecha hacia arriba).</span></li>
          <li><b class="d d-26">3</b><span>Elige <b class="t-1">Agregar a pantalla de inicio</b> y toca <b class="t-1">Agregar</b>.</span></li>
        </ol>` : html`<ol class="dm-pasos">
          <li><b class="d d-26">1</b><span>Abre esta página en <b class="t-1">Chrome</b>.</span></li>
          <li><b class="d d-26">2</b><span>Abre el menú <b class="t-1">⋮</b> y toca <b class="t-1">Instalar app</b> o <b class="t-1">Agregar a la pantalla principal</b>.</span></li>
        </ol>`}
      <p class="t11" style="margin-top:14px">Queda con el ícono de DRS Motors, abre a pantalla completa y funciona sin internet después de la primera vez.</p>`, { clase: 'hoja-demo' });
  };

  Object.assign(DRS.acciones, {
    'demo-menu': () => demo.menu(),
    'demo-abrir': (d) => { DRS.tel.cerrarHoja(true); demo.abrir(d.v); },
    'demo-lanzador': () => demo.lanzador(),
    'demo-lavadero': () => demo.avanzarLavadero(),
    'demo-avisos': () => demo.hojaAvisos(),
    'demo-reiniciar': () => {
      DRS.tel.cerrarHoja(true);
      demo.cargando = true;
      DRS.sembrar({});
      demo.cargando = false;
      DRS.tel.ui = {};
      DRS.tel.tabIr(DRS.variante.inicio, { anim: false });
      demo.pintarLado();
      demo.aviso('Demo reiniciada', `La demo ${DRS.variante.numero} vuelve a su estado inicial.`);
    },
    'nav-modo': (d) => {
      DRS.tel.cambiarNav(d.modo);
      U.$$('.dm-nav [data-modo]').forEach((b) => b.setAttribute('aria-pressed', b.dataset.modo === d.modo ? 'true' : 'false'));
      U.$$('.dm-nav-nota').forEach((x) => { x.textContent = notaNav(d.modo); });
      if (!DRS.demo.enTelefono()) demo.pintarLado();
    },
    'modelo-abrir': () => demo.hojaModelo(),
    instalar: () => demo.hojaInstalar(),
  });
})();
