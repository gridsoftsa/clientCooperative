<script setup lang="ts">
import type { TalentPartyKind, TalentPartySummary, TalentTrdSeries } from '~/types/talent-party'
import { toast } from 'vue-sonner'

const props = defineProps<{
  kind: TalentPartyKind
}>()

const router = useRouter()
const talentApi = useTalentPartyApi()
const { hasPermission } = usePermissions()

const parties = ref<TalentPartySummary[]>([])
const loading = ref(true)
const search = ref('')
const createOpen = ref(false)
const saving = ref(false)
const settingsSaving = ref(false)
const displayName = ref('')
const identifier = ref('')
const settingsTrdTableId = ref<number | null>(null)
const savedTrdTableId = ref<number | null>(null)
const savedTrdLabel = ref('')
const savedSubseriesCount = ref(0)
const applyingSettings = ref(false)
const trdOptions = ref<Array<{ value: number, label: string }>>([])
const series = ref<TalentTrdSeries[]>([])
const seriesLoading = ref(false)
const selectedSubseries = ref<number[]>([])

const section = computed(() => props.kind === 'supplier' ? 'proveedores' : 'empleados')
const title = computed(() => props.kind === 'supplier' ? 'Proveedores' : 'Empleados')
const singular = computed(() => props.kind === 'supplier' ? 'proveedor' : 'empleado')
const canManage = computed(() => hasPermission('talento_gestionar'))
const canCreate = computed(() => savedTrdTableId.value != null && savedSubseriesCount.value > 0)
const draftSubseriesCount = computed(() => selectedSubseries.value.length)

let searchTimer: ReturnType<typeof setTimeout> | undefined

function apiErrorMessage(error: unknown, fallback: string): string {
  const data = (error as { data?: { message?: string, errors?: Record<string, string[]> } })?.data
  const first = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined

  return first || data?.message || fallback
}

async function loadParties() {
  loading.value = true
  try {
    const response = await talentApi.list(props.kind, search.value)
    parties.value = response.data
  }
  catch {
    toast.error(`No se pudo cargar el listado de ${title.value.toLowerCase()}.`)
    parties.value = []
  }
  finally {
    loading.value = false
  }
}

async function loadTrdOptions() {
  try {
    const response = await talentApi.trdOptions()
    trdOptions.value = response.data.map(option => ({
      value: option.id,
      label: option.label,
    }))
  }
  catch {
    toast.error('No se pudieron cargar las TRD.')
  }
}

async function applySettings(data: {
  employee_trd: { id: number, label: string } | null
  supplier_trd: { id: number, label: string } | null
  employee_doc_subseries_ids: number[]
  supplier_doc_subseries_ids: number[]
}) {
  const configured = props.kind === 'supplier' ? data.supplier_trd : data.employee_trd
  const subseriesIds = props.kind === 'supplier'
    ? data.supplier_doc_subseries_ids
    : data.employee_doc_subseries_ids
  savedTrdTableId.value = configured?.id ?? null
  savedTrdLabel.value = configured?.label ?? ''
  savedSubseriesCount.value = subseriesIds.length
  applyingSettings.value = true
  settingsTrdTableId.value = savedTrdTableId.value
  selectedSubseries.value = [...subseriesIds]
  await nextTick()
  applyingSettings.value = false
}

async function loadSettings() {
  try {
    const response = await talentApi.settings()
    await applySettings(response.data)
    await loadSeries(savedTrdTableId.value)
  }
  catch {
    toast.error('No se pudo cargar la configuración.')
  }
}

async function saveSettings() {
  if (settingsTrdTableId.value != null && selectedSubseries.value.length === 0) {
    toast.error('Seleccione al menos una subserie.')
    return
  }

  settingsSaving.value = true
  try {
    const response = await talentApi.updateSettings({
      kind: props.kind,
      trd_table_id: settingsTrdTableId.value,
      doc_subseries_ids: settingsTrdTableId.value == null ? [] : selectedSubseries.value,
    })
    await applySettings(response.data)
    toast.success(response.message || 'Configuración guardada.')
  }
  catch (error: unknown) {
    toast.error(apiErrorMessage(error, 'No se pudo guardar la configuración.'))
  }
  finally {
    settingsSaving.value = false
  }
}

function openCreate() {
  if (!canCreate.value) {
    toast.error('Guarde la TRD y las subseries antes de crear una carpeta.')
    return
  }

  displayName.value = ''
  identifier.value = ''
  createOpen.value = true
}

