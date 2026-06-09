<script setup lang="ts">
import { VENTANILLA_FILING_TYPE_LABELS } from '~/constants/ventanilla'
import { onDigitsOnlyInput, filterDigitsOnly } from '~/utils/digits-only-input'
import { validateVentanillaCoreFilingForm } from '~/utils/ventanilla-filing-form-validation'
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

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'ventanilla_clasificar',
})

const router = useRouter()
const { $api } = useNuxtApp()
const ventanillaApi = useVentanillaApi()
const {
  responsibleUsers,
  loadingResponsibleUsers,
  loadResponsibleUsers,
  clearAssignedUserIfMissing,
} = useVentanillaResponsibleUsers()

const intakes = ref<VentanillaIntakeRow[]>([])
const selectedIntake = ref<VentanillaIntakeRow | null>(null)
const catalog = ref<VentanillaCatalogData | null>(null)
const orgUnits = ref<OrgUnitOption[]>([])
const loading = ref(false)
const actionLoading = ref('')
const errorMessage = ref('')
const successMessage = ref('')
const search = ref('')
const statusFilter = ref('pending_classification')
const sourceFilter = ref('all')
const pagination = ref({ current_page: 1, last_page: 1, per_page: 15, total: 0 })

const filingType = ref<VentanillaFilingTypeValue>('incoming')
const functionalTypeKey = ref('')
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

const responsibleOrgUnitId = computed(() => filingType.value === 'incoming' ? recipientOrgUnitId.value : producerOrgUnitId.value)

watch(responsibleOrgUnitId, async (orgUnitId) => {
  await loadResponsibleUsers(orgUnitId)
  clearAssignedUserIfMissing(assignedUserId)
})

watch(filingType, () => {
  assignedUserId.value = null
})
const producerOrgUnits = computed(() => orgUnits.value.filter((item: OrgUnitOption) => item.is_document_producer))
const selectedFunctionalType = computed(() =>
  catalog.value?.functional_types.find((item: VentanillaFunctionalTypeRow) => item.key === functionalTypeKey.value),
)

async function loadCatalogs() {
  catalog.value = await ventanillaApi.fetchCatalog()
  const api = $api as <T>(url: string, options?: Record<string, unknown>) => Promise<T>
  const res = await api<{ data: OrgUnitOption[] }>('/organizational-structure/org-units', {
    query: { per_page: 200, is_active: true },
  })
  orgUnits.value = res.data ?? []
}

async function loadIntakes() {
  loading.value = true
  errorMessage.value = ''
  try {
    const query: Record<string, string | number> = {
      page: pagination.value.current_page,
      per_page: pagination.value.per_page,
    }
    if (statusFilter.value !== 'all') {
      query.status = statusFilter.value
    }
    if (sourceFilter.value !== 'all') {
      query.source = sourceFilter.value
    }
    if (search.value.trim()) {
      query.search = search.value.trim()
    }

    const res = await ventanillaApi.fetchIntakes(query)
    intakes.value = res.data ?? []
    pagination.value = {
      current_page: res.meta.current_page,
      last_page: res.meta.last_page,
      per_page: res.meta.per_page,
      total: res.meta.total,
    }
    if (selectedIntake.value) {
      selectedIntake.value = intakes.value.find((item: VentanillaIntakeRow) => item.id === selectedIntake.value?.id) ?? selectedIntake.value
    }
  } catch {
    errorMessage.value = 'No se pudo cargar la bandeja.'
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  try {
    await loadCatalogs()
  } catch {
    catalog.value = null
  }
  await loadIntakes()
})

function sourceLabel(source: string): string {
  const labels: Record<string, string> = {
    web_form: 'Formulario web',
    email: 'Correo electrónico',
  }

  return labels[source] ?? source
}

function statusLabel(status: string): string {
  const labels: Record<string, string> = {
    pending_classification: 'Pendiente',
    classified: 'Clasificada',
    discarded: 'Descartada',
  }

  return labels[status] ?? status
}

