export interface ZPLLabelData {
  codigo_universal: string
  nombre: string
  marca: string
  marcaPrefijo?: string
  vehiculo: string
  precio_venta: number
  unidad: string
  creado_en?: string
  fecha_importacion?: string
}

const DPM = 8

const LABEL_W_DOTS = 30 * DPM   // 240
const LABEL_H_DOTS = 20 * DPM   // 160

function formatearFecha(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}

function buildLabel(data: ZPLLabelData): string {
  const codigo = data.marcaPrefijo
    ? `${data.marcaPrefijo}-${data.codigo_universal}`
    : data.codigo_universal

  const fecha = data.fecha_importacion
    ? formatearFecha(data.fecha_importacion)
    : data.creado_en
    ? formatearFecha(data.creado_en)
    : ''

  const parts = [
    `^XA`,
    `^PW${LABEL_W_DOTS}`,   // 240 — ancho de UNA etiqueta
    `^LL${LABEL_H_DOTS}`,   // 160
    `^CI28`,
    `^LH0,0`,

    // Empresa — centrada, Y=4
    `^FO0,4^FB${LABEL_W_DOTS},1,,C,0^A0N,12,12^FDUsa AutoPartes\&^FS`,

    // Barcode — X=4, Y=20, altura 55 dots, sin HRI interno
    `^FO4,20^BY2,2,55^BCN,,N,N,N^FD${codigo}^FS`,

    // Código texto — centrado, Y=82
    `^FO0,82^FB${LABEL_W_DOTS},1,,C,0^A0N,10,10^FD${codigo}\&^FS`,

    // Fecha — centrada, Y=120
    ...(fecha
      ? [`^FO0,120^FB${LABEL_W_DOTS},1,,C,0^A0N,10,10^FD${fecha}\&^FS`]
      : []),

    `^XZ`,
  ]

  const zpl = parts.join('')
  console.log('[ZPL]', zpl)
  return zpl
}

export function generarZPLMultiple(
  labels: ZPLLabelData[],
  copiasPorLabel: number,
): string[] {
  const commands: string[] = []
  for (const label of labels) {
    const zpl = buildLabel(label)
    for (let i = 0; i < copiasPorLabel; i++) {
      commands.push(zpl)
    }
  }
  return commands
}

export { buildLabel as generarZPLRow }