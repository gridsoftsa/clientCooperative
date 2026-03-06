<script setup lang="ts">
import { toast } from 'vue-sonner'
import { sectorsConfig } from '~/constants/credits-financial-templates'
import TemplateConfigEditor from '~/components/settings/TemplateConfigEditor.vue'
import CreateCategoryDialog from '~/components/settings/CreateCategoryDialog.vue'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'template-config.view',
})

const { $api, $csrf } = useNuxtApp()
const { hasPermission } = usePermissions()

interface FlatDataRecord {
  id: number
  template_key: string
  product_key: string | null
  config_data: Record<string, unknown>
  updated_at: string
}

interface TemplateCategory {
  id: number
  template_key: string
  name: string
  code: string
  sort_order: number
}

const TEMPLATES_WITH_CATEGORIES = ['cultivo-permanente', 'cultivo-ciclo-corto', 'peces-tilapia']

const loading = ref(true)
const saving = ref<string | null>(null)
const templateData = ref<Record<string, FlatDataRecord[]>>({})
const categoriesByTemplate = ref<Record<string, TemplateCategory[]>>({})
const showCreateCategoryDialog = ref(false)
const newCategoryTemplate = ref<string | null>(null)
/** Plantilla seleccionada en la vista de configuración (reduce scroll) */
const selectedTemplateKey = ref<string | null>(null)
/** Para plantillas con categorías: producto seleccionado en el desplegable */
const selectedProductKey = ref<string | null>(null)

const templateLabels: Record<string, string> = {
  'ganado-ceba': 'Ganado para la Ceba',
  'ganado-doble-proposito': 'Ganado Doble Propósito',
  'cerdos-cria': 'Cerdos de Cría',
  'cerdos-ceba': 'Cerdos de Ceba',
  'pollos-engorde': 'Pollos de Engorde',
  'aves-ponedoras': 'Aves Ponedoras',
  'peces-tilapia': 'Peces (Tilapia, Cachama, Otros)',
  'cultivo-permanente': 'Cultivos Permanentes',
  'cultivo-ciclo-corto': 'Cultivos Ciclo Corto',
  'cana-panela': 'Caña de Azúcar (Panela)',
}

function getTemplateLabel(key: string): string {
  return templateLabels[key] ?? key
}

function getProductLabel(key: string | null): string {
  if (!key) return 'Default (plantilla)'
  const cat = Object.values(categoriesByTemplate.value).flat().find(c => c.code === key)
  return cat?.name ?? key
}

function templateHasCategories(templateKey: string): boolean {
  return TEMPLATES_WITH_CATEGORIES.includes(templateKey)
}

function getRecordsForTemplate(templateKey: string, productKey: string | null): FlatDataRecord | undefined {
  return templateData.value[templateKey]?.find(r =>
    (r.product_key === null && productKey === null) || r.product_key === productKey,
  )
}

function getAllConfigRecords(templateKey: string): Array<{ productKey: string | null; record: FlatDataRecord }> {
  const records = templateData.value[templateKey] ?? []
  const result: Array<{ productKey: string | null; record: FlatDataRecord }> = []

  const defaultRecord = records.find(r => r.product_key === null)
  if (defaultRecord) {
    result.push({ productKey: null, record: defaultRecord })
  }

  const categories = categoriesByTemplate.value[templateKey] ?? []
  for (const cat of categories) {
    const rec = records.find(r => r.product_key === cat.code)
    if (rec) result.push({ productKey: cat.code, record: rec })
  }

  return result
}

function getConfigRecordsForTemplate(templateKey: string): Array<{ productKey: string | null; record: FlatDataRecord }> {
  if (templateHasCategories(templateKey)) {
    return getAllConfigRecords(templateKey)
  }
  const records = templateData.value[templateKey] ?? []
  return records.map(r => ({ productKey: r.product_key, record: r }))
}

async function fetchData() {
  loading.value = true
  try {
    const [flatRes, catRes] = await Promise.all([
      $api<{ data: Record<string, FlatDataRecord[]> }>('/template-flat-data'),
      $api<{ data: Record<string, TemplateCategory[]> }>('/template-categories'),
    ])
    templateData.value = flatRes.data
    categoriesByTemplate.value = catRes.data
  } catch (e) {
    console.error('Error al cargar configuraciones:', e)
    toast.error('Error al cargar las configuraciones')
  } finally {
    loading.value = false
  }
}

function getCategoryId(templateKey: string, productKey: string | null): number | undefined {
  if (!productKey) return undefined
  return categoriesByTemplate.value[templateKey]?.find(c => c.code === productKey)?.id
}

