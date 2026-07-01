<script setup lang="ts">
import type { SidebarMenuButtonVariants } from '~/components/ui/sidebar'
import type { NavGroup, NavLink } from '~/types/nav'
import { useSidebar } from '~/components/ui/sidebar'

const props = withDefaults(defineProps<{
  item: NavGroup
  size?: SidebarMenuButtonVariants['size']
}>(), {
  size: 'default',
})

const { setOpenMobile } = useSidebar()
const route = useRoute()

/** Marca activo el subítem si la ruta coincide o es una ruta hija (p. ej. formularios de edición). */
function isSubRouteActive(link: string): boolean {
  if (route.path === link)
    return true
  if (link === '/')
    return false

  const hasMoreSpecificSibling = props.item.children.some((child) => {
    if (child.link === link)
      return false
    if (child.link === route.path)
      return true
    if (child.link.startsWith(`${link}/`) && route.path.startsWith(`${child.link}/`))
      return true

    return false
  })

  if (hasMoreSpecificSibling)
    return false

  return route.path.startsWith(`${link}/`)
}

const openCollapsible = ref(false)

watch(
  () => route.path,
  () => {
    if (props.item.children.some((c: NavLink) => isSubRouteActive(c.link)))
      openCollapsible.value = true
  },
  { immediate: true },
)
</script>

<template>
  <SidebarMenu>
    <Collapsible
      :key="item.title"
      v-model:open="openCollapsible"
      as-child
      class="group/collapsible"
    >
      <SidebarMenuItem>
        <CollapsibleTrigger as-child>
          <SidebarMenuButton :tooltip="item.title" :size="size">
            <Icon :name="item.icon || ''" mode="svg" />
            <span>{{ item.title }}</span>
            <span v-if="item.new" class="rounded-md bg-[#adfa1d] px-1.5 py-0.5 text-xs text-black leading-none no-underline group-hover:no-underline">
              New
            </span>
            <Icon name="i-lucide-chevron-right" class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            <SidebarMenuSubItem
              v-for="subItem in item.children"
              :key="subItem.title"
            >
              <SidebarMenuSubButton as-child :data-active="isSubRouteActive(subItem.link)">
                <NuxtLink :to="subItem.link" @click="setOpenMobile(false)">
                  <span>{{ subItem.title }}</span>
                  <span v-if="subItem.new" class="rounded-md bg-[#adfa1d] px-1.5 py-0.5 text-xs text-black leading-none no-underline group-hover:no-underline">
                    New
                  </span>
                </NuxtLink>
              </SidebarMenuSubButton>
            </SidebarMenuSubItem>
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  </SidebarMenu>
</template>

<style scoped>

</style>
