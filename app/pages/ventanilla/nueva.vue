<script setup lang="ts">
import {
  VENTANILLA_FILING_TYPE_LABELS,
  VENTANILLA_INFORMATIVE_FUNCTIONAL_TYPE_KEY,
  VENTANILLA_INFORMATIVE_TYPE_HINT,
} from '~/constants/ventanilla'
import type { VentanillaCatalogData, VentanillaFilingTypeValue, VentanillaFunctionalTypeRow } from '~/types/ventanilla'
import type { OrgStaffListItem } from '~/types/org-structure'
import { onDigitsOnlyInput, filterDigitsOnly } from '~/utils/digits-only-input'
import {
  isVentanillaFilingFieldMissing,
  resolveFirstVentanillaFilingValidationIssue,
  VENTANILLA_FILING_FIELD_IDS,
  type VentanillaFilingFieldKey,
  type VentanillaFilingValidationIssue,
} from '~/utils/ventanilla-filing-form-validation'
import {
  focusVentanillaFieldById,
  ventanillaInputErrorClass,
  ventanillaMultiselectErrorClass,
} from '~/utils/ventanilla-form-field-focus'
import Multiselect from '@vueform/multiselect'
import { toast } from 'vue-sonner'
import {
  appendDocumentFoliosToFormData,
  createDocumentAttachmentRow,
  type DocumentAttachmentRow,
  validateDocumentAttachmentFolios,
} from '~/utils/document-attachment-folio'

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
const {
  responsibleUsers,
  loadingResponsibleUsers,
  loadResponsibleUsers,
  clearAssignedUserIfMissing,
} = useVentanillaResponsibleUsers()
const catalog = ref<VentanillaCatalogData | null>(null)
const saving = ref(false)
const errorMessage = ref('')
const submitAttempted = ref(false)

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
const assignedUserId = ref<number | null>(null)
const metadataValues = ref<Record<string, unknown>>({})

const orgUnits = ref<VentanillaOrgUnitOption[]>([])
const producerOrgUnits = computed(() =>
  orgUnits.value.filter((unit: VentanillaOrgUnitOption) => unit.is_document_producer),
)
const producerAreaOptions = computed(() =>
  producerOrgUnits.value.length > 0 ? producerOrgUnits.value : orgUnits.value,
)
const staffOptions = ref<OrgStaffListItem[]>([])
const senderStaffId = ref<number | null>(null)
const recipientStaffId = ref<number | null>(null)
// Compat safety for hot-reload states that may still reference old array models.
const senderStaffIds = computed(() => senderStaffId.value != null ? [senderStaffId.value] : [])
const recipientStaffIds = computed(() => recipientStaffId.value != null ? [recipientStaffId.value] : [])
const fileRows = ref<DocumentAttachmentRow[]>([createDocumentAttachmentRow('Documento principal')])
const trdPickerRef = ref<{ focusFirstMissingTrdField?: () => void } | null>(null)
const metadataFieldsRef = ref<{
  findFirstMissingRequiredField?: () => { fieldCode: string; fieldIndex: number; message: string } | null
  focusMissingField?: (fieldCode: string, fieldIndex: number) => void
} | null>(null)

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

const trdOrgUnitRoleLabel = computed(() => {
  if (filingType.value === 'incoming') {
    return 'el área destinataria'
  }

  return 'el área productora'
})

const selectedFunctionalType = computed(() =>
  catalog.value?.functional_types.find((t: VentanillaFunctionalTypeRow) => t.key === functionalTypeKey.value),
)

const selectableFunctionalTypes = computed(() =>
  (catalog.value?.functional_types ?? []).filter(
    (t: VentanillaFunctionalTypeRow) => t.has_active_workflow_binding !== false,
  ),
)

const excludedFunctionalTypes = computed(() =>
  (catalog.value?.functional_types ?? []).filter(
    (t: VentanillaFunctionalTypeRow) => t.has_active_workflow_binding === false,
  ),
)

