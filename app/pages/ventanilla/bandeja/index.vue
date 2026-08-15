<script setup lang="ts">
import {
  formatVentanillaIntakeDate,
  ventanillaIntakeReceiptCode,
  ventanillaIntakeSourceLabel,
  ventanillaIntakeStatusLabel,
} from '~/utils/ventanilla-intake-display'
import type { VentanillaFunctionalTypeRow, VentanillaIntakeRow } from '~/types/ventanilla'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'ventanilla_clasificar',
})

const ventanillaApi = useVentanillaApi()

const intakes = ref<VentanillaIntakeRow[]>([])
const catalog = ref<Awaited<ReturnType<typeof ventanillaApi.fetchCatalog>> | null>(null)
const loading = ref(false)
const errorMessage = ref('')
const search = ref('')
const statusFilter = ref('pending_classification')
const sourceFilter = ref('all')
const pagination = ref({ current_page: 1, last_page: 1, per_page: 20, total: 0 })

const pendingCount = computed(() =>
  statusFilter.value === 'pending_classification'
    ? pagination.value.total
    : intakes.value.filter(item => item.status === 'pending_classification').length,
)

function intakePath(intakeId: number): string {
  return `/ventanilla/bandeja/${intakeId}`
}

function functionalTypeLabel(key: string | null | undefined): string {
  if (!key) {
    return '—'
  }

  return catalog.value?.functional_types.find((item: VentanillaFunctionalTypeRow) => item.key === key)?.label ?? key
}

async function loadCatalog() {
  try {
    catalog.value = await ventanillaApi.fetchCatalog()
  }
  catch {
    catalog.value = null
  }
}

async function loadIntakes() {
  loading.value = true
  errorMessage.value = ''

  try {
    const query: Record<string, string | number> = {
      page: pagination.value.current_page,
      per_page: pagination.value.per_page,
    }

    if (statusFilter.value !== 'all') {
      query.status = statusFilter.value
    }
    if (sourceFilter.value !== 'all') {
      query.source = sourceFilter.value
    }
    if (search.value.trim()) {
      query.search = search.value.trim()
    }

    const res = await ventanillaApi.fetchIntakes(query)
    intakes.value = res.data ?? []
    pagination.value = {
      current_page: res.meta.current_page,
      last_page: res.meta.last_page,
      per_page: res.meta.per_page,
      total: res.meta.total,
    }
  }
  catch {
    errorMessage.value = 'No se pudo cargar la bandeja.'
  }
  finally {
    loading.value = false
  }
}

function filterAndLoad() {
  pagination.value.current_page = 1
  loadIntakes()
}

function goToPage(page: number) {
  const nextPage = Math.min(Math.max(page, 1), pagination.value.last_page)
  if (nextPage === pagination.value.current_page) {
    return
  }
  pagination.value.current_page = nextPage
  loadIntakes()
}

