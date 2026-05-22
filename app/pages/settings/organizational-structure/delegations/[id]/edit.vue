<script setup lang="ts">
import { toast } from 'vue-sonner'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: ['estructura_org_editar', 'suplencias_delegaciones_editar'],
})

const router = useRouter()
const route = useRoute()
const id = computed(() => Number(route.params.id))
const { $api } = useNuxtApp()

const loading = ref(true)
const form = ref({
  starts_on: '',
  ends_on: '',
  reason: '',
  is_active: true,
})

const saving = ref(false)

async function load() {
  loading.value = true
  try {
    const res = await $api<{ data: {
      starts_on: string
      ends_on: string
      reason?: string | null
      is_active: boolean
    } }>(`/organizational-structure/org-delegations/${id.value}`)
    const d = res.data
    form.value = {
      starts_on: String(d.starts_on).slice(0, 10),
      ends_on: String(d.ends_on).slice(0, 10),
      reason: d.reason ?? '',
      is_active: Boolean(d.is_active),
    }
  } catch {
    toast.error('No se encontró la delegación')
    router.push('/settings/organizational-structure/delegations')
  } finally {
    loading.value = false
  }
}

async function handleSubmit() {
  saving.value = true
  try {
    await $api(`/organizational-structure/org-delegations/${id.value}`, {
      method: 'PUT',
      body: {
        starts_on: form.value.starts_on,
        ends_on: form.value.ends_on,
        reason: form.value.reason.trim() || null,
        is_active: form.value.is_active,
      },
    })
    toast.success('Delegación actualizada')
    router.push('/settings/organizational-structure/delegations')
  } catch (e: any) {
    toast.error(e?.data?.message || 'Error al guardar')
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
    <div v-else class="w-full flex flex-col gap-4 max-w-xl">
      <div class="flex justify-between gap-4">
        <h2 class="text-2xl font-bold tracking-tight">
          Editar delegación
        </h2>
        <Button variant="outline" @click="router.push('/settings/organizational-structure/delegations')">
          Volver
        </Button>
      </div>
      <form class="grid gap-6" @submit.prevent="handleSubmit">
        <Card>
          <CardContent class="space-y-5 pt-6">
            <div class="grid grid-cols-2 gap-4">
              <div class="space-y-2">
                <Label for="ed1">Inicio *</Label>
                <Input id="ed1" v-model="form.starts_on" type="date" required />
              </div>
              <div class="space-y-2">
                <Label for="ed2">Fin *</Label>
                <Input id="ed2" v-model="form.ends_on" type="date" required />
              </div>
            </div>
            <div class="space-y-2">
              <Label for="ed3">Motivo</Label>
              <Textarea id="ed3" v-model="form.reason" rows="3" class="resize-y min-h-[4rem]" />
            </div>
            <OrgStructureActiveMultiselect
              :model-value="form.is_active"
              gender="feminine"
              input-id="del_act_ms"
              label="Delegación activa"
              @update:model-value="(v: boolean) => { form.is_active = v }"
            />
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
