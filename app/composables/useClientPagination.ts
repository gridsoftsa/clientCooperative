export const TRANSFER_LIST_PAGE_SIZE = 10

export function useClientPagination<T>(
  source: () => T[],
  pageSize = TRANSFER_LIST_PAGE_SIZE,
) {
  const page = ref(1)

  const total = computed(() => source().length)
  const pageCount = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))

  watch(pageCount, (count) => {
    if (page.value > count) {
      page.value = count
    }
  })

  const pageItems = computed(() => {
    const start = (page.value - 1) * pageSize

    return source().slice(start, start + pageSize)
  })

  const rangeLabel = computed(() => {
    if (total.value === 0) {
      return '0'
    }

    const start = (page.value - 1) * pageSize + 1
    const end = Math.min(page.value * pageSize, total.value)

    return `${start}–${end} de ${total.value}`
  })

  function goToPreviousPage(): void {
    if (page.value > 1) {
      page.value -= 1
    }
  }

  function goToNextPage(): void {
    if (page.value < pageCount.value) {
      page.value += 1
    }
  }

  function resetPage(): void {
    page.value = 1
  }

  return {
    page,
    pageCount,
    pageItems,
    pageSize,
    total,
    rangeLabel,
    goToPreviousPage,
    goToNextPage,
    resetPage,
  }
}
