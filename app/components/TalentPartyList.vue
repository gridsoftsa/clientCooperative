<script setup lang="ts">
import type { TalentPartyKind, TalentPartySettings, TalentPartySummary, TalentTrdSeries, TalentTrdSubseries } from '~/types/talent-party'
import { toast } from 'vue-sonner'

const props = withDefaults(defineProps<{
  kind: TalentPartyKind
  managePermission?: string
  showRegistry?: boolean
  allowManualCreate?: boolean
}>(), {
  managePermission: 'talento_gestionar',
  showRegistry: true,
  allowManualCreate: true,
})

const router = useRouter()
const talentApi = useTalentPartyApi()
const { hasPermission } = usePermissions()

const parties = ref<TalentPartySummary[]>([])
const loading = ref(true)
const search = ref('')
const createOpen = ref(false)
const settingsOpen = ref(false)
const saving = ref(false)
const deactivatingId = ref<number | null>(null)
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
const disabledDocumentTypeIds = ref<number[]>([])
const expandedSubseriesIds = ref<number[]>([])
const subseriesScroller = ref<HTMLElement | null>(null)

const title = computed(() => {
  if (props.kind === 'supplier') {
    return 'Proveedores'
  }
  if (props.kind === 'applicant') {
    return 'Solicitantes'
  }

  return 'Empleados'
})
const singular = computed(() => {
  if (props.kind === 'supplier') {
    return 'proveedor'
  }
  if (props.kind === 'applicant') {
    return 'solicitante'
  }

  return 'empleado'
})
const canManage = computed(() => hasPermission(props.managePermission))
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

function settingsSlice(data: TalentPartySettings): {
  configured: TalentPartySettings['employee_trd']
  subseriesIds: number[]
  disabledIds: number[]
} {
  if (props.kind === 'supplier') {
    return {
      configured: data.supplier_trd,
      subseriesIds: data.supplier_doc_subseries_ids,
      disabledIds: data.supplier_disabled_doc_document_type_ids,
    }
  }
  if (props.kind === 'applicant') {
    return {
      configured: data.applicant_trd,
      subseriesIds: data.applicant_doc_subseries_ids,
      disabledIds: data.applicant_disabled_doc_document_type_ids,
    }
  }

  return {
    configured: data.employee_trd,
    subseriesIds: data.employee_doc_subseries_ids,
    disabledIds: data.employee_disabled_doc_document_type_ids,
  }
}

async function applySettings(data: TalentPartySettings) {
  const { configured, subseriesIds, disabledIds } = settingsSlice(data)
  savedTrdTableId.value = configured?.id ?? null
  savedTrdLabel.value = configured?.label ?? ''
  savedSubseriesCount.value = subseriesIds.length
  applyingSettings.value = true
  settingsTrdTableId.value = savedTrdTableId.value
  selectedSubseries.value = [...subseriesIds]
  disabledDocumentTypeIds.value = [...(disabledIds ?? [])]
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
      disabled_doc_document_type_ids: settingsTrdTableId.value == null
        ? []
        : disabledDocumentTypeIds.value.filter(id => selectedDocumentTypeIds().includes(id)),
    })
    await applySettings(response.data)
    settingsOpen.value = false
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

  if (props.kind === 'supplier') {
    void router.push('/settings/organizational-structure/suppliers/create')
    return
  }

  if (props.kind === 'applicant') {
    return
  }

  displayName.value = ''
  identifier.value = ''
  createOpen.value = true
}

async function deactivateParty(party: TalentPartySummary): Promise<void> {
  if (!canManage.value || deactivatingId.value != null) {
    return
  }

  deactivatingId.value = party.id
  try {
    const response = await talentApi.deactivate(party.id)
    toast.success(response.message || 'Proveedor inactivado.')
    await loadParties()
  }
  catch (error: unknown) {
    toast.error(apiErrorMessage(error, 'No se pudo inactivar el proveedor.'))
  }
  finally {
    deactivatingId.value = null
  }
}

function partyDocumentLabel(party: TalentPartySummary): string {
  if (!party.identifier) {
    return '—'
  }
  if (party.document_type) {
    return `${party.document_type} ${party.identifier}`
  }

  return party.identifier
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
    if (!expandedSubseriesIds.value.includes(subseriesId)) {
      expandedSubseriesIds.value = [...expandedSubseriesIds.value, subseriesId]
    }
    return
  }

  selectedSubseries.value = selectedSubseries.value.filter(item => item !== subseriesId)
  const typeIds = new Set(documentTypeIdsForSubseries(subseriesId))
  disabledDocumentTypeIds.value = disabledDocumentTypeIds.value.filter(typeId => !typeIds.has(typeId))
}

