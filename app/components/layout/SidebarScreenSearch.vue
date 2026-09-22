<script setup lang="ts">
import type { NavMenu } from '~/types/nav'
import { useSidebar } from '~/components/ui/sidebar'

const props = defineProps<{
  menu: NavMenu[]
}>()

const router = useRouter()
const { setOpenMobile, state } = useSidebar()
const { metaSymbol } = useShortcuts()

const open = ref(false)

defineShortcuts({
  meta_k: () => {
    open.value = !open.value
  },
})

interface ScreenEntry {
  id: string
  title: string
  parent: string | null
  link: string
  icon?: string
}

const groups = computed(() => {
  return props.menu.map((section) => {
    const screens: ScreenEntry[] = []

    for (const item of section.items) {
      if ('children' in item) {
        for (const child of item.children) {
          screens.push({
            id: `${section.heading}:${item.title}:${child.link}:${child.title}`,
            title: child.title,
            parent: item.title,
            link: child.link,
            icon: child.icon || item.icon,
          })
        }
        continue
      }

      if ('link' in item) {
        screens.push({
          id: `${section.heading}:${item.link}:${item.title}`,
          title: item.title,
          parent: null,
          link: item.link,
          icon: item.icon,
        })
      }
    }

    return {
      heading: section.heading,
      screens,
    }
  }).filter(group => group.screens.length > 0)
})

function openScreen(link: string) {
  open.value = false
  setOpenMobile(false)
  router.push(link)
}
</script>

<template>
  <div>
    <button
      type="button"
      class="border-input bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground flex h-8 w-full items-center gap-2 rounded-md border px-2.5 text-sm shadow-xs transition-colors group-data-[collapsible=icon]:size-8 group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0"
      :title="state === 'collapsed' ? 'Buscar pantalla' : undefined"
      @click="open = true"
    >
      <Icon name="i-lucide-search" class="size-4 shrink-0" />
      <span class="min-w-0 flex-1 truncate text-left group-data-[collapsible=icon]:hidden">
        Buscar pantalla...
      </span>
      <Kbd class="group-data-[collapsible=icon]:hidden">
        {{ metaSymbol.trim() || 'Ctrl' }} K
      </Kbd>
    </button>

    <CommandDialog
      v-model:open="open"
      title="Buscar pantalla"
      description="Busque una pantalla del menú y ábrala"
    >
      <CommandInput placeholder="Buscar pantalla..." />
      <CommandList>
        <CommandEmpty>
          No hay pantallas que coincidan.
        </CommandEmpty>
        <CommandGroup
          v-for="group in groups"
          :key="group.heading"
          :heading="group.heading"
        >
          <CommandItem
            v-for="screen in group.screens"
            :key="screen.id"
            :value="`${group.heading} ${screen.parent ?? ''} ${screen.title}`"
            @select="openScreen(screen.link)"
          >
            <Icon v-if="screen.icon" :name="screen.icon" class="size-4" />
            <span class="truncate">{{ screen.title }}</span>
            <span v-if="screen.parent" class="text-muted-foreground ml-auto truncate text-xs">
              {{ screen.parent }}
            </span>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  </div>
</template>
