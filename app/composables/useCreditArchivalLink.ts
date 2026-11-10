import type { ArchivalCreditLinkSettings } from '~/types/archival-file'
import { toast } from 'vue-sonner'

export const CREDIT_ARCHIVAL_FILE_NOT_CONFIGURED_MESSAGE
  = 'Antes de crear un solicitante o una radicación debe configurar el archivo en Enlace crédito: active el enlace y elija el tipo de expediente del titular y el de la solicitud.'

/** Permisos que el GET de enlace crédito/expediente acepta. */
export const CREDIT_ARCHIVAL_LINK_READ_PERMISSIONS = [
  'radicacion_ver',
  'radicacion_crear',
  'radicacion_editar',
  'documentacion_ver',
  'solicitantes_ver',
  'expedientes_tipos_configurar',
  'expedientes_enlace_credito_configurar',
] as const

export function useCreditArchivalLink() {
  const archivalApi = useArchivalFileApi()
  const { hasAnyPermission, hasModule, hasRole } = usePermissions()
  const creditArchivalLinkEnabled = useState('credit-archival-link-enabled', () => false)
  const creditArchivalLinkLoaded = useState('credit-archival-link-loaded', () => false)
  const creditArchivalLinkConfigured = useState('credit-archival-link-configured', () => false)

  async function refreshCreditArchivalLink(): Promise<void> {
    if (import.meta.server) {
      return
    }

    // Sin gestión documental el explorador no aplica; no llamar al endpoint de archivo.
    if (!hasModule('gestion_documental') || !hasAnyPermission([...CREDIT_ARCHIVAL_LINK_READ_PERMISSIONS])) {
      creditArchivalLinkEnabled.value = false
      creditArchivalLinkConfigured.value = false
      creditArchivalLinkLoaded.value = true
      return
    }

    try {
      const data = await archivalApi.fetchCreditLinkSettings()
      creditArchivalLinkEnabled.value = data.enabled === true
      creditArchivalLinkConfigured.value = isCreditArchivalLinkFullyConfigured(data)
    }
    catch {
      creditArchivalLinkEnabled.value = false
      creditArchivalLinkConfigured.value = false
    }
    finally {
      creditArchivalLinkLoaded.value = true
    }
  }

  async function loadCreditArchivalLinkForRadicacion(): Promise<ArchivalCreditLinkSettings | null> {
    if (!hasModule('gestion_documental')) {
      creditArchivalLinkEnabled.value = false
      creditArchivalLinkConfigured.value = false
      creditArchivalLinkLoaded.value = true
      return null
    }

    try {
      const data = await archivalApi.fetchCreditLinkSettings()
      creditArchivalLinkEnabled.value = data.enabled === true
      creditArchivalLinkConfigured.value = isCreditArchivalLinkFullyConfigured(data)
      creditArchivalLinkLoaded.value = true
      return data
    }
    catch {
      creditArchivalLinkEnabled.value = false
      creditArchivalLinkConfigured.value = false
      creditArchivalLinkLoaded.value = true
      return null
    }
  }

  async function ensureArchivalFileConfiguredForCreate(): Promise<boolean> {
    if (hasRole('super_admin') || !hasModule('gestion_documental')) {
      return true
    }

    const data = await loadCreditArchivalLinkForRadicacion()
    if (data && isCreditArchivalLinkFullyConfigured(data)) {
      return true
    }

    toast.error(CREDIT_ARCHIVAL_FILE_NOT_CONFIGURED_MESSAGE)
    return false
  }

  return {
    creditArchivalLinkEnabled,
    creditArchivalLinkConfigured,
    creditArchivalLinkLoaded,
    refreshCreditArchivalLink,
    loadCreditArchivalLinkForRadicacion,
    ensureArchivalFileConfiguredForCreate,
  }
}

export function isCreditArchivalLinkFullyConfigured(data: ArchivalCreditLinkSettings): boolean {
  return data.enabled === true
    && data.associate_archival_file_type_id != null
    && data.credit_archival_file_type_id != null
}
