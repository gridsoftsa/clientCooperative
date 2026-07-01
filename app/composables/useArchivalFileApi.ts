import type {
  ArchivalFile,
  ArchivalFileAccessGrant,
  ArchivalFileAlert,
  ArchivalFileAlertCatalog,
  ArchivalFileAlertSettingsPayload,
  ArchivalFileClosureReadiness,
  ArchivalFileMetadataOcrResult,
  ArchivalFileMetadataSuggestion,
  ArchivalFileRequiredDocumentsEvaluation,
  ArchivalFileTreeNode,
  ArchivalFileType,
  ArchivalPhaseTarget,
} from '~/types/archival-file'

export function useArchivalFileApi() {
  const { $api } = useNuxtApp()
  const api = $api as <T>(url: string, options?: Record<string, unknown>) => Promise<T>

  async function fetchFiles(query: Record<string, string | number> = {}) {
    const res = await api<{
      data: ArchivalFile[]
      current_page?: number
      last_page?: number
      per_page?: number
      total?: number
      meta?: { current_page: number, last_page: number, per_page: number, total: number }
    }>('/archival-files', { query })

    const meta = res.meta ?? {
      current_page: res.current_page ?? 1,
      last_page: res.last_page ?? 1,
      per_page: res.per_page ?? 15,
      total: res.total ?? res.data.length,
    }

    return { data: res.data, meta }
  }

  async function fetchFile(id: number) {
    const res = await api<{ data: ArchivalFile }>(`/archival-files/${id}`)

    return res.data
  }

  async function createFile(payload: Record<string, unknown>) {
    const res = await api<{ data: ArchivalFile, message: string }>('/archival-files', {
      method: 'POST',
      body: payload,
    })

    return res
  }

  async function fetchTree(id: number) {
    const res = await api<{ data: ArchivalFileTreeNode }>(`/archival-files/${id}/tree`)

    return res.data
  }

  async function fetchRequiredDocuments(id: number) {
    const res = await api<{ data: ArchivalFileRequiredDocumentsEvaluation }>(`/archival-files/${id}/required-documents`)

    return res.data
  }

  async function fetchClosureReadiness(id: number) {
    const res = await api<{ data: ArchivalFileClosureReadiness }>(`/archival-files/${id}/closure-readiness`)

    return res.data
  }

  async function updateMetadata(id: number, metadataValues: Record<string, unknown>) {
    const res = await api<{ data: ArchivalFile, message: string }>(`/archival-files/${id}/metadata`, {
      method: 'PATCH',
      body: { metadata_values: metadataValues },
    })

    return res
  }

  async function closeFile(id: number) {
    const res = await api<{ data: ArchivalFile, message: string }>(`/archival-files/${id}/close`, {
      method: 'POST',
    })

    return res
  }

  async function consolidateFile(id: number) {
    const res = await api<{ data: ArchivalFile, message: string }>(`/archival-files/${id}/consolidate`, {
      method: 'POST',
    })

    return res
  }

  function consolidatedDownloadUrl(id: number) {
    return `/api/archival-files/${id}/consolidated/download`
  }

  async function uploadDocument(fileId: number, formData: FormData) {
    const res = await api<{ data: Record<string, unknown>, message: string }>(`/archival-files/${fileId}/documents`, {
      method: 'POST',
      body: formData,
    })

    return res
  }

  async function suggestMetadata(query: Record<string, string | number>) {
    const res = await api<{ data: ArchivalFileMetadataSuggestion }>('/archival-files/metadata/suggest', { query })

    return res.data
  }

  async function extractMetadataOcr(formData: FormData) {
    const res = await api<{ data: ArchivalFileMetadataOcrResult }>('/archival-files/metadata/ocr', {
      method: 'POST',
      body: formData,
    })

    return res.data
  }

  async function fetchFileTypes(activeOnly = true) {
    const res = await api<{ data: ArchivalFileType[] }>('/archival-files/types-catalog', {
      query: { active_only: activeOnly ? 1 : 0 },
    })

    return res.data
  }

  async function fetchFileTypesAdmin(activeOnly = false) {
    const res = await api<{ data: ArchivalFileType[] }>('/archival-files/types', {
      query: { active_only: activeOnly ? 1 : 0 },
    })

    return res.data
  }

  async function fetchWorkflowStageOptions() {
    const res = await api<{ data: Array<{ key: string, name: string, label: string }> }>(
      '/archival-files/types/meta/workflow-stages',
    )

    return res.data
  }

  async function fetchFileType(id: number) {
    const res = await api<{ data: ArchivalFileType }>(`/archival-files/types/${id}`)

    return res.data
  }

  async function deleteFileType(id: number) {
    return await api<{ message: string }>(`/archival-files/types/${id}`, {
      method: 'DELETE',
    })
  }

  async function syncRequiredDocuments(
    id: number,
    items: Array<{
      doc_document_type_id: number
      label?: string | null
      workflow_stage_key?: string | null
      is_required?: boolean
      sort_order?: number
    }>,
  ) {
    const res = await api<{ data: ArchivalFileType, message: string }>(`/archival-files/types/${id}/required-documents`, {
      method: 'PUT',
      body: { items },
    })

    return res
  }

  async function saveFileType(payload: Record<string, unknown>, id?: number) {
    if (id) {
      return await api<{ data: ArchivalFileType, message: string }>(`/archival-files/types/${id}`, {
        method: 'PUT',
        body: payload,
      })
    }

    return await api<{ data: ArchivalFileType, message: string }>('/archival-files/types', {
      method: 'POST',
      body: payload,
    })
  }

  async function fetchAreaRepository(orgUnitId: number) {
    const res = await api<{ data: ArchivalFileTreeNode }>('/archival-files/area/repository', {
      query: { org_unit_id: orgUnitId },
    })

    return res.data
  }

  async function fetchConsolidationMeta() {
    const res = await api<{ data: import('~/types/archival-file').ArchivalFileConsolidationMeta }>(
      '/archival-files/meta/consolidation',
    )

    return res.data
  }

  async function fetchEvents(fileId: number, page = 1) {
    return await api<{
      data: import('~/types/archival-file').ArchivalFileEvent[]
      meta: { current_page: number, last_page: number, per_page: number, total: number }
    }>(`/archival-files/${fileId}/events`, { query: { page } })
  }

  async function uploadAreaDocument(formData: FormData) {
    const res = await api<{ data: Record<string, unknown>, message: string }>('/archival-files/area/documents', {
      method: 'POST',
      body: formData,
    })

    return res
  }

  async function fetchRetentionReport(query: Record<string, string | number | boolean> = {}) {
    return await api<{
      data: Array<Record<string, unknown>>
      meta: { current_page: number, last_page: number, per_page: number, total: number }
    }>('/archival-files/reports/retention', { query })
  }

  async function fetchIncompleteReport(query: Record<string, string | number | boolean> = {}) {
    return await api<{
      data: Array<Record<string, unknown>>
      meta: { current_page: number, last_page: number, per_page: number, total: number }
    }>('/archival-files/reports/incomplete', { query })
  }

  async function fetchReportsSummary() {
    const res = await api<{ data: Record<string, number> }>('/archival-files/reports/summary')

    return res.data
  }

  async function fetchAccessControlReport(fileTypeId?: number) {
    const res = await api<{ data: Array<Record<string, unknown>> }>('/archival-files/reports/access-control', {
      query: fileTypeId ? { archival_file_type_id: fileTypeId } : {},
    })

    return res.data
  }

  async function fetchFileAlerts(fileId: number) {
    const res = await api<{ data: ArchivalFileAlert[] }>(`/archival-files/${fileId}/alerts`)

    return res.data
  }

  async function fetchAlertsReport(query: Record<string, string | number | boolean> = {}) {
    return await api<{
      data: ArchivalFileAlert[]
      meta: { current_page: number, last_page: number, per_page: number, total: number }
    }>('/archival-files/reports/alerts', { query })
  }

  async function refreshAlerts() {
    const res = await api<{ data: { checked: number, alerts: number }, message: string }>(
      '/archival-files/reports/alerts-refresh',
      { method: 'POST' },
    )

    return res
  }

  async function fetchAlertsCatalog() {
    const res = await api<{ data: ArchivalFileAlertCatalog }>('/archival-files/reports/alerts-catalog')

    return res.data
  }

  async function updateAlertsSettings(payload: ArchivalFileAlertSettingsPayload) {
    const res = await api<{ data: ArchivalFileAlertCatalog, message: string }>(
      '/archival-files/reports/alerts-settings',
      { method: 'PUT', body: payload },
    )

    return res
  }

  async function fetchAccessGrantOptions() {
    const res = await api<{
      data: {
        users: Array<{ id: number, name: string, email?: string }>
        roles: Array<{ id: number, name: string }>
        file_types: Array<{ id: number, name: string }>
      }
    }>('/archival-files/access-grants/options')

    return res.data
  }

  async function fetchAccessGrants(query: Record<string, string | number> = {}) {
    const res = await api<{ data: ArchivalFileAccessGrant[] }>('/archival-files/access-grants', { query })

    return res.data
  }

  async function createAccessGrant(payload: Record<string, unknown>) {
    const res = await api<{ data: ArchivalFileAccessGrant, message: string }>('/archival-files/access-grants', {
      method: 'POST',
      body: payload,
    })

    return res
  }

  async function updateAccessGrant(id: number, payload: Record<string, unknown>) {
    const res = await api<{ data: ArchivalFileAccessGrant, message: string }>(`/archival-files/access-grants/${id}`, {
      method: 'PUT',
      body: payload,
    })

    return res
  }

  async function deleteAccessGrant(id: number) {
    return await api<{ message: string }>(`/archival-files/access-grants/${id}`, {
      method: 'DELETE',
    })
  }

  async function createDocumentReference(fileId: number, payload: { referenced_document_id: number, archival_file_node_id?: number | null }) {
    const res = await api<{ data: Record<string, unknown>, message: string }>(`/archival-files/${fileId}/documents/reference`, {
      method: 'POST',
      body: payload,
    })

    return res
  }

  async function replaceDocumentVersion(fileId: number, documentId: number, formData: FormData) {
    const res = await api<{ data: Record<string, unknown>, message: string }>(
      `/archival-files/${fileId}/documents/${documentId}/version`,
      { method: 'POST', body: formData },
    )

    return res
  }

  async function transferFile(id: number, payload: { target_phase: ArchivalPhaseTarget, reason?: string | null }) {
    const res = await api<{ data: ArchivalFile, message: string }>(`/archival-files/${id}/transfer`, {
      method: 'POST',
      body: payload,
    })

    return res
  }

  function documentDownloadUrl(fileId: number, documentId: number) {
    return `/api/archival-files/${fileId}/documents/${documentId}/download`
  }

  return {
    fetchFiles,
    fetchFile,
    createFile,
    fetchTree,
    fetchRequiredDocuments,
    fetchClosureReadiness,
    updateMetadata,
    closeFile,
    consolidateFile,
    consolidatedDownloadUrl,
    uploadDocument,
    suggestMetadata,
    extractMetadataOcr,
    fetchFileTypes,
    fetchFileTypesAdmin,
    fetchFileType,
    fetchWorkflowStageOptions,
    saveFileType,
    deleteFileType,
    syncRequiredDocuments,
    fetchAreaRepository,
    fetchConsolidationMeta,
    fetchEvents,
    transferFile,
    uploadAreaDocument,
    fetchRetentionReport,
    fetchIncompleteReport,
    fetchReportsSummary,
    fetchAccessControlReport,
    fetchFileAlerts,
    fetchAlertsReport,
    refreshAlerts,
    fetchAlertsCatalog,
    updateAlertsSettings,
    fetchAccessGrants,
    fetchAccessGrantOptions,
    createAccessGrant,
    updateAccessGrant,
    deleteAccessGrant,
    createDocumentReference,
    replaceDocumentVersion,
    documentDownloadUrl,
  }
}
