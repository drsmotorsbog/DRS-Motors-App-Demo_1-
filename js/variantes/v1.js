/* DRS Motors · Demo 1 · «Marketplace» — todo lo del carro en un solo lugar (patrón Rappi)
   Es la propuesta de las entregas anteriores: Inicio con lo que vence y qué hacer, cuatro
   pestañas y el botón Lavar siempre a la mano. Sus pantallas viven en js/usuario/.

   Contrato de una demo (lo leen js/app/tel.js, lanzador.js y demo-menu.js):
     id, numero, nombre, lema, descripcion
     bienvenida  ruta de su primera pantalla (la «landing»); de ahí sigue el registro común
     inicio      ruta de su pantalla principal (una de sus pestañas)
     tabs        [{ id, nombre, ico }] — [] si la demo no usa barra inferior
     fab         { nombre, etiqueta, ico, ruta, p } o null — botón junto a la barra
     clase       clase que se agrega al .tel para los estilos propios de la demo
     plano()     dibujo pequeño de la propuesta para la tarjeta del lanzador (SVG en texto) */
(function () {
  'use strict';
  const DRS = window.DRS;
  DRS.variantes = DRS.variantes || {};

  DRS.variantes.v1 = {
    id: 'v1',
    numero: 1,
    nombre: 'Marketplace',
    lema: 'Todo lo de tu carro en un solo lugar.',
    descripcion: 'Un inicio con lo que vence y qué hacer, cuatro pestañas y el botón Lavar siempre a la mano.',
    bienvenida: 'bienvenida',
    inicio: 'inicio',
    tabs: [
      { id: 'inicio', nombre: 'Inicio', ico: 'inicio' },
      { id: 'servicios', nombre: 'Servicios', ico: 'servicios' },
      { id: 'garaje', nombre: 'Mi garaje', ico: 'garaje' },
      { id: 'reservas', nombre: 'Reservas', ico: 'reservas' },
    ],
    fab: { nombre: 'Lavar', etiqueta: 'Reservar lavado', ico: 'detailing', ruta: 'explorar', p: { tipo: 'lavadero' } },
    clase: 'var-v1',
    /** Plano de la propuesta: tarjetas apiladas y barra con cuatro pestañas y el botón aparte. */
    plano: () => `<svg viewBox="0 0 120 200" aria-hidden="true" class="plano-demo">
      <rect x="1" y="1" width="118" height="198" class="pd-marco"/>
      <rect x="10" y="12" width="36" height="6" class="pd-txt"/><rect x="96" y="10" width="14" height="10" class="pd-linea"/>
      <rect x="10" y="28" width="100" height="16" class="pd-linea"/><rect x="10" y="28" width="3" height="16" class="pd-acento"/>
      <rect x="10" y="50" width="100" height="44" class="pd-linea"/><path d="M26 82h68M32 82l8-14h30l10 14M36 86a4 4 0 1 0 0.1 0M84 86a4 4 0 1 0 0.1 0" class="pd-trazo"/>
      <rect x="10" y="100" width="48" height="30" class="pd-linea"/><rect x="62" y="100" width="48" height="30" class="pd-linea"/>
      <rect x="10" y="136" width="100" height="14" class="pd-linea"/>
      <rect x="10" y="176" width="76" height="16" class="pd-linea"/><rect x="90" y="176" width="20" height="16" class="pd-acento"/>
      <path d="M24 184h4M40 184h4M56 184h4M72 184h4" class="pd-trazo"/>
    </svg>`,
  };
})();
