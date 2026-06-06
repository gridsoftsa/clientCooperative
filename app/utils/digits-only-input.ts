/** Restringe texto a dígitos (documento, identificación, teléfonos). */
export function filterDigitsOnly(value: string): string {
  return value.replace(/\D/g, '')
}

export function onDigitsOnlyInput(e: Event, setValue: (v: string) => void): void {
  const el = e.target as HTMLInputElement
  const filtered = filterDigitsOnly(el.value)
  setValue(filtered)
  el.value = filtered
}
