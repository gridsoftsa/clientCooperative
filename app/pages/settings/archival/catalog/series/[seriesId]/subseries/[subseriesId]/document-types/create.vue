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
const { $api } = useNuxtApp()
const catalogApi = useArchivalCatalogApi()

const seriesId = computed(() => Number(route.params.seriesId))
const subseriesId = computed(() => Number(route.params.subseriesId))

const subseries = ref<DocSubseriesRow | null>(null)
const form = ref({
  code: '',
  name: '',
  description: '',
  allowed_support: '',
  is_active: true,
})
const saving = ref(false)

async function loadSubseries() {
  if (
    !Number.isFinite(seriesId.value) || seriesId.value <= 0
    || !Number.isFinite(subseriesId.value) || subseriesId.value <= 0
  ) {
    toast.error('Ruta de catálogo no válida')
    await router.push('/settings/archival/catalog/series')
    return
  }
  try {
    const row = await catalogApi.fetchSubseriesById(subseriesId.value)
    if (row.doc_series_id !== seriesId.value) {
      toast.error('La subserie no pertenece a esta serie')
      await router.push(catalogApi.subseriesListPath(seriesId.value))
      return
    }
    subseries.value = row
  } catch {
    toast.error('No se encontró la subserie')
    await router.push(catalogApi.subseriesListPath(seriesId.value))
  }
}

async function submit() {
  if (!form.value.code.trim() || !form.value.name.trim()) {
    toast.error('Código y nombre son obligatorios')
    return
  }
  saving.value = true
  try {
    await $api('/archival/catalog/document-types', {
      method: 'POST',
      body: {
        doc_subseries_id: subseriesId.value,
        code: form.value.code.trim(),
        name: form.value.name.trim(),
        description: form.value.description.trim() || undefined,
        allowed_support: form.value.allowed_support.trim() || undefined,
        is_active: form.value.is_active,
      },
    })
    toast.success('Tipo documental creado')
    await router.push(catalogApi.documentTypesListPath(seriesId.value, subseriesId.value))
  } catch (e: any) {
    toast.error(e?.data?.message || 'No se pudo crear el tipo documental')
  } finally {
    saving.value = false
  }
}

onMounted(loadSubseries)
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <h2 class="text-2xl font-bold tracking-tight">
            Nuevo tipo documental
          </h2>
          <p v-if="subseries" class="text-muted-foreground">
            Subserie {{ subseries.code }} — {{ subseries.name }}
          </p>
        </div>
        <Button
          variant="outline"
          class="shrink-0"
          @click="router.push(catalogApi.documentTypesListPath(seriesId, subseriesId))"
        >
          Volver
        </Button>
      </div>

      <Card>
        <CardContent class="pt-6 space-y-4 max-w-xl">
          <div class="space-y-2">
            <Label for="code">Código *</Label>
            <Input id="code" v-model="form.code" maxlength="64" />
          </div>
          <div class="space-y-2">
            <Label for="name">Nombre *</Label>
            <Input id="name" v-model="form.name" />
          </div>
          <div class="space-y-2">
            <Label for="support">Soporte permitido</Label>
            <Input id="support" v-model="form.allowed_support" maxlength="120" placeholder="Ej. físico, electrónico" />
          </div>
          <div class="space-y-2">
            <Label for="desc">Descripción</Label>
            <Textarea id="desc" v-model="form.description" rows="3" />
          </div>
          <div class="flex items-center gap-2">
            <Switch id="active" v-model:checked="form.is_active" />
            <Label for="active" class="font-normal">Activo</Label>
          </div>
          <div class="flex gap-2 justify-end">
            <Button type="button" variant="outline" @click="router.back()">
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
