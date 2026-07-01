<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { ArchivalFileType } from '~/types/archival-file'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'expedientes_crear',
})

const router = useRouter()
const archivalApi = useArchivalFileApi()
const { $api } = useNuxtApp()
const api = $api as <T>(url: string, options?: Record<string, unknown>) => Promise<T>

const loading = ref(true)
const saving = ref(false)
const types = ref<ArchivalFileType[]>([])
const orgUnits = ref<Array<{ id: number, name: string }>>([])

const form = reactive({
  archival_file_type_id: '',
  title: '',
  org_unit_id: '',
  entity_key: '',
  entity_label: '',
})

async function loadMeta() {
  loading.value = true

  try {
    types.value = await archivalApi.fetchFileTypes()
    const res = await api<{ data: Array<{ id: number, name: string }> }>('/organizational-structure/org-units')
    orgUnits.value = res.data ?? []
  }
  finally {
    loading.value = false
  }
}

async function submit() {
  saving.value = true

  try {
    const res = await archivalApi.createFile({
      archival_file_type_id: Number(form.archival_file_type_id),
      title: form.title,
      org_unit_id: Number(form.org_unit_id),
      entity_key: form.entity_key || undefined,
      entity_label: form.entity_label || undefined,
    })
    toast.success(res.message)
    await router.push(`/expedientes/${res.data.id}`)
  }
  catch {
    toast.error('No se pudo crear el expediente.')
  }
  finally {
    saving.value = false
  }
}

onMounted(() => loadMeta())
</script>

<template>
  <div class="mx-auto max-w-2xl space-y-6">
    <div>
      <h1 class="text-2xl font-semibold tracking-tight">
        Nuevo expediente
      </h1>
      <p class="text-sm text-muted-foreground">
        Creación manual de expediente electrónico.
      </p>
    </div>

    <Card>
      <CardContent class="space-y-4 pt-6">
        <div v-if="loading" class="py-8 text-center text-muted-foreground">
          Cargando...
        </div>
        <template v-else>
          <div class="space-y-2">
            <Label>Tipo de expediente</Label>
            <Select v-model="form.archival_file_type_id">
              <SelectTrigger>
                <SelectValue placeholder="Seleccione tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="type in types"
                  :key="type.id"
                  :value="String(type.id)"
                >
                  {{ type.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label>Título</Label>
            <Input v-model="form.title" placeholder="Ej. Expediente de crédito 2026-001" />
          </div>

          <div class="space-y-2">
            <Label>Área responsable</Label>
            <Select v-model="form.org_unit_id">
              <SelectTrigger>
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

          <div class="grid gap-4 md:grid-cols-2">
            <div class="space-y-2">
              <Label>Identificador (cédula/NIT)</Label>
              <Input v-model="form.entity_key" />
            </div>
            <div class="space-y-2">
              <Label>Nombre entidad</Label>
              <Input v-model="form.entity_label" />
            </div>
          </div>

          <div class="flex justify-end gap-2">
            <Button variant="outline" @click="router.push('/expedientes')">
              Cancelar
            </Button>
            <Button :disabled="saving" @click="submit">
              Crear expediente
            </Button>
          </div>
        </template>
      </CardContent>
    </Card>
  </div>
</template>
