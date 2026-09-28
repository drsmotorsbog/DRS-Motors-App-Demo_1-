/* DRS Motors · demo — Trámites DRS: cotizador de traspaso y de levantamiento de prenda, SOLO BOGOTÁ.
   Ruta pública: DRS.tel.ir('tramites', { tipo?: 'traspaso' | 'prenda' | 'ambos', vehiculo?: 'Modelo · placa' }).
   Valores de Contexto/03_tarifas_y_politicas.md (tramitacion): honorarios $ 160.000 por trámite (por ida),
   tarifa oficial de traspaso en Bogotá $ 260.000 (vigencia por validar), comprador y vendedor pagan mitad y
   mitad, trámite adicional en la misma gestión +50 % de los honorarios. Sin retención en la fuente ni 4×1000.
   La actualización de datos en el RUNT la hace el titular en persona (Contexto/02 §2.2). */
(function () {
  'use strict';
  const DRS = window.DRS;
  const U = DRS.util;
  const UI = DRS.ui;
  const { html, crudo, ico, pesos, placaTxt } = U;

  const T = { honorarios: 160000, traspaso: 260000, adicional: 0.5 };
  const tope = () => DRS.tel.pila[DRS.tel.pila.length - 1];
  const nombreUsuario = () => (DRS.q.usuario() || {}).nombre || 'Andrés';

  /** Estado del cotizador: vive en los parámetros de la pantalla mientras exista. */
  function iniciar(p) {
    if (p._listo) return;
    p.traspaso = p.tipo !== 'prenda';
    p.prenda = p.tipo === 'prenda' || p.tipo === 'ambos';
    p.rol = 'comprador';
    p.veh = p.vehiculo ? 'ext' : p.tipo === 'prenda' ? DRS.estado.vehiculoActivo : 'otro';
    p._listo = true;
  }

  function cotizar(p) {
    const lineas = [];
    if (p.traspaso) {
      lineas.push({ t: 'Tarifa oficial de traspaso · Bogotá', nota: 'Valor de referencia, vigencia por validar', v: T.traspaso });
      lineas.push({ t: 'Honorarios DRS · traspaso', nota: 'Por trámite, por ida', v: T.honorarios });
    }
    if (p.prenda) {
      const adicional = !!p.traspaso;
      lineas.push({ t: `Honorarios DRS · levantamiento${adicional ? ' adicional' : ''}`, nota: adicional ? 'En la misma gestión: +50 % de los honorarios' : 'Por trámite, por ida', v: adicional ? T.honorarios * T.adicional : T.honorarios });
      lineas.push({ t: 'Derechos de tránsito del levantamiento', nota: 'Se confirman en la cotización', v: null });
    }
    const total = lineas.reduce((s, l) => s + (l.v || 0), 0);
    return { lineas, total, mitad: p.traspaso ? (T.traspaso + T.honorarios) / 2 : 0, pendiente: !!p.prenda };
  }

  function vehiculoTxt(p) {
    if (p.veh === 'ext' && p.vehiculo) return `el ${p.vehiculo}`;
    const v = DRS.q.vehiculos().find((x) => x.id === p.veh);
    if (v) return `mi ${UI.modeloCorto(v)} (${placaTxt(v.placa)})`;
    return p.traspaso && p.rol === 'comprador' ? 'un vehículo que voy a comprar' : 'mi vehículo';
  }

  const OPC = [
    { id: 'traspaso', ico: 'traspaso', t: 'Traspaso', d: 'Pasa el vehículo a nombre del comprador.' },
    { id: 'prenda', ico: 'prenda', t: 'Levantamiento de prenda', d: 'Quita la prenda cuando el crédito ya está pagado.' },
  ];

  DRS.pantallas.tramites = {
    render(p) {
      iniciar(p);
      const c = cotizar(p);
      const n = (p.traspaso ? 1 : 0) + (p.prenda ? 1 : 0);
      const vs = DRS.q.vehiculos();
      const fichas = [
        ...(p.vehiculo ? [['ext', p.vehiculo]] : []),
        ...vs.map((v) => [v.id, `${UI.modeloCorto(v)} · ${placaTxt(v.placa)}`]),
        ['otro', p.traspaso && p.rol === 'comprador' ? 'Uno que voy a comprar' : 'Otro vehículo'],
      ];
      return html`${UI.cabDet('Trámites DRS')}<div class="cuerpo con-cta">
        <div class="titulo"><div class="ceja">Trámites ante tránsito</div><h1 class="d d-44">Trámites DRS</h1>
          <p class="t13">Hacemos el traspaso o el levantamiento de prenda por ti, con cotización previa y asesoría en cada paso.</p></div>
        <div class="tram-bogota">${ico('ubicacion')}<div><div class="etq">Solo Bogotá</div><p class="t13">Hacemos trámites de vehículos matriculados en Bogotá, ante la Ventanilla Única de Servicios.</p></div></div>

        <section class="bloque">${UI.bloqueCab('¿Qué necesitas?', 'Puedes pedir los dos en la misma gestión.')}
          <div role="group" aria-label="Trámites">${OPC.map((o) => html`<button class="opcion tram-opc" role="checkbox" aria-checked="${p[o.id] ? 'true' : 'false'}" data-a="tram-tipo" data-k="${o.id}">
            ${ico(o.ico)}<span><span class="t13 t-1" style="display:block;font-weight:600">${o.t}</span><span class="t11">${o.d}</span></span>
            <span class="tram-caja">${p[o.id] ? ico('check') : ''}</span></button>`)}</div>
        </section>

        ${p.traspaso ? html`<section class="bloque tram-bloque">${UI.bloqueCab('¿Qué eres en el negocio?')}
          <div class="seg" role="tablist" aria-label="Tu papel en el traspaso">${[['comprador', 'Comprador'], ['vendedor', 'Vendedor']].map(([k, t]) => html`<button role="tab" aria-selected="${p.rol === k ? 'true' : 'false'}" data-a="tram-rol" data-k="${k}">${t}</button>`)}</div>
        </section>` : ''}

        <section class="bloque tram-bloque">${UI.bloqueCab('Vehículo')}
          <div class="fichas tram-fichas">${fichas.map(([k, t]) => html`<button class="ficha" aria-pressed="${p.veh === k ? 'true' : 'false'}" data-a="tram-veh" data-k="${k}">${t}</button>`)}</div>
        </section>

        <section class="bloque">${UI.bloqueCab('Tu cotización', 'Cotización previa: DRS la confirma antes de empezar.')}
          <div class="tarjeta tarjeta-pad tram-cot">
            ${n ? html`${c.lineas.map((l) => html`<div class="tram-linea"><span class="t13">${l.t}</span><span class="${l.v == null ? 'tram-pend' : 'num tram-valor'}">${l.v == null ? 'Por confirmar' : pesos(l.v)}</span><span class="t11">${l.nota}</span></div>`)}
              <div class="tram-total"><span class="cap">Total de la gestión</span><span class="d d-44 num">${pesos(c.total)}</span></div>
              ${c.pendiente ? html`<p class="t11 tram-mas">Más los derechos de tránsito del levantamiento.</p>` : ''}
              ${p.traspaso ? html`<div class="tram-mitad"><div><span class="etq">Mitad y mitad</span><p class="t11">Por costumbre del mercado, comprador y vendedor pagan el traspaso por partes iguales.</p></div><div class="tram-mitad-v"><span class="d d-26 num">${pesos(c.mitad)}</span><span class="cap">por parte</span></div></div>` : ''}`
    : html`<p class="t13" style="margin:0">Elige al menos un trámite para ver la cotización.</p>`}
          </div>
        </section>

        <div class="aviso-caja tram-runt">${ico('runt')}<span><b class="t-1">La actualización de datos en el RUNT la hace el titular en persona.</b> DRS no puede hacerla por ti; te explicamos cómo y dónde hacerla.</span></div>

        <section class="bloque">${UI.bloqueCab('Cómo funciona')}
          <ol class="srv-lista tram-pasos">${[
    'Cotizas aquí, sin compromiso.',
    'Confirmas con DRS por WhatsApp el valor y los documentos.',
    'DRS radica el trámite en la ventanilla y te acompaña hasta el final.',
  ].map((t, i) => html`<li><span class="d d-26 num">${String(i + 1).padStart(2, '0')}</span><p class="t13">${t}</p></li>`)}</ol>
        </section>
        <p class="t11" style="margin-top:18px">Valores de la demo tomados de las tarifas de DRS. La tarifa oficial es de referencia y su vigencia está por validar.</p>
      </div>
      <div class="pie-cta"><button class="btn btn-acero" data-a="tram-solicitar" ${crudo(n ? '' : 'disabled')}>${ico('chat')}Solicitar con DRS</button><p class="t11">Te responde Santiago, de DRS Motors, por WhatsApp.</p></div>`;
    },
  };

  function actual() { const e = tope(); return e && e.ruta === 'tramites' ? e.p : null; }

  Object.assign(DRS.acciones, {
    'tram-tipo': (d) => { const p = actual(); if (!p) return; p[d.k] = !p[d.k]; DRS.tel.refrescar(); },
    'tram-rol': (d) => { const p = actual(); if (!p) return; p.rol = d.k; DRS.tel.refrescar(); },
    'tram-veh': (d) => { const p = actual(); if (!p) return; p.veh = d.k; DRS.tel.refrescar(); },
    'tram-solicitar': () => {
      const p = actual();
      if (!p || (!p.traspaso && !p.prenda)) return;
      const c = cotizar(p);
      const que = p.traspaso && p.prenda ? 'el traspaso y el levantamiento de prenda' : p.traspaso ? 'el traspaso' : 'el levantamiento de prenda';
      const rol = p.traspaso ? (p.rol === 'vendedor' ? ' Soy el vendedor.' : ' Soy el comprador.') : '';
      const borrador = `Hola, DRS. Quiero hacer ${que} de ${vehiculoTxt(p)} en Bogotá.${rol} La cotización previa de la app me da ${pesos(c.total)}${c.pendiente ? ' más los derechos del levantamiento' : ''}. ¿Me confirman el valor y los documentos?`;
      DRS.tel.ir('whatsapp', {
        contacto: 'DRS Motors', sub: 'Cuenta de empresa', mensajes: [], borrador,
        respuesta: `Hola, ${nombreUsuario()}. Soy Santiago, de DRS Motors. Con gusto te ayudamos con ${que}. En un momento te confirmo el valor y la lista de documentos; ten a mano la tarjeta de propiedad.`,
      });
    },
  });

  DRS.tramites = { tarifas: T, abrir: (o = {}) => DRS.tel.ir('tramites', o) };
})();
