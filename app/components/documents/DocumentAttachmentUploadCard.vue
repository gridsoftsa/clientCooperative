<script setup lang="ts">
import { formatFileSizeLabel } from '~/utils/document-attachment-folio'
import {
  type DocumentUploadConstraints,
  VENTANILLA_FILING_UPLOAD_CONSTRAINTS,
  validateDocumentUploadFile,
} from '~/utils/document-upload-constraints'

const props = withDefaults(defineProps<{
  title: string
  folioStart: string
  folioEnd: string
  file: File | null
  label?: string
  primary?: boolean
  removable?: boolean
  submitAttempted?: boolean
  disabled?: boolean
  fileInputId?: string
  uploadConstraints?: DocumentUploadConstraints
}>(), {
  label: 'Documento',
  primary: false,
  removable: false,
  submitAttempted: false,
  disabled: false,
  uploadConstraints: () => VENTANILLA_FILING_UPLOAD_CONSTRAINTS,
})

const emit = defineEmits<{
  'update:title': [value: string]
  'update:folioStart': [value: string]
  'update:folioEnd': [value: string]
  'update:file': [value: File | null]
  remove: []
}>()

const fileInputRef = ref<HTMLInputElement | null>(null)
const fileError = ref<string | null>(null)

const uploadHint = computed(() => props.uploadConstraints.pickerHint)

const folioStartMissing = computed(() => props.submitAttempted && !props.folioStart.trim())
const folioEndMissing = computed(() => props.submitAttempted && !props.folioEnd.trim())
const fileMissing = computed(() => props.submitAttempted && !props.file)
const titleMissing = computed(() => props.submitAttempted && !props.title.trim())

const folioRangeInvalid = computed(() => {
  if (!props.folioStart.trim() || !props.folioEnd.trim()) {
    return false
  }

  const start = Number(props.folioStart)
  const end = Number(props.folioEnd)

  return Number.isInteger(start) && Number.isInteger(end) && end < start
})

function openFilePicker() {
  if (!props.disabled) {
    fileInputRef.value?.click()
  }
}

function onFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const nextFile = input.files?.[0] ?? null

  if (nextFile) {
    const validationError = validateDocumentUploadFile(nextFile, props.uploadConstraints)
    if (validationError) {
      fileError.value = validationError
      emit('update:file', null)
      input.value = ''

      return
    }
  }

  fileError.value = null
  emit('update:file', nextFile)

  if (nextFile && !props.title.trim()) {
    emit('update:title', nextFile.name.replace(/\.[^.]+$/, ''))
  }
}
</script>

<template>
  <div
    class="rounded-xl border bg-card p-4 shadow-sm transition-colors"
    :class="primary ? 'border-primary/30 ring-1 ring-primary/10' : 'border-border'"
  >
    <div class="mb-4 flex items-start justify-between gap-3">
      <div class="min-w-0">
        <div class="flex flex-wrap items-center gap-2">
          <p class="text-sm font-semibold text-foreground">
            {{ label }}
          </p>
          <Badge v-if="primary" variant="secondary" class="bg-primary/10 text-primary">
            Principal
          </Badge>
        </div>
        <p class="mt-1 text-xs text-muted-foreground">
          Indique título, rango de folios y seleccione el archivo. {{ uploadHint }}
        </p>
      </div>
      <Button
        v-if="removable"
        type="button"
        variant="ghost"
        size="icon"
        class="shrink-0 text-destructive hover:text-destructive"
        :disabled="disabled"
        aria-label="Eliminar documento"
        @click="emit('remove')"
      >
        <Icon name="i-lucide-trash-2" class="size-4" />
      </Button>
    </div>

    <div class="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.8fr)_minmax(0,0.8fr)]">
      <div class="space-y-2">
        <Label>Título *</Label>
        <Input
          :model-value="title"
          :disabled="disabled"
          placeholder="Ej.: Oficio de respuesta"
          :class="titleMissing ? 'border-amber-500 ring-amber-500/30' : ''"
          @update:model-value="emit('update:title', String($event ?? ''))"
        />
      </div>

      <div class="space-y-2">
        <Label>Folio inicial *</Label>
        <Input
          :model-value="folioStart"
          type="number"
          min="1"
          inputmode="numeric"
          :disabled="disabled"
          placeholder="1"
          :class="folioStartMissing || folioRangeInvalid ? 'border-amber-500 ring-amber-500/30' : ''"
          @update:model-value="emit('update:folioStart', String($event ?? ''))"
        />
      </div>

      <div class="space-y-2">
        <Label>Folio final *</Label>
        <Input
          :model-value="folioEnd"
          type="number"
          min="1"
          inputmode="numeric"
          :disabled="disabled"
          placeholder="1"
          :class="folioEndMissing || folioRangeInvalid ? 'border-amber-500 ring-amber-500/30' : ''"
          @update:model-value="emit('update:folioEnd', String($event ?? ''))"
        />
      </div>
    </div>

    <p v-if="folioRangeInvalid" class="mt-2 text-xs text-amber-700 dark:text-amber-300">
      El folio final debe ser mayor o igual al folio inicial.
    </p>

    <div class="mt-4">
      <input
        :id="fileInputId"
        ref="fileInputRef"
        type="file"
        class="sr-only"
        :accept="uploadConstraints.accept || undefined"
        :disabled="disabled"
        @change="onFileChange"
      >

      <button
        type="button"
        class="flex w-full items-center gap-4 rounded-xl border border-dashed px-4 py-4 text-left transition-colors"
        :class="[
          fileMissing ? 'border-amber-500 bg-amber-500/5' : 'border-muted-foreground/30 bg-muted/20 hover:bg-muted/35',
          disabled ? 'cursor-not-allowed opacity-60' : 'cursor-pointer',
        ]"
        :disabled="disabled"
        @click="openFilePicker"
      >
        <div
          class="flex size-11 shrink-0 items-center justify-center rounded-lg"
          :class="file ? 'bg-primary/10 text-primary' : 'bg-background text-muted-foreground'"
        >
          <Icon :name="file ? 'i-lucide-file-check-2' : 'i-lucide-upload-cloud'" class="size-5" />
        </div>

        <div class="min-w-0 flex-1">
          <p class="text-sm font-medium text-foreground">
            {{ file ? file.name : 'Seleccionar archivo' }}
          </p>
          <p class="mt-0.5 text-xs text-muted-foreground">
            {{
              file
                ? `${formatFileSizeLabel(file.size)} · ${uploadConstraints.typesLabel}`
                : uploadHint
            }}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          class="shrink-0"
          :disabled="disabled"
          @click.stop="openFilePicker"
        >
          Examinar
        </Button>
      </button>
      <p v-if="fileError" class="mt-2 text-xs text-destructive">
        {{ fileError }}
      </p>
    </div>
  </div>
</template>
