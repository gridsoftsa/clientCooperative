/**
 * Ruta de inicio según el módulo que el usuario opera.
 * Un solo dashboard combinado en `/`; ventanilla tiene prioridad visual ahí.
 */
export function resolveAppHomePath(hasPermission: (permission: string) => boolean): string {
  if (hasPermission('ventanilla_dashboard_ver') || hasPermission('dashboard_ver')) {
    return '/'
  }

  return '/radicacion'
}
