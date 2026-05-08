<script setup lang="ts">
import { toast } from 'vue-sonner'
import { ORG_OFFICE_TYPE_OPTIONS } from '~/constants/org-structure'
import type { OrgOfficeType } from '~/types/org-structure'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'estructura_org_editar',
})

const { $api } = useNuxtApp()
const router = useRouter()

const form = ref({
  name: '',
  code: '',
  office_type: 'main' as OrgOfficeType,
  city: '',
  state: '',
  is_active: true,
})

const saving = ref(false)

async function handleSubmit() {
  if (!form.value.name.trim() || !form.value.code.trim()) {
    toast.error('Nombre y código son obligatorios')
    return
  }
  saving.value = true
  try {
    await $api('/organizational-structure/org-offices', {
      method: 'POST',
      body: {
        name: form.value.name.trim(),
        code: form.value.code.trim(),
        office_type: form.value.office_type,
        city: form.value.city.trim() || undefined,
        state: form.value.state.trim() || undefined,
        is_active: form.value.is_active,
      },
    })
    toast.success('Oficina creada')
    router.push('/settings/organizational-structure/offices')
  } catch (e: any) {
    toast.error(e?.data?.message || e?.data?.errors?.code?.[0] || 'Error al crear')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <h2 class="text-2xl font-bold tracking-tight">
            Nueva oficina
          </h2>
          <p class="text-muted-foreground leading-relaxed">
            Código único por entidad. Registre sedes, agencias o la oficina principal.
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
              <CardTitle class="leading-snug">Información de la oficina</CardTitle>
              <CardDescription class="leading-relaxed">
                Datos de identificación y ubicación operativa.
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-6">
              <div class="grid grid-cols-1 gap-6 md:grid-cols-2 md:gap-x-6 md:gap-y-5">
                <div class="space-y-3 md:col-span-2">
                  <Label for="name" class="leading-snug">Nombre *</Label>
                  <Input id="name" v-model="form.name" required placeholder="Ej: Sede Central" />
                </div>

                <div class="space-y-3 md:col-span-2 md:grid md:grid-cols-2 md:gap-x-6">
                  <div class="space-y-3">
                    <Label for="code" class="leading-snug">Código *</Label>
                    <Input id="code" v-model="form.code" required placeholder="Único dentro de la cooperativa" />
                  </div>
                  <div class="space-y-3">
                    <Label for="office_type" class="leading-snug">Tipo *</Label>
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
                </div>

                <div class="space-y-3">
                  <Label for="city" class="leading-snug">Ciudad</Label>
                  <Input id="city" v-model="form.city" placeholder="Opcional" />
                </div>

                <div class="space-y-3">
                  <Label for="state" class="leading-snug">Departamento / estado</Label>
                  <Input id="state" v-model="form.state" placeholder="Opcional" />
                </div>
              </div>

              <div class="space-y-3 rounded-lg border p-4 md:col-span-2">
                <div class="space-y-1.5">
                  <Label for="office_active_toggle" class="text-base leading-snug">Estado</Label>
                  <p class="text-sm text-muted-foreground leading-relaxed">
                    Las oficinas inactivas no se sugieren como sede en configuraciones nuevas.
                  </p>
                </div>
                <div class="flex items-center gap-2 pt-1">
                  <Checkbox id="office_active_toggle" v-model:checked="form.is_active" />
                  <Label for="office_active_toggle" class="font-normal leading-snug">
                    Oficina activa
                  </Label>
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
              {{ saving ? 'Guardando...' : 'Crear oficina' }}
            </Button>
          </div>
        </div>
      </form>
    </div>
  </SettingsLayout>
</template>
