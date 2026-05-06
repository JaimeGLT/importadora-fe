# Modelo de Kits — Documentación Técnica

## 1. Resumen

Un **kit** es un producto especial que está compuesto por otras piezas. Cada pieza dentro de un kit es un **producto totalmente nuevo y diferente** del inventario, aunque comparta código y nombre con otro producto existente.

Las piezas del kit **NO aparecen en el módulo de inventario general**. Solo son visibles dentro del contexto de edición del kit.

---

## 2. Tipos de Productos

El sistema maneja tres tipos de productos:

### 2.1 Producto Simple
- Producto normal del inventario
- Tiene stock propio e independiente
- Puede venderse de forma individual
- **Visible en el módulo de inventario**

### 2.2 Kit (Producto Padre)
- Producto marcado con `es_kit: true`
- Está compuesto por uno o más productos del inventario
- Su "stock" es **calculado automáticamente** según las piezas disponibles
- **Visible en el módulo de inventario**

### 2.3 Pieza de Kit
- Es un **producto completamente nuevo y diferente** del inventario
- Se crea a partir de un producto existente (para copiar código y nombre)
- **NO modifica el producto original** — son productos totalmente separados
- El mismo código puede existir como producto simple y también como pieza de kit (son productos distintos con IDs diferentes)
- Se relaciona con el kit a través de la tabla `KitRelacion`
- **NO visible en el módulo de inventario general** — solo aparece dentro del kit que lo contiene

---

## 3. Estructura de Datos

### 3.1 Campos nuevos en `Producto`

```typescript
interface Producto {
  // ... campos existentes ...

  es_kit: boolean           // true = este producto es un kit
  kit_id: string | null    // ID del kit al que pertenece (null = no es pieza de ningún kit)
  cantidad_por_kit: number  // cuántas unidades de esta parte forman 1 kit (default 1)
}
```

**Notas:**
- `es_kit: true` → el producto es un kit (producto padre)
- `kit_id: "kit-123"` → esta pieza pertenece al kit "kit-123"
- `cantidad_por_kit: 3` → se necesitan 3 unidades de esta pieza para formar 1 kit
- Una pieza con `kit_id` no es visible en el módulo de inventario general

### 3.2 Tabla `KitRelacion`

```typescript
interface KitRelacion {
  kit_id: string      // ID del kit (producto con es_kit: true)
  producto_id: string // ID del producto (pieza del kit)
  cantidad: number    // cuántas de este producto se necesitan para 1 kit
}
```

**Ejemplo:**
```
KitRelacion:
  kit_id: "kit-embrague", producto_id: "pieza-plato-001", cantidad: 1
  kit_id: "kit-embrague", producto_id: "pieza-disco-002", cantidad: 1
  kit_id: "kit-embrague", producto_id: "pieza-collarin-003", cantidad: 1

Inventario (todos los productos):
  - "kit-embrague": es_kit = true, kit_id = null
  - "pieza-plato-001": código "PLATO-ABC", stock = 10, kit_id = "kit-embrague"
  - "pieza-disco-002": código "DISCO-XYZ", stock = 8, kit_id = "kit-embrague"
  - "pieza-collarin-003": código "COLLARIN-123", stock = 5, kit_id = "kit-embrague"
  - "plato-embrague": código "PLATO-ABC", stock = 20, kit_id = null ← PRODUCTO SIMPLE

Visibilidad en módulo de inventario:
  ✓ "kit-embrague" (es kit)
  ✓ "plato-embrague" (producto simple)
  ✗ "pieza-plato-001" (solo visible dentro del kit)
  ✗ "pieza-disco-002" (solo visible dentro del kit)
  ✗ "pieza-collarin-003" (solo visible dentro del kit)
```

**Observar:** "pieza-plato-001" y "plato-embrague" tienen el mismo código "PLATO-ABC" pero son productos TOTALMENTE diferentes. Uno pertenece al kit y el otro es un producto simple.

---

## 4. Flujos

### 4.1 Crear un Kit

1. Seleccionar un producto existente del inventario (o crear uno nuevo)
2. Marcar checkbox "Este producto es un kit"
3. Agregar las piezas que componen el kit:
   - Buscar producto existente para copiar código y nombre
   - El sistema crea un producto NUEVO con esos datos
   - Indicar la cantidad necesaria para formar 1 kit
4. Guardar → Se crean productos nuevos en el inventario (solo visibles dentro del kit) y se crean los registros en `KitRelacion`

**Nota:** El producto original del inventario no se modifica. Solo se usa como referencia para crear la pieza del kit.

