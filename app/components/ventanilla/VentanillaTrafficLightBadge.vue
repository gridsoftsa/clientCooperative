<script setup lang="ts">
import {
  VENTANILLA_TRAFFIC_LIGHT_LABELS,
  ventanillaTrafficLightBadgeClass,
  ventanillaTrafficLightBadgeVariant,
} from '~/constants/ventanilla'
import type { VentanillaTrafficLightValue } from '~/types/ventanilla'

const props = defineProps<{
  status: VentanillaTrafficLightValue | null | undefined
  requiresResponse?: boolean
}>()

const label = computed(() => {
  if (!props.status) {
    return 'Sin SLA'
  }

  return VENTANILLA_TRAFFIC_LIGHT_LABELS[props.status] ?? props.status
})

const variant = computed(() => ventanillaTrafficLightBadgeVariant(props.status))
const badgeClass = computed(() => ventanillaTrafficLightBadgeClass(props.status))
</script>

<template>
  <Badge v-if="requiresResponse === false" variant="outline">
    Sin respuesta
  </Badge>
  <Badge v-else-if="status" :variant="variant" :class="badgeClass">
    {{ label }}
  </Badge>
  <span v-else class="text-muted-foreground text-xs">—</span>
</template>
