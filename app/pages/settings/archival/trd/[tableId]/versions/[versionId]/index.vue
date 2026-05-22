<script setup lang="ts">
import { toast } from 'vue-sonner'
import {
  TRD_DISPOSITION_OPTIONS,
  TRD_FINAL_DISPOSITION_LABELS,
  TRD_INHERITED_FROM_LABELS,
  TRD_RETENTION_APPLICATION_OPTIONS,
  TRD_RETENTION_LEVEL_HELP,
  TRD_SCOPE_LEVEL_OPTIONS,
  TRD_VERSION_STATUS_LABELS,
} from '~/constants/archival-trd'
import type { CatalogTreeSeries, EffectiveRetentionPayload, TrdRetentionRuleRow, TrdVersionRow } from '~/types/archival-trd'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'trd_tablas_ver',
})

const route = useRoute()
const router = useRouter()
const { $api } = useNuxtApp()
const trdApi = useTrdApi()
const { hasPermission } = usePermissions()

const tableId = computed(() => Number(route.params.tableId))
const versionId = computed(() => Number(route.params.versionId))

const version = ref<TrdVersionRow | null>(null)
const preview = ref<Record<number, EffectiveRetentionPayload | null>>({})
const catalogTree = ref<CatalogTreeSeries[]>([])
const loading = ref(true)
const saving = ref(false)
const activating = ref(false)

const selectedTypeIds = ref<number[]>([])
const metaForm = ref({
  producer_office_name: '',
  producer_office_code: '',
  retention_application_level: 'document_type',
  approved_at: '',
  effective_from: '',
  effective_to: '',
})

const showRuleForm = ref(false)
const editingRuleId = ref<number | null>(null)
const ruleForm = ref({
  scope_level: 'document_type',
  doc_series_id: null as number | null,
  doc_subseries_id: null as number | null,
  doc_document_type_id: null as number | null,
  years_management: 2,
  years_central: 5,
  years_historical: null as number | null,
  final_disposition: 'elimination',
  procedure_text: '',
  notes: '',
})

const isDraft = computed(() => version.value?.status === 'draft' && !version.value?.is_locked)
const canEdit = computed(() => isDraft.value && hasPermission('trd_tablas_editar'))

function dispositionLabel(v: string): string {
  return TRD_FINAL_DISPOSITION_LABELS[v] ?? v
}

function inheritedLabel(v: string): string {
  return TRD_INHERITED_FROM_LABELS[v] ?? v
}

function toggleType(id: number, checked: boolean) {
  if (!canEdit.value) {
    return
  }
  const set = new Set(selectedTypeIds.value)
  if (checked) {
    set.add(id)
  } else {
    set.delete(id)
  }
  selectedTypeIds.value = [...set]
}

function toggleSubseriesTypes(sub: CatalogTreeSeries['subseries'][0], checked: boolean) {
  for (const t of sub.document_types) {
    toggleType(t.id, checked)
  }
}

async function reload() {
  const res = await trdApi.fetchVersion(tableId.value, versionId.value)
  version.value = res.data
  preview.value = res.effective_retention_preview ?? {}
  selectedTypeIds.value = (res.data.document_types ?? []).map(t => t.id)
  metaForm.value = {
    producer_office_name: res.data.producer_office_name,
    producer_office_code: res.data.producer_office_code,
    retention_application_level: res.data.retention_application_level,
    approved_at: res.data.approved_at?.slice(0, 10) ?? '',
    effective_from: res.data.effective_from?.slice(0, 10) ?? '',
    effective_to: res.data.effective_to?.slice(0, 10) ?? '',
  }
}

