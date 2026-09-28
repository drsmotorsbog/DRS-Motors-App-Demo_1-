/* DRS Motors · demo — Beneficios (puntos, metas, bonos, niveles) y calendario de pico y placa */
(function () {
  'use strict';
  const DRS = window.DRS;
  const U = DRS.util;
  const UI = DRS.ui;
  const { html, crudo, ico, num, pesos, placaTxt } = U;

  DRS.extenderSemilla((s) => {
    s.movPuntos = [
      { d: -37, txt: 'Calificaste Espuma 127', pts: 50 },
      { d: -38, txt: 'Lavado completo · Espuma 127', pts: 380 },
      { d: -60, txt: 'Registraste tus 2 vehículos', pts: 90 },
      { d: -70, txt: 'Calificaste Punto Neutro', pts: 50 },
      { d: -71, txt: 'Lavado sencillo · Punto Neutro', pts: 180 },
      { d: -72, txt: 'Bono de bienvenida', pts: 500 },
    ];
  });

  const BONOS = [
    { t: '−15 % en lavado completo', s: 'Nimbo Autolavado · próximo puente festivo', estado: 'Disponible', ir: ['comercio', { id: 'c2' }] },
    { t: '50 % en tu 5.º lavado', s: 'Meta de lavados · cualquier lavadero aliado', estado: 'En progreso' },
    { t: '$ 10.000 en tu primer lavado', s: 'Bono de bienvenida', estado: 'Usado' },
  ];
  const NIVELES = [
    { n: 'Calle', desde: 0, p: 'Puntos por cada pago y metas de lavados.' },
    { n: 'Pista', desde: 1000, p: 'Todo lo anterior y prioridad en franjas con promoción.' },
    { n: 'Podio', desde: 5000, p: 'Todo lo anterior, un lavado sencillo al mes y atención preferente.' },
  ];

  DRS.pantallas.beneficios = {
    render(p, ctx) {
      const u = DRS.q.usuario();
      const nv = DRS.nivel(u.puntos);
      const m = u.meta;
      const movs = (DRS.estado.movPuntos || []).slice().sort((a, b) => b.d - a.d);
      return html`${UI.cabDet('Beneficios')}<div class="cuerpo">
        <div class="titulo"><div class="ceja">Puntos DRS · nivel ${nv.actual.nombre}</div>
          <div class="benef-num" style="margin:6px 0 0"><span class="d d-76 num" data-puntos>${num(u.puntos)}</span><span class="etq t-3">pts</span></div>
          ${nv.sig ? html`<div class="pf-barra" style="margin-top:14px"><i style="width:${(nv.p * 100).toFixed(1)}%"></i></div><p class="t11" style="margin-top:8px">Te faltan ${num(nv.falta)} puntos para el nivel ${nv.sig.nombre}.</p>` : ''}
        </div>

        <section class="bloque" style="margin-top:14px">${UI.bloqueCab('Tu meta', 'Se llena con cada lavado pagado en la app.')}
          <article class="tarjeta benef">
            <p class="t16 t-1" style="margin:0">${m.nombre}</p>
            <div class="meta-grande" aria-label="${m.hechos} de ${m.total} lavados">${Array.from({ length: m.total }, (_, i) => html`<span class="${i < m.hechos ? 'ok' : i === m.total - 1 ? 'premio' : ''}"><b class="d d-26">${i + 1}</b>${i === m.total - 1 ? html`<i class="cap">50 %</i>` : ''}</span>`)}</div>
            <p class="t11" style="margin:0">Llevas ${m.hechos} de ${m.total}. ${m.total - m.hechos === 1 ? 'El próximo tiene el descuento.' : m.total === m.hechos ? 'Tu descuento está listo.' : `Te faltan ${m.total - m.hechos}.`}</p>
          </article>
        </section>

        <section class="bloque">${UI.bloqueCab('Bonos', 'Se aplican al pagar.')}
          <div class="lista">${BONOS.map((b) => html`<button class="fila" ${crudo(b.ir ? UI.irAttrs(b.ir[0], b.ir[1]) : 'data-a="tab" data-tab="inicio"')}>
            <span class="fila-ico">${ico('precio')}</span><span><span class="t13" style="display:block">${b.t}</span><span class="t11" style="display:block">${b.s}</span></span>
            <span class="chip ${b.estado === 'Disponible' ? 'chip-pos' : b.estado === 'Usado' ? '' : 'chip-luz'}">${b.estado === 'Disponible' ? ico('check') : ''}${b.estado}</span></button>`)}</div>
        </section>

        <section class="bloque">${UI.bloqueCab('Cómo sumar')}
          <div class="rejilla-2">
            <div class="tarjeta tarjeta-pad"><span class="d d-34">1 pt</span><p class="t11" style="margin:6px 0 0">por cada $ 100 pagados en la app</p></div>
            <div class="tarjeta tarjeta-pad"><span class="d d-34">50 pts</span><p class="t11" style="margin:6px 0 0">por calificar un servicio</p></div>
            <div class="tarjeta tarjeta-pad"><span class="d d-34">500 pts</span><p class="t11" style="margin:6px 0 0">para ti y tu amigo cuando reserva</p></div>
            <div class="tarjeta tarjeta-pad"><span class="d d-34">90 pts</span><p class="t11" style="margin:6px 0 0">por completar tu garaje</p></div>
          </div>
          <p class="t11" style="margin-top:8px">Valores de ejemplo.</p>
        </section>

        <section class="bloque">${UI.bloqueCab('Niveles')}
          <div class="lista">${NIVELES.map((n) => html`<div class="fila"><span class="fila-ico" style="${n.n === nv.actual.nombre ? 'border-color:var(--acc-graf);color:var(--acc-graf)' : ''}">${ico('beneficios')}</span>
            <span><span class="t13" style="display:block">${n.n} · desde ${num(n.desde)} pts</span><span class="t11" style="display:block">${n.p}</span></span>
            ${n.n === nv.actual.nombre ? html`<span class="chip chip-luz">Tu nivel</span>` : html`<span></span>`}</div>`)}</div>
        </section>

        <section class="bloque">${UI.bloqueCab('Movimientos')}
          <div class="lista">${movs.map((x) => html`<div class="fila"><span class="fila-ico">${ico(x.pts > 0 ? 'mas' : 'precio')}</span>
            <span><span class="t13" style="display:block">${x.txt}</span><span class="t11" style="display:block">${U.fechaCorta(DRS.reloj.dia(x.d))}</span></span>
            <span class="d d-20 num" style="color:var(--pos)">+${num(x.pts)}</span></div>`)}</div>
        </section>
        <button class="btn btn-borde" ${crudo(UI.irAttrs('perfil'))} style="margin-top:18px">${ico('compartir')}Invitar amigos · ANDRES-7Q2</button>
      </div>`;
    },
  };

  /* ---------------- calendario de pico y placa ---------------- */
  DRS.pantallas['calendario-pyp'] = {
    render(p) {
      const R = DRS.reloj;
      const v = DRS.q.vehiculo();
      const hoy = R.hoy();
      const desfase = DRS.tel.ui.mesPyp || 0;
      const primero = new Date(hoy.getFullYear(), hoy.getMonth() + desfase, 1);
      const diasMes = new Date(primero.getFullYear(), primero.getMonth() + 1, 0).getDate();
      const blanco = (primero.getDay() + 6) % 7;
      let restringidos = 0;
      const celdas = [];
      for (let i = 0; i < blanco; i++) celdas.push(html`<span class="cal-dia vacio"></span>`);
      for (let d = 1; d <= diasMes; d++) {
        const f = new Date(primero.getFullYear(), primero.getMonth(), d);
        const x = R.picoPlaca(f, v);
        if (x.restringido) restringidos++;
        const cls = ['cal-dia', x.restringido ? 'restringido' : '', x.motivo === 'festivo' ? 'festivo' : '', !x.aplica ? 'libre' : '', U.isoDia(f) === U.isoDia(hoy) ? 'hoy' : ''].join(' ');
        celdas.push(html`<span class="${cls}" aria-label="${U.fechaLarga(f)}: ${x.restringido ? 'no sale' : x.motivo === 'festivo' ? 'festivo, sin pico y placa' : 'puede circular'}"><b class="d d-20 num">${d}</b>${x.restringido ? ico('cerrar') : x.motivo === 'festivo' ? html`<i class="cap">F</i>` : ''}</span>`);
      }
      const moto = v.tipo === 'moto';
      return html`${UI.cabDet('Pico y placa')}<div class="cuerpo con-cta">
        <div class="titulo"><div class="ceja">${placaTxt(v.placa)} · ${UI.modelo(v)}</div><h1 class="d d-44">Pico y placa</h1>
          <p class="t13">${moto ? 'Las motos no tienen pico y placa en Bogotá.' : `Placa terminada en ${R.picoPlaca(hoy, v).digito}: no sale de 6:00 a. m. a 9:00 p. m. en los días marcados.`}</p></div>
        <div class="cal-nav"><button class="cab-atras" data-a="pyp-mes" data-d="-1" aria-label="Mes anterior">${ico('atras')}</button>
          <span class="d d-26">${U.MESES[primero.getMonth()]} ${primero.getFullYear()}</span>
          <button class="cab-atras" data-a="pyp-mes" data-d="1" aria-label="Mes siguiente" style="transform:scaleX(-1)">${ico('atras')}</button></div>
        <div class="cal">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map((x) => html`<span class="cap cal-cab">${x}</span>`)}${celdas}</div>
        <div class="cal-leyenda"><span><i class="l-no"></i>No sale</span><span><i class="l-f"></i>Festivo</span><span><i class="l-hoy"></i>Hoy</span></div>
        ${moto ? '' : html`<div class="tarjeta tarjeta-pad" style="margin-top:16px;display:flex;justify-content:space-between;align-items:center"><span class="t13">Días sin carro este mes</span><span class="d d-44 num">${restringidos}</span></div>`}
        <p class="fuente">Regla de Bogotá 2026 para vehículos particulares: en días impares circulan las placas terminadas en 1 a 5 y en días pares las terminadas en 6 a 0; no aplica sábados, domingos ni festivos. Fuente: ${R.REGLA.fuente}.</p>
      </div>
      ${moto ? '' : html`<div class="pie-cta"><button class="btn btn-acero" ${crudo(UI.servAttrs('lavaderos'))}>Lavar en un día sin carro</button></div>`}`;
    },
  };

  Object.assign(DRS.acciones, {
    'pyp-mes': (d) => { DRS.tel.ui.mesPyp = (DRS.tel.ui.mesPyp || 0) + Number(d.d); DRS.tel.refrescar(); },
  });
})();
