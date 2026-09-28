/* DRS Motors · demo — vehículos: el motor de tiempos y el cursor CAD de los planos
   Observa el DOM: cada svg.bp[data-anim] que aparece se planifica una sola vez. Mide la longitud
   real de cada trazo (getTotalLength), reparte el tiempo a velocidad de pluma constante —la
   silueta primero, los detalles encima, solapados— y escribe --d y --dur en línea; el resto lo
   hace css/vehiculos.css. En los modos traza y tecnica un cursor CAD sigue la línea que se está
   dibujando. Con «reducir movimiento» no planifica ni mueve el cursor: base.css deja toda
   animación en su estado final. El observador corre antes del primer pintado, así que el plano
   nunca parpadea en su estado final antes de empezar a dibujarse. */
(function () {
  'use strict';
  const DRS = window.DRS;
  const reducido = () => !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const VEL_SIL = 5.6, VEL_DET = 5.4;           // unidades del dibujo por milisegundo

  /** Reparte el tiempo de dibujo por longitud real. Devuelve el plan para el cursor. */
  function planear(svg) {
    const k = svg.classList.contains('bp-rapido') ? 0.7 : 1;
    const d0 = parseFloat(svg.style.getPropertyValue('--d0')) || 0;
    const sil = Array.from(svg.querySelectorAll('path.bp-sil'));
    const det = Array.from(svg.querySelectorAll('path.bp-det'));
    const plan = [];
    const pon = (p, d, dur, len) => {
      p.style.setProperty('--d', `${Math.round(d)}ms`);
      p.style.setProperty('--dur', `${Math.round(dur)}ms`);
      plan.push({ p, d, dur, len });
    };
    const largo = (p) => { try { return p.getTotalLength() || 1; } catch (e) { return 1; } };
    let t = 80 * k;
    sil.forEach((p) => { const len = largo(p); const dur = Math.max(280, Math.min(560, len / VEL_SIL)) * k; pon(p, t, dur, len); t += dur; });
    let td = 80 * k + (plan.length ? plan[0].dur * 0.4 : 0);       // los detalles arrancan con la silueta a medio hacer
    const lens = det.map(largo);
    const total = lens.reduce((a, b) => a + b, 0) || 1;
    const bolsa = Math.max(340, Math.min(580, total / VEL_DET)) * k;
    det.forEach((p, i) => { const dur = Math.max(36 * k, (bolsa * lens[i]) / total); pon(p, td, dur, lens[i]); td += dur; });
    const fin = Math.max(t, td);
    svg.style.setProperty('--fin', `${Math.round(fin)}ms`);
    return { plan, d0, fin };
  }

  /** El cursor sigue el trazo en curso: el último que empezó y no ha terminado. */
  function cursor(svg, { plan, d0, fin }) {
    const cur = svg.querySelector('.bp-cursor');
    if (!cur || !plan.length) return;
    const t0 = performance.now() + d0;
    const paso = (ahora) => {
      if (!svg.isConnected) return;
      const t = ahora - t0;
      if (t >= 0) {
        let item = null;
        for (const it of plan) if (t >= it.d && t < it.d + it.dur) item = it;
        if (item) {
          const pt = item.p.getPointAtLength(Math.min(1, (t - item.d) / item.dur) * item.len);
          cur.setAttribute('transform', `translate(${pt.x.toFixed(1)} ${pt.y.toFixed(1)})`);
          cur.style.opacity = '1';
        }
      }
      if (t < fin + 30) requestAnimationFrame(paso);
      else { cur.style.transition = 'opacity .16s'; cur.style.opacity = '0'; }
    };
    requestAnimationFrame(paso);
  }

  /* ---------------- cajas de texto a la medida real ----------------
     blueprint.js estima el ancho de las lecturas del escaneo y del rótulo por número de letras;
     aquí se mide el texto ya pintado (getComputedTextLength) y la caja se ajusta: ninguna letra
     se sale de su caja ni del plano, y las lecturas que se tocarían bajan a otra fila. */
  function ajustarCajas(svg) {
    const vb = svg.viewBox && svg.viewBox.baseVal;
    if (!vb || !vb.width) return;
    const medir = (t) => { try { return t.getComputedTextLength(); } catch (e) { return 0; } };
    const filas = [];
    svg.querySelectorAll('.bp-lect').forEach((g) => {
      const txt = g.querySelector('.bp-lect-txt'), caja = g.querySelector('.bp-lect-caja'), guia = g.querySelector('path'), ancla = g.querySelector('rect.bp-a');
      const largo = txt && medir(txt);
      if (!largo || !caja || !guia || !ancla) return;
      const h = parseFloat(caja.getAttribute('height')) || 32;
      const w = Math.ceil(largo + 26);
      const ax = parseFloat(ancla.getAttribute('x')) + 5, ay = parseFloat(ancla.getAttribute('y')) + 5;
      const x = Math.max(vb.x + 6, Math.min(vb.x + vb.width - w - 6, ax - w * 0.35));
      let fila = 0;
      while (filas.some((o) => o.f === fila && x < o.x + o.w + 8 && o.x < x + w + 8)) fila++;
      filas.push({ f: fila, x, w });
      const y = 26 + fila * (h + 6);
      caja.setAttribute('x', x.toFixed(1)); caja.setAttribute('y', y); caja.setAttribute('width', w);
      txt.setAttribute('x', (x + 12).toFixed(1)); txt.setAttribute('y', (y + h * 0.69).toFixed(1));
      guia.setAttribute('d', `M${Math.max(x + 8, Math.min(x + w - 8, ax)).toFixed(1)} ${y + h}V${(ay - 8).toFixed(1)}`);
    });
    svg.querySelectorAll('.bp-rotulo').forEach((r) => {
      const txt = r.querySelector('.bp-rotulo-txt'), caja = r.querySelector('.bp-rotulo-caja'), raya = r.querySelector('path');
      const interno = r.firstElementChild, externo = r.parentNode;
      const largo = txt && medir(txt);
      if (!largo || !caja || !interno || !externo || !externo.transform) return;
      const w0 = parseFloat(caja.getAttribute('width')), h = parseFloat(caja.getAttribute('height')) || 26;
      const w = Math.ceil(largo + 24);
      if (Math.abs(w - w0) < 1) return;
      const m = /translate\(([-\d.]+)[ ,]+([-\d.]+)\)/.exec(externo.getAttribute('transform') || '');
      if (!m) return;
      const derecha = parseFloat(m[1]) + w0 / 2;                    // el rótulo sigue alineado a la derecha
      externo.setAttribute('transform', `translate(${(derecha - w / 2).toFixed(1)} ${m[2]})`);
      interno.setAttribute('transform', `translate(${(-w / 2).toFixed(1)} ${(-h / 2).toFixed(1)})`);
      caja.setAttribute('width', w);
      if (raya) raya.setAttribute('d', `M0 0H${w}`);
    });
  }

  /** Planifica los planos nuevos dentro de raiz (una sola vez cada uno). */
  function activar(raiz) {
    if (!raiz || raiz.nodeType !== 1) return;
    const conCajas = (raiz.matches('svg.bp') ? [raiz] : Array.from(raiz.querySelectorAll('svg.bp'))).filter((s) => s.querySelector('.bp-lect, .bp-rotulo'));
    conCajas.forEach((svg) => {
      ajustarCajas(svg);
      if (document.fonts && document.fonts.status !== 'loaded') document.fonts.ready.then(() => ajustarCajas(svg));
    });
    const lista = raiz.matches('svg.bp[data-anim]') ? [raiz] : Array.from(raiz.querySelectorAll('svg.bp[data-anim]'));
    lista.forEach((svg) => {
      if (svg.dataset.animOk) return;
      svg.dataset.animOk = '1';
      const modo = svg.dataset.anim;
      if ((modo !== 'traza' && modo !== 'tecnica') || reducido()) return;
      cursor(svg, planear(svg));
    });
  }

  const obs = new MutationObserver((ms) => { ms.forEach((m) => m.addedNodes.forEach(activar)); });
  const arrancar = () => { obs.observe(document.body, { childList: true, subtree: true }); activar(document.body); };
  if (document.body) arrancar(); else document.addEventListener('DOMContentLoaded', arrancar);

  DRS.veh = { activar, planear, ajustarCajas };
})();
