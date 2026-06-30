<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { Permission, RoleTemplate } from '~/types/role'

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
    <div class="flex w-full flex-col gap-4">
      <div class="flex items-center justify-between">
        <div>
          <h2 class="text-2xl font-bold tracking-tight">
            Crear Nuevo Rol
          </h2>
          <p class="text-muted-foreground">
            Define un nuevo rol y asigna sus permisos
          </p>
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
                <p class="mt-1 text-sm text-muted-foreground">
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
                <p v-if="selectedTemplateDescription" class="text-sm leading-relaxed text-muted-foreground">
                  {{ selectedTemplateDescription }}
                </p>
                <p v-else class="text-sm leading-relaxed text-muted-foreground">
                  Al elegir una plantilla se reemplazan los permisos seleccionados por los de esa plantilla.
                  Puedes ajustarlos después con el buscador de abajo.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Permisos</CardTitle>
              <CardDescription>
                Busca por nombre o módulo (usuarios, radicación, reportes…). Cada permiso muestra su nombre legible y el identificador técnico.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SettingsRolePermissionsPicker
                v-model="formData.permissions"
                :permissions="permissions"
                :loading="loading"
              />
            </CardContent>
          </Card>

          <div class="flex justify-end gap-4">
            <Button type="button" variant="outline" @click="router.back()">
              Cancelar
            </Button>
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
