/**
 * Etiquetas en español para nombres de rol (`roles.name` en BD).
 * Los valores técnicos (snake_case) se conservan para API y rutas.
 */
const ROLE_DISPLAY_LABELS: Record<string, string> = {
  super_admin: 'Super administrador',
  admin: 'Administrador',
  user: 'Usuario',
  asesor: 'Asesor',
  analista: 'Analista',
  director_agencia: 'Director de agencia',
  director_credito: 'Director de crédito',
  revision_documentos: 'Revisión de documentos',
}

export function getRoleDisplayLabel(name: string): string {
  const fixed = ROLE_DISPLAY_LABELS[name]
  if (fixed) {
    return fixed
  }
  return name
    .split('_')
    .filter(Boolean)
    .map(seg => seg.charAt(0).toUpperCase() + seg.slice(1).toLowerCase())
    .join(' ')
}

/** Badge «Sistema» en listados (roles internos con todos los permisos por convención). */
export function roleShowsSystemBadge(name: string): boolean {
  return name === 'admin' || name === 'super_admin'
}
