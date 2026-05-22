<script setup lang="ts">
import { toast } from 'vue-sonner'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'trd_tablas_ver',
})

const { $api } = useNuxtApp()
const router = useRouter()

import type { TrdTableRow } from '~/types/archival-trd'

const trdApi = useTrdApi()
const rows = ref<TrdTableRow[]>([])
const loading = ref(false)

async function fetchTables() {
  loading.value = true
  try {
    const res = await $api<{ data: TrdTableRow[] }>('/archival/trd-tables', { query: { per_page: 100 } })
    rows.value = res.data
  } catch {
    toast.error('No se pudieron cargar las tablas TRD')
    rows.value = []
  } finally {
    loading.value = false
  }
}

onMounted(fetchTables)
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <h2 class="text-2xl font-bold tracking-tight">
            Tablas de retención documental
          </h2>
          <p class="text-muted-foreground leading-relaxed max-w-3xl">
            Una tabla TRD por área productora documental. Las versiones en borrador permiten reglas y asociaciones; al activar se valida la retención efectiva por tipo documental.
          </p>
        </div>
        <div class="flex shrink-0 flex-wrap gap-2">
          <Button variant="outline" @click="router.push('/settings/archival')">
            Resumen
          </Button>
          <Button variant="outline" @click="router.push('/settings/archival/trd/consult')">
            TRD vigente
          </Button>
          <PermissionGate permission="trd_tablas_editar">
            <Button @click="router.push('/settings/archival/trd/create')">
              <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
              Nueva tabla TRD
            </Button>
          </PermissionGate>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle class="leading-snug">
            Tablas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div v-if="loading" class="flex justify-center py-10">
            <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
          <div v-else-if="rows.length === 0" class="py-8 text-center text-muted-foreground">
            No hay tablas TRD. Cree un área como productora documental en estructura organizacional y luego cree la tabla aquí.
          </div>
          <div v-else class="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Área productora</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow
                  v-for="r in rows"
                  :key="r.id"
                  class="cursor-pointer hover:bg-muted/50"
                  @click="router.push(trdApi.tablePath(r.id))"
                >
                  <TableCell>{{ r.org_unit?.name ?? '—' }}</TableCell>
                  <TableCell class="font-mono text-sm">{{ r.org_unit?.code ?? '—' }}</TableCell>
                  <TableCell>
                    <Button variant="ghost" size="sm" @click.stop="router.push(trdApi.tablePath(r.id))">
                      Ver versiones
                      <Icon name="i-lucide-chevron-right" class="ml-1 h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  </SettingsLayout>
</template>
