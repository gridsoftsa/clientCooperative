<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { Permission } from '~/types/role'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'permisos_editar'
})

const { $api } = useNuxtApp()
const route = useRoute()
const router = useRouter()
const id = route.params.id as string

const form = ref({
  name: '',
  guard_name: 'web',
  is_active: true,
})
const loading = ref(true)
const saving = ref(false)

async function fetchPermission() {
  loading.value = true
  try {
    const res = await $api<{ data: Permission }>(`/permissions/${id}`)
    const d = res.data
    form.value = {
      name: d.name,
      guard_name: d.guard_name || 'web',
      is_active: d.is_active !== false,
    }
  } catch {
    toast.error('Error al cargar el permiso')
    router.push('/admin/permissions')
  } finally {
    loading.value = false
  }
}

const handleSubmit = async () => {
  if (!form.value.name.trim()) {
    toast.error('El nombre es requerido')
    return
  }

  saving.value = true
  try {
    await $api(`/permissions/${id}`, {
      method: 'PUT',
      body: {
        name: form.value.name.trim(),
        guard_name: form.value.guard_name,
        is_active: form.value.is_active,
      },
    })
    toast.success('Permiso actualizado correctamente')
    router.push('/admin/permissions')
  } catch (error: any) {
    const msg = error?.data?.message || error?.data?.errors?.name?.[0] || 'Error al actualizar'
    toast.error(msg)
  } finally {
    saving.value = false
  }
}

onMounted(() => fetchPermission())
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">Editar Permiso</h2>
        <p class="text-muted-foreground">Modifica el permiso</p>
      </div>
      <Button variant="outline" @click="router.back()">
        <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
        Volver
      </Button>
    </div>

    <div v-if="loading" class="flex justify-center py-12">
      <Icon name="i-lucide-loader-2" class="h-6 w-6 animate-spin" />
    </div>

    <form v-else @submit.prevent="handleSubmit">
      <Card>
        <CardHeader>
          <CardTitle>Información del Permiso</CardTitle>
          <CardDescription>Nombre y estado</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div>
            <Label for="name">Nombre *</Label>
            <Input id="name" v-model="form.name" required placeholder="users.edit" />
          </div>
          <div>
            <Label for="guard">Guard</Label>
            <Input id="guard" v-model="form.guard_name" placeholder="web" />
          </div>
          <div class="flex items-center gap-2">
            <Switch id="is_active" :checked="form.is_active" @update:checked="(v: boolean) => form.is_active = v" />
            <Label for="is_active" class="font-normal">Activo</Label>
          </div>
        </CardContent>
      </Card>

      <div class="flex justify-end gap-4 mt-6">
        <Button type="button" variant="outline" @click="router.back()">Cancelar</Button>
        <Button type="submit" :disabled="saving">
          <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
          {{ saving ? 'Guardando...' : 'Actualizar' }}
        </Button>
      </div>
    </form>
  </div>
</template>
