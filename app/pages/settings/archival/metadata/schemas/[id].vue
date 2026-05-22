<script setup lang="ts">
import { toast } from 'vue-sonner'
import {
  ARCHIVAL_METADATA_APPLICATION_LEVEL_LABELS,
  ARCHIVAL_METADATA_FIELD_DATA_TYPE_OPTIONS,
  ARCHIVAL_METADATA_SCHEMA_STATUS_LABELS,
} from '~/constants/archival-metadata'
import type { ArchivalMetadataFieldRow, ArchivalMetadataSchemaRow } from '~/composables/useArchivalMetadataApi'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'trd_metadatos_ver',
})

const route = useRoute()
const router = useRouter()
const metaApi = useArchivalMetadataApi()
const { hasPermission } = usePermissions()

const schemaId = computed(() => Number(route.params.id))
const schema = ref<ArchivalMetadataSchemaRow | null>(null)
const loading = ref(true)
const saving = ref(false)

const metaForm = ref({ name: '', description: '' })
const showFieldForm = ref(false)
const editingFieldId = ref<number | null>(null)
const fieldForm = ref({
  code: '',
  name: '',
  data_type: 'text',
  is_required: false,
  sort_order: 0,
  is_active: true,
  is_reusable: false,
  is_variable: false,
  is_ocr_extractable: false,
  is_autocompletable: false,
  is_searchable: false,
  is_reportable: false,
  options: [] as Array<{ value: string, label: string }>,
})

const isDraft = computed(() => schema.value?.status === 'draft')
const canEdit = computed(() => isDraft.value && hasPermission('trd_metadatos_editar'))

function resetFieldForm() {
  editingFieldId.value = null
  fieldForm.value = {
    code: '',
    name: '',
    data_type: 'text',
    is_required: false,
    sort_order: (schema.value?.fields?.length ?? 0) + 1,
    is_active: true,
    is_reusable: false,
    is_variable: false,
    is_ocr_extractable: false,
    is_autocompletable: false,
    is_searchable: false,
    is_reportable: false,
    options: [],
  }
}

async function reload() {
  loading.value = true
  try {
    schema.value = await metaApi.fetchSchema(schemaId.value)
    metaForm.value = {
      name: schema.value.name,
      description: schema.value.description ?? '',
    }
  } catch {
    toast.error('No se pudo cargar el esquema.')
  } finally {
    loading.value = false
  }
}

onMounted(reload)

async function saveMeta() {
  if (!canEdit.value || !schema.value) {
    return
  }
  saving.value = true
  try {
    const res = await metaApi.updateSchema(schema.value.id, metaForm.value)
    schema.value = res.data
    toast.success(res.message ?? 'Guardado.')
  } catch {
    toast.error('No se pudo guardar.')
  } finally {
    saving.value = false
  }
}

async function activate() {
  if (!schema.value) {
    return
  }
  try {
    const res = await metaApi.activateSchema(schema.value.id)
    schema.value = res.data
    toast.success(res.message ?? 'Esquema activado.')
  } catch {
    toast.error('No se pudo activar. Verifique campos activos.')
  }
}

async function duplicate() {
  if (!schema.value) {
    return
  }
  try {
    const res = await metaApi.duplicateSchema(schema.value.id)
    toast.success(res.message ?? 'Nueva versión creada.')
    await router.push(`/settings/archival/metadata/schemas/${res.data.id}`)
  } catch {
    toast.error('No se pudo versionar.')
  }
}

function editField(f: ArchivalMetadataFieldRow) {
  if (!canEdit.value) {
    return
  }
  editingFieldId.value = f.id ?? null
  fieldForm.value = {
    code: f.code,
    name: f.name,
    data_type: f.data_type,
    is_required: f.is_required,
    sort_order: f.sort_order,
    is_active: f.is_active,
    is_reusable: f.is_reusable,
    is_variable: f.is_variable,
    is_ocr_extractable: f.is_ocr_extractable,
    is_autocompletable: f.is_autocompletable,
    is_searchable: f.is_searchable,
    is_reportable: f.is_reportable,
    options: [...(f.options ?? [])],
  }
  showFieldForm.value = true
}

async function saveField() {
  if (!schema.value || !canEdit.value) {
    return
  }
  const body = {
    ...fieldForm.value,
    options: fieldForm.value.data_type === 'select' ? fieldForm.value.options : null,
  }
  try {
    if (editingFieldId.value) {
      await metaApi.updateField(schema.value.id, editingFieldId.value, body)
    } else {
      await metaApi.addField(schema.value.id, body)
    }
    showFieldForm.value = false
    resetFieldForm()
    await reload()
    toast.success('Campo guardado.')
  } catch {
    toast.error('No se pudo guardar el campo.')
  }
}

function addSelectOption() {
  fieldForm.value.options.push({ value: '', label: '' })
}
</script>

