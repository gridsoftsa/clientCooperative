<script setup lang="ts">
import { toast } from 'vue-sonner'
import {
  ARCHIVAL_DISPOSITION_ACT_STATUS_LABELS,
  ARCHIVAL_PHASE_LABELS,
} from '~/constants/archival-lifecycle'
import type { ArchivalTransferActRow } from '~/composables/useArchivalLifecycleApi'
import { messageFromFetchError } from '~/utils/http-error-message'
import DocumentInlinePreviewDialog from '~/components/radicacion/DocumentInlinePreviewDialog.vue'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: ['trd_ciclo_vida_ver', 'trd_tablas_ver', 'trd_catalogo_ver'],
})

const route = useRoute()
const router = useRouter()
const api = useArchivalLifecycleApi()

const actId = computed(() => Number(route.params.id))
const loading = ref(true)
const act = ref<ArchivalTransferActRow | null>(null)

const statusLabel = computed(() => {
  if (!act.value) {
    return ''
  }

  return ARCHIVAL_DISPOSITION_ACT_STATUS_LABELS[act.value.status] ?? act.value.status
})

const nextStep = computed(() => {
  const current = act.value
  if (!current) {
    return null
  }

  if (current.status === 'draft') {
    return {
      title: 'Siguiente paso: aprobar el acta',
      body: `Todavía es un borrador: los expedientes siguen en ${current.from_phase_label ?? 'archivo de gestión'}. Al aprobar se genera el PDF, se radica en la TRD del área y queda listo para firma. La transferencia física/lógica ocurre al ejecutar.`,
    }
  }

  if (current.status === 'approved') {
    return {
      title: 'Siguiente paso: ejecutar la transferencia',
      body: `El PDF ya es el instrumento de entrega y recibo. Al ejecutar, los ${current.files?.length ?? 0} expediente(s) pasan de ${current.from_phase_label ?? 'origen'} a ${current.to_phase_label ?? 'destino'}.`,
    }
  }

  return {
    title: 'Transferencia ejecutada',
    body: `Los expedientes de este inventario ya deben figurar en ${current.to_phase_label ?? 'el archivo de destino'}. El PDF no se publica en biblioteca institucional.`,
  }
})

function formatDate(value?: string | null): string {
  if (!value) {
    return '—'
  }

  const datePart = value.slice(0, 10)
  const parsed = new Date(`${datePart}T00:00:00`)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleDateString('es-CO')
}

function formatDateTime(value?: string | null): string {
  if (!value) {
    return '—'
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }

  return parsed.toLocaleString('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
  })
}

function phaseLabel(phase?: string | null): string {
  if (!phase) {
    return '—'
  }

  return ARCHIVAL_PHASE_LABELS[phase] ?? phase
}

async function load() {
  loading.value = true
  try {
    act.value = await api.fetchTransferAct(actId.value)
  }
  catch {
    toast.error('No se pudo cargar el acta')
    act.value = null
  }
  finally {
    loading.value = false
  }
}

async function approve() {
  try {
    const res = await api.approveTransferAct(actId.value)
    act.value = res.data
    toast.success(res.message ?? 'Aprobada')
  }
  catch (error: unknown) {
    toast.error(messageFromFetchError(error, 'No se pudo aprobar'))
  }
}

const {
  open: inlinePreviewOpen,
  title: inlinePreviewTitle,
  previewUrl: inlinePreviewUrl,
  previewKind: inlinePreviewKind,
  presentBlob,
} = useInlineFilePreview()

const viewingPdf = ref(false)

async function viewPdf() {
  if (!act.value) {
    return
  }

  viewingPdf.value = true
  try {
    const blob = await api.fetchTransferActPdfBlob(act.value.id)
    presentBlob(blob, `${act.value.act_code}.pdf`, 'application/pdf')
    act.value = await api.fetchTransferAct(actId.value)
  }
  catch (error: unknown) {
    toast.error(messageFromFetchError(error, 'No se pudo abrir el PDF'))
  }
  finally {
    viewingPdf.value = false
  }
}

async function execute() {
  try {
    const res = await api.executeTransferAct(actId.value)
    act.value = res.data
    toast.success(res.message ?? 'Ejecutada')
  }
  catch (error: unknown) {
    toast.error(messageFromFetchError(error, 'No se pudo ejecutar'))
  }
}