### 4.2 Agregar Pieza a un Kit Existente

1. Editar el producto kit
2. En la sección de kit, buscar un producto del inventario
3. El sistema crea un producto NUEVO copiando código y nombre
4. Indicar la cantidad por kit
5. Guardar → Se crea el producto nuevo Y se agrega al kit

**Nota:** No se modifica el producto original. Se crea una copia nueva. La pieza creada **NO aparece en el módulo de inventario general**.

### 4.3 Crear Pieza Nueva (dentro del kit)

Si la pieza no existe en el inventario, se puede crear ahí mismo:

1. En la sección de kit, clic en "Crear pieza nueva"
2. Ingresar nombre (obligatorio) y código (opcional)
3. Si no se ingresa código, se genera uno automáticamente: `AUTO-{timestamp}`
4. Guardar → Se crea el producto en el inventario Y se agrega al kit

**La pieza creada NO aparece en el módulo de inventario general.**

### 4.4 Editar una Pieza del Kit

Desde la lista de piezas del kit, se puede editar:
- Nombre
- Código
- Cantidad por kit

Estos cambios afectan al producto (pieza) del kit.

### 4.5 Eliminar Pieza del Kit

Al eliminar una pieza del kit:
- Se elimina el producto del inventario
- Se elimina la relación en `KitRelacion`

### 4.6 Importar Kits por Excel

Cuando se importa un producto que en el inventario está marcado como kit:

1. Se verifica si el producto existe y tiene piezas definidas (`KitRelacion`)
2. El stock importado se suma al stock del kit
3. Las piezas del kit **NO reciben stock automáticamente** en esta versión


### 4.7 Vender Kit Completo

Cuando se vende un kit completo:

1. Se verifica que el producto tenga `es_kit: true`
2. Se descuenta 1 unidad del stock del kit (si tiene stock propio)
3. Para cada pieza en `KitRelacion`:
   - Se descuenta `cantidad` del stock de la pieza

```
Ejemplo: Venta de 1 "Kit Embrague"

Kit Embrague:
  - stock -= 1

KitRelacion → Pieza Plato Embrague (cantidad: 1):
  - pieza_plato_embrague.stock -= 1

KitRelacion → Pieza Disco Embrague (cantidad: 1):
  - pieza_disco_embrague.stock -= 1

KitRelacion → Pieza Collarín (cantidad: 1):
  - pieza_collarin.stock -= 1
```

**Importante:** Los productos simples del inventario (que no tienen `kit_id`) no se ven afectados aunque tengan el mismo código.

### 4.8 Vender Pieza Suelta

Cuando se vende una pieza suelta (producto que tiene `kit_id`):

1. Se descuenta normalmente del stock del producto
2. El stock del kit **SÍ se recalcula** porque se reduce la cantidad de piezas disponibles

**Ejemplo:**
```
Kit Embrague con 3 piezas:
  - Pieza Plato: stock = 9, cantidad_por_kit = 1
  - Pieza Disco: stock = 7, cantidad_por_kit = 1
  - Pieza Collarín: stock = 4, cantidad_por_kit = 1

Stock calculado del kit ANTES de venta: min(10, 7, 4) = 4

Se vende 1 "Pieza Plato Embrague" suelta:
  - Pieza Plato: stock = 9 (10 - 1)

Stock calculado del kit DESPUÉS de venta: min(9, 7, 4) = 3

El kit pierde 1 kit disponible porque se usó 1 pieza del kit para venta suelta.
```

### 4.9 Stock Calculado del Kit

El stock disponible de un kit se calcula así:

```
stock_kit = min( stock_pieza[i] / cantidad_por_kit[i] ) para cada pieza i
```

**Ejemplo:**
```
Kit Embrague con 3 piezas:
  - Pieza Plato: stock = 10, cantidad_por_kit = 1  → 10/1 = 10 kits posibles
  - Pieza Disco: stock = 6, cantidad_por_kit = 1   → 6/1 = 6 kits posibles
  - Pieza Collarín: stock = 4, cantidad_por_kit = 1 → 4/1 = 4 kits posibles

Stock calculado del kit = min(10, 6, 4) = 4 kits
```

**El stock calculado es informativo, no editable.**

---

## 5. Reglas de Negocio

1. **Un producto puede pertenecer a múltiples kits** — La misma pieza puede aparecer en diferentes kits con diferentes cantidades.

2. **Vender pieza suelta SÍ afecta al kit** — Si vendés una pieza que es parte de un kit, el stock del kit se recalcula (disminuye).

