// Resumen de ventas por producto: últimos 30 días, 7 días recientes, 7 días previos
// Usado exclusivamente por AlertasPage para calcular velocidad y demanda inusual

export interface ResumenVentas {
  producto_id: string
  unidades_7d: number      // vendidas en los últimos 7 días
  unidades_prev7d: number  // vendidas en los 7 días anteriores (8–14 días atrás)
  unidades_30d: number     // vendidas en los últimos 30 días
}

export const MOCK_RESUMEN_VENTAS: ResumenVentas[] = [
  // MOT-0011 — Filtro de aceite Toyota: demanda inusual (+150%)
  { producto_id: '1', unidades_7d: 45, unidades_prev7d: 18, unidades_30d: 95 },
  // FRE-0022 — Pastillas freno Brembo: stock bajo, velocidad normal
  { producto_id: '2', unidades_7d: 7,  unidades_prev7d: 6,  unidades_30d: 28 },
  // SUS-0033 — Amortiguador Monroe: stock crítico, velocidad baja
  { producto_id: '3', unidades_7d: 3,  unidades_prev7d: 4,  unidades_30d: 12 },
  // ELE-0044 — Batería Bosch: demanda inusual (+300%) + stock bajo
  { producto_id: '4', unidades_7d: 28, unidades_prev7d: 7,  unidades_30d: 45 },
  // MOT-0055 — Bujías NGK: stock alto, normal
  { producto_id: '5', unidades_7d: 35, unidades_prev7d: 30, unidades_30d: 130 },
  // ENF-0066 — Radiador aluminio: stock crítico + proveedor China 45 días
  { producto_id: '6', unidades_7d: 4,  unidades_prev7d: 3,  unidades_30d: 14 },
  // TRA-0077 — Disco embrague Sachs: stock bajo + proveedor MX 14 días
  { producto_id: '7', unidades_7d: 6,  unidades_prev7d: 5,  unidades_30d: 22 },
  // CAR-0088 — Espejo Toyota: descontinuado, ignorado en alertas
  { producto_id: '8',  unidades_7d: 1,  unidades_prev7d: 1,  unidades_30d: 4   },
  // MOT-0099 — Filtro combustible Kia: alta rotación, demanda estable
  { producto_id: '9',  unidades_7d: 11, unidades_prev7d: 10, unidades_30d: 42  },
  // ENF-0100 — Bomba agua Hyundai: rotación media, estable
  { producto_id: '10', unidades_7d: 3,  unidades_prev7d: 2,  unidades_30d: 11  },
  // FRE-0111 — Pastillas traseras Suzuki: alta rotación
  { producto_id: '11', unidades_7d: 8,  unidades_prev7d: 7,  unidades_30d: 29  },
  // ELE-0122 — Sensor MAP Mazda: stock muerto, sin ventas
  { producto_id: '12', unidades_7d: 0,  unidades_prev7d: 0,  unidades_30d: 0   },
  // MOT-0133 — Correa distribución Mitsubishi: rotación baja
  { producto_id: '13', unidades_7d: 1,  unidades_prev7d: 2,  unidades_30d: 5   },
  // SUS-0144 — Amortiguador Ford Ranger: rotación media
  { producto_id: '14', unidades_7d: 4,  unidades_prev7d: 3,  unidades_30d: 15  },
  // ENF-0155 — Termostato Toyota Hilux: alta rotación, demanda inusual
  { producto_id: '15', unidades_7d: 14, unidades_prev7d: 6,  unidades_30d: 38  },
  // ELE-0166 — Módulo ABS Honda: stock muerto, sin movimiento
  { producto_id: '16', unidades_7d: 0,  unidades_prev7d: 0,  unidades_30d: 0   },
  // SUS-0177 — Caja dirección Nissan: casi muerto, 1 venta al mes
  { producto_id: '17', unidades_7d: 0,  unidades_prev7d: 1,  unidades_30d: 1   },
  // MOT-0188 — Bujía platino Denso: alta rotación, demanda inusual (+83%)
  { producto_id: '18', unidades_7d: 24, unidades_prev7d: 13, unidades_30d: 82  },
  // ENF-0199 — Condensador A/C Toyota Prado: stock muerto
  { producto_id: '19', unidades_7d: 0,  unidades_prev7d: 0,  unidades_30d: 0   },
  // FRE-0200 — Bomba freno VW: rotación baja
  { producto_id: '20', unidades_7d: 2,  unidades_prev7d: 1,  unidades_30d: 6   },
]
