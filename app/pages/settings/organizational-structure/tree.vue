<script setup lang="ts">
import type { OrgOffice } from '~/types/org-structure'
import * as d3 from 'd3'
import { OrgChart } from 'd3-org-chart'
import { toast } from 'vue-sonner'
import { useOrgStructureApi } from '~/composables/useOrgStructureApi'

type TreeOffice = OrgOffice & {
  org_units?: TreeUnit[]
}

interface TreeUnit {
  id: number
  name: string
  code: string
  is_document_producer: boolean
  org_positions?: Array<{ id: number, name: string, code: string, hierarchy_level: number }>
}

interface OrgChartNode {
  id: string
  parentId: string | null
  kind: 'root' | 'office' | 'unit' | 'position'
  label: string
  subtitle: string
  badge?: string
}

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'estructura_org_ver',
})

const { $api } = useNuxtApp()
const router = useRouter()
const colorMode = useColorMode()
const { user, fetchUser } = useAuth()
const orgApi = useOrgStructureApi()

const isSuperAdmin = computed(() => user.value?.roles?.includes('super_admin') ?? false)

/** null = todas las agencias (solo super administrador puede filtrar por una). */
const selectedOfficeId = ref<number | null>(null)
const officeChoices = ref<Array<{ id: number; label: string }>>([])
const loadingOffices = ref(false)

const officeFilterOptions = computed(() => [
  { value: 'all', label: 'Todas las agencias' },
  ...officeChoices.value.map(o => ({ value: String(o.id), label: o.label })),
])

const officeFilterModel = computed({
  get: () => (selectedOfficeId.value == null ? 'all' : String(selectedOfficeId.value)),
  set: (value: string | number | null) => {
    selectedOfficeId.value = value === 'all' || value == null || value === '' ? null : Number(value)
  },
})

const tree = ref<TreeOffice[]>([])
const loading = ref(false)
const chartContainer = ref<HTMLDivElement | null>(null)
const chartReady = ref(false)

/** Agencia y áreas visibles; los cargos se expanden al hacer clic (menos dispersión inicial). */
const INITIAL_EXPAND_LEVEL = 1
const READABLE_MIN_SCALE = 0.82
const READABLE_MAX_SCALE = 1.12

let orgChart: any = null
let chartResizeObserver: ResizeObserver | null = null

function unitsForOffice(office: TreeOffice): TreeUnit[] {
  const raw = office as TreeOffice & { orgUnits?: TreeUnit[] }
  return office.org_units ?? raw.orgUnits ?? []
}

function positionsForUnit(unit: TreeUnit): Array<{ id: number, name: string, code: string, hierarchy_level: number }> {
  const raw = unit as TreeUnit & { orgPositions?: Array<{ id: number, name: string, code: string, hierarchy_level: number }> }
  return unit.org_positions ?? raw.orgPositions ?? []
}

/**
 * d3.stratify exige exactamente un raíz (parentId nulo). Varias agencias implican varias raíces reales;
 * se añade un nodo sintético para colgar todas las oficinas.
 */