3. **Stock del kit es calculado** — El campo `stock` del kit puede existir para guardar stock importado manualmente, pero el stock "real" se calcula.

4. **Importación no reparte stock** — Al importar un kit con stock, las piezas no reciben stock automáticamente.

5. **Eliminar pieza del kit elimina el producto** — Se elimina el producto y la relación en `KitRelacion`.

6. **Código opcional para piezas nuevas** — Si se crea una pieza sin código, se genera uno automáticamente (`AUTO-{timestamp}`).

7. **Productos independientes aunque compartan código** — Un producto simple y una pieza de kit pueden tener el mismo código pero son productos completamente diferentes con IDs distintas y stock independiente.

8. **Las piezas del kit no son visibles en el inventario general** — Solo aparecen dentro del contexto de edición del kit que las contiene.

---

## 6. Ejemplo Completo de un Flujo

### Paso 1: Crear el kit
```
Producto existente: "Kit Embrague Completo"
  - es_kit: true
  - stock: 0
```

### Paso 2: Agregar pieza "Plato Embrague" desde búsqueda

1. Buscar producto "Plato Embrague" en el inventario
2. El inventario tiene "Plato Embrague" con código "PLATO-ABC" stock = 20 (producto simple)
3. El sistema crea un producto NUEVO:
   - ID: nueva-id-unica
   - Código: "PLATO-ABC" (copiado)
   - Nombre: "Plato Embrague" (copiado)
   - Stock: 0
   - kit_id: "kit-embrague"
4. **Este producto NO aparece en el módulo de inventario general**

### Paso 3: Repetir para otras piezas

```
Inventario después de crear las 3 piezas:

Kit Embrague (visible en inventario):
  - "kit-embrague": es_kit = true, stock = 0

Piezas del kit (NO visibles en inventario, solo dentro del kit):
  - pieza-plato-001: código "PLATO-ABC", stock = 10, kit_id = "kit-embrague"
  - pieza-disco-002: código "DISCO-XYZ", stock = 8, kit_id = "kit-embrague"
  - pieza-collarin-003: código "COLLARIN-123", stock = 5, kit_id = "kit-embrague"

KitRelacion:
  - kit-embrague → pieza-plato-001, cantidad: 1
  - kit-embrague → pieza-disco-002, cantidad: 1
  - kit-embrague → pieza-collarin-003, cantidad: 1

Productos simples (visibles en inventario):
  - plato-embrague: código "PLATO-ABC", stock = 20, kit_id = null
  - disco-embrague: código "DISCO-XYZ", stock = 15, kit_id = null
```

**Observación:** Los productos simples "plato-embrague" y la pieza "pieza-plato-001" tienen el mismo código "PLATO-ABC" pero son productos TOTALMENTE diferentes.

### Paso 4: Venta de 1 kit

```
Se vende 1 "Kit Embrague Completo"

Resultado (solo piezas del kit):
  - pieza-plato-001: stock = 9 (10 - 1)
  - pieza-disco-002: stock = 7 (8 - 1)
  - pieza-collarin-003: stock = 4 (5 - 1)

Stock calculado del kit = min(9, 7, 4) = 4 kits

Productos simples (NO son parte del kit, NO se afectan):
  - plato-embrague: stock = 20 (sin cambio)
  - disco-embrague: stock = 15 (sin cambio)
```

### Paso 5: Venta suelta de una pieza

```
Se vende 1 "Pieza Plato Embrague" (producto con kit_id)

Resultado:
  - pieza-plato-001: stock = 9 (10 - 1)

Stock calculado del kit = min(9, 7, 4) = 3 kits

El kit pierde 1 kit disponible porque se usó 1 pieza.
```

---

## 7. Notas para el Backend

- La tabla `KitRelacion` debe tener constraint única en `(kit_id, producto_id)` para evitar duplicados.
- Cuando se elimina un kit (`es_kit = false`), se deben eliminar las piezas del kit (productos con `kit_id = este-kit`) y sus registros en `KitRelacion`.
- Cuando se elimina una pieza del kit, se elimina el producto y el registro de `KitRelacion`.
- Al consultar un producto que es kit, incluir sus piezas con un JOIN a `KitRelacion`.
- El campo `stock` del kit puede existir para guardar stock importado manualmente, pero el stock "real" siempre se calcula a partir de las piezas.
- Un producto puede tener `kit_id` null pero compartir código con un producto que tiene `kit_id` (son productos diferentes).
- **Filtrado en listado de inventario:** Para mostrar solo productos del inventario general, filtrar por `kit_id IS NULL`. Para mostrar kits, filtrar por `es_kit = true`.
