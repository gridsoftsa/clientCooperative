<script setup lang="ts">
import type { ArchivalFileClosureReadiness } from '~/types/archival-file'

const props = defineProps<{
  readiness: ArchivalFileClosureReadiness | null
  loading?: boolean
}>()

const blockingLabels: Record<string, string> = {
  required_documents: 'Documentos obligatorios',
  metadata: 'Metadatos del expediente',
  document_classification: 'Clasificación documental',
  workflow: 'Workflow asociado',
}

function labelForCode(code: string) {
  return blockingLabels[code] ?? code
}

function detailLines(item: ArchivalFileClosureReadiness['blocking'][number]): string[] {
  if (item.code === 'required_documents' && Array.isArray(item.details)) {
    return item.details.map((row: { label?: string }) => `Falta: ${row.label ?? 'documento'}`)
  }

  if (item.code === 'document_classification' && Array.isArray(item.details)) {
    return item.details.map((row: { title?: string }) => `Sin clasificar: ${row.title ?? 'documento'}`)
  }

  if (item.code === 'workflow' && item.details && typeof item.details === 'object') {
    const details = item.details as { pending_tasks?: number, status?: string }
    const lines = [`Estado: ${details.status ?? 'activo'}`]
    if (typeof details.pending_tasks === 'number')
      lines.push(`Tareas pendientes: ${details.pending_tasks}`)

    return lines
  }

  if (item.code === 'metadata' && item.details && typeof item.details === 'object') {
    const errors = (item.details as { metadata_values?: Record<string, string[]> }).metadata_values ?? item.details as Record<string, string[]>
    return Object.values(errors).flat()
  }

  return []
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle>Requisitos de cierre</CardTitle>
      <CardDescription>
        Validación de documentos, metadatos, clasificación y workflow antes de cerrar.
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-3">
      <div v-if="loading" class="text-sm text-muted-foreground">
        Verificando requisitos…
      </div>
      <template v-else-if="readiness">
        <Badge :variant="readiness.ready ? 'default' : 'destructive'">
          {{ readiness.ready ? 'Listo para cerrar' : 'Pendientes por resolver' }}
        </Badge>
        <ul v-if="readiness.blocking.length" class="space-y-3 text-sm">
          <li
            v-for="item in readiness.blocking"
            :key="item.code"
            class="rounded-md border border-destructive/30 bg-destructive/5 p-3"
          >
            <p class="font-medium text-destructive">
              {{ labelForCode(item.code) }}
            </p>
            <p class="mt-1 text-muted-foreground">
              {{ item.message }}
            </p>
            <ul v-if="detailLines(item).length" class="mt-2 list-disc space-y-1 pl-5 text-destructive">
              <li v-for="(line, index) in detailLines(item)" :key="`${item.code}-${index}`">
                {{ line }}
              </li>
            </ul>
          </li>
        </ul>
        <p v-else class="text-sm text-muted-foreground">
          Todos los requisitos están cumplidos.
        </p>
      </template>
    </CardContent>
  </Card>
</template>
