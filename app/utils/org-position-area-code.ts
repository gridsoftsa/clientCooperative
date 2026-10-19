export function orgPositionCodePrefix(areaCode: string): string {
  return `${areaCode.trim()}-`
}

export function splitOrgPositionAreaCode(areaCode: string, fullCode: string): string | null {
  const prefix = orgPositionCodePrefix(areaCode)
  if (prefix === '-' || !fullCode.startsWith(prefix))
    return null
  const suffix = fullCode.slice(prefix.length)
  return suffix === '' ? null : suffix
}

export function isOrgPositionCodeSuffix(value: string): boolean {
  return /^[A-Za-z0-9]{1,20}$/.test(value.trim())
}
