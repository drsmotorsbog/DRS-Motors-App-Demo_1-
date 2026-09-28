/* DRS Motors · demo — Reservas: lista, detalle con seguimiento y QR, y calificación */
(function () {
  'use strict';
  const DRS = window.DRS;
  const U = DRS.util;
  const UI = DRS.ui;
  const { html, crudo, ico, num, pesos, placaTxt } = U;

  const EN_CURSO = ['recibido', 'en_proceso', 'listo'];
  const grupo = (r) => (r.estado === 'confirmada' ? 'proximas' : EN_CURSO.includes(r.estado) ? 'curso' : 'historial');   // finalizada y cancelada van al historial
  const fechaRes = (r) => (r.d === 0 ? 'Hoy' : r.d === 1 ? 'Mañana' : r.d === -1 ? 'Ayer' : U.fechaCorta(DRS.reloj.dia(r.d)));

  function tarjeta(r) {
    const c = DRS.q.comercio(r.comercio);
    const v = DRS.q.vehiculo(r.vehiculo);
    const est = DRS.estadoInfo(r.estado) || { nombre: 'Cancelada' };
    const color = r.estado === 'listo' ? 'var(--pos)' : r.estado === 'cancelada' ? 'var(--neg)' : r.estado === 'finalizada' ? 'var(--txt-3)' : 'var(--acc-graf)';
    return html`<button class="tarjeta tarjeta-pad" style="display:block;width:100%;text-align:left;margin-bottom:8px" ${crudo(UI.irAttrs('reserva', { id: r.id }))}>
      <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:10px">
        <div><div class="ceja" style="color:${color};letter-spacing:.22em">${est.nombre}</div><div class="d d-26" style="margin-top:8px">${c.nombre}</div>
          <div class="t13" style="margin-top:4px">${r.servicio} · ${UI.modeloCorto(v)} ${placaTxt(r.placa)}</div></div>
        <div style="text-align:right;flex:none"><div class="d d-26 num">${U.horaTxt(r.hora).replace(/ [ap]\. m\./, '')}</div><div class="cap" style="margin-top:6px">${U.aMin(r.hora) < 720 ? 'a. m.' : 'p. m.'} · ${fechaRes(r)}</div></div>
      </div>
      <div class="sep" style="margin:12px 0 10px"></div>
      <div style="display:flex;justify-content:space-between;align-items:center"><span class="cap">${r.id}</span>${r.nota ? html`<span class="calif"><b>${r.nota}</b><i>/5 · tu calificación</i></span>` : html`<span class="enlace">Ver ${ico('chevron')}</span>`}</div>
    </button>`;
  }

  DRS.pantallas.reservas = {
    raiz: true,
    render() {
      const rs = DRS.q.reservasUsuario().sort((a, b) => b.d - a.d || U.aMin(b.hora) - U.aMin(a.hora));
      const g = { proximas: rs.filter((r) => grupo(r) === 'proximas'), curso: rs.filter((r) => grupo(r) === 'curso'), historial: rs.filter((r) => grupo(r) === 'historial') };
      let sel = DRS.tel.ui.resSeg;
      if (!sel) sel = g.curso.length ? 'curso' : 'proximas';
      const tabs = [['proximas', 'Próximas'], ['curso', 'En curso'], ['historial', 'Historial']];
      const lista = g[sel];
      const vacio = {
        proximas: ['Sin reservas próximas', 'Reserva un lavado en dos toques, con el pago dentro de la app.'],
        curso: ['Nada en curso', 'Cuando dejes tu vehículo, aquí ves en qué va el servicio.'],
        historial: ['Aún no hay historial', 'Tus servicios terminados quedan aquí y en Mi garaje.'],
      }[sel];
      return html`${UI.cabRaiz()}<div class="cuerpo">
        <div class="titulo"><h1 class="d d-44">Reservas</h1></div>
        <div class="seg" role="tablist" aria-label="Reservas">${tabs.map(([k, t]) => html`<button role="tab" aria-selected="${k === sel ? 'true' : 'false'}" data-a="res-seg" data-k="${k}">${t}${g[k].length ? ` · ${g[k].length}` : ''}</button>`)}</div>
        ${lista.length ? lista.map(tarjeta) : html`<div class="vacio"><div class="d d-26">${vacio[0]}</div><p class="t13">${vacio[1]}</p><button class="btn btn-borde" ${crudo(UI.proxAttrs('lavaderos'))}>${ico('detailing')}Reservar lavado</button></div>`}
      </div>`;
    },
  };

  DRS.pantallas.reserva = {
    render(p) {
      const r = DRS.q.reserva(p.id);
      const c = DRS.q.comercio(r.comercio);
      const v = DRS.q.vehiculo(r.vehiculo);
      const idx = Math.max(0, DRS.ESTADOS.findIndex((e) => e.id === r.estado));
      const hist = {};
      (r.historial || []).forEach((h) => { hist[h.estado] = h; });
      const listo = r.estado === 'listo';
      const puedeCalificar = (listo || r.estado === 'finalizada') && !r.nota;
      const precioSrv = r.total - (r.extras.length ? 6000 : 0);
      return html`${UI.cabDet(`Reserva ${r.id}`)}<div class="cuerpo con-cta">
        <div class="titulo"><div class="ceja">${c.nombre} · ${c.zona}</div><h1 class="d d-44">${r.servicio}</h1>
          <p class="t13">${fechaRes(r)} · ${U.horaTxt(r.hora)} · bahía ${r.bahia} · ${UI.modeloCorto(v)} ${placaTxt(r.placa)}</p></div>
        ${r.estado === 'cancelada' ? html`<div class="banda est-neg"><span class="pyp-glifo">${ico('cerrar')}</span><div><div class="d d-34" style="color:inherit">Reserva cancelada</div><div class="t13">Devolvimos ${pesos(r.total)} a tu medio de pago (reembolso simulado).</div></div></div>` : ''}
        ${listo ? html`<div class="banda est-pos"><span class="pyp-glifo">${ico('check')}</span><div><div class="d d-34" style="color:inherit">Listo para recoger</div><div class="t13">Pasa por tu ${UI.modeloCorto(v)} a ${c.nombre}.${r.puntos ? ` Sumaste ${num(r.puntos)} puntos.` : ''}</div></div></div>` : ''}
        <div class="tarjeta tarjeta-pad">
          <div class="estados" aria-label="Seguimiento">${DRS.ESTADOS.map((e, i) => {
            const cls = i < idx || (i === idx && r.estado === 'finalizada') ? 'hecho' : i === idx ? 'actual' : '';
            const h = hist[e.id];
            return html`<div class="est ${cls}"><i>${cls === 'hecho' ? ico('check') : ''}</i><span class="etq">${e.nombre}</span><time>${h ? `${h.d === 0 ? '' : fechaRes(h) + ', '}${U.horaTxt(h.h)}` : ''}</time></div>`;
          })}</div>
        </div>
        <div class="tarjeta qr-caja" style="margin-top:8px">
          <div class="qr">${crudo(DRS.bp.qr(r.id))}</div>
          <div><span class="cap">Código de reserva</span><div class="d d-34" style="margin:6px 0">${r.id}</div><p class="t13" style="margin:0">Muéstralo al llegar. El lavadero ya ve tu pago.</p></div>
        </div>
        <section class="bloque">${UI.bloqueCab('Pago')}
          <div class="tarjeta tarjeta-pad"><dl class="datos" style="margin:0">
            ${(r.lineas || [[r.servicio, precioSrv], ...r.extras.map((x) => [x, 6000])]).map(([k, val]) => html`<dt>${k}</dt><dd class="num${val < 0 ? ' t-luz' : ''}">${val < 0 ? '−' + pesos(-val) : pesos(val)}</dd>`)}
            <dt>Total</dt><dd><span class="d d-26 num">${pesos(r.total)}</span></dd>
            <dt>Medio</dt><dd>${r.medio} · <span style="color:var(--pos)">pagado</span></dd>
          </dl></div>
          <p class="t11" style="margin-top:10px">Puedes reprogramar o cancelar sin costo hasta 2 horas antes. Después aplica la política del comercio.</p>
        </section>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:14px">
          <button class="btn btn-fantasma btn-chico" ${crudo(UI.proxAttrs('mapa'))}>${ico('ubicacion', 's16')}Cómo llegar</button>
          <button class="btn btn-fantasma btn-chico" data-a="res-cambios" data-id="${r.id}" ${crudo(['confirmada'].includes(r.estado) ? '' : 'disabled')}>${ico('calendario', 's16')}Reprogramar o cancelar</button>
        </div>
      </div>
      ${puedeCalificar ? html`<div class="pie-cta"><button class="btn btn-acero" data-a="hoja-calificar" data-id="${r.id}">Calificar servicio</button><p class="t11">Ganas 50 puntos por calificar.</p></div>` : ''}
      ${r.nota ? html`<div class="pie-cta"><p class="t13" style="text-align:center;margin:0">Calificaste con <b class="t-1">${r.nota}/5</b>. Gracias: ayuda a otros conductores.</p></div>` : ''}`;
    },
  };

  /** Reprogramar (franjas libres de hoy y mañana) o cancelar sin costo hasta 2 horas antes. */
  function hojaCambios(id) {
    const r = DRS.q.reserva(id);
    const c = DRS.q.comercio(r.comercio);
    const ahora = DRS.reloj.ahora();
    const minAhora = ahora.getHours() * 60 + ahora.getMinutes();
    const faltan = (r.d * 1440) + U.aMin(r.hora) - minAhora;
    const gratis = faltan >= 120;
    const opciones = [];
    for (let d = r.d; d <= r.d + 1 && opciones.length < 6; d++) {
      for (let m = 8 * 60; m <= 17 * 60 && opciones.length < 6; m += 30) {
        if (d === 0 && m <= minAhora + 30) continue;
        if (d === r.d && U.deMin(m) === r.hora) continue;
        if ((m / 30 + d) % 3 === 0) opciones.push({ d, h: U.deMin(m) });
      }
    }
    DRS.tel.hoja(html`<div class="hoja-cab"><div><div class="ceja">Reserva ${r.id}</div><h2 class="d d-34" style="margin-top:8px">Cambiar tu reserva</h2></div><button class="hoja-cerrar" data-a="hoja-cerrar" aria-label="Cerrar">${ico('cerrar')}</button></div>
      <p class="t13" style="margin:0 0 12px">${c.nombre} · hoy puedes reprogramar sin costo. Cancelar es gratis hasta 2 horas antes; después aplica la política del comercio.</p>
      <div class="ceja" style="margin-bottom:8px">Nuevas franjas</div>
      <div class="res-horas" style="grid-template-columns:repeat(3,1fr);margin-bottom:16px">${opciones.map((o) => html`<button class="res-hora" data-a="res-reprogramar" data-id="${r.id}" data-d="${o.d}" data-h="${o.h}">${o.d === 0 ? 'Hoy' : 'Mañana'} ${U.horaTxt(o.h).replace(/ ([ap])\. m\./, '$1')}</button>`)}</div>
      <button class="btn btn-borde" data-a="res-cancelar" data-id="${r.id}" style="border-color:var(--neg);color:var(--neg)">${ico('cerrar')}${gratis ? 'Cancelar sin costo' : 'Cancelar fuera de plazo'}</button>`);
  }
  Object.assign(DRS.acciones, {
    'res-cambios': (d) => hojaCambios(d.id),
    'res-reprogramar': (d) => {
      const ahoraTxt = (() => { const a = DRS.reloj.ahora(); return U.deMin(a.getHours() * 60 + a.getMinutes()); })();
      DRS.cambiar((s) => {
        const r = s.reservas.find((x) => x.id === d.id);
        r.d = Number(d.d); r.hora = d.h;
        s.notificaciones.unshift({ id: `n${Date.now()}`, d: 0, h: ahoraTxt, ico: 'calendario', titulo: 'Reserva reprogramada', texto: `${r.servicio}: ${Number(d.d) === 0 ? 'hoy' : 'mañana'} a las ${U.horaTxt(d.h)}. Mismo código ${r.id}.`, leida: true, ir: { ruta: 'reserva', p: { id: r.id } }, accion: 'Ver reserva' });
      }, { tipo: 'reprogramar', id: d.id });
      DRS.tel.cerrarHoja();
      DRS.tel.tostada(`Reprogramada: ${Number(d.d) === 0 ? 'hoy' : 'mañana'} a las ${U.horaTxt(d.h)}`, 'calendario');
    },
    'res-cancelar': (d) => {
      DRS.cambiar((s) => { const r = s.reservas.find((x) => x.id === d.id); r.estado = 'cancelada'; }, { tipo: 'cancelar', id: d.id });
      DRS.tel.cerrarHoja();
      DRS.tel.tostada('Reserva cancelada · reembolso simulado', 'informacion');
    },
  });

  /** Hoja de calificación: escala 1–5 en Bebas (el set no tiene estrella y los sellos no son iconos). */
  DRS.hojaCalificar = function (id) {
    const r = DRS.q.reserva(id);
    const c = DRS.q.comercio(r.comercio);
    const ui = (DRS.tel.ui.calif = { id, nota: 0, fichas: [] });
    const fichas = ['Puntual', 'Buen acabado', 'Buena atención', 'Precio justo', 'Volvería'];
    const dibujar = () => html`<div class="hoja-cab"><div><div class="ceja">Reserva ${r.id}</div><h2 class="d d-34" style="margin-top:8px">¿Cómo te fue en ${c.nombre}?</h2></div><button class="hoja-cerrar" data-a="hoja-cerrar" aria-label="Cerrar">${ico('cerrar')}</button></div>
      <p class="t13" style="margin:0 0 12px">Tu calificación ayuda a otros conductores a elegir.</p>
      <div class="escala" role="radiogroup" aria-label="Calificación de 1 a 5">${[1, 2, 3, 4, 5].map((n) => html`<button role="radio" aria-checked="${ui.nota === n ? 'true' : 'false'}" data-a="calif-nota" data-n="${n}">${n}</button>`)}</div>
      <div class="fichas">${fichas.map((f) => html`<button class="ficha" aria-pressed="${ui.fichas.includes(f) ? 'true' : 'false'}" data-a="calif-ficha" data-f="${f}">${f}</button>`)}</div>
      <div class="campo"><label class="cap" for="calif-txt">Cuéntanos algo más (opcional)</label><textarea id="calif-txt" placeholder="Qué te gustó o qué mejorarías"></textarea></div>
      <button class="btn btn-luz" data-a="calif-enviar" ${crudo(ui.nota ? '' : 'disabled')}>Enviar calificación</button>`;
    DRS.hojaCalificar.redibujar = () => {
      const h = DRS.tel.hojaActual();
      if (!h) return;
      const txt = U.$('#calif-txt', h);
      const valor = txt ? txt.value : '';
      h.innerHTML = '<div class="hoja-asa"></div>' + String(dibujar());
      const t2 = U.$('#calif-txt', h);
      if (t2) t2.value = valor;
    };
    DRS.tel.hoja(dibujar());
  };
})();