function isSubseriesExpanded(id: number): boolean {
  return expandedSubseriesIds.value.includes(Number(id))
}

function toggleSubseriesExpanded(id: number) {
  const subseriesId = Number(id)
  if (isSubseriesExpanded(subseriesId)) {
    expandedSubseriesIds.value = expandedSubseriesIds.value.filter(item => item !== subseriesId)
    return
  }

  expandedSubseriesIds.value = [...expandedSubseriesIds.value, subseriesId]
}

function documentTypeIdsForSubseries(id: number): number[] {
  for (const item of series.value) {
    const subseries = item.subseries.find(row => row.id === id)
    if (subseries) {
      return subseries.document_types.map(type => type.id)
    }
  }

  return []
}

function selectedDocumentTypeIds(): number[] {
  return selectedSubseries.value.flatMap(id => documentTypeIdsForSubseries(id))
}

function isDocumentTypeEnabled(subseriesId: number, typeId: number): boolean {
  return isSubseriesSelected(subseriesId) && !disabledDocumentTypeIds.value.includes(Number(typeId))
}

function setDocumentTypeEnabled(subseriesId: number, typeId: number, checked: boolean) {
  if (!isSubseriesSelected(subseriesId)) {
    return
  }

  const documentTypeId = Number(typeId)
  if (checked) {
    disabledDocumentTypeIds.value = disabledDocumentTypeIds.value.filter(id => id !== documentTypeId)
    return
  }

  if (!disabledDocumentTypeIds.value.includes(documentTypeId)) {
    disabledDocumentTypeIds.value = [...disabledDocumentTypeIds.value, documentTypeId]
  }
}

function documentTypeSummary(subseries: TalentTrdSubseries): string {
  const total = subseries.document_types.length
  const noun = total === 1 ? 'tipo documental' : 'tipos documentales'
  if (!isSubseriesSelected(subseries.id)) {
    return `${total} ${noun}`
  }

  const disabled = subseries.document_types.filter(type => disabledDocumentTypeIds.value.includes(type.id)).length
  if (disabled === 0) {
    return `${total} ${noun}`
  }

  const disabledLabel = disabled === 1 ? '1 deshabilitado' : `${disabled} deshabilitados`

  return `${total} ${noun} · ${disabledLabel}`
}

function expandSubseriesLabel(id: number): string {
  return isSubseriesExpanded(id) ? 'Ocultar tipos documentales' : 'Ver tipos documentales'
}

function subseriesCheckboxId(id: number): string {
  return `talent-subseries-${props.kind}-${id}`
}

function documentTypeCheckboxId(subseriesId: number, typeId: number): string {
  return `talent-doctype-${props.kind}-${subseriesId}-${typeId}`
}

function keepSubseriesScroll(event: FocusEvent): void {
  const scroller = subseriesScroller.value
    ?? (event.currentTarget instanceof HTMLElement ? event.currentTarget : null)
  if (!scroller) {
    return
  }

  const top = scroller.scrollTop
  requestAnimationFrame(() => {
    scroller.scrollTop = top
  })
}

function partyFileHref(party: Pick<TalentPartySummary, 'id' | 'org_unit_id' | 'archival_file_id' | 'applicant_id'>): string | null {
  if (!party.archival_file_id) {
    return null
  }

  if (props.kind === 'supplier') {
    return `/settings/organizational-structure/suppliers/${party.id}/archivo`
  }

  if (props.kind === 'applicant' && party.applicant_id) {
    return `/solicitantes/${party.applicant_id}/archivo`
  }

  return areaRepositoryFolderHref(party.org_unit_id, party.archival_file_id)
}

function areaRepositoryFolderHref(orgUnitId: number | null | undefined, archivalFileId: number | null | undefined): string | null {
  if (!orgUnitId || !archivalFileId) {
    return null
  }

  return `/expedientes/area?org_unit_id=${orgUnitId}&archival_file_id=${archivalFileId}`
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
  disabledDocumentTypeIds.value = []
  expandedSubseriesIds.value = []
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
    const href = partyFileHref(response.data)
    if (href) {
      await router.push(href)
      return
    }
    await loadParties()
  }
  catch (error: unknown) {
    toast.error(apiErrorMessage(error, 'No se pudo crear la carpeta.'))
  }
  finally {
    saving.value = false
  }
}

onMounted(() => {
  if (props.showRegistry) {
    void loadParties()
  }
  void loadTrdOptions()
  void loadSettings()
})
</script>

