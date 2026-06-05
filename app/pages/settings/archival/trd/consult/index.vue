<script setup lang="ts">
import { toast } from 'vue-sonner'
import {
  TRD_INHERITED_FROM_LABELS,
  TRD_RETENTION_APPLICATION_OPTIONS,
  TRD_RETENTION_LEVEL_HELP,
  TRD_VERSION_STATUS_LABELS,
  formatFinalDispositionLabels,
} from '~/constants/archival-trd'
import type { TrdActiveVersionConsultData } from '~/types/archival-trd'
import { buildTrdSpreadsheetFilename } from '~/utils/trd-spreadsheet-view'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'trd_tablas_ver',
})

const router = useRouter()
const { $api } = useNuxtApp()
const trdApi = useTrdApi()
const { downloadReportFile } = useReportExport()

interface OrgUnitOption {
  id: number
  name: string
  code: string
  is_document_producer?: boolean
}

const units = ref<OrgUnitOption[]>([])
const orgUnitId = ref<number | null>(null)
const loading = ref(false)
const exportingSheet = ref(false)
const result = ref<TrdActiveVersionConsultData | null>(null)
const message = ref('')
const filterText = ref('')
const expandedSeries = ref<Record<number, boolean>>({})
const expandedSubseries = ref<Record<number, boolean>>({})

const retentionLevelLabel = computed(() => {
  const level = result.value?.version.retention_application_level
  if (!level) {
    return '—'
  }
  return TRD_RETENTION_APPLICATION_OPTIONS.find(o => o.value === level)?.label ?? level
})

const retentionLevelHelp = computed(() => {
  const level = result.value?.version.retention_application_level
  if (!level || !(level in TRD_RETENTION_LEVEL_HELP)) {
    return ''
  }
  return TRD_RETENTION_LEVEL_HELP[level as keyof typeof TRD_RETENTION_LEVEL_HELP]
})

const filteredTree = computed(() => {
  const tree = result.value?.catalog_tree ?? []
  const q = filterText.value.trim().toLowerCase()
  if (!q) {
    return tree
  }

  return tree
    .map((serie) => {
      const subseries = serie.subseries
        .map((sub) => {
          const types = sub.document_types.filter(
            t =>
              t.code.toLowerCase().includes(q)
              || t.name.toLowerCase().includes(q)
              || sub.code.toLowerCase().includes(q)
              || sub.name.toLowerCase().includes(q)
              || serie.code.toLowerCase().includes(q)
              || serie.name.toLowerCase().includes(q),
          )
          return types.length ? { ...sub, document_types: types } : null
        })
        .filter((s): s is NonNullable<typeof s> => s !== null)

      return subseries.length ? { ...serie, subseries } : null
    })
    .filter((s): s is NonNullable<typeof s> => s !== null)
})

async function loadUnits() {
  try {
    const res = await $api<{ data: OrgUnitOption[] }>('/organizational-structure/org-units', {
      query: { per_page: 200, is_active: true },
    })
    units.value = (res.data ?? []).filter(u => u.is_document_producer)
  } catch {
    units.value = []
  }
}

async function consult() {
  if (orgUnitId.value == null) {
    toast.error('Seleccione un área productora')
    return
  }
  loading.value = true
  message.value = ''
  result.value = null
  filterText.value = ''
  try {
    const res = await trdApi.fetchActiveVersion(orgUnitId.value)
    if (!res.data) {
      message.value = res.message ?? 'No hay TRD vigente para esta área.'
      return
    }
    result.value = res.data
    for (const serie of res.data.catalog_tree) {
      expandedSeries.value[serie.id] = true
      for (const sub of serie.subseries) {
        expandedSubseries.value[sub.id] = true
      }
    }
  } catch {
    toast.error('Error al consultar TRD')
  } finally {
    loading.value = false
  }
}

function dispositionLabel(v: string): string {
  return formatFinalDispositionLabels(v)
}

function inheritedLabel(v: string): string {
  return TRD_INHERITED_FROM_LABELS[v] ?? v
}

function toggleSeries(id: number) {
  expandedSeries.value[id] = !expandedSeries.value[id]
}

function toggleSubseries(id: number) {
  expandedSubseries.value[id] = !expandedSubseries.value[id]
}

function expandAll() {
  if (!result.value) {
    return
  }
  for (const serie of result.value.catalog_tree) {
    expandedSeries.value[serie.id] = true
    for (const sub of serie.subseries) {
      expandedSubseries.value[sub.id] = true
    }
  }
}

