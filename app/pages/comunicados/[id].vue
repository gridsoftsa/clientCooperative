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

function formatDate(value?: string | null) {
  if (!value) return '—'
  return new Date(value).toLocaleString('es-CO')
}

onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
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
          <Badge variant="outline">
            {{ item.type_label }}
          </Badge>
          <Badge v-if="item.is_featured" class="bg-emerald-50 text-emerald-700">
            Destacado
          </Badge>
          <Badge v-if="item.is_important" variant="secondary">
            Importante
          </Badge>
          <Badge v-if="item.org_unit" variant="outline">
            {{ item.org_unit.name }}
          </Badge>
        </div>
        <h1 class="text-3xl font-semibold tracking-tight">
          {{ item.title }}
        </h1>
        <p class="text-sm text-muted-foreground">
          Publicado {{ formatDate(item.published_at) }}
          <span v-if="item.author"> · {{ item.author.name }}</span>
        </p>
      </div>

      <Card v-if="item.type === 'event'">
        <CardContent class="space-y-2 p-5 text-sm">
          <div><span class="text-muted-foreground">Inicio:</span> {{ formatDate(item.event_starts_at) }}</div>
          <div v-if="item.event_ends_at">
            <span class="text-muted-foreground">Fin:</span> {{ formatDate(item.event_ends_at) }}
          </div>
          <div v-if="item.event_location">
            <span class="text-muted-foreground">Lugar:</span> {{ item.event_location }}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="prose prose-sm max-w-none p-6 dark:prose-invert">
          <p v-if="item.summary" class="text-base text-muted-foreground">
            {{ item.summary }}
          </p>
          <div v-if="item.body" class="whitespace-pre-wrap">
            {{ item.body }}
          </div>
          <p v-else class="text-muted-foreground">
            Sin contenido adicional.
          </p>
        </CardContent>
      </Card>

      <Card v-if="item.attachments?.length">
        <CardHeader>
          <CardTitle class="text-base">
            Adjuntos
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-2">
          <a
            v-for="file in item.attachments"
            :key="file.id"
            :href="file.kind === 'link' ? (file.external_url ?? '#') : (file.download_url ?? '#')"
            :target="file.kind === 'link' ? '_blank' : undefined"
            class="flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-muted/50"
            rel="noopener noreferrer"
          >
            <Icon :name="file.kind === 'link' ? 'i-lucide-link' : 'i-lucide-download'" class="size-4" />
            {{ file.title || file.original_name || 'Adjunto' }}
          </a>
        </CardContent>
      </Card>

      <Card v-if="item.requires_read_confirmation">
        <CardContent class="flex flex-wrap items-center justify-between gap-3 p-5">
          <div>
            <div class="font-medium">
              Confirmación de lectura
            </div>
            <div class="text-sm text-muted-foreground">
              <template v-if="item.is_confirmed">
                Ya confirmó la lectura de este comunicado.
              </template>
              <template v-else>
                Esta circular requiere que confirme haberla leído.
              </template>
            </div>
          </div>
          <Button
            v-if="!item.is_confirmed"
            :disabled="confirming"
            type="button"
            @click="confirmRead"
          >
            Marcar como leído
          </Button>
        </CardContent>
      </Card>
    </template>

    <div v-else class="rounded-xl border border-dashed py-16 text-center text-muted-foreground">
      Comunicado no encontrado.
    </div>
  </div>
</template>
