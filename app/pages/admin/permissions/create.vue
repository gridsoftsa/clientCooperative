<script setup lang="ts">
import { toast } from 'vue-sonner'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'permisos_crear'
})

const { $api } = useNuxtApp()
const router = useRouter()

const form = ref({
  name: '',
  guard_name: 'web',
  is_active: true,
})
const saving = ref(false)

const handleSubmit = async () => {
  if (!form.value.name.trim()) {
    toast.error('El nombre del permiso es requerido')
    return
  }

  saving.value = true
  try {
    await $api('/permissions', {
      method: 'POST',
      body: {
        name: form.value.name.trim(),
        guard_name: form.value.guard_name,
        is_active: form.value.is_active,
      },
    })
    toast.success('Permiso creado correctamente')
    router.push('/admin/permissions')
  } catch (error: any) {
    const msg = error?.data?.message || error?.data?.errors?.name?.[0] || 'Error al crear'
    toast.error(msg)
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">Crear Permiso</h2>
        <p class="text-muted-foreground">Define un nuevo permiso del sistema</p>
      </div>
      <Button variant="outline" @click="router.back()">
        <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
        Volver
      </Button>
    </div>

    <form @submit.prevent="handleSubmit">
      <Card>
        <CardHeader>
          <CardTitle>Información del Permiso</CardTitle>
          <CardDescription>Nombre único y estado del permiso</CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div>
            <Label for="name">Nombre *</Label>
            <Input
              id="name"
              v-model="form.name"
              required
              placeholder="Ej: reportes_exportar"
            />
            <p class="text-sm text-muted-foreground mt-1">Usa formato categoria_accion con guión bajo (ej: usuarios_editar, roles_ver)</p>
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
          {{ saving ? 'Guardando...' : 'Crear Permiso' }}
        </Button>
      </div>
    </form>
  </div>
</template>
