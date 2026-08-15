<script setup lang="ts">
import {
  formatVentanillaIntakeDate,
  ventanillaIntakeReceiptCode,
  ventanillaIntakeSourceLabel,
  ventanillaIntakeStatusLabel,
} from '~/utils/ventanilla-intake-display'
import type { VentanillaCatalogData, VentanillaFunctionalTypeRow, VentanillaIntakeRow } from '~/types/ventanilla'

interface OrgUnitOption {
  id: number
  name: string
  code: string
  is_document_producer?: boolean
}

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'ventanilla_clasificar',
})

const route = useRoute()
const router = useRouter()
const { $api } = useNuxtApp()
const ventanillaApi = useVentanillaApi()

const intakeId = computed(() => Number(route.params.id))
const intake = ref<VentanillaIntakeRow | null>(null)
const catalog = ref<VentanillaCatalogData | null>(null)
const orgUnits = ref<OrgUnitOption[]>([])
const loading = ref(true)
const errorMessage = ref('')
const successMessage = ref('')
const openingIntakeFileId = ref<number | null>(null)

function functionalTypeLabel(key: string | null | undefined): string {
  if (!key) {
    return ''
  }

  return catalog.value?.functional_types.find((item: VentanillaFunctionalTypeRow) => item.key === key)?.label ?? key
}

async function loadPageData() {
  loading.value = true
  errorMessage.value = ''

  try {
    const [intakeData, catalogData] = await Promise.all([
      ventanillaApi.fetchIntake(intakeId.value),
      ventanillaApi.fetchCatalog(),
    ])

    intake.value = intakeData
    catalog.value = catalogData

    const api = $api as <T>(url: string, options?: Record<string, unknown>) => Promise<T>
    const res = await api<{ data: OrgUnitOption[] }>('/organizational-structure/org-units', {
      query: { per_page: 200, is_active: true },
    })
    orgUnits.value = res.data ?? []
  }
  catch {
    intake.value = null
    errorMessage.value = 'No se encontró la entrada o no tiene permiso para verla.'
  }
  finally {
    loading.value = false
  }
}

async function viewIntakeFile(fileId: number, mimeType?: string | null) {
  if (!intake.value) {
    return
  }

  openingIntakeFileId.value = fileId
  errorMessage.value = ''

  try {
    await ventanillaApi.viewIntakeFileInNewTab(intake.value.id, fileId, mimeType ?? undefined)
  }
  catch {
    errorMessage.value = 'No se pudo abrir el archivo.'
  }
  finally {
    openingIntakeFileId.value = null
  }
}

function onClassified(payload: { filingId: number; filingNumber: string }) {
  successMessage.value = `Radicado ${payload.filingNumber} creado correctamente.`
  loadPageData()
}

function onDiscarded() {
  successMessage.value = 'Entrada descartada.'
  loadPageData()
}

watch(intakeId, () => {
  loadPageData()
})

onMounted(() => {
  loadPageData()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="space-y-2">
        <Button variant="ghost" size="sm" class="-ml-2" @click="router.push('/ventanilla/bandeja')">
          <Icon name="i-lucide-arrow-left" class="mr-1 size-4" />
          Volver a bandeja
        </Button>
        <div v-if="intake">
          <div class="flex flex-wrap items-center gap-2">
            <h1 class="text-2xl font-semibold tracking-tight">
              {{ ventanillaIntakeReceiptCode(intake.id) }}
            </h1>
            <Badge variant="outline">{{ ventanillaIntakeSourceLabel(intake.source) }}</Badge>
            <Badge :variant="intake.status === 'pending_classification' ? 'default' : 'secondary'">
              {{ ventanillaIntakeStatusLabel(intake.status) }}
            </Badge>
          </div>
          <p class="text-muted-foreground mt-1 text-sm">
            {{ intake.subject }} · Recibida {{ formatVentanillaIntakeDate(intake.received_at) }}
          </p>
        </div>
        <div v-else-if="!loading">
          <h1 class="text-2xl font-semibold tracking-tight">
            Clasificación de entrada
          </h1>
        </div>
      </div>
    </div>

    <p v-if="successMessage" class="text-sm text-emerald-600 dark:text-emerald-400">
      {{ successMessage }}
    </p>
    <p v-if="errorMessage" class="text-destructive text-sm">
      {{ errorMessage }}
    </p>

    <div v-if="loading" class="grid gap-6 xl:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
      <Skeleton class="h-80 w-full" />
      <Skeleton class="h-[32rem] w-full" />
    </div>

    <div v-else-if="intake" class="grid items-start gap-6 xl:grid-cols-[minmax(280px,340px)_minmax(0,1fr)]">
      <Card class="xl:sticky xl:top-6">
        <CardHeader>
          <CardTitle class="text-base">
            Entrada recibida
          </CardTitle>
          <CardDescription>
            Datos del remitente y anexos antes de radicar.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4 text-sm">
          <div class="space-y-1">
            <p class="text-muted-foreground text-xs uppercase tracking-wide">
              Remitente
            </p>
            <p class="font-medium">{{ intake.sender_name ?? 'Sin nombre' }}</p>
            <p class="text-muted-foreground">{{ intake.sender_email ?? 'Sin correo' }}</p>
            <p v-if="intake.sender_identifier" class="text-muted-foreground">
              ID: {{ intake.sender_identifier }}
            </p>
          </div>

          <div v-if="intake.suggested_functional_type_key" class="space-y-1">
            <p class="text-muted-foreground text-xs uppercase tracking-wide">
              Tipo sugerido
            </p>
            <p>{{ functionalTypeLabel(intake.suggested_functional_type_key) }}</p>
          </div>

          <div v-if="intake.body" class="space-y-1">
            <p class="text-muted-foreground text-xs uppercase tracking-wide">
              Mensaje
            </p>
            <p class="whitespace-pre-wrap rounded-lg bg-muted/40 p-3 text-sm">
              {{ intake.body }}
            </p>
          </div>

          <div class="space-y-2">
            <p class="text-muted-foreground text-xs uppercase tracking-wide">
              Anexos ({{ intake.files?.length ?? 0 }})
            </p>
            <div
              v-for="file in intake.files ?? []"
              :key="file.id"
              class="flex items-center justify-between gap-2 rounded-lg border p-2"
            >
              <div class="min-w-0">
                <p class="truncate font-medium">{{ file.title }}</p>
                <p class="text-muted-foreground truncate text-xs">{{ file.original_name }}</p>
              </div>
              <Button
                variant="ghost"
                size="sm"
                class="shrink-0"
                :disabled="openingIntakeFileId === file.id"
                @click="viewIntakeFile(file.id, file.mime_type)"
              >
                <Icon
                  :name="openingIntakeFileId === file.id ? 'i-lucide-loader-2' : 'i-lucide-external-link'"
                  class="size-4"
                  :class="{ 'animate-spin': openingIntakeFileId === file.id }"
                />
              </Button>
            </div>
            <p v-if="!(intake.files?.length)" class="text-muted-foreground">
              Sin archivos adjuntos.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clasificar y radicar</CardTitle>
          <CardDescription>
            Complete el formulario con el espacio necesario para TRD, metadatos y responsables.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VentanillaIntakeClassificationPanel
            :intake="intake"
            :catalog="catalog"
            :org-units="orgUnits"
            @classified="onClassified"
            @discarded="onDiscarded"
          />
        </CardContent>
      </Card>
    </div>
  </div>
</template>
