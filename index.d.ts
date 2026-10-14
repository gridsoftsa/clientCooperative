import type { AppSettings } from '~/types/appSettings'

declare module '#app' {
  interface PageMeta {
    /** Requiere todos estos permisos (AND). */
    permissionsAll?: string | string[]
    /** Requiere todos estos módulos de producto activos. */
    modules?: Array<'creditos' | 'gestion_documental'>
  }
}

declare module 'nuxt/schema' {
  interface AppConfigInput {
    /** App settings */
    appSettings: AppSettings
  }
}

// It is always important to ensure you import/export something when augmenting a type
export {}