const functionalTypeOptions = computed(() =>
  selectableFunctionalTypes.value.map((t: VentanillaFunctionalTypeRow) => ({
    value: t.key,
    label: t.label,
  })),
)

function syncFunctionalTypeSelection(): void {
  if (!functionalTypeKey.value) {
    return
  }

  const stillSelectable = selectableFunctionalTypes.value.some(
    (t: VentanillaFunctionalTypeRow) => t.key === functionalTypeKey.value,
  )

  if (!stillSelectable) {
    functionalTypeKey.value = ''
  }
}

const orgUnitSelectOptions = computed(() =>
  orgUnits.value.map((u: VentanillaOrgUnitOption) => ({
    value: u.id,
    label: `${u.code} — ${u.name}`,
  })),
)

const producerAreaSelectOptions = computed(() =>
  producerAreaOptions.value.map((u: VentanillaOrgUnitOption) => ({
    value: u.id,
    label: `${u.code} — ${u.name}`,
  })),
)

const responsibleUserSelectOptions = computed(() =>
  responsibleUsers.value.map((user) => ({
    value: user.id,
    label: user.name,
  })),
)

const receptionMediumSelectOptions = computed(() =>
  (catalog.value?.reception_media ?? []).map((m) => ({
    value: m.value,
    label: m.label,
  })),
)

const requiresResponseSelectOptions = [
  { value: true, label: 'Requiere respuesta' },
  { value: false, label: 'No requiere respuesta' },
] as const

const effectiveRequiresResponse = computed(() => {
  if (requiresResponseOverride.value !== null) {
    return requiresResponseOverride.value
  }

  return selectedFunctionalType.value?.requires_response_default ?? true
})

const computedFilingParties = computed(() => {
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

  return {
    senderName: computedSenderName,
    senderIdentifier: computedSenderIdentifier,
    recipientName: computedRecipientName,
    recipientIdentifier: computedRecipientIdentifier,
  }
})

const attachedFileCount = computed(() =>
  fileRows.value.filter((row: { file: File | null; title: string }) => row.file).length,
)

const validationInput = computed(() => {
  const metadataSnapshot = metadataValues.value
  void metadataSnapshot
  const metadataMissing = metadataFieldsRef.value?.findFirstMissingRequiredField?.() ?? null

  return {
    filingType: filingType.value,
    functionalTypeKey: functionalTypeKey.value,
    subject: subject.value,
    producerOrgUnitId: producerOrgUnitId.value,
    recipientOrgUnitId: recipientOrgUnitId.value,
    docDocumentTypeId: docDocumentTypeId.value,
    minFileCount: attachedFileCount.value,
    senderStaffId: senderStaffId.value,
    recipientStaffId: recipientStaffId.value,
    senderStaffHasDocument: selectedSenderStaff.value
      ? staffDocumentIdentifier(selectedSenderStaff.value).length > 0
      : true,
    recipientStaffHasDocument: selectedRecipientStaff.value
      ? staffDocumentIdentifier(selectedRecipientStaff.value).length > 0
      : true,
    parties: computedFilingParties.value,
    metadataError: metadataMissing?.message ?? null,
    metadataFieldCode: metadataMissing?.fieldCode,
    metadataFieldIndex: metadataMissing?.fieldIndex,
  }
})

function isMissing(field: VentanillaFilingFieldKey): boolean {
  return submitAttempted.value && isVentanillaFilingFieldMissing(field, validationInput.value)
}

function inputErrorClass(field: VentanillaFilingFieldKey): string {
  return ventanillaInputErrorClass(isMissing(field))
}

function multiselectErrorClass(field: VentanillaFilingFieldKey): string {
  return ventanillaMultiselectErrorClass(isMissing(field))
}

watch(functionalTypeKey, () => {
  requiresResponseOverride.value = null
})

