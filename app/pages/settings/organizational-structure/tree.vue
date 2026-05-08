<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { OrgOffice } from '~/types/org-structure'

type TreeOffice = OrgOffice & {
  org_units?: TreeUnit[]
}

interface TreeUnit {
  id: number
  name: string
  code: string
  is_document_producer: boolean
  org_positions?: Array<{ id: number; name: string; code: string; hierarchy_level: number }>
}

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'estructura_org_ver',
})

const { $api } = useNuxtApp()
const router = useRouter()

const tree = ref<TreeOffice[]>([])
const loading = ref(false)

async function loadTree() {
  loading.value = true
  try {
    const res = await $api<{ data: TreeOffice[] }>('/organizational-structure/meta/tree', {
      query: { active_only: true },
    })
    tree.value = res.data
  } catch {
    toast.error('No se pudo cargar el organigrama')
    tree.value = []
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadTree()
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1 max-w-3xl">
          <Button variant="ghost" size="sm" class="h-8 w-fit -ml-2 px-2" @click="router.push('/settings/organizational-structure')">
            <Icon name="i-lucide-arrow-left" class="mr-1 h-4 w-4" />
            Módulo
          </Button>
          <h2 class="text-2xl font-bold tracking-tight">
            Organigrama
          </h2>
          <p class="text-muted-foreground leading-relaxed">
            Solo elementos activos. La edición se realiza desde cada catálogo.
          </p>
        </div>
        <Button variant="outline" size="sm" class="shrink-0" :disabled="loading" @click="loadTree">
          <Icon name="i-lucide-refresh-cw" class="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </div>

      <Card>
        <CardHeader class="gap-2">
          <CardTitle class="leading-snug">
            Jerarquía de oficinas, áreas y cargos
          </CardTitle>
          <CardDescription class="leading-relaxed">
            Vista arbórea sólo lectura conforme registros vigentes activos en el sistema.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div v-if="loading" class="flex justify-center py-12">
            <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
          <div v-else-if="tree.length === 0" class="py-12 text-center text-muted-foreground">
            Sin datos de estructura. Cree al menos una oficina y áreas.
          </div>
          <ul v-else class="space-y-6 text-sm">
            <li v-for="office in tree" :key="office.id" class="rounded-lg border bg-card p-4">
              <div class="font-semibold text-base flex flex-wrap items-center gap-2">
                <Icon name="i-lucide-building-2" class="h-4 w-4 shrink-0" />
                {{ office.name }}
                <Badge variant="outline">{{ office.code }}</Badge>
              </div>
              <ul v-if="office.org_units?.length" class="mt-3 ml-4 space-y-3 border-l pl-4">
                <li v-for="unit in office.org_units" :key="unit.id">
                  <div class="font-medium flex flex-wrap items-center gap-2">
                    {{ unit.name }}
                    <Badge v-if="unit.is_document_producer" variant="secondary" class="text-xs">
                      Productora documental
                    </Badge>
                  </div>
                  <ul
                    v-if="unit.org_positions?.length"
                    class="mt-2 ml-3 text-muted-foreground space-y-1"
                  >
                    <li v-for="pos in unit.org_positions" :key="pos.id">
                      <span class="text-foreground">{{ pos.name }}</span>
                      <span class="text-xs"> (nivel {{ pos.hierarchy_level }})</span>
                    </li>
                  </ul>
                </li>
              </ul>
            </li>
          </ul>
        </CardContent>
      </Card>
    </div>
  </SettingsLayout>
</template>
