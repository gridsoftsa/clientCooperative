<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: ['trd_catalogo_ver', 'trd_tablas_ver'],
})

const router = useRouter()
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <h2 class="text-2xl font-bold tracking-tight">
            Gestión archivística y TRD
          </h2>
          <p class="text-muted-foreground leading-relaxed max-w-3xl">
            Catálogo único de series, subseries y tipos documentales reutilizable en tablas de retención (TRD) por área productora.
            Los tiempos y disposición final se configuran por versión de TRD; la regla efectiva sigue la prioridad
            tipo documental → subserie → serie.
          </p>
        </div>
        <Button variant="outline" class="shrink-0" @click="router.back()">
          <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>

      <div class="grid gap-4 md:grid-cols-2">
        <Card class="cursor-pointer transition-colors hover:bg-muted/40" @click="router.push('/settings/archival/catalog/series')">
          <CardHeader>
            <CardTitle class="text-base">
              Catálogo documental
            </CardTitle>
            <CardDescription class="leading-relaxed">
              Series, subseries y tipos documentales (permiso ver/editar catálogo).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" @click.stop="router.push('/settings/archival/catalog/series')">
              Ir a series
            </Button>
          </CardContent>
        </Card>

        <Card class="cursor-pointer transition-colors hover:bg-muted/40" @click="router.push('/settings/archival/trd')">
          <CardHeader>
            <CardTitle class="text-base">
              Tablas TRD
            </CardTitle>
            <CardDescription class="leading-relaxed">
              Tablas por área productora documental, versiones, reglas de retención y activación.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" @click.stop="router.push('/settings/archival/trd')">
              Ir a TRD
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  </SettingsLayout>
</template>