onMounted(async () => {
  await loadCatalog()
  await loadIntakes()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">
          Bandeja de clasificación
        </h1>
        <p class="text-muted-foreground text-sm">
          {{ pagination.total }} entrada(s)
          <span v-if="statusFilter === 'pending_classification' && pendingCount > 0">
            · {{ pendingCount }} pendiente(s) de radicar
          </span>
        </p>
      </div>
      <div class="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" :disabled="loading" @click="loadIntakes">
          Actualizar
        </Button>
        <NuxtLink to="/ventanilla/formulario" target="_blank">
          <Button type="button" variant="outline" size="sm">
            Formulario público
          </Button>
        </NuxtLink>
      </div>
    </div>

    <p v-if="errorMessage" class="text-destructive text-sm">
      {{ errorMessage }}
    </p>

    <Card>
      <CardHeader class="pb-3">
        <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_180px_180px_auto]">
          <Input
            v-model="search"
            placeholder="Buscar asunto, remitente o correo"
            @keyup.enter="filterAndLoad"
          />
          <Select v-model="statusFilter" @update:model-value="filterAndLoad">
            <SelectTrigger>
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los estados</SelectItem>
              <SelectItem value="pending_classification">Pendientes</SelectItem>
              <SelectItem value="classified">Clasificadas</SelectItem>
              <SelectItem value="discarded">Descartadas</SelectItem>
            </SelectContent>
          </Select>
          <Select v-model="sourceFilter" @update:model-value="filterAndLoad">
            <SelectTrigger>
              <SelectValue placeholder="Origen" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos los orígenes</SelectItem>
              <SelectItem value="web_form">Formulario web</SelectItem>
              <SelectItem value="email">Correo</SelectItem>
            </SelectContent>
          </Select>
          <Button type="button" :disabled="loading" @click="filterAndLoad">
            {{ loading ? 'Cargando…' : 'Filtrar' }}
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        <div v-if="loading" class="space-y-2">
          <Skeleton v-for="index in 6" :key="index" class="h-14 w-full" />
        </div>

        <div v-else-if="!intakes.length" class="py-12 text-center text-sm text-muted-foreground">
          No hay entradas para los filtros seleccionados.
        </div>

        <div v-else class="hidden overflow-x-auto rounded-lg border md:block">
          <table class="w-full text-sm">
            <thead class="border-b bg-muted/40 text-left">
              <tr>
                <th class="px-4 py-3 font-medium">Recepción</th>
                <th class="px-4 py-3 font-medium">Origen</th>
                <th class="px-4 py-3 font-medium">Estado</th>
                <th class="px-4 py-3 font-medium">Asunto</th>
                <th class="px-4 py-3 font-medium">Remitente</th>
                <th class="px-4 py-3 font-medium">Sugerencia</th>
                <th class="px-4 py-3 font-medium text-right">Acción</th>
              </tr>
            </thead>
            <tbody class="divide-y">
              <tr
                v-for="intake in intakes"
                :key="intake.id"
                class="transition-colors hover:bg-muted/40"
              >
                <td class="px-4 py-3 align-top whitespace-nowrap">
                  <NuxtLink :to="intakePath(intake.id)" class="block font-medium text-primary hover:underline">
                    {{ ventanillaIntakeReceiptCode(intake.id) }}
                  </NuxtLink>
                  <p class="text-muted-foreground text-xs">
                    {{ formatVentanillaIntakeDate(intake.received_at) }}
                  </p>
                </td>
                <td class="px-4 py-3 align-top">
                  <Badge variant="outline">
                    {{ ventanillaIntakeSourceLabel(intake.source) }}
                  </Badge>
                </td>
                <td class="px-4 py-3 align-top">
                  <Badge :variant="intake.status === 'pending_classification' ? 'default' : 'secondary'">
                    {{ ventanillaIntakeStatusLabel(intake.status) }}
                  </Badge>
                </td>
                <td class="px-4 py-3 align-top">
                  <NuxtLink :to="intakePath(intake.id)" class="block max-w-xs font-medium hover:underline">
                    {{ intake.subject }}
                  </NuxtLink>
                </td>
                <td class="px-4 py-3 align-top">
                  <p>{{ intake.sender_name ?? 'Sin nombre' }}</p>
                  <p class="text-muted-foreground text-xs">
                    {{ intake.sender_email ?? 'Sin correo' }}
                  </p>
                </td>
                <td class="px-4 py-3 align-top">
                  <p v-if="intake.suggested_functional_type_key">
                    {{ functionalTypeLabel(intake.suggested_functional_type_key) }}
                  </p>
                  <p v-if="intake.classification?.rule_name" class="text-muted-foreground text-xs">
                    Regla: {{ intake.classification.rule_name }}
                  </p>
                  <p v-else-if="!intake.suggested_functional_type_key" class="text-muted-foreground">
                    —
                  </p>
                </td>
                <td class="px-4 py-3 align-top text-right">
                  <NuxtLink :to="intakePath(intake.id)">
                    <Button type="button" size="sm" variant="outline">
                      {{ intake.status === 'pending_classification' ? 'Clasificar' : 'Ver' }}
                    </Button>
                  </NuxtLink>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="space-y-3 md:hidden">
          <div
            v-for="intake in intakes"
            :key="`mobile-${intake.id}`"
            class="rounded-xl border bg-card p-4 shadow-sm"
          >
            <div class="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{{ ventanillaIntakeSourceLabel(intake.source) }}</Badge>
              <Badge :variant="intake.status === 'pending_classification' ? 'default' : 'secondary'">
                {{ ventanillaIntakeStatusLabel(intake.status) }}
              </Badge>
              <span class="text-muted-foreground ml-auto text-xs">{{ ventanillaIntakeReceiptCode(intake.id) }}</span>
            </div>
            <p class="mt-2 font-medium">{{ intake.subject }}</p>
            <p class="text-muted-foreground mt-1 text-sm">
              {{ intake.sender_name ?? 'Sin nombre' }} · {{ formatVentanillaIntakeDate(intake.received_at) }}
            </p>
            <NuxtLink :to="intakePath(intake.id)" class="mt-3 block">
              <Button type="button" size="sm" class="w-full">
                {{ intake.status === 'pending_classification' ? 'Clasificar' : 'Ver detalle' }}
              </Button>
            </NuxtLink>
          </div>
        </div>

        <div class="mt-4 flex flex-wrap items-center justify-between gap-3 text-sm">
          <span class="text-muted-foreground">
            Página {{ pagination.current_page }} de {{ pagination.last_page }}
          </span>
          <div class="flex gap-2">
            <Button type="button" variant="outline" size="sm" :disabled="pagination.current_page <= 1" @click="goToPage(pagination.current_page - 1)">
              Anterior
            </Button>
            <Button type="button" variant="outline" size="sm" :disabled="pagination.current_page >= pagination.last_page" @click="goToPage(pagination.current_page + 1)">
              Siguiente
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
</template>
