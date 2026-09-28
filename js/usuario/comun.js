/* DRS Motors · demo — piezas compartidas de la app del usuario */
(function () {
  'use strict';
  const DRS = window.DRS;
  const U = DRS.util;
  const { html, crudo, ico, num, placaTxt } = U;

  /* ---------------- cálculos de estado (semáforo) ---------------- */
  const GLIFO = { pos: 'check', warn: 'excl', neg: 'cerrar' };
  DRS.calc = {
    /** SOAT o tecnomecánica: días para vencer, estado y vida restante (anual). */
    doc(v, tipo) {
      const d = v[tipo];
      const dias = d.vence;
      const estado = dias <= 0 ? 'neg' : dias <= 30 ? 'warn' : 'pos';
      const etiqueta = dias <= 0 ? 'Vencido' : dias <= 30 ? 'Por vencer' : 'Vigente';
      return { dias, estado, etiqueta, p: Math.max(0, dias) / 365, vence: DRS.reloj.dia(dias) };
    },
    aceite(v) {
      const a = v.aceite;
      const proximoKm = a.ultimoKm + a.cadaKm;
      const faltan = proximoKm - v.km;
      const estado = faltan <= 0 ? 'neg' : faltan <= 1000 ? 'warn' : 'pos';
      const etiqueta = faltan <= 0 ? 'Vencido' : faltan <= 1000 ? 'Próximo' : 'Al día';
      const fecha = DRS.reloj.dia(a.ultimoD + Math.round(a.cadaMeses * 30.4));
      return { faltan, proximoKm, estado, etiqueta, p: Math.max(0, faltan) / a.cadaKm, fecha };
    },
    llantas(v) {
      const l = v.llantas;
      const faltan = l.montadasKm + l.vidaKm - v.km;
      const estado = faltan <= 0 ? 'neg' : faltan <= 5000 ? 'warn' : 'pos';
      const etiqueta = faltan <= 0 ? 'Cambiar' : faltan <= 5000 ? 'Revisar' : 'Bien';
      return { faltan, estado, etiqueta, p: Math.max(0, faltan) / l.vidaKm };
    },
  };

  const chipEstado = (estado, etiqueta) => html`<span class="chip chip-${estado}">${ico(GLIFO[estado])}${etiqueta}</span>`;
  const listaY = (xs) => (xs.length > 1 ? `${xs.slice(0, -1).join(', ')} y ${xs[xs.length - 1]}` : String(xs[0]));
  const modelo = (v) => `${v.marca} ${v.linea}`;
  const modeloCorto = (v) => `${v.marca} ${v.linea.split(' ')[0]}`;
  const datosP = (p) => U.esc(JSON.stringify(p));

  /** Lockup horizontal sin sublabel (se retira bajo 160 px de ancho, 08 §10). Lleva las dos piezas
      aprobadas —oscuro y claro— y el tema muestra la que toca (css/escritorio.css, .logo-dual). */
  const logoH = () => crudo('<span class="logo-dual"><svg class="solo-noche" viewBox="0 18 420 88" aria-hidden="true"><use href="#logo-h-oscuro" x="0" y="0" width="420" height="150"/></svg><svg class="solo-doc" viewBox="0 18 420 88" aria-hidden="true"><use href="#logo-h-claro" x="0" y="0" width="420" height="150"/></svg></span>');

  function cabRaiz() {
    const v = DRS.q.vehiculo();
    const u = DRS.q.usuario();
    const n = DRS.q.noLeidas();
    // Abierta como pestaña no lleva «atrás»; si una demo la apila encima de su inicio, sí.
    // El logo abre las opciones de la demo (cambiar de demo, tema, avisos de ejemplo).
    return html`<header class="cab">
      ${DRS.tel.comoPestana ? '' : html`<button class="cab-atras" data-a="atras" aria-label="Volver">${ico('atras')}</button>`}
      <button class="cab-logo" data-a="demo-menu" aria-label="DRS Motors · opciones de la demo">${logoH()}</button>
      <button class="placa" data-a="hoja-vehiculo" aria-label="Vehículo activo ${placaTxt(v.placa)}. Cambiar de vehículo">${ico(v.tipo === 'moto' ? 'moto' : 'carro')}<span class="placa-txt">${placaTxt(v.placa)}</span>${ico('abajo', 's-flecha')}</button>
      <button class="cab-btn" data-a="ir" data-ruta="notificaciones" aria-label="Notificaciones, ${n} sin leer">${ico('campana')}${n ? html`<span class="badge" data-badge="${n}">${n}</span>` : ''}</button>
      <button class="avatar" data-a="ir" data-ruta="perfil" aria-label="Tu perfil">${u.nombre[0]}${u.apellido[0]}</button>
    </header>`;
  }

  function cabDet(titulo) {
    return html`<header class="cab cab-det"><button class="cab-atras" data-a="atras" aria-label="Volver">${ico('atras')}</button><span class="cab-titulo">${titulo}</span></header>`;
  }

  function bloqueCab(titulo, sub, enlace) {
    return html`<div class="bloque-cab"><div><h2 class="d d-26">${titulo}</h2>${sub ? html`<p class="t13" style="margin:6px 0 0">${sub}</p>` : ''}</div>${enlace || ''}</div>`;
  }

  function enlace(texto, attrs) {
    return html`<button class="enlace" ${crudo(attrs)}>${texto}${ico('chevron')}</button>`;
  }

  const irAttrs = (ruta, p = {}) => `data-a="ir" data-ruta="${ruta}" data-p="${datosP(p)}"`;
  const proxAttrs = (que) => `data-a="proxima" data-que="${que}"`;
  const SERV_RUTA = {
    lavaderos: ['explorar', { tipo: 'lavadero' }], talleres: ['explorar', { tipo: 'taller' }], tecno: ['explorar', { tipo: 'cda' }],
    informe: ['informe', {}], tramites: ['tramites', {}], catalogo: ['catalogo', {}], beneficios: ['beneficios', {}], calendario: ['calendario-pyp', {}],
  };
  /** Atributos para abrir un servicio; si la pantalla aún no existe, el escenario avisa «próxima entrega». */
  const servAttrs = (que) => (que === 'soat' ? `data-a="soat-iniciar" data-v="${(DRS.estado && DRS.estado.vehiculoActivo) || 'v1'}"` : SERV_RUTA[que] ? irAttrs(SERV_RUTA[que][0], SERV_RUTA[que][1]) : proxAttrs(que));

  DRS.ui = { chipEstado, listaY, modelo, modeloCorto, datosP, logoH, cabRaiz, cabDet, bloqueCab, enlace, irAttrs, proxAttrs, servAttrs, GLIFO };
})();