function collapseAll() {
  expandedSeries.value = {}
  expandedSubseries.value = {}
}

async function openSpreadsheetView() {
  if (orgUnitId.value == null) {
    toast.error('Seleccione un área productora')
    return
  }

  await navigateTo(
    {
      path: '/settings/archival/trd/consult/sheet',
      query: { org_unit_id: String(orgUnitId.value) },
    },
    { open: { target: '_blank' } },
  )
}

async function downloadSpreadsheetExcel() {
  if (orgUnitId.value == null) {
    toast.error('Seleccione un área productora')
    return
  }

  if (!result.value) {
    toast.error('Consulte primero la TRD vigente')
    return
  }

  exportingSheet.value = true
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
    exportingSheet.value = false
  }
}

onMounted(loadUnits)
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
      <div class="space-y-1">
        <Button variant="ghost" size="sm" class="h-8 w-fit -ml-2 px-2" @click="router.push('/settings/archival')">
          <Icon name="i-lucide-arrow-left" class="mr-1 h-4 w-4" />
          TRD y archivo
        </Button>
        <h2 class="text-2xl font-bold tracking-tight">
          Consultar TRD vigente
        </h2>
        <p class="text-muted-foreground max-w-3xl leading-relaxed">
          HU-TRD-16: cuadro de clasificación (serie → subserie → tipo documental) de la versión activa,
          con tiempos de retención propios o heredados (tipo → subserie → serie).
        </p>
      </div>

      <Card>
        <CardContent class="pt-6 flex flex-wrap gap-4 items-end">
          <div class="space-y-2 min-w-[280px] flex-1">
            <Label>Área productora</Label>
            <Select v-model="orgUnitId">
              <SelectTrigger>
                <SelectValue placeholder="Seleccione…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="u in units" :key="u.id" :value="u.id">
                  {{ u.name }} ({{ u.code }})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button :disabled="loading" @click="consult">
            <Icon name="i-lucide-search" class="mr-2 h-4 w-4" />
            Consultar
          </Button>
          <Button
            variant="outline"
            :disabled="orgUnitId == null"
            @click="openSpreadsheetView"
          >
            <Icon name="i-lucide-table-2" class="mr-2 h-4 w-4" />
            Vista formato TRD
          </Button>
          <Button
            variant="outline"
            :disabled="!result || exportingSheet"
            @click="downloadSpreadsheetExcel"
          >
            <Icon
              :name="exportingSheet ? 'i-lucide-loader-2' : 'i-lucide-file-spreadsheet'"
              class="mr-2 h-4 w-4"
              :class="{ 'animate-spin': exportingSheet }"
            />
            Descargar Excel
          </Button>
        </CardContent>
      </Card>

      <Alert v-if="message && !result">
        <AlertDescription>{{ message }}</AlertDescription>
      </Alert>

      <template v-if="result">
        <Card>
          <CardHeader>
            <CardTitle>
              {{ result.trd_table.org_unit?.name }} — versión {{ result.version.version_number }}
            </CardTitle>
            <CardDescription class="leading-relaxed space-y-1">
              <span>
                {{ TRD_VERSION_STATUS_LABELS[result.version.status] ?? result.version.status }}
                · Oficina productora: {{ result.version.producer_office_name }}
                ({{ result.version.producer_office_code }})
              </span>
              <span v-if="result.version.approved_at" class="block">
                Aprobación: {{ result.version.approved_at }}
                <template v-if="result.version.effective_from || result.version.effective_to">
                  · Vigencia:
                  {{ result.version.effective_from ?? '—' }}
                  →
                  {{ result.version.effective_to ?? 'sin fin' }}
                </template>
              </span>
              <span class="block">
                Nivel de aplicación de tiempos: <strong>{{ retentionLevelLabel }}</strong>
              </span>
              <span v-if="retentionLevelHelp" class="block text-xs">
                {{ retentionLevelHelp }}
              </span>
            </CardDescription>
          </CardHeader>
          <CardContent class="flex flex-wrap gap-3 text-sm">
            <Badge variant="secondary">
              {{ result.summary.document_types_count }} tipos asociados
            </Badge>
            <Badge variant="outline" class="text-green-700 dark:text-green-400">
              {{ result.summary.with_effective_rule }} con regla efectiva
            </Badge>
            <Badge
              v-if="result.summary.without_effective_rule > 0"
              variant="destructive"
            >
              {{ result.summary.without_effective_rule }} sin regla efectiva
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle class="text-base">
                Catálogo TRD vigente
              </CardTitle>
              <CardDescription>
                Solo tipos documentales incluidos en esta versión TRD.
              </CardDescription>
            </div>
            <div class="flex flex-wrap gap-2">
              <Button variant="outline" size="sm" @click="expandAll">
                Expandir todo
              </Button>
              <Button variant="outline" size="sm" @click="collapseAll">
                Contraer todo
              </Button>
            </div>
          </CardHeader>
          <CardContent class="space-y-4">
            <div class="max-w-md">
              <Label for="trd-consult-filter" class="text-xs">Filtrar por código o nombre</Label>
              <Input
                id="trd-consult-filter"
                v-model="filterText"
                placeholder="Serie, subserie o tipo…"
                class="mt-1"
              />
            </div>

            <div v-if="!filteredTree.length" class="text-sm text-muted-foreground py-8 text-center border border-dashed rounded-lg">
              No hay tipos que coincidan con el filtro.
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="serie in filteredTree"
                :key="serie.id"
                class="rounded-lg border overflow-hidden"
              >
                <button
                  type="button"
                  class="flex w-full items-center gap-2 bg-muted/40 px-4 py-3 text-left hover:bg-muted/60 transition-colors"
                  @click="toggleSeries(serie.id)"
                >
                  <Icon
                    :name="expandedSeries[serie.id] ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                    class="h-4 w-4 shrink-0"
                  />
                  <span class="font-mono text-sm font-semibold">{{ serie.code }}</span>
                  <span class="text-sm">{{ serie.name }}</span>
                  <Badge v-if="!serie.is_active" variant="outline" class="ml-auto text-xs">
                    Inactiva
                  </Badge>
                </button>

                <div v-show="expandedSeries[serie.id]" class="p-3 space-y-2">
                  <div
                    v-for="sub in serie.subseries"
                    :key="sub.id"
                    class="rounded-md border bg-card"
                  >
                    <button
                      type="button"
                      class="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-muted/30 transition-colors border-b"
                      @click="toggleSubseries(sub.id)"
                    >
                      <Icon
                        :name="expandedSubseries[sub.id] ? 'i-lucide-chevron-down' : 'i-lucide-chevron-right'"
                        class="h-4 w-4 shrink-0 text-muted-foreground"
                      />
                      <span class="font-mono text-xs font-medium pl-2 border-l-2 border-primary/40">
                        {{ sub.code }}
                      </span>
                      <span class="text-sm text-muted-foreground">{{ sub.name }}</span>
                    </button>

                    <div v-show="expandedSubseries[sub.id]" class="overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow class="hover:bg-transparent">
                            <TableHead class="min-w-[10rem]">
                              Tipo documental
                            </TableHead>
                            <TableHead class="w-20 text-center">
                              Gestión
                            </TableHead>
                            <TableHead class="w-20 text-center">
                              Central
                            </TableHead>
                            <TableHead class="w-20 text-center">
                              Histórico
                            </TableHead>
                            <TableHead class="min-w-[7rem]">
                              Disposición
                            </TableHead>
                            <TableHead class="min-w-[6rem]">
                              Regla
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          <TableRow
                            v-for="tipo in sub.document_types"
                            :key="tipo.id"
                          >
                            <TableCell>
                              <span class="font-mono text-xs block">{{ tipo.code }}</span>
                              <span class="text-sm">{{ tipo.name }}</span>
                            </TableCell>
                            <template v-if="tipo.effective_retention">
                              <TableCell class="text-center tabular-nums">
                                {{ tipo.effective_retention.years_management }} a
                              </TableCell>
                              <TableCell class="text-center tabular-nums">
                                {{ tipo.effective_retention.years_central }} a
                              </TableCell>
                              <TableCell class="text-center tabular-nums text-muted-foreground">
                                {{ tipo.effective_retention.years_historical ?? '—' }}
                              </TableCell>
                              <TableCell class="text-sm">
                                {{ dispositionLabel(tipo.effective_retention.final_disposition) }}
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline" class="font-normal text-xs whitespace-nowrap">
                                  {{ inheritedLabel(tipo.effective_retention.inherited_from) }}
                                </Badge>
                              </TableCell>
                            </template>
                            <TableCell v-else colspan="5" class="text-destructive text-sm">
                              Sin regla de retención efectiva
                            </TableCell>
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </template>

      <div v-if="loading" class="flex justify-center py-16">
        <Icon name="i-lucide-loader-2" class="h-9 w-9 animate-spin text-muted-foreground" />
      </div>
    </div>
  </SettingsLayout>
</template>
