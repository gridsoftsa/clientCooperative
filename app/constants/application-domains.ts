/**
 * Dominios de aplicación para agrupar permisos y roles en la UI de configuración.
 * No reemplaza permisos Spatie; solo organiza la experiencia de administración.
 */
export type ApplicationDomain = 'creditos' | 'gestion_documental' | 'sistema'

export const APPLICATION_DOMAIN_LABELS: Record<ApplicationDomain, string> = {
  creditos: 'Créditos',
  gestion_documental: 'Gestión documental',
  sistema: 'Sistema y configuración',
}

export const APPLICATION_DOMAIN_DESCRIPTIONS: Record<ApplicationDomain, string> = {
  creditos: 'Radicación, solicitantes, plantillas y reportes de crédito.',
  gestion_documental: 'Ventanilla única, workflow, expedientes, comunicados, TRD y estructura organizacional.',
  sistema: 'Usuarios, roles, sucursales, empresa y ajustes generales de la plataforma.',
}

/** Orden de pestañas en crear/editar rol. */
export const APPLICATION_DOMAIN_ORDER: ApplicationDomain[] = [
  'creditos',
  'gestion_documental',
  'sistema',
]

/**
 * Categoría de permiso (primer segmento de `permission.name`) → dominio de aplicación.
 * Categorías no listadas se clasifican como `sistema`.
 */
export const PERMISSION_CATEGORY_APPLICATION_DOMAIN: Record<string, ApplicationDomain> = {
  radicacion: 'creditos',
  solicitantes: 'creditos',
  plantillas: 'creditos',
  plantilla: 'creditos',
  reportes: 'creditos',
  ventanilla: 'gestion_documental',
  workflow: 'gestion_documental',
  expedientes: 'gestion_documental',
  comunicados: 'gestion_documental',
  trd: 'gestion_documental',
  estructura: 'gestion_documental',
  grupos: 'gestion_documental',
  suplencias: 'gestion_documental',
  documentacion: 'creditos',
}

export type ProductModule = Exclude<ApplicationDomain, 'sistema'>

export function permissionDomainsForEnabledModules(
  enabledModules: ProductModule[],
  manageableDomains: ApplicationDomain[] | null,
): ApplicationDomain[] {
  const selected: ApplicationDomain[] = [...enabledModules, 'sistema']

  if (manageableDomains === null) {
    return selected
  }

  return selected.filter(domain => manageableDomains.includes(domain))
}

export function getPermissionApplicationDomain(categoryKey: string): ApplicationDomain {
  return PERMISSION_CATEGORY_APPLICATION_DOMAIN[categoryKey] ?? 'sistema'
}

/**
 * Dominio principal de roles predefinidos del sistema.
 * Roles personalizados sin entrada aquí se infieren por sus permisos al guardar (fase posterior).
 */
export const ROLE_APPLICATION_DOMAINS: Record<string, ApplicationDomain[]> = {
  super_admin: ['creditos', 'gestion_documental', 'sistema'],
  admin: ['creditos', 'gestion_documental', 'sistema'],
  user: ['sistema'],
  asesor: ['creditos'],
  analista: ['creditos'],
  director_agencia: ['creditos'],
  director_credito: ['creditos'],
  revision_documentos: ['creditos'],
  gestor_documental: ['gestion_documental'],
  jefe_area: ['gestion_documental'],
}

export function getRoleApplicationDomains(roleName: string): ApplicationDomain[] {
  return ROLE_APPLICATION_DOMAINS[roleName] ?? []
}

/** Dominios configurables al crear un usuario admin. */
export const ADMIN_ASSIGNABLE_APPLICATION_DOMAINS: Array<Exclude<ApplicationDomain, 'sistema'>> = [
  'creditos',
  'gestion_documental',
]

export function defaultAdminApplicationDomains(
  hasProductModule: (module: ProductModule) => boolean,
): ApplicationDomain[] {
  const domains: ApplicationDomain[] = []

  if (hasProductModule('creditos')) {
    domains.push('creditos')
  }

  if (hasProductModule('gestion_documental')) {
    domains.push('gestion_documental')
  }

  return domains.length > 0 ? domains : ['creditos']
}

export function manageableDomainsFromAuthUser(
  roles: string[] | undefined,
  adminApplicationDomains: string[] | undefined,
): ApplicationDomain[] | null {
  if (roles?.includes('super_admin')) {
    return null
  }

  if (!roles?.includes('admin')) {
    return []
  }

  if (!adminApplicationDomains?.length) {
    return ['creditos', 'gestion_documental', 'sistema']
  }

  const domains = [...adminApplicationDomains] as ApplicationDomain[]

  if (
    domains.includes('creditos')
    && domains.includes('gestion_documental')
    && !domains.includes('sistema')
  ) {
    domains.push('sistema')
  }

  return domains
}

export function canManageRoleByDomains(
  roleName: string,
  manageableDomains: ApplicationDomain[] | null,
): boolean {
  if (manageableDomains === null) {
    return true
  }

  if (roleName === 'super_admin') {
    return false
  }

  if (manageableDomains.length === 0) {
    return false
  }

  const roleDomains = getRoleApplicationDomains(roleName)

  if (roleDomains.includes('sistema') && !manageableDomains.includes('sistema')) {
    return false
  }

  if (roleDomains.length === 0) {
    return true
  }

  return roleDomains.some(domain => manageableDomains.includes(domain))
}

export function roleBelongsToApplicationDomain(
  roleName: string,
  domain: ApplicationDomain,
): boolean {
  const domains = getRoleApplicationDomains(roleName)

  if (domains.length === 0) {
    return true
  }

  return domains.includes(domain)
}

export type OrgStaffLinkRoleHint = {
  name: string
  enabled_modules?: Array<'creditos' | 'gestion_documental'>
  permissions?: string[]
}

function permissionNameImpliesGestionDocumental(permissionName: string): boolean {
  const category = permissionName.split('_')[0] ?? ''

  return getPermissionApplicationDomain(category) === 'gestion_documental'
}

function customRoleImpliesGestionDocumental(hint: OrgStaffLinkRoleHint | undefined): boolean {
  if (!hint) {
    return false
  }

  const permissions = hint.permissions ?? []
  if (permissions.some(permissionNameImpliesGestionDocumental)) {
    return true
  }

  const modules = hint.enabled_modules ?? []

  return modules.length === 1 && modules.includes('gestion_documental')
}

/**
 * Indica si la cuenta debe vincularse a un funcionario en estructura organizacional.
 * Crédito puro (asesor, analista, roles de crédito) y admin solo de créditos: opcional.
 * Gestión documental, workflow, ventanilla y admin con módulo documental: obligatorio.
 */
export function requiresOrgStaffLink(
  roleNames: string[],
  adminApplicationDomains?: ApplicationDomain[],
  roleHints: OrgStaffLinkRoleHint[] = [],
): boolean {
  const hintsByName = new Map(roleHints.map(hint => [hint.name, hint]))

  for (const roleName of roleNames) {
    if (roleName === 'super_admin' || roleName === 'user') {
      continue
    }

    if (roleName === 'admin') {
      const domains = adminApplicationDomains?.length
        ? adminApplicationDomains
        : (['creditos', 'gestion_documental'] as ApplicationDomain[])

      if (domains.includes('gestion_documental')) {
        return true
      }

      continue
    }

    const domains = getRoleApplicationDomains(roleName)

    if (domains.includes('gestion_documental')) {
      return true
    }

    if (domains.includes('creditos')) {
      continue
    }

    if (customRoleImpliesGestionDocumental(hintsByName.get(roleName))) {
      return true
    }
  }

  return false
}
