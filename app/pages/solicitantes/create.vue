<script setup lang="ts">
import { toast } from 'vue-sonner'
import ApplicantFormFields from '~/components/radicacion/ApplicantFormFields.vue'
import type { ApplicantForm } from '~/types/credit-application'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'solicitantes_crear',
})

const { $api } = useNuxtApp()
const router = useRouter()
const { getByLabel } = useMunicipalities()

const form = ref<ApplicantForm>({
  document_type: 'CC',
  document_number: '',
  first_name: '',
  first_last_name: '',
  dependents: 0,
  financial_info: {},
  documents: [],
})

const loadingSearch = ref(false)
const saving = ref(false)

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
    financial_info: {
      activity_type:
        f.financial_info?.activity_type != null && String(f.financial_info.activity_type).trim() !== ''
          ? String(f.financial_info.activity_type).trim()
          : null,
    },
  }
}

async function searchApplicant() {
  const doc = form.value.document_number?.trim()
  if (!doc) {
    toast.error('Ingrese el número de documento')
    return
  }
  loadingSearch.value = true
  try {
    const res = await $api<{ data: (ApplicantForm & { id?: number }) | null; found: boolean }>(
      '/applicants/find-by-document',
      { query: { document_number: doc } },
    )
    if (res.found && res.data?.id != null) {
      toast.message('Este documento ya está registrado.', {
        description: 'Se abre la ficha para editar.',
      })
      await router.push(`/solicitantes/${res.data.id}/edit`)
      return
    }
    toast.info('No encontrado. Complete el formulario para crear el solicitante.')
  } catch (e) {
    console.error(e)
    toast.error('Error al buscar')
  } finally {
    loadingSearch.value = false
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
    const res = await $api<{ data: { id: number }; message: string }>('/applicants', {
      method: 'POST',
      body: formToPayload(),
    })
    toast.success(res.message ?? 'Solicitante creado')
    await router.push(`/solicitantes/${res.data.id}/edit`)
  } catch (error: unknown) {
    console.error(error)
    const err = error as { data?: { message?: string; errors?: Record<string, string[]> } }
    const msg = err?.data?.errors
      ? Object.values(err.data.errors).flat().join(', ')
      : err?.data?.message
    toast.error(msg ?? 'No se pudo crear el solicitante')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="mx-auto flex w-full max-w-6xl flex-col gap-4 px-0">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <h2 class="text-2xl font-bold tracking-tight">
        Nuevo solicitante
      </h2>
      <Button variant="outline" @click="router.push('/solicitantes')">
        <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
        Volver
      </Button>
    </div>

    <Card>
      <CardHeader>
        <CardTitle>Datos del solicitante</CardTitle>
        <CardDescription>
          Mismo formulario que el paso 1 de radicación (identificación y datos personales). Busque por documento para evitar duplicados.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form class="space-y-6" @submit.prevent="handleSubmit">
          <ApplicantFormFields
            v-model="form"
            :show-search="true"
            :loading-search="loadingSearch"
            :hide-financial-section="true"
            :hide-documents-section="true"
            :read-only-form="false"
            @search="searchApplicant"
          />
          <div class="flex justify-end gap-2">
            <Button type="button" variant="outline" @click="router.push('/solicitantes')">
              Cancelar
            </Button>
            <Button type="submit" :disabled="saving">
              <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
              Guardar solicitante
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  </div>
</template>
