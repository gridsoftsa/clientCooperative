<script setup lang="ts">
import Multiselect from '@vueform/multiselect'
import { toast } from 'vue-sonner'
import CatalogPrefixedCodeInput from '~/components/CatalogPrefixedCodeInput.vue'
import {
  DOCUMENT_SUPPORT_OPTIONS,
  serializeAllowedSupport,
} from '~/constants/archival-document-support'
import { buildCatalogCode, catalogCodeSuffix } from '~/utils/archival-catalog-code'
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
const allowedSupportSelected = ref<string[]>([])

const form = ref({
  code: '',
  name: '',
  description: '',
  is_active: true,
})
const saving = ref(false)

const subseriesCodePrefix = computed(() => subseries.value?.code ?? '')

const previewCode = computed(() =>
  form.value.code.trim()
    ? buildCatalogCode(subseriesCodePrefix.value, form.value.code)
    : (subseriesCodePrefix.value ? `${subseriesCodePrefix.value}-` : ''),
)

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
    const code = catalogCodeSuffix(subseriesCodePrefix.value, form.value.code)
    await $api('/archival/catalog/document-types', {
      method: 'POST',
      body: {
        doc_subseries_id: subseriesId.value,
        code,
        name: form.value.name.trim(),
        description: form.value.description.trim() || undefined,
        allowed_support: serializeAllowedSupport(allowedSupportSelected.value),
        is_active: form.value.is_active,
      },
    })
    toast.success('Tipo documental creado')
    const returnTo = typeof route.query.return_to === 'string' ? route.query.return_to : ''
    if (returnTo.startsWith('/settings/archival/trd/')) {
      await router.push(returnTo)
      return
    }
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
            Subserie <span class="font-mono">{{ subseries.code }}</span> — {{ subseries.name }}
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
            <p v-if="!subseries" class="text-xs text-muted-foreground">
              Cargando subserie…
            </p>
            <p v-else class="text-xs text-muted-foreground leading-relaxed">
              Prefijo: código de la subserie (<span class="font-mono">{{ subseriesCodePrefix }}</span>).
              Digite solo el sufijo (ej. <span class="font-mono">01</span>).
            </p>
            <CatalogPrefixedCodeInput
              v-if="subseries"
              id="code"
              v-model="form.code"
              :prefix="subseriesCodePrefix"
              maxlength="64"
              placeholder="01"
            />
            <p v-if="subseries && previewCode" class="text-xs text-muted-foreground">
              Código completo: <span class="font-mono font-medium text-foreground">{{ previewCode }}</span>
            </p>
          </div>
          <div class="space-y-2">
            <Label for="name">Nombre *</Label>
            <Input id="name" v-model="form.name" />
          </div>
          <div class="space-y-2">
            <Label for="support">Soporte permitido</Label>
            <p class="text-xs text-muted-foreground">
              Puede seleccionar Papel, Digital o ambos.
            </p>
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
                no-options-text="Sin opciones"
                class="multiselect-document-support w-full"
              />
            </div>
          </div>
          <div class="space-y-2">
            <Label for="desc">Descripción</Label>
            <Textarea id="desc" v-model="form.description" rows="3" />
          </div>
          <div class="flex items-center gap-2">
            <Switch id="active" v-model="form.is_active" />
            <Label for="active" class="font-normal">{{ form.is_active ? 'Activo' : 'Inactivo' }}</Label>
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

<style src="@vueform/multiselect/themes/default.css"></style>
<style scoped>
.catalog-document-support-ms :deep(.multiselect-document-support) {
  --ms-font-size: 0.875rem;
  --ms-line-height: 1.375rem;
  --ms-radius: 0.375rem;
  --ms-border-color: hsl(var(--input));
  --ms-bg: hsl(var(--background));
  --ms-py: 0.5rem;
  --ms-px: 0.75rem;
  min-height: 3rem;
  width: 100%;
}
</style>
