<script setup lang="ts">
import { toast } from 'vue-sonner'
import ApplicantFormFields from '~/components/radicacion/ApplicantFormFields.vue'
import type { Applicant } from '~/types/applicant'
import type { ApplicantForm } from '~/types/credit-application'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'solicitantes_editar'
})

const { $api } = useNuxtApp()
const route = useRoute()
const router = useRouter()

const applicantId = route.params.id as string
const { getByLabel } = useMunicipalities()

const form = ref<ApplicantForm>({
  document_type: 'CC',
  document_number: '',
  first_name: '',
  first_last_name: '',
})

const applicant = ref<Applicant | null>(null)
const loading = ref(false)
const saving = ref(false)

function applicantToForm(a: Applicant): ApplicantForm {
  const cityLabel = a.residence_city
    ? `${a.residence_city.name}${a.residence_city.department ? ` (${a.residence_city.department})` : ''}`
    : (a.residence_city_name ?? '')
  return {
    document_type: a.document_type,
    document_number: a.document_number,
    expedition_date: a.expedition_date ?? '',
    expedition_place: a.expedition_place ?? '',
    first_name: a.first_name,
    second_name: a.second_name ?? '',
    first_last_name: a.first_last_name,
    second_last_name: a.second_last_name ?? '',
    birth_date: a.birth_date ?? '',
    gender: a.gender ?? '',
    marital_status: a.marital_status ?? '',
    dependents: a.dependents ?? 0,
    mobile_phone: a.mobile_phone ?? '',
    landline: a.landline ?? '',
    email: a.email ?? '',
    residence_address: a.residence_address ?? '',
    residence_city_name: cityLabel,
    residence_city_id: a.residence_city_id ?? undefined,
    residence_type: a.residence_type ?? '',
    time_in_residence: a.time_in_residence ?? '',
    occupation: a.occupation ?? '',
    company_name: a.company_name ?? '',
    position: a.position ?? '',
    contract_type: a.contract_type ?? '',
    time_in_job: a.time_in_job ?? '',
  }
}

function formToPayload(): Record<string, unknown> {
  const f = form.value
  const municipality = getByLabel(f.residence_city_name)
  return {
    document_type: f.document_type,
    document_number: f.document_number,
    expedition_date: f.expedition_date || null,
    expedition_place: f.expedition_place || null,
    first_name: f.first_name,
    second_name: f.second_name || null,
    first_last_name: f.first_last_name,
    second_last_name: f.second_last_name || null,
    birth_date: f.birth_date || null,
    gender: f.gender || null,
    marital_status: f.marital_status || null,
    dependents: f.dependents ?? 0,
    mobile_phone: f.mobile_phone || null,
    landline: f.landline || null,
    email: f.email || null,
    residence_address: f.residence_address || null,
    residence_city_name: f.residence_city_name || null,
    residence_city_id: municipality?.id ?? f.residence_city_id ?? null,
    residence_type: f.residence_type || null,
    time_in_residence: f.time_in_residence || null,
    occupation: f.occupation || null,
    company_name: f.company_name || null,
    position: f.position || null,
    contract_type: f.contract_type || null,
    time_in_job: f.time_in_job || null,
  }
}

async function fetchApplicant() {
  loading.value = true
  try {
    const res = await $api<{ data: Applicant }>(`/applicants/${applicantId}`)
    applicant.value = res.data
    form.value = applicantToForm(res.data)
  } catch (error) {
    console.error('Error al cargar solicitante:', error)
    toast.error('Error al cargar el solicitante')
    router.push('/admin/applicants')
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  if (!form.value.first_name?.trim() || !form.value.first_last_name?.trim()) {
    toast.error('Nombre y apellido son requeridos')
    return
  }
  if (!form.value.document_number?.trim()) {
    toast.error('Número de documento es requerido')
    return
  }

  saving.value = true
  try {
    await $api(`/applicants/${applicantId}`, {
      method: 'PUT',
      body: formToPayload(),
    })
    toast.success('Solicitante actualizado correctamente')
    await fetchApplicant()
  } catch (error: any) {
    console.error('Error al guardar:', error)
    const message = error?.data?.message || error?.data?.errors ? Object.values(error.data.errors).flat().join(', ') : 'Error al guardar'
    toast.error(message)
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  fetchApplicant()
})
</script>

<template>
  <div class="w-full flex flex-col gap-4">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-2xl font-bold tracking-tight">
        Editar Solicitante
      </h2>
      <Button variant="outline" @click="router.push('/admin/applicants')">
        <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
        Volver
      </Button>
    </div>

    <Card v-if="loading" class="flex items-center justify-center py-12">
      <Icon name="i-lucide-loader-2" class="h-6 w-6 animate-spin" />
    </Card>

    <Card v-else-if="applicant">
      <CardHeader>
        <CardTitle>{{ applicant.full_name }}</CardTitle>
        <CardDescription>
          {{ applicant.document_type }} {{ applicant.document_number }} · Actualiza los datos del solicitante
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form class="space-y-6" @submit.prevent="handleSubmit">
          <ApplicantFormFields
            v-model="form"
            :hide-financial-section="true"
            :readonly="false"
          />
          <div class="flex justify-end gap-2">
            <Button type="button" variant="outline" @click="router.push('/admin/applicants')">
              Cancelar
            </Button>
            <Button type="submit" :disabled="saving">
              <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
              Guardar cambios
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
