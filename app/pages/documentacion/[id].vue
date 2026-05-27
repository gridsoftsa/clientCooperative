<script setup lang="ts">
import { toast } from 'vue-sonner'
import {
  DOCUMENTATION_VAULT_CATEGORY_FILTER_OPTIONS,
  DOCUMENTATION_VAULT_CATEGORY_ORDER,
  type DocumentationVaultCategoryBlock,
  type DocumentationVaultCategoryKey,
  type DocumentationVaultFileItem,
  type DocumentationVaultGeneratedDoc,
  type DocumentationVaultPayload,
} from '~/constants/documentation-vault'
import {
  getCreditApplicationStatusBadgeVariant,
  getCreditApplicationStatusLabel,
} from '~/constants/credit-application-status'

definePageMeta({
  middleware: 'permission',
  permissions: 'documentacion_ver',
})

const route = useRoute()
const router = useRouter()
const { $api } = useNuxtApp()
const { viewVaultDocument, downloadVaultPdf } = useDocumentationVaultDownload()

const applicationId = computed(() => Number(route.params.id))
const vault = ref<DocumentationVaultPayload | null>(null)
const loading = ref(true)
const openingKey = ref<string | null>(null)

const filterCategory = ref<'all' | DocumentationVaultCategoryKey>('all')
const filterParticipant = ref<'all' | 'debtor' | 'co_debtor'>('all')
const filterSearch = ref('')

const generatedDocuments = computed(() => vault.value?.generated_documents ?? [])

const categoryBlocks = computed((): DocumentationVaultCategoryBlock[] => {
  if (!vault.value) {
    return []
  }
  return DOCUMENTATION_VAULT_CATEGORY_ORDER
    .map((key) => vault.value!.categories[key])
    .filter((block): block is DocumentationVaultCategoryBlock => block != null)
})

function itemOpenKey(item: DocumentationVaultFileItem): string {
  if (item.kind === 'generated_pdf' && item.generated_key) {
    return `gen-${item.generated_key}`
  }
  return `doc-${item.id ?? 0}`
}

function itemIsOpenable(item: DocumentationVaultFileItem): boolean {
  if (item.kind === 'generated_pdf') {
    return item.available !== false
  }
  return typeof item.id === 'number' && item.id > 0
}

