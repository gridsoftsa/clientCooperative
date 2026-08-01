<script setup lang="ts">
import { toast } from 'vue-sonner'
import { ARCHIVAL_FILE_MODEL_LABELS } from '~/constants/archival-file'
import type { ArchivalFileType } from '~/types/archival-file'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'expedientes_tipos_configurar',
})

const router = useRouter()
const archivalApi = useArchivalFileApi()

const types = ref<ArchivalFileType[]>([])
const loading = ref(true)
const deactivatingId = ref<number | null>(null)

function fileTypePayload(type: ArchivalFileType, overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    type_key: type.type_key,
    name: type.name,
    description: type.description ?? null,
    model: type.model,
    org_unit_id: type.org_unit_id ?? null,
    doc_series_id: type.doc_series_id ?? null,
    doc_subseries_id: type.doc_subseries_id ?? null,
    doc_document_type_id: type.doc_document_type_id ?? null,
    trd_table_id: type.trd_table_id ?? null,
    archival_metadata_schema_id: type.archival_metadata_schema_id ?? null,
    allows_master_documents: type.allows_master_documents,
    is_active: type.is_active,
    sort_order: type.sort_order,
    ...overrides,
  }
}

async function deactivateType(type: ArchivalFileType) {
  if (deactivatingId.value != null) {
    return
  }

  deactivatingId.value = type.id

  try {
    await archivalApi.saveFileType(fileTypePayload(type, { is_active: false }), type.id)
    toast.success('Tipo de expediente desactivado.')
    await load()
  }
  catch (error: unknown) {
    const err = error as { data?: { message?: string, errors?: Record<string, string[]> } }
    const first = err.data?.errors ? Object.values(err.data.errors)[0]?.[0] : null
    toast.error(first ?? err.data?.message ?? 'No se pudo desactivar el tipo.')
  }
  finally {
    deactivatingId.value = null
  }
}

async function load() {
  loading.value = true

  try {
    types.value = await archivalApi.fetchFileTypesAdmin(false)
  }
  catch {
    toast.error('No se pudieron cargar los tipos de expediente.')
  }
  finally {
    loading.value = false
  }
}

function requiredCount(type: ArchivalFileType): number {
  return type.required_documents?.length ?? 0
}

function catalogSummary(type: ArchivalFileType): string {
  if (type.doc_series && type.doc_subseries) {
    return `${type.doc_series.code} — ${type.doc_subseries.code}`
  }

  if (type.doc_series) {
    return type.doc_series.code
  }

  return '—'
}

function catalogDetail(type: ArchivalFileType): string | null {
  if (type.doc_series && type.doc_subseries) {
    return `${type.doc_series.name} / ${type.doc_subseries.name}`
  }

  if (type.doc_series) {
    return type.doc_series.name
  }

  return null
}

onMounted(() => load())
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">
          Tipos de expediente
        </h1>
        <p class="text-sm text-muted-foreground">
          Configure series, TRD, metadatos y documentos obligatorios por tipo.
        </p>
      </div>
      <Button @click="router.push('/expedientes/tipos/nuevo')">
        <Icon name="i-lucide-plus" class="mr-2 size-4" />
        Nuevo tipo
      </Button>
    </div>

    <Card>
      <CardContent class="pt-6">
        <div v-if="loading" class="py-8 text-center text-muted-foreground">
          Cargando tipos…
        </div>

        <Table v-else>
          <TableHeader>
            <TableRow>
              <TableHead class="min-w-[14rem]">
                Nombre
              </TableHead>
              <TableHead class="w-[10rem]">
                Modelo
              </TableHead>
              <TableHead class="min-w-[16rem]">
                Catálogo / TRD
              </TableHead>
              <TableHead class="w-[7rem] text-center">
                Obligatorios
              </TableHead>
              <TableHead class="w-[7rem]">
                Estado
              </TableHead>
              <TableHead class="w-[11rem] text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="type in types" :key="type.id">
              <TableCell>
                <div class="space-y-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="font-medium">{{ type.name }}</span>
                    <Badge v-if="type.is_system" variant="outline" class="text-xs">
                      Sistema
                    </Badge>
                  </div>
                  <p v-if="type.org_unit" class="text-xs text-muted-foreground">
                    {{ type.org_unit.name }}
                  </p>
                </div>
              </TableCell>
              <TableCell class="text-sm">
                {{ ARCHIVAL_FILE_MODEL_LABELS[type.model] }}
              </TableCell>
              <TableCell>
                <div class="space-y-1 text-sm">
                  <div class="font-mono text-xs">
                    {{ catalogSummary(type) }}
                  </div>
                  <div v-if="catalogDetail(type)" class="text-muted-foreground">
                    {{ catalogDetail(type) }}
                  </div>
                  <div v-if="type.trd_table?.org_unit" class="text-xs text-muted-foreground">
                    TRD: {{ type.trd_table.org_unit.name }}
                  </div>
                </div>
              </TableCell>
              <TableCell class="text-center">
                {{ requiredCount(type) }}
              </TableCell>
              <TableCell>
                <Badge :variant="type.is_active ? 'default' : 'secondary'">
                  {{ type.is_active ? 'Activo' : 'Inactivo' }}
                </Badge>
              </TableCell>
              <TableCell class="text-right">
                <div class="flex flex-wrap justify-end gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    class="h-8 gap-1.5 px-2 text-xs"
                    @click="router.push(`/expedientes/tipos/${type.id}`)"
                  >
                    Editar
                  </Button>
                  <Button
                    v-if="type.is_active"
                    type="button"
                    variant="destructive"
                    size="sm"
                    class="h-8 gap-1.5 px-2 text-xs"
                    :disabled="deactivatingId === type.id"
                    @click="deactivateType(type)"
                  >
                    <Icon name="i-lucide-ban" class="size-4 shrink-0" />
                    Desactivar
                  </Button>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </div>
</template>
