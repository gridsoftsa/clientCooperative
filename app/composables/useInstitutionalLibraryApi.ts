import type {
  InstitutionalLibraryCategory,
  InstitutionalLibraryDocument,
  InstitutionalLibraryListResponse,
  PublishInstitutionalLibraryPayload,
} from '~/types/institutional-library'

export function useInstitutionalLibraryApi() {
  const { $api } = useNuxtApp()
  const api = $api as <T>(url: string, options?: Record<string, unknown>) => Promise<T>

  async function fetchDocuments(params: Record<string, string | number | undefined> = {}) {
    const query = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '' && value !== null) {
        query.set(key, String(value))
      }
    })
    const suffix = query.toString() ? `?${query.toString()}` : ''

    return api<InstitutionalLibraryListResponse>(`/institutional-library${suffix}`)
  }

  async function fetchCategories() {
    const res = await api<{ data: InstitutionalLibraryCategory[] }>('/institutional-library/categories')
    return res.data ?? []
  }

  async function fetchCatalog() {
    const res = await api<{ data: InstitutionalLibraryCategory[] }>('/institutional-library/catalog')
    return res.data ?? []
  }

  async function fetchFeatured() {
    const res = await api<{ data: InstitutionalLibraryDocument | null }>('/institutional-library/featured')
    return res.data
  }

  async function fetchRecent() {
    const res = await api<{ data: InstitutionalLibraryDocument[] }>('/institutional-library/recent')
    return res.data ?? []
  }

  async function fetchMostViewed() {
    const res = await api<{ data: InstitutionalLibraryDocument[] }>('/institutional-library/most-viewed')
    return res.data ?? []
  }

  async function fetchDocument(documentId: number) {
    const res = await api<{ data: InstitutionalLibraryDocument }>(`/institutional-library/${documentId}`)
    return res.data
  }

  async function publishDocument(documentId: number, payload: PublishInstitutionalLibraryPayload) {
    return api<{ data: InstitutionalLibraryDocument, message: string }>(
      `/institutional-library/documents/${documentId}/publish`,
      { method: 'POST', body: payload },
    )
  }

  async function unpublishDocument(documentId: number, archivalFileId: number) {
    return api<{ message: string }>(
      `/institutional-library/documents/${documentId}/unpublish`,
      { method: 'POST', body: { archival_file_id: archivalFileId } },
    )
  }

  return {
    fetchDocuments,
    fetchCategories,
    fetchCatalog,
    fetchFeatured,
    fetchRecent,
    fetchMostViewed,
    fetchDocument,
    publishDocument,
    unpublishDocument,
  }
}
