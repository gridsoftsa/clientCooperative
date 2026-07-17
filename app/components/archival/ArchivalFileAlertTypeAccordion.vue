<script setup lang="ts">
import { ARCHIVAL_FILE_ALERT_SEVERITY_LABELS } from '~/constants/archival-file-alerts'
import type { ArchivalFileAlertCatalogParameter, ArchivalFileAlertCatalogType } from '~/types/archival-file'

defineProps<{
  types: ArchivalFileAlertCatalogType[]
  canEdit: boolean
  parameters: ArchivalFileAlertCatalogParameter[]
}>()

const openItems = ref<string[]>([])

const severityOptions = [
  { value: 'info', label: ARCHIVAL_FILE_ALERT_SEVERITY_LABELS.info },
  { value: 'warning', label: ARCHIVAL_FILE_ALERT_SEVERITY_LABELS.warning },
  { value: 'danger', label: ARCHIVAL_FILE_ALERT_SEVERITY_LABELS.danger },
]

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

function configParameterLabel(key: string | null, parameters: ArchivalFileAlertCatalogParameter[]): string {
  if (!key) {
    return '—'
  }

  const parameter = parameters.find(item => item.key === key)

  return parameter?.label ?? key
}

function thresholdPlaceholder(type: ArchivalFileAlertCatalogType): string {
  if (type.effective_threshold_days !== null) {
    return String(type.effective_threshold_days)
  }

  return 'Global'
}
</script>

<template>
  <Accordion
    v-model="openItems"
    type="multiple"
    collapsible
    class="space-y-2"
  >
    <AccordionItem
      v-for="alertType in types"
      :key="alertType.key"
      :value="alertType.key"
      class="overflow-hidden rounded-lg border px-4 data-[state=open]:border-primary/30"
    >
      <div class="flex w-full min-w-0 items-center gap-3">
        <div class="flex shrink-0 items-center gap-2" @click.stop>
          <Label :for="`enabled-${alertType.key}`" class="sr-only">Activa</Label>
          <Switch
            :id="`enabled-${alertType.key}`"
            v-model="alertType.is_enabled"
            :disabled="!canEdit"
          />
        </div>
        <AccordionTrigger class="min-w-0 flex-1 py-3 pl-0 pr-0 hover:no-underline">
          <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2 text-left">
            <span class="font-medium">{{ alertType.label }}</span>
            <Badge :variant="severityVariant(alertType.severity)" class="shrink-0">
              {{ severityLabel(alertType.severity) }}
            </Badge>
            <span
              class="text-xs"
              :class="alertType.is_enabled ? 'text-muted-foreground' : 'text-amber-600 dark:text-amber-400'"
            >
              {{ alertType.is_enabled ? 'Activa' : 'Inactiva' }}
            </span>
          </div>
        </AccordionTrigger>
      </div>

      <AccordionContent>
        <div class="grid gap-4 border-t pt-4 pb-2 md:grid-cols-2">
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
            <Label :for="`threshold-${alertType.key}`">Umbral propio (días)</Label>
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
                Parámetro global: {{ configParameterLabel(alertType.config_parameter, parameters) }}.
                Deje vacío para usar el valor global.
              </template>
              <template v-else>
                Este tipo no usa umbral en días.
              </template>
            </p>
          </div>

          <div class="space-y-2 md:col-span-2">
            <Label>Evaluación</Label>
            <p class="text-sm text-muted-foreground">
              {{ alertType.evaluation_mode_label }}
            </p>
          </div>

          <div class="space-y-2 md:col-span-2">
            <Label :for="`trigger-${alertType.key}`">Cuándo se dispara</Label>
            <Textarea
              :id="`trigger-${alertType.key}`"
              v-model="alertType.trigger_description"
              rows="2"
              :disabled="!canEdit"
            />
          </div>

          <div class="space-y-2 md:col-span-2">
            <Label :for="`resolution-${alertType.key}`">Qué debe hacer el usuario</Label>
            <Textarea
              :id="`resolution-${alertType.key}`"
              v-model="alertType.resolution_hint"
              rows="2"
              :disabled="!canEdit"
            />
          </div>
        </div>
      </AccordionContent>
    </AccordionItem>
  </Accordion>
</template>
