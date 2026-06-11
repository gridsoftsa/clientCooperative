<script setup lang="ts">
import {
  VENTANILLA_FILING_STATUS_LABELS,
  VENTANILLA_FILING_TYPE_LABELS,
  VENTANILLA_INFORMATIVE_FUNCTIONAL_TYPE_KEY,
  VENTANILLA_NOTIFICATION_CHANNEL_LABELS,
  VENTANILLA_NOTIFICATION_EVENT_LABELS,
} from '~/constants/ventanilla'
import type { ArchivalMetadataFieldRow } from '~/composables/useArchivalMetadataApi'
import { formatArchivalMetadataValue } from '~/utils/archival-metadata-display'
import type { VentanillaCatalogData, VentanillaFilingDetail } from '~/types/ventanilla'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'ventanilla_ver',
})

const route = useRoute()
const ventanillaApi = useVentanillaApi()
const { hasPermission } = usePermissions()
const { user: authUser } = useAuth()
const {
  responsibleUsers,
  loadingResponsibleUsers,
  loadResponsibleUsers,
} = useVentanillaResponsibleUsers()

const filing = ref<VentanillaFilingDetail | null>(null)
const catalog = ref<VentanillaCatalogData | null>(null)
const loading = ref(true)
const errorMessage = ref('')
const actionMessage = ref('')
const actionLoading = ref('')
const openingFileId = ref<number | null>(null)
const openingReceipt = ref(false)
const openingSticker = ref(false)
const selectedAssignedUserId = ref<number | null>(null)
const assignmentNote = ref('')
const responseText = ref('')
const closeReason = ref('')
const voidReason = ref('')

type VentanillaDetailSection =
  | 'resumen'
  | 'gestion'
  | 'workflow'
  | 'archivos'
  | 'trd'
  | 'metadatos'
  | 'trazabilidad'
  | 'notificaciones'
  | 'alertas'
  | 'escalamiento'

const activeSection = ref<VentanillaDetailSection>('resumen')

const id = computed(() => Number(route.params.id))
const isTerminal = computed(() => filing.value?.status === 'closed' || filing.value?.status === 'voided')
const canAssign = computed(() => hasPermission('ventanilla_asignar') && !isTerminal.value)
const canManage = computed(() => hasPermission('ventanilla_gestionar') && !isTerminal.value)
const canVoid = computed(() => hasPermission('ventanilla_anular') && !isTerminal.value)
const canRefreshSla = computed(() => hasPermission('ventanilla_sla_configurar'))
const workflowOpenTask = computed(() => filing.value?.workflow?.open_task ?? null)
const isMyWorkflowTask = computed(() =>
  workflowOpenTask.value?.assignee?.id != null
  && workflowOpenTask.value.assignee.id === authUser.value?.id,
)
const metadataRows = computed(() => {
  const fields = filing.value?.archival_metadata_schema?.fields ?? []
  const values = filing.value?.metadata_values ?? {}

  return fields
    .slice()
    .sort((a: ArchivalMetadataFieldRow, b: ArchivalMetadataFieldRow) => a.sort_order - b.sort_order)
    .map((field: ArchivalMetadataFieldRow) => ({
      code: field.code,
      label: field.name,
      dataType: field.data_type,
      value: values[field.code],
    }))
    .filter((row: { code: string; label: string; value: unknown }) => row.value !== null && row.value !== undefined && row.value !== '')
})

const detailSections = computed(() => {
  const currentFiling = filing.value
  if (!currentFiling) {
    return [] as Array<{ id: VentanillaDetailSection, label: string, icon: string }>
  }

  const sections: Array<{ id: VentanillaDetailSection, label: string, icon: string }> = [
    { id: 'resumen', label: 'Resumen', icon: 'i-lucide-layout-list' },
  ]

  if (canAssign.value || canManage.value || canVoid.value) {
    sections.push({ id: 'gestion', label: 'Gestión', icon: 'i-lucide-settings-2' })
  }

  if (hasPermission('workflow_ver')) {
    sections.push({ id: 'workflow', label: 'Workflow', icon: 'i-lucide-git-branch' })
  }

  sections.push(
    { id: 'archivos', label: 'Archivos', icon: 'i-lucide-paperclip' },
    { id: 'trd', label: 'Clasificación TRD', icon: 'i-lucide-folders' },
    { id: 'metadatos', label: 'Metadatos', icon: 'i-lucide-tags' },
    { id: 'trazabilidad', label: 'Trazabilidad', icon: 'i-lucide-history' },
  )

  if (currentFiling.notification_deliveries?.length) {
    sections.push({ id: 'notificaciones', label: 'Notificaciones', icon: 'i-lucide-bell' })
  }

  sections.push({ id: 'alertas', label: 'Alertas SLA', icon: 'i-lucide-triangle-alert' })

  if (currentFiling.escalation) {
    sections.push({ id: 'escalamiento', label: 'Escalamiento', icon: 'i-lucide-arrow-up-right' })
  }

  return sections
})

