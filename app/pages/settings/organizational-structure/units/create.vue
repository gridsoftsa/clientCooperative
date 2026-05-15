<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { OrgYesNoChoice } from '~/constants/org-structure'
import type { OrgOffice } from '~/types/org-structure'
import type { OrgUnitRow } from '~/composables/useOrgStructureApi'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'estructura_org_editar',
})

const router = useRouter()
const { $api } = useNuxtApp()
const orgApi = useOrgStructureApi()

const offices = ref<OrgOffice[]>([])
const unitsInOffice = ref<OrgUnitRow[]>([])
const staffOptions = ref<Array<{ id: number; label: string }>>([])
const processes = ref<Array<{ id: number; label: string }>>([])

const form = ref({
  org_office_id: null as number | null,
  parent_id: null as number | null,
  name: '',
  code: '',
  unit_type: '',
  is_document_producer: false,
  manager_staff_id: null as number | null,
  manager_position_name: '',
  is_active: true,
  institutional_process_ids: [] as number[],
})

const saving = ref(false)

function onUnitActiveChange(value: boolean) {
  form.value.is_active = value
}

async function loadCatalogs() {
  try {
    offices.value = await orgApi.fetchOffices({ activeOnly: true })
    const plist = await orgApi.fetchInstitutionalProcesses()
    processes.value = plist.map(p => ({ id: p.id, label: p.label }))
    const staff = await orgApi.fetchStaff({ activeOnly: true })
    staffOptions.value = staff.map((s) => {
      const n = [s.first_name, s.second_name, s.first_last_name, s.second_last_name].filter(Boolean).join(' ')
      return { id: s.id, label: `${n}${s.document_number ? ` · ${s.document_number}` : ''}` }
    })
  } catch {
    toast.error('Error al cargar catálogos')
  }
}

watch(() => form.value.org_office_id, async (id: number | null) => {
  form.value.parent_id = null
  if (id == null) {
    unitsInOffice.value = []
    return
  }
  try {
    unitsInOffice.value = await orgApi.fetchUnits({ activeOnly: true, orgOfficeId: id })
  } catch {
    unitsInOffice.value = []
  }
})

