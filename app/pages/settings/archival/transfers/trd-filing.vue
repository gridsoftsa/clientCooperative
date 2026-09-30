<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { DocDocumentTypeRow, DocSeriesRow, DocSubseriesRow } from '~/types/archival-catalog'
import { messageFromFetchError } from '~/utils/http-error-message'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: ['trd_tablas_editar', 'trd_tablas_ver', 'trd_catalogo_ver'],
})

interface CatalogSelectOption {
  value: number
  label: string
  title: string
  subtitle: string
}

const router = useRouter()
const api = useArchivalLifecycleApi()
const catalogApi = useArchivalCatalogApi()

const saving = ref(false)
const loadingPage = ref(true)
const loadingSeries = ref(false)
const loadingSubseries = ref(false)
const loadingTypes = ref(false)
const restoring = ref(false)

const orgUnitId = ref<number | null>(null)
const seriesId = ref<number | null>(null)
const subseriesId = ref<number | null>(null)
const typeId = ref<number | null>(null)

const units = ref<Array<{ id: number, name: string, code: string }>>([])
const series = ref<DocSeriesRow[]>([])
const subseries = ref<DocSubseriesRow[]>([])
const types = ref<DocDocumentTypeRow[]>([])

function catalogOption(id: number, code: string, name: string): CatalogSelectOption {
  const safeCode = code.trim()
  const safeName = name.trim()

  return {
    value: id,
    label: `${safeCode} — ${safeName}`,
    title: safeName,
    subtitle: safeCode,
  }
}

const unitOptions = computed(() =>
  units.value.map(unit => catalogOption(unit.id, unit.code, unit.name)),
)

const seriesOptions = computed(() =>
  series.value.map(row => catalogOption(row.id, row.code, row.name)),
)

const subseriesOptions = computed(() =>
  subseries.value.map(row => catalogOption(row.id, row.code, row.name)),
)

const typeOptions = computed(() =>
  types.value.map(row => catalogOption(row.id, row.code, row.name)),
)

const selectedUnit = computed(() => units.value.find(unit => unit.id === orgUnitId.value) ?? null)
const selectedSeries = computed(() => series.value.find(row => row.id === seriesId.value) ?? null)
const selectedSubseries = computed(() => subseries.value.find(row => row.id === subseriesId.value) ?? null)
const selectedType = computed(() => types.value.find(row => row.id === typeId.value) ?? null)

const classificationComplete = computed(() =>
  orgUnitId.value != null
  && seriesId.value != null
  && subseriesId.value != null
  && typeId.value != null,
)

const canEdit = computed(() => !saving.value && !loadingPage.value)

async function loadUnits() {
  units.value = await api.fetchTransferAllowedOrgUnits()
  if (units.value.length === 1 && orgUnitId.value == null) {
    orgUnitId.value = units.value[0].id
  }
}

async function restoreSetting() {
  if (orgUnitId.value == null) {
    return
  }

  const rows = await api.fetchTransferActTrdSettings(orgUnitId.value)
  const row = rows[0]
  if (!row) {
    return
  }

  restoring.value = true
  try {
    seriesId.value = row.doc_series_id
    loadingSubseries.value = true
    subseries.value = await catalogApi.fetchSubseries(row.doc_series_id)
    subseriesId.value = row.doc_subseries_id
    loadingTypes.value = true
    types.value = await catalogApi.fetchDocumentTypes(row.doc_subseries_id)
    typeId.value = row.doc_document_type_id
  }
  finally {
    loadingSubseries.value = false
    loadingTypes.value = false
    restoring.value = false
  }
}

async function loadSeriesList() {
  restoring.value = true
  series.value = []
  subseries.value = []
  types.value = []
  seriesId.value = null
  subseriesId.value = null
  typeId.value = null
  restoring.value = false

  if (orgUnitId.value == null) {
    return
  }

  loadingSeries.value = true
  try {
    series.value = await catalogApi.fetchSeries(200, orgUnitId.value)
    await restoreSetting()
  }
  finally {
    loadingSeries.value = false
  }
}

