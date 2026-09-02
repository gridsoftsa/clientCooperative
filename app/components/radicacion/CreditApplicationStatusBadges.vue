<script setup lang="ts">
import {
  getCreditApplicationStatusBadgeVariant,
  getCreditApplicationStatusLabel,
} from '~/constants/credit-application-status'

const props = withDefaults(defineProps<{
  status: string
  returnedBy?: string | null
  skipNextDirectorReview?: boolean
  resubmitToAnalystAfterReturn?: boolean
  resubmitToCreditDirectorAfterReturn?: boolean
  parkedAfterReturn?: boolean
  correctedAfterReturn?: boolean
  correctedAfterCreditDirectorReturn?: boolean
}>(), {
  returnedBy: null,
  skipNextDirectorReview: undefined,
  resubmitToAnalystAfterReturn: undefined,
  resubmitToCreditDirectorAfterReturn: undefined,
  parkedAfterReturn: false,
  correctedAfterReturn: false,
  correctedAfterCreditDirectorReturn: false,
})

const statusLabel = computed(() => getCreditApplicationStatusLabel(props.status, {
  returnedBy: props.returnedBy,
  skipNextDirectorReview: props.skipNextDirectorReview,
  resubmitToAnalystAfterReturn: props.resubmitToAnalystAfterReturn,
  resubmitToCreditDirectorAfterReturn: props.resubmitToCreditDirectorAfterReturn,
}))
</script>

<template>
  <div class="flex flex-col items-start gap-1">
    <Badge :variant="getCreditApplicationStatusBadgeVariant(status)">
      {{ statusLabel }}
    </Badge>
    <Badge
      v-if="parkedAfterReturn"
      variant="warning"
      class="font-normal"
      title="Esta radicación fue devuelta a esta etapa. Al completar, vuelve a quien la devolvió."
    >
      Devuelta a esta etapa
    </Badge>
    <Badge
      v-else-if="correctedAfterCreditDirectorReturn"
      variant="warning"
      class="font-normal"
      title="El ente aprobador (director de crédito) la devolvió (devolución o modificación) y ya se corrigió."
    >
      Corregida tras devolución
    </Badge>
    <Badge
      v-else-if="correctedAfterReturn"
      variant="outline"
      class="border-teal-500/50 bg-teal-500/10 font-normal text-teal-800 dark:border-teal-400/40 dark:bg-teal-950/40 dark:text-teal-200"
      title="Revisión de documentación o el analista la devolvió y ya se corrigió."
    >
      Corregida tras devolución
    </Badge>
  </div>
</template>
