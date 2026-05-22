<script setup lang="ts">
import { toast } from 'vue-sonner'
import { ARCHIVAL_METADATA_APPLICATION_LEVEL_OPTIONS } from '~/constants/archival-metadata'
import type { CatalogTreeSeries } from '~/types/archival-trd'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'trd_metadatos_editar',
})

const router = useRouter()
const metaApi = useArchivalMetadataApi()
const { $api } = useNuxtApp()

const saving = ref(false)
const catalogTree = ref<CatalogTreeSeries[]>([])
const catalogKeys = ref<{ functional_types: Array<{ value: string, label: string }>, file_types: Array<{ value: string, label: string }> } | null>(null)

const form = ref({
  name: '',
  description: '',
  application_level: 'document_type',
  doc_series_id: null as number | null,
  doc_subseries_id: null as number | null,
  doc_document_type_id: null as number | null,
  functional_type_key: null as string | null,
  file_type_key: null as string | null,
})

const subseriesOptions = computed(() => {
  const series = catalogTree.value.find(s => s.id === form.value.doc_series_id)
  return series?.subseries ?? []
})

const documentTypeOptions = computed(() => {
  const sub = subseriesOptions.value.find(s => s.id === form.value.doc_subseries_id)
  return sub?.document_types ?? []
})

onMounted(async () => {
  try {
    const treeRes = await $api<{ data: CatalogTreeSeries[] }>('/archival/catalog/tree')
    catalogTree.value = treeRes.data ?? []
    catalogKeys.value = await metaApi.fetchCatalogKeys()
  } catch {
    toast.error('No se pudo cargar el catálogo documental.')
  }
})

async function submit() {
  saving.value = true
  try {
    const res = await metaApi.createSchema({ ...form.value })
    toast.success(res.message ?? 'Esquema creado.')
    await router.push(`/settings/archival/metadata/schemas/${res.data.id}`)
  } catch (e: unknown) {
    const msg = (e as { data?: { message?: string } })?.data?.message
    toast.error(msg ?? 'No se pudo crear el esquema.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="flex flex-col gap-4 max-w-2xl">
      <div class="flex items-center justify-between gap-4">
        <h2 class="text-2xl font-bold tracking-tight">
          Nuevo esquema de metadatos
        </h2>
        <Button variant="outline" @click="router.back()">
          Cancelar
        </Button>
      </div>

      <Card>
        <CardContent class="pt-6 space-y-4">
          <div class="space-y-2">
            <Label>Nombre *</Label>
            <Input v-model="form.name" placeholder="Ej. Metadatos solicitud de crédito" />
          </div>
          <div class="space-y-2">
            <Label>Descripción</Label>
            <Textarea v-model="form.description" rows="3" />
          </div>
          <div class="space-y-2">
            <Label>Nivel de aplicación *</Label>
            <Select v-model="form.application_level">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="opt in ARCHIVAL_METADATA_APPLICATION_LEVEL_OPTIONS"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <template v-if="form.application_level === 'series'">
            <div class="space-y-2">
              <Label>Serie *</Label>
              <Select v-model="form.doc_series_id">
                <SelectTrigger><SelectValue placeholder="Seleccione serie" /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="s in catalogTree" :key="s.id" :value="s.id">
                    {{ s.code }} — {{ s.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </template>

          <template v-else-if="form.application_level === 'subseries'">
            <div class="space-y-2">
              <Label>Serie *</Label>
              <Select v-model="form.doc_series_id">
                <SelectTrigger><SelectValue placeholder="Serie" /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="s in catalogTree" :key="s.id" :value="s.id">
                    {{ s.code }} — {{ s.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-2">
              <Label>Subserie *</Label>
              <Select v-model="form.doc_subseries_id" :disabled="!form.doc_series_id">
                <SelectTrigger><SelectValue placeholder="Subserie" /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="sub in subseriesOptions" :key="sub.id" :value="sub.id">
                    {{ sub.code }} — {{ sub.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </template>

          <template v-else-if="form.application_level === 'document_type'">
            <div class="space-y-2">
              <Label>Serie</Label>
              <Select v-model="form.doc_series_id">
                <SelectTrigger><SelectValue placeholder="Filtrar por serie" /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="s in catalogTree" :key="s.id" :value="s.id">
                    {{ s.code }} — {{ s.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-2">
              <Label>Subserie</Label>
              <Select v-model="form.doc_subseries_id" :disabled="!form.doc_series_id">
                <SelectTrigger><SelectValue placeholder="Filtrar por subserie" /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="sub in subseriesOptions" :key="sub.id" :value="sub.id">
                    {{ sub.code }} — {{ sub.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-2">
              <Label>Tipo documental *</Label>
              <Select v-model="form.doc_document_type_id" :disabled="!form.doc_subseries_id">
                <SelectTrigger><SelectValue placeholder="Tipo documental" /></SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="t in documentTypeOptions" :key="t.id" :value="t.id">
                    {{ t.code }} — {{ t.name }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </template>

          <template v-else-if="form.application_level === 'functional_type'">
            <div class="space-y-2">
              <Label>Tipo funcional *</Label>
              <Select v-model="form.functional_type_key">
                <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="opt in catalogKeys?.functional_types ?? []"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </template>

          <template v-else-if="form.application_level === 'file_type'">
            <div class="space-y-2">
              <Label>Tipo de expediente *</Label>
              <Select v-model="form.file_type_key">
                <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="opt in catalogKeys?.file_types ?? []"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </template>

          <Button :disabled="saving || !form.name" @click="submit">
            Crear borrador
          </Button>
        </CardContent>
      </Card>
    </div>
  </SettingsLayout>
</template>