function isSubseriesSelected(id: number): boolean {
  return selectedSubseries.value.includes(Number(id))
}

function setSubseriesSelected(id: number, checked: boolean) {
  const subseriesId = Number(id)

  if (checked) {
    if (!selectedSubseries.value.includes(subseriesId)) {
      selectedSubseries.value = [...selectedSubseries.value, subseriesId]
    }
    return
  }

  selectedSubseries.value = selectedSubseries.value.filter(item => item !== subseriesId)
}

function subseriesCheckboxId(id: number): string {
  return `talent-subseries-${props.kind}-${id}`
}

async function loadSeries(tableId: number | null) {
  series.value = []
  if (tableId == null) {
    return
  }

  seriesLoading.value = true
  try {
    const response = await talentApi.trdSubseries(tableId)
    series.value = response.data
  }
  catch {
    toast.error('No se pudo cargar la estructura de la TRD.')
  }
  finally {
    seriesLoading.value = false
  }
}

watch(settingsTrdTableId, (tableId, previous) => {
  if (applyingSettings.value || Number(tableId) === Number(previous)) {
    return
  }

  selectedSubseries.value = []
  void loadSeries(tableId)
})

watch(search, () => {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
  searchTimer = setTimeout(() => {
    void loadParties()
  }, 400)
})

async function createParty() {
  if (!displayName.value.trim()) {
    toast.error(`Indique el nombre del ${singular.value}.`)
    return
  }
  if (!canCreate.value) {
    toast.error('Guarde la TRD y las subseries antes de crear una carpeta.')
    return
  }

  saving.value = true
  try {
    const response = await talentApi.create({
      kind: props.kind,
      display_name: displayName.value.trim(),
      identifier: identifier.value.trim() || undefined,
    })
    toast.success(response.message || 'Carpeta creada.')
    createOpen.value = false
    await router.push(`/talento-humano/${section.value}/${response.data.id}`)
  }
  catch (error: unknown) {
    toast.error(apiErrorMessage(error, 'No se pudo crear la carpeta.'))
  }
  finally {
    saving.value = false
  }
}

