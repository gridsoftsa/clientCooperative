<script setup lang="ts">
import { VENTANILLA_FILING_TYPE_LABELS } from '~/constants/ventanilla'
import type { VentanillaCatalogData, VentanillaFilingTypeValue, VentanillaFunctionalTypeRow } from '~/types/ventanilla'
import type { OrgStaffListItem } from '~/types/org-structure'
import { onDigitsOnlyInput, filterDigitsOnly } from '~/utils/digits-only-input'
import { validateVentanillaCoreFilingForm } from '~/utils/ventanilla-filing-form-validation'
import Multiselect from '@vueform/multiselect'

interface VentanillaOrgUnitOption {
  id: number
  name: string
  code: string
  is_document_producer?: boolean
}

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'ventanilla_crear',
})

const router = useRouter()
const ventanillaApi = useVentanillaApi()
const orgApi = useOrgStructureApi()
const { hasPermission } = usePermissions()
const { $api } = useNuxtApp()

const catalog = ref<VentanillaCatalogData | null>(null)
const saving = ref(false)
const errorMessage = ref('')

const filingType = ref<VentanillaFilingTypeValue>('incoming')
const functionalTypeKey = ref('')
const requiresResponseOverride = ref<boolean | null>(null)
const producerOrgUnitId = ref<number | null>(null)
const recipientOrgUnitId = ref<number | null>(null)
const docDocumentTypeId = ref<number | null>(null)
const senderName = ref('')
const senderIdentifier = ref('')
const recipientName = ref('')
const recipientIdentifier = ref('')
const subject = ref('')
const receptionMedium = ref('')
const notes = ref('')
const metadataValues = ref<Record<string, unknown>>({})

const orgUnits = ref<VentanillaOrgUnitOption[]>([])
const staffOptions = ref<OrgStaffListItem[]>([])
const senderStaffId = ref<number | null>(null)
const recipientStaffId = ref<number | null>(null)
// Compat safety for hot-reload states that may still reference old array models.
const senderStaffIds = computed(() => senderStaffId.value != null ? [senderStaffId.value] : [])
const recipientStaffIds = computed(() => recipientStaffId.value != null ? [recipientStaffId.value] : [])
const fileRows = ref<Array<{ file: File | null; title: string }>>([{ file: null, title: 'Documento principal' }])
const metadataFieldsRef = ref<{ validateRequiredFields?: () => string | null } | null>(null)

const canOverrideResponse = computed(() => hasPermission('ventanilla_override_respuesta'))

function staffById(staffId: number | string | null | undefined): OrgStaffListItem | null {
  if (staffId == null || staffId === '') {
    return null
  }
  const id = Number(staffId)
  if (!Number.isFinite(id)) {
    return null
  }

  return staffOptions.value.find((s) => Number(s.id) === id) ?? null
}

const selectedSenderStaff = computed(() => staffById(senderStaffId.value))

const selectedRecipientStaff = computed(() => staffById(recipientStaffId.value))

const senderStaffChoices = computed(() => {
  const sourceUnitId = producerOrgUnitId.value
  if (!sourceUnitId) {
    return []
  }
  return staffOptions.value
    .filter((s) => s.current_assignment?.org_unit?.id === sourceUnitId)
    .map((s) => ({
      value: Number(s.id),
      label: staffOptionLabel(s),
    }))
})

const recipientStaffChoices = computed(() => {
  const targetUnitId = recipientOrgUnitId.value
  if (!targetUnitId) {
    return []
  }
  return staffOptions.value
    .filter((s) => s.current_assignment?.org_unit?.id === targetUnitId)
    .map((s) => ({
      value: Number(s.id),
      label: staffOptionLabel(s),
    }))
})

const responsibleOrgUnitId = computed(() => {
  if (filingType.value === 'incoming') {
    return recipientOrgUnitId.value
  }

  return producerOrgUnitId.value
})

const selectedFunctionalType = computed(() =>
  catalog.value?.functional_types.find((t: VentanillaFunctionalTypeRow) => t.key === functionalTypeKey.value),
)

const effectiveRequiresResponse = computed(() => {
  if (requiresResponseOverride.value !== null) {
    return requiresResponseOverride.value
  }

  return selectedFunctionalType.value?.requires_response_default ?? true
})

watch(functionalTypeKey, () => {
  requiresResponseOverride.value = null
})

watch(filingType, (nextType) => {
  senderStaffId.value = null
  recipientStaffId.value = null
  if (nextType === 'incoming') {
    producerOrgUnitId.value = null
  }
  if (nextType === 'outgoing') {
    recipientOrgUnitId.value = null
  }
})