watch(filingType, (nextType) => {
  senderStaffId.value = null
  recipientStaffId.value = null
  assignedUserId.value = null
  if (nextType === 'incoming') {
    producerOrgUnitId.value = null
  }
  if (nextType === 'outgoing') {
    recipientOrgUnitId.value = null
  }
})

watch(responsibleOrgUnitId, async (orgUnitId) => {
  await loadResponsibleUsers(orgUnitId)
  clearAssignedUserIfMissing(assignedUserId)
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
  try {
    catalog.value = await ventanillaApi.fetchCatalog()
    orgUnits.value = catalog.value.org_units ?? []
    staffOptions.value = catalog.value.org_staff ?? []
    syncFunctionalTypeSelection()
  } catch {
    catalog.value = null
    toast.error('No se pudo cargar el catálogo de ventanilla')
  }

  if (orgUnits.value.length === 0) {
    try {
      orgUnits.value = await orgApi.fetchUnits({ activeOnly: true })
    } catch {
      orgUnits.value = []
      toast.error('No se pudieron cargar las áreas organizacionales')
    }
  }

  if (staffOptions.value.length === 0) {
    try {
      staffOptions.value = await orgApi.fetchStaff({ activeOnly: true })
    } catch {
      staffOptions.value = []
      toast.error('No se pudieron cargar los funcionarios')
    }
  }
})

