<script setup lang="ts">
const props = defineProps<{
  teams: {
    name: string
    logo: string
    plan: string
  }[]
}>()

const activeTeam = computed(() => props.teams[0]!)
</script>

<template>
  <SidebarMenu>
    <SidebarMenuItem>
      <SidebarMenuButton size="lg" class="cursor-default">
        <div class="aspect-square size-8 flex items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground overflow-hidden">
          <img
            v-if="activeTeam.logo.startsWith('/')"
            :src="activeTeam.logo"
            :alt="activeTeam.name"
            class="size-8 object-contain"
          >
          <Icon v-else :name="activeTeam.logo" class="size-4" />
        </div>
        <div class="grid flex-1 text-left text-sm leading-tight">
          <span class="truncate font-semibold">{{ activeTeam.name }}</span>
          <span class="truncate text-xs">{{ activeTeam.plan }}</span>
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  </SidebarMenu>
</template>

<style scoped>

</style>
