export interface ArchivalLifecycleDocumentRow {
  id: number
  credit_application_id: number
  credit_application_code?: string | null
  title?: string
  org_unit?: { id: number, name: string, code: string } | null
  doc_document_type?: { id: number, code: string, name: string } | null
  archival_phase: string
  archival_origin_date?: string | null
  archival_management_ends_at?: string | null
  archival_central_ends_at?: string | null
  archival_historical_ends_at?: string | null
  eligible_next_phase?: string | null
  procedure_text?: string | null
  final_disposition?: string | null
  transfer_logs?: Array<{
    id: number
    from_phase: string
    to_phase: string
    transfer_type: string
    transferred_at?: string
    notes?: string | null
    performed_by?: string | null
  }>
}

export interface ArchivalTransferActRow {
  id: number
  act_code: string
  org_unit_id?: number | null
  org_unit?: { id: number, name: string, code: string } | null
  doc_series?: { id: number, code: string, name: string } | null
  doc_subseries?: { id: number, code: string, name: string } | null
  doc_document_type?: { id: number, code: string, name: string } | null
  filed_file?: { id: number, file_number: string, title: string } | null
  transfer_kind: string
  transfer_kind_label?: string
  from_phase?: string
  from_phase_label?: string
  to_phase?: string
  to_phase_label?: string
  act_date: string
  status: string
  description?: string | null
  published_to_library?: boolean
  has_pdf?: boolean
  files_count?: number
  created_by?: { id: number, name: string } | null
  approved_by?: { id: number, name: string } | null
  approved_at?: string | null
  executed_at?: string | null
  created_at?: string | null
  files?: Array<{
    id: number
    file_number: string
    title: string
    archival_phase?: string | null
    file_type?: { id: number, name: string } | null
    org_unit?: { id: number, name: string } | null
    documents_count?: number
    closed_at?: string | null
    archival_management_ends_at?: string | null
    archival_central_ends_at?: string | null
  }>
}

export interface ArchivalTransferActTrdSettingRow {
  id: number
  org_unit_id: number
  org_unit?: { id: number, name: string, code: string } | null
  doc_series_id: number
  doc_subseries_id: number
  doc_document_type_id: number
  doc_series?: { id: number, code: string, name: string } | null
  doc_subseries?: { id: number, code: string, name: string } | null
  doc_document_type?: { id: number, code: string, name: string } | null
}

export interface ArchivalTransferEligibleFileRow {
  id: number
  file_number: string
  title: string
  org_unit?: { id: number, name: string } | null
  documents_count?: number
  archival_management_ends_at?: string | null
  archival_central_ends_at?: string | null
  eligible_next_phase?: string | null
}

export interface ArchivalDispositionActRow {
  id: number
  act_code: string
  org_unit_id?: number | null
  org_unit?: { id: number, name: string, code: string } | null
  disposition_type: string
  act_date: string
  status: string
  description?: string | null
  documents_count?: number
  documents?: Array<{
    id: number
    title?: string
    credit_application_code?: string | null
    doc_document_type?: { code: string, name: string } | null
    archival_phase?: string
  }>
}

