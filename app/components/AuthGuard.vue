<script setup lang="ts">
/**
 * AuthGuard - Protege el contenido hasta que se verifique la autenticación
 * Evita mostrar contenido protegido durante SSR y antes de verificar auth
 * Redirige a login si no hay usuario autenticado
 */
const { user, fetchUser } = useAuth()
const checked = useState<boolean>('auth.checked', () => false)
const loading = ref(true)

// Solo ejecutar en cliente
onMounted(async () => {
  if (!checked.value) {
    try {
      await fetchUser()
    } catch {
      // User is not logged in
    } finally {
      checked.value = true
    }
  }
  
  // Si no hay usuario después de verificar, redirigir a login
  if (!user.value) {
    await navigateTo('/login')
    return
  }
  
  loading.value = false
})

// Computed para determinar si mostrar contenido
const showContent = computed(() => {
  // En cliente, mostrar solo después de verificar auth y si hay usuario
  return !loading.value && checked.value && !!user.value
})
</script>

<template>
  <template v-if="showContent">
    <slot />
  </template>
  <div v-else class="min-h-screen flex items-center justify-center bg-background">
    <div class="flex flex-col items-center gap-4">
      <Icon name="i-lucide-loader-2" class="h-10 w-10 animate-spin text-muted-foreground" />
      <span class="text-sm text-muted-foreground">Verificando acceso...</span>
    </div>
  </div>
</template>
