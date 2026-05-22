<script setup lang="ts">
import { toast } from 'vue-sonner'
import {
  ARCHIVAL_METADATA_APPLICATION_LEVEL_LABELS,
  ARCHIVAL_METADATA_SCHEMA_STATUS_LABELS,
} from '~/constants/archival-metadata'
import type { ArchivalMetadataSchemaRow } from '~/composables/useArchivalMetadataApi'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'trd_metadatos_ver',
})

const router = useRouter()
const metaApi = useArchivalMetadataApi()
const { hasPermission } = usePermissions()

const rows = ref<ArchivalMetadataSchemaRow[]>([])
const loading = ref(true)

async function reload() {
  loading.value = true
  try {
    rows.value = await metaApi.fetchSchemas()
  } catch {
    toast.error('No se pudieron cargar los esquemas de metadatos.')
  } finally {
    loading.value = false
  }
}

onMounted(reload)

function statusLabel(v: string) {
  return ARCHIVAL_METADATA_SCHEMA_STATUS_LABELS[v] ?? v
}

function levelLabel(v: string) {
  return ARCHIVAL_METADATA_APPLICATION_LEVEL_LABELS[v] ?? v
}

function scopeLabel(row: ArchivalMetadataSchemaRow): string {
  if (row.doc_document_type) {
    return `${row.doc_document_type.code} — ${row.doc_document_type.name}`
  }
  if (row.doc_subseries) {
    return `${row.doc_subseries.code} — ${row.doc_subseries.name}`
  }
  if (row.doc_series) {
    return `${row.doc_series.code} — ${row.doc_series.name}`
  }
  if (row.functional_type_key) {
    return row.functional_type_key
  }
  if (row.file_type_key) {
    return row.file_type_key
  }

  return '—'
}
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <h2 class="text-2xl font-bold tracking-tight">
            Esquemas de metadatos
          </h2>
          <p class="text-muted-foreground max-w-2xl leading-relaxed">
            Defina campos capturables por tipo documental, subserie, serie, tipo de expediente o tipo funcional.
            Solo puede haber un esquema activo por ámbito; al versionar se crea un borrador nuevo.
          </p>
        </div>
        <div class="flex gap-2">
          <Button variant="outline" @click="router.push('/settings/archival')">
            <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
            Volver
          </Button>
          <Button
            v-if="hasPermission('trd_metadatos_editar')"
            @click="router.push('/settings/archival/metadata/schemas/create')"
          >
            <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
            Nuevo esquema
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle class="text-base">
            Listado
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div v-if="loading" class="text-sm text-muted-foreground">
            Cargando…
          </div>
          <div v-else-if="!rows.length" class="text-sm text-muted-foreground">
            No hay esquemas configurados.
          </div>
          <div v-else class="overflow-x-auto">
            <table class="w-full text-sm">
              <thead>
                <tr class="border-b text-left text-muted-foreground">
                  <th class="py-2 pr-3">
                    Nombre
                  </th>
                  <th class="py-2 pr-3">
                    Versión
                  </th>
                  <th class="py-2 pr-3">
                    Estado
                  </th>
                  <th class="py-2 pr-3">
                    Nivel
                  </th>
                  <th class="py-2 pr-3">
                    Ámbito
                  </th>
                  <th class="py-2 pr-3">
                    Campos
                  </th>
                  <th class="py-2" />
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="row in rows"
                  :key="row.id"
                  class="border-b border-border/60 hover:bg-muted/30 cursor-pointer"
                  @click="router.push(`/settings/archival/metadata/schemas/${row.id}`)"
                >
                  <td class="py-2 pr-3 font-medium">
                    {{ row.name }}
                  </td>
                  <td class="py-2 pr-3">
                    v{{ row.version_number }}
                  </td>
                  <td class="py-2 pr-3">
                    {{ statusLabel(row.status) }}
                  </td>
                  <td class="py-2 pr-3">
                    {{ levelLabel(row.application_level) }}
                  </td>
                  <td class="py-2 pr-3">
                    {{ scopeLabel(row) }}
                  </td>
                  <td class="py-2 pr-3">
                    {{ row.fields_count ?? '—' }}
                  </td>
                  <td class="py-2 text-right">
                    <Button variant="ghost" size="sm" @click.stop="router.push(`/settings/archival/metadata/schemas/${row.id}`)">
                      Abrir
                    </Button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  </SettingsLayout>
</template>
