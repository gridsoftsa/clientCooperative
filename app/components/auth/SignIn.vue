<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
import PasswordInput from '~/components/PasswordInput.vue'

const auth = useAuth()

const email = ref('')
const password = ref('')
const isLoading = ref(false)
const error = ref<string | null>(null)

async function onSubmit(event: Event) {
  event.preventDefault()
  if (!email.value || !password.value)
    return

  error.value = null
  isLoading.value = true

  try {
    await auth.login({
      email: email.value,
      password: password.value
    })
    const { hasPermission } = usePermissions()
    const target = hasPermission('dashboard_ver') ? '/' : '/radicacion'
    await navigateTo(target)
  } catch (e: any) {
    const firstFieldError =
      e?.data?.errors?.email?.[0] ||
      e?.data?.errors?.password?.[0]
    error.value = firstFieldError || e?.data?.message || e?.message || 'Error al iniciar sesión'
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
      <Label for="email" class="text-foreground/90">
        Correo electrónico
      </Label>
      <div class="relative">
        <Icon
          name="i-lucide-mail"
          class="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <Input
          id="email"
          v-model="email"
          type="email"
          placeholder="tu.correo@ejemplo.com"
          class="h-11 rounded-xl border-border/80 pl-10 shadow-sm transition-shadow focus-visible:ring-emerald-600/20"
          :disabled="isLoading"
          auto-capitalize="none"
          auto-complete="email"
          auto-correct="off"
          required
        />
      </div>
    </div>

    <div class="grid gap-2">
      <div class="flex flex-wrap items-center gap-2 sm:flex-nowrap">
        <Label for="password" class="text-foreground/90">
          Contraseña
        </Label>
        <NuxtLink
          to="/forgot-password"
          class="ml-auto text-sm font-medium text-primary underline-offset-4 hover:underline"
        >
          ¿Olvidaste tu contraseña?
        </NuxtLink>
      </div>
      <div class="relative">
        <Icon
          name="i-lucide-lock"
          class="pointer-events-none absolute left-3 top-1/2 z-10 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden="true"
        />
        <PasswordInput
          id="password"
          v-model="password"
          autocomplete="current-password"
          placeholder="Tu contraseña"
          class="h-11 rounded-xl border-border/80 pl-10 shadow-sm transition-shadow focus-visible:ring-emerald-600/20"
          :disabled="isLoading"
          required
        />
      </div>
    </div>

    <Button
      type="submit"
      size="lg"
      class="mt-1 w-full rounded-xl text-base font-semibold shadow-md shadow-emerald-900/10 transition-all hover:shadow-lg hover:shadow-emerald-900/15"
      :disabled="isLoading || !email || !password"
    >
      <Loader2 v-if="isLoading" class="mr-2 size-4 animate-spin" />
      Entrar al portal
    </Button>

    <p class="text-center text-xs text-muted-foreground">
      Acceso exclusivo para personal autorizado. Tus datos están protegidos.
    </p>
  </form>
</template>

<style scoped>

</style>
