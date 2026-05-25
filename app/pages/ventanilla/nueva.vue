<script setup lang="ts">
import { VENTANILLA_FILING_TYPE_LABELS } from '~/constants/ventanilla'
import type { VentanillaCatalogData, VentanillaFilingTypeValue, VentanillaFunctionalTypeRow } from '~/types/ventanilla'

interface VentanillaOrgUnitOption {
  id: number
  name: string
  code: string
  is_document_producer?: boolean
}

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'ventanilla_crear',
})

const router = useRouter()
const ventanillaApi = useVentanillaApi()
const { hasPermission } = usePermissions()
const { $api } = useNuxtApp()

const catalog = ref<VentanillaCatalogData | null>(null)
const saving = ref(false)
const errorMessage = ref('')

const filingType = ref<VentanillaFilingTypeValue>('incoming')
const functionalTypeKey = ref('')
const requiresResponseOverride = ref<boolean | null>(null)
const producerOrgUnitId = ref<number | null>(null)
const recipientOrgUnitId = ref<number | null>(null)
const docDocumentTypeId = ref<number | null>(null)
const senderName = ref('')
const senderIdentifier = ref('')
const recipientName = ref('')
const recipientIdentifier = ref('')
const subject = ref('')
const receptionMedium = ref('')
const notes = ref('')
const metadataValues = ref<Record<string, unknown>>({})

const orgUnits = ref<VentanillaOrgUnitOption[]>([])
const fileRows = ref<Array<{ file: File | null; title: string }>>([{ file: null, title: 'Documento principal' }])

const canOverrideResponse = computed(() => hasPermission('ventanilla_override_respuesta'))

const responsibleOrgUnitId = computed(() => {
  if (filingType.value === 'incoming') {
    return recipientOrgUnitId.value
  }

  return producerOrgUnitId.value
})

const selectedFunctionalType = computed(() =>
  catalog.value?.functional_types.find((t: VentanillaFunctionalTypeRow) => t.key === functionalTypeKey.value),
)

const effectiveRequiresResponse = computed(() => {
  if (requiresResponseOverride.value !== null) {
    return requiresResponseOverride.value
  }

  return selectedFunctionalType.value?.requires_response_default ?? true
})

watch(functionalTypeKey, () => {
  requiresResponseOverride.value = null
})

onMounted(async () => {
  catalog.value = await ventanillaApi.fetchCatalog()
  try {
    const api = $api as <T>(url: string, options?: Record<string, unknown>) => Promise<T>
    const res = await api<{ data: VentanillaOrgUnitOption[] }>('/organizational-structure/org-units', {
      query: { per_page: 200, is_active: true },
    })
    orgUnits.value = res.data ?? []
  } catch {
    orgUnits.value = []
  }
})

function addFileRow() {
  fileRows.value.push({ file: null, title: '' })
}

function removeFileRow(index: number) {
  if (fileRows.value.length <= 1) {
    return
  }
  fileRows.value.splice(index, 1)
}

function setFilingType(key: string) {
  filingType.value = key as VentanillaFilingTypeValue
}

function toggleResponseOverride(value: boolean | 'indeterminate') {
  const enabled = value === true
  if (!selectedFunctionalType.value) {
    return
  }
  requiresResponseOverride.value = enabled
    ? !selectedFunctionalType.value.requires_response_default
    : null
}

function setRequiresResponseFromSelect(value: unknown) {
  requiresResponseOverride.value = String(value) === '1'
}

function onFileChange(index: number, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  const row = fileRows.value[index]
  if (!row) {
    return
  }
  row.file = file
  if (file && !row.title.trim()) {
    row.title = file.name
  }
}

