<script setup lang="ts">
import { toast } from 'vue-sonner'
import { ARCHIVAL_TRANSFER_KIND_OPTIONS } from '~/constants/archival-lifecycle'
import { messageFromFetchError } from '~/utils/http-error-message'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'trd_transferencias_ejecutar',
})

const router = useRouter()
const route = useRoute()
const api = useArchivalLifecycleApi()

const editingActId = computed(() => {
  const raw = route.query.id
  const value = Array.isArray(raw) ? raw[0] : raw
  const parsed = Number(value)

  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
})

const hydratingEdit = ref(false)
const saving = ref(false)
const orgUnitId = ref<string | undefined>(undefined)
const units = ref<Array<{ id: number, name: string, code: string }>>([])
const eligibleFiles = ref<Awaited<ReturnType<typeof api.fetchTransferEligibleFiles>>>([])
const selectedFileIds = ref<number[]>([])
const trdLabel = ref<string | null>(null)
const missingTrd = ref(false)

const form = ref({
  act_code: `ATP-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
  transfer_kind: 'primary',
  act_date: new Date().toISOString().slice(0, 10),
  description: '',
})

async function loadUnits() {
  units.value = await api.fetchTransferAllowedOrgUnits()
  if (units.value.length === 1) {
    orgUnitId.value = String(units.value[0].id)
  }
}

async function loadTrdSetting() {
  trdLabel.value = null
  missingTrd.value = false
  if (!orgUnitId.value) {
    return
  }

  const rows = await api.fetchTransferActTrdSettings(Number(orgUnitId.value))
  const row = rows[0]
  if (!row) {
    missingTrd.value = true
    return
  }

  trdLabel.value = [
    row.doc_series ? `${row.doc_series.code} ${row.doc_series.name}` : null,
    row.doc_subseries ? `${row.doc_subseries.code} ${row.doc_subseries.name}` : null,
    row.doc_document_type ? `${row.doc_document_type.code} ${row.doc_document_type.name}` : null,
  ].filter(Boolean).join(' / ')
}

async function loadEligible(preserveSelection = false) {
  if (!preserveSelection) {
    selectedFileIds.value = []
  }
  eligibleFiles.value = []
  if (!orgUnitId.value) {
    return
  }

  eligibleFiles.value = await api.fetchTransferEligibleFiles(
    form.value.transfer_kind,
    Number(orgUnitId.value),
  )
}

function mergeFilesIntoEligible(files: Array<{
  id: number
  file_number: string
  title: string
  documents?: Array<{
    id: number
    title: string
    requires_selection?: boolean
    final_disposition?: string | null
    selection_decision?: string | null
    doc_document_type_name?: string | null
    final_disposition_label?: string | null
    inherited_from_label?: string | null
  }>
}>) {
  const byId = new Map(eligibleFiles.value.map(file => [Number(file.id), file]))
  for (const file of files) {
    byId.set(Number(file.id), {
      id: file.id,
      file_number: file.file_number,
      title: file.title,
      documents: file.documents ?? byId.get(Number(file.id))?.documents,
    })
  }
  eligibleFiles.value = [...byId.values()]
}

async function hydrateDraft() {
  if (editingActId.value == null) {
    return
  }

  hydratingEdit.value = true
  try {
    const act = await api.fetchTransferAct(editingActId.value)
    if (act.status !== 'draft') {
      toast.error('Solo se pueden editar actas en borrador.')
      await router.replace(`/settings/archival/transfers/${act.id}`)
      return
    }

    form.value = {
      act_code: act.act_code,
      transfer_kind: act.transfer_kind,
      act_date: act.act_date.slice(0, 10),
      description: act.description ?? '',
    }
    orgUnitId.value = act.org_unit_id != null ? String(act.org_unit_id) : undefined
    await loadTrdSetting()
    await loadEligible(true)
    mergeFilesIntoEligible(act.files ?? [])
    selectedFileIds.value = (act.files ?? []).map(file => Number(file.id))
  }
  catch (error: unknown) {
    toast.error(messageFromFetchError(error, 'No se pudo cargar el borrador'))
    await router.replace('/settings/archival/transfers')
  }
  finally {
    hydratingEdit.value = false
  }
}

function onFileCheckboxChange(id: number, checked: boolean) {
  const currentId = Number(id)

  if (checked) {
    if (!selectedFileIds.value.includes(currentId)) {
      selectedFileIds.value = [...selectedFileIds.value, currentId]
    }
    return
  }

  selectedFileIds.value = selectedFileIds.value.filter(fileId => fileId !== currentId)
}

const {
  pageItems: pagedEligibleFiles,
  pageCount: eligiblePageCount,
  rangeLabel: eligibleRangeLabel,
  goToPreviousPage: goToPreviousEligiblePage,
  goToNextPage: goToNextEligiblePage,
  resetPage: resetEligiblePage,
  page: eligiblePage,
} = useClientPagination(() => eligibleFiles.value)

watch(() => eligibleFiles.value.length, () => {
  resetEligiblePage()
})

async function submit() {
  if (!orgUnitId.value) {
    toast.error('Seleccione el área productora')
    return
  }

  saving.value = true
  try {
    const payload = {
      ...form.value,
      org_unit_id: Number(orgUnitId.value),
      archival_file_ids: selectedFileIds.value,
    }

    const res = editingActId.value == null
      ? await api.createTransferAct(payload)
      : await api.updateTransferAct(editingActId.value, payload)
    toast.success(res.message ?? (editingActId.value == null ? 'Acta creada' : 'Borrador actualizado'))
    await router.push(`/settings/archival/transfers/${res.data.id}`)
  }
  catch (error: unknown) {
    toast.error(messageFromFetchError(error, editingActId.value == null ? 'No se pudo crear el acta' : 'No se pudo actualizar el borrador'))
  }
  finally {
    saving.value = false
  }
}

watch([orgUnitId, () => form.value.transfer_kind], async () => {
  if (hydratingEdit.value) {
    return
  }

  await loadTrdSetting()
  await loadEligible(editingActId.value != null)
})

onMounted(async () => {
  await loadUnits()
  if (editingActId.value != null) {
    await hydrateDraft()
    return
  }

  await loadTrdSetting()
  await loadEligible()
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="flex w-full max-w-2xl flex-col gap-4">
      <Button variant="ghost" size="sm" class="-ml-2 w-fit" @click="router.push('/settings/archival/transfers')">
        <Icon name="i-lucide-arrow-left" class="mr-1 h-4 w-4" />
        Actas
      </Button>
      <h2 class="text-2xl font-bold tracking-tight">
        {{ editingActId ? 'Editar borrador de acta' : 'Nueva acta de transferencia' }}
      </h2>
      <p class="text-sm text-muted-foreground">
        Solo puede elaborar actas del área que tiene designada. El PDF se radica en la serie, subserie y tipo documental configurados para esa área.
      </p>

      <Card>
        <CardContent class="space-y-4 pt-6">
          <div class="space-y-2">
            <Label>Código acta *</Label>
            <Input v-model="form.act_code" />
          </div>
          <div class="space-y-2">
            <Label>Área productora *</Label>
            <Select v-model="orgUnitId" :disabled="editingActId != null">
              <SelectTrigger>
                <SelectValue placeholder="Seleccione su área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="unit in units"
                  :key="unit.id"
                  :value="String(unit.id)"
                >
                  {{ unit.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p v-if="!units.length" class="text-xs text-destructive">
              No tiene un área productora asignada. Solicite su designación en estructura organizacional.
            </p>
            <p v-else-if="missingTrd" class="text-xs text-destructive">
              Falta configurar dónde se radica el PDF del acta (serie / subserie / tipo).
              <NuxtLink class="underline" to="/settings/archival/transfers/trd-filing">
                Ir a configuración
              </NuxtLink>
            </p>
            <p v-else-if="trdLabel" class="text-xs text-muted-foreground">
              Radicación del PDF: {{ trdLabel }}
            </p>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label>Tipo *</Label>
              <Select v-model="form.transfer_kind" :disabled="editingActId != null">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="option in ARCHIVAL_TRANSFER_KIND_OPTIONS"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-2">
              <Label>Fecha acta *</Label>
              <Input v-model="form.act_date" type="date" />
            </div>
          </div>
          <div class="space-y-2">
            <Label>Descripción</Label>
            <Textarea v-model="form.description" rows="3" />
          </div>

          <div class="space-y-2 border-t pt-4">
            <Label>Expedientes con plazo cumplido</Label>
            <p class="text-xs text-muted-foreground">
              El acta transfiere expedientes, no documentos sueltos. Si la TRD de un documento indica selección, conservación o eliminación se registra en el expediente (metadatos del documento), no aquí.
            </p>
            <p v-if="!orgUnitId" class="text-xs text-muted-foreground">
              Seleccione el área para listar expedientes elegibles.
            </p>
            <p v-else-if="!eligibleFiles.length" class="text-xs text-muted-foreground">
              No hay expedientes cerrados listos para esta transferencia (plazo TRD vencido).
            </p>
            <template v-else>
              <div class="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{{ selectedFileIds.length }} seleccionado(s) · {{ eligibleRangeLabel }}</span>
                <div v-if="eligiblePageCount > 1" class="flex gap-1">
                  <Button type="button" size="sm" variant="outline" class="h-7 px-2" :disabled="eligiblePage <= 1" @click="goToPreviousEligiblePage">
                    Anterior
                  </Button>
                  <Button type="button" size="sm" variant="outline" class="h-7 px-2" :disabled="eligiblePage >= eligiblePageCount" @click="goToNextEligiblePage">
                    Siguiente
                  </Button>
                </div>
              </div>
              <div class="flex flex-col gap-2 rounded border p-3">
                <label
                  v-for="file in pagedEligibleFiles"
                  :key="file.id"
                  class="flex cursor-pointer items-start gap-2 text-sm"
                >
                  <Checkbox
                    bare
                    :checked="selectedFileIds.includes(Number(file.id))"
                    @update:checked="onFileCheckboxChange(file.id, $event === true)"
                  />
                  <span>
                    <span class="font-mono text-xs">{{ file.file_number }}</span>
                    — {{ file.title }}
                  </span>
                </label>
              </div>
            </template>
          </div>

          <Button :disabled="saving || missingTrd || !orgUnitId || selectedFileIds.length === 0 || hydratingEdit" @click="submit">
            {{ editingActId ? (saving ? 'Guardando…' : 'Guardar borrador') : (saving ? 'Creando…' : 'Crear acta (borrador)') }}
          </Button>
        </CardContent>
      </Card>
    </div>
  </SettingsLayout>
</template>
