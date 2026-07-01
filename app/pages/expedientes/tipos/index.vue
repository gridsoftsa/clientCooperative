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
  if (type.doc_document_type) {
    return `${type.doc_series?.code ?? '—'} / ${type.doc_subseries?.code ?? '—'} / ${type.doc_document_type.code}`
  }

  if (type.doc_series) {
    return type.doc_series.code
  }

  return '—'
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
              <TableHead>Clave</TableHead>
              <TableHead>Nombre</TableHead>
              <TableHead>Modelo</TableHead>
              <TableHead>Catálogo / TRD</TableHead>
              <TableHead>Obligatorios</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead class="text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="type in types" :key="type.id">
              <TableCell class="font-mono text-sm">
                {{ type.type_key }}
                <Badge v-if="type.is_system" variant="outline" class="ml-2">
                  Sistema
                </Badge>
              </TableCell>
              <TableCell>{{ type.name }}</TableCell>
              <TableCell>{{ ARCHIVAL_FILE_MODEL_LABELS[type.model] }}</TableCell>
              <TableCell class="text-sm text-muted-foreground">
                <div>{{ catalogSummary(type) }}</div>
                <div v-if="type.trd_table?.org_unit" class="text-xs">
                  TRD: {{ type.trd_table.org_unit.name }}
                </div>
              </TableCell>
              <TableCell>{{ requiredCount(type) }}</TableCell>
              <TableCell>
                <Badge :variant="type.is_active ? 'default' : 'secondary'">
                  {{ type.is_active ? 'Activo' : 'Inactivo' }}
                </Badge>
              </TableCell>
              <TableCell class="text-right">
                <Button variant="outline" size="sm" @click="router.push(`/expedientes/tipos/${type.id}`)">
                  Configurar
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  </div>
</template>
