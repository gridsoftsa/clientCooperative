<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { ArchivalFileDocumentVersion, ArchivalFileDocumentVersionHistory } from '~/types/archival-file'
import { formatArchivalFileSize } from '~/utils/archival-metadata-display'

const props = defineProps<{
  fileId: number
  documentId: number
  documentTitle?: string
  canView?: boolean
  canDownload?: boolean
  compact?: boolean
}>()

const archivalApi = useArchivalFileApi()
const { viewDocumentInNewTab } = useArchivalDocumentBlob()

const loading = ref(false)
const history = ref<ArchivalFileDocumentVersionHistory | null>(null)
const viewingVersionId = ref<number | null>(null)

const hasMultipleVersions = computed(() => (history.value?.versions.length ?? 0) > 1)

async function loadHistory() {
  loading.value = true

  try {
    history.value = await archivalApi.fetchDocumentVersions(props.fileId, props.documentId)
  }
  catch {
    toast.error('No se pudo cargar el historial de versiones.')
    history.value = null
  }
  finally {
    loading.value = false
  }
}

function formatWhen(iso: string | null | undefined): string {
  if (!iso) {
    return '—'
  }

  return new Date(iso).toLocaleString('es-CO')
}

function canViewVersion(version: ArchivalFileDocumentVersion): boolean {
  return props.canView === true
}

function downloadUrl(version: ArchivalFileDocumentVersion): string | null {
  if (!props.canDownload) {
    return null
  }

  return archivalApi.documentDownloadUrl(props.fileId, version.id)
}

async function openDocumentView(version: ArchivalFileDocumentVersion) {
  if (!canViewVersion(version)) {
    return
  }

  viewingVersionId.value = version.id

  try {
    await viewDocumentInNewTab(props.fileId, version.id)
  }
  catch {
    toast.error('No se pudo abrir el documento.')
  }
  finally {
    viewingVersionId.value = null
  }
}

watch(
  () => [props.fileId, props.documentId] as const,
  () => {
    history.value = null
    void loadHistory()
  },
  { immediate: true },
)

defineExpose({ reload: loadHistory })
</script>

<template>
  <div class="space-y-2">
    <div class="flex items-center justify-between gap-2">
      <p class="text-xs font-medium text-muted-foreground">
        Historial de versiones
      </p>
      <Button
        v-if="!compact"
        variant="ghost"
        size="sm"
        class="h-7 px-2 text-xs"
        type="button"
        :disabled="loading"
        @click="loadHistory"
      >
        <Icon name="i-lucide-refresh-cw" :class="['size-3.5', loading && 'animate-spin']" />
      </Button>
    </div>

    <div v-if="loading" class="text-xs text-muted-foreground">
      Cargando versiones…
    </div>

    <p v-else-if="!history || history.versions.length === 0" class="text-xs text-muted-foreground">
      Sin versiones registradas.
    </p>

    <p v-else-if="!hasMultipleVersions" class="text-xs text-muted-foreground">
      Versión {{ history.versions[0]?.version_number }} (vigente). Suba una nueva versión para conservar el historial.
    </p>

    <ol v-else class="relative space-y-0 border-l border-border pl-4">
      <li
        v-for="version in history.versions"
        :key="version.id"
        class="relative pb-4 last:pb-0"
      >
        <span
          class="absolute -left-[1.3rem] top-1 flex size-4 items-center justify-center rounded-full border bg-background"
          :class="version.is_current_version ? 'border-primary bg-primary' : 'border-muted-foreground/40'"
        >
          <span
            v-if="version.is_current_version"
            class="size-1.5 rounded-full bg-primary-foreground"
          />
        </span>

        <div
          class="rounded-md border px-3 py-2"
          :class="version.is_current_version ? 'border-primary/40 bg-primary/5' : 'bg-background/60'"
        >
          <div class="flex flex-wrap items-start justify-between gap-2">
            <div class="min-w-0 space-y-0.5">
              <div class="flex flex-wrap items-center gap-2">
                <span class="text-sm font-medium">v{{ version.version_number }}</span>
                <Badge v-if="version.is_current_version" variant="default" class="text-[10px]">
                  Vigente
                </Badge>
                <Badge v-else variant="outline" class="text-[10px]">
                  Histórica
                </Badge>
              </div>
              <p v-if="version.original_name" class="truncate text-xs text-muted-foreground">
                {{ version.original_name }}
              </p>
              <p class="text-xs text-muted-foreground">
                {{ formatWhen(version.uploaded_at) }}
                <span v-if="version.uploaded_by?.name"> · {{ version.uploaded_by.name }}</span>
                <span v-if="version.size_bytes != null"> · {{ formatArchivalFileSize(version.size_bytes) }}</span>
              </p>
            </div>

            <div class="flex shrink-0 gap-1">
              <Button
                v-if="canViewVersion(version)"
                variant="ghost"
                size="sm"
                class="h-7 px-2 text-xs"
                type="button"
                :disabled="viewingVersionId === version.id"
                @click="openDocumentView(version)"
              >
                Ver
              </Button>
              <a
                v-if="downloadUrl(version)"
                :href="downloadUrl(version)!"
                class="inline-flex h-7 items-center px-2 text-xs text-primary hover:underline"
              >
                Descargar
              </a>
            </div>
          </div>
        </div>
      </li>
    </ol>
  </div>
</template>
