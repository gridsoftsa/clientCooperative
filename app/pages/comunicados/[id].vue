<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { CommunicationItem } from '~/types/communications'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'comunicados_ver',
})

const route = useRoute()
const communicationsApi = useCommunicationsApi()

const loading = ref(true)
const confirming = ref(false)
const item = ref<CommunicationItem | null>(null)
const openingAttachmentId = ref<number | null>(null)
const { viewAttachmentInNewTab } = useCommunicationAttachmentView()

const id = computed(() => Number(route.params.id))

async function load() {
  loading.value = true
  try {
    item.value = await communicationsApi.fetchCommunication(id.value)
  }
  catch {
    toast.error('No se pudo cargar el comunicado.')
    item.value = null
  }
  finally {
    loading.value = false
  }
}

async function confirmRead() {
  confirming.value = true
  try {
    await communicationsApi.confirmRead(id.value)
    toast.success('Lectura confirmada.')
    await load()
  }
  catch {
    toast.error('No se pudo confirmar la lectura.')
  }
  finally {
    confirming.value = false
  }
}

async function openAttachment(file: NonNullable<CommunicationItem['attachments']>[number]) {
  if (file.kind === 'link') {
    if (file.external_url) {
      window.open(file.external_url, '_blank', 'noopener,noreferrer')
    }
    return
  }

  openingAttachmentId.value = file.id
  try {
    await viewAttachmentInNewTab(file.id)
  }
  catch {
    toast.error('No se pudo abrir el adjunto.')
  }
  finally {
    openingAttachmentId.value = null
  }
}

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('es-CO')
}

function typeBadgeClass(type?: string) {
  switch (type) {
    case 'notice':
      return 'border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100'
    case 'news':
      return 'border-sky-300 bg-sky-100 text-sky-950 dark:border-sky-700 dark:bg-sky-950 dark:text-sky-100'
    case 'circular':
      return 'border-violet-300 bg-violet-100 text-violet-950 dark:border-violet-700 dark:bg-violet-950 dark:text-violet-100'
    case 'event':
      return 'border-emerald-300 bg-emerald-100 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100'
    case 'birthday':
      return 'border-rose-300 bg-rose-100 text-rose-950 dark:border-rose-700 dark:bg-rose-950 dark:text-rose-100'
    default:
      return 'border-teal-300 bg-teal-100 text-teal-950 dark:border-teal-700 dark:bg-teal-950 dark:text-teal-100'
  }
}

function engagementStatusLabel(member: NonNullable<CommunicationItem['engagement']>['audience'][number]) {
  if (member.has_confirmed) {
    return 'Confirmó lectura'
  }
  if (member.has_read) {
    return 'Leído sin confirmar'
  }
  return 'Pendiente'
}

function engagementStatusClass(member: NonNullable<CommunicationItem['engagement']>['audience'][number]) {
  if (member.has_confirmed) {
    return 'border-emerald-300 bg-emerald-100 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100'
  }
  if (member.has_read) {
    return 'border-amber-300 bg-amber-100 text-amber-950 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100'
  }
  return 'border-border bg-muted text-muted-foreground'
}

onMounted(load)
</script>

