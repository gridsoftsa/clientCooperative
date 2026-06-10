<script setup lang="ts">
import type {
  VentanillaCatalogData,
  VentanillaColombiaHolidayPreviewData,
  VentanillaSlaSettingsData,
} from '~/types/ventanilla'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'ventanilla_sla_configurar',
})

const api = useVentanillaApi()
const loading = ref(true)
const saving = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const data = ref<VentanillaSlaSettingsData | null>(null)
const holidayDate = ref('')
const holidayName = ref('')
const catalogYear = ref(new Date().getFullYear())
const catalogPreview = ref<VentanillaColombiaHolidayPreviewData | null>(null)
const catalogLoading = ref(false)
const replaceCatalogYear = ref(false)
const activeTab = ref('general')
const catalog = ref<VentanillaCatalogData | null>(null)

const escalationFunctionalTypeKeys = computed({
  get: () => data.value?.settings.escalation_functional_type_keys ?? [],
  set: (keys: string[]) => {
    if (data.value?.settings) {
      data.value.settings.escalation_functional_type_keys = keys.length > 0 ? keys : null
    }
  },
})

function toggleEscalationFunctionalType(key: string, checked: boolean): void {
  const current = new Set(escalationFunctionalTypeKeys.value)
  if (checked) {
    current.add(key)
  } else {
    current.delete(key)
  }
  escalationFunctionalTypeKeys.value = Array.from(current)
}

const visibleHolidays = computed(() => {
  const year = String(catalogYear.value)
  return (data.value?.holidays ?? []).filter((holiday) => holidayYear(holiday.date) === year)
})

const weekDays = [
  { value: 1, label: 'Lunes' },
  { value: 2, label: 'Martes' },
  { value: 3, label: 'Miércoles' },
  { value: 4, label: 'Jueves' },
  { value: 5, label: 'Viernes' },
  { value: 6, label: 'Sábado' },
  { value: 7, label: 'Domingo' },
]

onMounted(() => load())

async function load() {
  loading.value = true
  errorMessage.value = ''
  try {
    const [settingsData, catalogData] = await Promise.all([
      api.fetchSlaSettings(),
      api.fetchCatalog().catch(() => null),
    ])
    data.value = settingsData
    catalog.value = catalogData
    if (data.value?.settings) {
      data.value.settings.notify_assignee ??= true
      data.value.settings.notify_immediate_supervisor ??= true
      data.value.settings.notify_unit_manager ??= false
      data.value.settings.red_reminder_interval_days ??= 0
      data.value.settings.escalation_enabled ??= false
      data.value.settings.escalation_business_days_after_deadline ??= 1
      data.value.settings.escalation_notify_immediate_supervisor ??= true
      data.value.settings.escalation_notify_unit_manager ??= true
      data.value.settings.escalation_functional_type_keys ??= null
    }
  } catch {
    errorMessage.value = 'No se pudo cargar la configuración SLA'
  } finally {
    loading.value = false
  }
}

function toggleWorkingDay(day: number, checked: boolean) {
  const settings = data.value?.settings
  if (!settings) {
    return
  }
  const set = new Set<number>(settings.working_days)
  if (checked) {
    set.add(day)
  } else {
    set.delete(day)
  }
  settings.working_days = Array.from(set).sort((a: number, b: number) => a - b)
}

async function saveSettings() {
  if (!data.value) {
    return
  }
  if (data.value.settings.working_days.length === 0) {
    errorMessage.value = 'Seleccione al menos un día laboral'
    return
  }

  saving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    data.value = await api.updateSlaSettings({
      calendar_name: data.value.settings.calendar_name,
      working_days: data.value.settings.working_days,
      orange_model: data.value.settings.orange_model,
      orange_percentage: Number(data.value.settings.orange_percentage),
      orange_days_before: Number(data.value.settings.orange_days_before),
      alerts_enabled: data.value.settings.alerts_enabled,
      notify_assignee: data.value.settings.notify_assignee,
      notify_immediate_supervisor: data.value.settings.notify_immediate_supervisor,
      notify_unit_manager: data.value.settings.notify_unit_manager,
      red_reminder_interval_days: Number(data.value.settings.red_reminder_interval_days),
      escalation_enabled: data.value.settings.escalation_enabled,
      escalation_business_days_after_deadline: Number(data.value.settings.escalation_business_days_after_deadline),
      escalation_notify_immediate_supervisor: data.value.settings.escalation_notify_immediate_supervisor,
      escalation_notify_unit_manager: data.value.settings.escalation_notify_unit_manager,
      escalation_functional_type_keys: data.value.settings.escalation_functional_type_keys,
    })
    successMessage.value = 'Configuración SLA guardada'
  } catch {
    errorMessage.value = 'No se pudo guardar la configuración SLA'
  } finally {
    saving.value = false
  }
}

