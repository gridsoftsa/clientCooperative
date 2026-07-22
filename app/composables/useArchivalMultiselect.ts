import type { ComponentPublicInstance } from 'vue'

export const ARCHIVAL_MULTISELECT_CLASSES = {
  dropdown: 'multiselect-dropdown archival-single-multiselect-dropdown',
} as const

type MultiselectOpenInstance = ComponentPublicInstance & { $el: HTMLElement }

function widenArchivalDropdown(multiselectEl: HTMLElement): void {
  const applyWidth = (): void => {
    const triggerWidth = Math.max(multiselectEl.offsetWidth, 280)
    const dropdownId = multiselectEl.id ? `${multiselectEl.id}-dropdown` : null
    const dropdown = dropdownId
      ? document.getElementById(dropdownId)
      : document.querySelector<HTMLElement>('.archival-single-multiselect-dropdown:not(.is-hidden)')

    if (!dropdown) {
      return
    }

    dropdown.style.setProperty('min-width', `${triggerWidth}px`, 'important')
    dropdown.style.setProperty('width', `${triggerWidth}px`, 'important')
    dropdown.style.setProperty('max-width', 'min(36rem, calc(100vw - 1.5rem))', 'important')
  }

  nextTick(() => {
    requestAnimationFrame(() => {
      applyWidth()
      // El dropdown a veces monta un frame después del evento open.
      requestAnimationFrame(applyWidth)
    })
  })
}

export function onArchivalMultiselectOpen(instance: MultiselectOpenInstance): void {
  if (!instance.$el) {
    return
  }

  widenArchivalDropdown(instance.$el)
}
