<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { InstitutionalLibraryCategoryValue } from '~/types/institutional-library'

const props = defineProps<{
  open: boolean
  fileId: number
  documentId: number | null
  documentTitle: string
  defaultCategory?: InstitutionalLibraryCategoryValue | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  published: []
}>()

const libraryApi = useInstitutionalLibraryApi()

const loading = ref(false)
const categories = ref<Array<{ value: InstitutionalLibraryCategoryValue, label: string }>>([])

const form = ref({
  institutional_category: '' as InstitutionalLibraryCategoryValue | '',
  effective_from: new Date().toISOString().slice(0, 10),
  effective_to: '' as string,
  is_featured: false,
  featured_until: '' as string,
})

watch(() => props.open, async (isOpen) => {
  if (!isOpen) {
    return
  }

  if (props.documentId == null) {
    toast.error('No se identificó el documento a publicar.')
    emit('update:open', false)
    return
  }

  categories.value = await libraryApi.fetchCatalog()
  form.value.institutional_category = props.defaultCategory ?? categories.value[0]?.value ?? ''
  form.value.effective_from = new Date().toISOString().slice(0, 10)
  form.value.effective_to = ''
  form.value.is_featured = false
  form.value.featured_until = ''
}, { immediate: true })

async function submit() {
  if (props.documentId == null) {
    toast.error('No se identificó el documento a publicar.')
    return
  }

  if (!form.value.institutional_category) {
    toast.error('Seleccione una categoría.')
    return
  }

  if (form.value.is_featured && !form.value.featured_until.trim()) {
    toast.error('Indique hasta qué fecha debe mostrarse como destacado.')
    return
  }

  loading.value = true
  try {
    await libraryApi.publishDocument(props.documentId, {
      archival_file_id: props.fileId,
      institutional_category: form.value.institutional_category,
      effective_from: form.value.effective_from,
      effective_to: form.value.effective_to || null,
      is_featured: form.value.is_featured,
      featured_until: form.value.is_featured ? form.value.featured_until : null,
    })
    toast.success('Documento publicado en la biblioteca institucional.')
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
    <DialogContent class="max-w-lg">
      <DialogHeader>
        <DialogTitle>Publicar en biblioteca institucional</DialogTitle>
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
            Clasificación en la biblioteca institucional. Las opciones se administran en Parametrización → Biblioteca institucional.
          </p>
          <Select v-model="form.institutional_category">
            <SelectTrigger>
              <SelectValue placeholder="Seleccione categoría" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem
                v-for="category in categories"
                :key="category.value"
                :value="category.value"
              >
                {{ category.label }}
              </SelectItem>
            </SelectContent>
          </Select>
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
              v-model="form.is_featured"
              bare
            />
            <div class="space-y-1">
              <Label for="library-featured" class="cursor-pointer">
                Destacar en biblioteca
              </Label>
              <p class="text-xs text-muted-foreground leading-relaxed">
                El documento aparecerá en el banner principal de la biblioteca institucional.
              </p>
            </div>
          </div>
          <div v-if="form.is_featured" class="space-y-2 sm:max-w-xs">
            <Label for="library-featured-until">Destacado hasta *</Label>
            <Input
              id="library-featured-until"
              v-model="form.featured_until"
              type="date"
              :min="form.effective_from"
            />
          </div>
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" type="button" @click="emit('update:open', false)">
          Cancelar
        </Button>
        <Button type="button" :disabled="loading" @click="submit">
          Publicar
        </Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>
</template>
