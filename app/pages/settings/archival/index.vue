<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: ['trd_catalogo_ver', 'trd_tablas_ver', 'trd_metadatos_ver'],
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

      <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
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

        <Card class="cursor-pointer transition-colors hover:bg-muted/40" @click="router.push('/settings/archival/trd/consult')">
          <CardHeader>
            <CardTitle class="text-base">
              Consultar TRD vigente
            </CardTitle>
            <CardDescription class="leading-relaxed">
              Reglas efectivas por área productora y tipo documental (propias o heredadas).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" @click.stop="router.push('/settings/archival/trd/consult')">
              Consultar
            </Button>
          </CardContent>
        </Card>

        <Card class="cursor-pointer transition-colors hover:bg-muted/40" @click="router.push('/settings/archival/reports')">
          <CardHeader>
            <CardTitle class="text-base">
              Reportes archivísticos
            </CardTitle>
            <CardDescription class="leading-relaxed">
              Catálogo, versiones TRD, uso del catálogo y retención efectiva (exportación Excel/PDF).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" @click.stop="router.push('/settings/archival/reports')">
              Ver reportes
            </Button>
          </CardContent>
        </Card>

        <Card class="cursor-pointer transition-colors hover:bg-muted/40" @click="router.push('/settings/archival/lifecycle')">
          <CardHeader>
            <CardTitle class="text-base">
              Ciclo de vida y transferencias
            </CardTitle>
            <CardDescription class="leading-relaxed">
              Gestión → central → histórico; transferencias manuales o automáticas según tiempos TRD.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" @click.stop="router.push('/settings/archival/lifecycle')">
              Gestionar ciclo de vida
            </Button>
          </CardContent>
        </Card>

        <Card class="cursor-pointer transition-colors hover:bg-muted/40" @click="router.push('/settings/archival/audit')">
          <CardHeader>
            <CardTitle class="text-base">
              Auditoría catálogo y TRD
            </CardTitle>
            <CardDescription class="leading-relaxed">
              Trazabilidad de cambios en catálogo documental y tablas de retención (solo consulta).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" @click.stop="router.push('/settings/archival/audit')">
              Ver auditoría
            </Button>
          </CardContent>
        </Card>

        <Card class="cursor-pointer transition-colors hover:bg-muted/40" @click="router.push('/settings/archival/metadata/schemas')">
          <CardHeader>
            <CardTitle class="text-base">
              Metadatos configurables
            </CardTitle>
            <CardDescription class="leading-relaxed">
              Esquemas y campos por tipo documental, subserie, serie o tipo de expediente; captura en radicación.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" @click.stop="router.push('/settings/archival/metadata/schemas')">
              Configurar esquemas
            </Button>
          </CardContent>
        </Card>

        <Card class="cursor-pointer transition-colors hover:bg-muted/40" @click="router.push('/settings/archival/disposition')">
          <CardHeader>
            <CardTitle class="text-base">
              Disposición final
            </CardTitle>
            <CardDescription class="leading-relaxed">
              Actas de eliminación, conservación o selección con aprobación y ejecución auditada.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" @click.stop="router.push('/settings/archival/disposition')">
              Ver actas
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  </SettingsLayout>
</template>
