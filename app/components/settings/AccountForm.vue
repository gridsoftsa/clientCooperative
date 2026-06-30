<script setup lang="ts">
import { toast } from 'vue-sonner'
import { PASSWORD_REQUIREMENTS, validateRobustPassword } from '~/utils/password'

const { $api, $csrf } = useNuxtApp()
const { user, refetchUserSilently } = useAuth()
const saving = ref(false)
const currentPassword = ref('')
const password = ref('')
const passwordConfirmation = ref('')

const showExpiryWarning = computed(() =>
  Boolean(
    user.value?.password_expiration_enabled
    && !user.value?.password_expired
    && user.value?.days_until_password_expiry != null
    && user.value.days_until_password_expiry <= 14
    && user.value.days_until_password_expiry >= 0,
  ),
)

async function handleSubmit() {
  if (saving.value) {
    return
  }
  if (!currentPassword.value || !password.value) {
    toast.error('Completa la contraseña actual y la nueva contraseña')
    return
  }
  if (password.value !== passwordConfirmation.value) {
    toast.error('La nueva contraseña y la confirmación no coinciden')
    return
  }
  const passwordError = validateRobustPassword(password.value)
  if (passwordError) {
    toast.error(passwordError)
    return
  }

  saving.value = true
  try {
    await $csrf()
    await $api<{ user: NonNullable<typeof user.value> }>('/auth/profile', {
      method: 'PUT',
      body: {
        current_password: currentPassword.value,
        password: password.value,
        password_confirmation: passwordConfirmation.value,
      },
    })
    await refetchUserSilently()
    currentPassword.value = ''
    password.value = ''
    passwordConfirmation.value = ''
    toast.success('Contraseña actualizada')
  } catch (e: unknown) {
    console.error(e)
    const data = e && typeof e === 'object' && 'data' in e
      ? (e as { data?: { message?: string, errors?: Record<string, string[]> } }).data
      : undefined
    const first = data?.errors && Object.values(data.errors).flat()[0]
    toast.error(first ?? data?.message ?? 'No se pudo cambiar la contraseña')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h3 class="text-lg font-medium">
        Seguridad de la cuenta
      </h3>
      <p class="text-sm text-muted-foreground">
        Cambia la contraseña con la que inicias sesión. El correo y el resto de la cuenta siguen administrándose en
        <span class="font-medium text-foreground">Usuarios</span> (solo personal autorizado).
      </p>
      <p v-if="user?.email" class="mt-2 text-sm text-muted-foreground">
        Sesión actual: <span class="font-medium text-foreground">{{ user.email }}</span>
      </p>
    </div>
    <Separator />

    <div
      v-if="showExpiryWarning"
      class="rounded-lg border border-amber-300/60 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700/50 dark:bg-amber-950/30 dark:text-amber-200"
    >
      Tu contraseña vence en {{ user?.days_until_password_expiry }}
      {{ user?.days_until_password_expiry === 1 ? 'día' : 'días' }}.
      Te recomendamos cambiarla ahora para evitar interrupciones.
    </div>

    <form class="max-w-md space-y-4" @submit.prevent="handleSubmit">
      <div class="space-y-2">
        <Label for="acct-current-password">Contraseña actual *</Label>
        <PasswordInput
          id="acct-current-password"
          v-model="currentPassword"
          autocomplete="current-password"
          placeholder="••••••••"
        />
      </div>
      <div class="space-y-2">
        <Label for="acct-new-password">Nueva contraseña *</Label>
        <p class="text-xs text-muted-foreground">
          {{ PASSWORD_REQUIREMENTS }}
        </p>
        <PasswordInput
          id="acct-new-password"
          v-model="password"
          autocomplete="new-password"
          placeholder="Contraseña robusta"
        />
      </div>
      <div class="space-y-2">
        <Label for="acct-confirm-password">Confirmar nueva contraseña *</Label>
        <PasswordInput
          id="acct-confirm-password"
          v-model="passwordConfirmation"
          autocomplete="new-password"
          placeholder="Repite la nueva contraseña"
        />
      </div>
      <Button type="submit" :disabled="saving">
        <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 size-4 animate-spin" />
        Actualizar contraseña
      </Button>
    </form>
  </div>
</template>
