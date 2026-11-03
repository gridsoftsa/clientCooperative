<script setup lang="ts">
const route = useRoute()
const { hasPermission } = usePermissions()

const canSeeSent = computed(() => hasPermission('notificaciones_enviadas_ver'))
</script>

<template>
  <div v-if="canSeeSent" class="flex flex-wrap gap-2">
    <Button
      size="sm"
      :variant="route.path === '/notificaciones' ? 'default' : 'outline'"
      as-child
    >
      <NuxtLink to="/notificaciones">
        Mi bandeja
      </NuxtLink>
    </Button>
    <Button
      size="sm"
      :variant="route.path.startsWith('/notificaciones/enviadas') ? 'default' : 'outline'"
      as-child
    >
      <NuxtLink to="/notificaciones/enviadas">
        Enviadas
      </NuxtLink>
    </Button>
  </div>
</template>
