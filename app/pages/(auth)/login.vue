<script setup lang="ts">
definePageMeta({
  layout: 'blank',
})

const { user, fetchUser } = useAuth()

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
          <NuxtLink
            to="https://coopservivelez.com"
            target="_blank"
            rel="noopener noreferrer"
            class="rounded-lg outline-none ring-offset-background transition-opacity hover:opacity-85 focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            aria-label="Ir al sitio web de CoopserviVélez"
          >
            <img
              src="/images/coopservivelez-logo.png"
              alt="CoopserviVélez"
              class="mx-auto h-11 w-auto max-w-[240px] object-contain sm:h-12"
              width="240"
              height="68"
            >
          </NuxtLink>
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
          ¿Necesitas orientación?
          <a
            href="https://coopservivelez.com"
            target="_blank"
            rel="noopener noreferrer"
            class="font-medium text-primary underline-offset-4 hover:underline"
          >
            Visita nuestro sitio web
          </a>
          o acércate a una de nuestras agencias.
        </p>
      </div>
    </div>
  </LayoutAuth>
</template>
