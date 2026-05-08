<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { OrgOffice } from '~/types/org-structure'
import type { OrgUnitRow } from '~/composables/useOrgStructureApi'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'estructura_org_editar',
})

const router = useRouter()
const route = useRoute()
const unitId = computed(() => Number(route.params.id))
const { $api } = useNuxtApp()
const orgApi = useOrgStructureApi()

const offices = ref<OrgOffice[]>([])
const unitsInOffice = ref<OrgUnitRow[]>([])
const staffOptions = ref<Array<{ id: number; label: string }>>([])
const processes = ref<Array<{ id: number; label: string }>>([])
const loading = ref(true)

const form = ref({
  org_office_id: null as number | null,
  parent_id: null as number | null,
  name: '',
  code: '',
  unit_type: '',
  is_document_producer: false,
  manager_staff_id: null as number | null,
  is_active: true,
  institutional_process_ids: [] as number[],
})

const saving = ref(false)

const parentsFiltered = computed(() =>
  unitsInOffice.value.filter(u => u.id !== unitId.value),
)

async function loadCatalogs() {
  offices.value = await orgApi.fetchOffices({ activeOnly: false })
  const plist = await orgApi.fetchInstitutionalProcesses()
  processes.value = plist.map(p => ({ id: p.id, label: p.label }))
  const staff = await orgApi.fetchStaff({ activeOnly: false })
  staffOptions.value = staff.map((s) => {
    const n = [s.first_name, s.second_name, s.first_last_name, s.second_last_name].filter(Boolean).join(' ')
    return { id: s.id, label: `${n}${s.document_number ? ` · ${s.document_number}` : ''}` }
  })
}

async function refreshUnitsForOffice(id: number) {
  unitsInOffice.value = await orgApi.fetchUnits({ orgOfficeId: id })
}

watch(() => form.value.org_office_id, async (id) => {
  if (id == null) {
    unitsInOffice.value = []
    return
  }
  await refreshUnitsForOffice(id)
})

async function loadUnit() {
  loading.value = true
  try {
    await loadCatalogs()
    const res = await $api<{ data: OrgUnitRow }>(`/organizational-structure/org-units/${unitId.value}`)
    const u = res.data
    form.value = {
      org_office_id: u.org_office_id,
      parent_id: u.parent_id,
      name: u.name,
      code: u.code,
      unit_type: u.unit_type ?? '',
      is_document_producer: u.is_document_producer,
      manager_staff_id: u.manager_staff_id ?? null,
      is_active: u.is_active,
      institutional_process_ids: (u.institutional_processes ?? []).map(x => x.id),
    }
    await refreshUnitsForOffice(u.org_office_id)
  } catch {
    toast.error('No se encontró el área')
    router.push('/settings/organizational-structure/units')
  } finally {
    loading.value = false
  }
}

function toggleProcess(pid: number, checked: boolean) {
  const set = new Set(form.value.institutional_process_ids)
  if (checked)
    set.add(pid)
  else set.delete(pid)
  form.value.institutional_process_ids = [...set].sort((a: number, b: number) => a - b)
}

