<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { Permission, RoleTemplate } from '~/types/role'
import {
  PERMISSION_CATEGORY_LABELS,
  PERMISSION_CATEGORY_SECTION_TITLES,
  formatPermissionDisplayName,
  groupRadicacionPermissions,
  sortPermissionCategoryKeys,
} from '~/constants/permission-labels'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'roles_crear'
})

const { $api } = useNuxtApp()
const router = useRouter()

const formData = ref({
  name: '',
  permissions: [] as string[],
})

const permissions = ref<Permission[]>([])
const templates = ref<RoleTemplate[]>([])
const selectedTemplateKey = ref<string>('__none__')
const loading = ref(false)
const saving = ref(false)

const selectedTemplateDescription = computed(() => {
  if (selectedTemplateKey.value === '__none__') {
    return null
  }
  return templates.value.find(t => t.key === selectedTemplateKey.value)?.description ?? null
})

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

const radicacionSubgroups = computed(() =>
  groupRadicacionPermissions(groupedPermissions.value['radicacion'] ?? []),
)

const getCategoryLabel = (key: string) =>
  PERMISSION_CATEGORY_SECTION_TITLES[key] ?? PERMISSION_CATEGORY_LABELS[key] ?? key

const openCategories = ref<Record<string, boolean>>({})

const collapseAll = () => {
  openCategories.value = Object.fromEntries(
    Object.keys(groupedPermissions.value).map((c) => [c, false]),
  )
}

const expandAll = () => {
  openCategories.value = Object.fromEntries(
    Object.keys(groupedPermissions.value).map((c) => [c, true]),
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
      p => !list.some(l => l.name === p),
    )
  } else {
    const toAdd = list.filter(p => !formData.value.permissions.includes(p.name)).map(p => p.name)
    formData.value.permissions = [...formData.value.permissions, ...toAdd]
  }
}

function countSelectedInList(list: { name: string }[]): number {
  return list.filter(p => formData.value.permissions.includes(p.name)).length
}

function applyRoleTemplatePermissions(templateKey: string) {
  const template = templates.value.find(t => t.key === templateKey)
  if (!template) {
    return
  }
  const allowed = new Set(permissions.value.map(p => p.name))
  formData.value.permissions = template.permissions.filter(p => allowed.has(p))
  toast.success(`Permisos cargados desde «${template.label}»`)
}

function onRoleTemplatePicked(value: unknown) {
  const key = typeof value === 'string' ? value : String(value ?? '')
  selectedTemplateKey.value = key
  if (key === '__none__') {
    return
  }
  applyRoleTemplatePermissions(key)
}

