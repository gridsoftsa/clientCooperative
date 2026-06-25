<script setup lang="ts">
import type { OrgDelegationDetail } from '~/types/org-structure'

const props = defineProps<{
  delegationId: number
  delegation?: OrgDelegationDetail | null
  autoOpen?: boolean
}>()

const orgApi = useOrgStructureApi()
const openingReceipt = ref(false)
const errorMessage = ref('')
const didAutoOpen = ref(false)

function staffName(staff: OrgDelegationDetail['assignor_staff']): string {
  if (!staff) {
    return '—'
  }

  const parts = [
    staff.first_name,
    staff.second_name,
    staff.first_last_name,
    staff.second_last_name,
  ].filter(Boolean)

  return parts.length > 0 ? parts.join(' ') : '—'
}

function staffDocument(staff: OrgDelegationDetail['assignor_staff']): string {
  if (!staff?.document_number?.trim()) {
    return '—'
  }

  return `${staff.document_type?.trim() || 'CC'} ${staff.document_number.trim()}`
}

function positionLabel(position: { name: string; code?: string | null } | null | undefined): string {
  if (!position) {
    return '—'
  }

  return position.code ? `${position.name} (${position.code})` : position.name
}

function formatDate(value: string): string {
  const slice = String(value).slice(0, 10)
  const [year, month, day] = slice.split('-')
  if (!year || !month || !day) {
    return slice
  }

  return `${day}/${month}/${year}`
}

async function viewReceipt() {
  openingReceipt.value = true
  errorMessage.value = ''
  try {
    await orgApi.viewDelegationReceiptInNewTab(props.delegationId)
  } catch (err) {
    errorMessage.value = err instanceof Error ? err.message : 'No se pudo abrir el comprobante'
  } finally {
    openingReceipt.value = false
  }
}

watch(
  () => [props.autoOpen, props.delegationId, props.delegation] as const,
  async ([autoOpen, delegationId, delegation]) => {
    if (!autoOpen || !delegationId || !delegation || didAutoOpen.value) {
      return
    }

    didAutoOpen.value = true
    await nextTick()
    await viewReceipt()
  },
  { immediate: true },
)
</script>

<template>
  <Card class="border-primary/20 bg-primary/5">
    <CardHeader class="pb-3">
      <div class="flex flex-wrap items-start justify-between gap-3">
        <div>
          <CardTitle class="text-lg">
            Comprobante de delegación
          </CardTitle>
          <CardDescription>
            Documento PDF de respaldo con titular, suplente, vigencia y código de verificación.
          </CardDescription>
        </div>
        <Button
          type="button"
          size="sm"
          :disabled="openingReceipt"
          @click="viewReceipt"
        >
          <Icon name="i-lucide-file-text" class="mr-1 size-4" />
          {{ openingReceipt ? 'Abriendo…' : 'Ver comprobante PDF' }}
        </Button>
      </div>
    </CardHeader>
    <CardContent v-if="delegation" class="space-y-4 text-sm">
      <p v-if="delegation.receipt_number" class="font-mono text-base font-semibold text-primary">
        {{ delegation.receipt_number }}
      </p>
      <div class="grid gap-3 sm:grid-cols-2">
        <div class="rounded-md border bg-background p-3">
          <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Titular
          </p>
          <p class="mt-1 font-medium">
            {{ staffName(delegation.assignor_staff) }}
          </p>
          <p class="text-muted-foreground">
            {{ staffDocument(delegation.assignor_staff) }}
          </p>
          <p class="text-muted-foreground">
            {{ positionLabel(delegation.assignor_org_position) }}
          </p>
        </div>
        <div class="rounded-md border bg-background p-3">
          <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Suplente
          </p>
          <p class="mt-1 font-medium">
            {{ staffName(delegation.delegate_staff) }}
          </p>
          <p class="text-muted-foreground">
            {{ staffDocument(delegation.delegate_staff) }}
          </p>
          <p class="text-muted-foreground">
            {{ positionLabel(delegation.delegate_org_position) }}
          </p>
        </div>
      </div>
      <div class="grid gap-2 sm:grid-cols-3">
        <div>
          <p class="text-xs text-muted-foreground">
            Área
          </p>
          <p class="font-medium">
            {{ delegation.org_unit ? `${delegation.org_unit.code} — ${delegation.org_unit.name}` : '—' }}
          </p>
        </div>
        <div>
          <p class="text-xs text-muted-foreground">
            Vigencia
          </p>
          <p class="font-medium">
            {{ formatDate(delegation.starts_on) }} — {{ formatDate(delegation.ends_on) }}
          </p>
        </div>
        <div>
          <p class="text-xs text-muted-foreground">
            Estado
          </p>
          <p class="font-medium">
            {{ delegation.is_active ? 'Activa' : 'Inactiva' }}
          </p>
        </div>
      </div>
      <p v-if="delegation.reason?.trim()" class="text-muted-foreground">
        <span class="font-medium text-foreground">Motivo:</span> {{ delegation.reason }}
      </p>
      <p v-if="errorMessage" class="text-destructive text-sm">
        {{ errorMessage }}
      </p>
    </CardContent>
    <CardContent v-else>
      <p v-if="errorMessage" class="text-destructive text-sm">
        {{ errorMessage }}
      </p>
    </CardContent>
  </Card>
</template>
