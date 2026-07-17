<script setup lang="ts">
import { toast } from 'vue-sonner'
import type {
  ArchivalFileAlertCatalog,
  ArchivalFileAlertCatalogType,
} from '~/types/archival-file'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: ['expedientes_reportes_ver', 'expedientes_alertas_configurar'],
})

const CATEGORY_HELP: Record<string, string> = {
  documents: 'Se evalúan cuando el expediente está editable y faltan documentos obligatorios del tipo.',
  lifecycle: 'Controlan borradores sin avance y expedientes listos para cerrar.',
  consolidation: 'Recuerdan generar el PDF consolidado después del cierre.',
  retention: 'Avisan vencimientos y transferencias entre archivo de gestión, central e histórico.',
}

const CATEGORY_ICONS: Record<string, string> = {
  documents: 'i-lucide-file-warning',
  lifecycle: 'i-lucide-git-branch',
  consolidation: 'i-lucide-file-stack',
  retention: 'i-lucide-calendar-clock',
}

const router = useRouter()
const archivalApi = useArchivalFileApi()
const { hasPermission } = usePermissions()

const loading = ref(true)
const saving = ref(false)
const catalog = ref<ArchivalFileAlertCatalog | null>(null)
const activeTab = ref('general')

const formGlobal = ref({
  enabled: true,
  email_enabled: false,
  notify_creator: true,
  notify_unit_manager: true,
  retention_upcoming_days: 30,
  stale_draft_days: 30,
  consolidation_reminder_days: 7,
})

const formTypes = ref<ArchivalFileAlertCatalogType[]>([])

const canEdit = computed(() => hasPermission('expedientes_alertas_configurar'))

const typesByCategory = computed(() => {
  const grouped = new Map<string, { key: string, label: string, types: ArchivalFileAlertCatalogType[] }>()

  for (const type of formTypes.value) {
    if (!grouped.has(type.category)) {
      grouped.set(type.category, {
        key: type.category,
        label: type.category_label,
        types: [],
      })
    }

    grouped.get(type.category)!.types.push(type)
  }

  return Array.from(grouped.values())
})

const activeTypesCount = computed(() => formTypes.value.filter(type => type.is_enabled).length)

function categoryHelp(key: string): string {
  return CATEGORY_HELP[key] ?? 'Configure cada tipo de alerta de esta categoría.'
}

function categoryIcon(key: string): string {
  return CATEGORY_ICONS[key] ?? 'i-lucide-bell'
}

function syncForm(data: ArchivalFileAlertCatalog) {
  catalog.value = data
  formGlobal.value = {
    enabled: data.global.enabled,
    email_enabled: data.global.email_enabled,
    notify_creator: data.global.notify_creator,
    notify_unit_manager: data.global.notify_unit_manager,
    retention_upcoming_days: data.global.retention_upcoming_days,
    stale_draft_days: data.global.stale_draft_days,
    consolidation_reminder_days: data.global.consolidation_reminder_days,
  }
  formTypes.value = data.types.map(type => ({ ...type }))
}

async function load() {
  loading.value = true

  try {
    syncForm(await archivalApi.fetchAlertsCatalog())
  }
  catch {
    toast.error('No se pudo cargar la configuración de alertas.')
  }
  finally {
    loading.value = false
  }
}

async function save() {
  if (!canEdit.value) {
    return
  }

  saving.value = true

  try {
    const res = await archivalApi.updateAlertsSettings({
      global: { ...formGlobal.value },
      types: formTypes.value.map(type => ({
        type_key: type.key,
        label: type.label,
        severity: type.severity,
        trigger_description: type.trigger_description,
        resolution_hint: type.resolution_hint,
        threshold_days: type.threshold_days,
        is_enabled: type.is_enabled,
      })),
    })
    syncForm(res.data)
    toast.success(res.message)
  }
  catch {
    toast.error('No se pudo guardar la configuración.')
  }
  finally {
    saving.value = false
  }
}

onMounted(() => load())
</script>

