import { useEffect, useMemo, useState } from 'react'
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  type SortingState,
  type ColumnMeta,
} from '@tanstack/react-table'
import { MainLayout } from '@/components/layout/MainLayout'
import { ConfirmModal, TablePagination, WarmStockBadge, WarmMetric } from '@/components/ui'
import type { Producto, ItemPrestamo, Prestamo } from '@/types'
import { notify } from '@/lib/notify'
import { ProductoModal } from './ProductoModal'
import { ImportarExcelModal, type ImportResult } from './ImportarExcelModal'
import { EtiquetaModal } from './EtiquetaModal'
import { NuevoPrestamoModal } from './NuevoPrestamoModal'
import { usePrestamosStore } from '@/stores/prestamosStore'
import { useAuth } from '@/contexts/AuthContext'
import { gql } from '@/lib/graphql'
import { MOCK_PRODUCTOS } from '@/mock/inventario'
import {
  PRODUCTOS_QUERY,
  PRODUCTO_BY_ID_QUERY,
  backendToProducto,
  backendToProductoSimple,
  productoToBackend,
  productoToBackendUpdate,
  productoToBackendBulk,
  type ProductoAPI,
} from '@/lib/queries/inventario.queries'
import { api } from '@/lib/api'
import { clsx } from 'clsx'

declare module '@tanstack/react-table' {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData, TValue> {
    align?: 'left' | 'center' | 'right'
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type StockFilter = 'all' | 'ok' | 'warn' | 'crit'

// ─── Icons ────────────────────────────────────────────────────────────────────

function IcoCal() {
  return (
    <svg className="w-[15px] h-[15px] text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>
    </svg>
  )
}
function IcoBell() {
  return (
    <svg className="h-[17px] w-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/>
    </svg>
  )
}
function IcoSettings() {
  return (
    <svg className="h-[17px] w-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33h0a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51h0a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>
    </svg>
  )
}
function IcoDownload() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>
    </svg>
  )
}
function IcoPlus() {
  return (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  )
}
function IcoSearch() {
  return (
    <svg className="h-4 w-4 text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>
    </svg>
  )
}
function IcoBox() {
  return (
    <svg className="h-[17px] w-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 8 12 3 3 8v8l9 5 9-5z"/><path d="M3 8l9 5 9-5"/>
    </svg>
  )
}
function IcoAlert() {
  return (
    <svg className="h-[17px] w-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>
    </svg>
  )
}
function IcoVault() {
  return (
    <svg className="h-[17px] w-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="12" r="4"/><path d="M12 3v3M12 18v3M3 12h3M18 12h3"/>
    </svg>
  )
}
function IcoUnits() {
  return (
    <svg className="h-[17px] w-[17px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.7} strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4"/>
    </svg>
  )
}

// ─── Product thumbnail ────────────────────────────────────────────────────────

function ProductThumb({ src, nombre }: { src?: string; nombre: string }) {
  const [err, setErr] = useState(false)
  if (src && !err) {
    return (
      <img
        src={src} alt={nombre} onError={() => setErr(true)}
        className="h-[38px] w-[38px] rounded-lg object-cover border border-hair shrink-0"
      />
    )
  }
  return (
    <div className="h-[38px] w-[38px] rounded-lg bg-cream-2 border border-hair flex items-center justify-center shrink-0 relative overflow-hidden">
      <div className="absolute inset-0" style={{ background: 'repeating-linear-gradient(45deg, transparent 0 6px, rgba(36,30,24,0.04) 6px 7px)' }} />
      <svg className="h-[18px] w-[18px] text-ink-2 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
      </svg>
    </div>
  )
}

// ─── Action buttons ───────────────────────────────────────────────────────────

type ActionIcon = 'prestamo' | 'etiqueta' | 'editar' | 'eliminar'
const ACTION_ICONS: Record<ActionIcon, React.ReactNode> = {
  prestamo: <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>,
  etiqueta: <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" /></svg>,
  editar:   <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>,
  eliminar: <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>,
}

function ActionBtn({ icon, onClick, disabled, danger, title }: {
  icon: ActionIcon; onClick: () => void; disabled?: boolean; danger?: boolean; title: string
}) {
  return (
    <button onClick={onClick} disabled={disabled} title={title}
      className={clsx('p-[7px] rounded-lg transition-colors duration-120',
        disabled ? 'text-hair-2 cursor-not-allowed'
        : danger  ? 'text-muted hover:text-terra hover:bg-terra-soft'
        :           'text-muted hover:text-ink hover:bg-cream-2',
      )}>
      {ACTION_ICONS[icon]}
    </button>
  )
}

// ─── Sort icon ────────────────────────────────────────────────────────────────

