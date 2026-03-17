<script setup lang="ts">
/**
 * Tabla editable de Productos (plantilla comercial).
 * Columnas: PRODUCTO | PRECIO COMPRA | PRECIO DE VENTA | % UTILIDAD | % COSTOS
 * Permite agregar filas dinámicamente.
 */

export interface ProductoRow {
  producto: string
  precio_compra: number | null
  precio_venta: number | null
}

const DEFAULT_INITIAL_ROWS = 6

const props = defineProps<{
  formData: Record<string, unknown>
}>()

const emit = defineEmits<{
  'update:field': [payload: { key: string; value: unknown }]
}>()

function setField(key: string, value: unknown) {
  emit('update:field', { key, value })
}

function getProductosArray(): ProductoRow[] {
  const raw = props.formData?.productos
  if (!props.formData || !Array.isArray(raw) || raw.length === 0) {
    return Array.from({ length: DEFAULT_INITIAL_ROWS }, () => ({
      producto: '',
      precio_compra: null,
      precio_venta: null,
    }))
  }
  return raw.map((r: unknown) => {
    const item = r as Record<string, unknown>
    return {
      producto: String(item.producto ?? ''),
      precio_compra: item.precio_compra != null && typeof item.precio_compra === 'number' ? item.precio_compra : null,
      precio_venta: item.precio_venta != null && typeof item.precio_venta === 'number' ? item.precio_venta : null,
    }
  })
}

const productosRows = computed(() => getProductosArray())

function updateProducto(index: number, field: keyof ProductoRow, value: string | number | null) {
  const rows = [...productosRows.value]
  while (rows.length <= index) {
    rows.push({ producto: '', precio_compra: null, precio_venta: null })
  }
  const row = rows[index] ?? { producto: '', precio_compra: null, precio_venta: null }
  if (field === 'producto') {
    row.producto = String(value ?? '')
  } else if (field === 'precio_compra') {
    row.precio_compra = value != null && typeof value === 'number' ? value : null
  } else if (field === 'precio_venta') {
    row.precio_venta = value != null && typeof value === 'number' ? value : null
  }
  rows[index] = row
  setField('productos', rows)
}

function addRow() {
  const rows = [...productosRows.value]
  rows.push({ producto: '', precio_compra: null, precio_venta: null })
  setField('productos', rows)
}

/**
 * % Utilidad según fórmula Excel:
 * =SI(ESERROR((Precio compra/Precio venta)-1);"0";((Precio compra/Precio venta)-1))*-1
 * Equivale a: (1 - compra/venta) = (venta - compra) / venta, en porcentaje.
 * Si hay error (división por cero, etc.) → 0.
 */
function computePctUtilidad(compra: number | null, venta: number | null): number {
  const c = compra != null && Number.isFinite(compra) ? compra : 0
  const v = venta != null && Number.isFinite(venta) ? venta : 0
  if (v <= 0) return 0
  const ratio = c / v
  const u = (-1) * (ratio - 1)
  const pct = u * 100
  return Number.isFinite(pct) ? Math.round(pct) : 0
}

/**
 * % Costos según fórmula Excel:
 * =SI(ESERROR(Precio de compra/precio de venta);"0";Precio de compra/precio de venta)
 * Equivale a: Precio compra / Precio venta, en porcentaje (×100).
 * Si hay error (división por cero, etc.) → 0.
 */
function computePctCostos(compra: number | null, venta: number | null): number {
  const c = compra != null && Number.isFinite(compra) ? compra : 0
  const v = venta != null && Number.isFinite(venta) ? venta : 0
  if (v <= 0) return 0
  const pct = (c / v) * 100
  return Number.isFinite(pct) ? Math.round(pct) : 0
}

/**
 * MARGEN TOTAL - Fórmulas equivalentes a Excel:
 * SUMAR.SI(% utilidad; ">0"; valores)  → suma solo los > 0
 * Resultado = suma / CONTAR.SI(% utilidad; ">0")  → promedio de los > 0
 * Igual para % costos.
 */