async function save() {
  if (!classificationComplete.value || orgUnitId.value == null || seriesId.value == null || subseriesId.value == null || typeId.value == null) {
    toast.error('Complete área, serie, subserie y tipo documental')
    return
  }

  saving.value = true
  try {
    const res = await api.saveTransferActTrdSetting({
      org_unit_id: orgUnitId.value,
      doc_series_id: seriesId.value,
      doc_subseries_id: subseriesId.value,
      doc_document_type_id: typeId.value,
    })
    toast.success(res.message ?? 'Configuración guardada')
  }
  catch (error: unknown) {
    toast.error(messageFromFetchError(error, 'No se pudo guardar'))
  }
  finally {
    saving.value = false
  }
}

watch(orgUnitId, (next, prev) => {
  if (next === prev) {
    return
  }
  void loadSeriesList()
})

watch(seriesId, async (next, prev) => {
  if (restoring.value || next === prev) {
    return
  }

  subseries.value = []
  types.value = []
  subseriesId.value = null
  typeId.value = null
  if (next == null) {
    return
  }

  loadingSubseries.value = true
  try {
    subseries.value = await catalogApi.fetchSubseries(next)
  }
  finally {
    loadingSubseries.value = false
  }
})

watch(subseriesId, async (next, prev) => {
  if (restoring.value || next === prev) {
    return
  }

  types.value = []
  typeId.value = null
  if (next == null) {
    return
  }

  loadingTypes.value = true
  try {
    types.value = await catalogApi.fetchDocumentTypes(next)
  }
  finally {
    loadingTypes.value = false
  }
})

