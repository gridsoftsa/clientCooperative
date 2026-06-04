<script setup lang="ts">
import Multiselect from '@vueform/multiselect'
import { toast } from 'vue-sonner'
import CatalogPrefixedCodeInput from '~/components/CatalogPrefixedCodeInput.vue'
import {
  DOCUMENT_SUPPORT_OPTIONS,
  parseAllowedSupport,
  serializeAllowedSupport,
} from '~/constants/archival-document-support'
import { catalogCodeSuffix } from '~/utils/archival-catalog-code'
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
const typeId = computed(() => Number(route.params.typeId))

const subseries = ref<DocSubseriesRow | null>(null)
const allowedSupportSelected = ref<string[]>([])

const form = ref({
  code: '',
  name: '',
  description: '',
  is_active: true,
})
const loading = ref(true)
const saving = ref(false)

const subseriesCodePrefix = computed(() => subseries.value?.code ?? '')

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
    subseries.value = await catalogApi.fetchSubseriesById(subseriesId.value)
    allowedSupportSelected.value = parseAllowedSupport(row.allowed_support)
    form.value = {
      code: row.code,
      name: row.name,
      description: row.description ?? '',
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
    const code = catalogCodeSuffix(subseriesCodePrefix.value, form.value.code)
    await $api(`/archival/catalog/document-types/${typeId.value}`, {
      method: 'PUT',
      body: {
        code,
        name: form.value.name.trim(),
        description: form.value.description.trim() || undefined,
        allowed_support: serializeAllowedSupport(allowedSupportSelected.value),
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
        <div class="space-y-1">
          <h2 class="text-2xl font-bold tracking-tight">
            Editar tipo documental
          </h2>
          <p v-if="subseries" class="text-sm text-muted-foreground">
            Subserie <span class="font-mono">{{ subseries.code }}</span> — {{ subseries.name }}
          </p>
        </div>
        <Button variant="outline" @click="router.push(catalogApi.documentTypesListPath(seriesId, subseriesId))">
          Volver
        </Button>
      </div>
      <Card v-if="!loading">
        <CardContent class="pt-6 space-y-4">
          <div class="space-y-2">
            <Label>Código *</Label>
            <CatalogPrefixedCodeInput
              v-model="form.code"
              :prefix="subseriesCodePrefix"
              maxlength="64"
              placeholder="Sufijo de tipo"
            />
            <p class="text-xs text-muted-foreground leading-relaxed">
              Prefijo: código de la subserie. Solo digite el sufijo (ej. <span class="font-mono">01</span>).
            </p>
          </div>
          <div class="space-y-2">
            <Label>Nombre *</Label>
            <Input v-model="form.name" />
          </div>
          <div class="space-y-2">
            <Label for="support">Soporte permitido</Label>
            <div class="catalog-document-support-ms w-full">
              <Multiselect
                id="support"
                v-model="allowedSupportSelected"
                mode="tags"
                :object="false"
                :options="[...DOCUMENT_SUPPORT_OPTIONS]"
                value-prop="value"
                label="label"
                :searchable="false"
                :close-on-select="false"
                placeholder="Seleccione soporte…"
                class="multiselect-document-support w-full"
              />
            </div>
          </div>
          <div class="space-y-2">
            <Label>Descripción</Label>
            <Textarea v-model="form.description" rows="3" />
          </div>
          <div class="flex items-center gap-2">
            <Switch id="active" v-model="form.is_active" />
            <Label for="active" class="font-normal">{{ form.is_active ? 'Activo' : 'Inactivo' }}</Label>
          </div>
          <Button :disabled="saving" @click="submit">
            Guardar
          </Button>
        </CardContent>
      </Card>
    </div>
  </SettingsLayout>
</template>

<style src="@vueform/multiselect/themes/default.css"></style>
<style scoped>
.catalog-document-support-ms :deep(.multiselect-document-support) {
  --ms-font-size: 0.875rem;
  min-height: 3rem;
  width: 100%;
}
</style>
