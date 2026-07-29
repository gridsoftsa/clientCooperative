<script setup lang="ts">
import Multiselect from '@vueform/multiselect'
import { toast } from 'vue-sonner'
import type {
  CommunicationAudienceTypeValue,
  CommunicationTypeValue,
  CreateCommunicationPayload,
} from '~/types/communications'

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
  scheduled_at: '',
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

const typeOptions = computed(() =>
  types.value
    .filter(type => type.value && type.value !== 'birthday')
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
      .filter(type => type.value && type.value !== 'birthday')
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
  }
  catch {
    try {
      const fallbackTypes = await communicationsApi.fetchTypes()
      const mapped = fallbackTypes
        .filter(type => type.value && type.value !== 'birthday')
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

function buildAudiences(): CreateCommunicationPayload['audiences'] {
  if (form.value.audience_mode === 'all') {
    return [{ audience_type: 'all' }]
  }

  return form.value.audience_ids.map(id => ({
    audience_type: form.value.audience_mode,
    audience_id: Number(id),
  }))
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

  loading.value = true
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
      publish_now: form.value.publish_now && !form.value.scheduled_at,
      scheduled_at: bogotaDatetimeLocalToIso(form.value.scheduled_at),
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
    const id = created.data.id

    for (const file of files.value) {
      await communicationsApi.uploadAttachment(id, file)
    }

    toast.success(created.message || 'Comunicado creado.')
    await router.push(`/comunicados/${id}`)
  }
  catch {
    toast.error('No se pudo crear el comunicado.')
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
        Los cumpleaños no se publican aquí: se muestran automáticamente en el tablero según la fecha de nacimiento del funcionario.
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
              <p class="text-xs text-muted-foreground">
                Aviso, noticia, circular, evento o comunicado. «Cumpleaños» no aplica: sale del perfil del funcionario.
              </p>
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

          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label>Programar publicación (opcional)</Label>
              <Input v-model="form.scheduled_at" type="datetime-local" />
              <p class="text-xs text-muted-foreground">
                Si la defines, el comunicado se publica automáticamente a esa hora (Colombia).
              </p>
            </div>
            <div class="space-y-2">
              <Label>Expira el (opcional)</Label>
              <Input v-model="form.expires_at" type="datetime-local" />
              <p class="text-xs text-muted-foreground">
                Debe ser posterior a la publicación. No confundir con el fin del evento: al expirar deja de verse en el feed.
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
              Notificación interna
            </label>
            <label class="flex items-center gap-2 text-sm">
              <Checkbox v-model="form.notify_email" />
              Notificar por correo
            </label>
            <label class="flex items-center gap-2 text-sm" :class="{ 'opacity-50': !!form.scheduled_at }">
              <Checkbox v-model="form.publish_now" :disabled="!!form.scheduled_at" />
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
              {{ form.scheduled_at ? 'Programar' : (form.publish_now ? 'Publicar' : 'Guardar borrador') }}
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
