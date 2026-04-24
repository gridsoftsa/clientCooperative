/**
 * Etiquetas en español para el breadcrumb del header.
 * Clave: segmento de ruta en minúsculas (como en `useRoute().path`).
 * Alinear con títulos de `app/constants/menus.ts` cuando aplique.
 */
const SEGMENT_LABELS: Record<string, string> = {
  'admin': 'Administración',
  'analisis-score': 'Análisis Score',
  'applicants': 'Solicitantes',
  'account': 'Cuenta',
  'appearance': 'Apariencia',
  'audit': 'Auditoría',
  'company': 'Empresa',
  'components': 'Componentes',
  'create': 'Crear',
  'credits': 'Créditos',
  'display': 'Pantalla',
  'edit': 'Editar',
  'editar': 'Editar',
  'email': 'Correo',
  'financial-activity': 'Actividad financiera',
  'forgot-password': 'Recuperar contraseña',
  'plantilla-score': 'Plantilla Score',
  'score-template': 'Plantilla Score',
  'template-config': 'Plantillas',
  'notifications': 'Notificaciones',
  'nueva': 'Nueva',
  'parametrizacion': 'Parametrización',
  'permissions': 'Permisos',
  'plantillas': 'Plantillas',
  'profile': 'Perfil',
  'radicacion': 'Radicación',
  'register': 'Registro',
  'roles': 'Roles',
  'settings': 'Configuración',
  'solicitantes': 'Solicitantes',
  'sucursales': 'Sucursales',
  'tasks': 'Tareas',
  'unauthorized': 'No autorizado',
  'users': 'Usuarios',
  'kanban': 'Kanban',
  'login': 'Iniciar sesión',
  'otp': 'Verificación',
}

/**
 * Título visible para un segmento de path (`plantilla-score`, `123`, `settings`, …).
 */
export function getBreadcrumbSegmentTitle(segment: string): string {
  const normalized = segment.trim().toLowerCase()
  if (SEGMENT_LABELS[normalized]) {
    return SEGMENT_LABELS[normalized]!
  }
  return segment
    .replace(/-/g, ' ')
    .split(' ')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}
