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
const workflowStageOptions = ref<Array<{ value: string, label: string }>>([])
const requiredDraft = ref<RequiredDocumentDraft[]>([])

function mapRequiredToDraft(items: ArchivalFileType['required_documents']): RequiredDocumentDraft[] {
  return (items ?? []).map((item, index) => ({
    doc_document_type_id: item.doc_document_type_id,
    label: item.label ?? '',
    workflow_stage_key: item.workflow_stage_key ?? '',
    is_required: item.is_required,
    sort_order: item.sort_order ?? index,
  }))
}

async function load() {
  loading.value = true

  try {
    const [type, stages] = await Promise.all([
      archivalApi.fetchFileType(typeId.value),
      archivalApi.fetchWorkflowStageOptions(),
    ])

    fileType.value = type
    workflowStageOptions.value = stages.map(stage => ({
      value: stage.key,
      label: stage.label,
    }))
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

function onGeneralSaved(type: ArchivalFileType) {
  fileType.value = type
}

async function saveRequiredDocuments() {
  if (!fileType.value) {
    return
  }

  const invalid = requiredDraft.value.find(row => !row.doc_document_type_id)
  if (invalid) {
    toast.error('Seleccione el tipo documental en todas las filas.')
    return
  }

  savingRequired.value = true

  try {
    const res = await archivalApi.syncRequiredDocuments(
      fileType.value.id,
      requiredDraft.value.map((row, index) => ({
        doc_document_type_id: Number(row.doc_document_type_id),
        label: row.label.trim() || null,
        workflow_stage_key: row.workflow_stage_key.trim() || null,
        is_required: row.is_required,
        sort_order: index,
      })),
    )

    fileType.value = res.data
    requiredDraft.value = mapRequiredToDraft(res.data.required_documents)
    toast.success(res.message)
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
  <div class="mx-auto max-w-5xl space-y-6">
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

      <Button
        v-if="fileType && !fileType.is_system"
        variant="destructive"
        @click="deleteDialogOpen = true"
      >
        Eliminar tipo
      </Button>
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
            <CardContent class="pt-6">
              <ArchivalFileTypeForm :initial="fileType" @saved="onGeneralSaved" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="required" class="mt-4 space-y-4">
          <Card>
            <CardContent class="pt-6">
              <ArchivalFileTypeRequiredDocumentsEditor
                v-model="requiredDraft"
                :org-unit-id="fileType.org_unit_id"
                :workflow-stage-options="workflowStageOptions"
              />
            </CardContent>
          </Card>

          <div class="flex justify-end">
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
