<script setup lang="ts">
import {
  VENTANILLA_FILING_STATUS_LABELS,
  VENTANILLA_FILING_TYPE_LABELS,
} from '~/constants/ventanilla'
import type { VentanillaFilingVerificationData } from '~/types/ventanilla'

definePageMeta({
  layout: false,
})

const route = useRoute()
const ventanillaApi = useVentanillaApi()

const token = computed(() => String(route.params.token ?? ''))
const loading = ref(true)
const errorMessage = ref('')
const data = ref<VentanillaFilingVerificationData | null>(null)

function formatDate(iso: string | null | undefined): string {
  if (!iso) {
    return '—'
  }

  return new Date(iso).toLocaleString('es-CO')
}

function statusLabel(status: string | null | undefined): string {
  if (!status) {
    return '—'
  }

  return VENTANILLA_FILING_STATUS_LABELS[status as keyof typeof VENTANILLA_FILING_STATUS_LABELS] ?? status
}

function filingTypeLabel(type: string | null | undefined): string {
  if (!type) {
    return '—'
  }

  return VENTANILLA_FILING_TYPE_LABELS[type as keyof typeof VENTANILLA_FILING_TYPE_LABELS] ?? type
}

onMounted(async () => {
  if (!token.value) {
    errorMessage.value = 'Enlace de verificación inválido.'
    loading.value = false
    return
  }

  try {
    data.value = await ventanillaApi.verifyFilingReceipt(token.value)
  } catch {
    errorMessage.value = 'No se encontró un radicado asociado a este comprobante o el enlace ya no es válido.'
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="min-h-screen bg-muted/30 px-4 py-8">
    <div class="mx-auto max-w-2xl space-y-6">
      <div class="rounded-2xl border bg-background p-6 shadow-sm">
        <p class="text-muted-foreground text-sm">
          Ventanilla única
        </p>
        <h1 class="text-2xl font-semibold tracking-tight">
          Verificación de radicado
        </h1>
        <p class="mt-2 text-sm text-muted-foreground">
          Consulta pública de los datos básicos del comprobante de radicación.
        </p>
      </div>

      <div v-if="loading" class="rounded-2xl border bg-background p-6 text-sm text-muted-foreground shadow-sm">
        Verificando comprobante…
      </div>

      <div
        v-else-if="errorMessage"
        class="rounded-2xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive shadow-sm"
      >
        {{ errorMessage }}
      </div>

      <div v-else-if="data" class="space-y-4 rounded-2xl border bg-background p-6 shadow-sm">
        <div class="flex flex-wrap items-center gap-2">
          <Badge variant="outline">
            {{ statusLabel(data.status) }}
          </Badge>
          <span class="font-mono text-lg font-semibold">
            {{ data.filing_number }}
          </span>
        </div>

        <dl class="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt class="text-muted-foreground text-xs">
              Tipo de radicado
            </dt>
            <dd class="mt-1 font-medium">
              {{ filingTypeLabel(data.filing_type) }}
            </dd>
          </div>
          <div>
            <dt class="text-muted-foreground text-xs">
              Tipo funcional
            </dt>
            <dd class="mt-1 font-medium">
              {{ data.functional_type_label ?? '—' }}
            </dd>
          </div>
          <div class="sm:col-span-2">
            <dt class="text-muted-foreground text-xs">
              Asunto
            </dt>
            <dd class="mt-1 font-medium">
              {{ data.subject ?? '—' }}
            </dd>
          </div>
          <div>
            <dt class="text-muted-foreground text-xs">
              Fecha de radicación
            </dt>
            <dd class="mt-1 font-medium">
              {{ formatDate(data.filed_at) }}
            </dd>
          </div>
          <div>
            <dt class="text-muted-foreground text-xs">
              Área responsable
            </dt>
            <dd class="mt-1 font-medium">
              <template v-if="data.org_unit_responsible">
                {{ data.org_unit_responsible.code }} — {{ data.org_unit_responsible.name }}
              </template>
              <template v-else>
                —
              </template>
            </dd>
          </div>
          <div class="sm:col-span-2">
            <dt class="text-muted-foreground text-xs">
              Tipo documental (TRD)
            </dt>
            <dd class="mt-1 font-medium">
              <template v-if="data.doc_document_type">
                {{ data.doc_document_type.code }} — {{ data.doc_document_type.name }}
              </template>
              <template v-else>
                —
              </template>
            </dd>
          </div>
        </dl>
      </div>
    </div>
  </div>
</template>
