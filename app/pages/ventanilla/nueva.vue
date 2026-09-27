<script setup lang="ts">
import {
  VENTANILLA_FILING_TYPE_LABELS,
  VENTANILLA_INFORMATIVE_FUNCTIONAL_TYPE_KEY,
  VENTANILLA_INFORMATIVE_TYPE_HINT,
  VENTANILLA_OTHER_FUNCTIONAL_TYPE_KEY,
} from '~/constants/ventanilla'
import type { VentanillaCatalogData, VentanillaFilingTypeValue, VentanillaFunctionalTypeRow } from '~/types/ventanilla'
import type { OrgStaffListItem } from '~/types/org-structure'
import { filterDigitsOnly } from '~/utils/digits-only-input'
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
import {
  VENTANILLA_FILING_UPLOAD_CONSTRAINTS,
  validateDocumentUploadFile,
} from '~/utils/document-upload-constraints'
import {
  configuredProducerAreasForFunctionalType,
  clearInvalidOrgUnitSelectionsForFunctionalType,
  filterOrgUnitsByFunctionalTypeAreas,
} from '~/utils/ventanilla-functional-type-areas'

interface VentanillaOrgUnitOption {
  id: number
  name: string
  code: string
  is_document_producer?: boolean
  manager_staff_id?: number | null
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
const { user } = useAuth()
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
const slaBusinessDaysInput = ref('')
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
const filingUploadConstraints = VENTANILLA_FILING_UPLOAD_CONSTRAINTS
const trdPickerRef = ref<{ focusFirstMissingTrdField?: () => void } | null>(null)
const metadataFieldsRef = ref<{
  findFirstMissingRequiredField?: () => { fieldCode: string; fieldIndex: number; message: string } | null
  focusMissingField?: (fieldCode: string, fieldIndex: number) => void
} | null>(null)

type FilingFormSectionId = 'clasificacion' | 'trd' | 'metadatos' | 'archivos'

const FILING_FORM_SECTIONS: Array<{
  id: FilingFormSectionId
  label: string
  icon: string
}> = [
  { id: 'clasificacion', label: 'Clasificación', icon: 'i-lucide-layers' },
  { id: 'trd', label: 'TRD', icon: 'i-lucide-folder-tree' },
  { id: 'metadatos', label: 'Metadatos', icon: 'i-lucide-list' },
  { id: 'archivos', label: 'Archivos', icon: 'i-lucide-paperclip' },
]

const FIELD_TO_SECTION: Record<VentanillaFilingFieldKey, FilingFormSectionId> = {
  functional_type: 'clasificacion',
  recipient_org_unit: 'clasificacion',
  producer_org_unit: 'clasificacion',
  sender_staff: 'clasificacion',
  recipient_staff: 'clasificacion',
  sender_name: 'clasificacion',
  sender_identifier: 'clasificacion',
  recipient_name: 'clasificacion',
  recipient_identifier: 'clasificacion',
  subject: 'clasificacion',
  trd_document_type: 'trd',
  metadata: 'metadatos',
  file: 'archivos',
}

const optionalDetailsOpen = ref(false)

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
  const choices = staffOptions.value
    .filter(s => assignmentOrgUnitId(s) === Number(sourceUnitId))
    .map((s) => ({
      value: Number(s.id),
      label: staffOptionLabel(s),
    }))
  const loggedStaff = filingType.value === 'internal' ? currentUserStaff.value : null
  if (loggedStaff && !choices.some(choice => choice.value === Number(loggedStaff.id))) {
    choices.unshift({
      value: Number(loggedStaff.id),
      label: staffOptionLabel(loggedStaff),
    })
  }

  return choices
})

