<script setup lang="ts">
import type { TalentPartyDetail } from '~/types/talent-party'
import { toast } from 'vue-sonner'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'estructura_org_ver',
})

const route = useRoute()
const router = useRouter()
const talentApi = useTalentPartyApi()
const partyId = computed(() => Number(route.params.id))
const party = ref<TalentPartyDetail | null>(null)
const loading = ref(true)

const { labelForValue: documentTypeLabel, fetchOptions: fetchDocumentTypeOptions } = useTemplateFlatCatalogOptions('tipo-documento', [
  { value: 'NIT', label: 'NIT' },
  { value: 'CC', label: 'Cédula de Ciudadanía' },
  { value: 'CE', label: 'Cédula de Extranjería' },
])

function displayValue(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? ''

  return trimmed === '' ? '—' : trimmed
}

async function loadParty(): Promise<void> {
  loading.value = true
  try {
    const response = await talentApi.show(partyId.value)
    if (response.data.kind !== 'supplier') {
      await router.push('/settings/organizational-structure/suppliers')
      return
    }
    party.value = response.data
  }
  catch {
    toast.error('No se pudo cargar el proveedor.')
    party.value = null
  }
  finally {
    loading.value = false
  }
}

onMounted(async () => {
  await Promise.all([fetchDocumentTypeOptions(), loadParty()])
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="flex w-full flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <h2 class="text-2xl font-bold tracking-tight">
            {{ party?.display_name || (loading ? 'Cargando…' : 'Proveedor') }}
          </h2>
          <p class="text-muted-foreground leading-relaxed">
            Datos del proveedor. Use Editar para cambiarlos o Ver archivo para el expediente TRD.
          </p>
        </div>
        <div class="flex shrink-0 flex-wrap gap-2">
          <Button variant="outline" @click="router.push('/settings/organizational-structure/suppliers')">
            <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
            Volver
          </Button>
          <Button
            v-if="party?.archival_file_id"
            variant="outline"
            as-child
          >
            <NuxtLink :to="`/settings/organizational-structure/suppliers/${party.id}/archivo`">
              Ver archivo
            </NuxtLink>
          </Button>
          <PermissionGate permission="estructura_org_editar">
            <Button
              v-if="party"
              variant="warning"
              @click="router.push(`/settings/organizational-structure/suppliers/${party.id}/edit`)"
            >
              Editar
            </Button>
          </PermissionGate>
        </div>
      </div>

      <Card v-if="loading">
        <CardContent class="p-6">
          <div class="flex items-center justify-center">
            <Icon name="i-lucide-loader-2" class="h-6 w-6 animate-spin" />
          </div>
        </CardContent>
      </Card>

      <p
        v-else-if="!party"
        class="text-sm text-muted-foreground"
      >
        No se encontró este proveedor.
      </p>

      <div v-else class="grid gap-6">
        <Card>
          <CardHeader class="gap-2">
            <CardTitle class="leading-snug">
              Información
            </CardTitle>
          </CardHeader>
          <CardContent class="space-y-8">
            <section class="space-y-4">
              <p class="text-sm font-medium leading-snug text-foreground">
                Identificación
              </p>
              <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 md:gap-x-6 md:gap-y-5">
                <div class="min-w-0 space-y-1">
                  <p class="text-sm text-muted-foreground">Tipo de documento</p>
                  <p class="font-medium">{{ documentTypeLabel(party.document_type) }}</p>
                </div>
                <div class="min-w-0 space-y-1">
                  <p class="text-sm text-muted-foreground">Documento</p>
                  <p class="font-medium">{{ displayValue(party.identifier) }}</p>
                </div>
                <div class="min-w-0 space-y-1">
                  <p class="text-sm text-muted-foreground">Nombre de compañía</p>
                  <p class="font-medium">{{ party.display_name }}</p>
                </div>
              </div>
            </section>
            <Separator />
            <section class="space-y-4">
              <p class="text-sm font-medium leading-snug text-foreground">
                Contacto
              </p>
              <div class="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-3 md:gap-x-6 md:gap-y-5">
                <div class="min-w-0 space-y-1">
                  <p class="text-sm text-muted-foreground">Celular</p>
                  <p class="font-medium">{{ displayValue(party.phone) }}</p>
                </div>
                <div class="min-w-0 space-y-1">
                  <p class="text-sm text-muted-foreground">E-mail</p>
                  <p class="font-medium">{{ displayValue(party.email) }}</p>
                </div>
                <div class="min-w-0 space-y-1">
                  <p class="text-sm text-muted-foreground">Dirección</p>
                  <p class="font-medium">{{ displayValue(party.address) }}</p>
                </div>
                <div class="min-w-0 space-y-1">
                  <p class="text-sm text-muted-foreground">Código postal</p>
                  <p class="font-medium">{{ displayValue(party.postal_code) }}</p>
                </div>
              </div>
            </section>
          </CardContent>
        </Card>

        <Card>
          <CardHeader class="gap-2">
            <CardTitle class="leading-snug">
              Estado del registro
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge :variant="party.is_active === false ? 'secondary' : 'default'">
              {{ party.is_active === false ? 'Inactivo' : 'Activo' }}
            </Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  </SettingsLayout>
</template>
