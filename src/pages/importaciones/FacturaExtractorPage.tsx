import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { MainLayout } from '@/components/layout/MainLayout'

const BASE_URL =
  import.meta.env.VITE_API_URL ??
  'https://importadora-usa-grbkc0bah9adbher.chilecentral-01.azurewebsites.net/api'

type Estado = 'idle' | 'procesando' | 'listo'

export function FacturaExtractorPage() {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [estado, setEstado] = useState<Estado>('idle')
  const [dragging, setDragging] = useState(false)
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
      const nombreSalida = archivo.name.replace(/\.[^.]+$/, '') + '_limpio.xlsx'

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = nombreSalida
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)

      setEstado('listo')
      toast.success(`Descargando ${nombreSalida}`)
    } catch (err) {
      setEstado('idle')
      toast.error(err instanceof Error ? err.message : 'Error al procesar el archivo')
    }
  }

  function limpiar() {
    setArchivo(null)
    setEstado('idle')
  }

  return (
    <MainLayout>
      <div className="bg-[#f1f5f9] min-h-screen">

        {/* TopBar */}
        <header className="bg-[#f1f5f9] sticky top-0 z-40 flex justify-between items-center w-full h-[62px] px-7 border-b border-[#e2e8f0]">
          <div className="flex items-center gap-2 text-sm text-[#9996b0] font-semibold">
            <span>Importaciones</span>
            <span className="text-[10px] opacity-40">/</span>
            <strong className="text-[#1e1b2e] font-bold">Extractor IA</strong>
          </div>
          <div className="flex items-center gap-1.5">
            <button className="w-[38px] h-[38px] flex items-center justify-center rounded-xl bg-white border-[1.5px] border-[#e2e8f0] text-[#5a5670] hover:bg-[#f1f5f9] transition-colors">
              <i className="ti ti-bell text-[18px]" />
            </button>
            <button className="w-[38px] h-[38px] flex items-center justify-center rounded-xl bg-white border-[1.5px] border-[#e2e8f0] text-[#5a5670] hover:bg-[#f1f5f9] transition-colors">
              <i className="ti ti-settings text-[18px]" />
            </button>
          </div>
        </header>

        <div className="px-7 py-6 max-w-[1400px] mx-auto">

          {/* Page Header */}
          <div className="flex items-center gap-3.5 mb-8">
            <div
              className="w-12 h-12 bg-gradient-to-br from-[#7c3aed] to-[#ea580c] rounded-2xl flex items-center justify-center text-white shrink-0"
              style={{ boxShadow: '0 6px 18px rgba(124,58,237,0.28)' }}
            >
              <i className="ti ti-sparkles text-2xl" />
            </div>
            <div>
              <h2 className="font-black text-[34px] text-[#1e1b2e] leading-none" style={{ fontFamily: 'Nunito, sans-serif' }}>
                Extractor IA de facturas
              </h2>
              <p className="text-sm text-[#9996b0] font-semibold mt-0.5">
                Subí la factura del proveedor y la IA extrae los productos en un archivo limpio
              </p>
            </div>
          </div>

          <div className="max-w-2xl">

            {/* Drop zone */}
            <div
              onClick={() => !archivo && inputRef.current?.click()}
              onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
              onDragLeave={() => setDragging(false)}
              onDrop={onDrop}
              className={[
                'relative flex flex-col items-center justify-center gap-3',
                'border-2 border-dashed rounded-2xl p-10 transition-all duration-150',
                archivo
                  ? 'border-[#1d4ed8]/30 bg-[#dbeafe]/20 cursor-default'
                  : dragging
                    ? 'border-[#1d4ed8] bg-[#dbeafe]/30 cursor-copy'
                    : 'border-[#e2e8f0] bg-white cursor-pointer hover:border-[#1d4ed8]/40 hover:bg-[#dbeafe]/10',
              ].join(' ')}
            >
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls,.pdf"
                className="hidden"
                onChange={onInputChange}
              />

              {archivo ? (
                <>
                  <div className="w-14 h-14 rounded-xl bg-[#d1fae5] border-[1.5px] border-[#6ee7b7] flex items-center justify-center shrink-0">
                    <i className="ti ti-file-spreadsheet text-[#059669] text-3xl" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-[#1e1b2e] truncate max-w-xs">{archivo.name}</p>
                    <p className="text-xs text-[#9996b0] font-semibold mt-0.5">{(archivo.size / 1024).toFixed(0)} KB</p>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); limpiar() }}
                    className="text-xs text-[#9996b0] font-semibold hover:text-[#dc2626] transition-colors mt-1"
                  >
                    Quitar archivo
                  </button>
                </>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-xl bg-[#f1f5f9] border-[1.5px] border-[#e2e8f0] flex items-center justify-center shrink-0">
                    <i className="ti ti-cloud-upload text-[#9996b0] text-3xl" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-bold text-[#1e1b2e]">
                      {dragging ? 'Soltá el archivo aquí' : 'Arrastrá o hacé click para subir'}
                    </p>
                    <p className="text-xs text-[#9996b0] font-semibold mt-0.5">Archivos .xlsx, .xls o .pdf</p>
                  </div>
                </>
              )}
            </div>

            {/* Action button */}
            <div className="mt-5 flex items-center gap-3">
              <button
                onClick={() => void procesar()}
                disabled={!archivo || estado === 'procesando'}
                className={[
                  'flex items-center gap-2 px-[18px] py-2.5 rounded-xl text-sm font-bold transition-all duration-150',
                  !archivo || estado === 'procesando'
                    ? 'bg-[#e2e8f0] text-[#9996b0] cursor-not-allowed'
                    : 'bg-[#1d4ed8] hover:bg-[#1e40af] text-white shadow-md active:scale-95',
                ].join(' ')}
              >
                {estado === 'procesando' ? (
                  <>
                    <i className="ti ti-loader-2 animate-spin text-[17px]" />
                    Procesando…
                  </>
                ) : estado === 'listo' ? (
                  <>
                    <i className="ti ti-circle-check text-[17px]" />
                    Procesar otro
                  </>
                ) : (
                  <>
                    <i className="ti ti-sparkles text-[17px]" />
                    Procesar con IA
                  </>
                )}
              </button>

              {estado === 'listo' && (
                <button
                  onClick={limpiar}
                  className="text-sm text-[#9996b0] font-semibold hover:text-[#1e1b2e] transition-colors"
                >
                  Subir otro archivo
                </button>
              )}
            </div>

            {/* Info card */}
            <div className="mt-8 bg-white rounded-2xl border-[1.5px] border-[#e2e8f0] p-5">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-7 h-7 rounded-lg bg-[#dbeafe] flex items-center justify-center">
                  <i className="ti ti-info-circle text-[#1d4ed8] text-[14px]" />
                </div>
                <p className="text-xs font-black text-[#1e1b2e] uppercase tracking-wide" style={{ fontFamily: 'Nunito, sans-serif' }}>
                  ¿Cómo funciona?
                </p>
              </div>
              <ol className="space-y-2.5">
                {[
                  'Subí el Excel o PDF original del proveedor (cualquier idioma o formato)',
                  'La IA detecta automáticamente los encabezados y filas de productos',
                  'Se genera un Excel limpio con columnas uniformes y precios normalizados',
                  'El archivo se descarga automáticamente',
                ].map((step, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <span className="w-5 h-5 rounded-full bg-[#1d4ed8] text-white text-[11px] font-black flex items-center justify-center shrink-0 mt-0.5">
                      {i + 1}
                    </span>
                    <span className="text-sm text-[#5a5670] font-medium">{step}</span>
                  </li>
                ))}
              </ol>
            </div>

          </div>
        </div>
      </div>
    </MainLayout>
  )
}
