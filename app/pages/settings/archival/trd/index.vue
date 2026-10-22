<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { TrdTableRow } from '~/types/archival-trd'
import { messageFromFetchError } from '~/utils/http-error-message'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'trd_tablas_ver',
})

const { $api } = useNuxtApp()
const router = useRouter()

const trdApi = useTrdApi()
const rows = ref<TrdTableRow[]>([])
const loading = ref(false)
const importing = ref(false)
const importInput = ref<HTMLInputElement | null>(null)

interface TrdImportSummary {
  producer_office_name: string
  producer_office_code: string
  series_count: number
  subseries_count: number
  document_types_count: number
  replaced_draft: boolean
}

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

function openImportPicker() {
  importInput.value?.click()
}

async function onImportFile(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''

  if (!file) {
    return
  }

  if (!file.name.toLowerCase().endsWith('.xlsx')) {
    toast.error('Use el Excel de la TRD en formato .xlsx (ADM-GD-FO-01).')
    return
  }

  importing.value = true
  try {
    const body = new FormData()
    body.append('file', file)
    const res = await $api<{ data: TrdTableRow, summary: TrdImportSummary }>('/archival/trd-tables/import', {
      method: 'POST',
      body,
    })
    const summary = res.summary
    const action = summary.replaced_draft ? 'Se actualizó el borrador' : 'Se creó la TRD en borrador'
    toast.success(`${action} de ${summary.producer_office_name} (${summary.producer_office_code})`, {
      description: `${summary.series_count} series, ${summary.subseries_count} subseries y ${summary.document_types_count} tipos documentales.`,
    })
    await fetchTables()
    await router.push(trdApi.tablePath(res.data.id))
  } catch (error: unknown) {
    toast.error(messageFromFetchError(error, 'No se pudo importar la tabla de retención'))
  } finally {
    importing.value = false
  }
}

onMounted(fetchTables)
</script>

<template>
  <SettingsLayout :wide="true" hide-intro>
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
          <PermissionGate :all-permissions="['trd_tablas_editar', 'trd_catalogo_editar']">
            <input
              ref="importInput"
              type="file"
              accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              class="hidden"
              @change="onImportFile"
            >
            <Button variant="outline" :disabled="importing" @click="openImportPicker">
              <Icon v-if="importing" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
              <Icon v-else name="i-lucide-file-spreadsheet" class="mr-2 h-4 w-4" />
              Importar Excel
            </Button>
          </PermissionGate>
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
