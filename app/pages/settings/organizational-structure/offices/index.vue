<script setup lang="ts">
import { toast } from 'vue-sonner'
import { ORG_OFFICE_TYPE_OPTIONS } from '~/constants/org-structure'
import type { OrgOffice } from '~/types/org-structure'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'estructura_org_ver',
})

const { $api } = useNuxtApp()
const router = useRouter()
const { hasPermission } = usePermissions()

function officeTypeLabel(type: string): string {
  return ORG_OFFICE_TYPE_OPTIONS.find(o => o.value === type)?.label ?? type
}

const offices = ref<OrgOffice[]>([])
const loading = ref(false)
const deactivatingId = ref<number | null>(null)

async function fetchOffices() {
  loading.value = true
  try {
    const res = await $api<{ data: OrgOffice[]; meta: { per_page: number; total: number } }>(
      '/organizational-structure/org-offices',
      { query: { per_page: 200 } },
    )
    offices.value = res.data
  } catch {
    toast.error('Error al cargar oficinas')
    offices.value = []
  } finally {
    loading.value = false
  }
}

async function deactivateOffice(id: number) {
  if (!hasPermission('estructura_org_editar') || deactivatingId.value != null)
    return
  deactivatingId.value = id
  try {
    await $api(`/organizational-structure/org-offices/${id}/deactivate`, { method: 'PATCH' })
    toast.success('Oficina inactivada')
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
          <Button variant="ghost" size="sm" class="h-8 w-fit -ml-2 px-2" @click="router.push('/settings/organizational-structure')">
            <Icon name="i-lucide-arrow-left" class="mr-1 h-4 w-4" />
            Módulo
          </Button>
          <h2 class="text-2xl font-bold tracking-tight">
            Oficinas y agencias
          </h2>
        </div>
        <div class="shrink-0">
          <PermissionGate permission="estructura_org_editar">
            <Button @click="router.push('/settings/organizational-structure/offices/create')">
              <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
              Nueva oficina
            </Button>
          </PermissionGate>
        </div>
      </div>

      <Card>
        <CardHeader class="gap-2">
          <CardTitle class="leading-snug">
            Listado de oficinas
          </CardTitle>
          <CardDescription class="leading-relaxed">
            Sedes, agencias u oficina principal con su código y ubicación administrativa.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div v-if="loading" class="flex justify-center py-12">
            <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
          <div v-else-if="offices.length === 0" class="py-12 text-center text-muted-foreground leading-relaxed">
            No hay oficinas registradas.
          </div>
          <Table v-else>
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
                <TableCell class="text-right space-x-2">
                  <PermissionGate permission="estructura_org_editar">
                    <Button
                      variant="outline"
                      size="sm"
                      @click="router.push(`/settings/organizational-structure/offices/${o.id}/edit`)"
                    >
                      Editar
                    </Button>
                    <Button
                      v-if="o.is_active"
                      type="button"
                      variant="destructive"
                      size="sm"
                      class="rounded-full gap-1.5 px-4 font-medium shadow-xs"
                      :disabled="deactivatingId === o.id"
                      @click="deactivateOffice(o.id)"
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
