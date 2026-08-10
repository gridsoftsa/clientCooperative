<script setup lang="ts">
import Multiselect from '@vueform/multiselect'
import { toast } from 'vue-sonner'
import type {
  CommunicationAudienceTypeValue,
  CommunicationTypeValue,
  CreateCommunicationPayload,
} from '~/types/communications'
import {
  COMMUNICATION_PUBLISH_PRESET_LABELS,
  formatBogotaSchedulePreview,
  resolveCommunicationPublishPreset,
  type CommunicationPublishPreset,
} from '~/utils/communication-schedule-presets'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'comunicados_crear',
})

const DEFAULT_TYPES: Array<{ value: CommunicationTypeValue, label: string }> = [
  { value: 'notice', label: 'Aviso' },
  { value: 'news', label: 'Noticia' },
  { value: 'circular', label: 'Circular' },
  { value: 'announcement', label: 'Comunicado' },
  { value: 'event', label: 'Evento' },
  { value: 'birthday', label: 'Cumpleaños' },
]

const AUDIENCE_MODE_OPTIONS: Array<{ value: CommunicationAudienceTypeValue, label: string }> = [
  { value: 'all', label: 'Toda la organización' },
  { value: 'org_unit', label: 'Áreas específicas' },
  { value: 'role', label: 'Roles específicos' },
  { value: 'user', label: 'Usuarios específicos' },
]

const communicationsApi = useCommunicationsApi()
const router = useRouter()

const loading = ref(false)
const optionsReady = ref(false)
const types = ref(DEFAULT_TYPES)
const orgUnits = ref<Array<{ id: number, name: string }>>([])
const roles = ref<Array<{ id: number, name: string }>>([])
const users = ref<Array<{ id: number, name: string, email?: string | null }>>([])
const files = ref<File[]>([])
const attachmentMaxMb = ref(2)

function formatAttachmentLimitMb(kilobytes: number): string {
  return (kilobytes / 1024).toFixed(1).replace(/\.0$/, '')
}

function extractApiErrorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === 'object') {
    const payload = error as {
      data?: { message?: string, errors?: Record<string, string[]> }
      message?: string
    }

    const fileError = payload.data?.errors?.file?.[0]
    if (fileError) {
      return fileError
    }

    if (payload.data?.message) {
      return payload.data.message
    }

    if (payload.message) {
      return payload.message
    }
  }

  return fallback
}

const form = ref({
  type: 'notice' as CommunicationTypeValue,
  title: '',
  summary: '',
  body: '',
  is_featured: false,
  is_important: false,
  requires_read_confirmation: false,
  notify_internal: true,
  notify_email: false,
  publish_now: true,
  publish_preset: 'now' as CommunicationPublishPreset,
  scheduled_at: '',
  reminders_enabled: false,
  reminder_interval_days: 3,
  reminder_max_count: 2,
  expires_at: '',
  org_unit_id: null as number | null,
  event_starts_at: '',
  event_ends_at: '',
  event_location: '',
  audience_mode: 'all' as CommunicationAudienceTypeValue,
  audience_ids: [] as number[],
  link_url: '',
  link_title: '',
})

const isEvent = computed(() => form.value.type === 'event')

const isScheduled = computed(() => form.value.publish_preset !== 'now')

const schedulePreview = computed(() => formatBogotaSchedulePreview(form.value.scheduled_at))

const publishPresetOptions = computed(() =>
  (Object.entries(COMMUNICATION_PUBLISH_PRESET_LABELS) as Array<[CommunicationPublishPreset, string]>)
    .map(([value, label]) => ({ value, label })),
)

const reminderIntervalOptions = ref<Array<{ value: number, label: string }>>([
  { value: 1, label: 'Cada 1 día' },
  { value: 3, label: 'Cada 3 días' },
  { value: 7, label: 'Cada 7 días' },
])

const reminderMaxCountOptions = ref<Array<{ value: number, label: string }>>([
  { value: 1, label: '1 recordatorio' },
  { value: 2, label: '2 recordatorios' },
  { value: 3, label: '3 recordatorios' },
])

const typeOptions = computed(() =>
  types.value
    .filter(type => type.value)
    .map(type => ({ value: type.value, label: type.label })),
)

const orgUnitOptions = computed(() =>
  orgUnits.value
    .filter(unit => unit.id != null && Boolean(unit.name?.trim()))
    .map(unit => ({ value: unit.id, label: unit.name.trim() })),
)

