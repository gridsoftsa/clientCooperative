<script setup lang="ts">
import { cn } from '@/lib/utils'

type NavItem = { label: string; href: string; permission: string }

const sections: { heading: string; items: NavItem[] }[] = [
  {
    heading: 'Tu cuenta',
    items: [
      { label: 'Datos personales', href: '/settings/profile', permission: 'perfil_ver' },
      { label: 'Contraseña', href: '/settings/account', permission: 'cuenta_ver' },
      { label: 'Apariencia', href: '/settings/appearance', permission: 'apariencia_ver' },
    ],
  },
  {
    heading: 'Administración',
    items: [
      { label: 'Empresa principal', href: '/settings/company', permission: 'empresa_ver' },
      { label: 'Usuarios', href: '/settings/users', permission: 'usuarios_ver' },
      { label: 'Sucursales', href: '/settings/sucursales', permission: 'sucursales_ver' },
      { label: 'Roles', href: '/settings/roles', permission: 'roles_ver' },
      { label: 'Auditoría', href: '/settings/audit', permission: 'auditoria_ver' },
    ],
  },
  {
    heading: 'Estructura',
    items: [
      { label: 'Resumen', href: '/settings/organizational-structure', permission: 'estructura_org_ver' },
      { label: 'Oficinas y agencias', href: '/settings/organizational-structure/offices', permission: 'estructura_org_ver' },
      { label: 'Áreas y dependencias', href: '/settings/organizational-structure/units', permission: 'estructura_org_ver' },
      { label: 'Cargos', href: '/settings/organizational-structure/positions', permission: 'estructura_org_ver' },
      { label: 'Funcionarios', href: '/settings/organizational-structure/staff', permission: 'estructura_org_ver' },
      { label: 'Directorio', href: '/settings/organizational-structure/directory', permission: 'estructura_org_ver' },
      { label: 'Organigrama', href: '/settings/organizational-structure/tree', permission: 'estructura_org_ver' },
    ],
  },
]

const route = useRoute()
const { hasPermission } = usePermissions()

const visibleSections = computed(() =>
  sections
    .map(section => ({
      ...section,
      items: section.items.filter(
        item => import.meta.server || hasPermission(item.permission),
      ),
    }))
    .filter(section => section.items.length > 0),
)

function isActive(href: string): boolean {
  return route.path === href || route.path.startsWith(`${href}/`)
}
</script>

<template>
  <nav class="flex flex-col gap-6 lg:space-y-0">
    <div
      v-for="(section, sIdx) in visibleSections"
      :key="section.heading"
      :class="cn(sIdx > 0 && 'border-t border-border pt-4 lg:pt-6')"
    >
      <p class="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {{ section.heading }}
      </p>
      <div class="flex space-x-2 lg:flex-col lg:space-x-0 lg:space-y-1">
        <Button
          v-for="item in section.items"
          :key="item.href"
          variant="ghost"
          :class="cn(
            'w-full items-start justify-start text-left',
            isActive(item.href) && 'bg-muted hover:bg-muted',
          )"
          as-child
        >
          <NuxtLink :to="item.href">
            {{ item.label }}
          </NuxtLink>
        </Button>
      </div>
    </div>
  </nav>
</template>
