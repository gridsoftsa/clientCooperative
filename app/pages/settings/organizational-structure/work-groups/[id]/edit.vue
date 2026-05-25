<script setup lang="ts">
import { toast } from 'vue-sonner'
import Multiselect from '@vueform/multiselect'
import { ORG_WORK_GROUP_KIND_OPTIONS } from '~/constants/org-work-groups'
import type { OrgStaffListItem } from '~/types/org-structure'
import { buildWorkGroupMembersPayload, emptyWorkGroupMemberSelection, workGroupMembersFromApi } from '~/utils/work-group-members'
import type { WorkGroupOfficerRow } from '~/utils/work-group-officers'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: ['estructura_org_editar', 'grupos_trabajo_editar'],
})

const router = useRouter()
const route = useRoute()
const id = computed(() => Number(route.params.id))
const { $api } = useNuxtApp()

const kindOpts = useOrgWorkGroupKindOptions()
const groupKindLoading = computed(() => kindOpts.loading.value)

const memberSelection = ref(emptyWorkGroupMemberSelection())
const officersRows = ref<WorkGroupOfficerRow[]>([])
const initialStaffUnitIds = ref<number[]>([])

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

const kindSelectOptions = computed(() => {
  const base = [...kindOpts.options.value]
  const k = form.value.group_kind
  if (k && !base.some(o => o.value === k)) {
    base.unshift({ value: k, label: kindOpts.labelForValue(k) })
  }
  return base
})

function onActiveChange(v: boolean) {
  form.value.is_active = v
}

const loading = ref(true)
const saving = ref(false)

async function load() {
  loading.value = true
  try {
    const res = await $api<{ data: {
      name: string
      code: string | null
      group_kind?: string | null
      description?: string | null
      is_active: boolean
      members?: Array<{
        member_kind?: string | null
        org_staff_id?: number | null
        org_position_id?: number | null
        org_unit_id?: number | null
        org_staff?: OrgStaffListItem | null
        org_position?: { org_unit?: { id: number } | null } | null
      }>
      role_assignments?: Array<{
        office_role: string
        org_staff_id: number
        sort_order?: number
      }>
    } }>(`/organizational-structure/org-work-groups/${id.value}`)
    const g = res.data
    form.value = {
      name: g.name,
      code: g.code ?? '',
      group_kind: (g.group_kind as string) || ORG_WORK_GROUP_KIND_OPTIONS[0].value,
      description: g.description ?? '',
      is_active: Boolean(g.is_active),
    }
    memberSelection.value = workGroupMembersFromApi(g.members ?? [])

    const unitSet = new Set<number>(memberSelection.value.unitIds)
    for (const m of g.members ?? []) {
      if (m.member_kind === 'unit' && m.org_unit_id != null) {
        unitSet.add(m.org_unit_id)
      }
      if (m.member_kind === 'staff' && m.org_staff?.current_assignment?.org_unit?.id != null) {
        unitSet.add(m.org_staff.current_assignment.org_unit.id)
      }
      if (m.member_kind === 'position' && m.org_position?.org_unit?.id != null) {
        unitSet.add(m.org_position.org_unit.id)
      }
    }
    initialStaffUnitIds.value = [...unitSet]

    officersRows.value = (g.role_assignments ?? []).map(r => ({
      office_role: r.office_role as WorkGroupOfficerRow['office_role'],
      org_staff_id: r.org_staff_id,
      sort_order: r.sort_order ?? 0,
    }))
  } catch {
    toast.error('No se encontró el grupo')
    router.push('/settings/organizational-structure/work-groups')
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  if (!form.value.name.trim()) {
    toast.error('El nombre es obligatorio')
    return
  }
  saving.value = true
  try {
    const members = buildWorkGroupMembersPayload(memberSelection.value)
    await $api(`/organizational-structure/org-work-groups/${id.value}`, {
      method: 'PUT',
      body: {
        name: form.value.name.trim(),
        code: form.value.code.trim() || null,
        group_kind: form.value.group_kind,
        description: form.value.description.trim() || null,
        is_active: form.value.is_active,
        members,
        officers: officersRows.value,
      },
    })
    toast.success('Grupo actualizado')
    router.push('/settings/organizational-structure/work-groups')
  } catch (e: any) {
    toast.error(e?.data?.message || 'Error al guardar')
  } finally {
    saving.value = false
  }
}

onMounted(async () => {
  await kindOpts.fetchOptions()
  await load()
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div v-if="loading" class="flex justify-center py-12">
      <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
    <div v-else class="w-full flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <h2 class="text-2xl font-bold tracking-tight">
            Editar grupo
          </h2>
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
              <Label for="wge_name">Nombre *</Label>
              <Input id="wge_name" v-model="form.name" required />
            </div>
            <div class="space-y-2">
              <Label for="wge_code">Código</Label>
              <Input id="wge_code" v-model="form.code" />
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
                :options="kindSelectOptions"
                value-prop="value"
                label="label"
                :searchable="true"
                :can-clear="false"
                :disabled="groupKindLoading"
                class="wg-kind-ms"
              />
            </div>
            <div class="space-y-2">
              <Label for="wge_desc">Descripción</Label>
              <Textarea id="wge_desc" v-model="form.description" rows="3" class="resize-y min-h-[4.5rem]" />
            </div>
            <OrgStructureActiveMultiselect
              :model-value="form.is_active"
              gender="masculine"
              input-id="wge_active_ms"
              @update:model-value="onActiveChange"
            />
          </CardContent>
        </Card>

        <SettingsWorkGroupMembersEditor
          v-model="memberSelection"
          v-model:officers="officersRows"
          :initial-staff-unit-ids="initialStaffUnitIds"
        />

        <div class="flex justify-end gap-3">
          <Button type="button" variant="outline" @click="router.back()">
            Cancelar
          </Button>
          <Button type="submit" :disabled="saving">
            {{ saving ? 'Guardando…' : 'Guardar' }}
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
