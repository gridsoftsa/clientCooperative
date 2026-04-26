<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { Role, Permission } from '~/types/role'
import {
  PERMISSION_CATEGORY_LABELS,
  formatPermissionDisplayName,
  sortPermissionCategoryKeys,
} from '~/constants/permission-labels'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'roles_editar'
})

const { $api } = useNuxtApp()
const route = useRoute()
const router = useRouter()
const { refetchUserSilently } = useAuth()
const roleId = route.params.id as string

const formData = ref({
  name: '',
  permissions: [] as string[],
})

const role = ref<Role | null>(null)
const permissions = ref<Permission[]>([])
const loading = ref(false)
const saving = ref(false)

const groupedPermissions = computed(() => {
  const groups: Record<string, Permission[]> = {}
  for (const p of permissions.value) {
    const category = p.name.split('_')[0] ?? 'otros'
    if (!groups[category]) groups[category] = []
    groups[category].push(p)
  }
  return groups
})

const orderedCategoryKeys = computed(() =>
  sortPermissionCategoryKeys(Object.keys(groupedPermissions.value)),
)

const getCategoryLabel = (key: string) => PERMISSION_CATEGORY_LABELS[key] ?? key

const openCategories = ref<Record<string, boolean>>({})

const collapseAll = () => {
  openCategories.value = Object.fromEntries(
    Object.keys(groupedPermissions.value).map((c) => [c, false]),
  )
}

const setCategoryOpen = (category: string, open: boolean) => {
  openCategories.value = { ...openCategories.value, [category]: open }
}

const togglePermission = (name: string, checked: boolean) => {
  if (checked) {
    if (!formData.value.permissions.includes(name)) {
      formData.value.permissions = [...formData.value.permissions, name]
    }
  } else {
    formData.value.permissions = formData.value.permissions.filter(p => p !== name)
  }
}

const toggleCategory = (category: string) => {
  const list = groupedPermissions.value[category] ?? []
  const allSelected = list.every(p => formData.value.permissions.includes(p.name))
  if (allSelected) {
    formData.value.permissions = formData.value.permissions.filter(
      p => !list.some(l => l.name === p)
    )
  } else {
    const toAdd = list.filter(p => !formData.value.permissions.includes(p.name)).map(p => p.name)
    formData.value.permissions = [...formData.value.permissions, ...toAdd]
  }
}

function normalizePermissionNames(raw: unknown): string[] {
  if (!Array.isArray(raw)) return []
  return raw
    .map((p) => (typeof p === 'string' ? p : (p as { name?: string })?.name))
    .filter((name): name is string => typeof name === 'string' && name.length > 0)
}

const fetchRole = async () => {
  loading.value = true
  try {
    const response = await $api<{ data: Role }>(`/roles/${roleId}`)
    role.value = response.data
    const permissionNames = normalizePermissionNames(response.data.permissions)
    formData.value = {
      name: response.data.name,
      permissions: permissionNames,
    }
  } catch (error) {
    console.error('Error fetching role:', error)
    toast.error('Error al cargar el rol')
    router.push('/settings/roles')
  } finally {
    loading.value = false
  }
}

const fetchPermissions = async () => {
  try {
    const res = await $api<{ data: Permission[] }>('/roles/permissions')
    permissions.value = res.data
  } catch (error) {
    console.error('Error al cargar permisos:', error)
    toast.error('Error al cargar permisos')
  }
}

