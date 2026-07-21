<script setup lang="ts">
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

const communicationsApi = useCommunicationsApi()
const router = useRouter()

const loading = ref(false)
const types = ref<Array<{ value: string, label: string }>>([])
const orgUnits = ref<Array<{ id: number, name: string }>>([])
const roles = ref<Array<{ id: number, name: string }>>([])
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
  org_unit_id: '' as string,
  event_starts_at: '',
  event_ends_at: '',
  event_location: '',
  audience_mode: 'all' as CommunicationAudienceTypeValue,
  audience_ids: [] as string[],
  link_url: '',
  link_title: '',
})

const isEvent = computed(() => form.value.type === 'event')

async function loadOptions() {
  try {
    const options = await communicationsApi.fetchOptions()
    types.value = options.types ?? []
    orgUnits.value = options.org_units ?? []
    roles.value = options.roles ?? []
  }
  catch {
    types.value = await communicationsApi.fetchTypes()
    orgUnits.value = []
    roles.value = []
  }
}

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
      scheduled_at: form.value.scheduled_at || null,
      expires_at: form.value.expires_at || null,
      org_unit_id: form.value.org_unit_id ? Number(form.value.org_unit_id) : null,
      event_starts_at: form.value.event_starts_at || null,
      event_ends_at: form.value.event_ends_at || null,
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
      </p>
    </div>

    <Card>
      <CardContent class="space-y-5 p-6">
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-2">
            <Label>Tipo</Label>
            <Select v-model="form.type">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="type in types.filter(t => t.value !== 'birthday')" :key="type.value" :value="type.value">
                  {{ type.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label>Área emisora (opcional)</Label>
            <Select v-model="form.org_unit_id">
              <SelectTrigger>
                <SelectValue placeholder="Seleccione área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">
                  Sin área
                </SelectItem>
                <SelectItem v-for="unit in orgUnits" :key="unit.id" :value="String(unit.id)">
                  {{ unit.name }}
                </SelectItem>
              </SelectContent>
            </Select>
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
          <Select v-model="form.audience_mode">
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">
                Toda la organización
              </SelectItem>
              <SelectItem value="org_unit">
                Áreas específicas
              </SelectItem>
              <SelectItem value="role">
                Roles específicos
              </SelectItem>
            </SelectContent>
          </Select>

          <div v-if="form.audience_mode === 'org_unit'" class="grid gap-2 sm:grid-cols-2">
            <label
              v-for="unit in orgUnits"
              :key="unit.id"
              class="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <Checkbox
                bare
                :checked="form.audience_ids.includes(String(unit.id))"
                @update:checked="(v) => {
                  const id = String(unit.id)
                  if (v === true) form.audience_ids = [...form.audience_ids, id]
                  else form.audience_ids = form.audience_ids.filter(x => x !== id)
                }"
              />
              {{ unit.name }}
            </label>
          </div>

          <div v-if="form.audience_mode === 'role'" class="grid gap-2 sm:grid-cols-2">
            <label
              v-for="role in roles"
              :key="role.id"
              class="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
            >
              <Checkbox
                bare
                :checked="form.audience_ids.includes(String(role.id))"
                @update:checked="(v) => {
                  const id = String(role.id)
                  if (v === true) form.audience_ids = [...form.audience_ids, id]
                  else form.audience_ids = form.audience_ids.filter(x => x !== id)
                }"
              />
              {{ role.name }}
            </label>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-2">
            <Label>Programar publicación (opcional)</Label>
            <Input v-model="form.scheduled_at" type="datetime-local" />
          </div>
          <div class="space-y-2">
            <Label>Expira el (opcional)</Label>
            <Input v-model="form.expires_at" type="datetime-local" />
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
          <label v-if="!form.scheduled_at" class="flex items-center gap-2 text-sm">
            <Checkbox v-model="form.publish_now" />
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
      </CardContent>
    </Card>
  </div>
</template>
