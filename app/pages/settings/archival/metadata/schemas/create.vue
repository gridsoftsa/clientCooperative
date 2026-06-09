<script setup lang="ts">
import { toast } from 'vue-sonner'
import { ARCHIVAL_METADATA_APPLICATION_LEVEL_OPTIONS } from '~/constants/archival-metadata'
import type { CatalogTreeSeries } from '~/types/archival-trd'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'trd_metadatos_editar',
})

interface OrgUnitOption {
  id: number
  name: string
  code: string
  is_document_producer?: boolean
}

const router = useRouter()
const metaApi = useArchivalMetadataApi()
const trdApi = useTrdApi()
const { $api } = useNuxtApp()

const saving = ref(false)
const producerUnits = ref<OrgUnitOption[]>([])
const selectedOrgUnitId = ref<number | null>(null)
const catalogTree = ref<CatalogTreeSeries[]>([])
const catalogTreeLoading = ref(false)
const catalogTreeError = ref('')
const catalogKeys = ref<{ functional_types: Array<{ value: string, label: string }>, file_types: Array<{ value: string, label: string }> } | null>(null)
const catalogKeysError = ref('')
const functionalTypeOptions = computed(() => catalogKeys.value?.functional_types ?? [])
const fileTypeOptions = computed(() => catalogKeys.value?.file_types ?? [])
const needsCatalogTree = computed(() =>
  ['series', 'subseries', 'document_type'].includes(form.value.application_level),
)

const form = ref({
  name: '',
  description: '',
  application_level: 'functional_type',
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

function resetTrdSelection(): void {
  form.value.doc_series_id = null
  form.value.doc_subseries_id = null
  form.value.doc_document_type_id = null
}

async function fetchProducerUnits(): Promise<void> {
  try {
    const res = await $api<{ data: OrgUnitOption[] }>('/organizational-structure/org-units', {
      query: { per_page: 200, is_active: true },
    })
    producerUnits.value = (res.data ?? []).filter(unit => unit.is_document_producer)
    if (selectedOrgUnitId.value == null && producerUnits.value.length === 1) {
      selectedOrgUnitId.value = producerUnits.value[0].id
    }
  } catch {
    toast.error('No se pudieron cargar las áreas productoras.')
    producerUnits.value = []
  }
}

async function loadCatalogTree(): Promise<void> {
  if (!needsCatalogTree.value || selectedOrgUnitId.value == null) {
    catalogTree.value = []
    return
  }

  catalogTreeLoading.value = true
  catalogTreeError.value = ''
  try {
    catalogTree.value = await trdApi.fetchCatalogTree(selectedOrgUnitId.value, true)
  } catch {
    catalogTreeError.value = 'No se pudo cargar el catálogo TRD del área seleccionada.'
    catalogTree.value = []
  } finally {
    catalogTreeLoading.value = false
  }
}

watch(selectedOrgUnitId, () => {
  resetTrdSelection()
  loadCatalogTree()
})

watch(() => form.value.application_level, () => {
  if (needsCatalogTree.value) {
    loadCatalogTree()
  } else {
    catalogTree.value = []
    catalogTreeError.value = ''
    resetTrdSelection()
  }
})

onMounted(async () => {
  catalogKeysError.value = ''
  await fetchProducerUnits()

  try {
    catalogKeys.value = await metaApi.fetchCatalogKeys()
    if (functionalTypeOptions.value.length === 0 && fileTypeOptions.value.length === 0) {
      catalogKeysError.value = 'No hay tipos funcionales ni de expediente disponibles. Ejecute las migraciones de ventanilla o contacte al administrador.'
    }
  } catch {
    catalogKeysError.value = 'No se pudieron cargar los tipos funcionales. Verifique el permiso trd_metadatos_ver o trd_metadatos_editar y recargue la página.'
    toast.error('No se pudieron cargar los tipos para metadatos.')
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

          <template v-if="needsCatalogTree">
            <div class="space-y-2">
              <Label>Área productora *</Label>
              <Select v-model="selectedOrgUnitId">
                <SelectTrigger>
                  <SelectValue placeholder="Seleccione el área" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="unit in producerUnits"
                    :key="unit.id"
                    :value="unit.id"
                  >
                    {{ unit.name }} ({{ unit.code }})
                  </SelectItem>
                </SelectContent>
              </Select>
              <p v-if="catalogTreeError" class="text-destructive text-xs">
                {{ catalogTreeError }}
              </p>
              <p v-else-if="catalogTreeLoading" class="text-muted-foreground text-xs">
                Cargando catálogo TRD del área…
              </p>
              <p v-else-if="selectedOrgUnitId == null" class="text-muted-foreground text-xs">
                El catálogo documental depende del área productora.
              </p>
            </div>
          </template>

          <template v-if="form.application_level === 'series'">
            <div class="space-y-2">
              <Label>Serie *</Label>
              <Select v-model="form.doc_series_id" :disabled="selectedOrgUnitId == null || catalogTree.length === 0">
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
              <Select v-model="form.doc_series_id" :disabled="selectedOrgUnitId == null || catalogTree.length === 0">
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
              <Select v-model="form.doc_series_id" :disabled="selectedOrgUnitId == null || catalogTree.length === 0">
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
              <Select v-model="form.functional_type_key" :disabled="functionalTypeOptions.length === 0">
                <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="opt in functionalTypeOptions"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <p v-if="catalogKeysError" class="text-destructive text-xs">
                {{ catalogKeysError }}
              </p>
              <p v-else-if="functionalTypeOptions.length === 0" class="text-muted-foreground text-xs">
                Cargando tipos funcionales de ventanilla…
              </p>
              <p v-else class="text-muted-foreground text-xs">
                Tipos de ventanilla única: PQRSFD, facturas, derecho de petición, etc.
              </p>
            </div>
          </template>

          <template v-else-if="form.application_level === 'file_type'">
            <div class="space-y-2">
              <Label>Tipo de expediente *</Label>
              <Select v-model="form.file_type_key" :disabled="fileTypeOptions.length === 0">
                <SelectTrigger><SelectValue placeholder="Seleccione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="opt in fileTypeOptions"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
              <p v-if="catalogKeysError" class="text-destructive text-xs">
                {{ catalogKeysError }}
              </p>
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
