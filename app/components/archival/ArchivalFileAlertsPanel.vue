<script setup lang="ts">
import {
  ARCHIVAL_FILE_ALERT_SEVERITY_LABELS,
  ARCHIVAL_FILE_ALERT_TYPE_LABELS,
} from '~/constants/archival-file-alerts'
import type { ArchivalFileAlert, ArchivalFileAlertType } from '~/types/archival-file'

const props = defineProps<{
  alerts: ArchivalFileAlert[]
  loading?: boolean
  compact?: boolean
  canTransfer?: boolean
}>()

const emit = defineEmits<{
  transfer: [alert: ArchivalFileAlert]
}>()

const transferAlertTypes = new Set<ArchivalFileAlertType | string>([
  'retention_management_overdue',
  'retention_central_overdue',
  'retention_historical_overdue',
  'retention_management_upcoming',
  'retention_central_upcoming',
  'retention_historical_upcoming',
])

function alertTypeLabel(type: string): string {
  return ARCHIVAL_FILE_ALERT_TYPE_LABELS[type as ArchivalFileAlertType] ?? type
}

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

function isTransferAlert(alert: ArchivalFileAlert): boolean {
  return transferAlertTypes.has(alert.alert_type)
}
</script>

<template>
  <div class="space-y-3">
    <div v-if="loading" class="text-sm text-muted-foreground">
      Cargando alertas…
    </div>

    <p v-else-if="alerts.length === 0" class="text-sm text-muted-foreground">
      Sin alertas abiertas.
    </p>

    <div
      v-for="alert in alerts"
      v-else
      :key="alert.id"
      class="rounded-lg border bg-muted/20 px-4 py-3 text-sm"
      :class="compact ? 'px-3 py-2' : ''"
    >
      <div class="flex flex-wrap items-center gap-2">
        <Badge :variant="severityVariant(alert.severity)">
          {{ severityLabel(alert.severity) }}
        </Badge>
        <Badge variant="outline">
          {{ alertTypeLabel(alert.alert_type) }}
        </Badge>
      </div>
      <p class="mt-2">
        {{ alert.message }}
      </p>
      <p v-if="alert.updated_at" class="mt-1 text-xs text-muted-foreground">
        Actualizada: {{ new Date(alert.updated_at).toLocaleString('es-CO') }}
      </p>
      <div v-if="canTransfer && isTransferAlert(alert)" class="mt-3">
        <Button
          variant="outline"
          size="sm"
          type="button"
          @click="emit('transfer', alert)"
        >
          Transferir expediente
        </Button>
      </div>
    </div>
  </div>
</template>
