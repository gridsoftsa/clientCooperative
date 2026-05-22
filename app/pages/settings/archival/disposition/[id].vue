<script setup lang="ts">
import { toast } from 'vue-sonner'
import {
  ARCHIVAL_DISPOSITION_ACT_STATUS_LABELS,
} from '~/constants/archival-lifecycle'
import { TRD_FINAL_DISPOSITION_LABELS } from '~/constants/archival-trd'
import type { ArchivalDispositionActRow } from '~/composables/useArchivalLifecycleApi'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: ['trd_disposicion_ver', 'trd_tablas_ver', 'trd_catalogo_ver'],
})

const route = useRoute()
const router = useRouter()
const api = useArchivalLifecycleApi()
const { hasPermission } = usePermissions()

const actId = computed(() => Number(route.params.id))
const loading = ref(true)
const act = ref<ArchivalDispositionActRow | null>(null)

async function load() {
  loading.value = true
  try {
    act.value = await api.fetchDispositionAct(actId.value)
  } catch {
    toast.error('No se pudo cargar el acta')
    act.value = null
  } finally {
    loading.value = false
  }
}

async function approve() {
  try {
    const res = await api.approveDispositionAct(actId.value)
    act.value = res.data
    toast.success(res.message ?? 'Aprobada')
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Error al aprobar')
  }
}

async function execute() {
  try {
    const res = await api.executeDispositionAct(actId.value)
    act.value = res.data
    toast.success(res.message ?? 'Ejecutada')
  } catch (e: unknown) {
    toast.error(e instanceof Error ? e.message : 'Error al ejecutar')
  }
}

onMounted(load)
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
      <Button variant="ghost" size="sm" class="w-fit -ml-2" @click="router.push('/settings/archival/disposition')">
        <Icon name="i-lucide-arrow-left" class="mr-1 h-4 w-4" />
        Actas
      </Button>

      <div v-if="act" class="space-y-4">
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 class="text-2xl font-bold tracking-tight">
              {{ act.act_code }}
            </h2>
            <p class="text-muted-foreground text-sm">
              {{ ARCHIVAL_DISPOSITION_ACT_STATUS_LABELS[act.status] ?? act.status }}
              · {{ TRD_FINAL_DISPOSITION_LABELS[act.disposition_type] ?? act.disposition_type }}
              · {{ act.act_date }}
            </p>
          </div>
          <div class="flex gap-2">
            <PermissionGate v-if="act.status === 'draft'" permission="trd_disposicion_editar">
              <Button variant="secondary" @click="approve">
                Aprobar acta
              </Button>
            </PermissionGate>
            <PermissionGate v-if="act.status === 'approved'" permission="trd_disposicion_editar">
              <Button @click="execute">
                Ejecutar disposición
              </Button>
            </PermissionGate>
          </div>
        </div>

        <p v-if="act.description" class="text-sm whitespace-pre-wrap rounded-md border p-4 bg-muted/30">
          {{ act.description }}
        </p>

        <Card>
          <CardHeader>
            <CardTitle class="text-base">
              Documentos ({{ act.documents?.length ?? 0 }})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul v-if="act.documents?.length" class="space-y-2 text-sm">
              <li v-for="doc in act.documents" :key="doc.id" class="border-b pb-2">
                <span class="font-mono text-xs">{{ doc.credit_application_code }}</span>
                — {{ doc.doc_document_type?.code }} {{ doc.title }}
              </li>
            </ul>
            <p v-else class="text-muted-foreground text-sm">
              Sin documentos asociados.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  </SettingsLayout>
</template>
