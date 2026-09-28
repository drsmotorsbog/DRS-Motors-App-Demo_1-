/* DRS Motors · demo — Inicio: vehículo, documentos, pico y placa, recomendaciones, promos y beneficios */
(function () {
  'use strict';
  const DRS = window.DRS;
  const U = DRS.util;
  const UI = DRS.ui;
  const { html, crudo, ico, num, pesos, placaTxt } = U;

  function saludo(u, hoy) {
    return html`<div class="saludo">
      <div class="ceja">${U.fechaLarga(hoy)}</div>
      <div class="saludo-fila"><h1 class="d d-44">Hola, ${u.nombre}</h1>
      <button class="pts" ${crudo(UI.servAttrs('beneficios'))} aria-label="${num(u.puntos)} puntos. Ver beneficios">${ico('beneficios')}<b class="num" data-puntos>${num(u.puntos)}</b>pts</button></div>
    </div>`;
  }

  function tiraReserva(r) {
    const c = DRS.q.comercio(r.comercio);
    const listo = r.estado === 'listo';
    const est = DRS.estadoInfo(r.estado);
    return html`<button class="en-curso${listo ? ' listo' : ''}" ${crudo(UI.irAttrs('reserva', { id: r.id }))}>
      <span class="pulso" aria-hidden="true"></span>
      <span><span class="ceja">${est.nombre}</span><span class="t13" style="display:block">${r.servicio} · ${c.nombre}</span></span>
      <span class="hora-apilada"><span class="d d-26 num">${U.horaTxt(r.hora).replace(/ [ap]\. m\./, '')}</span><span class="cap">${U.aMin(r.hora) < 720 ? 'a. m.' : 'p. m.'}</span></span>
    </button>`;
  }

  function tarjetaVehiculo(v, anim) {
    return html`<article class="tarjeta veh">
      <div class="veh-top"><span class="ceja">Tu vehículo</span><span class="cap">${v.clase} · ${v.servicio}</span></div>
      <div class="veh-plano">${crudo(DRS.bp.vehiculo(v, { ancho: 340, dibujar: anim, retraso: 120, modo: anim ? 'llega' : 'ninguno' }))}</div>
      <div class="veh-pie">
        <div><div class="d d-26">${UI.modelo(v)}</div><div class="t13">${v.modelo} · ${v.carroceria} · ${v.color}</div></div>
        <div class="veh-km"><div class="d d-20 num">${num(v.km)} km</div><button class="enlace" data-a="hoja-km" data-v="${v.id}">Actualizar</button></div>
      </div>
    </article>`;
  }

  function alDia(v, anim) {
    const so = DRS.calc.doc(v, 'soat'), te = DRS.calc.doc(v, 'tecno'), ac = DRS.calc.aceite(v), ll = DRS.calc.llantas(v);
    const dias = (n) => (n <= 0 ? 'Vencido' : `${num(n)} ${n === 1 ? 'día' : 'días'}`);
    const items = [
      { t: 'SOAT', ico: 'garantia', c: so, fig: dias(so.dias), sub: `Vence el ${U.fechaCorta(so.vence)}`, ir: ['documento', { v: v.id, doc: 'soat' }] },
      { t: 'Tecnomecánica', ico: 'certificado', c: te, fig: dias(te.dias), sub: `Vence el ${U.fechaCorta(te.vence)}`, ir: ['documento', { v: v.id, doc: 'tecno' }] },
      { t: 'Cambio de aceite', ico: 'kilometraje', c: ac, fig: ac.faltan <= 0 ? 'Vencido' : `${num(ac.faltan)} km`, sub: `A los ${num(ac.proximoKm)} km`, ir: ['mantenimiento', { v: v.id, tipo: 'aceite' }] },
      { t: 'Llantas', ico: 'llanta', c: ll, fig: `${num(Math.round(ll.faltan / 10) * 10)} km`, sub: 'De vida estimada', ir: ['mantenimiento', { v: v.id, tipo: 'llantas' }] },
    ];
    const nombre = v.tipo === 'moto' ? 'Tu moto al día' : 'Tu carro al día';
    return html`<section class="bloque">${UI.bloqueCab(nombre, 'Qué vence, cuándo y qué hacer.')}
      <div class="rejilla-2">${items.map((it) => html`<button class="tarjeta tile" ${crudo(UI.irAttrs(it.ir[0], it.ir[1]))} aria-label="${it.t}: ${it.c.etiqueta}, ${it.fig}">
        <span class="tile-top">${crudo(DRS.bp.tacometro(it.c.p, it.c.estado, it.ico, { anima: anim }))}${UI.chipEstado(it.c.estado, it.c.etiqueta)}</span>
        <span class="etq">${it.t}</span>
        <span class="d d-34 num">${it.fig}</span>
        <span class="t11">${it.sub}</span>
      </button>`)}</div>
    </section>`;
  }

  function picoPlaca(v, hoy) {
    const R = DRS.reloj;
    const r = R.picoPlaca(hoy, v);
    let titulo, estado, texto;
    if (!r.aplica) {
      titulo = 'Hoy puedes circular'; estado = 'pos';
      texto = r.motivo === 'moto' ? 'Las motos no tienen pico y placa en Bogotá.'
        : r.motivo === 'festivo' ? `Es festivo (${r.festivo}): no aplica la medida.`
          : `Es ${r.motivo}: la medida rige de lunes a viernes.`;
    } else if (r.restringido) {
      titulo = 'Hoy no sale'; estado = 'neg';
      texto = `Tu ${v.tipo === 'moto' ? 'moto' : 'carro'} no sale hoy, buen día para dejarlo lavando.`;
    } else {
      titulo = 'Hoy puedes circular'; estado = 'pos';
      const prox = R.proximoRestringido(U.sumarDias(hoy, 1), v);
      texto = prox ? `Tu próxima restricción es el ${U.fechaLarga(prox)}.` : 'Esta semana no tienes restricción.';
    }
    const detalle = r.aplica
      ? `Hoy no circulan placas terminadas en ${UI.listaY(r.noCirculan)} · ${R.REGLA.horario}`
      : v.tipo === 'moto' ? `Placa ${placaTxt(v.placa)} · exenta` : `Placa terminada en ${r.digito} · lunes a viernes, ${R.REGLA.horario}`;
    const semana = v.tipo === 'moto' ? '' : html`<div class="semana" role="list" aria-label="Pico y placa esta semana">${R.semana(hoy).map((d) => {
      const x = R.picoPlaca(d, v);
      const cls = [x.restringido ? 'restringido' : !x.aplica ? 'libre' : '', U.isoDia(d) === U.isoDia(hoy) ? 'hoy' : ''].join(' ');
      return html`<div class="dia ${cls}" role="listitem" aria-label="${U.fechaLarga(d)}: ${x.restringido ? 'no sale' : 'puede circular'}"><span class="cap">${U.DIAS_1[d.getDay()]}</span><span class="d d-20 num">${d.getDate()}</span></div>`;
    })}</div>`;
    return html`<section class="bloque">
      <article class="tarjeta pyp">
        <div class="pyp-top"><span class="ceja">Pico y placa · ${R.REGLA.ciudad}</span>${ico('calendario', 's20')}</div>
        <div class="pyp-estado est-${estado}"><span class="pyp-glifo">${ico(UI.GLIFO[estado])}</span><h2 class="d d-34" style="color:inherit">${titulo}</h2></div>
        <p class="t13" style="margin:0">${detalle}</p>
        ${semana}
        <p class="t13 t-1" style="margin:0 0 14px">${texto}</p>
        ${r.restringido
    ? html`<button class="btn btn-borde" ${crudo(UI.servAttrs('lavaderos'))}>${ico('detailing')}Reservar lavado</button>`
    : UI.enlace('Ver calendario del mes', UI.servAttrs('calendario'))}
        <p class="fuente">Fuente: ${R.REGLA.fuente}.</p>
      </article>
    </section>`;
  }

  function recomendaciones(v, hoy) {
    const recs = [];
    const ac = DRS.calc.aceite(v);
    if (ac.faltan <= 1000) recs.push({ ico: 'kilometraje', texto: `Te faltan ~${num(Math.round(ac.faltan / 10) * 10)} km para el cambio de aceite.`, accion: 'Agendar', attrs: UI.irAttrs('mantenimiento', { v: v.id, tipo: 'aceite' }) });
    const so = DRS.calc.doc(v, 'soat');
    if (so.dias <= 30) recs.push({ ico: 'garantia', texto: `Tu SOAT vence en ${so.dias} días. Renuévalo sin salir de la app.`, accion: 'Ver opciones', attrs: UI.irAttrs('documento', { v: v.id, doc: 'soat' }) });
    const pu = DRS.reloj.proximoPuente(hoy);
    if (pu) recs.push({ ico: 'detailing', texto: `Se viene puente festivo (${U.diaMes(pu.sabado)} – ${U.diaMes(pu.lunes)}): lavado completo con 15 % en Nimbo Autolavado.`, accion: 'Reservar', attrs: UI.irAttrs('comercio', { id: 'c2' }) });
    const te = DRS.calc.doc(v, 'tecno');
    if (te.dias <= 45) recs.push({ ico: 'certificado', texto: `Tu tecnomecánica vence en ${te.dias} días.`, accion: 'Agendar', attrs: UI.servAttrs('tecno') });
    if (!recs.length) return '';
    return html`<section class="bloque">${UI.bloqueCab('Para esta semana', 'Cada aviso trae su siguiente paso.')}
      <div class="riel">${recs.map((r) => html`<article class="tarjeta rec">
        <div class="rec-top"><span class="rec-ico">${ico(r.ico)}</span></div>
        <p class="t13" style="margin:0">${r.texto}</p>
        ${UI.enlace(r.accion, r.attrs)}
      </article>`)}</div>
    </section>`;
  }

  function servicios() {
    const s = [
      { que: 'lavaderos', ico: 'detailing', t: 'Lavaderos', chip: '−20 %' },
      { que: 'talleres', ico: 'taller', t: 'Talleres' },
      { que: 'tecno', ico: 'certificado', t: 'Tecnomecánica' },
      { que: 'soat', ico: 'garantia', t: 'SOAT' },
      { que: 'informe', ico: 'peritaje', t: 'Informe vehicular' },
      { que: 'tramites', ico: 'traspaso', t: 'Trámites DRS' },
    ];
    return html`<section class="bloque">${UI.bloqueCab('Servicios', '', UI.enlace('Ver todos', 'data-a="tab" data-tab="servicios"'))}
      <div class="riel">${s.map((x) => html`<button class="tarjeta serv" ${crudo(UI.servAttrs(x.que))}>${x.chip ? html`<span class="chip chip-lleno">${x.chip}</span>` : ''}${ico(x.ico)}<span class="cap">${x.t}</span></button>`)}</div>
    </section>`;
  }

  function promos() {
    const R = DRS.reloj;
    const lista = DRS.estado.comercios.flatMap((c) => [c.promo, ...(c.promos || [])].filter((pr) => pr && pr.estado !== 'terminada').map((pr) => ({ ...c, promo: pr }))).sort((a, b) => a.km - b.km);
    return html`<section class="bloque">${UI.bloqueCab('Promos cerca de ti', 'Horas valle de lavaderos aliados.', UI.enlace('Ver todas', UI.servAttrs('lavaderos')))}
      <div class="riel">${lista.map((c) => {
        const srv = DRS.estado.servicios.find((s) => s.id === c.promo.servicio);
        const base = srv.precio.automovil;
        const desc = Math.round((base * (100 - c.promo.pct)) / 100 / 100) * 100;
        const hasta = U.fechaCorta(R.dia(c.promo.hasta));
        const cond = c.promo.puente
          ? `Aplica a ${srv.nombre.toLowerCase()} de automóvil durante el próximo puente festivo. ${c.promo.cupos} cupos. Vigente hasta el ${hasta}.`
          : `Aplica a ${srv.nombre.toLowerCase()} de automóvil, ${c.promo.dias}, ${c.promo.franja} Hasta ${c.promo.cupos} cupos por semana. Vigente hasta el ${hasta}.`;
        return html`<button class="tarjeta promo" ${crudo(UI.irAttrs('comercio', { id: c.id }))}>
          <span class="promo-plano" style="display:block">${crudo(DRS.bp.bahias({ n: c.bahias, ocupadas: c.ocupadas, ancho: 230 }))}<span class="chip chip-lleno">−${c.promo.pct} % · ${c.promo.chip}</span></span>
          <span class="promo-info" style="display:block">
            <span class="d d-20" style="display:block">${c.nombre}</span>
            <span class="t11" style="display:block">${c.zona} · ${num(c.km)} km · <span class="calif"><b>${num(c.calif)}</b><i>/5</i></span></span>
            <span class="precio"><span class="d d-20 num">${pesos(desc)}</span><span class="t11 tachado num">${pesos(base)}</span></span>
            <span class="cap" style="display:block;margin-top:4px">${srv.nombre}</span>
            <span class="cond" style="display:block">${cond}</span>
          </span>
        </button>`;
      })}</div>
    </section>`;
  }

  function beneficios(u) {
    const m = u.meta;
    const faltan = m.total - m.hechos;
    return html`<section class="bloque">${UI.bloqueCab('Tus beneficios', '', UI.enlace('Ver todo', UI.servAttrs('beneficios')))}
      <article class="tarjeta benef">
        <span class="ceja">Puntos DRS</span>
        <div class="benef-num"><span class="d d-56 num" data-puntos>${num(u.puntos)}</span><span class="etq t-3">pts</span></div>
        <p class="t13 t-1" style="margin:0">${m.nombre}</p>
        <div class="meta-seg" aria-label="${m.hechos} de ${m.total} lavados">${Array.from({ length: m.total }, (_, i) => html`<i class="${i < m.hechos ? 'ok' : i === m.total - 1 ? 'ultimo' : ''}"></i>`)}</div>
        <p class="t11" style="margin:0">Llevas ${m.hechos} de ${m.total}. ${faltan === 1 ? 'El próximo tiene el descuento.' : faltan === 0 ? 'Tu descuento está listo para usar.' : `Te faltan ${faltan}.`}</p>
      </article>
    </section>`;
  }

  DRS.pantallas.inicio = {
    raiz: true,
    render(p, ctx) {
      const u = DRS.q.usuario();
      const v = DRS.q.vehiculo();
      const hoy = DRS.reloj.hoy();
      const act = DRS.q.activaUsuario();
      return html`${UI.cabRaiz()}<div class="cuerpo">
        ${saludo(u, hoy)}
        ${act ? tiraReserva(act) : ''}
        ${tarjetaVehiculo(v, ctx.anim)}
        ${alDia(v, ctx.anim)}
        ${picoPlaca(v, hoy)}
        ${recomendaciones(v, hoy)}
        ${servicios()}
        ${promos()}
        ${beneficios(u)}
      </div>`;
    },
    alMontar() { DRS.tel.ui.puntos = DRS.q.usuario().puntos; },
    alRefrescar(el) {
      const ahora = DRS.q.usuario().puntos;
      const antes = DRS.tel.ui.puntos;
      if (antes != null && ahora > antes) U.$$('[data-puntos]', el).forEach((x) => U.contar(x, ahora, { desde: antes, ms: 1100 }));
      DRS.tel.ui.puntos = ahora;
    },
  };
})();
