/* DRS Motors · demo — pago simulado (tarjeta, PSE o Nequi) en una hoja que sube
   Uso:
     DRS.pago.abrir({
       titulo: 'Pagar reserva',
       concepto: 'Lavado completo · Espuma 127',
       lineas: [['Lavado completo', 38000], ['Silicona para llantas', 6000], ['Puntos usados', -5000]],
       total: 39000,
       pasos: ['Confirmando la franja con el lavadero'],   // pasos extra del procesamiento
       alPagar: (medio) => { … },                          // se llama al aprobarse
     });
   No hay pasarela real: nada se cobra. La hoja lo dice. */
(function () {
  'use strict';
  const DRS = window.DRS;
  const U = DRS.util;
  const { html, ico, pesos } = U;

  const MEDIOS = [
    { id: 'tarjeta', ico: 'pago', nombre: 'Tarjeta Visa terminada en 4417', sub: 'Crédito · Andrés Gómez' },
    { id: 'pse', ico: 'enlace-externo', nombre: 'PSE', sub: 'Débito desde tu banco' },
    { id: 'nequi', ico: 'telefono', nombre: 'Nequi', sub: '300 555 0142' },
  ];
  const PRIMER_PASO = { tarjeta: 'Validando la tarjeta', pse: 'Conectando con tu banco por PSE', nequi: 'Esperando la aprobación en Nequi' };

  // Cada hoja de pago es una sesión: si se cierra o se abre otra mientras procesa, el pago se cancela
  // y no se cobra (no queda una reserva a medias ni una hoja nueva con el proceso viejo).
  let sesion = null;   // { o, medio, hoja, pagando }
  const viva = (s) => sesion === s && s.hoja && s.hoja.isConnected && s.hoja.classList.contains('ver');

  function vista(s) {
    const o = s.o;
    return html`<div class="hoja-cab"><div><div class="ceja">${o.titulo || 'Pagar'}</div><h2 class="d d-34" style="margin-top:8px">${o.concepto}</h2></div><button class="hoja-cerrar" data-a="hoja-cerrar" aria-label="Cerrar">${ico('cerrar')}</button></div>
      <dl class="datos pago-lineas">${o.lineas.map(([k, v]) => html`<dt>${k}</dt><dd class="num${v < 0 ? ' t-luz' : ''}">${v < 0 ? '−' + pesos(-v) : pesos(v)}</dd>`)}</dl>
      <div class="pago-total"><span class="cap">Total</span><span class="d d-44 num">${pesos(o.total)}</span></div>
      <div class="ceja" style="margin:18px 0 10px">Medio de pago</div>
      <div role="radiogroup" aria-label="Medio de pago">${MEDIOS.map((m) => html`<button class="opcion" role="radio" aria-checked="${m.id === s.medio ? 'true' : 'false'}" data-a="pago-medio" data-m="${m.id}">
        ${ico(m.ico)}<span><span class="t13 t-1" style="display:block;font-weight:600">${m.nombre}</span><span class="t11">${m.sub}</span></span><span class="radio"></span></button>`)}</div>
      <button class="btn btn-luz" data-a="pago-pagar" style="margin-top:14px">Pagar ${pesos(o.total)}</button>
      <p class="t11" style="text-align:center;margin-top:10px">Pago simulado para la demo: no se hace ningún cobro.</p>`;
  }

  function procesando(s, pasos, hecho) {
    return html`<div class="pago-proceso" role="status" aria-live="polite">
      <div class="ceja">Procesando pago</div>
      <div class="d d-34" style="margin:8px 0 18px">${pesos(s.o.total)}</div>
      <ol class="proceso">${pasos.map((p, i) => html`<li class="${i < hecho ? 'hecho' : i === hecho ? 'actual' : ''}"><i>${i < hecho ? ico('check') : ''}</i><span>${p}</span></li>`)}</ol>
    </div>`;
  }

  function aprobado(s, ref) {
    return html`<div class="pago-ok">
      <span class="pago-ok-ico">${ico('check')}</span>
      <div class="d d-44" style="margin-top:16px">Pago aprobado</div>
      <p class="t13" style="margin:8px 0 0">${s.o.concepto}</p>
      <p class="cap" style="margin-top:14px">Referencia ${ref}</p>
    </div>`;
  }

  /** Pinta solo en la hoja de esta sesión, nunca en otra que se haya abierto después. */
  function pintar(s, contenido) {
    if (s.hoja && s.hoja.isConnected) s.hoja.innerHTML = '<div class="hoja-asa"></div>' + String(contenido);
  }
  function cancelar(s) {
    if (sesion === s) sesion = null;
    DRS.tel.tostada('Pago cancelado · no se hizo ningún cobro', 'cerrar');
  }

  DRS.pago = {
    abrir(o) {
      const pref = DRS.estado.medios && DRS.estado.medios.preferido;
      const s = { o, medio: MEDIOS.some((m) => m.id === pref) ? pref : 'tarjeta', hoja: null, pagando: false };
      sesion = s;
      s.hoja = DRS.tel.hoja(vista(s));
    },
  };

  Object.assign(DRS.acciones, {
    'pago-medio': (d) => { const s = sesion; if (!s || s.pagando) return; s.medio = d.m; pintar(s, vista(s)); },
    'pago-pagar': async () => {
      const s = sesion;
      if (!s || s.pagando) return;
      s.pagando = true;
      const pasos = [PRIMER_PASO[s.medio], ...(s.o.pasos || []), 'Generando tu comprobante'];
      for (let i = 0; i <= pasos.length; i++) {
        if (!viva(s)) return cancelar(s);
        pintar(s, procesando(s, pasos, i));
        if (i < pasos.length) await U.espera(i === 0 && s.medio !== 'tarjeta' ? 1100 : 650);
      }
      if (!viva(s)) return cancelar(s);
      // Aprobado: desde aquí el pago ya se hizo, aunque se cierre la hoja
      const ref = `DRS-P${String(Math.floor(Math.random() * 900000) + 100000)}`;
      pintar(s, aprobado(s, ref));
      await U.espera(1100);
      if (sesion === s) sesion = null;
      DRS.tel.cerrarHoja();
      if (s.o.alPagar) s.o.alPagar(s.medio, ref);
    },
  });
})();