watch(detailSections, (sections) => {
  if (!sections.some(section => section.id === activeSection.value)) {
    activeSection.value = sections[0]?.id ?? 'resumen'
  }
})

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    catalog.value = await ventanillaApi.fetchCatalog()
    filing.value = await ventanillaApi.fetchFiling(id.value)
    selectedAssignedUserId.value = filing.value.assigned_user?.id ?? null
    await loadResponsibleUsers(
      filing.value.org_unit_responsible?.id ?? null,
      filing.value.assigned_user?.id ?? null,
    )
  } catch {
    errorMessage.value = 'No se pudo cargar el radicado'
  } finally {
    loading.value = false
  }
}

onMounted(() => load())

function formatDate(iso: string | null | undefined): string {
  if (!iso) {
    return '—'
  }

  return new Date(iso).toLocaleString('es-CO')
}

function statusLabel(status: string): string {
  return VENTANILLA_FILING_STATUS_LABELS[status as keyof typeof VENTANILLA_FILING_STATUS_LABELS] ?? status
}

function closureResultLabel(result: string | null | undefined): string {
  const labels: Record<string, string> = {
    closed_on_time: 'Cerrado en término',
    closed_late: 'Cerrado fuera de término',
    closed_no_response_required: 'Cerrado sin obligación de respuesta',
    closed_without_deadline: 'Cerrado sin fecha límite',
  }

  return result ? (labels[result] ?? result) : '—'
}

function eventTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    registered: 'Radicación',
    assigned: 'Asignación',
    started: 'Inicio de gestión',
    responded: 'Respuesta',
    closed: 'Cierre',
    voided: 'Anulación',
    intake_classified: 'Clasificación desde bandeja',
    traffic_light_changed: 'Cambio de semáforo',
    sla_alert_notified: 'Notificación SLA',
    escalated: 'Escalamiento SLA',
  }

  return labels[type] ?? type
}

function alertRecipientRoleLabel(role: string): string {
  const labels: Record<string, string> = {
    assignee: 'responsable',
    immediate_supervisor: 'jefe inmediato',
    unit_manager: 'jefe de área',
  }

  return labels[role] ?? role
}

function notificationChannelLabel(channel: string): string {
  return VENTANILLA_NOTIFICATION_CHANNEL_LABELS[channel] ?? channel
}

function notificationEventLabel(eventType: string): string {
  return VENTANILLA_NOTIFICATION_EVENT_LABELS[eventType] ?? eventType
}

function formatMetadataValue(dataType: string, value: unknown): string {
  if (Array.isArray(value) || (value && typeof value === 'object' && typeof value !== 'boolean')) {
    return JSON.stringify(value)
  }

  return formatArchivalMetadataValue(dataType, value)
}

async function runAction(action: string, callback: () => Promise<VentanillaFilingDetail>) {
  actionLoading.value = action
  errorMessage.value = ''
  actionMessage.value = ''
  try {
    filing.value = await callback()
    selectedAssignedUserId.value = filing.value.assigned_user?.id ?? selectedAssignedUserId.value
    actionMessage.value = 'Acción registrada correctamente'
  } catch (e: unknown) {
    const err = e as { data?: { message?: string; errors?: Record<string, string[]> } }
    const first = err.data?.errors ? Object.values(err.data.errors)[0]?.[0] : null
    errorMessage.value = first ?? err.data?.message ?? 'No se pudo ejecutar la acción'
  } finally {
    actionLoading.value = ''
  }
}