const roleOptions = computed(() =>
  roles.value
    .filter(role => role.id != null && Boolean(role.name?.trim()))
    .map(role => ({ value: role.id, label: role.name.trim() })),
)

const userOptions = computed(() =>
  users.value
    .filter(user => user.id != null && Boolean(user.name?.trim()))
    .map((user) => {
      const name = user.name.trim()
      const email = user.email?.trim()
      return {
        value: user.id,
        label: email ? `${name} (${email})` : name,
      }
    }),
)

const audienceTargetOptions = computed(() => {
  if (form.value.audience_mode === 'role') {
    return roleOptions.value
  }
  if (form.value.audience_mode === 'user') {
    return userOptions.value
  }
  return orgUnitOptions.value
})

const audienceTargetLabel = computed(() => {
  if (form.value.audience_mode === 'role') {
    return 'Roles'
  }
  if (form.value.audience_mode === 'user') {
    return 'Usuarios'
  }
  return 'Áreas'
})

const audienceTargetPlaceholder = computed(() => {
  if (form.value.audience_mode === 'role') {
    return 'Seleccione roles'
  }
  if (form.value.audience_mode === 'user') {
    return 'Busque y seleccione usuarios'
  }
  return 'Seleccione áreas'
})

async function loadOptions() {
  try {
    const options = await communicationsApi.fetchOptions()
    const apiTypes = (options.types ?? [])
      .filter(type => type.value)
      .map(type => ({
        value: type.value as CommunicationTypeValue,
        label: type.label,
      }))

    if (apiTypes.length > 0) {
      types.value = apiTypes
    }

    orgUnits.value = options.org_units ?? []
    roles.value = options.roles ?? []
    users.value = options.users ?? []

    const reminderSettings = options.reminder_settings
    if (reminderSettings) {
      form.value.reminder_interval_days = reminderSettings.reminder_default_interval_days
      form.value.reminder_max_count = reminderSettings.reminder_default_max_count
      if (reminderSettings.reminder_interval_choices.length > 0) {
        reminderIntervalOptions.value = reminderSettings.reminder_interval_choices
      }
      if (reminderSettings.reminder_max_count_choices.length > 0) {
        reminderMaxCountOptions.value = reminderSettings.reminder_max_count_choices
      }
    }

    if (options.attachment_limits?.effective_max_kb) {
      attachmentMaxMb.value = Number(formatAttachmentLimitMb(options.attachment_limits.effective_max_kb))
    }
  }
  catch {
    try {
      const fallbackTypes = await communicationsApi.fetchTypes()
      const mapped = fallbackTypes
        .filter(type => type.value)
        .map(type => ({
          value: type.value as CommunicationTypeValue,
          label: type.label,
        }))

      if (mapped.length > 0) {
        types.value = mapped
      }
    }
    catch {
      types.value = DEFAULT_TYPES
    }

    orgUnits.value = []
    roles.value = []
    users.value = []
  }
  finally {
    if (!typeOptions.value.some(type => type.value === form.value.type)) {
      form.value.type = typeOptions.value[0]?.value ?? 'notice'
    }
    optionsReady.value = true
  }
}

watch(() => form.value.audience_mode, () => {
  form.value.audience_ids = []
})

watch(() => form.value.publish_preset, (preset) => {
  if (preset === 'now') {
    form.value.scheduled_at = ''
    form.value.publish_now = true
    return
  }

  form.value.publish_now = false
  if (preset !== 'custom') {
    form.value.scheduled_at = resolveCommunicationPublishPreset(preset)
  }
})

watch(() => form.value.requires_read_confirmation, (required) => {
  if (!required) {
    form.value.reminders_enabled = false
  }
})

function buildAudiences(): CreateCommunicationPayload['audiences'] {
  if (form.value.audience_mode === 'all') {
    return [{ audience_type: 'all' }]
  }

  return form.value.audience_ids.map(id => ({
    audience_type: form.value.audience_mode,
    audience_id: Number(id),
  }))
}

function validateAttachmentSizes(): string | null {
  const maxBytes = attachmentMaxMb.value * 1024 * 1024

  for (const file of files.value) {
    if (file.size > maxBytes) {
      return `${file.name} supera el máximo de ${attachmentMaxMb.value} MB por archivo.`
    }
  }

  return null
}