function formatDate(iso: string | null | undefined): string {
  return iso ? new Date(iso).toLocaleString('es-CO') : '—'
}

function selectIntake(intake: VentanillaIntakeRow) {
  selectedIntake.value = intake
  filingType.value = intake.suggested_filing_type ?? 'incoming'
  functionalTypeKey.value = intake.suggested_functional_type_key ?? catalog.value?.functional_types[0]?.key ?? ''
  subject.value = intake.subject
  senderName.value = intake.sender_name ?? ''
  senderIdentifier.value = filterDigitsOnly(intake.sender_identifier ?? '')
  recipientName.value = ''
  recipientIdentifier.value = ''
  notes.value = [
    `Entrada desde ${sourceLabel(intake.source)}.`,
    intake.sender_email ? `Correo remitente: ${intake.sender_email}` : '',
    intake.body ? `Mensaje original:\n${intake.body}` : '',
  ].filter(Boolean).join('\n\n')
  metadataValues.value = {}
  docDocumentTypeId.value = null
  assignedUserId.value = null
  discardReason.value = ''
}

function goToPage(page: number) {
  const nextPage = Math.min(Math.max(page, 1), pagination.value.last_page)
  if (nextPage === pagination.value.current_page) {
    return
  }
  pagination.value.current_page = nextPage
  loadIntakes()
}

async function classifySelected() {
  if (!selectedIntake.value) {
    return
  }

  const formError = validateVentanillaCoreFilingForm({
    filingType: filingType.value,
    functionalTypeKey: functionalTypeKey.value,
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
    metadataError: metadataFieldsRef.value?.validateRequiredFields?.() ?? null,
  })
  if (formError) {
    errorMessage.value = formError
    return
  }

  actionLoading.value = 'classify'
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const res = await ventanillaApi.classifyIntake(selectedIntake.value.id, {
      filing_type: filingType.value,
      functional_type_key: functionalTypeKey.value,
      recipient_org_unit_id: recipientOrgUnitId.value,
      producer_org_unit_id: producerOrgUnitId.value,
      sender_name: senderName.value.trim(),
      sender_identifier: filterDigitsOnly(senderIdentifier.value),
      recipient_name: recipientName.value.trim() || undefined,
      recipient_identifier: filterDigitsOnly(recipientIdentifier.value) || undefined,
      subject: subject.value.trim(),
      reception_medium: selectedIntake.value.suggested_reception_medium ?? (selectedIntake.value.source === 'email' ? 'email' : 'web'),
      notes: notes.value.trim() || undefined,
      doc_document_type_id: docDocumentTypeId.value,
      metadata_values: metadataValues.value,
      assigned_user_id: assignedUserId.value,
    })
    successMessage.value = `Radicado ${res.filing.filing_number} creado correctamente.`
    selectedIntake.value = res.intake
    await loadIntakes()
  } catch (e: unknown) {
    const err = e as { data?: { message?: string; errors?: Record<string, string[]> } }
    const first = err.data?.errors ? Object.values(err.data.errors)[0]?.[0] : null
    errorMessage.value = first ?? err.data?.message ?? 'No se pudo clasificar la entrada.'
  } finally {
    actionLoading.value = ''
  }
}

async function discardSelected() {
  if (!selectedIntake.value || !discardReason.value.trim()) {
    errorMessage.value = 'Ingrese el motivo de descarte.'
    return
  }

  actionLoading.value = 'discard'
  errorMessage.value = ''
  try {
    selectedIntake.value = await ventanillaApi.discardIntake(selectedIntake.value.id, discardReason.value.trim())
    await loadIntakes()
  } catch {
    errorMessage.value = 'No se pudo descartar la entrada.'
  } finally {
    actionLoading.value = ''
  }
}

const openingIntakeFileId = ref<number | null>(null)

