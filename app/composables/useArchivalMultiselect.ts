import type { ComponentPublicInstance } from 'vue'

export const ARCHIVAL_MULTISELECT_CLASSES = {
  dropdown: 'multiselect-dropdown archival-single-multiselect-dropdown',
} as const

type MultiselectOpenInstance = ComponentPublicInstance & {
  $el: HTMLElement
  updatePopper?: () => void
}

function findArchivalDropdownForTrigger(multiselectEl: HTMLElement): HTMLElement | null {
  const dropdownId = multiselectEl.id ? `${multiselectEl.id}-dropdown` : null
  if (dropdownId) {
    const byId = document.getElementById(dropdownId)
    if (byId) {
      return byId
    }
  }

  const openDropdowns = document.querySelectorAll<HTMLElement>(
    '.multiselect-dropdown.archival-single-multiselect-dropdown:not(.is-hidden)',
  )

  if (openDropdowns.length === 1) {
    return openDropdowns[0] ?? null
  }

  return null
}

function syncArchivalDropdownWidth(multiselectEl: HTMLElement): void {
  const dropdown = findArchivalDropdownForTrigger(multiselectEl)
  if (!dropdown) {
    return
  }

  const triggerWidth = Math.max(
    multiselectEl.getBoundingClientRect().width,
    multiselectEl.offsetWidth,
    280,
  )

  dropdown.style.setProperty('min-width', `${triggerWidth}px`, 'important')
  dropdown.style.setProperty('width', `${triggerWidth}px`, 'important')
  dropdown.style.setProperty('max-width', 'min(36rem, calc(100vw - 1.5rem))', 'important')
}

function scheduleArchivalDropdownSync(
  multiselectEl: HTMLElement,
  instance: MultiselectOpenInstance,
): void {
  const run = (): void => {
    syncArchivalDropdownWidth(multiselectEl)
    instance.updatePopper?.()
  }

  nextTick(() => {
    requestAnimationFrame(() => {
      run()
      requestAnimationFrame(run)
    })
  })

  window.setTimeout(run, 0)
  window.setTimeout(run, 48)
}

export function onArchivalMultiselectOpen(instance: MultiselectOpenInstance): void {
  if (!instance.$el) {
    return
  }

  scheduleArchivalDropdownSync(instance.$el, instance)
}