function toChartNodes(input: TreeOffice[]): OrgChartNode[] {
  const nodes: OrgChartNode[] = []
  if (input.length === 0) {
    return nodes
  }

  /** Una sola agencia: raíz real (sin nodo sintético) para vista por sucursal. */
  if (input.length === 1) {
    const office = input[0]
    const officeId = `office-${office.id}`
    const code = office.code != null && String(office.code).trim() !== '' ? String(office.code) : '—'
    nodes.push({
      id: officeId,
      parentId: null,
      kind: 'office',
      label: office.name,
      subtitle: `Agencia (${code})`,
    })
    for (const unit of unitsForOffice(office)) {
      const unitId = `unit-${unit.id}`
      const unitCode = unit.code != null && String(unit.code).trim() !== '' ? String(unit.code) : '—'
      nodes.push({
        id: unitId,
        parentId: officeId,
        kind: 'unit',
        label: unit.name,
        subtitle: `Área (${unitCode})`,
        badge: unit.is_document_producer ? 'Productora documental' : undefined,
      })
      for (const position of positionsForUnit(unit)) {
        const posCode = position.code != null && String(position.code).trim() !== '' ? String(position.code) : '—'
        nodes.push({
          id: `position-${position.id}`,
          parentId: unitId,
          kind: 'position',
          label: position.name,
          subtitle: `Cargo (${posCode})`,
          badge: `Nivel ${position.hierarchy_level}`,
        })
      }
    }

    return nodes
  }

  const rootId = 'org-tree-root'
  nodes.push({
    id: rootId,
    parentId: null,
    kind: 'root',
    label: 'Estructura organizacional',
    subtitle: `${input.length} agencia(s) activa(s)`,
  })

  for (const office of input) {
    const officeId = `office-${office.id}`
    const code = office.code != null && String(office.code).trim() !== '' ? String(office.code) : '—'
    nodes.push({
      id: officeId,
      parentId: rootId,
      kind: 'office',
      label: office.name,
      subtitle: `Agencia (${code})`,
    })

    for (const unit of unitsForOffice(office)) {
      const unitId = `unit-${unit.id}`
      const unitCode = unit.code != null && String(unit.code).trim() !== '' ? String(unit.code) : '—'
      nodes.push({
        id: unitId,
        parentId: officeId,
        kind: 'unit',
        label: unit.name,
        subtitle: `Área (${unitCode})`,
        badge: unit.is_document_producer ? 'Productora documental' : undefined,
      })

      for (const position of positionsForUnit(unit)) {
        const posCode = position.code != null && String(position.code).trim() !== '' ? String(position.code) : '—'
        nodes.push({
          id: `position-${position.id}`,
          parentId: unitId,
          kind: 'position',
          label: position.name,
          subtitle: `Cargo (${posCode})`,
          badge: `Nivel ${position.hierarchy_level}`,
        })
      }
    }
  }

  return nodes
}

function chartViewportSize(): { width: number, height: number } {
  const el = chartContainer.value
  if (!el) {
    return { width: 800, height: 640 }
  }
  return {
    width: Math.max(el.clientWidth, 320),
    height: Math.max(el.clientHeight, 480),
  }
}

function syncChartSurfaceSize(): void {
  if (!orgChart || !chartContainer.value) {
    return
  }
  const { width, height } = chartViewportSize()
  const attrs = orgChart.getChartState?.()
  if (!attrs) {
    return
  }
  attrs.svgWidth = width
  attrs.svgHeight = height
  attrs.svg?.attr('width', width).attr('height', height)
}

function boundsForChartNodes(nodes: Array<Record<string, any>>): { x0: number, x1: number, y0: number, y1: number } {
  const attrs = orgChart.getChartState()
  const layout = attrs.layoutBindings[attrs.layout]
  return {
    x0: (d3.min(nodes, (d: any) => d.x + layout.nodeLeftX(d)) ?? 0) - 48,
    x1: (d3.max(nodes, (d: any) => d.x + layout.nodeRightX(d)) ?? 0) + 48,
    y0: (d3.min(nodes, (d: any) => d.y + layout.nodeTopY(d)) ?? 0) - 40,
    y1: (d3.max(nodes, (d: any) => d.y + layout.nodeBottomY(d)) ?? 0) + 80,
  }
}

function applyZoomToChartNodes(
  nodes: Array<Record<string, any>>,
  opts?: { animate?: boolean, minScale?: number, maxScale?: number },
): void {
  if (!orgChart || nodes.length === 0) {
    return
  }
  const attrs = orgChart.getChartState()
  const { svgWidth: w, svgHeight: h, svg, zoomBehavior, duration, centerG } = attrs
  if (!svg || !zoomBehavior) {
    return
  }
  const { x0, x1, y0, y1 } = boundsForChartNodes(nodes)
  const minScale = opts?.minScale ?? READABLE_MIN_SCALE
  const maxScale = opts?.maxScale ?? READABLE_MAX_SCALE
  const spanX = Math.max(x1 - x0, 1)
  const spanY = Math.max(y1 - y0, 1)
  let scaleVal = 0.9 / Math.max(spanX / w, spanY / h)
  scaleVal = Math.min(maxScale, Math.max(minScale, scaleVal))
  const identity = d3.zoomIdentity
    .translate(w / 2, h / 2)
    .scale(scaleVal)
    .translate(-(x0 + x1) / 2, -(y0 + y1) / 2)
  const ms = opts?.animate === false ? 0 : duration
  svg.transition().duration(ms).call(zoomBehavior.transform, identity)
  centerG?.transition().duration(ms).attr('transform', 'translate(0,0)')
}

