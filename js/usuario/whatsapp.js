/* DRS Motors · demo — WhatsApp simulado con la marca DRS (lo usan catálogo, trámites y soporte)
   Uso:
     DRS.tel.ir('whatsapp', {
       contacto: 'DRS Motors',                              // nombre en la cabecera
       sub: 'DRS Motors · Bogotá',                            // subtítulo
       mensajes: [{ de: 'yo' | 'ellos', texto, h: 'HH:MM' }], // conversación previa (opcional)
       borrador: 'texto prellenado',                        // queda en la caja, editable
       respuesta: 'texto de respuesta',                     // opcional; por defecto responde Santiago
     });
     Atajos: DRS.whatsapp.abrir(p) · DRS.whatsapp.attrs(p) → atributos para un botón (data-a="ir").
   No es WhatsApp: la pantalla lo dice. En la app real, «Enviar» abre WhatsApp con el borrador. */
(function () {
  'use strict';
  const DRS = window.DRS;
  const U = DRS.util;
  const UI = DRS.ui;
  const { html, ico } = U;

  const horaAhora = () => { const a = DRS.reloj.ahora(); return U.deMin(a.getHours() * 60 + a.getMinutes()); };
  const tope = () => DRS.tel.pila[DRS.tel.pila.length - 1];
  const nombre = () => (DRS.q.usuario() || {}).nombre || 'Andrés';
  const respuestaBase = () => `Hola, ${nombre()}. Soy Santiago, de DRS Motors. Ya vi tu mensaje: te respondo en unos minutos con los detalles.`;
  const SEGUIMIENTO = 'Recibido. Te escribo en un momento.';

  /** Deja los parámetros listos una sola vez (la conversación vive en p mientras la pantalla exista). */
  function normalizar(p) {
    if (p._listo) return;
    p.contacto = p.contacto || 'DRS Motors';
    p.sub = p.sub || 'DRS Motors · Bogotá';
    p.mensajes = (p.mensajes || []).map((m) => ({ estado: 'leido', ...m }));
    p.borrador = p.borrador || '';
    p._listo = true;
  }

  function burbuja(m, i, p) {
    const yo = m.de === 'yo';
    const leido = yo && m.estado === 'leido';
    return html`<div class="wa-msg ${yo ? 'wa-yo' : 'wa-ellos'}${p.nuevo === i ? ' wa-nuevo' : ''}">
      <p>${m.texto}</p>
      <span class="wa-meta"><time>${U.horaTxt(m.h)}</time>${yo ? html`<span class="wa-checks${leido ? ' wa-leido' : ''}" role="img" aria-label="${leido ? 'Leído' : 'Enviado'}">${ico('check')}${ico('check')}</span>` : ''}</span>
    </div>`;
  }

  const avatar = () => html`<span class="wa-avatar" aria-hidden="true"><svg viewBox="0 0 140 140"><use href="#logo-mono-oscuro"/></svg></span>`;

  DRS.pantallas.whatsapp = {
    render(p) {
      normalizar(p);
      const esc = !!p.escribiendo;
      return html`<div class="wa">
        <header class="cab wa-cab">
          <button class="cab-atras" data-a="atras" aria-label="Volver">${ico('atras')}</button>
          ${avatar()}
          <span class="wa-quien"><span class="wa-nombre">${p.contacto}${ico('verificado')}</span><span class="wa-sub${esc ? ' wa-activo' : ''}" aria-live="polite">${esc ? 'escribiendo…' : p.sub}</span></span>
          <button class="cab-btn" data-a="wa-llamar" aria-label="Llamar a ${p.contacto}">${ico('telefono')}</button>
        </header>
        <div class="wa-rotulo">${ico('informacion')}<span>Chat simulado · en la app real se abre WhatsApp</span></div>
        <div class="wa-msgs srv-rejilla" role="log" aria-label="Conversación con ${p.contacto}">
          <div class="wa-ficha">${avatar()}<b>${p.contacto}</b><span class="cap">${p.sub} · Bogotá</span></div>
          <div class="wa-dia">Hoy</div>
          ${p.mensajes.map((m, i) => burbuja(m, i, p))}
          ${esc ? html`<div class="wa-msg wa-ellos wa-escribe wa-nuevo" role="status" aria-label="${p.contacto} está escribiendo"><i></i><i></i><i></i></div>` : ''}
        </div>
        <div class="wa-pie">
          <label class="oculto" for="wa-txt">Mensaje para ${p.contacto}</label>
          <textarea id="wa-txt" class="wa-txt" rows="1" placeholder="Escribe un mensaje">${p.borrador}</textarea>
          <button class="wa-enviar" data-a="wa-enviar" aria-label="Enviar">${ico('enviar')}</button>
        </div>
      </div>`;
    },
    alMontar(el, p) { preparar(el, p); },
    alRefrescar(el, p) { preparar(el, p); p.nuevo = null; },
  };

  function preparar(el, p) {
    const msgs = U.$('.wa-msgs', el);
    if (msgs) msgs.scrollTop = msgs.scrollHeight;
    const t = U.$('#wa-txt', el);
    if (!t) return;
    const ajustar = () => { t.style.height = 'auto'; t.style.height = `${Math.min(t.scrollHeight + 2, 104)}px`; };
    ajustar();
    t.addEventListener('input', () => { p.borrador = t.value; ajustar(); });
    t.addEventListener('keydown', (ev) => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); enviar(p); } });
  }

  function enviar(p) {
    const e = tope();
    if (!e || e.p !== p) return;
    const t = U.$('#wa-txt', e.el);
    const texto = (t ? t.value : p.borrador).trim();
    if (!texto) { if (t) t.focus(); return; }
    const yo = { de: 'yo', texto, h: horaAhora(), estado: 'enviado' };
    p.mensajes.push(yo);
    p.nuevo = p.mensajes.length - 1;
    p.borrador = '';
    DRS.tel.refrescar();
    const siSigue = () => { const x = tope(); if (x && x.p === p) DRS.tel.refrescar(); };
    setTimeout(() => { yo.estado = 'leido'; p.escribiendo = true; siSigue(); }, 450);
    setTimeout(() => {
      p.escribiendo = false;
      const resp = p.respondidas ? SEGUIMIENTO : (p.respuesta || respuestaBase());
      p.respondidas = (p.respondidas || 0) + 1;
      p.mensajes.push({ de: 'ellos', texto: resp, h: horaAhora() });
      p.nuevo = p.mensajes.length - 1;
      siSigue();
    }, 1500);
  }

  Object.assign(DRS.acciones, {
    'wa-enviar': () => { const e = tope(); if (e && e.ruta === 'whatsapp') enviar(e.p); },
    'wa-llamar': () => DRS.tel.tostada('Llamada simulada: en la app real se abre WhatsApp', 'telefono'),
  });

  DRS.whatsapp = {
    abrir: (o = {}) => DRS.tel.ir('whatsapp', o),
    attrs: (o = {}) => UI.irAttrs('whatsapp', o),
  };
})();
