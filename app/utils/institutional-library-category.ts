export function institutionalLibraryCategoryIcon(icon?: string | null): string {
  const normalized = (icon ?? 'file-text').trim().replace(/^i-lucide-/, '')
  return `i-lucide-${normalized || 'file-text'}`
}
