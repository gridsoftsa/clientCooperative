import type {
  TalentPartyDetail,
  TalentPartyKind,
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

  function trdOptions() {
    return api<{ data: TalentTrdOption[] }>('/talent-parties/trd-options')
  }

  function trdSubseries(trdTableId: number) {
    return api<{ data: TalentTrdSeries[] }>(`/talent-parties/trd-options/${trdTableId}/subseries`)
  }

  function create(body: {
    kind: TalentPartyKind
    display_name: string
    identifier?: string
    trd_table_id: number
    doc_subseries_ids: number[]
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
    trdOptions,
    trdSubseries,
    create,
    uploadDocument,
  }
}
