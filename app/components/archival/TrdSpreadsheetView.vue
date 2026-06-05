<script setup lang="ts">
import type { TrdSpreadsheetGlossaryContext } from '~/constants/trd-spreadsheet-glossary'
import type { TrdActiveVersionConsultData } from '~/types/archival-trd'
import { buildTrdSpreadsheetRows } from '~/utils/trd-spreadsheet-view'

const props = defineProps<{
  data: TrdActiveVersionConsultData
}>()

const rows = computed(() => buildTrdSpreadsheetRows(props.data))

const glossaryContext = computed((): TrdSpreadsheetGlossaryContext => ({
  producerOfficeCode: props.data.version.producer_office_code,
  producerOfficeName: props.data.version.producer_office_name,
  orgUnitName: props.data.trd_table.org_unit?.name ?? null,
  orgUnitCode: props.data.trd_table.org_unit?.code ?? null,
}))

const orgUnitLabel = computed(() => {
  const unit = props.data.trd_table.org_unit
  if (!unit) {
    return '—'
  }

  return `${unit.name} (${unit.code})`
})

const validityLabel = computed(() => {
  const from = props.data.version.effective_from
  const to = props.data.version.effective_to

  if (!from && !to) {
    return '—'
  }

  return `${from ?? '—'} → ${to ?? 'sin fin'}`
})

function formatYears(value: number | null): string {
  if (value == null) {
    return '—'
  }

  return String(value)
}

const dataColumnCount = 16
</script>

<template>
  <div class="trd-spreadsheet-root bg-white text-slate-900">
    <div class="trd-spreadsheet-header border border-slate-400 bg-[#f3f3f3] p-4 text-center space-y-2">
      <p class="text-xs uppercase tracking-wide text-slate-600">
        Formato ADM-GD-FO-01
      </p>
      <h1 class="text-lg font-bold uppercase leading-tight">
        Tabla de retención documental (TRD)
      </h1>
      <div class="grid gap-2 text-left text-xs sm:grid-cols-2 lg:grid-cols-4">
        <p><span class="font-semibold">Área productora:</span> {{ orgUnitLabel }}</p>
        <p><span class="font-semibold">Oficina productora:</span> {{ data.version.producer_office_name }} ({{ data.version.producer_office_code }})</p>
        <p><span class="font-semibold">Versión TRD:</span> {{ data.version.version_number }} · Vigente</p>
        <p><span class="font-semibold">Aprobación:</span> {{ data.version.approved_at ?? '—' }}</p>
        <p class="sm:col-span-2 lg:col-span-4">
          <span class="font-semibold">Vigencia:</span> {{ validityLabel }}
        </p>
      </div>
    </div>

    <ArchivalTrdSpreadsheetGlossary :context="glossaryContext" />

    <div class="overflow-x-auto border border-t-0 border-slate-400">
      <table class="trd-spreadsheet-table w-full min-w-[980px] border-collapse text-[11px] leading-tight">
        <thead>
          <tr class="bg-[#0f766e] text-white">
            <th rowspan="2" class="trd-sheet-cell w-10">
              No.
            </th>
            <th colspan="2" class="trd-sheet-cell">
              Serie documental
            </th>
            <th colspan="2" class="trd-sheet-cell">
              Subserie documental
            </th>
            <th colspan="2" class="trd-sheet-cell">
              Tipo documental
            </th>
            <th rowspan="2" class="trd-sheet-cell w-20">
              Soporte
            </th>
            <th colspan="3" class="trd-sheet-cell">
              Retención (años)
            </th>
            <th colspan="4" class="trd-sheet-cell">
              Disposición final
            </th>
            <th rowspan="2" class="trd-sheet-cell min-w-[14rem]">
              Procedimiento
            </th>
          </tr>
          <tr class="bg-[#115e59] text-white">
            <th class="trd-sheet-cell w-20">
              Código
            </th>
            <th class="trd-sheet-cell min-w-[8rem]">
              Nombre
            </th>
            <th class="trd-sheet-cell w-20">
              Código
            </th>
            <th class="trd-sheet-cell min-w-[8rem]">
              Nombre
            </th>
            <th class="trd-sheet-cell w-24">
              Código
            </th>
            <th class="trd-sheet-cell min-w-[10rem]">
              Nombre
            </th>
            <th class="trd-sheet-cell w-12">
              AG
            </th>
            <th class="trd-sheet-cell w-12">
              AC
            </th>
            <th class="trd-sheet-cell w-12">
              AH
            </th>
            <th class="trd-sheet-cell w-8" title="Conservación total">
              C
            </th>
            <th class="trd-sheet-cell w-8" title="Selección">
              S
            </th>
            <th class="trd-sheet-cell w-8" title="Eliminación">
              E
            </th>
            <th class="trd-sheet-cell w-8" title="Digitalización">
              D
            </th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="rows.length === 0">
            <td :colspan="dataColumnCount" class="trd-sheet-cell py-8 text-center text-slate-500">
              No hay tipos documentales asociados a la TRD vigente.
            </td>
          </tr>
          <tr
            v-for="row in rows"
            :key="`${row.seriesCode}-${row.subseriesCode}-${row.documentTypeCode}-${row.rowNumber}`"
            :class="row.hasEffectiveRule ? 'bg-white' : 'bg-red-50'"
          >
            <td class="trd-sheet-cell text-center tabular-nums">
              {{ row.rowNumber }}
            </td>
            <td class="trd-sheet-cell font-mono">
              {{ row.seriesCode }}
            </td>
            <td class="trd-sheet-cell">
              {{ row.seriesName }}
            </td>
            <td class="trd-sheet-cell font-mono">
              {{ row.subseriesCode }}
            </td>
            <td class="trd-sheet-cell">
              {{ row.subseriesName }}
            </td>
            <td class="trd-sheet-cell font-mono">
              {{ row.documentTypeCode }}
            </td>
            <td class="trd-sheet-cell">
              {{ row.documentTypeName }}
            </td>
            <td class="trd-sheet-cell text-center">
              {{ row.allowedSupport }}
            </td>
            <td class="trd-sheet-cell text-center tabular-nums">
              {{ formatYears(row.yearsManagement) }}
            </td>
            <td class="trd-sheet-cell text-center tabular-nums">
              {{ formatYears(row.yearsCentral) }}
            </td>
            <td class="trd-sheet-cell text-center tabular-nums text-slate-600">
              {{ formatYears(row.yearsHistorical) }}
            </td>
            <td class="trd-sheet-cell text-center font-semibold">
              {{ row.dispositionMarks.c }}
            </td>
            <td class="trd-sheet-cell text-center font-semibold">
              {{ row.dispositionMarks.s }}
            </td>
            <td class="trd-sheet-cell text-center font-semibold">
              {{ row.dispositionMarks.e }}
            </td>
            <td class="trd-sheet-cell text-center font-semibold">
              {{ row.dispositionMarks.d }}
            </td>
            <td class="trd-sheet-cell align-top whitespace-pre-wrap">
              {{ row.procedureText }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <p class="border border-t-0 border-slate-400 px-3 py-2 text-[10px] text-slate-600">
      Filas resaltadas en rojo claro no tienen regla de retención efectiva.
    </p>
  </div>
</template>

<style scoped>
.trd-sheet-cell {
  border: 1px solid #94a3b8;
  padding: 0.35rem 0.45rem;
  vertical-align: top;
}

@media print {
  .trd-spreadsheet-root {
    break-inside: avoid;
  }

  .trd-spreadsheet-table {
    font-size: 8pt;
  }

  .trd-sheet-cell {
    padding: 0.2rem 0.25rem;
  }
}
</style>