async function saveConfig(templateKey: string, productKey: string | null, configData: Record<string, unknown>) {
  const key = `${templateKey}::${productKey ?? 'default'}`
  saving.value = key
  try {
    await $csrf()
    await $api(`/template-flat-data/${templateKey}`, {
      method: 'PUT',
      body: { product_key: productKey, config_data: configData },
    })
    toast.success('Configuración guardada correctamente')
    await fetchData()
  } catch (e: any) {
    toast.error(e?.data?.message ?? 'Error al guardar')
  } finally {
    saving.value = null
  }
}

async function deleteCategory(categoryId: number) {
  if (!confirm('¿Eliminar esta categoría? Se eliminará también su configuración.')) return
  try {
    await $csrf()
    await $api(`/template-categories/${categoryId}`, { method: 'DELETE' })
    toast.success('Categoría eliminada')
    await fetchData()
  } catch (e: any) {
    toast.error(e?.data?.message ?? 'Error al eliminar')
  }
}

function openCreateCategory(templateKey: string) {
  newCategoryTemplate.value = templateKey
  showCreateCategoryDialog.value = true
}

function closeCreateCategoryDialog() {
  showCreateCategoryDialog.value = false
  newCategoryTemplate.value = null
}

function selectFirstTemplateIfNone() {
  if (!selectedTemplateKey.value && sectorsConfig.length > 0) {
    const first = sectorsConfig[0].templates[0]
    if (first) selectedTemplateKey.value = first.value
  }
}

/** Opciones para el desplegable de tipo de cultivo/producto */
function getProductOptions(templateKey: string): Array<{ value: string; label: string }> {
  const records = getConfigRecordsForTemplate(templateKey)
  return records.map(({ productKey }) => ({
    value: productKey ?? '__default__',
    label: getProductLabel(productKey),
  }))
}

/** Al cambiar plantilla, seleccionar el primer producto disponible */
function syncSelectedProduct() {
  const key = selectedTemplateKey.value
  if (!key || !templateHasCategories(key)) {
    selectedProductKey.value = null
    return
  }
  const opts = getProductOptions(key)
  if (opts.length === 0) {
    selectedProductKey.value = null
    return
  }
  const current = selectedProductKey.value
  const exists = opts.some(o => o.value === current)
  selectedProductKey.value = exists ? current : opts[0].value
}

watch(selectedTemplateKey, syncSelectedProduct)
watch([categoriesByTemplate, templateData], syncSelectedProduct, { deep: true })
watch(
  loading,
  () => {
    if (!loading.value) {
      selectFirstTemplateIfNone()
      syncSelectedProduct()
    }
  },
  { immediate: true },
)

onMounted(() => {
  fetchData()
})
</script>

