<script setup lang="ts">
import type { DateValue } from '@internationalized/date'
import type { DateRange } from 'reka-ui'
import { DateFormatter, getLocalTimeZone, parseDate, today } from '@internationalized/date'
import { Calendar as CalendarIcon } from 'lucide-vue-next'
import { cn } from '@/lib/utils'

const props = withDefaults(
  defineProps<{
    id?: string
    label?: string
    placeholderText?: string
  }>(),
  {
    label: 'Creada entre fechas',
    placeholderText: 'Elegir rango de fechas',
  },
)

const from = defineModel<string>('from', { default: '' })
const to = defineModel<string>('to', { default: '' })

const df = new DateFormatter('es-CO', { dateStyle: 'medium' })
const localTz = getLocalTimeZone()
const todayPlaceholder = today(localTz)

const inner = ref<DateRange>({ start: undefined, end: undefined })
let syncingFromModel = false

function syncModelIntoInner() {
  syncingFromModel = true
  try {
    const f = from.value?.trim()
    const t = to.value?.trim()
    inner.value = {
      start: f ? parseDate(f) : undefined,
      end: t ? parseDate(t) : undefined,
    }
  }
  finally {
    nextTick(() => {
      syncingFromModel = false
    })
  }
}

watch([from, to], syncModelIntoInner, { immediate: true })

function formatDay(d: DateValue) {
  return df.format(d.toDate(localTz))
}

const buttonLabel = computed(() => {
  if (inner.value.start && inner.value.end) {
    return `${formatDay(inner.value.start)} – ${formatDay(inner.value.end)}`
  }
  if (inner.value.start) {
    return formatDay(inner.value.start)
  }
  return props.placeholderText
})

const hasRange = computed(() => Boolean(from.value?.trim() || to.value?.trim()))
const popoverId = props.id ? `${props.id}-popover` : undefined

const calendarPlaceholder = computed(() => inner.value.start ?? todayPlaceholder)

watch(
  inner,
  () => {
    if (syncingFromModel)
      return
    const nextFrom = inner.value.start ? inner.value.start.toString() : ''
    const nextTo = inner.value.end ? inner.value.end.toString() : ''
    if (from.value === nextFrom && to.value === nextTo)
      return
    from.value = nextFrom
    to.value = nextTo
  },
  { deep: true },
)

function clearRange() {
  inner.value = { start: undefined, end: undefined }
}
</script>

<template>
  <div class="grid w-full min-w-0 gap-1.5">
    <Label v-if="label" :for="id" class="text-xs text-muted-foreground">
      {{ label }}
    </Label>
    <div class="flex min-w-0 flex-wrap items-center gap-2">
      <Popover>
        <PopoverTrigger as-child>
          <Button
            :id="id"
            type="button"
            variant="outline"
            :class="cn(
              'h-9 w-full min-w-0 max-w-md justify-start text-left font-normal',
              !hasRange && 'text-muted-foreground',
            )"
            :aria-describedby="popoverId"
          >
            <CalendarIcon class="mr-2 h-4 w-4 shrink-0" />
            <span class="truncate">{{ buttonLabel }}</span>
          </Button>
        </PopoverTrigger>
        <PopoverContent
          :id="popoverId"
          class="w-auto p-0"
          align="start"
        >
          <RangeCalendar
            v-model="inner"
            locale="es-CO"
            class="border-0"
            :placeholder="calendarPlaceholder"
            :number-of-months="2"
            initial-focus
            paged-navigation
            weekday-format="short"
            fixed-weeks
          />
          <div class="border-t p-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              class="h-8 w-full text-xs text-muted-foreground"
              :disabled="!hasRange"
              @click="clearRange"
            >
              Quitar fechas
            </Button>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  </div>
</template>
