<script setup lang="ts">
import { toast } from 'vue-sonner'
import CatalogPrefixedCodeInput from '~/components/CatalogPrefixedCodeInput.vue'
import { catalogCodeSuffix } from '~/utils/archival-catalog-code'
import type { DocSeriesRow } from '~/types/archival-catalog'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'trd_catalogo_editar',
})

const route = useRoute()
const router = useRouter()
const { $api } = useNuxtApp()

const id = computed(() => Number(route.params.id))
const series = ref<DocSeriesRow | null>(null)
const form = ref({ code: '', name: '', description: '', is_active: true })
const loading = ref(true)
const saving = ref(false)

const orgUnitCodePrefix = computed(() => series.value?.org_unit?.code ?? '')

async function load() {
  loading.value = true
  try {
    const res = await $api<{ data: DocSeriesRow }>(`/archival/catalog/series/${id.value}`)
    series.value = res.data
    form.value = {
      code: res.data.code,
      name: res.data.name,
      description: res.data.description ?? '',
      is_active: res.data.is_active,
    }
  } catch {
    toast.error('Serie no encontrada')
    await router.push('/settings/archival/catalog/series')
  } finally {
    loading.value = false
  }
}

async function submit() {
  saving.value = true
  try {
    const code = catalogCodeSuffix(orgUnitCodePrefix.value, form.value.code)
    await $api(`/archival/catalog/series/${id.value}`, {
      method: 'PUT',
      body: {
        code,
        name: form.value.name.trim(),
        description: form.value.description.trim() || undefined,
        is_active: form.value.is_active,
      },
    })
    toast.success('Serie actualizada')
    const orgUnitId = series.value?.org_unit_id
    const listQuery = orgUnitId != null ? `?org_unit_id=${orgUnitId}` : ''
    await router.push(`/settings/archival/catalog/series${listQuery}`)
  } catch (e: any) {
    toast.error(e?.data?.message || 'No se pudo guardar')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4 max-w-xl">
      <div class="flex justify-between items-center">
        <div class="space-y-1">
          <h2 class="text-2xl font-bold tracking-tight">
            Editar serie
          </h2>
          <p v-if="series?.org_unit" class="text-sm text-muted-foreground">
            Área: {{ series.org_unit.name }} ({{ series.org_unit.code }})
          </p>
        </div>
        <Button
          variant="outline"
          @click="router.push(series?.org_unit_id ? `/settings/archival/catalog/series?org_unit_id=${series.org_unit_id}` : '/settings/archival/catalog/series')"
        >
          Volver
        </Button>
      </div>
      <Card v-if="!loading">
        <CardContent class="pt-6 space-y-4">
          <div class="space-y-2">
            <Label>Código *</Label>
            <CatalogPrefixedCodeInput
              v-model="form.code"
              :prefix="orgUnitCodePrefix"
              maxlength="64"
              placeholder="Sufijo (ej. 02)"
            />
            <p class="text-xs text-muted-foreground">
              Prefijo: código del área (<span class="font-mono">{{ orgUnitCodePrefix || '…' }}</span>).
              Ejemplo: área <span class="font-mono">045</span> + sufijo <span class="font-mono">02</span> → serie <span class="font-mono">045-02</span>.
            </p>
          </div>
          <div class="space-y-2">
            <Label>Nombre *</Label>
            <Input v-model="form.name" />
          </div>
          <div class="space-y-2">
            <Label>Descripción</Label>
            <Textarea v-model="form.description" rows="3" />
          </div>
          <div class="flex items-center gap-2">
            <Switch id="active" v-model="form.is_active" />
            <Label for="active" class="font-normal">{{ form.is_active ? 'Activa' : 'Inactiva' }}</Label>
          </div>
          <div class="flex justify-end gap-2">
            <Button variant="outline" @click="router.back()">
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
