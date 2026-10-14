<script setup lang="ts">
import {
  APPLICATION_DOMAIN_LABELS,
  type ProductModule,
} from '~/constants/application-domains'

const enabledModules = defineModel<ProductModule[]>({ required: true })

const props = withDefaults(defineProps<{
  allowedModules?: ProductModule[] | null
  locked?: boolean
}>(), {
  allowedModules: null,
  locked: false,
})

const moduleOptions: Array<{ key: ProductModule, description: string }> = [
  {
    key: 'creditos',
    description: 'Radicación, documentación, solicitantes, plantillas y reportes de crédito.',
  },
  {
    key: 'gestion_documental',
    description: 'Ventanilla única, workflow, expedientes, comunicados, TRD y estructura organizacional.',
  },
]

const visibleOptions = computed(() => {
  if (!props.allowedModules) {
    return moduleOptions
  }

  return moduleOptions.filter(option => props.allowedModules?.includes(option.key))
})

function isEnabled(module: ProductModule): boolean {
  return enabledModules.value.includes(module)
}

function setEnabled(module: ProductModule, enabled: boolean): void {
  if (props.locked) {
    return
  }

  const current = enabledModules.value
  enabledModules.value = enabled
    ? (current.includes(module) ? current : [...current, module])
    : current.filter(item => item !== module)
}
</script>

<template>
  <Card>
    <CardHeader class="gap-2">
      <CardTitle class="leading-snug">
        Módulos
      </CardTitle>
      <CardDescription class="leading-relaxed">
        Activa Créditos o Gestión documental para este rol. Los permisos se agrupan por módulo y solo aplican los del módulo encendido.
        Si apagas un módulo, sus permisos quedan guardados pero dejan de tener efecto hasta que lo actives de nuevo.
        Usuarios, roles, empresa y perfil siguen disponibles como permisos de sistema.
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-3">
      <div
        v-for="option in visibleOptions"
        :key="option.key"
        class="flex max-w-2xl items-start gap-3 rounded-lg border p-4"
      >
        <Switch
          :id="`role-module-${option.key}`"
          class="mt-0.5 shrink-0"
          :model-value="isEnabled(option.key)"
          :disabled="locked"
          @update:model-value="setEnabled(option.key, $event === true)"
        />
        <div class="min-w-0 space-y-1">
          <Label :for="`role-module-${option.key}`" class="cursor-pointer text-sm font-medium leading-snug">
            {{ APPLICATION_DOMAIN_LABELS[option.key] }}
          </Label>
          <p class="text-xs leading-relaxed text-muted-foreground">
            {{ option.description }}
          </p>
        </div>
      </div>
      <p v-if="locked" class="text-sm text-muted-foreground">
        El super administrador conserva ambos módulos activos.
      </p>
    </CardContent>
  </Card>
</template>
