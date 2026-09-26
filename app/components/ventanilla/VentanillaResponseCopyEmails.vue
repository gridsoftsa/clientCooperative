<script setup lang="ts">
const emails = defineModel<string[]>({ default: () => [] })

const draft = ref('')
const error = ref('')

function addEmail(): void {
  const value = draft.value.trim().toLowerCase()
  error.value = ''

  if (value === '') {
    return
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
    error.value = 'Ingrese un correo válido.'

    return
  }

  if (emails.value.includes(value)) {
    error.value = 'Ese correo ya está en la lista.'

    return
  }

  if (emails.value.length >= 10) {
    error.value = 'Puede agregar hasta 10 correos.'

    return
  }

  emails.value = [...emails.value, value]
  draft.value = ''
}

function removeEmail(email: string): void {
  emails.value = emails.value.filter(item => item !== email)
}
</script>

<template>
  <div class="space-y-2">
    <Label>Copias de la respuesta</Label>
    <p class="text-muted-foreground text-xs">
      Opcional. Al cerrar se envía la misma respuesta a estos correos.
    </p>
    <div class="flex gap-2">
      <Input
        v-model="draft"
        type="email"
        placeholder="correo@ejemplo.com"
        @keydown.enter.prevent="addEmail"
      />
      <Button type="button" variant="outline" @click="addEmail">
        Agregar
      </Button>
    </div>
    <p v-if="error" class="text-destructive text-xs">
      {{ error }}
    </p>
    <ul v-if="emails.length" class="space-y-1">
      <li
        v-for="email in emails"
        :key="email"
        class="flex items-center justify-between gap-2 rounded-md border px-2 py-1 text-sm"
      >
        <span>{{ email }}</span>
        <Button type="button" variant="ghost" size="sm" @click="removeEmail(email)">
          Quitar
        </Button>
      </li>
    </ul>
  </div>
</template>
