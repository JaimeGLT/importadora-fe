import { useCallback, useEffect, useRef, useState } from 'react'
import { HubConnectionBuilder, HubConnectionState, type HubConnection } from '@microsoft/signalr'

interface HubHandlers {
  onNuevaOrden?: (p: { id: number; fecha: string; cantItems: number; id_cliente: number | null }) => void
  onOrdenAceptada?: (p: { id: number; almaceneroId: number }) => void
  onOrdenLista?: (p: { id: number }) => void
  onOrdenCompletada?: (p: { id: number; total: number }) => void
  onOrdenCancelada?: (p: { id: number; nota: string | null }) => void
}

export function useVentasHub(
  handlers: HubHandlers,
  isReady: boolean,
  initialGrupos?: string[],
): { isConnected: boolean; joinGrupo: (g: string) => Promise<void> } {
  const [isConnected, setIsConnected] = useState(false)
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers
  const connRef = useRef<HubConnection | null>(null)
  const initialGruposRef = useRef(initialGrupos)
  initialGruposRef.current = initialGrupos

  useEffect(() => {
    if (!isReady) return

    const conn = new HubConnectionBuilder()
      .withUrl('/hubs/ventas', { withCredentials: true })
      .withAutomaticReconnect()
      .build()

    connRef.current = conn

    conn.on('NuevaOrden', (p) => handlersRef.current.onNuevaOrden?.(p))
    conn.on('OrdenAceptada', (p) => handlersRef.current.onOrdenAceptada?.(p))
    conn.on('OrdenLista', (p) => handlersRef.current.onOrdenLista?.(p))
    conn.on('OrdenCompletada', (p) => handlersRef.current.onOrdenCompletada?.(p))
    conn.on('OrdenCancelada', (p) => handlersRef.current.onOrdenCancelada?.(p))

    conn.onreconnecting(() => setIsConnected(false))
    conn.onreconnected(async () => {
      setIsConnected(true)
      for (const g of initialGruposRef.current ?? []) {
        await conn.invoke('UnirseAGrupo', g).catch(() => {})
      }
    })
    conn.onclose(() => setIsConnected(false))

    conn.start()
      .then(async () => {
        setIsConnected(true)
        for (const g of initialGruposRef.current ?? []) {
          await conn.invoke('UnirseAGrupo', g).catch(() => {})
        }
      })
      .catch(() => setIsConnected(false))

    return () => {
      connRef.current = null
      conn.stop()
    }
  }, [isReady])

  const joinGrupo = useCallback(async (grupo: string) => {
    if (connRef.current?.state === HubConnectionState.Connected) {
      await connRef.current.invoke('UnirseAGrupo', grupo).catch(() => {})
    }
  }, [])

  return { isConnected, joinGrupo }
}
