<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { DocSeriesRow } from '~/types/archival-catalog'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'trd_catalogo_editar',
})

const route = useRoute()
const router = useRouter()
const { $api } = useNuxtApp()

const id = computed(() => Number(route.params.id))
const form = ref({ code: '', name: '', description: '', is_active: true })
const loading = ref(true)
const saving = ref(false)

async function load() {
  loading.value = true
  try {
    const res = await $api<{ data: DocSeriesRow }>(`/archival/catalog/series/${id.value}`)
    const s = res.data
    form.value = {
      code: s.code,
      name: s.name,
      description: s.description ?? '',
      is_active: s.is_active,
    }
  } catch {
    toast.error('Serie no encontrada')
    await router.push('/settings/archival/catalog/series')
  } finally {
    loading.value = false
  }
}

async function submit() {
  saving.value = true
  try {
    await $api(`/archival/catalog/series/${id.value}`, {
      method: 'PUT',
      body: {
        code: form.value.code.trim(),
        name: form.value.name.trim(),
        description: form.value.description.trim() || undefined,
        is_active: form.value.is_active,
      },
    })
    toast.success('Serie actualizada')
    await router.push('/settings/archival/catalog/series')
  } catch (e: any) {
    toast.error(e?.data?.message || 'No se pudo guardar')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4 max-w-xl">
      <div class="flex justify-between items-center">
        <h2 class="text-2xl font-bold tracking-tight">
          Editar serie
        </h2>
        <Button variant="outline" @click="router.push('/settings/archival/catalog/series')">
          Volver
        </Button>
      </div>
      <Card v-if="!loading">
        <CardContent class="pt-6 space-y-4">
          <div class="space-y-2">
            <Label>Código *</Label>
            <Input v-model="form.code" maxlength="64" />
          </div>
          <div class="space-y-2">
            <Label>Nombre *</Label>
            <Input v-model="form.name" />
          </div>
          <div class="space-y-2">
            <Label>Descripción</Label>
            <Textarea v-model="form.description" rows="3" />
          </div>
          <div class="flex items-center gap-2">
            <Switch id="active" v-model:checked="form.is_active" />
            <Label for="active" class="font-normal">Activa</Label>
          </div>
          <div class="flex justify-end gap-2">
            <Button variant="outline" @click="router.back()">
              Cancelar
            </Button>
            <Button :disabled="saving" @click="submit">
              Guardar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </SettingsLayout>
</template>
