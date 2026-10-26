<script setup lang="ts">
import { toast } from 'vue-sonner'
import { messageFromFetchError } from '~/utils/http-error-message'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'expedientes_enlace_credito_configurar',
})

type CreditLinkFileTypeOption = {
  id: number
  name: string
  type_key: string
}

const router = useRouter()
const archivalApi = useArchivalFileApi()
const { hasPermission } = usePermissions()

const loading = ref(true)
const saving = ref(false)
const enabled = ref(false)
const associateFileTypeId = ref<number | null>(null)
const creditFileTypeId = ref<number | null>(null)
const fileTypeOptions = ref<CreditLinkFileTypeOption[]>([])

const canEdit = computed(() => hasPermission('expedientes_enlace_credito_configurar'))

const selectOptions = computed(() => fileTypeOptions.value.map(type => ({
  value: type.id,
  label: `${type.name} (${type.type_key})`,
})))

async function load(): Promise<void> {
  loading.value = true
  try {
    const data = await archivalApi.fetchCreditLinkSettings()
    enabled.value = data.enabled
    associateFileTypeId.value = data.associate_archival_file_type_id
    creditFileTypeId.value = data.credit_archival_file_type_id
    fileTypeOptions.value = data.available_file_types ?? []
  }
  catch (error: unknown) {
    toast.error(messageFromFetchError(error, 'No se pudo cargar el enlace de crédito'))
  }
  finally {
    loading.value = false
  }
}

async function save(): Promise<void> {
  if (enabled.value && (associateFileTypeId.value == null || creditFileTypeId.value == null)) {
    toast.error('Para encender el enlace elija el tipo del titular y el de la solicitud.')
    return
  }

  saving.value = true
  try {
    const res = await archivalApi.updateCreditLinkSettings({
      enabled: enabled.value,
      associate_archival_file_type_id: associateFileTypeId.value,
      credit_archival_file_type_id: creditFileTypeId.value,
    })
    enabled.value = res.data.enabled
    associateFileTypeId.value = res.data.associate_archival_file_type_id
    creditFileTypeId.value = res.data.credit_archival_file_type_id
    fileTypeOptions.value = res.data.available_file_types ?? fileTypeOptions.value
    toast.success(res.message ?? 'Configuración guardada')
  }
  catch (error: unknown) {
    toast.error(messageFromFetchError(error, 'No se pudo guardar'))
  }
  finally {
    saving.value = false
  }
}

onMounted(() => {
  void load()
})
</script>

<template>
  <div class="mx-auto w-full max-w-[90rem] space-y-4 px-4 pb-6 md:px-6">
    <div class="flex flex-wrap items-start justify-between gap-4">
      <div class="space-y-1">
        <PageBackButton to="/expedientes">
          Expedientes
        </PageBackButton>
        <h1 class="text-2xl font-semibold tracking-tight">
          Enlace crédito y expedientes
        </h1>
        <p class="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          Elija qué tipos de expediente usa la radicación de crédito: carpeta del titular (padre, documentos maestros)
          y carpeta de cada solicitud (hija). El asesor solo enciende el interruptor de esa radicación.
        </p>
      </div>
    </div>

    <Card v-if="loading">
      <CardContent class="py-10 text-sm text-muted-foreground">
        Cargando…
      </CardContent>
    </Card>

    <template v-else>
      <Card>
        <CardHeader>
          <CardTitle class="text-base">
            Interruptor
          </CardTitle>
          <CardDescription>
            Apagado: el crédito no crea expedientes. Encendido: cada radicación genera el expediente de forma automática.
          </CardDescription>
        </CardHeader>
        <CardContent class="space-y-4">
          <div class="flex items-center justify-between gap-4 rounded-lg border p-4">
            <div>
              <p class="font-medium">
                Permitir enlazar radicación con gestión documental
              </p>
              <p class="text-sm text-muted-foreground">
                El asesor no ve este interruptor. El área documental sale del cargo del asesor (o del tipo de expediente si no tiene área).
              </p>
            </div>
            <Switch v-model="enabled" :disabled="!canEdit || saving" />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-base">
            Tipos de expediente
          </CardTitle>
          <CardDescription>
            Cree los tipos en
            <NuxtLink class="underline" to="/expedientes/tipos">
              Tipos de expediente
            </NuxtLink>
            (modelo entidad/caso, área y TRD) y selecciónelos aquí. No hace falta que la clave técnica sea associate_file o credit_file.
          </CardDescription>
        </CardHeader>
        <CardContent class="grid gap-4 md:grid-cols-2">
          <div class="space-y-1.5">
            <Label for="associate_file_type">Expediente del titular *</Label>
            <ArchivalSingleMultiselect
              id="associate_file_type"
              v-model="associateFileTypeId"
              coerce-number
              :options="selectOptions"
              :disabled="!canEdit || saving"
              placeholder="Buscar tipo del titular…"
              no-options-text="No hay tipos de entidad/caso activos"
              no-results-text="Sin coincidencias"
            />
            <p class="text-xs text-muted-foreground">
              Carpeta por cédula. Ahí viven los documentos maestros.
            </p>
          </div>
          <div class="space-y-1.5">
            <Label for="credit_file_type">Expediente de la solicitud *</Label>
            <ArchivalSingleMultiselect
              id="credit_file_type"
              v-model="creditFileTypeId"
              coerce-number
              :options="selectOptions"
              :disabled="!canEdit || saving"
              placeholder="Buscar tipo de la solicitud…"
              no-options-text="No hay tipos de entidad/caso activos"
              no-results-text="Sin coincidencias"
            />
            <p class="text-xs text-muted-foreground">
              Una carpeta por radicación, colgada del titular.
            </p>
          </div>
          <div class="flex justify-end md:col-span-2">
            <Button :disabled="!canEdit || saving" @click="save">
              <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
              Guardar enlace
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle class="text-base">
            Cómo usarlo
          </CardTitle>
        </CardHeader>
        <CardContent class="space-y-3 text-sm leading-relaxed">
          <ol class="list-decimal space-y-2 pl-5 text-muted-foreground">
            <li>
              Configure área y TRD en cada tipo elegido.
            </li>
            <li>
              Encienda el interruptor, elija los dos tipos y pulse
              <strong class="text-foreground">Guardar enlace</strong>.
            </li>
            <li>
              En
              <NuxtLink class="underline" to="/radicacion/nueva">
                Nueva radicación
              </NuxtLink>
              el asesor solo llena el crédito. El expediente se crea al enviar al director, en el área de su cargo.
            </li>
            <li>
              Al enviar al director se crea la carpeta de la solicitud bajo la del titular (misma cédula).
            </li>
          </ol>
        </CardContent>
      </Card>
    </template>
  </div>
</template>
