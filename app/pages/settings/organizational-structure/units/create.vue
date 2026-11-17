<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { OrgYesNoChoice } from '~/constants/org-structure'
import type { OrgOffice } from '~/types/org-structure'
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

const offices = ref<OrgOffice[]>([])
const unitsInOffice = ref<OrgUnitRow[]>([])
const allUnits = ref<OrgUnitRow[]>([])

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
  valid_from: todayIsoDateString(),
  valid_to: '',
  related_org_unit_ids: [] as number[],
})

const saving = ref(false)
const submitAttempted = ref(false)

function onUnitActiveChange(value: boolean) {
  form.value.is_active = value
}

const areaOptions = computed(() =>
  allUnits.value.map((u) => {
    const officeName = u.org_office?.name
    return {
      id: u.id,
      label: officeName ? `${u.name} · ${officeName}` : `${u.name} (${u.code})`,
    }
  }),
)

const officeSelectOptions = computed(() =>
  offices.value.map(o => ({
    value: o.id,
    label: o.name,
  })),
)

const parentSelectOptions = computed(() =>
  unitsInOffice.value.map(u => ({
    value: u.id,
    label: `${u.name} — ${u.code}`,
  })),
)

const hasOffice = computed(() => form.value.org_office_id != null)

type RequiredField = 'org_office_id' | 'name' | 'code' | 'valid_from'

const requiredFieldIds: Record<RequiredField, string> = {
  org_office_id: 'office',
  name: 'name',
  code: 'code',
  valid_from: 'unit_create_valid_from',
}

function isFieldMissing(field: RequiredField): boolean {
  if (field === 'org_office_id') {
    return form.value.org_office_id == null
  }
  if (field === 'name') {
    return !form.value.name.trim()
  }
  if (field === 'code') {
    return !form.value.code.trim()
  }
  return !form.value.valid_from.trim()
}

function firstMissingField(): RequiredField | null {
  const order: RequiredField[] = ['org_office_id', 'name', 'code', 'valid_from']
  return order.find(field => isFieldMissing(field)) ?? null
}

function fieldErrorClass(missing: boolean): string {
  return missing ? 'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/40' : ''
}

function formFieldErrorClass(field: 'name' | 'code'): string {
  return fieldErrorClass(submitAttempted.value && isFieldMissing(field))
}

function officeMultiselectErrorClass(): string {
  return submitAttempted.value && isFieldMissing('org_office_id')
    ? 'archival-single-multiselect-danger'
    : ''
}

function focusByElementId(id: string): void {
  const root = document.getElementById(id)
  if (!root) {
    return
  }
  if (root instanceof HTMLInputElement || root instanceof HTMLTextAreaElement || root instanceof HTMLSelectElement) {
    root.focus()
    root.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }
  const focusable = root.querySelector('input,button,[tabindex]:not([tabindex="-1"])') as HTMLElement | null
  focusable?.focus()
  root.scrollIntoView({ behavior: 'smooth', block: 'center' })
}

watch(form, () => {
  if (!submitAttempted.value) {
    return
  }
  if (!firstMissingField()) {
    submitAttempted.value = false
  }
}, { deep: true })

async function loadCatalogs() {
  try {
    offices.value = await orgApi.fetchOffices({ activeOnly: true })
    allUnits.value = await orgApi.fetchUnits({ activeOnly: true })
  }
  catch {
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
  }
  catch {
    unitsInOffice.value = []
  }
})