onMounted(load)
</script>

<template>
  <SettingsLayout :wide="true" hide-intro>
    <div class="flex w-full flex-col gap-4">
      <Button variant="ghost" size="sm" class="-ml-2 w-fit" @click="router.push('/settings/archival/transfers')">
        <Icon name="i-lucide-arrow-left" class="mr-1 h-4 w-4" />
        Actas
      </Button>

      <div v-if="loading" class="flex items-center gap-2 py-10 text-sm text-muted-foreground">
        <Icon name="i-lucide-loader-2" class="h-4 w-4 animate-spin" />
        Cargando acta…
      </div>

      <p v-else-if="!act" class="text-sm text-muted-foreground">
        No se encontró el acta o no tiene permiso para consultarla.
      </p>

      <div v-else class="space-y-4">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div class="space-y-2">
            <div class="flex flex-wrap items-center gap-2">
              <h2 class="text-2xl font-bold tracking-tight">
                {{ act.act_code }}
              </h2>
              <Badge variant="secondary">
                {{ statusLabel }}
              </Badge>
            </div>
            <p class="max-w-3xl text-sm leading-relaxed text-muted-foreground">
              {{ act.transfer_kind_label }}
              de
              <span class="font-medium text-foreground">{{ act.org_unit?.name ?? 'área sin asignar' }}</span>
              <template v-if="act.org_unit?.code">
                ({{ act.org_unit.code }})
              </template>
              · {{ act.files?.length ?? act.files_count ?? 0 }} expediente(s) en el inventario.
            </p>
          </div>
          <div class="flex flex-wrap gap-2">
            <Button
              variant="outline"
              :disabled="viewingPdf"
              @click="viewPdf"
            >
              <Icon v-if="viewingPdf" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
              Ver PDF
            </Button>
            <PermissionGate v-if="act.status === 'draft'" permission="trd_transferencias_ejecutar">
              <Button variant="secondary" @click="approve">
                Aprobar acta
              </Button>
            </PermissionGate>
            <PermissionGate v-if="act.status === 'approved'" permission="trd_transferencias_ejecutar">
              <Button @click="execute">
                Ejecutar transferencia
              </Button>
            </PermissionGate>
          </div>
        </div>

        <div
          v-if="nextStep"
          class="rounded-lg border bg-muted/40 px-4 py-3"
        >
          <p class="text-sm font-medium">
            {{ nextStep.title }}
          </p>
          <p class="mt-1 text-sm leading-relaxed text-muted-foreground">
            {{ nextStep.body }}
          </p>
        </div>

        <div class="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle class="text-base">
                Datos del acta
              </CardTitle>
            </CardHeader>
            <CardContent>
              <dl class="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt class="text-xs text-muted-foreground">
                    Fecha del acta
                  </dt>
                  <dd class="mt-0.5 font-medium">
                    {{ formatDate(act.act_date) }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-muted-foreground">
                    Elaborada por
                  </dt>
                  <dd class="mt-0.5 font-medium">
                    {{ act.created_by?.name ?? '—' }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-muted-foreground">
                    Origen
                  </dt>
                  <dd class="mt-0.5 font-medium">
                    {{ act.from_phase_label ?? phaseLabel(act.from_phase) }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-muted-foreground">
                    Destino
                  </dt>
                  <dd class="mt-0.5 font-medium">
                    {{ act.to_phase_label ?? phaseLabel(act.to_phase) }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-muted-foreground">
                    Aprobada por
                  </dt>
                  <dd class="mt-0.5 font-medium">
                    {{ act.approved_by?.name ?? 'Pendiente' }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-muted-foreground">
                    Fecha de aprobación
                  </dt>
                  <dd class="mt-0.5 font-medium">
                    {{ formatDateTime(act.approved_at) }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-muted-foreground">
                    Ejecutada
                  </dt>
                  <dd class="mt-0.5 font-medium">
                    {{ formatDateTime(act.executed_at) }}
                  </dd>
                </div>
                <div>
                  <dt class="text-xs text-muted-foreground">
                    PDF / biblioteca
                  </dt>
                  <dd class="mt-0.5 font-medium">
                    {{ act.has_pdf ? 'PDF generado' : 'Aún no hay PDF' }}
                    · {{ act.published_to_library ? 'publicado en biblioteca' : 'no se publica en biblioteca' }}
                  </dd>
                </div>
              </dl>
              <p v-if="act.description" class="mt-4 whitespace-pre-wrap rounded-md border bg-muted/30 p-3 text-sm">
                {{ act.description }}
              </p>
              <p v-else class="mt-4 text-sm text-muted-foreground">
                Sin descripción adicional en el acta.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle class="text-base">
                Dónde queda el PDF del acta
              </CardTitle>
              <CardDescription>
                Clasificación TRD del instrumento de control, no de los expedientes transferidos.
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-3 text-sm">
              <template v-if="act.doc_document_type">
                <div>
                  <p class="text-xs text-muted-foreground">
                    Serie
                  </p>
                  <p class="font-medium">
                    {{ act.doc_series?.code }} — {{ act.doc_series?.name }}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-muted-foreground">
                    Subserie
                  </p>
                  <p class="font-medium">
                    {{ act.doc_subseries?.code }} — {{ act.doc_subseries?.name }}
                  </p>
                </div>
                <div>
                  <p class="text-xs text-muted-foreground">
                    Tipo documental
                  </p>
                  <p class="font-medium">
                    {{ act.doc_document_type.code }} — {{ act.doc_document_type.name }}
                  </p>
                </div>
                <p v-if="act.filed_file" class="text-muted-foreground">
                  Radicado en el expediente
                  <NuxtLink class="font-mono text-xs underline" :to="`/expedientes/${act.filed_file.id}`">
                    {{ act.filed_file.file_number }}
                  </NuxtLink>
                  — {{ act.filed_file.title }}
                </p>
                <p v-else class="text-muted-foreground">
                  El PDF se radica en esta clasificación al aprobar el acta.
                </p>
              </template>
              <p v-else class="text-muted-foreground">
                Esta acta no tiene clasificación TRD capturada. Configure la ubicación del área en
                <NuxtLink class="underline" to="/settings/archival/transfers/trd-filing">
                  Ubicación TRD del acta
                </NuxtLink>.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle class="text-base">
              Inventario de expedientes ({{ act.files?.length ?? 0 }})
            </CardTitle>
            <CardDescription>
              Lote que se entrega con esta acta. Al ejecutar, todos cambian de fase.
            </CardDescription>
          </CardHeader>
          <CardContent class="overflow-x-auto">
            <table v-if="act.files?.length" class="w-full text-sm">
              <thead>
                <tr class="border-b text-left text-muted-foreground">
                  <th class="p-2">
                    Expediente
                  </th>
                  <th class="p-2">
                    Título
                  </th>
                  <th class="p-2">
                    Tipo
                  </th>
                  <th class="p-2">
                    Fase actual
                  </th>
                  <th class="p-2">
                    Docs
                  </th>
                  <th class="p-2">
                    Cierre
                  </th>
                  <th class="p-2">
                    Fin gestión
                  </th>
                  <th class="p-2">
                    Fin central
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="file in act.files" :key="file.id" class="border-b align-top">
                  <td class="p-2">
                    <NuxtLink class="font-mono text-xs underline" :to="`/expedientes/${file.id}`">
                      {{ file.file_number }}
                    </NuxtLink>
                  </td>
                  <td class="p-2">
                    {{ file.title }}
                  </td>
                  <td class="p-2 text-muted-foreground">
                    {{ file.file_type?.name ?? '—' }}
                  </td>
                  <td class="p-2">
                    {{ phaseLabel(file.archival_phase) }}
                  </td>
                  <td class="p-2">
                    {{ file.documents_count ?? '—' }}
                  </td>
                  <td class="p-2">
                    {{ formatDate(file.closed_at) }}
                  </td>
                  <td class="p-2">
                    {{ formatDate(file.archival_management_ends_at) }}
                  </td>
                  <td class="p-2">
                    {{ formatDate(file.archival_central_ends_at) }}
                  </td>
                </tr>
              </tbody>
            </table>
            <p v-else class="text-sm text-muted-foreground">
              Sin expedientes asociados.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
    <DocumentInlinePreviewDialog
      v-model:open="inlinePreviewOpen"
      :title="inlinePreviewTitle"
      :preview-url="inlinePreviewUrl"
      :preview-kind="inlinePreviewKind"
    />
  </SettingsLayout>
</template>
