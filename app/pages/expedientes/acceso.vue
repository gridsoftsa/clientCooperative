<script setup lang="ts">
import { toast } from 'vue-sonner'
import {
  ARCHIVAL_FILE_ACCESS_GRANT_PERMISSION_OPTIONS,
  ARCHIVAL_FILE_ACCESS_GRANT_STATUS_LABELS,
} from '~/constants/archival-access-grants'
import type { ArchivalAccessGrantScopeState } from '~/components/archival/ArchivalFileAccessGrantScopeFields.vue'
import type { ArchivalFileAccessGrant, ArchivalFileType } from '~/types/archival-file'
import {
  archivalAccessGrantEffectiveBadgeVariant,
  archivalAccessGrantEffectiveStatusLabel,
  archivalAccessGrantScopeLabel,
  archivalAccessGrantValidityLabel,
} from '~/utils/archival-access-grant-display'

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

const statusFilter = ref<'all' | 'active' | 'inactive'>('all')
const fileTypeFilter = ref('')

const dialogOpen = ref(false)
const editingId = ref<number | null>(null)

const form = reactive({
  grantable_type: 'role',
  grantable_id: '',
  permission: 'view',
  status: 'active',
})

const scopeForm = reactive<ArchivalAccessGrantScopeState>({
  archival_file_type_id: '',
  doc_series_id: '',
  doc_subseries_id: '',
  doc_document_type_id: '',
  archival_file_id: '',
  starts_at: '',
  ends_at: '',
})

const permissionOptions = ARCHIVAL_FILE_ACCESS_GRANT_PERMISSION_OPTIONS

function grantStatusLabel(status: string): string {
  return ARCHIVAL_FILE_ACCESS_GRANT_STATUS_LABELS[status] ?? status
}

function isoToDateInput(value?: string | null): string {
  if (!value) {
    return ''
  }

  return value.slice(0, 10)
}

function buildGrantQuery(): Record<string, string | number> {
  const query: Record<string, string | number> = {}

  if (statusFilter.value !== 'all') {
    query.status = statusFilter.value
  }

  if (fileTypeFilter.value) {
    query.archival_file_type_id = Number(fileTypeFilter.value)
  }

  return query
}

