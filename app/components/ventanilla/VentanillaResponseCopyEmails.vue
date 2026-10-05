<script setup lang="ts">
const emails = defineModel<string[]>({ default: () => [] })

const props = withDefaults(defineProps<{
  disabled?: boolean
  saving?: boolean
}>(), {
  disabled: false,
  saving: false,
})

const draft = ref('')
const error = ref('')
const editingEmail = ref<string | null>(null)
const editDraft = ref('')

function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

function validateEmail(value: string, excluding?: string): string | null {
  if (value === '') {
    return 'Ingrese un correo válido.'
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    return 'Ingrese un correo válido.'
  }

  const duplicated = emails.value.some(item => item === value && item !== excluding)
  if (duplicated) {
    return 'Ese correo ya está en la lista.'
  }

  return null
}

function addEmail(): void {
  if (props.disabled) {
    return
  }
  const value = normalizeEmail(draft.value)
  error.value = ''

  if (draft.value.trim() === '') {
    return
  }

  const validationError = validateEmail(value)
  if (validationError) {
    error.value = validationError
    return
  }

  if (emails.value.length >= 10) {
    error.value = 'Puede agregar hasta 10 correos.'
    return
  }

  emails.value = [...emails.value, value]
  draft.value = ''
}

function startEdit(email: string): void {
  error.value = ''
  editingEmail.value = email
  editDraft.value = email
}

function cancelEdit(): void {
  editingEmail.value = null
  editDraft.value = ''
}

function saveEdit(): void {
  const current = editingEmail.value
  if (!current) {
    return
  }

  const value = normalizeEmail(editDraft.value)
  error.value = ''

  const validationError = validateEmail(value, current)
  if (validationError) {
    error.value = validationError
    return
  }

  emails.value = emails.value.map(item => (item === current ? value : item))
  cancelEdit()
}

function removeEmail(email: string): void {
  if (editingEmail.value === email) {
    cancelEdit()
  }
  emails.value = emails.value.filter(item => item !== email)
}
</script>

<template>
  <div class="space-y-2">
    <Label>Copias de la respuesta</Label>
    <p class="text-muted-foreground text-xs">
      Opcional. Se guardan en el radicado al agregarlas o quitarlas; al cerrar se envía la misma respuesta a estos correos.
      <span v-if="saving">Guardando…</span>
    </p>
    <div class="flex gap-2">
      <Input
        v-model="draft"
        type="email"
        placeholder="correo@ejemplo.com"
        :disabled="disabled"
        @keydown.enter.prevent="addEmail"
      />
      <Button type="button" variant="outline" :disabled="disabled" @click="addEmail">
        Agregar
      </Button>
    </div>
    <p v-if="error" class="text-destructive text-xs">
      {{ error }}
    </p>
    <ul v-if="emails.length" class="space-y-1.5">
      <li
        v-for="email in emails"
        :key="email"
        class="flex items-center gap-2 rounded-md border bg-background px-2 py-1"
      >
        <Input
          v-if="editingEmail === email"
          v-model="editDraft"
          type="email"
          class="h-8 min-w-0 flex-1"
          :disabled="disabled"
          aria-label="Editar correo de copia"
          @keydown.enter.prevent="saveEdit"
          @keydown.esc.prevent="cancelEdit"
        />
        <span v-else class="min-w-0 flex-1 truncate text-sm">
          {{ email }}
        </span>
        <div class="flex shrink-0 items-center gap-0.5">
          <Button
            v-if="editingEmail === email"
            type="button"
            variant="ghost"
            size="icon"
            class="size-8"
            aria-label="Guardar correo"
            @click="saveEdit"
          >
            <Icon name="i-lucide-check" class="size-4" />
          </Button>
          <Button
            v-else
            type="button"
            variant="ghost"
            size="icon"
            class="size-8"
            :disabled="disabled"
            :aria-label="`Editar ${email}`"
            @click="startEdit(email)"
          >
            <Icon name="i-lucide-pencil" class="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            class="size-8 text-destructive hover:text-destructive"
            :disabled="disabled"
            :aria-label="`Quitar ${email}`"
            @click="removeEmail(email)"
          >
            <Icon name="i-lucide-trash-2" class="size-4" />
          </Button>
        </div>
      </li>
    </ul>
  </div>
</template>
