<script setup lang="ts">
import { toast } from 'vue-sonner'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'sucursales.create',
})

const { $api } = useNuxtApp()
const router = useRouter()

const form = ref({
  name: '',
  code: '',
  address: '',
  phone: '',
  city: '',
  is_main: false,
  is_active: true,
})

const saving = ref(false)

async function handleSubmit() {
  if (!form.value.name.trim()) {
    toast.error('El nombre es obligatorio')
    return
  }
  saving.value = true
  try {
    await $api('/sucursales', {
      method: 'POST',
      body: {
        name: form.value.name,
        code: form.value.code || undefined,
        address: form.value.address || undefined,
        phone: form.value.phone || undefined,
        city: form.value.city || undefined,
        is_main: form.value.is_main,
        is_active: form.value.is_active,
      },
    })
    toast.success('Sucursal creada')
    router.push('/admin/sucursales')
  } catch (e: any) {
    toast.error(e?.data?.message || e?.data?.errors?.name?.[0] || 'Error al crear')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="w-full max-w-2xl flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">
          Nueva Sucursal
        </h2>
        <p class="text-muted-foreground">
          Registra una sede de la cooperativa
        </p>
      </div>
      <Button variant="outline" @click="router.back()">
        <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
        Volver
      </Button>
    </div>

    <Card>
      <CardContent class="pt-6">
        <form class="grid gap-4" @submit.prevent="handleSubmit">
          <div>
            <Label for="name">Nombre *</Label>
            <Input id="name" v-model="form.name" placeholder="Ej: Sede Principal" required />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <Label for="code">Código</Label>
              <Input id="code" v-model="form.code" placeholder="Ej: MATRIZ" />
            </div>
            <div>
              <Label for="city">Ciudad</Label>
              <Input id="city" v-model="form.city" placeholder="Ej: Bogotá D.C." />
            </div>
          </div>
          <div>
            <Label for="address">Dirección</Label>
            <Input id="address" v-model="form.address" placeholder="Dirección completa" />
          </div>
          <div>
            <Label for="phone">Teléfono</Label>
            <Input id="phone" v-model="form.phone" placeholder="Teléfono" />
          </div>
          <div class="flex items-center gap-4">
            <div class="flex items-center space-x-2">
              <Checkbox id="is_main" v-model:checked="form.is_main" />
              <Label for="is_main" class="font-normal">Sede principal (matriz)</Label>
            </div>
            <div class="flex items-center space-x-2">
              <Checkbox id="is_active" v-model:checked="form.is_active" />
              <Label for="is_active" class="font-normal">Activa</Label>
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <Button type="button" variant="outline" @click="router.back()">
              Cancelar
            </Button>
            <Button type="submit" :disabled="saving">
              <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
              Crear Sucursal
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
