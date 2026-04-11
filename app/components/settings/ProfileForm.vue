<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { FieldArray, useForm } from 'vee-validate'
import { h, ref } from 'vue'
import { toast } from 'vue-sonner'
import * as z from 'zod'
import { cn } from '@/lib/utils'

const verifiedEmails = ref(['m@example.com', 'm@google.com', 'm@support.com'])

const profileFormSchema = toTypedSchema(z.object({
  username: z
    .string()
    .min(2, {
      message: 'El nombre de usuario debe tener al menos 2 caracteres.',
    })
    .max(30, {
      message: 'El nombre de usuario no puede superar los 30 caracteres.',
    }),
  email: z
    .string({
      required_error: 'Selecciona un correo para mostrar.',
    })
    .email(),
  bio: z.string().max(160, { message: 'La biografía no puede superar los 160 caracteres.' }).min(4, { message: 'La biografía debe tener al menos 4 caracteres.' }),
  urls: z
    .array(
      z.object({
        value: z.string().url({ message: 'Introduce una URL válida.' }),
      }),
    )
    .optional(),
}))

const { handleSubmit, resetForm } = useForm({
  validationSchema: profileFormSchema,
  initialValues: {
    bio: 'Trabajo con tecnología y cooperativas.',
    urls: [
      { value: 'https://shadcn.com' },
      { value: 'http://twitter.com/shadcn' },
    ],
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
      Perfil
    </h3>
    <p class="text-sm text-muted-foreground">
      Así te verán otras personas en el sitio.
    </p>
  </div>
  <Separator />
  <form class="space-y-8" @submit="onSubmit">
    <FormField v-slot="{ componentField }" name="username">
      <FormItem>
        <FormLabel>Nombre de usuario</FormLabel>
        <FormControl>
          <Input type="text" placeholder="usuario" v-bind="componentField" />
        </FormControl>
        <FormDescription>
          Es tu nombre público. Puede ser tu nombre real o un seudónimo. Solo puedes cambiarlo una vez cada 30 días.
        </FormDescription>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField }" name="email">
      <FormItem>
        <FormLabel>Correo electrónico</FormLabel>

        <Select v-bind="componentField">
          <FormControl>
            <SelectTrigger>
              <SelectValue placeholder="Selecciona un correo" />
            </SelectTrigger>
          </FormControl>
          <SelectContent>
            <SelectGroup>
              <SelectItem v-for="email in verifiedEmails" :key="email" :value="email">
                {{ email }}
              </SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        <FormDescription>
          Puedes gestionar los correos verificados en la configuración de correo.
        </FormDescription>
        <FormMessage />
      </FormItem>
    </FormField>

    <FormField v-slot="{ componentField }" name="bio">
      <FormItem>
        <FormLabel>Biografía</FormLabel>
        <FormControl>
          <Textarea placeholder="Cuéntanos un poco sobre ti" v-bind="componentField" />
        </FormControl>
        <FormDescription>
          Puedes usar <span>@menciones</span> para enlazar a otros usuarios u organizaciones.
        </FormDescription>
        <FormMessage />
      </FormItem>
    </FormField>

    <div>
      <FieldArray v-slot="{ fields, push, remove }" name="urls">
        <div v-for="(field, index) in fields" :key="`urls-${field.key}`">
          <FormField v-slot="{ componentField }" :name="`urls[${index}].value`">
            <FormItem>
              <FormLabel :class="cn(index !== 0 && 'sr-only')">
                Enlaces
              </FormLabel>
              <FormDescription :class="cn(index !== 0 && 'sr-only')">
                Añade enlaces a tu web, blog o redes sociales.
              </FormDescription>
              <div class="relative flex items-center">
                <FormControl>
                  <Input type="url" v-bind="componentField" />
                </FormControl>
                <button type="button" class="absolute end-0 py-2 pe-3 text-muted-foreground" @click="remove(index)">
                  <Icon name="i-radix-icons-cross-1" class="w-3" />
                </button>
              </div>
              <FormMessage />
            </FormItem>
          </FormField>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          class="mt-2 w-20 text-xs"
          @click="push({ value: '' })"
        >
          Añadir URL
        </Button>
      </FieldArray>
    </div>

    <div class="flex justify-start gap-2">
      <Button type="submit">
        Actualizar perfil
      </Button>

      <Button
        type="button"
        variant="outline"
        @click="resetForm"
      >
        Restablecer
      </Button>
    </div>
  </form>
</template>
