import { useEffect, useRef, useState } from 'react'
import type JsBarcodeType from 'jsbarcode'
import { Modal, Button } from '@/components/ui'
import { imprimirLote } from '@/lib/printLabel'
import type { Producto } from '@/types'

interface EtiquetaModalProps {
  open: boolean
  onClose: () => void
  producto: Producto | null
}

export function EtiquetaModal({ open, onClose, producto }: EtiquetaModalProps) {
  const svgPreviewRef = useRef<SVGSVGElement>(null)
  const [copias, setCopias] = useState(1)
  const [printing, setPrinting] = useState(false)

  useEffect(() => {
    if (!open || !producto) return

    import('jsbarcode').then((mod) => {
      const JsBarcode = mod.default as typeof JsBarcodeType
      if (svgPreviewRef.current) {
        try {
          JsBarcode(svgPreviewRef.current, producto.codigo_universal, {
            format: 'CODE128',
            width: 2,
            height: 60,
            fontSize: 12,
            displayValue: true,
            margin: 8,
            background: '#ffffff',
            lineColor: '#000000',
            font: 'Inter, system-ui, sans-serif',
            textMargin: 4,
          })
        } catch { /* código inválido */ }
      }
    }).catch(() => null)
  }, [open, producto])

  const handlePrint = async () => {
    if (!producto) return
    setPrinting(true)
    await imprimirLote([{ producto, copias }])
    setPrinting(false)
  }

  if (!producto) return null

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Etiqueta y código de barras"
      size="sm"
      footer={
        <>
          <Button variant="secondary" onClick={onClose}>Cerrar</Button>
          <Button
            onClick={() => void handlePrint()}
            loading={printing}
            icon={
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
            }
          >
            Imprimir {copias > 1 ? `${copias} copias` : 'etiqueta'}
          </Button>
        </>
      }
    >
      {/* Preview — mismo layout que la etiqueta real impresa */}
      <div className="bg-steel-100 rounded-lg p-5 flex flex-col items-center gap-2 mb-4">
        <p className="text-xs text-steel-400 mb-1">Vista previa (62 × 38 mm)</p>

        {/* Etiqueta simulada */}
        <div className="bg-white border border-steel-300 w-[234px] h-[144px] px-2.5 pt-2 pb-1.5 flex flex-col justify-between items-center shadow-sm">
          {/* Nombre */}
          <p className="text-[12px] font-bold text-black leading-tight text-center line-clamp-2 w-full">
            {producto.nombre}
          </p>

          {/* Código de barras (incluye el código bajo las barras) */}
          <div className="w-full flex justify-center">
            <svg ref={svgPreviewRef} className="w-full" />
          </div>

          {/* Precio */}
          <p className="text-[15px] font-bold text-black text-center w-full">
            Bs {producto.precio_venta.toFixed(2)}
          </p>
        </div>

        <p className="text-[10px] text-steel-400 text-center">
          El código <span className="font-mono">{producto.codigo_universal}</span> aparece bajo las barras
        </p>
      </div>

      {/* Copias */}
      <div className="flex items-center justify-between px-1">
        <span className="text-sm text-steel-600 font-medium">Cantidad de etiquetas</span>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setCopias((c) => Math.max(1, c - 1))}
            className="h-8 w-8 rounded-lg border border-steel-200 flex items-center justify-center text-steel-600 hover:bg-steel-50 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
            </svg>
          </button>
          <span className="w-8 text-center font-semibold text-steel-900 text-sm tabular-nums">{copias}</span>
          <button
            onClick={() => setCopias((c) => Math.min(100, c + 1))}
            className="h-8 w-8 rounded-lg border border-steel-200 flex items-center justify-center text-steel-600 hover:bg-steel-50 transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>
      <p className="mt-3 text-xs text-steel-400 text-center">
        Formato 62 × 38 mm · Optimizado para impresoras térmicas
      </p>
    </Modal>
  )
}
