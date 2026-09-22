<script setup lang="ts">
import Multiselect from '@vueform/multiselect'
import { toast } from 'vue-sonner'
import { RadioGroup, RadioGroupItem } from '~/components/ui/radio-group'
import type {
  CatalogConfidentialityPayload,
  ClassificationAccessGrantRow,
  ClassificationAudienceType,
  DocumentClassificationOptions,
  DocumentConfidentialityLevel,
} from '~/types/archival-catalog'

type AreaPick = {
  orgUnitId: number
  wholeArea: boolean
  userIds: number[]
}

const props = withDefaults(defineProps<{
  subjectType: 'series' | 'subseries' | 'document_type'
  confidentiality?: CatalogConfidentialityPayload | null
}>(), {
  confidentiality: null,
})

const catalogApi = useArchivalCatalogApi()

const options = ref<DocumentClassificationOptions | null>(null)
const loading = ref(false)
const inherited = ref(props.subjectType !== 'series')
const level = ref<DocumentConfidentialityLevel>('internal_by_area')
const grants = ref<ClassificationAccessGrantRow[]>([])
const areaPicks = ref<AreaPick[]>([])
const permissionByKey = ref<Record<string, { view: boolean, edit: boolean }>>({})

const isSeries = computed(() => props.subjectType === 'series')

const sourceLabel = computed(() => {
  const source = props.confidentiality?.effective_source
  if (source === 'series') {
    return 'serie'
  }
  if (source === 'subseries') {
    return 'subserie'
  }

  return 'nivel superior'
})

const orgUnitOptions = computed(() =>
  (options.value?.org_units ?? []).map(unit => ({
    value: unit.id,
    label: `${unit.code} — ${unit.name}`,
  })),
)

const selectedAreaIds = ref<number[]>([])

function applyAreaIds(ids: number[]): void {
  const nextIds = [...new Set(ids.filter(id => Number.isFinite(id) && id > 0))]
  const existing = new Map(areaPicks.value.map(pick => [pick.orgUnitId, pick]))
  areaPicks.value = nextIds.map(id => existing.get(id) ?? {
    orgUnitId: id,
    wholeArea: true,
    userIds: [],
  })
  selectedAreaIds.value = nextIds
  syncGrantsFromPicks()
}

function onAreasUpdate(value: unknown): void {
  const ids = Array.isArray(value)
    ? value.map(item => Number(item)).filter(id => Number.isFinite(id))
    : []
  applyAreaIds(ids)
}

const selectedAudiences = computed(() => {
  const map = new Map<string, { type: ClassificationAudienceType, id: number, label: string, view: boolean, edit: boolean }>()
  for (const grant of grants.value) {
    const key = `${grant.audience_type}:${grant.audience_id}`
    const current = map.get(key) ?? {
      type: grant.audience_type,
      id: grant.audience_id,
      label: grant.audience_label ?? `${grant.audience_type} #${grant.audience_id}`,
      view: false,
      edit: false,
    }
    if (grant.permission === 'view') {
      current.view = true
    }
    if (grant.permission === 'edit') {
      current.edit = true
    }
    map.set(key, current)
  }

  return Array.from(map.values())
})

function permissionKey(type: ClassificationAudienceType, id: number): string {
  return `${type}:${id}`
}

function rememberPermissions(rows: ClassificationAccessGrantRow[]): void {
  const next: Record<string, { view: boolean, edit: boolean }> = { ...permissionByKey.value }
  for (const grant of rows) {
    const key = permissionKey(grant.audience_type, grant.audience_id)
    const current = next[key] ?? { view: false, edit: false }
    if (grant.permission === 'view') {
      current.view = true
    }
    if (grant.permission === 'edit') {
      current.edit = true
    }
    next[key] = current
  }
  permissionByKey.value = next
}

function audienceLabel(type: ClassificationAudienceType, id: number): string {
  if (type === 'user') {
    const user = options.value?.users.find(item => item.id === id)

    return user ? user.name : `Usuario #${id}`
  }

  const unit = options.value?.org_units.find(item => item.id === id)

  return unit ? `${unit.code} — ${unit.name}` : `Área #${id}`
}

function userOrgUnitIds(userId: number): number[] {
  return options.value?.users.find(user => user.id === userId)?.org_unit_ids ?? []
}

function usersForUnit(orgUnitId: number): Array<{ value: number, label: string }> {
  const unitId = Number(orgUnitId)

  return (options.value?.users ?? [])
    .filter((user) => {
      const unitIds = (user.org_unit_ids ?? []).map(id => Number(id))

      return unitIds.includes(unitId)
    })
    .map((user) => {
      const suffix = user.email ? ` (${user.email})` : ''

      return { value: user.id, label: `${user.name}${suffix}` }
    })
}

