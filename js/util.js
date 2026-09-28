/* DRS Motors · demo — utilidades compartidas (formato es-CO, plantillas, fechas) */
(function () {
  'use strict';
  const DRS = (window.DRS = window.DRS || {});
  DRS.acciones = DRS.acciones || {};           // cada módulo agrega las suyas con Object.assign

  /* ---------- plantillas HTML seguras ---------- */
  class Crudo { constructor(s) { this.s = s; } toString() { return this.s; } }
  const crudo = (s) => new Crudo(String(s));
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  function valor(v) {
    if (v == null || v === false || v === true) return '';
    if (v instanceof Crudo) return v.s;
    if (Array.isArray(v)) return v.map(valor).join('');
    return esc(v);
  }
  /** html`...` escapa todo lo interpolado salvo lo que ya es html`` o crudo() */
  function html(partes, ...vals) {
    let out = '';
    partes.forEach((p, i) => { out += p; if (i < vals.length) out += valor(vals[i]); });
    return new Crudo(out);
  }

  /* ---------- formato es-CO ---------- */
  const fPesos = new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 });
  const fNum = new Intl.NumberFormat('es-CO', { maximumFractionDigits: 1 });
  const pesos = (n) => fPesos.format(n);                 // «$ 38.000»
  const num = (n) => fNum.format(n);                     // «48.320» · «4,8»
  const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  const DIAS_1 = ['D', 'L', 'M', 'M', 'J', 'V', 'S'];
  const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  const MES3 = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sept', 'oct', 'nov', 'dic'];

  const sinHora = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const sumarDias = (d, n) => { const x = sinHora(d); x.setDate(x.getDate() + n); return x; };
  const diasEntre = (a, b) => Math.round((sinHora(b) - sinHora(a)) / 864e5);
  const isoDia = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const deIso = (s) => { const [y, m, d] = s.split('-').map(Number); return new Date(y, m - 1, d); };
  const fechaLarga = (d) => `${DIAS[d.getDay()]} ${d.getDate()} de ${MESES[d.getMonth()]}`;
  const fechaCorta = (d) => `${d.getDate()} ${MES3[d.getMonth()]} ${d.getFullYear()}`;
  const diaMes = (d) => `${d.getDate()} ${MES3[d.getMonth()]}`;
  function hora(h, m) {                                   // «10:30 a. m.»
    if (h instanceof Date) { m = h.getMinutes(); h = h.getHours(); }
    const suf = h < 12 ? 'a. m.' : 'p. m.';
    const h12 = h % 12 === 0 ? 12 : h % 12;
    return `${h12}:${String(m).padStart(2, '0')} ${suf}`;
  }
  const aMin = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return h * 60 + m; };
  const deMin = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;
  const horaTxt = (hhmm) => { const [h, m] = hhmm.split(':').map(Number); return hora(h, m); };

  /* ---------- DOM ---------- */
  const $ = (sel, raiz = document) => raiz.querySelector(sel);
  const $$ = (sel, raiz = document) => Array.from(raiz.querySelectorAll(sel));
  const ico = (id, cls = '') => crudo(`<svg class="ico ${cls}" aria-hidden="true"><use href="#ico-${id}"/></svg>`);
  const placaTxt = (p) => (p.length === 6 ? `${p.slice(0, 3)} ${p.slice(3)}` : p);
  const espera = (ms) => new Promise((r) => setTimeout(r, ms));

  /** Cuenta hasta un número (Bebas, es-CO). Respeta reducir movimiento. */
  function contar(el, hasta, { desde = 0, ms = 900, fmt = num } = {}) {
    if (!el) return;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { el.textContent = fmt(hasta); return; }
    const t0 = performance.now();
    const fin = setTimeout(() => { el.textContent = fmt(hasta); }, ms + 80);   // por si la pestaña no pinta cuadros
    const paso = (t) => {
      const k = Math.min(1, (t - t0) / ms);
      const e = 1 - Math.pow(1 - k, 3);
      el.textContent = fmt(Math.round(desde + (hasta - desde) * e));
      if (k < 1) requestAnimationFrame(paso); else clearTimeout(fin);
    };
    requestAnimationFrame(paso);
  }

  DRS.util = {
    html, crudo, esc, pesos, num, DIAS, DIAS_1, MESES, MES3, sinHora, sumarDias, diasEntre, isoDia, deIso,
    fechaLarga, fechaCorta, diaMes, hora, horaTxt, aMin, deMin, $, $$, ico, placaTxt, espera, contar,
  };
})();
