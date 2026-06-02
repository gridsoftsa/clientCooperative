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
const catalogApi = useArchivalCatalogApi()

const seriesId = computed(() => Number(route.params.seriesId))

const series = ref<DocSeriesRow | null>(null)
const form = ref({
  code: '',
  name: '',
  description: '',
  is_active: true,
})
const saving = ref(false)

async function loadSeries() {
  if (!Number.isFinite(seriesId.value) || seriesId.value <= 0) {
    toast.error('Serie no válida')
    await router.push('/settings/archival/catalog/series')
    return
  }
  try {
    series.value = await catalogApi.fetchSeriesById(seriesId.value)
  } catch {
    toast.error('No se encontró la serie')
    await router.push('/settings/archival/catalog/series')
  }
}

async function submit() {
  if (!form.value.code.trim() || !form.value.name.trim()) {
    toast.error('Código y nombre son obligatorios')
    return
  }
  saving.value = true
  try {
    await $api('/archival/catalog/subseries', {
      method: 'POST',
      body: {
        doc_series_id: seriesId.value,
        code: form.value.code.trim(),
        name: form.value.name.trim(),
        description: form.value.description.trim() || undefined,
        is_active: form.value.is_active,
      },
    })
    toast.success('Subserie creada')
    await router.push(catalogApi.subseriesListPath(seriesId.value))
  } catch (e: any) {
    toast.error(e?.data?.message || 'No se pudo crear la subserie')
  } finally {
    saving.value = false
  }
}

onMounted(loadSeries)
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <h2 class="text-2xl font-bold tracking-tight">
            Nueva subserie documental
          </h2>
          <p v-if="series" class="text-muted-foreground">
            Serie {{ series.code }} — {{ series.name }}
          </p>
        </div>
        <Button
          variant="outline"
          class="shrink-0"
          @click="router.push(catalogApi.subseriesListPath(seriesId))"
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
            <Label for="desc">Descripción</Label>
            <Textarea id="desc" v-model="form.description" rows="3" />
          </div>
          <div class="flex items-center gap-2">
            <Switch id="active" v-model="form.is_active" />
            <Label for="active" class="font-normal">{{ form.is_active ? 'Activa' : 'Inactiva' }}</Label>
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
