<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: ['trd_catalogo_ver', 'trd_tablas_ver', 'trd_reportes_ver'],
})

const router = useRouter()
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
      <div class="space-y-1">
        <Button variant="ghost" size="sm" class="h-8 w-fit -ml-2 px-2" @click="router.push('/settings/archival')">
          <Icon name="i-lucide-arrow-left" class="mr-1 h-4 w-4" />
          TRD y archivo
        </Button>
        <h2 class="text-2xl font-bold tracking-tight">
          Reportes archivísticos
        </h2>
        <p class="text-muted-foreground max-w-3xl leading-relaxed">
          HU-TRD-19: catálogo documental, versiones TRD por área productora y uso del catálogo con tiempos de retención propios y efectivos.
        </p>
      </div>

      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card class="cursor-pointer transition-colors hover:bg-muted/40" @click="router.push('/settings/archival/reports/catalogo')">
          <CardHeader>
            <CardTitle class="text-base">
              Catálogo documental
            </CardTitle>
            <CardDescription>
              Series, subseries o tipos: estado, conteos y referencias en TRD y radicación.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" @click.stop="router.push('/settings/archival/reports/catalogo')">
              Abrir informe
            </Button>
          </CardContent>
        </Card>

        <Card class="cursor-pointer transition-colors hover:bg-muted/40" @click="router.push('/settings/archival/reports/trd-versiones')">
          <CardHeader>
            <CardTitle class="text-base">
              Versiones TRD
            </CardTitle>
            <CardDescription>
              Por área productora, estado, fechas de aprobación y vigencia.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" @click.stop="router.push('/settings/archival/reports/trd-versiones')">
              Abrir informe
            </Button>
          </CardContent>
        </Card>

        <Card class="cursor-pointer transition-colors hover:bg-muted/40" @click="router.push('/settings/archival/reports/uso-retencion')">
          <CardHeader>
            <CardTitle class="text-base">
              Uso y retención efectiva
            </CardTitle>
            <CardDescription>
              Dónde se usa cada tipo en TRD; reglas propias vs. heredadas (tipo → subserie → serie).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" @click.stop="router.push('/settings/archival/reports/uso-retencion')">
              Abrir informe
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  </SettingsLayout>
</template>