async function assignResponsible() {
  if (!selectedAssignedUserId.value) {
    errorMessage.value = 'Seleccione un responsable'
    return
  }

  await runAction('assign', () => ventanillaApi.assignFiling(id.value, {
    assigned_user_id: selectedAssignedUserId.value!,
    note: assignmentNote.value.trim() || undefined,
  }))
  assignmentNote.value = ''
}

async function startManagement() {
  await runAction('start', () => ventanillaApi.startFiling(id.value))
}

async function respondAndClose() {
  if (!responseText.value.trim()) {
    errorMessage.value = 'Ingrese la respuesta'
    return
  }

  await runAction('respond', () => ventanillaApi.respondFiling(id.value, responseText.value.trim()))
  responseText.value = ''
}

async function closeFiling() {
  await runAction('close', () => ventanillaApi.closeFiling(id.value, closeReason.value.trim() || undefined))
  closeReason.value = ''
}

async function voidCurrentFiling() {
  if (!voidReason.value.trim()) {
    errorMessage.value = 'Ingrese el motivo de anulación'
    return
  }

  await runAction('void', () => ventanillaApi.voidFiling(id.value, voidReason.value.trim()))
  voidReason.value = ''
}

async function refreshSla() {
  await runAction('sla', async () => {
    await ventanillaApi.refreshSla()

    return await ventanillaApi.fetchFiling(id.value)
  })
}

async function viewFile(fileId: number, mimeType?: string | null) {
  if (!hasPermission('ventanilla_archivos_ver')) {
    return
  }
  openingFileId.value = fileId
  try {
    await ventanillaApi.viewFilingFileInNewTab(id.value, fileId, mimeType ?? undefined)
  } catch (err) {
    errorMessage.value = err instanceof Error && err.message
      ? err.message
      : 'No se pudo abrir el archivo'
  } finally {
    openingFileId.value = null
  }
}

async function viewReceipt() {
  if (!filing.value) {
    return
  }

  openingReceipt.value = true
  try {
    await ventanillaApi.viewReceiptInNewTab(filing.value.id)
  } catch {
    errorMessage.value = 'No se pudo abrir el comprobante'
  } finally {
    openingReceipt.value = false
  }
}