async function openVaultItem(item: DocumentationVaultFileItem): Promise<void> {
  const key = itemOpenKey(item)
  if (openingKey.value || !itemIsOpenable(item)) {
    return
  }
  openingKey.value = key
  try {
    if (item.kind === 'generated_pdf') {
      const genKey = item.generated_key === 'analisis_score_pdf' ? 'analisis_score' : 'application'
      await downloadVaultPdf(applicationId.value, genKey)
      toast.success('PDF abierto en una nueva pestaña')
      return
    }
    if (item.id) {
      await viewVaultDocument(applicationId.value, item.id)
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'No se pudo abrir el archivo'
    toast.error(msg)
  } finally {
    openingKey.value = null
  }
}

async function openGeneratedPdf(doc: DocumentationVaultGeneratedDoc): Promise<void> {
  if (!doc.available) {
    return
  }
  const key = `gen-${doc.key}`
  if (openingKey.value) {
    return
  }
  openingKey.value = key
  try {
    const kind = doc.key === 'analisis_score_pdf' ? 'analisis_score' : 'application'
    await downloadVaultPdf(applicationId.value, kind)
    toast.success('PDF abierto en una nueva pestaña')
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'No se pudo abrir el PDF'
    toast.error(msg)
  } finally {
    openingKey.value = null
  }
}

const filteredCategoryBlocks = computed(() => {
  const q = filterSearch.value.trim().toLowerCase()
  return categoryBlocks.value
    .filter((block) => filterCategory.value === 'all' || block.key === filterCategory.value)
    .map((block) => {
      const items = block.items.filter((item: DocumentationVaultFileItem) => {
        if (filterParticipant.value !== 'all' && item.participant_role !== filterParticipant.value) {
          return false
        }
        if (!q) {
          return true
        }
        const hay = [
          item.title,
          item.original_name,
          item.checklist_label,
          item.checklist_key,
        ].filter(Boolean).join(' ').toLowerCase()
        return hay.includes(q)
      })
      return { ...block, items }
    })
    .filter(block => block.items.length > 0 || filterCategory.value === block.key)
})

const totalVisibleFiles = computed(() =>
  filteredCategoryBlocks.value.reduce((acc, b) => acc + b.items.length, 0),
)

async function loadVault(): Promise<void> {
  const id = applicationId.value
  if (!Number.isFinite(id) || id < 1) {
    loading.value = false
    return
  }
  loading.value = true
  try {
    const res = await $api<{ data: DocumentationVaultPayload }>(
      `/documentation/credit-applications/${id}`,
    )
    vault.value = res.data
  } catch (e) {
    console.error(e)
    toast.error('No se pudo cargar el expediente documental')
    vault.value = null
  } finally {
    loading.value = false
  }
}

function participantLabel(role: string): string {
  return role === 'co_debtor' ? 'Codeudor' : 'Deudor'
}

function fileDisplayName(item: DocumentationVaultFileItem): string {
  if (item.kind === 'generated_pdf') {
    return item.original_name || item.title || 'PDF generado'
  }
  return item.original_name || item.title || `Documento #${item.id}`
}

watch(applicationId, () => {
  void loadVault()
}, { immediate: true })
</script>

<template>
  <div class="flex w-full flex-col gap-4">
    <div class="flex flex-wrap items-start justify-between gap-3">
      <div class="space-y-1">
        <Button variant="ghost" size="sm" class="-ml-2 mb-1" @click="router.push('/documentacion')">
          <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
          Volver al listado
        </Button>
        <h2 class="text-2xl font-bold tracking-tight">
          Expediente documental
        </h2>
        <p v-if="vault" class="text-sm text-muted-foreground">
          <span class="font-mono font-medium text-foreground">{{ vault.code || `ID ${vault.credit_application_id}` }}</span>
          <span v-if="vault.numero_radicado_externo"> · Externo {{ vault.numero_radicado_externo }}</span>
        </p>
      </div>
      <div v-if="vault" class="flex flex-wrap gap-2">
        <Badge :variant="getCreditApplicationStatusBadgeVariant(vault.status)">
          {{ getCreditApplicationStatusLabel(vault.status) }}
        </Badge>
        <Badge v-if="vault.credito_garantia_fng" variant="secondary">
          Garantía FNG
        </Badge>
        <Badge v-if="vault.documentation_insurability_required" variant="secondary">
          Requiere asegurabilidad
        </Badge>
        <Button variant="outline" size="sm" as-child>
          <NuxtLink :to="`/radicacion/${applicationId}`">
            Ficha de radicación
          </NuxtLink>
        </Button>
      </div>
    </div>

    <div v-if="loading" class="flex justify-center py-16">
      <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
    </div>

    <template v-else-if="vault">
      <Card>
        <CardHeader>
          <CardTitle class="text-base">
            PDFs generados por el sistema
          </CardTitle>
          <CardDescription>
            Solicitud de crédito y Análisis y SCORE (cuando hay datos guardados).
          </CardDescription>
        </CardHeader>
        <CardContent class="grid gap-3 sm:grid-cols-2">
          <div
            v-for="doc in generatedDocuments"
            :key="doc.key"
            class="flex flex-col gap-2 rounded-lg border p-4"
            :class="!doc.available ? 'opacity-75 bg-muted/20' : 'border-primary/20 bg-primary/5'"
          >
            <div class="flex items-start gap-2">
              <Icon name="i-lucide-file-text" class="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <div class="min-w-0">
                <p class="text-sm font-medium">
                  {{ doc.label }}
                </p>
                <p class="text-xs text-muted-foreground leading-relaxed mt-1">
                  {{ doc.description }}
                </p>
              </div>
            </div>
            <Button
              v-if="doc.available"
              variant="default"
              size="sm"
              class="mt-auto w-fit"
              :disabled="openingKey === `gen-${doc.key}`"
              @click="void openGeneratedPdf(doc)"
            >
              <Icon
                :name="openingKey === `gen-${doc.key}` ? 'i-lucide-loader-2' : 'i-lucide-external-link'"
                class="mr-2 h-4 w-4"
                :class="{ 'animate-spin': openingKey === `gen-${doc.key}` }"
              />
              Ver PDF
            </Button>
            <p v-else class="text-xs text-amber-700 dark:text-amber-400">
              No disponible para esta solicitud.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-base">
            Filtros del expediente
          </CardTitle>
        </CardHeader>
        <CardContent class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
          <div class="space-y-1.5 min-w-[200px]">
            <Label class="text-xs text-muted-foreground">Categoría</Label>
            <Select v-model="filterCategory">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="opt in DOCUMENTATION_VAULT_CATEGORY_FILTER_OPTIONS"
                  :key="opt.value"
                  :value="opt.value"
                >
                  {{ opt.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-1.5 min-w-[160px]">
            <Label class="text-xs text-muted-foreground">Participante</Label>
            <Select v-model="filterParticipant">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">
                  Todos
                </SelectItem>
                <SelectItem value="debtor">
                  Deudor
                </SelectItem>
                <SelectItem value="co_debtor">
                  Codeudores
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="flex-1 min-w-[200px] space-y-1.5">
            <Label class="text-xs text-muted-foreground">Buscar en archivos</Label>
            <Input v-model="filterSearch" placeholder="Nombre, título o ítem del checklist" />
          </div>
        </CardContent>
      </Card>

      <p class="text-sm text-muted-foreground">
        {{ totalVisibleFiles }} archivo{{ totalVisibleFiles === 1 ? '' : 's' }} visible{{ totalVisibleFiles === 1 ? '' : 's' }}
        · Total en solicitud: {{ vault.totals.all ?? 0 }}
      </p>

      <div class="space-y-4">
        <Card
          v-for="block in filteredCategoryBlocks"
          :key="block.key"
        >
          <CardHeader class="pb-2">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle class="text-base">
                  {{ block.label }}
                </CardTitle>
                <CardDescription class="mt-1">
                  {{ block.description }}
                </CardDescription>
              </div>
              <Badge variant="outline" class="tabular-nums">
                {{ block.items.length }} / {{ vault.totals[block.key] ?? 0 }}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <p v-if="block.items.length === 0" class="text-sm text-muted-foreground py-4 text-center">
              No hay archivos en esta categoría con los filtros actuales.
            </p>
            <ul v-else class="divide-y rounded-md border">
              <li
                v-for="item in block.items"
                :key="`${block.key}-${itemOpenKey(item)}`"
                class="flex flex-col gap-2 p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div class="min-w-0 space-y-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <Icon
                      v-if="item.kind === 'generated_pdf'"
                      name="i-lucide-file-text"
                      class="h-4 w-4 shrink-0 text-primary"
                    />
                    <p class="text-sm font-medium break-words [overflow-wrap:anywhere]">
                      {{ fileDisplayName(item) }}
                    </p>
                    <Badge v-if="item.kind === 'generated_pdf'" variant="secondary" class="text-[10px]">
                      PDF generado
                    </Badge>
                  </div>
                  <p v-if="item.description && item.kind === 'generated_pdf'" class="text-xs text-muted-foreground">
                    {{ item.description }}
                  </p>
                  <p v-else-if="item.checklist_label" class="text-xs text-muted-foreground">
                    Checklist: {{ item.checklist_label }}
                  </p>
                  <div v-if="item.kind !== 'generated_pdf'" class="flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span>{{ participantLabel(item.participant_role) }}</span>
                    <span v-if="item.is_reviewed" class="text-emerald-700 dark:text-emerald-400">Revisado</span>
                  </div>
                  <p v-if="item.review_comment" class="text-xs text-amber-800 dark:text-amber-300">
                    Nota: {{ item.review_comment }}
                  </p>
                </div>
                <Button
                  v-if="itemIsOpenable(item)"
                  :variant="item.kind === 'generated_pdf' ? 'default' : 'outline'"
                  size="sm"
                  class="shrink-0"
                  :disabled="openingKey === itemOpenKey(item)"
                  @click="void openVaultItem(item)"
                >
                  <Icon
                    :name="openingKey === itemOpenKey(item) ? 'i-lucide-loader-2' : 'i-lucide-external-link'"
                    class="mr-2 h-4 w-4"
                    :class="{ 'animate-spin': openingKey === itemOpenKey(item) }"
                  />
                  {{ item.kind === 'generated_pdf' ? 'Ver PDF' : 'Abrir' }}
                </Button>
                <p v-else class="text-xs text-amber-700 dark:text-amber-400 shrink-0">
                  No disponible
                </p>
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </template>

    <Card v-else>
      <CardContent class="py-12 text-center text-muted-foreground">
        No se encontró la radicación o no tiene acceso.
        <Button variant="link" class="mt-2" @click="router.push('/documentacion')">
          Volver al listado
        </Button>
      </CardContent>
    </Card>
  </div>
</template>
