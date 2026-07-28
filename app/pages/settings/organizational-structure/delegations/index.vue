<script setup lang="ts">
import { toast } from 'vue-sonner'

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
    const res = await $api<{ data: DelegationRow[] }>('/organizational-structure/org-delegations', {
      query: { per_page: 200 },
    })
    rows.value = res.data
  } catch {
    toast.error('No se pudieron cargar los registros de Backup')
    rows.value = []
  } finally {
    loading.value = false
  }
}

async function removeRow(id: number) {
  if (!hasAnyPermission(['suplencias_delegaciones_eliminar', 'estructura_org_editar'])) {
    toast.error('Sin permiso')
    return
  }
  if (!confirm('¿Eliminar este Backup? (queda en historial)')) {
    return
  }
  try {
    await $api(`/organizational-structure/org-delegations/${id}`, { method: 'DELETE' })
    toast.success('Backup eliminado')
    await load()
  } catch (e: any) {
    toast.error(e?.data?.message || 'Error')
  }
}

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
            Encargos temporales por vacaciones, incapacidad u otras ausencias (titular y Backup con vigencia).
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
                      <PermissionGate :any-permission="['estructura_org_editar', 'suplencias_delegaciones_eliminar']">
                        <Button
                          variant="destructive"
                          size="sm"
                          class="h-8 gap-1.5 px-2 text-xs"
                          @click="removeRow(d.id)"
                        >
                          Eliminar
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
