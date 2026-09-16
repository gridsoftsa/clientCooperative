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
  'archival': 'TRD y archivo',
  'assign': 'Asignar',
  'audits': 'Auditoría',
  'audit': 'Auditoría',
  'company': 'Empresa e identidad visual',
  'components': 'Componentes',
  'create': 'Crear',
  'credits': 'Créditos',
  'display': 'Pantalla',
  'directory': 'Directorio',
  'disposition': 'Disposición final',
  'delegations': 'Backup',
  'documentacion': 'Documentación',
  'edit': 'Editar',
  'editar': 'Editar',
  'email': 'Correo',
  'estructura': 'Estructura',
  'financial-activity': 'Actividad financiera',
  'import': 'Importar estructura',
  'forgot-password': 'Recuperar contraseña',
  'plantilla-score': 'Plantilla Score',
  'score-template': 'Plantilla Score',
  'template-config': 'Plantillas',
  'notifications': 'Notificaciones',
  'notificaciones': 'Notificaciones',
  'nueva': 'Nueva',
  'nuevo': 'Nuevo',
  'comunicados': 'Comunicados',
  'offices': 'Agencias',
  'organizational-structure': 'Estructura organizacional',
  'parametrizacion': 'Parametrización',
  'permissions': 'Permisos',
  'plantillas': 'Plantillas',
  'positions': 'Cargos',
  'profile': 'Perfil',
  'radicacion': 'Radicación',
  'register': 'Registro',
  'roles': 'Roles',
  'settings': 'Configuración',
  'solicitantes': 'Solicitantes',
  'staff': 'Funcionarios',
  'sucursales': 'Sucursales',
  'tasks': 'Tareas',
  'tree': 'Organigrama',
  'trd': 'TRD',
  'consult': 'Consulta',
  'sheet': 'Hoja',
  'versions': 'Versiones',
  'catalog': 'Catálogo',
  'series': 'Series',
  'subseries': 'Subseries',
  'document-types': 'Tipos documentales',
  'unauthorized': 'No autorizado',
  'units': 'Áreas y dependencias',
  'ventanilla': 'Ventanilla',
  'bandeja': 'Bandeja de clasificación',
  'ventanilla-unica': 'Ventanilla única',
  'functional-types': 'Tipos funcionales',
  'reception-media': 'Medios de recepción',
  'work-groups': 'Grupos y comités',
  'users': 'Usuarios',
  'kanban': 'Kanban',
  'lifecycle': 'Ciclo de vida',
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

export type PathBreadcrumbLink = {
  title: string
  href: string
}

function isNumericSegment(segment: string): boolean {
  return /^\d+$/.test(segment)
}

const RESOURCE_BREADCRUMBS: Record<string, { list: string, item: string }> = {
  versions: { list: 'Versiones', item: 'Versión' },
  series: { list: 'Series', item: 'Serie' },
  subseries: { list: 'Subseries', item: 'Subserie' },
  'document-types': { list: 'Tipos documentales', item: 'Tipo documental' },
}

function resourceListHref(segments: string[], resourceIndex: number, resource: string): string {
  if (resource === 'versions') {
    return `/${segments.slice(0, resourceIndex).join('/')}`
  }

  return `/${segments.slice(0, resourceIndex + 1).join('/')}`
}

/**
 * Arma el breadcrumb del header: traduce segmentos, oculta IDs numéricos
 * y usa etiquetas de recurso (Versión, Serie, Tipo documental) en TRD y catálogo.
 */
export function buildPathBreadcrumbLinks(path: string): PathBreadcrumbLink[] {
  const dashboard: PathBreadcrumbLink = { title: 'Dashboard', href: '/' }
  if (!path || path === '/') {
    return [dashboard]
  }

  const segments = path.split('/').filter(item => item !== '')
  const crumbs: PathBreadcrumbLink[] = [dashboard]

  for (let i = 0; i < segments.length; i++) {
    const item = segments[i]
    if (!item) {
      continue
    }

    if (isNumericSegment(item)) {
      const previous = segments[i - 1]
      const next = segments[i + 1]
      if (previous === 'trd' && next == null) {
        crumbs.push({
          title: 'Tabla',
          href: `/${segments.slice(0, i + 1).join('/')}`,
        })
      }
      continue
    }

    const resource = RESOURCE_BREADCRUMBS[item]
    if (resource) {
      const next = segments[i + 1]
      const listHref = resourceListHref(segments, i, item)

      if (next === 'create') {
        crumbs.push({ title: resource.list, href: listHref })
        continue
      }

      if (next && isNumericSegment(next)) {
        const afterId = segments[i + 2]
        if (afterId === 'edit') {
          crumbs.push({
            title: resource.item,
            href: `/${segments.slice(0, i + 3).join('/')}`,
          })
          i += 2
          continue
        }
        if (afterId == null) {
          crumbs.push({
            title: resource.item,
            href: `/${segments.slice(0, i + 2).join('/')}`,
          })
          i += 1
          continue
        }
        crumbs.push({ title: resource.list, href: listHref })
        continue
      }

      crumbs.push({ title: resource.list, href: listHref })
      continue
    }

    crumbs.push({
      title: getBreadcrumbSegmentTitle(item),
      href: `/${segments.slice(0, i + 1).join('/')}`,
    })
  }

  return crumbs
}