function focusReadableView(animate = false): void {
  if (!orgChart) {
    return
  }
  const root = orgChart.getChartState()?.root
  if (!root) {
    return
  }
  const focus = [root, ...(root.children ?? [])]
  applyZoomToChartNodes(focus, { animate, minScale: READABLE_MIN_SCALE, maxScale: READABLE_MAX_SCALE })
}

function fitEntireTree(): void {
  orgChart?.fit({ animate: true, scale: true })
}

function zoomChart(direction: 'in' | 'out'): void {
  if (!orgChart) {
    return
  }
  if (direction === 'in') {
    orgChart.zoomIn()
    return
  }
  orgChart.zoomOut()
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll('\'', '&#039;')
}

async function renderChart(): Promise<void> {
  if (!chartContainer.value || tree.value.length === 0) {
    return
  }

  try {
    ;(window as any).d3 = d3

    const nodes = toChartNodes(tree.value)
    if (orgChart) {
      orgChart.clear()
      orgChart = null
    }
    chartContainer.value.innerHTML = ''
    orgChart = new OrgChart()
    const dark = colorMode.value === 'dark'

    const palette = dark
      ? {
          surface: '#09090b',
          border: '#27272a',
          text: '#fafafa',
          muted: '#a1a1aa',
          badgeBg: '#18181b',
          badgeText: '#d4d4d8',
          line: '#3f3f46',
          officeAccent: '#2563eb',
          unitAccent: '#16a34a',
          positionAccent: '#a855f7',
        }
      : {
          surface: '#ffffff',
          border: '#e4e4e7',
          text: '#18181b',
          muted: '#71717a',
          badgeBg: '#fafafa',
          badgeText: '#52525b',
          line: '#a1a1aa',
          officeAccent: '#2563eb',
          unitAccent: '#16a34a',
          positionAccent: '#9333ea',
        }

    const { width, height } = chartViewportSize()

    orgChart
      .container(chartContainer.value)
      .data(nodes)
      .svgWidth(width)
      .svgHeight(height)
      .compact(true)
      .nodeWidth(() => 272)
      .nodeHeight(() => 154)
      .childrenMargin(() => 40)
      .siblingsMargin(() => 18)
      .neighbourMargin(() => 28)
      .compactMarginBetween(() => 18)
      .compactMarginPair(() => 22)
      .rootMargin(28)
      .nodeButtonWidth(() => 58)
      .nodeButtonHeight(() => 28)
      .nodeButtonX(() => -29)
      .nodeButtonY(() => -34)
      .initialExpandLevel(INITIAL_EXPAND_LEVEL)
      .setActiveNodeCentered(true)
      .scaleExtent([0.35, 2.2])
      .duration(280)
      .linkUpdate(function (this: SVGPathElement) {
        d3.select(this).attr('stroke', palette.line).attr('stroke-width', 1.5)
      })
      .buttonContent(({ node }: { node: any }) => {
        const expanded = Boolean(node.children)
        const count = Number(node.data?._directSubordinatesPaging ?? node.data?._directSubordinates ?? 0)
        const chevron = expanded
          ? '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 15l6-6 6 6" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
          : '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 9l6 6 6-6" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>'
        return `<div style="box-sizing:border-box;display:flex;align-items:center;justify-content:center;gap:5px;width:100%;height:100%;border:1px solid ${palette.border};border-radius:999px;background:${palette.badgeBg};color:${palette.text};font-size:12px;font-weight:700;line-height:1;box-shadow:0 1px 3px rgb(24 24 27 / 0.12);">${chevron}<span>${count}</span></div>`
      })
      .nodeContent((d: any) => {
        const data = d?.data as OrgChartNode
        const kindStyles: Record<OrgChartNode['kind'], { icon: string, accent: string, label: string }> = {
          root: { icon: '🌐', accent: '#64748b', label: 'Vista' },
          office: { icon: '🏢', accent: palette.officeAccent, label: 'Agencia' },
          unit: { icon: '🧩', accent: palette.unitAccent, label: 'Área' },
          position: { icon: '👤', accent: palette.positionAccent, label: 'Cargo' },
        }
        const kindStyle = kindStyles[data.kind] ?? kindStyles.office

        const badgeHtml = data.badge
          ? `<span style="display:inline-block;max-width:100%;margin-top:6px;padding:2px 8px;border:1px solid ${palette.border};border-radius:999px;font-size:11px;line-height:16px;background:${palette.badgeBg};color:${palette.badgeText};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(data.badge)}</span>`
          : ''

        return `
          <div style="box-sizing:border-box;height:100%;width:100%;overflow:hidden;border:1px solid ${palette.border};border-left:4px solid ${kindStyle.accent};border-radius:12px;background:${palette.surface};padding:10px 12px 38px;display:flex;flex-direction:column;">
            <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
              <span style="font-size:14px;line-height:16px;">${kindStyle.icon}</span>
              <span style="font-size:11px;line-height:16px;color:${palette.muted};text-transform:uppercase;letter-spacing:0.04em;">${kindStyle.label}</span>
            </div>
            <div style="font-size:14px;font-weight:600;line-height:18px;color:${palette.text};margin-top:6px;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;">${escapeHtml(data.label)}</div>
            <div style="font-size:12px;line-height:16px;color:${palette.muted};margin-top:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(data.subtitle)}</div>
            ${badgeHtml}
          </div>
        `
      })
      .render()

    await nextTick()
    syncChartSurfaceSize()
    focusReadableView(false)
    chartReady.value = true
  }
  catch (err) {
    chartReady.value = false
    console.error('[organigrama]', err)
    toast.error('No se pudo renderizar el organigrama. Revise la consola del navegador (F12) para el detalle técnico.')
  }
}

