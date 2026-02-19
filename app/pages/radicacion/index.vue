<script setup lang="ts">
definePageMeta({
  layout: 'default',
})

const router = useRouter()
const { $api } = useNuxtApp()

const applications = ref<any[]>([])
const loading = ref(false)
const pagination = ref({
  current_page: 1,
  last_page: 1,
  per_page: 15,
  total: 0,
})

async function fetchApplications() {
  loading.value = true
  try {
    const res = await $api<{ data: any[]; meta: typeof pagination.value }>(
      '/credit-applications',
      { query: { per_page: pagination.value.per_page, page: pagination.value.current_page } },
    )
    applications.value = res.data
    pagination.value = res.meta
  } catch (e) {
    console.error('Error cargando solicitudes:', e)
  } finally {
    loading.value = false
  }
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
  }).format(value)
}

function getStatusBadgeVariant(status: string) {
  const map: Record<string, string> = {
    Draft: 'secondary',
    Submitted: 'default',
    In_Analysis: 'outline',
    Approved: 'default',
    Rejected: 'destructive',
  }
  return map[status] || 'outline'
}

onMounted(() => {
  fetchApplications()
})
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-2xl font-bold tracking-tight">
        Entrevista de Crédito (Radicación)
      </h2>
      <Button @click="router.push('/radicacion/nueva')">
        <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
        Nueva Solicitud
      </Button>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Lista de Solicitudes</CardTitle>
        <CardDescription>
          Gestiona las solicitudes de crédito en proceso
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div v-if="loading" class="flex justify-center py-8">
          <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
        <div v-else-if="applications.length === 0" class="text-center py-12 text-muted-foreground">
          No hay solicitudes. Crea una nueva para comenzar.
        </div>
        <div v-else class="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Monto</TableHead>
                <TableHead>Plazo</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead>Fecha</TableHead>
                <TableHead class="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              <TableRow v-for="app in applications" :key="app.id">
                <TableCell class="font-medium">{{ app.code || '-' }}</TableCell>
                <TableCell>{{ formatCurrency(Number(app.amount_requested)) }}</TableCell>
                <TableCell>{{ app.term_months }} meses</TableCell>
                <TableCell>
                  <Badge :variant="getStatusBadgeVariant(app.status) as any">
                    {{ app.status }}
                  </Badge>
                </TableCell>
                <TableCell>{{ new Date(app.created_at).toLocaleDateString('es-CO') }}</TableCell>
                <TableCell class="text-right">
                  <Button
                    variant="ghost"
                    size="sm"
                    @click="router.push(`/radicacion/${app.id}`)"
                  >
                    <Icon name="i-lucide-eye" class="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            </TableBody>
          </Table>
        </div>

        <div v-if="pagination.last_page > 1" class="flex justify-between items-center mt-4">
          <p class="text-sm text-muted-foreground">
            Página {{ pagination.current_page }} de {{ pagination.last_page }}
          </p>
          <div class="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              :disabled="pagination.current_page <= 1"
              @click="pagination.current_page--; fetchApplications()"
            >
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              :disabled="pagination.current_page >= pagination.last_page"
              @click="pagination.current_page++; fetchApplications()"
            >
              Siguiente
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
