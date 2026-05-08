<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { OrgPositionRow, OrgUnitRow } from '~/composables/useOrgStructureApi'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'estructura_org_editar',
})

const router = useRouter()
const route = useRoute()
const positionId = computed(() => Number(route.params.id))
const { $api } = useNuxtApp()
const orgApi = useOrgStructureApi()

const unitOptions = ref<Array<{ id: number; label: string }>>([])
const peerPositions = ref<Array<{ id: number; name: string; code: string }>>([])
const loading = ref(true)

const form = ref({
  org_unit_id: null as number | null,
  name: '',
  code: '',
  hierarchy_level: 1,
  has_subordinates: false,
  reports_to_position_id: null as number | null,
  is_active: true,
})

const saving = ref(false)

const reportsCandidates = computed(() =>
  peerPositions.value.filter((p: { id: number; name: string; code: string }) => p.id !== positionId.value),
)

async function loadUnits() {
  const units = await orgApi.fetchUnits({ activeOnly: false })
  unitOptions.value = units.map((u: OrgUnitRow) => ({
    id: u.id,
    label: `${u.name} (${u.org_office?.name ?? '—'})`,
  }))
}

async function loadPeersForUnit(id: number) {
  const list = await orgApi.fetchPositions({ activeOnly: false, orgUnitId: id })
  peerPositions.value = list.map(p => ({ id: p.id, name: p.name, code: p.code }))
}

watch(() => form.value.org_unit_id, async (id: number | null, prev: number | null | undefined) => {
  if (id == null) {
    peerPositions.value = []
    return
  }
  await loadPeersForUnit(id)
  if (prev != null && prev !== id)
    form.value.reports_to_position_id = null
})

async function loadPosition() {
  loading.value = true
  try {
    await loadUnits()
    const res = await $api<{ data: OrgPositionRow }>(`/organizational-structure/org-positions/${positionId.value}`)
    const p = res.data
    form.value = {
      org_unit_id: p.org_unit_id,
      name: p.name,
      code: p.code,
      hierarchy_level: p.hierarchy_level,
      has_subordinates: p.has_subordinates,
      reports_to_position_id: p.reports_to_position_id,
      is_active: p.is_active,
    }
    await loadPeersForUnit(p.org_unit_id)
  } catch {
    toast.error('No se encontró el cargo')
    router.push('/settings/organizational-structure/positions')
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  if (form.value.org_unit_id == null || !form.value.name.trim() || !form.value.code.trim()) {
    toast.error('Área, nombre y código son obligatorios')
    return
  }
  saving.value = true
  try {
    await $api(`/organizational-structure/org-positions/${positionId.value}`, {
      method: 'PUT',
      body: {
        org_unit_id: form.value.org_unit_id,
        name: form.value.name.trim(),
        code: form.value.code.trim(),
        hierarchy_level: form.value.hierarchy_level,
        has_subordinates: form.value.has_subordinates,
        reports_to_position_id: form.value.reports_to_position_id,
        is_active: form.value.is_active,
      },
    })
    toast.success('Cargo actualizado')
    router.push('/settings/organizational-structure/positions')
  } catch (e: any) {
    toast.error(e?.data?.message || 'Error al guardar')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadPosition()
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <h2 class="text-2xl font-bold tracking-tight">
            Editar cargo
          </h2>
          <p class="text-muted-foreground leading-relaxed">
            Modifique datos del puesto y la relación jerárquica dentro del mismo área.
          </p>
        </div>
        <Button variant="outline" class="shrink-0" @click="router.back()">
          <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>

      <div v-if="loading" class="flex justify-center py-12">
        <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
      </div>

      <form v-else @submit.prevent="handleSubmit">
        <div class="grid gap-6">
          <Card>
            <CardHeader class="gap-2">
              <CardTitle class="leading-snug">Información del cargo</CardTitle>
              <CardDescription class="leading-relaxed">
                Área de adscripción, identificación del puesto y relación jerárquica dentro del mismo área.
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-6">
              <div class="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-x-6 md:gap-y-5">
                <div class="space-y-3 md:col-span-2">
                  <Label for="unit_pe" class="leading-snug">Área *</Label>
                  <Select
                    :model-value="form.org_unit_id == null ? undefined : String(form.org_unit_id)"
                    @update:model-value="(v) => { form.org_unit_id = v ? Number(v) : null }"
                  >
                    <SelectTrigger id="unit_pe">
                      <SelectValue placeholder="Área" />
                    </SelectTrigger>
                    <SelectContent class="max-h-72">
                      <SelectItem
                        v-for="u in unitOptions"
                        :key="u.id"
                        :value="String(u.id)"
                      >
                        {{ u.label }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div class="space-y-3 md:col-span-2 md:grid md:grid-cols-2 md:gap-x-6">
                  <div class="space-y-3">
                    <Label for="name_pe" class="leading-snug">Nombre *</Label>
                    <Input id="name_pe" v-model="form.name" required />
                  </div>
                  <div class="space-y-3">
                    <Label for="code_pe" class="leading-snug">Código *</Label>
                    <Input id="code_pe" v-model="form.code" required />
                  </div>
                </div>

                <div class="space-y-3">
                  <Label for="hl_e" class="leading-snug">Nivel jerárquico</Label>
                  <Input id="hl_e" v-model.number="form.hierarchy_level" type="number" min="1" max="127" />
                </div>

                <div class="space-y-3 rounded-lg border p-4">
                  <div class="flex items-start gap-3 pt-1">
                    <Checkbox id="sub_e" v-model:checked="form.has_subordinates" class="mt-0.5" />
                    <div class="space-y-1.5">
                      <Label for="sub_e" class="text-base leading-snug">Personal a cargo</Label>
                      <p class="text-sm text-muted-foreground leading-relaxed">
                        Active si desde este cargo existe subordinación directa sobre otros cargos o personas.
                      </p>
                    </div>
                  </div>
                </div>

                <div class="space-y-3 md:col-span-2">
                  <Label for="rep_e" class="leading-snug">Reporta a (opcional)</Label>
                  <Select
                    :model-value="form.reports_to_position_id == null ? 'none' : String(form.reports_to_position_id)"
                    :disabled="!form.org_unit_id"
                    @update:model-value="(v) => { form.reports_to_position_id = v === 'none' ? null : Number(v) }"
                  >
                    <SelectTrigger id="rep_e">
                      <SelectValue placeholder="Ninguno" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        (Ninguno)
                      </SelectItem>
                      <SelectItem
                        v-for="r in reportsCandidates"
                        :key="r.id"
                        :value="String(r.id)"
                      >
                        {{ r.name }} — {{ r.code }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div class="space-y-3 rounded-lg border p-4 md:col-span-2">
                  <div class="space-y-1.5">
                    <Label for="position_active_toggle_edit" class="text-base leading-snug">Estado</Label>
                    <p class="text-sm text-muted-foreground leading-relaxed">
                      Los cargos inactivos no se ofrecen al asignar funcionarios ni en flujos de alta.
                    </p>
                  </div>
                  <div class="flex items-center gap-2 pt-1">
                    <Checkbox id="position_active_toggle_edit" v-model:checked="form.is_active" />
                    <Label for="position_active_toggle_edit" class="font-normal leading-snug">
                      Cargo activo
                    </Label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <div class="flex justify-end gap-4">
            <Button type="button" variant="outline" @click="router.back()">
              Cancelar
            </Button>
            <Button type="submit" :disabled="saving">
              <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
              {{ saving ? 'Guardando...' : 'Guardar cambios' }}
            </Button>
          </div>
        </div>
      </form>
    </div>
  </SettingsLayout>
</template>
