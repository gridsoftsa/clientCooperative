<script setup lang="ts">
import {
  REPORTS_AVAILABLE,
  REPORTS_PLANNED,
  reportDataSourceLabel,
  type ReportCatalogItem,
} from '~/constants/reports-catalog'

definePageMeta({
  middleware: 'permission',
  permissions: 'reportes_ver',
})

function reportHref(item: ReportCatalogItem): string {
  return `/reportes/${item.slug}`
}
</script>

<template>
  <div class="flex w-full flex-col gap-8">
    <div>
      <h2 class="text-2xl font-bold tracking-tight">
        Reportes
      </h2>
      <p class="mt-1 max-w-2xl text-sm text-muted-foreground">
        Cada informe tiene su propia pantalla. Solo están contempladas las ocho hojas vigentes del libro Excel de referencia; el resto quedó fuera de alcance.
      </p>
    </div>

    <section class="space-y-3">
      <h3 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        Disponibles
      </h3>
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <NuxtLink
          v-for="item in REPORTS_AVAILABLE"
          :key="item.slug"
          :to="reportHref(item)"
          class="group block rounded-xl border bg-card shadow-sm transition-colors hover:border-primary/40 hover:bg-muted/30"
        >
          <div class="flex h-full flex-col gap-3 p-5">
            <div class="flex items-start justify-between gap-2">
              <span class="font-semibold leading-snug text-foreground group-hover:text-primary">{{ item.title }}</span>
              <Icon name="i-lucide-chevron-right" class="size-5 shrink-0 text-muted-foreground opacity-70 group-hover:text-primary" />
            </div>
            <p class="text-sm text-muted-foreground">
              {{ item.summary }}
            </p>
            <div class="mt-auto flex flex-wrap items-center gap-2 pt-1">
              <Badge variant="secondary" class="text-xs font-normal">
                {{ reportDataSourceLabel(item.dataSource) }}
              </Badge>
              <span class="text-xs text-muted-foreground">Excel: {{ item.excelSheet }}</span>
            </div>
          </div>
        </NuxtLink>
      </div>
    </section>

    <section class="space-y-3">
      <h3 class="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
        En roadmap
      </h3>
      <p class="text-sm text-muted-foreground">
        Pendientes de modelo de datos o integración; se habilitarán como vistas independientes al igual que las disponibles.
      </p>
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card
          v-for="item in REPORTS_PLANNED"
          :key="item.slug"
          class="border-dashed bg-muted/20 shadow-sm"
        >
          <CardHeader class="space-y-2 pb-2">
            <div class="flex flex-wrap items-center gap-2">
              <CardTitle class="text-base leading-snug">
                {{ item.title }}
              </CardTitle>
              <Badge variant="outline" class="text-xs font-normal">
                Próximamente
              </Badge>
            </div>
            <CardDescription class="text-sm">
              {{ item.summary }}
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-2 text-xs text-muted-foreground">
            <p>
              <span class="font-medium text-foreground">Fuente prevista:</span>
              {{ reportDataSourceLabel(item.dataSource) }}
            </p>
            <p>
              <span class="font-medium text-foreground">Hoja Excel:</span>
              {{ item.excelSheet }}
            </p>
            <p class="border-t border-border/60 pt-2 italic">
              {{ item.note }}
            </p>
          </CardContent>
        </Card>
      </div>
    </section>
  </div>
</template>
