<script setup lang="ts">
import { useSidebar } from '~/components/ui/sidebar'

const accordion = useSidebarNavAccordion()
const searchQuery = computed({
  get: () => accordion?.searchQuery.value ?? '',
  set: (value: string) => {
    if (accordion) {
      accordion.searchQuery.value = value
    }
  },
})

const inputRef = ref<HTMLInputElement | null>(null)
const { setOpen, setOpenMobile, state, isMobile } = useSidebar()
const { metaSymbol } = useShortcuts()

function focusSearch() {
  if (state.value === 'collapsed' && !isMobile.value) {
    setOpen(true)
  }

  if (isMobile.value) {
    setOpenMobile(true)
  }

  nextTick(() => {
    inputRef.value?.focus()
    inputRef.value?.select()
  })
}

defineShortcuts({
  meta_k: {
    handler: () => {
      focusSearch()
    },
    usingInput: true,
  },
})

function clearSearch() {
  searchQuery.value = ''
  inputRef.value?.focus()
}
</script>

<template>
  <div class="relative group-data-[collapsible=icon]:flex group-data-[collapsible=icon]:justify-center">
    <Icon
      name="i-lucide-search"
      class="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 group-data-[collapsible=icon]:hidden"
    />
    <input
      ref="inputRef"
      v-model="searchQuery"
      type="search"
      placeholder="Buscar pantalla..."
      aria-label="Buscar pantalla"
      class="border-input bg-background placeholder:text-muted-foreground h-8 w-full rounded-md border pr-16 pl-8 text-sm shadow-xs outline-none focus-visible:ring-2 focus-visible:ring-ring group-data-[collapsible=icon]:hidden [&::-webkit-search-cancel-button]:appearance-none"
      @keydown.escape="clearSearch"
    >
    <button
      v-if="searchQuery"
      type="button"
      class="text-muted-foreground hover:text-foreground absolute top-1/2 right-2 inline-flex size-5 -translate-y-1/2 items-center justify-center rounded-sm group-data-[collapsible=icon]:hidden"
      aria-label="Limpiar búsqueda"
      @click="clearSearch"
    >
      <Icon name="i-lucide-x" class="size-3.5" />
    </button>
    <Kbd
      v-else
      class="pointer-events-none absolute top-1/2 right-1.5 -translate-y-1/2 group-data-[collapsible=icon]:hidden"
    >
      {{ metaSymbol.trim() || 'Ctrl' }} K
    </Kbd>
    <button
      type="button"
      class="text-muted-foreground hover:bg-accent hover:text-accent-foreground hidden size-8 items-center justify-center rounded-md group-data-[collapsible=icon]:inline-flex"
      title="Buscar pantalla"
      aria-label="Buscar pantalla"
      @click="focusSearch"
    >
      <Icon name="i-lucide-search" class="size-4" />
    </button>
  </div>
</template>
