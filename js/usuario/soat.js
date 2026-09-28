/* DRS Motors · demo — compra del SOAT con una aseguradora aliada (simulada)
   Paso 1 datos → paso 2 valor y aseguradora → paso 3 pago → póliza en Mi garaje.
   Las tarifas son valores de ejemplo: la real la fija cada año la Superintendencia
   Financiera y es la misma en todas las aseguradoras. */
(function () {
  'use strict';
  const DRS = window.DRS;
  const U = DRS.util;
  const UI = DRS.ui;
  const { html, crudo, ico, num, pesos, placaTxt } = U;

  const ASEGURADORAS = [
    { id: 'aldaba', nombre: 'Seguros Aldaba', extra: 'Asistencia en vía 24/7 incluida' },
    { id: 'tercia', nombre: 'Seguros Tercia', extra: '10 % de descuento en lavados DRS por un año' },
    { id: 'cordillera', nombre: 'Mutual Cordillera', extra: 'Póliza al instante y una grúa al año' },
  ];
  const OTRO = { placa: 'HTR619', marca: 'Renault', linea: 'Sandero Life', modelo: 2019, clase: 'Automóvil', carroceria: 'Hatchback', servicio: 'Particular', cilindraje: 1598, tipo: 'carro' };

  /** Categoría y valor de ejemplo según clase, cilindraje y edad. */
  function tarifa(v) {
    const edad = DRS.reloj.hoy().getFullYear() - v.modelo;
    if (v.tipo === 'moto') return { cat: v.cilindraje >= 200 ? 'Motos de 200 cc o más' : 'Motos de 100 a 200 cc', valor: v.cilindraje >= 200 ? 598700 : 412300 };
    const rango = v.cilindraje < 1500 ? 'menos de 1.500 cc' : v.cilindraje <= 2500 ? 'de 1.500 a 2.500 cc' : 'más de 2.500 cc';
    const base = v.cilindraje < 1500 ? 512300 : v.cilindraje <= 2500 ? 624900 : 731400;
    return { cat: `Automóvil familiar · ${rango} · ${edad < 10 ? 'de 0 a 9 años' : '10 años o más'}`, valor: edad < 10 ? base : Math.round(base * 1.12 / 100) * 100 };
  }

  const ui = () => (DRS.tel.ui.soat = DRS.tel.ui.soat || { otro: false, consultado: false, consultando: false, autoriza: false, aseg: 'aldaba' });
  const vehiculoCompra = (p) => (ui().otro ? (ui().consultado ? OTRO : null) : DRS.q.vehiculo(p.v));
  const pasos = (n) => html`<div class="pasos-flujo" aria-label="Paso ${n} de 3">${[1, 2, 3].map((i) => html`<i class="${i < n ? 'ok' : i === n ? 'actual' : ''}"></i>`)}</div>`;

  DRS.pantallas['soat-comprar'] = {
    render(p) {
      const s = ui();
      const u = DRS.q.usuario();
      const v = vehiculoCompra(p);
      const listo = !!v && s.autoriza;
      return html`${UI.cabDet('Comprar SOAT')}<div class="cuerpo con-cta">
        <div class="titulo"><div class="ceja">Paso 1 de 3 · Datos</div><h1 class="d d-44">Comprar SOAT</h1></div>
        ${pasos(1)}
        <div class="seg" role="tablist"><button role="tab" aria-selected="${s.otro ? 'false' : 'true'}" data-a="soat-para" data-otro="0">Mi vehículo</button><button role="tab" aria-selected="${s.otro ? 'true' : 'false'}" data-a="soat-para" data-otro="1">Otro vehículo</button></div>
        ${s.otro && !s.consultado ? html`
          <div class="campos-2"><div class="campo"><label class="cap" for="soat-placa">Placa</label><input id="soat-placa" value="HTR619" autocapitalize="characters" maxlength="6"></div>
          <div class="campo"><label class="cap" for="soat-doc">Documento del propietario</label><input id="soat-doc" value="52.318.774" inputmode="numeric"></div></div>
          <button class="btn btn-borde" data-a="soat-consultar" ${crudo(s.consultando ? 'disabled' : '')}>${ico('runt')}${s.consultando ? 'Consultando el RUNT…' : 'Consultar en el RUNT'}</button>
          ${s.consultando ? html`<div class="veh-plano" style="position:relative;margin-top:12px;border:1px solid var(--linea)">${crudo(DRS.bp.carro({ ancho: 340, dibujar: true }))}<span class="escaneo"></span></div>` : ''}` : ''}
        ${v ? html`<article class="tarjeta" style="overflow:hidden">
          <div class="veh-top"><span class="ceja">Vehículo</span><span class="chip chip-luz">${ico('runt')}Datos del RUNT</span></div>
          <div class="veh-plano">${crudo(DRS.bp.vehiculo(v, { ancho: 340, dibujar: false }))}</div>
          <div class="tarjeta-pad" style="border-top:1px solid var(--linea)"><dl class="datos" style="margin:0">
            <dt>Placa</dt><dd>${placaTxt(v.placa)}</dd><dt>Vehículo</dt><dd>${v.marca} ${v.linea} · ${v.modelo}</dd>
            <dt>Clase</dt><dd>${v.clase} · ${v.carroceria}</dd><dt>Servicio</dt><dd>${v.servicio}</dd><dt>Cilindraje</dt><dd>${num(v.cilindraje)} cc</dd></dl></div>
        </article>` : ''}
        <section class="bloque">${UI.bloqueCab('Tomador', 'Quien compra la póliza. Puedes cambiarlo.')}
          <div class="campos-2"><div class="campo"><label class="cap" for="soat-nombre">Nombre</label><input id="soat-nombre" value="${u.nombre} ${u.apellido}"></div>
          <div class="campo"><label class="cap" for="soat-cc">Documento</label><input id="soat-cc" value="${u.documento.replace('CC ', '')}" inputmode="numeric"></div></div>
          <div class="campos-2"><div class="campo"><label class="cap" for="soat-cel">Celular</label><input id="soat-cel" value="${u.celular}" inputmode="tel"></div>
          <div class="campo"><label class="cap" for="soat-mail">Correo</label><input id="soat-mail" value="${u.correo}" inputmode="email"></div></div>
          <button class="check" role="checkbox" aria-checked="${s.autoriza ? 'true' : 'false'}" data-a="soat-autoriza"><i>${s.autoriza ? ico('check') : ''}</i><span>Autorizo el tratamiento de mis datos para expedir la póliza (Ley 1581 de 2012).</span></button>
        </section>
      </div>
      <div class="pie-cta"><button class="btn btn-acero" data-a="soat-cotizar" data-v="${p.v || 'v1'}" ${crudo(listo ? '' : 'disabled')}>Ver el valor del SOAT</button>
        <p class="t11">${!v ? 'Primero consulta el vehículo.' : !s.autoriza ? 'Falta tu autorización para continuar.' : 'Sin papeles: la póliza llega a tu correo y a Mi garaje.'}</p></div>`;
    },
  };

  DRS.pantallas['soat-cotizacion'] = {
    render(p) {
      const s = ui();
      const v = vehiculoCompra(p);
      const t = tarifa(v);
      const actual = !s.otro ? DRS.calc.doc(v, 'soat') : null;
      const desde = actual && actual.dias > 0 ? actual.vence : DRS.reloj.hoy();
      const hasta = U.sumarDias(desde, 364);
      return html`${UI.cabDet('Valor del SOAT')}<div class="cuerpo con-cta">
        <div class="titulo"><div class="ceja">Paso 2 de 3 · Valor</div><h1 class="d d-44">Tu SOAT</h1></div>
        ${pasos(2)}
        <div class="tarjeta tarjeta-pad">
          <span class="cap">${placaTxt(v.placa)} · ${v.marca} ${v.linea}</span>
          <div class="d d-56 num" style="margin:10px 0 4px">${pesos(t.valor)}</div>
          <p class="t13" style="margin:0">${t.cat}</p>
          <p class="t11" style="margin:8px 0 0">Valor de ejemplo para la demo.</p>
        </div>
        <div class="aviso-caja" style="margin-top:8px">${ico('informacion')}<span>El SOAT cuesta lo mismo en todas las aseguradoras: la tarifa la fija la Superintendencia Financiera cada año. Aquí eliges con quién y qué beneficio adicional te da.</span></div>
        <section class="bloque">${UI.bloqueCab('Vigencia', actual && actual.dias > 0 ? 'Empieza cuando vence el actual: no te quedas ni un día sin cobertura.' : 'Empieza hoy mismo.')}
          <div class="tarjeta tarjeta-pad"><dl class="datos" style="margin:0"><dt>Desde</dt><dd>${U.fechaLarga(desde)}</dd><dt>Hasta</dt><dd>${U.fechaLarga(hasta)} de ${hasta.getFullYear()}</dd></dl></div>
        </section>
        <section class="bloque">${UI.bloqueCab('Aseguradora aliada', 'Beneficios de ejemplo.')}
          <div role="radiogroup" aria-label="Aseguradora">${ASEGURADORAS.map((a) => html`<button class="opcion" role="radio" aria-checked="${s.aseg === a.id ? 'true' : 'false'}" data-a="soat-aseg" data-id="${a.id}">${ico('garantia')}<span><span class="t13 t-1" style="display:block;font-weight:600">${a.nombre}</span><span class="t11">${a.extra}</span></span><span class="radio"></span></button>`)}</div>
        </section>
      </div>
      <div class="pie-cta"><button class="btn btn-acero" data-a="soat-pagar" data-v="${p.v || 'v1'}">Pagar ${pesos(t.valor)}</button><p class="t11">Paso 3: pago con tarjeta, PSE o Nequi.</p></div>`;
    },
  };

  DRS.pantallas['soat-listo'] = {
    render(p) {
      const a = ASEGURADORAS.find((x) => x.id === p.aseg) || ASEGURADORAS[0];
      return html`${UI.cabDet('SOAT al día')}<div class="cuerpo">
        <div class="festejo"><i class="l1"></i><i class="l2"></i><div class="d d-56">SOAT al día</div><p class="t13" style="margin:0 auto;max-width:30ch">La póliza quedó expedida y registrada. También te la enviamos al correo.</p></div>
        <div class="tarjeta tarjeta-pad" style="margin-top:18px"><dl class="datos" style="margin:0">
          <dt>Placa</dt><dd>${placaTxt(p.placa)}</dd><dt>Aseguradora</dt><dd>${a.nombre}</dd><dt>Póliza</dt><dd>${p.poliza}</dd>
          <dt>Vigencia</dt><dd>${p.desde} → ${p.hasta}</dd><dt>Pagado</dt><dd class="num">${pesos(p.valor)}</dd></dl></div>
        <div class="aviso-caja" style="margin-top:8px">${ico('campana')}<span>Te avisamos 30, 15, 7 y 1 día antes del próximo vencimiento.</span></div>
        <button class="btn btn-fantasma" data-a="descargar" data-que="Póliza" style="margin-top:18px">${ico('descargar')}Descargar póliza</button>
        ${p.propio ? html`<button class="btn btn-borde" data-a="tab" data-tab="garaje" style="margin-top:8px">${ico('garaje')}Ver en Mi garaje</button>` : html`<button class="btn btn-borde" data-a="tab" data-tab="inicio" style="margin-top:8px">${ico('inicio')}Volver al inicio</button>`}
      </div>`;
    },
  };

  const horaAhora = () => { const a = DRS.reloj.ahora(); return U.deMin(a.getHours() * 60 + a.getMinutes()); };

  Object.assign(DRS.acciones, {
    'soat-iniciar': (d) => { DRS.tel.ui.soat = null; DRS.tel.ir('soat-comprar', { v: d.v || 'v1' }); },
    'soat-para': (d) => { const s = ui(); s.otro = d.otro === '1'; DRS.tel.refrescar(); },
    'soat-consultar': async () => {
      const s = ui();
      s.consultando = true; DRS.tel.refrescar();
      await U.espera(1700);
      s.consultando = false; s.consultado = true; DRS.tel.refrescar();
    },
    'soat-autoriza': () => { const s = ui(); s.autoriza = !s.autoriza; DRS.tel.refrescar(); },
    'soat-cotizar': (d) => DRS.tel.ir('soat-cotizacion', { v: d.v }),
    'soat-aseg': (d) => { ui().aseg = d.id; DRS.tel.refrescar(); },
    'soat-pagar': (d) => {
      const s = ui();
      const v = vehiculoCompra({ v: d.v });
      const t = tarifa(v);
      const a = ASEGURADORAS.find((x) => x.id === s.aseg);
      const actual = !s.otro ? DRS.calc.doc(v, 'soat') : null;
      const inicio = actual && actual.dias > 0 ? actual.dias : 0;
      DRS.pago.abrir({
        titulo: 'Pagar SOAT', concepto: `SOAT · ${placaTxt(v.placa)}`, lineas: [[`SOAT con ${a.nombre}`, t.valor]], total: t.valor,
        pasos: [`Expidiendo la póliza con ${a.nombre}`, 'Registrando la póliza en el RUNT'],
        alPagar: (medio, ref) => {
          const poliza = `SA-${String(Math.floor(Math.random() * 9000) + 1000)}-${String(Math.floor(Math.random() * 9000) + 1000)}-27`;
          const nombresMedio = { tarjeta: 'Tarjeta Visa terminada en 4417', pse: 'PSE', nequi: 'Nequi' };
          DRS.cambiar((st) => {
            if (!s.otro) {
              const veh = st.vehiculos.find((x) => x.id === v.id);
              veh.soat = { vence: inicio + 365, inicio, poliza, aseguradora: a.nombre, consulta: { d: 0, h: horaAhora() } };
            }
            (st.pagos = st.pagos || []).unshift({ id: `p${Date.now()}`, d: 0, h: horaAhora(), concepto: `SOAT · ${placaTxt(v.placa)} · ${a.nombre}`, ref, medio: nombresMedio[medio], total: t.valor, tipo: 'soat' });
          }, { tipo: 'soat' });
          const desde = U.sumarDias(DRS.reloj.hoy(), inicio);
          DRS.tel.ui.soat = null;
          DRS.tel.saltar(s.otro ? 'inicio' : 'garaje', 'soat-listo', { placa: v.placa, aseg: a.id, poliza, valor: t.valor, propio: !s.otro, desde: U.fechaCorta(desde), hasta: U.fechaCorta(U.sumarDias(desde, 364)) });
          setTimeout(() => DRS.avisos.lanzar('soatOk', { otro: s.otro, placa: v.placa }), 1400);
        },
      });
    },
  });
})();
