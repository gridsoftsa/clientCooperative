<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
import PasswordInput from '~/components/PasswordInput.vue'
import { PASSWORD_REQUIREMENTS, validateRobustPassword } from '~/utils/password'

const { $api, $csrf } = useNuxtApp()
const { user, refetchUserSilently } = useAuth()
const { hasPermission } = usePermissions()

const password = ref('')
const passwordConfirmation = ref('')
const isLoading = ref(false)
const error = ref<string | null>(null)

async function onSubmit(event: Event) {
  event.preventDefault()
  if (!password.value)
    return

  if (password.value !== passwordConfirmation.value) {
    error.value = 'Las contraseñas no coinciden'
    return
  }

  const passwordError = validateRobustPassword(password.value)
  if (passwordError) {
    error.value = passwordError
    return
  }

  error.value = null
  isLoading.value = true

  try {
    await $csrf()
    await $api<{ user: NonNullable<typeof user.value> }>('/auth/profile', {
      method: 'PUT',
      body: {
        password: password.value,
        password_confirmation: passwordConfirmation.value,
      },
    })
    await refetchUserSilently()

    const target = hasPermission('dashboard_ver') ? '/' : '/radicacion'
    await navigateTo(target)
  } catch (e: any) {
    const firstFieldError =
      e?.data?.errors?.password?.[0] ||
      e?.data?.errors?.current_password?.[0]
    error.value = firstFieldError || e?.data?.message || e?.message || 'No se pudo cambiar la contraseña'
  } finally {
    isLoading.value = false
  }
}
</script>

<template>
  <form class="grid gap-5" @submit="onSubmit">
    <div
      v-if="error"
      class="flex gap-3 rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive"
      role="alert"
    >
      <Icon name="i-lucide-circle-alert" class="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{{ error }}</span>
    </div>

    <div class="grid gap-2">
      <Label for="password">Nueva contraseña</Label>
      <p class="text-xs text-muted-foreground">
        {{ PASSWORD_REQUIREMENTS }}
      </p>
      <PasswordInput
        id="password"
        v-model="password"
        autocomplete="new-password"
        placeholder="Contraseña robusta"
        :disabled="isLoading"
        required
      />
    </div>

    <div class="grid gap-2">
      <Label for="password_confirmation">Confirmar contraseña</Label>
      <PasswordInput
        id="password_confirmation"
        v-model="passwordConfirmation"
        autocomplete="new-password"
        placeholder="Repite la contraseña"
        :disabled="isLoading"
        required
      />
    </div>

    <Button
      type="submit"
      class="w-full"
      :disabled="isLoading || !password || !passwordConfirmation"
    >
      <Loader2 v-if="isLoading" class="mr-2 size-4 animate-spin" />
      Guardar y continuar
    </Button>
  </form>
</template>
