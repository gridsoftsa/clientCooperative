<script setup lang="ts">
import type { ArchivalAccessGrant } from '~/types/archival-access'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'expedientes_acceso_gestionar',
})

const router = useRouter()

function onSaved(_grant: ArchivalAccessGrant) {
  router.push('/expedientes/acceso')
}
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">
          Nuevo permiso de acceso
        </h1>
        <p class="text-sm text-muted-foreground">
          Asigne un permiso a un usuario o rol sobre un alcance documental.
        </p>
      </div>
      <Button variant="outline" as-child>
        <NuxtLink to="/expedientes/acceso">
          Volver al listado
        </NuxtLink>
      </Button>
    </div>

    <ArchivalAccessGrantForm
      @saved="onSaved"
      @cancel="router.push('/expedientes/acceso')"
    />
  </div>
</template>
