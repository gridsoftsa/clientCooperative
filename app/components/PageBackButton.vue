<script setup lang="ts">
const props = defineProps<{
  to?: string
  disabled?: boolean
}>()

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const router = useRouter()

function onClick(event: MouseEvent): void {
  if (props.disabled) {
    return
  }
  emit('click', event)
  if (event.defaultPrevented || props.to == null || props.to === '') {
    return
  }
  void router.push(props.to)
}
</script>

<template>
  <Button
    type="button"
    variant="outline"
    size="sm"
    class="w-fit shrink-0"
    :disabled="disabled"
    @click="onClick"
  >
    <Icon name="i-lucide-arrow-left" class="size-4" />
    <slot>Volver</slot>
  </Button>
</template>
