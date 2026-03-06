<script setup lang="ts">
import { toast } from 'vue-sonner'

const props = defineProps<{
  open: boolean
  templateKey: string | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  created: []
  cancel: []
}>()

const { $api, $csrf } = useNuxtApp()

const saving = ref(false)
const form = ref({
  name: '',
  code: '',
})

const templateLabel = computed(() => {
  if (props.templateKey === 'cultivo-permanente') return 'Cultivo Permanente'
  if (props.templateKey === 'cultivo-ciclo-corto') return 'Cultivo Ciclo Corto'
  if (props.templateKey === 'peces-tilapia') return 'Peces'
  return props.templateKey ?? ''
})

watch(() => form.value.name, (name) => {
  form.value.code = slugify(name)
})

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function resetForm() {
  form.value = { name: '', code: '' }
}

function handleCancel() {
  resetForm()
  emit('update:open', false)
  emit('cancel')
}

async function handleSubmit() {
  if (!props.templateKey || !form.value.name.trim()) {
    toast.error('Completa el nombre de la categoría')
    return
  }
  if (!form.value.code.trim()) {
    toast.error('El código es requerido')
    return
  }
  saving.value = true
  try {
    await $csrf()
    const res = await $api<{ data: unknown; message?: string }>('/template-categories', {
      method: 'POST',
      body: {
        template_key: props.templateKey,
        name: form.value.name.trim(),
        code: form.value.code.trim().toLowerCase().replace(/\s+/g, '-'),
      },
    })
    toast.success(res?.message ?? 'Categoría creada correctamente')
    resetForm()
    emit('update:open', false)
    emit('created')
  } catch (e: any) {
    const msg = e?.data?.message ?? e?.data?.errors?.code?.[0] ?? e?.data?.errors?.name?.[0] ?? 'Error al crear'
    toast.error(msg)
  } finally {
    saving.value = false
  }
}

watch(() => props.open, (open) => {
  if (!open) resetForm()
})
</script>

<template>
  <Dialog :open="props.open" @update:open="(v) => emit('update:open', v)">
    <DialogContent class="sm:max-w-md" @pointer-down-outside="handleCancel">
      <DialogHeader>
        <DialogTitle>
          Crear categoría
        </DialogTitle>
        <DialogDescription>
          Nueva categoría para {{ templateLabel }}. Podrás configurar los datos planos de esta categoría después de crearla.
        </DialogDescription>
      </DialogHeader>
      <form class="space-y-4" @submit.prevent="handleSubmit">
        <div class="space-y-2">
          <Label for="cat-name">Nombre</Label>
          <Input
            id="cat-name"
            v-model="form.name"
            placeholder="Ej: Maracuyá, Frijol..."
            required
          />
        </div>
        <div class="space-y-2">
          <Label for="cat-code">Código (para formularios)</Label>
          <Input
            id="cat-code"
            v-model="form.code"
            placeholder="Ej: maracuja, frijol"
            class="font-mono text-sm"
          />
          <p class="text-xs text-muted-foreground">
            Solo letras minúsculas, números y guiones. Se genera automáticamente del nombre.
          </p>
        </div>
        <div class="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" @click="handleCancel">
            Cancelar
          </Button>
          <Button type="submit" :disabled="saving">
            <Icon v-if="saving" name="i-lucide-loader-2" class="mr-2 h-4 w-4 animate-spin" />
            Crear categoría
          </Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>
</template>
