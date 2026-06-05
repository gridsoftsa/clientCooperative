<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { TrdActiveVersionConsultData } from '~/types/archival-trd'
import { buildTrdSpreadsheetFilename } from '~/utils/trd-spreadsheet-view'

definePageMeta({
  layout: 'blank',
  middleware: 'permission',
  permissions: 'trd_tablas_ver',
})

const route = useRoute()
const router = useRouter()
const trdApi = useTrdApi()
const { downloadReportFile } = useReportExport()

const orgUnitId = computed(() => {
  const raw = route.query.org_unit_id
  const parsed = Number(Array.isArray(raw) ? raw[0] : raw)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
})

const loading = ref(true)
const exporting = ref(false)
const message = ref('')
const result = ref<TrdActiveVersionConsultData | null>(null)

async function load() {
  if (orgUnitId.value == null) {
    message.value = 'Parámetro org_unit_id inválido.'
    loading.value = false
    return
  }

  loading.value = true
  message.value = ''
  result.value = null

  try {
    const res = await trdApi.fetchActiveVersion(orgUnitId.value)
    if (!res.data) {
      message.value = res.message ?? 'No hay TRD vigente para esta área.'
      return
    }
    result.value = res.data
  } catch {
    message.value = 'No se pudo cargar la TRD vigente.'
  } finally {
    loading.value = false
  }
}

function printSheet() {
  if (import.meta.client) {
    window.print()
  }
}

async function downloadExcel() {
  if (orgUnitId.value == null || !result.value) {
    return
  }

  exporting.value = true
  try {
    await downloadReportFile(
      '/archival/trd-tables/active-version/export',
      { org_unit_id: orgUnitId.value, format: 'xlsx' },
      buildTrdSpreadsheetFilename(result.value),
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    toast.success('Excel descargado')
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'No se pudo descargar el Excel')
  } finally {
    exporting.value = false
  }
}

function closeTab() {
  if (import.meta.client) {
    window.close()
  }
}

onMounted(load)

watch(orgUnitId, () => {
  load()
})
</script>

<template>
  <div class="min-h-screen bg-slate-100 text-slate-900">
    <div class="no-print sticky top-0 z-20 border-b border-slate-300 bg-white/95 backdrop-blur px-4 py-3">
      <div class="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3">
        <div>
          <p class="text-sm font-semibold">
            TRD — vista formato hoja de cálculo
          </p>
          <p v-if="result" class="text-xs text-slate-600">
            {{ result.trd_table.org_unit?.name }} · versión {{ result.version.version_number }}
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button variant="outline" size="sm" :disabled="!result" @click="printSheet">
            <Icon name="i-lucide-printer" class="mr-2 h-4 w-4" />
            Imprimir
          </Button>
          <Button variant="outline" size="sm" :disabled="!result || exporting" @click="downloadExcel">
            <Icon
              :name="exporting ? 'i-lucide-loader-2' : 'i-lucide-file-spreadsheet'"
              class="mr-2 h-4 w-4"
              :class="{ 'animate-spin': exporting }"
            />
            Descargar Excel
          </Button>
          <Button variant="ghost" size="sm" @click="router.push('/settings/archival/trd/consult')">
            Volver a consulta
          </Button>
          <Button variant="ghost" size="sm" @click="closeTab">
            Cerrar
          </Button>
        </div>
      </div>
    </div>

    <div class="mx-auto max-w-[1400px] p-4 print:p-0">
      <div v-if="loading" class="flex justify-center py-24">
        <Icon name="i-lucide-loader-2" class="h-10 w-10 animate-spin text-slate-500" />
      </div>

      <Alert v-else-if="message" class="no-print">
        <AlertDescription>{{ message }}</AlertDescription>
      </Alert>

      <ArchivalTrdSpreadsheetView v-else-if="result" :data="result" />
    </div>
  </div>
</template>

<style scoped>
@media print {
  :global(body) {
    background: #fff !important;
  }

  .no-print {
    display: none !important;
  }
}
</style>
