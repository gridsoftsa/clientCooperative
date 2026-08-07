export const VENTANILLA_INPUT_ERROR_CLASS =
  'border-destructive focus-visible:border-destructive focus-visible:ring-destructive/40'

export function ventanillaInputErrorClass(missing: boolean): string {
  return missing ? VENTANILLA_INPUT_ERROR_CLASS : ''
}

export function ventanillaMultiselectErrorClass(missing: boolean, baseClass = 'ventanilla-single-multiselect'): string {
  return missing ? `${baseClass} multiselect-danger` : baseClass
}

export function focusVentanillaFieldById(elementId: string): void {
  const root = document.getElementById(elementId)
  if (!root) {
    return
  }

  if (root instanceof HTMLInputElement || root instanceof HTMLTextAreaElement || root instanceof HTMLSelectElement) {
    root.focus()
    root.scrollIntoView({ behavior: 'smooth', block: 'center' })

    return
  }

  const focusable = root.querySelector('input,button,[tabindex]:not([tabindex="-1"])') as HTMLElement | null
  focusable?.focus()
  root.scrollIntoView({ behavior: 'smooth', block: 'center' })
}
