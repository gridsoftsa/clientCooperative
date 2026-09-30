<script setup lang="ts">
import { toast } from 'vue-sonner'
import { ARCHIVAL_TRANSFER_KIND_OPTIONS } from '~/constants/archival-lifecycle'
import { messageFromFetchError } from '~/utils/http-error-message'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'trd_transferencias_ejecutar',
})

const router = useRouter()
const api = useArchivalLifecycleApi()

const saving = ref(false)
const orgUnitId = ref<string | undefined>(undefined)
const units = ref<Array<{ id: number, name: string, code: string }>>([])
const eligibleFiles = ref<Awaited<ReturnType<typeof api.fetchTransferEligibleFiles>>>([])
const selectedFileIds = ref<number[]>([])
const trdLabel = ref<string | null>(null)
const missingTrd = ref(false)

const form = ref({
  act_code: `ATP-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
  transfer_kind: 'primary',
  act_date: new Date().toISOString().slice(0, 10),
  description: '',
})

async function loadUnits() {
  units.value = await api.fetchTransferAllowedOrgUnits()
  if (units.value.length === 1) {
    orgUnitId.value = String(units.value[0].id)
  }
}

async function loadTrdSetting() {
  trdLabel.value = null
  missingTrd.value = false
  if (!orgUnitId.value) {
    return
  }

  const rows = await api.fetchTransferActTrdSettings(Number(orgUnitId.value))
  const row = rows[0]
  if (!row) {
    missingTrd.value = true
    return
  }

  trdLabel.value = [
    row.doc_series ? `${row.doc_series.code} ${row.doc_series.name}` : null,
    row.doc_subseries ? `${row.doc_subseries.code} ${row.doc_subseries.name}` : null,
    row.doc_document_type ? `${row.doc_document_type.code} ${row.doc_document_type.name}` : null,
  ].filter(Boolean).join(' / ')
}

async function loadEligible() {
  selectedFileIds.value = []
  eligibleFiles.value = []
  if (!orgUnitId.value) {
    return
  }

  eligibleFiles.value = await api.fetchTransferEligibleFiles(
    form.value.transfer_kind,
    Number(orgUnitId.value),
  )
}

function onFileCheckboxChange(id: number, event: Event) {
  const input = event.target as HTMLInputElement
  const currentId = Number(id)

  if (input.checked) {
    if (!selectedFileIds.value.includes(currentId)) {
      selectedFileIds.value = [...selectedFileIds.value, currentId]
    }
    return
  }

  selectedFileIds.value = selectedFileIds.value.filter(fileId => fileId !== currentId)
}

async function submit() {
  if (!orgUnitId.value) {
    toast.error('Seleccione el área productora')
    return
  }

  saving.value = true
  try {
    const res = await api.createTransferAct({
      ...form.value,
      org_unit_id: Number(orgUnitId.value),
      archival_file_ids: selectedFileIds.value,
    })
    toast.success(res.message ?? 'Acta creada')
    await router.push(`/settings/archival/transfers/${res.data.id}`)
  }
  catch (error: unknown) {
    toast.error(messageFromFetchError(error, 'No se pudo crear el acta'))
  }
  finally {
    saving.value = false
  }
}

watch([orgUnitId, () => form.value.transfer_kind], async () => {
  await loadTrdSetting()
  await loadEligible()
})

onMounted(async () => {
  await loadUnits()
  await loadTrdSetting()
  await loadEligible()
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="flex w-full max-w-2xl flex-col gap-4">
      <Button variant="ghost" size="sm" class="-ml-2 w-fit" @click="router.push('/settings/archival/transfers')">
        <Icon name="i-lucide-arrow-left" class="mr-1 h-4 w-4" />
        Actas
      </Button>
      <h2 class="text-2xl font-bold tracking-tight">
        Nueva acta de transferencia
      </h2>
      <p class="text-sm text-muted-foreground">
        Solo puede elaborar actas del área que tiene designada. El PDF se radica en la serie, subserie y tipo documental configurados para esa área.
      </p>

      <Card>
        <CardContent class="space-y-4 pt-6">
          <div class="space-y-2">
            <Label>Código acta *</Label>
            <Input v-model="form.act_code" />
          </div>
          <div class="space-y-2">
            <Label>Área productora *</Label>
            <Select v-model="orgUnitId">
              <SelectTrigger>
                <SelectValue placeholder="Seleccione su área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="unit in units"
                  :key="unit.id"
                  :value="String(unit.id)"
                >
                  {{ unit.name }}
                </SelectItem>
              </SelectContent>
            </Select>
            <p v-if="!units.length" class="text-xs text-destructive">
              No tiene un área productora asignada. Solicite su designación en estructura organizacional.
            </p>
            <p v-else-if="missingTrd" class="text-xs text-destructive">
              Falta configurar dónde se radica el PDF del acta (serie / subserie / tipo).
              <NuxtLink class="underline" to="/settings/archival/transfers/trd-filing">
                Ir a configuración
              </NuxtLink>
            </p>
            <p v-else-if="trdLabel" class="text-xs text-muted-foreground">
              Radicación del PDF: {{ trdLabel }}
            </p>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label>Tipo *</Label>
              <Select v-model="form.transfer_kind">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="option in ARCHIVAL_TRANSFER_KIND_OPTIONS"
                    :key="option.value"
                    :value="option.value"
                  >
                    {{ option.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-2">
              <Label>Fecha acta *</Label>
              <Input v-model="form.act_date" type="date" />
            </div>
          </div>
          <div class="space-y-2">
            <Label>Descripción</Label>
            <Textarea v-model="form.description" rows="3" />
          </div>

          <div class="space-y-2 border-t pt-4">
            <Label>Expedientes con plazo cumplido</Label>
            <p v-if="!orgUnitId" class="text-xs text-muted-foreground">
              Seleccione el área para listar expedientes elegibles.
            </p>
            <p v-else-if="!eligibleFiles.length" class="text-xs text-muted-foreground">
              No hay expedientes cerrados listos para esta transferencia (plazo TRD vencido).
            </p>
            <div v-else class="flex max-h-48 flex-col gap-2 overflow-y-auto rounded border p-3">
              <label
                v-for="file in eligibleFiles"
                :key="file.id"
                class="flex cursor-pointer items-start gap-2 text-sm"
              >
                <input
                  type="checkbox"
                  class="mt-1 size-4 shrink-0 cursor-pointer accent-primary"
                  :checked="selectedFileIds.includes(Number(file.id))"
                  @change="onFileCheckboxChange(file.id, $event)"
                >
                <span>
                  <span class="font-mono text-xs">{{ file.file_number }}</span>
                  — {{ file.title }}
                </span>
              </label>
            </div>
          </div>

          <Button :disabled="saving || missingTrd || !orgUnitId || selectedFileIds.length === 0" @click="submit">
            Crear acta (borrador)
          </Button>
        </CardContent>
      </Card>
    </div>
  </SettingsLayout>
</template>
