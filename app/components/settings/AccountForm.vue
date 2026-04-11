<script setup lang="ts">
import { CalendarDate, DateFormatter, getLocalTimeZone, today } from '@internationalized/date'
import { toTypedSchema } from '@vee-validate/zod'
import { Check, ChevronsUpDown } from 'lucide-vue-next'
import { toDate } from 'reka-ui/date'
import { h, ref } from 'vue'
import { toast } from 'vue-sonner'
import * as z from 'zod'
import { cn } from '@/lib/utils'

const open = ref(false)
const dateValue = ref()
const placeholder = ref()

const languages = [
  { label: 'Inglés', value: 'en' },
  { label: 'Francés', value: 'fr' },
  { label: 'Alemán', value: 'de' },
  { label: 'Indonesio', value: 'id' },
  { label: 'Español', value: 'es' },
  { label: 'Portugués', value: 'pt' },
  { label: 'Ruso', value: 'ru' },
  { label: 'Japonés', value: 'ja' },
  { label: 'Coreano', value: 'ko' },
  { label: 'Chino', value: 'zh' },
] as const

const df = new DateFormatter('es', {
  dateStyle: 'long',
})

const accountFormSchema = toTypedSchema(z.object({
  name: z
    .string({
      required_error: 'Obligatorio.',
    })
    .min(2, {
      message: 'El nombre debe tener al menos 2 caracteres.',
    })
    .max(30, {
      message: 'El nombre no puede superar los 30 caracteres.',
    }),
  dob: z.string().datetime().optional().refine(date => date !== undefined, 'Selecciona una fecha válida.'),
  language: z.string().min(1, 'Selecciona un idioma.'),
}))

// https://github.com/logaretm/vee-validate/issues/3521
// https://github.com/logaretm/vee-validate/discussions/3571
async function onSubmit(values: any) {
  toast('Valores enviados:', {
    description: h('pre', { class: 'mt-2 w-[340px] rounded-md bg-slate-950 p-4' }, h('code', { class: 'text-white' }, JSON.stringify(values, null, 2))),
  })
}
</script>

<template>
  <div>
    <h3 class="text-lg font-medium">
      Cuenta
    </h3>
    <p class="text-sm text-muted-foreground">
      Actualiza los datos de tu cuenta. Define tu idioma preferido y zona horaria.
    </p>
  </div>
  <Separator />
  <Form v-slot="{ setFieldValue }" :validation-schema="accountFormSchema" class="space-y-8" @submit="onSubmit">
    <FormField v-slot="{ componentField }" name="name">
      <FormItem>
        <FormLabel>Nombre</FormLabel>
        <FormControl>
          <Input type="text" placeholder="Tu nombre" v-bind="componentField" />
        </FormControl>
        <FormDescription>
          Es el nombre que se mostrará en tu perfil y en los correos.
        </FormDescription>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ field, value }" name="dob">
      <FormItem class="flex flex-col">
        <FormLabel>Fecha de nacimiento</FormLabel>
        <Popover>
          <PopoverTrigger as-child>
            <FormControl>
              <Button
                variant="outline" :class="cn(
                  'w-[240px] justify-start text-left font-normal',
                  !value && 'text-muted-foreground',
                )"
              >
                <Icon name="i-radix-icons-calendar" class="mr-2 h-4 w-4 opacity-50" />
                <span>{{ value ? df.format(toDate(dateValue, getLocalTimeZone())) : 'Elige una fecha' }}</span>
              </Button>
            </FormControl>
          </PopoverTrigger>
          <PopoverContent class="p-0">
            <Calendar
              v-model:placeholder="placeholder"
              v-model="dateValue"
              calendar-label="Fecha de nacimiento"
              initial-focus
              :min-value="new CalendarDate(1900, 1, 1)"
              :max-value="today(getLocalTimeZone())"
              @update:model-value="(v: any) => {
                if (v) {
                  dateValue = v
                  setFieldValue('dob', toDate(v).toISOString())
                }
                else {
                  dateValue = undefined
                  setFieldValue('dob', undefined)
                }
              }"
            />
          </PopoverContent>
        </Popover>
        <FormDescription>
          Se usa para calcular tu edad.
        </FormDescription>
        <FormMessage />
      </FormItem>
      <input type="hidden" v-bind="field">
    </FormField>

    <FormField v-slot="{ value }" name="language">
      <FormItem class="flex flex-col">
        <FormLabel>Idioma</FormLabel>

        <Popover v-model:open="open">
          <PopoverTrigger as-child>
            <FormControl>
              <Button
                variant="outline" role="combobox" :aria-expanded="open" :class="cn(
                  'w-[200px] justify-between',
                  !value && 'text-muted-foreground',
                )"
              >
                {{ value ? languages.find(
                  (language) => language.value === value,
                )?.label : 'Seleccionar idioma…' }}

                <ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
              </Button>
            </FormControl>
          </PopoverTrigger>
          <PopoverContent class="w-[200px] p-0">
            <Command>
              <CommandInput placeholder="Buscar idioma…" />
              <CommandEmpty>No se encontró ningún idioma.</CommandEmpty>
              <CommandList>
                <CommandGroup>
                  <CommandItem
                    v-for="language in languages" :key="language.value" :value="language.label"
                    @select="() => {
                      setFieldValue('language', language.value)
                      open = false
                    }"
                  >
                    <Check
                      :class="cn(
                        'mr-2 h-4 w-4',
                        value === language.value ? 'opacity-100' : 'opacity-0',
                      )"
                    />
                    {{ language.label }}
                  </CommandItem>
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>

        <FormDescription>
          Idioma que se usará en el panel.
        </FormDescription>
        <FormMessage />
      </FormItem>
    </FormField>

    <div class="flex justify-start">
      <Button type="submit">
        Actualizar cuenta
      </Button>
    </div>
  </Form>
</template>
