<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { WorkflowBindingCoverageRow, WorkflowDefinition } from '~/types/workflow'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'workflow_definir',
})

const router = useRouter()
const workflowApi = useWorkflowApi()

const loading = ref(true)
const definitions = ref<WorkflowDefinition[]>([])
const coverage = ref<WorkflowBindingCoverageRow[]>([])
const createDialogOpen = ref(false)
const creating = ref(false)

const createForm = reactive({
  key: '',
  name: '',
  description: '',
})

function isLocked(def: WorkflowDefinition) {
  return def.is_locked || (def.instances_count ?? 0) > 0
}

function stageCount(def: WorkflowDefinition) {
  return def.stages?.length ?? 0
}

function bindingCount(def: WorkflowDefinition) {
  const bindings = def.functional_bindings ?? def.functionalBindings ?? []
  return bindings.filter(b => b.is_active).length
}

const uncoveredTypes = computed(() => coverage.value.filter(row => !row.has_active_binding))

async function load() {
  loading.value = true

  try {
    const [defs, coverageRows] = await Promise.all([
      workflowApi.fetchDefinitions(),
      workflowApi.fetchBindingsCoverage(),
    ])
    definitions.value = defs
    coverage.value = coverageRows
  }
  catch {
    toast.error('No se pudieron cargar los flujos.')
  }
  finally {
    loading.value = false
  }
}

async function createDefinition() {
  if (!createForm.key.trim() || !createForm.name.trim()) {
    toast.error('Complete clave y nombre.')
    return
  }

  if (!/^[a-z0-9_-]+$/.test(createForm.key.trim())) {
    toast.error('La clave solo puede tener minúsculas, números, guiones o guión bajo.')
    return
  }

  creating.value = true

  try {
    const created = await workflowApi.createDefinition({
      key: createForm.key.trim(),
      name: createForm.name.trim(),
      description: createForm.description.trim() || undefined,
      is_active: true,
    })

    toast.success('Flujo creado.')
    createDialogOpen.value = false
    createForm.key = ''
    createForm.name = ''
    createForm.description = ''
    router.push(`/workflow/configuracion/${created.id}`)
  }
  catch {
    toast.error('No se pudo crear el flujo.')
  }
  finally {
    creating.value = false
  }
}

onMounted(() => {
  load()
})
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-center justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">
          Flujos de trabajo
        </h1>
        <p class="text-sm text-muted-foreground">
          Defina etapas, responsables, SLA y asociación por tipo funcional
        </p>
      </div>
      <div class="flex gap-2">
        <NuxtLink to="/workflow">
          <Button variant="outline" size="sm">
            <Icon name="lucide:layout-dashboard" class="mr-1 size-4" />
            Tablero
          </Button>
        </NuxtLink>
        <Button size="sm" @click="createDialogOpen = true">
          <Icon name="lucide:plus" class="mr-1 size-4" />
          Nuevo flujo
        </Button>
      </div>
    </div>

    <Alert v-if="!loading && uncoveredTypes.length" variant="destructive">
      <Icon name="lucide:alert-triangle" class="size-4" />
      <AlertTitle>Tipos funcionales sin flujo</AlertTitle>
      <AlertDescription>
        {{ uncoveredTypes.map(t => t.functional_type_label).join(', ') }} — no podrán radicarse hasta asociar un flujo activo.
      </AlertDescription>
    </Alert>

    <div v-if="loading" class="space-y-3">
      <Skeleton class="h-28 w-full" />
      <Skeleton class="h-28 w-full" />
    </div>

    <div v-else class="grid gap-4">
      <Card
        v-for="def in definitions"
        :key="def.id"
        class="cursor-pointer transition-colors hover:bg-accent/30"
        @click="router.push(`/workflow/configuracion/${def.id}`)"
      >
        <CardHeader>
          <div class="flex flex-wrap items-center justify-between gap-2">
            <div>
              <CardTitle class="flex items-center gap-2">
                {{ def.name }}
                <Icon name="lucide:chevron-right" class="size-4 text-muted-foreground" />
              </CardTitle>
              <CardDescription>
                <code>{{ def.key }}</code>
              </CardDescription>
            </div>
            <div class="flex flex-wrap gap-2">
              <Badge :variant="def.is_active ? 'default' : 'secondary'">
                {{ def.is_active ? 'Activo' : 'Inactivo' }}
              </Badge>
              <Badge v-if="isLocked(def)" variant="outline" class="text-amber-700">
                En uso
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div class="flex flex-wrap gap-4 text-sm text-muted-foreground">
            <span>{{ stageCount(def) }} etapas</span>
            <span>{{ bindingCount(def) }} tipos funcionales</span>
            <span v-if="def.instances_count">{{ def.instances_count }} procesos</span>
          </div>
          <div v-if="def.stages?.length" class="mt-3 flex flex-wrap gap-2">
            <Badge
              v-for="stage in [...def.stages].sort((a, b) => a.sort_order - b.sort_order)"
              :key="stage.id"
              variant="outline"
            >
              {{ stage.sort_order }}. {{ stage.name }}
            </Badge>
          </div>
        </CardContent>
      </Card>

      <Card v-if="definitions.length === 0" class="border-dashed">
        <CardContent class="py-10 text-center">
          <p class="text-muted-foreground">
            No hay flujos configurados.
          </p>
          <Button class="mt-4" @click="createDialogOpen = true">
            Crear primer flujo
          </Button>
        </CardContent>
      </Card>
    </div>

    <Dialog v-model:open="createDialogOpen">
      <DialogContent class="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Nuevo flujo de trabajo</DialogTitle>
          <DialogDescription>
            Después podrá agregar etapas y asociar tipos funcionales.
          </DialogDescription>
        </DialogHeader>
        <div class="grid gap-4 py-2">
          <div class="grid gap-2">
            <Label>Clave técnica</Label>
            <Input v-model="createForm.key" placeholder="ej. pqrs_workflow" />
          </div>
          <div class="grid gap-2">
            <Label>Nombre</Label>
            <Input v-model="createForm.name" placeholder="Flujo PQRS" />
          </div>
          <div class="grid gap-2">
            <Label>Descripción</Label>
            <Textarea v-model="createForm.description" rows="2" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" @click="createDialogOpen = false">
            Cancelar
          </Button>
          <Button :disabled="creating" @click="createDefinition">
            {{ creating ? 'Creando…' : 'Crear y configurar' }}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>
</template>