async function handleSubmit() {
  if (form.value.org_office_id == null || !form.value.name.trim() || !form.value.code.trim()) {
    toast.error('Oficina, nombre y código son obligatorios')
    return
  }
  saving.value = true
  try {
    await $api('/organizational-structure/org-units', {
      method: 'POST',
      body: {
        org_office_id: form.value.org_office_id,
        parent_id: form.value.parent_id ?? undefined,
        name: form.value.name.trim(),
        code: form.value.code.trim(),
        unit_type: form.value.unit_type.trim() || undefined,
        is_document_producer: form.value.is_document_producer,
        manager_staff_id: form.value.manager_staff_id ?? undefined,
        manager_position_name: form.value.manager_position_name.trim() || undefined,
        is_active: form.value.is_active,
        institutional_process_ids:
          form.value.institutional_process_ids.length > 0 ? form.value.institutional_process_ids : undefined,
      },
    })
    toast.success('Área creada')
    router.push('/settings/organizational-structure/units')
  } catch (e: any) {
    toast.error(e?.data?.message || 'Error al crear')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadCatalogs()
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <h2 class="text-2xl font-bold tracking-tight">
            Nueva área / dependencia
          </h2>
          <p class="text-muted-foreground leading-relaxed">
            Debe pertenecer a una oficina. Opcionalmente defina área padre dentro de la misma oficina.
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
              <CardTitle class="leading-snug">Información general</CardTitle>
              <CardDescription class="leading-relaxed">
                Identificación y jerarquía dentro de una oficina.
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-6">
              <div class="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-x-6 md:gap-y-5">
                <div class="space-y-3 md:col-span-2 md:grid md:grid-cols-2 md:gap-x-6">
                  <div class="space-y-3">
                    <Label for="office" class="leading-snug">Oficina *</Label>
                    <Select
                      :model-value="form.org_office_id == null ? '' : String(form.org_office_id)"
                      @update:model-value="(v) => { form.org_office_id = v ? Number(v) : null }"
                    >
                      <SelectTrigger id="office">
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
                    <Label for="parent" class="leading-snug">Área padre (opcional)</Label>
                    <Select
                      :model-value="form.parent_id == null ? 'none' : String(form.parent_id)"
                      :disabled="!form.org_office_id"
                      @update:model-value="(v) => { form.parent_id = v === 'none' ? null : Number(v) }"
                    >
                      <SelectTrigger id="parent">
                        <SelectValue placeholder="Sin padre — raíz del área" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">
                          (Ninguno)
                        </SelectItem>
                        <SelectItem
                          v-for="u in unitsInOffice"
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
                    <Label for="name" class="leading-snug">Nombre *</Label>
                    <Input id="name" v-model="form.name" required />
                  </div>
                  <div class="space-y-3">
                    <Label for="code" class="leading-snug">Código *</Label>
                    <Input id="code" v-model="form.code" required />
                  </div>
                </div>

                <div class="space-y-3 md:col-span-2">
                  <Label for="unit_type" class="leading-snug">Tipo (opcional)</Label>
                  <Input id="unit_type" v-model="form.unit_type" placeholder="Ej: Subdirección, Sección…" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="gap-2">
              <CardTitle class="leading-snug">Responsable, TRD y procesos</CardTitle>
              <CardDescription class="leading-relaxed">
                Vincule el área al catálogo de procesos institucionales y al responsable de documentación.
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-6">
              <div class="space-y-3 rounded-lg border p-4 md:col-span-2">
                <OrgYesNoMultiselect
                  :model-value="form.is_document_producer ? 'yes' : 'no'"
                  input-id="unit_create_doc_producer_ms"
                  label="¿Es área productora documental (TRD)?"
                  helper-text="Seleccione Sí si esta dependencia clasifica expedientes conforme TRD/gestión documental."
                  @update:model-value="(v: OrgYesNoChoice) => { form.is_document_producer = v === 'yes' }"
                />
              </div>

              <div class="space-y-3">
                <Label for="mgr" class="leading-snug">Responsable / jefe del área (opcional)</Label>
                <Select
                  :model-value="form.manager_staff_id == null ? 'none' : String(form.manager_staff_id)"
                  @update:model-value="(v) => { form.manager_staff_id = v === 'none' ? null : Number(v) }"
                >
                  <SelectTrigger id="mgr">
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

              <div class="space-y-3">
                <Label for="mgr_pos_name" class="leading-snug">Nombre del cargo de jefe de área (referencia)</Label>
                <p class="text-sm text-muted-foreground leading-relaxed">
                  Opcional: texto del puesto que encabeza el área. Puede completarse al crear un cargo marcado «a cargo del área».
                </p>
                <Input id="mgr_pos_name" v-model="form.manager_position_name" placeholder="Ej: Coordinador de área" />
              </div>

              <div class="rounded-lg border p-4">
                <OrgInstitutionalProcessesMultiselect
                  v-model="form.institutional_process_ids"
                  :options="processes"
                  input-id="unit_create_inst_proc_ms"
                  label="Procesos institucionales asociados"
                  helper-text="Opcional: seleccione los procesos en los que participa esta dependencia."
                />
              </div>

              <OrgStructureActiveMultiselect
                :model-value="form.is_active"
                gender="feminine"
                input-id="unit_create_active_ms"
                helper-text="Las áreas inactivas no se proponen en asignaciones ni catálogos de alta por defecto."
                @update:model-value="onUnitActiveChange"
              />
            </CardContent>
          </Card>

          <div class="flex justify-end gap-4">
            <Button type="button" variant="outline" @click="router.back()">
              Cancelar
            </Button>
            <Button type="submit" :disabled="saving">
              <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
              {{ saving ? 'Guardando...' : 'Crear área' }}
            </Button>
          </div>
        </div>
      </form>
    </div>
  </SettingsLayout>
</template>
