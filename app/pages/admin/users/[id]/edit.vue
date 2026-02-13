<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { User } from '~/types/user'
import type { Role } from '~/types/role'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'users.edit'
})

const { $api } = useNuxtApp()
const route = useRoute()
const router = useRouter()
const { user: authUser } = useAuth()

const userId = route.params.id as string

const form = ref({
  name: '',
  email: '',
  password: '',
  password_confirmation: '',
  roles: [] as string[],
})

const user = ref<User | null>(null)
const roles = ref<Role[]>([])
const loading = ref(false)
const saving = ref(false)
const changePassword = ref(false)

const isOwnUser = computed(() => authUser.value?.id === parseInt(userId))

const fetchUser = async () => {
  loading.value = true
  try {
    const response = await $api<{ data: User }>(`/users/${userId}`)
    user.value = response.data
    form.value = {
      name: response.data.name,
      email: response.data.email,
      password: '',
      password_confirmation: '',
      roles: response.data.roles || [],
    }
  } catch (error) {
    console.error('Error fetching user:', error)
    toast.error('Error al cargar el usuario')
    router.push('/admin/users')
  } finally {
    loading.value = false
  }
}

const fetchRoles = async () => {
  try {
    const res = await $api<{ data: Role[] }>('/roles', { query: { per_page: 100 } })
    roles.value = res.data
  } catch (error) {
    console.error('Error al cargar roles:', error)
    toast.error('Error al cargar roles')
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
  if (!form.value.name.trim() || !form.value.email.trim()) {
    toast.error('Completa todos los campos requeridos')
    return
  }

  if (changePassword.value) {
    if (!form.value.password) {
      toast.error('La contraseña es requerida')
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
  }

  saving.value = true
  try {
    const body: any = {
      name: form.value.name,
      email: form.value.email,
      roles: form.value.roles,
    }

    if (changePassword.value && form.value.password) {
      body.password = form.value.password
      body.password_confirmation = form.value.password_confirmation
    }

    await $api(`/users/${userId}`, {
      method: 'PUT',
      body,
    })
    
    toast.success('Usuario actualizado correctamente')
    router.push('/admin/users')
  } catch (error: any) {
    console.error('Error saving user:', error)
    const message = error?.data?.message || error?.data?.errors?.email?.[0] || 'Error al actualizar el usuario'
    toast.error(message)
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await Promise.all([fetchUser(), fetchRoles()])
})
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">
          Editar Usuario
        </h2>
        <p class="text-muted-foreground" v-if="user">
          Modifica el usuario: {{ user.name }}
        </p>
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

    <form v-else-if="user" @submit.prevent="handleSubmit">
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

            <div class="space-y-4">
              <div class="flex items-center space-x-2">
                <Switch
                  id="changePassword"
                  v-model:checked="changePassword"
                />
                <Label for="changePassword" class="font-normal">
                  Cambiar contraseña
                </Label>
              </div>

              <div v-if="changePassword" class="grid grid-cols-2 gap-4">
                <div>
                  <Label for="password">Nueva Contraseña *</Label>
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
            <div class="space-y-3">
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
            {{ saving ? 'Guardando...' : 'Actualizar Usuario' }}
          </Button>
        </div>
      </div>
    </form>
  </div>
</template>
