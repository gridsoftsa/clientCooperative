<script setup lang="ts">
import { toast } from 'vue-sonner'
import {
  ARCHIVAL_FILE_ALERT_SEVERITY_LABELS,
} from '~/constants/archival-file-alerts'
import type {
  ArchivalFileAlertCatalog,
  ArchivalFileAlertCatalogType,
} from '~/types/archival-file'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: ['expedientes_reportes_ver', 'expedientes_alertas_configurar'],
})

const router = useRouter()
const archivalApi = useArchivalFileApi()
const { hasPermission } = usePermissions()

const loading = ref(true)
const saving = ref(false)
const catalog = ref<ArchivalFileAlertCatalog | null>(null)

const formGlobal = ref({
  enabled: true,
  email_enabled: false,
  notify_creator: true,
  notify_unit_manager: true,
  retention_upcoming_days: 30,
  stale_draft_days: 30,
  consolidation_reminder_days: 7,
})

const formTypes = ref<ArchivalFileAlertCatalogType[]>([])

const canEdit = computed(() => hasPermission('expedientes_alertas_configurar'))

const severityOptions = [
  { value: 'info', label: ARCHIVAL_FILE_ALERT_SEVERITY_LABELS.info },
  { value: 'warning', label: ARCHIVAL_FILE_ALERT_SEVERITY_LABELS.warning },
  { value: 'danger', label: ARCHIVAL_FILE_ALERT_SEVERITY_LABELS.danger },
]

const typesByCategory = computed(() => {
  const grouped = new Map<string, { key: string, label: string, types: ArchivalFileAlertCatalogType[] }>()

  for (const type of formTypes.value) {
    if (!grouped.has(type.category)) {
      grouped.set(type.category, {
        key: type.category,
        label: type.category_label,
        types: [],
      })
    }

    grouped.get(type.category)!.types.push(type)
  }

  return Array.from(grouped.values())
})

function severityVariant(severity: string) {
  if (severity === 'danger') {
    return 'destructive'
  }

  if (severity === 'info') {
    return 'secondary'
  }

  return 'outline'
}

function severityLabel(severity: string): string {
  return ARCHIVAL_FILE_ALERT_SEVERITY_LABELS[severity] ?? severity
}

function configParameterLabel(key: string | null): string {
  if (!key || !catalog.value) {
    return '—'
  }

  const parameter = catalog.value.parameters.find(item => item.key === key)

  return parameter?.label ?? key
}

function thresholdPlaceholder(type: ArchivalFileAlertCatalogType): string {
  if (type.effective_threshold_days !== null) {
    return String(type.effective_threshold_days)
  }

  return 'Global'
}

function syncForm(data: ArchivalFileAlertCatalog) {
  catalog.value = data
  formGlobal.value = {
    enabled: data.global.enabled,
    email_enabled: data.global.email_enabled,
    notify_creator: data.global.notify_creator,
    notify_unit_manager: data.global.notify_unit_manager,
    retention_upcoming_days: data.global.retention_upcoming_days,
    stale_draft_days: data.global.stale_draft_days,
    consolidation_reminder_days: data.global.consolidation_reminder_days,
  }
  formTypes.value = data.types.map(type => ({ ...type }))
}

async function load() {
  loading.value = true

  try {
    syncForm(await archivalApi.fetchAlertsCatalog())
  }
  catch {
    toast.error('No se pudo cargar la configuración de alertas.')
  }
  finally {
    loading.value = false
  }
}

async function save() {
  if (!canEdit.value) {
    return
  }

  saving.value = true

  try {
    const res = await archivalApi.updateAlertsSettings({
      global: { ...formGlobal.value },
      types: formTypes.value.map(type => ({
        type_key: type.key,
        label: type.label,
        severity: type.severity,
        trigger_description: type.trigger_description,
        resolution_hint: type.resolution_hint,
        threshold_days: type.threshold_days,
        is_enabled: type.is_enabled,
      })),
    })
    syncForm(res.data)
    toast.success(res.message)
  }
  catch {
    toast.error('No se pudo guardar la configuración.')
  }
  finally {
    saving.value = false
  }
}