const handleSubmit = async () => {
  if (!formData.value.name.trim()) {
    toast.error('El nombre del rol es requerido')
    return
  }
  saving.value = true
  try {
    await $api(`/roles/${roleId}`, {
      method: 'PUT',
      body: { name: formData.value.name, permissions: formData.value.permissions },
    })
    await refetchUserSilently()
    toast.success('Rol actualizado correctamente')
    router.push('/settings/roles')
  } catch (error: any) {
    const message = error?.data?.message || error?.data?.errors?.name?.[0] || 'Error al actualizar el rol'
    toast.error(message)
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await Promise.all([fetchRole(), fetchPermissions()])
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">Editar Rol</h2>
        <p v-if="role" class="text-muted-foreground">Modifica el rol: {{ role.name }}</p>
      </div>
      <Button variant="outline" @click="router.back()">
        <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
        Volver
      </Button>
    </div>

    <Card v-if="loading">
      <CardContent class="p-6">
        <div class="flex items-center justify-center">
          <Icon name="i-lucide-loader-2" class="h-6 w-6 animate-spin" />
        </div>
      </CardContent>
    </Card>

    <form v-else-if="role" @submit.prevent="handleSubmit">
      <div class="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Información del Rol</CardTitle>
            <CardDescription>Información básica del rol</CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div>
              <Label for="name">Nombre del Rol *</Label>
              <Input
                id="name"
                v-model="formData.name"
                required
                placeholder="Ej: moderador, editor..."
                :disabled="['admin', 'user'].includes(role.name)"
              />
              <p v-if="['admin', 'user'].includes(role.name)" class="text-sm text-muted-foreground mt-1">
                Este es un rol del sistema y no se puede modificar su nombre
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Permisos</CardTitle>
              <CardDescription>Selecciona los permisos que tendrá este rol</CardDescription>
            </div>
            <Button type="button" variant="outline" size="sm" @click="collapseAll">
              <Icon name="i-lucide-chevrons-up-down" class="mr-2 h-4 w-4" />
              Contraer todo
            </Button>
          </CardHeader>
          <CardContent>
            <div class="space-y-2">
              <Collapsible
                v-for="category in orderedCategoryKeys"
                :key="category"
                :open="openCategories[category] ?? true"
                class="group/perm border rounded-lg"
                @update:open="(v) => setCategoryOpen(category, v)"
              >
                <div class="flex items-center justify-between px-4 py-2 bg-muted/50 rounded-t-lg">
                  <CollapsibleTrigger as-child>
                    <button
                      type="button"
                      class="flex items-center gap-2 w-full text-left font-semibold hover:opacity-80"
                    >
                      <Icon
                        name="i-lucide-chevron-down"
                        class="h-4 w-4 transition-transform duration-200 group-data-[state=open]/perm:rotate-180"
                      />
                      {{ getCategoryLabel(category) }}
                      <Badge variant="secondary" class="ml-2">
                        {{ (groupedPermissions[category] ?? []).filter(p => formData.permissions.includes(p.name)).length }}/{{ (groupedPermissions[category] ?? []).length }}
                      </Badge>
                    </button>
                  </CollapsibleTrigger>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    @click.stop="toggleCategory(category)"
                  >
                    {{ (groupedPermissions[category] ?? []).every(p => formData.permissions.includes(p.name)) ? 'Deseleccionar' : 'Seleccionar' }} todos
                  </Button>
                </div>
                <CollapsibleContent>
                  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-4 border-t">
                    <div
                      v-for="p in groupedPermissions[category] ?? []"
                      :key="p.id"
                      class="flex items-center space-x-2"
                    >
                      <Checkbox
                        :id="`permission-${p.id}`"
                        :model-value="formData.permissions.includes(p.name)"
                        @update:model-value="(v: boolean | 'indeterminate') => togglePermission(p.name, v === true)"
                      />
                      <Label :for="`permission-${p.id}`" class="font-normal cursor-pointer text-sm">
                        {{ formatPermissionDisplayName(p.name) }}
                      </Label>
                    </div>
                  </div>
                </CollapsibleContent>
              </Collapsible>

              <p v-if="Object.keys(groupedPermissions).length === 0" class="text-center py-8 text-muted-foreground">
                No hay permisos disponibles
              </p>
            </div>
          </CardContent>
        </Card>

        <div class="flex justify-end gap-4">
          <Button type="button" variant="outline" @click="router.back()">Cancelar</Button>
          <Button type="submit" :disabled="saving">
            <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
            {{ saving ? 'Guardando...' : 'Actualizar Rol' }}
          </Button>
        </div>
      </div>
    </form>
    </div>
  </SettingsLayout>
</template>