const margenTotal = computed(() => {
  let sumPctUtilidad = 0
  let countPctUtilidad = 0
  let sumPctCostos = 0
  let countPctCostos = 0
  for (const row of productosRows.value) {
    const pctU = computePctUtilidad(row.precio_compra, row.precio_venta)
    const pctC = computePctCostos(row.precio_compra, row.precio_venta)
    if (pctU > 0) {
      sumPctUtilidad += pctU
      countPctUtilidad += 1
    }
    if (pctC > 0) {
      sumPctCostos += pctC
      countPctCostos += 1
    }
  }
  return {
    pctUtilidad: countPctUtilidad > 0 ? Math.round(sumPctUtilidad / countPctUtilidad) : 0,
    pctCostos: countPctCostos > 0 ? Math.round(sumPctCostos / countPctCostos) : 0,
  }
})

/** Sincroniza el margen total a formData para que SemanasDiasTable use los % de productos */
watch(
  margenTotal,
  (val) => {
    setField('pct_utilidad_productos', val.pctUtilidad)
    setField('pct_costos_productos', val.pctCostos)
  },
  { immediate: true },
)
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="overflow-x-auto">
      <table class="w-full min-w-[520px] table-fixed border-collapse text-sm">
        <colgroup>
          <col>
          <col style="width: 10rem">
          <col style="width: 10rem">
          <col style="width: 6rem">
          <col style="width: 6rem">
        </colgroup>
        <thead>
          <tr>
            <th class="border border-black bg-[#f4d03f] px-3 py-2 text-left font-bold uppercase text-black">
              PRODUCTO
            </th>
            <th class="border border-black bg-[#f4d03f] px-3 py-2 text-center font-bold uppercase text-black">
              PRECIO COMPRA
            </th>
            <th class="border border-black bg-[#f4d03f] px-3 py-2 text-center font-bold uppercase text-black">
              PRECIO DE VENTA
            </th>
            <th class="border border-black bg-[#f4d03f] px-3 py-2 text-center font-bold uppercase text-black">
              % UTILIDAD
            </th>
            <th class="border border-black bg-[#f4d03f] px-3 py-2 text-center font-bold uppercase text-black">
              % COSTOS
            </th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(row, idx) in productosRows"
            :key="idx"
            class="bg-white"
          >
            <td class="border border-black p-1">
              <input
                type="text"
                :value="row.producto"
                class="h-9 w-full rounded border border-input bg-transparent px-2 py-1 text-sm"
                placeholder="Nombre producto"
                @input="updateProducto(idx, 'producto', ($event.target as HTMLInputElement).value)"
              >
            </td>
            <td class="border border-black p-1">
              <CreditsBaseMoneyInput
                :model-value="row.precio_compra"
                placeholder="-"
                @update:model-value="updateProducto(idx, 'precio_compra', $event)"
              />
            </td>
            <td class="border border-black p-1">
              <CreditsBaseMoneyInput
                :model-value="row.precio_venta"
                placeholder="-"
                @update:model-value="updateProducto(idx, 'precio_venta', $event)"
              />
            </td>
            <td class="border border-black px-3 py-2 text-center tabular-nums text-black">
              {{ computePctUtilidad(row.precio_compra, row.precio_venta) }}%
            </td>
            <td class="border border-black px-3 py-2 text-center tabular-nums text-black">
              {{ computePctCostos(row.precio_compra, row.precio_venta) }}%
            </td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="bg-[#f4d03f] font-bold">
            <td
              colspan="2"
              class="border border-black px-3 py-2 text-left uppercase text-black"
            >
              MARGEN TOTAL
            </td>
            <td class="border border-black px-3 py-2" />
            <td class="border border-black px-3 py-2 text-center tabular-nums text-black">
              {{ margenTotal.pctUtilidad != null ? `${margenTotal.pctUtilidad}%` : '0%' }}
            </td>
            <td class="border border-black px-3 py-2 text-center tabular-nums text-black">
              {{ margenTotal.pctCostos != null ? `${margenTotal.pctCostos}%` : '0' }}
            </td>
          </tr>
        </tfoot>
      </table>
    </div>
    <div class="flex justify-end">
      <button
        type="button"
        class="inline-flex items-center gap-1.5 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-xs transition-colors hover:bg-muted"
        @click="addRow"
      >
        <Icon name="lucide:plus" class="size-4" />
        Agregar línea
      </button>
    </div>
  </div>
</template>
