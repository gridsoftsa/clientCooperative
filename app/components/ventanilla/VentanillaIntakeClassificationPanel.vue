<script setup lang="ts">
import { toast } from 'vue-sonner'
import { VENTANILLA_FILING_TYPE_LABELS } from '~/constants/ventanilla'
import { onDigitsOnlyInput, filterDigitsOnly } from '~/utils/digits-only-input'
import { validateVentanillaCoreFilingForm } from '~/utils/ventanilla-filing-form-validation'
import {
  ventanillaIntakeReceiptCode,
  ventanillaIntakeSourceLabel,
} from '~/utils/ventanilla-intake-display'
import type {
  VentanillaCatalogData,
  VentanillaFilingTypeValue,
  VentanillaFunctionalTypeRow,
  VentanillaIntakeRow,
} from '~/types/ventanilla'

interface OrgUnitOption {
  id: number
  name: string
  code: string
  is_document_producer?: boolean
}

const props = defineProps<{
  intake: VentanillaIntakeRow
  catalog: VentanillaCatalogData | null
  orgUnits: OrgUnitOption[]
}>()

const emit = defineEmits<{
  classified: [payload: { filingId: number; filingNumber: string }]
  discarded: []
}>()

const router = useRouter()
const ventanillaApi = useVentanillaApi()
const {
  responsibleUsers,
  loadingResponsibleUsers,
  loadResponsibleUsers,
  clearAssignedUserIfMissing,
} = useVentanillaResponsibleUsers()

const actionLoading = ref('')
const errorMessage = ref('')
const submitAttempted = ref(false)
const errorAlertRef = ref<HTMLElement | null>(null)

const filingType = ref<VentanillaFilingTypeValue>('incoming')
const functionalTypeKey = ref<string | null>(null)
const recipientOrgUnitId = ref<number | null>(null)
const producerOrgUnitId = ref<number | null>(null)
const docDocumentTypeId = ref<number | null>(null)
const assignedUserId = ref<number | null>(null)
const subject = ref('')
const senderName = ref('')
const senderIdentifier = ref('')
const recipientName = ref('')
const recipientIdentifier = ref('')
const notes = ref('')
const metadataValues = ref<Record<string, unknown>>({})
const metadataFieldsRef = ref<{ validateRequiredFields?: () => string | null } | null>(null)
const discardReason = ref('')
const discardDialogOpen = ref(false)

const producerOrgUnits = computed(() => props.orgUnits.filter(item => item.is_document_producer))
const responsibleOrgUnitId = computed(() => filingType.value === 'incoming' ? recipientOrgUnitId.value : producerOrgUnitId.value)

const selectableFunctionalTypes = computed(() =>
  (props.catalog?.functional_types ?? []).filter(
    (type: VentanillaFunctionalTypeRow) => type.has_active_workflow_binding !== false,
  ),
)

const functionalTypeOptions = computed(() =>
  selectableFunctionalTypes.value.map((type: VentanillaFunctionalTypeRow) => ({
    value: type.key,
    label: type.label,
  })),
)

const selectedFunctionalType = computed(() =>
  props.catalog?.functional_types.find((type: VentanillaFunctionalTypeRow) => type.key === functionalTypeKey.value),
)

function resolvedFunctionalTypeKey(): string {
  return functionalTypeKey.value ?? ''
}

function defaultMetadataForIntake(intake: VentanillaIntakeRow): Record<string, unknown> {
  if (intake.source === 'web_form') {
    return { pqrs_channel: 'web' }
  }

  if (intake.source === 'email') {
    return { pqrs_channel: 'email' }
  }

  return {}
}

function showFormError(message: string): void {
  errorMessage.value = message
  toast.error(message)
  nextTick(() => {
    errorAlertRef.value?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  })
}

function functionalTypeLabel(key: string | null | undefined): string {
  if (!key) {
    return ''
  }

  return props.catalog?.functional_types.find((type: VentanillaFunctionalTypeRow) => type.key === key)?.label ?? key
}

