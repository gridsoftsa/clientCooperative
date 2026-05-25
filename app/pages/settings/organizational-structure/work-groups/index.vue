<script setup lang="ts">
import { toast } from 'vue-sonner'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: ['estructura_org_ver', 'grupos_trabajo_ver'],
})

const router = useRouter()
const { $api } = useNuxtApp()
const { hasAnyPermission } = usePermissions()

const kindOpts = useOrgWorkGroupKindOptions()

interface WorkGroupRow {
  id: number
  name: string
  code: string | null
  group_kind?: string | null
  description?: string | null
  is_active: boolean
  members_count?: number
}

const rows = ref<WorkGroupRow[]>([])
const loading = ref(true)

function kindLabel(kind: string | null | undefined): string {
  if (!kind) {
    return '—'
  }
  return kindOpts.labelForValue(kind)
}

async function load() {
  loading.value = true
  try {
    const res = await $api<{ data: WorkGroupRow[] }>('/organizational-structure/org-work-groups', {
      query: { per_page: 200 },
    })
    rows.value = res.data
  } catch {
    toast.error('No se pudieron cargar los grupos')
    rows.value = []
  } finally {
    loading.value = false
  }
}

async function softDeleteRow(id: number) {
  if (!hasAnyPermission(['grupos_trabajo_eliminar', 'estructura_org_editar'])) {
    toast.error('Sin permiso para eliminar')
    return
  }
  if (!confirm('¿Eliminar este grupo? (se conserva en historial)')) {
    return
  }
  try {
    await $api(`/organizational-structure/org-work-groups/${id}`, { method: 'DELETE' })
    toast.success('Grupo eliminado')
    await load()
  } catch (e: any) {
    toast.error(e?.data?.message || 'No se pudo eliminar')
  }
}

onMounted(async () => {
  await kindOpts.fetchOptions()
  await load()
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-2xl font-bold tracking-tight">
          Grupos de trabajo y comités
        </h2>
        <div class="flex flex-wrap gap-2">
          <Button variant="outline" class="shrink-0" @click="router.push('/settings/organizational-structure')">
            <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
            Volver
          </Button>
          <PermissionGate :any-permission="['estructura_org_editar', 'grupos_trabajo_crear']">
            <Button class="shrink-0" @click="router.push('/settings/organizational-structure/work-groups/create')">
              <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
              Nuevo grupo
            </Button>
          </PermissionGate>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Listado de grupos y comités</CardTitle>
          <CardDescription class="leading-relaxed">
            Equipos transversales (comités de archivo, crédito, riesgos, seguridad de la información, etc.) con integrantes de distintas áreas.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div v-if="loading" class="flex justify-center py-8">
            <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
          <div v-else-if="rows.length === 0" class="py-12 text-center text-muted-foreground leading-relaxed">
            No hay grupos registrados.
          </div>
          <div v-else class="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead class="text-center">
                    Miembros
                  </TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead class="text-right">
                    Acciones
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <TableRow v-for="g in rows" :key="g.id">
                  <TableCell class="font-medium">
                    {{ g.name }}
                  </TableCell>
                  <TableCell class="text-muted-foreground">
                    {{ g.code ?? '—' }}
                  </TableCell>
                  <TableCell class="text-sm">
                    {{ kindLabel(g.group_kind) }}
                  </TableCell>
                  <TableCell class="text-center tabular-nums">
                    {{ g.members_count ?? 0 }}
                  </TableCell>
                  <TableCell>
                    <Badge :variant="g.is_active ? 'default' : 'secondary'">
                      {{ g.is_active ? 'Activo' : 'Inactivo' }}
                    </Badge>
                  </TableCell>
                  <TableCell class="text-right">
                    <div class="flex justify-end gap-1">
                      <PermissionGate :any-permission="['estructura_org_editar', 'grupos_trabajo_editar']">
                        <Button
                          variant="outline"
                          size="sm"
                          class="h-8 gap-1.5 px-2 text-xs"
                          @click="router.push(`/settings/organizational-structure/work-groups/${g.id}/edit`)"
                        >
                          Editar
                        </Button>
                      </PermissionGate>
                      <PermissionGate :any-permission="['estructura_org_editar', 'grupos_trabajo_eliminar']">
                        <Button
                          variant="destructive"
                          size="sm"
                          class="h-8 gap-1.5 px-2 text-xs"
                          @click="softDeleteRow(g.id)"
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
