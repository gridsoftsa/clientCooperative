<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { SecuritySettings } from '~/types/security'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'seguridad_ver',
})

const { $api, $csrf } = useNuxtApp()
const { hasPermission } = usePermissions()

const loading = ref(false)
const saving = ref(false)

const form = ref({
  password_expiration_enabled: false,
  password_expiration_days: 90,
  password_expiration_warning_days: 7,
})

const canEdit = computed(() => hasPermission('seguridad_editar'))

async function fetchSettings() {
  loading.value = true
  try {
    const res = await $api<{ data: SecuritySettings }>('/security-settings')
    form.value = {
      password_expiration_enabled: res.data.password_expiration_enabled,
      password_expiration_days: res.data.password_expiration_days,
      password_expiration_warning_days: res.data.password_expiration_warning_days,
    }
  } catch (e) {
    console.error(e)
    toast.error('Error al cargar la política de contraseñas')
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  if (!canEdit.value) {
    return
  }

  if (form.value.password_expiration_warning_days >= form.value.password_expiration_days) {
    toast.error('Los días de aviso deben ser menores que el período de vencimiento')
    return
  }

  saving.value = true
  try {
    await $csrf()
    await $api('/security-settings', {
      method: 'PUT',
      body: form.value,
    })
    toast.success('Política de contraseñas guardada')
  } catch (e: any) {
    const message =
      e?.data?.errors?.password_expiration_warning_days?.[0]
      || e?.data?.message
      || 'No se pudo guardar la configuración'
    toast.error(message)
  } finally {
    saving.value = false
  }
}

onMounted(fetchSettings)
</script>

<template>
  <SettingsLayout>
    <div class="w-full max-w-2xl flex flex-col gap-6">
      <div>
        <h2 class="text-2xl font-bold tracking-tight">
          Seguridad de contraseñas
        </h2>
        <p class="text-muted-foreground">
          Define cuándo vencen las contraseñas y cuándo avisar a los usuarios por correo.
        </p>
      </div>

      <div v-if="loading" class="flex justify-center py-12">
        <Icon name="i-lucide-loader-2" class="size-8 animate-spin text-muted-foreground" />
      </div>

      <form v-else class="space-y-6" @submit.prevent="handleSubmit">
        <Card>
          <CardHeader>
            <CardTitle>Vencimiento de contraseñas</CardTitle>
            <CardDescription>
              Cuando una contraseña vence, el usuario debe cambiarla para seguir usando el portal.
              Se le enviará un correo de aviso antes del vencimiento y otro cuando expire.
            </CardDescription>
          </CardHeader>
          <CardContent class="space-y-6">
            <div class="flex items-center gap-3 rounded-lg border p-4">
              <Checkbox
                id="password_expiration_enabled"
                v-model:checked="form.password_expiration_enabled"
                :disabled="!canEdit"
              />
              <div class="space-y-1">
                <Label for="password_expiration_enabled" class="text-base font-medium">
                  Activar vencimiento de contraseñas
                </Label>
                <p class="text-sm text-muted-foreground">
                  Obliga a renovar la contraseña después del período configurado.
                </p>
              </div>
            </div>

            <div class="grid gap-6 sm:grid-cols-2">
              <div class="space-y-2">
                <Label for="password_expiration_days">Vencer cada (días)</Label>
                <Input
                  id="password_expiration_days"
                  v-model.number="form.password_expiration_days"
                  type="number"
                  min="1"
                  max="3650"
                  :disabled="!canEdit || !form.password_expiration_enabled"
                />
                <p class="text-xs text-muted-foreground">
                  Ejemplo: 90 días desde el último cambio de contraseña.
                </p>
              </div>

              <div class="space-y-2">
                <Label for="password_expiration_warning_days">Avisar antes (días)</Label>
                <Input
                  id="password_expiration_warning_days"
                  v-model.number="form.password_expiration_warning_days"
                  type="number"
                  min="1"
                  max="365"
                  :disabled="!canEdit || !form.password_expiration_enabled"
                />
                <p class="text-xs text-muted-foreground">
                  Correo de recordatorio antes del vencimiento.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div class="flex justify-end">
          <Button type="submit" :disabled="saving || !canEdit">
            <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 size-4 animate-spin" />
            Guardar configuración
          </Button>
        </div>
      </form>
    </div>
  </SettingsLayout>
</template>
