<script setup lang="ts">
import { toast } from 'vue-sonner'

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
const typeId = computed(() => Number(route.params.typeId))

const form = ref({
  code: '',
  name: '',
  description: '',
  allowed_support: '',
  is_active: true,
})
const loading = ref(true)
const saving = ref(false)

async function load() {
  loading.value = true
  try {
    const res = await $api<{ data: { code: string, name: string, description?: string, allowed_support?: string, is_active: boolean, doc_subseries_id: number } }>(
      `/archival/catalog/document-types/${typeId.value}`,
    )
    const row = res.data
    if (row.doc_subseries_id !== subseriesId.value) {
      toast.error('El tipo no pertenece a esta subserie')
      await router.push(catalogApi.documentTypesListPath(seriesId.value, subseriesId.value))
      return
    }
    form.value = {
      code: row.code,
      name: row.name,
      description: row.description ?? '',
      allowed_support: row.allowed_support ?? '',
      is_active: row.is_active,
    }
  } catch {
    toast.error('Tipo no encontrado')
    await router.push(catalogApi.documentTypesListPath(seriesId.value, subseriesId.value))
  } finally {
    loading.value = false
  }
}

async function submit() {
  saving.value = true
  try {
    await $api(`/archival/catalog/document-types/${typeId.value}`, {
      method: 'PUT',
      body: {
        code: form.value.code.trim(),
        name: form.value.name.trim(),
        description: form.value.description.trim() || undefined,
        allowed_support: form.value.allowed_support.trim() || undefined,
        is_active: form.value.is_active,
      },
    })
    toast.success('Tipo documental actualizado')
    await router.push(catalogApi.documentTypesListPath(seriesId.value, subseriesId.value))
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
          Editar tipo documental
        </h2>
        <Button variant="outline" @click="router.push(catalogApi.documentTypesListPath(seriesId, subseriesId))">
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
            <Label>Soporte permitido</Label>
            <Input v-model="form.allowed_support" maxlength="120" />
          </div>
          <div class="space-y-2">
            <Label>Descripción</Label>
            <Textarea v-model="form.description" rows="3" />
          </div>
          <div class="flex items-center gap-2">
            <Switch id="active" v-model:checked="form.is_active" />
            <Label for="active" class="font-normal">Activo</Label>
          </div>
          <Button :disabled="saving" @click="submit">
            Guardar
          </Button>
        </CardContent>
      </Card>
    </div>
  </SettingsLayout>
</template>
