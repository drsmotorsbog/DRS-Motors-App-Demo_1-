# DRS Motors · Demo de la app

Demo navegable de la app de DRS Motors para inversionistas. Personas, placas, comercios y precios son inventados.

- **App (celular):** https://drsmotorsbog.github.io/DRS-Motors-App-Demo_1-/
- **CRM del comercio (computador):** https://drsmotorsbog.github.io/DRS-Motors-App-Demo_1-/crm/

## Qué hay

- **La app** abre con DRS Motors y tres propuestas con los mismos servicios (lavaderos, talleres, SOAT, tecnomecánica, informe vehicular, trámites y catálogo), planteadas de forma distinta:
  - **Demo 1 · Marketplace:** todo en un lugar, cuatro pestañas y el botón Lavar.
  - **Demo 2 · Mi carro:** el carro al centro, con lo que vence y lo que sigue; se navega con un botón + abajo a la derecha.
  - **Demo 3 · Mapa:** Bogotá como pantalla principal, con precios alrededor.
- **El CRM** es el panel del lavadero aliado: agenda por bahía, clientes, servicios, promociones, pagos, reseñas y métricas.
- Las dos páginas son independientes: no se sincronizan. En la app, el lavadero se simula desde las opciones de la demo; en el CRM, el botón «Simular reserva de la app» hace llegar una reserva pagada.
- **Tema oscuro, claro o automático** en las dos. El oscuro es el modo noche de la marca; el claro usa su modo documento.
- Dentro de una demo, la **barra de arriba** vuelve a las tres propuestas (‹ Tres demos) o salta a la 1, la 2 o la 3 desde cualquier pantalla.
- En cualquier demo de la app, **toca el logo DRS** para cambiar de demo o de tema, elegir la navegación (pestañas abajo o botón +), lanzar avisos de ejemplo, ver la pantalla bloqueada o simular al lavadero.

## Instalarla en el iPhone

1. Abre la dirección de la app en **Safari**.
2. Toca **Compartir** (el cuadro con la flecha hacia arriba).
3. Elige **Agregar a pantalla de inicio** y toca **Agregar**.

Queda con el ícono de DRS Motors, abre a pantalla completa y funciona sin internet después de la primera visita. Para abrir una demo directo: `?demo=1`, `?demo=2` o `?demo=3` al final de la dirección.

No hay que volver a instalarla cuando se publica una versión nueva: al abrirla con internet la baja y se recarga sola una vez. Solo si cambian el ícono o el nombre hay que borrarla y agregarla otra vez.

## Cómo está hecha

HTML, CSS y JavaScript sin compilación ni dependencias. Todo cuelga de `window.DRS`.

| Carpeta | Qué hay |
|---|---|
| `index.html` · `js/app/` | La app: motor de pantallas, barra de la demo y navegación (`tel.js`, estilos en `css/navegacion.css`), capa de iOS, pagos simulados, avisos, lanzador y opciones de la demo |
| `js/usuario/` | Pantallas de servicio comunes a las tres demos |
| `js/variantes/` · `css/v2.css` · `css/v3.css` | Cada demo: su bienvenida, su inicio y su navegación. El contrato está en la cabecera de `js/variantes/v1.js` |
| `js/movimiento/` | El vehículo abstracto de `Movimiento/app/` (plano técnico, escaneo en puntos o la mezcla, nunca la foto): el módulo, los vehículos y `montaje.js`, que lo monta en las pantallas y asigna un vehículo por carrocería. Guía: `Movimiento/APP.md` |
| `crm/` · `js/comercio/` | El CRM del comercio |
| `css/` | Estilos por rol de color; `tema.css` define el tema claro y oscuro y los roles de contraste (tarjetas, controles, botón lleno) |
| `herramientas/` | Scripts para mantener la demo (abajo) |

## Mantenimiento

- `python3 herramientas/sincronizar.py` copia desde `Marca/` los tokens de color, las fuentes y los sprites (`css/drs.tokens.css`, `css/fuentes.css` y `js/marca.js` son generados), y desde `Movimiento/app/` el módulo del vehículo abstracto y los vehículos de `VEHICULOS_APP`. Solo esto último: `python3 herramientas/sincronizar.py movimiento`. Un vehículo nuevo sale de una foto con el proceso de `Movimiento/APP.md` §5.
- `node herramientas/iconos.cjs` genera los íconos de la app instalable con el monograma aprobado.
- `python3 herramientas/publicar.py` antes de cada subida: regenera `sw.js` y `manifest.webmanifest` y pone en `index.html` y `crm/index.html` la huella de cada CSS y JS (`?v=…`), para que los celulares bajen la versión nueva sin mezclarla con la vieja.
