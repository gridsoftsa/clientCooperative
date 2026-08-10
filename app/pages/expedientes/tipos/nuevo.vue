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
  <div class="mx-auto w-full max-w-7xl space-y-6 px-4 pb-8 md:px-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="space-y-1">
        <Button variant="ghost" size="sm" class="-ml-2" @click="router.push('/expedientes/tipos')">
          <Icon name="i-lucide-arrow-left" class="mr-1 size-4" />
          Tipos de expediente
        </Button>
        <h1 class="text-2xl font-semibold tracking-tight">
          Nuevo tipo de expediente
        </h1>
        <p class="max-w-3xl text-sm text-muted-foreground">
          Defina el nombre, el catálogo documental de referencia y la tabla TRD asociada. La clave técnica se asigna sola al guardar.
        </p>
      </div>
      <Button variant="outline" class="shrink-0" @click="router.push('/expedientes/tipos')">
        Volver al listado
      </Button>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Datos generales</CardTitle>
        <CardDescription>
          Información del tipo, ubicación en el catálogo TRD y esquema de metadatos.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ArchivalFileTypeForm is-create @saved="onCreated" />
      </CardContent>
    </Card>
  </div>
</template>
