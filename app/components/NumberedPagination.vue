<script setup lang="ts">
const props = withDefaults(defineProps<{
  page: number
  lastPage: number
  disabled?: boolean
}>(), {
  disabled: false,
})

const emit = defineEmits<{
  'update:page': [page: number]
}>()

const pages = computed((): Array<number | 'ellipsis'> => {
  const last = Math.max(1, props.lastPage)
  const current = Math.min(Math.max(1, props.page), last)

  if (last <= 7) {
    return Array.from({ length: last }, (_, index) => index + 1)
  }

  const candidates = new Set([1, last, current, current - 1, current + 1])
  const sorted = [...candidates].filter(value => value >= 1 && value <= last).sort((a, b) => a - b)
  const items: Array<number | 'ellipsis'> = []
  let previous = 0

  for (const value of sorted) {
    if (previous > 0 && value - previous > 1) {
      items.push('ellipsis')
    }
    items.push(value)
    previous = value
  }

  return items
})

function goTo(nextPage: number) {
  if (props.disabled) {
    return
  }

  if (nextPage < 1 || nextPage > props.lastPage || nextPage === props.page) {
    return
  }

  emit('update:page', nextPage)
}
</script>

<template>
  <nav class="flex items-center gap-1" aria-label="Paginación">
    <Button
      size="icon"
      variant="outline"
      class="size-8"
      :disabled="disabled || page <= 1"
      aria-label="Página anterior"
      @click="goTo(page - 1)"
    >
      <Icon name="i-lucide-chevron-left" class="size-4" />
    </Button>

    <template v-for="(item, index) in pages" :key="`${item}-${index}`">
      <span
        v-if="item === 'ellipsis'"
        class="px-1 text-sm text-muted-foreground"
      >
        …
      </span>
      <Button
        v-else
        size="icon"
        class="size-8 text-sm"
        :variant="item === page ? 'default' : 'outline'"
        :disabled="disabled"
        :aria-current="item === page ? 'page' : undefined"
        :aria-label="`Página ${item}`"
        @click="goTo(item)"
      >
        {{ item }}
      </Button>
    </template>

    <Button
      size="icon"
      variant="outline"
      class="size-8"
      :disabled="disabled || page >= lastPage"
      aria-label="Página siguiente"
      @click="goTo(page + 1)"
    >
      <Icon name="i-lucide-chevron-right" class="size-4" />
    </Button>
  </nav>
</template>
