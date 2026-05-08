Flujo ventas
Endpoints de ventas — resumen por rol                
                                         
  ---                                                  
  CAJERO — crea y cancela órdenes
                                                       
  Endpoint: POST /api/OrdenVenta                     
  Qué hace: Crea la orden con los productos que el
    cliente quiere. Valida que tenga caja abierta.
    Reserva el stock. Notifica a todos los almaceneros
    via SignalR.
    body: curl http://localhost:5120/api/OrdenVenta \
  --request POST \
  --header 'Content-Type: application/json' \
  --data '{
  "id_Cliente": null,
  "items": [
    {
      "id_Producto": 1,
      "cantidad": 1,
      "esParcial": true,
      "precioUnitario": 0,
      "id_Descuento": null,
      "montoDescuento": 0,
      "piezas": [
        {
          "id_Pieza": 1,
          "cantidad": 1
        }
      ]
    }
  ]
}'
Body
required
Selected Content Type:
application/json
itemsCopy link to items
Type:array object[] · DtoItemOrden[]
1…
required
Show Child Attributesfor items
id_ClienteCopy link to id_Cliente
Type:integer | null
Format:int32
Signed 32-bit integers (commonly used integer type).

Responses
200Copy link to 200
OK
  ────────────────────────────────────────
  Endpoint: POST /api/OrdenVenta/{id}/Cancelar
  Qué hace: Cancela la orden. Libera todas las reservas

    de stock. Notifica al almacenero si ya había
    aceptado.
    body:
    curl http://localhost:5120/api/OrdenVenta/1/Cancelar \
  --request POST \
  --header 'Content-Type: application/json' \
  --data 'null'
  ---
  ALMACENERO — gestiona la preparación física

  Endpoint: POST /api/OrdenVenta/{id}/Aceptar
  Qué hace: Toma la orden para él. Solo uno puede
    aceptarla. Notifica al cajero que alguien la tomó.
    Body: curl http://localhost:5120/api/OrdenVenta/1/Aceptar \
  --request POST
  ────────────────────────────────────────
  Endpoint: POST
    /api/OrdenVenta/{id}/Items/{itemId}/Incompleto
  Qué hace: Marca un producto que no pudo traer, con
    nota opcional explicando por qué.
    Body:
    curl http://localhost:5120/api/OrdenVenta/1/Items/1/Incompleto \
  --request POST \
  --header 'Content-Type: application/json' \
  --data '{
  "nota": null
}'
  ────────────────────────────────────────
  Endpoint: POST /api/OrdenVenta/{id}/Lista
  Qué hace: Marca que ya tiene todo lo que pudo
    conseguir y va hacia caja. Notifica al cajero.
    Body: curl http://localhost:5120/api/OrdenVenta/1/Lista \
  --request POST
  ---
  OPERADOR — valida físicamente y cierra la venta

  Endpoint: POST
    /api/OrdenVenta/{id}/Items/{itemId}/Confirmar
  Qué hace: Escanea un producto regular o kit completo.

    En este momento se descuenta el stock real.
    Body: curl http://localhost:5120/api/OrdenVenta/1/Items/1/Confirmar \
  --request POST

  Path Parameters
idCopy link to id
Type:integer
Format:int32
required
Signed 32-bit integers (commonly used integer type).

itemIdCopy link to itemId
Type:integer
Format:int32
required
Signed 32-bit integers (commonly used integer type).
  ────────────────────────────────────────
  Endpoint: POST
    /api/OrdenVenta/{id}/Items/{itemId}/Piezas/{piezaIt
  emId}/Confirmar
  Qué hace: Escanea una pieza suelta de kit parcial. El

    operador pone el precio manualmente. Descuenta
  stock
     de esa pieza.
     Body:
     curl http://localhost:5120/api/OrdenVenta/1/Items/1/Piezas/1/Confirmar \
  --request POST \
  --header 'Content-Type: application/json' \
  --data '{
  "precioUnitario": 0.01
}'
Path Parameters
idCopy link to id
Type:integer
Format:int32
required
Signed 32-bit integers (commonly used integer type).

itemIdCopy link to itemId
Type:integer
Format:int32
required
Signed 32-bit integers (commonly used integer type).

piezaItemIdCopy link to piezaItemId
Type:integer
Format:int32
required
Signed 32-bit integers (commonly used integer type).

Body
required
Selected Content Type:
application/json
precioUnitarioCopy link to precioUnitario
Type:number
Format:double
min:  
0.01
required
Responses
200Copy link to 200
OK
  ────────────────────────────────────────
  Endpoint: POST /api/OrdenVenta/{id}/Completar
  Qué hace: Cierra la venta. Calcula el total de lo
    confirmado, crea el movimiento en la caja del
  cajero
     como ingreso de Ventas, y notifica a todos via
    SignalR.
    Body: 
    curl http://localhost:5120/api/OrdenVenta/1/Completar \
  --request POST \
  --header 'Content-Type: application/json' \
  --data '{
  "tipoPago": ""
}'
Path Parameters
idCopy link to id
Type:integer
Format:int32
required
Signed 32-bit integers (commonly used integer type).

Body
required
Selected Content Type:
application/json
tipoPagoCopy link to tipoPago
Type:string
required
Responses
200Copy link to 200
OK
  ---
  Flujo resumido:

  Cajero crea orden
      ↓ SignalR → Almaceneros ven NuevaOrden
  Almacenero acepta
      ↓ SignalR → Cajero ve OrdenAceptada
  Almacenero marca ítems incompletos (opcional)
  Almacenero marca Lista
      ↓ SignalR → Cajero ve OrdenLista
  Operador escanea cada producto/pieza
  Operador completa
      ↓ Stock descontado, MovimientoCaja creado,
  SignalR OrdenCompletada
