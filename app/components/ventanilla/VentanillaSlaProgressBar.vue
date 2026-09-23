<script setup lang="ts">
import {
  buildSlaProgressSections,
  slaSectionIndex,
  type SlaSectionTone,
} from '~/utils/sla-progress-sections'

const props = withDefaults(defineProps<{
  slaBusinessDays?: number | null
  elapsedBusinessDays?: number | null
  deadline?: string | null
  compact?: boolean
}>(), {
  slaBusinessDays: null,
  elapsedBusinessDays: null,
  deadline: null,
  compact: false,
})

const toneClass: Record<SlaSectionTone, string> = {
  green: 'bg-emerald-500',
  yellow: 'bg-yellow-400',
  orange: 'bg-orange-500',
  red: 'bg-red-500',
}

const sections = computed(() => buildSlaProgressSections(props.slaBusinessDays ?? 0))
const total = computed(() => Math.max(0, Math.floor(props.slaBusinessDays ?? 0)))
const elapsed = computed(() => Math.max(0, Math.floor(props.elapsedBusinessDays ?? 0)))

const overdue = computed(() => total.value > 0 && elapsed.value > total.value)

const progress = computed(() => {
  if (total.value < 1) {
    return 0
  }

  if (overdue.value) {
    return 100
  }

  return Math.min(100, (elapsed.value / total.value) * 100)
})

const activeIndex = computed(() => {
  if (overdue.value) {
    return Math.max(0, sections.value.length - 1)
  }

  return slaSectionIndex(sections.value, elapsed.value)
})

const activeSection = computed(() => sections.value[activeIndex.value] ?? null)

const progressLabel = computed(() => {
  if (!activeSection.value) {
    return ''
  }

  const dayLabel = overdue.value
    ? `Vencido · día ${elapsed.value} de ${total.value}`
    : `Día ${Math.min(elapsed.value, total.value)} de ${total.value}`

  return `${dayLabel} · ${activeSection.value.label}`
})

const formattedDeadline = computed(() => {
  if (!props.deadline) {
    return ''
  }

  const date = new Date(props.deadline)

  if (!Number.isFinite(date.getTime())) {
    return ''
  }

  return date.toLocaleString('es-CO')
})

function sectionWidth(days: number): string {
  if (total.value < 1) {
    return '0%'
  }

  return `${(days / total.value) * 100}%`
}

function dayRange(fromDay: number, toDay: number): string {
  return fromDay === toDay ? String(fromDay) : `${fromDay}–${toDay}`
}
</script>

<template>
  <div v-if="sections.length" class="min-w-0 space-y-1">
    <div
      class="relative h-2.5 w-full"
      role="img"
      :aria-label="progressLabel"
    >
      <div class="flex h-full overflow-hidden rounded-full">
        <div
          v-for="(section, index) in sections"
          :key="section.tone"
          class="h-full"
          :class="[toneClass[section.tone], index > activeIndex ? 'opacity-30' : '']"
          :style="{ width: sectionWidth(section.days) }"
        />
      </div>
      <div
        class="absolute top-[-2px] bottom-[-2px] w-0.5 rounded-full bg-foreground shadow"
        :style="{ left: progress >= 100 ? 'calc(100% - 2px)' : `${progress}%` }"
      />
    </div>
    <div class="text-muted-foreground flex text-[10px] leading-tight">
      <span
        v-for="(section, index) in sections"
        :key="`${section.tone}-label`"
        class="truncate"
        :class="index === activeIndex ? 'text-foreground font-medium' : ''"
        :style="{ width: sectionWidth(section.days) }"
      >
        {{ dayRange(section.fromDay, section.toDay) }}
        <template v-if="!compact"> · {{ section.label }}</template>
      </span>
    </div>
    <p class="text-muted-foreground text-xs">
      {{ progressLabel }}
      <template v-if="deadline">
        · vence {{ formattedDeadline }}
      </template>
    </p>
  </div>
</template>
