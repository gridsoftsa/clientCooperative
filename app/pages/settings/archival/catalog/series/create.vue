<script setup lang="ts">
import { toast } from 'vue-sonner'
import CatalogConfidentialityFields from '~/components/archival/CatalogConfidentialityFields.vue'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'trd_catalogo_editar',
})

interface OrgUnitOption {
  id: number
  name: string
  code: string
  is_document_producer?: boolean
}

const { $api } = useNuxtApp()
const router = useRouter()
const route = useRoute()
const catalogApi = useArchivalCatalogApi()

const units = ref<OrgUnitOption[]>([])
const loadingUnits = ref(false)

const form = ref({
  org_unit_id: null as number | null,
  code: '',
  name: '',
  description: '',
  is_active: true,
  publishable_to_institutional_library: false,
})

const saving = ref(false)
const confidentialityFields = ref<{
  validate: () => string | null
  toPayload: () => {
    inherited: boolean
    confidentiality_level?: import('~/types/archival-catalog').DocumentConfidentialityLevel
    grants?: import('~/types/archival-catalog').ClassificationAccessGrantRow[]
  }
} | null>(null)

const selectedUnit = computed(() =>
  units.value.find(u => u.id === form.value.org_unit_id) ?? null,
)

const queryOrgUnitId = computed(() => {
  const raw = Number(route.query.org_unit_id)
  return Number.isFinite(raw) && raw > 0 ? raw : null
})

const returnToPath = computed(() => catalogApi.returnToPath(route))

/** Área fijada por query (p. ej. al crear serie desde la TRD de un área). */
const isOrgUnitLocked = computed(() => queryOrgUnitId.value != null)

function cancelPath(): string {
  if (returnToPath.value) {
    return returnToPath.value
  }

  return form.value.org_unit_id != null
    ? `/settings/archival/catalog/series?org_unit_id=${form.value.org_unit_id}`
    : '/settings/archival/catalog/series'
}

async function fetchProducerUnits() {
  loadingUnits.value = true
  try {
    const res = await $api<{ data: OrgUnitOption[] }>('/organizational-structure/org-units', {
      query: { per_page: 200, is_active: true },
    })
    units.value = (res.data ?? []).filter(u => u.is_document_producer)
    const fromQuery = queryOrgUnitId.value
    if (fromQuery != null && units.value.some(u => u.id === fromQuery)) {
      form.value.org_unit_id = fromQuery
    }
  } catch {
    toast.error('No se pudieron cargar las áreas productoras')
    units.value = []
  } finally {
    loadingUnits.value = false
  }
}

async function submit() {
  if (form.value.org_unit_id == null) {
    toast.error('Seleccione el área productora del catálogo')
    return
  }
  if (!form.value.code.trim() || !form.value.name.trim()) {
    toast.error('Código y nombre son obligatorios')
    return
  }
  saving.value = true
  try {
    const created = await $api<{ data: { id: number } }>('/archival/catalog/series', {
      method: 'POST',
      body: {
        org_unit_id: form.value.org_unit_id,
        code: form.value.code.trim(),
        name: form.value.name.trim(),
        description: form.value.description.trim() || undefined,
        is_active: form.value.is_active,
        publishable_to_institutional_library: form.value.publishable_to_institutional_library,
      },
    })
    await catalogApi.persistClassification(confidentialityFields.value, 'series', created.data.id)
    toast.success('Serie creada')
    const listQuery = form.value.org_unit_id != null ? `?org_unit_id=${form.value.org_unit_id}` : ''
    await catalogApi.navigateAfterCatalogSave(
      router,
      route,
      `/settings/archival/catalog/series${listQuery}`,
    )
  } catch (e: any) {
    toast.error(e?.message && !e?.data ? e.message : (e?.data?.message || 'No se pudo crear la serie'))
  } finally {
    saving.value = false
  }
}

onMounted(fetchProducerUnits)
</script>

