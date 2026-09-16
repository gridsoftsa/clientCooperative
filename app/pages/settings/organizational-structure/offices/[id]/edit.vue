<script setup lang="ts">
import { toast } from 'vue-sonner'
import OrgOfficeMunicipalityField from '~/components/OrgOfficeMunicipalityField.vue'
import { ORG_OFFICE_TYPE_OPTIONS } from '~/constants/org-structure'
import type { OrgOffice, OrgOfficeType } from '~/types/org-structure'
import { toDateInputValue } from '~/utils/dateInputValue'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: ['estructura_org_editar', 'sucursales_editar'],
})

const { $api } = useNuxtApp()
const router = useRouter()
const route = useRoute()
const id = computed(() => Number(route.params.id))
const { labelForForm, apiBodyLocation } = useOrgOfficeMunicipalitySync()

const loading = ref(true)
const form = ref({
  name: '',
  code: '',
  office_type: 'main' as OrgOfficeType,
  city: '',
  address: '',
  phone: '',
  valid_from: '',
  valid_to: '',
  is_active: true,
})

const saving = ref(false)

function onOfficeActiveChange(value: boolean) {
  form.value.is_active = value
}

async function load() {
  loading.value = true
  try {
    const res = await $api<{ data: OrgOffice }>(`/organizational-structure/org-offices/${id.value}`)
    const o = res.data
    form.value = {
      name: o.name,
      code: o.code,
      office_type: o.office_type,
      city: labelForForm(o.city, o.state),
      address: o.address ?? '',
      phone: o.phone ?? '',
      valid_from: toDateInputValue(o.valid_from),
      valid_to: toDateInputValue(o.valid_to),
      is_active: Boolean(o.is_active),
    }
  } catch {
    toast.error('No se encontró la agencia')
    router.push('/settings/organizational-structure/offices')
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  saving.value = true
  try {
    const { city, state } = apiBodyLocation(form.value.city)
    await $api(`/organizational-structure/org-offices/${id.value}`, {
      method: 'PUT',
      body: {
        name: form.value.name.trim(),
        code: form.value.code.trim(),
        office_type: form.value.office_type,
        city,
        state,
        address: form.value.address.trim() || null,
        phone: form.value.phone.trim() || null,
        valid_from: form.value.valid_from.trim(),
        valid_to: form.value.valid_to.trim() || null,
        is_active: form.value.is_active,
      },
    })
    toast.success('Agencia actualizada')
    router.push('/settings/organizational-structure/offices')
  } catch (e: any) {
    toast.error(e?.data?.message || 'Error al guardar')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  load()
})
</script>

<template>
  <SettingsLayout :wide="true" hide-intro>
    <div class="flex w-full flex-col gap-6">
      <div class="space-y-1">
        <Button variant="ghost" size="sm" class="h-8 w-fit -ml-2 px-2" @click="router.push('/settings/organizational-structure/offices')">
          <Icon name="i-lucide-arrow-left" class="mr-1 h-4 w-4" />
          Volver a agencias
        </Button>
        <h2 class="text-2xl font-bold tracking-tight">
          Editar agencia
        </h2>
        <p class="text-muted-foreground text-sm leading-relaxed max-w-3xl">
          Actualice datos de identificación y ubicación.
        </p>
      </div>

      <div v-if="loading" class="flex justify-center py-12">
        <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
      </div>

      <form v-else @submit.prevent="handleSubmit">
        <Card>
          <CardHeader>
            <CardTitle>Datos de la agencia</CardTitle>
            <CardDescription>
              El código debe seguir siendo único dentro de la cooperativa.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-6">
            <div class="grid items-start gap-6 lg:grid-cols-2">
              <div class="flex min-w-0 flex-col gap-2">
                <Label for="name">Nombre *</Label>
                <Input id="name" v-model="form.name" required />
              </div>
              <div class="flex min-w-0 flex-col gap-2">
                <Label for="code">Código *</Label>
                <Input id="code" v-model="form.code" required />
              </div>
              <div class="flex min-w-0 flex-col gap-2">
                <Label for="office_type_edit">Tipo *</Label>
                <Select v-model="form.office_type">
                  <SelectTrigger id="office_type_edit">
                    <SelectValue placeholder="Seleccione tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem
                      v-for="opt in ORG_OFFICE_TYPE_OPTIONS"
                      :key="opt.value"
                      :value="opt.value"
                    >
                      {{ opt.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="flex min-w-0 flex-col gap-2">
                <Label for="org_office_phone_edit">Teléfono</Label>
                <Input id="org_office_phone_edit" v-model="form.phone" />
              </div>
              <div class="lg:col-span-2">
                <OrgOfficeMunicipalityField
                  department-input-id="org_office_department_edit"
                  city-input-id="org_office_city_edit"
                  v-model="form.city"
                />
              </div>
              <div class="flex min-w-0 flex-col gap-2 lg:col-span-2">
                <Label for="org_office_address_edit">Dirección</Label>
                <Input id="org_office_address_edit" v-model="form.address" />
              </div>
              <OrgStructureValidityPeriodFields
                v-model:valid-from="form.valid_from"
                v-model:valid-to="form.valid_to"
                from-input-id="office_edit_valid_from"
                to-input-id="office_edit_valid_to"
              />
              <OrgStructureActiveMultiselect
                :model-value="form.is_active"
                gender="feminine"
                input-id="office_edit_active_ms"
                helper-text="Las agencias inactivas no se sugieren como sede en configuraciones nuevas."
                @update:model-value="onOfficeActiveChange"
              />
            </div>
            <div class="flex justify-end gap-2">
              <Button type="button" variant="outline" @click="router.back()">
                Cancelar
              </Button>
              <Button type="submit" :disabled="saving">
                <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
                {{ saving ? 'Guardando...' : 'Guardar cambios' }}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  </SettingsLayout>
</template>
