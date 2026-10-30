<script setup lang="ts">
import type { TalentPartyDetail, TalentPartyKind } from '~/types/talent-party'
import { toast } from 'vue-sonner'

const props = defineProps<{
  kind: TalentPartyKind
  partyId: number
}>()

const talentApi = useTalentPartyApi()
const party = ref<TalentPartyDetail | null>(null)
const loading = ref(true)

const section = computed(() => props.kind === 'supplier' ? 'proveedores' : 'empleados')
const singular = computed(() => props.kind === 'supplier' ? 'proveedor' : 'empleado')
const repositoryHref = computed(() => {
  const orgUnitId = party.value?.org_unit_id
  if (!orgUnitId) {
    return '/expedientes/area'
  }

  return `/expedientes/area?org_unit_id=${orgUnitId}`
})

async function load() {
  loading.value = true
  try {
    const response = await talentApi.show(props.partyId)
    if (response.data.kind !== props.kind) {
      await navigateTo(`/talento-humano/${response.data.kind === 'supplier' ? 'proveedores' : 'empleados'}/${response.data.id}`)
      return
    }
    party.value = response.data
  }
  catch {
    toast.error('No se pudo cargar la carpeta.')
    party.value = null
  }
  finally {
    loading.value = false
  }
}

watch(() => props.partyId, () => {
  void load()
}, { immediate: true })
</script>

<template>
  <div class="space-y-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <Button
          variant="ghost"
          size="sm"
          class="mb-2 -ml-2"
          as-child
        >
          <NuxtLink :to="`/talento-humano/${section}`">
            <Icon name="i-lucide-arrow-left" class="mr-1.5 size-4" />
            Volver
          </NuxtLink>
        </Button>
        <h1 class="text-2xl font-semibold tracking-tight">
          {{ party?.display_name || (loading ? 'Cargando carpeta...' : 'Carpeta') }}
        </h1>
        <p
          v-if="party"
          class="mt-1 text-sm text-muted-foreground"
        >
          {{ party.kind_label }}
          <span v-if="party.identifier"> · {{ party.identifier }}</span>
          <span v-if="party.org_unit"> · {{ party.org_unit.name }}</span>
        </p>
      </div>
      <Button
        v-if="party"
        variant="outline"
        as-child
      >
        <NuxtLink :to="repositoryHref">
          Ver en repositorio del área
        </NuxtLink>
      </Button>
    </div>

    <div
      v-if="loading"
      class="text-sm text-muted-foreground"
    >
      Cargando subcarpetas...
    </div>

    <p
      v-else-if="!party"
      class="text-sm text-muted-foreground"
    >
      No se encontró este {{ singular }}.
    </p>

    <div
      v-else
      class="space-y-4"
    >
      <Card
        v-for="folder in party.folders"
        :key="folder.doc_subseries_id"
      >
        <CardHeader>
          <CardTitle class="text-base">
            {{ folder.name }}
          </CardTitle>
          <CardDescription>
            {{ folder.series_name }}
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-3">
          <TalentPartyTypeUpload
            v-for="documentType in folder.document_types"
            :key="documentType.id"
            :party-id="party.id"
            :document-type="documentType"
            @uploaded="load"
          />
          <p
            v-if="folder.document_types.length === 0"
            class="text-sm text-muted-foreground"
          >
            Esta subserie no tiene tipos documentales activos.
          </p>
        </CardContent>
      </Card>
    </div>
  </div>
</template>
