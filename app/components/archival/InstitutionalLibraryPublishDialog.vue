<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { InstitutionalLibraryCategoryValue, LibraryPublicationDraft } from '~/types/institutional-library'
import { preventArchivalMultiselectDialogDismiss } from '~/composables/useArchivalMultiselect'
import { coerceBoolean } from '~/utils/coerce-boolean'

const props = defineProps<{
  open: boolean
  fileId: number
  documentId: number | null
  documentTitle: string
  publication?: LibraryPublicationDraft | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  published: []
}>()

const libraryApi = useInstitutionalLibraryApi()

const loading = ref(false)
const categories = ref<Array<{ value: InstitutionalLibraryCategoryValue, label: string }>>([])
const featuredCheckboxKey = ref(0)
let publicationRequest = 0

const alreadyPublished = computed(() => props.publication?.alreadyPublished === true)

const form = ref({
  institutional_category: null as InstitutionalLibraryCategoryValue | null,
  effective_from: todayLocalIsoDate(),
  effective_to: '' as string,
  is_featured: false,
  featured_duration: 'indefinite' as 'indefinite' | 'until',
  featured_until: '' as string,
})

watch(() => [props.open, props.publication] as const, async ([isOpen]) => {
  if (!isOpen) {
    return
  }

  if (props.documentId == null) {
    toast.error('No se identificó el documento a publicar.')
    emit('update:open', false)
    return
  }

  const requestId = ++publicationRequest
  applyCurrentPublication()

  try {
    categories.value = await libraryApi.fetchCatalog()
  }
  catch {
    categories.value = []
    toast.error('No se pudieron cargar las categorías de biblioteca.')
  }

  if (requestId !== publicationRequest || !props.open) {
    return
  }

  applyCurrentPublication()
}, { immediate: true })

function isoDate(value: string | null | undefined): string {
  if (!value) {
    return ''
  }

  return value.slice(0, 10)
}

function applyCurrentPublication(): void {
  const draft = props.publication
  const featuredUntil = isoDate(draft?.featuredUntil)
  const isFeatured = coerceBoolean(draft?.featured)

  form.value.institutional_category = draft?.category ?? null
  form.value.effective_from = isoDate(draft?.effectiveFrom) || todayLocalIsoDate()
  form.value.effective_to = isoDate(draft?.effectiveTo)
  form.value.is_featured = isFeatured
  form.value.featured_duration = isFeatured && featuredUntil !== '' ? 'until' : 'indefinite'
  form.value.featured_until = isFeatured ? featuredUntil : ''
  featuredCheckboxKey.value += 1
}

