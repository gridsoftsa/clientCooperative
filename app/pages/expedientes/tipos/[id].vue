<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { RequiredDocumentDraft } from '~/components/archival/ArchivalFileTypeRequiredDocumentsEditor.vue'
import type { ArchivalFileType } from '~/types/archival-file'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'expedientes_tipos_configurar',
})

const route = useRoute()
const router = useRouter()
const archivalApi = useArchivalFileApi()
const deleteWithReason = useApiDeleteWithReason()

const typeId = computed(() => Number(route.params.id))
const loading = ref(true)
const savingRequired = ref(false)
const deleting = ref(false)
const deleteDialogOpen = ref(false)
const activeTab = ref('general')

const fileType = ref<ArchivalFileType | null>(null)
const requiredDraft = ref<RequiredDocumentDraft[]>([])

function mapRequiredToDraft(items: ArchivalFileType['required_documents']): RequiredDocumentDraft[] {
  return (items ?? [])
    .filter(item => !item.workflow_stage_key?.trim())
    .map((item, index) => {
    const docType = item.doc_document_type
    const subseries = docType?.subseries
    const docTypeId = item.doc_document_type_id ?? docType?.id ?? null
    const orgUnitId = item.org_unit_id ?? item.org_unit?.id

    const catalogHierarchyHint =
      subseries?.doc_series_id && docType?.doc_subseries_id
        ? {
            doc_series_id: subseries.doc_series_id,
            doc_subseries_id: docType.doc_subseries_id,
            doc_type: docType
              ? { id: docType.id, code: docType.code, name: docType.name }
              : undefined,
          }
        : null

    return {
      org_unit_id: orgUnitId ?? 0,
      doc_document_type_id: docTypeId,
      label: item.label ?? '',
      is_required: item.is_required,
      sort_order: item.sort_order ?? index,
      catalogHierarchyHint,
    }
  }).filter(row => row.org_unit_id > 0)
}

async function load() {
  loading.value = true

  try {
    const type = await archivalApi.fetchFileType(typeId.value)

    fileType.value = type
    requiredDraft.value = mapRequiredToDraft(type.required_documents)
  }
  catch {
    toast.error('No se pudo cargar el tipo de expediente.')
    router.push('/expedientes/tipos')
  }
  finally {
    loading.value = false
  }
}

async function onGeneralSaved(type: ArchivalFileType) {
  try {
    fileType.value = await archivalApi.fetchFileType(type.id)
  }
  catch {
    fileType.value = type
  }

  const allowedOrgUnitIds = new Set(
    (fileType.value?.producer_areas ?? [])
      .filter(area => area.org_unit_id && area.doc_series_id && area.doc_subseries_id)
      .map(area => area.org_unit_id),
  )
  requiredDraft.value = mapRequiredToDraft(fileType.value?.required_documents).filter(
    row => allowedOrgUnitIds.has(row.org_unit_id),
  )
}

async function saveRequiredDocuments() {
  if (!fileType.value) {
    return
  }

  const invalid = requiredDraft.value.find(row => !row.doc_document_type_id || !row.org_unit_id)
  if (invalid) {
    toast.error('Seleccione el tipo documental en todas las filas de cada área.')
    return
  }

  const hasProducerTrd = (fileType.value.producer_areas ?? []).some(
    area => area.doc_series_id && area.doc_subseries_id,
  )

  if (!hasProducerTrd && (!fileType.value.doc_series_id || !fileType.value.doc_subseries_id)) {
    toast.error('Configure al menos un área productora con serie y subserie en General y TRD antes de guardar obligatorios.')
    activeTab.value = 'general'
    return
  }

  savingRequired.value = true

  try {
    const res = await archivalApi.syncRequiredDocuments(
      fileType.value.id,
      requiredDraft.value.map((row, index) => ({
        org_unit_id: row.org_unit_id,
        doc_document_type_id: Number(row.doc_document_type_id),
        label: row.label.trim() || null,
        workflow_stage_key: null,
        is_required: row.is_required,
        sort_order: index,
      })),
    )

    fileType.value = res.data
    requiredDraft.value = mapRequiredToDraft(res.data.required_documents)
    toast.success(res.message)
    router.push('/expedientes/tipos')
  }
  catch (error: unknown) {
    const err = error as { data?: { message?: string, errors?: Record<string, string[]> } }
    const first = err.data?.errors ? Object.values(err.data.errors)[0]?.[0] : null
    toast.error(first ?? err.data?.message ?? 'No se pudieron guardar los obligatorios.')
  }
  finally {
    savingRequired.value = false
  }
}

