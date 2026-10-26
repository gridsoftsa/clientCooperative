<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { TrdTableRow } from '~/types/archival-trd'
import { messageFromFetchError } from '~/utils/http-error-message'

interface TrdImportOffice {
  id: number
  name: string
  code: string
}

interface TrdImportUnit {
  id: number
  name: string
  code: string
  org_office_id: number
  is_document_producer: boolean
  trd_state: 'draft' | 'published' | null
}

interface TrdImportPreview {
  producer_office_name: string
  producer_office_code: string
  approved_at: string
  series_count: number
  subseries_count: number
  document_types_count: number
  matching_org_unit_id: number | null
  offices: TrdImportOffice[]
  org_units: TrdImportUnit[]
}

const props = defineProps<{
  file: File
  preview: TrdImportPreview
}>()

const emit = defineEmits<{
  imported: [tableId: number]
  cancel: []
}>()

const { $api } = useNuxtApp()

const importing = ref(false)
const areaMode = ref<'existing' | 'create'>('create')
const selectedUnitId = ref<number | null>(null)
const areaName = ref('')
const areaCode = ref('')
const officeId = ref<number | null>(null)
const confirmingCreate = ref(false)

const panel = ref<HTMLElement | null>(null)

const selectableUnits = computed(() => props.preview.org_units)

const selectedUnit = computed(() =>
  selectableUnits.value.find(unit => unit.id === selectedUnitId.value) ?? null,
)

const unitOptions = computed(() => selectableUnits.value.map(unit => ({
  value: unit.id,
  label: unitLabel(unit),
  disabled: unit.trd_state === 'published',
})))

const officeOptions = computed(() => props.preview.offices.map(office => ({
  value: office.id,
  label: `${office.name} (${office.code})`,
})))

const showOfficePicker = computed(() => props.preview.offices.length > 1)

const primaryLabel = computed(() => {
  if (confirmingCreate.value) {
    return 'Crear área e importar'
  }

  if (areaMode.value === 'create') {
    return 'Crear área'
  }

  return 'Importar'
})

const matchingUnit = computed(() => {
  const id = props.preview.matching_org_unit_id
  if (id == null) {
    return null
  }

  return selectableUnits.value.find(unit => unit.id === id) ?? null
})

onMounted(() => {
  resetForm(props.preview)
  panel.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
})

watch(areaMode, () => {
  confirmingCreate.value = false
})

function resetForm(data: TrdImportPreview) {
  areaName.value = data.producer_office_name
  areaCode.value = data.producer_office_code
  const preferredOffice = data.offices.find(office => /direcci[oó]n general/i.test(office.name))
    ?? data.offices[0]
  officeId.value = preferredOffice ? preferredOffice.id : null
  confirmingCreate.value = false

  const match = data.matching_org_unit_id == null
    ? null
    : data.org_units.find(unit => unit.id === data.matching_org_unit_id) ?? null

  if (match && match.trd_state !== 'published') {
    areaMode.value = 'existing'
    selectedUnitId.value = match.id
    return
  }

  areaMode.value = 'create'
  selectedUnitId.value = null
}

function onAreaMode(value: unknown) {
  areaMode.value = value === 'create' ? 'create' : 'existing'
}

function onUnitPicked(value: string | number | null) {
  if (value != null && value !== '') {
    areaMode.value = 'existing'
  }
}

function onOfficePicked(value: string | number | null) {
  if (value != null && value !== '') {
    areaMode.value = 'create'
  }
}

function unitLabel(unit: TrdImportUnit): string {
  const state = unit.trd_state === 'published'
    ? ' · TRD publicada'
    : unit.trd_state === 'draft'
      ? ' · borrador'
      : ''

  return `${unit.name} (${unit.code})${state}`
}

function requestImport() {
  if (areaMode.value === 'create' && !confirmingCreate.value) {
    if (!areaName.value.trim() || !areaCode.value.trim()) {
      toast.error('Escriba el nombre y el código del área')
      return
    }
    confirmingCreate.value = true
    return
  }

  if (areaMode.value === 'existing' && selectedUnit.value?.trd_state === 'published') {
    toast.error('Esa área ya tiene una TRD publicada. Elija otra o cree un área nueva.')
    return
  }

  if (areaMode.value === 'existing' && selectedUnitId.value == null) {
    toast.error('Seleccione un área')
    return
  }

  void submitImport()
}

