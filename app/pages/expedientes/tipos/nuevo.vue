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
  router.push(`/expedientes/tipos/${type.id}?tab=areas&view=nueva`)
}
</script>

<template>
  <div class="mx-auto w-full max-w-3xl space-y-4 px-4 pb-6 md:px-6">
    <div class="space-y-1">
      <PageBackButton to="/expedientes/tipos">
        Tipos de expediente
      </PageBackButton>
      <h1 class="text-2xl font-semibold tracking-tight">
        Nuevo tipo de expediente
      </h1>
      <p class="text-sm text-muted-foreground">
        Indique nombre y modelo. Luego se configuran las áreas productoras y la TRD de cada una.
      </p>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Datos del tipo</CardTitle>
        <CardDescription>
          NIT, periodo u otros campos al adjuntar un archivo se configuran en el tipo documental de la TRD (catálogo archivístico).
        </CardDescription>
      </CardHeader>
      <CardContent class="p-4 md:p-6">
        <ArchivalFileTypeForm is-create @saved="onCreated" />
      </CardContent>
    </Card>
  </div>
</template>
