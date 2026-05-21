import { useRef, useState } from 'react'
import { toast } from 'sonner'
import { MainLayout, PageContainer, PageHeader } from '@/components/layout/MainLayout'

const BASE_URL =
  import.meta.env.VITE_API_URL ??
  'https://usaautopartesapi20260406085513-amh4fwdnanbpa9gs.centralus-01.azurewebsites.net/api'

type Estado = 'idle' | 'procesando' | 'listo'

export function FacturaExtractorPage() {
  const [archivo, setArchivo] = useState<File | null>(null)
  const [estado, setEstado] = useState<Estado>('idle')
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  function seleccionarArchivo(file: File) {
    const ext = file.name.split('.').pop()?.toLowerCase()
    if (ext !== 'xlsx' && ext !== 'xls') {
      toast.error('Solo se aceptan archivos .xlsx o .xls')
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
      <PageContainer>
        <PageHeader
          title="Extractor IA de facturas"
          description="Subí el Excel del proveedor y la IA extrae los productos en un archivo limpio listo para importar."
        />

        <div className="mt-8 max-w-2xl">
          {/* Zona de drop */}
          <div
            onClick={() => !archivo && inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true) }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={[
              'relative flex flex-col items-center justify-center gap-3',
              'border-2 border-dashed rounded-2xl p-10 transition-colors duration-150',
              archivo
                ? 'border-terra/40 bg-terra/[0.04] cursor-default'
                : dragging
                  ? 'border-terra bg-terra/[0.07] cursor-copy'
                  : 'border-hair bg-white cursor-pointer hover:border-terra/50 hover:bg-terra/[0.03]',
            ].join(' ')}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".xlsx,.xls"
              className="hidden"
              onChange={onInputChange}
            />

            {archivo ? (
              <>
                {/* Icono Excel */}
                <div className="w-14 h-14 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center shrink-0">
                  <svg className="h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-ink truncate max-w-xs">{archivo.name}</p>
                  <p className="text-xs text-steel-400 mt-0.5">{(archivo.size / 1024).toFixed(0)} KB</p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); limpiar() }}
                  className="text-xs text-steel-400 hover:text-red-500 transition-colors mt-1"
                >
                  Quitar archivo
                </button>
              </>
            ) : (
              <>
                <div className="w-14 h-14 rounded-xl bg-stone-100 border border-hair flex items-center justify-center shrink-0">
                  <svg className="h-7 w-7 text-steel-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                </div>
                <div className="text-center">
                  <p className="text-sm font-medium text-ink">
                    {dragging ? 'Soltá el archivo aquí' : 'Arrastrá o hacé click para subir'}
                  </p>
                  <p className="text-xs text-steel-400 mt-0.5">Solo archivos .xlsx o .xls</p>
                </div>
              </>
            )}
          </div>

          {/* Botón procesar */}
          <div className="mt-5 flex items-center gap-3">
            <button
              onClick={() => void procesar()}
              disabled={!archivo || estado === 'procesando'}
              className={[
                'flex items-center gap-2 px-6 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150',
                !archivo || estado === 'procesando'
                  ? 'bg-stone-200 text-steel-400 cursor-not-allowed'
                  : 'bg-terra text-white hover:bg-terra/90 active:scale-[0.98]',
              ].join(' ')}
            >
              {estado === 'procesando' ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Procesando…
                </>
              ) : estado === 'listo' ? (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Procesar otro
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                  </svg>
                  Procesar con IA
                </>
              )}
            </button>

            {estado === 'listo' && (
              <button
                onClick={limpiar}
                className="text-sm text-steel-400 hover:text-ink transition-colors"
              >
                Subir otro archivo
              </button>
            )}
          </div>

          {/* Info */}
          <div className="mt-8 rounded-xl border border-hair bg-white p-5 space-y-2">
            <p className="text-xs font-semibold text-ink uppercase tracking-wide">¿Cómo funciona?</p>
            <ol className="space-y-1.5 text-sm text-steel-500 list-decimal list-inside">
              <li>Subí el Excel original del proveedor (cualquier idioma o formato)</li>
              <li>La IA detecta automáticamente los encabezados y filas de productos</li>
              <li>Se genera un Excel limpio con columnas uniformes y precios normalizados</li>
              <li>El archivo se descarga automáticamente</li>
            </ol>
          </div>
        </div>
      </PageContainer>
    </MainLayout>
  )
}
