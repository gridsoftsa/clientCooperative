<script setup lang="ts">
import { toTypedSchema } from '@vee-validate/zod'
import { useForm } from 'vee-validate'
import { h } from 'vue'
import { toast } from 'vue-sonner'
import * as z from 'zod'

const notificationsFormSchema = toTypedSchema(z.object({
  type: z.enum(['all', 'mentions', 'none'], {
    required_error: 'Debes seleccionar un tipo de notificación.',
  }),
  mobile: z.boolean().default(false).optional(),
  communication_emails: z.boolean().default(false).optional(),
  social_emails: z.boolean().default(false).optional(),
  marketing_emails: z.boolean().default(false).optional(),
  security_emails: z.boolean(),
}))

const { handleSubmit } = useForm({
  validationSchema: notificationsFormSchema,
  initialValues: {
    communication_emails: false,
    marketing_emails: false,
    social_emails: true,
    security_emails: true,
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
      Notificaciones
    </h3>
    <p class="text-sm text-muted-foreground">
      Configura cómo recibes las notificaciones.
    </p>
  </div>
  <Separator />
  <form class="space-y-8" @submit="onSubmit">
    <FormField v-slot="{ componentField }" type="radio" name="type">
      <FormItem class="space-y-3">
        <FormLabel>Avísame sobre…</FormLabel>
        <FormControl>
          <RadioGroup
            class="flex flex-col space-y-1"
            v-bind="componentField"
          >
            <FormItem class="flex items-center space-x-3 space-y-0">
              <FormControl>
                <RadioGroupItem value="all" />
              </FormControl>
              <FormLabel class="font-normal">
                Todos los mensajes nuevos
              </FormLabel>
            </FormItem>
            <FormItem class="flex items-center space-x-3 space-y-0">
              <FormControl>
                <RadioGroupItem value="mentions" />
              </FormControl>
              <FormLabel class="font-normal">
                Mensajes directos y menciones
              </FormLabel>
            </FormItem>
            <FormItem class="flex items-center space-x-3 space-y-0">
              <FormControl>
                <RadioGroupItem value="none" />
              </FormControl>
              <FormLabel class="font-normal">
                Nada
              </FormLabel>
            </FormItem>
          </RadioGroup>
        </FormControl>
        <FormMessage />
      </FormItem>
    </FormField>

    <div>
      <h3 class="mb-4 text-lg font-medium">
        Notificaciones por correo
      </h3>
      <div class="space-y-4">
        <FormField v-slot="{ handleChange, value }" type="checkbox" name="communication_emails">
          <FormItem class="flex flex-row items-center justify-between border rounded-lg p-4">
            <div class="space-y-0.5">
              <FormLabel class="text-base">
                Correos de comunicación
              </FormLabel>
              <FormDescription>
                Recibe correos sobre la actividad de tu cuenta.
              </FormDescription>
            </div>
            <FormControl>
              <Switch
                :checked="value"
                @update:checked="handleChange"
              />
            </FormControl>
          </FormItem>
        </FormField>

        <FormField v-slot="{ handleChange, value }" type="checkbox" name="marketing_emails">
          <FormItem class="flex flex-row items-center justify-between border rounded-lg p-4">
            <div class="space-y-0.5">
              <FormLabel class="text-base">
                Correos de marketing
              </FormLabel>
              <FormDescription>
                Recibe correos sobre novedades, funciones y más.
              </FormDescription>
            </div>
            <FormControl>
              <Switch
                :checked="value"
                @update:checked="handleChange"
              />
            </FormControl>
          </FormItem>
        </FormField>

        <FormField v-slot="{ handleChange, value }" type="checkbox" name="social_emails">
          <FormItem class="flex flex-row items-center justify-between border rounded-lg p-4">
            <div class="space-y-0.5">
              <FormLabel class="text-base">
                Correos sociales
              </FormLabel>
              <FormDescription>
                Recibe correos por solicitudes de contacto, seguimientos y similares.
              </FormDescription>
            </div>
            <FormControl>
              <Switch
                :checked="value"
                @update:checked="handleChange"
              />
            </FormControl>
          </FormItem>
        </FormField>

        <FormField v-slot="{ handleChange, value }" type="checkbox" name="security_emails">
          <FormItem class="flex flex-row items-center justify-between border rounded-lg p-4">
            <div class="space-y-0.5">
              <FormLabel class="text-base">
                Correos de seguridad
              </FormLabel>
              <FormDescription>
                Recibe correos sobre actividad y seguridad de la cuenta.
              </FormDescription>
            </div>
            <FormControl>
              <Switch
                :checked="value"
                @update:checked="handleChange"
              />
            </FormControl>
          </FormItem>
        </FormField>
      </div>
    </div>

    <FormField v-slot="{ handleChange, value }" type="checkbox" name="mobile">
      <FormItem class="flex flex-row items-start space-x-3 space-y-0">
        <FormControl>
          <Checkbox
            :checked="value"
            @update:checked="handleChange"
          />
        </FormControl>
        <div class="leading-none space-y-1">
          <FormLabel>
            Usar ajustes distintos en dispositivos móviles
          </FormLabel>
          <FormDescription>
            Puedes gestionar las notificaciones móviles en la página de
            <a href="/examples/forms">
              ajustes móviles
            </a>.
          </FormDescription>
        </div>
      </FormItem>
    </FormField>

    <div class="flex justify-start">
      <Button type="submit">
        Actualizar notificaciones
      </Button>
    </div>
  </form>
</template>
