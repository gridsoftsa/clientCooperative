<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { ArchivalFileTreeNode } from '~/types/archival-file'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'expedientes_area_ver',
})

const archivalApi = useArchivalFileApi()
const { $api } = useNuxtApp()
const api = $api as <T>(url: string, options?: Record<string, unknown>) => Promise<T>
const orgUnits = ref<Array<{ id: number, name: string }>>([])
const orgUnitId = ref('')
const loading = ref(false)
const tree = ref<ArchivalFileTreeNode | null>(null)

async function loadOrgUnits() {
  try {
    const res = await api<{ data: Array<{ id: number, name: string }> }>('/organizational-structure/org-units')
    orgUnits.value = res.data ?? []
    if (orgUnits.value[0])
      orgUnitId.value = String(orgUnits.value[0].id)
  }
  catch {
    orgUnits.value = []
  }
}

async function loadRepository() {
  if (!orgUnitId.value)
    return

  loading.value = true

  try {
    tree.value = await archivalApi.fetchAreaRepository(Number(orgUnitId.value))
  }
  catch {
    toast.error('No se pudo cargar el repositorio del área.')
    tree.value = null
  }
  finally {
    loading.value = false
  }
}

onMounted(async () => {
  await loadOrgUnits()
  await loadRepository()
})
</script>

<template>
  <div class="space-y-6">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">
        Repositorio por área
      </h1>
      <p class="text-sm text-muted-foreground">
        Documentación organizada por TRD: área → serie → subserie → tipo documental.
      </p>
    </div>

    <Card>
      <CardHeader>
        <div class="flex flex-wrap items-end gap-3">
          <div class="space-y-2">
            <Label>Área productora</Label>
            <Select v-model="orgUnitId" @update:model-value="loadRepository">
              <SelectTrigger class="w-72">
                <SelectValue placeholder="Seleccione área" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="unit in orgUnits"
                  :key="unit.id"
                  :value="String(unit.id)"
                >
                  {{ unit.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button variant="secondary" @click="loadRepository">
            Actualizar
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div v-if="loading" class="py-10 text-center text-muted-foreground">
          Cargando repositorio...
        </div>
        <ArchivalFileTreeItem v-else-if="tree" :node="tree" />
        <div v-else class="py-10 text-center text-muted-foreground">
          Seleccione un área para consultar su documentación.
        </div>
      </CardContent>
    </Card>
  </div>
</template>