function hydratePicksFromGrants(rows: ClassificationAccessGrantRow[]): void {
  const picks: AreaPick[] = []
  const pickByUnit = new Map<number, AreaPick>()

  const uniqueUnitIds = [...new Set(
    rows.filter(row => row.audience_type === 'org_unit').map(row => row.audience_id),
  )]
  for (const orgUnitId of uniqueUnitIds) {
    const pick: AreaPick = { orgUnitId, wholeArea: true, userIds: [] }
    picks.push(pick)
    pickByUnit.set(orgUnitId, pick)
  }

  const uniqueUserIds = [...new Set(
    rows.filter(row => row.audience_type === 'user').map(row => row.audience_id),
  )]
  for (const userId of uniqueUserIds) {
    const unitIds = userOrgUnitIds(userId)
    if (unitIds.some(id => pickByUnit.get(id)?.wholeArea === true)) {
      continue
    }

    const hostId = unitIds.find(id => pickByUnit.has(id))
      ?? unitIds[0]
      ?? picks[0]?.orgUnitId

    if (hostId == null) {
      continue
    }

    let pick = pickByUnit.get(hostId)
    if (!pick) {
      pick = { orgUnitId: hostId, wholeArea: false, userIds: [] }
      picks.push(pick)
      pickByUnit.set(hostId, pick)
    }
    pick.wholeArea = false
    if (!pick.userIds.includes(userId)) {
      pick.userIds.push(userId)
    }
  }

  areaPicks.value = picks
  selectedAreaIds.value = picks.map(pick => pick.orgUnitId)
}

function pushGrant(
  next: ClassificationAccessGrantRow[],
  type: ClassificationAudienceType,
  id: number,
  permission: 'view' | 'edit',
): void {
  next.push({
    audience_type: type,
    audience_id: id,
    permission,
    audience_label: audienceLabel(type, id),
  })
}

function syncGrantsFromPicks(): void {
  const next: ClassificationAccessGrantRow[] = []
  for (const pick of areaPicks.value) {
    if (pick.wholeArea) {
      const perms = permissionByKey.value[permissionKey('org_unit', pick.orgUnitId)] ?? { view: true, edit: false }
      if (perms.view || perms.edit) {
        pushGrant(next, 'org_unit', pick.orgUnitId, 'view')
      }
      if (perms.edit) {
        pushGrant(next, 'org_unit', pick.orgUnitId, 'edit')
      }
      continue
    }

    for (const userId of pick.userIds) {
      const perms = permissionByKey.value[permissionKey('user', userId)] ?? { view: true, edit: false }
      if (perms.view || perms.edit) {
        pushGrant(next, 'user', userId, 'view')
      }
      if (perms.edit) {
        pushGrant(next, 'user', userId, 'edit')
      }
    }
  }
  grants.value = next
}

function hydrateFrom(payload?: CatalogConfidentialityPayload | null) {
  inherited.value = isSeries.value ? false : Boolean(payload?.inherited ?? true)
  level.value = payload?.inherited
    ? (payload.effective_level ?? 'internal_by_area')
    : (payload?.level ?? payload?.effective_level ?? 'internal_by_area')
  const rows = [...(payload?.inherited ? [] : (payload?.grants ?? []))]
  rememberPermissions(rows)
  grants.value = rows
  if (options.value) {
    hydratePicksFromGrants(rows)
    syncGrantsFromPicks()
  }
}

watch(() => props.confidentiality, (value) => {
  hydrateFrom(value)
}, { immediate: true })

onMounted(async () => {
  loading.value = true
  try {
    options.value = await catalogApi.fetchClassificationOptions()
    hydratePicksFromGrants(grants.value)
    syncGrantsFromPicks()
  }
  catch {
    toast.error('No se pudieron cargar usuarios y áreas para confidencialidad.')
  }
  finally {
    loading.value = false
  }
})

function onLevelChange(value: string | number) {
  if (value === 'public' || value === 'restricted' || value === 'internal_by_area') {
    level.value = value
  }
}

function setWholeArea(orgUnitId: number, enabled: boolean) {
  areaPicks.value = areaPicks.value.map((pick) => {
    if (pick.orgUnitId !== orgUnitId) {
      return pick
    }

    return {
      ...pick,
      wholeArea: enabled,
      userIds: enabled ? [] : pick.userIds,
    }
  })
  syncGrantsFromPicks()
}

function setPickUserIds(orgUnitId: number, ids: number[] | null) {
  areaPicks.value = areaPicks.value.map((pick) => {
    if (pick.orgUnitId !== orgUnitId) {
      return pick
    }

    return { ...pick, userIds: Array.isArray(ids) ? ids : [] }
  })
  syncGrantsFromPicks()
}

