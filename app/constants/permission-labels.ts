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
  /** Prefijo `settings_*` — menú Configuración del sidebar y rutas /settings (ver seeder API). */
  settings: 'Menú Configuración (/settings)',
}

/**
 * Orden de bloques en la UI de roles (crear/editar). Categorías no listadas van al final, ordenadas A–Z.
 * Mantiene el bloque de configuración aparte y visible, no pegado al orden alfabético del API.
 */
export const PERMISSION_CATEGORY_ORDER: string[] = [
  'dashboard',
  'admin',
  'settings',
  'usuarios',
  'roles',
  'permisos',
  'sucursales',
  'empresa',
  'plantillas',
  'solicitantes',
  'radicacion',
]

export function sortPermissionCategoryKeys(categories: string[]): string[] {
  const order = PERMISSION_CATEGORY_ORDER
  return [...categories].sort((a, b) => {
    const ia = order.indexOf(a)
    const ib = order.indexOf(b)
    const aKnown = ia !== -1
    const bKnown = ib !== -1
    if (aKnown && bKnown) {
      return ia - ib
    }
    if (aKnown) {
      return -1
    }
    if (bKnown) {
      return 1
    }

    return a.localeCompare(b)
  })
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
/** Etiquetas fijas cuando el nombre en varias partes no basta (ej. enviar a análisis) */
const PERMISSION_LABEL_OVERRIDES: Record<string, string> = {
  radicacion_enviar_analisis: 'Enviar solicitud a análisis (Radicación)',
  /** Bloque “Resumen financiero” (solvencia, activos, pasivos) en formulario/ detalle de radicación. Sin esto, p. ej. asesor no ve ese resumen. */
  radicacion_ver_resumen_financiero: 'Ver resumen financiero del deudor en radicación (solvencia, activos, pasivos, etc.)',
  settings_ver: 'Ver menú Configuración (perfil, cuenta, apariencia, notificaciones, etc.)',
}

export function getPermissionLabel(name: string): string {
  const override = PERMISSION_LABEL_OVERRIDES[name]
  if (override) {
    return override
  }
  const parts = name.split('_')
  const category = parts[0] ?? ''
  const action = parts[1] ?? ''

  const categoryLabel = PERMISSION_CATEGORY_LABELS[category] ?? capitalizeWords(category)
  const actionLabel = ACTION_LABELS[action] ?? capitalizeWords(action)
  return actionLabel ? `${actionLabel} ${categoryLabel}` : categoryLabel
}
