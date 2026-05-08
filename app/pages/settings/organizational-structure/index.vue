<script setup lang="ts">
import { toast } from 'vue-sonner'
import type { OrgStructureValidation } from '~/types/org-structure'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'estructura_org_ver',
})

const { $api } = useNuxtApp()
const { hasPermission } = usePermissions()

const validation = ref<OrgStructureValidation | null>(null)
const loadingValidation = ref(false)
const publishing = ref(false)

async function fetchValidation() {
  loadingValidation.value = true
  try {
    const res = await $api<{ data: OrgStructureValidation }>('/organizational-structure/meta/validate')
    validation.value = res.data
  } catch {
    toast.error('No se pudo cargar la validación de consistencia')
    validation.value = null
  } finally {
    loadingValidation.value = false
  }
}

async function publishStructure() {
  if (!hasPermission('estructura_org_editar'))
    return
  publishing.value = true
  try {
    await $api('/organizational-structure/meta/publish', { method: 'POST' })
    toast.success('Estructura publicada correctamente')
    await fetchValidation()
  } catch (e: any) {
    toast.error(e?.data?.message || 'No se pudo publicar; revise inconsistencias críticas.')
  } finally {
    publishing.value = false
  }
}

onMounted(() => {
  fetchValidation()
})
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
      <div class="space-y-1">
        <h2 class="text-2xl font-bold tracking-tight">
          Estructura organizacional
        </h2>
        <p class="text-muted-foreground leading-relaxed max-w-3xl">
          Use el menú lateral <strong>Organización → Estructura</strong> para navegar entre oficinas, áreas, cargos, funcionarios y vistas.
          El aislamiento por entidad usa la empresa principal como tenant.
        </p>
      </div>

      <Card>
        <CardHeader class="gap-2">
          <CardTitle class="text-base leading-snug">
            Consistencia y publicación
          </CardTitle>
          <CardDescription class="leading-relaxed">
            Validación automática antes de usar la estructura en flujos y documentos.
          </CardDescription>
        </CardHeader>
        <CardContent class="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            :disabled="loadingValidation"
            @click="fetchValidation"
          >
            <Icon
              :name="loadingValidation ? 'i-lucide-loader-2' : 'i-lucide-refresh-cw'"
              class="mr-2 h-4 w-4"
              :class="loadingValidation && 'animate-spin'"
            />
            Actualizar validación
          </Button>
          <PermissionGate permission="estructura_org_editar">
            <Button
              size="sm"
              :disabled="publishing || !validation?.ok"
              @click="publishStructure"
            >
              <Icon
                :name="publishing ? 'i-lucide-loader-2' : 'i-lucide-send'"
                class="mr-2 h-4 w-4"
                :class="publishing && 'animate-spin'"
              />
              Publicar estructura
            </Button>
          </PermissionGate>
          <span
            v-if="validation"
            class="text-sm"
            :class="validation.ok ? 'text-green-600 dark:text-green-400' : 'text-destructive'"
          >
            {{ validation.ok ? 'Sin errores críticos' : 'Hay inconsistencias críticas' }}
          </span>
        </CardContent>
        <CardContent v-if="validation && (validation.critical.length || validation.warnings.length)" class="space-y-2 border-t pt-6">
          <div v-if="validation.critical.length" class="rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <p class="font-medium text-destructive mb-1">
              Críticas
            </p>
            <ul class="list-disc pl-4 space-y-1 text-destructive/90">
              <li v-for="(c, i) in validation.critical" :key="`c-${i}`">
                {{ c.message }}
              </li>
            </ul>
          </div>
          <div v-if="validation.warnings.length" class="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 text-sm">
            <p class="font-medium text-amber-800 dark:text-amber-200 mb-1">
              Advertencias
            </p>
            <ul class="list-disc pl-4 space-y-1 text-muted-foreground">
              <li v-for="(w, i) in validation.warnings" :key="`w-${i}`">
                {{ w.message }}
              </li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  </SettingsLayout>
</template>
