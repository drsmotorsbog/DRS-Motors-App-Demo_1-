/* DRS Motors · demo — Perfil y configuraciones
   Perfil con nivel y puntos, referidos y secciones en tarjetas; cada fila abre una
   pantalla que funciona: datos, medios de pago, pagos y comprobantes, notificaciones
   (con ejemplos de cómo llegan) y privacidad (Ley 1581 de 2012). */
(function () {
  'use strict';
  const DRS = window.DRS;
  const U = DRS.util;
  const UI = DRS.ui;
  const { html, crudo, ico, num, pesos, placaTxt } = U;

  /* ---------------- datos de ejemplo ---------------- */
  DRS.extenderSemilla((s) => {
    s.pagos = [
      { id: 'p1', d: -1, h: '19:42', concepto: 'Lavado completo · Espuma 127', ref: 'DRS-P418207', medio: 'Nequi', total: 44000, tipo: 'reserva', rel: 'DRS-4821' },
      { id: 'p2', d: -38, h: '08:51', concepto: 'Lavado completo · Espuma 127', ref: 'DRS-P377124', medio: 'Tarjeta Visa terminada en 4417', total: 38000, tipo: 'reserva', rel: 'DRS-3310' },
      { id: 'p3', d: -71, h: '15:36', concepto: 'Lavado sencillo · Punto Neutro', ref: 'DRS-P355960', medio: 'PSE', total: 18000, tipo: 'reserva', rel: 'DRS-2791' },
    ];
    s.canales = { push: true, whatsapp: true, correo: false };
    s.autorizaciones = { registro: -60, runt: true, promos: true, estudios: false };
    s.medios = { preferido: 'tarjeta' };
  });

  // Niveles por puntos (valores de ejemplo)
  const NIVELES = [
    { id: 'calle', nombre: 'Calle', desde: 0 },
    { id: 'pista', nombre: 'Pista', desde: 1000 },
    { id: 'podio', nombre: 'Podio', desde: 5000 },
  ];
  DRS.nivel = function (pts) {
    let i = 0;
    NIVELES.forEach((n, k) => { if (pts >= n.desde) i = k; });
    const sig = NIVELES[i + 1];
    return { actual: NIVELES[i], sig, falta: sig ? sig.desde - pts : 0, p: sig ? (pts - NIVELES[i].desde) / (sig.desde - NIVELES[i].desde) : 1 };
  };

  const fila = (i, t, s, attrs, extra = '') => html`<button class="fila" ${crudo(attrs)}><span class="fila-ico">${ico(i)}</span><span><span class="t13" style="display:block">${t}</span>${s ? html`<span class="t11" style="display:block">${s}</span>` : ''}</span><span style="display:flex;align-items:center;gap:6px">${extra}${ico('chevron', 's16')}</span></button>`;
  const grupo = (titulo, filas) => html`<section class="pf-grupo"><div class="ceja">${titulo}</div><div class="tarjeta pf-tarjeta">${filas}</div></section>`;

  /* ---------------- perfil ---------------- */
  DRS.pantallas.perfil = {
    render() {
      const u = DRS.q.usuario();
      const nv = DRS.nivel(u.puntos);
      const vs = DRS.q.vehiculos();
      const rs = DRS.q.reservasUsuario();
      const informes = (DRS.estado.informes || []).length;
      const gastado = (DRS.estado.pagos || []).reduce((a, p) => a + p.total, 0);
      return html`${UI.cabDet('Perfil')}<div class="cuerpo">
        <div class="pf-cab">
          <span class="pf-avatar">${u.nombre[0]}${u.apellido[0]}</span>
          <div><h1 class="d d-44">${u.nombre} ${u.apellido}</h1><div class="t11">${u.celular} · ${u.correo}</div>
            <div style="margin-top:8px"><span class="chip chip-luz">${ico('beneficios')}Nivel ${nv.actual.nombre}</span></div></div>
        </div>

        <button class="tarjeta pf-nivel" ${crudo(UI.irAttrs('beneficios'))}>
          <div class="pf-nivel-top"><span class="ceja">Puntos DRS</span><span class="enlace">Beneficios ${ico('chevron')}</span></div>
          <div class="benef-num" style="margin:8px 0 12px"><span class="d d-56 num">${num(u.puntos)}</span><span class="etq t-3">pts</span></div>
          ${nv.sig ? html`<div class="pf-barra"><i style="width:${(nv.p * 100).toFixed(1)}%"></i></div>
            <div class="pf-nivel-pie"><span class="cap">${nv.actual.nombre}</span><span class="t11">Te faltan ${num(nv.falta)} pts para ${nv.sig.nombre}</span><span class="cap">${nv.sig.nombre}</span></div>` : html`<p class="t11">Estás en el nivel más alto.</p>`}
        </button>

        <div class="pf-cifras">
          <div><span class="d d-34 num">${vs.length}</span><span class="cap">Vehículos</span></div>
          <div><span class="d d-34 num">${rs.length}</span><span class="cap">Reservas</span></div>
          <div><span class="d d-34 num">${informes}</span><span class="cap">Informes</span></div>
        </div>

        <div class="tarjeta pf-referido">
          <div><span class="ceja">Invita y ganen los dos</span><p class="t13 t-1" style="margin:8px 0 0">Cuando tu amigo haga su primera reserva, cada uno suma 500 puntos.</p></div>
          <div class="pf-codigo"><span class="cap">Tu código</span><span class="d d-34" style="white-space:nowrap">ANDRES-7Q2</span></div>
          <div class="pf-cod-btns"><button class="btn btn-fantasma btn-chico" data-a="pf-copiar">${ico('copiar', 's16')}Copiar</button>
            <button class="btn btn-luz btn-chico" data-a="pf-compartir">${ico('compartir', 's16')}Compartir</button></div>
          <p class="t11" style="margin:8px 0 0">Valores de ejemplo.</p>
        </div>

        ${grupo('Cuenta', [
          fila('perfil', 'Datos personales', `${u.documento} · ${u.celular}`, UI.irAttrs('perfil-datos')),
          fila('pago', 'Medios de pago', 'Visa terminada en 4417 · Nequi · PSE', UI.irAttrs('perfil-medios')),
          fila('garaje', 'Mis vehículos', vs.map((v) => placaTxt(v.placa)).join(' · '), 'data-a="tab" data-tab="garaje"'),
        ])}
        ${grupo('Actividad', [
          fila('documento', 'Pagos y comprobantes', `${(DRS.estado.pagos || []).length} pagos · ${pesos(gastado)}`, UI.irAttrs('perfil-pagos')),
          fila('peritaje', 'Informes vehiculares', informes ? `${informes} comprados` : 'Aún no has comprado informes', DRS.pantallas.informe ? UI.irAttrs('informe') : UI.proxAttrs('informe')),
          fila('reservas', 'Mis reservas', `${rs.length} en total`, 'data-a="tab" data-tab="reservas"'),
        ])}
        ${grupo('Preferencias', [
          fila('campana', 'Notificaciones', `Push${DRS.estado.canales.whatsapp ? ' · WhatsApp' : ''}${DRS.estado.canales.correo ? ' · correo' : ''} · ver ejemplos`, UI.irAttrs('perfil-notif')),
          fila('ubicacion', 'Ciudad', 'Bogotá · pico y placa y comercios de tu zona', 'data-a="pf-ciudad"'),
        ])}
        ${grupo('Privacidad y datos', [
          fila('garantia', 'Tus datos personales', 'Ver, descargar o eliminar · Ley 1581 de 2012', UI.irAttrs('perfil-privacidad')),
        ])}
        ${grupo('Ayuda', [
          fila('chat', 'Soporte por WhatsApp', 'Te responde el equipo de DRS', 'data-a="pf-soporte"'),
          fila('comentar', 'Danos tu opinión', 'Nos ayuda a mejorar la app', 'data-a="pf-opinion"'),
          fila('informacion', 'Términos y política de datos', 'Versión de la demo', 'data-a="pf-terminos"'),
        ])}
        <button class="btn btn-fantasma" data-a="pf-salir" style="margin-top:22px">${ico('flecha')}Cerrar sesión</button>
        <p class="t11" style="text-align:center;margin-top:14px">DRS Motors · demo 0.2 · persona y datos ficticios</p>
      </div>`;
    },
  };

  /* ---------------- datos personales ---------------- */
  DRS.pantallas['perfil-datos'] = {
    render() {
      const u = DRS.q.usuario();
      const campo = (id, label, val, extra = '') => html`<div class="campo"><label class="cap" for="${id}">${label}</label><input id="${id}" value="${val}" ${crudo(extra)}></div>`;
      return html`${UI.cabDet('Datos personales')}<div class="cuerpo con-cta">
        <div class="titulo"><div class="ceja">Cuenta</div><h1 class="d d-44">Datos personales</h1></div>
        <div class="campos-2">${campo('pf-nombre', 'Nombre', u.nombre)}${campo('pf-apellido', 'Apellido', u.apellido)}</div>
        <div class="campo"><label class="cap" for="pf-cel">Celular</label><div class="pf-verif"><input id="pf-cel" value="${u.celular}" inputmode="tel"><span class="chip chip-pos">${ico('check')}Verificado</span></div></div>
        ${campo('pf-correo', 'Correo', u.correo, 'inputmode="email"')}
        <div class="campos-2">${campo('pf-tdoc', 'Tipo de documento', 'Cédula de ciudadanía', 'readonly')}${campo('pf-doc', 'Número', u.documento.replace('CC ', ''), 'readonly')}</div>
        <p class="t11">El documento no se puede cambiar desde la app: con él se consultan tus vehículos.</p>
      </div>
      <div class="pie-cta"><button class="btn btn-acero" data-a="pf-guardar">Guardar cambios</button></div>`;
    },
  };

  /* ---------------- medios de pago ---------------- */
  DRS.pantallas['perfil-medios'] = {
    render() {
      const pref = DRS.estado.medios.preferido;
      const medio = (id, i, t, s) => html`<button class="opcion" role="radio" aria-checked="${pref === id ? 'true' : 'false'}" data-a="pf-medio" data-m="${id}">${ico(i)}<span><span class="t13 t-1" style="display:block;font-weight:600">${t}</span><span class="t11">${s}</span></span><span class="radio"></span></button>`;
      return html`${UI.cabDet('Medios de pago')}<div class="cuerpo">
        <div class="titulo"><div class="ceja">Cuenta</div><h1 class="d d-44">Medios de pago</h1><p class="t13">Pagas dentro de la app: el comercio recibe la reserva ya pagada.</p></div>
        <div class="pf-tarjeta-credito" aria-label="Tarjeta Visa terminada en 4417">
          <div class="pf-tc-top"><span class="pf-chip-tc"></span><span class="etq">Visa</span></div>
          <div class="d d-26 num" style="letter-spacing:.14em">•••• •••• •••• 4417</div>
          <div class="pf-tc-pie"><span><span class="cap">Titular</span><b>ANDRÉS GÓMEZ</b></span><span><span class="cap">Vence</span><b>08/29</b></span></div>
        </div>
        <div class="ceja" style="margin:22px 0 10px">Preferido para pagar</div>
        <div role="radiogroup" aria-label="Medio preferido">
          ${medio('tarjeta', 'pago', 'Tarjeta Visa terminada en 4417', 'Crédito · se usa por defecto')}
          ${medio('nequi', 'telefono', 'Nequi', '300 555 0142')}
          ${medio('pse', 'enlace-externo', 'PSE', 'Débito desde tu banco')}
        </div>
        <button class="btn btn-fantasma" data-a="pf-agregar-medio" style="margin-top:8px">${ico('mas')}Agregar medio de pago</button>
        <p class="t11" style="margin-top:14px">En la demo no se guardan datos reales de tarjetas.</p>
      </div>`;
    },
  };

  /* ---------------- pagos y comprobantes ---------------- */
  DRS.pantallas['perfil-pagos'] = {
    render() {
      const ps = (DRS.estado.pagos || []).slice().sort((a, b) => b.d - a.d);
      const total = ps.reduce((a, p) => a + p.total, 0);
      return html`${UI.cabDet('Pagos y comprobantes')}<div class="cuerpo">
        <div class="titulo"><div class="ceja">Actividad</div><h1 class="d d-44">Pagos</h1></div>
        <div class="tarjeta tarjeta-pad" style="display:flex;justify-content:space-between;align-items:flex-end;margin-bottom:18px">
          <div><span class="cap">Pagado en la app</span><div class="d d-44 num" style="margin-top:6px">${pesos(total)}</div></div><span class="t11">${ps.length} pagos</span></div>
        <div class="lista">${ps.map((p) => html`<button class="fila" data-a="pf-comprobante" data-id="${p.id}">
          <span class="fila-ico">${ico(p.tipo === 'soat' ? 'garantia' : p.tipo === 'informe' ? 'peritaje' : p.tipo === 'tecno' ? 'certificado' : 'detailing')}</span>
          <span><span class="t13" style="display:block">${p.concepto}</span><span class="t11" style="display:block">${U.fechaCorta(DRS.reloj.dia(p.d))} · ${p.medio}</span></span>
          <span style="text-align:right"><span class="d d-20 num" style="display:block">${pesos(p.total)}</span><span class="enlace" style="margin-top:4px">Comprobante</span></span>
        </button>`)}</div>
      </div>`;
    },
  };

  function comprobante(p) {
    // El comprobante es papelería: se pinta en el modo documento de la marca (09 §8.2)
    DRS.tel.hoja(html`<div data-modo="documento" class="pf-comprobante">
      <div class="pf-comp-cab"><svg viewBox="0 18 420 88" aria-hidden="true" style="width:120px;height:26px;display:block"><use href="#logo-h-claro" x="0" y="0" width="420" height="150"/></svg><button class="hoja-cerrar" data-a="hoja-cerrar" aria-label="Cerrar" style="color:var(--txt-1)">${ico('cerrar')}</button></div>
      <div class="ceja" style="margin-top:18px">Comprobante de pago</div>
      <div class="d d-44 num" style="margin:8px 0 4px">${pesos(p.total)}</div>
      <p class="t13" style="margin:0 0 16px">${p.concepto}</p>
      <dl class="datos">
        <dt>Referencia</dt><dd>${p.ref}</dd>
        <dt>Fecha</dt><dd>${U.fechaCorta(DRS.reloj.dia(p.d))}, ${U.horaTxt(p.h)}</dd>
        <dt>Medio</dt><dd>${p.medio}</dd>
        <dt>Estado</dt><dd><span class="chip chip-pos">${ico('check')}Aprobado</span></dd>
        ${p.rel ? html`<dt>Reserva</dt><dd>${p.rel}</dd>` : ''}
      </dl>
      <p class="t11" style="margin-top:16px">Comprobante de ejemplo generado por la demo. Sin validez tributaria.</p>
      <button class="btn btn-fantasma" data-a="descargar" data-que="Comprobante" style="margin-top:14px">${ico('descargar')}Descargar PDF</button>
    </div>`);
  }

  /* ---------------- notificaciones ---------------- */
  DRS.pantallas['perfil-notif'] = {
    render() {
      const A = DRS.estado.alertas;
      const C = DRS.estado.canales;
      const sw = (grupo, k, t, s) => html`<div class="fila"><span></span><span><span class="t13" style="display:block">${t}</span><span class="t11" style="display:block">${s}</span></span><button class="inter" role="switch" aria-checked="${(grupo === 'c' ? C[k] : A[k]) ? 'true' : 'false'}" aria-label="${t}" data-a="pf-sw" data-g="${grupo}" data-k="${k}"></button></div>`;
      const ejemplos = ['soat30', 'pypNoche', 'aceite', 'resListo', 'promo', 'waConf'];
      return html`${UI.cabDet('Notificaciones')}<div class="cuerpo">
        <div class="titulo"><div class="ceja">Preferencias</div><h1 class="d d-44">Notificaciones</h1><p class="t13">Cada aviso trae su siguiente paso. Elige por dónde y cuándo.</p></div>
        <section class="pf-grupo"><div class="ceja">Canales</div><div class="lista pf-sw">
          ${sw('c', 'push', 'En el celular', 'Avisos del sistema, incluso con el celular bloqueado')}
          ${sw('c', 'whatsapp', 'WhatsApp', 'Confirmaciones y recordatorios de reservas')}
          ${sw('c', 'correo', 'Correo', 'Comprobantes y resumen mensual')}
        </div></section>
        <section class="pf-grupo"><div class="ceja">Avisos</div><div class="lista pf-sw">
          ${sw('a', 'soat', 'SOAT y tecnomecánica', '30, 15, 7 y 1 día antes, y el día del vencimiento')}
          ${sw('a', 'pyp', 'Pico y placa', 'La noche anterior y a las 6:00 a. m.')}
          ${sw('a', 'aceite', 'Cambio de aceite', 'A los 500 km y a los 100 km')}
          ${sw('a', 'llantas', 'Llantas', 'Cuando falten 5.000 km de vida estimada')}
          ${sw('a', 'km', 'Actualizar kilometraje', 'Si pasan 30 días sin hacerlo')}
          ${sw('a', 'promos', 'Promociones cerca', 'Horas valle de comercios aliados')}
        </div></section>
        <section class="pf-grupo"><div class="ceja">Anticipación de vencimientos</div>
          <div class="seg" role="tablist">${[30, 15, 7].map((n) => html`<button role="tab" aria-selected="${A.anticipacion === n ? 'true' : 'false'}" data-a="pf-antic" data-n="${n}">${n} días</button>`)}</div></section>
        <section class="pf-grupo"><div class="bloque-cab" style="margin-bottom:10px"><div><div class="ceja">Así te llegan</div><p class="t13" style="margin:6px 0 0;color:var(--txt-3)">Toca uno para verlo en el celular.</p></div></div>
          <div class="lista">${ejemplos.map((id) => { const e = DRS.avisos.ESCENARIOS.find((x) => x.id === id); return html`<button class="fila" data-a="pf-probar" data-id="${id}"><span class="fila-ico">${ico(e.ico)}</span><span class="t13">${e.titulo({ modelo: 'Mazda 2', venceSoat: '', hora: '10:30 a. m.', ac: DRS.calc.aceite(DRS.q.vehiculo('v1')) })}</span>${e.canal === 'whatsapp' ? html`<span class="chip">WhatsApp</span>` : ico('chevron', 's16')}</button>`; })}</div>
          <button class="btn btn-borde" data-a="pf-bloqueado" style="margin-top:12px">${ico('campana')}Ver en la pantalla bloqueada</button>
        </section>
      </div>`;
    },
  };

  /* ---------------- privacidad (Ley 1581 de 2012) ---------------- */
  DRS.pantallas['perfil-privacidad'] = {
    render() {
      const a = DRS.estado.autorizaciones;
      const fecha = U.fechaCorta(DRS.reloj.dia(a.registro));
      return html`${UI.cabDet('Tus datos personales')}<div class="cuerpo">
        <div class="titulo"><div class="ceja">Privacidad</div><h1 class="d d-44">Tus datos</h1><p class="t13">Tú decides qué autorizas. Puedes ver, descargar o eliminar tus datos cuando quieras.</p></div>
        <section class="pf-grupo"><div class="ceja">Autorizaciones que diste el ${fecha}</div><div class="lista pf-sw">
          <div class="fila"><span></span><span><span class="t13" style="display:block">Prestarte el servicio</span><span class="t11" style="display:block">Contacto, vehículos, reservas y pagos. Es necesaria para usar la app.</span></span><span class="chip chip-pos">${ico('check')}Activa</span></div>
          <div class="fila"><span></span><span><span class="t13" style="display:block">Consultar tu vehículo en el RUNT</span><span class="t11" style="display:block">Para traer SOAT, tecnomecánica y datos técnicos.</span></span><button class="inter" role="switch" aria-checked="${a.runt ? 'true' : 'false'}" data-a="pf-aut" data-k="runt" aria-label="Consultar tu vehículo en el RUNT"></button></div>
          <div class="fila"><span></span><span><span class="t13" style="display:block">Promociones de comercios aliados</span><span class="t11" style="display:block">Ofertas cerca de ti. Opcional.</span></span><button class="inter" role="switch" aria-checked="${a.promos ? 'true' : 'false'}" data-a="pf-aut" data-k="promos" aria-label="Promociones de comercios aliados"></button></div>
          <div class="fila"><span></span><span><span class="t13" style="display:block">Estudios de mercado anónimos</span><span class="t11" style="display:block">Datos agregados, nunca con tu nombre. Opcional.</span></span><button class="inter" role="switch" aria-checked="${a.estudios ? 'true' : 'false'}" data-a="pf-aut" data-k="estudios" aria-label="Estudios de mercado anónimos"></button></div>
        </div></section>
        <div class="lista" style="margin-top:18px">
          ${fila('descargar', 'Descargar mis datos', 'Te enviamos un archivo a tu correo', 'data-a="pf-descargar-datos"')}
          ${fila('eliminar', 'Eliminar mi cuenta', 'Borra tus datos personales de la app', 'data-a="pf-eliminar"')}
        </div>
        <div class="aviso-caja" style="margin-top:18px">${ico('informacion')}<span>Tratamiento de datos conforme a la Ley 1581 de 2012 y el Decreto 1377 de 2013. Responsable del tratamiento: por definir antes del lanzamiento.</span></div>
      </div>`;
    },
  };

  /* ---------------- acciones ---------------- */
  Object.assign(DRS.acciones, {
    'pf-copiar': () => DRS.tel.tostada('Código copiado: ANDRES-7Q2', 'copiar'),
    'pf-compartir': () => {
      if (DRS.pantallas.whatsapp) DRS.tel.ir('whatsapp', { contacto: 'Camila', sub: 'últ. vez hoy', mensajes: [], borrador: 'Te regalo 500 puntos en la app de DRS Motors para lavar el carro o renovar el SOAT. Usa mi código ANDRES-7Q2.', respuesta: '¡Gracias! Ya me la bajé.' });
      else DRS.tel.tostada('Enlace de invitación listo para compartir', 'compartir');
    },
    'pf-guardar': () => {
      const v = (id) => U.$(`#${id}`).value.trim();
      DRS.cambiar((s) => { s.usuario.nombre = v('pf-nombre') || s.usuario.nombre; s.usuario.apellido = v('pf-apellido') || s.usuario.apellido; s.usuario.correo = v('pf-correo') || s.usuario.correo; }, { tipo: 'perfil' });
      DRS.tel.atras();
      DRS.tel.tostada('Cambios guardados');
    },
    'pf-medio': (d) => DRS.cambiar((s) => { s.medios.preferido = d.m; }, { tipo: 'medios' }),
    'pf-agregar-medio': () => DRS.tel.hoja(html`<div class="hoja-cab"><h2 class="d d-34">Agregar medio</h2><button class="hoja-cerrar" data-a="hoja-cerrar" aria-label="Cerrar">${ico('cerrar')}</button></div>
      ${[['pago', 'Tarjeta de crédito o débito'], ['telefono', 'Nequi o Daviplata'], ['enlace-externo', 'Cuenta bancaria para PSE']].map(([i, t]) => html`<button class="opcion" data-a="pf-medio-demo">${ico(i)}<span class="t13 t-1">${t}</span>${ico('chevron', 's16')}</button>`)}
      <p class="t11" style="margin-top:10px">En la demo no se agregan medios reales.</p>`),
    'pf-medio-demo': () => { DRS.tel.cerrarHoja(); DRS.tel.tostada('En la app real se abre el formulario seguro de la pasarela', 'pago'); },
    'pf-comprobante': (d) => { const p = DRS.estado.pagos.find((x) => x.id === d.id); if (p) comprobante(p); },
    'pf-sw': (d) => DRS.cambiar((s) => { const o = d.g === 'c' ? s.canales : s.alertas; o[d.k] = !o[d.k]; }, { tipo: 'preferencias' }),
    'pf-antic': (d) => DRS.cambiar((s) => { s.alertas.anticipacion = Number(d.n); }, { tipo: 'preferencias' }),
    'pf-probar': (d) => DRS.avisos.lanzar(d.id),
    'pf-bloqueado': () => { DRS.ios.bloquear(); setTimeout(() => { DRS.avisos.lanzar('pypNoche'); }, 700); setTimeout(() => { DRS.avisos.lanzar('soat30'); }, 1500); },
    'pf-aut': (d) => DRS.cambiar((s) => { s.autorizaciones[d.k] = !s.autorizaciones[d.k]; }, { tipo: 'privacidad' }),
    'pf-descargar-datos': () => DRS.tel.tostada('Te enviamos tus datos al correo (simulado)', 'correo'),
    'pf-eliminar': () => DRS.tel.hoja(html`<div class="hoja-cab"><div><div class="ceja">Privacidad</div><h2 class="d d-34" style="margin-top:8px">¿Eliminar tu cuenta?</h2></div><button class="hoja-cerrar" data-a="hoja-cerrar" aria-label="Cerrar">${ico('cerrar')}</button></div>
      <p class="t13">Borramos tus datos personales, tus vehículos y tus puntos. Los comprobantes de pago se conservan el tiempo que exige la ley.</p>
      <button class="btn btn-fantasma" data-a="hoja-cerrar" style="margin-top:14px">No, conservar mi cuenta</button>
      <button class="btn btn-borde" data-a="pf-eliminar-demo" style="margin-top:8px;border-color:var(--neg);color:var(--neg)">${ico('eliminar')}Sí, eliminar</button>`),
    'pf-eliminar-demo': () => { DRS.tel.cerrarHoja(); DRS.tel.tostada('En la demo la cuenta no se elimina', 'informacion'); },
    'pf-ciudad': () => DRS.tel.tostada('Por ahora la app opera en Bogotá', 'ubicacion'),
    'pf-soporte': () => {
      if (DRS.pantallas.whatsapp) DRS.tel.ir('whatsapp', { contacto: 'DRS Motors', sub: 'Soporte · cuenta de empresa', mensajes: [], borrador: 'Hola, necesito ayuda con mi reserva DRS-4821.' });
      else DRS.tel.tostada('En la app real se abre WhatsApp', 'chat');
    },
    'pf-opinion': () => DRS.tel.tostada('Gracias. En la app real se abre una encuesta corta', 'comentar'),
    'pf-terminos': () => DRS.tel.tostada('Términos y política de datos: por redactar antes del lanzamiento', 'documento'),
    'pf-salir': () => {
      if (DRS.pantallas.bienvenida) DRS.tel.tabIr('bienvenida');
      else DRS.tel.tostada('Sesión cerrada (simulado)');
    },
  });
})();
