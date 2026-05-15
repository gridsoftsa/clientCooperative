<script setup lang="ts">
definePageMeta({
  layout: 'default',
  middleware: 'permission',
  permissions: 'estructura_org_ver',
})

const router = useRouter()
const route = useRoute()
const staffId = computed(() => Number(route.params.id))

const initialTab = computed<'datos' | 'ubicacion'>(() =>
  route.query.tab === 'ubicacion' ? 'ubicacion' : 'datos',
)
</script>

<template>
  <SettingsLayout :wide="true">
    <div class="w-full flex flex-col gap-4">
      <div class="flex flex-wrap items-start justify-between gap-4">
        <div class="space-y-1">
          <h2 class="text-2xl font-bold tracking-tight">
            Ver funcionario
          </h2>
          <p class="text-muted-foreground leading-relaxed">
            Consulta en solo lectura de datos y ubicación vigente.
          </p>
        </div>
        <div class="flex flex-wrap items-center gap-2 shrink-0">
          <PermissionGate permission="estructura_org_editar">
            <Button variant="default" @click="router.push(`/settings/organizational-structure/staff/${staffId}/edit`)">
              <Icon name="i-lucide-pencil" class="mr-2 h-4 w-4" />
              Editar
            </Button>
          </PermissionGate>
          <Button variant="outline" @click="router.back()">
            <Icon name="i-lucide-arrow-left" class="mr-2 h-4 w-4" />
            Volver
          </Button>
        </div>
      </div>

      <OrgStaffMemberPanel
        :staff-id="staffId"
        :read-only="true"
        :initial-tab="initialTab"
      />
    </div>
  </SettingsLayout>
</template>