function applyStaffToPartyFields(
  staffRow: OrgStaffListItem | null,
  nameRef: typeof senderName,
  identifierRef: typeof senderIdentifier,
): void {
  if (!staffRow) {
    nameRef.value = ''
    identifierRef.value = ''
    return
  }
  nameRef.value = buildSelectedStaffText(staffRow)
  identifierRef.value = filterDigitsOnly(staffRow.document_number?.trim() ?? '')
}

watch(producerOrgUnitId, () => {
  senderStaffId.value = null
  applyStaffToPartyFields(null, senderName, senderIdentifier)
})

watch(recipientOrgUnitId, () => {
  recipientStaffId.value = null
  applyStaffToPartyFields(null, recipientName, recipientIdentifier)
})

watch(senderStaffId, (id) => {
  if (filingType.value === 'incoming') {
    return
  }
  applyStaffToPartyFields(staffById(id), senderName, senderIdentifier)
})

watch(recipientStaffId, (id) => {
  if (filingType.value === 'outgoing') {
    return
  }
  applyStaffToPartyFields(staffById(id), recipientName, recipientIdentifier)
})

onMounted(async () => {
  catalog.value = await ventanillaApi.fetchCatalog()
  try {
    const api = $api as <T>(url: string, options?: Record<string, unknown>) => Promise<T>
    const res = await api<{ data: VentanillaOrgUnitOption[] }>('/organizational-structure/org-units', {
      query: { per_page: 200, is_active: true },
    })
    orgUnits.value = res.data ?? []
  } catch {
    orgUnits.value = []
  }

  try {
    staffOptions.value = await orgApi.fetchStaff({ activeOnly: true })
  } catch {
    staffOptions.value = []
  }
})

function addFileRow() {
  fileRows.value.push({ file: null, title: '' })
}

function removeFileRow(index: number) {
  if (fileRows.value.length <= 1) {
    return
  }
  fileRows.value.splice(index, 1)
}

function setFilingType(key: string) {
  filingType.value = key as VentanillaFilingTypeValue
}

function toggleResponseOverride(value: boolean | 'indeterminate') {
  const enabled = value === true
  if (!selectedFunctionalType.value) {
    return
  }
  requiresResponseOverride.value = enabled
    ? !selectedFunctionalType.value.requires_response_default
    : null
}

function setRequiresResponseFromSelect(value: unknown) {
  requiresResponseOverride.value = String(value) === '1'
}

function onFileChange(index: number, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  const row = fileRows.value[index]
  if (!row) {
    return
  }
  row.file = file
  if (file && !row.title.trim()) {
    row.title = file.name
  }
}

function fullName(staff: OrgStaffListItem): string {
  return [
    staff.first_name,
    staff.second_name,
    staff.first_last_name,
    staff.second_last_name,
  ].filter(Boolean).join(' ')
}

function staffOptionLabel(staff: OrgStaffListItem): string {
  const name = fullName(staff)
  const position = staff.current_assignment?.org_position?.name
  return position ? `${name} — ${position}` : name
}

function buildSelectedStaffText(staffRow: OrgStaffListItem): string {
  return staffOptionLabel(staffRow)
}

function staffDocumentIdentifier(staffRow: OrgStaffListItem | null): string {
  return filterDigitsOnly(staffRow?.document_number?.trim() ?? '')
}

function staffDocumentError(staffRow: OrgStaffListItem | null, label: string): string | null {
  if (!staffRow) {
    return null
  }
  if (!staffDocumentIdentifier(staffRow)) {
    return `${label} no tiene número de documento registrado en nómina`
  }

  return null
}