<template>
  <div class="mx-auto w-full max-w-7xl space-y-6 px-4 pb-8 md:px-6">
    <Button variant="ghost" size="sm" as-child class="-ml-2">
      <NuxtLink to="/comunicados">
        <Icon name="i-lucide-arrow-left" class="mr-1 size-4" />
        Volver al feed
      </NuxtLink>
    </Button>

    <div v-if="loading" class="py-16 text-center text-muted-foreground">
      Cargando...
    </div>

    <template v-else-if="item">
      <div class="space-y-3">
        <div class="flex flex-wrap gap-2">
          <Badge
            variant="outline"
            :class="typeBadgeClass(item.type)"
          >
            {{ item.type_label }}
          </Badge>
          <Badge
            v-if="item.is_featured"
            variant="outline"
            class="border-emerald-300 bg-emerald-100 text-emerald-950 dark:border-emerald-700 dark:bg-emerald-950 dark:text-emerald-100"
          >
            Destacado
          </Badge>
          <Badge v-if="item.is_important" variant="secondary">
            Importante
          </Badge>
          <Badge v-if="item.org_unit" variant="outline">
            {{ item.org_unit.name }}
          </Badge>
          <Badge
            v-if="item.status && item.status !== 'published'"
            variant="outline"
            class="border-border bg-muted text-foreground"
          >
            {{ item.status_label || item.status }}
          </Badge>
        </div>
        <h1 class="text-3xl font-semibold tracking-tight lg:text-4xl">
          {{ item.title }}
        </h1>
        <p class="text-sm text-muted-foreground">
          Publicado {{ formatDate(item.published_at) }}
          <span v-if="item.author"> · {{ item.author.name }}</span>
        </p>
      </div>

      <div class="grid gap-6 lg:grid-cols-12 lg:items-start">
        <div class="space-y-6 lg:col-span-8">
          <Card>
            <CardHeader class="pb-4">
              <CardTitle class="text-base">
                Contenido
              </CardTitle>
            </CardHeader>
            <CardContent class="prose prose-sm max-w-none dark:prose-invert">
              <p v-if="item.summary" class="text-base text-muted-foreground not-prose">
                {{ item.summary }}
              </p>
              <div v-if="item.body" class="whitespace-pre-wrap not-prose">
                {{ item.body }}
              </div>
              <p v-else-if="!item.summary" class="text-muted-foreground not-prose">
                Sin contenido adicional.
              </p>
            </CardContent>
          </Card>

          <Card v-if="item.attachments?.length">
            <CardHeader class="pb-4">
              <CardTitle class="text-base">
                Adjuntos
              </CardTitle>
              <CardDescription>
                {{ item.attachments.length }} archivo(s) o enlace(s)
              </CardDescription>
            </CardHeader>
            <CardContent class="grid gap-2 sm:grid-cols-2">
              <button
                v-for="file in item.attachments"
                :key="file.id"
                type="button"
                class="flex items-center gap-2 rounded-md border px-3 py-3 text-left text-sm hover:bg-muted/50 disabled:opacity-50"
                :disabled="openingAttachmentId === file.id"
                @click="openAttachment(file)"
              >
                <Icon :name="file.kind === 'link' ? 'i-lucide-link' : 'i-lucide-paperclip'" class="size-4 shrink-0" />
                <span class="min-w-0 truncate">
                  {{ file.title || file.original_name || 'Adjunto' }}
                </span>
              </button>
            </CardContent>
          </Card>
        </div>

        <div class="space-y-6 lg:col-span-4">
          <Card v-if="item.type === 'event'">
            <CardHeader class="pb-4">
              <CardTitle class="text-base">
                Detalles del evento
              </CardTitle>
            </CardHeader>
            <CardContent class="space-y-2 text-sm">
              <div>
                <span class="text-muted-foreground">Inicio:</span>
                {{ formatDate(item.event_starts_at) }}
              </div>
              <div v-if="item.event_ends_at">
                <span class="text-muted-foreground">Fin:</span>
                {{ formatDate(item.event_ends_at) }}
              </div>
              <div v-if="item.event_location">
                <span class="text-muted-foreground">Lugar:</span>
                {{ item.event_location }}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="pb-4">
              <CardTitle class="text-base">
                Información
              </CardTitle>
            </CardHeader>
            <CardContent class="space-y-3 text-sm">
              <div class="flex justify-between gap-3">
                <span class="text-muted-foreground">Estado</span>
                <span class="font-medium text-right">{{ item.status_label || item.status }}</span>
              </div>
              <div v-if="item.scheduled_at" class="flex justify-between gap-3">
                <span class="text-muted-foreground">Programado</span>
                <span class="text-right">{{ formatDate(item.scheduled_at) }}</span>
              </div>
              <div v-if="item.expires_at" class="flex justify-between gap-3">
                <span class="text-muted-foreground">Expira</span>
                <span class="text-right">{{ formatDate(item.expires_at) }}</span>
              </div>
              <div v-if="item.requires_read_confirmation" class="flex justify-between gap-3">
                <span class="text-muted-foreground">Confirmaciones</span>
                <span class="font-medium">{{ item.confirmed_reads_count ?? 0 }}</span>
              </div>
              <div v-if="item.reminders_enabled" class="flex justify-between gap-3">
                <span class="text-muted-foreground">Recordatorios</span>
                <span class="text-right">
                  cada {{ item.reminder_interval_days }} d · máx. {{ item.reminder_max_count }}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card v-if="item.requires_read_confirmation">
            <CardHeader class="pb-4">
              <CardTitle class="text-base">
                Confirmación de lectura
              </CardTitle>
            </CardHeader>
            <CardContent class="space-y-4">
              <p class="text-sm text-muted-foreground">
                <template v-if="item.is_confirmed">
                  Ya confirmó la lectura de este comunicado.
                </template>
                <template v-else>
                  Esta publicación requiere que confirme haberla leído.
                </template>
              </p>
              <Button
                v-if="!item.is_confirmed"
                class="w-full"
                :disabled="confirming"
                type="button"
                @click="confirmRead"
              >
                Marcar como leído
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card v-if="item.can_view_engagement && item.engagement">
        <CardHeader>
          <CardTitle class="text-base">
            Seguimiento de lectura y recordatorios
          </CardTitle>
          <CardDescription>
            Destinatarios, confirmaciones de lectura y recordatorios enviados.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div class="rounded-lg border p-3">
              <div class="text-xs text-muted-foreground">
                Destinatarios
              </div>
              <div class="text-2xl font-semibold">
                {{ item.engagement.audience_total }}
              </div>
            </div>
            <div class="rounded-lg border p-3">
              <div class="text-xs text-muted-foreground">
                Leídos
              </div>
              <div class="text-2xl font-semibold">
                {{ item.engagement.read_count }}
              </div>
            </div>
            <div v-if="item.requires_read_confirmation" class="rounded-lg border p-3">
              <div class="text-xs text-muted-foreground">
                Confirmaron lectura
              </div>
              <div class="text-2xl font-semibold">
                {{ item.engagement.confirmed_count }}
              </div>
            </div>
            <div class="rounded-lg border p-3">
              <div class="text-xs text-muted-foreground">
                Recordatorios enviados
              </div>
              <div class="text-2xl font-semibold">
                {{ item.engagement.reminders_sent_total }}
              </div>
            </div>
          </div>

          <div class="overflow-x-auto rounded-lg border">
            <table class="w-full min-w-[720px] text-sm">
              <thead class="border-b bg-muted/40 text-left">
                <tr>
                  <th class="px-3 py-2 font-medium">
                    Destinatario
                  </th>
                  <th class="px-3 py-2 font-medium">
                    Estado
                  </th>
                  <th class="px-3 py-2 font-medium">
                    Leído
                  </th>
                  <th v-if="item.requires_read_confirmation" class="px-3 py-2 font-medium">
                    Confirmado
                  </th>
                  <th class="px-3 py-2 font-medium">
                    Recordatorios
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="member in item.engagement.audience"
                  :key="member.user_id"
                  class="border-b last:border-b-0"
                >
                  <td class="px-3 py-2">
                    <div class="font-medium">
                      {{ member.name }}
                    </div>
                    <div v-if="member.email" class="text-xs text-muted-foreground">
                      {{ member.email }}
                    </div>
                  </td>
                  <td class="px-3 py-2">
                    <Badge variant="outline" :class="engagementStatusClass(member)">
                      {{ engagementStatusLabel(member) }}
                    </Badge>
                  </td>
                  <td class="px-3 py-2 text-muted-foreground">
                    {{ formatDate(member.read_at) }}
                  </td>
                  <td v-if="item.requires_read_confirmation" class="px-3 py-2 text-muted-foreground">
                    {{ formatDate(member.confirmed_at) }}
                  </td>
                  <td class="px-3 py-2">
                    <div class="font-medium">
                      {{ member.reminders_sent_count }}
                    </div>
                    <div
                      v-for="reminder in member.reminders"
                      :key="`${member.user_id}-${reminder.reminder_number}`"
                      class="text-xs text-muted-foreground"
                    >
                      #{{ reminder.reminder_number }} · {{ formatDate(reminder.sent_at) }}
                    </div>
                  </td>
                </tr>
                <tr v-if="item.engagement.audience.length === 0">
                  <td :colspan="item.requires_read_confirmation ? 5 : 4" class="px-3 py-6 text-center text-muted-foreground">
                    No hay destinatarios resueltos para este comunicado.
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </template>

    <div v-else class="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
      Comunicado no encontrado.
    </div>
  </div>
</template>
