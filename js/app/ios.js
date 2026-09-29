/* DRS Motors · demo — capa de iOS: Dynamic Island, avisos del sistema y pantalla bloqueada
   El teléfono es un iPhone 15 Pro. Lo que dibuja iOS usa la tipografía y las esquinas
   del sistema; la app, adentro, sigue la marca DRS. */
(function () {
  'use strict';
  const DRS = window.DRS;
  const U = DRS.util;
  const { html, crudo, ico } = U;

  let tel, isla, bloqueo = null;
  const pilaBloqueo = [];            // avisos que llegaron con el celular bloqueado

  const iconoApp = (canal) => (canal === 'whatsapp'
    ? html`<span class="aviso-ico wa" aria-hidden="true">${ico('chat')}</span>`
    : crudo('<span class="aviso-ico" aria-hidden="true"><svg viewBox="0 0 140 140"><use href="#logo-mono-oscuro"/></svg></span>'));
  const nombreApp = (canal) => (canal === 'whatsapp' ? 'WhatsApp' : 'DRS Motors');
  const MESES = U.MESES;
  const fechaIOS = (d) => `${U.DIAS[d.getDay()]}, ${d.getDate()} de ${MESES[d.getMonth()]}`;
  const horaIOS = (d) => `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`;

  /* ---------------- aviso tipo banner (reemplaza el de tel.js) ---------------- */
  function banner(n, { canal } = {}) {
    const capa = U.$('#tel-capa');
    U.$$('.aviso', capa).forEach((x) => x.remove());
    const a = document.createElement('button');
    a.className = 'aviso';
    a.dataset.a = 'notif';
    a.dataset.id = n.id || '';
    a.innerHTML = String(html`${iconoApp(canal || n.canal)}<span><span class="aviso-app">${nombreApp(canal || n.canal)}</span><b>${n.titulo}</b><span class="t13">${n.texto}</span></span><time>ahora</time>`);
    capa.appendChild(a);
    void a.offsetHeight;
    a.classList.add('ver');
    setTimeout(() => { a.classList.remove('ver'); setTimeout(() => a.remove(), 450); }, 6500);
  }

  /* ---------------- Dynamic Island como Live Activity de la reserva ---------------- */
  function actualizarIsla() {
    if (!isla || !DRS.estado) return;
    const r = DRS.q.activaUsuario();
    const viva = r && ['recibido', 'en_proceso', 'listo'].includes(r.estado);
    isla.classList.toggle('viva', !!viva);
    const txt = U.$('.isla-txt', isla);
    if (!txt) return;
    if (!viva) { txt.textContent = ''; return; }
    txt.textContent = r.estado === 'listo' ? 'Listo' : r.estado === 'recibido' ? 'Recibido' : 'Lavando';
    txt.style.color = r.estado === 'listo' ? 'var(--pos)' : 'var(--acc-2)';
  }

  /* ---------------- pantalla bloqueada ---------------- */
  function tarjetaNoti(n, i) {
    return html`<button class="noti${i > 2 ? ' pila' : ''}" data-a="ios-abrir" data-i="${i}">
      ${iconoApp(n.canal)}
      <span><span class="noti-cab"><span>${nombreApp(n.canal)}</span><span>${n.hace || 'ahora'}</span></span><b>${n.titulo}</b><p>${n.texto}</p></span>
    </button>`;
  }

  function pintarBloqueo() {
    if (!bloqueo) return;
    const ahora = DRS.reloj.ahora();
    U.$('.bloqueo-fecha', bloqueo).textContent = fechaIOS(ahora);
    U.$('.bloqueo-hora', bloqueo).textContent = horaIOS(ahora);
    U.$('.bloqueo-avisos', bloqueo).innerHTML = String(pilaBloqueo.length
      ? html`<div class="bloqueo-titulo">Centro de notificaciones<span>${pilaBloqueo.length} ${pilaBloqueo.length === 1 ? 'aviso' : 'avisos'}</span></div>${pilaBloqueo.slice(0, 4).map(tarjetaNoti)}`
      : html`<div class="bloqueo-vacio">No hay notificaciones nuevas</div>`);
  }

  DRS.ios = {
    iniciar() {
      tel = U.$('#tel');
      isla = document.createElement('div');
      isla.className = 'isla';
      isla.dataset.modo = 'noche';                 // es hardware: negra en los dos temas
      isla.innerHTML = '<span class="isla-ico"><svg viewBox="0 0 140 140"><use href="#logo-mono-oscuro"/></svg></span><span class="isla-txt" style="font:600 13px/1 var(--ios-font);margin-left:10px"></span>';
      tel.appendChild(isla);
      DRS.tel.aviso = (n) => banner(n);      // los avisos de la app ahora los pinta iOS
      DRS.en('cambio', actualizarIsla);
      actualizarIsla();
    },

    /** Muestra un aviso: si el celular está bloqueado, entra a la pila de la pantalla bloqueada. */
    avisar(n, opciones = {}) {
      if (bloqueo) { pilaBloqueo.unshift({ ...n, hace: 'ahora' }); pintarBloqueo(); return; }
      banner(n, opciones);
    },

    bloqueado: () => !!bloqueo,

    bloquear() {
      if (bloqueo) return;
      bloqueo = document.createElement('div');
      bloqueo.className = 'bloqueo entra';
      bloqueo.dataset.modo = 'noche';              // la pantalla bloqueada es de iOS: oscura en los dos temas
      bloqueo.setAttribute('role', 'dialog');
      bloqueo.setAttribute('aria-label', 'Pantalla bloqueada del iPhone');
      // El plano de fondo: se intercalan los carros (la moto es muy alta para este lugar)
      const fondo = DRS.mov
        ? DRS.mov.marcador(null, { vehiculo: DRS.mov.generico('bloqueo', true, ['coupe', 'gt']), modo: 'plano', anim: false, clave: 'bloqueo', respaldo: () => DRS.bp.carro({ ancho: 470, dibujar: false }) })
        : crudo(DRS.bp.carro({ ancho: 470, dibujar: false }));
      bloqueo.innerHTML = String(html`<div class="bloqueo-fondo">${fondo}</div>
        <span class="bloqueo-candado" aria-hidden="true"><svg viewBox="0 0 18 22" fill="none" stroke="#fff" stroke-width="2"><path d="M4 10V6.5a5 5 0 0 1 10 0V10"/><rect x="1.5" y="10" width="15" height="11" rx="3" fill="#fff" stroke="none"/></svg></span>
        <div class="bloqueo-fecha"></div><div class="bloqueo-hora"></div>
        <div class="bloqueo-avisos"></div>
        <div class="bloqueo-pie" aria-hidden="true"><span><svg viewBox="0 0 24 24"><path d="M8 2h8l-1 6H9zM9 8h6v14H9zM12 12v3"/></svg></span><span><svg viewBox="0 0 24 24"><path d="M3 7h4l2-3h6l2 3h4v13H3z"/><circle cx="12" cy="13" r="4"/></svg></span></div>
        <div class="bloqueo-desliza">Toca un aviso o la pantalla para abrir la app</div>`);
      // Tocar fuera de los avisos desbloquea (como Face ID), para no quedar atrapado sin avisos
      bloqueo.addEventListener('click', (ev) => { if (!ev.target.closest('.noti')) DRS.ios.desbloquear(); });
      tel.appendChild(bloqueo);
      pintarBloqueo();
      void bloqueo.offsetHeight;
      bloqueo.classList.remove('entra');
    },

    /** Desbloquea (Face ID) y, si se tocó un aviso, lleva a su destino en la app. */
    desbloquear(destino) {
      if (!bloqueo) return;
      const b = bloqueo;
      b.classList.add('abre');
      setTimeout(() => { b.classList.add('sale'); }, 260);
      setTimeout(() => { b.remove(); }, 800);
      bloqueo = null;
      if (destino) setTimeout(() => DRS.avisos.abrirDestino(destino), 520);
      if (DRS.demo) DRS.demo.pintarLado();
    },

    vaciarPila() { pilaBloqueo.length = 0; pintarBloqueo(); },
  };

  Object.assign(DRS.acciones, {
    'ios-abrir': (d) => {
      const n = pilaBloqueo[Number(d.i)];
      pilaBloqueo.splice(Number(d.i), 1);
      DRS.ios.desbloquear(n);
    },
  });

  // El reloj de la pantalla bloqueada sigue al de la demo
  setInterval(() => { if (bloqueo) pintarBloqueo(); }, 15000);
})();
