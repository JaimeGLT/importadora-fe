## Obtener las ordenes del almacenero
query {
  misOrdenesAlmacen {
    nodes {
      items {
        piezas {
          id_Item
          id_Pieza
          cantidad
          precioUnitario
          confirmado
          notaIncompleto
          pieza {
            id_Producto
            codigoUniversal
            nombre
            cantidadPorKit
            stockReservado
            stockActual
             id
          }
          id
        }
        producto {
          id
          marca
          descripcion
          unidad_Medida
          ubicacion
          stock_Actual
          stock_Minimo
          costo
          precio
          conversionABs
          codigo
          esKit
          stockReservado
          nombre
          piezasKit {
            id_Producto
            codigoUniversal
            nombre
            cantidadPorKit
            stockActual
            stockReservado
            id
          }
          calcularStockKit
          codigoAux
          codigoAux2
        }
        descuento {
          nombre
          cantDescuento
          color
          activo
          id
        }
        id
        id_Orden
        id_Producto
        cantidad
        esParcial
        estado
        notaIncompleto
        precioUnitario
        id_Descuento
        montoDescuento
      }
      id
      id_Cajero
      id_Almacenero
      id_Cliente
      id_Caja
      estado
      fecha
      fechaCompletada
      notaCancelacion
      cliente {
        nombre
        apellido
        telefono
        id
      }
    }
  }
}

## obtener todas las ordenes listas
query {
  ordenesListas {
    nodes {
      items {
        piezas {
          pieza {
            cantidadPorKit
            codigoUniversal
            id
            id_Producto
            nombre
            stockActual
            stockReservado
          }
          precioUnitario
          notaIncompleto
          id_Pieza
          id_Item
          confirmado
          cantidad
          id
        }
        producto {
          unidad_Medida
          ubicacion
          stockReservado
          stock_Minimo
          stock_Actual
          precio
          piezasKit {
            cantidadPorKit
            codigoUniversal
            id
            id_Producto
            nombre
            stockActual
            stockReservado
          }
          piezas
          nombre
          marca
          id
          fechaEliminacion
          esKit
          descripcion
          costo
          conversionABs
          codigoAux2
          codigoAux
          codigo
          calcularStockKit
          activo
        }
        descuento {
          activo
          cantDescuento
          color
          id
          nombre
        }
        id
        cantidad
        esParcial
        estado
        notaIncompleto
        montoDescuento
        id_Producto
        id_Orden
        id_Descuento
        precioUnitario
      }
      id
      id_Cajero
      id_Almacenero
      id_Cliente
      id_Caja
      estado
      fecha
      fechaCompletada
      notaCancelacion
      cliente {
        nombre
        apellido
        telefono
        id
      }
    }
  }
}


#3 obtener todas las ordenes
query {
  todasOrdenes {
    nodes {
      estado
      fecha
      fechaCompletada
      id
      id_Almacenero
      id_Caja
      id_Cajero
      id_Cliente
      notaCancelacion
      cliente {
        apellido
        id
        nombre
        telefono
      }
      items {
        cantidad
        esParcial
        estado
        id
        id_Descuento
        id_Orden
        id_Producto
        montoDescuento
        notaIncompleto
        precioUnitario
        piezas {
          cantidad
          confirmado
          id
          id_Item
          id_Pieza
          notaIncompleto
          precioUnitario
        }
        descuento {
          activo
          cantDescuento
          color
          id
          nombre
        }
        producto {
          activo
          calcularStockKit
          codigo
          codigoAux
          codigoAux2
          conversionABs
          costo
          descripcion
          esKit
          fechaEliminacion
          id
          marca
          nombre
          piezas
          precio
          stock_Actual
          stock_Minimo
          stockReservado
          ubicacion
          unidad_Medida
          validarPiezasSuficientes
          piezasKit {
            cantidadPorKit
            codigoUniversal
            id
            id_Producto
            nombre
            stockActual
            stockReservado
          }
        }
      }
    }
  }
}

## mis ordenes
query {
  misOrdenes {
    nodes {
      estado
      fecha
      fechaCompletada
      id
      id_Almacenero
      id_Caja
      id_Cajero
      id_Cliente
      notaCancelacion
      cliente {
        apellido
        id
        nombre
        telefono
      }
      items {
        cantidad
        esParcial
        estado
        id
        id_Descuento
        id_Orden
        id_Producto
        montoDescuento
        notaIncompleto
        precioUnitario
        descuento {
          activo
          cantDescuento
          color
          id
          nombre
        }
        piezas {
          cantidad
          confirmado
          id
          id_Item
          id_Pieza
          notaIncompleto
          precioUnitario
        }
        producto {
          activo
          calcularStockKit
          codigo
          codigoAux
          codigoAux2
          conversionABs
          costo
          descripcion
          esKit
          fechaEliminacion
          id
          marca
          nombre
          piezas
          precio
          stock_Actual
          stock_Minimo
          stockReservado
          ubicacion
          unidad_Medida
          validarPiezasSuficientes
        }
      }
    }
  }
}

## ordenes pendientes
query {
  ordenesPendientes {
    nodes {
      estado
      fecha
      fechaCompletada
      id
      id_Almacenero
      id_Caja
      id_Cajero
      id_Cliente
      notaCancelacion
      cliente {
        apellido
        id
        nombre
        telefono
      }
      items {
        cantidad
        esParcial
        estado
        id
        id_Descuento
        id_Orden
        id_Producto
        montoDescuento
        notaIncompleto
        precioUnitario
        descuento {
          activo
          cantDescuento
          color
          id
          nombre
        }
        producto {
          activo
          calcularStockKit
          codigo
          codigoAux
          codigoAux2
          conversionABs
          costo
          descripcion
          esKit
          fechaEliminacion
          id
          marca
          nombre
          piezas
          precio
          stock_Actual
          stock_Minimo
          stockReservado
          ubicacion
          unidad_Medida
          validarPiezasSuficientes
        }
        piezas {
          cantidad
          confirmado
          id
          id_Item
          id_Pieza
          notaIncompleto
          precioUnitario
        }
      }
    }
  }
}

## Tipo de cambio del dia
query {
  tipoCambio {
    precioDolar
    fecha
    id
  }
}