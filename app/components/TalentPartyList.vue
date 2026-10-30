<script setup lang="ts">
import type { TalentPartyKind, TalentPartySummary, TalentTrdSeries } from '~/types/talent-party'
import { toast } from 'vue-sonner'

const props = defineProps<{
  kind: TalentPartyKind
}>()

const router = useRouter()
const talentApi = useTalentPartyApi()
const { hasPermission } = usePermissions()

const parties = ref<TalentPartySummary[]>([])
const loading = ref(true)
const search = ref('')
const createOpen = ref(false)
const saving = ref(false)
const displayName = ref('')
const identifier = ref('')
const trdTableId = ref<number | null>(null)
const trdOptions = ref<Array<{ value: number, label: string }>>([])
const series = ref<TalentTrdSeries[]>([])
const seriesLoading = ref(false)
const selectedSubseries = ref<number[]>([])

const section = computed(() => props.kind === 'supplier' ? 'proveedores' : 'empleados')
const title = computed(() => props.kind === 'supplier' ? 'Proveedores' : 'Empleados')
const singular = computed(() => props.kind === 'supplier' ? 'proveedor' : 'empleado')
const canManage = computed(() => hasPermission('talento_gestionar'))

let searchTimer: ReturnType<typeof setTimeout> | undefined

function apiErrorMessage(error: unknown, fallback: string): string {
  const data = (error as { data?: { message?: string, errors?: Record<string, string[]> } })?.data
  const first = data?.errors ? Object.values(data.errors)[0]?.[0] : undefined

  return first || data?.message || fallback
}

async function loadParties() {
  loading.value = true
  try {
    const response = await talentApi.list(props.kind, search.value)
    parties.value = response.data
  }
  catch {
    toast.error(`No se pudo cargar el listado de ${title.value.toLowerCase()}.`)
    parties.value = []
  }
  finally {
    loading.value = false
  }
}

async function loadTrdOptions() {
  if (trdOptions.value.length > 0) {
    return
  }

  try {
    const response = await talentApi.trdOptions()
    trdOptions.value = response.data.map(option => ({
      value: option.id,
      label: option.label,
    }))
  }
  catch {
    toast.error('No se pudieron cargar las TRD.')
  }
}

function openCreate() {
  displayName.value = ''
  identifier.value = ''
  trdTableId.value = null
  series.value = []
  selectedSubseries.value = []
  createOpen.value = true
  void loadTrdOptions()
}

function isSubseriesSelected(id: number): boolean {
  return selectedSubseries.value.includes(id)
}

function setSubseriesSelected(id: number, checked: boolean) {
  if (checked) {
    if (!selectedSubseries.value.includes(id)) {
      selectedSubseries.value = [...selectedSubseries.value, id]
    }
    return
  }

  selectedSubseries.value = selectedSubseries.value.filter(item => item !== id)
}

async function loadSeries(tableId: number | null) {
  series.value = []
  selectedSubseries.value = []
  if (tableId == null) {
    return
  }

  seriesLoading.value = true
  try {
    const response = await talentApi.trdSubseries(tableId)
    series.value = response.data
  }
  catch {
    toast.error('No se pudo cargar la estructura de la TRD.')
  }
  finally {
    seriesLoading.value = false
  }
}

watch(trdTableId, (tableId) => {
  void loadSeries(tableId)
})

watch(search, () => {
  if (searchTimer) {
    clearTimeout(searchTimer)
  }
  searchTimer = setTimeout(() => {
    void loadParties()
  }, 400)
})

async function createParty() {
  if (!displayName.value.trim()) {
    toast.error(`Indique el nombre del ${singular.value}.`)
    return
  }
  if (trdTableId.value == null) {
    toast.error('Seleccione la TRD.')
    return
  }
  if (selectedSubseries.value.length === 0) {
    toast.error('Seleccione al menos una subserie.')
    return
  }

  saving.value = true
  try {
    const response = await talentApi.create({
      kind: props.kind,
      display_name: displayName.value.trim(),
      identifier: identifier.value.trim() || undefined,
      trd_table_id: trdTableId.value,
      doc_subseries_ids: selectedSubseries.value,
    })
    toast.success(response.message || 'Carpeta creada.')
    createOpen.value = false
    await router.push(`/talento-humano/${section.value}/${response.data.id}`)
  }
  catch (error: unknown) {
    toast.error(apiErrorMessage(error, 'No se pudo crear la carpeta.'))
  }
  finally {
    saving.value = false
  }
}

