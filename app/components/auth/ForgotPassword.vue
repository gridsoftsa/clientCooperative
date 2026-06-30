<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'

const auth = useAuth()

const email = ref('')
const isLoading = ref(false)
const success = ref(false)
const error = ref<string | null>(null)

async function onSubmit(event: Event) {
  event.preventDefault()
  if (!email.value)
    return

  error.value = null
  success.value = false
  isLoading.value = true

  try {
    await auth.forgotPassword(email.value)
    success.value = true
  } catch (e: any) {
    const firstFieldError = e?.data?.errors?.email?.[0]
    error.value = firstFieldError || e?.data?.message || e?.message || 'No se pudo enviar el enlace de recuperación'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <form @submit="onSubmit">
    <div class="grid gap-4">
      <div
        v-if="error"
        class="flex gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
        role="alert"
      >
        <Icon name="i-lucide-circle-alert" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>{{ error }}</span>
      </div>

      <div
        v-if="success"
        class="flex gap-3 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400"
        role="status"
      >
        <Icon name="i-lucide-circle-check" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>
          Si existe una cuenta con ese correo, recibirás un enlace para restablecer tu contraseña.
          Revisa tu bandeja de entrada.
        </span>
      </div>

      <div class="grid gap-2">
        <Label for="email">
          Correo electrónico
        </Label>
        <Input
          id="email"
          v-model="email"
          placeholder="correo@ejemplo.com"
          type="email"
          auto-capitalize="none"
          auto-complete="email"
          auto-correct="off"
          :disabled="isLoading || success"
          required
        />
      </div>
      <Button :disabled="isLoading || success || !email">
        <Loader2 v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
        {{ success ? 'Enviado' : 'Enviar enlace' }}
      </Button>
    </div>
  </form>
</template>
