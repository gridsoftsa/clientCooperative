<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { Role } from '~/types/role'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'users.create'
})

const { $api } = useNuxtApp()
const router = useRouter()

const form = ref({
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
  sucursal_id: null as number | null,
  allowed_sucursal_ids: [] as number[],
  roles: [] as string[],
})

const roles = ref<Role[]>([])
const sucursales = ref<Array<{ id: number; name: string; code: string | null; is_main?: boolean }>>([])
const loading = ref(false)
const saving = ref(false)

const showAllowedSucursales = computed(() => form.value.roles.includes('admin') && !form.value.roles.includes('super_admin'))

const fetchSucursales = async () => {
  try {
    const res = await $api<{ data: typeof sucursales.value }>('/catalogs/sucursales')
    sucursales.value = res.data
  } catch {
    sucursales.value = []
  }
}

const fetchRoles = async () => {
  loading.value = true
  try {
    const res = await $api<{ data: Role[] }>('/roles', { query: { per_page: 100 } })
    roles.value = res.data
  } catch (error) {
    console.error('Error al cargar roles:', error)
    toast.error('Error al cargar roles')
  } finally {
    loading.value = false
  }
}

const toggleRole = (roleName: string, checked: boolean) => {
  if (checked) {
    if (!form.value.roles.includes(roleName)) {
      form.value.roles.push(roleName)
    }
  } else {
    const index = form.value.roles.indexOf(roleName)
    if (index > -1) {
      form.value.roles.splice(index, 1)
    }
  }
}

const handleSubmit = async () => {
  if (!form.value.name.trim() || !form.value.email.trim() || !form.value.password) {
    toast.error('Completa todos los campos requeridos')
    return
  }

  if (form.value.password !== form.value.password_confirmation) {
    toast.error('Las contraseñas no coinciden')
    return
  }

  if (form.value.password.length < 8) {
    toast.error('La contraseña debe tener al menos 8 caracteres')
    return
  }

  saving.value = true
  try {
    await $api('/users', {
      method: 'POST',
      body: {
        name: form.value.name,
        email: form.value.email,
        password: form.value.password,
        password_confirmation: form.value.password_confirmation,
        sucursal_id: form.value.sucursal_id || undefined,
        allowed_sucursal_ids: form.value.allowed_sucursal_ids,
        roles: form.value.roles,
      },
    })
    
    toast.success('Usuario creado correctamente')
    router.push('/admin/users')
  } catch (error: any) {
    console.error('Error saving user:', error)
    const message = error?.data?.message || error?.data?.errors?.email?.[0] || 'Error al crear el usuario'
    toast.error(message)
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  Promise.all([fetchRoles(), fetchSucursales()])
})
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">
          Crear Nuevo Usuario
        </h2>
        <p class="text-muted-foreground">
          Crea un nuevo usuario y asigna sus roles
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
            <CardTitle>Información del Usuario</CardTitle>
            <CardDescription>
              Información básica del usuario
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-4">
            <div>
              <Label for="name">Nombre *</Label>
              <Input
                id="name"
                v-model="form.name"
                required
                placeholder="Nombre completo"
              />
            </div>

            <div>
              <Label for="email">Email *</Label>
              <Input
                id="email"
                v-model="form.email"
                type="email"
                required
                placeholder="usuario@ejemplo.com"
              />
            </div>

            <div>
              <Label for="sucursal">Sucursal (pertenencia)</Label>
              <Select v-model="form.sucursal_id">
                <SelectTrigger id="sucursal">
                  <SelectValue placeholder="Seleccionar sucursal" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="s in sucursales" :key="s.id" :value="s.id">
                    {{ s.name }}{{ s.is_main ? ' (Principal)' : '' }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div class="grid grid-cols-2 gap-4">
              <div>
                <Label for="password">Contraseña *</Label>
                <PasswordInput
                  id="password"
                  v-model="form.password"
                  required
                  placeholder="Mínimo 8 caracteres"
                />
              </div>

              <div>
                <Label for="password_confirmation">Confirmar Contraseña *</Label>
                <PasswordInput
                  id="password_confirmation"
                  v-model="form.password_confirmation"
                  required
                  placeholder="Repite la contraseña"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card v-if="showAllowedSucursales">
          <CardHeader>
            <CardTitle>Sucursales permitidas (admin)</CardTitle>
            <CardDescription>
              Sucursales que este admin puede ver y gestionar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div class="space-y-2">
              <div
                v-for="s in sucursales"
                :key="s.id"
                class="flex items-center space-x-2"
              >
                <Checkbox
                  :id="`suc-${s.id}`"
                  :checked="form.allowed_sucursal_ids.includes(s.id)"
                  @update:checked="(checked: boolean) => {
                    if (checked) form.allowed_sucursal_ids.push(s.id)
                    else form.allowed_sucursal_ids = form.allowed_sucursal_ids.filter(id => id !== s.id)
                  }"
                />
                <Label :for="`suc-${s.id}`" class="font-normal cursor-pointer">
                  {{ s.name }}{{ s.is_main ? ' (Principal)' : '' }}
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Roles</CardTitle>
            <CardDescription>
              Selecciona los roles que tendrá este usuario
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div v-if="loading" class="flex items-center justify-center py-8">
              <Icon name="i-lucide-loader-2" class="h-6 w-6 animate-spin" />
            </div>

            <div v-else class="space-y-3">
              <div
                v-for="role in roles"
                :key="role.id"
                class="flex items-center space-x-2"
              >
                <Checkbox
                  :id="`role-${role.id}`"
                  :checked="form.roles.includes(role.name)"
                  @update:checked="(checked: boolean) => toggleRole(role.name, checked)"
                />
                <Label
                  :for="`role-${role.id}`"
                  class="font-normal cursor-pointer"
                >
                  {{ role.name }}
                  <Badge v-if="role.name === 'admin'" variant="default" class="ml-2">Sistema</Badge>
                </Label>
              </div>

              <div v-if="roles.length === 0" class="text-center py-8 text-muted-foreground">
                No hay roles disponibles
              </div>
            </div>
          </CardContent>
        </Card>

        <div class="flex justify-end gap-4">
          <Button type="button" variant="outline" @click="router.back()">
            Cancelar
          </Button>
          <Button type="submit" :disabled="saving">
            <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
            {{ saving ? 'Guardando...' : 'Crear Usuario' }}
          </Button>
        </div>
      </div>
    </form>
  </div>
</template>