<template>
  <SettingsLayout wide>
    <div class="space-y-6">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">
          Configurar plantillas
        </h2>
        <p class="text-muted-foreground">
          Datos planos por sector y plantilla. Usa las pestañas para navegar sin tanto scroll.
        </p>
      </div>

      <Tabs default-value="plantillas" class="w-full">
        <TabsList class="inline-flex w-auto grid-cols-2">
          <TabsTrigger value="plantillas">
            Plantillas
          </TabsTrigger>
          <TabsTrigger value="categorias">
            Categorías de cultivos
          </TabsTrigger>
        </TabsList>

        <!-- Pestaña Plantillas: selector + contenido de una sola plantilla -->
        <TabsContent value="plantillas" class="mt-4">
          <div v-if="loading" class="flex justify-center py-12">
            <Icon name="i-lucide-loader-2" class="h-10 w-10 animate-spin text-muted-foreground" />
          </div>

          <div v-else class="flex flex-col gap-4 lg:flex-row lg:gap-6">
            <!-- Navegación lateral: lista de plantillas -->
            <nav class="shrink-0 lg:w-64 xl:w-72 lg:sticky lg:top-4 lg:self-start">
              <div class="rounded-lg border bg-muted/30 p-2">
                <p class="mb-2 px-2 text-xs font-medium text-muted-foreground">
                  Seleccionar plantilla
                </p>
                <div class="max-h-[280px] space-y-0.5 overflow-y-auto lg:max-h-[calc(100vh-12rem)]">
                  <template v-for="sector in sectorsConfig" :key="sector.value">
                    <p class="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {{ sector.label }}
                    </p>
                    <button
                      v-for="t in sector.templates"
                      :key="t.value"
                      type="button"
                      class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-accent"
                      :class="selectedTemplateKey === t.value ? 'bg-accent font-medium' : ''"
                      @click="selectedTemplateKey = t.value"
                    >
                      <Icon
                        name="i-lucide-file-spreadsheet"
                        class="h-4 w-4 shrink-0 text-muted-foreground"
                      />
                      <span class="truncate">{{ t.label }}</span>
                    </button>
                  </template>
                </div>
              </div>
            </nav>

            <!-- Contenido: solo la plantilla seleccionada -->
            <div class="min-w-0 flex-1">
              <template v-if="selectedTemplateKey">
                <div class="rounded-lg border">
                  <div class="flex items-center justify-between border-b bg-muted/30 px-4 py-3">
                    <h3 class="font-semibold">
                      {{ getTemplateLabel(selectedTemplateKey) }}
                    </h3>
                    <Button
                      v-if="templateHasCategories(selectedTemplateKey) && hasPermission('template-config.edit')"
                      variant="outline"
                      size="sm"
                      @click="openCreateCategory(selectedTemplateKey)"
                    >
                      <Icon name="i-lucide-plus" class="mr-1 h-4 w-4" />
                      Crear categoría
                    </Button>
                  </div>
                  <div class="p-4">
                    <!-- Desplegable de tipo de cultivo (solo para plantillas con categorías) -->
                    <div
                      v-if="templateHasCategories(selectedTemplateKey) && getProductOptions(selectedTemplateKey).length > 0"
                      class="mb-4"
                    >
                      <label class="mb-2 block text-sm font-medium">
                        Tipo de cultivo / producto
                      </label>
                      <Select v-model="selectedProductKey">
                        <SelectTrigger class="w-full max-w-xs">
                          <SelectValue placeholder="Seleccionar tipo" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem
                            v-for="opt in getProductOptions(selectedTemplateKey)"
                            :key="opt.value"
                            :value="opt.value"
                          >
                            {{ opt.label }}
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div class="space-y-4">
                      <template v-if="templateHasCategories(selectedTemplateKey) && selectedProductKey">
                        <TemplateConfigEditor
                          v-for="{ productKey, record } in getConfigRecordsForTemplate(selectedTemplateKey).filter(r =>
                            (r.productKey ?? '__default__') === selectedProductKey
                          )"
                          :key="`${record.template_key}-${productKey ?? 'default'}`"
                          :record="record"
                          :template-label="getTemplateLabel(record.template_key)"
                          :product-label="getProductLabel(productKey)"
                          :saving="saving === `${record.template_key}::${productKey ?? 'default'}`"
                          :can-edit="hasPermission('template-config.edit')"
                          :category-id="getCategoryId(record.template_key, productKey)"
                          @save="(data) => saveConfig(record.template_key, productKey, data)"
                          @delete="() => { const id = getCategoryId(record.template_key, productKey); id && deleteCategory(id) }"
                        />
                      </template>
                      <template v-else-if="!templateHasCategories(selectedTemplateKey)">
                        <TemplateConfigEditor
                          v-for="{ productKey, record } in getConfigRecordsForTemplate(selectedTemplateKey)"
                          :key="`${record.template_key}-${productKey ?? 'default'}`"
                          :record="record"
                          :template-label="getTemplateLabel(record.template_key)"
                          :product-label="getProductLabel(productKey)"
                          :saving="saving === `${record.template_key}::${productKey ?? 'default'}`"
                          :can-edit="hasPermission('template-config.edit')"
                          :category-id="getCategoryId(record.template_key, productKey)"
                          @save="(data) => saveConfig(record.template_key, productKey, data)"
                          @delete="() => { const id = getCategoryId(record.template_key, productKey); id && deleteCategory(id) }"
                        />
                      </template>
                      <p
                        v-if="getConfigRecordsForTemplate(selectedTemplateKey).length === 0"
                        class="py-4 text-center text-sm text-muted-foreground"
                      >
                        No hay configuraciones. Crea una categoría o espera a que se carguen los datos iniciales.
                      </p>
                    </div>
                  </div>
                </div>
              </template>
              <p v-else class="py-8 text-center text-sm text-muted-foreground">
                Selecciona una plantilla en el panel
              </p>
            </div>
          </div>
        </TabsContent>

        <!-- Pestaña Categorías -->
        <TabsContent value="categorias" class="mt-4">
          <Card>
            <CardHeader>
              <CardTitle class="text-lg">
                Categorías de cultivos
              </CardTitle>
              <CardDescription>
                Crea y gestiona las categorías para Cultivos Permanentes, Cultivos Ciclo Corto y Tipos de Pez
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-6">
              <div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                <div class="rounded-lg border bg-muted/20 p-4">
                  <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h3 class="font-semibold">
                      Cultivos Permanentes
                    </h3>
                    <Button
                      size="sm"
                      @click="openCreateCategory('cultivo-permanente')"
                    >
                      <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
                      Agregar categoría
                    </Button>
                  </div>
                  <p class="mb-3 text-xs text-muted-foreground">
                    Cacao, Café, Bananito, frutales y especies similares
                  </p>
                  <ul class="space-y-1.5">
                    <li
                      v-for="cat in (categoriesByTemplate['cultivo-permanente'] ?? [])"
                      :key="cat.id"
                      class="flex items-center justify-between gap-2 rounded-md bg-background px-3 py-2 text-sm"
                    >
                      <span>{{ cat.name }}</span>
                      <div class="flex items-center gap-2">
                        <span class="font-mono text-xs text-muted-foreground">{{ cat.code }}</span>
                        <Button
                          v-if="hasPermission('template-config.edit')"
                          variant="ghost"
                          size="icon"
                          class="h-7 w-7 text-destructive hover:text-destructive"
                          @click="deleteCategory(cat.id)"
                        >
                          <Icon name="i-lucide-trash-2" class="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                    <li v-if="!(categoriesByTemplate['cultivo-permanente'] ?? []).length" class="py-4 text-center text-sm text-muted-foreground">
                      Sin categorías. Crea la primera.
                    </li>
                  </ul>
                </div>
                <div class="rounded-lg border bg-muted/20 p-4">
                  <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h3 class="font-semibold">
                      Cultivos de Ciclo Corto
                    </h3>
                    <Button
                      size="sm"
                      @click="openCreateCategory('cultivo-ciclo-corto')"
                    >
                      <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
                      Agregar categoría
                    </Button>
                  </div>
                  <p class="mb-3 text-xs text-muted-foreground">
                    Maíz, Papa, Habichuela, Yuca, Tomate y similares
                  </p>
                  <ul class="space-y-1.5">
                    <li
                      v-for="cat in (categoriesByTemplate['cultivo-ciclo-corto'] ?? [])"
                      :key="cat.id"
                      class="flex items-center justify-between gap-2 rounded-md bg-background px-3 py-2 text-sm"
                    >
                      <span>{{ cat.name }}</span>
                      <div class="flex items-center gap-2">
                        <span class="font-mono text-xs text-muted-foreground">{{ cat.code }}</span>
                        <Button
                          v-if="hasPermission('template-config.edit')"
                          variant="ghost"
                          size="icon"
                          class="h-7 w-7 text-destructive hover:text-destructive"
                          @click="deleteCategory(cat.id)"
                        >
                          <Icon name="i-lucide-trash-2" class="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                    <li v-if="!(categoriesByTemplate['cultivo-ciclo-corto'] ?? []).length" class="py-4 text-center text-sm text-muted-foreground">
                      Sin categorías. Crea la primera.
                    </li>
                  </ul>
                </div>
                <div class="rounded-lg border bg-muted/20 p-4">
                  <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <h3 class="font-semibold">
                      Tipos de pez
                    </h3>
                    <Button
                      size="sm"
                      @click="openCreateCategory('peces-tilapia')"
                    >
                      <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
                      Agregar tipo
                    </Button>
                  </div>
                  <p class="mb-3 text-xs text-muted-foreground">
                    Tilapia, Cachama y otras especies acuícolas
                  </p>
                  <ul class="space-y-1.5">
                    <li
                      v-for="cat in (categoriesByTemplate['peces-tilapia'] ?? [])"
                      :key="cat.id"
                      class="flex items-center justify-between gap-2 rounded-md bg-background px-3 py-2 text-sm"
                    >
                      <span>{{ cat.name }}</span>
                      <div class="flex items-center gap-2">
                        <span class="font-mono text-xs text-muted-foreground">{{ cat.code }}</span>
                        <Button
                          v-if="hasPermission('template-config.edit')"
                          variant="ghost"
                          size="icon"
                          class="h-7 w-7 text-destructive hover:text-destructive"
                          @click="deleteCategory(cat.id)"
                        >
                          <Icon name="i-lucide-trash-2" class="h-4 w-4" />
                        </Button>
                      </div>
                    </li>
                    <li v-if="!(categoriesByTemplate['peces-tilapia'] ?? []).length" class="py-4 text-center text-sm text-muted-foreground">
                      Sin tipos. Crea el primero.
                    </li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <CreateCategoryDialog
        v-model:open="showCreateCategoryDialog"
        :template-key="newCategoryTemplate"
        @created="closeCreateCategoryDialog(); fetchData()"
        @cancel="closeCreateCategoryDialog()"
      />
    </div>
  </SettingsLayout>
</template>
