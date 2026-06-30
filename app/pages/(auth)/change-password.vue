<script setup lang="ts">
definePageMeta({
  layout: 'blank',
  middleware: 'change-password',
})

const { user } = useAuth()

const pageDescription = computed(() => {
  if (user.value?.password_expired) {
    return 'Tu contraseña ha vencido. Debes establecer una nueva para continuar usando el portal.'
  }

  return 'Por seguridad, debes establecer una nueva contraseña antes de continuar.'
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
            {{ user?.password_expired ? 'Contraseña vencida' : 'Cambia tu contraseña' }}
          </CardTitle>
          <CardDescription>
            {{ pageDescription }}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <AuthChangePassword />
        </CardContent>
      </Card>
    </div>
  </div>
</template>