function onPickUsersUpdate(orgUnitId: number, value: unknown) {
  const ids = Array.isArray(value) ? value.map(item => Number(item)).filter(id => Number.isFinite(id)) : []
  setPickUserIds(orgUnitId, ids)
}

function setAudiencePermission(type: ClassificationAudienceType, id: number, permission: 'view' | 'edit', enabled: boolean) {
  const key = permissionKey(type, id)
  const current = permissionByKey.value[key] ?? { view: true, edit: false }
  if (permission === 'view') {
    current.view = enabled
    if (!enabled) {
      current.edit = false
    }
  }
  if (permission === 'edit') {
    current.edit = enabled
    if (enabled) {
      current.view = true
    }
  }
  permissionByKey.value = { ...permissionByKey.value, [key]: current }
  syncGrantsFromPicks()
}

function removeAudience(type: ClassificationAudienceType, id: number) {
  if (type === 'org_unit') {
    applyAreaIds(selectedAreaIds.value.filter(unitId => unitId !== id))

    return
  }

  areaPicks.value = areaPicks.value.map(pick => ({
    ...pick,
    userIds: pick.userIds.filter(userId => userId !== id),
  }))
  syncGrantsFromPicks()
}

function unitName(orgUnitId: number): string {
  return audienceLabel('org_unit', orgUnitId)
}

function validate(): string | null {
  if (!isSeries.value && inherited.value) {
    return null
  }

  if (level.value === 'restricted' && grants.value.length === 0) {
    return 'El nivel restringido requiere al menos un usuario o un área.'
  }

  return null
}

function toPayload(): {
  inherited: boolean
  confidentiality_level?: DocumentConfidentialityLevel
  grants: Array<{ audience_type: ClassificationAudienceType, audience_id: number, permission: 'view' | 'edit' }>
} {
  if (!isSeries.value && inherited.value) {
    return { inherited: true, grants: [] }
  }

  return {
    inherited: false,
    confidentiality_level: level.value,
    grants: level.value === 'restricted'
      ? grants.value.map(grant => ({
          audience_type: grant.audience_type,
          audience_id: grant.audience_id,
          permission: grant.permission,
        }))
      : [],
  }
}

defineExpose({ validate, toPayload })
</script>

