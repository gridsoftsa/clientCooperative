export function workflowFlowIcon(key?: string | null): string {
  switch (key) {
    case 'pqrs_workflow':
      return 'i-lucide-message-square-warning'
    case 'correspondence_workflow':
      return 'i-lucide-mail'
    case 'invoices_workflow':
      return 'i-lucide-receipt'
    case 'general_workflow':
      return 'i-lucide-folder-kanban'
    default:
      return 'i-lucide-git-branch'
  }
}

export type WorkflowFlowAccent = {
  iconBox: string
  icon: string
  selected: string
  rail: string
  stepActive: string
  stepIdle: string
  connector: string
  glow: string
}

export function workflowFlowAccent(key?: string | null): WorkflowFlowAccent {
  const map: Record<string, WorkflowFlowAccent> = {
    pqrs_workflow: {
      iconBox: 'bg-amber-500/15',
      icon: 'text-amber-700 dark:text-amber-300',
      selected: 'bg-amber-500/10',
      rail: 'bg-amber-500',
      stepActive: 'border-amber-500 bg-amber-500 text-white shadow-amber-500/30',
      stepIdle: 'border-amber-200 bg-background text-amber-800 dark:border-amber-800 dark:text-amber-100',
      connector: 'bg-gradient-to-r from-amber-300 to-orange-300 dark:from-amber-800 dark:to-orange-900',
      glow: 'from-amber-500/20 via-orange-400/10 to-transparent',
    },
    correspondence_workflow: {
      iconBox: 'bg-sky-500/15',
      icon: 'text-sky-700 dark:text-sky-300',
      selected: 'bg-sky-500/10',
      rail: 'bg-sky-500',
      stepActive: 'border-sky-500 bg-sky-500 text-white shadow-sky-500/30',
      stepIdle: 'border-sky-200 bg-background text-sky-800 dark:border-sky-800 dark:text-sky-100',
      connector: 'bg-gradient-to-r from-sky-300 to-cyan-300 dark:from-sky-800 dark:to-cyan-900',
      glow: 'from-sky-500/20 via-cyan-400/10 to-transparent',
    },
    invoices_workflow: {
      iconBox: 'bg-emerald-500/15',
      icon: 'text-emerald-700 dark:text-emerald-300',
      selected: 'bg-emerald-500/10',
      rail: 'bg-emerald-500',
      stepActive: 'border-emerald-500 bg-emerald-500 text-white shadow-emerald-500/30',
      stepIdle: 'border-emerald-200 bg-background text-emerald-800 dark:border-emerald-800 dark:text-emerald-100',
      connector: 'bg-gradient-to-r from-emerald-300 to-teal-300 dark:from-emerald-800 dark:to-teal-900',
      glow: 'from-emerald-500/20 via-teal-400/10 to-transparent',
    },
    general_workflow: {
      iconBox: 'bg-violet-500/15',
      icon: 'text-violet-700 dark:text-violet-300',
      selected: 'bg-violet-500/10',
      rail: 'bg-violet-500',
      stepActive: 'border-violet-500 bg-violet-500 text-white shadow-violet-500/30',
      stepIdle: 'border-violet-200 bg-background text-violet-800 dark:border-violet-800 dark:text-violet-100',
      connector: 'bg-gradient-to-r from-violet-300 to-fuchsia-300 dark:from-violet-800 dark:to-fuchsia-900',
      glow: 'from-violet-500/20 via-fuchsia-400/10 to-transparent',
    },
  }

  return map[key ?? ''] ?? {
    iconBox: 'bg-primary/10',
    icon: 'text-primary',
    selected: 'bg-primary/10',
    rail: 'bg-primary',
    stepActive: 'border-primary bg-primary text-primary-foreground shadow-primary/30',
    stepIdle: 'border-border bg-background text-foreground',
    connector: 'bg-muted-foreground/30',
    glow: 'from-primary/15 to-transparent',
  }
}
