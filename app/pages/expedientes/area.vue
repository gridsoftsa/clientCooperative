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
    if (orgUnits.value[0]) {
      orgUnitId.value = String(orgUnits.value[0].id)
    }
  }
  catch {
    orgUnits.value = []
  }
}

async function loadRepository() {
  if (!orgUnitId.value) {
    return
  }

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
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">
          Repositorio por área
        </h1>
        <p class="mt-1 max-w-3xl text-sm text-muted-foreground">
          Navegue por carpetas TRD (área, serie, subserie, tipo documental) y consulte los documentos en paralelo.
        </p>
      </div>
    </div>

    <Card>
      <CardHeader class="pb-4">
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
      <CardContent class="p-0 sm:p-0">
        <ArchivalFileAreaRepositoryBrowser
          :tree="tree"
          :org-unit-id="Number(orgUnitId)"
          :loading="loading"
          @uploaded="loadRepository"
        />
      </CardContent>
    </Card>
  </div>
</template>
