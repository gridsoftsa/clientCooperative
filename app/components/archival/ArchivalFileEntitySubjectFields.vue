<script setup lang="ts">
import type { OrgStaffMultiselectOption } from '~/utils/org-staff-option-label'
import { orgStaffDisplayName, orgStaffMultiselectOption } from '~/utils/org-staff-option-label'
import type { OrgStaffListItem } from '~/types/org-structure'

const WORKER_FILE_TYPE_KEYS = new Set(['worker_file', 'former_worker_file'])

const props = defineProps<{
  orgUnitId?: number | null
  fileTypeKey?: string | null
}>()

const entityKey = defineModel<string>('entityKey', { default: '' })
const entityLabel = defineModel<string>('entityLabel', { default: '' })

const { fetchStaff } = useOrgStructureApi()

const subjectMode = ref<'staff' | 'manual'>('manual')
const selectedStaffId = ref<number | null>(null)
const staffOptions = ref<OrgStaffListItem[]>([])
const loadingStaff = ref(false)

const staffSelectOptions = computed<OrgStaffMultiselectOption[]>(() =>
  staffOptions.value.map(staff => orgStaffMultiselectOption(staff)),
)

const prefersStaffSearch = computed(() =>
  props.fileTypeKey != null && WORKER_FILE_TYPE_KEYS.has(props.fileTypeKey),
)

function applyStaffSelection(staffId: number | null) {
  if (!staffId) {
    entityKey.value = ''
    entityLabel.value = ''

    return
  }

  const staff = staffOptions.value.find(item => item.id === staffId)
  if (!staff) {
    return
  }

  entityKey.value = staff.document_number?.trim() ?? ''
  entityLabel.value = orgStaffDisplayName(staff)
}

async function loadStaffOptions() {
  loadingStaff.value = true

  try {
    staffOptions.value = await fetchStaff({
      activeOnly: true,
      orgUnitIds: props.orgUnitId ? [props.orgUnitId] : undefined,
    })

    if (selectedStaffId.value) {
      const stillExists = staffOptions.value.some(item => item.id === selectedStaffId.value)
      if (!stillExists) {
        selectedStaffId.value = null
        applyStaffSelection(null)
      }
    }
  }
  catch {
    staffOptions.value = []
  }
  finally {
    loadingStaff.value = false
  }
}

function setSubjectMode(mode: 'staff' | 'manual') {
  if (subjectMode.value === mode) {
    return
  }

  subjectMode.value = mode
  selectedStaffId.value = null

  if (mode === 'manual') {
    return
  }

  entityKey.value = ''
  entityLabel.value = ''
}

watch(selectedStaffId, (staffId) => {
  if (subjectMode.value === 'staff') {
    applyStaffSelection(staffId)
  }
})

watch(
  () => props.fileTypeKey,
  (typeKey) => {
    if (typeKey && WORKER_FILE_TYPE_KEYS.has(typeKey)) {
      subjectMode.value = 'staff'
    }
  },
  { immediate: true },
)

watch(
  () => props.orgUnitId,
  () => {
    void loadStaffOptions()
  },
  { immediate: true },
)
</script>

<template>
  <div class="space-y-3 rounded-lg border bg-muted/15 p-4">
    <div class="space-y-1">
      <p class="text-sm font-medium">
        Persona o entidad asociada
      </p>
      <p class="text-xs text-muted-foreground">
        Opcional. Busque un funcionario de la estructura organizacional o digite cédula/NIT y nombre manualmente.
      </p>
    </div>

    <div class="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        :variant="subjectMode === 'staff' ? 'default' : 'outline'"
        @click="setSubjectMode('staff')"
      >
        Buscar funcionario
      </Button>
      <Button
        type="button"
        size="sm"
        :variant="subjectMode === 'manual' ? 'default' : 'outline'"
        @click="setSubjectMode('manual')"
      >
        Digitar manualmente
      </Button>
    </div>

    <p v-if="prefersStaffSearch && subjectMode === 'manual'" class="text-xs text-amber-600 dark:text-amber-500">
      Para expedientes de trabajador se recomienda buscar el funcionario en plantilla.
    </p>

    <template v-if="subjectMode === 'staff'">
      <div class="space-y-2">
        <Label for="archival_entity_staff">Funcionario</Label>
        <ArchivalSingleMultiselect
          id="archival_entity_staff"
          v-model="selectedStaffId"
          :options="staffSelectOptions"
          :disabled="loadingStaff"
          placeholder="Buscar por nombre, documento o cargo…"
          no-options-text="Sin funcionarios activos"
          no-results-text="Sin coincidencias"
        >
          <template #option="{ option }">
            <div class="archival-ms-option">
              <span class="archival-ms-option-title">{{ option.title }}</span>
              <span v-if="option.subtitle" class="archival-ms-option-subtitle">{{ option.subtitle }}</span>
            </div>
          </template>
        </ArchivalSingleMultiselect>
        <p v-if="loadingStaff" class="text-xs text-muted-foreground">
          Cargando funcionarios…
        </p>
        <p v-else-if="orgUnitId" class="text-xs text-muted-foreground">
          Listado acotado al área responsable seleccionada.
        </p>
        <p v-else class="text-xs text-muted-foreground">
          Seleccione el área responsable para acotar la búsqueda, o busque en toda la plantilla activa.
        </p>
      </div>

      <div v-if="entityKey || entityLabel" class="grid gap-3 md:grid-cols-2">
        <div class="space-y-1">
          <Label class="text-muted-foreground">Identificador</Label>
          <p class="text-sm">
            {{ entityKey || '—' }}
          </p>
        </div>
        <div class="space-y-1">
          <Label class="text-muted-foreground">Nombre</Label>
          <p class="text-sm">
            {{ entityLabel || '—' }}
          </p>
        </div>
      </div>
    </template>

    <div v-else class="grid gap-4 md:grid-cols-2">
      <div class="space-y-2">
        <Label for="archival_entity_key">Identificador (cédula/NIT)</Label>
        <Input
          id="archival_entity_key"
          v-model="entityKey"
          placeholder="Opcional"
        />
      </div>
      <div class="space-y-2">
        <Label for="archival_entity_label">Nombre entidad</Label>
        <Input
          id="archival_entity_label"
          v-model="entityLabel"
          placeholder="Opcional"
        />
      </div>
    </div>
  </div>
</template>
