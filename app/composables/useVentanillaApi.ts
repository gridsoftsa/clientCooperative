import type {
  VentanillaCatalogData,
  VentanillaCatalogSettingsData,
  VentanillaFilingDetail,
  VentanillaFilingSummary,
  VentanillaIntakeRow,
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
      `/ventanilla/catalog-settings/functional-types/${key}`,
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

  function filingFileDownloadUrl(filingId: number, fileId: number): string {
    const base = String(config.public.apiBase || 'http://localhost:8000').replace(/\/$/, '')

    return `${base}/api/ventanilla/filings/${filingId}/files/${fileId}/download`
  }

  function filingReceiptUrl(filingId: number): string {
    const base = String(config.public.apiBase || 'http://localhost:8000').replace(/\/$/, '')

    return `${base}/api/ventanilla/filings/${filingId}/receipt`
  }

  function intakeFileDownloadUrl(intakeId: number, fileId: number): string {
    const base = String(config.public.apiBase || 'http://localhost:8000').replace(/\/$/, '')

    return `${base}/api/ventanilla/intakes/${intakeId}/files/${fileId}/download`
  }

  async function downloadFilingFile(filingId: number, fileId: number, filename: string): Promise<void> {
    await downloadFromUrl(filingFileDownloadUrl(filingId, fileId), filename)
  }

  async function downloadReceipt(filingId: number, filename: string): Promise<void> {
    await downloadFromUrl(filingReceiptUrl(filingId), filename)
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
    fetchCatalogSettings,
    createFunctionalType,
    updateFunctionalType,
    createReceptionMedium,
    updateReceptionMedium,
    fetchFilings,
    fetchFiling,
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
    fetchSlaSettings,
    updateSlaSettings,
    addHoliday,
    removeHoliday,
    filingFileDownloadUrl,
    filingReceiptUrl,
    intakeFileDownloadUrl,
    downloadFilingFile,
    downloadReceipt,
    downloadIntakeFile,
  }
}
