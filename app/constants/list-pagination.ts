/** Tamaños de página permitidos en listados (tablas, bandejas, directorios). */
export const LIST_PAGE_SIZE_OPTIONS = [10, 15, 20, 50] as const

export type ListPageSize = (typeof LIST_PAGE_SIZE_OPTIONS)[number]

export const DEFAULT_LIST_PAGE_SIZE: ListPageSize = 10

export function isListPageSize(value: number): value is ListPageSize {
  return (LIST_PAGE_SIZE_OPTIONS as readonly number[]).includes(value)
}