async function submitImport() {
  importing.value = true
  try {
    const body = new FormData()
    body.append('file', props.file)

    if (areaMode.value === 'create') {
      body.append('create_org_unit', '1')
      body.append('org_unit_name', areaName.value.trim())
      body.append('org_unit_code', areaCode.value.trim())
      if (officeId.value != null) {
        body.append('org_office_id', String(officeId.value))
      }
    } else {
      body.append('create_org_unit', '0')
      body.append('org_unit_id', String(selectedUnitId.value))
    }

    const res = await $api<{ data: TrdTableRow, summary: { replaced_draft: boolean, org_unit_name: string, series_count: number, subseries_count: number, document_types_count: number } }>('/archival/trd-tables/import', {
      method: 'POST',
      body,
    })
    const summary = res.summary
    const action = summary.replaced_draft ? 'Se actualizó el borrador' : 'Se creó la TRD en borrador'
    toast.success(`${action} en ${summary.org_unit_name}`, {
      description: `${summary.series_count} series, ${summary.subseries_count} subseries y ${summary.document_types_count} tipos documentales.`,
    })
    emit('imported', res.data.id)
  } catch (error: unknown) {
    confirmingCreate.value = false
    toast.error(messageFromFetchError(error, 'No se pudo importar la tabla de retención'))
  } finally {
    importing.value = false
  }
}
</script>

<template>
  <div ref="panel">
  <Card>
    <CardHeader>
      <CardTitle>Importar tabla de retención</CardTitle>
      <CardDescription>
        Elija el área donde quedará la TRD, o confirme la creación de una nueva.
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-4">
        <div class="rounded-md border bg-muted/40 px-3 py-2 text-sm leading-relaxed">
          <p class="font-medium">{{ preview.producer_office_name }}</p>
          <p class="text-muted-foreground">
            Dependencia {{ preview.producer_office_code }} · aprobación {{ preview.approved_at }}
          </p>
          <p class="text-muted-foreground">
            {{ preview.series_count }} series, {{ preview.subseries_count }} subseries y {{ preview.document_types_count }} tipos documentales.
          </p>
        </div>

        <p v-if="matchingUnit?.trd_state === 'published'" class="text-sm text-muted-foreground">
          El área «{{ matchingUnit.name }}» ({{ matchingUnit.code }}) ya tiene una TRD publicada. Seleccione otra área o cree una con un código distinto.
        </p>

        <RadioGroup :model-value="areaMode" @update:model-value="onAreaMode">
          <div class="space-y-2 rounded-md border p-3">
            <label class="flex items-center gap-2">
              <RadioGroupItem value="existing" />
              <span class="text-sm font-medium">Usar un área existente</span>
            </label>
            <ArchivalSingleMultiselect
              id="trd-import-unit"
              v-model="selectedUnitId"
              coerce-number
              searchable
              :options="unitOptions"
              placeholder="Buscar área por nombre o código"
              no-options-text="No hay áreas"
              no-results-text="Sin coincidencias"
              @update:model-value="onUnitPicked"
            />
          </div>

          <div class="space-y-3 rounded-md border p-3">
            <label class="flex items-center gap-2">
              <RadioGroupItem value="create" />
              <span class="text-sm font-medium">Crear un área</span>
            </label>
            <div class="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_9rem]">
              <div class="min-w-0 space-y-2">
                <Label for="trd-import-area-name">Nombre</Label>
                <Input id="trd-import-area-name" v-model="areaName" @focus="areaMode = 'create'" />
              </div>
              <div class="min-w-0 space-y-2">
                <Label for="trd-import-area-code">Código</Label>
                <Input id="trd-import-area-code" v-model="areaCode" @focus="areaMode = 'create'" />
              </div>
            </div>
            <div v-if="showOfficePicker" class="space-y-2">
              <Label for="trd-import-office">Agencia</Label>
              <ArchivalSingleMultiselect
                id="trd-import-office"
                v-model="officeId"
                coerce-number
                searchable
                :can-clear="false"
                :options="officeOptions"
                placeholder="Buscar agencia por nombre o código"
                no-options-text="No hay agencias"
                no-results-text="Sin coincidencias"
                @update:model-value="onOfficePicked"
              />
            </div>
          </div>
        </RadioGroup>

        <div v-if="confirmingCreate" class="rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-sm leading-relaxed">
          Se creará el área «{{ areaName.trim() }}» ({{ areaCode.trim() }}) como productora documental y se importará la TRD en borrador.
        </div>

        <div class="flex flex-wrap justify-end gap-2">
          <Button variant="outline" type="button" :disabled="importing" @click="emit('cancel')">
            Cancelar
          </Button>
          <Button
            v-if="confirmingCreate"
            variant="outline"
            type="button"
            :disabled="importing"
            @click="confirmingCreate = false"
          >
            Volver
          </Button>
          <Button type="button" :disabled="importing" @click="requestImport">
            <Icon v-if="importing" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
            {{ primaryLabel }}
          </Button>
        </div>
    </CardContent>
  </Card>
  </div>
</template>
