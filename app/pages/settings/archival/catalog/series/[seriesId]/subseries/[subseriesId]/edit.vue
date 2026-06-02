<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { DocSubseriesRow } from '~/types/archival-catalog'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'trd_catalogo_editar',
})

const route = useRoute()
const router = useRouter()
const catalogApi = useArchivalCatalogApi()
const { $api } = useNuxtApp()

const seriesId = computed(() => Number(route.params.seriesId))
const subseriesId = computed(() => Number(route.params.subseriesId))
const form = ref({ code: '', name: '', description: '', is_active: true })
const loading = ref(true)
const saving = ref(false)

async function load() {
  loading.value = true
  try {
    const row = await catalogApi.fetchSubseriesById(subseriesId.value)
    if (row.doc_series_id !== seriesId.value) {
      toast.error('La subserie no pertenece a esta serie')
      await router.push(catalogApi.subseriesListPath(seriesId.value))
      return
    }
    form.value = {
      code: row.code,
      name: row.name,
      description: row.description ?? '',
      is_active: row.is_active,
    }
  } catch {
    toast.error('Subserie no encontrada')
    await router.push(catalogApi.subseriesListPath(seriesId.value))
  } finally {
    loading.value = false
  }
}

async function submit() {
  saving.value = true
  try {
    await $api(`/archival/catalog/subseries/${subseriesId.value}`, {
      method: 'PUT',
      body: {
        code: form.value.code.trim(),
        name: form.value.name.trim(),
        description: form.value.description.trim() || undefined,
        is_active: form.value.is_active,
      },
    })
    toast.success('Subserie actualizada')
    await router.push(catalogApi.subseriesListPath(seriesId.value))
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
          Editar subserie
        </h2>
        <Button variant="outline" @click="router.push(catalogApi.subseriesListPath(seriesId))">
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
            <Switch id="active" v-model="form.is_active" />
            <Label for="active" class="font-normal">{{ form.is_active ? 'Activa' : 'Inactiva' }}</Label>
          </div>
          <div class="flex justify-end gap-2">
            <Button :disabled="saving" @click="submit">
              Guardar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </SettingsLayout>
</template>
