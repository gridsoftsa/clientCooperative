<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { ArchivalFileTreeNode } from '~/types/archival-file'
import type { TalentPartyDetail } from '~/types/talent-party'
import { talentPartyArchivalTree } from '~/utils/talent-party-archival-tree'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'estructura_org_ver',
})

const route = useRoute()
const talentApi = useTalentPartyApi()

const partyId = computed(() => Number(route.params.id))
const loading = ref(true)
const party = ref<TalentPartyDetail | null>(null)

const tree = computed((): ArchivalFileTreeNode | null => {
  if (!party.value?.archival_file_id) {
    return null
  }

  return talentPartyArchivalTree(party.value)
})

const heading = computed(() => {
  if (party.value) {
    return party.value.display_name
  }

  return loading.value ? 'Cargando archivo...' : 'Archivo del proveedor'
})

async function load() {
  loading.value = true
  try {
    const response = await talentApi.show(partyId.value)
    if (response.data.kind !== 'supplier') {
      await navigateTo('/settings/organizational-structure/suppliers')
      return
    }
    party.value = response.data
  }
  catch {
    toast.error('No se pudo cargar el archivo del proveedor.')
    party.value = null
  }
  finally {
    loading.value = false
  }
}

watch(partyId, () => {
  void load()
}, { immediate: true })
</script>

<template>
  <SettingsLayout :wide="true" hide-intro fill>
    <div class="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <div class="shrink-0 space-y-1">
        <PageBackButton to="/settings/organizational-structure/suppliers">
          Proveedores
        </PageBackButton>
        <h2 class="text-2xl font-bold tracking-tight">
          {{ heading }}
        </h2>
        <p class="max-w-3xl text-sm text-muted-foreground">
          Series, subseries y tipos documentales de este proveedor.
          <span v-if="party?.identifier"> Identificación {{ party.identifier }}.</span>
          <span v-if="party?.org_unit"> Área {{ party.org_unit.name }}.</span>
        </p>
      </div>

      <Card class="flex min-h-0 flex-1 flex-col gap-0 overflow-hidden py-0">
        <CardContent class="flex min-h-0 flex-1 flex-col p-0 sm:p-0">
          <div
            v-if="loading"
            class="px-6 py-10 text-sm text-muted-foreground"
          >
            Cargando carpetas...
          </div>
          <div
            v-else-if="!tree"
            class="px-6 py-10 text-sm text-muted-foreground"
          >
            Este proveedor no tiene archivo en la TRD.
          </div>
          <ArchivalFileAreaRepositoryBrowser
            v-else
            :tree="tree"
            :org-unit-id="party?.org_unit_id ?? 0"
            :talent-party-id="party?.id ?? null"
            contained
            nav-title="Carpetas"
            empty-tree-message="Este archivo no tiene series configuradas."
            @uploaded="load"
          />
        </CardContent>
      </Card>
    </div>
  </SettingsLayout>
</template>
