<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { OrgPositionRow } from '~/composables/useOrgStructureApi'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'estructura_org_ver',
})

const router = useRouter()
const { hasPermission } = usePermissions()
const { $api } = useNuxtApp()
const orgApi = useOrgStructureApi()

const positions = ref<OrgPositionRow[]>([])
const unitOptions = ref<Array<{ id: number; label: string }>>([])
const loading = ref(false)
const filterUnitId = ref<number | null>(null)
const deactivatingId = ref<number | null>(null)

async function loadUnitOptions() {
  try {
    const units = await orgApi.fetchUnits({ activeOnly: false })
    unitOptions.value = units.map(u => ({
      id: u.id,
      label: `${u.name} (${u.org_office?.name ?? '—'})`,
    }))
  } catch {
    unitOptions.value = []
  }
}

async function fetchPositions() {
  loading.value = true
  try {
    const q: Record<string, string | number> = { per_page: 500 }
    if (filterUnitId.value != null)
      q.org_unit_id = filterUnitId.value
    const res = await $api<{ data: OrgPositionRow[] }>('/organizational-structure/org-positions', { query: q })
    positions.value = res.data
  } catch {
    toast.error('Error al cargar cargos')
    positions.value = []
  } finally {
    loading.value = false
  }
}

watch(filterUnitId, () => {
  fetchPositions()
})

async function deactivatePosition(id: number) {
  if (!hasPermission('estructura_org_editar') || deactivatingId.value != null)
    return
  deactivatingId.value = id
  try {
    await $api(`/organizational-structure/org-positions/${id}/deactivate`, { method: 'PATCH' })
    toast.success('Cargo inactivado')
    await fetchPositions()
  } catch (e: any) {
    toast.error(e?.data?.message || 'No se pudo inactivar')
  } finally {
    deactivatingId.value = null
  }
}

onMounted(async () => {
  await loadUnitOptions()
  await fetchPositions()
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <Button variant="ghost" size="sm" class="h-8 w-fit -ml-2 px-2" @click="router.push('/settings/organizational-structure')">
            <Icon name="i-lucide-arrow-left" class="mr-1 h-4 w-4" />
            Módulo
          </Button>
          <h2 class="text-2xl font-bold tracking-tight">
            Cargos
          </h2>
        </div>
        <div class="shrink-0">
          <PermissionGate permission="estructura_org_editar">
            <Button @click="router.push('/settings/organizational-structure/positions/create')">
              <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
              Nuevo cargo
            </Button>
          </PermissionGate>
        </div>
      </div>

      <div class="w-full max-w-md space-y-2">
        <Label for="funit" class="leading-snug">Filtrar por área</Label>
        <Select
          :model-value="filterUnitId == null ? 'all' : String(filterUnitId)"
          @update:model-value="(v) => { filterUnitId = v === 'all' ? null : Number(v) }"
        >
          <SelectTrigger id="funit">
            <SelectValue placeholder="Todas" />
          </SelectTrigger>
          <SelectContent class="max-h-72">
            <SelectItem value="all">
              Todas las áreas
            </SelectItem>
            <SelectItem
              v-for="u in unitOptions"
              :key="u.id"
              :value="String(u.id)"
            >
              {{ u.label }}
            </SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader class="gap-2">
          <CardTitle class="leading-snug">
            Listado de cargos
          </CardTitle>
          <CardDescription class="leading-relaxed">
            Puestos por área, nivel jerárquico, reporte a cargo superior y estado.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div v-if="loading" class="flex justify-center py-12">
            <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
          <div v-else-if="positions.length === 0" class="py-12 text-center text-muted-foreground leading-relaxed">
            No hay cargos. Cree antes áreas.
          </div>
          <Table v-else>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Área</TableHead>
                <TableHead>Nivel</TableHead>
                <TableHead>Reporta a</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead class="text-right">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="p in positions" :key="p.id">
                <TableCell class="font-medium">
                  {{ p.name }}
                </TableCell>
                <TableCell>{{ p.code }}</TableCell>
                <TableCell>{{ p.org_unit?.name ?? '—' }}</TableCell>
                <TableCell>{{ p.hierarchy_level }}</TableCell>
                <TableCell>{{ p.reports_to_position?.name ?? '—' }}</TableCell>
                <TableCell>
                  <Badge :variant="p.is_active ? 'default' : 'secondary'">
                    {{ p.is_active ? 'Activo' : 'Inactivo' }}
                  </Badge>
                </TableCell>
                <TableCell class="text-right space-x-2">
                  <PermissionGate permission="estructura_org_editar">
                    <Button
                      variant="outline"
                      size="sm"
                      @click="router.push(`/settings/organizational-structure/positions/${p.id}/edit`)"
                    >
                      Editar
                    </Button>
                    <Button
                      v-if="p.is_active"
                      type="button"
                      variant="destructive"
                      size="sm"
                      class="rounded-full gap-1.5 px-4 font-medium shadow-xs"
                      :disabled="deactivatingId === p.id"
                      @click="deactivatePosition(p.id)"
                    >
                      <Icon name="i-lucide-ban" class="size-4 shrink-0" />
                      Desactivar
                    </Button>
                  </PermissionGate>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  </SettingsLayout>
</template>
