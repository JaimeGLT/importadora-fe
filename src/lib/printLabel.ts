import type JsBarcodeType from 'jsbarcode'

export interface LabelData {
  codigo_universal: string
  nombre: string
  marca: string
  vehiculo: string
  precio_venta: number
  unidad: string
}

async function generarSVG(value: string): Promise<string> {
  const mod = await import('jsbarcode')
  const JsBarcode = mod.default as typeof JsBarcodeType
  const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  try {
    JsBarcode(svgEl, value, {
      format:       'CODE128',
      width:        2,
      height:       48,
      fontSize:    
       11,
      displayValue: true,   
      margin:       4,
      background:   '#ffffff',
      lineColor:    '#000000',
      font:         'Arial, sans-serif',
      textMargin:   3,
    })
  } catch {
    return ''
  }
  return svgEl.outerHTML
}

function etiquetaHTML(producto: LabelData, svg: string): string {
  return `
    <div class="etiqueta">
      <p class="nombre">${producto.nombre}</p>
      <div class="barcode">${svg}</div>
      <p class="precio">Bs ${producto.precio_venta.toFixed(2)}</p>
    </div>`
}

// Estilos optimizados para impresora térmica:
// - Solo blanco y negro (sin grises, sin sombras)
// - Fuente sans-serif estándar (Arial / Helvetica)
// - Sin bordes decorativos en impresión
// - Alto contraste en barras y texto
const ESTILOS = `
  @page {
    size: 62mm 38mm;
    margin: 0;
  }

  * {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  body {
    font-family: Arial, Helvetica, sans-serif;
    background: #fff;
    color: #000;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .pagina {
    display: flex;
    flex-wrap: wrap;
  }

  .etiqueta {
    width: 62mm;
    height: 38mm;
    padding: 2mm 2.5mm 1.5mm 2.5mm;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    overflow: hidden;
    page-break-inside: avoid;
  }

  /* Borde solo visible en pantalla (preview) */
  @media screen {
    .etiqueta {
      outline: 0.5pt solid #bbb;
    }
  }

  .nombre {
    font-size: 8.5pt;
    font-weight: bold;
    line-height: 1.25;
    text-align: center;
    width: 100%;
    /* máximo 2 líneas */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .barcode {
    display: flex;
    justify-content: center;
    align-items: center;
    width: 100%;
    /* el SVG lleva las barras + código debajo */
  }

  .barcode svg {
    max-width: 100%;
    height: auto;
  }

  .precio {
    font-size: 11pt;
    font-weight: bold;
    text-align: center;
    width: 100%;
    letter-spacing: 0.3pt;
  }
`

/** Imprime un lote de etiquetas. items: lista de { producto, copias } */
export async function imprimirLote(
  items: { producto: LabelData; copias: number }[],
): Promise<void> {
  const svgs = await Promise.all(
    items.map((item) => generarSVG(item.producto.codigo_universal)),
  )

  const contenido = items
    .map((item, i) => etiquetaHTML(item.producto, svgs[i]).repeat(item.copias))
    .join('')

  const html = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8"/>
  <title>Etiquetas</title>
  <style>${ESTILOS}</style>
</head>
<body>
  <div class="pagina">${contenido}</div>
  <script>window.onload = function(){ window.print(); }<\/script>
</body>
</html>`

  const win = window.open('', '_blank', 'width=520,height=420')
  if (!win) return
  win.document.write(html)
  win.document.close()
}
