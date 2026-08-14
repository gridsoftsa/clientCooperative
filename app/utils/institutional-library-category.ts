export function institutionalLibraryCategoryIcon(icon?: string | null): string {
  const normalized = (icon ?? 'file-text').trim().replace(/^i-lucide-/, '')
  return `i-lucide-${normalized || 'file-text'}`
}

export function institutionalLibraryCategoryAccent(category?: string | null): {
  iconBox: string
  icon: string
} {
  const map: Record<string, { iconBox: string, icon: string }> = {
    policies: { iconBox: 'bg-violet-500/15', icon: 'text-violet-600 dark:text-violet-400' },
    procedures: { iconBox: 'bg-sky-500/15', icon: 'text-sky-600 dark:text-sky-400' },
    manuals: { iconBox: 'bg-emerald-500/15', icon: 'text-emerald-600 dark:text-emerald-400' },
    forms: { iconBox: 'bg-amber-500/15', icon: 'text-amber-600 dark:text-amber-400' },
    instructions: { iconBox: 'bg-orange-500/15', icon: 'text-orange-600 dark:text-orange-400' },
    regulations: { iconBox: 'bg-rose-500/15', icon: 'text-rose-600 dark:text-rose-400' },
    guidelines: { iconBox: 'bg-teal-500/15', icon: 'text-teal-600 dark:text-teal-400' },
    protocolos: { iconBox: 'bg-indigo-500/15', icon: 'text-indigo-600 dark:text-indigo-400' },
  }

  return map[category ?? ''] ?? { iconBox: 'bg-primary/10', icon: 'text-primary' }
}