async function submit() {
  if (!form.value.title.trim()) {
    toast.error('Indique el título.')
    return
  }

  if (form.value.audience_mode !== 'all' && form.value.audience_ids.length === 0) {
    toast.error('Seleccione al menos un destinatario.')
    return
  }

  if (isScheduled.value && !form.value.scheduled_at) {
    toast.error('Indique la fecha y hora de publicación.')
    return
  }

  if (form.value.reminders_enabled && !form.value.requires_read_confirmation) {
    toast.error('Active la confirmación de lectura para usar recordatorios.')
    return
  }

  const attachmentSizeError = validateAttachmentSizes()
  if (attachmentSizeError) {
    toast.error(attachmentSizeError)
    return
  }

  const wantsPublishNow = form.value.publish_now && !isScheduled.value
  const wantsSchedule = isScheduled.value
  const hasAttachments = files.value.length > 0
  const shouldDeferPublication = hasAttachments && wantsPublishNow

  loading.value = true
  let createdId: number | null = null

  try {
    const payload: CreateCommunicationPayload = {
      type: form.value.type,
      title: form.value.title.trim(),
      summary: form.value.summary || undefined,
      body: form.value.body || undefined,
      is_featured: form.value.is_featured,
      is_important: form.value.is_important,
      requires_read_confirmation: form.value.requires_read_confirmation,
      notify_internal: form.value.notify_internal,
      notify_email: form.value.notify_email,
      reminders_enabled: form.value.reminders_enabled,
      reminder_interval_days: form.value.reminder_interval_days,
      reminder_max_count: form.value.reminder_max_count,
      publish_now: shouldDeferPublication ? false : wantsPublishNow,
      scheduled_at: wantsSchedule ? bogotaDatetimeLocalToIso(form.value.scheduled_at) : null,
      expires_at: bogotaDatetimeLocalToIso(form.value.expires_at),
      org_unit_id: form.value.org_unit_id,
      event_starts_at: bogotaDatetimeLocalToIso(form.value.event_starts_at),
      event_ends_at: bogotaDatetimeLocalToIso(form.value.event_ends_at),
      event_location: form.value.event_location || null,
      audiences: buildAudiences(),
      links: form.value.link_url
        ? [{ url: form.value.link_url, title: form.value.link_title || undefined }]
        : [],
    }

    const created = await communicationsApi.createCommunication(payload)
    createdId = created.data.id

    for (const file of files.value) {
      await communicationsApi.uploadAttachment(createdId, file)
    }

    if (shouldDeferPublication) {
      await communicationsApi.publishCommunication(createdId)
    }

    if (wantsPublishNow) {
      toast.success('Comunicado publicado.')
    }
    else if (wantsSchedule) {
      toast.success('Comunicado programado.')
    }
    else {
      toast.success(created.message || 'Comunicado creado.')
    }

    await router.push(`/comunicados/${createdId}`)
  }
  catch (error) {
    if (createdId !== null) {
      try {
        await communicationsApi.deleteCommunication(createdId)
      }
      catch {
        // Borrador huérfano: requiere limpieza manual si falla el rollback.
      }
    }

    toast.error(extractApiErrorMessage(error, 'No se pudo publicar el comunicado. No se guardó ningún cambio.'))
  }
  finally {
    loading.value = false
  }
}

