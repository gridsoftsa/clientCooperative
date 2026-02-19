<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { Sucursal } from '~/types/sucursal'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'sucursales.edit',
})

const { $api } = useNuxtApp()
const route = useRoute()
const router = useRouter()

const id = route.params.id as string
const sucursal = ref<Sucursal | null>(null)
const loading = ref(false)
const saving = ref(false)

const form = ref({
  name: '',
  code: '',
  address: '',
  phone: '',
  city: '',
  is_main: false,
  is_active: true,
})

async function fetchSucursal() {
  loading.value = true
  try {
    const res = await $api<{ data: Sucursal }>(`/sucursales/${id}`)
    sucursal.value = res.data
    form.value = {
      name: res.data.name,
      code: res.data.code ?? '',
      address: res.data.address ?? '',
      phone: res.data.phone ?? '',
      city: res.data.city ?? '',
      is_main: res.data.is_main,
      is_active: res.data.is_active,
    }
  } catch {
    toast.error('Error al cargar la sucursal')
    router.push('/admin/sucursales')
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  if (!form.value.name.trim()) {
    toast.error('El nombre es obligatorio')
    return
  }
  saving.value = true
  try {
    await $api(`/sucursales/${id}`, {
      method: 'PUT',
      body: {
        name: form.value.name,
        code: form.value.code || null,
        address: form.value.address || null,
        phone: form.value.phone || null,
        city: form.value.city || null,
        is_main: form.value.is_main,
        is_active: form.value.is_active,
      },
    })
    toast.success('Sucursal actualizada')
    router.push('/admin/sucursales')
  } catch (e: any) {
    toast.error(e?.data?.message || 'Error al actualizar')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  fetchSucursal()
})
</script>

<template>
  <div class="w-full max-w-2xl flex flex-col gap-4">
    <div class="flex items-center justify-between">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">
          Editar Sucursal
        </h2>
        <p v-if="sucursal" class="text-muted-foreground">
          {{ sucursal.name }}
        </p>
      </div>
      <Button variant="outline" @click="router.back()">
        <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
        Volver
      </Button>
    </div>

    <Card v-if="loading">
      <CardContent class="p-6">
        <div class="flex justify-center">
          <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin" />
        </div>
      </CardContent>
    </Card>

    <Card v-else-if="sucursal">
      <CardContent class="pt-6">
        <form class="grid gap-4" @submit.prevent="handleSubmit">
          <div>
            <Label for="name">Nombre *</Label>
            <Input id="name" v-model="form.name" required />
          </div>
          <div class="grid grid-cols-2 gap-4">
            <div>
              <Label for="code">Código</Label>
              <Input id="code" v-model="form.code" />
            </div>
            <div>
              <Label for="city">Ciudad</Label>
              <Input id="city" v-model="form.city" />
            </div>
          </div>
          <div>
            <Label for="address">Dirección</Label>
            <Input id="address" v-model="form.address" />
          </div>
          <div>
            <Label for="phone">Teléfono</Label>
            <Input id="phone" v-model="form.phone" />
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
              Guardar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
