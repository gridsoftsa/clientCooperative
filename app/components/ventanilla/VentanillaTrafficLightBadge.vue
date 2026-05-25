<script setup lang="ts">
import {
  VENTANILLA_TRAFFIC_LIGHT_LABELS,
  ventanillaTrafficLightBadgeVariant,
} from '~/constants/ventanilla'
import type { VentanillaTrafficLightValue } from '~/types/ventanilla'

const props = defineProps<{
  status: VentanillaTrafficLightValue | null | undefined
}>()

const label = computed(() => {
  if (!props.status) {
    return 'Sin SLA'
  }

  return VENTANILLA_TRAFFIC_LIGHT_LABELS[props.status] ?? props.status
})

const variant = computed(() => ventanillaTrafficLightBadgeVariant(props.status))
</script>

<template>
  <Badge v-if="status" :variant="variant">
    {{ label }}
  </Badge>
  <span v-else class="text-muted-foreground text-xs">—</span>
</template>
