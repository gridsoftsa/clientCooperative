<script setup lang="ts">
import { toast } from 'vue-sonner'
import { ARCHIVAL_FILE_MODEL_OPTIONS } from '~/constants/archival-file'
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

const suggestedTypeKey = computed(() => suggestArchivalFileTypeKey(form.name))

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

function setModel(value: string | number) {
  if (value === 'entity_case' || value === 'org_area') {
    form.model = value
  }
}

watch(() => props.initial, (value) => {
  applyInitial(value)
}, { immediate: true })
</script>

<template>
  <form class="w-full space-y-5" @submit.prevent="submit">
    <div class="space-y-2">
      <Label for="file_type_name">Nombre *</Label>
      <Input
        id="file_type_name"
        v-model="form.name"
        :disabled="saving"
        placeholder="Ej. Expediente de crédito"
        :class="archivalInputWarningClass(submitAttempted && !form.name.trim())"
      />
      <p v-if="isCreate && form.name.trim()" class="text-xs text-muted-foreground">
        Clave técnica: <span class="font-mono">{{ suggestedTypeKey }}</span>
      </p>
    </div>

    <div v-if="!isCreate" class="space-y-2">
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

    <fieldset class="space-y-3">
      <legend class="text-sm font-medium leading-none">
        ¿De quién es cada expediente?
      </legend>
      <RadioGroup
        :model-value="form.model"
        :disabled="saving"
        class="grid gap-2"
        @update:model-value="setModel($event)"
      >
        <label
          v-for="option in ARCHIVAL_FILE_MODEL_OPTIONS"
          :key="option.value"
          class="flex cursor-pointer gap-3 rounded-lg border p-3 text-left transition-colors"
          :class="form.model === option.value
            ? 'border-primary bg-primary/5'
            : 'hover:bg-muted/40'"
        >
          <RadioGroupItem :value="option.value" class="mt-1" />
          <span class="min-w-0 space-y-1">
            <span class="flex flex-wrap items-center gap-2">
              <span class="text-sm font-medium leading-none">
                {{ option.label }}
              </span>
              <Badge v-if="option.recommended" variant="secondary" class="text-[10px] font-normal">
                Lo más usado
              </Badge>
            </span>
            <span class="block text-xs font-medium text-foreground/80">
              {{ option.question }}
            </span>
            <span class="block text-xs leading-relaxed text-muted-foreground">
              {{ option.detail }}
            </span>
          </span>
        </label>
      </RadioGroup>
    </fieldset>

    <div class="space-y-2">
      <Label for="file_type_description">Descripción</Label>
      <Textarea
        id="file_type_description"
        v-model="form.description"
        rows="3"
        :disabled="saving"
        placeholder="Opcional"
      />
    </div>

    <div class="flex flex-wrap items-center gap-x-6 gap-y-3">
      <Checkbox id="file_type_active" v-model="form.is_active" :disabled="saving">
        Activo
      </Checkbox>
      <Checkbox id="file_type_master" v-model="form.allows_master_documents" :disabled="saving">
        Permite documentos maestros
      </Checkbox>
      <div class="ml-auto flex items-center gap-2">
        <Label for="file_type_sort" class="whitespace-nowrap font-normal text-muted-foreground">
          Orden
        </Label>
        <Input
          id="file_type_sort"
          v-model.number="form.sort_order"
          type="number"
          min="0"
          :disabled="saving"
          class="w-20"
        />
      </div>
    </div>

    <div class="flex justify-end gap-2 border-t pt-4">
      <Button
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
