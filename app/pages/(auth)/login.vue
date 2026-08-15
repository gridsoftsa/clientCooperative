<script setup lang="ts">
definePageMeta({
  layout: 'blank',
})

const { user, fetchUser } = useAuth()
const { displayName, resolvedLogoUrl } = useCompanyBranding()

onMounted(async () => {
  try {
    await fetchUser()
    if (user.value) {
      await navigateTo('/')
    }
  } catch {
    // User is not logged in, stay on login page
  }
})
</script>

<template>
  <LayoutAuth reverse>
    <div class="relative mx-auto w-full max-w-md">
      <div
        class="pointer-events-none absolute -right-16 -top-12 h-48 w-48 rounded-full bg-emerald-300/25 blur-3xl dark:bg-emerald-600/15"
        aria-hidden="true"
      />
      <div
        class="pointer-events-none absolute -bottom-20 -left-12 h-44 w-44 rounded-full bg-teal-300/20 blur-3xl dark:bg-teal-700/10"
        aria-hidden="true"
      />

      <div
        class="relative rounded-2xl border border-border/70 bg-card/90 p-8 shadow-lg shadow-emerald-950/[0.04] ring-1 ring-black/[0.03] backdrop-blur-sm dark:bg-card/80 dark:ring-white/10 sm:p-10"
      >
        <div class="mb-8 flex flex-col items-center gap-5 text-center">
          <div
            class="flex min-h-[72px] w-full max-w-[280px] items-center justify-center"
            :aria-label="displayName"
          >
            <img
              v-if="resolvedLogoUrl"
              :src="resolvedLogoUrl"
              :alt="displayName"
              class="mx-auto max-h-16 w-auto max-w-full object-contain sm:max-h-[4.5rem]"
              width="280"
              height="80"
            >
            <div v-else class="space-y-1">
              <p class="text-xl font-semibold tracking-tight text-foreground">
                {{ displayName }}
              </p>
              <p class="text-xs text-muted-foreground">
                Configure el logotipo en Empresa e identidad visual
              </p>
            </div>
          </div>
          <div class="space-y-2">
            <h1 class="text-balance text-2xl font-semibold tracking-tight sm:text-[1.65rem]">
              ¡Hola! Nos alegra verte de nuevo
            </h1>
            <p class="text-balance text-sm leading-relaxed text-muted-foreground sm:text-[0.9375rem]">
              Ingresa con el correo y la clave de tu cuenta para continuar con tus gestiones en el portal.
            </p>
          </div>
        </div>

        <AuthSignIn />

        <p class="mt-8 text-balance text-center text-xs leading-relaxed text-muted-foreground">
          ¿Necesitas orientación? Acércate a una de nuestras agencias o contacta al administrador del portal.
        </p>
      </div>
    </div>
  </LayoutAuth>
</template>
