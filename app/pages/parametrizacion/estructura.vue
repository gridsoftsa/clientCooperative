<script setup lang="ts">
import { sectorsForParametrizacionEstructura } from '~/constants/credits-financial-templates'

definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: ['plantillas_ver', 'estructura_org_ver'],
})

const sectors = sectorsForParametrizacionEstructura()
</script>

<template>
  <ParametrizacionTemplateParametrizacionPlanoView
    :sectors="sectors"
    page-title="Estructura organizacional"
    page-description="Catálogos usados en ajustes de estructura. Edite los tipos de grupo o comité; los mismos valores se usan al crear o editar grupos en Configuración → Estructura → Grupos y comités."
    breadcrumb-label="Estructura"
    :show-categories-tab="false"
    :sister-link="{ to: '/settings/organizational-structure/work-groups', label: 'Grupos y comités' }"
    :config-edit-permissions="['estructura_org_editar']"
    back-to="/settings/organizational-structure/work-groups"
  />
</template>
