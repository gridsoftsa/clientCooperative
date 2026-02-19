<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { Sucursal } from '~/types/sucursal'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'sucursales.view',
})

const { $api } = useNuxtApp()
const router = useRouter()
const { hasPermission } = usePermissions()

const sucursales = ref<Sucursal[]>([])
const loading = ref(false)
const pagination = ref({
  current_page: 1,
  last_page: 1,
  per_page: 50,
  total: 0,
})

async function fetchSucursales() {
  loading.value = true
  try {
    const res = await $api<{ data: Sucursal[]; meta: typeof pagination.value }>('/sucursales', {
      query: { per_page: pagination.value.per_page, page: pagination.value.current_page },
    })
    sucursales.value = res.data
    pagination.value = res.meta
  } catch (e) {
    console.error('Error al cargar sucursales:', e)
    toast.error('Error al cargar sucursales')
  } finally {
    loading.value = false
  }
}

async function handleDelete(id: number) {
  if (!confirm('¿Eliminar esta sucursal? Se desvincularán usuarios y agencias.')) return
  try {
    await $api(`/sucursales/${id}`, { method: 'DELETE' })
    toast.success('Sucursal eliminada')
    await fetchSucursales()
  } catch (e: any) {
    toast.error(e?.data?.message || 'Error al eliminar')
  }
}

onMounted(() => {
  fetchSucursales()
})
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-2xl font-bold tracking-tight">
        Sucursales
      </h2>
      <PermissionGate permission="sucursales.create">
        <Button @click="router.push('/admin/sucursales/create')">
          <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
          Nueva Sucursal
        </Button>
      </PermissionGate>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Sedes de la cooperativa</CardTitle>
        <CardDescription>
          La sucursal marcada como principal es la matriz. Asigna usuarios y agencias a cada sede.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="loading" class="flex justify-center py-8">
          <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
        <div v-else-if="sucursales.length === 0" class="text-center py-12 text-muted-foreground">
          No hay sucursales. Crea la primera.
        </div>
        <div v-else class="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Código</TableHead>
                <TableHead>Ciudad</TableHead>
                <TableHead>Principal</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead class="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="s in sucursales" :key="s.id">
                <TableCell class="font-medium">{{ s.name }}</TableCell>
                <TableCell>{{ s.code ?? '—' }}</TableCell>
                <TableCell>{{ s.city ?? '—' }}</TableCell>
                <TableCell>
                  <Badge v-if="s.is_main" variant="default">Principal</Badge>
                  <span v-else class="text-muted-foreground">—</span>
                </TableCell>
                <TableCell>
                  <Badge :variant="s.is_active ? 'default' : 'secondary'">
                    {{ s.is_active ? 'Activa' : 'Inactiva' }}
                  </Badge>
                </TableCell>
                <TableCell class="text-right">
                  <PermissionGate permission="sucursales.edit">
                    <Button variant="ghost" size="sm" @click="router.push(`/admin/sucursales/${s.id}/edit`)">
                      <Icon name="i-lucide-edit" class="h-4 w-4" />
                    </Button>
                  </PermissionGate>
                  <PermissionGate permission="sucursales.delete">
                    <Button
                      variant="ghost"
                      size="sm"
                      class="text-destructive"
                      :disabled="s.is_main"
                      @click="handleDelete(s.id)"
                    >
                      <Icon name="i-lucide-trash" class="h-4 w-4" />
                    </Button>
                  </PermissionGate>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
