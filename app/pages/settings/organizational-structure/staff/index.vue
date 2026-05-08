<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { OrgStaffListItem } from '~/types/org-structure'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'estructura_org_ver',
})

const router = useRouter()
const { hasPermission } = usePermissions()
const { $api } = useNuxtApp()

const staff = ref<OrgStaffListItem[]>([])
const loading = ref(false)
const q = ref('')
let debounceTimer: ReturnType<typeof setTimeout> | null = null
const deactivatingId = ref<number | null>(null)

function displayName(s: OrgStaffListItem): string {
  if (s.full_name)
    return s.full_name
  return [s.first_name, s.second_name, s.first_last_name, s.second_last_name].filter(Boolean).join(' ')
}

async function fetchStaff() {
  loading.value = true
  try {
    const res = await $api<{ data: OrgStaffListItem[] }>('/organizational-structure/org-staff', {
      query: {
        per_page: 200,
        ...(q.value.trim() ? { q: q.value.trim() } : {}),
      },
    })
    staff.value = res.data
  } catch {
    toast.error('Error al cargar funcionarios')
    staff.value = []
  } finally {
    loading.value = false
  }
}

watch(q, () => {
  if (debounceTimer)
    clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    fetchStaff()
  }, 400)
})

async function deactivateStaff(id: number) {
  if (!hasPermission('estructura_org_editar') || deactivatingId.value != null)
    return
  deactivatingId.value = id
  try {
    await $api(`/organizational-structure/org-staff/${id}/deactivate`, { method: 'PATCH' })
    toast.success('Funcionario inactivado y asignación cerrada')
    await fetchStaff()
  } catch (e: any) {
    toast.error(e?.data?.message || 'No se pudo inactivar')
  } finally {
    deactivatingId.value = null
  }
}

onMounted(() => {
  fetchStaff()
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
            Funcionarios
          </h2>
        </div>
        <div class="shrink-0">
          <PermissionGate permission="estructura_org_editar">
            <Button @click="router.push('/settings/organizational-structure/staff/create')">
              <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
              Registrar funcionario
            </Button>
          </PermissionGate>
        </div>
      </div>

      <div class="w-full max-w-sm space-y-2">
        <Label for="sq" class="leading-snug">Buscar</Label>
        <Input id="sq" v-model="q" placeholder="Nombre, correo, documento…" />
      </div>

      <Card>
        <CardHeader class="gap-2">
          <CardTitle class="leading-snug">
            Listado de funcionarios
          </CardTitle>
          <CardDescription class="leading-relaxed">
            Personas institucionales, vínculo con usuario del sistema y ubicación organizacional vigente.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div v-if="loading" class="flex justify-center py-12">
            <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
          <div v-else-if="staff.length === 0" class="py-12 text-center text-muted-foreground leading-relaxed">
            No hay funcionarios registrados.
          </div>
          <Table v-else>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Documento</TableHead>
                <TableHead>Usuario sistema</TableHead>
                <TableHead>Ubicación vigente</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead class="text-right">
                  Acciones
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="s in staff" :key="s.id">
                <TableCell class="font-medium">
                  {{ displayName(s) }}
                </TableCell>
                <TableCell>{{ s.document_number ?? '—' }}</TableCell>
                <TableCell>{{ s.user?.email ?? '—' }}</TableCell>
                <TableCell class="text-sm text-muted-foreground max-w-xs">
                  <template v-if="s.current_assignment?.org_office">
                    {{ s.current_assignment.org_office?.name }} · {{ s.current_assignment.org_unit?.name }} · {{ s.current_assignment.org_position?.name }}
                  </template>
                  <span v-else class="text-amber-600 dark:text-amber-400">Sin asignación vigente</span>
                </TableCell>
                <TableCell>
                  <Badge :variant="s.is_active ? 'default' : 'secondary'">
                    {{ s.is_active ? 'Activo' : 'Inactivo' }}
                  </Badge>
                </TableCell>
                <TableCell class="text-right flex flex-wrap justify-end gap-1">
                  <PermissionGate permission="estructura_org_editar">
                    <Button
                      variant="outline"
                      size="sm"
                      @click="router.push(`/settings/organizational-structure/staff/${s.id}/edit`)"
                    >
                      Datos
                    </Button>
                    <Button
                      v-if="s.is_active"
                      variant="secondary"
                      size="sm"
                      @click="router.push(`/settings/organizational-structure/staff/${s.id}/assign`)"
                    >
                      Ubicación
                    </Button>
                    <Button
                      v-if="s.is_active"
                      variant="warning"
                      size="sm"
                      :disabled="deactivatingId === s.id"
                      @click="deactivateStaff(s.id)"
                    >
                      Inactivar
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
