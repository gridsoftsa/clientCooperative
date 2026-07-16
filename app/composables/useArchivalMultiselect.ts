import type { ComponentPublicInstance } from 'vue'

export const ARCHIVAL_MULTISELECT_CLASSES = {
  dropdown: 'multiselect-dropdown archival-single-multiselect-dropdown',
} as const

type MultiselectOpenInstance = ComponentPublicInstance & { $el: HTMLElement }

function widenArchivalDropdown(multiselectEl: HTMLElement): void {
  nextTick(() => {
    requestAnimationFrame(() => {
      const triggerWidth = multiselectEl.offsetWidth
      const dropdownId = multiselectEl.id ? `${multiselectEl.id}-dropdown` : null
      const dropdown = dropdownId
        ? document.getElementById(dropdownId)
        : document.querySelector<HTMLElement>('.archival-single-multiselect-dropdown:not(.is-hidden)')

      if (!dropdown) {
        return
      }

      dropdown.style.setProperty('min-width', `${triggerWidth}px`)
      dropdown.style.setProperty('width', 'max-content')
      dropdown.style.setProperty('max-width', 'min(42rem, calc(100vw - 1.5rem))')
    })
  })
}

export function onArchivalMultiselectOpen(instance: MultiselectOpenInstance): void {
  if (!instance.$el) {
    return
  }

  widenArchivalDropdown(instance.$el)
}