async function load() {
  loading.value = true
  try {
    catalogTree.value = await trdApi.fetchCatalogTree(true)
    await reload()
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
  saving.value = true
  try {
    await $api(`/archival/trd-tables/${tableId.value}/versions/${versionId.value}`, {
      method: 'PUT',
      body: {
        producer_office_name: metaForm.value.producer_office_name.trim(),
        producer_office_code: metaForm.value.producer_office_code.trim(),
        retention_application_level: metaForm.value.retention_application_level,
        approved_at: metaForm.value.approved_at || null,
        effective_from: metaForm.value.effective_from || null,
        effective_to: metaForm.value.effective_to || null,
      },
    })
    toast.success('Datos de versión guardados')
    await reload()
  } catch (e: any) {
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
  ruleForm.value = {
    scope_level: 'document_type',
    doc_series_id: null,
    doc_subseries_id: null,
    doc_document_type_id: null,
    years_management: 2,
    years_central: 5,
    years_historical: null,
    final_disposition: 'elimination',
    procedure_text: '',
    notes: '',
  }
  showRuleForm.value = true
}

function openEditRule(rule: TrdRetentionRuleRow) {
  editingRuleId.value = rule.id
  ruleForm.value = {
    scope_level: rule.scope_level,
    doc_series_id: rule.doc_series_id ?? null,
    doc_subseries_id: rule.doc_subseries_id ?? null,
    doc_document_type_id: rule.doc_document_type_id ?? null,
    years_management: rule.years_management,
    years_central: rule.years_central,
    years_historical: rule.years_historical ?? null,
    final_disposition: rule.final_disposition,
    procedure_text: rule.procedure_text ?? '',
    notes: rule.notes ?? '',
  }
  showRuleForm.value = true
}

async function saveRule() {
  if (!canEdit.value) {
    return
  }
  const body: Record<string, unknown> = {
    scope_level: ruleForm.value.scope_level,
    doc_series_id: ruleForm.value.doc_series_id,
    doc_subseries_id: ruleForm.value.doc_subseries_id,
    doc_document_type_id: ruleForm.value.doc_document_type_id,
    years_management: ruleForm.value.years_management,
    years_central: ruleForm.value.years_central,
    years_historical: ruleForm.value.years_historical,
    final_disposition: ruleForm.value.final_disposition,
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
  activating.value = true
  try {
    await $api(`/archival/trd-tables/${tableId.value}/versions/${versionId.value}/activate`, {
      method: 'POST',
    })
    toast.success('TRD activada')
    await reload()
  } catch (e: any) {
    const msg = e?.data?.errors?.retention_rules?.[0]
      ?? e?.data?.errors?.approved_at?.[0]
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

const typeOptions = computed(() => {
  const ssid = ruleForm.value.doc_subseries_id
  if (!ssid) {
    return []
  }
  for (const s of catalogTree.value) {
    const sub = s.subseries.find(x => x.id === ssid)
    if (sub) {
      return sub.document_types.map(t => ({ id: t.id, label: `${t.code} — ${t.name}` }))
    }
  }
  return []
})

watch(() => ruleForm.value.scope_level, (level) => {
  if (level === 'series') {
    ruleForm.value.doc_subseries_id = null
    ruleForm.value.doc_document_type_id = null
  } else if (level === 'subseries') {
    ruleForm.value.doc_document_type_id = null
  }
})

onMounted(load)
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

      <Tabs default-value="general">
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
              <div class="grid gap-4 sm:grid-cols-3">
                <div class="space-y-2">
                  <Label>Fecha aprobación</Label>
                  <Input v-model="metaForm.approved_at" type="date" :disabled="!canEdit" />
                </div>
                <div class="space-y-2">
                  <Label>Vigencia desde</Label>
                  <Input v-model="metaForm.effective_from" type="date" :disabled="!canEdit" />
                </div>
                <div class="space-y-2">
                  <Label>Vigencia hasta</Label>
                  <Input v-model="metaForm.effective_to" type="date" :disabled="!canEdit" />
                </div>
              </div>
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
            <CardHeader>
              <CardTitle>Tipos documentales de esta TRD</CardTitle>
              <CardDescription>
                Seleccione del catálogo institucional (serie → subserie → tipo).
              </CardDescription>
            </CardHeader>
            <CardContent class="space-y-4">
              <div v-for="serie in catalogTree" :key="serie.id" class="border rounded-lg p-4 space-y-3">
                <p class="font-medium font-mono text-sm">
                  {{ serie.code }} — {{ serie.name }}
                </p>
                <div v-for="sub in serie.subseries" :key="sub.id" class="pl-4 space-y-2 border-l">
                  <div class="flex items-center gap-2">
                    <Checkbox
                      :disabled="!canEdit"
                      :checked="sub.document_types.length > 0 && sub.document_types.every(t => selectedTypeIds.includes(t.id))"
                      @update:checked="(c: boolean | 'indeterminate') => toggleSubseriesTypes(sub, c === true)"
                    />
                    <span class="text-sm font-mono">{{ sub.code }} — {{ sub.name }}</span>
                  </div>
                  <div v-for="tipo in sub.document_types" :key="tipo.id" class="pl-6 flex items-center gap-2">
                    <Checkbox
                      :disabled="!canEdit"
                      :checked="selectedTypeIds.includes(tipo.id)"
                      @update:checked="(c: boolean | 'indeterminate') => toggleType(tipo.id, c === true)"
                    />
                    <span class="text-sm">{{ tipo.code }} — {{ tipo.name }}</span>
                  </div>
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
                    <SelectTrigger><SelectValue /></SelectTrigger>
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
                    <SelectTrigger><SelectValue placeholder="Seleccione…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem v-for="s in seriesOptions" :key="s.id" :value="s.id">
                        {{ s.label }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div v-if="ruleForm.scope_level === 'subseries'" class="space-y-2">
                  <Label>Serie</Label>
                  <Select v-model="ruleForm.doc_series_id">
                    <SelectTrigger><SelectValue placeholder="Serie…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem v-for="s in seriesOptions" :key="s.id" :value="s.id">
                        {{ s.label }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div v-if="ruleForm.scope_level === 'subseries'" class="space-y-2">
                  <Label>Subserie</Label>
                  <Select v-model="ruleForm.doc_subseries_id">
                    <SelectTrigger><SelectValue placeholder="Subserie…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem v-for="s in subseriesOptions" :key="s.id" :value="s.id">
                        {{ s.label }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div v-if="ruleForm.scope_level === 'document_type'" class="space-y-2 sm:col-span-2">
                  <Label>Tipo documental</Label>
                  <Select v-model="ruleForm.doc_document_type_id">
                    <SelectTrigger><SelectValue placeholder="Tipo…" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem
                        v-for="t in catalogTree.flatMap(ser => ser.subseries.flatMap(sub => sub.document_types.map(dt => ({ ...dt, label: `${ser.code}/${sub.code}/${dt.code} — ${dt.name}` }))))"
                        :key="t.id"
                        :value="t.id"
                      >
                        {{ t.label }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div class="grid gap-4 sm:grid-cols-4">
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
                <div class="space-y-2">
                  <Label>Disposición final</Label>
                  <Select v-model="ruleForm.final_disposition">
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem v-for="o in TRD_DISPOSITION_OPTIONS" :key="o.value" :value="o.value">
                        {{ o.label }}
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
            <CardContent>
              <div v-if="!(version.retention_rules?.length)" class="text-muted-foreground text-sm py-4">
                Sin reglas. Agregue reglas por serie, subserie o tipo documental.
              </div>
              <Table v-else>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nivel</TableHead>
                    <TableHead>Gestión</TableHead>
                    <TableHead>Central</TableHead>
                    <TableHead>Disposición</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow v-for="rule in version.retention_rules" :key="rule.id">
                    <TableCell class="text-sm">
                      {{ rule.scope_level }}
                      <span v-if="rule.doc_document_type_id" class="text-muted-foreground"> #{{ rule.doc_document_type_id }}</span>
                      <span v-else-if="rule.doc_subseries_id" class="text-muted-foreground"> sub#{{ rule.doc_subseries_id }}</span>
                      <span v-else-if="rule.doc_series_id" class="text-muted-foreground"> ser#{{ rule.doc_series_id }}</span>
                    </TableCell>
                    <TableCell>{{ rule.years_management }} a</TableCell>
                    <TableCell>{{ rule.years_central }} a</TableCell>
                    <TableCell>{{ dispositionLabel(rule.final_disposition) }}</TableCell>
                    <TableCell>
                      <div v-if="canEdit" class="flex gap-1">
                        <Button variant="ghost" size="sm" @click="openEditRule(rule)">
                          Editar
                        </Button>
                        <Button variant="ghost" size="sm" @click="removeRule(rule.id)">
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
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div v-if="!(version.document_types?.length)" class="text-muted-foreground py-6 text-center">
                Asocie tipos documentales y defina reglas.
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
                  <TableRow v-for="tipo in version.document_types" :key="tipo.id">
                    <TableCell class="font-mono text-sm">
                      {{ tipo.code }}
                    </TableCell>
                    <template v-if="preview[tipo.id]">
                      <TableCell>{{ preview[tipo.id]!.years_management }} a</TableCell>
                      <TableCell>{{ preview[tipo.id]!.years_central }} a</TableCell>
                      <TableCell>{{ dispositionLabel(preview[tipo.id]!.final_disposition) }}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {{ inheritedLabel(preview[tipo.id]!.inherited_from) }}
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