async function onDeleteConfirm(reason: string) {
  if (!fileType.value || deleting.value) {
    return
  }

  deleting.value = true

  try {
    await deleteWithReason(`/archival-files/types/${fileType.value.id}`, reason)
    toast.success('Tipo de expediente eliminado.')
    router.push('/expedientes/tipos')
  }
  catch (error: unknown) {
    const err = error as { data?: { message?: string, errors?: Record<string, string[]> } }
    const first = err.data?.errors?.type?.[0] ?? err.data?.message
    toast.error(first ?? 'No se pudo eliminar el tipo.')
  }
  finally {
    deleting.value = false
    deleteDialogOpen.value = false
  }
}

onMounted(() => load())
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="space-y-1">
        <Button variant="ghost" size="sm" class="-ml-2" @click="router.push('/expedientes/tipos')">
          <Icon name="i-lucide-arrow-left" class="mr-1 size-4" />
          Tipos de expediente
        </Button>
        <h1 class="text-2xl font-semibold tracking-tight">
          {{ fileType?.name ?? 'Tipo de expediente' }}
        </h1>
        <p v-if="fileType" class="font-mono text-sm text-muted-foreground">
          {{ fileType.type_key }}
          <Badge v-if="fileType.is_system" variant="outline" class="ml-2 align-middle">
            Sistema
          </Badge>
        </p>
      </div>

      <div class="flex flex-wrap items-center justify-end gap-2">
        <Button variant="outline" class="shrink-0" @click="router.push('/expedientes/tipos')">
          Volver al listado
        </Button>
        <Button
          v-if="fileType && !fileType.is_system"
          variant="destructive"
          @click="deleteDialogOpen = true"
        >
          Eliminar tipo
        </Button>
      </div>
    </div>

    <div v-if="loading" class="py-12 text-center text-muted-foreground">
      Cargando configuración…
    </div>

    <template v-else-if="fileType">
      <Tabs v-model="activeTab" default-value="general">
        <TabsList>
          <TabsTrigger value="general">
            General y TRD
          </TabsTrigger>
          <TabsTrigger value="required">
            Obligatorios
            <Badge v-if="requiredDraft.length" variant="secondary" class="ml-2">
              {{ requiredDraft.length }}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" class="mt-4">
          <Card>
            <CardContent class="min-w-0 pt-6">
              <ArchivalFileTypeForm
                :initial="fileType"
                @saved="onGeneralSaved"
                @cancel="router.push('/expedientes/tipos')"
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="required" class="mt-4 space-y-4">
          <Card>
            <CardContent class="min-w-0 pt-6">
              <ArchivalFileTypeRequiredDocumentsEditor
                v-model="requiredDraft"
                :producer-areas="fileType.producer_areas ?? []"
              />
            </CardContent>
          </Card>

          <div class="flex justify-end gap-2">
            <Button type="button" variant="outline" @click="router.push('/expedientes/tipos')">
              Cancelar
            </Button>
            <Button :disabled="savingRequired" @click="saveRequiredDocuments">
              {{ savingRequired ? 'Guardando…' : 'Guardar obligatorios' }}
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </template>

    <ConfirmWithReasonDialog
      v-model:open="deleteDialogOpen"
      title="Eliminar tipo de expediente"
      description="Esta acción no se puede deshacer. Solo es posible si el tipo no tiene expedientes asociados."
      reason-label="Motivo de la eliminación"
      confirm-text="Eliminar tipo"
      :loading="deleting"
      @confirm="onDeleteConfirm"
    />
  </div>
</template>
