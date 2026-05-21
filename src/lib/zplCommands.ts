export interface ZPLLabelData {
  codigo_universal: string
  nombre: string
  marca: string
  vehiculo: string
  precio_venta: number
  unidad: string
  creado_en?: string
  fecha_importacion?: string
}

// Gainscha GS-2409T PLUS @ 203 DPI → 8 dots/mm
const DOTS_PER_MM = 8
const LABEL_W_DOTS = 30 * DOTS_PER_MM  // 240
const LABEL_H_DOTS = 20 * DOTS_PER_MM  // 160

function formatearFecha(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const dd = String(d.getDate()).padStart(2, '0')
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  return `${dd}/${mm}/${d.getFullYear()}`
}

function buildLabel(data: ZPLLabelData): string {
  const fecha = data.fecha_importacion
    ? formatearFecha(data.fecha_importacion)
    : data.creado_en
    ? formatearFecha(data.creado_en)
    : ''

  // Module width 1 dot keeps barcode narrow enough for 30mm label.
  // For a 10-char code: ~165 dots wide, fits inside 240 with room.
  const lines = [
    `^XA`,
    `^PW${LABEL_W_DOTS}`,
    `^LL${LABEL_H_DOTS}`,
    `^CI28`,
    // Company name — centered
    `^FO0,4^FB${LABEL_W_DOTS},1,,C,0^A0N,15,15^FDUSAImportadora^FS`,
    // Barcode — starts at X=4, Y=22; height 50 dots (~6mm); human-readable below
    `^FO4,22^BY1,2,50^BCN,,Y,N,N^FD${data.codigo_universal}^FS`,
    // Date — centered near bottom
    ...(fecha ? [`^FO0,130^FB${LABEL_W_DOTS},1,,C,0^A0N,12,12^FD${fecha}^FS`] : []),
    `^XZ`,
  ]

  const zpl = lines.join('')
  console.log('[ZPL single]', zpl)
  return zpl
}

export function generarZPLMultiple(
  labels: ZPLLabelData[],
  copiasPorLabel: number,
): string[] {
  const commands: string[] = []
  for (const label of labels) {
    const zpl = buildLabel(label)
    for (let c = 0; c < copiasPorLabel; c++) {
      commands.push(zpl)
    }
  }
  return commands
}

// Keep named export for any legacy imports
export { buildLabel as generarZPLRow }
