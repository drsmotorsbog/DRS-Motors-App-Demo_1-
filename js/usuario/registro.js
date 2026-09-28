/* DRS Motors · demo — registro (paso 1 del recorrido)
   Bienvenida → celular → código SMS → datos y autorizaciones → vehículo con consulta
   simulada al RUNT → Inicio. Todo ficticio; nada sale del navegador. */
(function () {
  'use strict';
  const DRS = window.DRS;
  const U = DRS.util;
  const UI = DRS.ui;
  const { html, crudo, ico, num, placaTxt } = U;

  const ui = () => (DRS.tel.ui.reg = DRS.tel.ui.reg || { slide: 0, otp: '', enviando: false, checks: {}, consulta: 'nada', paso: 0 });
  const cab = (titulo, atras = true) => html`<header class="cab cab-det">${atras ? html`<button class="cab-atras" data-a="atras" aria-label="Volver">${ico('atras')}</button>` : html`<span class="cab-logo" role="img" aria-label="DRS Motors" style="width:104px">${UI.logoH()}</span>`}<span class="cab-titulo">${titulo}</span></header>`;
  const pasos = (n) => html`<div class="pasos-flujo" aria-label="Paso ${n} de 4">${[1, 2, 3, 4].map((i) => html`<i class="${i < n ? 'ok' : i === n ? 'actual' : ''}"></i>`)}</div>`;

  const SLIDES = [
    { t: 'Tu vehículo al día', s: 'SOAT, tecnomecánica, aceite y pico y placa. Te avisamos antes de que venza y te decimos qué hacer.', dib: 'carro' },
    { t: 'Reserva y paga en dos toques', s: 'Lavaderos y talleres cerca de ti, con el precio a la vista y el pago dentro de la app. Sin llamadas.', dib: 'bahias' },
    { t: 'Gana por usarla', s: 'Puntos por cada pago, metas de lavados y promos en las horas valle de los comercios aliados.', dib: 'meta' },
  ];

  DRS.pantallas.bienvenida = {
    render(p, ctx) {
      const s = ui();
      const dibujo = (d) => (d === 'carro' ? crudo(DRS.bp.carro({ ancho: 340, dibujar: ctx.anim }))
        : d === 'bahias' ? crudo(DRS.bp.bahias({ n: 3, ocupadas: [1], ancho: 320, dibujar: ctx.anim }))
          : html`<div class="meta-grande" style="margin:30px 10px">${[1, 2, 3, 4, 5].map((i) => html`<span class="${i < 4 ? 'ok' : i === 5 ? 'premio' : ''}"><b class="d d-26">${i}</b>${i === 5 ? html`<i class="cap">50 %</i>` : ''}</span>`)}</div>`);
      return html`${cab('Bienvenida', false)}<div class="onb">
        <div class="onb-riel" data-onb>${SLIDES.map((x, i) => html`<section class="onb-slide" aria-label="${i + 1} de 3">
          <div class="onb-dibujo">${dibujo(x.dib)}</div>
          <div class="ceja">${String(i + 1).padStart(2, '0')} / 03</div>
          <h1 class="d d-56" style="margin:10px 0 12px">${x.t}</h1>
          <p class="t16" style="margin:0">${x.s}</p>
        </section>`)}</div>
        <div class="onb-puntos">${SLIDES.map((_, i) => html`<i class="${i === s.slide ? 'on' : ''}"></i>`)}</div>
        <div class="onb-pie">
          <button class="btn btn-acero" data-a="reg-empezar">Crear cuenta</button>
          <button class="btn btn-fantasma" data-a="reg-entrar" style="margin-top:8px">Ya tengo cuenta</button>
          <p class="t11" style="text-align:center;margin-top:12px">Datos ficticios para la demo.</p>
        </div>
      </div>`;
    },
    alMontar(el) {
      const r = el.querySelector('[data-onb]');
      if (!r) return;
      r.addEventListener('scroll', () => {
        const i = Math.round(r.scrollLeft / r.clientWidth);
        if (i !== ui().slide) { ui().slide = i; U.$$('.onb-puntos i', el).forEach((x, k) => x.classList.toggle('on', k === i)); }
      }, { passive: true });
    },
  };

  DRS.pantallas['registro-cel'] = {
    render() {
      const s = ui();
      return html`${cab('Tu celular')}<div class="cuerpo con-cta">
        <div class="titulo"><div class="ceja">Paso 1 de 4</div><h1 class="d d-44">Tu celular</h1><p class="t13">Con él entras a la app. Te enviamos un código por SMS.</p></div>
        ${pasos(1)}
        <div class="campo"><label class="cap" for="reg-cel">Número de celular</label>
          <div class="reg-cel"><span class="reg-prefijo">+57</span><input id="reg-cel" value="300 555 0142" inputmode="tel" autocomplete="tel"></div></div>
      </div>
      <div class="pie-cta"><button class="btn btn-acero" data-a="reg-enviar" ${crudo(s.enviando ? 'disabled' : '')}>${s.enviando ? 'Enviando código…' : 'Enviar código'}</button></div>`;
    },
  };

  DRS.pantallas['registro-otp'] = {
    render() {
      const s = ui();
      const ok = s.otp.length === 6;
      return html`${cab('Código')}<div class="cuerpo">
        <div class="titulo"><div class="ceja">Paso 2 de 4</div><h1 class="d d-44">Escribe el código</h1><p class="t13">Lo enviamos al +57 300 555 0142.</p></div>
        ${pasos(2)}
        <div class="otp" aria-label="Código de 6 dígitos">${[0, 1, 2, 3, 4, 5].map((i) => html`<span class="${s.otp.length > i ? 'lleno' : s.otp.length === i ? 'foco' : ''}">${s.otp[i] || ''}</span>`)}</div>
        <p class="t13" style="text-align:center;margin-top:16px;color:${ok ? 'var(--pos)' : 'var(--txt-3)'}">${ok ? 'Código verificado' : s.otp.length ? 'Leyendo el SMS…' : 'Esperando el SMS…'}</p>
        <button class="enlace" data-a="reg-reenviar" style="margin:14px auto 0;display:flex">Reenviar código ${ico('chevron')}</button>
      </div>`;
    },
    alMontar() {
      const s = ui();
      s.otp = '';
      const codigo = '482917';
      let i = 0;
      const tic = () => {
        const tope = DRS.tel.pila[DRS.tel.pila.length - 1];
        if (!tope || tope.ruta !== 'registro-otp') return;
        s.otp = codigo.slice(0, ++i);
        DRS.tel.refrescar();
        if (i === 6) setTimeout(() => DRS.tel.ir('registro-datos'), 700);
        else setTimeout(tic, 170);
      };
      setTimeout(tic, 1000);   // el SMS «llega» y el teclado lo sugiere
    },
  };

  DRS.pantallas['registro-datos'] = {
    render() {
      const s = ui();
      const u = DRS.q.usuario();
      const chk = (k, t) => html`<button class="check" role="checkbox" aria-checked="${s.checks[k] ? 'true' : 'false'}" data-a="reg-check" data-k="${k}"><i>${s.checks[k] ? ico('check') : ''}</i><span>${t}</span></button>`;
      const listo = s.checks.terminos && s.checks.datos && s.checks.runt;
      return html`${cab('Tus datos')}<div class="cuerpo con-cta">
        <div class="titulo"><div class="ceja">Paso 3 de 4</div><h1 class="d d-44">Tus datos</h1></div>
        ${pasos(3)}
        <div class="campos-2"><div class="campo"><label class="cap" for="reg-nombre">Nombre</label><input id="reg-nombre" value="${u.nombre}"></div>
          <div class="campo"><label class="cap" for="reg-apellido">Apellido</label><input id="reg-apellido" value="${u.apellido}"></div></div>
        <div class="campo"><label class="cap" for="reg-correo">Correo</label><input id="reg-correo" value="${u.correo}" inputmode="email"></div>
        <div class="campos-2"><div class="campo"><label class="cap" for="reg-tdoc">Tipo de documento</label><input id="reg-tdoc" value="Cédula de ciudadanía" readonly></div>
          <div class="campo"><label class="cap" for="reg-doc">Número</label><input id="reg-doc" value="1.020.456.789" inputmode="numeric"></div></div>
        <div style="margin-top:8px">
          ${chk('terminos', 'Acepto los términos y condiciones de la app.')}
          ${chk('datos', 'Autorizo el tratamiento de mis datos personales según la política de DRS (Ley 1581 de 2012).')}
          ${chk('runt', 'Autorizo de forma expresa consultar la información de mis vehículos (RUNT, SOAT y tecnomecánica).')}
        </div>
      </div>
      <div class="pie-cta"><button class="btn btn-acero" data-a="reg-datos-ok" ${crudo(listo ? '' : 'disabled')}>Continuar</button><p class="t11">${listo ? 'Puedes cambiar estas autorizaciones en tu perfil.' : 'Marca las tres autorizaciones para continuar.'}</p></div>`;
    },
  };

  DRS.pantallas['registro-vehiculo'] = {
    render(p, ctx) {
      const s = ui();
      const v = DRS.q.vehiculo('v1');
      const so = DRS.calc.doc(v, 'soat'), te = DRS.calc.doc(v, 'tecno');
      const item = (k, t, hecho) => html`<li class="${hecho ? 'hecho' : s.consulta === 'buscando' ? 'actual' : ''}"><i>${hecho ? ico('check') : ''}</i><span>${t}</span></li>`;
      const paso = s.paso;
      return html`${cab('Tu vehículo')}<div class="cuerpo con-cta">
        <div class="titulo"><div class="ceja">Paso 4 de 4</div><h1 class="d d-44">Tu vehículo</h1><p class="t13">Con la placa y el documento del propietario traemos todo lo demás.</p></div>
        ${pasos(4)}
        ${s.consulta === 'nada' ? html`
          <div class="campos-2"><div class="campo"><label class="cap" for="reg-placa">Placa</label><input id="reg-placa" value="KDM484" maxlength="6" autocapitalize="characters" class="reg-placa"></div>
          <div class="campo"><label class="cap" for="reg-prop">Documento del propietario</label><input id="reg-prop" value="1020456789" inputmode="numeric"></div></div>
          <p class="t11" style="margin:0 0 8px">En la demo, la consulta trae un vehículo de ejemplo (KDM 484), escribas la placa que escribas.</p>
          <button class="enlace" data-a="reg-manual" style="margin-top:4px">¿No aparece? Ingresa las fechas a mano ${ico('chevron')}</button>` : ''}
        ${s.consulta !== 'nada' ? html`<article class="tarjeta" style="overflow:hidden">
          <div class="veh-plano" style="position:relative">${crudo(DRS.bp.carro({ ancho: 340, dibujar: s.consulta === 'buscando' }))}${s.consulta === 'buscando' ? html`<span class="escaneo"></span>` : ''}</div>
          <div class="tarjeta-pad" style="border-top:1px solid var(--linea)">
            ${s.consulta === 'buscando' ? html`<ol class="proceso">${item('d', 'Datos del vehículo en el RUNT', paso > 0)}${item('s', 'Vigencia del SOAT', paso > 1)}${item('t', 'Revisión técnico-mecánica', paso > 2)}</ol>` : html`
              <div class="d d-34">${UI.modelo(v)}</div><div class="t13" style="margin-top:6px">${v.modelo} · ${v.carroceria} · ${v.color} · ${num(v.cilindraje)} cc · ${placaTxt(v.placa)}</div>
              <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px">${UI.chipEstado(so.estado, `SOAT · ${so.dias} días`)}${UI.chipEstado(te.estado, `Tecno · ${te.etiqueta}`)}</div>`}
          </div></article>` : ''}
        ${s.consulta === 'listo' ? html`<div class="campo" style="margin-top:14px"><label class="cap" for="reg-km">Kilometraje actual</label><input id="reg-km" value="${num(v.km)}" inputmode="numeric"></div>
          <button class="btn btn-fantasma btn-chico" data-a="descargar" data-que="Foto" style="width:100%">${ico('sesion-foto', 's16')}Agregar una foto (opcional)</button>` : ''}
      </div>
      <div class="pie-cta">${s.consulta === 'nada' ? html`<button class="btn btn-acero" data-a="reg-consultar">Consultar vehículo</button>`
        : s.consulta === 'buscando' ? html`<button class="btn" disabled>Consultando…</button>`
          : html`<button class="btn btn-acero" data-a="reg-fin">Entrar a DRS Motors</button>`}</div>`;
    },
  };

  /* ---------------- agregar otro vehículo (misma consulta que el registro) ---------------- */
  const NUEVO = { id: 'v3', tipo: 'carro', clase: 'Automóvil', placa: 'HTR619', marca: 'Renault', linea: 'Sandero Life', modelo: 2019, carroceria: 'Hatchback',
    color: 'Blanco', cilindraje: 1598, combustible: 'Gasolina', transmision: 'Mecánica', servicio: 'Particular', km: 61200, kmD: 0,
    soat: { vence: 48, inicio: -317, poliza: 'SA-7781-2210-26', aseguradora: 'Mutual Cordillera', consulta: { d: 0, h: '10:12' } },
    tecno: { vence: -3, ultima: -368, cda: 'CDA Ruta 80', certificado: 'RTM 1180-2025', consulta: { d: 0, h: '10:12' } },
    aceite: { ultimoKm: 57000, ultimoD: -150, cadaKm: 5000, cadaMeses: 6 }, llantas: { montadasKm: 35000, vidaKm: 50000, revisionD: -200 } };
  DRS.pantallas['agregar-vehiculo'] = {
    render(p, ctx) {
      const s = (DRS.tel.ui.nuevoVeh = DRS.tel.ui.nuevoVeh || { estado: 'nada', paso: 0 });
      const v = NUEVO;
      const so = DRS.calc.doc(v, 'soat'), te = DRS.calc.doc(v, 'tecno');
      const item = (t, hecho) => html`<li class="${hecho ? 'hecho' : 'actual'}"><i>${hecho ? ico('check') : ''}</i><span>${t}</span></li>`;
      const ya = DRS.q.vehiculos().some((x) => x.id === 'v3');
      return html`${UI.cabDet('Agregar vehículo')}<div class="cuerpo con-cta">
        <div class="titulo"><div class="ceja">Mi garaje</div><h1 class="d d-44">Agregar vehículo</h1><p class="t13">Carro o moto. Con la placa y el documento del propietario traemos el resto.</p></div>
        ${s.estado === 'nada' ? html`<div class="campos-2"><div class="campo"><label class="cap" for="nv-placa">Placa</label><input id="nv-placa" class="reg-placa" value="HTR619" maxlength="6"></div>
          <div class="campo"><label class="cap" for="nv-doc">Documento del propietario</label><input id="nv-doc" value="1020456789" inputmode="numeric"></div></div>` : html`<article class="tarjeta" style="overflow:hidden">
          <div class="veh-plano" style="position:relative">${crudo(DRS.bp.vehiculo(v, { ancho: 340, dibujar: s.estado === 'buscando' }))}${s.estado === 'buscando' ? html`<span class="escaneo"></span>` : ''}</div>
          <div class="tarjeta-pad" style="border-top:1px solid var(--linea)">${s.estado === 'buscando'
    ? html`<ol class="proceso">${item('Datos del vehículo en el RUNT', s.paso > 0)}${item('Vigencia del SOAT', s.paso > 1)}${item('Revisión técnico-mecánica', s.paso > 2)}</ol>`
    : html`<div class="d d-34">${v.marca} ${v.linea}</div><div class="t13" style="margin-top:6px">${v.modelo} · ${v.carroceria} · ${v.color} · ${num(v.cilindraje)} cc · ${placaTxt(v.placa)}</div>
      <div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:12px">${UI.chipEstado(so.estado, `SOAT · ${so.dias} días`)}${UI.chipEstado(te.estado, `Tecno · ${te.etiqueta}`)}</div>
      ${te.estado === 'neg' ? html`<div class="aviso-caja" style="margin-top:12px">${ico('alerta')}<span>La tecnomecánica de este vehículo está vencida. Te ayudamos a agendarla en un CDA aliado.</span></div>` : ''}`}</div></article>`}
      </div>
      <div class="pie-cta">${s.estado === 'nada' ? html`<button class="btn btn-acero" data-a="nv-consultar">Consultar vehículo</button>`
        : s.estado === 'buscando' ? html`<button class="btn" disabled>Consultando…</button>`
          : html`<button class="btn btn-acero" data-a="nv-agregar" ${crudo(ya ? 'disabled' : '')}>${ya ? 'Ya está en tu garaje' : 'Agregar a mi garaje'}</button>`}</div>`;
    },
  };

  Object.assign(DRS.acciones, {
    'nv-consultar': async () => {
      const s = DRS.tel.ui.nuevoVeh;
      s.estado = 'buscando'; s.paso = 0; DRS.tel.refrescar();
      for (let i = 1; i <= 3; i++) { await U.espera(600); s.paso = i; DRS.tel.refrescar(); }
      await U.espera(300); s.estado = 'listo'; DRS.tel.refrescar();
    },
    'nv-agregar': () => {
      DRS.cambiar((s) => { if (!s.vehiculos.some((x) => x.id === 'v3')) s.vehiculos.push(JSON.parse(JSON.stringify(NUEVO))); s.vehiculoActivo = 'v3'; }, { tipo: 'vehiculo-nuevo' });
      DRS.tel.ui.nuevoVeh = null;
      DRS.tel.tabIr('garaje');
      setTimeout(() => DRS.tel.tostada('Renault Sandero agregado a tu garaje'), 400);
    },
  });

  Object.assign(DRS.acciones, {
    'reg-empezar': () => { DRS.tel.ui.reg = null; ui(); DRS.tel.ir('registro-cel'); },
    'reg-enviar': async () => { const s = ui(); s.enviando = true; DRS.tel.refrescar(); await U.espera(700); s.enviando = false; DRS.tel.ir('registro-otp'); },
    'reg-reenviar': () => DRS.tel.tostada('Código reenviado', 'telefono'),
    'reg-check': (d) => { const s = ui(); s.checks[d.k] = !s.checks[d.k]; DRS.tel.refrescar(); },
    'reg-consultar': async () => {
      const s = ui();
      s.consulta = 'buscando'; s.paso = 0; DRS.tel.refrescar();
      for (let i = 1; i <= 3; i++) { await U.espera(650); s.paso = i; DRS.tel.refrescar(); }
      await U.espera(350);
      s.consulta = 'listo'; DRS.tel.refrescar();
    },
    'reg-manual': () => DRS.tel.hoja(html`<div class="hoja-cab"><div><div class="ceja">Ingreso manual</div><h2 class="d d-34" style="margin-top:8px">Fechas de vencimiento</h2></div><button class="hoja-cerrar" data-a="hoja-cerrar" aria-label="Cerrar">${ico('cerrar')}</button></div>
      <p class="t13" style="margin:0 0 14px">Si la consulta no responde, escríbelas tú y las verificamos después.</p>
      <div class="campo"><label class="cap" for="man-soat">Vence el SOAT</label><input id="man-soat" type="date" value="${U.isoDia(DRS.reloj.dia(12))}"></div>
      <div class="campo"><label class="cap" for="man-tecno">Vence la tecnomecánica</label><input id="man-tecno" type="date" value="${U.isoDia(DRS.reloj.dia(214))}"></div>
      <button class="btn btn-luz" data-a="reg-manual-ok">Guardar y continuar</button>`),
    'reg-manual-ok': () => { DRS.tel.cerrarHoja(); const s = ui(); s.consulta = 'listo'; DRS.tel.refrescar(); },
    'reg-datos-ok': () => {
      const s = ui();
      const val = (id) => String((U.$('#' + id) || {}).value || '').trim();
      s.datos = { nombre: val('reg-nombre'), apellido: val('reg-apellido'), correo: val('reg-correo') };
      DRS.tel.ir('registro-vehiculo');
    },
    'reg-fin': () => {
      const km = Number(String((U.$('#reg-km') || {}).value || '').replace(/\D/g, ''));
      if (km) DRS.acc.kmActualizar('v1', Math.max(km, DRS.q.vehiculo('v1').km));
      const d = (ui().datos || {});
      if (d.nombre || d.apellido || d.correo) {
        DRS.cambiar((st) => {
          if (d.nombre) st.usuario.nombre = d.nombre;
          if (d.apellido) st.usuario.apellido = d.apellido;
          if (d.correo) st.usuario.correo = d.correo;
        }, { tipo: 'registro' });
      }
      DRS.tel.ui.reg = null;
      DRS.tel.tabIr('inicio');
      setTimeout(() => DRS.tel.tostada(`Listo, ${DRS.q.usuario().nombre}. Tu ${UI.modeloCorto(DRS.q.vehiculo('v1'))} ya está en tu garaje`), 500);
    },
    'reg-entrar': () => {
      DRS.tel.ui.reg = null;
      DRS.tel.tabIr('inicio');
      setTimeout(() => DRS.tel.tostada(`Hola de nuevo, ${DRS.q.usuario().nombre} · cuenta de ejemplo`), 500);
    },
  });
})();
