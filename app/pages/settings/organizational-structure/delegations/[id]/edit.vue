<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { OrgDelegationDetail } from '~/types/org-structure'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: ['estructura_org_editar', 'suplencias_delegaciones_editar'],
})

const router = useRouter()
const route = useRoute()
const id = computed(() => Number(route.params.id))
const autoOpenReceipt = computed(() => route.query.receipt === '1')
const { $api } = useNuxtApp()
const orgApi = useOrgStructureApi()

const loading = ref(true)
const openingReceipt = ref(false)
const delegation = ref<OrgDelegationDetail | null>(null)
const form = ref({
  starts_on: '',
  ends_on: '',
  reason: '',
  is_active: true,
})

const saving = ref(false)

async function viewReceipt() {
  if (openingReceipt.value || !Number.isFinite(id.value) || id.value <= 0) {
    return
  }
  openingReceipt.value = true
  try {
    await orgApi.viewDelegationReceiptInNewTab(id.value)
  }
  catch (e: unknown) {
    const err = e as { message?: string }
    toast.error(err?.message || 'No se pudo abrir el comprobante PDF')
  }
  finally {
    openingReceipt.value = false
  }
}

async function load() {
  loading.value = true
  try {
    const res = await $api<{ data: OrgDelegationDetail }>(`/organizational-structure/org-delegations/${id.value}`)
    delegation.value = res.data
    form.value = {
      starts_on: String(res.data.starts_on).slice(0, 10),
      ends_on: String(res.data.ends_on).slice(0, 10),
      reason: res.data.reason ?? '',
      is_active: Boolean(res.data.is_active),
    }
  } catch {
    toast.error('No se encontró el Backup')
    router.push('/settings/organizational-structure/delegations')
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  saving.value = true
  try {
    const res = await $api<{ data: OrgDelegationDetail }>(`/organizational-structure/org-delegations/${id.value}`, {
      method: 'PUT',
      body: {
        starts_on: form.value.starts_on,
        ends_on: form.value.ends_on,
        reason: form.value.reason.trim() || null,
        is_active: form.value.is_active,
      },
    })
    delegation.value = res.data
    toast.success('Backup actualizado. Puede generar el comprobante actualizado.')
  } catch (e: unknown) {
    const err = e as { data?: { message?: string } }
    toast.error(err?.data?.message || 'Error al guardar')
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  load()
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div v-if="loading" class="flex justify-center py-12">
      <Icon name="i-lucide-loader-2" class="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
    <div v-else class="w-full flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1 max-w-3xl">
          <h2 class="text-2xl font-bold tracking-tight">
            Editar Backup
          </h2>
          <p class="text-sm text-muted-foreground leading-relaxed">
            Ajuste vigencia, motivo y estado. Los cambios se reflejan en el comprobante PDF al guardar.
          </p>
        </div>
        <div class="flex flex-wrap gap-2 shrink-0">
          <Button
            variant="outline"
            :disabled="openingReceipt"
            @click="viewReceipt"
          >
            <Icon
              :name="openingReceipt ? 'i-lucide-loader-2' : 'i-lucide-file-text'"
              class="mr-2 h-4 w-4"
              :class="openingReceipt ? 'animate-spin' : ''"
            />
            PDF
          </Button>
          <Button variant="outline" @click="router.push('/settings/organizational-structure/delegations')">
            <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
            Volver
          </Button>
        </div>
      </div>

      <OrgStructureDelegationReceiptPanel
        :delegation-id="id"
        :delegation="delegation"
        :auto-open="autoOpenReceipt"
      />

      <form class="w-full space-y-6" @submit.prevent="handleSubmit">
        <Card>
          <CardHeader class="gap-2">
            <CardTitle class="leading-snug">
              Vigencia y estado
            </CardTitle>
            <CardDescription class="leading-relaxed">
              Fechas de vigencia, motivo y si el Backup permanece activo.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div class="grid grid-cols-1 gap-5 md:grid-cols-2 md:gap-x-8">
              <div class="space-y-2">
                <Label for="ed1">Inicio *</Label>
                <Input id="ed1" v-model="form.starts_on" type="date" required class="max-w-xs" />
              </div>
              <div class="space-y-2">
                <Label for="ed2">Fin *</Label>
                <Input id="ed2" v-model="form.ends_on" type="date" required class="max-w-xs" />
              </div>
              <div class="space-y-2 md:col-span-2 md:max-w-2xl">
                <Label for="ed3">Motivo</Label>
                <Textarea id="ed3" v-model="form.reason" rows="3" class="resize-y min-h-[4rem]" />
              </div>
              <div class="md:col-span-2 md:max-w-md">
                <OrgStructureActiveMultiselect
                  :model-value="form.is_active"
                  gender="masculine"
                  input-id="del_act_ms"
                  helper-text="Indica si este Backup permanece vigente."
                  @update:model-value="(v: boolean) => { form.is_active = v }"
                />
              </div>
            </div>
          </CardContent>
        </Card>
        <div class="flex justify-end gap-3">
          <Button type="button" variant="outline" @click="router.back()">
            Cancelar
          </Button>
          <Button type="submit" :disabled="saving">
            Guardar
          </Button>
        </div>
      </form>
    </div>
  </SettingsLayout>
</template>