async function handleSubmit() {
  submitAttempted.value = true
  const firstMissing = firstMissingField()
  if (firstMissing) {
    const messages: Record<RequiredField, string> = {
      org_office_id: 'Seleccione la agencia a la que pertenece el área',
      name: 'El nombre del área es obligatorio',
      code: 'El código del área es obligatorio',
      valid_from: 'La fecha de inicio de vigencia es obligatoria',
    }
    toast.error(messages[firstMissing])
    await nextTick()
    focusByElementId(requiredFieldIds[firstMissing])
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
        valid_from: form.value.valid_from.trim(),
        valid_to: form.value.valid_to.trim() || null,
        related_org_unit_ids:
          form.value.related_org_unit_ids.length > 0 ? form.value.related_org_unit_ids : undefined,
      },
    })
    toast.success('Área creada')
    router.push('/settings/organizational-structure/units')
  }
  catch (e: any) {
    const fieldErrors = e?.data?.errors as Record<string, string[]> | undefined
    const firstFieldError = fieldErrors
      ? Object.values(fieldErrors).flat().find(message => typeof message === 'string' && message.trim() !== '')
      : undefined
    toast.error(firstFieldError || e?.data?.message || 'Error al crear')
  }
  finally {
    saving.value = false
  }
}

onMounted(() => {
  loadCatalogs()
})
</script>

