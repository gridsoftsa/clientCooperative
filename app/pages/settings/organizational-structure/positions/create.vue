<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { OrgYesNoChoice } from '~/constants/org-structure'
import type { OrgUnitRow } from '~/composables/useOrgStructureApi'
import { todayIsoDateString } from '~/utils/dateInputValue'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'estructura_org_editar',
})

const router = useRouter()
const { $api } = useNuxtApp()
const orgApi = useOrgStructureApi()

const unitOptions = ref<Array<{ id: number; label: string }>>([])
const peerPositions = ref<Array<{ id: number; name: string; code: string }>>([])

const chargesSelectedArea = ref<OrgYesNoChoice>('no')

const form = ref({
  org_unit_id: null as number | null,
  name: '',
  code: '',
  hierarchy_level: 1,
  has_subordinates: false,
  reports_to_position_id: null as number | null,
  is_active: true,
  valid_from: todayIsoDateString(),
  valid_to: '',
})

const saving = ref(false)

function onPositionActiveChange(value: boolean) {
  form.value.is_active = value
}

async function loadUnits() {
  const units = await orgApi.fetchUnits({ activeOnly: true })
  unitOptions.value = units.map((u: OrgUnitRow) => ({
    id: u.id,
    label: `${u.name} (${u.org_office?.name ?? '—'})`,
  }))
}

watch(() => form.value.org_unit_id, async (id: number | null) => {
  form.value.reports_to_position_id = null
  chargesSelectedArea.value = 'no'
  if (id == null) {
    peerPositions.value = []
    return
  }
  const list = await orgApi.fetchPositions({
    activeOnly: true,
    orgUnitId: id,
    managerOfOrgUnitOnly: true,
  })
  peerPositions.value = list.map(p => ({ id: p.id, name: p.name, code: p.code }))
})

async function handleSubmit() {
  if (form.value.org_unit_id == null || !form.value.name.trim() || !form.value.code.trim()) {
    toast.error('Área, nombre y código son obligatorios')
    return
  }
  saving.value = true
  try {
    await $api('/organizational-structure/org-positions', {
      method: 'POST',
      body: {
        org_unit_id: form.value.org_unit_id,
        name: form.value.name.trim(),
        code: form.value.code.trim(),
        hierarchy_level: form.value.hierarchy_level,
        has_subordinates: form.value.has_subordinates,
        reports_to_position_id: form.value.reports_to_position_id ?? undefined,
        is_active: form.value.is_active,
        valid_from: form.value.valid_from.trim(),
        valid_to: form.value.valid_to.trim() || null,
        sync_manager_position_name_to_unit: chargesSelectedArea.value === 'yes',
      },
    })
    toast.success('Cargo creado')
    router.push('/settings/organizational-structure/positions')
  } catch (e: any) {
    toast.error(e?.data?.message || 'Error al crear')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadUnits().catch(() => toast.error('Error al cargar áreas'))
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <h2 class="text-2xl font-bold tracking-tight">
            Nuevo cargo
          </h2>
          <p class="text-muted-foreground leading-relaxed">
            En «Reporta a» solo se listan cargos que ya estén marcados como referencia de jefe de área en el mismo área (al crear o editar otro cargo con «¿Este cargo está a cargo del área elegida?» en Sí).
          </p>
        </div>
        <Button variant="outline" class="shrink-0" @click="router.back()">
          <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>

      <form @submit.prevent="handleSubmit">
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
                <div class="space-y-3 md:col-span-2 md:grid md:grid-cols-2 md:gap-x-6 md:gap-y-5 md:items-start">
                  <div class="space-y-3">
                    <Label for="unit_p" class="leading-snug">Área *</Label>
                    <Select
                      :model-value="form.org_unit_id == null ? undefined : String(form.org_unit_id)"
                      @update:model-value="(v) => { form.org_unit_id = v ? Number(v) : null }"
                    >
                      <SelectTrigger id="unit_p">
                        <SelectValue placeholder="Seleccione área" />
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
                  <OrgYesNoMultiselect
                    v-model="chargesSelectedArea"
                    input-id="position_charges_area_ms"
                    label="¿Este cargo está a cargo del área elegida?"
                    helper-text="Si elige Sí, al guardar se guardará el nombre de este cargo en el área (referencia de jefe de área), además del catálogo de cargos."
                    :disabled="form.org_unit_id == null"
                  />
                </div>

                <div class="space-y-3 md:col-span-2 md:grid md:grid-cols-2 md:gap-x-6">
                  <div class="space-y-3">
                    <Label for="name_p" class="leading-snug">Nombre *</Label>
                    <Input id="name_p" v-model="form.name" required />
                  </div>
                  <div class="space-y-3">
                    <Label for="code_p" class="leading-snug">Código *</Label>
                    <Input id="code_p" v-model="form.code" required />
                  </div>
                </div>

                <div class="space-y-3">
                  <Label for="hl" class="leading-snug">Nivel jerárquico</Label>
                  <Input id="hl" v-model.number="form.hierarchy_level" type="number" min="1" max="127" />
                </div>

                <div class="space-y-3 rounded-lg border p-4">
                  <OrgYesNoMultiselect
                    :model-value="form.has_subordinates ? 'yes' : 'no'"
                    input-id="position_create_subordinates_ms"
                    label="¿Tiene personal a cargo?"
                    helper-text="Elija Sí si desde este cargo existe subordinación directa sobre otros cargos o personas."
                    @update:model-value="(v: OrgYesNoChoice) => { form.has_subordinates = v === 'yes' }"
                  />
                </div>

                <div class="space-y-3 md:col-span-2">
                  <Label for="rep" class="leading-snug">Reporta a (opcional)</Label>
                  <p class="text-xs text-muted-foreground leading-relaxed">
                    Si no aparece ningún cargo, cree antes uno con «¿Este cargo está a cargo del área elegida?» en Sí o revise el área seleccionada.
                  </p>
                  <Select
                    :model-value="form.reports_to_position_id == null ? 'none' : String(form.reports_to_position_id)"
                    :disabled="!form.org_unit_id"
                    @update:model-value="(v) => { form.reports_to_position_id = v === 'none' ? null : Number(v) }"
                  >
                    <SelectTrigger id="rep">
                      <SelectValue placeholder="Sin jefe inmediato en catálogo" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">
                        (Ninguno)
                      </SelectItem>
                      <SelectItem
                        v-for="r in peerPositions"
                        :key="r.id"
                        :value="String(r.id)"
                      >
                        {{ r.name }} — {{ r.code }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                </div>

                <OrgStructureValidityPeriodFields
                  v-model:valid-from="form.valid_from"
                  v-model:valid-to="form.valid_to"
                  from-input-id="position_create_valid_from"
                  to-input-id="position_create_valid_to"
                />

                <OrgStructureActiveMultiselect
                  :model-value="form.is_active"
                  gender="masculine"
                  input-id="position_create_active_ms"
                helper-text="Los cargos inactivos no se ofrecen al asignar funcionarios ni en flujos de alta."
                @update:model-value="onPositionActiveChange"
              />
            </CardContent>
          </Card>

          <div class="flex justify-end gap-4">
            <Button type="button" variant="outline" @click="router.back()">
              Cancelar
            </Button>
            <Button type="submit" :disabled="saving">
              <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
              {{ saving ? 'Guardando...' : 'Crear cargo' }}
            </Button>
          </div>
        </div>
      </form>
    </div>
  </SettingsLayout>
</template>
