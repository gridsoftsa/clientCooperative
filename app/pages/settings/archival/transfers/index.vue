<script setup lang="ts">
import { toast } from 'vue-sonner'
import {
  ARCHIVAL_DISPOSITION_ACT_STATUS_LABELS,
  ARCHIVAL_TRANSFER_KIND_OPTIONS,
} from '~/constants/archival-lifecycle'
import { messageFromFetchError } from '~/utils/http-error-message'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: ['trd_ciclo_vida_ver', 'trd_tablas_ver', 'trd_catalogo_ver'],
})

const router = useRouter()
const api = useArchivalLifecycleApi()
const { hasPermission } = usePermissions()

const loading = ref(false)
const acts = ref<Awaited<ReturnType<typeof api.fetchTransferActs>>>([])
const pendingCancelId = ref<number | null>(null)
const pendingDeleteId = ref<number | null>(null)
const acting = ref(false)

const canManageDrafts = computed(() => hasPermission('trd_transferencias_ejecutar'))

const {
  page: actsPage,
  pageCount: actsPageCount,
  pageItems: pagedActs,
  rangeLabel: actsRangeLabel,
  goToPreviousPage: goToPreviousActsPage,
  goToNextPage: goToNextActsPage,
  resetPage: resetActsPage,
} = useClientPagination(() => acts.value)

async function load() {
  loading.value = true
  try {
    acts.value = await api.fetchTransferActs()
    resetActsPage()
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

function goToEdit(id: number) {
  router.push(`/settings/archival/transfers/create?id=${id}`)
}

async function confirmCancel() {
  if (pendingCancelId.value == null) {
    return
  }

  acting.value = true
  try {
    const res = await api.cancelTransferAct(pendingCancelId.value)
    toast.success(res.message ?? 'Acta anulada')
    pendingCancelId.value = null
    await load()
  }
  catch (error: unknown) {
    toast.error(messageFromFetchError(error, 'No se pudo anular el borrador'))
  }
  finally {
    acting.value = false
  }
}

async function confirmDelete() {
  if (pendingDeleteId.value == null) {
    return
  }

  acting.value = true
  try {
    const res = await api.deleteTransferAct(pendingDeleteId.value)
    toast.success(res.message ?? 'Borrador eliminado')
    pendingDeleteId.value = null
    await load()
  }
  catch (error: unknown) {
    toast.error(messageFromFetchError(error, 'No se pudo eliminar el borrador'))
  }
  finally {
    acting.value = false
  }
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
          <div v-if="acts.length" class="mb-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <span>{{ actsRangeLabel }}</span>
            <div v-if="actsPageCount > 1" class="flex gap-1">
              <Button type="button" size="sm" variant="outline" class="h-7 px-2" :disabled="actsPage <= 1" @click="goToPreviousActsPage">
                Anterior
              </Button>
              <Button type="button" size="sm" variant="outline" class="h-7 px-2" :disabled="actsPage >= actsPageCount" @click="goToNextActsPage">
                Siguiente
              </Button>
            </div>
          </div>
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
              <tr v-for="act in pagedActs" :key="act.id" class="border-b">
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
                  <div class="flex flex-wrap justify-end gap-1">
                    <Button size="sm" variant="outline" @click="router.push(`/settings/archival/transfers/${act.id}`)">
                      Ver
                    </Button>
                    <template v-if="act.status === 'draft' && canManageDrafts">
                      <Button size="sm" variant="outline" @click="goToEdit(act.id)">
                        Editar
                      </Button>
                      <Button size="sm" variant="outline" @click="pendingCancelId = act.id">
                        Anular
                      </Button>
                      <Button size="sm" variant="destructive" @click="pendingDeleteId = act.id">
                        Eliminar
                      </Button>
                    </template>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
          <p v-else-if="!loading" class="text-sm text-muted-foreground">
            No hay actas de transferencia.
          </p>
        </CardContent>
      </Card>

      <AlertDialog :open="pendingCancelId != null" @update:open="pendingCancelId = $event ? pendingCancelId : null">
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Anular borrador
            </AlertDialogTitle>
            <AlertDialogDescription>
              El acta quedará anulada y no se podrá aprobar ni ejecutar. El código se conserva en el historial.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel :disabled="acting">
              Cancelar
            </AlertDialogCancel>
            <Button :disabled="acting" @click="confirmCancel">
              {{ acting ? 'Anulando…' : 'Anular acta' }}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog :open="pendingDeleteId != null" @update:open="pendingDeleteId = $event ? pendingDeleteId : null">
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Eliminar borrador
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción borra el acta. El código quedará libre para usarlo de nuevo.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel :disabled="acting">
              Cancelar
            </AlertDialogCancel>
            <Button variant="destructive" :disabled="acting" @click="confirmDelete">
              {{ acting ? 'Eliminando…' : 'Eliminar' }}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  </SettingsLayout>
</template>
