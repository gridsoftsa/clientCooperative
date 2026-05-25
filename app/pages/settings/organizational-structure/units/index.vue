<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { OrgUnitRow } from '~/composables/useOrgStructureApi'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'estructura_org_ver',
})

const router = useRouter()
const { hasPermission } = usePermissions()
const { $api } = useNuxtApp()
const orgApi = useOrgStructureApi()

const units = ref<OrgUnitRow[]>([])
const offices = ref<Array<{ id: number; name: string; code: string }>>([])
const loading = ref(false)
const filterOfficeId = ref<number | null>(null)
const deactivatingId = ref<number | null>(null)

async function loadOffices() {
  try {
    offices.value = await orgApi.fetchOffices()
  } catch {
    offices.value = []
  }
}

async function fetchUnits() {
  loading.value = true
  try {
    const q: Record<string, string | number> = { per_page: 500 }
    if (filterOfficeId.value != null)
      q.org_office_id = filterOfficeId.value
    const res = await $api<{ data: OrgUnitRow[] }>('/organizational-structure/org-units', { query: q })
    units.value = res.data
  } catch {
    toast.error('Error al cargar áreas')
    units.value = []
  } finally {
    loading.value = false
  }
}

watch(filterOfficeId, () => {
  fetchUnits()
})

async function deactivateUnit(id: number) {
  if (!hasPermission('estructura_org_editar') || deactivatingId.value != null)
    return
  deactivatingId.value = id
  try {
    await $api(`/organizational-structure/org-units/${id}/deactivate`, { method: 'PATCH' })
    toast.success('Área inactivada')
    await fetchUnits()
  } catch (e: any) {
    toast.error(e?.data?.message || 'No se pudo inactivar')
  } finally {
    deactivatingId.value = null
  }
}

onMounted(async () => {
  await loadOffices()
  await fetchUnits()
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
            Áreas y dependencias
          </h2>
        </div>
        <div class="shrink-0">
          <PermissionGate permission="estructura_org_editar">
            <Button @click="router.push('/settings/organizational-structure/units/create')">
              <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
              Nueva área
            </Button>
          </PermissionGate>
        </div>
      </div>

      <Card>
        <CardHeader class="gap-2">
          <CardTitle class="leading-snug">
            Listado de áreas
          </CardTitle>
          <CardDescription class="leading-relaxed">
            Jerarquía por agencia, indicador TRD/producora documental y estado de cada dependencia.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 sm:flex-row sm:flex-wrap sm:items-end">
            <div class="grid w-full gap-2 sm:max-w-xs sm:shrink-0">
              <Label for="foffice" class="text-xs text-muted-foreground">Filtrar por agencia</Label>
              <Select :model-value="filterOfficeId === null ? 'all' : String(filterOfficeId)" @update:model-value="(v) => { filterOfficeId = v === 'all' ? null : Number(v) }">
                <SelectTrigger id="foffice" class="w-full">
                  <SelectValue placeholder="Todas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    Todas las agencias
                  </SelectItem>
                  <SelectItem
                    v-for="o in offices"
                    :key="o.id"
                    :value="String(o.id)"
                  >
                    {{ o.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div v-if="loading" class="flex justify-center py-8">
            <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
          <div v-else-if="units.length === 0" class="py-12 text-center text-muted-foreground leading-relaxed">
            No hay áreas. Cree antes al menos una agencia.
          </div>
          <div v-else class="border rounded-lg overflow-hidden">
            <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Agencia</TableHead>
                <TableHead>Padre</TableHead>
                <TableHead>Productora doc.</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead class="text-right">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="u in units" :key="u.id">
                <TableCell class="font-medium">
                  {{ u.name }}
                </TableCell>
                <TableCell>{{ u.code }}</TableCell>
                <TableCell>{{ u.org_office?.name ?? '—' }}</TableCell>
                <TableCell>{{ u.parent?.name ?? '—' }}</TableCell>
                <TableCell>
                  {{ u.is_document_producer ? 'Sí' : 'No' }}
                </TableCell>
                <TableCell>
                  <Badge :variant="u.is_active ? 'default' : 'secondary'">
                    {{ u.is_active ? 'Activa' : 'Inactiva' }}
                  </Badge>
                </TableCell>
                <TableCell class="text-right">
                  <div class="flex flex-wrap justify-end gap-1">
                    <PermissionGate permission="estructura_org_editar">
                      <Button
                        variant="outline"
                        size="sm"
                        class="h-8 gap-1.5 px-2 text-xs"
                        @click="router.push(`/settings/organizational-structure/units/${u.id}/edit`)"
                      >
                        Editar
                      </Button>
                      <Button
                        v-if="u.is_active"
                        type="button"
                        variant="destructive"
                        size="sm"
                        class="h-8 gap-1.5 px-2 text-xs"
                        :disabled="deactivatingId === u.id"
                        @click="deactivateUnit(u.id)"
                      >
                        <Icon name="i-lucide-ban" class="size-4 shrink-0" />
                        Desactivar
                      </Button>
                    </PermissionGate>
                  </div>
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