function addFileRow() {
  fileRows.value.push(createDocumentAttachmentRow())
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

function validateFileAttachments(): VentanillaFilingValidationIssue | null {
  const withFiles = fileRows.value.filter(row => row.file)
  if (withFiles.length === 0) {
    return { field: 'file', message: 'Adjunte al menos un archivo' }
  }

  for (const [index, row] of withFiles.entries()) {
    if (!row.title.trim()) {
      return { field: 'file', message: `Indique el título del documento ${index + 1}.` }
    }

    const folioError = validateDocumentAttachmentFolios(row.folioStart, row.folioEnd)
    if (folioError) {
      return { field: 'file', message: `${folioError} (documento ${index + 1})` }
    }
  }

  return null
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

async function focusValidationIssue(issue: VentanillaFilingValidationIssue): Promise<void> {
  await nextTick()

  if (issue.field === 'trd_document_type') {
    trdPickerRef.value?.focusFirstMissingTrdField?.()

    return
  }

  if (issue.field === 'metadata' && issue.metadataFieldCode != null && issue.metadataFieldIndex != null) {
    metadataFieldsRef.value?.focusMissingField?.(issue.metadataFieldCode, issue.metadataFieldIndex)

    return
  }

  focusVentanillaFieldById(VENTANILLA_FILING_FIELD_IDS[issue.field])
}

async function submit() {
  errorMessage.value = ''
  submitAttempted.value = true

  if (selectableFunctionalTypes.value.length === 0) {
    errorMessage.value = 'No hay tipos funcionales con flujo de trabajo activo. Configure el anclaje en Workflow → Configuración.'
    return
  }

  const issue = resolveFirstVentanillaFilingValidationIssue(validationInput.value)
  if (issue) {
    errorMessage.value = issue.message
    await focusValidationIssue(issue)

    return
  }

  const attachmentIssue = validateFileAttachments()
  if (attachmentIssue) {
    errorMessage.value = attachmentIssue.message
    await focusValidationIssue(attachmentIssue)

    return
  }

  submitAttempted.value = false

  const withFiles = fileRows.value.filter(row => row.file)
  const parties = computedFilingParties.value

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
  fd.append('sender_name', parties.senderName)
  fd.append('sender_identifier', parties.senderIdentifier)
  if (parties.recipientName) {
    fd.append('recipient_name', parties.recipientName)
  }
  if (parties.recipientIdentifier) {
    fd.append('recipient_identifier', parties.recipientIdentifier)
  }
  fd.append('subject', subject.value.trim())
  if (receptionMedium.value) {
    fd.append('reception_medium', receptionMedium.value)
  }
  if (notes.value.trim()) {
    fd.append('notes', notes.value.trim())
  }
  if (assignedUserId.value) {
    fd.append('assigned_user_id', String(assignedUserId.value))
  }
  fd.append('doc_document_type_id', String(docDocumentTypeId.value))
  if (Object.keys(metadataValues.value).length > 0) {
    fd.append('metadata_values', JSON.stringify(metadataValues.value))
  }

  withFiles.forEach((row, index) => {
    if (!row.file) {
      return
    }
    fd.append(`files[${index}][file]`, row.file)
    fd.append(`files[${index}][title]`, row.title.trim() || row.file.name)
    appendDocumentFoliosToFormData(fd, index, row.folioStart, row.folioEnd)
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
  <div class="mx-auto w-full max-w-7xl space-y-6 px-4 pb-8 md:px-6">
    <div class="flex items-start gap-3">
      <Button variant="ghost" size="icon" class="shrink-0" @click="router.push('/ventanilla')">
        <Icon name="i-lucide-arrow-left" class="size-4" />
      </Button>
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">
          Radicar documento
        </h1>
        <p class="text-sm text-muted-foreground">
          Ventanilla única — registro manual
        </p>
      </div>
    </div>

    <form class="space-y-6" @submit.prevent="submit">
      <p v-if="errorMessage" class="text-destructive text-sm">
        {{ errorMessage }}
      </p>

      <Card>
        <CardHeader class="pb-4">
          <CardTitle class="text-base">
            Tipo de radicación
          </CardTitle>
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

      <Card class="border-primary/20 shadow-sm">
        <CardHeader class="pb-4">
          <CardTitle>
            Clasificación funcional
          </CardTitle>
          <CardDescription>
            Paso principal: define el tipo de trámite, el flujo de trabajo y la obligación de respuesta.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <Alert
            v-if="excludedFunctionalTypes.length > 0"
            class="border-amber-500/40 bg-amber-500/10 text-amber-950 dark:text-amber-100"
          >
            <Icon name="i-lucide-triangle-alert" class="size-4" />
            <AlertTitle>Tipos funcionales no disponibles</AlertTitle>
            <AlertDescription class="space-y-2 text-sm">
              <p>
                Los siguientes tipos no tienen un flujo de trabajo activo anclado y no aparecen en el selector:
              </p>
              <ul class="list-inside list-disc">
                <li v-for="type in excludedFunctionalTypes" :key="type.key">
                  {{ type.label }}
                </li>
              </ul>
              <p v-if="selectableFunctionalTypes.length === 0" class="font-medium">
                No puede radicar hasta que al menos un tipo funcional tenga workflow configurado.
              </p>
              <p>
                Configure el anclaje en
                <NuxtLink to="/workflow/configuracion" class="font-medium underline underline-offset-2">
                  Workflow → Configuración
                </NuxtLink>.
              </p>
            </AlertDescription>
          </Alert>

          <div class="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)] xl:items-start">
            <div class="space-y-2">
              <Label>Tipo funcional *</Label>
              <Multiselect
                id="ventanilla_functional_type"
                v-model="functionalTypeKey"
                mode="single"
                :object="false"
                :options="functionalTypeOptions"
                value-prop="value"
                label="label"
                :searchable="true"
                :can-clear="false"
                placeholder="Seleccione…"
                no-options-text="Sin opciones"
                no-results-text="Sin coincidencias"
                :class="multiselectErrorClass('functional_type')"
              />
            </div>

            <div class="space-y-3 rounded-lg border bg-muted/20 p-4">
              <p v-if="selectedFunctionalType" class="text-sm">
                <template v-if="effectiveRequiresResponse">
                  <span class="font-medium text-foreground">Requiere respuesta</span>
                  <span class="text-muted-foreground"> — SLA: {{ selectedFunctionalType.sla_business_days ?? '—' }} días hábiles</span>
                </template>
                <template v-else>
                  <span class="font-medium text-foreground">No requiere respuesta</span>
                  <span class="text-muted-foreground"> (sin SLA)</span>
                </template>
              </p>
              <p v-else class="text-sm text-muted-foreground">
                Seleccione un tipo funcional para ver el SLA y las reglas de respuesta.
              </p>

              <p
                v-if="functionalTypeKey === VENTANILLA_INFORMATIVE_FUNCTIONAL_TYPE_KEY"
                class="rounded-md border border-border bg-background p-3 text-xs text-muted-foreground"
              >
                {{ VENTANILLA_INFORMATIVE_TYPE_HINT }}
              </p>

              <div v-if="canOverrideResponse && selectedFunctionalType" class="space-y-2 border-t pt-3">
                <label class="flex items-center gap-2 text-sm">
                  <Checkbox
                    :checked="requiresResponseOverride !== null"
                    @update:checked="toggleResponseOverride"
                  />
                  <span>Ajustar manualmente obligación de respuesta</span>
                </label>
                <Multiselect
                  v-if="requiresResponseOverride !== null"
                  v-model="requiresResponseOverride"
                  mode="single"
                  :object="false"
                  :options="requiresResponseSelectOptions"
                  value-prop="value"
                  label="label"
                  :can-clear="false"
                  :searchable="false"
                  class="ventanilla-single-multiselect w-full"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div class="space-y-6">
          <Card>
            <CardHeader class="pb-4">
              <CardTitle class="text-base">
                Datos del radicado
              </CardTitle>
              <CardDescription>
                Áreas, partes, asunto y observaciones del trámite.
              </CardDescription>
            </CardHeader>
            <CardContent class="grid min-w-0 gap-4 md:grid-cols-2">
          <div v-if="filingType === 'incoming'" class="space-y-2 md:col-span-2">
            <Label>Área destinataria *</Label>
            <Multiselect
              id="ventanilla_recipient_org_unit"
              v-model="recipientOrgUnitId"
              mode="single"
              :object="false"
              :options="orgUnitSelectOptions"
              value-prop="value"
              label="label"
              :searchable="true"
              :can-clear="false"
              placeholder="Seleccione área"
              no-options-text="Sin áreas disponibles"
              no-results-text="Sin coincidencias"
              :class="multiselectErrorClass('recipient_org_unit')"
            />
          </div>
          <div v-else class="space-y-2 md:col-span-2">
            <Label>Área productora *</Label>
            <Multiselect
              id="ventanilla_producer_org_unit"
              v-model="producerOrgUnitId"
              mode="single"
              :object="false"
              :options="producerAreaSelectOptions"
              value-prop="value"
              label="label"
              :searchable="true"
              :can-clear="false"
              placeholder="Seleccione área"
              no-options-text="Sin áreas productoras"
              no-results-text="Sin coincidencias"
              :class="multiselectErrorClass('producer_org_unit')"
            />
          </div>
          <div v-if="filingType === 'internal'" class="space-y-2 md:col-span-2">
            <Label>Área destinataria *</Label>
            <Multiselect
              id="ventanilla_recipient_org_unit"
              v-model="recipientOrgUnitId"
              mode="single"
              :object="false"
              :options="orgUnitSelectOptions"
              value-prop="value"
              label="label"
              :searchable="true"
              :can-clear="false"
              placeholder="Seleccione área destino"
              no-options-text="Sin áreas disponibles"
              no-results-text="Sin coincidencias"
              :class="multiselectErrorClass('recipient_org_unit')"
            />
          </div>
          <div class="min-w-0 space-y-2">
            <Label>{{ filingType === 'incoming' ? 'Remitente *' : 'Remitente *' }}</Label>
            <Multiselect
              v-if="filingType !== 'incoming'"
              id="ventanilla_sender_staff"
              v-model="senderStaffId"
              mode="single"
              :object="false"
              :class="multiselectErrorClass('sender_staff')"
              :options="senderStaffChoices"
              value-prop="value"
              label="label"
              :searchable="true"
              :can-clear="false"
              :disabled="!producerOrgUnitId"
              placeholder="Seleccione remitente"
              no-options-text="Sin funcionarios en el área"
              no-results-text="Sin coincidencias"
            />
            <Input
              v-else
              id="ventanilla_sender_name"
              v-model="senderName"
              placeholder="Nombre"
              :class="inputErrorClass('sender_name')"
            />
          </div>
          <div class="space-y-2">
            <Label>Identificación remitente *</Label>
            <Input
              id="ventanilla_sender_identifier"
              v-model="senderIdentifier"
              inputmode="numeric"
              maxlength="64"
              :readonly="filingType !== 'incoming' && !!senderStaffId"
              :placeholder="filingType !== 'incoming' ? 'Autocompletado' : 'Solo números'"
              :class="inputErrorClass('sender_identifier')"
              @input="onDigitsOnlyInput($event, v => (senderIdentifier = v))"
            />
          </div>
          <div class="min-w-0 space-y-2">
            <Label>{{ filingType === 'incoming' || filingType === 'internal' ? 'Destinatario *' : 'Destinatario *' }}</Label>
            <Multiselect
              v-if="filingType === 'incoming' || filingType === 'internal'"
              id="ventanilla_recipient_staff"
              v-model="recipientStaffId"
              mode="single"
              :object="false"
              :class="multiselectErrorClass('recipient_staff')"
              :options="recipientStaffChoices"
              value-prop="value"
              label="label"
              :searchable="true"
              :can-clear="false"
              :disabled="!recipientOrgUnitId"
              placeholder="Seleccione destinatario"
              no-options-text="Sin funcionarios en el área"
              no-results-text="Sin coincidencias"
            />
            <Input
              v-else
              id="ventanilla_recipient_name"
              v-model="recipientName"
              placeholder="Nombre"
              :class="inputErrorClass('recipient_name')"
            />
          </div>
          <div class="space-y-2">
            <Label>
              Identificación destinatario
              <span v-if="filingType === 'outgoing' || filingType === 'internal'">*</span>
            </Label>
            <Input
              id="ventanilla_recipient_identifier"
              v-model="recipientIdentifier"
              inputmode="numeric"
              maxlength="64"
              :readonly="(filingType === 'incoming' || filingType === 'internal') && !!recipientStaffId"
              :placeholder="(filingType === 'incoming' || filingType === 'internal') ? 'Autocompletado' : 'Solo números'"
              :class="inputErrorClass('recipient_identifier')"
              @input="onDigitsOnlyInput($event, v => (recipientIdentifier = v))"
            />
          </div>
          <div class="space-y-2 md:col-span-2">
            <Label>Asunto *</Label>
            <Input id="ventanilla_subject" v-model="subject" maxlength="500" :class="inputErrorClass('subject')" />
          </div>
          <div class="space-y-2">
            <Label>Responsable asignado</Label>
            <p class="text-muted-foreground text-xs">
              Solo usuarios vinculados al área responsable del radicado.
            </p>
            <Multiselect
              v-model="assignedUserId"
              mode="single"
              :object="false"
              :options="responsibleUserSelectOptions"
              value-prop="value"
              label="label"
              :searchable="true"
              :can-clear="true"
              :disabled="!responsibleOrgUnitId || loadingResponsibleUsers"
              :placeholder="responsibleOrgUnitId ? 'Opcional' : 'Seleccione primero el área'"
              no-options-text="Sin usuarios en el área"
              no-results-text="Sin coincidencias"
              class="ventanilla-single-multiselect"
            />
            <p
              v-if="responsibleOrgUnitId && !loadingResponsibleUsers && !responsibleUsers.length"
              class="text-muted-foreground text-xs"
            >
              No hay usuarios asignados a esta área en la estructura organizacional.
            </p>
          </div>
          <div class="space-y-2">
            <Label>Medio de recepción</Label>
            <Multiselect
              v-model="receptionMedium"
              mode="single"
              :object="false"
              :options="receptionMediumSelectOptions"
              value-prop="value"
              label="label"
              :searchable="true"
              :can-clear="true"
              placeholder="Opcional"
              no-options-text="Sin medios configurados"
              no-results-text="Sin coincidencias"
              class="ventanilla-single-multiselect"
            />
          </div>
          <div class="space-y-2 md:col-span-2">
            <Label>Observaciones</Label>
            <Textarea v-model="notes" rows="4" class="min-h-[6rem] resize-y" />
          </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="pb-4">
              <CardTitle class="text-base">
                Clasificación archivística (TRD)
              </CardTitle>
              <CardDescription>
                Según la TRD vigente del área productora (en interna y salida) o del área destinataria (en entrada).
              </CardDescription>
            </CardHeader>
            <CardContent class="min-w-0">
              <VentanillaTrdPicker
                ref="trdPickerRef"
                :org-unit-id="responsibleOrgUnitId"
                :org-unit-role-label="trdOrgUnitRoleLabel"
                :submit-attempted="submitAttempted"
                v-model:doc-document-type-id="docDocumentTypeId"
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="pb-4">
              <CardTitle class="text-base">
                Metadatos
              </CardTitle>
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
                :submit-attempted="submitAttempted"
              />
              <p v-if="!docDocumentTypeId && !functionalTypeKey" class="text-muted-foreground text-sm">
                Seleccione tipo funcional y tipo documental para cargar los metadatos aplicables.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="flex flex-row items-center justify-between pb-4">
              <div>
                <CardTitle class="text-base">
                  Archivos *
                </CardTitle>
                <CardDescription>
                  Documento principal y anexos del radicado.
                </CardDescription>
              </div>
              <Button type="button" variant="outline" size="sm" @click="addFileRow">
                <Icon name="i-lucide-plus" class="mr-1 size-4" />
                Anexo
              </Button>
            </CardHeader>
            <CardContent class="space-y-4">
              <DocumentsDocumentAttachmentUploadCard
                v-for="(row, index) in (fileRows ?? [])"
                :key="index"
                :label="index === 0 ? 'Documento principal' : `Anexo ${index}`"
                :primary="index === 0"
                :removable="(fileRows?.length ?? 0) > 1"
                :submit-attempted="submitAttempted"
                :file-input-id="index === 0 ? 'ventanilla_file_0' : undefined"
                :title="row.title"
                :folio-start="row.folioStart"
                :folio-end="row.folioEnd"
                :file="row.file"
                @update:title="row.title = $event"
                @update:folio-start="row.folioStart = $event"
                @update:folio-end="row.folioEnd = $event"
                @update:file="row.file = $event"
                @remove="removeFileRow(index)"
              />
            </CardContent>
          </Card>
      </div>

      <Card>
        <CardContent class="flex flex-col-reverse justify-end gap-3 p-4 sm:flex-row">
          <Button type="button" variant="outline" @click="router.push('/ventanilla')">
            Cancelar
          </Button>
          <Button type="submit" :disabled="saving">
            {{ saving ? 'Registrando…' : 'Registrar radicado' }}
          </Button>
        </CardContent>
      </Card>
    </form>
  </div>
</template>

<style src="@vueform/multiselect/themes/default.css"></style>
<style scoped>
.ventanilla-single-multiselect {
  width: 100%;
  min-width: 0;
  max-width: 100%;
}

.ventanilla-single-multiselect :deep(.multiselect-single-label),
.ventanilla-single-multiselect :deep(.multiselect-placeholder) {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ventanilla-single-multiselect.multiselect-danger :deep(.multiselect-wrapper) {
  border-color: hsl(var(--destructive));
}

.ventanilla-single-multiselect.multiselect-danger :deep(.multiselect-wrapper:focus-within) {
  border-color: hsl(var(--destructive));
  box-shadow: 0 0 0 2px hsl(var(--destructive) / 0.4);
}
</style>