async function submit() {
  errorMessage.value = ''
  if (!functionalTypeKey.value) {
    errorMessage.value = 'Seleccione el tipo funcional'
    return
  }
  if (!subject.value.trim()) {
    errorMessage.value = 'El asunto es obligatorio'
    return
  }
  if (filingType.value === 'incoming' && !recipientOrgUnitId.value) {
    errorMessage.value = 'Seleccione el área destinataria'
    return
  }
  if (filingType.value !== 'incoming' && !producerOrgUnitId.value) {
    errorMessage.value = 'Seleccione el área productora'
    return
  }
  if (!docDocumentTypeId.value) {
    errorMessage.value = 'Complete la clasificación TRD (tipo documental)'
    return
  }

  const withFiles = fileRows.value.filter((r: { file: File | null; title: string }) => r.file)
  if (withFiles.length === 0) {
    errorMessage.value = 'Adjunte al menos un archivo'
    return
  }

  const fd = new FormData()
  fd.append('filing_type', filingType.value)
  fd.append('functional_type_key', functionalTypeKey.value)
  if (requiresResponseOverride.value !== null) {
    fd.append('requires_response', requiresResponseOverride.value ? '1' : '0')
  }
  if (producerOrgUnitId.value) {
    fd.append('producer_org_unit_id', String(producerOrgUnitId.value))
  }
  if (recipientOrgUnitId.value) {
    fd.append('recipient_org_unit_id', String(recipientOrgUnitId.value))
  }
  if (senderName.value.trim()) {
    fd.append('sender_name', senderName.value.trim())
  }
  if (senderIdentifier.value.trim()) {
    fd.append('sender_identifier', senderIdentifier.value.trim())
  }
  if (recipientName.value.trim()) {
    fd.append('recipient_name', recipientName.value.trim())
  }
  if (recipientIdentifier.value.trim()) {
    fd.append('recipient_identifier', recipientIdentifier.value.trim())
  }
  fd.append('subject', subject.value.trim())
  if (receptionMedium.value) {
    fd.append('reception_medium', receptionMedium.value)
  }
  if (notes.value.trim()) {
    fd.append('notes', notes.value.trim())
  }
  fd.append('doc_document_type_id', String(docDocumentTypeId.value))
  if (Object.keys(metadataValues.value).length > 0) {
    fd.append('metadata_values', JSON.stringify(metadataValues.value))
  }

  withFiles.forEach((row: { file: File | null; title: string }, index: number) => {
    if (!row.file) {
      return
    }
    fd.append(`files[${index}][file]`, row.file)
    fd.append(`files[${index}][title]`, row.title.trim() || row.file.name)
    if (index === 0) {
      fd.append(`files[${index}][is_primary]`, '1')
    }
  })

  saving.value = true
  try {
    const created = await ventanillaApi.createFiling(fd)
    await router.push(`/ventanilla/${created.id}`)
  } catch (e: unknown) {
    const err = e as { data?: { message?: string; errors?: Record<string, string[]> } }
    const first = err.data?.errors ? Object.values(err.data.errors)[0]?.[0] : null
    errorMessage.value = first ?? err.data?.message ?? 'No se pudo registrar el radicado'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
    <div class="flex items-center gap-3">
      <Button variant="ghost" size="icon" @click="router.push('/ventanilla')">
        <Icon name="i-lucide-arrow-left" class="size-4" />
      </Button>
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">
          Radicar documento
        </h1>
        <p class="text-muted-foreground text-sm">
          Ventanilla única — registro manual
        </p>
      </div>
    </div>

    <form class="space-y-6" @submit.prevent="submit">
      <p v-if="errorMessage" class="text-destructive text-sm">
        {{ errorMessage }}
      </p>

      <Card>
        <CardHeader>
          <CardTitle>Tipo de radicación</CardTitle>
        </CardHeader>
        <CardContent class="grid gap-4 md:grid-cols-3">
          <button
            v-for="(label, key) in VENTANILLA_FILING_TYPE_LABELS"
            :key="key"
            type="button"
            class="rounded-lg border p-4 text-left transition-colors"
            :class="filingType === key ? 'border-primary bg-primary/5' : 'border-border hover:bg-muted/50'"
            @click="setFilingType(key)"
          >
            <span class="font-medium">{{ label }}</span>
          </button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clasificación funcional</CardTitle>
        </CardHeader>
        <CardContent class="grid gap-4">
          <div class="space-y-2">
            <Label>Tipo funcional *</Label>
            <Select v-model="functionalTypeKey">
              <SelectTrigger>
                <SelectValue placeholder="Seleccione…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="t in catalog?.functional_types ?? []"
                  :key="t.key"
                  :value="t.key"
                >
                  {{ t.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p v-if="selectedFunctionalType" class="text-muted-foreground text-xs">
            <template v-if="effectiveRequiresResponse">
              Requiere respuesta — SLA: {{ selectedFunctionalType.sla_business_days ?? '—' }} días hábiles
            </template>
            <template v-else>
              No requiere respuesta (sin SLA)
            </template>
          </p>
          <div v-if="canOverrideResponse && selectedFunctionalType" class="flex items-center gap-2">
            <Checkbox
              :checked="requiresResponseOverride !== null"
              @update:checked="toggleResponseOverride"
            />
            <Label class="font-normal">
              Ajustar manualmente obligación de respuesta
            </Label>
            <Select
              v-if="requiresResponseOverride !== null"
              :model-value="requiresResponseOverride ? '1' : '0'"
              @update:model-value="setRequiresResponseFromSelect"
            >
              <SelectTrigger class="w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">
                  Requiere respuesta
                </SelectItem>
                <SelectItem value="0">
                  No requiere respuesta
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Datos del radicado</CardTitle>
        </CardHeader>
        <CardContent class="grid gap-4 md:grid-cols-2">
          <div v-if="filingType === 'incoming'" class="space-y-2 md:col-span-2">
            <Label>Área destinataria *</Label>
            <Select
              :model-value="recipientOrgUnitId != null ? String(recipientOrgUnitId) : undefined"
              @update:model-value="recipientOrgUnitId = $event ? Number($event) : null"
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="u in orgUnits"
                  :key="u.id"
                  :value="String(u.id)"
                >
                  {{ u.code }} — {{ u.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div v-else class="space-y-2 md:col-span-2">
            <Label>Área productora *</Label>
            <Select
              :model-value="producerOrgUnitId != null ? String(producerOrgUnitId) : undefined"
              @update:model-value="producerOrgUnitId = $event ? Number($event) : null"
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="u in orgUnits.filter(x => x.is_document_producer)"
                  :key="u.id"
                  :value="String(u.id)"
                >
                  {{ u.code }} — {{ u.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label>Remitente</Label>
            <Input v-model="senderName" placeholder="Nombre" />
          </div>
          <div class="space-y-2">
            <Label>Identificación remitente</Label>
            <Input v-model="senderIdentifier" />
          </div>
          <div class="space-y-2">
            <Label>Destinatario</Label>
            <Input v-model="recipientName" />
          </div>
          <div class="space-y-2">
            <Label>Identificación destinatario</Label>
            <Input v-model="recipientIdentifier" />
          </div>
          <div class="space-y-2 md:col-span-2">
            <Label>Asunto *</Label>
            <Input v-model="subject" maxlength="500" />
          </div>
          <div class="space-y-2">
            <Label>Medio de recepción</Label>
            <Select v-model="receptionMedium">
              <SelectTrigger>
                <SelectValue placeholder="Opcional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="m in catalog?.reception_media ?? []"
                  :key="m.value"
                  :value="m.value"
                >
                  {{ m.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2 md:col-span-2">
            <Label>Observaciones</Label>
            <Textarea v-model="notes" rows="3" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Clasificación archivística (TRD)</CardTitle>
          <CardDescription>
            Según el área responsable y la TRD vigente
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VentanillaTrdPicker
            :org-unit-id="responsibleOrgUnitId"
            v-model:doc-document-type-id="docDocumentTypeId"
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Metadatos</CardTitle>
          <CardDescription>
            Campos dinámicos según el tipo funcional y la clasificación TRD.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VentanillaArchivalMetadataFields
            v-model="metadataValues"
            :doc-document-type-id="docDocumentTypeId"
            :functional-type-key="functionalTypeKey"
          />
          <p v-if="!docDocumentTypeId && !functionalTypeKey" class="text-muted-foreground text-sm">
            Seleccione tipo funcional y tipo documental para cargar los metadatos aplicables.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between">
          <CardTitle>Archivos *</CardTitle>
          <Button type="button" variant="outline" size="sm" @click="addFileRow">
            <Icon name="i-lucide-plus" class="mr-1 size-4" />
            Anexo
          </Button>
        </CardHeader>
        <CardContent class="space-y-4">
          <div
            v-for="(row, index) in fileRows"
            :key="index"
            class="flex flex-wrap items-end gap-3 rounded-lg border p-3"
          >
            <div class="min-w-[200px] flex-1 space-y-2">
              <Label>Título</Label>
              <Input v-model="row.title" />
            </div>
            <div class="min-w-[200px] flex-1 space-y-2">
              <Label>Archivo</Label>
              <Input type="file" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" @change="onFileChange(index, $event)" />
            </div>
            <Button
              v-if="fileRows.length > 1"
              type="button"
              variant="ghost"
              size="icon"
              @click="removeFileRow(index)"
            >
              <Icon name="i-lucide-trash-2" class="size-4 text-destructive" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <div class="flex justify-end gap-3">
        <Button type="button" variant="outline" @click="router.push('/ventanilla')">
          Cancelar
        </Button>
        <Button type="submit" :disabled="saving">
          {{ saving ? 'Registrando…' : 'Registrar radicado' }}
        </Button>
      </div>
    </form>
  </div>
</template>