onMounted(loadOptions)
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <div>
      <Button variant="ghost" size="sm" as-child class="mb-2 -ml-2">
        <NuxtLink to="/comunicados">
          <Icon name="i-lucide-arrow-left" class="mr-1 size-4" />
          Volver
        </NuxtLink>
      </Button>
      <h1 class="text-2xl font-semibold tracking-tight">
        Nueva publicación
      </h1>
      <p class="text-sm text-muted-foreground">
        Cree un aviso, noticia, circular, evento o comunicado interno.
      </p>
    </div>

    <Card>
      <CardContent class="space-y-5 p-6">
        <div v-if="!optionsReady" class="space-y-3 py-6">
          <Skeleton class="h-10 w-full" />
          <Skeleton class="h-10 w-full" />
          <Skeleton class="h-24 w-full" />
        </div>

        <template v-else>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label>Tipo</Label>
              <ClientOnly>
                <Multiselect
                  v-model="form.type"
                  mode="single"
                  :object="false"
                  :options="typeOptions"
                  value-prop="value"
                  label="label"
                  :searchable="true"
                  :can-clear="false"
                  placeholder="Seleccione tipo"
                  no-options-text="Sin opciones"
                  no-results-text="Sin coincidencias"
                  class="comunicados-ms"
                />
                <template #fallback>
                  <Skeleton class="h-10 w-full" />
                </template>
              </ClientOnly>
            </div>
            <div class="space-y-2">
              <Label>Área emisora (opcional)</Label>
              <ClientOnly>
                <Multiselect
                  v-model="form.org_unit_id"
                  mode="single"
                  :object="false"
                  :options="orgUnitOptions"
                  value-prop="value"
                  label="label"
                  :searchable="true"
                  :can-clear="true"
                  placeholder="Sin área"
                  no-options-text="Sin áreas disponibles"
                  no-results-text="Sin coincidencias"
                  class="comunicados-ms"
                />
                <template #fallback>
                  <Skeleton class="h-10 w-full" />
                </template>
              </ClientOnly>
            </div>
          </div>

          <div class="space-y-2">
            <Label>Título</Label>
            <Input v-model="form.title" placeholder="Título de la publicación" />
          </div>

          <div class="space-y-2">
            <Label>Resumen</Label>
            <Input v-model="form.summary" maxlength="500" placeholder="Texto corto para el feed" />
          </div>

          <div class="space-y-2">
            <Label>Contenido</Label>
            <Textarea v-model="form.body" rows="8" placeholder="Contenido de la publicación" />
          </div>

          <template v-if="isEvent">
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="space-y-2">
                <Label>Inicio del evento</Label>
                <Input v-model="form.event_starts_at" type="datetime-local" />
              </div>
              <div class="space-y-2">
                <Label>Fin del evento</Label>
                <Input v-model="form.event_ends_at" type="datetime-local" />
              </div>
            </div>
            <div class="space-y-2">
              <Label>Lugar</Label>
              <Input v-model="form.event_location" placeholder="Salón, sede, enlace..." />
            </div>
          </template>

          <div class="space-y-3 rounded-lg border p-4">
            <Label>Destinatarios</Label>
            <ClientOnly>
              <Multiselect
                v-model="form.audience_mode"
                mode="single"
                :object="false"
                :options="AUDIENCE_MODE_OPTIONS"
                value-prop="value"
                label="label"
                :searchable="false"
                :can-clear="false"
                placeholder="Seleccione destinatarios"
                class="comunicados-ms"
              />
              <template #fallback>
                <Skeleton class="h-10 w-full" />
              </template>
            </ClientOnly>

            <div v-if="form.audience_mode !== 'all'" class="space-y-2">
              <Label>
                {{ audienceTargetLabel }}
              </Label>
              <ClientOnly>
                <Multiselect
                  v-model="form.audience_ids"
                  mode="tags"
                  :object="false"
                  :options="audienceTargetOptions"
                  value-prop="value"
                  label="label"
                  :searchable="true"
                  :can-clear="true"
                  :close-on-select="false"
                  :placeholder="audienceTargetPlaceholder"
                  no-options-text="Sin opciones"
                  no-results-text="Sin coincidencias"
                  class="comunicados-ms comunicados-ms-tags"
                />
                <template #fallback>
                  <Skeleton class="h-10 w-full" />
                </template>
              </ClientOnly>
            </div>
          </div>

          <div class="space-y-4 rounded-lg border p-4">
            <div class="space-y-1">
              <Label>¿Cuándo publicar?</Label>
              <p class="text-xs text-muted-foreground">
                A la hora programada el comunicado se publica y, si está activa la notificación interna, los destinatarios reciben el aviso.
              </p>
            </div>

            <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              <button
                v-for="option in publishPresetOptions"
                :key="option.value"
                type="button"
                class="rounded-lg border px-3 py-2 text-left text-sm transition-colors"
                :class="form.publish_preset === option.value
                  ? 'border-primary bg-primary/5 font-medium'
                  : 'border-border hover:bg-muted/50'"
                @click="form.publish_preset = option.value"
              >
                {{ option.label }}
              </button>
            </div>

            <div v-if="form.publish_preset === 'custom'" class="space-y-2">
              <Label>Fecha y hora (Colombia)</Label>
              <Input v-model="form.scheduled_at" type="datetime-local" />
            </div>

            <p class="rounded-md bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
              <span class="font-medium text-foreground">Vista previa:</span>
              {{ schedulePreview }}
            </p>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2 sm:col-span-2">
              <Label>Expira el (opcional)</Label>
              <Input v-model="form.expires_at" type="datetime-local" />
              <p class="text-xs text-muted-foreground">
                Debe ser posterior a la publicación. Al expirar deja de verse en el feed y se detienen los recordatorios.
              </p>
            </div>
          </div>

          <div class="space-y-2">
            <Label>Adjuntos</Label>
            <Input
              type="file"
              multiple
              @change="files = Array.from(($event.target as HTMLInputElement).files ?? [])"
            />
            <p class="text-xs text-muted-foreground">
              Máximo {{ attachmentMaxMb }} MB por archivo.
            </p>
          </div>

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label>Enlace (opcional)</Label>
              <Input v-model="form.link_url" type="url" placeholder="https://..." />
            </div>
            <div class="space-y-2">
              <Label>Título del enlace</Label>
              <Input v-model="form.link_title" placeholder="Ver documento" />
            </div>
          </div>

          <div class="grid gap-3 sm:grid-cols-2">
            <label class="flex items-center gap-2 text-sm">
              <Checkbox v-model="form.is_featured" />
              Destacar en el feed
            </label>
            <label class="flex items-center gap-2 text-sm">
              <Checkbox v-model="form.is_important" />
              Marcar como importante
            </label>
            <label class="flex items-center gap-2 text-sm">
              <Checkbox v-model="form.requires_read_confirmation" />
              Requiere confirmación de lectura
            </label>
            <label class="flex items-center gap-2 text-sm">
              <Checkbox v-model="form.notify_internal" />
              Notificación interna al publicar
            </label>
            <label class="flex items-center gap-2 text-sm">
              <Checkbox v-model="form.notify_email" />
              Notificar por correo al publicar
            </label>
          </div>

          <div
            v-if="form.requires_read_confirmation"
            class="space-y-3 rounded-lg border border-dashed p-4"
          >
            <div class="space-y-1">
              <Label>Recordatorios de lectura</Label>
              <p class="text-xs text-muted-foreground">
                Solo a usuarios que no hayan confirmado. Se envían como notificación en la campana (máximo configurable).
              </p>
            </div>
            <label class="flex items-center gap-2 text-sm">
              <Checkbox v-model="form.reminders_enabled" />
              Enviar recordatorios automáticos
            </label>
            <div v-if="form.reminders_enabled" class="grid gap-3 sm:grid-cols-2">
              <div class="space-y-2">
                <Label>Frecuencia</Label>
                <Select
                  :model-value="String(form.reminder_interval_days)"
                  @update:model-value="form.reminder_interval_days = Number($event)"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="option in reminderIntervalOptions"
                      :key="option.value"
                      :value="String(option.value)"
                    >
                      {{ option.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="space-y-2">
                <Label>Máximo de recordatorios</Label>
                <Select
                  :model-value="String(form.reminder_max_count)"
                  @update:model-value="form.reminder_max_count = Number($event)"
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="option in reminderMaxCountOptions"
                      :key="option.value"
                      :value="String(option.value)"
                    >
                      {{ option.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <div class="hidden">
            <label class="flex items-center gap-2 text-sm" :class="{ 'opacity-50': isScheduled }">
              <Checkbox v-model="form.publish_now" :disabled="isScheduled" />
              Publicar ahora
            </label>
          </div>

          <div class="flex justify-end gap-2">
            <Button variant="outline" as-child>
              <NuxtLink to="/comunicados">
                Cancelar
              </NuxtLink>
            </Button>
            <Button :disabled="loading" type="button" @click="submit">
              {{ isScheduled ? 'Programar' : 'Publicar' }}
            </Button>
          </div>
        </template>
      </CardContent>
    </Card>
  </div>
</template>

<style src="@vueform/multiselect/themes/default.css"></style>

<style scoped>
.comunicados-ms {
  width: 100%;
  min-width: 0;
  max-width: 100%;
}

.comunicados-ms:not(.comunicados-ms-tags) :deep(.multiselect-wrapper) {
  height: 2.25rem;
  min-height: 2.25rem;
  max-height: 2.25rem;
  align-items: center;
}

.comunicados-ms-tags :deep(.multiselect-wrapper) {
  flex-wrap: wrap;
  min-height: 2.25rem;
}
</style>
