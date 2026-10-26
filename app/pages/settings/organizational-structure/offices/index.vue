<script setup lang="ts">
import { toast } from 'vue-sonner'
import { DEFAULT_LIST_PAGE_SIZE } from '~/constants/list-pagination'
import { ORG_OFFICE_TYPE_OPTIONS } from '~/constants/org-structure'
import type { OrgOffice } from '~/types/org-structure'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: ['estructura_org_ver', 'sucursales_ver'],
})

const { $api } = useNuxtApp()
const router = useRouter()
const { hasAnyPermission } = usePermissions()

function officeTypeLabel(type: string): string {
  return ORG_OFFICE_TYPE_OPTIONS.find(o => o.value === type)?.label ?? type
}

const offices = ref<OrgOffice[]>([])
const loading = ref(false)
const deactivatingId = ref<number | null>(null)
const pagination = ref({
  current_page: 1,
  last_page: 1,
  per_page: DEFAULT_LIST_PAGE_SIZE,
  total: 0,
})

async function fetchOffices() {
  loading.value = true
  try {
    const res = await $api<{
      data: OrgOffice[]
      meta: { current_page: number, last_page: number, per_page: number, total: number }
    }>(
      '/organizational-structure/org-offices',
      { query: { page: pagination.value.current_page, per_page: pagination.value.per_page } },
    )
    offices.value = res.data
    pagination.value = res.meta
  } catch {
    toast.error('Error al cargar agencias')
    offices.value = []
    pagination.value = { ...pagination.value, current_page: 1, last_page: 1, total: 0 }
  } finally {
    loading.value = false
  }
}

function goToPage(page: number) {
  pagination.value.current_page = page
  void fetchOffices()
}

function changePerPage(size: number) {
  pagination.value.per_page = size
  pagination.value.current_page = 1
  void fetchOffices()
}

async function deactivateOffice(id: number) {
  if (!hasAnyPermission(['estructura_org_editar', 'sucursales_editar']) || deactivatingId.value != null)
    return
  deactivatingId.value = id
  try {
    await $api(`/organizational-structure/org-offices/${id}/deactivate`, { method: 'PATCH' })
    toast.success('Agencia inactivada')
    await fetchOffices()
  } catch (e: any) {
    toast.error(e?.data?.message || 'No se pudo inactivar')
  } finally {
    deactivatingId.value = null
  }
}

onMounted(() => {
  fetchOffices()
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <PageBackButton to="/settings/organizational-structure">
            Módulo
          </PageBackButton>
          <h2 class="text-2xl font-bold tracking-tight">
            Agencias
          </h2>
        </div>
        <div class="shrink-0">
          <PermissionGate :any-permission="['estructura_org_editar', 'sucursales_crear']">
            <Button @click="router.push('/settings/organizational-structure/offices/create')">
              <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
              Nueva agencia
            </Button>
          </PermissionGate>
        </div>
      </div>

      <Card>
        <CardHeader class="gap-2">
          <CardTitle class="leading-snug">
            Listado de agencias
          </CardTitle>
          <CardDescription class="leading-relaxed">
            Misma sede operativa que en Configuración → Sucursales (nombre, código, ciudad y estado activo se mantienen alineados).
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div v-if="loading" class="flex justify-center py-8">
            <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
          <div v-else-if="offices.length === 0" class="py-12 text-center text-muted-foreground leading-relaxed">
            No hay agencias registradas.
          </div>
          <div v-else class="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Ciudad</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead class="text-right">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="o in offices" :key="o.id">
                  <TableCell class="font-medium">
                    {{ o.name }}
                  </TableCell>
                  <TableCell>{{ o.code }}</TableCell>
                  <TableCell>{{ officeTypeLabel(o.office_type) }}</TableCell>
                  <TableCell>{{ o.city ?? '—' }}</TableCell>
                  <TableCell>
                    <Badge :variant="o.is_active ? 'default' : 'secondary'">
                      {{ o.is_active ? 'Activa' : 'Inactiva' }}
                    </Badge>
                  </TableCell>
                  <TableCell class="text-right">
                    <div class="flex flex-wrap justify-end gap-1">
                      <PermissionGate :any-permission="['estructura_org_editar', 'sucursales_editar']">
                        <Button
                          variant="outline"
                          size="sm"
                          class="h-8 gap-1.5 px-2 text-xs"
                          @click="router.push(`/settings/organizational-structure/offices/${o.id}/edit`)"
                        >
                          Editar
                        </Button>
                        <Button
                          v-if="o.is_active"
                          type="button"
                          variant="destructive"
                          size="sm"
                          class="h-8 gap-1.5 px-2 text-xs"
                          :disabled="deactivatingId === o.id"
                          @click="deactivateOffice(o.id)"
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
          <ListPaginationBar
            v-if="pagination.total > 0"
            :page="pagination.current_page"
            :last-page="pagination.last_page"
            :per-page="pagination.per_page"
            :total="pagination.total"
            item-label="agencias"
            :loading="loading"
            @update:page="goToPage"
            @update:per-page="changePerPage"
          />
        </CardContent>
      </Card>
    </div>
  </SettingsLayout>
</template>
