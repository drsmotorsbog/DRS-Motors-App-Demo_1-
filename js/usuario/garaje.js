/* DRS Motors · demo — Mi garaje, ficha de documento (SOAT / tecnomecánica) y mantenimiento */
(function () {
  'use strict';
  const DRS = window.DRS;
  const U = DRS.util;
  const UI = DRS.ui;
  const { html, crudo, ico, num, pesos, placaTxt } = U;

  const cuando = (c) => `${c.d === 0 ? 'hoy' : c.d === -1 ? 'ayer' : U.fechaCorta(DRS.reloj.dia(c.d))}, ${U.horaTxt(c.h)}`;

  // Puntos del plano (unidades de js/blueprint.js): 1 motor, 2 combustible, 3 transmisión, 4 kilometraje
  const GLOBOS = {
    carro: [
      { x: 208, y: 268, bx: 150, by: 50, n: 2 },
      { x: 600, y: 330, bx: 380, by: 50, n: 3 },
      { x: 604, y: 192, bx: 620, by: 50, n: 4 },
      { x: 790, y: 214, bx: 830, by: 50, n: 1 },
    ],
    moto: [
      { x: 400, y: 300, bx: 300, by: 42, n: 3 },
      { x: 552, y: 300, bx: 500, by: 42, n: 1 },
      { x: 618, y: 172, bx: 660, by: 42, n: 2 },
      { x: 690, y: 138, bx: 830, by: 42, n: 4 },
    ],
  };

  function cajetin(v) {
    const filas = [
      ['01 · Motor', `${num(v.cilindraje)} cc`], ['02 · Combustible', v.combustible],
      ['03 · Transmisión', v.transmision], ['04 · Kilometraje', `${num(v.km)} km`],
      ['Vehículo', UI.modelo(v)], ['Modelo', v.modelo],
      ['Placa', placaTxt(v.placa)], ['Color', v.color],
      ['Clase', `${v.clase} · ${v.carroceria}`], ['Servicio', v.servicio],
    ];
    return html`<div class="cajetin">${filas.map(([k, val]) => html`<div><span class="cap">${k}</span><b>${val}</b></div>`)}<div class="ancho"><span class="cap">Fuente</span><b style="font-size:var(--fs-11);color:var(--txt-3);font-weight:500">RUNT, consulta simulada · ${cuando(v.soat.consulta)}</b></div></div>`;
  }

  function filaDoc(v, doc) {
    const c = DRS.calc.doc(v, doc);
    const esSoat = doc === 'soat';
    return html`<button class="fila" ${crudo(UI.irAttrs('documento', { v: v.id, doc }))}>
      <span class="fila-ico">${ico(esSoat ? 'garantia' : 'certificado')}</span>
      <span><span class="t13" style="display:block">${esSoat ? 'SOAT' : 'Tecnomecánica'}</span><span class="t11" style="display:block">Vence el ${U.fechaCorta(c.vence)} · ${esSoat ? v.soat.aseguradora : v.tecno.cda}</span></span>
      <span style="display:flex;align-items:center;gap:6px">${UI.chipEstado(c.estado, c.etiqueta)}${ico('chevron', 's16')}</span>
    </button>`;
  }

  function filaMant(v, tipo) {
    const esAceite = tipo === 'aceite';
    const c = esAceite ? DRS.calc.aceite(v) : DRS.calc.llantas(v);
    const sub = esAceite ? `Faltan ${num(c.faltan)} km · a los ${num(c.proximoKm)} km` : `~${num(Math.round(c.faltan / 10) * 10)} km de vida estimada`;
    return html`<button class="fila" ${crudo(UI.irAttrs('mantenimiento', { v: v.id, tipo }))}>
      <span class="fila-ico">${ico(esAceite ? 'kilometraje' : 'llanta')}</span>
      <span><span class="t13" style="display:block">${esAceite ? 'Cambio de aceite' : 'Llantas'}</span><span class="t11" style="display:block">${sub}</span></span>
      <span style="display:flex;align-items:center;gap:6px">${UI.chipEstado(c.estado, c.etiqueta)}${ico('chevron', 's16')}</span>
    </button>`;
  }

  function historial(v) {
    const ms = DRS.q.mantenimientos(v.id);
    return html`<div class="tiempo">${ms.map((m) => html`<div class="hito${m.cert ? ' cert' : ''}${m.nuevo ? ' nuevo' : ''}">
      <div class="hito-top"><span class="t13">${m.titulo}</span><span class="cap num" style="color:var(--txt-2)">${U.fechaCorta(DRS.reloj.dia(m.d))}</span></div>
      <div class="t11">${m.lugar} · ${num(m.km)} km${m.costo ? ` · ${pesos(m.costo)}` : ''}</div>
      ${m.cert ? html`<span class="chip chip-luz">${ico('verificado')}Verificado por DRS</span>` : html`<span class="chip">${ico('editar')}Registrado por ti${m.factura ? ' · con factura' : ''}</span>`}
      ${m.nuevo ? html` <span class="chip chip-pos">${ico('check')}Nuevo · reserva ${m.reserva}</span>` : ''}
    </div>`)}</div>`;
  }

  function alertas() {
    const A = DRS.estado.alertas;
    const filas = [
      ['soat', 'garantia', 'SOAT y tecnomecánica', '30, 15, 7 y 1 día antes, y el día del vencimiento'],
      ['aceite', 'kilometraje', 'Cambio de aceite', 'A los 500 km y a los 100 km'],
      ['llantas', 'llanta', 'Llantas', 'Cuando falten 5.000 km de vida estimada'],
      ['pyp', 'calendario', 'Pico y placa', 'La noche anterior y a las 6:00 a. m.'],
      ['km', 'editar', 'Actualizar kilometraje', 'Si pasan 30 días sin hacerlo'],
    ];
    return html`<div class="lista">${filas.map(([k, i, t, s]) => html`<div class="fila">
      <span class="fila-ico">${ico(i)}</span>
      <span><span class="t13" style="display:block">${t}</span><span class="t11" style="display:block">${s}</span></span>
      <button class="inter" role="switch" aria-checked="${A[k] ? 'true' : 'false'}" aria-label="Alertas de ${t}" data-a="alerta" data-k="${k}"></button>
    </div>`)}</div>`;
  }

  const TIPOS_MANT = [['aceite', 'Cambio de aceite'], ['frenos', 'Frenos'], ['llantas', 'Llantas'], ['bateria', 'Batería'], ['lavado', 'Lavado'], ['otro', 'Otro']];
  function hojaMant(vid) {
    const v = DRS.q.vehiculo(vid);
    const ui = (DRS.tel.ui.mant = { tipo: 'aceite', foto: false });
    const pintar = () => html`<div class="hoja-cab"><div><div class="ceja">${placaTxt(v.placa)} · ${UI.modelo(v)}</div><h2 class="d d-34" style="margin-top:8px">Registrar mantenimiento</h2></div><button class="hoja-cerrar" data-a="hoja-cerrar" aria-label="Cerrar">${ico('cerrar')}</button></div>
      <div class="fichas">${TIPOS_MANT.map(([k, n]) => html`<button class="ficha" aria-pressed="${ui.tipo === k ? 'true' : 'false'}" data-a="mant-tipo" data-k="${k}">${n}</button>`)}</div>
      <div class="campos-2"><div class="campo"><label class="cap" for="mant-fecha">Fecha</label><input id="mant-fecha" type="date" value="${U.isoDia(DRS.reloj.hoy())}" max="${U.isoDia(DRS.reloj.hoy())}"></div>
        <div class="campo"><label class="cap" for="mant-km">Kilometraje</label><input id="mant-km" value="${num(v.km)}" inputmode="numeric"></div></div>
      <div class="campos-2"><div class="campo"><label class="cap" for="mant-lugar">Lugar</label><input id="mant-lugar" value="Taller de barrio"></div>
        <div class="campo"><label class="cap" for="mant-costo">Costo</label><input id="mant-costo" value="180.000" inputmode="numeric"></div></div>
      <button class="btn btn-fantasma btn-chico" data-a="mant-foto" style="width:100%;margin-bottom:12px">${ico('sesion-foto', 's16')}${ui.foto ? 'Factura adjunta · factura.jpg' : 'Adjuntar foto de la factura'}</button>
      <button class="btn btn-luz" data-a="mant-guardar" data-v="${v.id}">Guardar en el historial</button>
      <p class="t11" style="margin-top:10px">Lo que registras tú queda como «Registrado por ti». Lo que hace un aliado queda verificado por DRS.</p>`;
    DRS.hojaMant = { pintar, v };
    DRS.tel.hoja(pintar());
  }
  const repintarMant = () => { const h = DRS.tel.hojaActual(); if (h && DRS.hojaMant) { const vals = ['mant-fecha', 'mant-km', 'mant-lugar', 'mant-costo'].map((id) => (U.$('#' + id, h) || {}).value); h.innerHTML = '<div class="hoja-asa"></div>' + String(DRS.hojaMant.pintar()); ['mant-fecha', 'mant-km', 'mant-lugar', 'mant-costo'].forEach((id, i) => { const e = U.$('#' + id, h); if (e && vals[i] != null) e.value = vals[i]; }); } };
  Object.assign(DRS.acciones, {
    'mant-hoja': (d) => hojaMant(d.v),
    'mant-tipo': (d) => { DRS.tel.ui.mant.tipo = d.k; repintarMant(); },
    'mant-foto': () => { DRS.tel.ui.mant.foto = true; repintarMant(); },
    'mant-guardar': (d) => {
      const h = DRS.tel.hojaActual();
      const val = (id) => (U.$('#' + id, h) || {}).value || '';
      let fecha = U.deIso(val('mant-fecha') || U.isoDia(DRS.reloj.hoy()));
      if (fecha > DRS.reloj.hoy()) fecha = DRS.reloj.hoy();   // un mantenimiento no puede quedar en el futuro
      const km = Number(val('mant-km').replace(/\D/g, '')) || DRS.q.vehiculo(d.v).km;
      const costo = Number(val('mant-costo').replace(/\D/g, '')) || 0;
      const tipo = DRS.tel.ui.mant.tipo;
      const titulo = (TIPOS_MANT.find((t) => t[0] === tipo) || [0, 'Mantenimiento'])[1];
      DRS.cambiar((s) => {
        s.mantenimientos.push({ id: `m${Date.now()}`, vehiculo: d.v, d: U.diasEntre(DRS.reloj.hoy(), fecha), tipo, titulo, lugar: val('mant-lugar') || 'Sin lugar', km, costo, cert: false, factura: DRS.tel.ui.mant.foto });
        const v = s.vehiculos.find((x) => x.id === d.v);
        if (tipo === 'aceite') { v.aceite.ultimoKm = km; v.aceite.ultimoD = U.diasEntre(DRS.reloj.hoy(), fecha); }
        if (km > v.km) { v.km = km; v.kmD = 0; }
      }, { tipo: 'mantenimiento' });
      DRS.tel.cerrarHoja();
      DRS.tel.tostada(tipo === 'aceite' ? 'Guardado · recalculamos tu próximo cambio de aceite' : 'Mantenimiento guardado en tu historial');
    },
  });

  DRS.pantallas.garaje = {
    raiz: true,
    render(p, ctx) {
      const v = DRS.q.vehiculo();
      const vs = DRS.q.vehiculos();
      return html`${UI.cabRaiz()}<div class="cuerpo">
        <div class="titulo"><h1 class="d d-44">Mi garaje</h1><p class="t13">Tu vehículo, sus papeles y todo lo que le has hecho, en un solo plano.</p></div>
        <div class="seg" role="tablist" aria-label="Tus vehículos">${vs.map((x) => html`<button role="tab" aria-selected="${x.id === v.id ? 'true' : 'false'}" data-a="vehiculo" data-id="${x.id}">${UI.modeloCorto(x)}</button>`)}<button ${crudo(UI.irAttrs('agregar-vehiculo'))}>+ Agregar</button></div>
        <div class="plano">${crudo(DRS.bp.vehiculo(v, { ancho: 380, dibujar: ctx.anim, globos: GLOBOS[v.tipo], cotas: true }))}</div>
        ${cajetin(v)}
        <button class="btn btn-fantasma" data-a="hoja-km" data-v="${v.id}" style="margin-top:8px">${ico('kilometraje')}Actualizar kilometraje</button>
        <section class="bloque">${UI.bloqueCab('Documentos', 'Se consultan solos; aquí ves su estado.')}<div class="lista">${filaDoc(v, 'soat')}${filaDoc(v, 'tecno')}</div></section>
        <section class="bloque">${UI.bloqueCab('Próximos mantenimientos', 'Calculados con tu kilometraje.')}<div class="lista">${filaMant(v, 'aceite')}${filaMant(v, 'llantas')}</div></section>
        <section class="bloque">${UI.bloqueCab('Historial', 'Lo hecho en aliados queda verificado por DRS.')}${historial(v)}
          <button class="btn btn-fantasma" data-a="mant-hoja" data-v="${v.id}">${ico('mas')}Registrar mantenimiento</button></section>
        <section class="bloque">${UI.bloqueCab('Alertas', 'Elige qué te avisamos y cuándo.')}${alertas()}</section>
      </div>`;
    },
  };

  DRS.pantallas.documento = {
    render(p) {
      const v = DRS.q.vehiculo(p.v);
      const d = v[p.doc];
      const c = DRS.calc.doc(v, p.doc);
      const esSoat = p.doc === 'soat';
      const nombre = esSoat ? 'SOAT' : 'Tecnomecánica';
      const cons = DRS.tel.ui.consultando === `${v.id}:${p.doc}`;
      const usados = Math.min(100, Math.max(0, ((365 - c.dias) / 365) * 100));
      const datos = esSoat
        ? [['Placa', placaTxt(v.placa)], ['Aseguradora', d.aseguradora], ['Póliza', d.poliza], ['Inicio de vigencia', U.fechaCorta(DRS.reloj.dia(d.inicio))], ['Vence', U.fechaCorta(c.vence)]]
        : [['Placa', placaTxt(v.placa)], ['CDA', d.cda], ['Certificado', d.certificado], ['Última revisión', U.fechaCorta(DRS.reloj.dia(d.ultima))], ['Próxima revisión', U.fechaCorta(c.vence)]];
      return html`${UI.cabDet(nombre)}<div class="cuerpo con-cta">
        <div class="titulo"><div class="ceja">${placaTxt(v.placa)} · ${UI.modelo(v)}</div><h1 class="d d-56">${nombre}</h1></div>
        <div class="consulta">
          <div><span class="cap">Última consulta al RUNT</span><div class="t13 t-1">${cons ? 'Consultando…' : cuando(d.consulta)}</div></div>
          <button class="btn btn-fantasma btn-chico" data-a="consultar" data-v="${v.id}" data-doc="${p.doc}" ${crudo(cons ? 'disabled' : '')}>${ico('flecha', 's16')}Consultar</button>
        </div>
        <div class="banda est-${c.estado}${cons ? ' consultando' : ''}">
          <span class="pyp-glifo">${ico(UI.GLIFO[c.estado])}</span>
          <div><div class="d d-56 num" style="color:inherit">${c.dias <= 0 ? 'Vencido' : `${c.dias} ${c.dias === 1 ? 'día' : 'días'}`}</div><div class="t13">${c.dias > 0 ? `para que venza · ${U.fechaLarga(c.vence)}` : 'Renuévalo antes de volver a circular.'}</div></div>
          ${cons ? html`<span class="escaneo"></span>` : ''}
        </div>
        <div class="tarjeta tarjeta-pad">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px"><span class="cap">Vigencia usada</span>${UI.chipEstado(c.estado, c.etiqueta)}</div>
          <div class="prog est-${c.estado}" style="--p:${usados.toFixed(1)}%"><i></i></div>
          <dl class="datos" style="margin:16px 0 0">${datos.map(([k, val]) => html`<dt>${k}</dt><dd>${val}</dd>`)}</dl>
        </div>
        ${esSoat ? html`<section class="bloque">${UI.bloqueCab('Renovarlo aquí', 'Con una aseguradora aliada, sin salir de la app.')}
          <div class="lista">${[['precio', 'Compara el valor antes de pagar'], ['pago', 'Paga con tarjeta, PSE o Nequi'], ['descargar', 'Tu póliza queda en Mi garaje']].map(([i, t]) => html`<div class="fila"><span class="fila-ico">${ico(i)}</span><span class="t13">${t}</span><span></span></div>`)}</div></section>` : ''}
        <p class="t11" style="margin-top:18px">Datos de ejemplo. En la demo, la consulta al RUNT es simulada.</p>
      </div>
      <div class="pie-cta">
        <button class="btn btn-acero" ${crudo(esSoat ? `data-a="soat-iniciar" data-v="${v.id}"` : UI.servAttrs('tecno'))}>${esSoat ? 'Renovar SOAT' : 'Agendar revisión'}</button>
        <button class="btn btn-fantasma" data-a="descargar" data-que="${esSoat ? 'Póliza' : 'Certificado'}" style="margin-top:8px">${ico('descargar')}${esSoat ? 'Descargar póliza' : 'Descargar certificado'}</button>
      </div>`;
    },
  };

  DRS.pantallas.mantenimiento = {
    render(p, ctx) {
      const v = DRS.q.vehiculo(p.v);
      const esAceite = p.tipo === 'aceite';
      const c = esAceite ? DRS.calc.aceite(v) : DRS.calc.llantas(v);
      const nombre = esAceite ? 'Cambio de aceite' : 'Llantas';
      const faltan = esAceite ? c.faltan : Math.round(c.faltan / 10) * 10;
      const datos = esAceite
        ? [['Último cambio', `${num(v.aceite.ultimoKm)} km · ${U.fechaCorta(DRS.reloj.dia(v.aceite.ultimoD))}`], ['Intervalo', `Cada ${num(v.aceite.cadaKm)} km o ${v.aceite.cadaMeses} meses`], ['Próximo', `A los ${num(c.proximoKm)} km o el ${U.fechaCorta(c.fecha)}`], ['Kilometraje hoy', `${num(v.km)} km`]]
        : [['Montadas', `A los ${num(v.llantas.montadasKm)} km`], ['Vida de referencia', `${num(v.llantas.vidaKm)} km (ejemplo)`], ['Alineación y balanceo', U.fechaCorta(DRS.reloj.dia(v.llantas.revisionD))], ['Kilometraje hoy', `${num(v.km)} km`]];
      const guias = esAceite ? ['¿Cada cuánto se cambia el aceite?', '¿Qué aceite usa tu vehículo?'] : ['¿Cómo saber si tus llantas están gastadas?', '¿Cada cuánto alinear y balancear?'];
      return html`${UI.cabDet(nombre)}<div class="cuerpo con-cta">
        <div class="titulo"><div class="ceja">${placaTxt(v.placa)} · ${UI.modelo(v)}</div><h1 class="d d-56">${nombre}</h1>
          <p class="t13">${esAceite ? 'Te avisamos por kilometraje o por tiempo, lo que llegue primero.' : 'Estimamos su vida con el kilometraje que registras.'}</p></div>
        <div class="medidor">${crudo(DRS.bp.tacometro(c.p, c.estado, esAceite ? 'kilometraje' : 'llanta', { anima: ctx.anim }))}
          <div><div class="d d-56 num">${num(faltan)} km</div><div class="t13">${esAceite ? 'para el próximo cambio' : 'de vida estimada'}</div><div style="margin-top:10px">${UI.chipEstado(c.estado, c.etiqueta)}</div></div>
        </div>
        <div class="tarjeta tarjeta-pad"><dl class="datos" style="margin:0">${datos.map(([k, val]) => html`<dt>${k}</dt><dd>${val}</dd>`)}</dl></div>
        <section class="bloque">${UI.bloqueCab('Conoce más')}<div class="lista">${guias.map((g) => html`<button class="fila" ${crudo(UI.proxAttrs('guias'))}><span class="fila-ico">${ico('informacion')}</span><span class="t13">${g}</span>${ico('chevron')}</button>`)}</div></section>
      </div>
      <div class="pie-cta">
        <button class="btn btn-acero" ${crudo(UI.irAttrs('cotizar', { v: v.id, necesidad: esAceite ? 'aceite' : 'alineacion' }))}>${esAceite ? 'Agendar cambio de aceite' : 'Agendar revisión'}</button>
        <p class="t11">En talleres aliados queda como mantenimiento verificado.</p>
      </div>`;
    },
  };
})();