const recipientStaffChoices = computed(() => {
  const targetUnitId = recipientOrgUnitId.value
  if (!targetUnitId) {
    return []
  }
  const choices = staffOptions.value
    .filter(s => assignmentOrgUnitId(s) === Number(targetUnitId))
    .map((s) => ({
      value: Number(s.id),
      label: staffOptionLabel(s),
    }))
  const manager = functionalTypeManagerStaff.value
  if (manager && !choices.some(choice => choice.value === Number(manager.id))) {
    choices.unshift({
      value: Number(manager.id),
      label: staffOptionLabel(manager),
    })
  }

  return choices
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

const configuredProducerAreas = computed(() =>
  configuredProducerAreasForFunctionalType(selectedFunctionalType.value),
)

function withPinnedOrgUnit(
  options: VentanillaOrgUnitOption[],
  unitId: number | null,
): VentanillaOrgUnitOption[] {
  if (unitId == null || options.some(unit => unit.id === unitId)) {
    return options
  }

  const unit = orgUnits.value.find(item => item.id === unitId)

  return unit ? [...options, unit] : options
}

const recipientOrgUnitOptions = computed(() =>
  withPinnedOrgUnit(
    filterOrgUnitsByFunctionalTypeAreas(orgUnits.value, configuredProducerAreas.value),
    functionalTypeDestinationOrgUnitId.value,
  ),
)

const producerOrgUnitOptions = computed(() => {
  const options = configuredProducerAreas.value.length > 0
    ? filterOrgUnitsByFunctionalTypeAreas(orgUnits.value, configuredProducerAreas.value)
    : producerAreaOptions.value

  return withPinnedOrgUnit(
    options,
    filingType.value === 'internal' ? internalSenderOrgUnitId.value : null,
  )
})

function clearInvalidOrgUnitSelections(): void {
  const cleared = clearInvalidOrgUnitSelectionsForFunctionalType(
    filingType.value,
    producerOrgUnitId.value,
    recipientOrgUnitId.value,
    configuredProducerAreas.value,
  )

  producerOrgUnitId.value = cleared.producerOrgUnitId
  recipientOrgUnitId.value = cleared.recipientOrgUnitId
}

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

const functionalTypeOptions = computed(() => {
  const options = selectableFunctionalTypes.value.map((t: VentanillaFunctionalTypeRow) => ({
    value: t.key,
    label: t.label,
  }))
  const rest = options.filter(option => option.value !== VENTANILLA_OTHER_FUNCTIONAL_TYPE_KEY)
  const other = options.filter(option => option.value === VENTANILLA_OTHER_FUNCTIONAL_TYPE_KEY)

  return [...rest, ...other]
})

const isOtherFunctionalType = computed(() => functionalTypeKey.value === VENTANILLA_OTHER_FUNCTIONAL_TYPE_KEY)

function assignmentOrgUnitId(staff: OrgStaffListItem | null | undefined): number | null {
  const unitId = staff?.current_assignment?.org_unit?.id
  if (unitId == null || !Number.isFinite(Number(unitId))) {
    return null
  }

  return Number(unitId)
}

function normalizeStaffRow(staff: OrgStaffListItem): OrgStaffListItem {
  const raw = staff as OrgStaffListItem & { currentAssignment?: Record<string, unknown> | null }
  const assignment = (staff.current_assignment ?? raw.currentAssignment ?? null) as {
    org_unit?: { id: number, name: string, code: string } | null
    orgUnit?: { id: number, name: string, code: string } | null
    org_office?: { id: number, name: string, code: string } | null
    orgOffice?: { id: number, name: string, code: string } | null
    org_position?: { id: number, name: string, code: string } | null
    orgPosition?: { id: number, name: string, code: string } | null
  } | null
  if (!assignment) {
    return {
      ...staff,
      user_id: staff.user_id ?? staff.user?.id ?? null,
    }
  }

  return {
    ...staff,
    user_id: staff.user_id ?? staff.user?.id ?? null,
    current_assignment: {
      ...staff.current_assignment,
      org_unit: assignment.org_unit ?? assignment.orgUnit ?? null,
      org_office: assignment.org_office ?? assignment.orgOffice ?? null,
      org_position: assignment.org_position ?? assignment.orgPosition ?? null,
    },
  }
}

const currentUserStaff = computed(() =>
  staffOptions.value.find((staff) => {
    if (staff.is_active === false) {
      return false
    }

    const staffUserId = staff.user_id ?? staff.user?.id

    return staffUserId != null && Number(staffUserId) === Number(user.value?.id)
  }) ?? null,
)

const internalSenderOrgUnitId = computed(() => assignmentOrgUnitId(currentUserStaff.value))

const senderAreaHasManager = computed(() => {
  const unitId = internalSenderOrgUnitId.value
  if (unitId == null) {
    return false
  }

  const unit = orgUnits.value.find(item => item.id === unitId)

  return unit?.manager_staff_id != null
})

const functionalTypeDestinationOrgUnitId = computed(() =>
  selectedFunctionalType.value?.public_org_unit_id ?? null,
)

const functionalTypeManagerStaff = computed(() => {
  const destinationId = functionalTypeDestinationOrgUnitId.value
  const managerUserId = selectedFunctionalType.value?.public_manager_user_id
  if (destinationId == null || managerUserId == null) {
    return null
  }

  return staffOptions.value.find(staff =>
    Number(staff.user_id ?? staff.user?.id) === Number(managerUserId),
  ) ?? null
})

const applyingInternalDefaults = ref(false)
let lastAutoSubject = ''

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
  recipientOrgUnitOptions.value.map((u: VentanillaOrgUnitOption) => ({
    value: u.id,
    label: `${u.code} — ${u.name}`,
  })),
)

const producerAreaSelectOptions = computed(() =>
  producerOrgUnitOptions.value.map((u: VentanillaOrgUnitOption) => ({
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

const effectiveRequiresResponse = computed(() => {
  if (requiresResponseOverride.value !== null) {
    return requiresResponseOverride.value
  }

  return selectedFunctionalType.value?.requires_response_default ?? true
})

const needsManualSlaDays = computed(() => {
  const configuredDays = selectedFunctionalType.value?.sla_business_days

  return effectiveRequiresResponse.value
    && selectedFunctionalType.value != null
    && (configuredDays == null || configuredDays < 1)
})

const displayedSlaDays = computed(() => {
  if (!effectiveRequiresResponse.value) {
    return null
  }

  const configuredDays = selectedFunctionalType.value?.sla_business_days
  if (configuredDays != null && configuredDays > 0) {
    return configuredDays
  }

  const typed = Number(slaBusinessDaysInput.value)

  return Number.isFinite(typed) && typed > 0 ? typed : null
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

const hasOptionalDetails = computed(() =>
  assignedUserId.value != null
  || receptionMedium.value !== ''
  || notes.value.trim() !== '',
)

const classificationComplete = computed(() => functionalTypeKey.value !== '')

const orgUnitsComplete = computed(() => {
  if (filingType.value === 'incoming') {
    return recipientOrgUnitId.value != null
  }

  if (filingType.value === 'outgoing') {
    return producerOrgUnitId.value != null
  }

  return producerOrgUnitId.value != null && recipientOrgUnitId.value != null
})

const partiesComplete = computed(() => {
  const parties = computedFilingParties.value

  if (!parties.senderName) {
    return false
  }

  if (filingType.value === 'outgoing' || filingType.value === 'internal') {
    return Boolean(parties.recipientName)
  }

  return true
})

const datosComplete = computed(() =>
  orgUnitsComplete.value && partiesComplete.value && subject.value.trim() !== '',
)

const trdComplete = computed(() => docDocumentTypeId.value != null)

const metadataComplete = computed(() => {
  void metadataValues.value

  if (!functionalTypeKey.value && !docDocumentTypeId.value) {
    return false
  }

  return !metadataFieldsRef.value?.findFirstMissingRequiredField?.()
})

const filesComplete = computed(() => attachedFileCount.value > 0)

function isSectionComplete(id: FilingFormSectionId): boolean {
  if (id === 'clasificacion') {
    return classificationComplete.value && datosComplete.value
  }
  if (id === 'trd') {
    return trdComplete.value
  }
  if (id === 'metadatos') {
    return metadataComplete.value
  }

  return filesComplete.value
}

const completedSectionCount = computed(() =>
  FILING_FORM_SECTIONS.filter(section => isSectionComplete(section.id)).length,
)

const requiredSectionTotal = FILING_FORM_SECTIONS.length
const activeSection = ref<FilingFormSectionId>('clasificacion')

function goToSection(id: FilingFormSectionId): void {
  activeSection.value = id
}

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

function applySubjectForFunctionalType(): void {
  const type = selectedFunctionalType.value
  if (!type) {
    subject.value = ''
    lastAutoSubject = ''
    return
  }

  if (type.key === VENTANILLA_OTHER_FUNCTIONAL_TYPE_KEY) {
    if (subject.value === lastAutoSubject) {
      subject.value = ''
    }
    lastAutoSubject = ''
    return
  }

  subject.value = type.label
  lastAutoSubject = type.label
}

function applyInternalSender(): void {
  if (filingType.value !== 'internal') {
    return
  }

  const staff = currentUserStaff.value
  const unitId = assignmentOrgUnitId(staff)
  if (!staff || unitId == null) {
    return
  }

  applyingInternalDefaults.value = true
  producerOrgUnitId.value = unitId
  senderStaffId.value = Number(staff.id)
  applyStaffToPartyFields(staff, senderName, senderIdentifier)
  applyingInternalDefaults.value = false
}

function applyFunctionalTypeRecipient(): void {
  const destinationId = functionalTypeDestinationOrgUnitId.value
  if (destinationId == null) {
    recipientOrgUnitId.value = null
    return
  }

  applyingInternalDefaults.value = true
  recipientOrgUnitId.value = destinationId
  const managerStaff = functionalTypeManagerStaff.value
  if (managerStaff && filingType.value !== 'outgoing') {
    recipientStaffId.value = Number(managerStaff.id)
  }
  if (managerStaff) {
    applyStaffToPartyFields(managerStaff, recipientName, recipientIdentifier)
  }
  applyingInternalDefaults.value = false
}

watch(functionalTypeKey, () => {
  requiresResponseOverride.value = null
  slaBusinessDaysInput.value = ''
  docDocumentTypeId.value = null
  clearInvalidOrgUnitSelections()
  applySubjectForFunctionalType()
  if (filingType.value === 'internal') {
    applyInternalSender()
  }
  applyFunctionalTypeRecipient()
})

watch(filingType, (nextType) => {
  senderStaffId.value = null
  recipientStaffId.value = null
  assignedUserId.value = null
  docDocumentTypeId.value = null

  if (nextType === 'incoming') {
    producerOrgUnitId.value = null
  }
  if (nextType === 'outgoing') {
    recipientOrgUnitId.value = null
  }

  clearInvalidOrgUnitSelections()
  if (nextType === 'internal') {
    applyInternalSender()
  }
  applyFunctionalTypeRecipient()
})

watch(producerOrgUnitId, () => {
  if (filingType.value !== 'incoming') {
    docDocumentTypeId.value = null
  }

  if (applyingInternalDefaults.value) {
    return
  }

  senderStaffId.value = null
  applyStaffToPartyFields(null, senderName, senderIdentifier)
}, { flush: 'sync' })

watch(recipientOrgUnitId, () => {
  if (filingType.value === 'incoming') {
    docDocumentTypeId.value = null
  }

  if (applyingInternalDefaults.value) {
    return
  }

  recipientStaffId.value = null
  applyStaffToPartyFields(null, recipientName, recipientIdentifier)
}, { flush: 'sync' })

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

watch(hasOptionalDetails, (hasDetails) => {
  if (hasDetails) {
    optionalDetailsOpen.value = true
  }
})

onMounted(async () => {
  try {
    catalog.value = await ventanillaApi.fetchCatalog()
    orgUnits.value = catalog.value.org_units ?? []
    staffOptions.value = (catalog.value.org_staff ?? []).map(staff => normalizeStaffRow(staff))
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
      staffOptions.value = (await orgApi.fetchStaff({ activeOnly: true })).map(staff => normalizeStaffRow(staff))
    } catch {
      staffOptions.value = []
      toast.error('No se pudieron cargar los funcionarios')
    }
  }

  if (filingType.value === 'internal') {
    applyInternalSender()
  }
  applyFunctionalTypeRecipient()
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

function parsedSlaBusinessDays(): number | null {
  const typed = Number(slaBusinessDaysInput.value)

  if (!Number.isInteger(typed) || typed < 1 || typed > 365) {
    return null
  }

  return typed
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

    if (row.file) {
      const fileError = validateDocumentUploadFile(row.file, filingUploadConstraints)
      if (fileError) {
        return { field: 'file', message: `${fileError} (documento ${index + 1})` }
      }
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
  goToSection(FIELD_TO_SECTION[issue.field])
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

  if (needsManualSlaDays.value && parsedSlaBusinessDays() == null) {
    errorMessage.value = 'Indique los días hábiles de respuesta.'
    submitAttempted.value = true
    goToSection('clasificacion')
    await nextTick()
    document.getElementById('ventanilla_sla_days')?.focus()

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
  if (needsManualSlaDays.value) {
    fd.append('sla_business_days', String(parsedSlaBusinessDays()))
  }
  if (producerOrgUnitId.value) {
    fd.append('producer_org_unit_id', String(producerOrgUnitId.value))
  }
  if (recipientOrgUnitId.value) {
    fd.append('recipient_org_unit_id', String(recipientOrgUnitId.value))
  }
  fd.append('sender_name', parties.senderName)
  if (parties.senderIdentifier) {
    fd.append('sender_identifier', parties.senderIdentifier)
  }
  if (parties.recipientName) {
    fd.append('recipient_name', parties.recipientName)
  }
  if (parties.recipientName && parties.recipientIdentifier) {
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
  <div class="mx-auto w-full space-y-4 px-4 pb-8 md:px-6">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="flex min-w-0 items-start gap-3">
        <Button variant="ghost" size="icon" class="shrink-0" @click="router.push('/ventanilla')">
          <Icon name="i-lucide-arrow-left" class="size-4" />
        </Button>
        <div class="min-w-0">
          <h1 class="text-2xl font-semibold tracking-tight">
            Radicar documento
          </h1>
          <p class="text-sm text-muted-foreground">
            Complete las secciones requeridas. Los campos opcionales quedan agrupados para no interrumpir el flujo.
          </p>
        </div>
      </div>
      <div
        class="inline-flex rounded-lg border bg-muted/40 p-1"
        role="group"
        aria-label="Tipo de radicación"
      >
        <button
          v-for="(label, key) in VENTANILLA_FILING_TYPE_LABELS"
          :key="key"
          type="button"
          class="rounded-md px-3 py-1.5 text-sm font-medium transition-colors"
          :class="filingType === key
            ? 'bg-background text-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground'"
          @click="setFilingType(key)"
        >
          {{ label }}
        </button>
      </div>
    </div>

    <form @submit.prevent="submit">
      <p v-if="errorMessage" class="mb-4 text-destructive text-sm">
        {{ errorMessage }}
      </p>

      <Tabs v-model="activeSection" class="gap-4">
        <div class="sticky top-0 z-30 -mx-4 border-b bg-background/95 px-4 py-2 backdrop-blur md:-mx-6 md:px-6">
          <TabsList class="grid h-auto w-full grid-cols-2 gap-1 p-1 sm:grid-cols-4">
            <TabsTrigger
              v-for="section in FILING_FORM_SECTIONS"
              :key="section.id"
              :value="section.id"
              class="h-auto min-h-10 justify-start gap-2 px-3 py-2 sm:justify-center"
            >
              <Icon
                :name="isSectionComplete(section.id) ? 'i-lucide-circle-check' : section.icon"
                class="size-4 shrink-0"
                :class="isSectionComplete(section.id) ? 'text-primary' : 'text-muted-foreground'"
              />
              <span class="truncate">{{ section.label }}</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="clasificacion" force-mount class="data-[state=inactive]:hidden">
      <div class="space-y-4">
      <Card id="ventanilla-section-clasificacion" class="border-primary/20 shadow-sm">
        <CardHeader class="pb-3">
          <CardTitle class="text-base">
            Clasificación funcional
          </CardTitle>
          <CardDescription>
            Tipo de trámite, flujo de trabajo y obligación de respuesta.
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
            <div class="space-y-4">
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
              <div v-if="isOtherFunctionalType" class="space-y-2">
                <Label for="ventanilla_subject">Asunto *</Label>
                <Input
                  id="ventanilla_subject"
                  v-model="subject"
                  maxlength="500"
                  placeholder="Especifique de qué trata el radicado"
                  :class="inputErrorClass('subject')"
                />
              </div>
            </div>

            <div class="space-y-3 rounded-lg border bg-muted/20 p-4">
              <p v-if="selectedFunctionalType && effectiveRequiresResponse && !needsManualSlaDays" class="text-sm text-muted-foreground">
                SLA: {{ displayedSlaDays ?? '—' }} días hábiles
              </p>
              <p v-else-if="!selectedFunctionalType" class="text-sm text-muted-foreground">
                Seleccione un tipo funcional para ver el plazo de respuesta.
              </p>

              <p
                v-if="functionalTypeKey === VENTANILLA_INFORMATIVE_FUNCTIONAL_TYPE_KEY"
                class="rounded-md border border-border bg-background p-3 text-xs text-muted-foreground"
              >
                {{ VENTANILLA_INFORMATIVE_TYPE_HINT }}
              </p>

              <div v-if="canOverrideResponse && selectedFunctionalType" class="space-y-3 border-t pt-3">
                <div class="flex items-center gap-2">
                  <Switch
                    id="ventanilla_requires_response"
                    :model-value="effectiveRequiresResponse"
                    @update:model-value="requiresResponseOverride = $event === true"
                  />
                  <Label for="ventanilla_requires_response" class="font-normal">
                    {{ effectiveRequiresResponse ? 'Requiere respuesta' : 'No requiere respuesta' }}
                  </Label>
                </div>
                <div v-if="needsManualSlaDays" class="space-y-2">
                  <Label for="ventanilla_sla_days">Días hábiles *</Label>
                  <Input
                    id="ventanilla_sla_days"
                    v-model="slaBusinessDaysInput"
                    type="number"
                    min="1"
                    max="365"
                    class="h-9 w-28"
                    placeholder="Días"
                  />
                  <p class="text-xs text-muted-foreground">
                    Este tipo no tiene plazo. Indique los días hábiles para responder.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
          <Card id="ventanilla-section-datos">
            <CardHeader class="pb-3">
              <CardTitle class="text-base">
                Datos del radicado
              </CardTitle>
              <CardDescription>
                Áreas y partes. Lo opcional se abre aparte.
              </CardDescription>
            </CardHeader>
            <CardContent class="grid min-w-0 gap-4 md:grid-cols-2">
          <div
            v-if="filingType !== 'incoming'"
            class="space-y-2"
          >
            <Label>{{ filingType === 'internal' ? 'Área remitente *' : 'Área *' }}</Label>
            <Multiselect
              id="ventanilla_producer_org_unit"
              v-model="producerOrgUnitId"
              mode="single"
              :object="false"
              :disabled="filingType === 'internal' && internalSenderOrgUnitId != null"
              :options="producerAreaSelectOptions"
              value-prop="value"
              label="label"
              :searchable="true"
              :can-clear="true"
              placeholder="Seleccione área"
              no-options-text="Sin áreas productoras"
              no-results-text="Sin coincidencias"
              :class="multiselectErrorClass('producer_org_unit')"
            />
          </div>
          <div class="min-w-0 space-y-2" :class="filingType === 'incoming' ? 'md:col-span-2' : ''">
            <Label>Remitente *</Label>
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
              :disabled="!producerOrgUnitId || (filingType === 'internal' && currentUserStaff != null && senderAreaHasManager)"
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
            <Label>Área destinataria *</Label>
            <Multiselect
              id="ventanilla_recipient_org_unit"
              v-model="recipientOrgUnitId"
              mode="single"
              :object="false"
              :disabled="functionalTypeDestinationOrgUnitId != null"
              :options="orgUnitSelectOptions"
              value-prop="value"
              label="label"
              :searchable="true"
              :can-clear="true"
              placeholder="Seleccione área"
              no-options-text="Sin áreas disponibles"
              no-results-text="Sin coincidencias"
              :class="multiselectErrorClass('recipient_org_unit')"
            />
          </div>
          <div class="min-w-0 space-y-2">
            <Label>Destinatario *</Label>
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
          <p
            v-if="filingType === 'internal' && !currentUserStaff"
            class="text-sm text-muted-foreground md:col-span-2"
          >
            Su usuario no tiene un funcionario activo con área asignada. Seleccione el área y el remitente.
          </p>
          <p
            v-else-if="filingType !== 'outgoing' && functionalTypeKey && functionalTypeDestinationOrgUnitId == null"
            class="text-sm text-muted-foreground md:col-span-2"
          >
            Este tipo no tiene área encargada. Seleccione el área destinataria.
          </p>
          <p
            v-else-if="functionalTypeDestinationOrgUnitId != null && !functionalTypeManagerStaff"
            class="text-sm text-muted-foreground md:col-span-2"
          >
            El área encargada no tiene un responsable con usuario activo. Seleccione el destinatario.
          </p>
          <Collapsible v-model:open="optionalDetailsOpen" class="md:col-span-2">
            <CollapsibleTrigger as-child>
              <button
                type="button"
                class="flex w-full items-center justify-between rounded-md border bg-muted/20 px-3 py-2 text-left text-sm hover:bg-muted/40"
              >
                <span class="font-medium">Datos opcionales</span>
                <span class="flex items-center gap-2 text-xs text-muted-foreground">
                  Responsable, medio y observaciones
                  <Icon
                    name="i-lucide-chevron-down"
                    class="size-4 transition-transform"
                    :class="optionalDetailsOpen ? 'rotate-180' : ''"
                  />
                </span>
              </button>
            </CollapsibleTrigger>
            <CollapsibleContent class="grid gap-4 pt-4 md:grid-cols-2">
          <div class="space-y-2">
            <Label>Responsable asignado</Label>
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
            <p class="text-muted-foreground text-xs">
              Solo usuarios vinculados al área responsable del radicado.
            </p>
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
            <Textarea v-model="notes" rows="3" class="min-h-[5rem] resize-y" />
          </div>
            </CollapsibleContent>
          </Collapsible>
            </CardContent>
          </Card>
      </div>
        </TabsContent>

        <TabsContent value="trd" force-mount class="data-[state=inactive]:hidden">
          <Card id="ventanilla-section-trd">
            <CardHeader class="pb-4">
              <CardTitle class="text-base">
                Clasificación archivística (TRD)
              </CardTitle>
              <CardDescription>
                Seleccione primero el área correspondiente. La TRD se carga según el tipo de expediente vinculado al tipo funcional.
                En interna se muestra la clasificación del remitente (registro) y del destinatario (referencia).
              </CardDescription>
            </CardHeader>
            <CardContent class="min-w-0">
              <template v-if="filingType === 'internal'">
                <div class="space-y-6">
                  <div class="space-y-3">
                    <div>
                      <p class="text-sm font-medium">
                        Área remitente (productora)
                      </p>
                      <p class="text-xs text-muted-foreground">
                        Clasificación archivística que se registrará en el radicado.
                      </p>
                    </div>
                    <VentanillaTrdPicker
                      ref="trdPickerRef"
                      :org-unit-id="producerOrgUnitId"
                      :functional-type-key="functionalTypeKey"
                      org-unit-role-label="el área remitente"
                      :submit-attempted="submitAttempted"
                      v-model:doc-document-type-id="docDocumentTypeId"
                    />
                  </div>
                  <div class="space-y-3 border-t pt-6">
                    <div>
                      <p class="text-sm font-medium">
                        Área destinataria
                      </p>
                      <p class="text-xs text-muted-foreground">
                        TRD configurada para el área de destino.
                      </p>
                    </div>
                    <VentanillaTrdPicker
                      :org-unit-id="recipientOrgUnitId"
                      :functional-type-key="functionalTypeKey"
                      org-unit-role-label="el área destinataria"
                      readonly
                    />
                  </div>
                </div>
              </template>
              <VentanillaTrdPicker
                v-else
                ref="trdPickerRef"
                :org-unit-id="responsibleOrgUnitId"
                :functional-type-key="functionalTypeKey"
                :org-unit-role-label="trdOrgUnitRoleLabel"
                :submit-attempted="submitAttempted"
                v-model:doc-document-type-id="docDocumentTypeId"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metadatos" force-mount class="data-[state=inactive]:hidden">
          <Card id="ventanilla-section-metadatos">
            <CardHeader class="pb-3">
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
        </TabsContent>

        <TabsContent value="archivos" force-mount class="data-[state=inactive]:hidden">
          <Card id="ventanilla-section-archivos">
            <CardHeader class="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle class="text-base">
                  Archivos *
                </CardTitle>
                <CardDescription>
                  Documento principal y anexos del radicado. {{ filingUploadConstraints.pickerHint }}
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
                :upload-constraints="filingUploadConstraints"
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
        </TabsContent>
      </Tabs>

      <div class="sticky bottom-0 z-20 mt-4 border-t bg-background/95 py-3 backdrop-blur">
        <div class="mx-auto flex w-full flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p class="text-sm text-muted-foreground">
            {{ completedSectionCount }} de {{ requiredSectionTotal }} secciones listas
            <span v-if="attachedFileCount"> · {{ attachedFileCount }} archivo{{ attachedFileCount === 1 ? '' : 's' }}</span>
          </p>
          <div class="flex flex-col-reverse gap-2 sm:flex-row">
            <Button type="button" variant="outline" @click="router.push('/ventanilla')">
              Cancelar
            </Button>
            <Button type="submit" :disabled="saving">
              {{ saving ? 'Registrando…' : 'Registrar radicado' }}
            </Button>
          </div>
        </div>
      </div>
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
