<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { h } from 'vue'
import { toast } from 'vue-sonner'
import * as z from 'zod'

const items = [
  {
    id: 'recents',
    label: 'Recientes',
  },
  {
    id: 'home',
    label: 'Inicio',
  },
  {
    id: 'applications',
    label: 'Aplicaciones',

  },
  {
    id: 'desktop',
    label: 'Escritorio',

  },
  {
    id: 'downloads',
    label: 'Descargas',

  },
  {
    id: 'documents',
    label: 'Documentos',

  },
] as const

const displayFormSchema = toTypedSchema(z.object({
  items: z.array(z.string()).refine(value => value.some(item => item), {
    message: 'Debes seleccionar al menos un elemento.',
  }),
}))

const { handleSubmit } = useForm({
  validationSchema: displayFormSchema,
  initialValues: {
    items: ['recents', 'home'],
  },
})

const onSubmit = handleSubmit((values) => {
  toast('Valores enviados:', {
    description: h('pre', { class: 'mt-2 w-[340px] rounded-md bg-slate-950 p-4' }, h('code', { class: 'text-white' }, JSON.stringify(values, null, 2))),
  })
})
</script>

<template>
  <div>
    <h3 class="text-lg font-medium">
      Pantalla
    </h3>
    <p class="text-sm text-muted-foreground">
      Activa o desactiva elementos para controlar qué se muestra en la aplicación.
    </p>
  </div>
  <Separator />
  <form @submit="onSubmit">
    <FormField name="items">
      <FormItem>
        <div class="mb-4">
          <FormLabel class="text-base">
            Barra lateral
          </FormLabel>
          <FormDescription>
            Elige los elementos que quieres ver en la barra lateral.
          </FormDescription>
        </div>

        <FormField v-for="item in items" v-slot="{ value, handleChange }" :key="item.id" name="items">
          <FormItem :key="item.id" class="flex flex-row items-start space-x-3 space-y-0">
            <FormControl>
              <Checkbox
                :checked="value.includes(item.id)"
                @update:checked="(checked: boolean) => {
                  if (Array.isArray(value)) {
                    handleChange(checked ? [...value, item.id] : value.filter(id => id !== item.id))
                  }
                }"
              />
            </FormControl>
            <FormLabel class="font-normal">
              {{ item.label }}
            </FormLabel>
          </FormItem>
        </FormField>
        <FormMessage />
      </FormItem>
    </FormField>

    <div class="mt-4 flex justify-start">
      <Button type="submit">
        Guardar pantalla
      </Button>
    </div>
  </form>
</template>
