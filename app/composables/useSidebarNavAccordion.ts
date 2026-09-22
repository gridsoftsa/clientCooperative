const sidebarNavAccordionKey = Symbol('sidebar-nav-accordion')

interface SidebarNavAccordion {
  openGroupId: Ref<string | null>
  setOpenGroup: (id: string | null) => void
}

export function provideSidebarNavAccordion(): SidebarNavAccordion {
  const openGroupId = ref<string | null>(null)

  function setOpenGroup(id: string | null) {
    openGroupId.value = id
  }

  const state: SidebarNavAccordion = { openGroupId, setOpenGroup }
  provide(sidebarNavAccordionKey, state)

  return state
}

export function useSidebarNavAccordion(): SidebarNavAccordion | null {
  return inject<SidebarNavAccordion | null>(sidebarNavAccordionKey, null)
}