async function submit() {
  errorMessage.value = ''

  const withFiles = fileRows.value.filter((r: { file: File | null; title: string }) => r.file)

  const computedSenderName = filingType.value === 'incoming'
    ? senderName.value.trim()
    : selectedSenderStaff.value
      ? buildSelectedStaffText(selectedSenderStaff.value)
      : senderName.value.trim()
  const computedSenderIdentifier = filingType.value === 'incoming'
    ? filterDigitsOnly(senderIdentifier.value.trim())
    : selectedSenderStaff.value
      ? staffDocumentIdentifier(selectedSenderStaff.value)
      : filterDigitsOnly(senderIdentifier.value.trim())
  const computedRecipientName = (filingType.value === 'incoming' || filingType.value === 'internal')
    ? (selectedRecipientStaff.value ? buildSelectedStaffText(selectedRecipientStaff.value) : recipientName.value.trim())
    : recipientName.value.trim()
  const computedRecipientIdentifier = (filingType.value === 'incoming' || filingType.value === 'internal')
    ? (selectedRecipientStaff.value ? staffDocumentIdentifier(selectedRecipientStaff.value) : filterDigitsOnly(recipientIdentifier.value.trim()))
    : filterDigitsOnly(recipientIdentifier.value.trim())

  if (filingType.value === 'incoming' && !recipientStaffId.value) {
    errorMessage.value = 'Seleccione destinatario del área'
    return
  }
  if (filingType.value === 'outgoing' && !senderStaffId.value) {
    errorMessage.value = 'Seleccione remitente del área'
    return
  }
  if (filingType.value === 'internal') {
    if (!senderStaffId.value) {
      errorMessage.value = 'Seleccione remitente del área'
      return
    }
    if (!recipientStaffId.value) {
      errorMessage.value = 'Seleccione destinatario del área'
      return
    }
  }

  const senderDocError = filingType.value !== 'incoming'
    ? staffDocumentError(selectedSenderStaff.value, 'El remitente seleccionado')
    : null
  if (senderDocError) {
    errorMessage.value = senderDocError
    return
  }
  const recipientDocError = filingType.value === 'incoming' || filingType.value === 'internal'
    ? staffDocumentError(selectedRecipientStaff.value, 'El destinatario seleccionado')
    : null
  if (recipientDocError) {
    errorMessage.value = recipientDocError
    return
  }

  const formError = validateVentanillaCoreFilingForm({
    filingType: filingType.value,
    functionalTypeKey: functionalTypeKey.value,
    subject: subject.value,
    producerOrgUnitId: producerOrgUnitId.value,
    recipientOrgUnitId: recipientOrgUnitId.value,
    docDocumentTypeId: docDocumentTypeId.value,
    minFileCount: withFiles.length,
    parties: {
      senderName: computedSenderName,
      senderIdentifier: computedSenderIdentifier,
      recipientName: computedRecipientName,
      recipientIdentifier: computedRecipientIdentifier,
    },
    metadataError: metadataFieldsRef.value?.validateRequiredFields?.() ?? null,
  })
  if (formError) {
    errorMessage.value = formError
    return
  }

  const fd = new FormData()
  fd.append('filing_type', filingType.value)
  fd.append('functional_type_key', functionalTypeKey.value)
  if (requiresResponseOverride.value !== null) {
    fd.append('requires_response', requiresResponseOverride.value ? '1' : '0')
  }
  if (producerOrgUnitId.value) {
    fd.append('producer_org_unit_id', String(producerOrgUnitId.value))
  }
  if (recipientOrgUnitId.value) {
    fd.append('recipient_org_unit_id', String(recipientOrgUnitId.value))
  }
  fd.append('sender_name', computedSenderName)
  fd.append('sender_identifier', computedSenderIdentifier)
  if (computedRecipientName) {
    fd.append('recipient_name', computedRecipientName)
  }
  if (computedRecipientIdentifier) {
    fd.append('recipient_identifier', computedRecipientIdentifier)
  }
  fd.append('subject', subject.value.trim())
  if (receptionMedium.value) {
    fd.append('reception_medium', receptionMedium.value)
  }
  if (notes.value.trim()) {
    fd.append('notes', notes.value.trim())
  }
  fd.append('doc_document_type_id', String(docDocumentTypeId.value))
  if (Object.keys(metadataValues.value).length > 0) {
    fd.append('metadata_values', JSON.stringify(metadataValues.value))
  }

  withFiles.forEach((row: { file: File | null; title: string }, index: number) => {
    if (!row.file) {
      return
    }
    fd.append(`files[${index}][file]`, row.file)
    fd.append(`files[${index}][title]`, row.title.trim() || row.file.name)
    if (index === 0) {
      fd.append(`files[${index}][is_primary]`, '1')
    }
  })

  saving.value = true
  try {
    const created = await ventanillaApi.createFiling(fd)
    await router.push(`/ventanilla/${created.id}`)
  } catch (e: unknown) {
    const err = e as { data?: { message?: string; errors?: Record<string, string[]> } }
    const first = err.data?.errors ? Object.values(err.data.errors)[0]?.[0] : null
    errorMessage.value = first ?? err.data?.message ?? 'No se pudo registrar el radicado'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
    <div class="flex items-center gap-3">
      <Button variant="ghost" size="icon" @click="router.push('/ventanilla')">
        <Icon name="i-lucide-arrow-left" class="size-4" />
      </Button>
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">
          Radicar documento
        </h1>
        <p class="text-muted-foreground text-sm">
          Ventanilla única — registro manual
        </p>
      </div>
    </div>

    <form class="space-y-6" @submit.prevent="submit">
      <p v-if="errorMessage" class="text-destructive text-sm">
        {{ errorMessage }}
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Tipo de radicación</CardTitle>
        </CardHeader>
        <CardContent class="grid gap-4 md:grid-cols-3">
          <button
            v-for="(label, key) in VENTANILLA_FILING_TYPE_LABELS"
            :key="key"
            type="button"
            class="rounded-lg border p-4 text-left transition-colors"
            :class="filingType === key ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'"
            @click="setFilingType(key)"
          >
            <span class="font-medium">{{ label }}</span>
          </button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clasificación funcional</CardTitle>
        </CardHeader>
        <CardContent class="grid gap-4">
          <div class="space-y-2">
            <Label>Tipo funcional *</Label>
            <Select v-model="functionalTypeKey">
              <SelectTrigger>
                <SelectValue placeholder="Seleccione…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="t in catalog?.functional_types ?? []"
                  :key="t.key"
                  :value="t.key"
                >
                  {{ t.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p v-if="selectedFunctionalType" class="text-muted-foreground text-xs">
            <template v-if="effectiveRequiresResponse">
              Requiere respuesta — SLA: {{ selectedFunctionalType.sla_business_days ?? '—' }} días hábiles
            </template>
            <template v-else>
              No requiere respuesta (sin SLA)
            </template>
          </p>
          <div v-if="canOverrideResponse && selectedFunctionalType" class="flex items-center gap-2">
            <Checkbox
              :checked="requiresResponseOverride !== null"
              @update:checked="toggleResponseOverride"
            />
            <Label class="font-normal">
              Ajustar manualmente obligación de respuesta
            </Label>
            <Select
              v-if="requiresResponseOverride !== null"
              :model-value="requiresResponseOverride ? '1' : '0'"
              @update:model-value="setRequiresResponseFromSelect"
            >
              <SelectTrigger class="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">
                  Requiere respuesta
                </SelectItem>
                <SelectItem value="0">
                  No requiere respuesta
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Datos del radicado</CardTitle>
        </CardHeader>
        <CardContent class="grid min-w-0 gap-4 md:grid-cols-2">
          <div v-if="filingType === 'incoming'" class="space-y-2 md:col-span-2">
            <Label>Área destinataria *</Label>
            <Select
              :model-value="recipientOrgUnitId != null ? String(recipientOrgUnitId) : undefined"
              @update:model-value="recipientOrgUnitId = $event ? Number($event) : null"
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="u in orgUnits"
                  :key="u.id"
                  :value="String(u.id)"
                >
                  {{ u.code }} — {{ u.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div v-else class="space-y-2 md:col-span-2">
            <Label>Área productora *</Label>
            <Select
              :model-value="producerOrgUnitId != null ? String(producerOrgUnitId) : undefined"
              @update:model-value="producerOrgUnitId = $event ? Number($event) : null"
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="u in orgUnits"
                  :key="u.id"
                  :value="String(u.id)"
                >
                  {{ u.code }} — {{ u.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div v-if="filingType === 'internal'" class="space-y-2 md:col-span-2">
            <Label>Área destinataria *</Label>
            <Select
              :model-value="recipientOrgUnitId != null ? String(recipientOrgUnitId) : undefined"
              @update:model-value="recipientOrgUnitId = $event ? Number($event) : null"
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione área destino" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="u in orgUnits"
                  :key="`int-dest-${u.id}`"
                  :value="String(u.id)"
                >
                  {{ u.code }} — {{ u.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="min-w-0 space-y-2">
            <Label>{{ filingType === 'incoming' ? 'Remitente *' : 'Remitente *' }}</Label>
            <Multiselect
              v-if="filingType !== 'incoming'"
              v-model="senderStaffId"
              class="ventanilla-staff-multiselect"
              :options="senderStaffChoices"
              value-prop="value"
              label="label"
              :searchable="true"
              :disabled="!producerOrgUnitId"
              placeholder="Seleccione remitente"
            />
            <Input v-else v-model="senderName" placeholder="Nombre" />
          </div>
          <div class="space-y-2">
            <Label>Identificación remitente *</Label>
            <Input
              v-model="senderIdentifier"
              inputmode="numeric"
              maxlength="64"
              :readonly="filingType !== 'incoming' && !!senderStaffId"
              :placeholder="filingType !== 'incoming' ? 'Autocompletado' : 'Solo números'"
              @input="onDigitsOnlyInput($event, v => (senderIdentifier = v))"
            />
          </div>
          <div class="min-w-0 space-y-2">
            <Label>{{ filingType === 'incoming' || filingType === 'internal' ? 'Destinatario *' : 'Destinatario *' }}</Label>
            <Multiselect
              v-if="filingType === 'incoming' || filingType === 'internal'"
              v-model="recipientStaffId"
              class="ventanilla-staff-multiselect"
              :options="recipientStaffChoices"
              value-prop="value"
              label="label"
              :searchable="true"
              :disabled="!recipientOrgUnitId"
              placeholder="Seleccione destinatario"
            />
            <Input v-else v-model="recipientName" placeholder="Nombre" />
          </div>
          <div class="space-y-2">
            <Label>
              Identificación destinatario
              <span v-if="filingType === 'outgoing' || filingType === 'internal'">*</span>
            </Label>
            <Input
              v-model="recipientIdentifier"
              inputmode="numeric"
              maxlength="64"
              :readonly="(filingType === 'incoming' || filingType === 'internal') && !!recipientStaffId"
              :placeholder="(filingType === 'incoming' || filingType === 'internal') ? 'Autocompletado' : 'Solo números'"
              @input="onDigitsOnlyInput($event, v => (recipientIdentifier = v))"
            />
          </div>
          <div class="space-y-2 md:col-span-2">
            <Label>Asunto *</Label>
            <Input v-model="subject" maxlength="500" />
          </div>
          <div class="space-y-2">
            <Label>Medio de recepción</Label>
            <Select v-model="receptionMedium">
              <SelectTrigger>
                <SelectValue placeholder="Opcional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="m in catalog?.reception_media ?? []"
                  :key="m.value"
                  :value="m.value"
                >
                  {{ m.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2 md:col-span-2">
            <Label>Observaciones</Label>
            <Textarea v-model="notes" rows="3" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clasificación archivística (TRD)</CardTitle>
          <CardDescription>
            Según el área responsable y la TRD vigente
          </CardDescription>
        </CardHeader>
        <CardContent class="min-w-0">
          <VentanillaTrdPicker
            :org-unit-id="responsibleOrgUnitId"
            v-model:doc-document-type-id="docDocumentTypeId"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Metadatos</CardTitle>
          <CardDescription>
            Campos dinámicos según el tipo funcional y la clasificación TRD.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VentanillaArchivalMetadataFields
            ref="metadataFieldsRef"
            v-model="metadataValues"
            :doc-document-type-id="docDocumentTypeId"
            :functional-type-key="functionalTypeKey"
          />
          <p v-if="!docDocumentTypeId && !functionalTypeKey" class="text-muted-foreground text-sm">
            Seleccione tipo funcional y tipo documental para cargar los metadatos aplicables.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between">
          <CardTitle>Archivos *</CardTitle>
          <Button type="button" variant="outline" size="sm" @click="addFileRow">
            <Icon name="i-lucide-plus" class="mr-1 size-4" />
            Anexo
          </Button>
        </CardHeader>
        <CardContent class="space-y-4">
          <div
            v-for="(row, index) in (fileRows ?? [])"
            :key="index"
            class="flex flex-wrap items-end gap-3 rounded-lg border p-3"
          >
            <div class="min-w-[200px] flex-1 space-y-2">
              <Label>Título *</Label>
              <Input v-model="row.title" />
            </div>
            <div class="min-w-[200px] flex-1 space-y-2">
              <Label>Archivo</Label>
              <Input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" @change="onFileChange(index, $event)" />
            </div>
            <Button
              v-if="(fileRows?.length ?? 0) > 1"
              type="button"
              variant="ghost"
              size="icon"
              @click="removeFileRow(index)"
            >
              <Icon name="i-lucide-trash-2" class="size-4 text-destructive" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div class="flex justify-end gap-3">
        <Button type="button" variant="outline" @click="router.push('/ventanilla')">
          Cancelar
        </Button>
        <Button type="submit" :disabled="saving">
          {{ saving ? 'Registrando…' : 'Registrar radicado' }}
        </Button>
      </div>
    </form>
  </div>
</template>

<style src="@vueform/multiselect/themes/default.css"></style>
<style scoped>
.ventanilla-staff-multiselect {
  width: 100%;
  min-width: 0;
  max-width: 100%;
}

.ventanilla-staff-multiselect :deep(.multiselect-single-label),
.ventanilla-staff-multiselect :deep(.multiselect-placeholder) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