onMounted(async () => {
  loadingPage.value = true
  try {
    await loadUnits()
  }
  catch (error: unknown) {
    toast.error(messageFromFetchError(error, 'No se pudo cargar la configuración'))
  }
  finally {
    loadingPage.value = false
  }
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="flex w-full max-w-2xl flex-col gap-4">
      <Button variant="ghost" size="sm" class="-ml-2 w-fit" @click="router.push('/settings/archival/transfers')">
        <Icon name="i-lucide-arrow-left" class="mr-1 h-4 w-4" />
        Actas
      </Button>

      <div class="space-y-1">
        <h2 class="text-2xl font-bold tracking-tight">
          Ubicación TRD del acta
        </h2>
        <p class="text-sm leading-relaxed text-muted-foreground">
          Elija un valor en cada lista (búsqueda, una sola opción). El PDF del acta quedará radicado en esa clasificación del área y no se publica en biblioteca.
        </p>
      </div>

      <Card>
        <CardHeader class="pb-2">
          <CardTitle class="text-base">
            Clasificación por área
          </CardTitle>
          <CardDescription>
            El orden es obligatorio: área → serie → subserie → tipo documental.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-5">
          <div v-if="loadingPage" class="flex items-center gap-2 py-8 text-sm text-muted-foreground">
            <Icon name="i-lucide-loader-2" class="h-4 w-4 animate-spin" />
            Cargando áreas y catálogo…
          </div>

          <template v-else>
            <div class="space-y-2">
              <Label for="transfer-act-org-unit">Área productora *</Label>
              <ArchivalSingleMultiselect
                id="transfer-act-org-unit"
                :key="`unit-${unitOptions.length}`"
                v-model="orgUnitId"
                coerce-number
                :options="unitOptions"
                :disabled="!canEdit || units.length === 0"
                placeholder="Buscar y seleccionar un área…"
                no-options-text="No tiene áreas productoras asignadas"
                no-results-text="Sin coincidencias"
              >
                <template #option="{ option }">
                  <div class="archival-ms-option">
                    <span class="archival-ms-option-title">{{ option.title }}</span>
                    <span v-if="option.subtitle" class="archival-ms-option-subtitle">{{ option.subtitle }}</span>
                  </div>
                </template>
              </ArchivalSingleMultiselect>
              <p v-if="!units.length" class="text-xs text-destructive">
                No tiene un área productora asignada. Solicite su designación en estructura organizacional.
              </p>
              <p v-else class="text-xs text-muted-foreground">
                Solo aparecen las áreas que tiene designadas (admin y superadmin ven todas).
              </p>
            </div>

            <div class="space-y-2">
              <Label for="transfer-act-series">Serie *</Label>
              <ArchivalSingleMultiselect
                id="transfer-act-series"
                :key="`series-${orgUnitId ?? 'none'}-${seriesOptions.length}`"
                v-model="seriesId"
                coerce-number
                :options="seriesOptions"
                :disabled="!canEdit || orgUnitId == null || loadingSeries"
                :placeholder="orgUnitId == null ? 'Seleccione primero el área' : loadingSeries ? 'Cargando series…' : 'Buscar y seleccionar serie…'"
                no-options-text="El área no tiene series activas"
                no-results-text="Sin coincidencias"
              >
                <template #option="{ option }">
                  <div class="archival-ms-option">
                    <span class="archival-ms-option-title">{{ option.title }}</span>
                    <span v-if="option.subtitle" class="archival-ms-option-subtitle">{{ option.subtitle }}</span>
                  </div>
                </template>
              </ArchivalSingleMultiselect>
              <p class="text-xs text-muted-foreground">
                Series del catálogo TRD de {{ selectedUnit?.name ?? 'el área seleccionada' }}.
              </p>
            </div>

            <div class="space-y-2">
              <Label for="transfer-act-subseries">Subserie *</Label>
              <ArchivalSingleMultiselect
                id="transfer-act-subseries"
                :key="`sub-${seriesId ?? 'none'}-${subseriesOptions.length}`"
                v-model="subseriesId"
                coerce-number
                :options="subseriesOptions"
                :disabled="!canEdit || seriesId == null || loadingSubseries"
                :placeholder="seriesId == null ? 'Seleccione primero la serie' : loadingSubseries ? 'Cargando subseries…' : 'Buscar y seleccionar subserie…'"
                no-options-text="La serie no tiene subseries activas"
                no-results-text="Sin coincidencias"
              >
                <template #option="{ option }">
                  <div class="archival-ms-option">
                    <span class="archival-ms-option-title">{{ option.title }}</span>
                    <span v-if="option.subtitle" class="archival-ms-option-subtitle">{{ option.subtitle }}</span>
                  </div>
                </template>
              </ArchivalSingleMultiselect>
            </div>

            <div class="space-y-2">
              <Label for="transfer-act-type">Tipo documental *</Label>
              <ArchivalSingleMultiselect
                id="transfer-act-type"
                :key="`type-${subseriesId ?? 'none'}-${typeOptions.length}`"
                v-model="typeId"
                coerce-number
                :options="typeOptions"
                :disabled="!canEdit || subseriesId == null || loadingTypes"
                :placeholder="subseriesId == null ? 'Seleccione primero la subserie' : loadingTypes ? 'Cargando tipos…' : 'Buscar y seleccionar tipo documental…'"
                no-options-text="La subserie no tiene tipos documentales activos"
                no-results-text="Sin coincidencias"
              >
                <template #option="{ option }">
                  <div class="archival-ms-option">
                    <span class="archival-ms-option-title">{{ option.title }}</span>
                    <span v-if="option.subtitle" class="archival-ms-option-subtitle">{{ option.subtitle }}</span>
                  </div>
                </template>
              </ArchivalSingleMultiselect>
            </div>

            <div
              v-if="classificationComplete"
              class="rounded-lg border bg-muted/40 px-3 py-2.5 text-sm"
            >
              <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                El PDF del acta se radicará en
              </p>
              <p class="mt-1 leading-relaxed">
                <span class="font-medium">{{ selectedUnit?.name }}</span>
                <span class="text-muted-foreground"> · </span>
                {{ selectedSeries?.code }} {{ selectedSeries?.name }}
                <span class="text-muted-foreground"> / </span>
                {{ selectedSubseries?.code }} {{ selectedSubseries?.name }}
                <span class="text-muted-foreground"> / </span>
                {{ selectedType?.code }} {{ selectedType?.name }}
              </p>
            </div>

            <PermissionGate permission="trd_tablas_editar">
              <Button :disabled="saving || !classificationComplete" @click="save">
                <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
                Guardar ubicación
              </Button>
            </PermissionGate>
          </template>
        </CardContent>
      </Card>
    </div>
  </SettingsLayout>
</template>

<style scoped>
.archival-single-multiselect :deep(.multiselect-single-label-text) {
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