async function addHoliday() {
  if (!holidayDate.value || !holidayName.value.trim()) {
    errorMessage.value = 'Ingrese fecha y nombre del festivo'
    return
  }
  saving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    data.value = await api.addHoliday({ date: holidayDate.value, name: holidayName.value.trim() })
    holidayDate.value = ''
    holidayName.value = ''
    successMessage.value = 'Festivo guardado'
  } catch {
    errorMessage.value = 'No se pudo guardar el festivo'
  } finally {
    saving.value = false
  }
}

async function removeHoliday(id: number) {
  saving.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    data.value = await api.removeHoliday(id)
    successMessage.value = 'Festivo eliminado'
  } catch {
    errorMessage.value = 'No se pudo eliminar el festivo'
  } finally {
    saving.value = false
  }
}

async function previewColombiaHolidays() {
  catalogLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    catalogPreview.value = await api.previewColombiaHolidays(catalogYear.value)
  } catch {
    errorMessage.value = 'No se pudo consultar el calendario de festivos'
    catalogPreview.value = null
  } finally {
    catalogLoading.value = false
  }
}

async function importColombiaHolidays() {
  catalogLoading.value = true
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const result = await api.importColombiaHolidays(catalogYear.value, replaceCatalogYear.value)
    data.value = result.data
    catalogPreview.value = await api.previewColombiaHolidays(catalogYear.value)
    successMessage.value = result.message
  } catch {
    errorMessage.value = 'No se pudo importar el calendario de festivos'
  } finally {
    catalogLoading.value = false
  }
}

function holidayYear(value: string): string {
  return value.slice(0, 4)
}

