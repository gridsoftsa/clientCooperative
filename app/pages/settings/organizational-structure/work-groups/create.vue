<script setup lang="ts">
import { toast } from 'vue-sonner'
import Multiselect from '@vueform/multiselect'
import { ORG_WORK_GROUP_KIND_OPTIONS } from '~/constants/org-work-groups'
import { buildWorkGroupMembersPayload, emptyWorkGroupMemberSelection } from '~/utils/work-group-members'
import type { WorkGroupOfficerRow } from '~/utils/work-group-officers'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: ['estructura_org_editar', 'grupos_trabajo_crear'],
})

const router = useRouter()
const { $api } = useNuxtApp()

const {
  options: workGroupKindOptions,
  loading: workGroupKindLoading,
  fetchOptions: fetchWorkGroupKindOptions,
} = useOrgWorkGroupKindOptions()

const memberSelection = ref(emptyWorkGroupMemberSelection())
const officersRows = ref<WorkGroupOfficerRow[]>([])

const form = ref<{
  name: string
  code: string
  group_kind: string
  description: string
  is_active: boolean
}>({
  name: '',
  code: '',
  group_kind: ORG_WORK_GROUP_KIND_OPTIONS[0].value,
  description: '',
  is_active: true,
})

onMounted(async () => {
  await fetchWorkGroupKindOptions()
  if (!workGroupKindOptions.value.some(o => o.value === form.value.group_kind)) {
    const first = workGroupKindOptions.value[0]?.value
    if (first) {
      form.value.group_kind = first
    }
  }
})

const saving = ref(false)

function onActiveChange(v: boolean) {
  form.value.is_active = v
}

async function handleSubmit() {
  if (!form.value.name.trim()) {
    toast.error('El nombre es obligatorio')
    return
  }
  saving.value = true
  try {
    const members = buildWorkGroupMembersPayload(memberSelection.value)
    await $api('/organizational-structure/org-work-groups', {
      method: 'POST',
      body: {
        name: form.value.name.trim(),
        code: form.value.code.trim() || undefined,
        group_kind: form.value.group_kind,
        description: form.value.description.trim() || undefined,
        is_active: form.value.is_active,
        ...(members.length > 0 ? { members } : {}),
        ...(officersRows.value.length > 0 ? { officers: officersRows.value } : {}),
      },
    })
    toast.success('Grupo creado')
    router.push('/settings/organizational-structure/work-groups')
  } catch (e: any) {
    toast.error(e?.data?.message || 'Error al crear')
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
            Nuevo grupo o comité
          </h2>
          <p class="text-muted-foreground leading-relaxed max-w-2xl">
            Defina el tipo de comité o equipo, la directiva (presidente/secretario/delegados) y los miembros por persona, cargo o área.
          </p>
        </div>
        <Button variant="outline" @click="router.push('/settings/organizational-structure/work-groups')">
          <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
          Volver
        </Button>
      </div>

      <form @submit.prevent="handleSubmit" class="grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Datos generales</CardTitle>
          </CardHeader>
          <CardContent class="space-y-6 max-w-2xl">
            <div class="space-y-2">
              <Label for="wg_name">Nombre *</Label>
              <Input id="wg_name" v-model="form.name" required />
            </div>
            <div class="space-y-2">
              <Label for="wg_code">Código (opcional)</Label>
              <Input id="wg_code" v-model="form.code" placeholder="Único por entidad si lo indica" />
            </div>
            <div class="space-y-2">
              <Label>Tipo de grupo *</Label>
              <p class="text-xs text-muted-foreground leading-relaxed">
                Los valores del listado se definen en
                <NuxtLink to="/parametrizacion/estructura" class="text-primary underline underline-offset-2">
                  Parametrización → Estructura
                </NuxtLink>.
              </p>
              <Multiselect
                v-model="form.group_kind"
                :options="workGroupKindOptions"
                value-prop="value"
                label="label"
                :searchable="true"
                :can-clear="false"
                :disabled="workGroupKindLoading"
                class="wg-kind-ms"
              />
            </div>
            <div class="space-y-2">
              <Label for="wg_desc">Descripción</Label>
              <Textarea id="wg_desc" v-model="form.description" rows="3" class="resize-y min-h-[4.5rem]" />
            </div>
            <OrgStructureActiveMultiselect
              :model-value="form.is_active"
              gender="masculine"
              input-id="wg_active_ms"
              helper-text="Los grupos inactivos no se proponen en flujos futuros."
              @update:model-value="onActiveChange"
            />
          </CardContent>
        </Card>

        <SettingsWorkGroupMembersEditor v-model="memberSelection" v-model:officers="officersRows" />

        <div class="flex justify-end gap-3">
          <Button type="button" variant="outline" @click="router.back()">
            Cancelar
          </Button>
          <Button type="submit" :disabled="saving">
            {{ saving ? 'Guardando…' : 'Crear grupo' }}
          </Button>
        </div>
      </form>
    </div>
  </SettingsLayout>
</template>

<style src="@vueform/multiselect/themes/default.css"></style>
<style scoped>
.wg-kind-ms :deep(.multiselect) {
  min-height: 2.75rem;
}
</style>
