<script setup lang="ts">
import { toast } from 'vue-sonner'
import CatalogPrefixedCodeInput from '~/components/CatalogPrefixedCodeInput.vue'
import { buildCatalogCode, catalogCodeSuffix } from '~/utils/archival-catalog-code'
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

const returnToPath = computed(() => catalogApi.returnToPath(route))

function cancelPath(): string {
  if (returnToPath.value) {
    return returnToPath.value
  }

  return catalogApi.subseriesListPath(seriesId.value)
}

const series = ref<DocSeriesRow | null>(null)
const form = ref({
  code: '',
  name: '',
  description: '',
  is_active: true,
})
const saving = ref(false)

const seriesCodePrefix = computed(() => series.value?.code ?? '')

const previewCode = computed(() =>
  form.value.code.trim()
    ? buildCatalogCode(seriesCodePrefix.value, form.value.code)
    : (seriesCodePrefix.value ? `${seriesCodePrefix.value}-` : ''),
)

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
  const suffix = catalogCodeSuffix(seriesCodePrefix.value, form.value.code)
  if (!suffix.trim()) {
    toast.error('Digite el sufijo del código de la subserie')
    return
  }
  if (!form.value.name.trim()) {
    toast.error('Código y nombre son obligatorios')
    return
  }
  saving.value = true
  try {
    const code = buildCatalogCode(seriesCodePrefix.value, suffix)
    await $api('/archival/catalog/subseries', {
      method: 'POST',
      body: {
        doc_series_id: seriesId.value,
        code,
        name: form.value.name.trim(),
        description: form.value.description.trim() || undefined,
        is_active: form.value.is_active,
      },
    })
    toast.success('Subserie creada')
    await catalogApi.navigateAfterCatalogSave(
      router,
      route,
      catalogApi.subseriesListPath(seriesId.value),
    )
  } catch (e: any) {
    toast.error(e?.data?.message || 'No se pudo crear la subserie')
  } finally {
    saving.value = false
  }
}

onMounted(loadSeries)
</script>

<template>
  <SettingsLayout :wide="true" hide-intro>
    <div class="flex w-full flex-col gap-6">
      <div class="space-y-1">
        <Button
          variant="ghost"
          size="sm"
          class="h-8 w-fit -ml-2 px-2"
          @click="router.push(cancelPath())"
        >
          <Icon name="i-lucide-arrow-left" class="mr-1 h-4 w-4" />
          Volver a subseries
        </Button>
        <h2 class="text-2xl font-bold tracking-tight">
          Nueva subserie documental
        </h2>
        <p v-if="series" class="text-muted-foreground">
          Serie <span class="font-mono">{{ series.code }}</span> — {{ series.name }}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos de la subserie</CardTitle>
          <CardDescription>
            Código y nombre dentro de la serie seleccionada.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <div class="grid items-start gap-6 lg:grid-cols-2">
          <div class="flex min-w-0 flex-col gap-2">
            <Label for="code">Código *</Label>
            <p v-if="!series" class="flex h-10 items-center text-xs text-muted-foreground">
              Cargando serie…
            </p>
            <CatalogPrefixedCodeInput
              v-else
              id="code"
              v-model="form.code"
              :prefix="seriesCodePrefix"
              maxlength="64"
              placeholder="02"
            />
            <p v-if="series" class="text-xs text-muted-foreground leading-relaxed">
              Prefijo: código de la serie (<span class="font-mono">{{ seriesCodePrefix }}</span>).
              Digite solo el sufijo (ej. <span class="font-mono">02</span> → <span class="font-mono">045-02-02</span>).
            </p>
            <p v-if="series && previewCode" class="text-xs text-muted-foreground">
              Código completo: <span class="font-mono font-medium text-foreground">{{ previewCode }}</span>
            </p>
          </div>
          <div class="flex min-w-0 flex-col gap-2">
            <Label for="name">Nombre *</Label>
            <Input id="name" v-model="form.name" />
          </div>
          <div class="flex min-w-0 flex-col gap-2 lg:col-span-2">
            <Label for="desc">Descripción</Label>
            <Textarea id="desc" v-model="form.description" rows="3" />
          </div>
          <div class="flex items-center gap-2 lg:col-span-2">
            <Switch id="active" v-model="form.is_active" />
            <Label for="active" class="font-normal">{{ form.is_active ? 'Activa' : 'Inactiva' }}</Label>
          </div>
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
