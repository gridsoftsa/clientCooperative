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
  }
}
