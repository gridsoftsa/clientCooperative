<script setup lang="ts">
import Multiselect from '@vueform/multiselect'
import type { ApplicantForm } from '~/types/credit-application'

const props = defineProps<{
  modelValue: ApplicantForm
  showSearch?: boolean
  loadingSearch?: boolean
  /** @deprecated Usar catálogo local useMunicipalities(); se mantiene por compatibilidad */
  cities?: Array<{ id: number; name: string; department?: string }>
  onSearch?: () => void
}>()

const emit = defineEmits<{
  'update:modelValue': [ApplicantForm]
}>()

const local = computed({
  get: () => props.modelValue,
  set: (v: ApplicantForm) => emit('update:modelValue', v),
})

const { multiselectOptionsByCity, multiselectOptionsByLabel } = useMunicipalities()

const documentTypes = [
  { value: 'CC', label: 'Cédula de Ciudadanía' },
  { value: 'CE', label: 'Cédula de Extranjería' },
  { value: 'NIT', label: 'NIT' },
]

const residenceTypes = [
  { value: 'Propia', label: 'Propia' },
  { value: 'Familiar', label: 'Familiar' },
  { value: 'Arriendo', label: 'Arriendo' },
]

const maritalStatuses = [
  { value: 'Soltero', label: 'Soltero(a)' },
  { value: 'Casado', label: 'Casado(a)' },
  { value: 'Union Libre', label: 'Unión Libre' },
  { value: 'Divorciado', label: 'Divorciado(a)' },
  { value: 'Viudo', label: 'Viudo(a)' },
]

const sectionClass = 'space-y-4'
const sectionTitleClass = 'text-sm font-semibold text-foreground border-b pb-2 mb-1'
const fieldClass = 'space-y-1.5'
</script>

