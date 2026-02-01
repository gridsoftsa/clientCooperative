<script setup lang="ts">
</script>

<template>
  <ClientOnly>
    <AuthGuard>
      <SidebarProvider>
        <LayoutAppSidebar />
        <SidebarInset>
          <LayoutHeader />
          <div class="flex flex-col flex-1">
            <div class="@container/main p-4 lg:p-6 grow">
              <slot />
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    </AuthGuard>
    <template #fallback>
      <div class="min-h-screen flex items-center justify-center bg-background">
        <div class="flex flex-col items-center gap-4">
          <Icon name="i-lucide-loader-2" class="h-10 w-10 animate-spin text-muted-foreground" />
          <span class="text-sm text-muted-foreground">Cargando...</span>
        </div>
      </div>
    </template>
  </ClientOnly>
</template>

<style scoped>

</style>
