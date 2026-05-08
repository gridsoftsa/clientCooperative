<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { PaginatedUsers, User } from '~/types/user'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'estructura_org_editar',
})

const router = useRouter()
const { $api } = useNuxtApp()
const { hasPermission } = usePermissions()

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
  if (!hasPermission('usuarios_ver')) {
    userOptions.value = []
    return
  }
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

async function handleSubmit() {
  if (!form.value.first_name.trim() || !form.value.first_last_name.trim()) {
    toast.error('Primer nombre y primer apellido son obligatorios')
    return
  }
  saving.value = true
  try {
    const res = await $api<{ data: { id: number } }>('/organizational-structure/org-staff', {
      method: 'POST',
      body: {
        user_id: form.value.user_id ?? undefined,
        first_name: form.value.first_name.trim(),
        second_name: form.value.second_name.trim() || undefined,
        first_last_name: form.value.first_last_name.trim(),
        second_last_name: form.value.second_last_name.trim() || undefined,
        email: form.value.email.trim() || undefined,
        phone: form.value.phone.trim() || undefined,
        extension: form.value.extension.trim() || undefined,
        document_number: form.value.document_number.trim() || undefined,
        is_active: form.value.is_active,
      },
    })
    toast.success('Funcionario creado')
    const id = res.data.id
    router.push(`/settings/organizational-structure/staff/${id}/assign`)
  } catch (e: any) {
    toast.error(e?.data?.message || 'Error al crear')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  loadUsersIfAllowed()
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <h2 class="text-2xl font-bold tracking-tight">
            Registrar funcionario
          </h2>
          <p class="text-muted-foreground leading-relaxed">
            Tras crear el registro podrá definir ubicación organizacional y cargo principal.
          </p>
        </div>
        <Button variant="outline" class="shrink-0" @click="router.back()">
          <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>

      <form @submit.prevent="handleSubmit">
        <div class="grid gap-6">
          <Card v-if="hasPermission('usuarios_ver')">
            <CardHeader class="gap-2">
              <CardTitle class="leading-snug">Vínculo con usuario del sistema</CardTitle>
              <CardDescription class="leading-relaxed">
                Opcional: asocie este funcionario a una cuenta ya existente.
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-6">
              <div class="space-y-3">
                <Label for="usr" class="leading-snug">Usuario (opcional)</Label>
                <Select
                  :model-value="form.user_id == null ? 'none' : String(form.user_id)"
                  @update:model-value="(v) => { form.user_id = v === 'none' ? null : Number(v) }"
                >
                  <SelectTrigger id="usr">
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

          <p v-if="!hasPermission('usuarios_ver')" class="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground leading-relaxed">
            No tiene permiso para listar usuarios; puede crear el funcionario sin vínculo y asociarlo después desde la edición, si corresponde.
          </p>

          <Card>
            <CardHeader class="gap-2">
              <CardTitle class="leading-snug">Información personal y contacto</CardTitle>
              <CardDescription class="leading-relaxed">
                Nombre completo obligatorio conforme registros institucionales; el resto es opcional.
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-6">
              <div class="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-x-6 md:gap-y-5">
                <div class="space-y-3">
                  <Label for="fn" class="leading-snug">Primer nombre *</Label>
                  <Input id="fn" v-model="form.first_name" required />
                </div>
                <div class="space-y-3">
                  <Label for="sn" class="leading-snug">Segundo nombre</Label>
                  <Input id="sn" v-model="form.second_name" />
                </div>
                <div class="space-y-3">
                  <Label for="fl" class="leading-snug">Primer apellido *</Label>
                  <Input id="fl" v-model="form.first_last_name" required />
                </div>
                <div class="space-y-3">
                  <Label for="sl" class="leading-snug">Segundo apellido</Label>
                  <Input id="sl" v-model="form.second_last_name" />
                </div>

                <div class="space-y-3 md:col-span-2">
                  <Label for="em" class="leading-snug">Correo</Label>
                  <Input id="em" v-model="form.email" type="email" />
                </div>

                <div class="space-y-3 md:grid md:grid-cols-2 md:gap-x-6 md:col-span-2">
                  <div class="space-y-3 md:col-span-1">
                    <Label for="ph" class="leading-snug">Teléfono</Label>
                    <Input id="ph" v-model="form.phone" />
                  </div>
                  <div class="space-y-3 md:col-span-1">
                    <Label for="ex" class="leading-snug">Extensión</Label>
                    <Input id="ex" v-model="form.extension" />
                  </div>
                </div>

                <div class="space-y-3 md:col-span-2">
                  <Label for="doc" class="leading-snug">Documento</Label>
                  <Input id="doc" v-model="form.document_number" />
                </div>

                <div class="space-y-3 rounded-lg border p-4 md:col-span-2">
                  <div class="space-y-1.5">
                    <Label for="staff_active_toggle_create" class="text-base leading-snug">Estado</Label>
                    <p class="text-sm text-muted-foreground leading-relaxed">
                      Las personas inactivas no se proponen para jefatura de área ni filtros vigentes por defecto.
                    </p>
                  </div>
                  <div class="flex items-center gap-2 pt-1">
                    <Checkbox id="staff_active_toggle_create" v-model:checked="form.is_active" />
                    <Label for="staff_active_toggle_create" class="font-normal leading-snug">
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
              {{ saving ? 'Guardando...' : 'Crear y continuar a ubicación' }}
            </Button>
          </div>
        </div>
      </form>
    </div>
  </SettingsLayout>
</template>