function todayLocalIsoDate(): string {
  const now = new Date()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${now.getFullYear()}-${month}-${day}`
}

function onFeaturedChange(checked: boolean): void {
  if (!checked) {
    form.value.featured_duration = 'indefinite'
    form.value.featured_until = ''
    return
  }

  if (form.value.featured_duration !== 'until') {
    form.value.featured_duration = 'indefinite'
  }
}

async function submit() {
  if (props.documentId == null) {
    toast.error('No se identificó el documento a publicar.')
    return
  }

  if (!form.value.institutional_category) {
    toast.error('Seleccione una categoría de biblioteca institucional.')
    return
  }

  if (form.value.is_featured && form.value.featured_duration === 'until' && !form.value.featured_until.trim()) {
    toast.error('Indique hasta qué fecha debe mostrarse como destacado.')
    return
  }

  loading.value = true
  try {
    const featuredUntil = form.value.is_featured && form.value.featured_duration === 'until'
      ? form.value.featured_until
      : null

    await libraryApi.publishDocument(props.documentId, {
      archival_file_id: props.fileId,
      institutional_categories: [form.value.institutional_category],
      effective_from: form.value.effective_from,
      effective_to: form.value.effective_to || null,
      is_featured: form.value.is_featured,
      featured_until: featuredUntil,
    })
    toast.success(
      alreadyPublished.value
        ? 'Publicación en biblioteca actualizada.'
        : form.value.is_featured
          ? 'Documento publicado y destacado en la biblioteca institucional.'
          : 'Documento publicado en la biblioteca institucional.',
    )
    emit('update:open', false)
    emit('published')
  }
  catch (error: unknown) {
    const err = error as { data?: { message?: string, errors?: Record<string, string[]> } }
    const first = err?.data?.errors
      ? Object.values(err.data.errors)[0]?.[0]
      : null
    toast.error(first ?? err?.data?.message ?? 'No se pudo publicar el documento.')
  }
  finally {
    loading.value = false
  }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent
      class="max-w-lg"
      @pointer-down-outside="preventArchivalMultiselectDialogDismiss"
      @focus-outside="preventArchivalMultiselectDialogDismiss"
      @interact-outside="preventArchivalMultiselectDialogDismiss"
    >
      <DialogHeader>
        <DialogTitle>
          {{ alreadyPublished ? 'Editar publicación en biblioteca institucional' : 'Publicar en biblioteca institucional' }}
        </DialogTitle>
        <DialogDescription class="line-clamp-2">
          {{ documentTitle }}
        </DialogDescription>
      </DialogHeader>

      <div class="space-y-4">
        <div class="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
          Solo documentos de series TRD habilitadas para biblioteca institucional pueden publicarse.
          Configure la serie en Catálogo TRD → Series.
        </div>

        <div class="space-y-2">
          <Label>Categoría</Label>
          <p class="text-xs text-muted-foreground leading-relaxed">
            Elija una clasificación. Las opciones se administran en Parametrización → Biblioteca institucional.
          </p>
          <ArchivalLibraryCategorySelect
            v-model="form.institutional_category"
            :options="categories"
          />
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="space-y-2">
            <Label>Vigente desde</Label>
            <Input v-model="form.effective_from" type="date" />
          </div>
          <div class="space-y-2">
            <Label>Vigente hasta (opcional)</Label>
            <Input v-model="form.effective_to" type="date" />
          </div>
        </div>

        <div class="rounded-lg border bg-muted/20 p-4 space-y-3">
          <div class="flex items-start gap-3">
            <Checkbox
              id="library-featured"
              :key="featuredCheckboxKey"
              v-model="form.is_featured"
              @update:model-value="onFeaturedChange($event === true)"
            />
            <label for="library-featured" class="space-y-1">
              <span class="block text-sm font-medium leading-none">
                Destacar en biblioteca
              </span>
              <span class="block text-xs text-muted-foreground leading-relaxed">
                El documento aparecerá en el banner principal de la biblioteca institucional.
              </span>
            </label>
          </div>

          <fieldset v-if="form.is_featured" class="space-y-3 pl-8">
            <legend class="text-xs font-medium">
              Duración del destacado
            </legend>
            <label class="flex cursor-pointer items-start gap-2">
              <input
                v-model="form.featured_duration"
                type="radio"
                name="library-featured-duration"
                value="indefinite"
                class="mt-0.5 size-4 shrink-0 accent-primary"
              >
              <span class="text-sm leading-snug">
                <strong>Indefinido.</strong> Se mantiene destacado hasta que se quite la publicación o se edite.
              </span>
            </label>
            <label class="flex cursor-pointer items-start gap-2">
              <input
                v-model="form.featured_duration"
                type="radio"
                name="library-featured-duration"
                value="until"
                class="mt-0.5 size-4 shrink-0 accent-primary"
              >
              <span class="text-sm leading-snug">
                <strong>Hasta una fecha.</strong> Deja de destacarse al día siguiente de esa fecha.
              </span>
            </label>
            <div v-if="form.featured_duration === 'until'" class="space-y-2 sm:max-w-xs">
              <Label for="library-featured-until">Destacado hasta</Label>
              <Input
                id="library-featured-until"
                v-model="form.featured_until"
                type="date"
                :min="form.effective_from"
              />
            </div>
          </fieldset>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" type="button" @click="emit('update:open', false)">
          Cancelar
        </Button>
        <Button type="button" :disabled="loading" @click="submit">
          {{ alreadyPublished ? 'Guardar cambios' : 'Publicar' }}
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
