<script setup lang="ts">
import type { OrgOffice } from '~/types/org-structure'
import * as d3 from 'd3'
import { OrgChart } from 'd3-org-chart'
import { toast } from 'vue-sonner'

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
  kind: 'office' | 'unit' | 'position'
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

const tree = ref<TreeOffice[]>([])
const loading = ref(false)
const chartContainer = ref<HTMLDivElement | null>(null)
const chartReady = ref(false)

const INITIAL_EXPAND_LEVEL = 2
/** Altura del lienzo SVG (viewport); el contenedor hace scroll si el árbol es más grande. */
const CHART_VIEWPORT_HEIGHT = 440
/** Escala inicial del zoom de D3 (1 = 100%). */
const INITIAL_ZOOM = 1

let orgChart: any = null

function toChartNodes(input: TreeOffice[]): OrgChartNode[] {
  const nodes: OrgChartNode[] = []

  for (const office of input) {
    const officeId = `office-${office.id}`
    nodes.push({
      id: officeId,
      parentId: null,
      kind: 'office',
      label: office.name,
      subtitle: `Agencia (${office.code})`,
    })

    for (const unit of office.org_units ?? []) {
      const unitId = `unit-${unit.id}`
      nodes.push({
        id: unitId,
        parentId: officeId,
        kind: 'unit',
        label: unit.name,
        subtitle: `Área (${unit.code})`,
        badge: unit.is_document_producer ? 'Productora documental' : undefined,
      })

      for (const position of unit.org_positions ?? []) {
        nodes.push({
          id: `position-${position.id}`,
          parentId: unitId,
          kind: 'position',
          label: position.name,
          subtitle: `Cargo (${position.code})`,
          badge: `Nivel ${position.hierarchy_level}`,
        })
      }
    }
  }

  return nodes
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

    orgChart
      .container(chartContainer.value)
      .data(nodes)
      .svgHeight(CHART_VIEWPORT_HEIGHT)
      .nodeWidth(() => 280)
      .nodeHeight(() => 130)
      .childrenMargin(() => 56)
      .compactMarginBetween(() => 24)
      .compactMarginPair(() => 50)
      .initialExpandLevel(INITIAL_EXPAND_LEVEL)
      .initialZoom(INITIAL_ZOOM)
      .setActiveNodeCentered(false)
      .duration(450)
      .linkUpdate(function (this: SVGPathElement) {
        d3.select(this).attr('stroke', palette.line).attr('stroke-width', 1.5)
      })
      .nodeContent((d: any) => {
        const data = d?.data as OrgChartNode
        const kindStyles: Record<OrgChartNode['kind'], { icon: string, accent: string, label: string }> = {
          office: { icon: '🏢', accent: palette.officeAccent, label: 'Agencia' },
          unit: { icon: '🧩', accent: palette.unitAccent, label: 'Área' },
          position: { icon: '👤', accent: palette.positionAccent, label: 'Cargo' },
        }
        const kindStyle = kindStyles[data.kind] ?? kindStyles.office

        const badgeHtml = data.badge
          ? `<span style="display:inline-block;margin-top:8px;padding:2px 8px;border:1px solid ${palette.border};border-radius:999px;font-size:11px;line-height:16px;background:${palette.badgeBg};color:${palette.badgeText};">${escapeHtml(data.badge)}</span>`
          : ''

        return `
          <div style="box-sizing:border-box;height:100%;width:100%;border:1px solid ${palette.border};border-left:4px solid ${kindStyle.accent};border-radius:12px;background:${palette.surface};padding:12px 14px;display:flex;flex-direction:column;justify-content:space-between;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="font-size:14px;line-height:16px;">${kindStyle.icon}</span>
              <span style="font-size:11px;line-height:16px;color:${palette.muted};text-transform:uppercase;letter-spacing:0.04em;">${kindStyle.label}</span>
            </div>
            <div style="font-size:15px;font-weight:600;line-height:20px;color:${palette.text};margin-top:6px;">${escapeHtml(data.label)}</div>
            <div style="font-size:12px;line-height:16px;color:${palette.muted};margin-top:6px;">${escapeHtml(data.subtitle)}</div>
            ${badgeHtml}
          </div>
        `
      })
      .render()

    chartReady.value = true
  }
  catch (err) {
    chartReady.value = false
    console.error('[organigrama]', err)
    toast.error('No se pudo renderizar el organigrama')
  }
}

async function loadTree(): Promise<void> {
  loading.value = true
  chartReady.value = false
  try {
    const res = await $api<{ data: TreeOffice[] }>('/organizational-structure/meta/tree', {
      query: { active_only: true },
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
    await renderChart()
  }
}

onMounted(() => {
  loadTree()
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
  <SettingsLayout :wide="true">
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
          </p>
        </div>
        <Button variant="outline" size="sm" class="shrink-0" :disabled="loading" @click="loadTree">
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
        <CardContent>
          <div v-if="loading" class="flex justify-center py-12">
            <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
          <div v-else-if="tree.length === 0" class="py-12 text-center text-muted-foreground">
            Sin datos de estructura. Cree al menos una agencia y áreas.
          </div>
          <div v-else class="space-y-3">
            <div
              ref="chartContainer"
              class="w-full overflow-auto rounded-md border p-2 sm:p-3 bg-background max-h-[min(480px,55vh)] min-h-[360px]"
            />
            <p v-if="!chartReady" class="text-sm text-muted-foreground leading-relaxed">
              Cargando visualizacion del organigrama...
            </p>
            <p v-else class="text-xs text-muted-foreground leading-relaxed">
              Zoom inicial al {{ INITIAL_ZOOM * 100 }}%. Use la rueda del mouse para acercar o alejar. Nivel expandido al cargar: {{ INITIAL_EXPAND_LEVEL }}.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  </SettingsLayout>
</template>
