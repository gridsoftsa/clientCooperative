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
  <SettingsLayout :wide="true" hide-intro>
    <div class="flex w-full flex-col gap-6">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div class="space-y-1">
          <Button variant="ghost" size="sm" class="h-8 w-fit -ml-2 px-2" @click="router.push(trdApi.tablePath(tableId))">
            <Icon name="i-lucide-arrow-left" class="mr-1 h-4 w-4" />
            Volver a versiones
          </Button>
          <h2 class="text-2xl font-bold tracking-tight">
            Nueva versión TRD
          </h2>
          <p v-if="table?.org_unit" class="text-sm text-muted-foreground">
            {{ table.org_unit.name }}
            <span class="font-mono">({{ table.org_unit.code }})</span>
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos de la versión</CardTitle>
          <CardDescription>
            Oficina productora, nivel de tiempos y vigencia inicial.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <div class="grid items-start gap-6 lg:grid-cols-2">
            <div class="space-y-2">
              <Label>Nombre oficina productora *</Label>
              <Input v-model="form.producer_office_name" />
            </div>
            <div class="space-y-2">
              <Label>Código oficina productora *</Label>
              <Input v-model="form.producer_office_code" maxlength="64" />
            </div>
            <div class="space-y-2 lg:col-span-2">
              <Label>Nivel de aplicación de tiempos *</Label>
              <Select v-model="form.retention_application_level">
                <SelectTrigger class="max-w-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem v-for="o in TRD_RETENTION_APPLICATION_OPTIONS" :key="o.value" :value="o.value">
                    {{ o.label }}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div class="space-y-2">
              <Label>Fecha aprobación</Label>
              <Input v-model="form.approved_at" type="date" />
            </div>
            <div class="space-y-2">
              <Label>Vigencia desde</Label>
              <Input v-model="form.effective_from" type="date" />
              <p class="text-xs text-muted-foreground">
                La vigencia hasta se calcula automáticamente (1 año) o finaliza al publicar una nueva versión.
              </p>
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
