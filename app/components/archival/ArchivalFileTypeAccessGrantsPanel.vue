<script setup lang="ts">
import { toast } from 'vue-sonner'
import {
  ARCHIVAL_FILE_ACCESS_GRANT_PERMISSION_OPTIONS,
  ARCHIVAL_FILE_ACCESS_GRANT_STATUS_LABELS,
} from '~/constants/archival-access-grants'
import type { ArchivalFileAccessGrant } from '~/types/archival-file'

const props = defineProps<{
  fileTypeId: number
  fileTypeName: string
}>()

const emit = defineEmits<{
  'update:count': [count: number]
}>()

const archivalApi = useArchivalFileApi()

const loading = ref(true)
const saving = ref(false)
const grants = ref<ArchivalFileAccessGrant[]>([])
const roles = ref<Array<{ id: number, name: string }>>([])
const users = ref<Array<{ id: number, name: string, email?: string }>>([])

const dialogOpen = ref(false)
const editingId = ref<number | null>(null)

const form = reactive({
  grantable_type: 'role' as 'role' | 'user',
  grantable_id: '',
  permission: 'view' as ArchivalFileAccessGrant['permission'],
  status: 'active' as 'active' | 'inactive',
})

function grantStatusLabel(status: string): string {
  return ARCHIVAL_FILE_ACCESS_GRANT_STATUS_LABELS[status] ?? status
}

function grantSubjectLabel(grant: ArchivalFileAccessGrant): string {
  const kind = grant.grantable_type === 'role' ? 'Rol' : 'Usuario'

  return `${kind}: ${grant.grantable_label ?? `#${grant.grantable_id}`}`
}

async function loadGrants() {
  loading.value = true

  try {
    const [grantsData, options] = await Promise.all([
      archivalApi.fetchAccessGrants({ archival_file_type_id: props.fileTypeId }),
      archivalApi.fetchAccessGrantOptions(),
    ])

    grants.value = grantsData
    roles.value = options.roles
    users.value = options.users
    emit('update:count', grantsData.length)
  }
  catch {
    toast.error('No se pudieron cargar las reglas de acceso del tipo.')
  }
  finally {
    loading.value = false
  }
}

function resetForm() {
  editingId.value = null
  form.grantable_type = 'role'
  form.grantable_id = ''
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
  form.permission = grant.permission
  form.status = grant.status === 'inactive' ? 'inactive' : 'active'
  dialogOpen.value = true
}

async function handleSave() {
  if (!form.grantable_id) {
    toast.error('Seleccione el rol o usuario.')
    return
  }

  saving.value = true

  const payload: Record<string, unknown> = {
    grantable_type: form.grantable_type,
    grantable_id: Number(form.grantable_id),
    permission: form.permission,
    status: form.status,
    archival_file_type_id: props.fileTypeId,
  }

  try {
    if (editingId.value) {
      await archivalApi.updateAccessGrant(editingId.value, payload)
      toast.success('Regla de acceso actualizada.')
    }
    else {
      await archivalApi.createAccessGrant(payload)
      toast.success('Regla de acceso registrada.')
    }

    dialogOpen.value = false
    await loadGrants()
  }
  catch {
    toast.error('No se pudo guardar la regla de acceso.')
  }
  finally {
    saving.value = false
  }
}

async function handleDelete(id: number) {
  try {
    await archivalApi.deleteAccessGrant(id)
    toast.success('Regla de acceso eliminada.')
    await loadGrants()
  }
  catch {
    toast.error('No se pudo eliminar la regla de acceso.')
  }
}

watch(
  () => props.fileTypeId,
  () => loadGrants(),
  { immediate: true },
)
</script>

<template>
  <div class="space-y-4">
    <div class="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
      <p class="font-medium">
        Acceso restringido para «{{ fileTypeName }}»
      </p>
      <p class="mt-1 text-amber-900/90 dark:text-amber-100/90">
        Si registra reglas activas aquí, solo los roles o usuarios listados podrán ejercer el permiso indicado
        sobre expedientes de este tipo. Sin reglas activas, aplican los permisos generales del sistema
        (<code class="text-xs">expedientes_ver</code>, etc.).
      </p>
    </div>

    <div class="flex flex-wrap items-center justify-between gap-3">
      <p class="text-sm text-muted-foreground">
        Permisos documentales por rol o usuario para este tipo de expediente.
      </p>
      <div class="flex flex-wrap gap-2">
        <NuxtLink to="/expedientes/acceso">
          <Button variant="outline" size="sm" type="button">
            Control global
          </Button>
        </NuxtLink>
        <Button size="sm" type="button" @click="openCreate">
          <Icon name="i-lucide-plus" class="mr-1 size-4" />
          Nueva regla
        </Button>
      </div>
    </div>

    <div v-if="loading" class="py-10 text-center text-muted-foreground">
      Cargando reglas de acceso…
    </div>

    <div
      v-else-if="grants.length === 0"
      class="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground"
    >
      No hay reglas de acceso para este tipo. Los usuarios con permisos generales de expedientes
      podrán acceder según su rol en el sistema.
    </div>

    <div v-else class="overflow-x-auto rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Sujeto</TableHead>
            <TableHead>Permiso</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead class="text-right">
              Acciones
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          <TableRow v-for="grant in grants" :key="grant.id">
            <TableCell>{{ grantSubjectLabel(grant) }}</TableCell>
            <TableCell>{{ grant.permission_label ?? grant.permission }}</TableCell>
            <TableCell>
              <Badge :variant="grant.status === 'active' ? 'default' : 'secondary'">
                {{ grantStatusLabel(grant.status) }}
              </Badge>
            </TableCell>
            <TableCell class="text-right">
              <Button variant="ghost" size="sm" type="button" @click="openEdit(grant)">
                Editar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                type="button"
                class="text-destructive"
                @click="handleDelete(grant.id)"
              >
                Eliminar
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>

    <Dialog v-model:open="dialogOpen">
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{{ editingId ? 'Editar regla de acceso' : 'Nueva regla de acceso' }}</DialogTitle>
          <DialogDescription>
            Aplica solo al tipo «{{ fileTypeName }}».
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
                  <span v-if="form.grantable_type === 'user' && item.email" class="text-muted-foreground">
                    — {{ item.email }}
                  </span>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label>Permiso documental</Label>
            <Select v-model="form.permission">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="option in ARCHIVAL_FILE_ACCESS_GRANT_PERMISSION_OPTIONS"
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
          <Button variant="outline" type="button" @click="dialogOpen = false">
            Cancelar
          </Button>
          <Button type="button" :disabled="saving" @click="handleSave">
            {{ saving ? 'Guardando…' : 'Guardar' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
