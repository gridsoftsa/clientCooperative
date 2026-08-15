<script setup lang="ts">
import { toast } from 'vue-sonner'
import {
  TRD_INHERITED_FROM_LABELS,
  TRD_RETENTION_APPLICATION_OPTIONS,
  TRD_RETENTION_LEVEL_HELP,
  TRD_SCOPE_LEVEL_OPTIONS,
  TRD_VERSION_STATUS_LABELS,
  formatFinalDispositionLabels,
  parseFinalDisposition,
  serializeFinalDisposition,
} from '~/constants/archival-trd'
import { coerceBoolean } from '~/utils/coerce-boolean'
import { resolveEffectiveRetentionFromRules } from '~/utils/archival-trd-version'
import { isTrdVersionTab, trdVersionPathWithTab } from '~/utils/archival-trd-navigation'
import type { DocDocumentTypeRow } from '~/types/archival-catalog'
import type { CatalogTreeSeries, EffectiveRetentionPayload, TrdRetentionRuleRow, TrdTestingOptions, TrdVersionRow } from '~/types/archival-trd'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'trd_tablas_ver',
})

const route = useRoute()
const router = useRouter()
const { $api } = useNuxtApp()
const trdApi = useTrdApi()
const catalogApi = useArchivalCatalogApi()
const { hasPermission } = usePermissions()

const tableId = computed(() => Number(route.params.tableId))
const versionId = computed(() => Number(route.params.versionId))

const table = ref<{ org_unit_id: number; org_unit?: { name: string; code: string } } | null>(null)
const version = ref<TrdVersionRow | null>(null)
const preview = ref<Record<number, EffectiveRetentionPayload | null>>({})
const catalogTree = ref<CatalogTreeSeries[]>([])
const loading = ref(true)
const saving = ref(false)
const activating = ref(false)
const testingOptions = ref<TrdTestingOptions | null>(null)
const testEffectiveTo = ref('')
const savingTestEffectiveTo = ref(false)
const publishingTestAlerts = ref(false)

const selectedTypeIds = ref<number[]>([])
const metaForm = ref({
  producer_office_name: '',
  producer_office_code: '',
  retention_application_level: 'document_type',
  approved_at: '',
  effective_from: '',
  effective_to: '',
})

const trdTestingEnabled = computed(() =>
  testingOptions.value?.allow_manual_effective_to === true && hasPermission('trd_tablas_editar'),
)

const isVersionActive = computed(() => version.value?.status === 'active')

type MetaDateField = 'approved_at' | 'effective_from'

const META_DATE_FIELDS: MetaDateField[] = ['approved_at', 'effective_from']

const META_DATE_LABELS: Record<MetaDateField, string> = {
  approved_at: 'Fecha aprobación',
  effective_from: 'Vigencia desde',
}

const metaValidationVisible = ref(false)
const activeTab = ref(
  isTrdVersionTab(route.query.tab) ? route.query.tab : 'general',
)
let syncingTabFromRoute = false

const showRuleForm = ref(false)
const editingRuleId = ref<number | null>(null)
const hydratingRuleForm = ref(false)
const finalDispositionSelected = ref<string[]>([])
const ruleForm = ref({
  scope_level: 'document_type',
  doc_series_id: null as number | null,
  doc_subseries_id: null as number | null,
  doc_document_type_id: null as number | null,
  years_management: 2,
  years_central: 5,
  years_historical: null as number | null,
  procedure_text: '',
  notes: '',
})

const isDraft = computed(() => version.value?.status === 'draft' && !version.value?.is_locked)
const canEdit = computed(() => isDraft.value && hasPermission('trd_tablas_editar'))
const canManageCatalog = computed(() => hasPermission('trd_catalogo_editar'))

const producerOrgUnitId = computed(() => table.value?.org_unit_id ?? null)

const catalogReturnTo = computed(() =>
  trdVersionPathWithTab(tableId.value, versionId.value, 'catalog'),
)

const catalogCreateSeriesPath = computed(() => {
  if (producerOrgUnitId.value == null) {
    return '/settings/archival/catalog/series/create'
  }
  const q = new URLSearchParams({
    org_unit_id: String(producerOrgUnitId.value),
    return_to: catalogReturnTo.value,
  })
  return `/settings/archival/catalog/series/create?${q.toString()}`
})

const catalogSeriesListPath = computed(() => {
  if (producerOrgUnitId.value == null) {
    return '/settings/archival/catalog/series'
  }
  return `/settings/archival/catalog/series?org_unit_id=${producerOrgUnitId.value}`
})

async function reloadCatalogTree() {
  if (producerOrgUnitId.value == null) {
    catalogTree.value = []
    return
  }
  catalogTree.value = await trdApi.fetchCatalogTree(producerOrgUnitId.value, false)
}

const catalogRowActionClass = 'h-8 gap-1.5 px-2 text-xs'

const savingSeriesActiveId = ref<number | null>(null)

function serieDeactivationBlockReason(serie: CatalogTreeSeries): string | null {
  if (serie.subseries.length > 0) {
    return 'Quite o inactivé primero las subseries y sus tipos documentales.'
  }

  return null
}

function canDeactivateSeries(serie: CatalogTreeSeries): boolean {
  return serieDeactivationBlockReason(serie) === null
}

async function setSeriesActive(serie: CatalogTreeSeries, isActive: boolean) {
  if (!canManageCatalog.value) {
    return
  }

  if (!isActive && !canDeactivateSeries(serie)) {
    toast.error(serieDeactivationBlockReason(serie) ?? 'No se puede inactivar la serie.')
    return
  }

  savingSeriesActiveId.value = serie.id

  try {
    await $api(`/archival/catalog/series/${serie.id}`, {
      method: 'PUT',
      body: { is_active: isActive },
    })
    toast.success(isActive ? 'Serie activada.' : 'Serie inactivada.')
    await reloadCatalogTree()
  }
  catch (e: unknown) {
    const err = e as { data?: { message?: string, errors?: Record<string, string[]> } }
    const first = err.data?.errors?.is_active?.[0]
    toast.error(first ?? err.data?.message ?? 'No se pudo actualizar el estado de la serie.')
  }
  finally {
    savingSeriesActiveId.value = null
  }
}

const savingSeriesLibraryId = ref<number | null>(null)

function isSeriesPublishableToLibrary(serie: CatalogTreeSeries): boolean {
  return coerceBoolean(serie.publishable_to_institutional_library)
}

async function toggleSeriesLibraryPublishable(serie: CatalogTreeSeries, enabled: boolean) {
  if (!canManageCatalog.value) {
    return
  }

  const previous = serie.publishable_to_institutional_library
  serie.publishable_to_institutional_library = enabled
  savingSeriesLibraryId.value = serie.id

  try {
    await $api(`/archival/catalog/series/${serie.id}`, {
      method: 'PUT',
      body: { publishable_to_institutional_library: enabled },
    })
    toast.success(
      enabled
        ? 'Serie habilitada para biblioteca institucional.'
        : 'Serie deshabilitada para biblioteca institucional.',
    )
  }
  catch (e: unknown) {
    serie.publishable_to_institutional_library = previous
    const err = e as { data?: { message?: string } }
    toast.error(err.data?.message ?? 'No se pudo actualizar la serie.')
  }
  finally {
    savingSeriesLibraryId.value = null
  }
}

function dispositionLabel(v: string): string {
  return formatFinalDispositionLabels(v)
}

function inheritedLabel(v: string): string {
  return TRD_INHERITED_FROM_LABELS[v] ?? v
}

interface CatalogDocumentTypeOption {
  id: number
  label: string
  seriesCode: string
  subseriesCode: string
}

function buildCatalogDocumentTypeOptions(): CatalogDocumentTypeOption[] {
  const associatedIds = new Set((version.value?.document_types ?? []).map(t => t.id))
  const options: CatalogDocumentTypeOption[] = []

  for (const serie of catalogTree.value) {
    for (const sub of serie.subseries) {
      for (const dt of sub.document_types) {
        if (associatedIds.size > 0 && !associatedIds.has(dt.id)) {
          continue
        }
        options.push({
          id: dt.id,
          label: `${serie.code}/${sub.code}/${dt.code} — ${dt.name}`,
          seriesCode: serie.code,
          subseriesCode: sub.code,
        })
      }
    }
  }

  if (options.length === 0) {
    for (const dt of version.value?.document_types ?? []) {
      options.push({
        id: dt.id,
        label: `${dt.code} — ${dt.name}`,
        seriesCode: '',
        subseriesCode: '',
      })
    }
  }

  return options.sort((a, b) => a.label.localeCompare(b.label, 'es'))
}

const documentTypeOptions = computed(() => buildCatalogDocumentTypeOptions())

