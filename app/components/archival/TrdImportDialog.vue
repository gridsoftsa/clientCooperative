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

const open = defineModel<boolean>('open', { required: true })

const props = defineProps<{
  file: File | null
}>()

const emit = defineEmits<{
  imported: [tableId: number]
}>()

const { $api } = useNuxtApp()

const previewing = ref(false)
const importing = ref(false)
const preview = ref<TrdImportPreview | null>(null)
const areaMode = ref<'existing' | 'create'>('create')
const selectedUnitId = ref('')
const areaName = ref('')
const areaCode = ref('')
const officeId = ref('')
const confirmingCreate = ref(false)

const selectableUnits = computed(() => preview.value?.org_units ?? [])

const selectedUnit = computed(() =>
  selectableUnits.value.find(unit => String(unit.id) === selectedUnitId.value) ?? null,
)

const showOfficePicker = computed(() => (preview.value?.offices.length ?? 0) > 1)

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
  const id = preview.value?.matching_org_unit_id
  if (id == null) {
    return null
  }

  return selectableUnits.value.find(unit => unit.id === id) ?? null
})

watch(open, (isOpen) => {
  if (isOpen) {
    void loadPreview()
    return
  }

  confirmingCreate.value = false
})

watch(areaMode, () => {
  confirmingCreate.value = false
})

function resetForm(data: TrdImportPreview) {
  preview.value = data
  areaName.value = data.producer_office_name
  areaCode.value = data.producer_office_code
  officeId.value = data.offices[0] ? String(data.offices[0].id) : ''
  confirmingCreate.value = false

  const match = data.matching_org_unit_id == null
    ? null
    : data.org_units.find(unit => unit.id === data.matching_org_unit_id) ?? null

  if (match && match.trd_state !== 'published') {
    areaMode.value = 'existing'
    selectedUnitId.value = String(match.id)
    return
  }

  areaMode.value = 'create'
  selectedUnitId.value = ''
}

async function loadPreview() {
  if (!props.file) {
    return
  }

  previewing.value = true
  preview.value = null
  try {
    const body = new FormData()
    body.append('file', props.file)
    const res = await $api<{ data: TrdImportPreview }>('/archival/trd-tables/import-preview', {
      method: 'POST',
      body,
    })
    resetForm(res.data)
  } catch (error: unknown) {
    toast.error(messageFromFetchError(error, 'No se pudo leer el Excel'))
    open.value = false
  } finally {
    previewing.value = false
  }
}

function onAreaMode(value: unknown) {
  areaMode.value = value === 'create' ? 'create' : 'existing'
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

  if (areaMode.value === 'existing' && !selectedUnitId.value) {
    toast.error('Seleccione un área')
    return
  }

  void submitImport()
}

async function submitImport() {
  if (!props.file || !preview.value) {
    return
  }

  importing.value = true
  try {
    const body = new FormData()
    body.append('file', props.file)

    if (areaMode.value === 'create') {
      body.append('create_org_unit', '1')
      body.append('org_unit_name', areaName.value.trim())
      body.append('org_unit_code', areaCode.value.trim())
      if (officeId.value) {
        body.append('org_office_id', officeId.value)
      }
    } else {
      body.append('create_org_unit', '0')
      body.append('org_unit_id', selectedUnitId.value)
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
    open.value = false
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
  <Dialog v-model:open="open">
    <DialogContent class="max-h-[90vh] overflow-y-auto sm:max-w-lg">
      <DialogHeader>
        <DialogTitle>Importar tabla de retención</DialogTitle>
        <DialogDescription>
          Elija el área donde quedará la TRD, o confirme la creación de una nueva.
        </DialogDescription>
      </DialogHeader>

      <div v-if="previewing" class="flex justify-center py-10">
        <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
      </div>

      <div v-else-if="preview" class="space-y-4">
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
            <Select v-model="selectedUnitId" @update:model-value="areaMode = 'existing'">
              <SelectTrigger>
                <SelectValue placeholder="Seleccione un área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="unit in selectableUnits"
                  :key="unit.id"
                  :value="String(unit.id)"
                  :disabled="unit.trd_state === 'published'"
                >
                  {{ unitLabel(unit) }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-3 rounded-md border p-3">
            <label class="flex items-center gap-2">
              <RadioGroupItem value="create" />
              <span class="text-sm font-medium">Crear un área</span>
            </label>
            <div class="space-y-2">
              <Label for="trd-import-area-name">Nombre</Label>
              <Input id="trd-import-area-name" v-model="areaName" @focus="areaMode = 'create'" />
            </div>
            <div class="space-y-2">
              <Label for="trd-import-area-code">Código</Label>
              <Input id="trd-import-area-code" v-model="areaCode" @focus="areaMode = 'create'" />
            </div>
            <div v-if="showOfficePicker" class="space-y-2">
              <Label for="trd-import-office">Agencia</Label>
              <Select v-model="officeId" @update:model-value="areaMode = 'create'">
                <SelectTrigger id="trd-import-office">
                  <SelectValue placeholder="Seleccione la agencia" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="office in preview.offices"
                    :key="office.id"
                    :value="String(office.id)"
                  >
                    {{ office.name }} ({{ office.code }})
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </RadioGroup>

        <div v-if="confirmingCreate" class="rounded-md border border-primary/40 bg-primary/5 px-3 py-2 text-sm leading-relaxed">
          Se creará el área «{{ areaName.trim() }}» ({{ areaCode.trim() }}) como productora documental y se importará la TRD en borrador.
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" type="button" :disabled="importing" @click="open = false">
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
        <Button type="button" :disabled="previewing || importing || !preview" @click="requestImport">
          <Icon v-if="importing" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
          {{ primaryLabel }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
