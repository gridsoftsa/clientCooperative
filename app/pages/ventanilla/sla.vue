<script setup lang="ts">
import type { VentanillaSlaSettingsData } from '~/types/ventanilla'

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
    data.value = await api.fetchSlaSettings()
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
</script>

<template>
  <div class="mx-auto max-w-4xl space-y-6 p-4 md:p-6">
    <div class="flex items-center gap-3">
      <Button variant="ghost" size="icon" @click="navigateTo('/ventanilla')">
        <Icon name="i-lucide-arrow-left" class="size-4" />
      </Button>
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">
          SLA de Ventanilla
        </h1>
        <p class="text-muted-foreground text-sm">
          Calendario laboral, semáforo y alertas de vencimiento.
        </p>
      </div>
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
      <Card>
        <CardHeader>
          <CardTitle>Calendario laboral</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="space-y-2">
            <Label>Nombre del calendario</Label>
            <Input v-model="data.settings.calendar_name" />
          </div>
          <div class="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
            <label
              v-for="day in weekDays"
              :key="day.value"
              class="flex items-center gap-2 rounded-lg border p-3 text-sm"
            >
              <Checkbox
                :checked="data.settings.working_days.includes(day.value)"
                @update:checked="toggleWorkingDay(day.value, Boolean($event))"
              />
              {{ day.label }}
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Semáforo</CardTitle>
        </CardHeader>
        <CardContent class="grid gap-4 md:grid-cols-3">
          <div class="space-y-2">
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
          <div class="space-y-2">
            <Label>Umbral porcentaje</Label>
            <Input v-model.number="data.settings.orange_percentage" type="number" min="1" max="100" />
          </div>
          <div class="space-y-2">
            <Label>Días antes</Label>
            <Input v-model.number="data.settings.orange_days_before" type="number" min="0" max="365" />
          </div>
          <label class="flex items-center gap-2 md:col-span-3">
            <Checkbox
              :checked="data.settings.alerts_enabled"
              @update:checked="data.settings.alerts_enabled = Boolean($event)"
            />
            Generar alertas naranja/rojo
          </label>
          <div class="md:col-span-3">
            <Button :disabled="saving" @click="saveSettings">
              {{ saving ? 'Guardando…' : 'Guardar configuración' }}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Festivos</CardTitle>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="grid gap-3 md:grid-cols-[180px_1fr_auto]">
            <Input v-model="holidayDate" type="date" />
            <Input v-model="holidayName" placeholder="Nombre del festivo" />
            <Button :disabled="saving" @click="addHoliday">
              Agregar
            </Button>
          </div>
          <ul v-if="data.holidays.length" class="divide-y rounded-lg border">
            <li
              v-for="holiday in data.holidays"
              :key="holiday.id"
              class="flex items-center justify-between gap-3 p-3 text-sm"
            >
              <span>{{ holiday.date }} — {{ holiday.name }}</span>
              <Button variant="ghost" size="sm" :disabled="saving" @click="removeHoliday(holiday.id)">
                Eliminar
              </Button>
            </li>
          </ul>
          <p v-else class="text-muted-foreground text-sm">
            No hay festivos configurados.
          </p>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
