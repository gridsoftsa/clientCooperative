<script setup lang="ts">
import type { ArchivalFileType } from '~/types/archival-file'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'expedientes_tipos_configurar',
})

const router = useRouter()
const archivalApi = useArchivalFileApi()

function onCreated(type: ArchivalFileType) {
  router.push(`/expedientes/tipos/${type.id}`)
}
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">
          Nuevo tipo de expediente
        </h1>
        <p class="text-sm text-muted-foreground">
          Defina la clave, el catálogo documental de referencia y la tabla TRD asociada.
        </p>
      </div>
      <Button variant="outline" @click="router.push('/expedientes/tipos')">
        Volver al listado
      </Button>
    </div>

    <Card>
      <CardHeader>
        <CardTitle class="text-base">
          Datos generales
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ArchivalFileTypeForm is-create @saved="onCreated" />
      </CardContent>
    </Card>
  </div>
</template>
