<script setup lang="ts">
import { toast } from 'vue-sonner'
import CatalogPrefixedCodeInput from '~/components/CatalogPrefixedCodeInput.vue'
import { catalogCodeSuffix } from '~/utils/archival-catalog-code'

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

const units = ref<OrgUnitOption[]>([])
const loadingUnits = ref(false)

const form = ref({
  org_unit_id: null as number | null,
  code: '',
  name: '',
  description: '',
  is_active: true,
})

const saving = ref(false)

const selectedUnit = computed(() =>
  units.value.find(u => u.id === form.value.org_unit_id) ?? null,
)

const orgUnitCodePrefix = computed(() => selectedUnit.value?.code ?? '')

async function fetchProducerUnits() {
  loadingUnits.value = true
  try {
    const res = await $api<{ data: OrgUnitOption[] }>('/organizational-structure/org-units', {
      query: { per_page: 200, is_active: true },
    })
    units.value = (res.data ?? []).filter(u => u.is_document_producer)
    const fromQuery = Number(route.query.org_unit_id)
    if (Number.isFinite(fromQuery) && units.value.some(u => u.id === fromQuery)) {
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
    const code = catalogCodeSuffix(orgUnitCodePrefix.value, form.value.code)
    await $api('/archival/catalog/series', {
      method: 'POST',
      body: {
        org_unit_id: form.value.org_unit_id,
        code,
        name: form.value.name.trim(),
        description: form.value.description.trim() || undefined,
        is_active: form.value.is_active,
      },
    })
    toast.success('Serie creada')
    const returnTo = typeof route.query.return_to === 'string' ? route.query.return_to : ''
    if (returnTo.startsWith('/settings/archival/trd/')) {
      await router.push(returnTo)
      return
    }
    const listQuery = form.value.org_unit_id != null ? `?org_unit_id=${form.value.org_unit_id}` : ''
    await router.push(`/settings/archival/catalog/series${listQuery}`)
  } catch (e: any) {
    toast.error(e?.data?.message || 'No se pudo crear la serie')
  } finally {
    saving.value = false
  }
}

onMounted(fetchProducerUnits)
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <h2 class="text-2xl font-bold tracking-tight">
            Nueva serie documental
          </h2>
          <p class="text-muted-foreground text-sm leading-relaxed max-w-2xl">
            Cadena de códigos: área + serie + subserie + tipo.
            Ejemplo: área <span class="font-mono">045</span> → serie <span class="font-mono">045-02</span> → subserie <span class="font-mono">045-02-02</span> → tipo <span class="font-mono">045-02-02-01</span>.
          </p>
        </div>
        <Button variant="outline" class="shrink-0" @click="router.push('/settings/archival/catalog/series')">
          Volver
        </Button>
      </div>

      <Card>
        <CardContent class="pt-6 space-y-4 max-w-xl">
          <div class="space-y-2">
            <Label>Área productora *</Label>
            <Select v-model="form.org_unit_id" :disabled="loadingUnits">
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
          <div class="space-y-2">
            <Label for="code">Código *</Label>
            <p v-if="!form.org_unit_id" class="text-xs text-muted-foreground">
              Seleccione el área para habilitar el código.
            </p>
            <p v-else class="text-xs text-muted-foreground">
              Prefijo: código del área (<span class="font-mono">{{ orgUnitCodePrefix }}</span>). Digite solo el sufijo a la derecha.
            </p>
            <CatalogPrefixedCodeInput
              v-if="form.org_unit_id"
              id="code"
              v-model="form.code"
              :prefix="orgUnitCodePrefix"
              maxlength="64"
              placeholder="02"
            />
          </div>
          <div class="space-y-2">
            <Label for="name">Nombre *</Label>
            <Input id="name" v-model="form.name" />
          </div>
          <div class="space-y-2">
            <Label for="desc">Descripción</Label>
            <Textarea id="desc" v-model="form.description" rows="3" />
          </div>
          <div class="flex items-center gap-2">
            <Switch id="active" v-model="form.is_active" />
            <Label for="active" class="font-normal">{{ form.is_active ? 'Activa' : 'Inactiva' }}</Label>
          </div>
          <div class="flex gap-2 justify-end">
            <Button type="button" variant="outline" @click="router.back()">
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