const associatedDocumentTypeIds = computed(
  () => new Set((version.value?.document_types ?? []).map(t => t.id)),
)

const seriesOptionsForDocumentType = computed(() => {
  const associated = associatedDocumentTypeIds.value

  return catalogTree.value
    .filter(serie => serie.subseries.some(sub =>
      sub.document_types.some(dt => associated.size === 0 || associated.has(dt.id)),
    ))
    .map(serie => ({ id: serie.id, label: `${serie.code} — ${serie.name}` }))
})

const subseriesOptionsForDocumentType = computed(() => {
  const sid = ruleForm.value.doc_series_id
  if (!sid) {
    return []
  }

  const serie = catalogTree.value.find(s => s.id === sid)
  const associated = associatedDocumentTypeIds.value

  return (serie?.subseries ?? [])
    .filter(sub => sub.document_types.some(dt => associated.size === 0 || associated.has(dt.id)))
    .map(sub => ({ id: sub.id, label: `${sub.code} — ${sub.name}` }))
})

const filteredDocumentTypeOptions = computed(() => {
  const ssid = ruleForm.value.doc_subseries_id
  if (!ssid) {
    return []
  }

  const associated = associatedDocumentTypeIds.value

  for (const serie of catalogTree.value) {
    const sub = serie.subseries.find(item => item.id === ssid)
    if (sub) {
      return sub.document_types
        .filter(dt => associated.size === 0 || associated.has(dt.id))
        .map(dt => ({ id: dt.id, label: `${dt.code} — ${dt.name}` }))
        .sort((a, b) => a.label.localeCompare(b.label, 'es'))
    }
  }

  return []
})

function catalogPathForDocumentType(typeId: number): { seriesId: number, subseriesId: number } | null {
  for (const serie of catalogTree.value) {
    for (const sub of serie.subseries) {
      if (sub.document_types.some(dt => dt.id === typeId)) {
        return { seriesId: serie.id, subseriesId: sub.id }
      }
    }
  }

  return null
}

function isRetentionRuleTargetTaken(
  scopeLevel: string,
  targetId: number | null | undefined,
  excludeRuleId: number | null = editingRuleId.value,
): boolean {
  if (targetId == null) {
    return false
  }

  return (version.value?.retention_rules ?? []).some((rule) => {
    if (rule.id === excludeRuleId) {
      return false
    }

    if (scopeLevel === 'document_type') {
      return rule.scope_level === 'document_type' && rule.doc_document_type_id === targetId
    }

    if (scopeLevel === 'subseries') {
      return rule.scope_level === 'subseries' && rule.doc_subseries_id === targetId
    }

    if (scopeLevel === 'series') {
      return rule.scope_level === 'series' && rule.doc_series_id === targetId
    }

    return false
  })
}

function isDocumentTypeOptionDisabled(typeId: number): boolean {
  return isRetentionRuleTargetTaken('document_type', typeId)
}

function isSubseriesOptionDisabled(subseriesId: number): boolean {
  return isRetentionRuleTargetTaken('subseries', subseriesId)
}

function isSeriesOptionDisabled(seriesId: number): boolean {
  return isRetentionRuleTargetTaken('series', seriesId)
}

function findDocumentTypeOption(typeId: number | null | undefined): CatalogDocumentTypeOption | null {
  if (typeId == null) {
    return null
  }

  return documentTypeOptions.value.find(option => option.id === typeId) ?? null
}

function ruleScopeLabel(rule: TrdRetentionRuleRow): string {
  if (rule.doc_document_type_id) {
    const option = findDocumentTypeOption(rule.doc_document_type_id)
    if (option) {
      return option.label
    }
    const fromVersion = version.value?.document_types?.find(t => t.id === rule.doc_document_type_id)
    if (fromVersion) {
      return `${fromVersion.code} — ${fromVersion.name}`
    }

    return `Tipo documental #${rule.doc_document_type_id}`
  }

  if (rule.doc_subseries_id) {
    for (const serie of catalogTree.value) {
      const sub = serie.subseries.find(item => item.id === rule.doc_subseries_id)
      if (sub) {
        return `${serie.code}/${sub.code} — ${sub.name}`
      }
    }

    return `Subserie #${rule.doc_subseries_id}`
  }

  if (rule.doc_series_id) {
    const serie = catalogTree.value.find(item => item.id === rule.doc_series_id)
    if (serie) {
      return `${serie.code} — ${serie.name}`
    }

    return `Serie #${rule.doc_series_id}`
  }

  return '—'
}

const catalogFilterText = ref('')
const catalogAssociationFilter = ref<'all' | 'associated' | 'not_associated'>('all')
const rulesFilterText = ref('')
const rulesScopeFilter = ref<'all' | 'series' | 'subseries' | 'document_type'>('all')
const previewFilterText = ref('')
const previewStatusFilter = ref<'all' | 'with_rule' | 'without_rule'>('all')

const catalogAssociationFilterOptions = [
  { value: 'all', label: 'Todos los tipos' },
  { value: 'associated', label: 'Asociados a la TRD' },
  { value: 'not_associated', label: 'Sin asociar' },
] as const

const previewStatusFilterOptions = [
  { value: 'all', label: 'Todos' },
  { value: 'with_rule', label: 'Con regla efectiva' },
  { value: 'without_rule', label: 'Sin regla efectiva' },
] as const

const rulesScopeFilterOptions = [
  { value: 'all', label: 'Todos los niveles' },
  ...TRD_SCOPE_LEVEL_OPTIONS,
] as const

const filteredCatalogTree = computed(() => {
  const q = catalogFilterText.value.trim().toLowerCase()
  const association = catalogAssociationFilter.value

  if (!q && association === 'all') {
    return catalogTree.value
  }

  return catalogTree.value
    .map((serie) => {
      const serieMatchesSearch = q
        ? serie.code.toLowerCase().includes(q) || serie.name.toLowerCase().includes(q)
        : false

      const subseries = serie.subseries
        .map((sub) => {
          let types = sub.document_types

          if (association === 'associated') {
            types = types.filter(t => isTypeSelected(t.id))
          } else if (association === 'not_associated') {
            types = types.filter(t => !isTypeSelected(t.id))
          }

          const subMatchesSearch = q
            ? sub.code.toLowerCase().includes(q) || sub.name.toLowerCase().includes(q)
            : false

          if (q) {
            types = types.filter(t =>
              t.code.toLowerCase().includes(q)
              || t.name.toLowerCase().includes(q)
              || subMatchesSearch
              || serieMatchesSearch,
            )
          }

          if (types.length > 0) {
            return { ...sub, document_types: types }
          }

          if (association === 'all' && !q) {
            return { ...sub, document_types: types }
          }

          return null
        })
        .filter((sub): sub is NonNullable<typeof sub> => sub !== null)

      if (subseries.length > 0 || serieMatchesSearch) {
        return { ...serie, subseries }
      }

      return null
    })
    .filter((serie): serie is NonNullable<typeof serie> => serie !== null)
})

const filteredRetentionRules = computed(() => {
  const rules = version.value?.retention_rules ?? []
  const q = rulesFilterText.value.trim().toLowerCase()
  const scope = rulesScopeFilter.value

  return rules.filter((rule) => {
    if (scope !== 'all' && rule.scope_level !== scope) {
      return false
    }

    if (!q) {
      return true
    }

    const levelLabel = TRD_SCOPE_LEVEL_OPTIONS.find(o => o.value === rule.scope_level)?.label ?? rule.scope_level

    return ruleScopeLabel(rule).toLowerCase().includes(q)
      || dispositionLabel(rule.final_disposition).toLowerCase().includes(q)
      || levelLabel.toLowerCase().includes(q)
      || String(rule.years_management).includes(q)
      || String(rule.years_central).includes(q)
      || String(rule.years_historical ?? '').includes(q)
  })
})

function collectDocumentTypesFromCatalog(typeIds: Set<number>): DocDocumentTypeRow[] {
  const rows: DocDocumentTypeRow[] = []

  for (const serie of catalogTree.value) {
    for (const sub of serie.subseries) {
      for (const dt of sub.document_types) {
        if (typeIds.has(dt.id)) {
          rows.push(dt)
        }
      }
    }
  }

  return rows.sort((a, b) => a.code.localeCompare(b.code, 'es'))
}

const previewDocumentTypes = computed((): DocDocumentTypeRow[] => {
  const fromVersion = version.value?.document_types ?? []
  if (fromVersion.length > 0) {
    return [...fromVersion].sort((a, b) => a.code.localeCompare(b.code, 'es'))
  }

  if (selectedTypeIds.value.length > 0) {
    return collectDocumentTypesFromCatalog(new Set(selectedTypeIds.value))
  }

  const typeIdsFromRules = (version.value?.retention_rules ?? [])
    .map(rule => rule.doc_document_type_id)
    .filter((id): id is number => id != null)

  if (typeIdsFromRules.length > 0) {
    return collectDocumentTypesFromCatalog(new Set(typeIdsFromRules))
  }

  return []
})

