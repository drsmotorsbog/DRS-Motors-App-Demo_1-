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
    if (!v || !v.tabs.length) { nav.innerHTML = ''; nav.classList.add('oculta'); inerte(nav, true); return; }
    const fab = v.fab;
    nav.dataset.n = String(v.tabs.length);
    nav.innerHTML = String(html`<div class="nav-barra" role="tablist" aria-label="Secciones" style="grid-template-columns:repeat(${v.tabs.length},1fr)">${v.tabs.map((t) => html`<button class="nav-tab" role="tab" data-a="tab" data-tab="${t.id}">${ico(t.ico)}<span>${t.nombre}</span></button>`)}</div>${fab ? html`<button class="fab" data-a="ir" data-ruta="${fab.ruta}" data-p='${JSON.stringify(fab.p || {})}' aria-label="${fab.etiqueta || fab.nombre}">${ico(fab.ico)}<span>${fab.nombre}</span></button>` : ''}`);
  };

  tel.reloj = function () {
    const a = DRS.reloj.ahora();
    if (reloj) reloj.textContent = `${a.getHours()}:${String(a.getMinutes()).padStart(2, '0')}`;
  };

  /* ---------------- foco e inert ----------------
     Lo que no está a la vista no recibe foco: las pantallas de debajo de la pila, la barra
     oculta y, con una hoja abierta, la vista y la barra (atributo inert). Cuando algo que
     tenía el foco se vuelve a pintar, el foco vuelve a su equivalente. */
  const inerte = (el, si) => { if (el) el.toggleAttribute('inert', !!si); };
  const activo = () => document.activeElement;
  const sinFoco = () => { const a = activo(); return !a || a === document.body || !a.isConnected; };
  /** Enfoca sin desplazar nada (la hoja entra desde abajo y .tel tiene overflow oculto).
      Un contenedor o un título recibe tabindex="-1" solo mientras tiene el foco. */
  function enfocar(x) {
    if (!x || typeof x.focus !== 'function' || !x.isConnected) return false;
    if (x.tabIndex < 0 && !x.hasAttribute('tabindex')) {
      x.setAttribute('tabindex', '-1');
      x.addEventListener('blur', () => x.removeAttribute('tabindex'), { once: true });
    }
    x.focus({ preventScroll: true });
    return activo() === x;
  }
  const ENFOCABLE = 'a[href], button, input:not([type="hidden"]), select, textarea, summary, [tabindex], [contenteditable="true"]';
  /** Controles a los que llega Tab dentro de un contenedor. */
  const enfocables = (r) => Array.from(r.querySelectorAll(ENFOCABLE)).filter((x) => !x.disabled && x.tabIndex >= 0
    && !x.closest('[inert]') && x.getClientRects().length > 0 && getComputedStyle(x).visibility !== 'hidden');
  /** Huella de un elemento para volver a encontrarlo después de repintar: su id o, si no tiene,
      etiqueta + data-* + aria-label + role, y su orden entre los que comparten esa huella. */
  const claveDe = (x, conNombre = true) => [x.tagName, Object.keys(x.dataset || {}).sort().map((k) => `${k}=${x.dataset[k]}`).join('&'),
    conNombre ? x.getAttribute('aria-label') || '' : '', x.getAttribute('role') || ''].join('|');
  function huella(x, dentro) {
    if (!x || !dentro || x === dentro || !dentro.contains(x)) return null;
    if (x.id) return { id: x.id };
    const clave = claveDe(x);
    return { tag: x.tagName, clave, suelta: claveDe(x, false), i: Array.from(dentro.querySelectorAll(x.tagName)).filter((y) => claveDe(y) === clave).indexOf(x) };
  }
  function buscar(h, dentro) {
    if (!h || !dentro) return null;
    if (h.id) return dentro.querySelector(`#${CSS.escape(h.id)}`);
    const todos = Array.from(dentro.querySelectorAll(h.tag));
    let xs = todos.filter((y) => claveDe(y) === h.clave);
    if (!xs.length) xs = todos.filter((y) => claveDe(y, false) === h.suelta);   // cambió solo el nombre (p. ej. «2 sin leer»)
    return xs[Math.min(h.i, xs.length - 1)] || null;
  }

  /* ---------------- repintar sin perder lo escrito, el foco ni el desplazamiento ---------------- */
  const CAMPO_NO = /^(checkbox|radio|file|button|submit|reset|hidden|image|range|color)$/;
  const inicial = (x) => (x.tagName === 'SELECT' ? ((Array.from(x.options).find((o) => o.defaultSelected) || x.options[0] || {}).value || '') : x.defaultValue);
  const claveScroll = (x, raizEl) => { const c = `${x.tagName}.${typeof x.className === 'string' ? x.className : ''}`; return { c, i: Array.from(raizEl.querySelectorAll(x.tagName)).filter((y) => `${y.tagName}.${typeof y.className === 'string' ? y.className : ''}` === c).indexOf(x) }; };
  function capturar(el) {
    const a = activo();
    const foco = a && a !== el && el.contains(a) ? huella(a, el) : null;
    let sel = null;
    if (foco && /^(INPUT|TEXTAREA)$/.test(a.tagName)) { try { if (a.selectionStart != null) sel = [a.selectionStart, a.selectionEnd, a.selectionDirection]; } catch (err) { /* tipo sin selección */ } }
    const campos = [];
    el.querySelectorAll('input[id], textarea[id], select[id]').forEach((x) => {
      if (CAMPO_NO.test(x.type) || x.readOnly || x.disabled) return;
      if (x.value !== inicial(x)) campos.push({ id: x.id, valor: x.value, inicial: inicial(x) });    // solo lo que escribió la persona
    });
    const corridos = [];
    el.querySelectorAll('*').forEach((x) => { if (x.scrollLeft || x.scrollTop) corridos.push({ ...claveScroll(x, el), l: x.scrollLeft, t: x.scrollTop }); });
    return { y: el.scrollTop, foco, sel, campos, corridos };
  }
  function restaurar(el, g) {
    el.scrollTop = g.y;
    g.campos.forEach((c) => {
      const x = el.querySelector(`#${CSS.escape(c.id)}`);
      // Si la pantalla trae otro valor inicial, manda el estado de la demo; si no, vuelve lo escrito
      if (x && !x.readOnly && !x.disabled && !CAMPO_NO.test(x.type) && inicial(x) === c.inicial && x.value !== c.valor) x.value = c.valor;
    });
    g.corridos.forEach((d) => {
      const x = Array.from(el.querySelectorAll(d.c.split('.')[0])).filter((y) => `${y.tagName}.${typeof y.className === 'string' ? y.className : ''}` === d.c)[d.i];
      if (x) { if (d.l) x.scrollLeft = d.l; if (d.t) x.scrollTop = d.t; }
    });
    if (g.foco && sinFoco() && !el.closest('[inert]')) {
      const x = buscar(g.foco, el);
      if (x && !x.closest('[inert]') && enfocar(x) && g.sel) { try { x.setSelectionRange(g.sel[0], g.sel[1], g.sel[2]); } catch (err) { /* tipo sin selección */ } }
    }
  }

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
    const g = capturar(e.el);
    pintar(e, e.el, false);
    restaurar(e.el, g);
    if (d.alRefrescar) d.alRefrescar(e.el, e.p || {});
  }
  const tope = () => tel.pila[tel.pila.length - 1];
  /** ¿El foco está en la app (o en ninguna parte)? Entonces se puede mover sin robárselo a nadie. */
  const focoEnApp = () => { const a = activo(); return sinFoco() || vista.contains(a) || capa.contains(a) || nav.contains(a); };
  // Aplica el estado inicial, fuerza el cálculo de estilos y lanza la transición en el mismo turno.
  // No depende de requestAnimationFrame: sigue funcionando si la pestaña está en segundo plano.
  const dosCuadros = (fn) => { void document.body.offsetHeight; fn(); };

  tel.ir = function (ruta, p = {}) {
    ruta = resolver(ruta);
    const v = V();
    if (v && v.redirigir && v.redirigir(ruta, p)) return;          // p. ej. la Demo 3 abre «explorar» en su propio mapa
    if (!P[ruta]) return DRS.demo.proxima(ruta);
    const antes = tope();
    const mover = focoEnApp();
    if (antes) antes.foco = huella(activo(), antes.el);          // para volver a él con «atrás»
    const e = { ruta, p };
    tel.pila.push(e);
    let el;
    try { el = crear(e, true); } catch (err) {                    // una pantalla que falla no deja la pila rota
      tel.pila.pop();
      console.error(err);
      return DRS.demo.aviso('No se pudo abrir', `«${ruta}» falló al pintarse.`);
    }
    el.classList.add('entra');
    vista.appendChild(el);
    dosCuadros(() => { el.classList.remove('entra'); if (antes) { antes.el.classList.add('debajo'); inerte(antes.el, true); } });
    montar(e);
    tel.nav();
    if (mover && !hojaAbierta()) enfocar(el);
  };

  tel.atras = function () {
    if (tel.pila.length <= 1) return;
    const mover = focoEnApp();
    const e = tel.pila.pop();
    const prev = tope();
    inerte(e.el, true);
    refrescar(prev);
    prev.el.classList.remove('debajo');
    inerte(prev.el, false);
    e.el.classList.add('sale');
    setTimeout(() => e.el.remove(), 300);
    tel.nav();
    if (mover && !hojaAbierta()) enfocar(buscar(prev.foco, prev.el) || prev.el);
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
    tel.cerrarHoja(true, { devolver: false });
    const mover = focoEnApp() && !nav.contains(activo());      // si el foco está en la barra, se queda en su pestaña
    viejas.forEach((x) => inerte(x, true));
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
    if (mover) enfocar(el);
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
    inerte(nav, !visible || !!hojaAbierta());
    U.$$('.nav-tab', nav).forEach((b) => b.setAttribute('aria-current', b.dataset.tab === tel.tab ? 'page' : 'false'));
  };

  /* ---------------- hojas (menús que suben) ----------------
     Son diálogos modales: la vista y la barra quedan inert, el foco entra a la hoja (su título
     o, si no tiene, su primer control), Tab da la vuelta adentro y, al cerrar, el foco vuelve
     a lo que abrió la hoja (o a su equivalente, si la pantalla se volvió a pintar). */
  let vuelta = null;                  // qué tenía el foco antes de abrir la hoja
  let nHojas = 0;
  const hojaAbierta = () => capa && capa.querySelector('.hoja:not([inert])');
  /** Nombre del diálogo: su primer encabezado; si no hay, la ceja o el rótulo de arriba. */
  function nombrar(h) {
    const t = h.querySelector('h1, h2, h3, [role="heading"]');
    if (t) {
      if (!t.id) t.id = `hoja-titulo-${nHojas}`;
      h.setAttribute('aria-labelledby', t.id);
      h.removeAttribute('aria-label');
      return t;
    }
    const c = h.querySelector('.ceja, .cap');
    h.removeAttribute('aria-labelledby');
    h.setAttribute('aria-label', c ? c.textContent.trim() : 'Opciones');
    return null;
  }
  const entrada = (h) => nombrar(h) || enfocables(h)[0] || h;
  function devolverFoco() {
    const v = vuelta;
    vuelta = null;
    if (!v) return;
    const e = tope();
    let x = v.el && v.el.isConnected && !v.el.closest('[inert]') ? v.el : null;
    if (!x && e && e.el === v.pantalla) x = buscar(v.h, e.el);
    enfocar(x || (e && e.el));
  }

  tel.hoja = function (contenido, { alAbrir, clase } = {}) {
    const a = sinFoco() ? null : activo();
    const antes = hojaAbierta() && vuelta ? vuelta          // una hoja que reemplaza a otra devuelve el foco al mismo lugar
      : { el: a, pantalla: tope() && tope().el, h: tope() ? huella(a, tope().el) : null };
    tel.cerrarHoja(true, { devolver: false });
    vuelta = antes;
    nHojas++;
    const velo = document.createElement('div');
    velo.className = 'velo';
    velo.dataset.a = 'hoja-cerrar';
    const h = document.createElement('div');
    h.className = 'hoja' + (clase ? ` ${clase}` : '');
    h.setAttribute('role', 'dialog');
    h.setAttribute('aria-modal', 'true');
    h.innerHTML = '<div class="hoja-asa"></div>' + String(contenido);
    capa.append(velo, h);
    inerte(vista, true);
    inerte(nav, true);
    // Si la hoja se vuelve a pintar (pago, calificar, mantenimiento), el foco no se pierde en <body>
    let ultimo = null;
    h.addEventListener('focusin', (ev) => { ultimo = huella(ev.target, h); });
    const obs = new MutationObserver(() => {
      nombrar(h);
      if (sinFoco() && !h.hasAttribute('inert')) enfocar(buscar(ultimo, h) || entrada(h));
    });
    obs.observe(h, { childList: true });
    h._obs = obs;
    dosCuadros(() => { velo.classList.add('ver'); h.classList.add('ver'); });
    enfocar(entrada(h));
    if (alAbrir) alAbrir(h);
    return h;
  };
  tel.cerrarHoja = function (inmediato, { devolver = true } = {}) {
    const xs = U.$$('.velo, .hoja', capa);
    if (!xs.length) return;
    const focoAdentro = sinFoco() || capa.contains(activo());
    xs.forEach((x) => {
      x.classList.remove('ver');
      inerte(x, true);
      if (x._obs) { x._obs.disconnect(); x._obs = null; }
      if (inmediato) x.remove(); else setTimeout(() => x.remove(), 300);
    });
    inerte(vista, false);
    inerte(nav, nav.classList.contains('oculta'));
    if (devolver && focoAdentro) devolverFoco(); else vuelta = null;
  };
  tel.hojaActual = () => U.$('.hoja:not([inert])', capa) || U.$('.hoja', capa);

  // Tab no sale de la hoja abierta (si el foco está en el panel del presentador, no se toca)
  document.addEventListener('keydown', (ev) => {
    if (ev.key !== 'Tab' || !capa) return;
    const h = hojaAbierta();
    if (!h) return;
    const a = activo();
    if (!h.contains(a) && !focoEnApp()) return;
    const xs = enfocables(h);
    if (!xs.length) { ev.preventDefault(); enfocar(h); return; }
    const i = xs.indexOf(a);
    if (ev.shiftKey && i <= 0) { ev.preventDefault(); xs[xs.length - 1].focus(); }
    else if (!ev.shiftKey && (i === -1 || i === xs.length - 1)) { ev.preventDefault(); xs[0].focus(); }
  }, true);

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