<template>
  <SettingsLayout :wide="true" hide-intro>
    <div class="flex w-full flex-col gap-6">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <h2 class="text-2xl font-bold tracking-tight">
            Nueva área / dependencia
          </h2>
          <p class="text-muted-foreground leading-relaxed max-w-3xl">
            Primero elija la agencia. Después puede indicar un área padre de esa misma sede, el nombre y el código con los que aparecerá en el organigrama y la TRD.
          </p>
        </div>
        <PageBackButton to="/settings/organizational-structure/units" class="shrink-0">
          Volver a áreas
        </PageBackButton>
      </div>

      <form class="max-w-5xl space-y-6" novalidate @submit.prevent="handleSubmit">
        <Card>
          <CardHeader class="gap-2">
            <CardTitle class="leading-snug">
              Ubicación e identificación
            </CardTitle>
            <CardDescription class="leading-relaxed">
              Los campos con * son obligatorios. El área padre solo se habilita cuando ya hay una agencia.
            </CardDescription>
          </CardHeader>
          <CardContent class="grid grid-cols-1 items-start gap-6 md:grid-cols-2">
            <div class="flex min-w-0 flex-col gap-2">
              <Label for="office" class="leading-snug">Agencia *</Label>
              <ArchivalSingleMultiselect
                id="office"
                v-model="form.org_office_id"
                coerce-number
                :can-clear="false"
                :options="officeSelectOptions"
                :class="officeMultiselectErrorClass()"
                placeholder="Buscar y seleccionar agencia"
                no-options-text="No hay agencias activas"
                no-results-text="Sin coincidencias"
              />
              <p
                v-if="submitAttempted && isFieldMissing('org_office_id')"
                class="text-sm text-destructive"
              >
                Seleccione una agencia.
              </p>
              <p v-else class="text-xs leading-5 text-muted-foreground">
                Sede a la que pertenece esta dependencia.
              </p>
            </div>

            <div class="flex min-w-0 flex-col gap-2">
              <Label for="parent" class="leading-snug">Área padre</Label>
              <ArchivalSingleMultiselect
                v-if="hasOffice"
                id="parent"
                :key="`parent-${form.org_office_id}-${parentSelectOptions.length}`"
                v-model="form.parent_id"
                coerce-number
                searchable
                :options="parentSelectOptions"
                placeholder="Opcional: área de la misma agencia"
                no-options-text="Esta agencia aún no tiene otras áreas"
                no-results-text="Sin coincidencias"
              />
              <div
                v-else
                class="flex h-11 items-center rounded-md border border-dashed bg-muted/20 px-3 text-sm text-muted-foreground"
              >
                Elija primero una agencia para listar las áreas padre
              </div>
              <p class="text-xs leading-5 text-muted-foreground">
                Opcional. Si no elige padre, esta dependencia queda como área raíz de la agencia.
              </p>
            </div>

            <div class="flex min-w-0 flex-col gap-2">
              <Label for="name" class="leading-snug">Nombre *</Label>
              <Input
                id="name"
                v-model="form.name"
                :class="`h-11 ${formFieldErrorClass('name')}`"
                :aria-invalid="submitAttempted && isFieldMissing('name') ? true : undefined"
                placeholder="Ej: Dirección financiera"
                autocomplete="off"
              />
              <p class="text-xs leading-5 text-muted-foreground">
                Nombre visible en organigrama y TRD.
              </p>
            </div>

            <div class="flex min-w-0 flex-col gap-2">
              <Label for="code" class="leading-snug">Código *</Label>
              <Input
                id="code"
                v-model="form.code"
                :class="`h-11 ${formFieldErrorClass('code')}`"
                :aria-invalid="submitAttempted && isFieldMissing('code') ? true : undefined"
                maxlength="64"
                placeholder="Ej: 0014"
                autocomplete="off"
              />
              <p class="text-xs leading-5 text-muted-foreground">
                Clave corta, única en el catálogo.
              </p>
            </div>

            <div class="flex min-w-0 flex-col gap-2">
              <Label for="unit_type" class="leading-snug">Tipo</Label>
              <Input id="unit_type" v-model="form.unit_type" placeholder="Ej: Subdirección, Sección…" class="h-11" />
              <p class="text-xs leading-5 text-muted-foreground">
                Opcional. Clasificación interna de la dependencia.
              </p>
            </div>

            <OrgYesNoMultiselect
              class="!space-y-2"
              :model-value="form.is_document_producer ? 'yes' : 'no'"
              input-id="unit_create_doc_producer_ms"
              label="¿Productora documental (TRD)?"
              helper-text="Sí si esta dependencia clasifica expedientes conforme a su tabla de retención."
              @update:model-value="(v: OrgYesNoChoice) => { form.is_document_producer = v === 'yes' }"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="gap-2">
            <CardTitle class="leading-snug">
              Responsable y relaciones
            </CardTitle>
            <CardDescription class="leading-relaxed">
              El jefe del área se asigna al editarla, cuando ya existan funcionarios con ubicación vigente. Aquí solo puede dejar una referencia de cargo y relacionar otras áreas.
            </CardDescription>
          </CardHeader>
          <CardContent class="grid grid-cols-1 items-start gap-6">
            <div class="flex min-w-0 flex-col gap-2 md:max-w-xl">
              <Label for="mgr_pos_name" class="leading-snug">Cargo de jefe (referencia)</Label>
              <Input id="mgr_pos_name" v-model="form.manager_position_name" placeholder="Ej: Coordinador de área" class="h-11" />
              <p class="text-xs leading-5 text-muted-foreground">
                Opcional. Puede completarse al crear un cargo «a cargo del área».
              </p>
            </div>
            <OrgInstitutionalProcessesMultiselect
              v-model="form.related_org_unit_ids"
              :options="areaOptions"
              input-id="unit_create_related_areas_ms"
              label="Áreas asociadas"
              helper-text="Opcional: otras áreas ya creadas (colaboración, procesos compartidos)."
              placeholder="Busque y seleccione áreas creadas"
              no-options-text="No hay áreas creadas aún"
              no-results-text="Sin coincidencias"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="gap-2">
            <CardTitle class="leading-snug">
              Vigencia y estado
            </CardTitle>
            <CardDescription class="leading-relaxed">
              La fecha de inicio es obligatoria para conservar el histórico.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-6">
            <OrgStructureValidityPeriodFields
              v-model:valid-from="form.valid_from"
              v-model:valid-to="form.valid_to"
              from-input-id="unit_create_valid_from"
              to-input-id="unit_create_valid_to"
            />
            <OrgStructureActiveMultiselect
              :model-value="form.is_active"
              gender="feminine"
              input-id="unit_create_active_ms"
              helper-text="Las áreas inactivas no se proponen en asignaciones ni catálogos de alta por defecto."
              @update:model-value="onUnitActiveChange"
            />
          </CardContent>
        </Card>

        <div class="flex justify-end gap-3">
          <Button type="button" variant="outline" @click="router.push('/settings/organizational-structure/units')">
            Cancelar
          </Button>
          <Button type="submit" :disabled="saving">
            <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
            {{ saving ? 'Guardando...' : 'Crear área' }}
          </Button>
        </div>
      </form>
    </div>
  </SettingsLayout>
</template>