async function viewIntakeFile(fileId: number, mimeType?: string | null) {
  if (!selectedIntake.value) {
    return
  }
  openingIntakeFileId.value = fileId
  errorMessage.value = ''
  try {
    await ventanillaApi.viewIntakeFileInNewTab(selectedIntake.value.id, fileId, mimeType ?? undefined)
  } catch {
    errorMessage.value = 'No se pudo abrir el archivo'
  } finally {
    openingIntakeFileId.value = null
  }
}
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">
          Bandeja de clasificación
        </h1>
        <p class="text-muted-foreground text-sm">
          Entradas recibidas por formulario web y correo antes de generar el radicado.
        </p>
      </div>
      <Button variant="outline" @click="router.push('/ventanilla/formulario')">
        Ver formulario público
      </Button>
    </div>

    <p v-if="errorMessage" class="text-destructive text-sm">
      {{ errorMessage }}
    </p>
    <p v-if="successMessage" class="text-sm text-emerald-600">
      {{ successMessage }}
    </p>

    <div class="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
      <Card>
        <CardHeader>
          <CardTitle>Entradas</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="grid gap-3 md:grid-cols-[1fr_180px_180px_auto]">
            <Input v-model="search" placeholder="Buscar asunto, remitente o correo" @keyup.enter="loadIntakes" />
            <Select v-model="statusFilter">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los estados</SelectItem>
                <SelectItem value="pending_classification">Pendientes</SelectItem>
                <SelectItem value="classified">Clasificadas</SelectItem>
                <SelectItem value="discarded">Descartadas</SelectItem>
              </SelectContent>
            </Select>
            <Select v-model="sourceFilter">
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos los orígenes</SelectItem>
                <SelectItem value="web_form">Formulario web</SelectItem>
                <SelectItem value="email">Correo</SelectItem>
              </SelectContent>
            </Select>
            <Button :disabled="loading" @click="loadIntakes">
              {{ loading ? 'Cargando…' : 'Filtrar' }}
            </Button>
          </div>

          <div class="divide-y rounded-lg border">
            <button
              v-for="intake in intakes"
              :key="intake.id"
              type="button"
              class="block w-full p-4 text-left hover:bg-muted/40"
              :class="selectedIntake?.id === intake.id ? 'bg-muted/60' : ''"
              @click="selectIntake(intake)"
            >
              <div class="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{{ sourceLabel(intake.source) }}</Badge>
                <Badge :variant="intake.status === 'pending_classification' ? 'default' : 'secondary'">
                  {{ statusLabel(intake.status) }}
                </Badge>
                <span class="text-muted-foreground ml-auto text-xs">{{ formatDate(intake.received_at) }}</span>
              </div>
              <p class="mt-2 font-medium">
                {{ intake.subject }}
              </p>
              <p class="text-muted-foreground text-sm">
                {{ intake.sender_name ?? 'Sin nombre' }} · {{ intake.sender_email ?? 'Sin correo' }}
              </p>
            </button>
            <p v-if="!intakes.length" class="p-4 text-sm text-muted-foreground">
              No hay entradas para los filtros seleccionados.
            </p>
          </div>

          <div class="flex items-center justify-between text-sm">
            <span class="text-muted-foreground">Total: {{ pagination.total }}</span>
            <div class="flex gap-2">
              <Button variant="outline" size="sm" :disabled="pagination.current_page <= 1" @click="goToPage(pagination.current_page - 1)">
                Anterior
              </Button>
              <Button variant="outline" size="sm" :disabled="pagination.current_page >= pagination.last_page" @click="goToPage(pagination.current_page + 1)">
                Siguiente
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clasificación</CardTitle>
          <CardDescription>
            Complete los datos para convertir la entrada en radicado.
          </CardDescription>
        </CardHeader>
        <CardContent v-if="selectedIntake" class="space-y-4">
          <div class="rounded-lg bg-muted/40 p-3 text-sm">
            <p class="font-medium">{{ selectedIntake.subject }}</p>
            <p class="text-muted-foreground">{{ selectedIntake.body ?? 'Sin mensaje adicional.' }}</p>
          </div>

          <div class="space-y-2">
            <Label>Anexos recibidos</Label>
            <div class="space-y-2">
              <div
                v-for="file in selectedIntake.files ?? []"
                :key="file.id"
                class="flex items-center justify-between rounded-lg border p-2 text-sm"
              >
                <span>{{ file.title }} · {{ file.original_name }}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  :disabled="openingIntakeFileId === file.id"
                  @click="viewIntakeFile(file.id, file.mime_type)"
                >
                  <Icon
                    :name="openingIntakeFileId === file.id ? 'i-lucide-loader-2' : 'i-lucide-external-link'"
                    class="mr-1 size-4"
                    :class="{ 'animate-spin': openingIntakeFileId === file.id }"
                  />
                  {{ openingIntakeFileId === file.id ? 'Abriendo…' : 'Ver' }}
                </Button>
              </div>
            </div>
          </div>

          <template v-if="selectedIntake.status === 'pending_classification'">
            <div class="grid gap-3 md:grid-cols-2">
              <div class="space-y-2">
                <Label>Tipo de radicación *</Label>
                <Select v-model="filingType">
                  <SelectTrigger><SelectValue /></SelectTrigger>
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
                <Label>Tipo funcional *</Label>
                <Select v-model="functionalTypeKey">
                  <SelectTrigger><SelectValue placeholder="Seleccione…" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="item in catalog?.functional_types ?? []"
                      :key="item.key"
                      :value="item.key"
                    >
                      {{ item.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <p v-if="selectedFunctionalType" class="text-muted-foreground text-xs">
              SLA sugerido: {{ selectedFunctionalType.sla_business_days ?? '—' }} días hábiles.
            </p>

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
              <p class="text-muted-foreground text-xs">
                Usuarios del área responsable del radicado.
              </p>
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
              <p
                v-if="responsibleOrgUnitId && !loadingResponsibleUsers && !responsibleUsers.length"
                class="text-muted-foreground text-xs"
              >
                No hay usuarios asignados a esta área.
              </p>
            </div>

            <div class="space-y-2">
              <Label>Asunto *</Label>
              <Input v-model="subject" />
            </div>
            <div class="grid gap-3 md:grid-cols-2">
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
                  @input="onDigitsOnlyInput($event, v => (senderIdentifier = v))"
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
                    @input="onDigitsOnlyInput($event, v => (recipientIdentifier = v))"
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
            />

            <div class="space-y-2">
              <Label>Notas internas</Label>
              <Textarea v-model="notes" rows="4" />
            </div>

            <div class="space-y-2 rounded-lg border border-destructive/30 p-3">
              <Label>Motivo de descarte</Label>
              <Textarea v-model="discardReason" rows="2" />
              <Button variant="destructive" size="sm" :disabled="actionLoading === 'discard'" @click="discardSelected">
                {{ actionLoading === 'discard' ? 'Descartando…' : 'Descartar entrada' }}
              </Button>
            </div>

            <Button class="w-full" :disabled="actionLoading === 'classify'" @click="classifySelected">
              {{ actionLoading === 'classify' ? 'Clasificando…' : 'Crear radicado' }}
            </Button>
          </template>

          <div v-else-if="selectedIntake.classified_filing" class="rounded-lg border p-3 text-sm">
            Entrada clasificada como
            <Button variant="link" class="h-auto p-0" @click="router.push(`/ventanilla/${selectedIntake?.classified_filing?.id}`)">
              {{ selectedIntake.classified_filing.filing_number }}
            </Button>
          </div>
          <div v-else class="rounded-lg border p-3 text-sm text-muted-foreground">
            Entrada descartada: {{ selectedIntake.discard_reason }}
          </div>
        </CardContent>
        <CardContent v-else>
          <p class="text-muted-foreground text-sm">
            Seleccione una entrada para clasificarla.
          </p>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
