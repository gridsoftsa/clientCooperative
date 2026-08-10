<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { CommunicationSettingsPayload } from '~/types/communications'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'comunicados_parametrizar',
})

const communicationsApi = useCommunicationsApi()

const loading = ref(true)
const saving = ref(false)
const form = ref<CommunicationSettingsPayload>({
  reminder_default_interval_days: 3,
  reminder_default_max_count: 2,
  reminder_interval_options: [1, 3, 7],
  reminder_max_count_options: [1, 2, 3],
})

const intervalOptionsText = ref('1, 3, 7')
const maxCountOptionsText = ref('1, 2, 3')

const intervalChoiceOptions = computed(() =>
  form.value.reminder_interval_options.map(value => ({
    value: String(value),
    label: value === 1 ? 'Cada 1 día' : `Cada ${value} días`,
  })),
)

const maxCountChoiceOptions = computed(() =>
  form.value.reminder_max_count_options.map(value => ({
    value: String(value),
    label: value === 1 ? '1 recordatorio' : `${value} recordatorios`,
  })),
)

function parsePositiveIntList(value: string): number[] {
  const parsed = value
    .split(/[,\s;]+/)
    .map(part => Number.parseInt(part.trim(), 10))
    .filter(number => Number.isFinite(number) && number > 0)

  return [...new Set(parsed)].sort((a, b) => a - b)
}

function syncOptionListsFromText(): boolean {
  const intervals = parsePositiveIntList(intervalOptionsText.value)
  const maxCounts = parsePositiveIntList(maxCountOptionsText.value)

  if (intervals.length === 0 || maxCounts.length === 0) {
    toast.error('Las listas de opciones deben incluir al menos un número mayor a cero.')
    return false
  }

  form.value.reminder_interval_options = intervals
  form.value.reminder_max_count_options = maxCounts

  if (!intervals.includes(form.value.reminder_default_interval_days)) {
    form.value.reminder_default_interval_days = intervals[0]
  }

  if (!maxCounts.includes(form.value.reminder_default_max_count)) {
    form.value.reminder_default_max_count = maxCounts[0]
  }

  return true
}

async function load() {
  loading.value = true
  try {
    const settings = await communicationsApi.fetchSettings()
    form.value = settings
    intervalOptionsText.value = settings.reminder_interval_options.join(', ')
    maxCountOptionsText.value = settings.reminder_max_count_options.join(', ')
  }
  catch {
    toast.error('No se pudo cargar la configuración de comunicados.')
  }
  finally {
    loading.value = false
  }
}

async function save() {
  if (!syncOptionListsFromText()) {
    return
  }

  saving.value = true
  try {
    const response = await communicationsApi.updateSettings(form.value)
    form.value = response.data
    intervalOptionsText.value = response.data.reminder_interval_options.join(', ')
    maxCountOptionsText.value = response.data.reminder_max_count_options.join(', ')
    toast.success(response.message || 'Configuración guardada.')
  }
  catch {
    toast.error('No se pudo guardar la configuración.')
  }
  finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-3xl space-y-6">
    <div class="space-y-1">
      <Button variant="ghost" size="sm" as-child class="-ml-2">
        <NuxtLink to="/comunicados">
          <Icon name="i-lucide-arrow-left" class="mr-1 size-4" />
          Volver a comunicados
        </NuxtLink>
      </Button>
      <h1 class="text-2xl font-semibold tracking-tight">
        Parametrización de comunicados
      </h1>
      <p class="text-sm text-muted-foreground">
        Valores por defecto y opciones disponibles al publicar comunicados con recordatorios de lectura.
      </p>
    </div>

    <div v-if="loading" class="py-16 text-center text-muted-foreground">
      Cargando...
    </div>

    <Card v-else>
      <CardHeader>
        <CardTitle class="text-base">
          Recordatorios de lectura
        </CardTitle>
        <CardDescription>
          Aplica cuando un comunicado exige confirmación de lectura y el autor activa recordatorios automáticos.
        </CardDescription>
      </CardHeader>
      <CardContent class="space-y-6">
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-2">
            <Label>Intervalo por defecto</Label>
            <Select
              :model-value="String(form.reminder_default_interval_days)"
              @update:model-value="form.reminder_default_interval_days = Number($event)"
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione intervalo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="option in intervalChoiceOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label>Máximo de recordatorios por defecto</Label>
            <Select
              :model-value="String(form.reminder_default_max_count)"
              @update:model-value="form.reminder_default_max_count = Number($event)"
            >
              <SelectTrigger>
                <SelectValue placeholder="Seleccione máximo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="option in maxCountChoiceOptions"
                  :key="option.value"
                  :value="option.value"
                >
                  {{ option.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-2">
            <Label for="interval-options">Opciones de intervalo (días)</Label>
            <Input
              id="interval-options"
              v-model="intervalOptionsText"
              placeholder="1, 3, 7"
              @blur="syncOptionListsFromText"
            />
            <p class="text-xs text-muted-foreground">
              Números separados por coma. Se muestran al crear un comunicado.
            </p>
          </div>

          <div class="space-y-2">
            <Label for="max-count-options">Opciones de máximo de recordatorios</Label>
            <Input
              id="max-count-options"
              v-model="maxCountOptionsText"
              placeholder="1, 2, 3"
              @blur="syncOptionListsFromText"
            />
          </div>
        </div>

        <div class="flex justify-end">
          <Button type="button" :disabled="saving" @click="save">
            Guardar configuración
          </Button>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