export function useArchivalLifecycleApi() {
  const { $api } = useNuxtApp()

  async function fetchLifecycleDocuments(query: Record<string, string | number | boolean | undefined>) {
    const res = await $api<{ data: { rows: ArchivalLifecycleDocumentRow[] } }>(
      '/archival/lifecycle/documents',
      { query },
    )
    return res.data.rows ?? []
  }

  async function fetchLifecycleDocument(id: number) {
    const res = await $api<{ data: ArchivalLifecycleDocumentRow }>(`/archival/lifecycle/documents/${id}`)
    return res.data
  }

  async function transferDocument(id: number, targetPhase: string, notes?: string) {
    const res = await $api<{ data: ArchivalLifecycleDocumentRow, message?: string }>(
      `/archival/lifecycle/documents/${id}/transfer`,
      { method: 'POST', body: { target_phase: targetPhase, notes: notes ?? null } },
    )
    return res
  }

  async function runAutomaticTransfers(orgUnitId?: number | null) {
    return await $api<{ data: { transferred: number, skipped: number }, message?: string }>(
      '/archival/lifecycle/run-automatic-transfers',
      { method: 'POST', body: { org_unit_id: orgUnitId ?? null } },
    )
  }

  async function fetchDispositionActs(query?: Record<string, string | number | undefined>) {
    const res = await $api<{ data: ArchivalDispositionActRow[] }>('/archival/disposition-acts', { query })
    return res.data ?? []
  }

  async function fetchDispositionAct(id: number) {
    const res = await $api<{ data: ArchivalDispositionActRow }>(`/archival/disposition-acts/${id}`)
    return res.data
  }

  async function createDispositionAct(body: Record<string, unknown>) {
    return await $api<{ data: ArchivalDispositionActRow, message?: string }>(
      '/archival/disposition-acts',
      { method: 'POST', body },
    )
  }

  async function syncDispositionActDocuments(actId: number, documentIds: number[]) {
    return await $api<{ data: ArchivalDispositionActRow, message?: string }>(
      `/archival/disposition-acts/${actId}/documents`,
      { method: 'PUT', body: { document_ids: documentIds } },
    )
  }

  async function approveDispositionAct(actId: number) {
    return await $api<{ data: ArchivalDispositionActRow, message?: string }>(
      `/archival/disposition-acts/${actId}/approve`,
      { method: 'POST' },
    )
  }

  async function executeDispositionAct(actId: number) {
    return await $api<{ data: ArchivalDispositionActRow, message?: string }>(
      `/archival/disposition-acts/${actId}/execute`,
      { method: 'POST' },
    )
  }

  async function fetchTransferActs(query?: Record<string, string | number | undefined>) {
    const res = await $api<{ data: ArchivalTransferActRow[] }>('/archival/transfer-acts', { query })
    return res.data ?? []
  }

  async function fetchTransferAct(id: number) {
    const res = await $api<{ data: ArchivalTransferActRow }>(`/archival/transfer-acts/${id}`)
    return res.data
  }

  async function fetchTransferEligibleFiles(transferKind: string, orgUnitId: number) {
    const res = await $api<{ data: ArchivalTransferEligibleFileRow[] }>('/archival/transfer-acts/eligible-files', {
      query: { transfer_kind: transferKind, org_unit_id: orgUnitId },
    })
    return res.data ?? []
  }

  async function fetchTransferAllowedOrgUnits() {
    const res = await $api<{ data: Array<{ id: number, name: string, code: string }> }>(
      '/archival/transfer-acts/allowed-org-units',
    )
    return res.data ?? []
  }

  async function fetchTransferActTrdSettings(orgUnitId?: number) {
    const res = await $api<{ data: ArchivalTransferActTrdSettingRow[] }>('/archival/transfer-acts/trd-settings', {
      query: orgUnitId ? { org_unit_id: orgUnitId } : undefined,
    })
    return res.data ?? []
  }

  async function saveTransferActTrdSetting(body: {
    org_unit_id: number
    doc_series_id: number
    doc_subseries_id: number
    doc_document_type_id: number
  }) {
    return await $api<{ data: ArchivalTransferActTrdSettingRow, message?: string }>(
      '/archival/transfer-acts/trd-settings',
      { method: 'PUT', body },
    )
  }

  async function createTransferAct(body: Record<string, unknown>) {
    return await $api<{ data: ArchivalTransferActRow, message?: string }>(
      '/archival/transfer-acts',
      { method: 'POST', body },
    )
  }

  async function approveTransferAct(actId: number) {
    return await $api<{ data: ArchivalTransferActRow, message?: string }>(
      `/archival/transfer-acts/${actId}/approve`,
      { method: 'POST' },
    )
  }

  async function executeTransferAct(actId: number) {
    return await $api<{ data: ArchivalTransferActRow, message?: string }>(
      `/archival/transfer-acts/${actId}/execute`,
      { method: 'POST' },
    )
  }

  async function fetchTransferActPdfBlob(actId: number): Promise<Blob> {
    const config = useRuntimeConfig()
    const apiBase = String(config.public.apiBase || 'http://localhost:8585').replace(/\/$/, '')

    const match = import.meta.client ? document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]*)/) : null
    const xsrf = match?.[1] != null ? decodeURIComponent(match[1]) : null

    const response = await fetch(`${apiBase}/api/archival/transfer-acts/${actId}/pdf`, {
      method: 'GET',
      credentials: 'include',
      headers: {
        Accept: 'application/pdf',
        'X-Requested-With': 'XMLHttpRequest',
        ...(xsrf ? { 'X-XSRF-TOKEN': xsrf } : {}),
      },
    })

    if (!response.ok) {
      let message = 'No se pudo abrir el PDF del acta.'
      try {
        const type = response.headers.get('Content-Type') ?? ''
        if (type.includes('application/json')) {
          const body = await response.json() as { message?: string }
          if (body.message) {
            message = body.message
          }
        }
      }
      catch {
        // keep default
      }
      throw new Error(message)
    }

    return new Blob([await response.blob()], { type: 'application/pdf' })
  }

  return {
    fetchLifecycleDocuments,
    fetchLifecycleDocument,
    transferDocument,
    runAutomaticTransfers,
    fetchDispositionActs,
    fetchDispositionAct,
    createDispositionAct,
    syncDispositionActDocuments,
    approveDispositionAct,
    executeDispositionAct,
    fetchTransferActs,
    fetchTransferAct,
    fetchTransferEligibleFiles,
    fetchTransferAllowedOrgUnits,
    fetchTransferActTrdSettings,
    saveTransferActTrdSetting,
    createTransferAct,
    approveTransferAct,
    executeTransferAct,
    fetchTransferActPdfBlob,
  }
}
