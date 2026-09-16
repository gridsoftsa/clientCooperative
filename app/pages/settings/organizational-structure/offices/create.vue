<script setup lang="ts">
import { toast } from 'vue-sonner'
import OrgOfficeMunicipalityField from '~/components/OrgOfficeMunicipalityField.vue'
import { ORG_OFFICE_TYPE_OPTIONS } from '~/constants/org-structure'
import type { OrgOfficeType } from '~/types/org-structure'
import { todayIsoDateString } from '~/utils/dateInputValue'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: ['estructura_org_editar', 'sucursales_crear'],
})

const { $api } = useNuxtApp()
const router = useRouter()
const { apiBodyLocation } = useOrgOfficeMunicipalitySync()

const form = ref({
  name: '',
  code: '',
  office_type: 'main' as OrgOfficeType,
  city: '',
  address: '',
  phone: '',
  valid_from: todayIsoDateString(),
  valid_to: '',
  is_active: true,
})

const saving = ref(false)

function onOfficeActiveChange(value: boolean) {
  form.value.is_active = value
}

async function handleSubmit() {
  if (!form.value.name.trim() || !form.value.code.trim()) {
    toast.error('Nombre y código son obligatorios')
    return
  }
  saving.value = true
  try {
    const { city, state } = apiBodyLocation(form.value.city)
    await $api('/organizational-structure/org-offices', {
      method: 'POST',
      body: {
        name: form.value.name.trim(),
        code: form.value.code.trim(),
        office_type: form.value.office_type,
        city: city ?? undefined,
        state: state ?? undefined,
        address: form.value.address.trim() || undefined,
        phone: form.value.phone.trim() || undefined,
        valid_from: form.value.valid_from.trim(),
        valid_to: form.value.valid_to.trim() || null,
        is_active: form.value.is_active,
      },
    })
    toast.success('Agencia creada')
    router.push('/settings/organizational-structure/offices')
  } catch (e: any) {
    toast.error(e?.data?.message || e?.data?.errors?.code?.[0] || 'Error al crear')
  } finally {
    saving.value = false
  }
}
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
          Nueva agencia
        </h2>
        <p class="text-muted-foreground text-sm leading-relaxed max-w-3xl">
          Código único por entidad. Se crea o actualiza la sucursal operativa asociada (usuarios y radicación).
        </p>
      </div>

      <form @submit.prevent="handleSubmit">
        <Card>
          <CardHeader>
            <CardTitle>Datos de la agencia</CardTitle>
            <CardDescription>
              Identificación, ubicación y vigencia operativa.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-6">
            <div class="grid items-start gap-6 lg:grid-cols-2">
              <div class="flex min-w-0 flex-col gap-2">
                <Label for="name">Nombre *</Label>
                <Input id="name" v-model="form.name" required placeholder="Ej: Sede Central" />
              </div>
              <div class="flex min-w-0 flex-col gap-2">
                <Label for="code">Código *</Label>
                <Input id="code" v-model="form.code" required placeholder="Único dentro de la cooperativa" />
              </div>
              <div class="flex min-w-0 flex-col gap-2">
                <Label for="office_type">Tipo *</Label>
                <Select v-model="form.office_type">
                  <SelectTrigger id="office_type">
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
                <Label for="org_office_phone">Teléfono</Label>
                <Input id="org_office_phone" v-model="form.phone" placeholder="Teléfono de contacto (opcional)" />
              </div>
              <div class="lg:col-span-2">
                <OrgOfficeMunicipalityField
                  department-input-id="org_office_department"
                  city-input-id="org_office_city"
                  v-model="form.city"
                />
              </div>
              <div class="flex min-w-0 flex-col gap-2 lg:col-span-2">
                <Label for="org_office_address">Dirección</Label>
                <Input id="org_office_address" v-model="form.address" placeholder="Dirección completa (opcional)" />
              </div>
              <OrgStructureValidityPeriodFields
                v-model:valid-from="form.valid_from"
                v-model:valid-to="form.valid_to"
                from-input-id="office_create_valid_from"
                to-input-id="office_create_valid_to"
              />
              <OrgStructureActiveMultiselect
                :model-value="form.is_active"
                gender="feminine"
                input-id="office_create_active_ms"
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
                {{ saving ? 'Guardando...' : 'Crear agencia' }}
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  </SettingsLayout>
</template>
