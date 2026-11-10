<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { Applicant } from '~/types/applicant'
import type { ArchivalFileTreeNode } from '~/types/archival-file'
import type { TalentPartyDetail } from '~/types/talent-party'
import { talentPartyArchivalTree } from '~/utils/talent-party-archival-tree'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'solicitantes_ver',
})

const route = useRoute()
const { $api } = useNuxtApp()
const talentApi = useTalentPartyApi()

const applicantId = computed(() => Number(route.params.id))
const loading = ref(true)
const party = ref<TalentPartyDetail | null>(null)
const missingFile = ref(false)

const tree = computed((): ArchivalFileTreeNode | null => {
  if (!party.value) {
    return null
  }

  return talentPartyArchivalTree(party.value)
})

const heading = computed(() => {
  if (party.value) {
    return party.value.display_name
  }

  return loading.value ? 'Cargando archivo...' : 'Archivo del solicitante'
})

async function load(): Promise<void> {
  loading.value = true
  missingFile.value = false
  try {
    const applicant = await $api<{ data: Applicant }>(`/applicants/${applicantId.value}`)
    const talentPartyId = applicant.data.trd_file?.talent_party_id
    if (!talentPartyId) {
      party.value = null
      missingFile.value = true
      return
    }

    const response = await talentApi.show(talentPartyId)
    party.value = response.data
  }
  catch {
    toast.error('No se pudo cargar el archivo del solicitante.')
    party.value = null
  }
  finally {
    loading.value = false
  }
}

watch(applicantId, () => {
  void load()
}, { immediate: true })
</script>

<template>
  <SettingsLayout :wide="true" hide-intro fill>
    <div class="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <div class="shrink-0 space-y-1">
        <PageBackButton to="/solicitantes">
          Solicitantes
        </PageBackButton>
        <h2 class="text-2xl font-bold tracking-tight">
          {{ heading }}
        </h2>
        <p class="max-w-3xl text-sm text-muted-foreground">
          Series, subseries y tipos documentales de este solicitante.
          <span v-if="party?.identifier"> Identificación {{ party.identifier }}.</span>
          <span v-if="party?.org_unit"> Área {{ party.org_unit.name }}.</span>
        </p>
      </div>

      <Card class="flex min-h-0 flex-1 flex-col overflow-hidden">
        <CardContent class="flex min-h-0 flex-1 flex-col p-0 sm:p-0">
          <div
            v-if="loading"
            class="px-6 py-10 text-sm text-muted-foreground"
          >
            Cargando carpetas...
          </div>
          <div
            v-else-if="missingFile || !tree"
            class="px-6 py-10 text-sm text-muted-foreground"
          >
            Este solicitante no tiene archivo en la TRD. Guarde la configuración de archivo en Solicitantes.
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
