<script setup lang="ts">
import type { ArchivalTrdPlacement } from '~/types/archival-file'
import {
  archivalTrdFullPath,
  archivalTrdLevels,
  archivalTrdShortLabel,
} from '~/utils/archival-trd-display'

const props = defineProps<{
  trd?: ArchivalTrdPlacement | null
  compact?: boolean
}>()

const levels = computed(() => archivalTrdLevels(props.trd))
const shortLabel = computed(() => archivalTrdShortLabel(props.trd))
const fullPath = computed(() => archivalTrdFullPath(props.trd))
const triggerLabel = computed(() => `TRD ${shortLabel.value}`.trim())
const accessibleLabel = computed(() => (
  fullPath.value ? `Ubicación TRD: ${fullPath.value}` : 'Ubicación TRD'
))
</script>

<template>
  <Popover v-if="levels.length">
    <PopoverTrigger as-child>
      <button
        type="button"
        class="inline-flex min-w-0 shrink-0 items-center gap-0.5 rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground hover:bg-muted/80 hover:text-foreground sm:gap-1 sm:px-2 sm:text-xs"
        :class="compact ? 'h-6 max-w-[4.5rem]' : 'h-7 max-w-[10.5rem]'"
        :title="fullPath"
        :aria-label="accessibleLabel"
        @click.stop
      >
        <Icon
          name="i-lucide-folder-tree"
          class="size-3 shrink-0"
          aria-hidden="true"
        />
        <span class="min-w-0 truncate">
          {{ compact ? 'TRD' : triggerLabel }}
        </span>
        <Icon
          name="i-lucide-chevron-down"
          class="size-3 shrink-0"
          aria-hidden="true"
        />
      </button>
    </PopoverTrigger>
    <PopoverContent
      align="start"
      class="w-80 max-w-[min(20rem,calc(100vw-2rem))] p-3"
      @click.stop
    >
      <p class="mb-2 text-xs font-medium">
        Ubicación TRD
      </p>
      <dl class="space-y-2">
        <div
          v-for="level in levels"
          :key="level.key"
        >
          <dt class="text-[10px] uppercase tracking-wide text-muted-foreground">
            {{ level.label }}
          </dt>
          <dd
            class="text-xs font-medium break-words"
            :title="level.value"
          >
            {{ level.value }}
          </dd>
        </div>
      </dl>
    </PopoverContent>
  </Popover>
</template>