<template>
  <SettingsLayout :wide="true">
    <div v-if="loading" class="text-muted-foreground text-sm">
      Cargando…
    </div>
    <div v-else-if="schema" class="flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <h2 class="text-2xl font-bold tracking-tight">
            {{ schema.name }}
          </h2>
          <p class="text-sm text-muted-foreground">
            v{{ schema.version_number }} ·
            {{ ARCHIVAL_METADATA_SCHEMA_STATUS_LABELS[schema.status] ?? schema.status }} ·
            {{ ARCHIVAL_METADATA_APPLICATION_LEVEL_LABELS[schema.application_level] ?? schema.application_level }}
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button variant="outline" @click="router.push('/settings/archival/metadata/schemas')">
            Listado
          </Button>
          <Button
            v-if="canEdit"
            variant="default"
            @click="activate"
          >
            Activar
          </Button>
          <Button
            v-if="schema.status === 'active' && hasPermission('trd_metadatos_editar')"
            variant="secondary"
            @click="duplicate"
          >
            Nueva versión
          </Button>
        </div>
      </div>

      <Card v-if="canEdit">
        <CardHeader>
          <CardTitle class="text-base">
            Datos del esquema
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-3 max-w-xl">
          <div class="space-y-2">
            <Label>Nombre</Label>
            <Input v-model="metaForm.name" />
          </div>
          <div class="space-y-2">
            <Label>Descripción</Label>
            <Textarea v-model="metaForm.description" rows="2" />
          </div>
          <Button :disabled="saving" @click="saveMeta">
            Guardar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader class="flex flex-row items-center justify-between">
          <CardTitle class="text-base">
            Campos
          </CardTitle>
          <Button
            v-if="canEdit"
            size="sm"
            variant="outline"
            @click="showFieldForm = true; resetFieldForm()"
          >
            Agregar campo
          </Button>
        </CardHeader>
        <CardContent>
          <div v-if="!schema.fields?.length" class="text-sm text-muted-foreground">
            Sin campos definidos.
          </div>
          <ul v-else class="space-y-2">
            <li
              v-for="f in schema.fields"
              :key="f.id"
              class="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
            >
              <span>
                <span class="font-mono text-xs text-muted-foreground">{{ f.code }}</span>
                — {{ f.name }}
                <span v-if="f.is_required" class="text-destructive">*</span>
              </span>
              <Button v-if="canEdit" variant="ghost" size="sm" @click="editField(f)">
                Editar
              </Button>
            </li>
          </ul>
        </CardContent>
      </Card>

      <Card v-if="showFieldForm && canEdit">
        <CardHeader>
          <CardTitle class="text-base">
            {{ editingFieldId ? 'Editar campo' : 'Nuevo campo' }}
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-3 max-w-xl">
          <div class="grid gap-3 sm:grid-cols-2">
            <div class="space-y-2">
              <Label>Código (snake_case) *</Label>
              <Input v-model="fieldForm.code" :disabled="!!editingFieldId" placeholder="ej. numero_folio" />
            </div>
            <div class="space-y-2">
              <Label>Nombre visible *</Label>
              <Input v-model="fieldForm.name" />
            </div>
            <div class="space-y-2">
              <Label>Tipo de dato *</Label>
              <Select v-model="fieldForm.data_type">
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="opt in ARCHIVAL_METADATA_FIELD_DATA_TYPE_OPTIONS"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-2">
              <Label>Orden</Label>
              <Input v-model.number="fieldForm.sort_order" type="number" min="0" />
            </div>
          </div>
          <div class="flex flex-wrap gap-4 text-sm">
            <label class="flex items-center gap-2">
              <Checkbox v-model="fieldForm.is_required" /> Obligatorio
            </label>
            <label class="flex items-center gap-2">
              <Checkbox v-model="fieldForm.is_ocr_extractable" /> OCR
            </label>
            <label class="flex items-center gap-2">
              <Checkbox v-model="fieldForm.is_searchable" /> Búsqueda
            </label>
            <label class="flex items-center gap-2">
              <Checkbox v-model="fieldForm.is_reportable" /> Reportes
            </label>
          </div>
          <template v-if="fieldForm.data_type === 'select'">
            <p class="text-xs text-muted-foreground">
              Opciones de lista
            </p>
            <div
              v-for="(opt, idx) in fieldForm.options"
              :key="idx"
              class="flex gap-2"
            >
              <Input v-model="opt.value" placeholder="valor" class="flex-1" />
              <Input v-model="opt.label" placeholder="Etiqueta" class="flex-1" />
            </div>
            <Button type="button" variant="outline" size="sm" @click="addSelectOption">
              + Opción
            </Button>
          </template>
          <div class="flex gap-2">
            <Button @click="saveField">
              Guardar campo
            </Button>
            <Button variant="ghost" @click="showFieldForm = false">
              Cancelar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </SettingsLayout>
</template>