<template>
  <div class="space-y-3 rounded-md border bg-muted/20 p-4">
    <div>
      <p class="text-sm font-medium">
        Confidencialidad
      </p>
      <p class="text-xs text-muted-foreground leading-snug">
        Si se define aquí, los niveles inferiores (subserie y tipo documental) heredan esta regla.
      </p>
    </div>

    <div v-if="loading" class="text-sm text-muted-foreground">
      Cargando opciones…
    </div>

    <div v-else class="space-y-3">
      <p v-if="confidentiality?.inherited && !isSeries" class="text-xs text-muted-foreground">
        Hoy hereda de la {{ sourceLabel }}
        ({{ confidentiality.effective_level === 'public' ? 'público' : confidentiality.effective_level === 'restricted' ? 'restringido' : 'uso interno' }}).
      </p>

      <Checkbox
        v-if="!isSeries"
        :model-value="inherited"
        @update:model-value="inherited = $event === true"
      >
        Heredar del nivel superior (serie o subserie)
      </Checkbox>

      <div v-if="isSeries || !inherited" class="space-y-3">
        <RadioGroup :model-value="level" @update:model-value="onLevelChange">
          <label class="flex items-start gap-2">
            <RadioGroupItem value="internal_by_area" />
            <span class="text-sm leading-snug">
              <strong>Uso interno.</strong> Solo los usuarios asignados al área productora de la serie pueden consultar el documento.
            </span>
          </label>
          <label class="flex items-start gap-2">
            <RadioGroupItem value="restricted" />
            <span class="text-sm leading-snug">
              <strong>Restringido.</strong> El área productora conserva el acceso. Además, autorice otras áreas o usuarios puntuales.
            </span>
          </label>
          <label class="flex items-start gap-2">
            <RadioGroupItem value="public" />
            <span class="text-sm leading-snug">
              <strong>Público.</strong> Pensado para documentos publicados en la biblioteca institucional que, si se habilita una biblioteca abierta, podrán consultarse con o sin inicio de sesión.
            </span>
          </label>
        </RadioGroup>
      </div>

      <div v-if="(isSeries || !inherited) && level === 'restricted'" class="space-y-3 rounded-md border bg-background p-3">
        <p class="text-sm font-medium">
          Destinatarios adicionales
        </p>
        <p class="text-xs text-muted-foreground leading-snug">
          El área productora de la serie ya tiene acceso. Aquí suma otras áreas o personas.
        </p>
        <div class="space-y-1">
          <Label class="text-xs">Áreas</Label>
          <div class="confidentiality-ms w-full">
            <Multiselect
              :model-value="selectedAreaIds"
              mode="tags"
              :object="false"
              :options="orgUnitOptions"
              value-prop="value"
              label="label"
              :searchable="true"
              :close-on-select="false"
              :hide-selected="false"
              :append-to-body="false"
              :can-clear="true"
              :create-option="false"
              placeholder="Buscar áreas adicionales…"
              no-options-text="No hay áreas"
              no-results-text="Sin coincidencias"
              class="multiselect-confidentiality w-full"
              @update:model-value="onAreasUpdate"
            />
          </div>
        </div>

        <div v-if="areaPicks.length === 0" class="text-xs text-muted-foreground">
          Agregue al menos un área o usuario adicional. El área productora ya puede consultar.
        </div>

        <div
          v-for="pick in areaPicks"
          :key="pick.orgUnitId"
          class="space-y-2 rounded-md border px-3 py-2"
        >
          <p class="text-sm font-medium">
            {{ unitName(pick.orgUnitId) }}
          </p>
          <Checkbox
            :model-value="pick.wholeArea"
            @update:model-value="setWholeArea(pick.orgUnitId, $event === true)"
          >
            Toda el área (todos los usuarios asignados)
          </Checkbox>
          <div v-if="!pick.wholeArea" class="space-y-1">
            <Label class="text-xs">Usuarios del área</Label>
            <div class="confidentiality-ms w-full">
              <Multiselect
                :model-value="pick.userIds"
                mode="tags"
                :object="false"
                :options="usersForUnit(pick.orgUnitId)"
                value-prop="value"
                label="label"
                :searchable="true"
                :close-on-select="false"
                :hide-selected="false"
                :append-to-body="false"
                :can-clear="true"
                :create-option="false"
                placeholder="Buscar y seleccionar usuarios…"
                no-options-text="No hay usuarios en esta área"
                no-results-text="Sin coincidencias"
                class="multiselect-confidentiality w-full"
                @update:model-value="onPickUsersUpdate(pick.orgUnitId, $event)"
              />
            </div>
          </div>
        </div>

        <div v-if="selectedAudiences.length > 0" class="space-y-2">
          <p class="text-xs font-medium text-muted-foreground">
            Permisos
          </p>
          <div
            v-for="audience in selectedAudiences"
            :key="`${audience.type}-${audience.id}`"
            class="flex flex-wrap items-center gap-3 rounded border px-2 py-1.5"
          >
            <span class="min-w-0 flex-1 text-sm">{{ audience.label }}</span>
            <Checkbox
              :model-value="audience.view"
              @update:model-value="setAudiencePermission(audience.type, audience.id, 'view', $event === true)"
            >
              Lectura
            </Checkbox>
            <Checkbox
              :model-value="audience.edit"
              @update:model-value="setAudiencePermission(audience.type, audience.id, 'edit', $event === true)"
            >
              Edición
            </Checkbox>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              class="h-8 text-destructive hover:bg-destructive/10 hover:text-destructive"
              @click="removeAudience(audience.type, audience.id)"
            >
              Quitar
            </Button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style src="@vueform/multiselect/themes/default.css"></style>
<style scoped>
.confidentiality-ms :deep(.multiselect-confidentiality) {
  --ms-font-size: 0.875rem;
  --ms-line-height: 1.375rem;
  --ms-radius: 0.375rem;
  --ms-border-width: 1px;
  --ms-border-color: var(--border);
  --ms-border-color-active: var(--ring);
  --ms-bg: var(--background);
  --ms-tag-bg: var(--primary);
  --ms-tag-color: var(--primary-foreground);
  --ms-tag-radius: 0.25rem;
  --ms-option-bg-selected: color-mix(in srgb, var(--primary) 12%, transparent);
  --ms-option-color-selected: var(--foreground);
  min-height: 2.5rem;
  width: 100%;
  border: 1px solid var(--border);
  background-color: var(--background);
  color: var(--foreground);
}

.confidentiality-ms :deep(.multiselect-tags) {
  gap: 0.375rem;
  padding: 0.25rem 0;
  flex-wrap: wrap;
}

.confidentiality-ms :deep(.multiselect-tag) {
  background: var(--primary);
  color: var(--primary-foreground);
  border-radius: 0.25rem;
}

.confidentiality-ms :deep(.multiselect-dropdown) {
  z-index: 60;
}

.confidentiality-ms :deep(.multiselect-option) {
  overflow: visible;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  white-space: normal;
}

.confidentiality-ms :deep(.multiselect-checkbox) {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
  border: 1px solid var(--border);
  border-radius: 0.25rem;
  background: var(--background);
}

.confidentiality-ms :deep(.multiselect-option.is-selected .multiselect-checkbox) {
  background: var(--primary);
  border-color: var(--primary);
}
</style>