onMounted(() => load())
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">
          Configuración de alertas
        </h1>
        <p class="text-sm text-muted-foreground">
          Umbrales, severidad y activación de alertas programadas de expedientes.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <Button variant="outline" @click="router.push('/expedientes/reportes')">
          <Icon name="i-lucide-bar-chart-3" class="mr-2 size-4" />
          Ver reportes
        </Button>
        <Button variant="outline" :disabled="loading" @click="load">
          <Icon name="i-lucide-refresh-cw" class="mr-2 size-4" />
          Actualizar
        </Button>
        <Button
          v-if="canEdit"
          :disabled="saving || loading"
          @click="save"
        >
          <Icon
            v-if="saving"
            name="i-lucide-loader-2"
            class="mr-2 size-4 animate-spin"
          />
          {{ saving ? 'Guardando…' : 'Guardar cambios' }}
        </Button>
      </div>
    </div>

    <div v-if="loading" class="py-10 text-center text-muted-foreground">
      Cargando configuración…
    </div>

    <template v-else-if="catalog">
      <div class="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader class="pb-2">
            <CardDescription>Estado del motor</CardDescription>
            <CardTitle class="text-lg">
              {{ formGlobal.enabled ? 'Habilitado' : 'Deshabilitado' }}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader class="pb-2">
            <CardDescription>Barrido programado</CardDescription>
            <CardTitle class="text-lg">
              {{ catalog.global.schedule_label }}
            </CardTitle>
          </CardHeader>
          <CardContent class="pt-0 font-mono text-xs text-muted-foreground">
            {{ catalog.global.command }}
          </CardContent>
        </Card>
        <Card>
          <CardHeader class="pb-2">
            <CardDescription>Tipos configurados</CardDescription>
            <CardTitle class="text-lg">
              {{ formTypes.length }}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader class="pb-2">
            <CardDescription>Tipos activos</CardDescription>
            <CardTitle class="text-lg">
              {{ formTypes.filter(type => type.is_enabled).length }}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Parámetros globales</CardTitle>
          <CardDescription>
            Umbrales compartidos por varios tipos de alerta. Los cambios se guardan en base de datos.
          </CardDescription>
        </CardHeader>
        <CardContent class="grid gap-4 md:grid-cols-2">
          <div class="flex items-center justify-between gap-4 rounded-lg border p-4 md:col-span-2">
            <div>
              <p class="font-medium">
                Alertas habilitadas
              </p>
              <p class="text-sm text-muted-foreground">
                Desactiva todo el motor de evaluación programada.
              </p>
            </div>
            <Switch
              v-model="formGlobal.enabled"
              :disabled="!canEdit"
            />
          </div>

          <div class="space-y-2">
            <Label for="retention-upcoming-days">Anticipación retención (días)</Label>
            <Input
              id="retention-upcoming-days"
              v-model.number="formGlobal.retention_upcoming_days"
              type="number"
              min="1"
              :disabled="!canEdit"
            />
          </div>

          <div class="space-y-2">
            <Label for="stale-draft-days">Borrador estancado (días)</Label>
            <Input
              id="stale-draft-days"
              v-model.number="formGlobal.stale_draft_days"
              type="number"
              min="1"
              :disabled="!canEdit"
            />
          </div>

          <div class="space-y-2">
            <Label for="consolidation-reminder-days">Recordatorio consolidación (días)</Label>
            <Input
              id="consolidation-reminder-days"
              v-model.number="formGlobal.consolidation_reminder_days"
              type="number"
              min="1"
              :disabled="!canEdit"
            />
          </div>

          <div class="flex items-center justify-between gap-4 rounded-lg border p-4 md:col-span-2">
            <div>
              <p class="font-medium">
                Notificaciones por correo
              </p>
              <p class="text-sm text-muted-foreground">
                Envía correo cuando se genera o actualiza una alerta de expediente.
              </p>
            </div>
            <Switch
              v-model="formGlobal.email_enabled"
              :disabled="!canEdit"
            />
          </div>

          <div class="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div>
              <p class="font-medium">
                Notificar al creador
              </p>
              <p class="text-sm text-muted-foreground">
                Incluye al usuario que creó el expediente.
              </p>
            </div>
            <Switch
              v-model="formGlobal.notify_creator"
              :disabled="!canEdit || !formGlobal.email_enabled"
            />
          </div>

          <div class="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div>
              <p class="font-medium">
                Notificar al jefe de área
              </p>
              <p class="text-sm text-muted-foreground">
                Incluye al jefe del área productora.
              </p>
            </div>
            <Switch
              v-model="formGlobal.notify_unit_manager"
              :disabled="!canEdit || !formGlobal.email_enabled"
            />
          </div>
        </CardContent>
      </Card>

      <div
        v-for="group in typesByCategory"
        :key="group.key"
        class="space-y-3"
      >
        <h2 class="text-lg font-semibold">
          {{ group.label }}
        </h2>

        <div class="space-y-4">
          <Card
            v-for="alertType in group.types"
            :key="alertType.key"
          >
            <CardHeader class="pb-3">
              <div class="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle class="text-base">
                    {{ alertType.label }}
                  </CardTitle>
                  <CardDescription class="font-mono text-xs">
                    {{ alertType.key }}
                  </CardDescription>
                </div>
                <div class="flex flex-wrap items-center gap-2">
                  <Badge :variant="severityVariant(alertType.severity)">
                    {{ severityLabel(alertType.severity) }}
                  </Badge>
                  <div class="flex items-center gap-2 text-sm">
                    <Label :for="`enabled-${alertType.key}`">Activa</Label>
                    <Switch
                      :id="`enabled-${alertType.key}`"
                      v-model="alertType.is_enabled"
                      :disabled="!canEdit"
                    />
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent class="grid gap-4 md:grid-cols-2">
              <div class="space-y-2 md:col-span-2">
                <Label :for="`label-${alertType.key}`">Etiqueta visible</Label>
                <Input
                  :id="`label-${alertType.key}`"
                  v-model="alertType.label"
                  :disabled="!canEdit"
                />
              </div>

              <div class="space-y-2">
                <Label :for="`severity-${alertType.key}`">Severidad</Label>
                <Select
                  v-model="alertType.severity"
                  :disabled="!canEdit"
                >
                  <SelectTrigger :id="`severity-${alertType.key}`">
                    <SelectValue placeholder="Severidad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="option in severityOptions"
                      :key="option.value"
                      :value="option.value"
                    >
                      {{ option.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div class="space-y-2">
                <Label :for="`threshold-${alertType.key}`">
                  Umbral propio (días)
                </Label>
                <Input
                  :id="`threshold-${alertType.key}`"
                  :model-value="alertType.threshold_days ?? ''"
                  type="number"
                  min="1"
                  :placeholder="thresholdPlaceholder(alertType)"
                  :disabled="!canEdit || !alertType.config_parameter"
                  @update:model-value="alertType.threshold_days = $event === '' || $event === null ? null : Number($event)"
                />
                <p class="text-xs text-muted-foreground">
                  <template v-if="alertType.config_parameter">
                    Parámetro global: {{ configParameterLabel(alertType.config_parameter) }}.
                    Deje vacío para usar el valor global.
                  </template>
                  <template v-else>
                    Este tipo no usa umbral en días.
                  </template>
                </p>
              </div>

              <div class="space-y-2">
                <Label>Evaluación</Label>
                <p class="text-sm text-muted-foreground">
                  {{ alertType.evaluation_mode_label }}
                </p>
              </div>

              <div class="space-y-2 md:col-span-2">
                <Label :for="`trigger-${alertType.key}`">Disparador</Label>
                <Textarea
                  :id="`trigger-${alertType.key}`"
                  v-model="alertType.trigger_description"
                  rows="2"
                  :disabled="!canEdit"
                />
              </div>

              <div class="space-y-2 md:col-span-2">
                <Label :for="`resolution-${alertType.key}`">Resolución</Label>
                <Textarea
                  :id="`resolution-${alertType.key}`"
                  v-model="alertType.resolution_hint"
                  rows="2"
                  :disabled="!canEdit"
                />
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <p v-if="!canEdit" class="text-sm text-muted-foreground">
        Solo lectura. Necesita el permiso de configuración de alertas para editar.
      </p>
    </template>
  </div>
</template>