<template>
  <SettingsLayout :wide="true" hide-intro>
    <div class="flex w-full flex-col gap-6">
      <div class="space-y-1">
        <Button variant="ghost" size="sm" class="h-8 w-fit -ml-2 px-2" @click="router.push(cancelPath())">
          <Icon name="i-lucide-arrow-left" class="mr-1 h-4 w-4" />
          Volver a series
        </Button>
        <h2 class="text-2xl font-bold tracking-tight">
          Nueva serie documental
        </h2>
        <p class="text-muted-foreground text-sm leading-relaxed max-w-3xl">
          El código de serie es el de la TRD (p. ej. <span class="font-mono">005-16</span>).
          El área productora se elige aparte; la confidencialidad se configura más abajo y no cambia el código.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Datos de la serie</CardTitle>
          <CardDescription>
            Oficina productora, código institucional y alcance de publicación.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-6">
          <div class="grid items-start gap-6 lg:grid-cols-2">
          <div class="flex min-w-0 flex-col gap-2">
            <Label>Área productora *</Label>
            <template v-if="isOrgUnitLocked">
              <div
                v-if="selectedUnit"
                class="flex h-10 items-center rounded-md border bg-muted/30 px-3 text-sm"
              >
                <span class="font-medium">{{ selectedUnit.name }}</span>
                <span class="text-muted-foreground"> ({{ selectedUnit.code }})</span>
              </div>
              <p v-else-if="loadingUnits" class="flex h-10 items-center text-xs text-muted-foreground">
                Cargando área…
              </p>
              <p class="text-xs text-muted-foreground">
                <template v-if="returnToPath?.startsWith('/settings/archival/trd/')">
                  Área fija según la TRD que está configurando.
                </template>
                <template v-else>
                  Área definida desde el catálogo; no se puede cambiar en esta pantalla.
                </template>
              </p>
            </template>
            <Select v-else v-model="form.org_unit_id" :disabled="loadingUnits">
              <SelectTrigger>
                <SelectValue placeholder="Seleccione área…" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem v-for="u in units" :key="u.id" :value="u.id">
                  {{ u.name }} ({{ u.code }})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="flex min-w-0 flex-col gap-2">
            <Label for="code">Código *</Label>
            <Input
              id="code"
              v-model="form.code"
              maxlength="64"
              placeholder="005-16"
              class="font-mono"
              :disabled="!form.org_unit_id"
            />
            <p class="text-xs text-muted-foreground">
              Escriba el código de serie de la TRD. No se antepone el código interno del área.
            </p>
          </div>
          <div class="flex min-w-0 flex-col gap-2">
            <Label for="name">Nombre *</Label>
            <Input id="name" v-model="form.name" />
          </div>
          <div class="flex min-w-0 flex-col gap-2 lg:col-span-2">
            <Label for="desc">Descripción</Label>
            <Textarea id="desc" v-model="form.description" rows="3" />
          </div>
          <div class="flex items-center gap-2">
            <Switch id="active" v-model="form.is_active" />
            <Label for="active" class="font-normal">{{ form.is_active ? 'Activa' : 'Inactiva' }}</Label>
          </div>
          <div class="rounded-md border bg-muted/20 p-3">
            <div class="flex items-start gap-2">
              <Checkbox
                id="publishable_library"
                v-model="form.publishable_to_institutional_library"
                bare
                class="mt-0.5"
              />
              <div class="space-y-1">
                <Label for="publishable_library" class="font-normal leading-snug cursor-pointer">
                  Publicable en biblioteca institucional
                </Label>
                <p class="text-xs text-muted-foreground">
                  Habilita la publicación en biblioteca de los documentos de esta serie.
                </p>
              </div>
            </div>
          </div>
          </div>
          <CatalogConfidentialityFields
            ref="confidentialityFields"
            subject-type="series"
          />
          <div class="flex gap-2 justify-end">
            <Button type="button" variant="outline" @click="router.push(cancelPath())">
              Cancelar
            </Button>
            <Button :disabled="saving" @click="submit">
              Guardar
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  </SettingsLayout>
</template>