<template>
  <div class="space-y-6 pb-24">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="max-w-3xl space-y-2">
        <h1 class="text-2xl font-semibold tracking-tight">
          Configuración de alertas
        </h1>
        <p class="text-sm text-muted-foreground leading-relaxed">
          Defina umbrales globales y active cada tipo de alerta. El sistema evalúa los expedientes
          cada hora y también al cambiar un expediente. Use la pestaña
          <strong class="font-medium text-foreground">General</strong> para el motor y los días;
          luego ajuste los tipos por categoría.
        </p>
      </div>

      <div class="flex flex-wrap gap-2">
        <Button variant="outline" @click="router.push('/expedientes/reportes')">
          <Icon name="i-lucide-bar-chart-3" class="mr-2 size-4" />
          Ver alertas abiertas
        </Button>
        <Button variant="outline" :disabled="loading" @click="load">
          <Icon name="i-lucide-refresh-cw" class="mr-2 size-4" />
          Actualizar
        </Button>
      </div>
    </div>

    <div v-if="loading" class="py-10 text-center text-muted-foreground">
      Cargando configuración…
    </div>

    <template v-else-if="catalog">
      <div class="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader class="pb-2">
            <CardDescription>Motor</CardDescription>
            <CardTitle class="text-lg">
              {{ formGlobal.enabled ? 'Habilitado' : 'Deshabilitado' }}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader class="pb-2">
            <CardDescription>Evaluación</CardDescription>
            <CardTitle class="text-lg">
              {{ catalog.global.schedule_label }}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader class="pb-2">
            <CardDescription>Tipos activos</CardDescription>
            <CardTitle class="text-lg">
              {{ activeTypesCount }} / {{ formTypes.length }}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader class="pb-2">
            <CardDescription>Correo</CardDescription>
            <CardTitle class="text-lg">
              {{ formGlobal.email_enabled ? 'Activado' : 'Desactivado' }}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Tabs v-model="activeTab" default-value="general">
        <TabsList class="flex h-auto w-full flex-wrap justify-start gap-1">
          <TabsTrigger value="general" class="gap-2">
            <Icon name="i-lucide-settings-2" class="size-4" />
            General
          </TabsTrigger>
          <TabsTrigger
            v-for="group in typesByCategory"
            :key="group.key"
            :value="group.key"
            class="gap-2"
          >
            <Icon :name="categoryIcon(group.key)" class="size-4" />
            {{ group.label }}
            <Badge variant="secondary" class="ml-1 h-5 px-1.5 text-[10px]">
              {{ group.types.filter(type => type.is_enabled).length }}/{{ group.types.length }}
            </Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" class="mt-4 space-y-4">
          <Card class="border-primary/20 bg-primary/5">
            <CardContent class="flex gap-3 pt-6 text-sm leading-relaxed">
              <Icon name="i-lucide-info" class="mt-0.5 size-4 shrink-0 text-primary" />
              <div class="space-y-2 text-muted-foreground">
                <p>
                  <strong class="text-foreground">1. General:</strong> encienda el motor, defina los días
                  compartidos y configure correo.
                </p>
                <p>
                  <strong class="text-foreground">2. Categorías:</strong> en cada pestaña active solo las alertas
                  que necesite y ajuste severidad o textos.
                </p>
                <p>
                  <strong class="text-foreground">3. Guardar:</strong> los cambios se aplican al pulsar
                  «Guardar cambios» (abajo o en la barra fija).
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Motor y umbrales globales</CardTitle>
              <CardDescription>
                Valores por defecto que usan varios tipos de alerta si no definen umbral propio.
              </CardDescription>
            </CardHeader>
            <CardContent class="grid gap-4 md:grid-cols-2">
              <div class="flex items-center justify-between gap-4 rounded-lg border p-4 md:col-span-2">
                <div>
                  <p class="font-medium">Alertas habilitadas</p>
                  <p class="text-sm text-muted-foreground">
                    Desactiva todo el motor de evaluación programada.
                  </p>
                </div>
                <Switch v-model="formGlobal.enabled" :disabled="!canEdit" />
              </div>

              <div class="space-y-2">
                <Label for="retention-upcoming-days">Anticipación retención (días)</Label>
                <Input
                  id="retention-upcoming-days"
                  v-model.number="formGlobal.retention_upcoming_days"
                  type="number"
                  min="1"
                  :disabled="!canEdit"
                />
                <p class="text-xs text-muted-foreground">
                  Avisos antes del fin de gestión, central o histórico.
                </p>
              </div>

              <div class="space-y-2">
                <Label for="stale-draft-days">Borrador estancado (días)</Label>
                <Input
                  id="stale-draft-days"
                  v-model.number="formGlobal.stale_draft_days"
                  type="number"
                  min="1"
                  :disabled="!canEdit"
                />
              </div>

              <div class="space-y-2 md:col-span-2">
                <Label for="consolidation-reminder-days">Recordatorio consolidación (días)</Label>
                <Input
                  id="consolidation-reminder-days"
                  v-model.number="formGlobal.consolidation_reminder_days"
                  type="number"
                  min="1"
                  class="max-w-xs"
                  :disabled="!canEdit"
                />
              </div>

              <div class="rounded-lg border bg-muted/30 p-4 md:col-span-2">
                <p class="text-sm font-medium">Proceso programado</p>
                <p class="mt-1 text-sm text-muted-foreground">
                  {{ catalog.global.schedule_label }} — comando
                  <code class="rounded bg-muted px-1 py-0.5 text-xs">{{ catalog.global.command }}</code>
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Notificaciones por correo</CardTitle>
              <CardDescription>
                Opcional. Las alertas siguen visibles en reportes y en cada expediente.
              </CardDescription>
            </CardHeader>
            <CardContent class="grid gap-4 md:grid-cols-2">
              <div class="flex items-center justify-between gap-4 rounded-lg border p-4 md:col-span-2">
                <div>
                  <p class="font-medium">Enviar correo</p>
                  <p class="text-sm text-muted-foreground">
                    Al generarse o actualizarse una alerta de expediente.
                  </p>
                </div>
                <Switch v-model="formGlobal.email_enabled" :disabled="!canEdit" />
              </div>

              <div class="flex items-center justify-between gap-4 rounded-lg border p-4">
                <div>
                  <p class="font-medium">Notificar al creador</p>
                  <p class="text-sm text-muted-foreground">Usuario que creó el expediente.</p>
                </div>
                <Switch
                  v-model="formGlobal.notify_creator"
                  :disabled="!canEdit || !formGlobal.email_enabled"
                />
              </div>

              <div class="flex items-center justify-between gap-4 rounded-lg border p-4">
                <div>
                  <p class="font-medium">Notificar al jefe de área</p>
                  <p class="text-sm text-muted-foreground">Jefe del área productora.</p>
                </div>
                <Switch
                  v-model="formGlobal.notify_unit_manager"
                  :disabled="!canEdit || !formGlobal.email_enabled"
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent
          v-for="group in typesByCategory"
          :key="group.key"
          :value="group.key"
          class="mt-4 space-y-4"
        >
          <Card>
            <CardHeader class="pb-3">
              <div class="flex items-start gap-3">
                <div class="flex size-9 shrink-0 items-center justify-center rounded-lg bg-muted">
                  <Icon :name="categoryIcon(group.key)" class="size-4 text-muted-foreground" />
                </div>
                <div>
                  <CardTitle class="text-lg">{{ group.label }}</CardTitle>
                  <CardDescription class="mt-1 leading-relaxed">
                    {{ categoryHelp(group.key) }}
                    Expanda cada alerta para editar severidad, umbral y textos.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ArchivalFileAlertTypeAccordion
                :types="group.types"
                :can-edit="canEdit"
                :parameters="catalog.parameters"
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <p v-if="!canEdit" class="text-sm text-muted-foreground">
        Solo lectura. Necesita el permiso de configuración de alertas para editar.
      </p>
    </template>

    <div
      v-if="canEdit && catalog"
      class="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 px-4 py-3 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <div class="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <p class="text-sm text-muted-foreground">
          Los cambios no se aplican hasta guardar.
        </p>
        <Button :disabled="saving || loading" @click="save">
          <Icon
            v-if="saving"
            name="i-lucide-loader-2"
            class="mr-2 size-4 animate-spin"
          />
          {{ saving ? 'Guardando…' : 'Guardar cambios' }}
        </Button>
      </div>
    </div>
  </div>
</template>
