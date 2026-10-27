<script setup lang="ts">
import type { ArchivalFileType } from '~/types/archival-file'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'expedientes_tipos_configurar',
})

const router = useRouter()

function onCreated(type: ArchivalFileType) {
  router.push(`/expedientes/tipos/${type.id}?tab=areas&view=nueva`)
}
</script>

<template>
  <div class="mx-auto w-full max-w-xl space-y-6 px-4 pb-8 md:px-6">
    <div class="space-y-1">
      <PageBackButton to="/expedientes/tipos">
        Tipos de expediente
      </PageBackButton>
      <h1 class="text-2xl font-semibold tracking-tight">
        Nuevo tipo de expediente
      </h1>
      <p class="text-sm text-muted-foreground">
        Ponga un nombre y elija de quién es cada expediente. La TRD de cada área se configura después.
      </p>
    </div>

    <Card>
      <CardContent class="pt-6">
        <ArchivalFileTypeForm is-create @saved="onCreated" @cancel="router.push('/expedientes/tipos')" />
      </CardContent>
    </Card>
  </div>
</template>