function SortIcon({ direction }: { direction: false | 'asc' | 'desc' }) {
  if (!direction) return (
    <svg className="h-3 w-3 text-muted-2 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
    </svg>
  )
  return direction === 'asc' ? (
    <svg className="h-3 w-3 text-terra shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
    </svg>
  ) : (
    <svg className="h-3 w-3 text-terra shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}

// ─── Table skeleton ───────────────────────────────────────────────────────────

function TableSkeleton() {
  return (
    <div className="divide-y divide-hair">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="flex items-center gap-4 px-[22px] py-3.5 animate-pulse">
          <div className="h-[38px] w-[38px] rounded-lg bg-cream-2 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-[13px] w-28 rounded bg-cream-2" />
            <div className="h-3 w-40 rounded bg-hair" />
          </div>
          <div className="h-3 w-20 rounded bg-cream-2" />
          <div className="h-6 w-20 rounded-full bg-cream-2" />
          <div className="h-3 w-20 rounded bg-cream-2" />
          <div className="h-3 w-16 rounded bg-hair" />
          <div className="flex gap-1">
            {[0,1,2,3].map(j => <div key={j} className="h-7 w-7 rounded-lg bg-cream-2" />)}
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onNew, searching }: { onNew: () => void; searching: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-[60px] px-5 text-center text-muted">
      <div className="h-[38px] w-[38px] rounded-lg bg-cream-2 border border-hair flex items-center justify-center mb-4">
        <svg className="h-5 w-5 text-muted-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
        </svg>
      </div>
      <p className="text-sm font-medium text-ink-2 mb-1">{searching ? 'Sin resultados' : 'Sin productos'}</p>
      <p className="text-xs text-muted max-w-xs mb-5">
        {searching
          ? 'No hay productos que coincidan con esta búsqueda o filtro.'
          : 'Agrega tu primer producto o importa desde Excel.'}
      </p>
      {!searching && (
        <button onClick={onNew}
          className="h-[38px] px-4 rounded-[10px] bg-terra text-white text-sm font-semibold flex items-center gap-2 hover:bg-terra-deep transition-colors">
          <IcoPlus /> Nuevo producto
        </button>
      )}
    </div>
  )
}

// ─── Autoparts watermark ──────────────────────────────────────────────────────

function AutopartsWatermark() {
  return (
    <div className="absolute inset-0 pointer-events-none z-0 overflow-hidden" style={{ opacity: 0.05, mixBlendMode: 'multiply' }}>
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1600 3800" preserveAspectRatio="xMidYMid meet"
           style={{ width: '100%', height: 'auto', display: 'block' }}>
        <g fill="#241E18">
          {/* Car 1 */}
          <g transform="translate(60,240)">
            <path d="M0 90 L0 60 Q0 50 10 50 L120 50 L142 18 Q148 8 160 8 L260 8 Q272 8 280 16 L322 50 L390 50 Q408 50 414 64 L420 90 Z"/>
            <path d="M168 22 L172 46 L218 46 L218 22 Z M226 22 L226 46 L278 46 L266 26 Q262 22 256 22 Z" fill="#FAF8F5"/>
            <circle cx="90" cy="94" r="24"/>
            <circle cx="340" cy="94" r="24"/>
            <circle cx="90" cy="94" r="12" fill="#FAF8F5"/>
            <circle cx="340" cy="94" r="12" fill="#FAF8F5"/>
          </g>
          {/* Hex bolt */}
          <g transform="translate(1380,80)">
            <path d="M40 2 L74 22 L74 60 L40 80 L6 60 L6 22 Z"/>
            <circle cx="40" cy="41" r="12" fill="#FAF8F5"/>
          </g>
          {/* Wrench/bolt standing */}
          <g transform="translate(820,80) rotate(-8)">
            <rect x="8" y="0" width="12" height="10"/>
            <rect x="2" y="10" width="24" height="8"/>
            <rect x="4" y="18" width="20" height="32"/>
            <path d="M4 50 L24 50 L21 88 L7 88 Z"/>
            <rect x="10" y="88" width="8" height="22"/>
          </g>
          {/* Cone */}
          <g transform="translate(1180,220) rotate(28)">
            <rect x="0" y="0" width="14" height="10"/>
            <path d="M2 10 L12 10 L7 70 Z"/>
          </g>
          {/* Hex bolt 2 */}
          <g transform="translate(540,480) rotate(12)">
            <path d="M40 2 L74 22 L74 60 L40 80 L6 60 L6 22 Z"/>
            <circle cx="40" cy="41" r="12" fill="#FAF8F5"/>
          </g>
          {/* Gear */}
          <g transform="translate(1280,460) rotate(-10)">
            <circle cx="70" cy="70" r="52"/>
            <rect x="66" y="0" width="8" height="18"/>
            <rect x="66" y="122" width="8" height="18"/>
            <rect x="0" y="66" width="18" height="8"/>
            <rect x="122" y="66" width="18" height="8"/>
            <rect x="28" y="12" width="8" height="18" transform="rotate(-45 32 21)"/>
            <rect x="104" y="12" width="8" height="18" transform="rotate(45 108 21)"/>
            <rect x="28" y="110" width="8" height="18" transform="rotate(45 32 119)"/>
            <rect x="104" y="110" width="8" height="18" transform="rotate(-45 108 119)"/>
            <circle cx="70" cy="70" r="28" fill="#FAF8F5"/>
            <circle cx="70" cy="70" r="8"/>
          </g>
          {/* Wheel */}
          <g transform="translate(220,660)">
            <circle cx="70" cy="70" r="66"/>
            <circle cx="70" cy="70" r="42" fill="#FAF8F5"/>
            <circle cx="70" cy="70" r="12"/>
            <circle cx="70" cy="28" r="5" fill="#FAF8F5"/>
            <circle cx="70" cy="112" r="5" fill="#FAF8F5"/>
            <circle cx="28" cy="70" r="5" fill="#FAF8F5"/>
            <circle cx="112" cy="70" r="5" fill="#FAF8F5"/>
            <circle cx="100" cy="40" r="5" fill="#FAF8F5"/>
            <circle cx="40" cy="100" r="5" fill="#FAF8F5"/>
            <circle cx="40" cy="40" r="5" fill="#FAF8F5"/>
            <circle cx="100" cy="100" r="5" fill="#FAF8F5"/>
          </g>
          {/* Truck */}
          <g transform="translate(900,820)">
            <path d="M0 60 L0 40 Q0 32 8 30 L40 22 Q60 4 100 0 L240 0 Q300 4 340 30 L380 38 Q400 40 410 50 L420 60 L420 80 L0 80 Z"/>
            <path d="M70 22 Q90 8 120 6 L180 6 L180 28 L66 28 Z M196 6 L260 6 Q300 10 326 28 L196 28 Z" fill="#FAF8F5"/>
            <circle cx="90" cy="84" r="28"/>
            <circle cx="330" cy="84" r="28"/>
            <circle cx="90" cy="84" r="14" fill="#FAF8F5"/>
            <circle cx="330" cy="84" r="14" fill="#FAF8F5"/>
          </g>
          {/* Cone 2 */}
          <g transform="translate(1480,940) rotate(25)">
            <rect x="0" y="0" width="14" height="10"/>
            <path d="M2 10 L12 10 L7 70 Z"/>
          </g>
          {/* Spring/coil */}
          <g transform="translate(180,980) rotate(10)">
            <rect x="0" y="0" width="60" height="30"/>
            <rect x="4" y="32" width="52" height="3" fill="#FAF8F5"/>
            <rect x="4" y="38" width="52" height="3" fill="#FAF8F5"/>
            <rect x="4" y="44" width="52" height="3" fill="#FAF8F5"/>
            <path d="M12 50 L20 100 L40 100 L48 50 Z"/>
          </g>
          {/* Bolt standing 2 */}
          <g transform="translate(700,1140) rotate(18)">
            <rect x="8" y="0" width="12" height="10"/>
            <rect x="2" y="10" width="24" height="8"/>
            <rect x="4" y="18" width="20" height="32"/>
            <path d="M4 50 L24 50 L21 88 L7 88 Z"/>
            <rect x="10" y="88" width="8" height="22"/>
          </g>
          {/* Wheel 2 */}
          <g transform="translate(1340,1240)">
            <circle cx="70" cy="70" r="66"/>
            <circle cx="70" cy="70" r="42" fill="#FAF8F5"/>
            <circle cx="70" cy="70" r="12"/>
            <circle cx="70" cy="28" r="5" fill="#FAF8F5"/>
            <circle cx="70" cy="112" r="5" fill="#FAF8F5"/>
            <circle cx="28" cy="70" r="5" fill="#FAF8F5"/>
            <circle cx="112" cy="70" r="5" fill="#FAF8F5"/>
            <circle cx="100" cy="40" r="5" fill="#FAF8F5"/>
            <circle cx="40" cy="100" r="5" fill="#FAF8F5"/>
            <circle cx="40" cy="40" r="5" fill="#FAF8F5"/>
            <circle cx="100" cy="100" r="5" fill="#FAF8F5"/>
          </g>
          {/* Small car */}
          <g transform="translate(520,1340)">
            <path d="M0 70 L0 52 Q0 44 8 42 L60 32 Q92 8 140 4 L240 4 Q280 10 310 34 L360 42 Q372 44 372 52 L372 70 Z"/>
            <path d="M70 28 Q92 12 130 10 L180 10 L180 34 L66 34 Z M192 10 L240 10 Q280 16 310 34 L192 34 Z" fill="#FAF8F5"/>
            <circle cx="80" cy="74" r="24"/>
            <circle cx="292" cy="74" r="24"/>
            <circle cx="80" cy="74" r="12" fill="#FAF8F5"/>
            <circle cx="292" cy="74" r="12" fill="#FAF8F5"/>
          </g>
          {/* Steering wheel */}
          <g transform="translate(180,1500) rotate(-8)">
            <circle cx="80" cy="80" r="80"/>
            <circle cx="80" cy="80" r="44" fill="#FAF8F5"/>
            <circle cx="80" cy="80" r="14"/>
            <rect x="76" y="4" width="8" height="32" rx="2" fill="#FAF8F5"/>
            <rect x="76" y="124" width="8" height="32" rx="2" fill="#FAF8F5"/>
            <rect x="4" y="76" width="32" height="8" rx="2" fill="#FAF8F5"/>
            <rect x="124" y="76" width="32" height="8" rx="2" fill="#FAF8F5"/>
          </g>
          {/* Hex bolt 3 */}
          <g transform="translate(1040,1480) rotate(-20)">
            <path d="M40 2 L74 22 L74 60 L40 80 L6 60 L6 22 Z"/>
            <circle cx="40" cy="41" r="12" fill="#FAF8F5"/>
          </g>
          {/* Cone 3 */}
          <g transform="translate(420,1700) rotate(30)">
            <rect x="0" y="0" width="14" height="10"/>
            <path d="M2 10 L12 10 L7 70 Z"/>
          </g>
          {/* Gear 2 */}
          <g transform="translate(940,1700)">
            <circle cx="70" cy="70" r="52"/>
            <rect x="66" y="0" width="8" height="18"/>
            <rect x="66" y="122" width="8" height="18"/>
            <rect x="0" y="66" width="18" height="8"/>
            <rect x="122" y="66" width="18" height="8"/>
            <rect x="28" y="12" width="8" height="18" transform="rotate(-45 32 21)"/>
            <rect x="104" y="12" width="8" height="18" transform="rotate(45 108 21)"/>
            <rect x="28" y="110" width="8" height="18" transform="rotate(45 32 119)"/>
            <rect x="104" y="110" width="8" height="18" transform="rotate(-45 108 119)"/>
            <circle cx="70" cy="70" r="28" fill="#FAF8F5"/>
            <circle cx="70" cy="70" r="8"/>
          </g>
          {/* Connector/hose */}
          <g transform="translate(540,1820) rotate(15)">
            <path d="M0 18 Q0 0 18 0 L40 0 Q58 0 58 18 L58 28 L120 28 L120 8 L160 8 L160 48 L120 48 L120 28 L58 28 L58 38 Q58 56 40 56 L18 56 Q0 56 0 38 Z"/>
          </g>
          {/* Large truck 2 */}
          <g transform="translate(1080,1980)">
            <path d="M0 80 L0 50 Q0 40 12 40 L150 40 L180 -10 Q188 -28 210 -28 L380 -28 Q398 -28 410 -16 L470 40 L590 40 Q620 40 630 60 L640 80 Z"/>
            <path d="M220 -8 L230 36 L308 36 L308 -8 Z M318 -8 L318 36 L398 36 L380 -2 Q375 -8 365 -8 Z" fill="#FAF8F5"/>
            <circle cx="110" cy="88" r="38"/>
            <circle cx="510" cy="88" r="38"/>
            <circle cx="110" cy="88" r="18" fill="#FAF8F5"/>
            <circle cx="510" cy="88" r="18" fill="#FAF8F5"/>
            <rect x="438" y="52" width="26" height="8" rx="2"/>
          </g>
          {/* Bolt standing 3 */}
          <g transform="translate(60,2080) rotate(90)">
            <rect x="8" y="0" width="12" height="10"/>
            <rect x="2" y="10" width="24" height="8"/>
            <rect x="4" y="18" width="20" height="32"/>
            <path d="M4 50 L24 50 L21 88 L7 88 Z"/>
            <rect x="10" y="88" width="8" height="22"/>
          </g>
          {/* Hex bolt 4 */}
          <g transform="translate(800,2200) rotate(-12)">
            <path d="M40 2 L74 22 L74 60 L40 80 L6 60 L6 22 Z"/>
            <circle cx="40" cy="41" r="12" fill="#FAF8F5"/>
          </g>
          {/* Cone 4 */}
          <g transform="translate(280,2240) rotate(45)">
            <rect x="0" y="0" width="14" height="10"/>
            <path d="M2 10 L12 10 L7 70 Z"/>
          </g>
          {/* Car 3 */}
          <g transform="translate(440,2480)">
            <path d="M0 90 L0 60 Q0 50 10 50 L120 50 L142 18 Q148 8 160 8 L260 8 Q272 8 280 16 L322 50 L390 50 Q408 50 414 64 L420 90 Z"/>
            <path d="M168 22 L172 46 L218 46 L218 22 Z M226 22 L226 46 L278 46 L266 26 Q262 22 256 22 Z" fill="#FAF8F5"/>
            <circle cx="90" cy="94" r="24"/>
            <circle cx="340" cy="94" r="24"/>
            <circle cx="90" cy="94" r="12" fill="#FAF8F5"/>
            <circle cx="340" cy="94" r="12" fill="#FAF8F5"/>
          </g>
          {/* Gear 3 */}
          <g transform="translate(100,2620) rotate(20)">
            <circle cx="70" cy="70" r="52"/>
            <rect x="66" y="0" width="8" height="18"/>
            <rect x="66" y="122" width="8" height="18"/>
            <rect x="0" y="66" width="18" height="8"/>
            <rect x="122" y="66" width="18" height="8"/>
            <rect x="28" y="12" width="8" height="18" transform="rotate(-45 32 21)"/>
            <rect x="104" y="12" width="8" height="18" transform="rotate(45 108 21)"/>
            <rect x="28" y="110" width="8" height="18" transform="rotate(45 32 119)"/>
            <rect x="104" y="110" width="8" height="18" transform="rotate(-45 108 119)"/>
            <circle cx="70" cy="70" r="28" fill="#FAF8F5"/>
            <circle cx="70" cy="70" r="8"/>
          </g>
          {/* Hex bolt 5 */}
          <g transform="translate(1340,2560) rotate(33)">
            <path d="M40 2 L74 22 L74 60 L40 80 L6 60 L6 22 Z"/>
            <circle cx="40" cy="41" r="12" fill="#FAF8F5"/>
          </g>
          {/* Wheel 3 */}
          <g transform="translate(880,2700)">
            <circle cx="70" cy="70" r="66"/>
            <circle cx="70" cy="70" r="42" fill="#FAF8F5"/>
            <circle cx="70" cy="70" r="12"/>
            <circle cx="70" cy="28" r="5" fill="#FAF8F5"/>
            <circle cx="70" cy="112" r="5" fill="#FAF8F5"/>
            <circle cx="28" cy="70" r="5" fill="#FAF8F5"/>
            <circle cx="112" cy="70" r="5" fill="#FAF8F5"/>
            <circle cx="100" cy="40" r="5" fill="#FAF8F5"/>
            <circle cx="40" cy="100" r="5" fill="#FAF8F5"/>
            <circle cx="40" cy="40" r="5" fill="#FAF8F5"/>
            <circle cx="100" cy="100" r="5" fill="#FAF8F5"/>
          </g>
          {/* Bolt standing 4 */}
          <g transform="translate(1460,2740) rotate(-30)">
            <rect x="8" y="0" width="12" height="10"/>
            <rect x="2" y="10" width="24" height="8"/>
            <rect x="4" y="18" width="20" height="32"/>
            <path d="M4 50 L24 50 L21 88 L7 88 Z"/>
            <rect x="10" y="88" width="8" height="22"/>
          </g>
          {/* Cone 5 */}
          <g transform="translate(620,2880) rotate(-15)">
            <rect x="0" y="0" width="14" height="10"/>
            <path d="M2 10 L12 10 L7 70 Z"/>
          </g>
          {/* Steering wheel 2 */}
          <g transform="translate(1180,2920) rotate(12)">
            <circle cx="80" cy="80" r="80"/>
            <circle cx="80" cy="80" r="44" fill="#FAF8F5"/>
            <circle cx="80" cy="80" r="14"/>
            <rect x="76" y="4" width="8" height="32" rx="2" fill="#FAF8F5"/>
            <rect x="76" y="124" width="8" height="32" rx="2" fill="#FAF8F5"/>
            <rect x="4" y="76" width="32" height="8" rx="2" fill="#FAF8F5"/>
            <rect x="124" y="76" width="32" height="8" rx="2" fill="#FAF8F5"/>
          </g>
          {/* Spring 2 */}
          <g transform="translate(280,3060) rotate(-8)">
            <rect x="0" y="0" width="60" height="30"/>
            <rect x="4" y="32" width="52" height="3" fill="#FAF8F5"/>
            <rect x="4" y="38" width="52" height="3" fill="#FAF8F5"/>
            <rect x="4" y="44" width="52" height="3" fill="#FAF8F5"/>
            <path d="M12 50 L20 100 L40 100 L48 50 Z"/>
          </g>
          {/* Truck 3 */}
          <g transform="translate(760,3100)">
            <path d="M0 60 L0 40 Q0 32 8 30 L40 22 Q60 4 100 0 L240 0 Q300 4 340 30 L380 38 Q400 40 410 50 L420 60 L420 80 L0 80 Z"/>
            <path d="M70 22 Q90 8 120 6 L180 6 L180 28 L66 28 Z M196 6 L260 6 Q300 10 326 28 L196 28 Z" fill="#FAF8F5"/>
            <circle cx="90" cy="84" r="28"/>
            <circle cx="330" cy="84" r="28"/>
            <circle cx="90" cy="84" r="14" fill="#FAF8F5"/>
            <circle cx="330" cy="84" r="14" fill="#FAF8F5"/>
          </g>
          {/* Hex bolt 6 */}
          <g transform="translate(60,3300) rotate(18)">
            <path d="M40 2 L74 22 L74 60 L40 80 L6 60 L6 22 Z"/>
            <circle cx="40" cy="41" r="12" fill="#FAF8F5"/>
          </g>
          {/* Wheel 4 */}
          <g transform="translate(480,3380)">
            <circle cx="70" cy="70" r="66"/>
            <circle cx="70" cy="70" r="42" fill="#FAF8F5"/>
            <circle cx="70" cy="70" r="12"/>
            <circle cx="70" cy="28" r="5" fill="#FAF8F5"/>
            <circle cx="70" cy="112" r="5" fill="#FAF8F5"/>
            <circle cx="28" cy="70" r="5" fill="#FAF8F5"/>
            <circle cx="112" cy="70" r="5" fill="#FAF8F5"/>
            <circle cx="100" cy="40" r="5" fill="#FAF8F5"/>
            <circle cx="40" cy="100" r="5" fill="#FAF8F5"/>
            <circle cx="40" cy="40" r="5" fill="#FAF8F5"/>
            <circle cx="100" cy="100" r="5" fill="#FAF8F5"/>
          </g>
          {/* Gear 4 */}
          <g transform="translate(1200,3400) rotate(-25)">
            <circle cx="70" cy="70" r="52"/>
            <rect x="66" y="0" width="8" height="18"/>
            <rect x="66" y="122" width="8" height="18"/>
            <rect x="0" y="66" width="18" height="8"/>
            <rect x="122" y="66" width="18" height="8"/>
            <rect x="28" y="12" width="8" height="18" transform="rotate(-45 32 21)"/>
            <rect x="104" y="12" width="8" height="18" transform="rotate(45 108 21)"/>
            <rect x="28" y="110" width="8" height="18" transform="rotate(45 32 119)"/>
            <rect x="104" y="110" width="8" height="18" transform="rotate(-45 108 119)"/>
            <circle cx="70" cy="70" r="28" fill="#FAF8F5"/>
            <circle cx="70" cy="70" r="8"/>
          </g>
          {/* Cone 6 */}
          <g transform="translate(940,3560) rotate(22)">
            <rect x="0" y="0" width="14" height="10"/>
            <path d="M2 10 L12 10 L7 70 Z"/>
          </g>
          {/* Bolt standing 5 */}
          <g transform="translate(1460,3600) rotate(60)">
            <rect x="8" y="0" width="12" height="10"/>
            <rect x="2" y="10" width="24" height="8"/>
            <rect x="4" y="18" width="20" height="32"/>
            <path d="M4 50 L24 50 L21 88 L7 88 Z"/>
            <rect x="10" y="88" width="8" height="22"/>
          </g>
        </g>
      </svg>
    </div>
  )
}

// ─── Mobile product row ───────────────────────────────────────────────────────

function MobileProductRow({ p, onTap }: { p: Producto; onTap: () => void }) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3 border-b border-hair last:border-0 active:bg-[#F4EFE6] transition-colors cursor-pointer"
      onClick={onTap}
      style={{ WebkitTapHighlightColor: 'transparent' }}
    >
      <ProductThumb src={p.imagen} nombre={p.nombre} />
      <div className="flex-1 min-w-0">
        <div className="font-mono font-bold text-[13px] text-ink tracking-[0.05em] leading-tight">
          {p.codigo_universal}
        </div>
        <div className="text-[11.5px] text-muted-2 truncate leading-tight mt-0.5">{p.nombre}</div>
        {p.marca && (
          <div className="text-[10.5px] text-muted-2 mt-0.5">{p.marca}</div>
        )}
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <WarmStockBadge stock={p.stock} stockMinimo={p.stock_minimo} />
        <span className="text-[12px] font-semibold text-ink tabular-nums">
          Bs. {p.precio_venta.toFixed(2)}
        </span>
      </div>
      <svg className="h-4 w-4 text-muted-2 shrink-0 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
      </svg>
    </div>
  )
}

function MobileSkeletonRows() {
  return (
    <div className="divide-y divide-hair">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3 animate-pulse">
          <div className="h-[38px] w-[38px] rounded-lg bg-cream-2 shrink-0" />
          <div className="flex-1 space-y-1.5">
            <div className="h-[13px] w-24 rounded bg-cream-2" />
            <div className="h-[11px] w-36 rounded bg-hair" />
          </div>
          <div className="flex flex-col items-end gap-1.5 shrink-0">
            <div className="h-6 w-16 rounded-full bg-cream-2" />
            <div className="h-[11px] w-14 rounded bg-hair" />
          </div>
          <div className="h-4 w-4 rounded bg-cream-2 ml-1" />
        </div>
      ))}
    </div>
  )
}

