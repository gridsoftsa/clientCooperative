<script setup lang="ts">
import { Loader2 } from 'lucide-vue-next'
import PasswordInput from '~/components/PasswordInput.vue'

const auth = useAuth()
const router = useRouter()

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
    // Redirect to home (admin dashboard)
    await navigateTo('/')
  } catch (e: any) {
    // Laravel ValidationException comes as { errors: { field: [msg] } }
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
  <form class="grid gap-6" @submit="onSubmit">
    <div v-if="error" class="rounded-lg border border-destructive bg-destructive/10 p-3 text-sm text-destructive">
      {{ error }}
    </div>
    <div class="grid gap-2">
      <Label for="email">
        Email
      </Label>
      <Input
        id="email"
        v-model="email"
        type="email"
        placeholder="name@example.com"
        :disabled="isLoading"
        auto-capitalize="none"
        auto-complete="email"
        auto-correct="off"
        required
      />
    </div>
    <div class="grid gap-2">
      <div class="flex items-center">
        <Label for="password">
          Password
        </Label>
        <NuxtLink
          to="/forgot-password"
          class="ml-auto inline-block text-sm underline"
        >
          Forgot your password?
        </NuxtLink>
      </div>
      <PasswordInput id="password" v-model="password" autocomplete="current-password" :disabled="isLoading" required />
    </div>
    <Button type="submit" class="w-full" :disabled="isLoading || !email || !password">
      <Loader2 v-if="isLoading" class="mr-2 h-4 w-4 animate-spin" />
      Iniciar Sesión
    </Button>
    <!--
    <div class="relative">
      <div class="absolute inset-0 flex items-center">
        <span class="w-full border-t" />
      </div>
      <div class="relative flex justify-center text-xs uppercase">
        <span class="bg-background px-2 text-muted-foreground">Or continue with</span>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-4">
      <Button variant="outline" type="button" disabled>
        <Icon name="lucide:apple" class="mr-2 h-4 w-4" />
        Apple
      </Button>
      <Button variant="outline" type="button" disabled>
        <Icon name="lucide:chrome" class="mr-2 h-4 w-4" />
        Google
      </Button>
    </div>
    -->
  </form>
  <!--
  <div class="mt-4 text-center text-sm text-muted-foreground">
    Don't have an account?
    <NuxtLink to="/register" class="underline">
      Sign up
    </NuxtLink>
  </div>
  -->
</template>

<style scoped>

</style>
