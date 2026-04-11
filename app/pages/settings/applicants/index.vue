<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { Applicant, PaginatedApplicants } from '~/types/applicant'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'solicitantes_ver'
})

const { $api } = useNuxtApp()
const router = useRouter()
const { hasPermission } = usePermissions()

const applicants = ref<Applicant[]>([])
const loading = ref(false)
const searchQuery = ref('')
const pagination = ref({
  current_page: 1,
  last_page: 1,
  per_page: 15,
  total: 0
})

const canEdit = computed(() => hasPermission('solicitantes_editar'))

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('es-CO', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

async function fetchApplicants() {
  loading.value = true
  try {
    const params: Record<string, string | number> = {
      per_page: pagination.value.per_page,
      page: pagination.value.current_page
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

onMounted(() => {
  fetchApplicants()
})

watch(searchQuery, () => {
  const timeout = setTimeout(() => handleSearch(), 500)
  return () => clearTimeout(timeout)
})
</script>

<template>
  <SettingsLayout :wide="true">
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
              <Icon name="i-lucide-search" class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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

          <div v-else-if="applicants.length === 0" class="text-center py-8 text-muted-foreground">
            No hay solicitantes registrados
          </div>

          <div v-else class="border rounded-lg overflow-hidden">
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
                  <TableHead class="text-right">Acciones</TableHead>
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
                    <span class="text-muted-foreground text-sm">
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
                    <span v-else class="text-muted-foreground text-sm">—</span>
                  </TableCell>
                  <TableCell>
                    <span class="text-muted-foreground text-sm">
                      {{ a.last_application_date ? formatDate(a.last_application_date) : '—' }}
                    </span>
                  </TableCell>
                  <TableCell class="text-right">
                    <PermissionGate permission="solicitantes_editar">
                      <Button
                        variant="outline"
                        size="sm"
                        @click="router.push(`/settings/applicants/${a.id}/edit`)"
                      >
                        <Icon name="i-lucide-edit" class="h-4 w-4" />
                      </Button>
                    </PermissionGate>
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
    </div>
  </SettingsLayout>
</template>
