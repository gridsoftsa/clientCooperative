<script setup lang="ts">
import { toast } from 'vue-sonner'
import type {
  ArchivalAccessGrant,
  ArchivalAccessGrantOptions,
  ArchivalAccessGrantableType,
  ArchivalAccessPermissionValue,
  StoreArchivalAccessGrantPayload,
} from '~/types/archival-access'

const props = defineProps<{
  grantId?: number | null
  initialGrant?: ArchivalAccessGrant | null
}>()

const emit = defineEmits<{
  saved: [grant: ArchivalAccessGrant]
  cancel: []
}>()

const archivalApi = useArchivalFileApi()

/** Sentinel: Reka SelectItem no admite value="" */
const SCOPE_NONE = '__none__'

const loadingOptions = ref(true)
const saving = ref(false)
const options = ref<ArchivalAccessGrantOptions | null>(null)

const form = ref({
  grantable_type: 'role' as ArchivalAccessGrantableType,
  grantable_id: '' as string,
  archival_file_type_id: SCOPE_NONE,
  doc_series_id: SCOPE_NONE,
  doc_subseries_id: SCOPE_NONE,
  doc_document_type_id: SCOPE_NONE,
  archival_file_id: '' as string,
  permission: 'view' as ArchivalAccessPermissionValue,
  status: 'active',
  starts_at: '',
  ends_at: '',
})

const isEdit = computed(() => props.grantId != null)

function isScoped(value: string): boolean {
  return value !== SCOPE_NONE && value !== ''
}

const filteredSubseries = computed(() => {
  if (!options.value) {
    return []
  }
  if (!isScoped(form.value.doc_series_id)) {
    return options.value.subseries
  }

  return options.value.subseries.filter(s => String(s.doc_series_id) === form.value.doc_series_id)
})

const filteredDocumentTypes = computed(() => {
  if (!options.value) {
    return []
  }
  if (!isScoped(form.value.doc_subseries_id)) {
    return options.value.document_types
  }

  return options.value.document_types.filter(d => String(d.doc_subseries_id) === form.value.doc_subseries_id)
})

function fillFromGrant(grant: ArchivalAccessGrant) {
  form.value = {
    grantable_type: grant.grantable_type,
    grantable_id: String(grant.grantable_id),
    archival_file_type_id: grant.archival_file_type_id ? String(grant.archival_file_type_id) : SCOPE_NONE,
    doc_series_id: grant.doc_series_id ? String(grant.doc_series_id) : SCOPE_NONE,
    doc_subseries_id: grant.doc_subseries_id ? String(grant.doc_subseries_id) : SCOPE_NONE,
    doc_document_type_id: grant.doc_document_type_id ? String(grant.doc_document_type_id) : SCOPE_NONE,
    archival_file_id: grant.archival_file_id ? String(grant.archival_file_id) : '',
    permission: grant.permission,
    status: grant.status,
    starts_at: grant.starts_at ? grant.starts_at.slice(0, 16) : '',
    ends_at: grant.ends_at ? grant.ends_at.slice(0, 16) : '',
  }
}

function toPayload(): StoreArchivalAccessGrantPayload {
  return {
    grantable_type: form.value.grantable_type,
    grantable_id: Number(form.value.grantable_id),
    archival_file_type_id: isScoped(form.value.archival_file_type_id) ? Number(form.value.archival_file_type_id) : null,
    doc_series_id: isScoped(form.value.doc_series_id) ? Number(form.value.doc_series_id) : null,
    doc_subseries_id: isScoped(form.value.doc_subseries_id) ? Number(form.value.doc_subseries_id) : null,
    doc_document_type_id: isScoped(form.value.doc_document_type_id) ? Number(form.value.doc_document_type_id) : null,
    archival_file_id: form.value.archival_file_id ? Number(form.value.archival_file_id) : null,
    permission: form.value.permission,
    status: form.value.status,
    starts_at: form.value.starts_at || null,
    ends_at: form.value.ends_at || null,
  }
}

async function loadOptions() {
  loadingOptions.value = true
  try {
    options.value = await archivalApi.fetchAccessGrantOptions()
    if (props.initialGrant) {
      fillFromGrant(props.initialGrant)
    }
  }
  catch {
    toast.error('No se pudieron cargar las opciones del formulario.')
  }
  finally {
    loadingOptions.value = false
  }
}

async function submit() {
  if (!form.value.grantable_id) {
    toast.error('Seleccione el destinatario.')
    return
  }
  if (
    !isScoped(form.value.archival_file_type_id)
    && !isScoped(form.value.doc_series_id)
    && !form.value.archival_file_id
  ) {
    toast.error('Indique al menos un alcance (tipo, serie o expediente).')
    return
  }

  saving.value = true
  try {
    const res = props.grantId
      ? await archivalApi.updateAccessGrant(props.grantId, toPayload())
      : await archivalApi.createAccessGrant(toPayload())

    toast.success(res.message || (props.grantId ? 'Permiso actualizado.' : 'Permiso creado.'))
    emit('saved', res.data)
  }
  catch {
    toast.error('No se pudo guardar el permiso.')
  }
  finally {
    saving.value = false
  }
}

