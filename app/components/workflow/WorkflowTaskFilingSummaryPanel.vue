<script setup lang="ts">
import { toast } from 'vue-sonner'
import {
  VENTANILLA_FILING_STATUS_LABELS,
  VENTANILLA_FILING_TYPE_LABELS,
} from '~/constants/ventanilla'
import type { WorkflowFilingContextSummary } from '~/types/workflow'
import { formatFileSizeLabel } from '~/utils/document-attachment-folio'

const props = defineProps<{
  filing: WorkflowFilingContextSummary
}>()

const { hasPermission } = usePermissions()
const ventanillaApi = useVentanillaApi()
const router = useRouter()

const openingFileId = ref<number | null>(null)

function formatDate(iso: string | null | undefined): string {
  if (!iso) {
    return '—'
  }

  return new Date(iso).toLocaleString('es-CO')
}

function statusLabel(status: string): string {
  return VENTANILLA_FILING_STATUS_LABELS[status as keyof typeof VENTANILLA_FILING_STATUS_LABELS] ?? status
}

function filingTypeLabel(type: string | null | undefined): string {
  if (!type) {
    return '—'
  }

  return VENTANILLA_FILING_TYPE_LABELS[type as keyof typeof VENTANILLA_FILING_TYPE_LABELS] ?? type
}

function folioLabel(start: number | null | undefined, end: number | null | undefined): string | null {
  if (start == null || end == null) {
    return null
  }

  return start === end ? `Folio ${start}` : `Folios ${start}–${end}`
}

async function viewFile(fileId: number, mimeType?: string | null) {
  if (!hasPermission('ventanilla_archivos_ver')) {
    toast.error('No tiene permiso para ver archivos de ventanilla.')

    return
  }

  openingFileId.value = fileId

  try {
    await ventanillaApi.viewFilingFileInNewTab(props.filing.id, fileId, mimeType ?? undefined)
  }
  catch {
    toast.error('No se pudo abrir el archivo.')
  }
  finally {
    openingFileId.value = null
  }
}

function openFilingDetail() {
  router.push(`/ventanilla/${props.filing.id}`)
}
</script>

<template>
  <div class="space-y-5">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <p class="text-sm text-muted-foreground">
        Datos del radicado para apoyar la gestión de la etapa.
      </p>
      <Button variant="outline" size="sm" @click="openFilingDetail">
        <Icon name="i-lucide-external-link" class="mr-1 size-4" />
        Abrir radicado
      </Button>
    </div>

    <div class="rounded-lg border bg-muted/20 p-4">
      <dl class="grid gap-4 sm:grid-cols-2">
        <div>
          <dt class="text-muted-foreground text-xs">
            Número
          </dt>
          <dd class="mt-1 font-medium">
            {{ filing.filing_number }}
          </dd>
        </div>
        <div>
          <dt class="text-muted-foreground text-xs">
            Estado
          </dt>
          <dd class="mt-1 font-medium">
            {{ statusLabel(filing.status) }}
          </dd>
        </div>
        <div>
          <dt class="text-muted-foreground text-xs">
            Tipo
          </dt>
          <dd class="mt-1 font-medium">
            {{ filingTypeLabel(filing.filing_type) }}
          </dd>
        </div>
        <div v-if="filing.functional_type_label || filing.functional_type_key">
          <dt class="text-muted-foreground text-xs">
            Tipo funcional
          </dt>
          <dd class="mt-1 font-medium">
            {{ filing.functional_type_label ?? filing.functional_type_key }}
          </dd>
        </div>
        <div class="sm:col-span-2">
          <dt class="text-muted-foreground text-xs">
            Asunto
          </dt>
          <dd class="mt-1 font-medium">
            {{ filing.subject }}
          </dd>
        </div>
        <div v-if="filing.filed_at">
          <dt class="text-muted-foreground text-xs">
            Radicado
          </dt>
          <dd class="mt-1 font-medium">
            {{ formatDate(filing.filed_at) }}
          </dd>
        </div>
        <div v-if="filing.assigned_user">
          <dt class="text-muted-foreground text-xs">
            Responsable
          </dt>
          <dd class="mt-1 font-medium">
            {{ filing.assigned_user.name }}
          </dd>
        </div>
        <div v-if="filing.org_unit_responsible">
          <dt class="text-muted-foreground text-xs">
            Área responsable
          </dt>
          <dd class="mt-1 font-medium">
            {{ filing.org_unit_responsible.name }}
          </dd>
        </div>
        <div v-if="filing.sender_name">
          <dt class="text-muted-foreground text-xs">
            Remitente
          </dt>
          <dd class="mt-1 font-medium">
            {{ filing.sender_name }}
            <span v-if="filing.sender_identifier" class="text-muted-foreground"> · {{ filing.sender_identifier }}</span>
          </dd>
        </div>
        <div v-if="filing.doc_document_type">
          <dt class="text-muted-foreground text-xs">
            Tipo documental
          </dt>
          <dd class="mt-1 font-medium">
            {{ filing.doc_document_type.name }}
          </dd>
        </div>
        <div v-if="filing.requires_response">
          <dt class="text-muted-foreground text-xs">
            Respuesta requerida
          </dt>
          <dd class="mt-1 font-medium">
            Sí · vence {{ formatDate(filing.response_deadline_at) }}
          </dd>
        </div>
        <div v-if="filing.notes" class="sm:col-span-2">
          <dt class="text-muted-foreground text-xs">
            Notas
          </dt>
          <dd class="mt-1 whitespace-pre-wrap font-medium">
            {{ filing.notes }}
          </dd>
        </div>
      </dl>
    </div>

    <div class="space-y-3">
      <div class="flex items-center justify-between gap-2">
        <p class="text-sm font-medium">
          Documentos adjuntos
        </p>
        <Badge variant="secondary">
          {{ filing.files.length }}
        </Badge>
      </div>

      <ul v-if="filing.files.length" class="divide-y rounded-lg border bg-card">
        <li
          v-for="file in filing.files"
          :key="file.id"
          class="flex items-start justify-between gap-3 px-4 py-3 text-sm"
        >
          <div class="min-w-0">
            <p class="font-medium">
              {{ file.title }}
              <Badge v-if="file.is_primary" variant="secondary" class="ml-2">
                Principal
              </Badge>
            </p>
            <p class="text-muted-foreground text-xs">
              {{ file.original_name }}
              <span v-if="file.size_bytes"> · {{ formatFileSizeLabel(file.size_bytes) }}</span>
              <span v-if="folioLabel(file.folio_start, file.folio_end)"> · {{ folioLabel(file.folio_start, file.folio_end) }}</span>
            </p>
            <p v-if="file.uploaded_by" class="text-muted-foreground mt-1 text-xs">
              Subido por {{ file.uploaded_by.name }}
            </p>
          </div>
          <Button
            v-if="hasPermission('ventanilla_archivos_ver')"
            variant="outline"
            size="sm"
            class="shrink-0"
            :disabled="openingFileId === file.id"
            @click="viewFile(file.id, file.mime_type)"
          >
            <Icon
              :name="openingFileId === file.id ? 'i-lucide-loader-2' : 'i-lucide-external-link'"
              class="mr-1 size-4"
              :class="{ 'animate-spin': openingFileId === file.id }"
            />
            Ver
          </Button>
        </li>
      </ul>
      <p v-else class="text-sm text-muted-foreground">
        Este radicado no tiene archivos adjuntos.
      </p>
    </div>
  </div>
</template>