const fetchPermissionsAndTemplates = async () => {
  loading.value = true
  try {
    const [permRes, tplRes] = await Promise.all([
      $api<{ data: Permission[] }>('/roles/permissions'),
      $api<{ data: RoleTemplate[] }>('/roles/templates'),
    ])
    permissions.value = permRes.data
    templates.value = tplRes.data
  } catch (error) {
    console.error('Error al cargar permisos o plantillas:', error)
    toast.error('Error al cargar permisos o plantillas')
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  if (!formData.value.name.trim()) {
    toast.error('El nombre del rol es requerido')
    return
  }
  saving.value = true
  try {
    await $api('/roles', {
      method: 'POST',
      body: { name: formData.value.name, permissions: formData.value.permissions },
    })
    toast.success('Rol creado correctamente')
    router.push('/settings/roles')
  } catch (error: any) {
    const message = error?.data?.message || error?.data?.errors?.name?.[0] || 'Error al crear el rol'
    toast.error(message)
  } finally {
    saving.value = false
  }
}

onMounted(() => fetchPermissionsAndTemplates())
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">Crear Nuevo Rol</h2>
        <p class="text-muted-foreground">Define un nuevo rol y asigna sus permisos</p>
      </div>
      <Button variant="outline" @click="router.back()">
        <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
        Volver
      </Button>
    </div>

    <form @submit.prevent="handleSubmit">
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
                placeholder="Ej: moderador, editor, supervisor..."
              />
              <p class="text-sm text-muted-foreground mt-1">
                El nombre debe ser único y en minúsculas (ej: moderador, editor)
              </p>
            </div>

            <div v-if="!loading && templates.length > 0" class="space-y-2">
              <Label for="role-template">Plantilla (opcional)</Label>
              <Select
                id="role-template"
                :model-value="selectedTemplateKey"
                @update:model-value="onRoleTemplatePicked"
              >
                <SelectTrigger class="w-full max-w-md">
                  <SelectValue placeholder="Elegir plantilla de permisos" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">
                    Sin plantilla (elegir permisos manualmente)
                  </SelectItem>
                  <SelectItem
                    v-for="tpl in templates"
                    :key="tpl.key"
                    :value="tpl.key"
                  >
                    {{ tpl.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <p v-if="selectedTemplateDescription" class="text-sm text-muted-foreground leading-relaxed">
                {{ selectedTemplateDescription }}
              </p>
              <p v-else class="text-sm text-muted-foreground leading-relaxed">
                Al elegir una plantilla se reemplazan los permisos seleccionados por los de esa plantilla
                (puede ajustarlos después en la lista de abajo). El nombre del rol no cambia.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
            <div class="min-w-0 flex-1">
              <CardTitle>Permisos</CardTitle>
              <CardDescription>
                Se aplican al pulsar «Crear rol». Las secciones empiezan contraídas; el resumen muestra cuántos permisos activaste en cada una.
              </CardDescription>
            </div>
            <div class="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" @click="expandAll">
                <Icon name="i-lucide-chevrons-down" class="mr-2 h-4 w-4" />
                Expandir todo
              </Button>
              <Button type="button" variant="outline" size="sm" @click="collapseAll">
                <Icon name="i-lucide-chevrons-up" class="mr-2 h-4 w-4" />
                Contraer todo
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div v-if="loading" class="flex items-center justify-center py-8">
              <Icon name="i-lucide-loader-2" class="h-6 w-6 animate-spin" />
            </div>

            <div v-else class="space-y-2">
              <Collapsible
                v-for="category in orderedCategoryKeys"
                :key="category"
                :open="openCategories[category] ?? false"
                class="group/perm border rounded-lg"
                @update:open="(v: boolean) => setCategoryOpen(category, v)"
              >
                <div class="flex items-center justify-between px-4 py-2 bg-muted/50 rounded-t-lg">
                  <CollapsibleTrigger as-child>
                    <button
                      type="button"
                      class="flex min-w-0 flex-1 items-center gap-2 text-left font-semibold hover:opacity-80"
                    >
                      <Icon
                        name="i-lucide-chevron-down"
                        class="h-4 w-4 shrink-0 transition-transform duration-200 group-data-[state=open]/perm:rotate-180"
                      />
                      <span class="min-w-0 truncate">{{ getCategoryLabel(category) }}</span>
                      <Badge variant="secondary" class="ml-1 shrink-0 tabular-nums">
                        {{ countSelectedInList(groupedPermissions[category] ?? []) }}/{{ (groupedPermissions[category] ?? []).length }} activos
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
                  <div v-if="category === 'radicacion'" class="divide-y border-t">
                    <div
                      v-for="sub in radicacionSubgroups"
                      :key="sub.key"
                      class="px-4 py-3"
                    >
                      <div class="mb-3 flex flex-wrap items-center justify-between gap-2">
                        <p class="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                          {{ sub.label }}
                        </p>
                        <Badge variant="outline" class="tabular-nums text-xs font-normal">
                          {{ countSelectedInList(sub.items) }}/{{ sub.items.length }} activos
                        </Badge>
                      </div>
                      <div class="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3">
                        <div
                          v-for="p in sub.items"
                          :key="p.id"
                          class="flex items-center space-x-2"
                        >
                          <Checkbox
                            :id="`permission-${p.id}`"
                            :model-value="formData.permissions.includes(p.name)"
                            @update:model-value="(v: boolean | 'indeterminate') => togglePermission(p.name, v === true)"
                          />
                          <Label :for="`permission-${p.id}`" class="cursor-pointer text-sm font-normal">
                            {{ formatPermissionDisplayName(p.name) }}
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div v-else class="grid grid-cols-1 gap-2 border-t p-4 md:grid-cols-2 lg:grid-cols-3">
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
                      <Label :for="`permission-${p.id}`" class="cursor-pointer text-sm font-normal">
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
            {{ saving ? 'Guardando...' : 'Crear Rol' }}
          </Button>
        </div>
      </div>
    </form>
    </div>
  </SettingsLayout>
</template>
