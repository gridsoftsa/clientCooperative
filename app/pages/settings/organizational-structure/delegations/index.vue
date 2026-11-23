<script setup lang="ts">
import { toast } from 'vue-sonner'
import { DEFAULT_LIST_PAGE_SIZE } from '~/constants/list-pagination'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: ['estructura_org_ver', 'suplencias_delegaciones_ver'],
})

interface DelegationRow {
  id: number
  starts_on: string
  ends_on: string
  is_active: boolean
  org_unit?: { id: number; name: string; code: string } | null
  assignor_staff?: { id: number; first_name: string; first_last_name: string }
  delegate_staff?: { id: number; first_name: string; first_last_name: string }
}

const router = useRouter()
const { $api } = useNuxtApp()
const { hasAnyPermission } = usePermissions()
const orgApi = useOrgStructureApi()

const rows = ref<DelegationRow[]>([])
const loading = ref(true)
const openingReceiptId = ref<number | null>(null)
const deactivatingId = ref<number | null>(null)
const deactivateDialogOpen = ref(false)
const pendingDeactivateId = ref<number | null>(null)
const pagination = ref({
  current_page: 1,
  last_page: 1,
  per_page: DEFAULT_LIST_PAGE_SIZE,
  total: 0,
})

function staffLabel(s: { first_name?: string; first_last_name?: string }): string {
  return [s.first_name, s.first_last_name].filter(Boolean).join(' ')
}

async function viewReceipt(id: number) {
  if (openingReceiptId.value != null) {
    return
  }
  openingReceiptId.value = id
  try {
    await orgApi.viewDelegationReceiptInNewTab(id)
  }
  catch (e: unknown) {
    const err = e as { message?: string }
    toast.error(err?.message || 'No se pudo abrir el comprobante PDF')
  }
  finally {
    openingReceiptId.value = null
  }
}

async function load() {
  loading.value = true
  try {
    const res = await $api<{
      data: DelegationRow[]
      meta: { current_page: number, last_page: number, per_page: number, total: number }
    }>('/organizational-structure/org-delegations', {
      query: { page: pagination.value.current_page, per_page: pagination.value.per_page },
    })
    rows.value = res.data
    pagination.value = res.meta
  } catch {
    toast.error('No se pudieron cargar los registros de Backup')
    rows.value = []
  } finally {
    loading.value = false
  }
}

function goToPage(page: number) {
  pagination.value.current_page = page
  void load()
}

function changePerPage(size: number) {
  pagination.value.per_page = size
  pagination.value.current_page = 1
  void load()
}

function openDeactivateDialog(id: number) {
  if (!hasAnyPermission(['suplencias_delegaciones_editar', 'estructura_org_editar'])) {
    toast.error('Sin permiso')
    return
  }
  if (deactivatingId.value != null) {
    return
  }
  pendingDeactivateId.value = id
  deactivateDialogOpen.value = true
}

async function onDeactivateConfirm(reason: string) {
  const id = pendingDeactivateId.value
  if (id == null || deactivatingId.value != null) {
    return
  }
  deactivatingId.value = id
  try {
    await $api(`/organizational-structure/org-delegations/${id}`, {
      method: 'PUT',
      body: {
        is_active: false,
        deactivation_reason: reason,
      },
    })
    deactivateDialogOpen.value = false
    pendingDeactivateId.value = null
    toast.success('Backup desactivado. El registro permanece en el listado.')
    await load()
  }
  catch (e: unknown) {
    const err = e as { data?: { message?: string, errors?: Record<string, string[]> } }
    const first = err.data?.errors ? Object.values(err.data.errors)[0]?.[0] : null
    toast.error(first ?? err.data?.message ?? 'No se pudo desactivar')
  }
  finally {
    deactivatingId.value = null
  }
}

watch(deactivateDialogOpen, (open) => {
  if (!open && deactivatingId.value == null) {
    pendingDeactivateId.value = null
  }
})

