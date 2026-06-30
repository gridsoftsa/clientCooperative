<script setup lang="ts">
definePageMeta({
  layout: 'blank',
})
</script>

<template>
  <div class="flex flex-col items-center justify-center gap-6 bg-muted p-6 min-h-svh md:p-10">
    <div class="max-w-sm w-full flex flex-col gap-6">
      <NuxtLink to="/login" class="flex items-center self-center gap-2 font-medium">
        <div class="h-6 w-6 flex items-center justify-center rounded-md overflow-hidden">
          <img src="/Logo-coop-1.ico" alt="Coopservivelez" class="size-6 object-contain">
        </div>
        Coopservivelez
      </NuxtLink>
      <Card>
        <CardHeader class="text-center">
          <CardTitle class="text-xl">
            Restablecer contraseña
          </CardTitle>
          <CardDescription>
            Elige una nueva contraseña para tu cuenta.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="grid mx-auto max-w-sm gap-6">
            <AuthResetPassword />
            <p class="text-center text-sm text-muted-foreground">
              ¿Recordaste tu contraseña?
              <NuxtLink
                to="/login"
                class="underline underline-offset-4 hover:text-primary"
              >
                Iniciar sesión
              </NuxtLink>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
