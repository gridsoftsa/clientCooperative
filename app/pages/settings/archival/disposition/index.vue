<script setup lang="ts">
import { toast } from 'vue-sonner'
import { ARCHIVAL_DISPOSITION_ACT_STATUS_LABELS } from '~/constants/archival-lifecycle'
import { TRD_FINAL_DISPOSITION_LABELS } from '~/constants/archival-trd'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: ['trd_disposicion_ver', 'trd_tablas_ver', 'trd_catalogo_ver'],
})

const router = useRouter()
const api = useArchivalLifecycleApi()
const { hasPermission } = usePermissions()

const loading = ref(false)
const acts = ref<Awaited<ReturnType<typeof api.fetchDispositionActs>>>([])

async function load() {
  loading.value = true
  try {
    acts.value = await api.fetchDispositionActs()
  } catch {
    toast.error('No se pudieron cargar las actas')
    acts.value = []
  } finally {
    loading.value = false
  }
}

function statusLabel(s: string) {
  return ARCHIVAL_DISPOSITION_ACT_STATUS_LABELS[s] ?? s
}

function typeLabel(t: string) {
  return TRD_FINAL_DISPOSITION_LABELS[t] ?? t
}

onMounted(load)
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <Button variant="ghost" size="sm" class="h-8 w-fit -ml-2 px-2" @click="router.push('/settings/archival/lifecycle')">
            <Icon name="i-lucide-arrow-left" class="mr-1 h-4 w-4" />
            Ciclo de vida
          </Button>
          <h2 class="text-2xl font-bold tracking-tight">
            Actas de disposición final
          </h2>
          <p class="text-sm text-muted-foreground max-w-2xl">
            Registro formal de eliminación, conservación total o selección conforme a la TRD vigente al clasificar cada documento.
          </p>
        </div>
        <PermissionGate permission="trd_disposicion_editar">
          <Button @click="router.push('/settings/archival/disposition/create')">
            <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
            Nueva acta
          </Button>
        </PermissionGate>
      </div>

      <Card>
        <CardContent class="pt-6 overflow-x-auto">
          <table v-if="acts.length" class="w-full text-sm">
            <thead>
              <tr class="border-b text-left text-muted-foreground">
                <th class="p-2">
                  Código acta
                </th>
                <th class="p-2">
                  Fecha
                </th>
                <th class="p-2">
                  Tipo
                </th>
                <th class="p-2">
                  Estado
                </th>
                <th class="p-2">
                  Documentos
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
                  {{ typeLabel(act.disposition_type) }}
                </td>
                <td class="p-2">
                  {{ statusLabel(act.status) }}
                </td>
                <td class="p-2">
                  {{ act.documents_count ?? 0 }}
                </td>
                <td class="p-2 text-right">
                  <Button size="sm" variant="outline" @click="router.push(`/settings/archival/disposition/${act.id}`)">
                    Ver
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else-if="!loading" class="text-sm text-muted-foreground">
            No hay actas registradas.
          </p>
        </CardContent>
      </Card>
    </div>
  </SettingsLayout>
</template>
