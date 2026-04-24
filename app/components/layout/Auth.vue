<script setup lang="ts">
defineProps<{
  reverse?: boolean
}>()
</script>

<template>
  <div
    class="relative flex min-h-dvh flex-col overflow-x-hidden bg-gradient-to-b from-emerald-50/50 via-background to-background lg:flex-row lg:items-stretch lg:bg-none dark:from-emerald-950/20"
    :class="{ 'lg:flex-row-reverse': reverse }"
  >
    <div
      class="relative hidden min-h-0 flex-1 flex-col justify-between overflow-hidden rounded-none bg-muted p-8 text-white lg:flex lg:rounded-r-3xl xl:p-12"
      :class="reverse ? 'lg:rounded-l-3xl lg:rounded-r-none' : 'lg:rounded-r-3xl'"
    >
      <img
        src="/images/Imagen-home.jpg"
        alt=""
        class="absolute inset-0 h-full w-full object-cover object-center"
      >
      <div
        class="absolute inset-0 bg-gradient-to-br from-emerald-950/92 via-emerald-800/80 to-teal-950/88"
        aria-hidden="true"
      />
      <div
        class="pointer-events-none absolute -right-20 top-1/4 h-72 w-72 rounded-full bg-emerald-400/15 blur-3xl"
        aria-hidden="true"
      />
      <div class="relative z-10 flex flex-1 flex-col justify-between gap-10">
        <div class="space-y-2">
          <p class="text-xs font-medium uppercase tracking-[0.2em] text-emerald-200/90">
            Cooperativa de ahorro y crédito
          </p>
          <p class="text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            CoopserviVélez
          </p>
        </div>

        <div class="max-w-lg space-y-8">
          <div class="space-y-4">
            <h2 class="text-balance text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
              Construye tu bienestar con quienes te acompañan de verdad
            </h2>
            <p class="text-pretty text-base leading-relaxed text-white/85 xl:text-lg">
              Este es tu espacio para gestionar trámites y radicaciones con la misma cercanía y confianza que encuentras en nuestras agencias.
            </p>
          </div>
          <ul class="space-y-4 text-sm leading-snug text-white/90 xl:text-base">
            <li class="flex gap-3">
              <Icon name="i-lucide-shield-check" class="mt-0.5 size-5 shrink-0 text-emerald-300" aria-hidden="true" />
              <span>Información protegida y trámites con respaldo institucional.</span>
            </li>
            <li class="flex gap-3">
              <Icon name="i-lucide-handshake" class="mt-0.5 size-5 shrink-0 text-emerald-300" aria-hidden="true" />
              <span>Servicios de ahorro y crédito pensados para familias, campo y negocio.</span>
            </li>
            <li class="flex gap-3">
              <Icon name="i-lucide-map-pin" class="mt-0.5 size-5 shrink-0 text-emerald-300" aria-hidden="true" />
              <span>Más de 10 agencias en la región; siempre hay un equipo cerca de ti.</span>
            </li>
          </ul>
        </div>

        <div>
          <a
            href="https://coopservivelez.com"
            target="_blank"
            rel="noopener noreferrer"
            class="group inline-flex items-center gap-2 text-sm font-medium text-emerald-100 underline-offset-4 transition-colors hover:text-white hover:underline"
          >
            Explorar productos y servicios en coopservivelez.com
            <Icon name="i-lucide-arrow-up-right" class="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden="true" />
          </a>
        </div>
      </div>
    </div>

    <div
      class="relative mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-10 sm:px-6 lg:max-w-none lg:px-10 xl:px-14"
    >
      <slot />
    </div>
  </div>
</template>

<style scoped>

</style>
