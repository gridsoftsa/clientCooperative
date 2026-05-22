<script setup lang="ts">
import { toast } from 'vue-sonner'
import { TRD_FINAL_DISPOSITION_LABELS } from '~/constants/archival-trd'
import { ARCHIVAL_PHASE_LABELS } from '~/constants/archival-lifecycle'
import type { ArchivalLifecycleDocumentRow } from '~/composables/useArchivalLifecycleApi'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: ['trd_ciclo_vida_ver', 'trd_tablas_ver', 'trd_catalogo_ver'],
})

const router = useRouter()
const { $api } = useNuxtApp()
const { hasPermission } = usePermissions()
const api = useArchivalLifecycleApi()

const loading = ref(false)
const rows = ref<ArchivalLifecycleDocumentRow[]>([])
const orgUnitId = ref<number | undefined>(undefined)
const phase = ref<string | undefined>(undefined)
const eligibleOnly = ref(true)
const units = ref<Array<{ id: number, name: string, code: string }>>([])

async function loadUnits() {
  try {
    const res = await $api<{ data: Array<{ id: number, name: string, code: string, is_document_producer?: boolean }> }>(
      '/organizational-structure/org-units',
      { query: { per_page: 200, is_active: true } },
    )
    units.value = (res.data ?? []).filter(u => u.is_document_producer)
  } catch {
    units.value = []
  }
}

async function load() {
  loading.value = true
  try {
    rows.value = await api.fetchLifecycleDocuments({
      org_unit_id: orgUnitId.value,
      phase: phase.value,
      eligible_transfer: eligibleOnly.value ? 1 : undefined,
    })
  } catch {
    toast.error('No se pudo cargar el ciclo de vida documental')
    rows.value = []
  } finally {
    loading.value = false
  }
}

async function runAutomatic() {
  if (!hasPermission('trd_transferencias_ejecutar')) {
    toast.error('Sin permiso para ejecutar transferencias')
    return
  }
  try {
    const res = await api.runAutomaticTransfers(orgUnitId.value ?? null)
    toast.success(res.message ?? `Transferidos: ${res.data.transferred}`)
    await load()
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Error en transferencias automáticas')
  }
}

async function transferRow(row: ArchivalLifecycleDocumentRow) {
  if (!row.eligible_next_phase) return
  if (!hasPermission('trd_transferencias_ejecutar')) {
    toast.error('Sin permiso para transferir')
    return
  }
  try {
    await api.transferDocument(row.id, row.eligible_next_phase)
    toast.success(`Transferido a ${ARCHIVAL_PHASE_LABELS[row.eligible_next_phase] ?? row.eligible_next_phase}`)
    await load()
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'No se pudo transferir')
  }
}

function phaseLabel(p: string) {
  return ARCHIVAL_PHASE_LABELS[p] ?? p
}

function dispositionLabel(d: string | null | undefined) {
  if (!d) return '—'
  return TRD_FINAL_DISPOSITION_LABELS[d] ?? d
}

onMounted(async () => {
  await loadUnits()
  await load()
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <Button variant="ghost" size="sm" class="h-8 w-fit -ml-2 px-2" @click="router.push('/settings/archival')">
            <Icon name="i-lucide-arrow-left" class="mr-1 h-4 w-4" />
            TRD y archivo
          </Button>
          <h2 class="text-2xl font-bold tracking-tight">
            Ciclo de vida documental
          </h2>
          <p class="text-muted-foreground max-w-3xl text-sm leading-relaxed">
            Documentos de radicación clasificados con TRD: gestión → central → histórico y disposición final según tiempos del snapshot de retención.
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <Button variant="outline" @click="router.push('/settings/archival/disposition')">
            Actas de disposición
          </Button>
          <PermissionGate permission="trd_transferencias_ejecutar">
            <Button variant="secondary" @click="runAutomatic">
              <Icon name="i-lucide-play" class="mr-2 h-4 w-4" />
              Transferencias automáticas
            </Button>
          </PermissionGate>
        </div>
      </div>

      <Card>
        <CardContent class="pt-6 flex flex-wrap gap-4 items-end">
          <div class="space-y-2 min-w-[220px]">
            <Label>Área productora</Label>
            <Select v-model="orgUnitId">
              <SelectTrigger>
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="u in units" :key="u.id" :value="u.id">
                  {{ u.name }} ({{ u.code }})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label>Fase</Label>
            <Select v-model="phase">
              <SelectTrigger class="w-[200px]">
                <SelectValue placeholder="Todas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="(label, key) in ARCHIVAL_PHASE_LABELS" :key="key" :value="key">
                  {{ label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="flex items-center gap-2 pb-2">
            <Checkbox id="eligible" v-model="eligibleOnly" />
            <Label for="eligible" class="cursor-pointer text-sm">
              Solo pendientes de transferencia
            </Label>
          </div>
          <Button :disabled="loading" @click="load">
            Consultar
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardContent class="pt-6 overflow-x-auto">
          <table v-if="rows.length" class="w-full text-sm border-collapse min-w-[960px]">
            <thead>
              <tr class="border-b text-left text-muted-foreground">
                <th class="p-2">
                  Radicado / título
                </th>
                <th class="p-2">
                  Tipo documental
                </th>
                <th class="p-2">
                  Fase
                </th>
                <th class="p-2">
                  Fin gestión
                </th>
                <th class="p-2">
                  Fin central
                </th>
                <th class="p-2">
                  Disposición TRD
                </th>
                <th class="p-2" />
              </tr>
            </thead>
            <tbody>
              <tr v-for="row in rows" :key="row.id" class="border-b border-border/60">
                <td class="p-2">
                  <span class="font-mono text-xs">{{ row.credit_application_code }}</span>
                  <span class="block truncate max-w-[200px]">{{ row.title }}</span>
                </td>
                <td class="p-2 text-xs">
                  {{ row.doc_document_type?.code }} — {{ row.doc_document_type?.name }}
                </td>
                <td class="p-2">
                  {{ phaseLabel(row.archival_phase) }}
                </td>
                <td class="p-2 text-xs">
                  {{ row.archival_management_ends_at ?? '—' }}
                </td>
                <td class="p-2 text-xs">
                  {{ row.archival_central_ends_at ?? '—' }}
                </td>
                <td class="p-2 text-xs">
                  {{ dispositionLabel(row.final_disposition) }}
                </td>
                <td class="p-2 text-right">
                  <PermissionGate v-if="row.eligible_next_phase" permission="trd_transferencias_ejecutar">
                    <Button size="sm" variant="outline" @click="transferRow(row)">
                      → {{ phaseLabel(row.eligible_next_phase) }}
                    </Button>
                  </PermissionGate>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else-if="!loading" class="text-sm text-muted-foreground">
            No hay documentos clasificados con TRD para los filtros indicados.
          </p>
        </CardContent>
      </Card>
    </div>
  </SettingsLayout>
</template>