<template>
  <div :class="showRegistry ? 'space-y-6' : 'contents'">
    <div v-if="showRegistry" class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">
          {{ title }}
        </h1>
        <p class="mt-1 max-w-3xl text-sm text-muted-foreground">
          Cada {{ singular }} es una carpeta con la TRD y las subseries de la configuración.
          {{ kind === 'supplier'
            ? 'El alta se hace en una pantalla completa con identificación y datos de contacto.'
            : 'Al crearla solo se indica el nombre y la identificación.' }}
        </p>
      </div>
      <div v-if="canManage" class="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          @click="settingsOpen = true"
        >
          <Icon name="i-lucide-settings" class="mr-1.5 size-4" />
          Configuración de archivo
        </Button>
        <Button
          v-if="allowManualCreate"
          type="button"
          :disabled="kind !== 'supplier' && !canCreate"
          @click="openCreate"
        >
          <Icon name="i-lucide-folder-plus" class="mr-1.5 size-4" />
          Crear {{ singular }}
        </Button>
      </div>
    </div>
    <Button
      v-else-if="canManage"
      type="button"
      variant="outline"
      @click="settingsOpen = true"
    >
      <Icon name="i-lucide-settings" class="mr-1.5 size-4" />
      Configuración de archivo
    </Button>

    <Dialog v-model:open="settingsOpen">
      <DialogContent
        class="h-[min(85vh,44rem)] max-h-[85vh] !flex !flex-col gap-0 !overflow-hidden p-0 sm:max-w-3xl"
        @pointer-down-outside="preventArchivalMultiselectDialogDismiss"
        @focus-outside="preventArchivalMultiselectDialogDismiss"
        @interact-outside="preventArchivalMultiselectDialogDismiss"
      >
        <div class="flex h-full min-h-0 flex-1 flex-col">
        <DialogHeader class="shrink-0 space-y-2 px-6 pt-6 pr-12">
          <DialogTitle>
            {{ showRegistry ? `Configuración de ${title.toLowerCase()}` : 'Configuración del archivo en TRD' }}
          </DialogTitle>
          <DialogDescription>
            {{ kind === 'applicant'
              ? 'Si Gestión documental está activo y guarda esta TRD, la carpeta se crea sola al registrar el solicitante en el catálogo o en una radicación.'
              : showRegistry
                ? `La TRD y las subseries se aplican a cada carpeta nueva. No hay que volver a elegirlas al crear un ${singular}.`
                : 'La TRD y las subseries se usan cuando, al registrar un funcionario, se marca Crear archivo en TRD.' }}
          </DialogDescription>
        </DialogHeader>
        <div class="shrink-0 space-y-2 px-6 pt-4">
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
          ref="subseriesScroller"
          class="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain px-6 py-4 [overflow-anchor:none]"
          @focusin="keepSubseriesScroll"
        >
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
                class="rounded-md border"
                :class="isSubseriesSelected(subseries.id) ? 'border-primary/40 bg-primary/5' : ''"
              >
                <div class="flex items-start gap-3 px-3 py-2">
                  <span class="mt-0.5 inline-flex shrink-0">
                    <Checkbox
                      :id="subseriesCheckboxId(subseries.id)"
                      bare
                      :disabled="!canManage || settingsSaving"
                      :model-value="isSubseriesSelected(subseries.id)"
                      @update:model-value="setSubseriesSelected(subseries.id, $event === true)"
                    />
                  </span>
                  <Label
                    :for="subseriesCheckboxId(subseries.id)"
                    class="min-w-0 flex-1 cursor-pointer font-normal"
                    @mousedown.prevent
                  >
                    <span class="block text-sm font-normal">{{ subseries.code }} — {{ subseries.name }}</span>
                    <span class="block text-xs font-normal text-muted-foreground">
                      {{ documentTypeSummary(subseries) }}
                    </span>
                  </Label>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    class="size-8 shrink-0"
                    :disabled="subseries.document_types.length === 0"
                    :aria-label="expandSubseriesLabel(subseries.id)"
                    @click="toggleSubseriesExpanded(subseries.id)"
                  >
                    <Icon
                      :name="isSubseriesExpanded(subseries.id) ? 'i-lucide-chevron-up' : 'i-lucide-chevron-down'"
                      class="size-4"
                    />
                  </Button>
                </div>
                <div
                  v-if="isSubseriesExpanded(subseries.id)"
                  class="space-y-2 border-t px-3 py-2 pl-10"
                >
                  <p
                    v-if="subseries.document_types.length === 0"
                    class="text-xs text-muted-foreground"
                  >
                    Sin tipos documentales activos.
                  </p>
                  <p
                    v-else-if="!isSubseriesSelected(subseries.id)"
                    class="text-xs text-muted-foreground"
                  >
                    Seleccione la subserie para habilitar o deshabilitar tipos.
                  </p>
                  <div
                    v-for="documentType in subseries.document_types"
                    :key="documentType.id"
                    class="flex items-start gap-3"
                  >
                    <span class="mt-0.5 inline-flex shrink-0">
                      <Checkbox
                        :id="documentTypeCheckboxId(subseries.id, documentType.id)"
                        bare
                        :disabled="!canManage || settingsSaving || !isSubseriesSelected(subseries.id)"
                        :model-value="isDocumentTypeEnabled(subseries.id, documentType.id)"
                        @update:model-value="setDocumentTypeEnabled(subseries.id, documentType.id, $event === true)"
                      />
                    </span>
                    <Label
                      :for="documentTypeCheckboxId(subseries.id, documentType.id)"
                      class="min-w-0 cursor-pointer font-normal"
                      :class="!isSubseriesSelected(subseries.id) ? 'cursor-not-allowed opacity-60' : ''"
                      @mousedown.prevent
                    >
                      <span class="block text-sm font-normal">{{ documentType.code }} — {{ documentType.name }}</span>
                    </Label>
                  </div>
                </div>
              </div>
              <p
                v-if="item.subseries.length === 0"
                class="text-sm text-muted-foreground"
              >
                Sin subseries activas.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter v-if="canManage" class="mt-auto shrink-0 border-t bg-background px-6 py-4">
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
        </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>

    <Card v-if="showRegistry">
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
              <TableHead v-if="kind === 'supplier'">Correo</TableHead>
              <TableHead v-if="kind === 'supplier'">Celular</TableHead>
              <TableHead>Área de la TRD</TableHead>
              <TableHead>Subseries</TableHead>
              <TableHead>Archivos</TableHead>
              <TableHead v-if="kind === 'supplier'">Estado</TableHead>
              <TableHead class="text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="party in parties"
              :key="party.id"
              :class="kind === 'supplier' && party.is_active === false ? 'bg-destructive/5' : undefined"
            >
              <TableCell class="font-medium">
                {{ party.display_name }}
              </TableCell>
              <TableCell>{{ partyDocumentLabel(party) }}</TableCell>
              <TableCell v-if="kind === 'supplier'">
                {{ party.email || '—' }}
              </TableCell>
              <TableCell v-if="kind === 'supplier'">
                {{ party.phone || '—' }}
              </TableCell>
              <TableCell>{{ party.org_unit?.name || '—' }}</TableCell>
              <TableCell>{{ party.subseries_count }}</TableCell>
              <TableCell>{{ party.documents_count }}</TableCell>
              <TableCell v-if="kind === 'supplier'">
                <Badge :variant="party.is_active === false ? 'secondary' : 'default'">
                  {{ party.is_active === false ? 'Inactivo' : 'Activo' }}
                </Badge>
              </TableCell>
              <TableCell class="whitespace-normal text-right">
                <div class="flex flex-wrap justify-end gap-1">
                  <Button
                    v-if="partyFileHref(party)"
                    variant="outline"
                    size="sm"
                    class="h-8 gap-1.5 px-2 text-xs"
                    as-child
                  >
                    <NuxtLink :to="partyFileHref(party) || '/settings/organizational-structure/suppliers'">
                      Ver archivo
                    </NuxtLink>
                  </Button>
                  <Button
                    v-if="kind === 'supplier'"
                    variant="outline"
                    size="sm"
                    class="h-8 gap-1.5 px-2 text-xs"
                    as-child
                  >
                    <NuxtLink :to="`/settings/organizational-structure/suppliers/${party.id}`">
                      Ver
                    </NuxtLink>
                  </Button>
                  <PermissionGate
                    v-if="kind === 'supplier'"
                    :permission="managePermission"
                  >
                    <Button
                      variant="warning"
                      size="sm"
                      class="h-8 gap-1.5 px-2 text-xs"
                      @click="router.push(`/settings/organizational-structure/suppliers/${party.id}/edit`)"
                    >
                      Editar
                    </Button>
                    <Button
                      v-if="party.is_active !== false"
                      type="button"
                      variant="destructive"
                      size="sm"
                      class="h-8 gap-1.5 px-2 text-xs"
                      :disabled="deactivatingId === party.id"
                      @click="deactivateParty(party)"
                    >
                      <Icon name="i-lucide-ban" class="size-4 shrink-0" />
                      Desactivar
                    </Button>
                  </PermissionGate>
                </div>
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
