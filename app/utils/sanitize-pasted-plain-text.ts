/** Max length aligned with `StoreCreditApplicationRequest` text fields (destino / descripciones). */
export const PASTED_PLAIN_TEXT_MAX_LENGTH = 2000

/**
 * Limpia texto pegado desde Word u ofimática: comillas tipográficas, espacios duros,
 * caracteres de control y espacios/saltos repetidos. Conserva letras (incl. tildes) y puntuación habitual.
 */
export function sanitizePastedPlainText(raw: string | null | undefined): string {
  if (raw == null) {
    return ''
  }
  let s = String(raw)
  try {
    s = s.normalize('NFKC')
  }
  catch {
    // ignore
  }
  s = s.replace(/[\u2018\u2019\u201A\u201B]/g, "'")
  s = s.replace(/[\u201C\u201D\u201E\u201F]/g, '"')
  s = s.replace(/[\u2013\u2014\u2212]/g, '-')
  s = s.replace(/[\u00A0\u202F\u2000-\u200B\u200C\u200D\uFEFF\u00AD]/g, ' ')
  s = s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
  s = s.replace(/\t/g, ' ')
  s = s.replace(/\r\n|\r/g, '\n')
  s = s.replace(/[^\S\n]+/g, ' ')
  s = s.replace(/\n{3,}/g, '\n\n')
  s = s.split('\n').map(line => line.trim()).join('\n')
  return s.trim()
}

export function clampPastedPlainText(
  raw: string | null | undefined,
  maxLength = PASTED_PLAIN_TEXT_MAX_LENGTH,
): string {
  const s = sanitizePastedPlainText(raw)
  if (s.length <= maxLength) {
    return s
  }
  return s.slice(0, maxLength)
}

/**
 * Inserta el portapapeles en la selección, sanitiza y recorta al máximo.
 */
export function insertSanitizedPaste(
  current: string,
  pasted: string,
  selectionStart: number,
  selectionEnd: number,
  maxLength = PASTED_PLAIN_TEXT_MAX_LENGTH,
): string {
  const start = Number.isFinite(selectionStart) ? Math.max(0, selectionStart) : current.length
  const end = Number.isFinite(selectionEnd) ? Math.max(start, selectionEnd) : current.length
  const merged = `${current.slice(0, start)}${pasted}${current.slice(end)}`
  return clampPastedPlainText(merged, maxLength)
}

export function pastedPlainTextFromClipboardEvent(
  e: ClipboardEvent,
  currentValue: string,
  maxLength = PASTED_PLAIN_TEXT_MAX_LENGTH,
): string {
  const pasted = e.clipboardData?.getData('text/plain') ?? ''
  const el = e.target as HTMLTextAreaElement | HTMLInputElement | null
  const start = el?.selectionStart ?? currentValue.length
  const end = el?.selectionEnd ?? currentValue.length
  return insertSanitizedPaste(currentValue, pasted, start, end, maxLength)
}

export function sanitizeFinancialInfoPlainText<T extends {
  income?: { description?: string }
  expenses?: { description?: string }
}>(fi: T): T {
  const next = { ...fi }
  if (next.income && typeof next.income === 'object') {
    next.income = {
      ...next.income,
      description: clampPastedPlainText(next.income.description ?? ''),
    }
  }
  if (next.expenses && typeof next.expenses === 'object') {
    next.expenses = {
      ...next.expenses,
      description: clampPastedPlainText(next.expenses.description ?? ''),
    }
  }
  return next
}

export function sanitizeApplicantPlainTextFields<T extends {
  financial_info?: {
    income?: { description?: string }
    expenses?: { description?: string }
  }
}>(row: T): T {
  const fi = row.financial_info
  if (!fi || typeof fi !== 'object') {
    return row
  }
  return {
    ...row,
    financial_info: sanitizeFinancialInfoPlainText(fi),
  }
}
