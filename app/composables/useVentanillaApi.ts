import type {
  VentanillaCatalogData,
  VentanillaCatalogSettingsData,
  VentanillaClassificationRuleRow,
  VentanillaEmailAccountRow,
  VentanillaColombiaHolidayImportResult,
  VentanillaColombiaHolidayPreviewData,
  VentanillaFilingDetail,
  VentanillaFilingSummary,
  VentanillaFilingVerificationData,
  VentanillaIntakeRow,
  VentanillaResponsibleUserRow,
  VentanillaSlaComplianceDashboardData,
  VentanillaInboxNotificationRow,
  VentanillaInboxNotificationsData,
  VentanillaNotificationSettingsRow,
  VentanillaSlaSettingsData,
} from '~/types/ventanilla'

export function useVentanillaApi() {
  const { $api } = useNuxtApp()
  const api = $api as <T>(url: string, options?: Record<string, unknown>) => Promise<T>
  const config = useRuntimeConfig()

  async function fetchCatalog(): Promise<VentanillaCatalogData> {
    const res = await api<{ data: VentanillaCatalogData }>('/ventanilla/catalog')

    return res.data
  }

  async function fetchPublicCatalog(): Promise<{ functional_types: Array<{ key: string; label: string }> }> {
    const base = String(config.public.apiBase || 'http://localhost:8000').replace(/\/$/, '')
    const res = await $fetch<{ data: { functional_types: Array<{ key: string; label: string }> } }>(
      `${base}/api/ventanilla/public-catalog`,
    )

    return res.data
  }

  async function fetchEmailAccount(): Promise<VentanillaEmailAccountRow> {
    const res = await api<{ data: VentanillaEmailAccountRow }>('/ventanilla/email-account')

    return res.data
  }

  async function updateEmailAccount(payload: Record<string, unknown>): Promise<VentanillaEmailAccountRow> {
    const res = await api<{ data: VentanillaEmailAccountRow }>('/ventanilla/email-account', {
      method: 'PUT',
      body: payload,
    })

    return res.data
  }

  async function testEmailAccountConnection(): Promise<string> {
    const res = await api<{ message: string }>('/ventanilla/email-account/test', { method: 'POST' })

    return res.message
  }

  async function fetchEmailAccountNow(): Promise<{ created: number; skipped: number; error: string | null; message: string }> {
    const res = await api<{ data: { created: number; skipped: number; error: string | null }; message: string }>(
      '/ventanilla/email-account/fetch',
      { method: 'POST' },
    )

    return { ...res.data, message: res.message }
  }

  async function fetchClassificationRules(): Promise<VentanillaClassificationRuleRow[]> {
    const res = await api<{ data: VentanillaClassificationRuleRow[] }>('/ventanilla/classification-rules')

    return res.data
  }

  async function createClassificationRule(payload: Record<string, unknown>): Promise<VentanillaClassificationRuleRow> {
    const res = await api<{ data: VentanillaClassificationRuleRow }>('/ventanilla/classification-rules', {
      method: 'POST',
      body: payload,
    })

    return res.data
  }

  async function updateClassificationRule(id: number, payload: Record<string, unknown>): Promise<VentanillaClassificationRuleRow> {
    const res = await api<{ data: VentanillaClassificationRuleRow }>(`/ventanilla/classification-rules/${id}`, {
      method: 'PUT',
      body: payload,
    })

    return res.data
  }

  async function deleteClassificationRule(id: number): Promise<void> {
    await api(`/ventanilla/classification-rules/${id}`, { method: 'DELETE' })
  }

  async function fetchResponsibleUsers(
    orgUnitId: number,
    includeUserId?: number,
  ): Promise<VentanillaResponsibleUserRow[]> {
    const query: Record<string, string | number> = { org_unit_id: orgUnitId }
    if (includeUserId) {
      query.include_user_id = includeUserId
    }

    const res = await api<{ data: VentanillaResponsibleUserRow[] }>('/ventanilla/responsible-users', { query })

    return res.data
  }

  async function fetchCatalogSettings(): Promise<VentanillaCatalogSettingsData> {
    const res = await api<{ data: VentanillaCatalogSettingsData }>('/ventanilla/catalog-settings')

    return res.data
  }

  async function createFunctionalType(payload: Record<string, unknown>) {
    const res = await api<{ data: VentanillaCatalogSettingsData['functional_types'][number]; message: string }>(
      '/ventanilla/catalog-settings/functional-types',
      { method: 'POST', body: payload },
    )

    return res.data
  }

  async function updateFunctionalType(key: string, payload: Record<string, unknown>) {
    const res = await api<{ data: VentanillaCatalogSettingsData['functional_types'][number]; message: string }>(
      `/ventanilla/catalog-settings/functional-types/${encodeURIComponent(key)}`,
      { method: 'PUT', body: payload },
    )

    return res.data
  }

  async function createReceptionMedium(payload: Record<string, unknown>) {
    const res = await api<{ data: VentanillaCatalogSettingsData['reception_media'][number]; message: string }>(
      '/ventanilla/catalog-settings/reception-media',
      { method: 'POST', body: payload },
    )

    return res.data
  }

  async function updateReceptionMedium(value: string, payload: Record<string, unknown>) {
    const res = await api<{ data: VentanillaCatalogSettingsData['reception_media'][number]; message: string }>(
      `/ventanilla/catalog-settings/reception-media/${value}`,
      { method: 'PUT', body: payload },
    )

    return res.data
  }

  async function fetchFilings(query: Record<string, string | number> = {}): Promise<{
    data: VentanillaFilingSummary[]
    meta: { current_page: number; last_page: number; per_page: number; total: number }
  }> {
    return await api('/ventanilla/filings', { query })
  }

  async function fetchFiling(id: number): Promise<VentanillaFilingDetail> {
    const res = await api<{ data: VentanillaFilingDetail }>(`/ventanilla/filings/${id}`)

    return res.data
  }

  async function verifyFilingReceipt(token: string): Promise<VentanillaFilingVerificationData> {
    const res = await api<{ data: VentanillaFilingVerificationData }>(
      `/ventanilla/verify/${encodeURIComponent(token)}`,
    )

    return res.data
  }

  async function createFiling(formData: FormData): Promise<VentanillaFilingDetail> {
    const res = await api<{ data: VentanillaFilingDetail; message: string }>('/ventanilla/filings', {
      method: 'POST',
      body: formData,
    })

    return res.data
  }

  async function createPublicIntake(formData: FormData): Promise<{ id: number; status: string; received_at: string }> {
    const res = await api<{ data: { id: number; status: string; received_at: string }; message: string }>('/ventanilla/public-intakes', {
      method: 'POST',
      body: formData,
    })

    return res.data
  }

  async function fetchIntakes(query: Record<string, string | number> = {}): Promise<{
    data: VentanillaIntakeRow[]
    meta: { current_page: number; last_page: number; per_page: number; total: number }
  }> {
    return await api('/ventanilla/intakes', { query })
  }

  async function fetchIntake(id: number): Promise<VentanillaIntakeRow> {
    const res = await api<{ data: VentanillaIntakeRow }>(`/ventanilla/intakes/${id}`)

    return res.data
  }

  async function createEmailIntake(formData: FormData): Promise<VentanillaIntakeRow> {
    const res = await api<{ data: VentanillaIntakeRow; message: string }>('/ventanilla/intakes/email', {
      method: 'POST',
      body: formData,
    })

    return res.data
  }

  async function classifyIntake(id: number, payload: Record<string, unknown>): Promise<{ intake: VentanillaIntakeRow; filing: { id: number; filing_number: string; status: string } }> {
    const res = await api<{ data: { intake: VentanillaIntakeRow; filing: { id: number; filing_number: string; status: string } }; message: string }>(
      `/ventanilla/intakes/${id}/classify`,
      { method: 'POST', body: payload },
    )

    return res.data
  }

  async function discardIntake(id: number, discardReason: string): Promise<VentanillaIntakeRow> {
    const res = await api<{ data: VentanillaIntakeRow; message: string }>(`/ventanilla/intakes/${id}/discard`, {
      method: 'PATCH',
      body: { discard_reason: discardReason },
    })

    return res.data
  }

  async function assignFiling(id: number, payload: { assigned_user_id: number; note?: string }): Promise<VentanillaFilingDetail> {
    const res = await api<{ data: VentanillaFilingDetail; message: string }>(`/ventanilla/filings/${id}/assign`, {
      method: 'PATCH',
      body: payload,
    })

    return res.data
  }

  async function startFiling(id: number): Promise<VentanillaFilingDetail> {
    const res = await api<{ data: VentanillaFilingDetail; message: string }>(`/ventanilla/filings/${id}/start`, {
      method: 'PATCH',
    })

    return res.data
  }

  async function respondFiling(id: number, responseText: string): Promise<VentanillaFilingDetail> {
    const res = await api<{ data: VentanillaFilingDetail; message: string }>(`/ventanilla/filings/${id}/respond`, {
      method: 'PATCH',
      body: { response_text: responseText },
    })

    return res.data
  }

  async function closeFiling(id: number, closeReason?: string): Promise<VentanillaFilingDetail> {
    const res = await api<{ data: VentanillaFilingDetail; message: string }>(`/ventanilla/filings/${id}/close`, {
      method: 'PATCH',
      body: { close_reason: closeReason },
    })

    return res.data
  }

  async function voidFiling(id: number, voidReason: string): Promise<VentanillaFilingDetail> {
    const res = await api<{ data: VentanillaFilingDetail; message: string }>(`/ventanilla/filings/${id}/void`, {
      method: 'PATCH',
      body: { void_reason: voidReason },
    })

    return res.data
  }

  async function refreshSla(): Promise<{ checked: number; updated: number; alerts: number }> {
    const res = await api<{ data: { checked: number; updated: number; alerts: number }; message: string }>('/ventanilla/sla-refresh', {
      method: 'POST',
    })

    return res.data
  }

  async function fetchSlaDashboard(query: Record<string, string | number> = {}): Promise<VentanillaSlaComplianceDashboardData> {
    const res = await api<{ data: VentanillaSlaComplianceDashboardData }>('/ventanilla/sla-dashboard', { query })

    return res.data
  }

  async function downloadMetadataReportExport(query: Record<string, string | number> = {}): Promise<void> {
    const base = String(config.public.apiBase || 'http://localhost:8000').replace(/\/$/, '')
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      if (value !== '' && value != null && key !== 'page' && key !== 'per_page') {
        params.set(key, String(value))
      }
    }
    const qs = params.toString()
    const url = `${base}/api/ventanilla/filings/metadata-report/export${qs ? `?${qs}` : ''}`
    const blob = await fetchAuthenticatedBlob(url)
    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = `ventanilla-metadatos-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.style.cssText = 'position:fixed;left:-9999px;top:0'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
  }

  async function downloadSlaDashboardExport(query: Record<string, string | number> = {}): Promise<void> {
    const base = String(config.public.apiBase || 'http://localhost:8000').replace(/\/$/, '')
    const params = new URLSearchParams()
    for (const [key, value] of Object.entries(query)) {
      if (value !== '' && value != null) {
        params.set(key, String(value))
      }
    }
    const qs = params.toString()
    const url = `${base}/api/ventanilla/sla-dashboard/export${qs ? `?${qs}` : ''}`
    const blob = await fetchAuthenticatedBlob(url)
    const objectUrl = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = `ventanilla-cumplimiento-sla-${new Date().toISOString().slice(0, 10)}.csv`
    anchor.style.cssText = 'position:fixed;left:-9999px;top:0'
    document.body.appendChild(anchor)
    anchor.click()
    document.body.removeChild(anchor)
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
  }

  async function fetchNotificationSettings(): Promise<VentanillaNotificationSettingsRow> {
    const res = await api<{ data: VentanillaNotificationSettingsRow }>('/ventanilla/notification-settings')

    return res.data
  }

  async function updateNotificationSettings(payload: {
    channel_email_enabled: boolean
    channel_whatsapp_enabled: boolean
    channel_internal_enabled: boolean
  }): Promise<VentanillaNotificationSettingsRow> {
    const res = await api<{ data: VentanillaNotificationSettingsRow }>('/ventanilla/notification-settings', {
      method: 'PUT',
      body: payload,
    })

    return res.data
  }

  async function fetchInboxNotifications(query: Record<string, string | number | boolean> = {}): Promise<VentanillaInboxNotificationsData> {
    const res = await api<VentanillaInboxNotificationsData>('/ventanilla/inbox-notifications', { query })

    return res
  }

  async function markInboxNotificationRead(id: string): Promise<VentanillaInboxNotificationRow> {
    const res = await api<{ data: VentanillaInboxNotificationRow }>(`/ventanilla/inbox-notifications/${id}/read`, {
      method: 'PATCH',
    })

    return res.data
  }

  async function markAllInboxNotificationsRead(): Promise<void> {
    await api('/ventanilla/inbox-notifications/mark-all-read', { method: 'POST' })
  }

  async function fetchSlaSettings(): Promise<VentanillaSlaSettingsData> {
    const res = await api<{ data: VentanillaSlaSettingsData }>('/ventanilla/sla-settings')

    return res.data
  }

  async function updateSlaSettings(payload: {
    calendar_name: string
    working_days: number[]
    orange_model: 'percentage' | 'days_before'
    orange_percentage: number
    orange_days_before: number
    alerts_enabled: boolean
    notify_assignee: boolean
    notify_immediate_supervisor: boolean
    notify_unit_manager: boolean
    red_reminder_interval_days: number
    escalation_enabled: boolean
    escalation_business_days_after_deadline: number
    escalation_notify_immediate_supervisor: boolean
    escalation_notify_unit_manager: boolean
    escalation_functional_type_keys: string[] | null
  }): Promise<VentanillaSlaSettingsData> {
    const res = await api<{ data: VentanillaSlaSettingsData }>('/ventanilla/sla-settings', {
      method: 'PUT',
      body: payload,
    })

    return res.data
  }

  async function addHoliday(payload: { date: string; name: string }): Promise<VentanillaSlaSettingsData> {
    const res = await api<{ data: VentanillaSlaSettingsData }>('/ventanilla/sla-settings/holidays', {
      method: 'POST',
      body: payload,
    })

    return res.data
  }

  async function removeHoliday(id: number): Promise<VentanillaSlaSettingsData> {
    const res = await api<{ data: VentanillaSlaSettingsData }>(`/ventanilla/sla-settings/holidays/${id}`, {
      method: 'DELETE',
    })

    return res.data
  }

  async function previewColombiaHolidays(year: number): Promise<VentanillaColombiaHolidayPreviewData> {
    const res = await api<{ data: VentanillaColombiaHolidayPreviewData }>('/ventanilla/sla-settings/holidays/colombia/preview', {
      query: { year },
    })

    return res.data
  }

  async function importColombiaHolidays(
    year: number,
    replace = false,
  ): Promise<{ data: VentanillaSlaSettingsData; import: VentanillaColombiaHolidayImportResult; message: string }> {
    const res = await api<{
      data: {
        settings: VentanillaSlaSettingsData['settings']
        holidays: VentanillaSlaSettingsData['holidays']
        import: VentanillaColombiaHolidayImportResult
      }
      message: string
    }>('/ventanilla/sla-settings/holidays/colombia/import', {
      method: 'POST',
      body: { year, replace },
    })

    return {
      data: {
        settings: res.data.settings,
        holidays: res.data.holidays,
      },
      import: res.data.import,
      message: res.message,
    }
  }

  function filingFileViewUrl(filingId: number, fileId: number): string {
    const base = String(config.public.apiBase || 'http://localhost:8000').replace(/\/$/, '')

    return `${base}/api/ventanilla/filings/${filingId}/files/${fileId}/view`
  }

  function filingFileDownloadUrl(filingId: number, fileId: number): string {
    const base = String(config.public.apiBase || 'http://localhost:8000').replace(/\/$/, '')

    return `${base}/api/ventanilla/filings/${filingId}/files/${fileId}/download`
  }

  function filingReceiptUrl(filingId: number): string {
    const base = String(config.public.apiBase || 'http://localhost:8000').replace(/\/$/, '')

    return `${base}/api/ventanilla/filings/${filingId}/receipt`
  }

  function filingStickerUrl(filingId: number): string {
    const base = String(config.public.apiBase || 'http://localhost:8000').replace(/\/$/, '')

    return `${base}/api/ventanilla/filings/${filingId}/sticker`
  }

  function intakeFileViewUrl(intakeId: number, fileId: number): string {
    const base = String(config.public.apiBase || 'http://localhost:8000').replace(/\/$/, '')

    return `${base}/api/ventanilla/intakes/${intakeId}/files/${fileId}/view`
  }

  function intakeFileDownloadUrl(intakeId: number, fileId: number): string {
    const base = String(config.public.apiBase || 'http://localhost:8000').replace(/\/$/, '')

    return `${base}/api/ventanilla/intakes/${intakeId}/files/${fileId}/download`
  }

  function openBlobInNewTab(blob: Blob, mimeType?: string): void {
    if (import.meta.server) {
      return
    }

    const typedBlob = mimeType && blob.type !== mimeType
      ? new Blob([blob], { type: mimeType })
      : blob
    const objectUrl = URL.createObjectURL(typedBlob)
    const a = document.createElement('a')
    a.href = objectUrl
    a.target = '_blank'
    a.rel = 'noopener noreferrer'
    a.style.cssText = 'position:fixed;left:-9999px;top:0'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 120_000)
  }

  async function fetchAuthenticatedBlob(url: string): Promise<Blob> {
    if (import.meta.server) {
      throw new Error('No disponible en servidor.')
    }

    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/)
    let token = match?.[1] ? decodeURIComponent(match[1]) : ''
    if (!token) {
      try {
        await $fetch('/sanctum/csrf-cookie', {
          baseURL: String(config.public.apiBase || 'http://localhost:8000').replace(/\/$/, ''),
          credentials: 'include',
        })
      } catch {
        // ignore
      }
      const retry = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/)
      token = retry?.[1] ? decodeURIComponent(retry[1]) : ''
    }

    const res = await fetch(url, {
      credentials: 'include',
      headers: {
        Accept: '*/*',
        'X-Requested-With': 'XMLHttpRequest',
        ...(token ? { 'X-XSRF-TOKEN': token } : {}),
      },
    })

    if (!res.ok) {
      let message = 'No se pudo obtener el archivo.'
      try {
        const contentType = res.headers.get('Content-Type') ?? ''
        if (contentType.includes('application/json')) {
          const body = await res.json() as { message?: string }
          if (body?.message) {
            message = body.message
          }
        }
      } catch {
        // keep default
      }
      throw new Error(message)
    }

    return await res.blob()
  }

  async function viewFilingFileInNewTab(filingId: number, fileId: number, mimeType?: string): Promise<void> {
    const blob = await fetchAuthenticatedBlob(filingFileViewUrl(filingId, fileId))
    openBlobInNewTab(blob, mimeType)
  }

  async function viewIntakeFileInNewTab(intakeId: number, fileId: number, mimeType?: string): Promise<void> {
    const blob = await fetchAuthenticatedBlob(intakeFileViewUrl(intakeId, fileId))
    openBlobInNewTab(blob, mimeType)
  }

  async function downloadFilingFile(filingId: number, fileId: number, filename: string): Promise<void> {
    await downloadFromUrl(filingFileDownloadUrl(filingId, fileId), filename)
  }

  async function viewReceiptInNewTab(filingId: number): Promise<void> {
    const blob = await fetchAuthenticatedBlob(filingReceiptUrl(filingId))
    openBlobInNewTab(blob, 'application/pdf')
  }

  async function viewStickerInNewTab(filingId: number): Promise<void> {
    const blob = await fetchAuthenticatedBlob(filingStickerUrl(filingId))
    openBlobInNewTab(blob, 'application/pdf')
  }

  async function downloadIntakeFile(intakeId: number, fileId: number, filename: string): Promise<void> {
    await downloadFromUrl(intakeFileDownloadUrl(intakeId, fileId), filename)
  }

  async function downloadFromUrl(downloadUrl: string, filename: string): Promise<void> {
    if (import.meta.server) {
      return
    }

    const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/)
    const token = match?.[1] ? decodeURIComponent(match[1]) : ''
    const res = await fetch(downloadUrl, {
      credentials: 'include',
      headers: token ? { 'X-XSRF-TOKEN': token } : {},
    })

    if (!res.ok) {
      throw new Error('No se pudo descargar el archivo.')
    }

    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return {
    fetchCatalog,
    fetchPublicCatalog,
    fetchEmailAccount,
    updateEmailAccount,
    testEmailAccountConnection,
    fetchEmailAccountNow,
    fetchClassificationRules,
    createClassificationRule,
    updateClassificationRule,
    deleteClassificationRule,
    fetchResponsibleUsers,
    fetchCatalogSettings,
    createFunctionalType,
    updateFunctionalType,
    createReceptionMedium,
    updateReceptionMedium,
    fetchFilings,
    fetchFiling,
    verifyFilingReceipt,
    createFiling,
    createPublicIntake,
    fetchIntakes,
    fetchIntake,
    createEmailIntake,
    classifyIntake,
    discardIntake,
    assignFiling,
    startFiling,
    respondFiling,
    closeFiling,
    voidFiling,
    refreshSla,
    fetchSlaDashboard,
    downloadMetadataReportExport,
    downloadSlaDashboardExport,
    fetchNotificationSettings,
    updateNotificationSettings,
    fetchInboxNotifications,
    markInboxNotificationRead,
    markAllInboxNotificationsRead,
    fetchSlaSettings,
    updateSlaSettings,
    addHoliday,
    removeHoliday,
    previewColombiaHolidays,
    importColombiaHolidays,
    filingFileViewUrl,
    filingFileDownloadUrl,
    filingReceiptUrl,
    filingStickerUrl,
    intakeFileViewUrl,
    intakeFileDownloadUrl,
    viewFilingFileInNewTab,
    viewIntakeFileInNewTab,
    downloadFilingFile,
    viewReceiptInNewTab,
    viewStickerInNewTab,
    downloadIntakeFile,
  }
}