function effectivePreviewFor(typeId: number): EffectiveRetentionPayload | null {
  const fromApi = preview.value[typeId] ?? null
  if (fromApi) {
    return fromApi
  }

  const tipo = previewDocumentTypes.value.find(t => t.id === typeId)
  if (!tipo) {
    return null
  }

  return resolveEffectiveRetentionFromRules(
    typeId,
    tipo.doc_subseries_id,
    version.value?.retention_rules ?? [],
    catalogTree.value,
  )
}

const previewSummary = computed(() => {
  const types = previewDocumentTypes.value
  let withRule = 0

  for (const tipo of types) {
    if (effectivePreviewFor(tipo.id) != null) {
      withRule++
    }
  }

  return {
    total: types.length,
    withRule,
    withoutRule: types.length - withRule,
  }
})

const associatedTypesCount = computed(() => version.value?.document_types?.length ?? 0)
const retentionRulesCount = computed(() => version.value?.retention_rules?.length ?? 0)
const previewNeedsRulesHint = computed(
  () => associatedTypesCount.value > 0 && retentionRulesCount.value === 0,
)
const previewRulesNotApplyingHint = computed(
  () => associatedTypesCount.value > 0
    && retentionRulesCount.value > 0
    && previewSummary.value.withRule === 0,
)

const filteredPreviewDocumentTypes = computed(() => {
  const types = previewDocumentTypes.value
  const q = previewFilterText.value.trim().toLowerCase()
  const status = previewStatusFilter.value

  return types.filter((tipo) => {
    const hasRule = effectivePreviewFor(tipo.id) != null

    if (status === 'with_rule' && !hasRule) {
      return false
    }
    if (status === 'without_rule' && hasRule) {
      return false
    }

    if (!q) {
      return true
    }

    return tipo.code.toLowerCase().includes(q)
      || tipo.name.toLowerCase().includes(q)
  })
})

function clearCatalogFilters() {
  catalogFilterText.value = ''
  catalogAssociationFilter.value = 'all'
}

function clearRulesFilters() {
  rulesFilterText.value = ''
  rulesScopeFilter.value = 'all'
}

function clearPreviewFilters() {
  previewFilterText.value = ''
  previewStatusFilter.value = 'all'
}

const catalogCheckboxClass =
  'size-4 shrink-0 rounded-[4px] border border-input accent-primary cursor-pointer shadow-xs focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50'

function normalizeTypeId(id: number | string): number {
  return typeof id === 'number' ? id : Number(id)
}

function isTypeSelected(typeId: number | string): boolean {
  const id = normalizeTypeId(typeId)
  return selectedTypeIds.value.some(sid => normalizeTypeId(sid) === id)
}

function setTypeSelected(typeId: number | string, selected: boolean): void {
  if (!canEdit.value) {
    return
  }
  const id = normalizeTypeId(typeId)
  const set = new Set(selectedTypeIds.value.map(normalizeTypeId))
  if (selected) {
    set.add(id)
  } else {
    set.delete(id)
  }
  selectedTypeIds.value = [...set]
  nextTick(() => refreshAllSubseriesCheckboxVisuals())
}

function subseriesAllSelected(sub: CatalogTreeSeries['subseries'][0]): boolean {
  const types = sub.document_types
  return types.length > 0 && types.every(t => isTypeSelected(t.id))
}

function bindSubseriesCheckboxElement(
  el: Element | null,
  sub: CatalogTreeSeries['subseries'][0],
): void {
  const input = el instanceof HTMLInputElement ? el : null
  if (!input) {
    return
  }
  const total = sub.document_types.length
  const selectedCount = sub.document_types.filter(t => isTypeSelected(t.id)).length
  input.indeterminate = selectedCount > 0 && selectedCount < total
}

function setSubseriesTypesSelected(
  sub: CatalogTreeSeries['subseries'][0],
  selected: boolean,
): void {
  if (!canEdit.value) {
    return
  }
  const set = new Set(selectedTypeIds.value.map(normalizeTypeId))
  for (const t of sub.document_types) {
    const id = normalizeTypeId(t.id)
    if (selected) {
      set.add(id)
    } else {
      set.delete(id)
    }
  }
  selectedTypeIds.value = [...set]
  nextTick(() => refreshAllSubseriesCheckboxVisuals())
}

const subseriesCheckboxElements = new Map<number, HTMLInputElement>()

function registerSubseriesCheckbox(
  sub: CatalogTreeSeries['subseries'][0],
  el: Element | null,
): void {
  if (el) {
    subseriesCheckboxElements.set(sub.id, el as HTMLInputElement)
    bindSubseriesCheckboxElement(el, sub)
  } else {
    subseriesCheckboxElements.delete(sub.id)
  }
}

function refreshAllSubseriesCheckboxVisuals(): void {
  for (const serie of catalogTree.value) {
    for (const sub of serie.subseries) {
      const el = subseriesCheckboxElements.get(sub.id)
      if (el) {
        bindSubseriesCheckboxElement(el, sub)
      }
    }
  }
}

function onSubseriesCheckboxChange(
  sub: CatalogTreeSeries['subseries'][0],
  event: Event,
): void {
  const target = event.target as HTMLInputElement
  setSubseriesTypesSelected(sub, target.checked)
}

function onTypeCheckboxChange(typeId: number | string, event: Event): void {
  const target = event.target as HTMLInputElement
  setTypeSelected(typeId, target.checked)
}

function isMetaDateFieldEmpty(field: MetaDateField): boolean {
  return !metaForm.value[field]?.trim()
}

function isMetaDateFieldInvalid(field: MetaDateField): boolean {
  if (!metaValidationVisible.value) {
    return false
  }

  return isMetaDateFieldEmpty(field)
}

function metaDateInputClass(field: MetaDateField): string {
  return isMetaDateFieldInvalid(field) ? '!border-destructive ring-2 ring-destructive/50' : ''
}

function metaDateLabelClass(field: MetaDateField): string {
  return isMetaDateFieldInvalid(field) ? 'text-destructive' : ''
}

const metaDateFieldsHaveErrors = computed(() =>
  META_DATE_FIELDS.some(field => isMetaDateFieldInvalid(field)),
)

function validateMetaDates(): boolean {
  metaValidationVisible.value = true

  const missing = META_DATE_FIELDS.filter(field => isMetaDateFieldEmpty(field))
  if (missing.length > 0) {
    toast.error(`Complete los campos obligatorios: ${missing.map(field => META_DATE_LABELS[field]).join(', ')}`)
    return false
  }

  metaValidationVisible.value = false
  return true
}

function buildMetaBody() {
  const body: Record<string, string> = {
    producer_office_name: metaForm.value.producer_office_name.trim(),
    producer_office_code: metaForm.value.producer_office_code.trim(),
    retention_application_level: metaForm.value.retention_application_level,
    approved_at: metaForm.value.approved_at,
    effective_from: metaForm.value.effective_from,
  }

  if (trdTestingEnabled.value && metaForm.value.effective_to.trim()) {
    body.effective_to = metaForm.value.effective_to
  }

  return body
}

async function persistMetaRequest() {
  await $api(`/archival/trd-tables/${tableId.value}/versions/${versionId.value}`, {
    method: 'PUT',
    body: buildMetaBody(),
  })
}

async function reload() {
  const res = await trdApi.fetchVersion(tableId.value, versionId.value)
  version.value = res.data
  preview.value = res.effective_retention_preview ?? {}
  testingOptions.value = res.testing_options ?? null
  selectedTypeIds.value = (res.data.document_types ?? []).map(t => normalizeTypeId(t.id))
  metaForm.value = {
    producer_office_name: res.data.producer_office_name,
    producer_office_code: res.data.producer_office_code,
    retention_application_level: res.data.retention_application_level,
    approved_at: res.data.approved_at?.slice(0, 10) ?? '',
    effective_from: res.data.effective_from?.slice(0, 10) ?? '',
    effective_to: res.data.effective_to?.slice(0, 10) ?? '',
  }
  testEffectiveTo.value = res.data.effective_to?.slice(0, 10) ?? ''
}

async function saveTestEffectiveTo() {
  if (!trdTestingEnabled.value || !testEffectiveTo.value.trim()) {
    toast.error('Indique la vigencia hasta de prueba')
    return
  }

  savingTestEffectiveTo.value = true
  try {
    await $api(`/archival/trd-tables/${tableId.value}/versions/${versionId.value}/test-effective-to`, {
      method: 'PUT',
      body: { effective_to: testEffectiveTo.value },
    })
    toast.success('Vigencia hasta de prueba guardada')
    await reload()
  } catch (e: any) {
    toast.error(e?.data?.message || 'No se pudo guardar la fecha de prueba')
  } finally {
    savingTestEffectiveTo.value = false
  }
}

