<script setup lang="ts">
import { toast } from 'vue-sonner'
import { ARCHIVAL_FILE_MODEL_LABELS } from '~/constants/archival-file'
import { suggestArchivalFileTypeKey } from '~/utils/archival-file-type-key'
import type { ArchivalFileModel, ArchivalFileType } from '~/types/archival-file'
import {
  archivalInputWarningClass,
  focusArchivalFieldById,
} from '~/utils/archival-form-validation'

const props = defineProps<{
  initial?: ArchivalFileType | null
  isCreate?: boolean
}>()

const emit = defineEmits<{
  saved: [type: ArchivalFileType]
  cancel: []
}>()

const archivalApi = useArchivalFileApi()

const saving = ref(false)
const submitAttempted = ref(false)

const form = reactive({
  type_key: '',
  name: '',
  description: '',
  model: 'entity_case' as ArchivalFileModel,
  allows_master_documents: false,
  is_active: true,
  sort_order: 0,
})

const isSystem = computed(() => props.initial?.is_system === true)

const effectiveTypeKey = computed(() => {
  if (props.isCreate) {
    return suggestArchivalFileTypeKey(form.name)
  }

  return form.type_key.trim()
})

function applyInitial(type: ArchivalFileType | null | undefined) {
  form.type_key = type?.type_key ?? ''
  form.name = type?.name ?? ''
  form.description = type?.description ?? ''
  form.model = type?.model ?? 'entity_case'
  form.allows_master_documents = type?.allows_master_documents ?? false
  form.is_active = type?.is_active ?? true
  form.sort_order = type?.sort_order ?? 0
}

function buildPayload(): Record<string, unknown> {
  const payload: Record<string, unknown> = {
    name: form.name.trim(),
    description: form.description.trim() || null,
    model: form.model,
    allows_master_documents: form.allows_master_documents,
    is_active: form.is_active,
    sort_order: Number(form.sort_order) || 0,
  }

  if (!props.isCreate) {
    payload.type_key = form.type_key.trim()
  }

  return payload
}

async function submit() {
  submitAttempted.value = true

  if (!form.name.trim()) {
    toast.error('Complete el nombre del tipo.')
    await nextTick()
    focusArchivalFieldById('file_type_name')
    return
  }

  if (!props.isCreate && !form.type_key.trim()) {
    toast.error('Complete la clave técnica del tipo.')
    await nextTick()
    focusArchivalFieldById('file_type_key')
    return
  }

  saving.value = true

  try {
    const res = await archivalApi.saveFileType(buildPayload(), props.isCreate ? undefined : props.initial?.id)
    toast.success(res.message)
    emit('saved', res.data)
  }
  catch (error: unknown) {
    const err = error as { data?: { message?: string, errors?: Record<string, string[]> } }
    const first = err.data?.errors ? Object.values(err.data.errors)[0]?.[0] : null
    toast.error(first ?? err.data?.message ?? 'No se pudo guardar el tipo.')
  }
  finally {
    saving.value = false
  }
}

watch(() => props.initial, (value) => {
  applyInitial(value)
}, { immediate: true })
</script>

<template>
  <form class="mx-auto w-full max-w-2xl space-y-6" @submit.prevent="submit">
    <div class="grid gap-4 sm:grid-cols-2">
      <div class="space-y-2">
        <Label for="file_type_name">Nombre *</Label>
        <Input
          id="file_type_name"
          v-model="form.name"
          :disabled="saving"
          placeholder="Ej. Expediente de crédito"
          :class="archivalInputWarningClass(submitAttempted && !form.name.trim())"
        />
        <p v-if="isCreate" class="text-xs text-muted-foreground">
          Clave técnica al guardar:
          <span class="font-mono">{{ effectiveTypeKey || 'expediente_contrato_file' }}</span>
        </p>
      </div>

      <div class="space-y-2">
        <Label>Modelo</Label>
        <Select v-model="form.model" :disabled="saving">
          <SelectTrigger class="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem
              v-for="(label, value) in ARCHIVAL_FILE_MODEL_LABELS"
              :key="value"
              :value="value"
            >
              {{ label }}
            </SelectItem>
          </SelectContent>
        </Select>
        <p class="text-xs text-muted-foreground">
          {{ form.model === 'org_area'
            ? 'Un repositorio por dependencia. La TRD se configura después, por área.'
            : 'Un expediente por persona, contrato o caso.' }}
        </p>
      </div>

      <div v-if="!isCreate" class="space-y-2 sm:col-span-2">
        <Label for="file_type_key">Clave técnica</Label>
        <Input
          id="file_type_key"
          v-model="form.type_key"
          :disabled="isSystem || saving"
          placeholder="credit_file"
          class="font-mono"
          :class="archivalInputWarningClass(submitAttempted && !form.type_key.trim())"
        />
        <p v-if="isSystem" class="text-xs text-muted-foreground">
          La clave de tipos del sistema no se puede modificar.
        </p>
      </div>

      <div class="space-y-2">
        <Label for="file_type_sort">Orden en listados</Label>
        <Input
          id="file_type_sort"
          v-model.number="form.sort_order"
          type="number"
          min="0"
          :disabled="saving"
        />
      </div>

      <div class="flex flex-col justify-end gap-2">
        <div class="rounded-md border px-3 py-2">
          <Checkbox id="file_type_active" v-model="form.is_active" :disabled="saving">
            Activo
          </Checkbox>
        </div>
        <div class="rounded-md border px-3 py-2">
          <Checkbox id="file_type_master" v-model="form.allows_master_documents" :disabled="saving">
            Permite documentos maestros
          </Checkbox>
        </div>
      </div>

      <div class="space-y-2 sm:col-span-2">
        <Label for="file_type_description">Descripción</Label>
        <Textarea
          id="file_type_description"
          v-model="form.description"
          rows="3"
          :disabled="saving"
          placeholder="Opcional. Uso interno del tipo."
        />
      </div>
    </div>

    <div class="flex flex-wrap justify-end gap-2 border-t pt-4">
      <Button
        v-if="!isCreate"
        type="button"
        variant="outline"
        :disabled="saving"
        @click="emit('cancel')"
      >
        Cancelar
      </Button>
      <Button type="submit" :disabled="saving">
        {{ saving ? 'Guardando…' : (isCreate ? 'Crear tipo' : 'Guardar cambios') }}
      </Button>
    </div>
  </form>
</template>
