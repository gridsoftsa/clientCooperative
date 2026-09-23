<script setup lang="ts">
import { currentCalendarMonthDateRange } from '~/utils/dateInputValue'

definePageMeta({
  middleware: 'permission',
  permissions: 'dashboard_ver|ventanilla_dashboard_ver',
})

const { hasPermission } = usePermissions()

const showVentanilla = computed(() => hasPermission('ventanilla_dashboard_ver'))
const showCredits = computed(() => hasPermission('dashboard_ver'))
const showBoth = computed(() => showVentanilla.value && showCredits.value)

const mainTab = computed(() => (showVentanilla.value ? 'ventanilla' : 'credits'))

const initialMonth = currentCalendarMonthDateRange()
const filterDateFrom = ref(initialMonth.from)
const filterDateTo = ref(initialMonth.to)

function applyCurrentMonthRange() {
  const range = currentCalendarMonthDateRange()
  filterDateFrom.value = range.from
  filterDateTo.value = range.to
}

const isCurrentMonthRange = computed(() => {
  const range = currentCalendarMonthDateRange()
  return filterDateFrom.value === range.from && filterDateTo.value === range.to
})

watch([filterDateFrom, filterDateTo], ([from, to]) => {
  if (!from?.trim() && !to?.trim()) {
    applyCurrentMonthRange()
  }
})
</script>

<template>
  <div class="@container/main flex w-full flex-col gap-4">
    <div class="rounded-xl border bg-muted/30 px-4 py-4">
      <div
        class="mx-auto flex w-full max-w-3xl flex-col flex-wrap items-center justify-center gap-3 sm:flex-row sm:gap-4"
      >
        <div class="w-full min-w-0 sm:max-w-md sm:flex-1">
          <DateRangeStringPicker
            id="dashboard-date-range"
            v-model:from="filterDateFrom"
            v-model:to="filterDateTo"
            placeholder-text="Mes actual"
            full-width
          />
        </div>
        <div class="flex shrink-0 items-center justify-center">
          <Button
            type="button"
            variant="outline"
            class="h-11 min-w-[8rem] px-4"
            :disabled="isCurrentMonthRange"
            @click="applyCurrentMonthRange"
          >
            Limpiar fechas
          </Button>
        </div>
      </div>
    </div>

    <Tabs
      v-if="showBoth"
      :default-value="mainTab"
      class="w-full"
    >
      <TabsList class="grid h-auto w-full grid-cols-1 gap-1.5 p-1.5 sm:grid-cols-2">
        <TabsTrigger value="ventanilla" class="gap-2 px-3 py-2.5 text-sm sm:text-base">
          <Icon name="i-lucide-inbox" class="size-4 shrink-0 opacity-70" />
          Ventanilla única
        </TabsTrigger>
        <TabsTrigger value="credits" class="gap-2 px-3 py-2.5 text-sm sm:text-base">
          <Icon name="i-lucide-banknote" class="size-4 shrink-0 opacity-70" />
          Créditos
        </TabsTrigger>
      </TabsList>
      <TabsContent value="ventanilla" class="mt-4 outline-none">
        <DashboardVentanillaPanel :date-from="filterDateFrom" :date-to="filterDateTo" />
      </TabsContent>
      <TabsContent value="credits" class="mt-4 outline-none">
        <DashboardCreditsPanel :date-from="filterDateFrom" :date-to="filterDateTo" />
      </TabsContent>
    </Tabs>

    <DashboardVentanillaPanel
      v-else-if="showVentanilla"
      :date-from="filterDateFrom"
      :date-to="filterDateTo"
    />
    <DashboardCreditsPanel
      v-else-if="showCredits"
      :date-from="filterDateFrom"
      :date-to="filterDateTo"
    />
  </div>
</template>