async function publishTestExpiryAlerts() {
  if (!trdTestingEnabled.value) {
    return
  }

  publishingTestAlerts.value = true
  try {
    const res = await $api<{
      message?: string
      data?: { published_count: number }
    }>('/archival/trd-tables/testing/publish-expiry-alerts', {
      method: 'POST',
      body: {},
    })
    if ((res.data?.published_count ?? 0) > 0) {
      toast.success(res.message || 'Alertas publicadas')
      useNotificationToasts().requestImmediateRefresh()
    } else {
      toast.info(res.message || 'No había alertas pendientes para hoy')
    }
  } catch (e: any) {
    toast.error(e?.data?.message || 'No se pudieron publicar las alertas de prueba')
  } finally {
    publishingTestAlerts.value = false
  }
}

function applySuggestedTestDate(key: 'days_30' | 'days_15' | 'days_1') {
  const suggested = testingOptions.value?.suggested_effective_to[key]
  if (!suggested) {
    return
  }

  testEffectiveTo.value = suggested
  if (canEdit.value) {
    metaForm.value.effective_to = suggested
  }
}

async function load() {
  loading.value = true
  try {
    table.value = await trdApi.fetchTable(tableId.value)
    await reload()
    await reloadCatalogTree()
  } catch {
    toast.error('No se pudo cargar la versión')
    await router.push(trdApi.tablePath(tableId.value))
  } finally {
    loading.value = false
  }
}

async function saveMeta() {
  if (!canEdit.value) {
    return
  }
  if (!validateMetaDates()) {
    activeTab.value = 'general'
    return
  }
  saving.value = true
  try {
    await persistMetaRequest()
    toast.success('Datos de versión guardados')
    await reload()
  } catch (e: any) {
    const errors = e?.data?.errors
    if (errors?.approved_at || errors?.effective_from) {
      metaValidationVisible.value = true
      activeTab.value = 'general'
    }
    toast.error(e?.data?.message || 'Error al guardar')
  } finally {
    saving.value = false
  }
}

async function saveDocumentTypes() {
  if (!canEdit.value || selectedTypeIds.value.length === 0) {
    toast.error('Seleccione al menos un tipo documental')
    return
  }
  saving.value = true
  try {
    await $api(`/archival/trd-tables/${tableId.value}/versions/${versionId.value}/document-types`, {
      method: 'POST',
      body: { doc_document_type_ids: selectedTypeIds.value },
    })
    toast.success('Tipos documentales asociados')
    await reload()
  } catch (e: any) {
    toast.error(e?.data?.message || 'Error al asociar tipos')
  } finally {
    saving.value = false
  }
}

function openNewRule() {
  editingRuleId.value = null
  finalDispositionSelected.value = ['elimination']
  ruleForm.value = {
    scope_level: 'document_type',
    doc_series_id: null,
    doc_subseries_id: null,
    doc_document_type_id: null,
    years_management: 2,
    years_central: 5,
    years_historical: null,
    procedure_text: '',
    notes: '',
  }
  showRuleForm.value = true
}

function openEditRule(rule: TrdRetentionRuleRow) {
  editingRuleId.value = rule.id
  finalDispositionSelected.value = parseFinalDisposition(rule.final_disposition)

  let seriesId = rule.doc_series_id ?? null
  let subseriesId = rule.doc_subseries_id ?? null
  if (rule.scope_level === 'document_type' && rule.doc_document_type_id) {
    const path = catalogPathForDocumentType(rule.doc_document_type_id)
    if (path) {
      seriesId = path.seriesId
      subseriesId = path.subseriesId
    }
  }

  ruleForm.value = {
    scope_level: rule.scope_level,
    doc_series_id: seriesId,
    doc_subseries_id: subseriesId,
    doc_document_type_id: rule.doc_document_type_id ?? null,
    years_management: rule.years_management,
    years_central: rule.years_central,
    years_historical: rule.years_historical ?? null,
    procedure_text: rule.procedure_text ?? '',
    notes: rule.notes ?? '',
  }
  hydratingRuleForm.value = true
  showRuleForm.value = true
  nextTick(() => {
    hydratingRuleForm.value = false
  })
}

async function saveRule() {
  if (!canEdit.value) {
    return
  }
  const finalDisposition = serializeFinalDisposition(finalDispositionSelected.value)
  if (!finalDisposition) {
    toast.error('Seleccione al menos una disposición final')
    return
  }

  const { scope_level } = ruleForm.value
  if (scope_level === 'series' && !ruleForm.value.doc_series_id) {
    toast.error('Seleccione la serie')
    return
  }
  if (scope_level === 'subseries' && (!ruleForm.value.doc_series_id || !ruleForm.value.doc_subseries_id)) {
    toast.error('Seleccione serie y subserie')
    return
  }
  if (scope_level === 'document_type') {
    if (!ruleForm.value.doc_series_id || !ruleForm.value.doc_subseries_id) {
      toast.error('Seleccione serie y subserie')
      return
    }
    if (!ruleForm.value.doc_document_type_id) {
      toast.error('Seleccione el tipo documental')
      return
    }
  }

  const body: Record<string, unknown> = {
    scope_level,
    doc_series_id: scope_level === 'series' || scope_level === 'subseries' ? ruleForm.value.doc_series_id : null,
    doc_subseries_id: scope_level === 'subseries' ? ruleForm.value.doc_subseries_id : null,
    doc_document_type_id: scope_level === 'document_type' ? ruleForm.value.doc_document_type_id : null,
    years_management: ruleForm.value.years_management,
    years_central: ruleForm.value.years_central,
    years_historical: ruleForm.value.years_historical,
    final_disposition: finalDisposition,
    procedure_text: ruleForm.value.procedure_text.trim() || null,
    notes: ruleForm.value.notes.trim() || null,
  }

  saving.value = true
  try {
    if (editingRuleId.value) {
      await $api(`/archival/trd-tables/${tableId.value}/versions/${versionId.value}/retention-rules/${editingRuleId.value}`, {
        method: 'PUT',
        body,
      })
    } else {
      await $api(`/archival/trd-tables/${tableId.value}/versions/${versionId.value}/retention-rules`, {
        method: 'POST',
        body,
      })
    }
    toast.success('Regla guardada')
    showRuleForm.value = false
    await reload()
  } catch (e: any) {
    const msg = e?.data?.errors
      ? Object.values(e.data.errors).flat().join(' ')
      : (e?.data?.message || 'Error al guardar regla')
    toast.error(msg)
  } finally {
    saving.value = false
  }
}

async function removeRule(ruleId: number) {
  if (!canEdit.value) {
    return
  }
  saving.value = true
  try {
    await $api(`/archival/trd-tables/${tableId.value}/versions/${versionId.value}/retention-rules/${ruleId}`, {
      method: 'DELETE',
    })
    toast.success('Regla eliminada')
    await reload()
  } catch (e: any) {
    toast.error(e?.data?.message || 'No se pudo eliminar')
  } finally {
    saving.value = false
  }
}

async function activateVersion() {
  if (!canEdit.value) {
    return
  }
  if (!validateMetaDates()) {
    activeTab.value = 'general'
    return
  }
  activating.value = true
  try {
    await persistMetaRequest()
    await $api(`/archival/trd-tables/${tableId.value}/versions/${versionId.value}/activate`, {
      method: 'POST',
    })
    toast.success('TRD activada')
    await reload()
  } catch (e: any) {
    const errors = e?.data?.errors
    if (errors?.approved_at || errors?.effective_from) {
      metaValidationVisible.value = true
      activeTab.value = 'general'
    }
    if (errors?.retention_rules?.[0]) {
      activeTab.value = 'rules'
    }
    const msg = errors?.retention_rules?.[0]
      ?? errors?.approved_at?.[0]
      ?? errors?.effective_from?.[0]
      ?? e?.data?.message
      ?? 'No se pudo activar'
    toast.error(msg)
  } finally {
    activating.value = false
  }
}

async function duplicateVersion() {
  if (!hasPermission('trd_tablas_editar')) {
    return
  }
  saving.value = true
  try {
    const res = await $api<{ data: { id: number } }>(
      `/archival/trd-tables/${tableId.value}/versions/${versionId.value}/duplicate`,
      { method: 'POST' },
    )
    toast.success('Nueva versión en borrador creada')
    await router.push(trdApi.versionPath(tableId.value, res.data.id))
  } catch (e: any) {
    toast.error(e?.data?.message || 'No se pudo duplicar')
  } finally {
    saving.value = false
  }
}

onMounted(load)