watch(() => props.initialGrant, (grant) => {
  if (grant) {
    fillFromGrant(grant)
  }
})

onMounted(loadOptions)
</script>

<template>
  <div v-if="loadingOptions" class="py-10 text-center text-muted-foreground">
    Cargando formulario...
  </div>

  <div v-else class="space-y-6">
    <Card>
      <CardHeader>
        <CardTitle class="text-base">
          Destinatario y permiso
        </CardTitle>
        <CardDescription>
          Defina a quién se concede el acceso y qué acción podrá realizar.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div class="space-y-2">
            <Label>Tipo destinatario</Label>
            <Select v-model="form.grantable_type" @update:model-value="form.grantable_id = ''">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="role">
                  Rol
                </SelectItem>
                <SelectItem value="user">
                  Usuario
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label>Destinatario</Label>
            <Select v-model="form.grantable_id">
              <SelectTrigger>
                <SelectValue placeholder="Seleccione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="item in (form.grantable_type === 'role' ? options?.roles : options?.users) ?? []"
                  :key="item.id"
                  :value="String(item.id)"
                >
                  {{ item.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label>Permiso</Label>
            <Select v-model="form.permission">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="permission in options?.permissions ?? []"
                  :key="permission.value"
                  :value="permission.value"
                >
                  {{ permission.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div class="space-y-2">
            <Label>Estado</Label>
            <Select v-model="form.status">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem
                  v-for="status in options?.statuses ?? []"
                  :key="status.value"
                  :value="status.value"
                >
                  {{ status.label }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle class="text-base">
          Alcance documental
        </CardTitle>
        <CardDescription>
          Indique al menos un alcance: tipo de expediente, serie o expediente específico.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div class="space-y-2">
            <Label>Tipo de expediente</Label>
            <Select v-model="form.archival_file_type_id">
              <SelectTrigger>
                <SelectValue placeholder="Opcional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="SCOPE_NONE">
                  Sin restringir
                </SelectItem>
                <SelectItem
                  v-for="type in options?.file_types ?? []"
                  :key="type.id"
                  :value="String(type.id)"
                >
                  {{ type.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label>Serie</Label>
            <Select
              v-model="form.doc_series_id"
              @update:model-value="form.doc_subseries_id = SCOPE_NONE; form.doc_document_type_id = SCOPE_NONE"
            >
              <SelectTrigger>
                <SelectValue placeholder="Opcional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="SCOPE_NONE">
                  Sin restringir
                </SelectItem>
                <SelectItem
                  v-for="series in options?.series ?? []"
                  :key="series.id"
                  :value="String(series.id)"
                >
                  {{ series.code }} — {{ series.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label>Subserie</Label>
            <Select v-model="form.doc_subseries_id" @update:model-value="form.doc_document_type_id = SCOPE_NONE">
              <SelectTrigger>
                <SelectValue placeholder="Opcional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="SCOPE_NONE">
                  Sin restringir
                </SelectItem>
                <SelectItem
                  v-for="sub in filteredSubseries"
                  :key="sub.id"
                  :value="String(sub.id)"
                >
                  {{ sub.code }} — {{ sub.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2">
            <Label>Tipo documental</Label>
            <Select v-model="form.doc_document_type_id">
              <SelectTrigger>
                <SelectValue placeholder="Opcional" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem :value="SCOPE_NONE">
                  Sin restringir
                </SelectItem>
                <SelectItem
                  v-for="docType in filteredDocumentTypes"
                  :key="docType.id"
                  :value="String(docType.id)"
                >
                  {{ docType.code }} — {{ docType.name }}
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div class="space-y-2 sm:col-span-2 xl:col-span-1">
            <Label>ID expediente específico (opcional)</Label>
            <Input v-model="form.archival_file_id" type="number" min="1" placeholder="Ej. 4589" />
          </div>
        </div>
      </CardContent>
    </Card>

    <Card>
      <CardHeader>
        <CardTitle class="text-base">
          Vigencia
        </CardTitle>
        <CardDescription>
          Deje vacío para permiso sin límite temporal.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-2">
            <Label>Vigente desde</Label>
            <Input v-model="form.starts_at" type="datetime-local" />
          </div>
          <div class="space-y-2">
            <Label>Vigente hasta</Label>
            <Input v-model="form.ends_at" type="datetime-local" />
          </div>
        </div>
      </CardContent>
    </Card>

    <div class="flex flex-wrap justify-end gap-2">
      <Button variant="outline" type="button" @click="emit('cancel')">
        Cancelar
      </Button>
      <Button type="button" :disabled="saving" @click="submit">
        {{ saving ? 'Guardando…' : (isEdit ? 'Guardar cambios' : 'Crear permiso') }}
      </Button>
    </div>
  </div>
</template>
