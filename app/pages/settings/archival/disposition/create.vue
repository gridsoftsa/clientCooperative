<script setup lang="ts">
import { toast } from 'vue-sonner'
import { ARCHIVAL_DISPOSITION_TYPE_OPTIONS } from '~/constants/archival-lifecycle'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'trd_disposicion_editar',
})

const router = useRouter()
const { $api } = useNuxtApp()
const api = useArchivalLifecycleApi()

const saving = ref(false)
const orgUnitId = ref<number | undefined>(undefined)
const units = ref<Array<{ id: number, name: string, code: string }>>([])
const eligibleDocs = ref<Array<{ id: number, title?: string, credit_application_code?: string | null }>>([])
const selectedDocIds = ref<number[]>([])

const form = ref({
  act_code: `ACT-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}`,
  disposition_type: 'elimination',
  act_date: new Date().toISOString().slice(0, 10),
  description: '',
})

async function loadUnits() {
  const res = await $api<{ data: Array<{ id: number, name: string, code: string, is_document_producer?: boolean }> }>(
    '/organizational-structure/org-units',
    { query: { per_page: 200, is_active: true } },
  )
  units.value = (res.data ?? []).filter(u => u.is_document_producer)
}

async function loadEligible() {
  eligibleDocs.value = await api.fetchLifecycleDocuments({
    org_unit_id: orgUnitId.value,
    eligible_disposition: 1,
  })
}

async function submit() {
  saving.value = true
  try {
    const res = await api.createDispositionAct({
      ...form.value,
      org_unit_id: orgUnitId.value ?? null,
      document_ids: selectedDocIds.value,
    })
    toast.success(res.message ?? 'Acta creada')
    await router.push(`/settings/archival/disposition/${res.data.id}`)
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Error al crear acta')
  } finally {
    saving.value = false
  }
}

watch(orgUnitId, () => {
  loadEligible()
})

onMounted(async () => {
  await loadUnits()
  await loadEligible()
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full max-w-2xl flex flex-col gap-4">
      <Button variant="ghost" size="sm" class="w-fit -ml-2" @click="router.push('/settings/archival/disposition')">
        <Icon name="i-lucide-arrow-left" class="mr-1 h-4 w-4" />
        Actas
      </Button>
      <h2 class="text-2xl font-bold tracking-tight">
        Nueva acta de disposición
      </h2>

      <Card>
        <CardContent class="pt-6 space-y-4">
          <div class="space-y-2">
            <Label>Código acta *</Label>
            <Input v-model="form.act_code" />
          </div>
          <div class="space-y-2">
            <Label>Área productora</Label>
            <Select v-model="orgUnitId">
              <SelectTrigger>
                <SelectValue placeholder="Opcional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="u in units" :key="u.id" :value="u.id">
                  {{ u.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="grid gap-4 sm:grid-cols-2">
            <div class="space-y-2">
              <Label>Tipo disposición *</Label>
              <Select v-model="form.disposition_type">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem
                    v-for="opt in ARCHIVAL_DISPOSITION_TYPE_OPTIONS"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
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
            <textarea
              v-model="form.description"
              class="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              rows="3"
            />
          </div>

          <div class="space-y-2 border-t pt-4">
            <Label>Documentos elegibles para disposición</Label>
            <p v-if="!eligibleDocs.length" class="text-xs text-muted-foreground">
              No hay documentos en central/histórico con plazo cumplido para el área seleccionada.
            </p>
            <div v-else class="max-h-48 overflow-y-auto space-y-2 rounded border p-3">
              <label
                v-for="doc in eligibleDocs"
                :key="doc.id"
                class="flex items-start gap-2 text-sm cursor-pointer"
              >
                <Checkbox
                  :model-value="selectedDocIds.includes(doc.id)"
                  @update:model-value="(v: boolean) => {
                    if (v) selectedDocIds.push(doc.id)
                    else selectedDocIds = selectedDocIds.filter(id => id !== doc.id)
                  }"
                />
                <span>
                  #{{ doc.id }} {{ doc.credit_application_code }} — {{ doc.title }}
                </span>
              </label>
            </div>
          </div>

          <Button :disabled="saving" @click="submit">
            Crear acta (borrador)
          </Button>
        </CardContent>
      </Card>
    </div>
  </SettingsLayout>
</template>