onMounted(() => {
  load()
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-2xl font-bold tracking-tight">
          Backup
        </h2>
        <div class="flex flex-wrap gap-2">
          <Button variant="outline" @click="router.push('/settings/organizational-structure')">
            <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
            Volver
          </Button>
          <PermissionGate :any-permission="['estructura_org_editar', 'suplencias_delegaciones_crear']">
            <Button @click="router.push('/settings/organizational-structure/delegations/create')">
              <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
              Nuevo Backup
            </Button>
          </PermissionGate>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de Backup</CardTitle>
          <CardDescription class="leading-relaxed">
            Encargos temporales por vacaciones, incapacidad u otras ausencias. Si hay un error, desactive el registro: no se elimina, se conserva el historial y se revierten encargos y trabajo asignado.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div v-if="loading" class="flex justify-center py-8">
            <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
          <div v-else-if="rows.length === 0" class="py-12 text-center text-muted-foreground leading-relaxed">
            No hay registros de Backup.
          </div>
          <div v-else class="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Titular</TableHead>
                  <TableHead>Backup</TableHead>
                  <TableHead>Área</TableHead>
                  <TableHead>Desde</TableHead>
                  <TableHead>Hasta</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead class="text-right">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="d in rows" :key="d.id">
                  <TableCell class="font-medium">
                    {{ staffLabel(d.assignor_staff ?? {}) }}
                  </TableCell>
                  <TableCell>{{ staffLabel(d.delegate_staff ?? {}) }}</TableCell>
                  <TableCell class="text-sm text-muted-foreground max-w-[200px] truncate" :title="d.org_unit?.name ?? ''">
                    {{ d.org_unit?.name ?? '—' }}
                  </TableCell>
                  <TableCell class="whitespace-nowrap text-sm tabular-nums">
                    {{ String(d.starts_on).slice(0, 10) }}
                  </TableCell>
                  <TableCell class="whitespace-nowrap text-sm tabular-nums">
                    {{ String(d.ends_on).slice(0, 10) }}
                  </TableCell>
                  <TableCell>
                    <Badge :variant="d.is_active ? 'default' : 'secondary'">
                      {{ d.is_active ? 'Activa' : 'Inactiva' }}
                    </Badge>
                  </TableCell>
                  <TableCell class="text-right">
                    <div class="flex justify-end gap-1">
                      <PermissionGate :any-permission="['estructura_org_ver', 'suplencias_delegaciones_ver']">
                        <Button
                          variant="outline"
                          size="sm"
                          class="h-8 gap-1.5 px-2 text-xs"
                          :disabled="openingReceiptId === d.id"
                          @click="viewReceipt(d.id)"
                        >
                          <Icon
                            :name="openingReceiptId === d.id ? 'i-lucide-loader-2' : 'i-lucide-file-text'"
                            class="h-3.5 w-3.5"
                            :class="openingReceiptId === d.id ? 'animate-spin' : ''"
                          />
                          PDF
                        </Button>
                      </PermissionGate>
                      <PermissionGate :any-permission="['estructura_org_editar', 'suplencias_delegaciones_editar']">
                        <Button
                          variant="warning"
                          size="sm"
                          class="h-8 gap-1.5 px-2 text-xs"
                          @click="router.push(`/settings/organizational-structure/delegations/${d.id}/edit`)"
                        >
                          Editar
                        </Button>
                      </PermissionGate>
                      <PermissionGate :any-permission="['estructura_org_editar', 'suplencias_delegaciones_editar']">
                        <Button
                          v-if="d.is_active"
                          variant="destructive"
                          size="sm"
                          class="h-8 gap-1.5 px-2 text-xs"
                          :disabled="deactivatingId === d.id"
                          @click="openDeactivateDialog(d.id)"
                        >
                          <Icon
                            :name="deactivatingId === d.id ? 'i-lucide-loader-2' : 'i-lucide-ban'"
                            class="h-3.5 w-3.5"
                            :class="deactivatingId === d.id ? 'animate-spin' : ''"
                          />
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
            item-label="registros"
            :loading="loading"
            @update:page="goToPage"
            @update:per-page="changePerPage"
          />
        </CardContent>
      </Card>
    </div>

    <ConfirmWithReasonDialog
      v-model:open="deactivateDialogOpen"
      title="Desactivar Backup"
      description="El registro se conserva. Se corta el encargo y el trabajo pendiente vuelve al titular si sigue en el Backup. Indique el motivo de la desactivación."
      confirm-text="Aceptar"
      cancel-text="Cancelar"
      :loading="deactivatingId !== null"
      @confirm="onDeactivateConfirm"
    />
  </SettingsLayout>
</template>
