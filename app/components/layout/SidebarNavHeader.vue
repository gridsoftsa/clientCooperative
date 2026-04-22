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
        <div class="flex size-8 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-transparent p-0.5">
          <img
            v-if="activeTeam.logo.startsWith('/')"
            :src="activeTeam.logo"
            :alt="activeTeam.name"
            class="h-full w-full object-contain"
          >
          <Icon v-else :name="activeTeam.logo" class="size-4" />
        </div>
        <div class="grid flex-1 text-left text-sm leading-tight">
          <span class="truncate font-semibold">{{ activeTeam.name }}</span>
          <span class="truncate text-xs text-primary">{{ activeTeam.plan }}</span>
        </div>
      </SidebarMenuButton>
    </SidebarMenuItem>
  </SidebarMenu>
</template>

<style scoped>

</style>
