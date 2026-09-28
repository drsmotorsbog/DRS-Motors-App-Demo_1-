/* DRS Motors · demo — el celular: pila de pantallas, barra inferior de cada demo, hojas y avisos
   Cada demo (js/variantes/) declara sus pestañas, su botón flotante, su bienvenida y su inicio.
   Las pantallas de servicio (explorar, reservar, SOAT, informe…) son las mismas en las tres. */
(function () {
  'use strict';
  const DRS = window.DRS;
  const U = DRS.util;
  const { html, ico } = U;

  const P = (DRS.pantallas = DRS.pantallas || {});   // P[ruta] = { raiz, render(p, ctx), alMontar?(el,p), alRefrescar?(el,p) }
  const tel = (DRS.tel = { pila: [], tab: null, ui: {}, comoPestana: false });
  let raiz, vista, nav, capa, reloj;

  const V = () => DRS.variante || null;
  const pestanas = () => (V() ? V().tabs : []);
  const esPestana = (id) => pestanas().some((t) => t.id === id);

  /** Nombres de siempre (inicio, bienvenida) que cada demo resuelve a su propia pantalla. */
  function resolver(id) {
    const v = V();
    if (!v) return id;
    if (id === 'inicio') return v.inicio;
    if (id === 'bienvenida') return v.bienvenida;
    return id;
  }

  tel.iniciar = function (el) {
    raiz = el;
    vista = U.$('#tel-vista', el);
    nav = U.$('#tel-nav', el);
    capa = U.$('#tel-capa', el);
    reloj = U.$('#tel-hora', el);
    tel.reloj();
    setInterval(tel.reloj, 15000);
  };

  /** Arma la barra inferior de la demo elegida (o ninguna, en el lanzador y en la demo 3). */
  tel.configurar = function (variante) {
    DRS.variante = variante || null;
    raiz.className = 'tel' + (variante ? ` ${variante.clase}` : ' sin-demo');
    const v = V();
    if (!v || !v.tabs.length) { nav.innerHTML = ''; nav.classList.add('oculta'); return; }
    const fab = v.fab;
    nav.dataset.n = String(v.tabs.length);
    nav.innerHTML = String(html`<div class="nav-barra" role="tablist" aria-label="Secciones" style="grid-template-columns:repeat(${v.tabs.length},1fr)">${v.tabs.map((t) => html`<button class="nav-tab" role="tab" data-a="tab" data-tab="${t.id}">${ico(t.ico)}<span>${t.nombre}</span></button>`)}</div>${fab ? html`<button class="fab" data-a="ir" data-ruta="${fab.ruta}" data-p='${JSON.stringify(fab.p || {})}' aria-label="${fab.etiqueta || fab.nombre}">${ico(fab.ico)}<span>${fab.nombre}</span></button>` : ''}`);
  };

  tel.reloj = function () {
    const a = DRS.reloj.ahora();
    if (reloj) reloj.textContent = `${a.getHours()}:${String(a.getMinutes()).padStart(2, '0')}`;
  };

  function crear(e, anim) {
    const el = document.createElement('section');
    el.className = 'pantalla';
    el.dataset.ruta = e.ruta;
    el.setAttribute('aria-label', e.ruta);
    pintar(e, el, anim);
    el.addEventListener('scroll', () => el.classList.toggle('con-scroll', el.scrollTop > 6), { passive: true });
    e.el = el;
    return el;
  }
  /** Mientras pinta, las pantallas saben si están abiertas como pestaña (sin «atrás») o apiladas. */
  function pintar(e, el, anim) {
    tel.comoPestana = tel.pila[0] === e || (!tel.pila.length && e.base);
    try { el.innerHTML = String(P[e.ruta].render(e.p || {}, { anim, comoPestana: tel.comoPestana })); }
    finally { tel.comoPestana = false; }
  }
  function montar(e) { const d = P[e.ruta]; if (d.alMontar) d.alMontar(e.el, e.p || {}); }
  function refrescar(e) {
    const d = P[e.ruta];
    const y = e.el.scrollTop;
    pintar(e, e.el, false);
    e.el.scrollTop = y;
    if (d.alRefrescar) d.alRefrescar(e.el, e.p || {});
  }
  const tope = () => tel.pila[tel.pila.length - 1];
  // Aplica el estado inicial, fuerza el cálculo de estilos y lanza la transición en el mismo turno.
  // No depende de requestAnimationFrame: sigue funcionando si la pestaña está en segundo plano.
  const dosCuadros = (fn) => { void document.body.offsetHeight; fn(); };

  tel.ir = function (ruta, p = {}) {
    ruta = resolver(ruta);
    if (!P[ruta]) return DRS.demo.proxima(ruta);
    const antes = tope();
    const e = { ruta, p };
    tel.pila.push(e);
    const el = crear(e, true);
    el.classList.add('entra');
    vista.appendChild(el);
    dosCuadros(() => { el.classList.remove('entra'); if (antes) antes.el.classList.add('debajo'); });
    montar(e);
    tel.nav();
  };

  tel.atras = function () {
    if (tel.pila.length <= 1) return;
    const e = tel.pila.pop();
    const prev = tope();
    refrescar(prev);
    prev.el.classList.remove('debajo');
    e.el.classList.add('sale');
    setTimeout(() => e.el.remove(), 300);
    tel.nav();
  };

  /** Va a una pestaña. Si la demo no tiene esa pestaña, abre su inicio y apila la pantalla encima. */
  tel.tabIr = function (tab, { anim = true } = {}) {
    tab = resolver(tab);
    const v = V();
    if (v && !esPestana(tab) && tab !== v.inicio && tab !== v.bienvenida && P[tab] && tab !== 'lanzador') {
      tel.tabIr(v.inicio, { anim: false });
      tel.ir(tab, {});
      return;
    }
    if (!P[tab]) return DRS.demo.proxima(tab);
    const viejas = tel.pila.map((e) => e.el);
    tel.cerrarHoja(true);
    tel.pila = [];
    tel.tab = tab;
    const e = { ruta: tab, p: {} };
    tel.pila.push(e);
    const el = crear(e, true);
    if (anim) el.classList.add('funde');
    vista.appendChild(el);
    dosCuadros(() => el.classList.remove('funde'));
    setTimeout(() => viejas.forEach((x) => x.remove()), anim ? 260 : 0);
    montar(e);
    tel.nav();
  };

  /** Lleva a una ruta desde una pestaña raíz. */
  tel.saltar = function (tab, ruta, p) {
    tel.tabIr(tab, { anim: false });
    if (ruta && resolver(ruta) !== tel.tab) tel.ir(ruta, p);
  };

  tel.refrescar = function () { const e = tope(); if (e) refrescar(e); tel.nav(); };
  /** Vuelve a pintar toda la pila (al cambiar de tema, por ejemplo). */
  tel.repintar = function () { tel.pila.forEach((e) => refrescar(e)); tel.nav(); };

  tel.nav = function () {
    const e = tope();
    const visible = !!(e && tel.pila.length === 1 && esPestana(e.ruta));
    nav.classList.toggle('oculta', !visible);
    U.$$('.nav-tab', nav).forEach((b) => b.setAttribute('aria-current', b.dataset.tab === tel.tab ? 'page' : 'false'));
  };

  /* ---------------- hojas (menús que suben) ---------------- */
  tel.hoja = function (contenido, { alAbrir, clase } = {}) {
    tel.cerrarHoja(true);
    const velo = document.createElement('div');
    velo.className = 'velo';
    velo.dataset.a = 'hoja-cerrar';
    const h = document.createElement('div');
    h.className = 'hoja' + (clase ? ` ${clase}` : '');
    h.setAttribute('role', 'dialog');
    h.setAttribute('aria-modal', 'true');
    h.innerHTML = '<div class="hoja-asa"></div>' + String(contenido);
    capa.append(velo, h);
    dosCuadros(() => { velo.classList.add('ver'); h.classList.add('ver'); });
    if (alAbrir) alAbrir(h);
    return h;
  };
  tel.cerrarHoja = function (inmediato) {
    U.$$('.velo, .hoja', capa).forEach((x) => { x.classList.remove('ver'); if (inmediato) x.remove(); else setTimeout(() => x.remove(), 300); });
  };
  tel.hojaActual = () => U.$('.hoja', capa);

  /* ---------------- aviso tipo notificación push (lo reemplaza ios.js) ---------------- */
  tel.aviso = function (n) {
    U.$$('.aviso', capa).forEach((x) => x.remove());
    const a = document.createElement('button');
    a.className = 'aviso';
    a.dataset.a = 'notif';
    a.dataset.id = n.id;
    a.innerHTML = String(html`<span class="aviso-ico"><svg viewBox="0 0 140 140" aria-hidden="true"><use href="#logo-mono-oscuro"/></svg></span><span><b>${n.titulo}</b><span class="t13">${n.texto}</span></span><time>ahora</time>`);
    capa.appendChild(a);
    dosCuadros(() => a.classList.add('ver'));
    setTimeout(() => { a.classList.remove('ver'); setTimeout(() => a.remove(), 450); }, 6500);
  };

  tel.tostada = function (texto, icono = 'check') {
    U.$$('.tostada', capa).forEach((x) => x.remove());
    const t = document.createElement('div');
    t.className = 'tostada';
    t.setAttribute('role', 'status');
    t.innerHTML = String(html`${ico(icono)}<span>${texto}</span>`);
    capa.appendChild(t);
    dosCuadros(() => t.classList.add('ver'));
    setTimeout(() => { t.classList.remove('ver'); setTimeout(() => t.remove(), 300); }, 2600);
  };

  /* ---------------- presentación de marca al abrir ---------------- */
  tel.intro = function (alTerminar) {
    const i = document.createElement('div');
    i.className = 'intro';
    i.innerHTML = '<div class="intro-logo"><div class="palabra">DRS MOTORS</div><i class="l1"></i><i class="l2"></i><div class="intro-sub cap">Bogotá · Colombia</div></div>';
    raiz.appendChild(i);
    let hecho = false;
    const quitar = () => { if (hecho) return; hecho = true; i.classList.add('fuera'); setTimeout(() => i.remove(), 400); if (alTerminar) alTerminar(); };
    i.addEventListener('click', quitar);
    setTimeout(quitar, 1700);
  };
})();
