import type {
  TalentPartyDetail,
  TalentPartyKind,
  TalentPartySettings,
  TalentPartySummary,
  TalentTrdOption,
  TalentTrdSeries,
} from '~/types/talent-party'

export function useTalentPartyApi() {
  const { $api } = useNuxtApp()
  const api = $api as <T>(url: string, options?: Record<string, unknown>) => Promise<T>

  function list(kind: TalentPartyKind, search = '') {
    return api<{ data: TalentPartySummary[] }>('/talent-parties', {
      query: {
        kind,
        search: search.trim() || undefined,
      },
    })
  }

  function show(id: number) {
    return api<{ data: TalentPartyDetail }>(`/talent-parties/${id}`)
  }

  function settings() {
    return api<{ data: TalentPartySettings }>('/talent-parties/settings')
  }

  function updateSettings(body: {
    kind: TalentPartyKind
    trd_table_id: number | null
    doc_subseries_ids: number[]
    disabled_doc_document_type_ids?: number[]
  }) {
    return api<{ data: TalentPartySettings, message: string }>('/talent-parties/settings', {
      method: 'PUT',
      body,
    })
  }

  function trdOptions() {
    return api<{ data: TalentTrdOption[] }>('/talent-parties/trd-options')
  }

  function trdSubseries(trdTableId: number) {
    return api<{ data: TalentTrdSeries[] }>(`/talent-parties/trd-options/${trdTableId}/subseries`)
  }

  function update(id: number, body: {
    display_name: string
    identifier?: string
    document_type?: string
    email?: string
    phone?: string
    address?: string
    postal_code?: string
    is_active?: boolean
    create_trd_file?: boolean
  }) {
    return api<{ data: TalentPartyDetail, message: string }>(`/talent-parties/${id}`, {
      method: 'PUT',
      body,
    })
  }

  function deactivate(id: number) {
    return api<{ data: TalentPartySummary, message: string }>(`/talent-parties/${id}/deactivate`, {
      method: 'PATCH',
    })
  }

  function create(body: {
    kind: TalentPartyKind
    display_name: string
    identifier?: string
    document_type?: string
    email?: string
    phone?: string
    address?: string
    postal_code?: string
    is_active?: boolean
    create_trd_file?: boolean
  }) {
    return api<{ data: TalentPartyDetail, message: string }>('/talent-parties', {
      method: 'POST',
      body,
    })
  }

  function uploadDocument(id: number, body: FormData) {
    return api<{ data: TalentPartyDetail, message: string }>(`/talent-parties/${id}/documents`, {
      method: 'POST',
      body,
    })
  }

  return {
    list,
    show,
    settings,
    updateSettings,
    trdOptions,
    trdSubseries,
    create,
    update,
    deactivate,
    uploadDocument,
  }
}
