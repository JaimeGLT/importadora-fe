import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { MainLayout } from '@/components/layout/MainLayout'
import { PageTopBar } from '@/components/layout/PageTopBar'

const BASE_URL = import.meta.env.VITE_API_URL ?? '/api'

type Estado = 'idle' | 'procesando' | 'listo'

export function FacturaExtractorPage() {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [estado, setEstado] = useState<Estado>('idle')
  const [dragging, setDragging] = useState(false)
  const [nombreDescargado, setNombreDescargado] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  function seleccionarArchivo(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'xlsx' && ext !== 'xls' && ext !== 'pdf') {
      toast.error('Solo se aceptan archivos .xlsx, .xls o .pdf')
      return
    }
    setArchivo(file)
    setEstado('idle')
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) seleccionarArchivo(file)
    e.target.value = ''
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault()
    setDragging(false)
    const file = e.dataTransfer.files[0]
    if (file) seleccionarArchivo(file)
  }

  async function procesar() {
    if (!archivo || estado === 'procesando') return
    setEstado('procesando')

    try {
      const formData = new FormData()
      formData.append('file', archivo)

      const res = await fetch(`${BASE_URL}/factura/extraer`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      })

      if (!res.ok) {
        const text = await res.text().catch(() => '')
        let msg = `Error ${res.status}`
        try {
          const json = JSON.parse(text) as { error?: string }
          if (json.error) msg = json.error
        } catch { /* usar msg por defecto */ }
        throw new Error(msg)
      }

      const blob = await res.blob()
      const nombre = archivo.name.replace(/\.[^.]+$/, '') + '_limpio.xlsx'

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = nombre
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setNombreDescargado(nombre)
      setEstado('listo')
      toast.success(`Descargando ${nombre}`)
    } catch (err) {
      setEstado('idle')
      toast.error(err instanceof Error ? err.message : 'Error al procesar el archivo')
    }
  }

  function limpiar() {
    setArchivo(null)
    setEstado('idle')
    setNombreDescargado('')
  }

  const fmtSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  return (
    <MainLayout>
      <div className="bg-[#F7F7F7] min-h-screen">

        <PageTopBar section="Importaciones" title="Extractor IA" />

        <div className="px-7 py-6 max-w-[1400px] mx-auto">

          {/* Page Header */}
          <div className="flex items-center gap-3.5 mb-8">
            <div
              className="w-12 h-12 bg-gradient-to-br from-[#780e18] to-[#D4A333] rounded-2xl flex items-center justify-center text-white shrink-0"
              style={{ boxShadow: '0 6px 18px rgba(120,14,24,0.28)' }}
            >
              <i className="ti ti-sparkles text-2xl" />
            </div>
            <div>
              <h2
                className="font-semibold text-[30px] text-[#2D2B2A] leading-none"
                style={{ fontFamily: "'DM Sans', sans-serif" }}
              >
                Extractor IA de facturas
              </h2>
              <p className="text-[13.5px] text-[#7A7571] mt-1.5">
                Sube la factura del proveedor y la IA extrae los productos en un archivo limpio
              </p>
            </div>
          </div>

          {/* Contenido — 2 columnas en desktop */}
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-5 items-start max-w-5xl">

            {/* Columna izquierda: zona de trabajo */}
            <div className="space-y-4">

              {/* Drop zone */}
              <div
                onClick={() => estado !== 'procesando' && !archivo && inputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); if (!archivo) setDragging(true) }}
                onDragLeave={() => setDragging(false)}
                onDrop={onDrop}
                className={[
                  'relative flex flex-col items-center justify-center gap-4',
                  'border-2 border-dashed rounded-xl transition-all duration-150 min-h-[260px]',
                  archivo
                    ? 'border-[#B8DCCA] bg-[#FAF5EE] cursor-default'
                    : dragging
                      ? 'border-[#780e18] bg-[#FAF5EE] cursor-copy scale-[1.01]'
                      : 'border-[#D0CBC4] bg-white cursor-pointer hover:border-[#780e18]/50 hover:bg-[#FAF5EE]/60',
                ].join(' ')}
              >
                <input
                  ref={inputRef}
                  type="file"
                  accept=".xlsx,.xls,.pdf"
                  className="hidden"
                  onChange={onInputChange}
                />

                {estado === 'procesando' ? (
                  <ProcessingState />
                ) : estado === 'listo' ? (
                  <SuccessState nombre={nombreDescargado} onNew={limpiar} />
                ) : archivo ? (
                  <FileReadyState archivo={archivo} fmtSize={fmtSize} onQuitar={limpiar} />
                ) : (
                  <EmptyDropState dragging={dragging} />
                )}
              </div>

              {/* Botón procesar */}
              {estado !== 'listo' && (
                <button
                  onClick={() => void procesar()}
                  disabled={!archivo || estado === 'procesando'}
                  className={[
                    'w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[14px] font-semibold transition-all duration-150',
                    !archivo || estado === 'procesando'
                      ? 'bg-[#EDE8E3] text-[#7A7571] cursor-not-allowed'
                      : 'bg-[#D4A333] hover:bg-[#B4881C] text-[#2D2010] shadow-sm active:scale-[0.99]',
                  ].join(' ')}
                >
                  {estado === 'procesando' ? (
                    <>
                      <i className="ti ti-loader-2 animate-spin text-[17px]" />
                      Procesando con IA…
                    </>
                  ) : (
                    <>
                      <i className="ti ti-sparkles text-[17px]" />
                      {archivo ? 'Procesar con IA' : 'Selecciona un archivo para continuar'}
                    </>
                  )}
                </button>
              )}

              {/* Formatos soportados */}
              <div className="flex items-center gap-3 px-1">
                <span className="text-[11px] text-[#7A7571] font-medium">Formatos aceptados:</span>
                {['.xlsx', '.xls', '.pdf'].map((f) => (
                  <span key={f} className="text-[11px] font-semibold text-[#4A4744] bg-[#F5F0EB] border border-[#D0CBC4] px-2 py-0.5 rounded font-mono">
                    {f}
                  </span>
                ))}
              </div>
            </div>

            {/* Columna derecha: info */}
            <div className="space-y-4">

              {/* Cómo funciona */}
              <div className="bg-white rounded-xl border border-[#D0CBC4] p-5">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-7 h-7 rounded-lg bg-[#F5E8D4] flex items-center justify-center shrink-0">
                    <i className="ti ti-info-circle text-[#780e18] text-[14px]" />
                  </div>
                  <p className="text-[12px] font-semibold text-[#2D2B2A] uppercase tracking-[0.1em]">
                    ¿Cómo funciona?
                  </p>
                </div>
                <ol className="space-y-3">
                  {[
                    'Sube el Excel o PDF original del proveedor (cualquier idioma o formato)',
                    'La IA detecta automáticamente los encabezados y filas de productos',
                    'Se genera un Excel limpio con columnas uniformes y precios normalizados',
                    'El archivo se descarga automáticamente a tu equipo',
                  ].map((step, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="w-5 h-5 rounded-full bg-gradient-to-br from-[#780e18] to-[#D4A333] text-white text-[10px] font-semibold flex items-center justify-center shrink-0 mt-0.5">
                        {i + 1}
                      </span>
                      <span className="text-[12.5px] text-[#4A4744] leading-relaxed">{step}</span>
                    </li>
                  ))}
                </ol>
              </div>

            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  )
}

