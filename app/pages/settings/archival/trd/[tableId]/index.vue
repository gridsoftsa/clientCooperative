<script setup lang="ts">
import { toast } from 'vue-sonner'
import { TRD_VERSION_STATUS_LABELS } from '~/constants/archival-trd'
import type { TrdTableRow, TrdVersionRow } from '~/types/archival-trd'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'trd_tablas_ver',
})

const route = useRoute()
const router = useRouter()
const trdApi = useTrdApi()
const { hasPermission } = usePermissions()

const tableId = computed(() => Number(route.params.tableId))

const table = ref<TrdTableRow | null>(null)
const versions = ref<TrdVersionRow[]>([])
const loading = ref(false)

function statusLabel(status: string): string {
  return TRD_VERSION_STATUS_LABELS[status] ?? status
}

async function load() {
  if (!Number.isFinite(tableId.value)) {
    await router.push('/settings/archival/trd')
    return
  }
  loading.value = true
  try {
    table.value = await trdApi.fetchTable(tableId.value)
    versions.value = table.value.versions ?? await trdApi.fetchVersions(tableId.value)
  } catch {
    toast.error('No se pudo cargar la tabla TRD')
    await router.push('/settings/archival/trd')
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <Button variant="ghost" size="sm" class="h-8 w-fit -ml-2 px-2" @click="router.push('/settings/archival/trd')">
            <Icon name="i-lucide-arrow-left" class="mr-1 h-4 w-4" />
            Tablas TRD
          </Button>
          <h2 class="text-2xl font-bold tracking-tight">
            TRD — {{ table?.org_unit?.name ?? 'Área productora' }}
          </h2>
          <p v-if="table?.org_unit" class="text-muted-foreground font-mono text-sm">
            {{ table.org_unit.code }}
          </p>
        </div>
        <PermissionGate permission="trd_tablas_editar">
          <Button @click="router.push(trdApi.versionCreatePath(tableId))">
            <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
            Nueva versión
          </Button>
        </PermissionGate>
      </div>

      <Card v-if="table?.notes">
        <CardContent class="pt-6 text-sm text-muted-foreground leading-relaxed">
          {{ table.notes }}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Versiones</CardTitle>
          <CardDescription>
            Solo una versión puede estar vigente. Edite borradores o cree una nueva versión desde una vigente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div v-if="loading" class="flex justify-center py-10">
            <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
          <div v-else-if="versions.length === 0" class="py-8 text-center text-muted-foreground">
            Sin versiones. Cree la primera versión de esta TRD.
          </div>
          <Table v-else>
            <TableHeader>
              <TableRow>
                <TableHead>Versión</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Aprobación</TableHead>
                <TableHead>Vigencia</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="v in versions" :key="v.id">
                <TableCell class="font-mono">
                  v{{ v.version_number }}
                </TableCell>
                <TableCell>
                  <Badge :variant="v.status === 'active' ? 'default' : 'secondary'">
                    {{ statusLabel(v.status) }}
                  </Badge>
                </TableCell>
                <TableCell>{{ v.approved_at ?? '—' }}</TableCell>
                <TableCell class="text-sm text-muted-foreground">
                  {{ v.effective_from ?? '—' }} → {{ v.effective_to ?? '—' }}
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="router.push(trdApi.versionPath(tableId, v.id))"
                  >
                    {{ hasPermission('trd_tablas_editar') && v.status === 'draft' ? 'Configurar' : 'Ver' }}
                    <Icon name="i-lucide-chevron-right" class="ml-1 h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  </SettingsLayout>
</template>