function resetFormFromIntake(intake: VentanillaIntakeRow): void {
  filingType.value = intake.suggested_filing_type ?? 'incoming'
  const suggestedKey = intake.suggested_functional_type_key ?? ''
  functionalTypeKey.value = selectableFunctionalTypes.value.some(type => type.key === suggestedKey)
    ? suggestedKey
    : (selectableFunctionalTypes.value[0]?.key ?? '')
  subject.value = intake.subject
  senderName.value = intake.sender_name ?? ''
  senderIdentifier.value = filterDigitsOnly(intake.sender_identifier ?? '')
  recipientName.value = ''
  recipientIdentifier.value = ''
  notes.value = [
    `Entrada ${ventanillaIntakeReceiptCode(intake.id)} desde ${ventanillaIntakeSourceLabel(intake.source)}.`,
    intake.sender_email ? `Correo remitente: ${intake.sender_email}` : '',
    intake.body ? `Mensaje original:\n${intake.body}` : '',
  ].filter(Boolean).join('\n\n')
  metadataValues.value = defaultMetadataForIntake(intake)
  docDocumentTypeId.value = null
  assignedUserId.value = null
  recipientOrgUnitId.value = null
  producerOrgUnitId.value = null
  discardReason.value = ''
  discardDialogOpen.value = false
  errorMessage.value = ''
}

watch(
  () => [props.intake, props.catalog] as const,
  ([intake]) => {
    if (intake) {
      resetFormFromIntake(intake)
    }
  },
  { immediate: true },
)

watch(responsibleOrgUnitId, async (orgUnitId) => {
  await loadResponsibleUsers(orgUnitId)
  clearAssignedUserIfMissing(assignedUserId)
})

watch(filingType, () => {
  assignedUserId.value = null
})

async function classifyIntake(): Promise<void> {
  submitAttempted.value = true

  const metadataMissing = metadataFieldsRef.value?.findFirstMissingRequiredField?.() ?? null
  const metadataError = metadataMissing?.message ?? metadataFieldsRef.value?.validateRequiredFields?.() ?? null

  const formError = validateVentanillaCoreFilingForm({
    filingType: filingType.value,
    functionalTypeKey: resolvedFunctionalTypeKey(),
    subject: subject.value,
    producerOrgUnitId: producerOrgUnitId.value,
    recipientOrgUnitId: recipientOrgUnitId.value,
    docDocumentTypeId: docDocumentTypeId.value,
    parties: {
      senderName: senderName.value,
      senderIdentifier: senderIdentifier.value,
      recipientName: recipientName.value,
      recipientIdentifier: recipientIdentifier.value,
    },
    metadataError,
  })

  if (formError) {
    showFormError(formError)
    if (metadataMissing) {
      metadataFieldsRef.value?.focusMissingField?.(metadataMissing.fieldCode, metadataMissing.fieldIndex)
    }
    return
  }

  actionLoading.value = 'classify'
  errorMessage.value = ''

  try {
    const res = await ventanillaApi.classifyIntake(props.intake.id, {
      filing_type: filingType.value,
      functional_type_key: resolvedFunctionalTypeKey(),
      recipient_org_unit_id: recipientOrgUnitId.value,
      producer_org_unit_id: producerOrgUnitId.value,
      sender_name: senderName.value.trim(),
      sender_identifier: filterDigitsOnly(senderIdentifier.value),
      recipient_name: recipientName.value.trim() || undefined,
      recipient_identifier: filterDigitsOnly(recipientIdentifier.value) || undefined,
      subject: subject.value.trim(),
      reception_medium: props.intake.suggested_reception_medium ?? (props.intake.source === 'email' ? 'email' : 'web'),
      notes: notes.value.trim() || undefined,
      doc_document_type_id: docDocumentTypeId.value,
      metadata_values: metadataValues.value,
      assigned_user_id: assignedUserId.value,
    })

    emit('classified', {
      filingId: res.filing.id,
      filingNumber: res.filing.filing_number,
    })
    submitAttempted.value = false
    toast.success(`Radicado ${res.filing.filing_number} creado correctamente.`)
  }
  catch (error: unknown) {
    const err = error as { data?: { message?: string; errors?: Record<string, string[]> } }
    const first = err.data?.errors ? Object.values(err.data.errors)[0]?.[0] : null
    showFormError(first ?? err.data?.message ?? 'No se pudo clasificar la entrada.')
  }
  finally {
    actionLoading.value = ''
  }
}

function openDiscardDialog(): void {
  discardReason.value = ''
  discardDialogOpen.value = true
}

async function discardIntake(): Promise<void> {
  if (!discardReason.value.trim()) {
    showFormError('Ingrese el motivo de descarte.')
    return
  }

  actionLoading.value = 'discard'
  errorMessage.value = ''

  try {
    await ventanillaApi.discardIntake(props.intake.id, discardReason.value.trim())
    discardDialogOpen.value = false
    emit('discarded')
  }
  catch {
    errorMessage.value = 'No se pudo descartar la entrada.'
  }
  finally {
    actionLoading.value = ''
  }
}
</script>

