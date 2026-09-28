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

  let opciones = null;
  let medio = 'tarjeta';

  function vista() {
    const o = opciones;
    return html`<div class="hoja-cab"><div><div class="ceja">${o.titulo || 'Pagar'}</div><h2 class="d d-34" style="margin-top:8px">${o.concepto}</h2></div><button class="hoja-cerrar" data-a="hoja-cerrar" aria-label="Cerrar">${ico('cerrar')}</button></div>
      <dl class="datos pago-lineas">${o.lineas.map(([k, v]) => html`<dt>${k}</dt><dd class="num${v < 0 ? ' t-luz' : ''}">${v < 0 ? '−' + pesos(-v) : pesos(v)}</dd>`)}</dl>
      <div class="pago-total"><span class="cap">Total</span><span class="d d-44 num">${pesos(o.total)}</span></div>
      <div class="ceja" style="margin:18px 0 10px">Medio de pago</div>
      <div role="radiogroup" aria-label="Medio de pago">${MEDIOS.map((m) => html`<button class="opcion" role="radio" aria-checked="${m.id === medio ? 'true' : 'false'}" data-a="pago-medio" data-m="${m.id}">
        ${ico(m.ico)}<span><span class="t13 t-1" style="display:block;font-weight:600">${m.nombre}</span><span class="t11">${m.sub}</span></span><span class="radio"></span></button>`)}</div>
      <button class="btn btn-luz" data-a="pago-pagar" style="margin-top:14px">Pagar ${pesos(o.total)}</button>
      <p class="t11" style="text-align:center;margin-top:10px">Pago simulado para la demo: no se hace ningún cobro.</p>`;
  }

  function procesando(pasos, hecho) {
    return html`<div class="pago-proceso" role="status" aria-live="polite">
      <div class="ceja">Procesando pago</div>
      <div class="d d-34" style="margin:8px 0 18px">${pesos(opciones.total)}</div>
      <ol class="proceso">${pasos.map((p, i) => html`<li class="${i < hecho ? 'hecho' : i === hecho ? 'actual' : ''}"><i>${i < hecho ? ico('check') : ''}</i><span>${p}</span></li>`)}</ol>
    </div>`;
  }

  function aprobado(ref) {
    return html`<div class="pago-ok">
      <span class="pago-ok-ico">${ico('check')}</span>
      <div class="d d-44" style="margin-top:16px">Pago aprobado</div>
      <p class="t13" style="margin:8px 0 0">${opciones.concepto}</p>
      <p class="cap" style="margin-top:14px">Referencia ${ref}</p>
    </div>`;
  }

  function pintar(contenido) {
    const h = DRS.tel.hojaActual();
    if (h) h.innerHTML = '<div class="hoja-asa"></div>' + String(contenido);
  }

  DRS.pago = {
    abrir(o) {
      opciones = o;
      medio = 'tarjeta';
      DRS.tel.hoja(vista());
    },
  };

  Object.assign(DRS.acciones, {
    'pago-medio': (d) => { medio = d.m; pintar(vista()); },
    'pago-pagar': async () => {
      const pasos = [PRIMER_PASO[medio], ...(opciones.pasos || []), 'Generando tu comprobante'];
      for (let i = 0; i <= pasos.length; i++) {
        pintar(procesando(pasos, i));
        if (i < pasos.length) await U.espera(i === 0 && medio !== 'tarjeta' ? 1100 : 650);
      }
      const ref = `DRS-P${String(Math.floor(Math.random() * 900000) + 100000)}`;
      pintar(aprobado(ref));
      await U.espera(1100);
      DRS.tel.cerrarHoja();
      const fn = opciones.alPagar;
      opciones = null;
      if (fn) fn(medio, ref);
    },
  });
})();
