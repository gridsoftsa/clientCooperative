<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { Applicant, PaginatedApplicants } from '~/types/applicant'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'solicitantes_ver',
})

const { $api } = useNuxtApp()
const router = useRouter()

const applicants = ref<Applicant[]>([])
const loading = ref(false)
const searchQuery = ref('')
const deleteWithReason = useApiDeleteWithReason()
const deleteApplicantDialogOpen = ref(false)
const applicantIdPendingDelete = ref<number | null>(null)
const deletingApplicant = ref(false)

const pagination = ref({
  current_page: 1,
  last_page: 1,
  per_page: 15,
  total: 0,
})

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

async function fetchApplicants() {
  loading.value = true
  try {
    const params: Record<string, string | number> = {
      per_page: pagination.value.per_page,
      page: pagination.value.current_page,
    }
    if (searchQuery.value) {
      params.search = searchQuery.value
    }
    const res = await $api<PaginatedApplicants>('/applicants', { query: params })
    applicants.value = res.data
    pagination.value = res.meta
  } catch (error) {
    console.error('Error al cargar solicitantes:', error)
    toast.error('Error al cargar solicitantes')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  pagination.value.current_page = 1
  fetchApplicants()
}

function handlePageChange(page: number) {
  pagination.value.current_page = page
  fetchApplicants()
}

function openDeleteApplicantDialog(id: number) {
  applicantIdPendingDelete.value = id
  deleteApplicantDialogOpen.value = true
}

async function onDeleteApplicantConfirm(reason: string) {
  const id = applicantIdPendingDelete.value
  if (id == null || deletingApplicant.value) {
    return
  }
  deletingApplicant.value = true
  try {
    await deleteWithReason(`/applicants/${id}`, reason)
    deleteApplicantDialogOpen.value = false
    applicantIdPendingDelete.value = null
    toast.success('Solicitante desactivado correctamente')
    await fetchApplicants()
  } catch (error: unknown) {
    console.error('Error al desactivar solicitante:', error)
    const message = error && typeof error === 'object' && 'data' in error
      ? (error as { data?: { message?: string } }).data?.message
      : undefined
    toast.error(message ?? 'No se pudo desactivar el solicitante')
  } finally {
    deletingApplicant.value = false
  }
}

onMounted(() => {
  fetchApplicants()
})

watch(searchQuery, () => {
  const timeout = setTimeout(() => handleSearch(), 500)
  return () => clearTimeout(timeout)
})

watch(deleteApplicantDialogOpen, (v) => {
  if (!v) {
    applicantIdPendingDelete.value = null
  }
})
</script>

<template>
  <div class="w-full flex flex-col gap-4">
      <div class="flex flex-wrap items-center justify-between gap-2">
        <h2 class="text-2xl font-bold tracking-tight">
          Deudores y Codeudores
        </h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lista de Solicitantes</CardTitle>
          <CardDescription>
            Consulta y edita datos de deudores y codeudores registrados en radicaciones
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div class="space-y-4">
            <div class="flex gap-2">
              <div class="relative flex-1">
                <Icon name="i-lucide-search" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  v-model="searchQuery"
                  placeholder="Buscar por documento, nombre o email..."
                  class="pl-9"
                />
              </div>
            </div>

            <div v-if="loading" class="flex items-center justify-center py-8">
              <Icon name="i-lucide-loader-2" class="h-6 w-6 animate-spin" />
            </div>

            <div v-else-if="applicants.length === 0" class="py-8 text-center text-muted-foreground">
              No hay solicitantes registrados
            </div>

            <div v-else class="overflow-hidden rounded-lg border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Documento</TableHead>
                    <TableHead>Nombre completo</TableHead>
                    <TableHead>Teléfono</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Ciudad</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Última solicitud</TableHead>
                    <TableHead class="text-right">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="a in applicants" :key="a.id">
                    <TableCell class="font-medium">
                      {{ a.document_type }} {{ a.document_number }}
                    </TableCell>
                    <TableCell>{{ a.full_name }}</TableCell>
                    <TableCell>{{ a.mobile_phone || a.landline || '—' }}</TableCell>
                    <TableCell>{{ a.email || '—' }}</TableCell>
                    <TableCell>
                      <span class="text-sm text-muted-foreground">
                        {{ a.residence_city_name || a.residence_city?.name || '—' }}
                      </span>
                    </TableCell>
                    <TableCell>
                      <Badge v-if="a.last_participation_type === 'deudor'" variant="default">
                        Deudor
                      </Badge>
                      <Badge v-else-if="a.last_participation_type === 'codeudor'" variant="secondary">
                        Codeudor
                      </Badge>
                      <span v-else class="text-sm text-muted-foreground">—</span>
                    </TableCell>
                    <TableCell>
                      <span class="text-sm text-muted-foreground">
                        {{ a.last_application_date ? formatDate(a.last_application_date) : '—' }}
                      </span>
                    </TableCell>
                    <TableCell class="text-right">
                      <div class="flex flex-wrap justify-end gap-2">
                        <PermissionGate permission="solicitantes_editar">
                          <Button
                            variant="warning"
                            size="sm"
                            class="gap-1.5"
                            @click="router.push(`/solicitantes/${a.id}/edit`)"
                          >
                            <Icon name="i-lucide-edit" class="h-4 w-4 shrink-0" />
                            Editar
                          </Button>
                        </PermissionGate>
                        <PermissionGate permission="solicitantes_eliminar">
                          <Button
                            variant="destructive"
                            size="sm"
                            class="gap-1.5"
                            title="Desactivar"
                            :disabled="deletingApplicant && applicantIdPendingDelete === a.id"
                            @click="() => openDeleteApplicantDialog(a.id)"
                          >
                            <Icon
                              :name="deletingApplicant && applicantIdPendingDelete === a.id ? 'i-lucide-loader-2' : 'i-lucide-ban'"
                              class="h-3.5 w-3.5 shrink-0"
                              :class="{ 'animate-spin': deletingApplicant && applicantIdPendingDelete === a.id }"
                            />
                            {{ deletingApplicant && applicantIdPendingDelete === a.id ? 'Desactivando...' : 'Desactivar' }}
                          </Button>
                        </PermissionGate>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>

            <div v-if="pagination.last_page > 1" class="flex items-center justify-between">
              <div class="text-sm text-muted-foreground">
                Mostrando {{ ((pagination.current_page - 1) * pagination.per_page) + 1 }} a
                {{ Math.min(pagination.current_page * pagination.per_page, pagination.total) }} de
                {{ pagination.total }} solicitantes
              </div>
              <div class="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  :disabled="pagination.current_page === 1"
                  @click="handlePageChange(pagination.current_page - 1)"
                >
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  :disabled="pagination.current_page === pagination.last_page"
                  @click="handlePageChange(pagination.current_page + 1)"
                >
                  Siguiente
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

    <ConfirmWithReasonDialog
      v-model:open="deleteApplicantDialogOpen"
      title="Desactivar solicitante"
      description="El registro se ocultará del catálogo pero se conservará en base de datos. No aplica si el solicitante participa en una radicación activa. Indica el motivo."
      confirm-text="Aceptar"
      cancel-text="Cancelar"
      :loading="deletingApplicant"
      @confirm="onDeleteApplicantConfirm"
    />
  </div>
</template>
