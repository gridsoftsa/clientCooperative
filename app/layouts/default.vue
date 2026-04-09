<script setup lang="ts">
</script>

<template>
  <ClientOnly>
    <AuthGuard>
      <SidebarProvider>
        <LayoutAppSidebar />
        <SidebarInset>
          <LayoutHeader />
          <div class="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div class="@container/main min-h-0 flex-1 overflow-y-auto p-1 lg:p-2">
              <slot />
            </div>
          </div>
        </SidebarInset>
        <ScrollToTop />
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
