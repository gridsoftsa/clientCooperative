<script setup lang="ts">
import { toast } from 'vue-sonner'
import {
  ARCHIVAL_DISPOSITION_ACT_STATUS_LABELS,
  ARCHIVAL_TRANSFER_KIND_OPTIONS,
} from '~/constants/archival-lifecycle'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: ['trd_ciclo_vida_ver', 'trd_tablas_ver', 'trd_catalogo_ver'],
})

const router = useRouter()
const api = useArchivalLifecycleApi()

const loading = ref(false)
const acts = ref<Awaited<ReturnType<typeof api.fetchTransferActs>>>([])

async function load() {
  loading.value = true
  try {
    acts.value = await api.fetchTransferActs()
  }
  catch {
    toast.error('No se pudieron cargar las actas de transferencia')
    acts.value = []
  }
  finally {
    loading.value = false
  }
}

function statusLabel(s: string) {
  return ARCHIVAL_DISPOSITION_ACT_STATUS_LABELS[s] ?? s
}

function kindLabel(t: string) {
  return ARCHIVAL_TRANSFER_KIND_OPTIONS.find(opt => opt.value === t)?.label ?? t
}

onMounted(load)
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="flex w-full flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <Button variant="ghost" size="sm" class="h-8 w-fit -ml-2 px-2" @click="router.push('/settings/archival/lifecycle')">
            <Icon name="i-lucide-arrow-left" class="mr-1 h-4 w-4" />
            Ciclo de vida
          </Button>
          <h2 class="text-2xl font-bold tracking-tight">
            Actas de transferencia
          </h2>
          <p class="max-w-2xl text-sm text-muted-foreground">
            Transferencia primaria y secundaria de expedientes: inventario, aprobación y ejecución.
            El PDF es instrumento de control interno; se radica en la TRD del área y no se publica en biblioteca.
            Un usuario solo elabora actas del área que tiene designada (admin y superadmin ven todas).
          </p>
        </div>
        <div class="flex flex-wrap gap-2">
          <PermissionGate :any-permission="['trd_tablas_editar', 'trd_tablas_ver', 'trd_catalogo_ver']">
            <Button variant="outline" @click="router.push('/settings/archival/transfers/trd-filing')">
              Ubicación TRD del acta
            </Button>
          </PermissionGate>
          <PermissionGate permission="trd_transferencias_ejecutar">
            <Button @click="router.push('/settings/archival/transfers/create')">
              <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
              Nueva acta
            </Button>
          </PermissionGate>
        </div>
      </div>

      <Card>
        <CardContent class="overflow-x-auto pt-6">
          <table v-if="acts.length" class="w-full text-sm">
            <thead>
              <tr class="border-b text-left text-muted-foreground">
                <th class="p-2">
                  Código
                </th>
                <th class="p-2">
                  Fecha
                </th>
                <th class="p-2">
                  Tipo
                </th>
                <th class="p-2">
                  Área
                </th>
                <th class="p-2">
                  Estado
                </th>
                <th class="p-2">
                  Expedientes
                </th>
                <th class="p-2" />
              </tr>
            </thead>
            <tbody>
              <tr v-for="act in acts" :key="act.id" class="border-b">
                <td class="p-2 font-mono text-xs">
                  {{ act.act_code }}
                </td>
                <td class="p-2">
                  {{ act.act_date }}
                </td>
                <td class="p-2">
                  {{ kindLabel(act.transfer_kind) }}
                </td>
                <td class="p-2">
                  {{ act.org_unit?.name ?? '—' }}
                </td>
                <td class="p-2">
                  {{ statusLabel(act.status) }}
                </td>
                <td class="p-2">
                  {{ act.files_count ?? 0 }}
                </td>
                <td class="p-2 text-right">
                  <Button size="sm" variant="outline" @click="router.push(`/settings/archival/transfers/${act.id}`)">
                    Ver
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else-if="!loading" class="text-sm text-muted-foreground">
            No hay actas de transferencia.
          </p>
        </CardContent>
      </Card>
    </div>
  </SettingsLayout>
</template>