async function loadOfficeChoices(): Promise<void> {
  if (!isSuperAdmin.value) {
    officeChoices.value = []
    return
  }
  loadingOffices.value = true
  try {
    const offices = await orgApi.fetchOffices({ activeOnly: true })
    officeChoices.value = offices.map((o) => ({
      id: o.id,
      label: o.city ? `${o.name} (${o.code}) — ${o.city}` : `${o.name} (${o.code})`,
    }))
  }
  catch {
    officeChoices.value = []
    toast.error('No se pudo cargar el listado de agencias')
  }
  finally {
    loadingOffices.value = false
  }
}

async function refreshTree(): Promise<void> {
  await loadOfficeChoices()
  await loadTree()
}

async function loadTree(): Promise<void> {
  loading.value = true
  chartReady.value = false
  try {
    const query: Record<string, string | number | boolean> = { active_only: true }
    if (isSuperAdmin.value && selectedOfficeId.value != null) {
      query.org_office_id = selectedOfficeId.value
    }
    const res = await $api<{ data: TreeOffice[] }>('/organizational-structure/meta/tree', {
      query,
    })
    tree.value = res.data
  }
  catch {
    tree.value = []
    toast.error('No se pudo cargar el organigrama')
  }
  finally {
    loading.value = false
    await nextTick()
    await nextTick()
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve())
    })
    await renderChart()
  }
}

onMounted(async () => {
  if (!user.value) {
    await fetchUser()
  }
  await refreshTree()
  if (import.meta.client && chartContainer.value && typeof ResizeObserver !== 'undefined') {
    chartResizeObserver = new ResizeObserver(() => {
      if (!chartReady.value) {
        return
      }
      syncChartSurfaceSize()
    })
    chartResizeObserver.observe(chartContainer.value)
  }
})

watch(selectedOfficeId, () => {
  if (isSuperAdmin.value) {
    loadTree()
  }
})