<template>
  <div class="flex flex-col gap-8">
    <!-- Búsqueda por cédula (solo para deudor) -->
    <section v-if="showSearch" :class="sectionClass">
      <h3 :class="sectionTitleClass">Buscar por documento</h3>
      <div class="flex flex-wrap gap-2">
        <div :class="fieldClass">
          <Label for="search_doc" class="block">Número de documento</Label>
          <Input
            id="search_doc"
            v-model="local.document_number"
            placeholder="Número de documento"
            class="w-full max-w-xs"
            @keyup.enter="onSearch?.()"
          />
        </div>
        <Button
          type="button"
          variant="outline"
          :disabled="loadingSearch || !local.document_number?.trim()"
          @click="onSearch?.()"
        >
          <Icon v-if="loadingSearch" name="i-lucide-loader-2" class="h-4 w-4 animate-spin" />
          <Icon v-else name="i-lucide-search" class="h-4 w-4" />
          Buscar
        </Button>
      </div>
    </section>

    <!-- Documento de identidad -->
    <section :class="sectionClass">
      <h3 :class="sectionTitleClass">Documento de identidad</h3>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div :class="fieldClass">
          <Label for="doc_type">Tipo documento *</Label>
          <Select v-model="local.document_type">
            <SelectTrigger id="doc_type">
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="opt in documentTypes" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div :class="fieldClass">
          <Label for="doc_number">Número documento *</Label>
          <Input
            id="doc_number"
            v-model="local.document_number"
            placeholder="Ej: 1234567890"
            :readonly="!!showSearch"
          />
        </div>
        <div :class="fieldClass">
          <Label for="exp_date">Fecha expedición</Label>
          <Input
            id="exp_date"
            v-model="local.expedition_date"
            type="date"
          />
        </div>
        <div :class="fieldClass">
          <Label for="exp_place">Lugar de expedición</Label>
          <Multiselect
            :model-value="local.expedition_place ?? null"
            :options="multiselectOptionsByLabel"
            value-prop="value"
            label="label"
            :searchable="true"
            placeholder="Buscar municipio o departamento..."
            no-options-text="No hay municipios"
            no-results-text="No hay resultados. Escribe para filtrar."
            class="multiselect-municipality"
            @update:model-value="local = { ...local, expedition_place: ($event as string) ?? '' }"
          />
        </div>
      </div>
    </section>

    <!-- Nombres y datos personales -->
    <section :class="sectionClass">
      <h3 :class="sectionTitleClass">Datos personales</h3>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div :class="fieldClass">
          <Label for="first_name">Primer nombre *</Label>
          <Input id="first_name" v-model="local.first_name" placeholder="Ej: Juan" />
        </div>
        <div :class="fieldClass">
          <Label for="second_name">Segundo nombre</Label>
          <Input id="second_name" v-model="local.second_name" placeholder="Ej: Carlos" />
        </div>
        <div :class="fieldClass">
          <Label for="first_last">Primer apellido *</Label>
          <Input id="first_last" v-model="local.first_last_name" placeholder="Ej: Pérez" />
        </div>
        <div :class="fieldClass">
          <Label for="second_last">Segundo apellido</Label>
          <Input id="second_last" v-model="local.second_last_name" placeholder="Ej: Gómez" />
        </div>
        <div :class="fieldClass">
          <Label for="birth_date">Fecha nacimiento</Label>
          <Input id="birth_date" v-model="local.birth_date" type="date" />
        </div>
        <div :class="fieldClass">
          <Label for="gender">Género</Label>
          <Input id="gender" v-model="local.gender" placeholder="M/F" />
        </div>
        <div :class="fieldClass">
          <Label for="marital">Estado civil</Label>
          <Select v-model="local.marital_status">
            <SelectTrigger id="marital">
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="opt in maritalStatuses" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div :class="fieldClass">
          <Label for="dependents">Personas a cargo</Label>
          <Input
            id="dependents"
            v-model.number="local.dependents"
            type="number"
            min="0"
          />
        </div>
      </div>
    </section>

    <!-- Contacto -->
    <section :class="sectionClass">
      <h3 :class="sectionTitleClass">Contacto</h3>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div :class="fieldClass">
          <Label for="mobile">Celular</Label>
          <Input id="mobile" v-model="local.mobile_phone" placeholder="300 123 4567" />
        </div>
        <div :class="fieldClass">
          <Label for="landline">Teléfono fijo</Label>
          <Input id="landline" v-model="local.landline" placeholder="601 123 4567" />
        </div>
        <div class="sm:col-span-2 lg:col-span-1" :class="fieldClass">
          <Label for="email">Email</Label>
          <Input id="email" v-model="local.email" type="email" placeholder="correo@ejemplo.com" />
        </div>
      </div>
    </section>

    <!-- Dirección y residencia -->
    <section :class="sectionClass">
      <h3 :class="sectionTitleClass">Dirección y residencia</h3>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div class="sm:col-span-2 lg:col-span-3" :class="fieldClass">
          <Label for="address">Dirección de residencia</Label>
          <Input id="address" v-model="local.residence_address" placeholder="Calle 123 #45-67, barrio..." />
        </div>
        <div :class="fieldClass">
          <Label for="residence_city">Ciudad</Label>
          <Multiselect
            :model-value="local.residence_city_id ?? null"
            :options="multiselectOptionsByCity"
            value-prop="value"
            label="label"
            :searchable="true"
            placeholder="Buscar ciudad o departamento..."
            no-options-text="No hay ciudades"
            no-results-text="No hay resultados. Escribe para filtrar."
            class="multiselect-municipality"
            @update:model-value="local = { ...local, residence_city_id: ($event as number) ?? undefined }"
          />
        </div>
        <div :class="fieldClass">
          <Label for="residence_type">Tipo vivienda</Label>
          <Select v-model="local.residence_type">
            <SelectTrigger id="residence_type">
              <SelectValue placeholder="Seleccionar" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem v-for="opt in residenceTypes" :key="opt.value" :value="opt.value">
                {{ opt.label }}
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div :class="fieldClass">
          <Label for="time_residence">Tiempo en residencia</Label>
          <Input id="time_residence" v-model="local.time_in_residence" placeholder="Ej: 2 años" />
        </div>
      </div>
    </section>

    <!-- Actividad económica -->
    <section :class="sectionClass">
      <h3 :class="sectionTitleClass">Actividad económica</h3>
      <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div :class="fieldClass">
          <Label for="occupation">Ocupación</Label>
          <Input id="occupation" v-model="local.occupation" placeholder="Ej: Comerciante" />
        </div>
        <div :class="fieldClass">
          <Label for="company">Empresa</Label>
          <Input id="company" v-model="local.company_name" placeholder="Nombre empresa" />
        </div>
        <div :class="fieldClass">
          <Label for="position">Cargo</Label>
          <Input id="position" v-model="local.position" placeholder="Ej: Vendedor" />
        </div>
        <div :class="fieldClass">
          <Label for="contract">Tipo contrato</Label>
          <Input id="contract" v-model="local.contract_type" placeholder="Indefinido, Término fijo..." />
        </div>
        <div :class="fieldClass">
          <Label for="time_job">Tiempo en el trabajo</Label>
          <Input id="time_job" v-model="local.time_in_job" placeholder="Ej: 3 años" />
        </div>
      </div>
    </section>
  </div>
</template>

<style src="@vueform/multiselect/themes/default.css"></style>
<style scoped>
.multiselect-municipality {
  --ms-font-size: 0.875rem;
  --ms-line-height: 1.25rem;
  --ms-radius: 0.375rem;
  --ms-border-color: hsl(var(--border));
  --ms-bg: hsl(var(--background));
}
</style>
