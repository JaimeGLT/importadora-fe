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

const DOTS_PER_MM = 8
const LABEL_W_MM = 30
const LABEL_H_MM = 20
const ROW_W_MM = 90
const LABEL_W_DOTS = LABEL_W_MM * DOTS_PER_MM
const ROW_W_DOTS = ROW_W_MM * DOTS_PER_MM
const ROW_H_DOTS = LABEL_H_MM * DOTS_PER_MM
const COL_OFFSET_1 = 0
const COL_OFFSET_2 = LABEL_W_DOTS
const COL_OFFSET_3 = LABEL_W_DOTS * 2
const LABEL_H_MARGIN = 10

function buildLabelBlock(data: ZPLLabelData, xBase: number): string {
  const xLeft = xBase + LABEL_H_MARGIN
  const barcodeCode = data.codigo_universal

  return [
    `^FO${xLeft},5^A0N,18,18^FDUSAImportadora^FS`,
    `^FO${xLeft},25^BCN,60,Y,N,N^FD${barcodeCode}^FS`,
  ].join('')
}

function generarZPLRow(data: ZPLLabelData): string {
  const col1 = buildLabelBlock(data, COL_OFFSET_1)
  const col2 = buildLabelBlock(data, COL_OFFSET_2)
  const col3 = buildLabelBlock(data, COL_OFFSET_3)

  const zpl = [
    `^XA`,
    `^PW${ROW_W_DOTS}`,
    `^LL${ROW_H_DOTS}`,
    `^MD10`,
    col1,
    col2,
    col3,
    `^XZ`,
  ].join('')

  console.log('[ZPL]', zpl)
  return zpl
}

function generarZPLMultiple(
  labels: ZPLLabelData[],
  copiasPorLabel: number,
): string[] {
  const commands: string[] = []

  for (const label of labels) {
    const rowZpl = generarZPLRow(label)
    for (let c = 0; c < copiasPorLabel; c++) {
      commands.push(rowZpl)
    }
  }

  return commands
}

export { generarZPLRow, generarZPLMultiple }
