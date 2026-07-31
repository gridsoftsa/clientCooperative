<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { ArchivalAccessGrant } from '~/types/archival-access'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'expedientes_acceso_gestionar',
})

const route = useRoute()
const router = useRouter()
const archivalApi = useArchivalFileApi()

const grantId = computed(() => Number(route.params.id))
const loading = ref(true)
const grant = ref<ArchivalAccessGrant | null>(null)

async function load() {
  loading.value = true
  try {
    const grants = await archivalApi.fetchAccessGrants()
    grant.value = grants.find(item => item.id === grantId.value) ?? null
    if (!grant.value) {
      toast.error('Permiso no encontrado.')
      await router.push('/expedientes/acceso')
    }
  }
  catch {
    toast.error('No se pudo cargar el permiso.')
    await router.push('/expedientes/acceso')
  }
  finally {
    loading.value = false
  }
}

function onSaved() {
  router.push('/expedientes/acceso')
}

onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="text-2xl font-semibold tracking-tight">
          Editar permiso de acceso
        </h1>
        <p class="text-sm text-muted-foreground">
          Actualice destinatario, permiso, alcance o vigencia.
        </p>
      </div>
      <Button variant="outline" as-child>
        <NuxtLink to="/expedientes/acceso">
          Volver al listado
        </NuxtLink>
      </Button>
    </div>

    <div v-if="loading" class="py-10 text-center text-muted-foreground">
      Cargando permiso...
    </div>

    <ArchivalAccessGrantForm
      v-else-if="grant"
      :grant-id="grant.id"
      :initial-grant="grant"
      @saved="onSaved"
      @cancel="router.push('/expedientes/acceso')"
    />
  </div>
</template>
