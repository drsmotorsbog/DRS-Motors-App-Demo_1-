/* Genera los íconos de la app instalable (iconos/*.png) con el monograma D aprobado
   (logo-mono-oscuro de Marca/drs.logos.svg, vía js/marca.js) sobre Negro Carbón.
   El color de fondo se lee de css/drs.tokens.css (--sup-1 del modo noche): no se copia.
   Uso:  node herramientas/iconos.cjs
   Necesita puppeteer-core y Google Chrome (ruta en PUPPETEER_CORE y CHROME si cambian). */
const fs = require('fs');
const path = require('path');
const RAIZ = path.resolve(__dirname, '..');
const puppeteer = require(process.env.PUPPETEER_CORE || 'puppeteer-core');
const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const marca = fs.readFileSync(path.join(RAIZ, 'js/marca.js'), 'utf8');
const logos = JSON.parse(marca.slice(marca.indexOf('{'), marca.lastIndexOf('}') + 1)).logos;
const tokens = fs.readFileSync(path.join(RAIZ, 'css/drs.tokens.css'), 'utf8');
const fondo = tokens.slice(tokens.indexOf('[data-modo="noche"]')).match(/--sup-1\s*:\s*(#[0-9A-Fa-f]{6})/)[1];

// El monograma ocupa el 52 % del ancho: queda dentro del círculo seguro de los íconos «maskable»
const pagina = (lado) => `<!doctype html><html><body style="margin:0;background:${fondo}">
  <div style="display:none">${logos}</div>
  <svg width="${lado}" height="${lado}" viewBox="0 0 200 200" style="display:block;background:${fondo}">
    <svg x="48" y="48" width="104" height="104" viewBox="20 24 104 92"><use href="#logo-mono-oscuro" x="0" y="0" width="140" height="140"/></svg>
  </svg></body></html>`;

(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: 'new' });
  const p = await b.newPage();
  for (const [lado, nombre] of [[512, 'icono-512.png'], [192, 'icono-192.png'], [180, 'icono-180.png'], [32, 'icono-32.png']]) {
    await p.setViewport({ width: lado, height: lado, deviceScaleFactor: 1 });
    await p.setContent(pagina(lado));
    await p.screenshot({ path: path.join(RAIZ, 'iconos', nombre), clip: { x: 0, y: 0, width: lado, height: lado } });
    console.log('iconos/' + nombre);
  }
  await b.close();
})();
