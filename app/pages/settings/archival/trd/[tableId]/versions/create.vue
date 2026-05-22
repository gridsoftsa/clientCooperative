<script setup lang="ts">
import { toast } from 'vue-sonner'
import { TRD_RETENTION_APPLICATION_OPTIONS } from '~/constants/archival-trd'
import type { TrdTableRow } from '~/types/archival-trd'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'trd_tablas_editar',
})

const route = useRoute()
const router = useRouter()
const { $api } = useNuxtApp()
const trdApi = useTrdApi()

const tableId = computed(() => Number(route.params.tableId))

const table = ref<TrdTableRow | null>(null)
const form = ref({
  producer_office_name: '',
  producer_office_code: '',
  retention_application_level: 'document_type',
  approved_at: '',
  effective_from: '',
  effective_to: '',
})
const saving = ref(false)

async function loadTable() {
  try {
    table.value = await trdApi.fetchTable(tableId.value)
    if (table.value.org_unit) {
      form.value.producer_office_name = table.value.org_unit.name
      form.value.producer_office_code = table.value.org_unit.code
    }
  } catch {
    toast.error('Tabla TRD no encontrada')
    await router.push('/settings/archival/trd')
  }
}

async function submit() {
  if (!form.value.producer_office_name.trim() || !form.value.producer_office_code.trim()) {
    toast.error('Nombre y código de oficina productora son obligatorios')
    return
  }
  saving.value = true
  try {
    const res = await $api<{ data: { id: number } }>(`/archival/trd-tables/${tableId.value}/versions`, {
      method: 'POST',
      body: {
        producer_office_name: form.value.producer_office_name.trim(),
        producer_office_code: form.value.producer_office_code.trim(),
        retention_application_level: form.value.retention_application_level,
        approved_at: form.value.approved_at || undefined,
        effective_from: form.value.effective_from || undefined,
        effective_to: form.value.effective_to || undefined,
      },
    })
    toast.success('Versión creada en borrador')
    await router.push(trdApi.versionPath(tableId.value, res.data.id))
  } catch (e: any) {
    toast.error(e?.data?.message || 'No se pudo crear la versión')
  } finally {
    saving.value = false
  }
}

onMounted(loadTable)
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4 max-w-2xl">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-2xl font-bold tracking-tight">
          Nueva versión TRD
        </h2>
        <Button variant="outline" @click="router.push(trdApi.tablePath(tableId))">
          Volver
        </Button>
      </div>

      <Card>
        <CardContent class="pt-6 space-y-4">
          <div class="space-y-2">
            <Label>Nombre oficina productora *</Label>
            <Input v-model="form.producer_office_name" />
          </div>
          <div class="space-y-2">
            <Label>Código oficina productora *</Label>
            <Input v-model="form.producer_office_code" maxlength="64" />
          </div>
          <div class="space-y-2">
            <Label>Nivel de aplicación de tiempos *</Label>
            <Select v-model="form.retention_application_level">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="o in TRD_RETENTION_APPLICATION_OPTIONS" :key="o.value" :value="o.value">
                  {{ o.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="grid gap-4 sm:grid-cols-3">
            <div class="space-y-2">
              <Label>Fecha aprobación</Label>
              <Input v-model="form.approved_at" type="date" />
            </div>
            <div class="space-y-2">
              <Label>Vigencia desde</Label>
              <Input v-model="form.effective_from" type="date" />
            </div>
            <div class="space-y-2">
              <Label>Vigencia hasta</Label>
              <Input v-model="form.effective_to" type="date" />
            </div>
          </div>
          <div class="flex justify-end gap-2">
            <Button variant="outline" @click="router.back()">
              Cancelar
            </Button>
            <Button :disabled="saving" @click="submit">
              Crear y configurar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </SettingsLayout>
</template>