function formatHolidayDate(value: string): string {
  const normalized = value.slice(0, 10)
  if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
    return value
  }
  const [year, month, day] = normalized.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <Button variant="ghost" size="icon" @click="navigateTo('/ventanilla')">
          <Icon name="i-lucide-arrow-left" class="size-4" />
        </Button>
        <div>
          <h1 class="text-xl font-semibold tracking-tight md:text-2xl">
            SLA de Ventanilla
          </h1>
          <p class="text-muted-foreground text-sm">
            Calendario laboral, semáforo y alertas de vencimiento.
          </p>
        </div>
      </div>
      <Button
        v-if="data && activeTab === 'general'"
        :disabled="saving"
        class="shrink-0"
        @click="saveSettings"
      >
        <Icon
          v-if="saving"
          name="i-lucide-loader-2"
          class="mr-2 size-4 animate-spin"
        />
        {{ saving ? 'Guardando…' : 'Guardar configuración' }}
      </Button>
    </div>

    <p v-if="errorMessage" class="text-destructive text-sm">
      {{ errorMessage }}
    </p>
    <p v-if="successMessage" class="text-sm text-emerald-600">
      {{ successMessage }}
    </p>

    <div v-if="loading" class="text-muted-foreground text-sm">
      Cargando…
    </div>

    <template v-else-if="data">
      <Tabs v-model="activeTab" default-value="general">
        <TabsList class="grid h-auto w-full max-w-md grid-cols-2">
          <TabsTrigger value="general">
            Calendario y semáforo
          </TabsTrigger>
          <TabsTrigger value="holidays">
            Festivos
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" class="mt-4 space-y-4">
          <div class="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader class="pb-3">
                <CardTitle class="text-base">
                  Calendario laboral
                </CardTitle>
              </CardHeader>
              <CardContent class="space-y-3">
                <div class="space-y-1.5">
                  <Label>Nombre del calendario</Label>
                  <Input v-model="data.settings.calendar_name" />
                </div>
                <div class="space-y-1.5">
                  <Label>Días laborales</Label>
                  <div class="flex flex-wrap gap-1.5">
                    <label
                      v-for="day in weekDays"
                      :key="day.value"
                      class="inline-flex cursor-pointer items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs transition-colors hover:bg-muted/50 sm:text-sm"
                      :class="data.settings.working_days.includes(day.value)
                        ? 'border-primary/40 bg-primary/5'
                        : ''"
                    >
                      <Checkbox
                        :checked="data.settings.working_days.includes(day.value)"
                        @update:checked="toggleWorkingDay(day.value, Boolean($event))"
                      />
                      {{ day.label }}
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader class="pb-3">
                <CardTitle class="text-base">
                  Semáforo
                </CardTitle>
              </CardHeader>
              <CardContent class="space-y-3">
                <div class="grid gap-3 sm:grid-cols-3">
                  <div class="space-y-1.5 sm:col-span-3">
                    <Label>Modelo naranja</Label>
                    <Select v-model="data.settings.orange_model">
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="percentage">
                          Porcentaje consumido
                        </SelectItem>
                        <SelectItem value="days_before">
                          Días antes del vencimiento
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div class="space-y-1.5">
                    <Label>Umbral %</Label>
                    <Input v-model.number="data.settings.orange_percentage" type="number" min="1" max="100" />
                  </div>
                  <div class="space-y-1.5">
                    <Label>Días antes</Label>
                    <Input v-model.number="data.settings.orange_days_before" type="number" min="0" max="365" />
                  </div>
                  <div class="space-y-1.5">
                    <Label>Recordatorio rojo</Label>
                    <Input
                      v-model.number="data.settings.red_reminder_interval_days"
                      type="number"
                      min="0"
                      max="30"
                      title="Cada N días hábiles, 0 = desactivado"
                    />
                  </div>
                </div>
                <label class="flex items-center gap-2 text-sm">
                  <Checkbox
                    :checked="data.settings.alerts_enabled"
                    @update:checked="data.settings.alerts_enabled = Boolean($event)"
                  />
                  Generar alertas naranja/rojo
                </label>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader class="pb-3">
              <CardTitle class="text-base">
                Notificaciones por correo
              </CardTitle>
              <CardDescription>
                Destinatarios y recordatorios cuando el SLA entra en rojo.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div class="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <label class="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <Checkbox
                    :checked="data.settings.notify_assignee"
                    @update:checked="data.settings.notify_assignee = Boolean($event)"
                  />
                  Responsable asignado
                </label>
                <label class="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <Checkbox
                    :checked="data.settings.notify_immediate_supervisor"
                    @update:checked="data.settings.notify_immediate_supervisor = Boolean($event)"
                  />
                  Jefe inmediato
                </label>
                <label class="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <Checkbox
                    :checked="data.settings.notify_unit_manager"
                    @update:checked="data.settings.notify_unit_manager = Boolean($event)"
                  />
                  Jefe del área responsable
                </label>
              </div>
              <p class="text-muted-foreground mt-2 text-xs">
                Recordatorio en rojo: cada N días hábiles (0 = desactivado).
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="pb-3">
              <CardTitle class="text-base">
                Escalamiento
              </CardTitle>
              <CardDescription>
                Tras superar el umbral de días hábiles vencidos, notifica a superiores sin reasignar el responsable.
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
              <label class="flex items-center gap-2 text-sm">
                <Checkbox
                  :checked="data.settings.escalation_enabled"
                  @update:checked="data.settings.escalation_enabled = Boolean($event)"
                />
                Activar escalamiento automático
              </label>
              <div class="grid gap-3 sm:grid-cols-2">
                <div class="space-y-1.5">
                  <Label>Días hábiles vencidos para escalar</Label>
                  <Input
                    v-model.number="data.settings.escalation_business_days_after_deadline"
                    type="number"
                    min="0"
                    max="90"
                    :disabled="!data.settings.escalation_enabled"
                  />
                  <p class="text-muted-foreground text-xs">
                    Ej.: 1 = al primer día hábil después del vencimiento.
                  </p>
                </div>
              </div>
              <div class="grid gap-2 sm:grid-cols-2">
                <label class="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <Checkbox
                    :checked="data.settings.escalation_notify_immediate_supervisor"
                    :disabled="!data.settings.escalation_enabled"
                    @update:checked="data.settings.escalation_notify_immediate_supervisor = Boolean($event)"
                  />
                  Jefe inmediato del responsable
                </label>
                <label class="flex items-center gap-2 rounded-md border px-3 py-2 text-sm">
                  <Checkbox
                    :checked="data.settings.escalation_notify_unit_manager"
                    :disabled="!data.settings.escalation_enabled"
                    @update:checked="data.settings.escalation_notify_unit_manager = Boolean($event)"
                  />
                  Jefe del área responsable
                </label>
              </div>
              <div v-if="catalog?.functional_types?.length" class="space-y-2">
                <Label>Tipos funcionales (vacío = todos)</Label>
                <div class="flex flex-wrap gap-2">
                  <label
                    v-for="type in catalog.functional_types"
                    :key="type.key"
                    class="flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs"
                    :class="{ 'opacity-50': !data.settings.escalation_enabled }"
                  >
                    <Checkbox
                      :checked="escalationFunctionalTypeKeys.includes(type.key)"
                      :disabled="!data.settings.escalation_enabled"
                      @update:checked="toggleEscalationFunctionalType(type.key, Boolean($event))"
                    />
                    {{ type.label }}
                  </label>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="holidays" class="mt-4 space-y-4">
          <div class="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader class="pb-3">
                <CardTitle class="text-base">
                  Importar calendario Colombia
                </CardTitle>
                <CardDescription class="text-xs leading-relaxed">
                  2026 usa fechas verificadas; otros años se calculan con Ley Emiliani.
                </CardDescription>
              </CardHeader>
              <CardContent class="space-y-3">
                <div class="flex flex-wrap items-end gap-2">
                  <div class="space-y-1.5">
                    <Label>Año</Label>
                    <Input v-model.number="catalogYear" type="number" min="1970" max="2100" class="w-[100px]" />
                  </div>
                  <Button variant="outline" size="sm" :disabled="catalogLoading" @click="previewColombiaHolidays">
                    {{ catalogLoading ? 'Consultando…' : 'Consultar' }}
                  </Button>
                  <Button
                    size="sm"
                    :disabled="catalogLoading || !catalogPreview?.holidays.length"
                    @click="importColombiaHolidays"
                  >
                    {{ catalogLoading ? 'Importando…' : 'Importar al SLA' }}
                  </Button>
                </div>
                <label class="flex items-center gap-2 text-sm">
                  <Checkbox
                    :checked="replaceCatalogYear"
                    @update:checked="replaceCatalogYear = Boolean($event)"
                  />
                  Reemplazar festivos del año antes de importar
                </label>
                <div
                  v-if="catalogPreview?.holidays.length"
                  class="max-h-56 overflow-auto rounded-lg border"
                >
                  <table class="min-w-full text-sm">
                    <thead class="bg-muted/50 sticky top-0 text-left">
                      <tr>
                        <th class="px-2.5 py-1.5 text-xs font-medium">
                          Fecha
                        </th>
                        <th class="px-2.5 py-1.5 text-xs font-medium">
                          Festivo
                        </th>
                        <th class="px-2.5 py-1.5 text-xs font-medium">
                          SLA
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr
                        v-for="holiday in catalogPreview.holidays"
                        :key="holiday.date"
                        class="border-t"
                      >
                        <td class="px-2.5 py-1.5 whitespace-nowrap text-xs">
                          {{ formatHolidayDate(holiday.date) }}
                        </td>
                        <td class="px-2.5 py-1.5 text-xs">
                          <span class="line-clamp-1" :title="holiday.name">{{ holiday.name }}</span>
                        </td>
                        <td class="px-2.5 py-1.5">
                          <Badge
                            class="text-[10px]"
                            :variant="holiday.already_configured ? 'secondary' : 'outline'"
                          >
                            {{ holiday.already_configured ? 'Sí' : 'No' }}
                          </Badge>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p v-else class="text-muted-foreground text-xs">
                  Consulte un año para ver el calendario nacional.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader class="pb-3">
                <CardTitle class="text-base">
                  Festivos en SLA ({{ catalogYear }})
                </CardTitle>
                <CardDescription class="text-xs">
                  Activos en el calendario o agregados manualmente.
                </CardDescription>
              </CardHeader>
              <CardContent class="space-y-3">
                <div class="flex flex-wrap gap-2">
                  <Input v-model="holidayDate" type="date" class="w-[140px]" />
                  <Input v-model="holidayName" placeholder="Nombre del festivo" class="min-w-0 flex-1" />
                  <Button size="sm" :disabled="saving" @click="addHoliday">
                    Agregar
                  </Button>
                </div>
                <ul
                  v-if="visibleHolidays.length"
                  class="max-h-56 divide-y overflow-auto rounded-lg border"
                >
                  <li
                    v-for="holiday in visibleHolidays"
                    :key="holiday.id"
                    class="flex items-center justify-between gap-2 px-2.5 py-1.5 text-sm"
                  >
                    <span class="min-w-0 truncate">
                      <span class="text-muted-foreground text-xs">{{ formatHolidayDate(holiday.date) }}</span>
                      — {{ holiday.name }}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      class="size-7 shrink-0"
                      :disabled="saving"
                      aria-label="Eliminar festivo"
                      @click="removeHoliday(holiday.id)"
                    >
                      <Icon name="i-lucide-trash-2" class="size-3.5 text-destructive" />
                    </Button>
                  </li>
                </ul>
                <p v-else class="text-muted-foreground text-xs">
                  Sin festivos para {{ catalogYear }}. Importe el calendario o agregue uno manualmente.
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </template>
  </div>
</template>
