<script setup lang="ts">
import { toast } from 'vue-sonner'

const { $api, $csrf } = useNuxtApp()
const { user, fetchUser, refetchUserSilently } = useAuth()

const loading = ref(true)
const saving = ref(false)
const fullName = ref('')
const phone = ref('')

async function load() {
  loading.value = true
  try {
    if (!user.value) {
      await fetchUser()
    }
    syncFromUser()
  } finally {
    loading.value = false
  }
}

function syncFromUser() {
  const u = user.value
  fullName.value = u?.full_name?.trim() ?? ''
  phone.value = u?.phone?.trim() ?? ''
}

watch(user, () => syncFromUser(), { deep: true })

onMounted(() => {
  void load()
})

async function handleSave() {
  if (saving.value) {
    return
  }
  saving.value = true
  try {
    await $csrf()
    await $api<{ user: NonNullable<typeof user.value> }>('/auth/profile', {
      method: 'PUT',
      body: {
        full_name: fullName.value.trim() || null,
        phone: phone.value.trim() || null,
      },
    })
    await refetchUserSilently()
    toast.success('Datos personales actualizados')
  } catch (e: unknown) {
    console.error(e)
    const msg = e && typeof e === 'object' && 'data' in e
      ? (e as { data?: { message?: string, errors?: Record<string, string[]> } }).data
      : undefined
    const first = msg?.errors && Object.values(msg.errors).flat()[0]
    toast.error(first ?? msg?.message ?? 'No se pudo guardar')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <div class="space-y-6">
    <div>
      <h3 class="text-lg font-medium">
        Datos personales
      </h3>
      <p class="text-sm text-muted-foreground">
        Coinciden con tu ficha de usuario en el sistema. El administrador crea la cuenta en
        <span class="font-medium text-foreground">Configuración → Usuarios</span>
        (nombre de usuario, correo, roles y sucursal). Aquí puedes completar o corregir tu nombre para mostrar y el teléfono.
      </p>
    </div>
    <Separator />

    <div v-if="loading" class="flex justify-center py-10">
      <Icon name="i-lucide-loader-2" class="size-8 animate-spin text-muted-foreground" />
    </div>

    <div v-else-if="!user" class="rounded-md border border-amber-500/40 bg-amber-500/5 px-4 py-3 text-sm text-amber-950 dark:text-amber-100">
      No hay sesión activa. Inicia sesión de nuevo.
    </div>

    <div v-else class="space-y-6">
      <div class="rounded-lg border bg-muted/30 p-4">
        <p class="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Solo lectura (los cambia un administrador)
        </p>
        <dl class="mt-3 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt class="text-muted-foreground">
              Nombre de usuario
            </dt>
            <dd class="mt-0.5 font-medium">
              {{ user.name }}
            </dd>
            <p class="mt-1 text-xs text-muted-foreground">
              Identificador de acceso; no es lo mismo que «Nombre completo».
            </p>
          </div>
          <div>
            <dt class="text-muted-foreground">
              Correo electrónico
            </dt>
            <dd class="mt-0.5 font-medium">
              {{ user.email }}
            </dd>
          </div>
          <div>
            <dt class="text-muted-foreground">
              Sucursal
            </dt>
            <dd class="mt-0.5 font-medium">
              {{ user.sucursal?.name ?? '—' }}
            </dd>
          </div>
          <div class="sm:col-span-2">
            <dt class="text-muted-foreground">
              Roles
            </dt>
            <dd class="mt-2 flex flex-wrap gap-1.5">
              <Badge
                v-for="r in (user.roles ?? [])"
                :key="r"
                variant="secondary"
                class="text-xs font-normal"
              >
                {{ r }}
              </Badge>
              <span v-if="!(user.roles ?? []).length" class="text-muted-foreground">—</span>
            </dd>
          </div>
        </dl>
      </div>

      <div class="space-y-4">
        <div class="space-y-2">
          <Label for="profile-full-name">Nombre completo</Label>
          <Input
            id="profile-full-name"
            v-model="fullName"
            type="text"
            autocomplete="name"
            placeholder="Nombre y apellidos"
          />
          <p class="text-xs text-muted-foreground">
            Es el nombre que verás en esta pantalla y el que suele mostrarse en listados amigables. El administrador puede haberlo dejado vacío al crear el usuario.
          </p>
        </div>
        <div class="space-y-2">
          <Label for="profile-phone">Teléfono de contacto</Label>
          <Input
            id="profile-phone"
            v-model="phone"
            type="tel"
            autocomplete="tel"
            placeholder="Opcional"
          />
        </div>
      </div>

      <div class="flex flex-wrap gap-2">
        <Button type="button" :disabled="saving" @click="handleSave">
          <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 size-4 animate-spin" />
          Guardar cambios
        </Button>
        <Button
          type="button"
          variant="outline"
          :disabled="saving"
          @click="syncFromUser()"
        >
          Descartar
        </Button>
      </div>
    </div>
  </div>
</template>