async function handleSubmit() {
  if (form.value.org_office_id == null || !form.value.name.trim() || !form.value.code.trim()) {
    toast.error('Oficina, nombre y código son obligatorios')
    return
  }
  saving.value = true
  try {
    await $api(`/organizational-structure/org-units/${unitId.value}`, {
      method: 'PUT',
      body: {
        org_office_id: form.value.org_office_id,
        parent_id: form.value.parent_id ?? undefined,
        name: form.value.name.trim(),
        code: form.value.code.trim(),
        unit_type: form.value.unit_type.trim() || null,
        is_document_producer: form.value.is_document_producer,
        manager_staff_id: form.value.manager_staff_id ?? null,
        is_active: form.value.is_active,
        institutional_process_ids: form.value.institutional_process_ids,
      },
    })
    toast.success('Área actualizada')
    router.push('/settings/organizational-structure/units')
  } catch (e: any) {
    toast.error(e?.data?.message || 'Error al guardar')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadUnit()
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <h2 class="text-2xl font-bold tracking-tight">
            Editar área
          </h2>
          <p class="text-muted-foreground leading-relaxed">
            Actualice datos de la dependencia, responsable y procesos institucionales asociados.
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
              <CardTitle class="leading-snug">Información general</CardTitle>
              <CardDescription class="leading-relaxed">
                Identificación y jerarquía dentro de una oficina.
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-6">
              <div class="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-x-6 md:gap-y-5">
                <div class="space-y-3 md:col-span-2 md:grid md:grid-cols-2 md:gap-x-6">
                  <div class="space-y-3">
                    <Label for="office_e" class="leading-snug">Oficina *</Label>
                    <Select
                      :model-value="form.org_office_id == null ? undefined : String(form.org_office_id)"
                      @update:model-value="(v) => { form.org_office_id = v ? Number(v) : null }"
                    >
                      <SelectTrigger id="office_e">
                        <SelectValue placeholder="Seleccione oficina" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          v-for="o in offices"
                          :key="o.id"
                          :value="String(o.id)"
                        >
                          {{ o.name }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div class="space-y-3">
                    <Label for="parent_e" class="leading-snug">Área padre (opcional)</Label>
                    <Select
                      :model-value="form.parent_id == null ? 'none' : String(form.parent_id)"
                      :disabled="!form.org_office_id"
                      @update:model-value="(v) => { form.parent_id = v === 'none' ? null : Number(v) }"
                    >
                      <SelectTrigger id="parent_e">
                        <SelectValue placeholder="Sin padre" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          (Ninguno)
                        </SelectItem>
                        <SelectItem
                          v-for="u in parentsFiltered"
                          :key="u.id"
                          :value="String(u.id)"
                        >
                          {{ u.name }} — {{ u.code }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div class="space-y-3 md:col-span-2 md:grid md:grid-cols-2 md:gap-x-6">
                  <div class="space-y-3">
                    <Label for="name_e" class="leading-snug">Nombre *</Label>
                    <Input id="name_e" v-model="form.name" required />
                  </div>
                  <div class="space-y-3">
                    <Label for="code_e" class="leading-snug">Código *</Label>
                    <Input id="code_e" v-model="form.code" required />
                  </div>
                </div>

                <div class="space-y-3 md:col-span-2">
                  <Label for="unit_type_e" class="leading-snug">Tipo (opcional)</Label>
                  <Input id="unit_type_e" v-model="form.unit_type" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="gap-2">
              <CardTitle class="leading-snug">Responsable, TRD y procesos</CardTitle>
              <CardDescription class="leading-relaxed">
                Mantenga al día el vínculo con procesos y la figura responsable ante documentación.
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-6">
              <div class="space-y-3 rounded-lg border p-4">
                <div class="space-y-1.5">
                  <Label class="text-base leading-snug">Productora documental</Label>
                  <p class="text-sm text-muted-foreground leading-relaxed">
                    Marque si esta dependencia clasifica expedientes conforme TRD/gestión documental.
                  </p>
                </div>
                <div class="flex items-center gap-2 pt-1">
                  <Checkbox id="producer_e" v-model:checked="form.is_document_producer" />
                  <Label for="producer_e" class="font-normal leading-snug">
                    Área productora documental (TRD)
                  </Label>
                </div>
              </div>

              <div class="space-y-3">
                <Label for="mgr_e" class="leading-snug">Jefe del área (opcional)</Label>
                <Select
                  :model-value="form.manager_staff_id == null ? 'none' : String(form.manager_staff_id)"
                  @update:model-value="(v) => { form.manager_staff_id = v === 'none' ? null : Number(v) }"
                >
                  <SelectTrigger id="mgr_e">
                    <SelectValue placeholder="Sin asignar" />
                  </SelectTrigger>
                  <SelectContent class="max-h-60">
                    <SelectItem value="none">
                      (Sin asignar)
                    </SelectItem>
                    <SelectItem
                      v-for="s in staffOptions"
                      :key="s.id"
                      :value="String(s.id)"
                    >
                      {{ s.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div class="space-y-3 rounded-lg border p-4">
                <Label class="text-base leading-snug">Procesos institucionales</Label>
                <p class="text-sm text-muted-foreground leading-relaxed">
                  Opcional: marque los procesos donde participa esta dependencia.
                </p>
                <div class="flex flex-wrap gap-x-6 gap-y-3 max-h-40 overflow-y-auto pt-1">
                  <div
                    v-for="p in processes"
                    :key="p.id"
                    class="flex items-center gap-2"
                  >
                    <Checkbox
                      :checked="form.institutional_process_ids.includes(p.id)"
                      @update:checked="(c) => toggleProcess(p.id, c === true)"
                    />
                    <Label class="font-normal leading-snug">{{ p.label }}</Label>
                  </div>
                </div>
              </div>

              <div class="space-y-3 rounded-lg border p-4">
                <div class="space-y-1.5">
                  <Label for="active_edit_unit" class="text-base leading-snug">Estado</Label>
                  <p class="text-sm text-muted-foreground leading-relaxed">
                    Las áreas inactivas no se proponen en asignaciones ni catálogos de alta por defecto.
                  </p>
                </div>
                <div class="flex items-center gap-2 pt-1">
                  <Checkbox id="active_edit_unit" v-model:checked="form.is_active" />
                  <Label for="active_edit_unit" class="font-normal leading-snug">
                    Área activa
                  </Label>
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
