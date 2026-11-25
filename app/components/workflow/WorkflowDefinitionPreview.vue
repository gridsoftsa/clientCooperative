<script setup lang="ts">
import {
  labelForWorkflowAssigneeType,
  labelForWorkflowVentanillaRole,
} from '~/constants/workflow'
import type { WorkflowStage } from '~/types/workflow'

export interface WorkflowPreviewStep {
  name: string
  summary: string
  actor: string
  sla?: string | null
  isTerminal?: boolean
  canAdvance?: boolean
  canReturn?: boolean
  canReassign?: boolean
  requiresAuth?: boolean
  stageKey?: string | null
  stage?: WorkflowStage | null
}

const EXAMPLE_STEPS: WorkflowPreviewStep[] = [
  {
    name: 'Recibir y asignar',
    summary: 'Ventanilla registra el radicado y lo envía al área responsable.',
    actor: 'Oficina de ventanilla',
    sla: '1 día hábil',
    canAdvance: true,
    canReturn: false,
  },
  {
    name: 'Gestionar',
    summary: 'El responsable atiende el caso, puede pedir datos o devolver la etapa anterior.',
    actor: 'Jefe o usuario del área',
    sla: '5 días hábiles',
    canAdvance: true,
    canReturn: true,
  },
  {
    name: 'Responder y cerrar',
    summary: 'Se emite la respuesta y el radicado queda cerrado. Esta es la última etapa.',
    actor: 'Responsable de cierre',
    sla: '2 días hábiles',
    isTerminal: true,
    canAdvance: false,
    canReturn: true,
  },
]

const props = withDefaults(defineProps<{
  stages?: WorkflowStage[]
  example?: boolean
  compact?: boolean
  canManage?: boolean
}>(), {
  stages: () => [],
  example: false,
  compact: false,
  canManage: false,
})

const emit = defineEmits<{
  edit: [stage: WorkflowStage]
  remove: [stage: WorkflowStage]
}>()

const isExample = computed(() => props.example || props.stages.length === 0)

const steps = computed<WorkflowPreviewStep[]>(() => {
  if (isExample.value) {
    return EXAMPLE_STEPS
  }

  return [...props.stages]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((stage) => {
      const actor = stage.assignee_user?.name
        ?? stage.assignee_org_unit?.name
        ?? stage.assignee_position?.name
        ?? labelForWorkflowAssigneeType(stage.assignee_type)

      const sla = stage.sla_business_days
        ? `${stage.sla_business_days} día${stage.sla_business_days === 1 ? '' : 's'} hábil${stage.sla_business_days === 1 ? '' : 'es'}`
        : null

      const role = labelForWorkflowVentanillaRole(stage.ventanilla_role)
      const summaryParts = [
        role !== 'Sin integración' ? role.split(' (')[0] : null,
        stage.is_terminal ? 'Etapa de cierre del radicado.' : null,
      ].filter(Boolean)

      return {
        name: stage.name,
        summary: summaryParts.join(' · '),
        actor,
        sla,
        isTerminal: stage.is_terminal,
        canAdvance: stage.allows_advance,
        canReturn: stage.allows_return,
        canReassign: stage.allows_reassign,
        requiresAuth: stage.requires_authorization_decision
          || stage.assignee_type === 'producer_org_unit_manager',
        stageKey: stage.key,
        stage,
      }
    })
})

const showActions = computed(() => props.canManage && !isExample.value)
const canDeleteStage = computed(() => props.stages.length > 1)
</script>

<template>
  <div class="space-y-3">
    <p v-if="compact && isExample" class="text-xs text-muted-foreground">
      Ejemplo de recorrido. Aún no hay etapas en este flujo.
    </p>
    <div v-else-if="!compact" class="space-y-1">
      <p class="text-sm font-medium">
        {{ isExample ? 'Así avanza un radicado (ejemplo)' : 'Etapas del radicado' }}
      </p>
      <p class="text-xs leading-relaxed text-muted-foreground">
        <template v-if="isExample">
          Cada etapa es una columna del tablero. El orden que configure es el paso a paso que verá quien gestione el caso.
        </template>
        <template v-else>
          El orden de las tarjetas es el del tablero. Pulse Editar en la etapa que quiera cambiar.
        </template>
      </p>
    </div>

    <ol
      v-if="compact"
      class="flex min-w-0 flex-wrap items-center gap-1.5"
      :class="steps.length > 8 ? 'max-h-28 overflow-y-auto overscroll-contain pr-1' : ''"
    >
      <li
        v-for="(step, index) in steps"
        :key="`${step.stageKey ?? step.name}-${index}`"
        class="flex items-center gap-1.5"
      >
        <div class="inline-flex max-w-full items-center gap-1.5 rounded-full border bg-background px-2 py-1 text-xs">
          <span class="flex size-5 shrink-0 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
            {{ index + 1 }}
          </span>
          <span class="truncate font-medium">{{ step.name }}</span>
        </div>
      </li>
    </ol>

    <ol
      v-else
      class="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3"
    >
      <li
        v-for="(step, index) in steps"
        :key="`${step.stageKey ?? step.name}-${index}`"
        class="min-w-0"
      >
        <div class="flex h-full min-w-0 flex-col gap-3 rounded-lg border bg-card p-3">
          <div class="flex items-start gap-2">
            <span class="flex size-7 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {{ index + 1 }}
            </span>
            <div class="min-w-0 flex-1 space-y-0.5">
              <p class="font-medium leading-snug">
                {{ step.name }}
              </p>
              <p class="text-xs text-muted-foreground">
                {{ step.actor }}
              </p>
              <code v-if="step.stageKey" class="block truncate text-[10px] text-muted-foreground">
                {{ step.stageKey }}
              </code>
            </div>
          </div>
          <p v-if="step.summary" class="text-xs leading-relaxed text-muted-foreground">
            {{ step.summary }}
          </p>
          <div class="mt-auto flex flex-wrap gap-1">
            <Badge v-if="step.sla" variant="outline" class="text-[10px]">
              SLA {{ step.sla }}
            </Badge>
            <Badge v-if="step.isTerminal" variant="secondary" class="text-[10px]">
              Cierre
            </Badge>
            <Badge v-if="step.canAdvance" variant="outline" class="text-[10px]">
              Avanzar
            </Badge>
            <Badge v-if="step.canReturn" variant="outline" class="text-[10px]">
              Devolver
            </Badge>
            <Badge v-if="step.canReassign" variant="outline" class="text-[10px]">
              Reasignar
            </Badge>
            <Badge v-if="step.requiresAuth" variant="outline" class="text-[10px]">
              Aprobado / Denegado
            </Badge>
          </div>
          <div v-if="showActions && step.stage" class="flex gap-2 border-t pt-3">
            <Button
              variant="outline"
              size="sm"
              class="flex-1"
              @click="emit('edit', step.stage)"
            >
              Editar
            </Button>
            <Button
              variant="outline"
              size="sm"
              class="text-destructive"
              :disabled="!canDeleteStage"
              @click="emit('remove', step.stage)"
            >
              Eliminar
            </Button>
          </div>
        </div>
      </li>
    </ol>
  </div>
</template>