async function loadAll() {
  loading.value = true

  try {
    const [grantsData, typesData, rolesRes, usersRes] = await Promise.all([
      archivalApi.fetchAccessGrants(buildGrantQuery()),
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

function resetScopeForm() {
  scopeForm.archival_file_type_id = ''
  scopeForm.doc_series_id = ''
  scopeForm.doc_subseries_id = ''
  scopeForm.doc_document_type_id = ''
  scopeForm.archival_file_id = ''
  scopeForm.starts_at = ''
  scopeForm.ends_at = ''
}

function resetForm() {
  editingId.value = null
  form.grantable_type = 'role'
  form.grantable_id = ''
  form.permission = 'view'
  form.status = 'active'
  resetScopeForm()
}

function openCreate() {
  resetForm()
  dialogOpen.value = true
}

function openEdit(grant: ArchivalFileAccessGrant) {
  editingId.value = grant.id
  form.grantable_type = grant.grantable_type
  form.grantable_id = String(grant.grantable_id)
  form.permission = grant.permission
  form.status = grant.status
  scopeForm.archival_file_type_id = grant.archival_file_type_id ? String(grant.archival_file_type_id) : ''
  scopeForm.doc_series_id = grant.doc_series_id ? String(grant.doc_series_id) : ''
  scopeForm.doc_subseries_id = grant.doc_subseries_id ? String(grant.doc_subseries_id) : ''
  scopeForm.doc_document_type_id = grant.doc_document_type_id ? String(grant.doc_document_type_id) : ''
  scopeForm.archival_file_id = grant.archival_file_id ? String(grant.archival_file_id) : ''
  scopeForm.starts_at = isoToDateInput(grant.starts_at)
  scopeForm.ends_at = isoToDateInput(grant.ends_at)
  dialogOpen.value = true
}

function buildPayload(): Record<string, unknown> {
  return {
    grantable_type: form.grantable_type,
    grantable_id: Number(form.grantable_id),
    permission: form.permission,
    status: form.status,
    archival_file_type_id: scopeForm.archival_file_type_id ? Number(scopeForm.archival_file_type_id) : null,
    doc_series_id: scopeForm.doc_series_id ? Number(scopeForm.doc_series_id) : null,
    doc_subseries_id: scopeForm.doc_subseries_id ? Number(scopeForm.doc_subseries_id) : null,
    doc_document_type_id: scopeForm.doc_document_type_id ? Number(scopeForm.doc_document_type_id) : null,
    archival_file_id: scopeForm.archival_file_id ? Number(scopeForm.archival_file_id) : null,
    starts_at: scopeForm.starts_at || null,
    ends_at: scopeForm.ends_at || null,
  }
}

async function handleSave() {
  if (!form.grantable_id) {
    toast.error('Seleccione el sujeto del permiso.')
    return
  }

  saving.value = true

  try {
    if (editingId.value) {
      await archivalApi.updateAccessGrant(editingId.value, buildPayload())
      toast.success('Permiso actualizado.')
    }
    else {
      await archivalApi.createAccessGrant(buildPayload())
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

watch([statusFilter, fileTypeFilter], () => {
  void loadAll()
})

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
          Permisos granulares por rol, usuario, tipo de expediente y alcance TRD.
        </p>
      </div>
      <Button @click="openCreate">
        <Icon name="i-lucide-plus" class="mr-2 size-4" />
        Nuevo permiso
      </Button>
    </div>

    <Card>
      <CardHeader class="space-y-4">
        <div class="grid gap-3 md:grid-cols-2">
          <div class="space-y-2">
            <Label>Filtrar por estado del permiso</Label>
            <Select v-model="statusFilter">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  Todos
                </SelectItem>
                <SelectItem value="active">
                  Activos
                </SelectItem>
                <SelectItem value="inactive">
                  Inactivos
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label>Filtrar por tipo de expediente</Label>
            <Select v-model="fileTypeFilter">
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
        </div>
      </CardHeader>
      <CardContent>
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
              <TableHead>Alcance</TableHead>
              <TableHead>Permiso</TableHead>
              <TableHead>Vigencia</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead class="text-right">
                Acciones
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow v-for="grant in grants" :key="grant.id">
              <TableCell>{{ grant.grantable_label }}</TableCell>
              <TableCell class="max-w-xs text-sm text-muted-foreground">
                {{ archivalAccessGrantScopeLabel(grant) }}
              </TableCell>
              <TableCell>{{ grant.permission_label }}</TableCell>
              <TableCell class="text-xs text-muted-foreground">
                {{ archivalAccessGrantValidityLabel(grant) }}
              </TableCell>
              <TableCell>
                <div class="flex flex-wrap gap-1">
                  <Badge :variant="archivalAccessGrantEffectiveBadgeVariant(grant)">
                    {{ archivalAccessGrantEffectiveStatusLabel(grant) }}
                  </Badge>
                  <Badge v-if="grant.status === 'inactive'" variant="outline">
                    {{ grantStatusLabel(grant.status) }}
                  </Badge>
                </div>
              </TableCell>
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
      <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{{ editingId ? 'Editar permiso' : 'Nuevo permiso' }}</DialogTitle>
          <DialogDescription>
            Restrinja consulta o descarga por tipo de expediente, serie, subserie o tipo documental.
          </DialogDescription>
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

          <ArchivalFileAccessGrantScopeFields
            :scope="scopeForm"
            :file-types="fileTypes"
            show-file-picker
          />

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
            <Label>Estado del permiso</Label>
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
            <p class="text-xs text-muted-foreground">
              Los permisos inactivos o vencidos no restringen el acceso. Solo los vigentes aplican la lista blanca.
            </p>
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
