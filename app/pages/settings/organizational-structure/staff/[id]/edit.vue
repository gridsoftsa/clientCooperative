<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { OrgStaffListItem } from '~/types/org-structure'
import type { PaginatedUsers, User } from '~/types/user'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'estructura_org_editar',
})

const router = useRouter()
const route = useRoute()
const staffId = computed(() => Number(route.params.id))
const { $api } = useNuxtApp()
const { hasPermission } = usePermissions()

const loading = ref(true)
const form = ref({
  user_id: null as number | null,
  first_name: '',
  second_name: '',
  first_last_name: '',
  second_last_name: '',
  email: '',
  phone: '',
  extension: '',
  document_number: '',
  is_active: true,
})

const userOptions = ref<Array<{ id: number; label: string }>>([])
const saving = ref(false)

async function loadUsersIfAllowed() {
  if (!hasPermission('usuarios_ver'))
    return
  try {
    const res = await $api<PaginatedUsers>('/users', { query: { per_page: 200, page: 1 } })
    userOptions.value = res.data.map((u: User) => ({
      id: u.id,
      label: `${u.name || u.email} · ${u.email}`,
    }))
  } catch {
    userOptions.value = []
  }
}

async function loadStaff() {
  loading.value = true
  try {
    await loadUsersIfAllowed()
    const res = await $api<{ data: OrgStaffListItem & { user_id?: number | null } }>(
      `/organizational-structure/org-staff/${staffId.value}`,
    )
    const s = res.data
    form.value = {
      user_id: s.user_id ?? s.user?.id ?? null,
      first_name: s.first_name,
      second_name: s.second_name ?? '',
      first_last_name: s.first_last_name,
      second_last_name: s.second_last_name ?? '',
      email: s.email ?? '',
      phone: s.phone ?? '',
      extension: s.extension ?? '',
      document_number: s.document_number ?? '',
      is_active: s.is_active,
    }
  } catch {
    toast.error('No se encontró el funcionario')
    router.push('/settings/organizational-structure/staff')
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  saving.value = true
  try {
    await $api(`/organizational-structure/org-staff/${staffId.value}`, {
      method: 'PUT',
      body: {
        user_id: form.value.user_id,
        first_name: form.value.first_name.trim(),
        second_name: form.value.second_name.trim() || null,
        first_last_name: form.value.first_last_name.trim(),
        second_last_name: form.value.second_last_name.trim() || null,
        email: form.value.email.trim() || null,
        phone: form.value.phone.trim() || null,
        extension: form.value.extension.trim() || null,
        document_number: form.value.document_number.trim() || null,
        is_active: form.value.is_active,
      },
    })
    toast.success('Datos actualizados')
    router.push('/settings/organizational-structure/staff')
  } catch (e: any) {
    toast.error(e?.data?.message || 'Error al guardar')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadStaff()
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <h2 class="text-2xl font-bold tracking-tight">
            Editar funcionario
          </h2>
          <p class="text-muted-foreground leading-relaxed">
            Datos personales, contacto y vínculo opcional con un usuario del sistema.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-3 shrink-0">
          <Button variant="outline" @click="router.push(`/settings/organizational-structure/staff/${staffId}/assign`)">
            Ubicación principal
          </Button>
          <Button variant="outline" @click="router.back()">
            <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
            Volver
          </Button>
        </div>
      </div>

      <div v-if="loading" class="flex justify-center py-12">
        <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
      </div>

      <form v-else @submit.prevent="handleSubmit">
        <div class="grid gap-6">
          <Card v-if="hasPermission('usuarios_ver')">
            <CardHeader class="gap-2">
              <CardTitle class="leading-snug">Vínculo con usuario del sistema</CardTitle>
              <CardDescription class="leading-relaxed">
                Asocie o quite la cuenta vinculada a este funcionario.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div class="space-y-3">
                <Label for="usr_e" class="leading-snug">Usuario del sistema</Label>
                <Select
                  :model-value="form.user_id == null ? 'none' : String(form.user_id)"
                  @update:model-value="(v) => { form.user_id = v === 'none' ? null : Number(v) }"
                >
                  <SelectTrigger id="usr_e">
                    <SelectValue placeholder="Sin vínculo" />
                  </SelectTrigger>
                  <SelectContent class="max-h-60">
                    <SelectItem value="none">
                      (Sin usuario)
                    </SelectItem>
                    <SelectItem
                      v-for="u in userOptions"
                      :key="u.id"
                      :value="String(u.id)"
                    >
                      {{ u.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="gap-2">
              <CardTitle class="leading-snug">Información personal y contacto</CardTitle>
              <CardDescription class="leading-relaxed">
                Mantenga coherentes nombre y datos de contacto con los registros institucionales.
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-6">
              <div class="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-x-6 md:gap-y-5">
                <div class="space-y-3">
                  <Label for="fn_e" class="leading-snug">Primer nombre *</Label>
                  <Input id="fn_e" v-model="form.first_name" required />
                </div>
                <div class="space-y-3">
                  <Label for="sn_e" class="leading-snug">Segundo nombre</Label>
                  <Input id="sn_e" v-model="form.second_name" />
                </div>
                <div class="space-y-3">
                  <Label for="fl_e" class="leading-snug">Primer apellido *</Label>
                  <Input id="fl_e" v-model="form.first_last_name" required />
                </div>
                <div class="space-y-3">
                  <Label for="sl_e" class="leading-snug">Segundo apellido</Label>
                  <Input id="sl_e" v-model="form.second_last_name" />
                </div>

                <div class="space-y-3 md:col-span-2">
                  <Label for="em_e" class="leading-snug">Correo</Label>
                  <Input id="em_e" v-model="form.email" type="email" />
                </div>

                <div class="space-y-3 md:grid md:grid-cols-2 md:gap-x-6 md:col-span-2">
                  <div class="space-y-3 md:col-span-1">
                    <Label for="ph_e" class="leading-snug">Teléfono</Label>
                    <Input id="ph_e" v-model="form.phone" />
                  </div>
                  <div class="space-y-3 md:col-span-1">
                    <Label for="ex_e" class="leading-snug">Extensión</Label>
                    <Input id="ex_e" v-model="form.extension" />
                  </div>
                </div>

                <div class="space-y-3 md:col-span-2">
                  <Label for="doc_e" class="leading-snug">Documento</Label>
                  <Input id="doc_e" v-model="form.document_number" />
                </div>

                <div class="space-y-3 rounded-lg border p-4 md:col-span-2">
                  <div class="space-y-1.5">
                    <Label for="staff_active_toggle_edit" class="text-base leading-snug">Estado</Label>
                    <p class="text-sm text-muted-foreground leading-relaxed">
                      Las personas inactivas no se proponen para jefatura de área ni filtros vigentes por defecto.
                    </p>
                  </div>
                  <div class="flex items-center gap-2 pt-1">
                    <Checkbox id="staff_active_toggle_edit" v-model:checked="form.is_active" />
                    <Label for="staff_active_toggle_edit" class="font-normal leading-snug">
                      Funcionario activo
                    </Label>
                  </div>
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
