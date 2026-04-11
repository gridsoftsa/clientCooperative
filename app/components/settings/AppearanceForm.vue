<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { h } from 'vue'
import { toast } from 'vue-sonner'
import * as z from 'zod'
import { cn } from '@/lib/utils'
import { buttonVariants } from '~/components/ui/button'

const appearanceFormSchema = toTypedSchema(z.object({
  theme: z.enum(['light', 'dark'], {
    required_error: 'Selecciona un tema.',
  }),
  font: z.enum(['inter', 'manrope', 'system'], {
    invalid_type_error: 'Selecciona una fuente',
    required_error: 'Selecciona una fuente.',
  }),
}))

const { handleSubmit } = useForm({
  validationSchema: appearanceFormSchema,
  initialValues: {
    theme: 'light',
    font: 'inter',
  },
})

const color = useColorMode()

const onSubmit = handleSubmit((values) => {
  toast('Valores enviados:', {
    description: h('pre', { class: 'mt-2 w-[340px] rounded-md bg-slate-950 p-4' }, h('code', { class: 'text-white' }, JSON.stringify(values, null, 2))),
  })
  if (values.theme === 'dark') {
    color.preference = 'dark'
  }
  else {
    color.preference = 'light'
  }
})
</script>

<template>
  <div>
    <h3 class="text-lg font-medium">
      Apariencia
    </h3>
    <p class="text-sm text-muted-foreground">
      Personaliza la apariencia de la aplicación. Cambia entre tema claro y oscuro.
    </p>
  </div>
  <Separator />
  <form class="space-y-8" @submit="onSubmit">
    <FormField v-slot="{ field }" name="font">
      <FormItem>
        <FormLabel>Fuente</FormLabel>
        <div class="relative w-[200px]">
          <FormControl>
            <select
              :class="cn(
                buttonVariants({ variant: 'outline' }),
                'w-[200px] appearance-none font-normal',
              )"
              v-bind="field"
            >
              <option value="inter">
                Inter
              </option>
              <option value="manrope">
                Manrope
              </option>
              <option value="system">
                Sistema
              </option>
            </select>
          </FormControl>
          <Icon name="i-radix-icons-chevron-down" class="pointer-events-none absolute right-3 top-2.5 h-4 w-4 opacity-50" />
        </div>
        <FormDescription>
          Fuente que se usará en el panel.
        </FormDescription>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField }" type="radio" name="theme">
      <FormItem class="space-y-1">
        <FormLabel>Tema</FormLabel>
        <FormDescription>
          Elige el tema del panel.
        </FormDescription>
        <FormMessage />

        <RadioGroup
          class="grid grid-cols-2 max-w-md gap-8 pt-2"
          v-bind="componentField"
        >
          <FormItem>
            <FormLabel class="[&:has([data-state=checked])>div]:border-primary">
              <FormControl>
                <RadioGroupItem value="light" class="sr-only" />
              </FormControl>
              <div class="items-center border-2 border-muted rounded-md p-1 hover:border-accent">
                <div class="rounded-sm bg-[#ecedef] p-2 space-y-2">
                  <div class="rounded-md bg-white p-2 shadow-sm space-y-2">
                    <div class="h-2 w-20 rounded-lg bg-[#ecedef]" />
                    <div class="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                  </div>
                  <div class="flex items-center rounded-md bg-white p-2 shadow-sm space-x-2">
                    <div class="h-4 w-4 rounded-full bg-[#ecedef]" />
                    <div class="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                  </div>
                  <div class="flex items-center rounded-md bg-white p-2 shadow-sm space-x-2">
                    <div class="h-4 w-4 rounded-full bg-[#ecedef]" />
                    <div class="h-2 w-[100px] rounded-lg bg-[#ecedef]" />
                  </div>
                </div>
              </div>
              <span class="block w-full p-2 text-center font-normal">
                Claro
              </span>
            </FormLabel>
          </FormItem>
          <FormItem>
            <FormLabel class="[&:has([data-state=checked])>div]:border-primary">
              <FormControl>
                <RadioGroupItem value="dark" class="sr-only" />
              </FormControl>
              <div class="items-center border-2 border-muted rounded-md bg-popover p-1 hover:bg-accent hover:text-accent-foreground">
                <div class="rounded-sm bg-slate-950 p-2 space-y-2">
                  <div class="rounded-md bg-slate-800 p-2 shadow-sm space-y-2">
                    <div class="h-2 w-20 rounded-lg bg-slate-400" />
                    <div class="h-2 w-[100px] rounded-lg bg-slate-400" />
                  </div>
                  <div class="flex items-center rounded-md bg-slate-800 p-2 shadow-sm space-x-2">
                    <div class="h-4 w-4 rounded-full bg-slate-400" />
                    <div class="h-2 w-[100px] rounded-lg bg-slate-400" />
                  </div>
                  <div class="flex items-center rounded-md bg-slate-800 p-2 shadow-sm space-x-2">
                    <div class="h-4 w-4 rounded-full bg-slate-400" />
                    <div class="h-2 w-[100px] rounded-lg bg-slate-400" />
                  </div>
                </div>
              </div>
              <span class="block w-full p-2 text-center font-normal">
                Oscuro
              </span>
            </FormLabel>
          </FormItem>
        </RadioGroup>
      </FormItem>
    </FormField>

    <div class="flex justify-start">
      <Button type="submit">
        Guardar preferencias
      </Button>
    </div>
  </form>
</template>
