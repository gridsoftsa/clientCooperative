<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { ArchivalFileAccessGrant, ArchivalFileType } from '~/types/archival-file'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'expedientes_acceso_gestionar',
})

const archivalApi = useArchivalFileApi()
const { $api } = useNuxtApp()
const api = $api as <T>(url: string, options?: Record<string, unknown>) => Promise<T>

const loading = ref(true)
const saving = ref(false)
const grants = ref<ArchivalFileAccessGrant[]>([])
const fileTypes = ref<ArchivalFileType[]>([])
const roles = ref<Array<{ id: number, name: string }>>([])
const users = ref<Array<{ id: number, name: string }>>([])

const dialogOpen = ref(false)
const editingId = ref<number | null>(null)

const form = reactive({
  grantable_type: 'role',
  grantable_id: '',
  archival_file_type_id: '',
  permission: 'view',
  status: 'active',
})

const permissionOptions = [
  { value: 'view', label: 'Ver' },
  { value: 'download', label: 'Descargar' },
  { value: 'edit', label: 'Editar' },
  { value: 'attach', label: 'Anexar documentos' },
  { value: 'close', label: 'Cerrar expediente' },
  { value: 'transfer', label: 'Transferir' },
]

async function loadAll() {
  loading.value = true

  try {
    const [grantsData, typesData, rolesRes, usersRes] = await Promise.all([
      archivalApi.fetchAccessGrants(),
      archivalApi.fetchFileTypes(false),
      api<{ data: Array<{ id: number, name: string }> }>('/settings/roles'),
      api<{ data: Array<{ id: number, name: string }> }>('/settings/users', { query: { per_page: 100 } }),
    ])
    grants.value = grantsData
    fileTypes.value = typesData
    roles.value = rolesRes.data ?? []
    users.value = usersRes.data ?? []
  }
  catch {
    toast.error('No se pudieron cargar los permisos de acceso.')
  }
  finally {
    loading.value = false
  }
}

function resetForm() {
  editingId.value = null
  form.grantable_type = 'role'
  form.grantable_id = ''
  form.archival_file_type_id = ''
  form.permission = 'view'
  form.status = 'active'
}

function openCreate() {
  resetForm()
  dialogOpen.value = true
}

function openEdit(grant: ArchivalFileAccessGrant) {
  editingId.value = grant.id
  form.grantable_type = grant.grantable_type
  form.grantable_id = String(grant.grantable_id)
  form.archival_file_type_id = grant.archival_file_type_id ? String(grant.archival_file_type_id) : ''
  form.permission = grant.permission
  form.status = grant.status
  dialogOpen.value = true
}

async function handleSave() {
  if (!form.grantable_id) {
    toast.error('Seleccione el sujeto del permiso.')
    return
  }

  saving.value = true

  const payload: Record<string, unknown> = {
    grantable_type: form.grantable_type,
    grantable_id: Number(form.grantable_id),
    permission: form.permission,
    status: form.status,
    archival_file_type_id: form.archival_file_type_id ? Number(form.archival_file_type_id) : null,
  }

  try {
    if (editingId.value) {
      await archivalApi.updateAccessGrant(editingId.value, payload)
      toast.success('Permiso actualizado.')
    }
    else {
      await archivalApi.createAccessGrant(payload)
      toast.success('Permiso registrado.')
    }
    dialogOpen.value = false
    await loadAll()
  }
  catch {
    toast.error('No se pudo guardar el permiso.')
  }
  finally {
    saving.value = false
  }
}

async function handleDelete(id: number) {
  try {
    await archivalApi.deleteAccessGrant(id)
    toast.success('Permiso eliminado.')
    await loadAll()
  }
  catch {
    toast.error('No se pudo eliminar el permiso.')
  }
}

onMounted(() => loadAll())
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">
          Control de acceso documental
        </h1>
        <p class="text-sm text-muted-foreground">
          Permisos granulares por rol, usuario y tipo de expediente.
        </p>
      </div>
      <Button @click="openCreate">
        <Icon name="i-lucide-plus" class="mr-2 size-4" />
        Nuevo permiso
      </Button>
    </div>

    <Card>
      <CardContent class="pt-6">
        <div v-if="loading" class="py-10 text-center text-muted-foreground">
          Cargando permisos…
        </div>
        <div v-else-if="grants.length === 0" class="py-10 text-center text-muted-foreground">
          No hay permisos especiales registrados.
        </div>
        <Table v-else>
          <TableHeader>
            <TableRow>
              <TableHead>Sujeto</TableHead>
              <TableHead>Tipo expediente</TableHead>
              <TableHead>Permiso</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead class="text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="grant in grants" :key="grant.id">
              <TableCell>{{ grant.grantable_label }}</TableCell>
              <TableCell>{{ grant.file_type ?? 'Todos' }}</TableCell>
              <TableCell>{{ grant.permission_label }}</TableCell>
              <TableCell>{{ grant.status }}</TableCell>
              <TableCell class="text-right">
                <Button variant="ghost" size="sm" @click="openEdit(grant)">
                  Editar
                </Button>
                <Button variant="ghost" size="sm" class="text-destructive" @click="handleDelete(grant.id)">
                  Eliminar
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <Dialog v-model:open="dialogOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ editingId ? 'Editar permiso' : 'Nuevo permiso' }}</DialogTitle>
        </DialogHeader>
        <div class="space-y-4 py-2">
          <div class="space-y-2">
            <Label>Tipo de sujeto</Label>
            <Select v-model="form.grantable_type">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="role">
                  Rol
                </SelectItem>
                <SelectItem value="user">
                  Usuario
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label>{{ form.grantable_type === 'role' ? 'Rol' : 'Usuario' }}</Label>
            <Select v-model="form.grantable_id">
              <SelectTrigger>
                <SelectValue placeholder="Seleccione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="item in (form.grantable_type === 'role' ? roles : users)"
                  :key="item.id"
                  :value="String(item.id)"
                >
                  {{ item.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label>Tipo de expediente (opcional)</Label>
            <Select v-model="form.archival_file_type_id">
              <SelectTrigger>
                <SelectValue placeholder="Todos los tipos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">
                  Todos
                </SelectItem>
                <SelectItem
                  v-for="type in fileTypes"
                  :key="type.id"
                  :value="String(type.id)"
                >
                  {{ type.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label>Permiso</Label>
            <Select v-model="form.permission">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="option in permissionOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label>Estado</Label>
            <Select v-model="form.status">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">
                  Activo
                </SelectItem>
                <SelectItem value="inactive">
                  Inactivo
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="dialogOpen = false">
            Cancelar
          </Button>
          <Button :disabled="saving" @click="handleSave">
            {{ saving ? 'Guardando…' : 'Guardar' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
