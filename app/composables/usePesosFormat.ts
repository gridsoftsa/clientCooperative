/**
 * Formato y parseo de valores en pesos colombianos (COP).
 * Uso: const { formatPesos, parsePesosInput } = usePesosFormat()
 *
 * - formatPesos(num): número → string con miles (.) y decimales (,)
 * - parsePesosInput(str): string del input → número (para v-model/update)
 */

/**
 * Formato pesos colombianos: miles con punto, decimales con coma (ej: 1.234.567,50).
 */
export function formatPesos(value: number | undefined | null): string {
  if (value === undefined || value === null || Number.isNaN(value)) return ''
  const num = Number(value)
  const hasDecimals = num % 1 !== 0
  const parts = num.toFixed(2).split('.')
  const intPart = parts[0] ?? '0'
  const decPart = parts[1] ?? '00'
  const withThousands = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return hasDecimals ? `${withThousands},${decPart}` : withThousands
}

/**
 * Deja solo dígitos, punto (.) y coma (,). Para evitar letras y otros caracteres en inputs COP.
 */
export function filterPesosChars(input: string): string {
  return String(input).replace(/[^\d.,]/g, '')
}

/**
 * Parsea string con formato pesos (1.234.567 o 1.234.567,50) a número.
 * Acepta puntos como miles y una coma como decimal (centavos).
 */
export function parsePesosInput(input: string): number | undefined {
  const trimmed = filterPesosChars(String(input)).replace(/\s/g, '').trim()
  if (trimmed === '') return undefined
  const lastComma = trimmed.lastIndexOf(',')
  const intStr = (lastComma >= 0 ? trimmed.slice(0, lastComma) : trimmed).replace(/\./g, '')
  const decStr = lastComma >= 0 ? trimmed.slice(lastComma + 1).replace(/\D/g, '').slice(0, 2) : ''
  const combined = decStr ? `${intStr}.${decStr}` : intStr
  if (!/^\d*\.?\d*$/.test(combined)) return undefined
  const num = parseFloat(combined || '0')
  return Number.isNaN(num) || num < 0 ? undefined : num
}

/** En inputs de pesos: solo permite dígitos, punto y coma. Uso: @keydown="onKeydownPesosOnly" */
export function onKeydownPesosOnly(e: KeyboardEvent) {
  if (e.ctrlKey || e.metaKey) return
  if (['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(e.key)) return
  if (e.key.length === 1 && !/[\d.,]/.test(e.key)) e.preventDefault()
}

export function usePesosFormat() {
  return {
    formatPesos,
    parsePesosInput,
    filterPesosChars,
    onKeydownPesosOnly,
  }
}
