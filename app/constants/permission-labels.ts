/**
 * Formatea un nombre de permiso para mostrar en la UI.
 * Orden lectura español: acción + categoría (ej: Ver Plantillas, Crear Usuarios).
 * Palabras separadas por espacio, primera letra en mayúscula.
 */
export function formatPermissionDisplayName(name: string): string {
  return getPermissionLabel(name)
}

/** Mapeo de categoría de permiso (primera parte del nombre) a etiqueta en español */
export const PERMISSION_CATEGORY_LABELS: Record<string, string> = {
  usuarios: 'Usuarios',
  roles: 'Roles',
  permisos: 'Permisos',
  dashboard: 'Dashboard',
  admin: 'Administrador',
  sucursales: 'Sucursales',
  empresa: 'Empresa',
  plantillas: 'Plantillas',
  solicitantes: 'Solicitantes (Deudores/Codeudores)',
  radicacion: 'Radicación (Solicitudes de crédito)',
}

/** Acciones traducidas (primera letra mayúscula) */
const ACTION_LABELS: Record<string, string> = {
  ver: 'Ver',
  crear: 'Crear',
  editar: 'Editar',
  eliminar: 'Eliminar',
  acceso: 'Acceso',
}

/** Capitaliza primera letra de cada palabra */
function capitalizeWords(str: string): string {
  return str
    .split(/[\s_]+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

/**
 * Obtener etiqueta legible para un nombre de permiso.
 * Orden español latinoamericano: acción + categoría.
 * Ej: plantillas_ver → "Ver Configuración de plantillas"
 * Ej: usuarios_crear → "Crear Usuarios"
 */
export function getPermissionLabel(name: string): string {
  const parts = name.split('_')
  const category = parts[0] ?? ''
  const action = parts[1] ?? ''

  const categoryLabel = PERMISSION_CATEGORY_LABELS[category] ?? capitalizeWords(category)
  const actionLabel = ACTION_LABELS[action] ?? capitalizeWords(action)
  return actionLabel ? `${actionLabel} ${categoryLabel}` : categoryLabel
}