onMounted(() => {
  void loadParties()
  void loadTrdOptions()
  void loadSettings()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">
          {{ title }}
        </h1>
        <p class="mt-1 max-w-3xl text-sm text-muted-foreground">
          Cada {{ singular }} es una carpeta con las subseries guardadas abajo. Al crearla solo se indica el nombre y la identificación.
        </p>
      </div>
      <Button
        v-if="canManage"
        type="button"
        :disabled="!canCreate"
        @click="openCreate"
      >
        <Icon name="i-lucide-folder-plus" class="mr-1.5 size-4" />
        Crear {{ singular }}
      </Button>
    </div>

    <Card>
      <CardHeader>
        <CardTitle class="text-base">
          Configuración de {{ title.toLowerCase() }}
        </CardTitle>
        <CardDescription>
          La TRD y las subseries se aplican a cada carpeta nueva. No hay que volver a elegirlas al crear un {{ singular }}.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-4">
        <div class="max-w-xl space-y-2">
          <Label :for="`talent-settings-trd-${kind}`">TRD del área</Label>
          <ArchivalSingleMultiselect
            :id="`talent-settings-trd-${kind}`"
            v-model="settingsTrdTableId"
            :options="trdOptions"
            :disabled="!canManage || settingsSaving"
            placeholder="Buscar TRD del área…"
            no-options-text="No hay TRD"
            no-results-text="Sin coincidencias"
            coerce-number
          />
          <p class="text-xs text-muted-foreground">
            {{ savedTrdLabel
              ? `En uso: ${savedTrdLabel}. ${savedSubseriesCount} subserie${savedSubseriesCount === 1 ? '' : 's'} guardada${savedSubseriesCount === 1 ? '' : 's'}.`
              : 'Aún no hay una TRD guardada.' }}
            <span v-if="settingsTrdTableId != null">
              {{ draftSubseriesCount }} seleccionada{{ draftSubseriesCount === 1 ? '' : 's' }} en esta pantalla.
            </span>
          </p>
        </div>

        <div
          v-if="seriesLoading"
          class="text-sm text-muted-foreground"
        >
          Cargando subseries...
        </div>
        <div
          v-else-if="settingsTrdTableId != null && series.length === 0"
          class="text-sm text-muted-foreground"
        >
          Esta TRD no tiene series activas en el catálogo del área.
        </div>
        <div
          v-else
          class="space-y-4"
        >
          <div
            v-for="item in series"
            :key="item.id"
            class="space-y-2"
          >
            <p class="text-sm font-medium">
              {{ item.code }} — {{ item.name }}
            </p>
            <div
              v-for="subseries in item.subseries"
              :key="subseries.id"
              class="flex items-start gap-3 rounded-md border px-3 py-2"
              :class="isSubseriesSelected(subseries.id) ? 'border-primary/40 bg-primary/5' : ''"
            >
              <Checkbox
                :id="subseriesCheckboxId(subseries.id)"
                class="mt-0.5"
                :disabled="!canManage || settingsSaving"
                :model-value="isSubseriesSelected(subseries.id)"
                @update:model-value="setSubseriesSelected(subseries.id, $event === true)"
              />
              <Label
                :for="subseriesCheckboxId(subseries.id)"
                class="min-w-0 cursor-pointer font-normal"
              >
                <span class="block text-sm font-normal">{{ subseries.code }} — {{ subseries.name }}</span>
                <span class="block text-xs font-normal text-muted-foreground">
                  {{ subseries.document_types.length }} tipo{{ subseries.document_types.length === 1 ? '' : 's' }} documental{{ subseries.document_types.length === 1 ? '' : 'es' }}
                </span>
              </Label>
            </div>
            <p
              v-if="item.subseries.length === 0"
              class="text-sm text-muted-foreground"
            >
              Sin subseries activas.
            </p>
          </div>
        </div>

        <div v-if="canManage" class="flex justify-end">
          <Button
            type="button"
            :disabled="settingsSaving"
            @click="saveSettings"
          >
            <Icon
              v-if="settingsSaving"
              name="i-lucide-loader-2"
              class="mr-1.5 size-4 animate-spin"
            />
            Guardar configuración
          </Button>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader class="pb-4">
        <div class="max-w-md space-y-2">
          <Label for="talent-party-search">Buscar</Label>
          <Input
            id="talent-party-search"
            v-model="search"
            placeholder="Nombre o identificación"
          />
        </div>
      </CardHeader>
      <CardContent>
        <p
          v-if="loading"
          class="text-sm text-muted-foreground"
        >
          Cargando...
        </p>
        <p
          v-else-if="parties.length === 0"
          class="text-sm text-muted-foreground"
        >
          No hay {{ title.toLowerCase() }} creados.
        </p>
        <Table v-else>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Identificación</TableHead>
              <TableHead>Área de la TRD</TableHead>
              <TableHead>Subseries</TableHead>
              <TableHead>Archivos</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="party in parties"
              :key="party.id"
            >
              <TableCell class="font-medium">
                {{ party.display_name }}
              </TableCell>
              <TableCell>{{ party.identifier || '—' }}</TableCell>
              <TableCell>{{ party.org_unit?.name || '—' }}</TableCell>
              <TableCell>{{ party.subseries_count }}</TableCell>
              <TableCell>{{ party.documents_count }}</TableCell>
              <TableCell class="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  as-child
                >
                  <NuxtLink :to="`/talento-humano/${section}/${party.id}`">
                    Abrir
                  </NuxtLink>
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <Dialog v-model:open="createOpen">
      <DialogContent
        class="max-h-[85vh] overflow-y-auto sm:max-w-2xl"
        @pointer-down-outside="preventArchivalMultiselectDialogDismiss"
        @focus-outside="preventArchivalMultiselectDialogDismiss"
        @interact-outside="preventArchivalMultiselectDialogDismiss"
      >
        <DialogHeader>
          <DialogTitle>Crear {{ singular }}</DialogTitle>
          <DialogDescription>
            Se crea la carpeta con la TRD {{ savedTrdLabel || 'configurada' }} y las {{ savedSubseriesCount }} subseries guardadas.
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4">
          <div class="space-y-2">
            <Label for="talent-party-name">Nombre</Label>
            <Input
              id="talent-party-name"
              v-model="displayName"
              :placeholder="kind === 'supplier' ? 'Razón social' : 'Nombre del empleado'"
            />
          </div>
          <div class="space-y-2">
            <Label for="talent-party-identifier">Identificación</Label>
            <Input
              id="talent-party-identifier"
              v-model="identifier"
              :placeholder="kind === 'supplier' ? 'NIT' : 'Documento'"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            @click="createOpen = false"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            :disabled="saving"
            @click="createParty"
          >
            <Icon
              v-if="saving"
              name="i-lucide-loader-2"
              class="mr-1.5 size-4 animate-spin"
            />
            Crear carpeta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
