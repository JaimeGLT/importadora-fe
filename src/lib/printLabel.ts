import type JsBarcodeType from 'jsbarcode'
import { jsPDF } from 'jspdf'
import { generarZPLMultiple, type ZPLLabelData } from './zplCommands'
import { printZPL } from './qzTray'

export interface LabelData {
  codigo_universal: string
  nombre: string
  marca: string
  vehiculo: string
  precio_venta: number
  unidad: string
  creado_en?: string
  fecha_importacion?: string
}

const EMPRESA_NOMBRE = 'USAImportadora'

const MM_TO_PT = 2.83465

function mmToPt(mm: number): number {
  return mm * MM_TO_PT
}

function formatearFecha(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  const day = String(d.getDate()).padStart(2, '0')
  const month = String(d.getMonth() + 1).padStart(2, '0')
  const year = d.getFullYear()
  return `${day}/${month}/${year}`
}

async function generarBarcodePNG(value: string): Promise<string> {
  const mod = await import('jsbarcode')
  const JsBarcode = mod.default as typeof JsBarcodeType

  const svgEl = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  svgEl.setAttribute('width', '300')
  svgEl.setAttribute('height', '72')

  try {
    JsBarcode(svgEl, value, {
      format:       'CODE128',
      width:        2,
      height:       40,
      fontSize:     10,
      displayValue: true,
      margin:       4,
      background:   '#ffffff',
      lineColor:    '#000000',
      font:         'Arial, sans-serif',
      textMargin:   3,
    })
    // Set viewBox so the SVG scales correctly when loaded as an image
    const svgW = parseFloat(svgEl.getAttribute('width') || '300')
    const svgH = parseFloat(svgEl.getAttribute('height') || '72')
    svgEl.setAttribute('viewBox', `0 0 ${svgW} ${svgH}`)
    svgEl.setAttribute('width', '300')
    svgEl.setAttribute('height', '72')
  } catch {
    return ''
  }

  const serializer = new XMLSerializer()
  const svgStr = serializer.serializeToString(svgEl)
  const blob = new Blob([svgStr], { type: 'image/svg+xml' })
  const svgUrl = URL.createObjectURL(blob)

  return new Promise<string>((resolve) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 300
      canvas.height = 72
      const ctx = canvas.getContext('2d')
      if (!ctx) {
        URL.revokeObjectURL(svgUrl)
        resolve('')
        return
      }
      ctx.drawImage(img, 0, 0, 300, 72)
      URL.revokeObjectURL(svgUrl)
      resolve(canvas.toDataURL('image/png'))
    }
    img.onerror = () => {
      URL.revokeObjectURL(svgUrl)
      resolve('')
    }
    img.src = svgUrl
  })
}

async function generarPDF(
  items: { producto: LabelData; copias: number }[],
): Promise<Blob> {
  // One page per label (30mm × 20mm). Thermal driver configured for individual
  // label size prints one label per page without browser/driver scaling issues.
  const LABEL_W_MM = 30
  const LABEL_H_MM = 20
  const LABEL_W_PT = mmToPt(LABEL_W_MM)
  const LABEL_H_PT = mmToPt(LABEL_H_MM)

  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: [LABEL_W_PT, LABEL_H_PT],
  })

  const xCenter = mmToPt(LABEL_W_MM / 2)
  let firstPage = true

  for (const item of items) {
    const pngBase64 = await generarBarcodePNG(item.producto.codigo_universal)

    const fechaFormateada = item.producto.fecha_importacion
      ? formatearFecha(item.producto.fecha_importacion)
      : item.producto.creado_en
      ? formatearFecha(item.producto.creado_en)
      : ''

    for (let c = 0; c < item.copias; c++) {
      if (firstPage) {
        firstPage = false
      } else {
        pdf.addPage([LABEL_W_PT, LABEL_H_PT])
      }

      pdf.setFontSize(5)
      pdf.setFont('helvetica', 'bold')
      pdf.text(EMPRESA_NOMBRE, xCenter, mmToPt(1.8), { align: 'center' })

      if (pngBase64) {
        const barcodeW = mmToPt(LABEL_W_MM - 2)
        const barcodeH = mmToPt(12)
        try {
          pdf.addImage(pngBase64, 'PNG', mmToPt(1), mmToPt(3.5), barcodeW, barcodeH)
        } catch { /* skip if image fails */ }
      }

      pdf.setFontSize(4.5)
      pdf.setFont('courier', 'bold')
      pdf.text(item.producto.codigo_universal, xCenter, mmToPt(17.2), { align: 'center' })

      if (fechaFormateada) {
        pdf.setFontSize(3.5)
        pdf.setFont('helvetica', 'normal')
        pdf.text(fechaFormateada, xCenter, mmToPt(19), { align: 'center' })
      }
    }
  }

  return pdf.output('blob')
}

export interface PrintResult {
  success: boolean
  method: 'zpl' | 'pdf'
  error?: string
}

export async function imprimirLoteZPL(
  items: { producto: LabelData; copias: number }[],
  printerName: string,
): Promise<PrintResult> {
  if (items.length === 0) return { success: false, method: 'zpl', error: 'No items to print' }

  const zplCommands: string[] = []

  for (const item of items) {
    const zplData: ZPLLabelData = { ...item.producto }
    const labelCommands = generarZPLMultiple([zplData], item.copias)
    zplCommands.push(...labelCommands)
  }

  const result = await printZPL(printerName, zplCommands)
  return {
    success: result.success,
    method: 'zpl',
    error: result.error,
  }
}

export async function imprimirLote(
  items: { producto: LabelData; copias: number }[],
): Promise<void> {
  if (items.length === 0) return

  const blob = await generarPDF(items)
  const url = URL.createObjectURL(blob)
  const win = window.open(url, '_blank')
  if (!win) {
    const a = document.createElement('a')
    a.href = url
    a.download = 'etiquetas.pdf'
    a.click()
  }
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}

export { connectQZTray } from './qzTray'