const seriesOptions = computed(() =>
  catalogTree.value.map(s => ({ id: s.id, label: `${s.code} — ${s.name}` })),
)

const subseriesOptions = computed(() => {
  const sid = ruleForm.value.doc_series_id
  if (!sid) {
    return []
  }
  const serie = catalogTree.value.find(s => s.id === sid)
  return (serie?.subseries ?? []).map(sub => ({ id: sub.id, label: `${sub.code} — ${sub.name}` }))
})

watch(() => ruleForm.value.scope_level, (level, previousLevel) => {
  if (level === previousLevel) {
    return
  }
  if (level === 'series') {
    ruleForm.value.doc_subseries_id = null
    ruleForm.value.doc_document_type_id = null
  } else if (level === 'subseries') {
    ruleForm.value.doc_document_type_id = null
  } else if (level === 'document_type') {
    ruleForm.value.doc_series_id = null
    ruleForm.value.doc_subseries_id = null
    ruleForm.value.doc_document_type_id = null
  }
})

watch(() => ruleForm.value.doc_series_id, (seriesId, previousSeriesId) => {
  if (hydratingRuleForm.value || ruleForm.value.scope_level !== 'document_type' || seriesId === previousSeriesId) {
    return
  }
  ruleForm.value.doc_subseries_id = null
  ruleForm.value.doc_document_type_id = null
})

watch(() => ruleForm.value.doc_subseries_id, (subseriesId, previousSubseriesId) => {
  if (hydratingRuleForm.value || ruleForm.value.scope_level !== 'document_type' || subseriesId === previousSubseriesId) {
    return
  }
  ruleForm.value.doc_document_type_id = null
})

onActivated(async () => {
  if (!loading.value && table.value) {
    await reloadCatalogTree()
  }
})

watch(
  () => route.query.tab,
  (tab) => {
    const resolved = isTrdVersionTab(tab) ? tab : 'general'
    if (activeTab.value === resolved) {
      return
    }

    syncingTabFromRoute = true
    activeTab.value = resolved
    syncingTabFromRoute = false
  },
)

watch(activeTab, (tab) => {
  if (syncingTabFromRoute) {
    return
  }

  const currentTab = isTrdVersionTab(route.query.tab) ? route.query.tab : 'general'
  if (tab === currentTab) {
    return
  }

  const query = { ...route.query }
  if (tab === 'general') {
    delete query.tab
  }
  else {
    query.tab = tab
  }

  void router.replace({ path: route.path, query })
})

watch(
  () => route.fullPath,
  async (path, previousPath) => {
    if (
      path.startsWith(trdApi.versionPath(tableId.value, versionId.value))
      && previousPath?.includes('/settings/archival/catalog/')
      && table.value
      && !loading.value
    ) {
      await reloadCatalogTree()
    }
  },
)
</script>

