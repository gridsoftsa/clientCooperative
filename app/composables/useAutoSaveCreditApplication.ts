import type { CreditApplicationForm } from '~/types/credit-application'

const STORAGE_KEY = 'radicacion-draft-form'
const STORAGE_MAX_AGE_MS = 24 * 60 * 60 * 1000 // 24 horas
const DEBOUNCE_MS = 2000

export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

export interface AutoSaveState {
  draftId: Ref<number | null>
  saveStatus: Ref<SaveStatus>
  lastSavedAt: Ref<Date | null>
  hasLocalDraft: Ref<boolean>
}

/** Serializa el formulario para localStorage (sin archivos File) */
function formToStorable(form: CreditApplicationForm): Record<string, unknown> {
  const stripFiles = (docs: Array<{ title?: string; file?: File }> | undefined) =>
    (docs ?? []).map(({ title }) => ({ title: title ?? '' }))

  return {
    ...form,
    debtor: {
      ...form.debtor,
      documents: stripFiles(form.debtor.documents),
    },
    co_debtors: (form.co_debtors ?? []).map((co) => ({
      ...co,
      documents: stripFiles(co.documents),
    })),
  }
}

/** Guarda en localStorage para recuperar si falla conexión antes del primer guardado */
export function saveToLocalStorage(form: CreditApplicationForm): void {
  if (import.meta.client) {
    try {
      const data = {
        form: formToStorable(form),
        savedAt: Date.now(),
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    } catch {
      // localStorage puede estar lleno o deshabilitado
    }
  }
}

/** Obtiene borrador guardado localmente (si existe y no está expirado) */
export function getLocalDraft(): { form: CreditApplicationForm; savedAt: number } | null {
  if (import.meta.client) {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (!raw) return null
      const data = JSON.parse(raw) as { form: CreditApplicationForm; savedAt: number }
      if (!data.form || !data.savedAt) return null
      if (Date.now() - data.savedAt > STORAGE_MAX_AGE_MS) {
        localStorage.removeItem(STORAGE_KEY)
        return null
      }
      return data
    } catch {
      return null
    }
  }
  return null
}

/** Limpia el borrador local (tras guardado exitoso o envío) */
export function clearLocalDraft(): void {
  if (import.meta.client) {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {
      //
    }
  }
}

/**
 * Composable para auto-guardado de solicitudes de crédito.
 * Crea el borrador cuando hay datos mínimos y actualiza con debounce.
 */
export function useAutoSaveCreditApplication(
  form: Ref<CreditApplicationForm>,
  options: {
    canCreate: () => boolean
    payloadWithoutDocuments: (status: 'Draft') => Record<string, unknown>
    api: (url: string, opts: { method: string; body?: unknown }) => Promise<{ data: { id: number } }>
    csrf: () => Promise<void>
    onDraftCreated?: (id: number) => void
    enabled?: Ref<boolean>
  },
): AutoSaveState {
  const draftId = ref<number | null>(null)
  const saveStatus = ref<SaveStatus>('idle')
  const lastSavedAt = ref<Date | null>(null)
  const hasLocalDraft = ref(false)

  let debounceTimer: ReturnType<typeof setTimeout> | null = null

  async function performSave(): Promise<void> {
    const enabled = options.enabled?.value ?? true
    if (!enabled) return

    const id = draftId.value
    const canCreate = options.canCreate()

    if (!canCreate && !id) return

    saveStatus.value = 'saving'
    try {
      await options.csrf()
      if (id) {
        await options.api(`/credit-applications/${id}`, {
          method: 'PUT',
          body: options.payloadWithoutDocuments('Draft'),
        })
      } else {
        const { data } = await options.api('/credit-applications', {
          method: 'POST',
          body: options.payloadWithoutDocuments('Draft'),
        })
        draftId.value = data.id
        options.onDraftCreated?.(data.id)
      }
      saveStatus.value = 'saved'
      lastSavedAt.value = new Date()
      clearLocalDraft()
      hasLocalDraft.value = false
    } catch (e) {
      console.error('Auto-guardado falló:', e)
      saveStatus.value = 'error'
      saveToLocalStorage(form.value)
      hasLocalDraft.value = true
    }
  }

  function scheduleSave(): void {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => {
      debounceTimer = null
      performSave()
    }, DEBOUNCE_MS)
  }

  watch(
    () => form.value,
    () => {
      const enabled = options.enabled?.value ?? true
      if (!enabled) return
      scheduleSave()
    },
    { deep: true },
  )

  onUnmounted(() => {
    if (debounceTimer) clearTimeout(debounceTimer)
  })

  return {
    draftId,
    saveStatus,
    lastSavedAt,
    hasLocalDraft,
  }
}
