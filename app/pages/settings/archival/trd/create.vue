<script setup lang="ts">
import { toast } from 'vue-sonner'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'trd_tablas_editar',
})

const { $api } = useNuxtApp()
const router = useRouter()

interface OrgUnitOption {
  id: number
  name: string
  code: string
  is_document_producer?: boolean
}

const units = ref<OrgUnitOption[]>([])
const orgUnitId = ref<number | null>(null)
const notes = ref('')
const loadingUnits = ref(false)
const saving = ref(false)

async function fetchProducerUnits() {
  loadingUnits.value = true
  try {
    const res = await $api<{ data: OrgUnitOption[] }>('/organizational-structure/org-units', {
      query: { per_page: 200, is_active: true },
    })
    units.value = (res.data ?? []).filter(u => u.is_document_producer)
  } catch {
    toast.error('No se pudieron cargar las áreas productoras')
    units.value = []
  } finally {
    loadingUnits.value = false
  }
}

async function submit() {
  if (orgUnitId.value == null) {
    toast.error('Seleccione un área productora')
    return
  }
  saving.value = true
  try {
    await $api('/archival/trd-tables', {
      method: 'POST',
      body: {
        org_unit_id: orgUnitId.value,
        notes: notes.value.trim() || undefined,
      },
    })
    toast.success('Tabla TRD creada')
    router.push('/settings/archival/trd')
  } catch (e: any) {
    const msg = e?.data?.message || e?.data?.errors?.org_unit_id?.[0] || 'No se pudo crear la tabla'
    toast.error(msg)
  } finally {
    saving.value = false
  }
}

onMounted(fetchProducerUnits)
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <h2 class="text-2xl font-bold tracking-tight">
          Nueva tabla TRD
        </h2>
        <Button variant="outline" @click="router.push('/settings/archival/trd')">
          Volver
        </Button>
      </div>

      <Card>
        <CardContent class="pt-6 space-y-4 max-w-xl">
          <p class="text-sm text-muted-foreground leading-relaxed">
            Solo aparecen áreas marcadas como <strong>productoras documentales</strong>. Ya debe existir una sola TRD por área; si existe, use versionamiento desde el API o la UI futura.
          </p>
          <div class="space-y-2">
            <Label for="unit">Área productora *</Label>
            <Select v-model="orgUnitId">
              <SelectTrigger id="unit">
                <SelectValue placeholder="Seleccione…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="u in units" :key="u.id" :value="u.id">
                  {{ u.name }} ({{ u.code }})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label for="notes">Notas</Label>
            <Textarea id="notes" v-model="notes" rows="3" />
          </div>
          <div class="flex justify-end gap-2">
            <Button variant="outline" type="button" @click="router.back()">
              Cancelar
            </Button>
            <Button :disabled="saving || loadingUnits" @click="submit">
              Crear
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </SettingsLayout>
</template>