watch(
  () => colorMode.value,
  () => {
    if (chartReady.value) {
      renderChart()
    }
  },
)

onBeforeUnmount(() => {
  chartResizeObserver?.disconnect()
  chartResizeObserver = null
  if (orgChart) {
    orgChart.clear()
    orgChart = null
  }
  if (chartContainer.value) {
    chartContainer.value.innerHTML = ''
  }
})
</script>

<template>
  <SettingsLayout :wide="true" hide-intro>
    <div class="w-full flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1 max-w-3xl">
          <Button variant="ghost" size="sm" class="h-8 w-fit -ml-2 px-2" @click="router.push('/settings/organizational-structure')">
            <Icon name="i-lucide-arrow-left" class="mr-1 h-4 w-4" />
            Módulo
          </Button>
          <h2 class="text-2xl font-bold tracking-tight">
            Organigrama
          </h2>
          <p class="text-muted-foreground leading-relaxed">
            Solo elementos activos. La edición se realiza desde cada catálogo.
            <template v-if="isSuperAdmin">
              Como super administrador puede acotar el organigrama a una agencia (sede operativa).
            </template>
          </p>
        </div>
        <Button variant="outline" size="sm" class="shrink-0" :disabled="loading" @click="refreshTree">
          <Icon name="i-lucide-refresh-cw" class="mr-2 h-4 w-4" />
          Actualizar
        </Button>
      </div>

      <Card>
        <CardHeader class="gap-2">
          <CardTitle class="leading-snug">
            Jerarquía de agencias, áreas y cargos
          </CardTitle>
          <CardDescription class="leading-relaxed">
            Vista arbórea sólo lectura conforme registros vigentes activos en el sistema.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div
            v-if="isSuperAdmin && (officeChoices.length > 0 || loadingOffices)"
            class="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end"
          >
            <div class="space-y-2 min-w-[min(100%,280px)] sm:max-w-md">
              <Label for="tree-office-filter" class="text-sm">Agencia</Label>
              <ArchivalSingleMultiselect
                id="tree-office-filter"
                v-model="officeFilterModel"
                :disabled="loadingOffices || loading"
                :can-clear="false"
                :options="officeFilterOptions"
                placeholder="Todas las agencias"
                no-options-text="No hay agencias configuradas"
                no-results-text="Sin coincidencias"
              />
            </div>
          </div>

          <div v-if="loading" class="flex justify-center py-12">
            <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
          <div v-else-if="tree.length === 0" class="py-12 text-center text-muted-foreground">
            Sin datos de estructura. Cree al menos una agencia y áreas.
          </div>
          <div v-else class="space-y-3">
            <div class="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                :disabled="!chartReady"
                @click="zoomChart('out')"
              >
                <Icon name="i-lucide-zoom-out" class="mr-1.5 h-4 w-4" />
                Alejar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                :disabled="!chartReady"
                @click="zoomChart('in')"
              >
                <Icon name="i-lucide-zoom-in" class="mr-1.5 h-4 w-4" />
                Acercar
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                :disabled="!chartReady"
                @click="focusReadableView(true)"
              >
                <Icon name="i-lucide-scan" class="mr-1.5 h-4 w-4" />
                Vista cercana
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                :disabled="!chartReady"
                @click="fitEntireTree"
              >
                <Icon name="i-lucide-maximize-2" class="mr-1.5 h-4 w-4" />
                Ver todo
              </Button>
            </div>
            <div
              ref="chartContainer"
              class="org-chart-canvas w-full overflow-hidden rounded-md border bg-background h-[min(780px,calc(100dvh-14rem))] min-h-[520px]"
            />
            <p v-if="!chartReady" class="text-sm text-muted-foreground leading-relaxed">
              Cargando visualización del organigrama...
            </p>
            <p v-else class="text-xs text-muted-foreground leading-relaxed">
              Arrastre para moverse. Rueda del mouse para zoom. Al cargar se muestran agencia y áreas; pulse el botón del nodo para ver los cargos.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  </SettingsLayout>
</template>

<style scoped>
.org-chart-canvas :deep(svg.svg-chart-container) {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