<template>
  <div class="space-y-6">
    <Alert
      v-if="selectableFunctionalTypes.length === 0"
      variant="destructive"
    >
      <AlertTitle>Sin tipos funcionales disponibles</AlertTitle>
      <AlertDescription>
        No hay tipos con flujo de trabajo activo. Configure los bindings en Workflow antes de clasificar.
      </AlertDescription>
    </Alert>

    <div
      v-if="errorMessage"
      ref="errorAlertRef"
    >
      <Alert variant="destructive">
        <AlertTitle>No se pudo completar la acción</AlertTitle>
        <AlertDescription>{{ errorMessage }}</AlertDescription>
      </Alert>
    </div>

    <div
      v-if="intake.classification?.rule_name || intake.suggested_functional_type_key"
      class="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900 dark:border-sky-900/50 dark:bg-sky-950/40 dark:text-sky-100"
    >
      <template v-if="intake.classification?.rule_name">
        Preclasificación automática: <span class="font-medium">{{ intake.classification.rule_name }}</span>.
      </template>
      <template v-else>
        Tipo sugerido por el ciudadano.
      </template>
      <span v-if="intake.suggested_functional_type_key" class="ml-1">
        Tipo funcional: {{ functionalTypeLabel(intake.suggested_functional_type_key) }}.
      </span>
    </div>

    <template v-if="intake.status === 'pending_classification'">
      <div class="grid gap-4 md:grid-cols-2">
        <div class="space-y-2">
          <Label class="block leading-none">Tipo de radicación *</Label>
          <Select v-model="filingType">
            <SelectTrigger class="w-full"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="(label, key) in VENTANILLA_FILING_TYPE_LABELS"
                :key="key"
                :value="key"
              >
                {{ label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <Label class="block leading-none">Tipo funcional *</Label>
          <ArchivalSingleMultiselect
            v-model="functionalTypeKey"
            class="classification-functional-type-ms"
            :options="functionalTypeOptions"
            placeholder="Busque o seleccione el tipo funcional"
            no-options-text="Sin tipos con flujo activo"
            no-results-text="Sin coincidencias"
            :searchable="true"
            :can-clear="false"
          />
        </div>
      </div>

      <p v-if="selectedFunctionalType" class="text-muted-foreground text-xs">
        SLA sugerido: {{ selectedFunctionalType.sla_business_days ?? '—' }} días hábiles.
      </p>

      <div class="grid gap-4 md:grid-cols-2">
        <div class="space-y-2">
          <Label>{{ filingType === 'incoming' ? 'Área destinataria *' : 'Área productora *' }}</Label>
          <Select
            v-if="filingType === 'incoming'"
            :model-value="recipientOrgUnitId != null ? String(recipientOrgUnitId) : undefined"
            @update:model-value="recipientOrgUnitId = $event ? Number($event) : null"
          >
            <SelectTrigger><SelectValue placeholder="Seleccione área" /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="unit in orgUnits" :key="unit.id" :value="String(unit.id)">
                {{ unit.code }} — {{ unit.name }}
              </SelectItem>
            </SelectContent>
          </Select>
          <Select
            v-else
            :model-value="producerOrgUnitId != null ? String(producerOrgUnitId) : undefined"
            @update:model-value="producerOrgUnitId = $event ? Number($event) : null"
          >
            <SelectTrigger><SelectValue placeholder="Seleccione área" /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="unit in producerOrgUnits" :key="unit.id" :value="String(unit.id)">
                {{ unit.code }} — {{ unit.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div v-if="filingType === 'internal'" class="space-y-2">
          <Label>Área destinataria *</Label>
          <Select
            :model-value="recipientOrgUnitId != null ? String(recipientOrgUnitId) : undefined"
            @update:model-value="recipientOrgUnitId = $event ? Number($event) : null"
          >
            <SelectTrigger><SelectValue placeholder="Seleccione área destino" /></SelectTrigger>
            <SelectContent>
              <SelectItem v-for="unit in orgUnits" :key="`int-${unit.id}`" :value="String(unit.id)">
                {{ unit.code }} — {{ unit.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div class="space-y-2">
          <Label>Responsable</Label>
          <Select
            :model-value="assignedUserId != null ? String(assignedUserId) : undefined"
            :disabled="!responsibleOrgUnitId || loadingResponsibleUsers"
            @update:model-value="assignedUserId = $event ? Number($event) : null"
          >
            <SelectTrigger>
              <SelectValue :placeholder="responsibleOrgUnitId ? 'Opcional' : 'Seleccione primero el área'" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="user in responsibleUsers" :key="user.id" :value="String(user.id)">
                {{ user.name }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div class="space-y-2">
        <Label>Asunto *</Label>
        <Input v-model="subject" />
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <div class="space-y-2">
          <Label>Remitente *</Label>
          <Input v-model="senderName" />
        </div>
        <div class="space-y-2">
          <Label>Identificación remitente *</Label>
          <Input
            v-model="senderIdentifier"
            inputmode="numeric"
            maxlength="64"
            autocomplete="off"
            placeholder="Solo números"
            @input="onDigitsOnlyInput($event, value => (senderIdentifier = value))"
          />
        </div>
        <template v-if="filingType === 'outgoing' || filingType === 'internal'">
          <div class="space-y-2">
            <Label>Destinatario *</Label>
            <Input v-model="recipientName" />
          </div>
          <div class="space-y-2">
            <Label>Identificación destinatario *</Label>
            <Input
              v-model="recipientIdentifier"
              inputmode="numeric"
              maxlength="64"
              autocomplete="off"
              placeholder="Solo números"
              @input="onDigitsOnlyInput($event, value => (recipientIdentifier = value))"
            />
          </div>
        </template>
      </div>

      <VentanillaTrdPicker
        :org-unit-id="responsibleOrgUnitId"
        v-model:doc-document-type-id="docDocumentTypeId"
      />

      <VentanillaArchivalMetadataFields
        ref="metadataFieldsRef"
        v-model="metadataValues"
        :doc-document-type-id="docDocumentTypeId"
        :functional-type-key="functionalTypeKey"
        :submit-attempted="submitAttempted"
      />

      <div class="space-y-2">
        <Label>Notas internas</Label>
        <Textarea v-model="notes" rows="4" />
      </div>

      <div class="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
        <Button
          type="button"
          variant="outline"
          size="sm"
          class="border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
          :disabled="actionLoading === 'discard'"
          @click="openDiscardDialog"
        >
          Descartar entrada
        </Button>

        <Button type="button" size="lg" :disabled="actionLoading === 'classify' || selectableFunctionalTypes.length === 0" @click="classifyIntake">
          {{ actionLoading === 'classify' ? 'Clasificando…' : 'Crear radicado' }}
        </Button>
      </div>

      <Dialog v-model:open="discardDialogOpen">
        <DialogContent class="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Descartar entrada</DialogTitle>
            <DialogDescription>
              La entrada no se radicará y quedará marcada como descartada. Esta acción no se puede deshacer desde aquí.
            </DialogDescription>
          </DialogHeader>

          <div class="space-y-2">
            <Label for="ventanilla-discard-reason">Motivo de descarte *</Label>
            <Textarea
              id="ventanilla-discard-reason"
              v-model="discardReason"
              rows="3"
              placeholder="Indique por qué se descarta esta entrada"
              :disabled="actionLoading === 'discard'"
            />
          </div>

          <DialogFooter class="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              :disabled="actionLoading === 'discard'"
              @click="discardDialogOpen = false"
            >
              Cancelar
            </Button>
            <Button
              type="button"
              variant="destructive"
              :disabled="actionLoading === 'discard'"
              @click="discardIntake"
            >
              {{ actionLoading === 'discard' ? 'Descartando…' : 'Confirmar descarte' }}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </template>

    <div v-else-if="intake.classified_filing" class="rounded-lg border p-4 text-sm">
      Entrada clasificada como
      <Button variant="link" class="h-auto p-0" @click="router.push(`/ventanilla/${intake.classified_filing?.id}`)">
        {{ intake.classified_filing.filing_number }}
      </Button>
    </div>

    <div v-else class="rounded-lg border p-4 text-sm text-muted-foreground">
      Entrada descartada: {{ intake.discard_reason ?? 'Sin motivo registrado.' }}
    </div>
  </div>
</template>

<style scoped>
.classification-functional-type-ms :deep(.multiselect),
.classification-functional-type-ms :deep(.multiselect-wrapper) {
  height: 2.25rem;
  max-height: 2.25rem;
}
</style>
