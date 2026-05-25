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
  reportes: 'Reportes',
  admin: 'Administrador',
  auditoria: 'Auditoría',
  perfil: 'Perfil',
  cuenta: 'Cuenta',
  apariencia: 'Apariencia',
  notificaciones: 'Notificaciones',
  display: 'Visualización',
  sucursales: 'Sucursales',
  empresa: 'Empresa',
  plantillas: 'Plantillas',
  plantilla: 'Plantilla SCORE',
  /** Corto: se usa en chips/listados («Ver Radicación», «Ver Solicitantes»). */
  solicitantes: 'Solicitantes',
  radicacion: 'Radicación',
  settings: 'Configuración',
}

/**
 * Título del acordeón por categoría en crear/editar rol (más descriptivo que el chip).
 */
export const PERMISSION_CATEGORY_SECTION_TITLES: Record<string, string> = {
  radicacion: 'Radicación (Solicitudes de crédito)',
  solicitantes: 'Solicitantes (Deudores/Codeudores)',
}

/**
 * Orden de bloques en la UI de roles (crear/editar). Categorías no listadas van al final, ordenadas A–Z.
 * Mantiene el bloque de configuración aparte y visible, no pegado al orden alfabético del API.
 */
export const PERMISSION_CATEGORY_ORDER: string[] = [
  'dashboard',
  'reportes',
  'radicacion',
  'solicitantes',
  'plantillas',
  'plantilla',
  'settings',
  'perfil',
  'cuenta',
  'apariencia',
  'notificaciones',
  'display',
  'empresa',
  'sucursales',
  'usuarios',
  'roles',
  'permisos',
  'auditoria',
  'admin',
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

/** Permiso mínimo para agrupar en UI de roles (id + name). */
export interface PermissionLike {
  id: number
  name: string
}

/**
 * Subsecciones dentro del bloque «Radicación» en crear/editar rol.
 * Orden: operación general → documentos → análisis → dirección → catálogos → asegurabilidad / sucursal (prefijo) → otros.
 */
export interface RadicacionPermissionSubgroup {
  key: string
  label: string
  items: PermissionLike[]
}

const RADICACION_SUBGROUP_DEFINITIONS: Array<{ key: string; label: string; names: ReadonlySet<string> }> = [
  {
    key: 'operacion',
    label: 'Operación de solicitudes',
    names: new Set([
      'radicacion_ver',
      'radicacion_crear',
      'radicacion_editar',
      'radicacion_desactivar',
      'radicacion_descargar_pdf',
      'radicacion_enviar_analisis',
      'radicacion_ver_resumen_financiero',
      'radicacion_marcar_privilegiado',
    ]),
  },
  {
    key: 'documentos',
    label: 'Documentos adjuntos',
    names: new Set([
      'radicacion_descargar_documentos',
      'radicacion_documentos_subir',
      'radicacion_documentos_editar',
      'radicacion_documentos_eliminar',
      'radicacion_documentos_decidir',
    ]),
  },
  {
    key: 'analisis',
    label: 'Análisis y SCORE',
    names: new Set([
      'radicacion_analisis_ver',
      'radicacion_analisis_guardar',
    ]),
  },
  {
    key: 'direccion',
    label: 'Dirección y decisiones finales',
    names: new Set([
      'radicacion_director_decidir',
      'radicacion_director_credito_decidir',
      'radicacion_cancelar',
    ]),
  },
  {
    key: 'catalogos',
    label: 'Catálogos de radicación',
    names: new Set([
      'radicacion_catalogos_ver',
      'radicacion_catalogos_editar',
    ]),
  },
]

/**
 * Subgrupos por prefijo (`radicacion_insurability_*`, etc.) para no mezclarlos en «Otros».
 * Orden: después de los bloques con lista fija en {@link RADICACION_SUBGROUP_DEFINITIONS}.
 */
const RADICACION_PREFIX_SUBGROUPS: ReadonlyArray<{ key: string; label: string; prefix: string }> = [
  { key: 'insurability', label: 'Asegurabilidad', prefix: 'radicacion_insurability_' },
  { key: 'fng', label: 'FNG (revisión documental)', prefix: 'radicacion_fng_' },
  { key: 'credit_mortgage', label: 'Clasificación hipotecaria', prefix: 'radicacion_credit_mortgage_' },
  { key: 'approver_entity', label: 'Ente aprobador (director de crédito)', prefix: 'radicacion_approver_entity_' },
  { key: 'sucursal_solicitud', label: 'Sucursal de la solicitud', prefix: 'radicacion_sucursal_' },
]

/** Acciones traducidas (primera letra mayúscula) */
const ACTION_LABELS: Record<string, string> = {
  ver: 'Ver',
  crear: 'Crear',
  editar: 'Editar',
  eliminar: 'Eliminar',
  acceso: 'Acceso',
  guardar: 'Guardar',
  subir: 'Subir',
  decidir: 'Decidir',
  cancelar: 'Cancelar',
  desactivar: 'Desactivar',
  marcar: 'Marcar',
  descargar: 'Descargar',
}

/** Verbo reconocido como último segmento en `radicacion_<recurso>_<verbo>`. */
const RADICACION_TRAILING_ACTIONS = new Set(Object.keys(ACTION_LABELS))

/**
 * Recurso intermedio (snake entre `radicacion` y la acción) → texto UI en español.
 * Evita etiquetas duplicadas tipo «Insurability Radicación» para `radicacion_insurability_ver`, etc.
 */
const PERMISSION_RESOURCE_LABELS: Record<string, string> = {
  insurability: 'asegurabilidad',
  insurability_documentos: 'documentos de asegurabilidad',
  /** Variante con segmento en inglés (`documents`) que aún pueda existir en BD. */
  insurability_documents: 'documentos de asegurabilidad',
  insurability_status: 'estado de asegurabilidad',
  insurability_form: 'formato de asegurabilidad',
  fng: 'FNG',
  fng_documentos: 'documentos FNG',
  credit_mortgage: 'crédito hipotecario',
  approver_entity: 'ente aprobador',
  approver_entity_ver: 'documentos del ente aprobador (solo lectura)',
  approver_entity_documentos: 'documentos del ente aprobador',
  sucursal: 'sucursal de la solicitud',
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
 * Etiquetas fijas en {@link PERMISSION_LABEL_OVERRIDES} cuando el nombre en varias partes no basta.
 */
const PERMISSION_LABEL_OVERRIDES: Record<string, string> = {
  settings_ver: 'Ver configuración',
  radicacion_enviar_analisis: 'Enviar solicitud a análisis',
  radicacion_ver_resumen_financiero: 'Ver resumen financiero (deudor)',
  radicacion_analisis_ver: 'Ver análisis y SCORE',
  radicacion_analisis_guardar: 'Guardar análisis y SCORE',
  radicacion_director_decidir: 'Decidir como director de agencia',
  radicacion_director_credito_decidir: 'Decisión director de crédito',
  radicacion_cancelar: 'Cancelar solicitud de radicación',
  radicacion_marcar_privilegiado: 'Marcar privilegiado',
  radicacion_documentos_decidir: 'Decidir revisión documental',
  radicacion_descargar_documentos: 'Ver y descargar adjuntos',
  radicacion_documentos_subir: 'Subir adjuntos',
  radicacion_documentos_editar: 'Editar títulos de adjuntos',
  radicacion_insurability_ver: 'Ver asegurabilidad',
  radicacion_approver_entity_ver: 'Ver documentos del ente aprobador',
  radicacion_insurability_documentos_subir: 'Subir documentos de asegurabilidad',
  radicacion_insurability_documentos_editar: 'Editar títulos de documentos de asegurabilidad',
  radicacion_insurability_documentos_eliminar: 'Eliminar documentos de asegurabilidad',
  radicacion_insurability_status_editar: 'Actualizar estado de asegurabilidad (plantilla: director de crédito; no analista ni revisión documental)',
  radicacion_fng_ver: 'Ver documentos FNG',
  radicacion_fng_documentos_subir: 'Subir documentos FNG',
  radicacion_fng_documentos_editar: 'Editar títulos de documentos FNG',
  radicacion_fng_documentos_eliminar: 'Eliminar documentos FNG',
  radicacion_credit_mortgage_classify: 'Indicar si el crédito es hipotecario (revisión documental)',
  radicacion_approver_entity_documentos_subir: 'Subir documentos del ente aprobador',
  radicacion_approver_entity_documentos_editar: 'Editar títulos de documentos del ente aprobador',
  radicacion_approver_entity_documentos_eliminar: 'Eliminar documentos del ente aprobador',
  reportes_ver: 'Ver reportes',
  radicacion_catalogos_ver: 'Ver catálogos',
  radicacion_catalogos_editar: 'Editar catálogos',
  plantilla_score_ver: 'Ver plantilla SCORE',
  plantilla_score_editar: 'Editar plantilla SCORE',
}

export function getPermissionLabel(name: string): string {
  const override = PERMISSION_LABEL_OVERRIDES[name]
  if (override) {
    return override
  }
  const parts = name.split('_')
  const category = parts[0] ?? ''

  if (category === 'radicacion' && parts.length >= 3) {
    const last = parts[parts.length - 1] ?? ''
    if (RADICACION_TRAILING_ACTIONS.has(last)) {
      const resourceKey = parts.slice(1, -1).join('_')
      const actionLabel = ACTION_LABELS[last] ?? capitalizeWords(last)
      const resourceLabel
        = PERMISSION_RESOURCE_LABELS[resourceKey]
          ?? capitalizeWords(parts.slice(1, -1).join(' '))
      return `${actionLabel} ${resourceLabel}`
    }
  }

  const action = parts[1] ?? ''

  const categoryLabel = PERMISSION_CATEGORY_LABELS[category] ?? capitalizeWords(category)
  const actionLabel = ACTION_LABELS[action] ?? capitalizeWords(action)
  return actionLabel ? `${actionLabel} ${categoryLabel}` : categoryLabel
}

function sortPermissionsByLabelEs(items: PermissionLike[]): PermissionLike[] {
  return [...items].sort((a, b) =>
    getPermissionLabel(a.name).localeCompare(getPermissionLabel(b.name), 'es', { sensitivity: 'base' }),
  )
}

/**
 * Agrupa permisos `radicacion_*` en subsecciones ordenadas para la UI de roles.
 */
export function groupRadicacionPermissions(list: PermissionLike[]): RadicacionPermissionSubgroup[] {
  const buckets = new Map<string, PermissionLike[]>()
  for (const def of RADICACION_SUBGROUP_DEFINITIONS) {
    buckets.set(def.key, [])
  }
  for (const psg of RADICACION_PREFIX_SUBGROUPS) {
    buckets.set(psg.key, [])
  }
  buckets.set('otros', [])

  for (const p of list) {
    let placed = false
    for (const def of RADICACION_SUBGROUP_DEFINITIONS) {
      if (def.names.has(p.name)) {
        buckets.get(def.key)!.push(p)
        placed = true
        break
      }
    }
    if (!placed) {
      for (const psg of RADICACION_PREFIX_SUBGROUPS) {
        if (p.name.startsWith(psg.prefix)) {
          buckets.get(psg.key)!.push(p)
          placed = true
          break
        }
      }
    }
    if (!placed) {
      buckets.get('otros')!.push(p)
    }
  }

  const out: RadicacionPermissionSubgroup[] = []
  for (const def of RADICACION_SUBGROUP_DEFINITIONS) {
    const items = buckets.get(def.key) ?? []
    if (items.length === 0) {
      continue
    }
    out.push({
      key: def.key,
      label: def.label,
      items: sortPermissionsByLabelEs(items),
    })
  }

  for (const psg of RADICACION_PREFIX_SUBGROUPS) {
    const items = buckets.get(psg.key) ?? []
    if (items.length === 0) {
      continue
    }
    out.push({
      key: psg.key,
      label: psg.label,
      items: sortPermissionsByLabelEs(items),
    })
  }

  const otros = buckets.get('otros') ?? []
  if (otros.length > 0) {
    out.push({
      key: 'otros',
      label: 'Otros (radicación)',
      items: sortPermissionsByLabelEs(otros),
    })
  }

  return out
}
