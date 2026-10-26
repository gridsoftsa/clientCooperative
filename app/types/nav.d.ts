export interface NavLink {
  title: string
  link: string
  icon?: string
  new?: boolean
  permission?: string
  anyPermission?: string[]
  role?: string
  anyRole?: string[]
  adminOnly?: boolean
  requiresCreditArchivalLink?: boolean
  /** Módulo de producto requerido para ver el ítem. */
  module?: 'creditos' | 'gestion_documental'
  /** El usuario debe tener todos estos módulos activos. */
  modules?: Array<'creditos' | 'gestion_documental'>
  /** Conserva el ítem en la definición del menú sin mostrarlo. */
  hidden?: boolean
}

export interface NavSectionTitle {
  heading: string
}

export interface NavGroup {
  title: string
  icon?: string
  new?: boolean
  children: NavLink[]
  permission?: string
  anyPermission?: string[]
  role?: string
  anyRole?: string[]
  adminOnly?: boolean
  /** Módulo de producto requerido para ver el ítem. */
  module?: 'creditos' | 'gestion_documental'
  /** El usuario debe tener todos estos módulos activos. */
  modules?: Array<'creditos' | 'gestion_documental'>
}

export interface NavMenu {
  heading: string
  items: NavMenuItems
}

export declare type NavMenuItems = (NavLink | NavGroup | NavSectionTitle)[]