onMounted(() => {
  void loadParties()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">
          {{ title }}
        </h1>
        <p class="mt-1 max-w-3xl text-sm text-muted-foreground">
          Cada {{ singular }} es una carpeta de la TRD. Al crearla se eligen las subseries que aplican y se generan las subcarpetas de sus tipos documentales. Esas carpetas quedan en el repositorio del área de la TRD.
        </p>
      </div>
      <Button
        v-if="canManage"
        type="button"
        @click="openCreate"
      >
        <Icon name="i-lucide-folder-plus" class="mr-1.5 size-4" />
        Crear {{ singular }}
      </Button>
    </div>

    <Card>
      <CardHeader class="pb-4">
        <div class="max-w-md space-y-2">
          <Label for="talent-party-search">Buscar</Label>
          <Input
            id="talent-party-search"
            v-model="search"
            placeholder="Nombre o identificación"
          />
        </div>
      </CardHeader>
      <CardContent>
        <p
          v-if="loading"
          class="text-sm text-muted-foreground"
        >
          Cargando...
        </p>
        <p
          v-else-if="parties.length === 0"
          class="text-sm text-muted-foreground"
        >
          No hay {{ title.toLowerCase() }} creados.
        </p>
        <Table v-else>
          <TableHeader>
            <TableRow>
              <TableHead>Nombre</TableHead>
              <TableHead>Identificación</TableHead>
              <TableHead>Área de la TRD</TableHead>
              <TableHead>Subseries</TableHead>
              <TableHead>Archivos</TableHead>
              <TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            <TableRow
              v-for="party in parties"
              :key="party.id"
            >
              <TableCell class="font-medium">
                {{ party.display_name }}
              </TableCell>
              <TableCell>{{ party.identifier || '—' }}</TableCell>
              <TableCell>{{ party.org_unit?.name || '—' }}</TableCell>
              <TableCell>{{ party.subseries_count }}</TableCell>
              <TableCell>{{ party.documents_count }}</TableCell>
              <TableCell class="text-right">
                <Button
                  variant="outline"
                  size="sm"
                  as-child
                >
                  <NuxtLink :to="`/talento-humano/${section}/${party.id}`">
                    Abrir
                  </NuxtLink>
                </Button>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <Dialog v-model:open="createOpen">
      <DialogContent
        class="max-h-[85vh] overflow-y-auto sm:max-w-2xl"
        @pointer-down-outside="preventArchivalMultiselectDialogDismiss"
        @focus-outside="preventArchivalMultiselectDialogDismiss"
        @interact-outside="preventArchivalMultiselectDialogDismiss"
      >
        <DialogHeader>
          <DialogTitle>Crear {{ singular }}</DialogTitle>
          <DialogDescription>
            La carpeta queda ligada a la TRD. Las subseries marcadas crean las subcarpetas de cada tipo documental.
          </DialogDescription>
        </DialogHeader>

        <div class="space-y-4">
          <div class="space-y-2">
            <Label for="talent-party-name">Nombre</Label>
            <Input
              id="talent-party-name"
              v-model="displayName"
              :placeholder="kind === 'supplier' ? 'Razón social' : 'Nombre del empleado'"
            />
          </div>
          <div class="space-y-2">
            <Label for="talent-party-identifier">Identificación</Label>
            <Input
              id="talent-party-identifier"
              v-model="identifier"
              :placeholder="kind === 'supplier' ? 'NIT' : 'Documento'"
            />
          </div>
          <div class="space-y-2">
            <Label for="talent-party-trd">TRD</Label>
            <ArchivalSingleMultiselect
              id="talent-party-trd"
              v-model="trdTableId"
              :options="trdOptions"
              placeholder="Seleccione la TRD del área"
              coerce-number
            />
          </div>

          <div
            v-if="seriesLoading"
            class="text-sm text-muted-foreground"
          >
            Cargando subseries...
          </div>
          <div
            v-else-if="trdTableId != null && series.length === 0"
            class="text-sm text-muted-foreground"
          >
            Esta TRD no tiene series activas en el catálogo del área.
          </div>
          <div
            v-else
            class="space-y-4"
          >
            <div
              v-for="item in series"
              :key="item.id"
              class="space-y-2"
            >
              <p class="text-sm font-medium">
                {{ item.code }} — {{ item.name }}
              </p>
              <label
                v-for="subseries in item.subseries"
                :key="subseries.id"
                class="flex items-start gap-3 rounded-md border px-3 py-2"
              >
                <Checkbox
                  bare
                  :checked="isSubseriesSelected(subseries.id)"
                  @update:checked="setSubseriesSelected(subseries.id, $event === true)"
                />
                <span class="min-w-0">
                  <span class="block text-sm">{{ subseries.code }} — {{ subseries.name }}</span>
                  <span class="block text-xs text-muted-foreground">
                    {{ subseries.document_types.length }} tipo{{ subseries.document_types.length === 1 ? '' : 's' }} documental{{ subseries.document_types.length === 1 ? '' : 'es' }}
                  </span>
                </span>
              </label>
              <p
                v-if="item.subseries.length === 0"
                class="text-sm text-muted-foreground"
              >
                Sin subseries activas.
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            @click="createOpen = false"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            :disabled="saving"
            @click="createParty"
          >
            <Icon
              v-if="saving"
              name="i-lucide-loader-2"
              class="mr-1.5 size-4 animate-spin"
            />
            Crear carpeta
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
