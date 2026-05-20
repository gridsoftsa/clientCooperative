<script setup lang="ts">
import { toast } from 'vue-sonner'
import OrgOfficeMunicipalityField from '~/components/OrgOfficeMunicipalityField.vue'
import { ORG_OFFICE_TYPE_OPTIONS } from '~/constants/org-structure'
import type { OrgOffice, OrgOfficeType } from '~/types/org-structure'

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
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <h2 class="text-2xl font-bold tracking-tight">
            Editar agencia
          </h2>
          <p class="text-muted-foreground leading-relaxed">
            Actualice datos de identificación y ubicación.
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
              <CardTitle class="leading-snug">Información de la agencia</CardTitle>
              <CardDescription class="leading-relaxed">
                Datos guardados por entidad; el código debe seguir siendo único.
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-6">
              <div class="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-x-6 md:gap-y-5">
                <div class="space-y-3 md:col-span-2">
                  <Label for="name" class="leading-snug">Nombre *</Label>
                  <Input id="name" v-model="form.name" required />
                </div>

                <div class="space-y-3 md:col-span-2 md:grid md:grid-cols-2 md:gap-x-6">
                  <div class="space-y-3">
                    <Label for="code" class="leading-snug">Código *</Label>
                    <Input id="code" v-model="form.code" required />
                  </div>
                  <div class="space-y-3">
                    <Label for="office_type_edit" class="leading-snug">Tipo *</Label>
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
                </div>

                <div class="space-y-3 md:col-span-2">
                  <Label for="org_office_city_edit" class="leading-snug">Ciudad / municipio</Label>
                  <OrgOfficeMunicipalityField input-id="org_office_city_edit" v-model="form.city" />
                  <p class="text-xs text-muted-foreground leading-relaxed">
                    Abre el listado, escribe para filtrar y elige municipio y departamento (DANE), igual que en radicación.
                  </p>
                </div>
                <div class="space-y-3 md:col-span-2">
                  <Label for="org_office_address_edit" class="leading-snug">Dirección</Label>
                  <Input id="org_office_address_edit" v-model="form.address" />
                </div>
                <div class="space-y-3 md:col-span-2">
                  <Label for="org_office_phone_edit" class="leading-snug">Teléfono</Label>
                  <Input id="org_office_phone_edit" v-model="form.phone" />
                </div>
              </div>

              <OrgStructureActiveMultiselect
                :model-value="form.is_active"
                gender="feminine"
                input-id="office_edit_active_ms"
                helper-text="Las agencias inactivas no se sugieren como sede en configuraciones nuevas."
                @update:model-value="onOfficeActiveChange"
              />
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
