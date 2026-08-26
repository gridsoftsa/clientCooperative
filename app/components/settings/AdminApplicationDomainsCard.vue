<script setup lang="ts">
import {
  APPLICATION_DOMAIN_LABELS,
  type ApplicationDomain,
} from '~/constants/application-domains'

const props = withDefaults(defineProps<{
  domains: ApplicationDomain[]
  disabled?: boolean
}>(), {
  disabled: false,
})

const emit = defineEmits<{
  'update:domains': [ApplicationDomain[]]
}>()

function updateDomain(domain: ApplicationDomain, enabled: boolean): void {
  const current = props.domains
  const next = enabled
    ? (current.includes(domain) ? current : [...current, domain])
    : current.filter(item => item !== domain)

  emit('update:domains', next)
}

const creditosEnabled = computed({
  get: () => props.domains.includes('creditos'),
  set: (enabled: boolean) => updateDomain('creditos', enabled),
})

const gestionDocumentalEnabled = computed({
  get: () => props.domains.includes('gestion_documental'),
  set: (enabled: boolean) => updateDomain('gestion_documental', enabled),
})
</script>

<template>
  <Card>
    <CardHeader class="gap-2">
      <CardTitle class="leading-snug">
        Módulos administrables
      </CardTitle>
      <CardDescription class="leading-relaxed">
        Define qué tipos de roles puede asignar este administrador al crear o editar usuarios.
        Si activa ambos módulos, también podrá asignar el rol <strong>admin</strong> y <strong>user</strong>.
      </CardDescription>
    </CardHeader>
    <CardContent class="space-y-3">
      <div class="flex max-w-2xl items-start gap-3 rounded-lg border p-4">
        <Switch
          id="admin-domain-creditos"
          v-model="creditosEnabled"
          class="mt-0.5 shrink-0"
          :disabled="disabled"
        />
        <div class="min-w-0 space-y-1">
          <Label for="admin-domain-creditos" class="cursor-pointer text-sm font-medium leading-snug">
            {{ APPLICATION_DOMAIN_LABELS.creditos }}
          </Label>
          <p class="text-xs text-muted-foreground leading-relaxed">
            Roles operativos de radicación y crédito (asesor, analista, directores, etc.).
          </p>
        </div>
      </div>

      <div class="flex max-w-2xl items-start gap-3 rounded-lg border p-4">
        <Switch
          id="admin-domain-gestion-documental"
          v-model="gestionDocumentalEnabled"
          class="mt-0.5 shrink-0"
          :disabled="disabled"
        />
        <div class="min-w-0 space-y-1">
          <Label for="admin-domain-gestion-documental" class="cursor-pointer text-sm font-medium leading-snug">
            {{ APPLICATION_DOMAIN_LABELS.gestion_documental }}
          </Label>
          <p class="text-xs text-muted-foreground leading-relaxed">
            Roles de ventanilla, workflow, expedientes y comunicados (gestor documental, jefe de área, etc.).
          </p>
        </div>
      </div>
    </CardContent>
  </Card>
</template>
