<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { ArchivalFileType } from '~/types/archival-file'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'expedientes_crear',
})

const router = useRouter()
const archivalApi = useArchivalFileApi()
const { $api } = useNuxtApp()
const api = $api as <T>(url: string, options?: Record<string, unknown>) => Promise<T>

const loading = ref(true)
const saving = ref(false)
const types = ref<ArchivalFileType[]>([])
const orgUnits = ref<Array<{ id: number, name: string }>>([])

const form = reactive({
  archival_file_type_id: null as number | null,
  title: '',
  org_unit_id: null as number | null,
  entity_key: '',
  entity_label: '',
})

const selectedType = computed(() =>
  types.value.find(type => type.id === form.archival_file_type_id) ?? null,
)

const typeSelectOptions = computed(() =>
  types.value.map(type => ({
    value: type.id,
    label: type.name,
  })),
)

const orgUnitSelectOptions = computed(() =>
  orgUnits.value.map(unit => ({
    value: unit.id,
    label: unit.name,
  })),
)

watch(() => form.archival_file_type_id, (typeId) => {
  const type = types.value.find(item => item.id === typeId)

  if (type?.org_unit_id) {
    form.org_unit_id = type.org_unit_id
  }
})

async function loadMeta() {
  loading.value = true

  try {
    types.value = await archivalApi.fetchFileTypes()
    const res = await api<{ data: Array<{ id: number, name: string }> }>('/organizational-structure/org-units')
    orgUnits.value = res.data ?? []
  }
  finally {
    loading.value = false
  }
}

async function submit() {
  if (!form.archival_file_type_id) {
    toast.error('Seleccione el tipo de expediente.')
    return
  }

  if (!form.title.trim()) {
    toast.error('Indique el título del expediente.')
    return
  }

  if (!form.org_unit_id) {
    toast.error('Seleccione el área responsable.')
    return
  }

  saving.value = true

  try {
    const res = await archivalApi.createFile({
      archival_file_type_id: form.archival_file_type_id,
      title: form.title.trim(),
      org_unit_id: form.org_unit_id,
      entity_key: form.entity_key || undefined,
      entity_label: form.entity_label || undefined,
    })
    toast.success(res.message)
    await router.push(`/expedientes/${res.data.id}`)
  }
  catch {
    toast.error('No se pudo crear el expediente.')
  }
  finally {
    saving.value = false
  }
}

onMounted(() => loadMeta())
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">
        Nuevo expediente
      </h1>
      <p class="text-sm text-muted-foreground">
        Creación manual de expediente electrónico.
      </p>
    </div>

    <Card>
      <CardContent class="space-y-4 pt-6">
        <div v-if="loading" class="py-8 text-center text-muted-foreground">
          Cargando...
        </div>
        <template v-else>
          <div class="space-y-2">
            <Label for="archival_new_file_type">Tipo de expediente</Label>
            <ArchivalSingleMultiselect
              id="archival_new_file_type"
              v-model="form.archival_file_type_id"
              :options="typeSelectOptions"
              placeholder="Seleccione tipo"
              no-options-text="Sin tipos disponibles"
            />
          </div>

          <div class="space-y-2">
            <Label for="archival_new_title">Título</Label>
            <Input
              id="archival_new_title"
              v-model="form.title"
              placeholder="Ej. Expediente de crédito 2026-001"
            />
          </div>

          <div class="space-y-2">
            <Label for="archival_new_org_unit">Área responsable</Label>
            <ArchivalSingleMultiselect
              id="archival_new_org_unit"
              v-model="form.org_unit_id"
              :options="orgUnitSelectOptions"
              placeholder="Seleccione área"
              no-options-text="Sin áreas disponibles"
            />
            <p v-if="selectedType?.org_unit" class="text-xs text-muted-foreground">
              Se sugiere según el tipo «{{ selectedType.name }}»: {{ selectedType.org_unit.name }}.
              Puede cambiarla si el expediente corresponde a otra área.
            </p>
            <p v-else-if="selectedType && !selectedType.org_unit_id" class="text-xs text-amber-600 dark:text-amber-500">
              El tipo «{{ selectedType.name }}» no tiene área productora configurada.
              Selecciónela manualmente o configúrela en Tipos de expediente.
            </p>
            <p v-else class="text-xs text-muted-foreground">
              Área que custodia el expediente. Al elegir el tipo se completará sola si el tipo tiene área productora.
            </p>
          </div>

          <ArchivalFileEntitySubjectFields
            v-model:entity-key="form.entity_key"
            v-model:entity-label="form.entity_label"
            :org-unit-id="form.org_unit_id"
            :file-type-key="selectedType?.type_key ?? null"
          />

          <p class="text-xs text-muted-foreground">
            Tras crear el expediente podrá cargar documentos y ver el checklist de obligatorios del tipo.
          </p>

          <div class="flex justify-end gap-2">
            <Button variant="outline" @click="router.push('/expedientes')">
              Cancelar
            </Button>
            <Button :disabled="saving" @click="submit">
              Crear expediente
            </Button>
          </div>
        </template>
      </CardContent>
    </Card>
  </div>
</template>