<template>
  <SettingsLayout :wide="true">
    <div v-if="loading" class="flex justify-center py-16">
      <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
    <div v-else-if="version" class="w-full flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <Button variant="ghost" size="sm" class="h-8 w-fit -ml-2 px-2" @click="router.push(trdApi.tablePath(tableId))">
            <Icon name="i-lucide-arrow-left" class="mr-1 h-4 w-4" />
            Versiones
          </Button>
          <h2 class="text-2xl font-bold tracking-tight">
            TRD v{{ version.version_number }}
          </h2>
          <div class="flex flex-wrap items-center gap-2">
            <Badge>{{ TRD_VERSION_STATUS_LABELS[version.status] ?? version.status }}</Badge>
            <span class="text-sm text-muted-foreground">
              {{ version.producer_office_name }} ({{ version.producer_office_code }})
            </span>
          </div>
        </div>
        <div class="flex flex-wrap gap-2">
          <PermissionGate permission="trd_tablas_editar">
            <Button
              v-if="version.status === 'active'"
              variant="outline"
              :disabled="saving"
              @click="duplicateVersion"
            >
              Nueva versión desde vigente
            </Button>
            <Button
              v-if="canEdit"
              :disabled="activating"
              @click="activateVersion"
            >
              Activar TRD
            </Button>
          </PermissionGate>
        </div>
      </div>

      <Tabs v-model="activeTab" default-value="general">
        <TabsList class="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="general">
            General
          </TabsTrigger>
          <TabsTrigger value="catalog">
            Catálogo
          </TabsTrigger>
          <TabsTrigger value="rules">
            Reglas
          </TabsTrigger>
          <TabsTrigger value="preview">
            Vista previa
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" class="mt-4">
          <Card>
            <CardContent class="pt-6 space-y-4 max-w-2xl">
              <Alert
                v-if="metaValidationVisible && metaDateFieldsHaveErrors"
                variant="destructive"
              >
                <AlertTitle>Fechas obligatorias</AlertTitle>
                <AlertDescription>
                  Indique la fecha de aprobación y la vigencia desde antes de guardar o activar la TRD.
                </AlertDescription>
              </Alert>
              <p class="text-sm text-muted-foreground leading-relaxed">
                {{ TRD_RETENTION_LEVEL_HELP[metaForm.retention_application_level] }}
              </p>
              <div class="space-y-2">
                <Label>Nombre oficina productora</Label>
                <Input v-model="metaForm.producer_office_name" :disabled="!canEdit" />
              </div>
              <div class="space-y-2">
                <Label>Código oficina productora</Label>
                <Input v-model="metaForm.producer_office_code" :disabled="!canEdit" maxlength="64" />
              </div>
              <div class="space-y-2">
                <Label>Nivel de tiempos</Label>
                <Select v-model="metaForm.retention_application_level" :disabled="!canEdit">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem v-for="o in TRD_RETENTION_APPLICATION_OPTIONS" :key="o.value" :value="o.value">
                      {{ o.label }}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div class="grid gap-4 sm:grid-cols-2">
                <div class="space-y-2">
                  <Label :class="metaDateLabelClass('approved_at')">Fecha aprobación *</Label>
                  <Input
                    v-model="metaForm.approved_at"
                    type="date"
                    :disabled="!canEdit"
                    :aria-invalid="isMetaDateFieldInvalid('approved_at')"
                    :class="metaDateInputClass('approved_at')"
                  />
                  <p
                    v-if="isMetaDateFieldInvalid('approved_at')"
                    class="text-xs text-destructive"
                  >
                    Campo obligatorio
                  </p>
                </div>
                <div class="space-y-2">
                  <Label :class="metaDateLabelClass('effective_from')">Vigencia desde *</Label>
                  <Input
                    v-model="metaForm.effective_from"
                    type="date"
                    :disabled="!canEdit"
                    :aria-invalid="isMetaDateFieldInvalid('effective_from')"
                    :class="metaDateInputClass('effective_from')"
                  />
                  <p
                    v-if="isMetaDateFieldInvalid('effective_from')"
                    class="text-xs text-destructive"
                  >
                    Campo obligatorio
                  </p>
                  <p class="text-xs text-muted-foreground">
                    La vigencia hasta se calcula automáticamente (1 año) o finaliza al publicar una nueva versión.
                  </p>
                </div>
                <div v-if="trdTestingEnabled && canEdit" class="space-y-2 sm:col-span-2">
                  <Label>Vigencia hasta (solo prueba)</Label>
                  <Input v-model="metaForm.effective_to" type="date" />
                  <p class="text-xs text-muted-foreground">
                    Solo visible con modo prueba activo. Sobrescribe el cálculo automático al guardar.
                  </p>
                </div>
              </div>

              <Card v-if="trdTestingEnabled" class="border-amber-500/50 bg-amber-500/5">
                <CardHeader class="pb-2">
                  <CardTitle class="text-base">
                    Probar alertas de vencimiento
                  </CardTitle>
                  <CardDescription>
                    La TRD debe estar <strong>activa</strong> y con vigencia hasta en 30, 15 o 1 día desde hoy
                    ({{ testingOptions?.today }}). Use los accesos rápidos, guarde la fecha y publique las alertas.
                  </CardDescription>
                </CardHeader>
                <CardContent class="space-y-4">
                  <div class="flex flex-wrap gap-2">
                    <Button type="button" size="sm" variant="outline" @click="applySuggestedTestDate('days_30')">
                      Alerta 30 días
                    </Button>
                    <Button type="button" size="sm" variant="outline" @click="applySuggestedTestDate('days_15')">
                      Alerta 15 días
                    </Button>
                    <Button type="button" size="sm" variant="outline" @click="applySuggestedTestDate('days_1')">
                      Alerta 1 día
                    </Button>
                  </div>
                  <div class="grid gap-4 sm:grid-cols-2 max-w-xl">
                    <div class="space-y-2">
                      <Label>Vigencia hasta (prueba)</Label>
                      <Input
                        v-model="testEffectiveTo"
                        type="date"
                        :disabled="!isVersionActive && !canEdit"
                      />
                      <p v-if="version?.effective_to" class="text-xs text-muted-foreground">
                        Guardada en sistema: {{ version.effective_to.slice(0, 10) }}
                      </p>
                    </div>
                    <div class="flex flex-col gap-2 justify-end">
                      <Button
                        type="button"
                        variant="secondary"
                        :disabled="savingTestEffectiveTo || !testEffectiveTo"
                        @click="isVersionActive ? saveTestEffectiveTo() : saveMeta()"
                      >
                        Guardar fecha de prueba
                      </Button>
                      <Button
                        type="button"
                        :disabled="publishingTestAlerts || !isVersionActive"
                        @click="publishTestExpiryAlerts"
                      >
                        Publicar alertas ahora
                      </Button>
                    </div>
                  </div>
                  <p v-if="!isVersionActive" class="text-xs text-amber-700 dark:text-amber-400">
                    Active la versión TRD para poder publicar comunicados de vencimiento.
                  </p>
                </CardContent>
              </Card>
              <div v-if="canEdit" class="flex justify-end">
                <Button :disabled="saving" @click="saveMeta">
                  Guardar
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="catalog" class="mt-4">
          <Card>
            <CardHeader class="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div class="space-y-1">
                <CardTitle>Tipos documentales de esta TRD</CardTitle>
                <CardDescription>
                  Catálogo del área productora
                  <template v-if="table?.org_unit">
                    {{ table.org_unit.name }} ({{ table.org_unit.code }})
                  </template>
                  — serie → subserie → tipo.
                </CardDescription>
              </div>
              <PermissionGate v-if="catalogTree.length > 0" permission="trd_catalogo_editar">
                <div class="flex flex-wrap gap-2 shrink-0">
                  <Button variant="outline" size="sm" @click="router.push(catalogSeriesListPath)">
                    Administrar catálogo
                  </Button>
                  <Button size="sm" @click="router.push(catalogCreateSeriesPath)">
                    <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
                    Nueva serie
                  </Button>
                </div>
              </PermissionGate>
            </CardHeader>
            <CardContent class="space-y-4">
              <p
                v-if="!canEdit"
                class="text-sm text-amber-800 dark:text-amber-200 rounded-md border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/40 px-3 py-2"
              >
                Solo lectura: la versión no está en borrador o no tiene permiso para editar tablas TRD.
                Los checkboxes no se pueden modificar.
              </p>
              <div
                v-if="catalogTree.length > 0"
                class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
              >
                <div class="w-full min-w-0 sm:max-w-md space-y-1">
                  <Label for="catalog-filter" class="text-xs">Buscar</Label>
                  <div class="relative">
                    <Icon name="i-lucide-search" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="catalog-filter"
                      v-model="catalogFilterText"
                      placeholder="Serie, subserie o tipo…"
                      class="pl-9"
                    />
                  </div>
                </div>
                <div class="w-full min-w-0 sm:w-52 space-y-1">
                  <Label for="catalog-association-filter" class="text-xs">Filtrar por</Label>
                  <Select v-model="catalogAssociationFilter">
                    <SelectTrigger id="catalog-association-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        v-for="o in catalogAssociationFilterOptions"
                        :key="o.value"
                        :value="o.value"
                      >
                        {{ o.label }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  v-if="catalogFilterText || catalogAssociationFilter !== 'all'"
                  variant="ghost"
                  size="sm"
                  class="shrink-0"
                  @click="clearCatalogFilters"
                >
                  Limpiar filtros
                </Button>
              </div>
              <div
                v-if="catalogTree.length === 0"
                class="rounded-lg border border-dashed p-8 text-center space-y-4"
              >
                <p class="text-sm text-muted-foreground leading-relaxed max-w-xl mx-auto">
                  Esta área productora aún no tiene cuadro de clasificación (serie → subserie → tipo).
                  Créelo en el catálogo documental vinculado a
                  <template v-if="table?.org_unit">
                    <strong>{{ table.org_unit.name }}</strong> ({{ table.org_unit.code }}).
                  </template>
                  Luego regrese aquí, marque los tipos y pulse «Guardar asociación».
                </p>
                <ol class="text-sm text-muted-foreground text-left max-w-md mx-auto list-decimal list-inside space-y-1">
                  <li>Nueva serie (código y nombre)</li>
                  <li>En la serie: subseries</li>
                  <li>En cada subserie: tipos documentales</li>
                </ol>
                <div class="flex flex-wrap justify-center gap-2">
                  <PermissionGate permission="trd_catalogo_editar">
                    <Button @click="router.push(catalogCreateSeriesPath)">
                      <Icon name="i-lucide-plus" class="mr-2 h-4 w-4" />
                      Nueva serie para esta área
                    </Button>
                    <Button variant="outline" @click="router.push(catalogSeriesListPath)">
                      Administrar catálogo del área
                    </Button>
                  </PermissionGate>
                  <Button variant="ghost" :disabled="loading" @click="reloadCatalogTree">
                    Actualizar lista
                  </Button>
                </div>
                <p v-if="canEdit && !canManageCatalog" class="text-xs text-amber-700 dark:text-amber-400">
                  Necesita permiso de edición del catálogo documental para crear series.
                </p>
              </div>
              <div
                v-else-if="!filteredCatalogTree.length"
                class="text-sm text-muted-foreground py-8 text-center border border-dashed rounded-lg space-y-2"
              >
                <p>No hay tipos que coincidan con la búsqueda o el filtro.</p>
                <Button
                  v-if="catalogFilterText || catalogAssociationFilter !== 'all'"
                  variant="ghost"
                  size="sm"
                  @click="clearCatalogFilters"
                >
                  Limpiar filtros
                </Button>
              </div>
              <div
                v-for="serie in filteredCatalogTree"
                :key="serie.id"
                class="border rounded-lg p-4 space-y-3"
                :class="{ 'opacity-70': serie.is_active === false }"
              >
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div class="min-w-0 space-y-2">
                    <div class="flex flex-wrap items-center gap-2">
                      <p class="font-medium font-mono text-sm">
                        {{ serie.code }} — {{ serie.name }}
                      </p>
                      <Badge v-if="serie.is_active === false" variant="secondary" class="text-xs">
                        Inactiva
                      </Badge>
                    </div>
                    <div class="flex flex-wrap items-center gap-3">
                      <div
                        v-if="canManageCatalog"
                        class="flex items-start gap-2"
                      >
                        <Checkbox
                          :id="`serie-library-${serie.id}`"
                          bare
                          class="mt-0.5"
                          :model-value="isSeriesPublishableToLibrary(serie)"
                          :disabled="savingSeriesLibraryId === serie.id"
                          @update:model-value="toggleSeriesLibraryPublishable(serie, $event === true)"
                        />
                        <Label
                          :for="`serie-library-${serie.id}`"
                          class="font-normal text-sm text-muted-foreground cursor-pointer leading-snug"
                        >
                          Publicable en biblioteca institucional
                        </Label>
                      </div>
                      <Badge
                        v-else-if="isSeriesPublishableToLibrary(serie)"
                        variant="outline"
                        class="text-xs"
                      >
                        Biblioteca
                      </Badge>
                    </div>
                  </div>
                  <div class="flex flex-wrap items-center justify-end gap-1">
                    <PermissionGate permission="trd_catalogo_editar">
                      <Button
                        variant="warning"
                        size="sm"
                        :class="catalogRowActionClass"
                        @click="router.push(`/settings/archival/catalog/series/${serie.id}/edit?return_to=${encodeURIComponent(catalogReturnTo)}`)"
                      >
                        <Icon name="i-lucide-pencil" class="size-4 shrink-0" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        :class="catalogRowActionClass"
                        @click="router.push(`/settings/archival/catalog/series/${serie.id}/subseries/create?return_to=${encodeURIComponent(catalogReturnTo)}`)"
                      >
                        <Icon name="i-lucide-plus" class="size-4 shrink-0" />
                        Nueva subserie
                      </Button>
                      <Button
                        v-if="serie.is_active !== false && canDeactivateSeries(serie)"
                        type="button"
                        variant="destructive"
                        size="sm"
                        :class="catalogRowActionClass"
                        :disabled="savingSeriesActiveId === serie.id"
                        @click="setSeriesActive(serie, false)"
                      >
                        <Icon name="i-lucide-ban" class="size-4 shrink-0" />
                        Inactivar
                      </Button>
                      <Button
                        v-else-if="serie.is_active === false"
                        type="button"
                        variant="outline"
                        size="sm"
                        :class="catalogRowActionClass"
                        :disabled="savingSeriesActiveId === serie.id"
                        @click="setSeriesActive(serie, true)"
                      >
                        <Icon name="i-lucide-check" class="size-4 shrink-0" />
                        Activar
                      </Button>
                    </PermissionGate>
                  </div>
                </div>
                <p
                  v-if="serie.is_active !== false && !canDeactivateSeries(serie)"
                  class="text-xs text-amber-700 dark:text-amber-400 pl-1"
                >
                  {{ serieDeactivationBlockReason(serie) }}
                </p>
                <p v-if="serie.subseries.length === 0" class="text-sm text-muted-foreground pl-1">
                  Sin subseries.
                  <PermissionGate permission="trd_catalogo_editar">
                    <Button
                      variant="outline"
                      size="sm"
                      :class="[catalogRowActionClass, 'ml-2 inline-flex']"
                      @click="router.push(`/settings/archival/catalog/series/${serie.id}/subseries/create?return_to=${encodeURIComponent(catalogReturnTo)}`)"
                    >
                      <Icon name="i-lucide-plus" class="size-4 shrink-0" />
                      Crear subserie
                    </Button>
                  </PermissionGate>
                </p>
                <div v-for="sub in serie.subseries" :key="sub.id" class="pl-4 space-y-2 border-l">
                  <div class="flex items-center gap-2">
                    <input
                      :ref="(el) => registerSubseriesCheckbox(sub, el as Element | null)"
                      type="checkbox"
                      :class="catalogCheckboxClass"
                      :checked="subseriesAllSelected(sub)"
                      :disabled="!canEdit"
                      :aria-label="`Seleccionar tipos de ${sub.code}`"
                      @change="onSubseriesCheckboxChange(sub, $event)"
                    >
                    <span class="text-sm font-mono">{{ sub.code }} — {{ sub.name }}</span>
                    <PermissionGate permission="trd_catalogo_editar">
                      <Button
                        variant="warning"
                        size="sm"
                        :class="catalogRowActionClass"
                        @click="router.push(catalogApi.subseriesEditPath(serie.id, sub.id, catalogReturnTo))"
                      >
                        <Icon name="i-lucide-pencil" class="size-4 shrink-0" />
                        Editar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        :class="catalogRowActionClass"
                        @click="router.push(catalogApi.documentTypesCreatePath(serie.id, sub.id, catalogReturnTo))"
                      >
                        <Icon name="i-lucide-plus" class="size-4 shrink-0" />
                        Nuevo tipo
                      </Button>
                    </PermissionGate>
                  </div>
                  <p v-if="sub.document_types.length === 0" class="pl-6 text-xs text-muted-foreground">
                    Sin tipos documentales.
                  </p>
                  <label
                    v-for="tipo in sub.document_types"
                    :key="tipo.id"
                    class="pl-6 flex flex-wrap items-center gap-2"
                    :class="canEdit ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'"
                  >
                    <input
                      type="checkbox"
                      :class="catalogCheckboxClass"
                      :checked="isTypeSelected(tipo.id)"
                      :disabled="!canEdit"
                      @change="onTypeCheckboxChange(tipo.id, $event)"
                    >
                    <span class="text-sm select-none">{{ tipo.code }} — {{ tipo.name }}</span>
                    <PermissionGate permission="trd_catalogo_editar">
                      <Button
                        type="button"
                        variant="warning"
                        size="sm"
                        :class="catalogRowActionClass"
                        @click.stop="router.push(catalogApi.documentTypeEditPath(serie.id, sub.id, tipo.id, catalogReturnTo))"
                      >
                        <Icon name="i-lucide-pencil" class="size-4 shrink-0" />
                        Editar
                      </Button>
                    </PermissionGate>
                  </label>
                </div>
              </div>
              <div v-if="canEdit" class="flex justify-end">
                <Button :disabled="saving" @click="saveDocumentTypes">
                  Guardar asociación
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" class="mt-4 space-y-4">
          <Card v-if="showRuleForm && canEdit">
            <CardHeader>
              <CardTitle>{{ editingRuleId ? 'Editar regla' : 'Nueva regla de retención' }}</CardTitle>
            </CardHeader>
            <CardContent class="space-y-4">
              <div class="grid gap-4 sm:grid-cols-2">
                <div class="space-y-2">
                  <Label>Nivel</Label>
                  <Select v-model="ruleForm.scope_level">
                    <SelectTrigger><SelectValue placeholder="Seleccione nivel…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem v-for="o in TRD_SCOPE_LEVEL_OPTIONS" :key="o.value" :value="o.value">
                        {{ o.label }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div v-if="ruleForm.scope_level === 'series'" class="space-y-2">
                  <Label>Serie</Label>
                  <Select v-model="ruleForm.doc_series_id">
                    <SelectTrigger><SelectValue placeholder="Seleccione serie…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        v-for="s in seriesOptions"
                        :key="s.id"
                        :value="s.id"
                        :disabled="isSeriesOptionDisabled(s.id)"
                      >
                        {{ s.label }}{{ isSeriesOptionDisabled(s.id) ? ' (ya tiene regla)' : '' }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <template v-if="ruleForm.scope_level === 'subseries'">
                  <div class="space-y-2">
                    <Label>Serie</Label>
                    <Select v-model="ruleForm.doc_series_id">
                      <SelectTrigger><SelectValue placeholder="Seleccione serie…" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem v-for="s in seriesOptions" :key="s.id" :value="s.id">
                          {{ s.label }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div class="space-y-2">
                    <Label>Subserie</Label>
                    <Select v-model="ruleForm.doc_subseries_id">
                      <SelectTrigger><SelectValue placeholder="Seleccione subserie…" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          v-for="s in subseriesOptions"
                          :key="s.id"
                          :value="s.id"
                          :disabled="isSubseriesOptionDisabled(s.id)"
                        >
                          {{ s.label }}{{ isSubseriesOptionDisabled(s.id) ? ' (ya tiene regla)' : '' }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </template>
                <template v-if="ruleForm.scope_level === 'document_type'">
                  <div class="space-y-2 sm:col-span-2">
                    <p class="text-xs text-muted-foreground leading-relaxed">
                      Filtre por serie y subserie para acotar la lista de tipos documentales.
                    </p>
                  </div>
                  <div class="space-y-2">
                    <Label>Serie</Label>
                    <Select v-model="ruleForm.doc_series_id">
                      <SelectTrigger><SelectValue placeholder="Seleccione serie…" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          v-for="s in seriesOptionsForDocumentType"
                          :key="s.id"
                          :value="s.id"
                        >
                          {{ s.label }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div class="space-y-2">
                    <Label>Subserie</Label>
                    <Select
                      v-model="ruleForm.doc_subseries_id"
                      :disabled="!ruleForm.doc_series_id"
                    >
                      <SelectTrigger>
                        <SelectValue :placeholder="ruleForm.doc_series_id ? 'Seleccione subserie…' : 'Primero seleccione serie'" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          v-for="s in subseriesOptionsForDocumentType"
                          :key="s.id"
                          :value="s.id"
                        >
                          {{ s.label }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div class="space-y-2 sm:col-span-2">
                    <Label>Tipo documental</Label>
                    <Select
                      v-model="ruleForm.doc_document_type_id"
                      :disabled="!ruleForm.doc_subseries_id"
                    >
                      <SelectTrigger>
                        <SelectValue
                          :placeholder="ruleForm.doc_subseries_id ? 'Seleccione tipo documental…' : 'Primero seleccione subserie'"
                        />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem
                          v-for="t in filteredDocumentTypeOptions"
                          :key="t.id"
                          :value="t.id"
                          :disabled="isDocumentTypeOptionDisabled(t.id)"
                        >
                          {{ t.label }}{{ isDocumentTypeOptionDisabled(t.id) ? ' (ya tiene regla)' : '' }}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <p v-if="ruleForm.doc_subseries_id && filteredDocumentTypeOptions.length === 0" class="text-xs text-amber-700 dark:text-amber-400">
                      No hay tipos asociados a esta TRD en la subserie seleccionada. Márcalos en la pestaña Catálogo.
                    </p>
                    <p v-else-if="seriesOptionsForDocumentType.length === 0" class="text-xs text-amber-700 dark:text-amber-400">
                      Asocie tipos documentales en la pestaña Catálogo antes de crear reglas.
                    </p>
                  </div>
                </template>
              </div>
              <div class="grid gap-4 sm:grid-cols-3">
                <div class="space-y-2">
                  <Label>Años gestión</Label>
                  <Input v-model.number="ruleForm.years_management" type="number" min="0" />
                </div>
                <div class="space-y-2">
                  <Label>Años central</Label>
                  <Input v-model.number="ruleForm.years_central" type="number" min="0" />
                </div>
                <div class="space-y-2">
                  <Label>Años histórico</Label>
                  <Input v-model.number="ruleForm.years_historical" type="number" min="0" />
                </div>
              </div>
              <div class="space-y-2">
                <Label for="rule-final-disposition">Disposición final</Label>
                <p class="text-xs text-muted-foreground">
                  Puede seleccionar una o varias opciones.
                </p>
                <ArchivalTrdFinalDispositionField
                  id="rule-final-disposition"
                  v-model="finalDispositionSelected"
                />
              </div>
              <div class="space-y-2">
                <Label>Procedimiento</Label>
                <Textarea v-model="ruleForm.procedure_text" rows="3" />
              </div>
              <div class="space-y-2">
                <Label>Observaciones</Label>
                <Textarea v-model="ruleForm.notes" rows="2" />
              </div>
              <div class="flex gap-2 justify-end">
                <Button variant="outline" @click="showRuleForm = false">
                  Cancelar
                </Button>
                <Button :disabled="saving" @click="saveRule">
                  Guardar regla
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader class="flex flex-row items-center justify-between">
              <CardTitle>Reglas configuradas</CardTitle>
              <Button v-if="canEdit && !showRuleForm" size="sm" @click="openNewRule">
                <Icon name="i-lucide-plus" class="mr-1 h-4 w-4" />
                Regla
              </Button>
            </CardHeader>
            <CardContent class="space-y-4">
              <div
                v-if="version.retention_rules?.length"
                class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
              >
                <div class="w-full min-w-0 sm:max-w-md space-y-1">
                  <Label for="rules-filter" class="text-xs">Buscar</Label>
                  <div class="relative">
                    <Icon name="i-lucide-search" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="rules-filter"
                      v-model="rulesFilterText"
                      placeholder="Nivel, disposición, años…"
                      class="pl-9"
                    />
                  </div>
                </div>
                <div class="w-full min-w-0 sm:w-52 space-y-1">
                  <Label for="rules-scope-filter" class="text-xs">Nivel de regla</Label>
                  <Select v-model="rulesScopeFilter">
                    <SelectTrigger id="rules-scope-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        v-for="o in rulesScopeFilterOptions"
                        :key="o.value"
                        :value="o.value"
                      >
                        {{ o.label }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  v-if="rulesFilterText || rulesScopeFilter !== 'all'"
                  variant="ghost"
                  size="sm"
                  class="shrink-0"
                  @click="clearRulesFilters"
                >
                  Limpiar filtros
                </Button>
              </div>
              <div v-if="!(version.retention_rules?.length)" class="text-muted-foreground text-sm py-4">
                Sin reglas. Agregue reglas por serie, subserie o tipo documental.
              </div>
              <div
                v-else-if="!filteredRetentionRules.length"
                class="text-sm text-muted-foreground py-8 text-center border border-dashed rounded-lg"
              >
                No hay reglas que coincidan con la búsqueda o el filtro.
              </div>
              <Table v-else>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nivel</TableHead>
                    <TableHead>Gestión</TableHead>
                    <TableHead>Central</TableHead>
                    <TableHead>Disposición</TableHead>
                    <TableHead class="text-right w-[1%] whitespace-nowrap">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="rule in filteredRetentionRules" :key="rule.id">
                    <TableCell class="text-sm">
                      {{ ruleScopeLabel(rule) }}
                    </TableCell>
                    <TableCell>{{ rule.years_management }} a</TableCell>
                    <TableCell>{{ rule.years_central }} a</TableCell>
                    <TableCell>{{ dispositionLabel(rule.final_disposition) }}</TableCell>
                    <TableCell class="text-right">
                      <div v-if="canEdit" class="flex flex-nowrap items-center justify-end gap-1">
                        <Button
                          type="button"
                          variant="warning"
                          size="sm"
                          :class="catalogRowActionClass"
                          @click="openEditRule(rule)"
                        >
                          <Icon name="i-lucide-pencil" class="size-4 shrink-0" />
                          Editar
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          :class="catalogRowActionClass"
                          :disabled="saving"
                          @click="removeRule(rule.id)"
                        >
                          <Icon name="i-lucide-trash-2" class="size-4 shrink-0 text-destructive" />
                          Quitar
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="preview" class="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Retención efectiva por tipo asociado</CardTitle>
              <CardDescription>
                Prioridad: tipo documental → subserie → serie (HU-TRD-11).
                Muestra los tipos asociados en Catálogo y la regla que les aplica.
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
              <p class="text-sm text-muted-foreground leading-relaxed">
                {{ associatedTypesCount }} tipo(s) asociados · {{ retentionRulesCount }} regla(s) configurada(s)
              </p>
              <div
                v-if="previewNeedsRulesHint"
                class="rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-200 space-y-1"
              >
                <p class="font-medium">
                  Aún no hay reglas de retención
                </p>
                <p>
                  En la pestaña <strong>Reglas</strong>, cree al menos una regla por tipo documental
                  (o una regla por subserie/serie que cubra esos tipos).
                </p>
              </div>
              <div
                v-else-if="previewRulesNotApplyingHint"
                class="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm space-y-1"
              >
                <p class="font-medium">
                  Hay reglas, pero ninguna aplica a estos tipos
                </p>
                <p class="text-muted-foreground">
                  Verifique que cada regla apunte al mismo tipo, subserie o serie del catálogo
                  (códigos 045-02-02-01, etc.). Una regla por <strong>tipo documental</strong>
                  es lo más directo.
                </p>
              </div>
              <div
                v-if="previewDocumentTypes.length > 0"
                class="flex flex-wrap gap-2 text-sm"
              >
                <Badge variant="secondary">
                  {{ previewSummary.total }} tipo(s) en vista previa
                </Badge>
                <Badge variant="outline" class="text-green-700 dark:text-green-400 border-green-600/40">
                  {{ previewSummary.withRule }} con regla efectiva
                </Badge>
                <Badge
                  v-if="previewSummary.withoutRule > 0"
                  variant="outline"
                  class="text-destructive border-destructive/40"
                >
                  {{ previewSummary.withoutRule }} sin regla efectiva
                </Badge>
              </div>
              <div
                v-if="previewDocumentTypes.length > 0"
                class="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
              >
                <div class="w-full min-w-0 sm:max-w-md space-y-1">
                  <Label for="preview-filter" class="text-xs">Buscar</Label>
                  <div class="relative">
                    <Icon name="i-lucide-search" class="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="preview-filter"
                      v-model="previewFilterText"
                      placeholder="Código o nombre del tipo…"
                      class="pl-9"
                    />
                  </div>
                </div>
                <div class="w-full min-w-0 sm:w-52 space-y-1">
                  <Label for="preview-status-filter" class="text-xs">Filtrar por</Label>
                  <Select v-model="previewStatusFilter">
                    <SelectTrigger id="preview-status-filter">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        v-for="o in previewStatusFilterOptions"
                        :key="o.value"
                        :value="o.value"
                      >
                        {{ o.label }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  v-if="previewFilterText || previewStatusFilter !== 'all'"
                  variant="ghost"
                  size="sm"
                  class="shrink-0"
                  @click="clearPreviewFilters"
                >
                  Limpiar filtros
                </Button>
              </div>
              <div v-if="!previewDocumentTypes.length" class="text-muted-foreground py-6 text-center space-y-2 max-w-lg mx-auto">
                <p>
                  No hay tipos para mostrar en la vista previa.
                </p>
                <p class="text-sm leading-relaxed">
                  En la pestaña <strong>Catálogo</strong> marque los tipos documentales y pulse
                  <strong>Guardar asociación</strong>. Luego defina reglas en la pestaña <strong>Reglas</strong>.
                </p>
              </div>
              <div
                v-else-if="!filteredPreviewDocumentTypes.length"
                class="text-sm text-muted-foreground py-8 text-center border border-dashed rounded-lg"
              >
                No hay tipos que coincidan con la búsqueda o el filtro.
              </div>
              <Table v-else>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Gestión</TableHead>
                    <TableHead>Central</TableHead>
                    <TableHead>Disposición</TableHead>
                    <TableHead>Origen</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="tipo in filteredPreviewDocumentTypes" :key="tipo.id">
                    <TableCell class="font-mono text-sm">
                      {{ tipo.code }}
                    </TableCell>
                    <template v-if="effectivePreviewFor(tipo.id)">
                      <TableCell>{{ effectivePreviewFor(tipo.id)!.years_management }} a</TableCell>
                      <TableCell>{{ effectivePreviewFor(tipo.id)!.years_central }} a</TableCell>
                      <TableCell>{{ dispositionLabel(effectivePreviewFor(tipo.id)!.final_disposition) }}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {{ inheritedLabel(effectivePreviewFor(tipo.id)!.inherited_from) }}
                        </Badge>
                      </TableCell>
                    </template>
                    <TableCell v-else colspan="4" class="text-destructive text-sm">
                      Sin regla efectiva
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  </SettingsLayout>
</template>