// ─── Column helper ────────────────────────────────────────────────────────────

const colHelper = createColumnHelper<Producto>()

// ─── Main page ────────────────────────────────────────────────────────────────

export function InventarioPage() {
  const { isTokenReady } = useAuth()
  const [modalOpen, setModalOpen]               = useState(false)
  const [importOpen, setImportOpen]             = useState(false)
  const [etiquetaProducto, setEtiquetaProducto] = useState<Producto | null>(null)
  const [prestamoProducto, setPrestamoProducto] = useState<Producto | null>(null)
  const [editingProducto, setEditingProducto]   = useState<Producto | null>(null)
  const [confirmDelete, setConfirmDelete]       = useState<Producto | null>(null)
  const [deleting, setDeleting]                 = useState(false)
  const [loading, setLoading]                   = useState(true)
  const [loadingModal, setLoadingModal]         = useState(false)
  const [allProducts, setAllProducts]           = useState<Producto[]>([])
  const [stockFilter, setStockFilter]           = useState<StockFilter>('all')

  const [sorting, setSorting]           = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState('')

  const { addPrestamo } = usePrestamosStore()

  const dateStr = useMemo(() => {
    return new Date().toLocaleDateString('es-BO', {
      weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
    })
  }, [])

  // ── Load products ──────────────────────────────────────────────────────────
  const fetchProducts = (after: string | null, acc: ProductoAPI[]): Promise<ProductoAPI[]> => {
    return gql<{ productos: { nodes: ProductoAPI[]; pageInfo: { hasNextPage: boolean; endCursor: string } } }>(
      PRODUCTOS_QUERY, { first: 50, after }
    ).then(res => {
      const { nodes, pageInfo } = res.productos
      const all = [...acc, ...nodes]
      if (pageInfo?.hasNextPage && pageInfo.endCursor) return fetchProducts(pageInfo.endCursor, all)
      return all
    })
  }

  const loadProducts = () => {
    let cancelled = false
    setLoading(true)
    fetchProducts(null, [])
      .then((raw) => {
        if (cancelled) return
        const backend = raw.map(backendToProductoSimple)
        const mockKitYpiezas = MOCK_PRODUCTOS.filter(p => p.es_kit || p.kit_id)
        setAllProducts(backend.length > 0 ? [...backend, ...mockKitYpiezas] : MOCK_PRODUCTOS as typeof backend)
      })
      .catch(() => { if (!cancelled) notify.error('Error cargando productos') })
      .finally(() => { if (!cancelled) setLoading(false) })
  }

  useEffect(() => {
    if (!isTokenReady) return
    let cancelled = false
    setLoading(true)
    fetchProducts(null, [])
      .then((raw) => {
        if (cancelled) return
        const backend = raw.map(backendToProductoSimple)
        const mockKitYpiezas = MOCK_PRODUCTOS.filter(p => p.es_kit || p.kit_id)
        setAllProducts(backend.length > 0 ? [...backend, ...mockKitYpiezas] : MOCK_PRODUCTOS as typeof backend)
      })
      .catch(() => { if (!cancelled) notify.error('Error cargando productos') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [isTokenReady])

  // ── Stock filter ───────────────────────────────────────────────────────────
  const displayProducts = useMemo(() => {
    if (stockFilter === 'all') return allProducts
    return allProducts.filter(p => {
      const sinStock = p.stock === 0
      const bajo = p.stock > 0 && p.stock <= p.stock_minimo
      if (stockFilter === 'crit') return sinStock
      if (stockFilter === 'warn') return bajo
      if (stockFilter === 'ok')   return !sinStock && !bajo
      return true
    })
  }, [allProducts, stockFilter])

  // ── Mutations ──────────────────────────────────────────────────────────────
  const handleEdit = (p: Producto) => {
    setEditingProducto(p)
    setLoadingModal(true)
    setModalOpen(true)
    gql<{ productos: { nodes: ProductoAPI[] } }>(PRODUCTO_BY_ID_QUERY, { id: Number(p.id) })
      .then((res) => {
        if (res.productos?.nodes?.[0]) setEditingProducto(backendToProducto(res.productos.nodes[0]))
      })
      .catch(() => notify.error('Error cargando producto'))
      .finally(() => setLoadingModal(false))
  }
  const handleNew  = () => { setEditingProducto(null); setModalOpen(true) }

  const handleSave = async (data: Omit<Producto, 'id' | 'creado_en' | 'actualizado_en'>) => {
    const hasPriceChange = editingProducto &&
      (data.precio_costo !== editingProducto.precio_costo ||
       data.precio_venta !== editingProducto.precio_venta ||
       data.conversionABs !== editingProducto.conversionABs)

    if (editingProducto) {
      const updatePayload = productoToBackendUpdate(data)
      await api.put(`/Producto/${editingProducto.id}`, updatePayload)
      if (hasPriceChange) {
        const pricePayload = {
          costo: data.precio_costo,
          precio: data.precio_venta,
          conversionABs: data.conversionABs,
          nota: data.historial_precios[data.historial_precios.length - 1]?.nota ?? '',
        }
        await api.post(`/Producto/CambiarPrecio/${editingProducto.id}`, pricePayload)
      }
      setAllProducts((prev) => prev.map((p) => p.id === editingProducto.id ? { ...p, ...data } : p))
      notify.success('Producto actualizado', { description: `${data.codigo_universal || '(sin código)'} - ${data.nombre}` })
    } else {
      const createPayload = productoToBackend(data)
      await api.post('/Producto', createPayload)
      loadProducts()
      notify.success('Producto creado', { description: `${data.codigo_universal || '(sin código)'} - ${data.nombre}` })
    }
    setModalOpen(false)
  }

  const handleNuevoPrestamo = (items: ItemPrestamo[], prestado_a: string, fecha: string, notas: string) => {
    const nuevo: Prestamo = {
      id: crypto.randomUUID(), items, prestado_a, fecha, notas,
      estado: 'activo', creado_en: new Date().toISOString(),
    }
    addPrestamo(nuevo)
    setAllProducts((prev) => {
      return prev.map((p) => {
        const item = items.find((i) => i.producto_id === p.id)
        if (!item) return p
        return { ...p, stock: p.stock - item.cantidad }
      })
    })
    notify.success('Préstamo registrado')
    setPrestamoProducto(null)
  }

  const handleImport = async (results: ImportResult[]) => {
    const productosParaEnviar = results.map((r) => productoToBackendBulk(r.data))
    await api.post('/Producto/lista', { productos: productosParaEnviar })
    loadProducts()
    const creados      = results.filter((r) => r.action === 'create').length
    const actualizados = results.filter((r) => r.action === 'update').length
    const msg = creados > 0 && actualizados > 0
      ? `${creados} creados, ${actualizados} actualizados`
      : creados > 0 ? `${creados} productos creados` : `${actualizados} productos actualizados`
    notify.success(msg)
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    setDeleting(true)
    try {
      await api.delete(`/Producto/${confirmDelete.id}`)
      setAllProducts((prev) => prev.filter((p) => p.id !== confirmDelete.id))
      notify.success('Producto eliminado', { description: confirmDelete.nombre })
    } catch {
      notify.error('Error al eliminar producto')
    } finally {
      setDeleting(false)
      setConfirmDelete(null)
    }
  }

  // ── KPIs ───────────────────────────────────────────────────────────────────
  const kpi = useMemo(() => ({
    total:         allProducts.length,
    totalUnidades: allProducts.reduce((s, p) => s + p.stock, 0),
    totalValor:    allProducts.reduce((s, p) => s + p.precio_costo * p.stock, 0),
    stockBajo:     allProducts.filter((p) => p.stock <= p.stock_minimo).length,
  }), [allProducts])

  // ── Columns ────────────────────────────────────────────────────────────────
  const columns = useMemo(() => [
    colHelper.display({
      id: 'imagen',
      header: 'Foto',
      size: 58,
      meta: { align: 'center' },
      enableSorting: false,
      cell: (info) => (
        <ProductThumb src={info.row.original.imagen} nombre={info.row.original.nombre} />
      ),
    }),
    colHelper.accessor('nombre', {
      header: 'Código / Producto',
      size: 210,
      meta: { align: 'left' },
      cell: (info) => {
        const p = info.row.original
        return (
          <div>
            <div className="font-mono font-bold tracking-[0.06em] text-[14px] text-ink leading-[1] mb-1">
              {p.codigo_universal}
            </div>
            <div className="text-[11px] text-muted-2 leading-[1.3] truncate max-w-[170px]">{p.nombre}</div>
          </div>
        )
      },
    }),
    colHelper.accessor('marca', {
      header: 'Marca / Ubic.',
      size: 150,
      meta: { align: 'left' },
      cell: (info) => {
        const p = info.row.original
        return (
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-terra shrink-0" />
              <span className="text-[13.5px] font-medium text-ink-2">{p.marca || '—'}</span>
            </div>
            <p className="text-[10px] text-muted-2 font-mono mt-0.5">{p.almacen} {p.estante} {p.fila} {p.columna}</p>
          </div>
        )
      },
    }),
    colHelper.accessor('stock', {
      header: 'Stock',
      size: 110,
      meta: { align: 'right' },
      cell: (info) => {
        const p = info.row.original
        return (
          <span className="font-semibold text-[13.5px] text-ink tabular-nums">{p.stock.toLocaleString('es-BO')}</span>
        )
      },
    }),
    colHelper.display({
      id: 'estado',
      header: 'Estado',
      size: 100,
      meta: { align: 'left' },
      enableSorting: false,
      cell: (info) => {
        const p = info.row.original
        return <WarmStockBadge stock={p.stock} stockMinimo={p.stock_minimo} />
      },
    }),
    colHelper.accessor('precio_venta', {
      header: 'P. Venta',
      size: 120,
      meta: { align: 'right' },
      cell: (info) => (
        <div className="text-right">
          <div className="font-semibold text-[13.5px] text-ink tabular-nums">
            <span className="text-[10.5px] text-muted-2 font-medium mr-0.5">Bs.</span>
            {info.getValue().toFixed(2)}
          </div>
          <div className="text-[10.5px] text-muted-2 mt-0.5">PVP unitario</div>
        </div>
      ),
    }),
    colHelper.accessor('precio_costo', {
      header: 'P. Costo',
      size: 120,
      meta: { align: 'right' },
      cell: (info) => {
        const sale = info.row.original.precio_venta
        const cost = info.getValue()
        const margen = sale > 0 && cost > 0 ? Math.round(((sale - cost) / sale) * 100) : null
        return (
          <div className="text-right">
            <div className="font-semibold text-[13.5px] text-muted tabular-nums">
              <span className="text-[10.5px] text-muted-2 font-medium mr-0.5">Bs.</span>
              {cost.toFixed(2)}
            </div>
            {margen !== null && (
              <div className="text-[9.5px] text-muted-2 mt-0.5">{margen}%</div>
            )}
          </div>
        )
      },
    }),
    colHelper.display({
      id: 'acciones',
      header: 'Acciones',
      size: 120,
      meta: { align: 'right' },
      enableSorting: false,
      cell: (info) => {
        const p = info.row.original
        const sinStock = p.stock === 0
        return (
          <div className="flex justify-end gap-0.5">
            <ActionBtn icon="prestamo" onClick={() => setPrestamoProducto(p)} disabled={sinStock} title="Préstamo" />
            <ActionBtn icon="etiqueta" onClick={() => setEtiquetaProducto(p)} title="Etiqueta" />
            <ActionBtn icon="editar"   onClick={() => handleEdit(p)} title="Editar" />
            <ActionBtn icon="eliminar" onClick={() => setConfirmDelete(p)} danger title="Eliminar" />
          </div>
        )
      },
    }),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [])

  // ── Global filter fn ───────────────────────────────────────────────────────
  const globalFilterFn = (row: { original: Producto }, _columnId: string, filterValue: string): boolean => {
    const p = row.original
    const search = filterValue.toLowerCase().trim()
    if (!search) return true
    const fields = [
      p.codigo_universal,
      p.codigos_alternativos[0] ?? '',
      p.codigos_alternativos[1] ?? '',
      p.nombre, p.marca, p.descripcion,
    ]
    return fields.some(field => field.toLowerCase().includes(search))
  }

  // ── TanStack Table ─────────────────────────────────────────────────────────
  const table = useReactTable({
    data: displayProducts,
    columns,
    state: { sorting, globalFilter },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    globalFilterFn,
    initialState: { pagination: { pageSize: 25, pageIndex: 0 } },
  })

  useEffect(() => {
    table.setPageIndex(0)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [globalFilter, stockFilter])

  const filteredCount = table.getFilteredRowModel().rows.length

  // ── Render ─────────────────────────────────────────────────────────────────

  const fmtBs = (n: number) =>
    n.toLocaleString('es-BO', { minimumFractionDigits: 0, maximumFractionDigits: 0 })

  const STOCK_FILTERS: { k: StockFilter; l: string }[] = [
    { k: 'all',  l: 'Todos'    },
    { k: 'ok',   l: 'En stock' },
    { k: 'warn', l: 'Bajo'     },
    { k: 'crit', l: 'Crítico'  },
  ]

  return (
    <MainLayout>
      <div className="relative px-4 sm:px-8 md:px-14 py-5 md:py-9 pb-10 md:pb-20 min-h-screen"
           style={{ background: 'linear-gradient(180deg, #F4EFE6 0%, #FAF8F5 200px, #FAF8F5 100%)' }}>

        <AutopartsWatermark />

        <div className="relative z-[1]">

        {/* ── Topbar ──────────────────────────────────────────────────── */}
        <div className="flex items-center justify-between mb-9">
          <div className="flex items-center gap-1.5 text-[12.5px] text-muted tracking-[0.02em]">
            <span>Operaciones</span>
            <span className="opacity-50">/</span>
            <span className="text-ink">Inventario</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex h-[38px] px-3.5 border border-hair bg-paper rounded-[10px] items-center gap-2 text-[13px] text-ink-2">
              <IcoCal /><span>{dateStr}</span>
            </div>
            <button className="w-[38px] h-[38px] rounded-[10px] border border-hair bg-paper flex items-center justify-center text-ink-2 hover:border-hair-2 transition-colors relative"
                    title="Notificaciones">
              <IcoBell />
              <span className="absolute top-[9px] right-[10px] w-[7px] h-[7px] rounded-full bg-terra border-2 border-paper" />
            </button>
            <button className="w-[38px] h-[38px] rounded-[10px] border border-hair bg-paper flex items-center justify-center text-ink-2 hover:border-hair-2 transition-colors"
                    title="Configuración">
              <IcoSettings />
            </button>
          </div>
        </div>

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 md:gap-8 mb-7 md:mb-10">
          <div>
            <h1 className="font-serif text-[44px] md:text-[72px] leading-[0.95] tracking-[-0.025em] m-0 mb-2.5 text-ink">
              Inventario<em className="italic text-terra">.</em>
            </h1>
            <p className="text-base text-muted max-w-[520px]">
              Gestión de repuestos y autopartes — control en tiempo real de existencias, costos en bolivianos y movimientos de almacén.
            </p>
          </div>
          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <button onClick={() => setImportOpen(true)}
              className="h-[46px] px-[22px] rounded-[12px] text-sm font-semibold flex items-center gap-2 bg-paper text-ink border border-hair hover:border-hair-2 transition-colors">
              <IcoDownload /> <span>Importar</span>
            </button>
            <button onClick={handleNew}
              className="h-[46px] px-[22px] rounded-[12px] text-sm font-semibold flex items-center gap-2 bg-terra text-white hover:bg-terra-deep transition-all hover:-translate-y-px active:translate-y-0"
              style={{ boxShadow: '0 1px 2px rgba(200,80,31,0.3), 0 6px 16px -8px rgba(200,80,31,0.5)' }}>
              <IcoPlus /> <span>Nuevo producto</span>
            </button>
          </div>
        </div>

        {/* ── Metrics ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-5 mb-7 md:mb-11">
          <WarmMetric
            label="Total productos"
            value={kpi.total.toLocaleString('es-BO')}
            icon={<IcoBox />}
            sublabel="en catálogo"
          />
          <WarmMetric
            label="Stock crítico"
            value={kpi.stockBajo}
            icon={<IcoAlert />}
            tone={kpi.stockBajo > 0 ? 'crit' : undefined}
            sublabel="bajo mínimo"
          />
          <WarmMetric
            label="Valor de almacén"
            value={fmtBs(kpi.totalValor)}
            unit="Bs."
            icon={<IcoVault />}
            sublabel="al precio de costo"
          />
          <WarmMetric
            label="Unidades totales"
            value={kpi.totalUnidades.toLocaleString('es-BO')}
            icon={<IcoUnits />}
            sublabel="en stock"
          />
        </div>

        {/* ── Table card ──────────────────────────────────────────────── */}
        <div className="rounded-[18px] border border-hair overflow-hidden"
             style={{ background: 'rgba(255,255,255,0.86)', backdropFilter: 'blur(2px)' }}>

          {/* Toolbar */}
          <div className="flex items-center gap-3.5 px-4 md:px-7 py-4 md:py-[22px] border-b border-hair flex-wrap">
            <div>
              <span className="font-serif text-[28px] leading-[1] tracking-[-0.01em] text-ink">Productos</span>
              <span className="text-base text-muted ml-2.5 font-normal">
                {globalFilter ? `${filteredCount} de ${displayProducts.length}` : displayProducts.length}
              </span>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <div className="h-10 flex items-center gap-2.5 px-3.5 border border-hair rounded-[10px] bg-cream min-w-0 w-full sm:w-auto sm:min-w-[260px] md:min-w-[320px] transition-colors focus-within:border-terra focus-within:bg-paper">
                <IcoSearch />
                <input
                  className="flex-1 min-w-0 bg-transparent border-none outline-none text-sm text-ink placeholder-muted-2"
                  placeholder="Buscar por código, nombre o marca…"
                  value={globalFilter}
                  onChange={e => setGlobalFilter(e.target.value)}
                />
              </div>
            </div>
          </div>

          {/* Filter row */}
          <div className="flex items-center gap-2 px-4 md:px-7 py-3 border-b border-hair flex-wrap"
               style={{ background: 'linear-gradient(180deg, #FAF8F5 0%, #FFFFFF 100%)' }}>
            <span className="text-[11px] text-muted uppercase tracking-[0.1em] mr-1">Stock</span>
            {STOCK_FILTERS.map(f => (
              <button key={f.k}
                onClick={() => setStockFilter(f.k)}
                className={clsx(
                  'h-10 px-3.5 border rounded-[10px] flex items-center text-[13px] transition-colors duration-120',
                  stockFilter === f.k
                    ? 'bg-ink text-cream border-ink'
                    : 'bg-paper text-ink-2 border-hair hover:border-hair-2',
                )}>
                {f.l}
              </button>
            ))}
          </div>

          {/* Table */}
          {loading ? (
            <>
              <div className="hidden md:block"><TableSkeleton /></div>
              <div className="md:hidden"><MobileSkeletonRows /></div>
            </>
          ) : displayProducts.length === 0 ? (
            <EmptyState onNew={handleNew} searching={stockFilter !== 'all'} />
          ) : filteredCount === 0 ? (
            <EmptyState onNew={handleNew} searching={!!globalFilter} />
          ) : (
            <>
              {/* ── Desktop table ── */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-sm table-fixed">
                  <colgroup>
                    {table.getFlatHeaders().map((h) => (
                      <col key={h.id} style={{ width: h.column.getSize() }} />
                    ))}
                  </colgroup>
                  <thead>
                    {table.getHeaderGroups().map((hg) => (
                      <tr key={hg.id} className="border-b border-hair"
                          style={{ background: 'rgba(250,248,245,0.7)' }}>
                        {hg.headers.map((header) => {
                          const canSort = header.column.getCanSort()
                          const sorted  = header.column.getIsSorted()
                          const align   = (header.column.columnDef.meta as ColumnMeta<Producto, unknown> | undefined)?.align ?? 'left'
                          return (
                            <th
                              key={header.id}
                              className={clsx(
                                'px-[22px] py-4 text-[11.5px] font-semibold text-muted uppercase tracking-[0.1em] select-none whitespace-nowrap',
                                align === 'center' && 'text-center',
                                align === 'right'  && 'text-right',
                                align === 'left'   && 'text-left',
                                canSort && 'cursor-pointer hover:text-ink-2 transition-colors',
                              )}
                              onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                            >
                              <span className={clsx(
                                'inline-flex items-center gap-1',
                                align === 'center' && 'justify-center w-full',
                                align === 'right'  && 'justify-end w-full',
                              )}>
                                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                                {canSort && <SortIcon direction={sorted} />}
                              </span>
                            </th>
                          )
                        })}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {table.getRowModel().rows.map((row, idx) => (
                      <tr key={row.id}
                        className="border-b border-hair transition-colors"
                        style={{
                          background: idx % 2 === 0
                            ? 'rgba(255,255,255,0.55)'
                            : 'rgba(250,250,248,0.45)',
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(244,239,230,0.8)')}
                        onMouseLeave={e => (e.currentTarget.style.background = idx % 2 === 0
                          ? 'rgba(255,255,255,0.55)' : 'rgba(250,250,248,0.45)')}
                      >
                        {row.getVisibleCells().map((cell) => {
                          const align = (cell.column.columnDef.meta as ColumnMeta<Producto, unknown> | undefined)?.align ?? 'left'
                          return (
                            <td
                              key={cell.id}
                              className={clsx(
                                'px-[22px] py-[7px] align-middle text-[13.5px]',
                                align === 'center' && 'text-center',
                                align === 'right'  && 'text-right',
                              )}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* ── Mobile list ── */}
              <div className="md:hidden">
                {table.getRowModel().rows.map(row => (
                  <MobileProductRow
                    key={row.id}
                    p={row.original}
                    onTap={() => handleEdit(row.original)}
                  />
                ))}
              </div>
            </>
          )}

          {/* Footer */}
          {!loading && displayProducts.length > 0 && (
            <div className="px-4 md:px-7 py-4 border-t border-hair bg-cream flex items-center justify-between flex-wrap gap-2">
              <span className="text-[12.5px] text-muted">
                Mostrando {filteredCount} de {displayProducts.length} productos
              </span>
              <TablePagination table={table} totalRows={filteredCount} />
            </div>
          )}
        </div>

        </div>{/* end relative z-[1] content wrapper */}
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      <NuevoPrestamoModal
        open={!!prestamoProducto}
        onClose={() => setPrestamoProducto(null)}
        onSave={handleNuevoPrestamo}
        productos={allProducts}
      />
      <EtiquetaModal
        open={!!etiquetaProducto}
        onClose={() => setEtiquetaProducto(null)}
        producto={etiquetaProducto}
      />
      <ImportarExcelModal
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={handleImport}
        productosExistentes={allProducts}
      />
      <ProductoModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingProducto(null) }}
        onSave={handleSave}
        producto={editingProducto}
        loading={loadingModal}
        productosExistentes={allProducts}
      />
      <ConfirmModal
        open={!!confirmDelete}
        onClose={() => setConfirmDelete(null)}
        onConfirm={() => void handleDelete()}
        title="Eliminar producto"
        message={`¿Eliminar "${confirmDelete?.nombre}"? Esta acción no se puede deshacer.`}
        loading={deleting}
      />
    </MainLayout>
  )
}