async function viewSticker() {
  if (!filing.value) {
    return
  }

  openingSticker.value = true
  try {
    await ventanillaApi.viewStickerInNewTab(filing.value.id)
  } catch {
    errorMessage.value = 'No se pudo abrir la etiqueta'
  } finally {
    openingSticker.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
    <div
      v-if="!loading && filing"
      class="sticky top-0 z-10 -mx-4 space-y-3 border-b bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:-mx-6 md:px-6"
    >
      <div class="flex items-center gap-3">
        <Button variant="ghost" size="icon" @click="navigateTo('/ventanilla')">
          <Icon name="i-lucide-arrow-left" class="size-4" />
        </Button>
        <div class="flex-1">
          <h1 class="font-mono text-xl font-semibold">
            {{ filing.filing_number }}
          </h1>
          <p class="text-muted-foreground text-sm">
            {{ VENTANILLA_FILING_TYPE_LABELS[filing.filing_type] }} · {{ filing.subject }}
          </p>
        </div>
      </div>

      <div class="flex flex-wrap items-center gap-2">
        <VentanillaTrafficLightBadge
          :status="filing.traffic_light_status"
          :requires-response="filing.requires_response"
        />
        <Badge
          v-if="filing.functional_type_key === VENTANILLA_INFORMATIVE_FUNCTIONAL_TYPE_KEY"
          variant="secondary"
        >
          Informativo
        </Badge>
        <Badge variant="outline">
          {{ statusLabel(filing.status) }}
        </Badge>
        <Badge v-if="filing.workflow?.current_stage_name" variant="secondary">
          {{ filing.workflow.current_stage_name }}
        </Badge>
        <VentanillaTrafficLightBadge
          v-if="workflowOpenTask?.traffic_light_status"
          :status="workflowOpenTask.traffic_light_status"
        />
        <div class="ml-auto flex flex-wrap gap-2">
          <NuxtLink
            v-if="hasPermission('workflow_ver') && filing.workflow?.is_active"
            to="/workflow/bandeja"
          >
            <Button variant="outline" size="sm">
              <Icon name="i-lucide-inbox" class="mr-1 size-4" />
              Bandeja workflow
            </Button>
          </NuxtLink>
          <Button
            variant="outline"
            size="sm"
            :disabled="openingSticker"
            @click="viewSticker"
          >
            <Icon name="i-lucide-tag" class="mr-1 size-4" />
            {{ openingSticker ? 'Abriendo…' : 'Imprimir etiqueta' }}
          </Button>
          <Button
            variant="outline"
            size="sm"
            :disabled="openingReceipt"
            @click="viewReceipt"
          >
            <Icon name="i-lucide-file-text" class="mr-1 size-4" />
            {{ openingReceipt ? 'Abriendo…' : 'Ver comprobante PDF' }}
          </Button>
        </div>
      </div>
    </div>

    <div v-if="loading" class="text-muted-foreground text-sm">
      Cargando…
    </div>
    <p v-if="!loading && errorMessage" class="text-destructive text-sm">
      {{ errorMessage }}
    </p>

    <template v-if="!loading && filing">
      <p v-if="actionMessage" class="text-sm text-emerald-600">
        {{ actionMessage }}
      </p>

      <div class="flex flex-col gap-4 lg:flex-row lg:gap-6">
        <div class="lg:hidden">
          <div class="-mx-1 overflow-x-auto pb-1">
            <div class="flex gap-1.5 px-1">
              <button
                v-for="section in detailSections"
                :key="section.id"
                type="button"
                class="shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors"
                :class="activeSection === section.id
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground'"
                @click="activeSection = section.id"
              >
                {{ section.label }}
              </button>
            </div>
          </div>
        </div>

        <nav class="hidden shrink-0 lg:block lg:w-56 xl:w-60 lg:sticky lg:top-36 lg:self-start">
          <div class="rounded-lg border bg-muted/30 p-2">
            <p class="mb-2 px-2 text-xs font-medium text-muted-foreground">
              Secciones
            </p>
            <div class="max-h-[calc(100vh-11rem)] space-y-0.5 overflow-y-auto">
              <button
                v-for="section in detailSections"
                :key="section.id"
                type="button"
                class="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm transition-colors hover:bg-accent"
                :class="activeSection === section.id ? 'bg-accent font-medium' : ''"
                @click="activeSection = section.id"
              >
                <Icon
                  :name="section.icon"
                  class="size-4 shrink-0 text-muted-foreground"
                />
                <span class="truncate">{{ section.label }}</span>
              </button>
            </div>
          </div>
        </nav>

        <div class="min-w-0 flex-1 space-y-6">
          <Card v-show="activeSection === 'resumen'">
            <CardHeader class="pb-3">
              <CardTitle>Resumen</CardTitle>
            </CardHeader>
            <CardContent>
              <dl class="grid gap-3 text-sm sm:grid-cols-2 xl:grid-cols-3">
            <div class="sm:col-span-2">
              <dt class="text-muted-foreground text-xs">
                Asunto
              </dt>
              <dd class="mt-1 font-medium">
                {{ filing.subject }}
              </dd>
            </div>
            <div>
              <dt class="text-muted-foreground text-xs">
                Radicado por
              </dt>
              <dd class="mt-1 font-medium">
                {{ filing.filed_by?.name ?? '—' }}
              </dd>
            </div>
            <div>
              <dt class="text-muted-foreground text-xs">
                Fecha
              </dt>
              <dd class="mt-1 font-medium">
                {{ formatDate(filing.filed_at) }}
              </dd>
            </div>
            <div>
              <dt class="text-muted-foreground text-xs">
                Área responsable
              </dt>
              <dd class="mt-1 font-medium">
                {{ filing.org_unit_responsible?.code }} — {{ filing.org_unit_responsible?.name }}
              </dd>
            </div>
            <div>
              <dt class="text-muted-foreground text-xs">
                Tipo funcional
              </dt>
              <dd class="mt-1 font-medium">
                {{ filing.functional_type_label ?? filing.functional_type_key }}
              </dd>
            </div>
            <div v-if="filing.requires_response">
              <dt class="text-muted-foreground text-xs">
                Fecha límite
              </dt>
              <dd class="mt-1 font-medium">
                {{ formatDate(filing.response_deadline_at) }}
              </dd>
            </div>
            <div v-if="filing.sla_business_days">
              <dt class="text-muted-foreground text-xs">
                SLA radicado
              </dt>
              <dd class="mt-1 font-medium">
                {{ filing.sla_business_days }} días hábiles
              </dd>
            </div>
            <div v-if="filing.workflow?.workflow_name">
              <dt class="text-muted-foreground text-xs">
                Flujo workflow
              </dt>
              <dd class="mt-1 font-medium">
                {{ filing.workflow.workflow_name }}
              </dd>
            </div>
            <div v-if="workflowOpenTask?.due_at">
              <dt class="text-muted-foreground text-xs">
                Vence etapa actual
              </dt>
              <dd class="mt-1 font-medium">
                {{ formatDate(workflowOpenTask.due_at) }}
                <span
                  v-if="workflowOpenTask.days_overdue"
                  class="text-destructive"
                >
                  ({{ workflowOpenTask.days_overdue }} día{{ workflowOpenTask.days_overdue === 1 ? '' : 's' }} de retraso)
                </span>
              </dd>
            </div>
            <div>
              <dt class="text-muted-foreground text-xs">
                Responsable
              </dt>
              <dd class="mt-1 font-medium">
                {{ filing.assigned_user?.name ?? 'Sin asignar' }}
              </dd>
            </div>
            <div v-if="filing.assigned_at">
              <dt class="text-muted-foreground text-xs">
                Asignado el
              </dt>
              <dd class="mt-1 font-medium">
                {{ formatDate(filing.assigned_at) }}
              </dd>
            </div>
            <div v-if="filing.closed_at">
              <dt class="text-muted-foreground text-xs">
                Cierre
              </dt>
              <dd class="mt-1 font-medium">
                {{ formatDate(filing.closed_at) }} — {{ closureResultLabel(filing.closure_result) }}
              </dd>
            </div>
            <div v-if="filing.voided_at">
              <dt class="text-muted-foreground text-xs">
                Anulación
              </dt>
              <dd class="mt-1 font-medium">
                {{ formatDate(filing.voided_at) }}
              </dd>
            </div>
            <div v-if="filing.sender_name" class="sm:col-span-2">
              <dt class="text-muted-foreground text-xs">
                Remitente
              </dt>
              <dd class="mt-1 font-medium">
                {{ filing.sender_name }}
                <span v-if="filing.sender_identifier" class="text-muted-foreground font-normal"> ({{ filing.sender_identifier }})</span>
              </dd>
            </div>
            <div v-if="filing.notes" class="sm:col-span-2">
              <dt class="text-muted-foreground text-xs">
                Observaciones
              </dt>
              <dd class="mt-1 font-medium whitespace-pre-wrap">
                {{ filing.notes }}
              </dd>
            </div>
            <div v-if="filing.response_text" class="sm:col-span-2">
              <dt class="text-muted-foreground text-xs">
                Respuesta
              </dt>
              <dd class="mt-1 font-medium whitespace-pre-wrap">
                {{ filing.response_text }}
              </dd>
            </div>
            <div v-if="filing.close_reason" class="sm:col-span-2">
              <dt class="text-muted-foreground text-xs">
                Motivo de cierre
              </dt>
              <dd class="mt-1 font-medium whitespace-pre-wrap">
                {{ filing.close_reason }}
              </dd>
            </div>
            <div v-if="filing.void_reason" class="sm:col-span-2">
              <dt class="text-muted-foreground text-xs">
                Motivo de anulación
              </dt>
              <dd class="mt-1 font-medium whitespace-pre-wrap">
                {{ filing.void_reason }}
              </dd>
            </div>
          </dl>
            </CardContent>
          </Card>

          <div v-show="activeSection === 'gestion'">
            <Card v-if="canAssign || canManage || canVoid">
              <CardHeader>
                <CardTitle>Gestión del radicado</CardTitle>
                <CardDescription>
                  Asignación, respuesta, cierre y anulación conservan trazabilidad.
                </CardDescription>
              </CardHeader>
              <CardContent class="space-y-6">
                <Button
                  v-if="canRefreshSla"
                  variant="outline"
                  :disabled="actionLoading === 'sla'"
                  @click="refreshSla"
                >
                  {{ actionLoading === 'sla' ? 'Actualizando…' : 'Actualizar semáforo SLA' }}
                </Button>

                <div v-if="canAssign" class="space-y-3">
                  <div class="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] lg:items-end">
                    <div class="space-y-2">
                      <Label>Responsable</Label>
                      <Select
                        :model-value="selectedAssignedUserId != null ? String(selectedAssignedUserId) : undefined"
                        :disabled="loadingResponsibleUsers || !responsibleUsers.length"
                        @update:model-value="selectedAssignedUserId = $event ? Number($event) : null"
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione responsable" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            v-for="user in responsibleUsers"
                            :key="user.id"
                            :value="String(user.id)"
                          >
                            {{ user.name }}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div class="space-y-2">
                      <Label>Nota de asignación</Label>
                      <Input v-model="assignmentNote" placeholder="Opcional" />
                    </div>
                    <Button
                      class="w-full lg:w-auto"
                      :disabled="actionLoading === 'assign'"
                      @click="assignResponsible"
                    >
                      {{ actionLoading === 'assign' ? 'Asignando…' : 'Asignar' }}
                    </Button>
                  </div>
                  <p
                    v-if="!loadingResponsibleUsers && !responsibleUsers.length"
                    class="text-muted-foreground text-xs"
                  >
                    No hay usuarios vinculados al área {{ filing.org_unit_responsible?.name ?? 'responsable' }}.
                  </p>
                  <p v-else class="text-muted-foreground text-xs">
                    Usuarios del área {{ filing.org_unit_responsible?.name ?? 'responsable' }}.
                  </p>
                </div>

                <div v-if="canManage" class="space-y-3">
                  <Button
                    v-if="filing.status === 'registered'"
                    variant="secondary"
                    :disabled="actionLoading === 'start'"
                    @click="startManagement"
                  >
                    {{ actionLoading === 'start' ? 'Iniciando…' : 'Iniciar gestión' }}
                  </Button>

                  <div v-if="filing.requires_response" class="space-y-2">
                    <Label>Respuesta</Label>
                    <Textarea v-model="responseText" rows="4" placeholder="Registre la respuesta dada al remitente…" />
                    <Button :disabled="actionLoading === 'respond'" @click="respondAndClose">
                      {{ actionLoading === 'respond' ? 'Cerrando…' : 'Registrar respuesta y cerrar' }}
                    </Button>
                  </div>

                  <div v-else class="space-y-2">
                    <Label>Motivo de cierre</Label>
                    <Textarea v-model="closeReason" rows="3" placeholder="Opcional" />
                    <Button :disabled="actionLoading === 'close'" @click="closeFiling">
                      {{ actionLoading === 'close' ? 'Cerrando…' : 'Cerrar radicado' }}
                    </Button>
                  </div>
                </div>

                <div v-if="canVoid" class="space-y-2 rounded-lg border border-destructive/30 p-3">
                  <Label>Motivo de anulación</Label>
                  <Textarea v-model="voidReason" rows="3" placeholder="Obligatorio para anular" />
                  <Button variant="destructive" :disabled="actionLoading === 'void'" @click="voidCurrentFiling">
                    {{ actionLoading === 'void' ? 'Anulando…' : 'Anular radicado' }}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          <div v-show="activeSection === 'workflow'">
            <WorkflowFilingPanel :filing-id="id" @changed="load" />
          </div>

          <Card v-show="activeSection === 'archivos'">
            <CardHeader>
              <CardTitle>Archivos</CardTitle>
            </CardHeader>
            <CardContent>
              <ul v-if="filing.files?.length" class="divide-y">
                <li
                  v-for="file in filing.files"
                  :key="file.id"
                  class="flex items-center justify-between py-3 text-sm"
                >
                  <div>
                    <p class="font-medium">
                      {{ file.title }}
                      <Badge v-if="file.is_primary" variant="secondary" class="ml-2">
                        Principal
                      </Badge>
                    </p>
                    <p class="text-muted-foreground text-xs">
                      {{ file.original_name }}
                    </p>
                  </div>
                  <Button
                    v-if="hasPermission('ventanilla_archivos_ver')"
                    variant="outline"
                    size="sm"
                    :disabled="openingFileId === file.id"
                    @click="viewFile(file.id, file.mime_type)"
                  >
                    <Icon
                      :name="openingFileId === file.id ? 'i-lucide-loader-2' : 'i-lucide-external-link'"
                      class="mr-1 size-4"
                      :class="{ 'animate-spin': openingFileId === file.id }"
                    />
                    {{ openingFileId === file.id ? 'Abriendo…' : 'Ver' }}
                  </Button>
                </li>
              </ul>
              <p v-else class="text-muted-foreground text-sm">
                Sin archivos adjuntos.
              </p>
            </CardContent>
          </Card>

          <Card v-show="activeSection === 'trd'">
            <CardHeader>
              <CardTitle>Clasificación TRD</CardTitle>
            </CardHeader>
            <CardContent>
              <dl class="grid gap-3 text-sm sm:grid-cols-2">
            <div>
              <dt class="text-muted-foreground text-xs">
                Serie
              </dt>
              <dd class="mt-1 font-medium">
                {{ filing.doc_series?.code }} — {{ filing.doc_series?.name }}
              </dd>
            </div>
            <div>
              <dt class="text-muted-foreground text-xs">
                Subserie
              </dt>
              <dd class="mt-1 font-medium">
                {{ filing.doc_subseries?.code }} — {{ filing.doc_subseries?.name }}
              </dd>
            </div>
            <div>
              <dt class="text-muted-foreground text-xs">
                Tipo documental
              </dt>
              <dd class="mt-1 font-medium">
                {{ filing.doc_document_type?.code }} — {{ filing.doc_document_type?.name }}
              </dd>
            </div>
            <div v-if="filing.trd_version">
              <dt class="text-muted-foreground text-xs">
                Versión TRD
              </dt>
              <dd class="mt-1 font-medium">
                v{{ filing.trd_version.version_number }}
              </dd>
            </div>
              </dl>
            </CardContent>
          </Card>

          <Card v-show="activeSection === 'metadatos'">
            <CardHeader>
              <CardTitle>Metadatos y verificación</CardTitle>
          <CardDescription>
            Datos dinámicos capturados y enlace público de verificación del comprobante.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4 text-sm">
          <div v-if="filing.archival_metadata_schema" class="space-y-3">
            <p class="font-medium">
              {{ filing.archival_metadata_schema.name }}
              <span class="text-muted-foreground font-normal">v{{ filing.archival_metadata_schema.version_number }}</span>
            </p>
            <dl v-if="metadataRows.length" class="grid gap-4 sm:grid-cols-2">
              <div
                v-for="row in metadataRows"
                :key="row.code"
              >
                <dt class="text-muted-foreground text-xs">
                  {{ row.label }}
                </dt>
                <dd class="mt-1 font-medium break-words">
                  {{ formatMetadataValue(row.dataType, row.value) }}
                </dd>
              </div>
            </dl>
            <p v-else class="text-muted-foreground">
              No se registraron valores para este esquema.
            </p>
          </div>
          <p v-else class="text-muted-foreground">
            No hay esquema de metadatos archivísticos aplicado a este radicado.
          </p>
          <div v-if="filing.verification_url" class="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-muted/40 p-3">
            <div class="min-w-0">
              <p class="text-muted-foreground text-xs">
                Verificación pública del comprobante
              </p>
              <p class="text-muted-foreground mt-1 break-all font-mono text-[11px]">
                {{ filing.verification_url }}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              as-child
            >
              <a
                :href="filing.verification_url"
                target="_blank"
                rel="noopener noreferrer"
              >
                <Icon name="i-lucide-external-link" class="mr-1 size-4" />
                Abrir verificación
              </a>
            </Button>
          </div>
            </CardContent>
          </Card>

          <Card v-show="activeSection === 'trazabilidad'">
            <CardHeader>
              <CardTitle>Trazabilidad</CardTitle>
            </CardHeader>
            <CardContent>
              <ul v-if="filing.events?.length" class="max-h-[min(70vh,32rem)] space-y-4 overflow-y-auto pr-1">
            <li
              v-for="event in filing.events"
              :key="event.id"
              class="border-l pl-4 text-sm"
            >
              <div class="flex flex-wrap items-center gap-2">
                <span class="font-medium">{{ eventTypeLabel(event.event_type) }}</span>
                <span class="text-muted-foreground text-xs">{{ formatDate(event.created_at) }}</span>
              </div>
              <p v-if="event.description" class="mt-1">
                {{ event.description }}
              </p>
              <p class="text-muted-foreground text-xs">
                {{ event.created_by?.name ?? 'Sistema' }}
                <template v-if="event.from_status || event.to_status">
                  · {{ event.from_status ? statusLabel(event.from_status) : '—' }}
                  → {{ event.to_status ? statusLabel(event.to_status) : '—' }}
                </template>
              </p>
            </li>
          </ul>
              <p v-else class="text-muted-foreground text-sm">
                Sin eventos registrados.
              </p>
            </CardContent>
          </Card>

          <Card v-if="filing.notification_deliveries?.length" v-show="activeSection === 'notificaciones'">
        <CardHeader>
          <CardTitle>Notificaciones enviadas</CardTitle>
          <CardDescription>
            Registro de envíos por correo, WhatsApp e interno.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul class="space-y-2 text-sm">
            <li
              v-for="delivery in filing.notification_deliveries"
              :key="delivery.id"
              class="rounded-lg border p-3"
            >
              <div class="flex flex-wrap items-center gap-2">
                <Badge variant="outline">
                  {{ notificationChannelLabel(delivery.channel) }}
                </Badge>
                <span class="font-medium">{{ notificationEventLabel(delivery.event_type) }}</span>
                <Badge v-if="delivery.status === 'failed'" variant="destructive">
                  Fallido
                </Badge>
              </div>
              <p class="text-muted-foreground mt-1 text-xs">
                {{ delivery.recipient_user?.name ?? delivery.recipient_address ?? 'Destinatario' }}
                <template v-if="delivery.recipient_role">
                  ({{ alertRecipientRoleLabel(delivery.recipient_role) }})
                </template>
                · {{ formatDate(delivery.sent_at) }}
              </p>
              <p v-if="delivery.error_message" class="mt-1 text-xs text-destructive">
                {{ delivery.error_message }}
              </p>
            </li>
          </ul>
            </CardContent>
          </Card>

          <Card v-show="activeSection === 'alertas'">
            <CardHeader>
              <CardTitle>Alertas SLA</CardTitle>
            </CardHeader>
        <CardContent>
          <ul v-if="filing.alerts?.length" class="space-y-3">
            <li
              v-for="alert in filing.alerts"
              :key="alert.id"
              class="rounded-lg border p-3 text-sm"
            >
              <div class="flex flex-wrap items-center gap-2">
                <VentanillaTrafficLightBadge :status="alert.traffic_light_status" />
                <span class="font-medium">{{ alert.message }}</span>
              </div>
              <p class="mt-1 text-muted-foreground text-xs">
                Generada: {{ formatDate(alert.triggered_at) }}
              </p>
              <ul v-if="alert.deliveries?.length" class="mt-2 space-y-1 text-xs text-muted-foreground">
                <li v-for="delivery in alert.deliveries" :key="delivery.id">
                  Correo a {{ delivery.recipient_user?.name ?? delivery.recipient_email }}
                  ({{ alertRecipientRoleLabel(delivery.recipient_role) }}) · {{ formatDate(delivery.sent_at) }}
                </li>
              </ul>
            </li>
          </ul>
              <p v-else class="text-muted-foreground text-sm">
                Sin alertas SLA registradas.
              </p>
            </CardContent>
          </Card>

          <Card v-if="filing.escalation" v-show="activeSection === 'escalamiento'">
        <CardHeader>
          <CardTitle>Escalamiento</CardTitle>
        </CardHeader>
        <CardContent class="space-y-2 text-sm">
          <p class="font-medium">
            {{ filing.escalation.message }}
          </p>
          <p class="text-muted-foreground text-xs">
            Escalado: {{ formatDate(filing.escalation.escalated_at) }}
            · {{ filing.escalation.business_days_overdue }} día(s) hábil(es) vencido(s)
          </p>
          <ul v-if="filing.escalation.deliveries?.length" class="space-y-1 text-xs text-muted-foreground">
            <li v-for="delivery in filing.escalation.deliveries" :key="delivery.id">
              Correo a {{ delivery.recipient_user?.name ?? delivery.recipient_email }}
              ({{ alertRecipientRoleLabel(delivery.recipient_role) }}) · {{ formatDate(delivery.sent_at) }}
            </li>
          </ul>
            </CardContent>
          </Card>
        </div>
      </div>
    </template>
  </div>
</template>