// ─── Estados del drop zone ────────────────────────────────────────────────────

function EmptyDropState({ dragging }: { dragging: boolean }) {
  return (
    <>
      <div className={[
        'w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-150',
        dragging
          ? 'bg-gradient-to-br from-[#780e18] to-[#D4A333] scale-110'
          : 'bg-[#F5F0EB] border border-[#D0CBC4]',
      ].join(' ')}>
        <i className={`ti ti-cloud-upload text-[32px] ${dragging ? 'text-white' : 'text-[#7A7571]'}`} />
      </div>
      <div className="text-center">
        <p className="text-[14px] font-semibold text-[#2D2B2A]">
          {dragging ? 'Suelta el archivo aquí' : 'Arrastra o haz clic para subir'}
        </p>
        <p className="text-[12px] text-[#7A7571] mt-1">Facturas en Excel o PDF de cualquier proveedor</p>
      </div>
    </>
  )
}

function FileReadyState({ archivo, fmtSize, onQuitar }: { archivo: File; fmtSize: (b: number) => string; onQuitar: () => void }) {
  const isPdf = archivo.name.toLowerCase().endsWith('.pdf')
  return (
    <>
      <div className="w-16 h-16 rounded-2xl bg-[#B8DCCA] border border-[#6BAF80] flex items-center justify-center shrink-0">
        <i className={`ti ${isPdf ? 'ti-file-type-pdf' : 'ti-file-spreadsheet'} text-[#1E5C38] text-[32px]`} />
      </div>
      <div className="text-center">
        <p className="text-[14px] font-semibold text-[#2D2B2A] max-w-[260px] truncate">{archivo.name}</p>
        <p className="text-[12px] text-[#7A7571] mt-0.5">{fmtSize(archivo.size)}</p>
      </div>
      <div className="flex items-center gap-1.5 text-[12px] text-[#3F7A52] font-semibold bg-[#B8DCCA] px-3 py-1.5 rounded-full">
        <i className="ti ti-circle-check text-[14px]" />
        Listo para procesar
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onQuitar() }}
        className="text-[11px] text-[#7A7571] hover:text-[#8A1E12] transition-colors font-medium"
      >
        Quitar archivo
      </button>
    </>
  )
}

function ProcessingState() {
  return (
    <>
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#780e18] to-[#D4A333] flex items-center justify-center shrink-0">
        <i className="ti ti-loader-2 text-white text-[32px] animate-spin" />
      </div>
      <div className="text-center">
        <p className="text-[14px] font-semibold text-[#2D2B2A]">Procesando con IA…</p>
        <p className="text-[12px] text-[#7A7571] mt-1">Extrayendo productos del archivo</p>
      </div>
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="w-1.5 h-1.5 rounded-full bg-[#D4A333] animate-bounce"
            style={{ animationDelay: `${i * 0.15}s` }}
          />
        ))}
      </div>
    </>
  )
}

function SuccessState({ nombre, onNew }: { nombre: string; onNew: () => void }) {
  return (
    <>
      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#3F7A52] to-[#6BAF80] flex items-center justify-center shrink-0">
        <i className="ti ti-circle-check text-white text-[32px]" />
      </div>
      <div className="text-center">
        <p className="text-[14px] font-semibold text-[#2D2B2A]">¡Archivo generado!</p>
        <p className="text-[12px] text-[#7A7571] mt-0.5 max-w-[260px] truncate">{nombre}</p>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onNew() }}
        className="px-4 py-2 bg-[#D4A333] hover:bg-[#B4881C] text-[#2D2010] text-[12px] font-semibold rounded-lg transition-colors"
      >
        Procesar otro archivo
      </button>
    </>
  )
}
